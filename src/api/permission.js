import apiClient from './client'

export function listAllPermissionsApi() {
  return apiClient.get('/permissions/all')
}
