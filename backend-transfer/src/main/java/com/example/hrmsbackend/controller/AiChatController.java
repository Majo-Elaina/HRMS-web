package com.example.hrmsbackend.controller;

import com.example.hrmsbackend.common.ApiResponse;
import com.example.hrmsbackend.dto.AiChatPayloads;
import com.example.hrmsbackend.service.AiChatService;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/ai")
public class AiChatController {
    private final AiChatService service;

    public AiChatController(AiChatService service) {
        this.service = service;
    }

    @PostMapping("/chat")
    public ApiResponse<AiChatPayloads.ChatResponse> chat(@RequestBody AiChatPayloads.ChatRequest request) {
        return ApiResponse.ok(service.chat(request));
    }
}
