import apiClient from './client'

export function listEmployeesApi(params = { page: 1, size: 200 }) {
  return apiClient.get('/employees', { params })
}

export function createEmployeeApi(payload) {
  return apiClient.post('/employees', payload)
}

export function updateEmployeeApi(empId, payload) {
  return apiClient.put(`/employees/${empId}`, payload)
}

export function deleteEmployeeApi(empId) {
  return apiClient.delete(`/employees/${empId}`)
}
