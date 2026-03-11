import apiClient from './client'

export function listIdentityTagsApi() {
  return apiClient.get('/identity-tags/all')
}
