package com.example.hrmsbackend.service;

import com.example.hrmsbackend.dto.AiChatPayloads;
import com.example.hrmsbackend.dto.DepartmentStat;
import com.example.hrmsbackend.dto.ReportSummary;
import com.example.hrmsbackend.dto.UserProfile;
import com.example.hrmsbackend.entity.ApprovalRule;
import com.example.hrmsbackend.entity.ApprovalRuleType;
import com.example.hrmsbackend.entity.Attendance;
import com.example.hrmsbackend.entity.Department;
import com.example.hrmsbackend.entity.DeptPermissionTemplate;
import com.example.hrmsbackend.entity.Employee;
import com.example.hrmsbackend.entity.IdentityTag;
import com.example.hrmsbackend.entity.JobPosition;
import com.example.hrmsbackend.entity.LeaveRequest;
import com.example.hrmsbackend.entity.ModuleScopeDetail;
import com.example.hrmsbackend.entity.ModuleScopeRule;
import com.example.hrmsbackend.entity.Permission;
import com.example.hrmsbackend.entity.Role;
import com.example.hrmsbackend.entity.SalaryConfig;
import com.example.hrmsbackend.entity.SalaryRecord;
import com.example.hrmsbackend.entity.SysUser;
import com.example.hrmsbackend.repository.ApprovalRuleRepository;
import com.example.hrmsbackend.repository.ApprovalRuleTypeRepository;
import com.example.hrmsbackend.repository.AttendanceRepository;
import com.example.hrmsbackend.repository.DepartmentRepository;
import com.example.hrmsbackend.repository.DeptPermissionTemplateRepository;
import com.example.hrmsbackend.repository.EmployeeRepository;
import com.example.hrmsbackend.repository.IdentityTagRepository;
import com.example.hrmsbackend.repository.JobPositionRepository;
import com.example.hrmsbackend.repository.LeaveRequestRepository;
import com.example.hrmsbackend.repository.ModuleScopeDetailRepository;
import com.example.hrmsbackend.repository.ModuleScopeRuleRepository;
import com.example.hrmsbackend.repository.PermissionRepository;
import com.example.hrmsbackend.repository.RolePermissionRepository;
import com.example.hrmsbackend.repository.RoleRepository;
import com.example.hrmsbackend.repository.SalaryConfigRepository;
import com.example.hrmsbackend.repository.SalaryRecordRepository;
import com.example.hrmsbackend.repository.SysUserRepository;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Objects;
import java.util.stream.Collectors;

@Service
@Transactional(readOnly = true)
public class AiReadonlyKnowledgeService {
    private final ReportService reportService;
    private final EmployeeRepository employeeRepository;
    private final DepartmentRepository departmentRepository;
    private final JobPositionRepository jobPositionRepository;
    private final SysUserRepository sysUserRepository;
    private final RoleRepository roleRepository;
    private final PermissionRepository permissionRepository;
    private final RolePermissionRepository rolePermissionRepository;
    private final AttendanceRepository attendanceRepository;
    private final LeaveRequestRepository leaveRequestRepository;
    private final SalaryRecordRepository salaryRecordRepository;
    private final SalaryConfigRepository salaryConfigRepository;
    private final ApprovalRuleRepository approvalRuleRepository;
    private final ApprovalRuleTypeRepository approvalRuleTypeRepository;
    private final IdentityTagRepository identityTagRepository;
    private final ModuleScopeRuleRepository moduleScopeRuleRepository;
    private final ModuleScopeDetailRepository moduleScopeDetailRepository;
    private final DeptPermissionTemplateRepository deptPermissionTemplateRepository;

    public AiReadonlyKnowledgeService(ReportService reportService,
                                      EmployeeRepository employeeRepository,
                                      DepartmentRepository departmentRepository,
                                      JobPositionRepository jobPositionRepository,
                                      SysUserRepository sysUserRepository,
                                      RoleRepository roleRepository,
                                      PermissionRepository permissionRepository,
                                      RolePermissionRepository rolePermissionRepository,
                                      AttendanceRepository attendanceRepository,
                                      LeaveRequestRepository leaveRequestRepository,
                                      SalaryRecordRepository salaryRecordRepository,
                                      SalaryConfigRepository salaryConfigRepository,
                                      ApprovalRuleRepository approvalRuleRepository,
                                      ApprovalRuleTypeRepository approvalRuleTypeRepository,
                                      IdentityTagRepository identityTagRepository,
                                      ModuleScopeRuleRepository moduleScopeRuleRepository,
                                      ModuleScopeDetailRepository moduleScopeDetailRepository,
                                      DeptPermissionTemplateRepository deptPermissionTemplateRepository) {
        this.reportService = reportService;
        this.employeeRepository = employeeRepository;
        this.departmentRepository = departmentRepository;
        this.jobPositionRepository = jobPositionRepository;
        this.sysUserRepository = sysUserRepository;
        this.roleRepository = roleRepository;
        this.permissionRepository = permissionRepository;
        this.rolePermissionRepository = rolePermissionRepository;
        this.attendanceRepository = attendanceRepository;
        this.leaveRequestRepository = leaveRequestRepository;
        this.salaryRecordRepository = salaryRecordRepository;
        this.salaryConfigRepository = salaryConfigRepository;
        this.approvalRuleRepository = approvalRuleRepository;
        this.approvalRuleTypeRepository = approvalRuleTypeRepository;
        this.identityTagRepository = identityTagRepository;
        this.moduleScopeRuleRepository = moduleScopeRuleRepository;
        this.moduleScopeDetailRepository = moduleScopeDetailRepository;
        this.deptPermissionTemplateRepository = deptPermissionTemplateRepository;
    }

    public KnowledgePack resolve(String message, UserProfile actor) {
        String normalized = normalize(message);
        StringBuilder context = new StringBuilder();
        List<AiChatPayloads.ChatSource> sources = new ArrayList<>();

        if (containsAny(normalized, "公司", "系统", "概况", "总览", "整体", "全部", "所有")) {
            appendSystemOverview(context, sources);
        }
        if (containsAny(normalized, "我", "我的", "当前用户", "当前账号", "个人")) {
            appendCurrentUserProfile(context, sources, actor);
        }
        if (containsAny(normalized, "员工", "人员", "入职", "在职", "离职")) {
            appendEmployeeContext(context, sources);
        }
        if (containsAny(normalized, "部门")) {
            appendDepartmentContext(context, sources);
        }
        if (containsAny(normalized, "岗位", "职位")) {
            appendPositionContext(context, sources);
        }
        if (containsAny(normalized, "用户", "账号", "登录")) {
            appendUserContext(context, sources, actor);
        }
        if (containsAny(normalized, "角色", "权限", "授权")) {
            appendRolePermissionContext(context, sources, actor);
        }
        if (containsAny(normalized, "考勤", "出勤", "打卡", "签到", "签退")) {
            appendAttendanceContext(context, sources, actor);
        }
        if (containsAny(normalized, "请假", "休假", "假期")) {
            appendLeaveContext(context, sources, actor);
        }
        if (containsAny(normalized, "工资", "薪资", "薪酬", "发薪")) {
            appendSalaryContext(context, sources, actor);
        }
        if (containsAny(normalized, "报表", "统计", "指标", "分布", "出勤率")) {
            appendReportContext(context, sources, actor);
        }
        if (containsAny(normalized, "审批", "流程", "审批规则")) {
            appendApprovalContext(context, sources, actor);
        }
        if (containsAny(normalized, "身份标签")) {
            appendIdentityContext(context, sources, actor);
        }
        if (containsAny(normalized, "模块范围", "数据范围", "模块权限")) {
            appendModuleScopeContext(context, sources, actor);
        }
        if (containsAny(normalized, "部门权限", "权限模板")) {
            appendDeptTemplateContext(context, sources, actor);
        }

        return new KnowledgePack(context.toString().trim(), sources);
    }

    private void appendSystemOverview(StringBuilder context, List<AiChatPayloads.ChatSource> sources) {
        ReportSummary summary = reportService.buildSummary();
        appendContext(context, String.format(Locale.ROOT,
                "系统总览：员工总数=%d，本月新入职=%d，请假单数=%d，出勤率=%s%%，部门数=%d，岗位数=%d，用户数=%d，角色数=%d，权限点数=%d，考勤记录数=%d，薪资记录数=%d，薪资配置数=%d，审批规则数=%d，身份标签数=%d，模块范围规则数=%d，部门权限模板数=%d。",
                summary.getTotalEmployees(),
                summary.getNewEmployeesThisMonth(),
                summary.getLeaveCount(),
                decimalText(summary.getAttendanceRate()),
                departmentRepository.count(),
                jobPositionRepository.count(),
                sysUserRepository.count(),
                roleRepository.count(),
                permissionRepository.count(),
                attendanceRepository.count(),
                salaryRecordRepository.count(),
                salaryConfigRepository.count(),
                approvalRuleRepository.count(),
                identityTagRepository.count(),
                moduleScopeRuleRepository.count(),
                deptPermissionTemplateRepository.count()));
        sources.add(new AiChatPayloads.ChatSource("system.overview", "系统总览"));
    }

    private void appendCurrentUserProfile(StringBuilder context, List<AiChatPayloads.ChatSource> sources, UserProfile actor) {
        appendContext(context, String.format(Locale.ROOT,
                "当前登录用户资料：姓名=%s，部门=%s，岗位=%s，身份标签=%s，角色=%s，账号=%s。",
                emptyAs(actor.getEmpName(), "未知"),
                emptyAs(actor.getDeptName(), "未知"),
                emptyAs(actor.getPositionName(), "未知"),
                emptyAs(actor.getIdentityTag(), "未知"),
                emptyAs(actor.getRoleName(), "未知"),
                emptyAs(actor.getUsername(), "未知")));
        sources.add(new AiChatPayloads.ChatSource("user.profile", "当前用户资料"));
    }

    private void appendEmployeeContext(StringBuilder context, List<AiChatPayloads.ChatSource> sources) {
        Map<Integer, String> deptMap = departmentRepository.findAll().stream()
                .collect(Collectors.toMap(Department::getDeptId, Department::getDeptName));
        List<Employee> sample = employeeRepository.findAll().stream()
                .sorted(Comparator.comparing(Employee::getEmpId))
                .limit(8)
                .toList();
        String sampleText = sample.stream()
                .map(item -> item.getEmpName() + "(" + emptyAs(deptMap.get(item.getDeptId()), "未知部门") + "/" + emptyAs(item.getStatus(), "未知状态") + ")")
                .collect(Collectors.joining("、"));
        appendContext(context, "员工数据：当前员工总数为 " + employeeRepository.count() + "。示例员工：" + emptyAs(sampleText, "暂无数据") + "。");
        sources.add(new AiChatPayloads.ChatSource("employee.domain", "员工数据"));
    }

    private void appendDepartmentContext(StringBuilder context, List<AiChatPayloads.ChatSource> sources) {
        List<Department> departments = departmentRepository.findAll().stream()
                .sorted(Comparator.comparing(Department::getDeptId))
                .toList();
        String names = departments.stream()
                .limit(12)
                .map(Department::getDeptName)
                .collect(Collectors.joining("、"));
        appendContext(context, "部门数据：当前共有 " + departments.size() + " 个部门。部门列表：" + emptyAs(names, "暂无数据") + "。");
        sources.add(new AiChatPayloads.ChatSource("department.domain", "部门数据"));
    }

    private void appendPositionContext(StringBuilder context, List<AiChatPayloads.ChatSource> sources) {
        Map<Integer, String> deptMap = departmentRepository.findAll().stream()
                .collect(Collectors.toMap(Department::getDeptId, Department::getDeptName));
        List<JobPosition> positions = jobPositionRepository.findAll().stream()
                .sorted(Comparator.comparing(JobPosition::getPositionId))
                .limit(12)
                .toList();
        String text = positions.stream()
                .map(item -> item.getPositionName() + "(" + emptyAs(deptMap.get(item.getDeptId()), "未知部门") + ")")
                .collect(Collectors.joining("、"));
        appendContext(context, "岗位数据：当前共有 " + jobPositionRepository.count() + " 个岗位。示例岗位：" + emptyAs(text, "暂无数据") + "。");
        sources.add(new AiChatPayloads.ChatSource("position.domain", "岗位数据"));
    }

    private void appendUserContext(StringBuilder context, List<AiChatPayloads.ChatSource> sources, UserProfile actor) {
        if (!hasPermission(actor, "permission:user:view")) {
            appendContext(context, "用户账号数据：当前账号没有用户管理查看权限，所以这里只能读取当前登录用户自己的账号资料。");
            sources.add(new AiChatPayloads.ChatSource("user.domain.restricted", "用户数据受限"));
            return;
        }

        Map<Integer, String> roleMap = roleRepository.findAll().stream()
                .collect(Collectors.toMap(Role::getRoleId, Role::getRoleName));
        List<SysUser> users = sysUserRepository.findAll().stream()
                .sorted(Comparator.comparing(SysUser::getUserId))
                .limit(10)
                .toList();
        String text = users.stream()
                .map(item -> item.getUsername() + "(" + emptyAs(roleMap.get(item.getRoleId()), "未知角色") + ")")
                .collect(Collectors.joining("、"));
        appendContext(context, "用户账号数据：当前共有 " + sysUserRepository.count() + " 个系统账号。示例账号：" + emptyAs(text, "暂无数据") + "。");
        sources.add(new AiChatPayloads.ChatSource("user.domain", "用户账号数据"));
    }

    private void appendRolePermissionContext(StringBuilder context, List<AiChatPayloads.ChatSource> sources, UserProfile actor) {
        if (!hasPermission(actor, "permission:role:view")) {
            appendContext(context, "角色与权限数据：当前账号没有角色管理查看权限，所以这里只能使用你自己的角色资料。当前角色：" + emptyAs(actor.getRoleName(), "未知") + "。");
            sources.add(new AiChatPayloads.ChatSource("role.domain.self", "当前角色信息"));
            return;
        }

        List<Role> roles = roleRepository.findAll().stream()
                .sorted(Comparator.comparing(Role::getRoleId))
                .toList();
        List<Permission> permissions = permissionRepository.findAllByOrderBySortOrderAscPermIdAsc();
        appendContext(context, "角色与权限数据：当前共有 " + roles.size() + " 个角色，" + permissions.size() + " 个权限点，角色权限关联数为 " + rolePermissionRepository.count() + "。");
        appendContext(context, "角色示例：" + roles.stream().limit(8).map(Role::getRoleName).collect(Collectors.joining("、")) + "。");
        appendContext(context, "权限点示例：" + permissions.stream().limit(12).map(Permission::getPermName).collect(Collectors.joining("、")) + "。");
        sources.add(new AiChatPayloads.ChatSource("role.permission.domain", "角色与权限数据"));
    }

    private void appendAttendanceContext(StringBuilder context, List<AiChatPayloads.ChatSource> sources, UserProfile actor) {
        appendContext(context, "考勤数据：当前系统共有 " + attendanceRepository.count() + " 条考勤记录。");

        if (actor.getEmpId() != null) {
            List<Attendance> selfRecords = attendanceRepository.findAll((Specification<Attendance>) (root, query, cb) ->
                    cb.equal(root.get("empId"), actor.getEmpId()));
            selfRecords = selfRecords.stream()
                    .sorted(Comparator.comparing(Attendance::getAttendanceDate, Comparator.nullsLast(LocalDate::compareTo)).reversed())
                    .limit(5)
                    .toList();
            String text = selfRecords.stream()
                    .map(item -> item.getAttendanceDate() + "/" + emptyAs(item.getStatus(), "未知状态"))
                    .collect(Collectors.joining("、"));
            appendContext(context, "当前用户最近考勤：" + emptyAs(text, "暂无记录") + "。");
        }

        sources.add(new AiChatPayloads.ChatSource("attendance.domain", "考勤数据"));
    }

    private void appendLeaveContext(StringBuilder context, List<AiChatPayloads.ChatSource> sources, UserProfile actor) {
        List<LeaveRequest> all = leaveRequestRepository.findAll();
        appendContext(context, "请假数据：当前系统共有 " + all.size() + " 条请假记录。");

        if (actor.getEmpId() != null) {
            List<LeaveRequest> selfRecords = all.stream()
                    .filter(item -> Objects.equals(item.getEmpId(), actor.getEmpId()))
                    .sorted(Comparator.comparing(LeaveRequest::getApplyTime, Comparator.nullsLast(LocalDateTime::compareTo)).reversed())
                    .limit(5)
                    .toList();
            String text = selfRecords.stream()
                    .map(item -> item.getLeaveType() + "/" + emptyAs(item.getStatus(), "未知状态"))
                    .collect(Collectors.joining("、"));
            appendContext(context, "当前用户最近请假：" + emptyAs(text, "暂无记录") + "。");
        }

        appendContext(context, buildLeaveRuleSummary());
        sources.add(new AiChatPayloads.ChatSource("leave.domain", "请假数据"));
    }

    private void appendSalaryContext(StringBuilder context, List<AiChatPayloads.ChatSource> sources, UserProfile actor) {
        appendContext(context, "薪资数据：当前系统共有 " + salaryRecordRepository.count() + " 条薪资记录，" + salaryConfigRepository.count() + " 条薪资配置。");

        if (actor.getEmpId() != null) {
            List<SalaryRecord> selfRecords = salaryRecordRepository.findAll((Specification<SalaryRecord>) (root, query, cb) ->
                    cb.equal(root.get("empId"), actor.getEmpId()));
            SalaryRecord latest = selfRecords.stream()
                    .filter(item -> item.getSalaryMonth() != null)
                    .max(Comparator.comparing(SalaryRecord::getSalaryMonth))
                    .orElse(null);
            if (latest != null) {
                appendContext(context, "当前用户最近工资：" + describeSalary(latest));
            }
        }

        if (hasPermission(actor, "salary:config:view")) {
            List<SalaryConfig> configs = salaryConfigRepository.findAll().stream()
                    .sorted(Comparator.comparing(SalaryConfig::getConfigId))
                    .limit(8)
                    .toList();
            String text = configs.stream()
                    .map(item -> item.getConfigName() + "=" + emptyAs(item.getConfigValue(), ""))
                    .collect(Collectors.joining("、"));
            appendContext(context, "薪资配置示例：" + emptyAs(text, "暂无配置") + "。");
        }

        sources.add(new AiChatPayloads.ChatSource("salary.domain", "薪资数据"));
    }

    private void appendReportContext(StringBuilder context, List<AiChatPayloads.ChatSource> sources, UserProfile actor) {
        if (!hasPermission(actor, "report:view")) {
            appendContext(context, "报表数据：当前账号没有数据报表查看权限。");
            sources.add(new AiChatPayloads.ChatSource("report.domain.restricted", "报表数据受限"));
            return;
        }

        ReportSummary summary = reportService.buildSummary();
        String deptText = summary.getDepartmentStats() == null
                ? ""
                : summary.getDepartmentStats().stream()
                .limit(6)
                .map(DepartmentStat::getName)
                .collect(Collectors.joining("、"));
        appendContext(context, String.format(Locale.ROOT,
                "报表数据：员工总数=%d，本月新入职=%d，本月请假=%d，出勤率=%s%%，部门分布示例=%s。",
                summary.getTotalEmployees(),
                summary.getNewEmployeesThisMonth(),
                summary.getLeaveCount(),
                decimalText(summary.getAttendanceRate()),
                emptyAs(deptText, "暂无数据")));
        sources.add(new AiChatPayloads.ChatSource("report.domain", "报表数据"));
    }

    private void appendApprovalContext(StringBuilder context, List<AiChatPayloads.ChatSource> sources, UserProfile actor) {
        if (!hasPermission(actor, "permission:approval-rule:view")) {
            appendContext(context, "审批规则数据：当前账号没有审批规则查看权限。");
            sources.add(new AiChatPayloads.ChatSource("approval.domain.restricted", "审批规则受限"));
            return;
        }

        List<ApprovalRuleType> types = approvalRuleTypeRepository.findAll().stream()
                .sorted(Comparator.comparing(ApprovalRuleType::getTypeCode))
                .toList();
        List<ApprovalRule> rules = approvalRuleRepository.findAll().stream()
                .sorted(Comparator.comparing(item -> item.getSortOrder() == null ? 0 : item.getSortOrder()))
                .toList();

        appendContext(context, "审批规则数据：审批类型数=" + types.size() + "，审批规则数=" + rules.size() + "。");
        appendContext(context, "审批类型：" + types.stream().map(ApprovalRuleType::getTypeName).collect(Collectors.joining("、")) + "。");
        appendContext(context, buildLeaveRuleSummary());
        sources.add(new AiChatPayloads.ChatSource("approval.domain", "审批规则数据"));
    }

    private void appendIdentityContext(StringBuilder context, List<AiChatPayloads.ChatSource> sources, UserProfile actor) {
        if (!hasPermission(actor, "permission:identity:view")) {
            appendContext(context, "身份标签数据：当前账号没有身份标签查看权限。");
            sources.add(new AiChatPayloads.ChatSource("identity.domain.restricted", "身份标签受限"));
            return;
        }

        List<IdentityTag> tags = identityTagRepository.findAll().stream()
                .sorted(Comparator.comparing(IdentityTag::getTagCode))
                .toList();
        appendContext(context, "身份标签数据：当前共有 " + tags.size() + " 个身份标签。标签列表：" + tags.stream().map(IdentityTag::getTagName).collect(Collectors.joining("、")) + "。");
        sources.add(new AiChatPayloads.ChatSource("identity.domain", "身份标签数据"));
    }

    private void appendModuleScopeContext(StringBuilder context, List<AiChatPayloads.ChatSource> sources, UserProfile actor) {
        if (!hasPermission(actor, "permission:module-scope:view")) {
            appendContext(context, "模块范围数据：当前账号没有模块范围查看权限。");
            sources.add(new AiChatPayloads.ChatSource("module-scope.domain.restricted", "模块范围受限"));
            return;
        }

        List<ModuleScopeRule> rules = moduleScopeRuleRepository.findAllByOrderByModuleCodeAsc();
        List<ModuleScopeDetail> details = moduleScopeDetailRepository.findAll().stream()
                .sorted(Comparator.comparing(ModuleScopeDetail::getId))
                .limit(12)
                .toList();
        appendContext(context, "模块范围数据：规则数=" + rules.size() + "，明细数=" + moduleScopeDetailRepository.count() + "。");
        appendContext(context, "模块范围规则：" + rules.stream().map(item -> item.getModuleName() + "=" + item.getDefaultScope()).collect(Collectors.joining("、")) + "。");
        appendContext(context, "模块范围明细示例：" + details.stream().map(item -> item.getModuleCode() + "/" + item.getTagCode() + "/" + item.getScope()).collect(Collectors.joining("、")) + "。");
        sources.add(new AiChatPayloads.ChatSource("module-scope.domain", "模块范围数据"));
    }

    private void appendDeptTemplateContext(StringBuilder context, List<AiChatPayloads.ChatSource> sources, UserProfile actor) {
        if (!hasPermission(actor, "permission:dept-template:view")) {
            appendContext(context, "部门权限模板数据：当前账号没有部门权限模板查看权限。");
            sources.add(new AiChatPayloads.ChatSource("dept-template.domain.restricted", "部门权限模板受限"));
            return;
        }

        Map<Integer, String> deptMap = departmentRepository.findAll().stream()
                .collect(Collectors.toMap(Department::getDeptId, Department::getDeptName));
        List<DeptPermissionTemplate> items = deptPermissionTemplateRepository.findAll().stream()
                .sorted(Comparator.comparing(DeptPermissionTemplate::getId))
                .limit(12)
                .toList();
        appendContext(context, "部门权限模板数据：当前共有 " + deptPermissionTemplateRepository.count() + " 条模板明细。");
        appendContext(context, "模板示例：" + items.stream()
                .map(item -> emptyAs(deptMap.get(item.getDeptId()), "未知部门") + "/" + item.getModuleCode())
                .collect(Collectors.joining("、")) + "。");
        sources.add(new AiChatPayloads.ChatSource("dept-template.domain", "部门权限模板数据"));
    }

    private String buildLeaveRuleSummary() {
        List<ApprovalRule> leaveRules = approvalRuleRepository.findAll().stream()
                .filter(item -> Objects.equals(item.getTypeCode(), "leave"))
                .sorted(Comparator.comparing(item -> item.getSortOrder() == null ? 0 : item.getSortOrder()))
                .toList();
        if (leaveRules.isEmpty()) {
            return "请假审批规则：当前系统中没有配置请假审批规则。";
        }
        return "请假审批规则摘要：" + leaveRules.stream()
                .map(item -> "【申请人=" + emptyAs(item.getApplicantTag(), "ANY")
                        + "，天数条件=" + describeDays(item)
                        + "，一级=" + emptyAs(item.getFirstApproverTag(), "无")
                        + (hasText(item.getSecondApproverTag()) ? "，二级=" + item.getSecondApproverTag() : "")
                        + "】")
                .collect(Collectors.joining(" "));
    }

    private String describeSalary(SalaryRecord record) {
        return String.format(Locale.ROOT,
                "月份=%s，税前=%s，实发=%s，基本工资=%s，岗位工资=%s，奖金=%s，加班费=%s，状态=%s。",
                emptyAs(record.getSalaryMonth() == null ? "" : record.getSalaryMonth().toString(), "未知"),
                decimalText(record.getGrossSalary()),
                decimalText(record.getNetSalary()),
                decimalText(record.getBaseSalary()),
                decimalText(record.getPositionSalary()),
                decimalText(record.getBonus()),
                decimalText(record.getOvertimePay()),
                emptyAs(record.getStatus(), "未知"));
    }

    private String describeDays(ApprovalRule rule) {
        String op = safeText(rule.getDaysOp());
        if ("any".equalsIgnoreCase(op)) {
            return "任意天数";
        }
        return op + " " + decimalText(rule.getDaysValue());
    }

    private boolean hasPermission(UserProfile actor, String permission) {
        if (actor == null) {
            return false;
        }
        if ("ADMIN".equals(actor.getRoleCode())) {
            return true;
        }
        List<String> permissions = actor.getPermissions() == null ? List.of() : actor.getPermissions();
        if (permissions.contains(permission)) {
            return true;
        }
        return permission.endsWith(":view") && permissions.contains(permission.replace(":view", ""));
    }

    private void appendContext(StringBuilder builder, String value) {
        if (!hasText(value)) {
            return;
        }
        if (builder.length() > 0) {
            builder.append('\n');
        }
        builder.append(value);
    }

    private boolean containsAny(String text, String... patterns) {
        for (String pattern : patterns) {
            if (text.contains(normalize(pattern))) {
                return true;
            }
        }
        return false;
    }

    private String normalize(String value) {
        return safeText(value).toLowerCase(Locale.ROOT).replaceAll("\\s+", "");
    }

    private String decimalText(BigDecimal value) {
        return value == null ? "0" : value.stripTrailingZeros().toPlainString();
    }

    private boolean hasText(String value) {
        return value != null && !value.isBlank();
    }

    private String safeText(String value) {
        return value == null ? "" : value.trim();
    }

    private String emptyAs(String value, String fallback) {
        return hasText(value) ? value : fallback;
    }

    public record KnowledgePack(String contextText, List<AiChatPayloads.ChatSource> sources) {
        public boolean hasContext() {
            return contextText != null && !contextText.isBlank();
        }
    }
}
