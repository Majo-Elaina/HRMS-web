import apiClient from './client'

export function listDeptPermissionTemplatesApi() {
  return apiClient.get('/dept-permission-templates/all')
}

export function replaceDeptPermissionTemplateModulesApi(deptId, moduleCodes) {
  return apiClient.put(`/dept-permission-templates/dept/${deptId}/modules`, moduleCodes)
}
