import apiClient from './client'

export function listSalaryConfigsApi(params = { page: 1, size: 200 }) {
  return apiClient.get('/salary-configs', { params })
}

export function createSalaryConfigApi(payload) {
  return apiClient.post('/salary-configs', payload)
}

export function updateSalaryConfigApi(configId, payload) {
  return apiClient.put(`/salary-configs/${configId}`, payload)
}
