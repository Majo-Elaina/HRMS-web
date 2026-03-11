import apiClient from './client'

export function listSalaryRecordsApi(params = { page: 1, size: 200 }) {
  return apiClient.get('/salary-records', { params })
}

export function createSalaryRecordApi(payload) {
  return apiClient.post('/salary-records', payload)
}

export function updateSalaryRecordApi(salaryId, payload) {
  return apiClient.put(`/salary-records/${salaryId}`, payload)
}
