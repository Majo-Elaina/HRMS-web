import apiClient from './client'

export function listDepartmentsApi(params = { page: 1, size: 200 }) {
  return apiClient.get('/departments', { params })
}

export function createDepartmentApi(payload) {
  return apiClient.post('/departments', payload)
}

export function updateDepartmentApi(deptId, payload) {
  return apiClient.put(`/departments/${deptId}`, payload)
}

export function deleteDepartmentApi(deptId) {
  return apiClient.delete(`/departments/${deptId}`)
}
