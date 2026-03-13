import apiClient from './client'

export function chatWithAtriApi(payload) {
  return apiClient.post('/ai/chat', payload)
}

export function getChatHistoryApi(userId) {
  return apiClient.get(`/ai/history/${userId}`)
}

export function clearChatHistoryApi(userId) {
  return apiClient.delete(`/ai/history/${userId}`)
}

export function getProviderInfoApi() {
  return apiClient.get('/ai/provider-info')
}
