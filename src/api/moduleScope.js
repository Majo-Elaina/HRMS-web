import apiClient from './client'

export function listModuleScopeConfigsApi() {
  return apiClient.get('/module-scope-rules/configs')
}

export function updateModuleScopeConfigApi(moduleCode, payload) {
  return apiClient.put(`/module-scope-rules/${moduleCode}/config`, payload)
}
