import apiClient from './client'

export function loginApi(payload) {
  return apiClient.post('/auth/login', payload)
}

export function getProfileApi(userId) {
  return apiClient.get(`/auth/profile/${userId}`)
}
