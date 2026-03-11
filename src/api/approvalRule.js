import apiClient from './client'

export function listApprovalRulesApi(params = { page: 1, size: 200 }) {
  return apiClient.get('/approval-rules', { params })
}

export function createApprovalRuleApi(payload) {
  return apiClient.post('/approval-rules', payload)
}

export function updateApprovalRuleApi(ruleId, payload) {
  return apiClient.put(`/approval-rules/${ruleId}`, payload)
}

export function deleteApprovalRuleApi(ruleId) {
  return apiClient.delete(`/approval-rules/${ruleId}`)
}
