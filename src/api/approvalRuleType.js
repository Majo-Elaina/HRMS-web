import apiClient from './client'

export function listApprovalRuleTypesApi() {
  return apiClient.get('/approval-rule-types/all')
}

export function createApprovalRuleTypeApi(payload) {
  return apiClient.post('/approval-rule-types', payload)
}
