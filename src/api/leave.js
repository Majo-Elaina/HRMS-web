import apiClient from './client'

export function listLeaveRequestsApi(params = { page: 1, size: 200 }) {
  return apiClient.get('/leave-requests', { params })
}

export function createLeaveRequestApi(payload) {
  return apiClient.post('/leave-requests', payload)
}

export function updateLeaveRequestApi(leaveId, payload) {
  return apiClient.put(`/leave-requests/${leaveId}`, payload)
}
