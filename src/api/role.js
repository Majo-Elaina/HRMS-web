import apiClient from './client'

export function listRolesApi(params = { page: 1, size: 100 }) {
  return apiClient.get('/roles', { params })
}

export function createRoleApi(payload) {
  return apiClient.post('/roles', payload)
}

export function updateRoleApi(roleId, payload) {
  return apiClient.put(`/roles/${roleId}`, payload)
}

export function deleteRoleApi(roleId) {
  return apiClient.delete(`/roles/${roleId}`)
}

export function getRolePermissionIdsApi(roleId) {
  return apiClient.get(`/role-permissions/role/${roleId}/perm-ids`)
}

export function updateRolePermissionApi(roleId, permIds) {
  return apiClient.put(`/role-permissions/role/${roleId}`, { permIds })
}
