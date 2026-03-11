import apiClient from './client'

export function listModuleScopeRulesApi(params = { page: 1, size: 200 }) {
  return apiClient.get('/module-scope-rules', { params })
}
