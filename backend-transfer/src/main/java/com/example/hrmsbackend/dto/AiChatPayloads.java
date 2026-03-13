package com.example.hrmsbackend.dto;

import java.util.List;

public final class AiChatPayloads {
    private AiChatPayloads() {
    }

    public static class ChatRequest {
        private Integer userId;
        private String message;
        private List<ChatMessage> history;

        public Integer getUserId() {
            return userId;
        }

        public void setUserId(Integer userId) {
            this.userId = userId;
        }

        public String getMessage() {
            return message;
        }

        public void setMessage(String message) {
            this.message = message;
        }

        public List<ChatMessage> getHistory() {
            return history;
        }

        public void setHistory(List<ChatMessage> history) {
            this.history = history;
        }
    }

    public static class ChatMessage {
        private String role;
        private String content;

        public String getRole() {
            return role;
        }

        public void setRole(String role) {
            this.role = role;
        }

        public String getContent() {
            return content;
        }

        public void setContent(String content) {
            this.content = content;
        }
    }

    public record ChatSource(String type, String title) {
    }

    public record ChatResponse(
            String assistantName,
            String provider,
            String model,
            Boolean providerAvailable,
            String notice,
            String reply,
            Boolean usedSystemData,
            List<ChatSource> sources
    ) {
    }
}
