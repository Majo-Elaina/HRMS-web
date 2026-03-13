package com.example.hrmsbackend.config;

import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.stereotype.Component;

import java.util.ArrayList;
import java.util.List;

@Component
@ConfigurationProperties(prefix = "ai.chat")
public class AiChatProperties {
    private String assistantName = "亚托莉";
    private String activeProvider = "openai-compatible-primary";
    private boolean exposeProviderErrors = false;
    private final List<ProviderConfig> providers = new ArrayList<>();

    public AiChatProperties() {
        ProviderConfig openAiCompatible = new ProviderConfig();
        openAiCompatible.setName("openai-compatible-primary");
        openAiCompatible.setType("openai-compatible");
        openAiCompatible.setEnabled(true);
        openAiCompatible.setBaseUrl("https://dashscope.aliyuncs.com/compatible-mode/v1");
        openAiCompatible.setModel("qwen3.5-plus");
        openAiCompatible.setTemperature(0.7);
        providers.add(openAiCompatible);

        ProviderConfig ollama = new ProviderConfig();
        ollama.setName("ollama-local");
        ollama.setType("ollama");
        ollama.setEnabled(true);
        ollama.setBaseUrl("http://localhost:11434");
        ollama.setModel("qwen3:4b");
        ollama.setTemperature(0.7);
        providers.add(ollama);
    }

    public String getAssistantName() {
        return assistantName;
    }

    public void setAssistantName(String assistantName) {
        this.assistantName = assistantName;
    }

    public String getActiveProvider() {
        return activeProvider;
    }

    public void setActiveProvider(String activeProvider) {
        this.activeProvider = activeProvider;
    }

    public boolean isExposeProviderErrors() {
        return exposeProviderErrors;
    }

    public void setExposeProviderErrors(boolean exposeProviderErrors) {
        this.exposeProviderErrors = exposeProviderErrors;
    }

    public List<ProviderConfig> getProviders() {
        return providers;
    }

    public ProviderConfig resolveActiveProvider() {
        if (providers.isEmpty()) {
            return null;
        }

        String target = safeText(activeProvider);
        if (!target.isEmpty()) {
            for (ProviderConfig provider : providers) {
                if (provider.isEnabled() && target.equals(provider.getName())) {
                    return provider;
                }
            }
        }

        for (ProviderConfig provider : providers) {
            if (provider.isEnabled()) {
                return provider;
            }
        }
        return null;
    }

    private String safeText(String value) {
        return value == null ? "" : value.trim();
    }

    public static class ProviderConfig {
        private String name;
        private String type = "ollama";
        private boolean enabled = true;
        private String baseUrl;
        private String apiKey;
        private String model;
        private double temperature = 0.7;

        public String getName() {
            return name;
        }

        public void setName(String name) {
            this.name = name;
        }

        public String getType() {
            return type;
        }

        public void setType(String type) {
            this.type = type;
        }

        public boolean isEnabled() {
            return enabled;
        }

        public void setEnabled(boolean enabled) {
            this.enabled = enabled;
        }

        public String getBaseUrl() {
            return baseUrl;
        }

        public void setBaseUrl(String baseUrl) {
            this.baseUrl = baseUrl;
        }

        public String getApiKey() {
            return apiKey;
        }

        public void setApiKey(String apiKey) {
            this.apiKey = apiKey;
        }

        public String getModel() {
            return model;
        }

        public void setModel(String model) {
            this.model = model;
        }

        public double getTemperature() {
            return temperature;
        }

        public void setTemperature(double temperature) {
            this.temperature = temperature;
        }
    }
}
