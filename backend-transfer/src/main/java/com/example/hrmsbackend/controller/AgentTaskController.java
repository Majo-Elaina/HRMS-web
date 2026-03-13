package com.example.hrmsbackend.controller;

import com.example.hrmsbackend.common.ApiResponse;
import com.example.hrmsbackend.dto.AgentTaskPayloads;
import com.example.hrmsbackend.service.AgentTaskService;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/agent/tasks")
public class AgentTaskController {
    private final AgentTaskService service;

    public AgentTaskController(AgentTaskService service) {
        this.service = service;
    }

    @PostMapping("/plan")
    public ApiResponse<AgentTaskPayloads.AgentTaskView> plan(@RequestBody AgentTaskPayloads.PlanRequest request) {
        return ApiResponse.ok(service.planTask(request));
    }

    @GetMapping("/{taskId}")
    public ApiResponse<AgentTaskPayloads.AgentTaskView> get(@PathVariable Integer taskId) {
        return ApiResponse.ok(service.getTask(taskId));
    }

    @PostMapping("/{taskId}/approve-execute")
    public ApiResponse<AgentTaskPayloads.AgentTaskView> approveAndExecute(
            @PathVariable Integer taskId,
            @RequestBody AgentTaskPayloads.ApproveRequest request) {
        return ApiResponse.ok(service.approveAndExecute(taskId, request));
    }
}
