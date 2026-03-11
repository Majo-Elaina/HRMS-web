import apiClient from './client'

export function listUsersApi(params = { page: 1, size: 200 }) {
  return apiClient.get('/users', { params })
}

export function createUserApi(payload) {
  return apiClient.post('/users', payload)
}

export function updateUserApi(userId, payload) {
  return apiClient.put(`/users/${userId}`, payload)
}

export function deleteUserApi(userId) {
  return apiClient.delete(`/users/${userId}`)
}
