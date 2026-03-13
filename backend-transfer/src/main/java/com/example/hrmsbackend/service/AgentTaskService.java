package com.example.hrmsbackend.service;

import com.example.hrmsbackend.common.NotFoundException;
import com.example.hrmsbackend.config.AiAgentProperties;
import com.example.hrmsbackend.dto.AgentTaskPayloads;
import com.example.hrmsbackend.dto.UserProfile;
import com.example.hrmsbackend.entity.AgentApprovalRecord;
import com.example.hrmsbackend.entity.AgentExecutionLog;
import com.example.hrmsbackend.entity.AgentTask;
import com.example.hrmsbackend.entity.ApprovalRule;
import com.example.hrmsbackend.entity.Attendance;
import com.example.hrmsbackend.entity.LeaveRequest;
import com.example.hrmsbackend.entity.Permission;
import com.example.hrmsbackend.entity.Role;
import com.example.hrmsbackend.repository.AgentApprovalRecordRepository;
import com.example.hrmsbackend.repository.AgentExecutionLogRepository;
import com.example.hrmsbackend.repository.AgentTaskRepository;
import com.example.hrmsbackend.repository.ApprovalRuleRepository;
import com.example.hrmsbackend.repository.AttendanceRepository;
import com.example.hrmsbackend.repository.PermissionRepository;
import com.example.hrmsbackend.repository.RoleRepository;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.client.RestClient;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.time.format.DateTimeFormatter;
import java.time.format.DateTimeParseException;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Objects;
import java.util.Optional;
import java.util.Set;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

@Service
@Transactional
public class AgentTaskService {
    private static final String STATUS_PLANNED = "planned";
    private static final String STATUS_EXECUTING = "executing";
    private static final String STATUS_SUCCEEDED = "succeeded";
    private static final String STATUS_FAILED = "failed";
    private static final String ATTENDANCE_NORMAL = "正常";
    private static final String ATTENDANCE_LATE = "迟到";
    private static final String ATTENDANCE_EARLY = "早退";
    private static final String ATTENDANCE_ABSENT = "缺勤";
    private static final String ATTENDANCE_LEAVE = "请假";
    private static final String ATTENDANCE_OVERTIME = "加班";

    private final AgentTaskRepository taskRepository;
    private final AgentExecutionLogRepository logRepository;
    private final AgentApprovalRecordRepository approvalRecordRepository;
    private final AttendanceRepository attendanceRepository;
    private final ApprovalRuleRepository approvalRuleRepository;
    private final PermissionRepository permissionRepository;
    private final RoleRepository roleRepository;
    private final AttendanceService attendanceService;
    private final LeaveRequestService leaveRequestService;
    private final RolePermissionService rolePermissionService;
    private final AuthService authService;
    private final AiAgentProperties properties;
    private final RestClient restClient;
    private final ObjectMapper objectMapper;

    public AgentTaskService(AgentTaskRepository taskRepository,
                            AgentExecutionLogRepository logRepository,
                            AgentApprovalRecordRepository approvalRecordRepository,
                            AttendanceRepository attendanceRepository,
                            ApprovalRuleRepository approvalRuleRepository,
                            PermissionRepository permissionRepository,
                            RoleRepository roleRepository,
                            AttendanceService attendanceService,
                            LeaveRequestService leaveRequestService,
                            RolePermissionService rolePermissionService,
                            AuthService authService,
                            AiAgentProperties properties,
                            RestClient.Builder restClientBuilder,
                            ObjectMapper objectMapper) {
        this.taskRepository = taskRepository;
        this.logRepository = logRepository;
        this.approvalRecordRepository = approvalRecordRepository;
        this.attendanceRepository = attendanceRepository;
        this.approvalRuleRepository = approvalRuleRepository;
        this.permissionRepository = permissionRepository;
        this.roleRepository = roleRepository;
        this.attendanceService = attendanceService;
        this.leaveRequestService = leaveRequestService;
        this.rolePermissionService = rolePermissionService;
        this.authService = authService;
        this.properties = properties;
        this.restClient = restClientBuilder.build();
        this.objectMapper = objectMapper;
    }

    public AgentTaskPayloads.AgentTaskView planTask(AgentTaskPayloads.PlanRequest request) {
        if (request.getUserId() == null) throw new IllegalArgumentException("userId is required");
        String command = safeText(request.getCommand());
        if (command.isEmpty()) throw new IllegalArgumentException("command is required");

        UserProfile actor = authService.getProfile(request.getUserId());
        ProviderResult providerResult = createDraftPlan(command, actor);
        AgentTaskPayloads.AgentPlan plan = normalizePlan(command, actor, providerResult.draft());

        AgentTask task = new AgentTask();
        task.setUserId(request.getUserId());
        task.setCommandText(command);
        task.setIntent(plan.intent());
        task.setRiskLevel(plan.riskLevel());
        task.setStatus(STATUS_PLANNED);
        task.setProviderName(providerResult.providerName());
        task.setRequiresApproval(Boolean.TRUE.equals(plan.requiresApproval()));
        task.setExecutable(Boolean.TRUE.equals(plan.executable()));
        task.setPlanJson(writePlan(plan));
        task = taskRepository.save(task);
        Integer savedTaskId = task.getTaskId();

        log(savedTaskId, 0, "info", "Plan generated by " + providerResult.providerName());
        plan.warnings().forEach(warning -> log(savedTaskId, 0, "warn", warning));
        return toView(task);
    }

    @Transactional(readOnly = true)
    public AgentTaskPayloads.AgentTaskView getTask(Integer taskId) {
        return toView(findTask(taskId));
    }

    public AgentTaskPayloads.AgentTaskView approveAndExecute(Integer taskId, AgentTaskPayloads.ApproveRequest request) {
        AgentTask task = findTask(taskId);
        if (!Objects.equals(task.getUserId(), request.getUserId())) {
            throw new IllegalArgumentException("only the task creator can approve and execute this task");
        }
        if (STATUS_SUCCEEDED.equals(task.getStatus())) throw new IllegalStateException("task already succeeded");
        if (STATUS_EXECUTING.equals(task.getStatus())) throw new IllegalStateException("task is executing");

        UserProfile actor = authService.getProfile(request.getUserId());
        AgentTaskPayloads.AgentPlan plan = readPlan(task.getPlanJson());
        if (!Boolean.TRUE.equals(plan.executable())) {
            throw new IllegalStateException(plan.warnings().isEmpty() ? "task is not executable" : plan.warnings().get(0));
        }

        AgentApprovalRecord record = new AgentApprovalRecord();
        record.setTaskId(taskId);
        record.setApproverUserId(request.getUserId());
        record.setAction("approve");
        record.setRemark(safeText(request.getRemark()));
        approvalRecordRepository.save(record);

        task.setStatus(STATUS_EXECUTING);
        taskRepository.save(task);
        log(taskId, 0, "info", "Approval confirmed, execution started");

        try {
            String result = switch (plan.intent()) {
                case "leave.create" -> executeLeave(taskId, plan, actor);
                case "attendance.upsert" -> executeAttendance(taskId, plan, actor);
                case "role-permission.update" -> executeRolePermission(taskId, plan, actor);
                default -> throw new IllegalStateException("unsupported task intent");
            };
            task.setStatus(STATUS_SUCCEEDED);
            task.setResultSummary(result);
            taskRepository.save(task);
            log(taskId, 999, "info", result);
        } catch (Exception ex) {
            task.setStatus(STATUS_FAILED);
            task.setResultSummary(ex.getMessage());
            taskRepository.save(task);
            log(taskId, 999, "error", ex.getMessage());
            throw ex;
        }

        return toView(task);
    }
    private ProviderResult createDraftPlan(String command, UserProfile actor) {
        if (properties.isLlmEnabled()) {
            try {
                return new ProviderResult("openai-compatible", callOpenAiDraft(command, actor));
            } catch (Exception ignored) {
                return new ProviderResult("local-rule-fallback", createLocalDraft(command));
            }
        }
        return new ProviderResult("local-rule", createLocalDraft(command));
    }

    private AgentTaskPayloads.DraftPlan callOpenAiDraft(String command, UserProfile actor) throws Exception {
        Map<String, Object> payload = new LinkedHashMap<>();
        payload.put("model", properties.getOpenai().getModel());
        payload.put("temperature", properties.getOpenai().getTemperature());
        payload.put("response_format", Map.of("type", "json_object"));
        payload.put("messages", List.of(
                Map.of("role", "system", "content", buildSystemPrompt(actor)),
                Map.of("role", "user", "content", command)
        ));

        String url = properties.getOpenai().getBaseUrl().replaceAll("/+$", "") + "/chat/completions";
        String responseBody = restClient.post()
                .uri(url)
                .header("Authorization", "Bearer " + properties.getOpenai().getApiKey())
                .header("Content-Type", "application/json")
                .body(payload)
                .retrieve()
                .body(String.class);

        JsonNode root = objectMapper.readTree(responseBody);
        String content = root.path("choices").path(0).path("message").path("content").asText("");
        if (content.isBlank()) throw new IllegalStateException("empty LLM response");
        return objectMapper.readValue(content, AgentTaskPayloads.DraftPlan.class);
    }

    private String buildSystemPrompt(UserProfile actor) throws Exception {
        Map<String, Object> context = new LinkedHashMap<>();
        context.put("currentUser", Map.of(
                "userId", actor.getUserId(),
                "empId", actor.getEmpId(),
                "identityTag", safeText(actor.getIdentityTag()),
                "roleCode", safeText(actor.getRoleCode()),
                "permissions", actor.getPermissions() == null ? List.of() : actor.getPermissions()
        ));
        context.put("availableLeaveTypes", List.of("年假", "病假", "事假", "婚假", "产假", "陪产假", "丧假"));
        context.put("availableRoles", roleRepository.findAll().stream().map(Role::getRoleName).toList());
        context.put("availablePermissions", permissionRepository.findAllByOrderBySortOrderAscPermIdAsc().stream().map(Permission::getPermName).limit(80).toList());
        return "Return only one JSON object. Fields: intent, summary, action, leaveType, startDate, endDate, days, reason, attendanceDate, clockIn, clockOut, roleName, permissionName. " +
                "intent must be one of leave.create, attendance.upsert, role-permission.update, unknown. " +
                "action must be add or remove for role-permission.update. Dates use yyyy-MM-dd, times use HH:mm. Context: " +
                objectMapper.writeValueAsString(context);
    }

    private AgentTaskPayloads.DraftPlan createLocalDraft(String command) {
        AgentTaskPayloads.DraftPlan draft = new AgentTaskPayloads.DraftPlan();
        String text = safeText(command);
        if (containsAny(text, "请假", "休假")) {
            draft.setIntent("leave.create");
            draft.setLeaveType(findLeaveType(text));
            List<String> dates = extractDates(text);
            if (!dates.isEmpty()) {
                draft.setStartDate(dates.get(0));
                draft.setEndDate(dates.size() > 1 ? dates.get(1) : dates.get(0));
            }
            draft.setReason(extractRemark(text));
            return draft;
        }
        if (containsAny(text, "考勤", "打卡", "签到", "签退", "补录")) {
            draft.setIntent("attendance.upsert");
            List<String> dates = extractDates(text);
            if (!dates.isEmpty()) draft.setAttendanceDate(dates.get(0));
            List<String> times = extractTimes(text);
            if (!times.isEmpty()) {
                draft.setClockIn(times.get(0));
                if (times.size() > 1) draft.setClockOut(times.get(1));
            }
            draft.setReason(extractRemark(text));
            return draft;
        }
        if (containsAny(text, "权限", "角色", "授权")) {
            draft.setIntent("role-permission.update");
            draft.setAction(findAction(text));
            draft.setRoleName(extractMatchedName(text, roleRepository.findAll().stream().map(Role::getRoleName).toList()));
            draft.setPermissionName(extractMatchedName(text, permissionRepository.findAllByOrderBySortOrderAscPermIdAsc().stream().map(Permission::getPermName).toList()));
            return draft;
        }
        draft.setIntent("unknown");
        return draft;
    }

    private AgentTaskPayloads.AgentPlan normalizePlan(String command, UserProfile actor, AgentTaskPayloads.DraftPlan draft) {
        return switch (safeText(draft.getIntent())) {
            case "leave.create" -> buildLeavePlan(command, actor, draft);
            case "attendance.upsert" -> buildAttendancePlan(command, actor, draft);
            case "role-permission.update" -> buildRolePermissionPlan(command, actor, draft);
            default -> new AgentTaskPayloads.AgentPlan(
                    "unknown",
                    "Current command does not match an executable whitelist action",
                    "medium",
                    true,
                    false,
                    List.of("Currently supported actions: personal leave request, personal attendance upsert, role permission update."),
                    List.of(),
                    Map.of(),
                    List.of(new AgentTaskPayloads.AgentPlanStep(1, "Generate plan only", "LOCAL", "agentPlanner", Map.of())),
                    List.of()
            );
        };
    }
    private AgentTaskPayloads.AgentPlan buildLeavePlan(String command, UserProfile actor, AgentTaskPayloads.DraftPlan draft) {
        String leaveType = safeText(draft.getLeaveType());
        if (leaveType.isEmpty()) leaveType = findLeaveType(command);
        LocalDate startDate = parseDateOrDefault(draft.getStartDate(), LocalDate.now());
        LocalDate endDate = parseDateOrDefault(draft.getEndDate(), startDate);
        if (endDate.isBefore(startDate)) endDate = startDate;
        int days = draft.getDays() != null && draft.getDays() > 0 ? draft.getDays() : calculateDays(startDate, endDate);
        String reason = safeText(draft.getReason());
        if (reason.isEmpty()) reason = extractRemark(command);

        boolean executable = actor.getEmpId() != null && hasPermission(actor, "attendance:leave:add");
        List<String> warnings = new ArrayList<>();
        if (actor.getEmpId() == null) warnings.add("Current account is not bound to an employee record.");
        if (!hasPermission(actor, "attendance:leave:add")) warnings.add("Current account does not have leave submission permission.");

        Map<String, Object> preview = new LinkedHashMap<>();
        preview.put("leaveType", leaveType);
        preview.put("startDate", startDate.toString());
        preview.put("endDate", endDate.toString());
        preview.put("days", days);
        preview.put("reason", reason);

        return new AgentTaskPayloads.AgentPlan(
                "leave.create",
                "Submit a leave request for the current employee",
                "low",
                true,
                executable,
                warnings,
                List.of(new AgentTaskPayloads.AgentPlanEntity("employee", actor.getEmpId(), actor.getEmpName())),
                preview,
                List.of(
                        new AgentTaskPayloads.AgentPlanStep(1, "Validate leave payload", "LOCAL", "agentValidator", preview),
                        new AgentTaskPayloads.AgentPlanStep(2, "Resolve approval chain", "LOCAL", "approvalRuleRepository", Map.of("days", days, "identityTag", safeText(actor.getIdentityTag()))),
                        new AgentTaskPayloads.AgentPlanStep(3, "Create leave request", "POST", "/api/leave-requests", preview)
                ),
                List.of("If the request was submitted by mistake, cancel it while it is still pending approval.")
        );
    }

    private AgentTaskPayloads.AgentPlan buildAttendancePlan(String command, UserProfile actor, AgentTaskPayloads.DraftPlan draft) {
        LocalDate attendanceDate = parseDateOrDefault(draft.getAttendanceDate(), LocalDate.now());
        String clockIn = safeText(draft.getClockIn());
        String clockOut = safeText(draft.getClockOut());
        List<String> times = extractTimes(command);
        if (clockIn.isEmpty() && !times.isEmpty()) clockIn = times.get(0);
        if (clockOut.isEmpty() && times.size() > 1) clockOut = times.get(1);
        String remark = safeText(draft.getReason());
        if (remark.isEmpty()) remark = extractRemark(command);

        boolean executable = actor.getEmpId() != null && (hasPermission(actor, "attendance:record:add") || hasPermission(actor, "attendance:record:edit"));
        List<String> warnings = new ArrayList<>();
        if (clockIn.isEmpty() && clockOut.isEmpty()) {
            warnings.add("No clock-in or clock-out time was recognized. Use a format like: 上班 09:00，下班 18:00.");
            executable = false;
        }
        if (!hasPermission(actor, "attendance:record:add") && !hasPermission(actor, "attendance:record:edit")) {
            warnings.add("Current account does not have attendance write permission.");
        }

        Map<String, Object> preview = new LinkedHashMap<>();
        preview.put("attendanceDate", attendanceDate.toString());
        preview.put("clockIn", clockIn);
        preview.put("clockOut", clockOut);
        preview.put("remark", remark);

        return new AgentTaskPayloads.AgentPlan(
                "attendance.upsert",
                "Create or update one personal attendance record",
                "medium",
                true,
                executable,
                warnings,
                List.of(new AgentTaskPayloads.AgentPlanEntity("employee", actor.getEmpId(), actor.getEmpName())),
                preview,
                List.of(
                        new AgentTaskPayloads.AgentPlanStep(1, "Query attendance by date", "GET", "/api/attendance", Map.of("empId", actor.getEmpId(), "attendanceDate", attendanceDate.toString())),
                        new AgentTaskPayloads.AgentPlanStep(2, "Calculate attendance status", "LOCAL", "attendanceStatusResolver", Map.of("clockIn", clockIn, "clockOut", clockOut)),
                        new AgentTaskPayloads.AgentPlanStep(3, "Create or update attendance record", "POST/PUT", "/api/attendance", preview)
                ),
                List.of("You can rerun the command to correct the same attendance record later.")
        );
    }

    private AgentTaskPayloads.AgentPlan buildRolePermissionPlan(String command, UserProfile actor, AgentTaskPayloads.DraftPlan draft) {
        String action = safeText(draft.getAction());
        if (action.isEmpty()) action = findAction(command);
        Role role = findBestRole(draft.getRoleName(), command);
        Permission permission = findBestPermission(draft.getPermissionName(), command);

        List<String> warnings = new ArrayList<>();
        boolean executable = hasPermission(actor, "permission:role:perm");
        if (action.isEmpty()) {
            warnings.add("No permission action was recognized.");
            executable = false;
        }
        if (role == null) {
            warnings.add("Could not match a target role from the current role list.");
            executable = false;
        }
        if (permission == null) {
            warnings.add("Could not match a target permission from the current permission list.");
            executable = false;
        }
        if (!hasPermission(actor, "permission:role:perm")) {
            warnings.add("Current account does not have role permission configuration capability.");
            executable = false;
        }

        Map<String, Object> preview = new LinkedHashMap<>();
        preview.put("action", action);
        preview.put("roleId", role == null ? null : role.getRoleId());
        preview.put("roleName", role == null ? "" : role.getRoleName());
        preview.put("permissionId", permission == null ? null : permission.getPermId());
        preview.put("permissionName", permission == null ? "" : permission.getPermName());

        List<AgentTaskPayloads.AgentPlanEntity> entities = new ArrayList<>();
        if (role != null) entities.add(new AgentTaskPayloads.AgentPlanEntity("role", role.getRoleId(), role.getRoleName()));
        if (permission != null) entities.add(new AgentTaskPayloads.AgentPlanEntity("permission", permission.getPermId(), permission.getPermName()));

        return new AgentTaskPayloads.AgentPlan(
                "role-permission.update",
                ("remove".equals(action) ? "Remove" : "Add") + " one permission for one role",
                "high",
                true,
                executable,
                warnings,
                entities,
                preview,
                List.of(
                        new AgentTaskPayloads.AgentPlanStep(1, "Read current role permission ids", "GET", role == null ? "/api/role-permissions/role/{roleId}/perm-ids" : "/api/role-permissions/role/" + role.getRoleId() + "/perm-ids", Map.of()),
                        new AgentTaskPayloads.AgentPlanStep(2, "Apply permission delta", "PUT", role == null ? "/api/role-permissions/role/{roleId}" : "/api/role-permissions/role/" + role.getRoleId(), preview)
                ),
                List.of("The service can restore the previous permission ids if needed.")
        );
    }
    private String executeLeave(Integer taskId, AgentTaskPayloads.AgentPlan plan, UserProfile actor) {
        ensurePermission(actor, "attendance:leave:add");
        Map<String, Object> preview = plan.preview();
        LocalDate startDate = parseDateOrDefault(String.valueOf(preview.get("startDate")), LocalDate.now());
        LocalDate endDate = parseDateOrDefault(String.valueOf(preview.get("endDate")), startDate);
        int days = Integer.parseInt(String.valueOf(preview.get("days")));
        log(taskId, 1, "info", "Leave payload validated");

        ApprovalRule rule = findLeaveApprovalRule(actor.getIdentityTag(), days);
        log(taskId, 2, "info", "Leave approval chain resolved");

        LeaveRequest request = new LeaveRequest();
        request.setEmpId(actor.getEmpId());
        request.setLeaveType(String.valueOf(preview.get("leaveType")));
        request.setStartDate(startDate);
        request.setEndDate(endDate);
        request.setDays(BigDecimal.valueOf(days));
        request.setReason(safeText(String.valueOf(preview.get("reason"))));
        request.setStatus("待审批");
        request.setPendingApproverTag(rule == null ? "ADMIN" : safeText(rule.getFirstApproverTag()));
        request.setPendingApproverScope("company");
        request.setNextApproverTag(rule == null ? "" : safeText(rule.getSecondApproverTag()));
        request.setNextApproverScope(rule == null ? "" : safeText(rule.getSecondApproverScope()));
        request.setApplyTime(LocalDateTime.now());
        leaveRequestService.create(request);
        log(taskId, 3, "info", "Leave request created");
        return "Leave request submitted successfully";
    }

    private String executeAttendance(Integer taskId, AgentTaskPayloads.AgentPlan plan, UserProfile actor) {
        ensurePermission(actor, "attendance:record:add", "attendance:record:edit");
        Map<String, Object> preview = plan.preview();
        LocalDate attendanceDate = parseDateOrDefault(String.valueOf(preview.get("attendanceDate")), LocalDate.now());
        LocalTime clockIn = parseTime(String.valueOf(preview.get("clockIn")));
        LocalTime clockOut = parseTime(String.valueOf(preview.get("clockOut")));

        Optional<Attendance> existingOpt = attendanceRepository.findFirstByEmpIdAndAttendanceDate(actor.getEmpId(), attendanceDate);
        log(taskId, 1, "info", existingOpt.isPresent() ? "Existing attendance found" : "No attendance found for the target date");

        Attendance payload = new Attendance();
        payload.setEmpId(actor.getEmpId());
        payload.setAttendanceDate(attendanceDate);
        payload.setClockIn(clockIn);
        payload.setClockOut(clockOut);
        payload.setRemark(safeText(String.valueOf(preview.get("remark"))));
        payload.setStatus(resolveAttendanceStatus(clockIn, clockOut, existingOpt.map(Attendance::getStatus).orElse(ATTENDANCE_NORMAL)));
        log(taskId, 2, "info", "Attendance status resolved to " + payload.getStatus());

        if (existingOpt.isPresent()) {
            attendanceService.update(existingOpt.get().getAttendanceId(), payload);
            log(taskId, 3, "info", "Attendance updated");
            return "Attendance updated successfully";
        }
        attendanceService.create(payload);
        log(taskId, 3, "info", "Attendance created");
        return "Attendance created successfully";
    }

    private String executeRolePermission(Integer taskId, AgentTaskPayloads.AgentPlan plan, UserProfile actor) {
        ensurePermission(actor, "permission:role:perm");
        Map<String, Object> preview = plan.preview();
        Integer roleId = castInteger(preview.get("roleId"));
        Integer permissionId = castInteger(preview.get("permissionId"));
        String action = safeText(String.valueOf(preview.get("action")));
        if (roleId == null || permissionId == null || action.isEmpty()) throw new IllegalStateException("role permission plan is incomplete");

        List<Integer> currentIds = rolePermissionService.listPermIdsByRoleId(roleId);
        log(taskId, 1, "info", "Current permission set loaded");
        Set<Integer> nextIds = new LinkedHashSet<>(currentIds);
        if ("remove".equals(action)) nextIds.remove(permissionId); else nextIds.add(permissionId);
        rolePermissionService.replaceByRoleId(roleId, new ArrayList<>(nextIds));
        log(taskId, 2, "info", "Role permissions updated");
        return "Role permission updated successfully";
    }

    private ApprovalRule findLeaveApprovalRule(String applicantTag, int days) {
        return approvalRuleRepository.findAll().stream()
                .filter(rule -> "leave".equals(rule.getTypeCode()))
                .map(rule -> new RuleScore(rule, ruleMatchScore(rule, applicantTag, days)))
                .filter(item -> item.score() > 0)
                .sorted((a, b) -> {
                    if (b.score() != a.score()) return Integer.compare(b.score(), a.score());
                    return Integer.compare(a.rule().getSortOrder() == null ? 0 : a.rule().getSortOrder(), b.rule().getSortOrder() == null ? 0 : b.rule().getSortOrder());
                })
                .map(RuleScore::rule)
                .findFirst()
                .orElse(null);
    }

    private int ruleMatchScore(ApprovalRule rule, String applicantTag, int days) {
        BigDecimal value = rule.getDaysValue() == null ? BigDecimal.ZERO : rule.getDaysValue();
        boolean matchesDays = "any".equals(rule.getDaysOp())
                || ("<=".equals(rule.getDaysOp()) && BigDecimal.valueOf(days).compareTo(value) <= 0)
                || (">".equals(rule.getDaysOp()) && BigDecimal.valueOf(days).compareTo(value) > 0);
        if (!matchesDays) return 0;
        if (Objects.equals(rule.getApplicantTag(), applicantTag)) return 2;
        return matchIdentityTag(rule.getApplicantTag(), applicantTag) ? 1 : 0;
    }

    private boolean matchIdentityTag(String expectedTag, String actualTag) {
        if (expectedTag == null || expectedTag.isBlank()) return false;
        if ("ANY".equalsIgnoreCase(expectedTag) || "*".equals(expectedTag)) return true;
        return switch (safeText(actualTag)) {
            case "HR_MANAGER" -> List.of("HR_MANAGER", "MANAGER").contains(expectedTag);
            case "HR_SPECIALIST" -> List.of("HR_SPECIALIST", "EMPLOYEE").contains(expectedTag);
            case "FINANCE_MANAGER" -> List.of("FINANCE_MANAGER", "MANAGER").contains(expectedTag);
            case "FINANCE_SPECIALIST" -> List.of("FINANCE_SPECIALIST", "EMPLOYEE").contains(expectedTag);
            case "ADMIN" -> List.of("ADMIN").contains(expectedTag);
            case "MANAGER" -> List.of("MANAGER").contains(expectedTag);
            default -> List.of("EMPLOYEE").contains(expectedTag);
        };
    }

    private String resolveAttendanceStatus(LocalTime clockIn, LocalTime clockOut, String currentStatus) {
        List<String> parts = splitAttendanceStatus(currentStatus);
        if (parts.contains(ATTENDANCE_ABSENT) || parts.contains(ATTENDANCE_LEAVE)) return String.join("/", new LinkedHashSet<>(parts));
        List<String> next = new ArrayList<>();
        if (clockIn != null && clockIn.isAfter(LocalTime.of(9, 0))) next.add(ATTENDANCE_LATE);
        if (clockOut != null) {
            if (clockOut.isBefore(LocalTime.of(18, 0))) next.add(ATTENDANCE_EARLY);
            else if (clockOut.isAfter(LocalTime.of(18, 30))) next.add(ATTENDANCE_OVERTIME);
        }
        return next.isEmpty() ? ATTENDANCE_NORMAL : String.join("/", new LinkedHashSet<>(next));
    }

    private List<String> splitAttendanceStatus(String status) {
        String text = safeText(status);
        return text.isEmpty() ? List.of() : List.of(text.split("/"));
    }
    private void ensurePermission(UserProfile actor, String... permissions) {
        for (String permission : permissions) {
            if (hasPermission(actor, permission)) return;
        }
        throw new IllegalStateException("current account does not have required permission");
    }

    private boolean hasPermission(UserProfile actor, String permission) {
        if (actor == null) return false;
        if ("ADMIN".equals(actor.getRoleCode())) return true;
        List<String> perms = actor.getPermissions() == null ? List.of() : actor.getPermissions();
        if (perms.contains(permission)) return true;
        if (permission.endsWith(":view")) return perms.contains(permission.replace(":view", ""));
        if ("dashboard:view".equals(permission)) return perms.contains("dashboard");
        if ("dashboard:ai:view".equals(permission)) return perms.contains("dashboard:ai") || perms.contains("dashboard:ai:view");
        return false;
    }

    private Role findBestRole(String preferredName, String command) {
        String preferred = normalizeSearch(preferredName);
        String text = normalizeSearch(command);
        return roleRepository.findAll().stream()
                .filter(role -> {
                    String name = normalizeSearch(role.getRoleName());
                    String code = normalizeSearch(role.getRoleCode());
                    return (!preferred.isEmpty() && (name.contains(preferred) || code.contains(preferred)))
                            || (!text.isEmpty() && (text.contains(name) || text.contains(code)));
                })
                .max(Comparator.comparingInt(role -> role.getRoleName() == null ? 0 : role.getRoleName().length()))
                .orElse(null);
    }

    private Permission findBestPermission(String preferredName, String command) {
        String preferred = normalizeSearch(preferredName);
        String text = normalizeSearch(command);
        Map<String, List<String>> aliases = new HashMap<>();
        aliases.put("报表中心", List.of("报表中心", "数据报表", "报表"));
        aliases.put("考勤记录", List.of("考勤记录", "考勤"));
        aliases.put("AI助手", List.of("ai助手", "ai 助手", "智能助手", "agent"));

        return permissionRepository.findAllByOrderBySortOrderAscPermIdAsc().stream()
                .filter(permission -> {
                    String name = normalizeSearch(permission.getPermName());
                    String code = normalizeSearch(permission.getPermCode());
                    if (!preferred.isEmpty() && (name.contains(preferred) || code.contains(preferred))) return true;
                    if (!text.isEmpty() && (text.contains(name) || text.contains(code))) return true;
                    return aliases.entrySet().stream().anyMatch(entry ->
                            normalizeSearch(permission.getPermName()).contains(normalizeSearch(entry.getKey()))
                                    && entry.getValue().stream().anyMatch(alias -> text.contains(normalizeSearch(alias)))
                    );
                })
                .max(Comparator.comparingInt(permission -> permission.getPermName() == null ? 0 : permission.getPermName().length()))
                .orElse(null);
    }

    private String extractMatchedName(String text, List<String> names) {
        String normalized = normalizeSearch(text);
        return names.stream().filter(name -> normalized.contains(normalizeSearch(name))).max(Comparator.comparingInt(String::length)).orElse("");
    }

    private String findLeaveType(String text) {
        for (String value : List.of("年假", "病假", "事假", "婚假", "产假", "陪产假", "丧假")) {
            if (safeText(text).contains(value)) return value;
        }
        return "年假";
    }

    private String findAction(String text) {
        String value = safeText(text);
        if (containsAny(value, "移除", "删除", "关闭", "取消", "禁用", "撤销")) return "remove";
        if (containsAny(value, "增加", "添加", "开启", "启用", "开通", "授予")) return "add";
        return "";
    }

    private String extractRemark(String text) {
        Matcher matcher = Pattern.compile("(?:备注|原因|说明|因为)[：:\\s]*([^，。；]+.*)$").matcher(safeText(text));
        return matcher.find() ? safeText(matcher.group(1)) : "";
    }

    private List<String> extractDates(String text) {
        List<String> values = new ArrayList<>();
        Matcher matcher = Pattern.compile("\\d{4}[-/.]\\d{1,2}[-/.]\\d{1,2}").matcher(text);
        while (matcher.find()) {
            String match = matcher.group().replace('/', '-').replace('.', '-');
            String[] parts = match.split("-");
            values.add(parts[0] + "-" + pad(parts[1]) + "-" + pad(parts[2]));
        }
        return values;
    }

    private List<String> extractTimes(String text) {
        List<String> values = new ArrayList<>();
        Matcher matcher = Pattern.compile("\\b([01]?\\d|2[0-3]):([0-5]\\d)\\b").matcher(text);
        while (matcher.find()) values.add(pad(matcher.group(1)) + ":" + pad(matcher.group(2)));
        return values;
    }

    private LocalDate parseDateOrDefault(String value, LocalDate defaultValue) {
        String text = safeText(value);
        if (text.isEmpty() || "null".equalsIgnoreCase(text)) return defaultValue;
        try {
            return LocalDate.parse(text, DateTimeFormatter.ISO_LOCAL_DATE);
        } catch (DateTimeParseException ex) {
            return defaultValue;
        }
    }

    private LocalTime parseTime(String value) {
        String text = safeText(value);
        if (text.isEmpty() || "null".equalsIgnoreCase(text)) return null;
        try {
            return LocalTime.parse(text, DateTimeFormatter.ofPattern("HH:mm"));
        } catch (DateTimeParseException ex) {
            return null;
        }
    }

    private int calculateDays(LocalDate startDate, LocalDate endDate) {
        return (int) (endDate.toEpochDay() - startDate.toEpochDay()) + 1;
    }

    private String safeText(String value) {
        return value == null ? "" : value.trim();
    }

    private boolean containsAny(String text, String... keywords) {
        for (String keyword : keywords) {
            if (safeText(text).contains(keyword)) return true;
        }
        return false;
    }

    private String normalizeSearch(String value) {
        return safeText(value).toLowerCase(Locale.ROOT).replaceAll("\\s+", "");
    }

    private String pad(String value) {
        return String.format(Locale.ROOT, "%02d", Integer.parseInt(value));
    }

    private Integer castInteger(Object value) {
        if (value == null) return null;
        if (value instanceof Integer integer) return integer;
        String text = safeText(String.valueOf(value));
        if (text.isEmpty() || "null".equalsIgnoreCase(text)) return null;
        return Integer.parseInt(text);
    }

    private String writePlan(AgentTaskPayloads.AgentPlan plan) {
        try {
            return objectMapper.writeValueAsString(plan);
        } catch (Exception ex) {
            throw new IllegalStateException("failed to serialize agent plan", ex);
        }
    }

    private AgentTaskPayloads.AgentPlan readPlan(String planJson) {
        try {
            return objectMapper.readValue(planJson, AgentTaskPayloads.AgentPlan.class);
        } catch (Exception ex) {
            throw new IllegalStateException("failed to parse saved agent plan", ex);
        }
    }

    private AgentTask findTask(Integer taskId) {
        return taskRepository.findById(taskId).orElseThrow(() -> new NotFoundException("agent task not found"));
    }

    private void log(Integer taskId, Integer stepNo, String level, String message) {
        AgentExecutionLog log = new AgentExecutionLog();
        log.setTaskId(taskId);
        log.setStepNo(stepNo);
        log.setLogLevel(level);
        log.setMessage(message);
        logRepository.save(log);
    }

    private AgentTaskPayloads.AgentTaskView toView(AgentTask task) {
        AgentTaskPayloads.AgentPlan plan = readPlan(task.getPlanJson());
        List<AgentTaskPayloads.AgentLogView> logs = logRepository.findByTaskIdOrderByLogIdAsc(task.getTaskId()).stream()
                .map(log -> new AgentTaskPayloads.AgentLogView(log.getLogId(), log.getStepNo(), log.getLogLevel(), log.getMessage(), log.getCreateTime() == null ? "" : log.getCreateTime().toString()))
                .toList();
        return new AgentTaskPayloads.AgentTaskView(task.getTaskId(), task.getStatus(), task.getProviderName(), task.getCommandText(), plan, task.getResultSummary(), logs);
    }

    private record ProviderResult(String providerName, AgentTaskPayloads.DraftPlan draft) {}
    private record RuleScore(ApprovalRule rule, int score) {}
}
