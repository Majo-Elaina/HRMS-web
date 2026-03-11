import apiClient from './client'

export function listPositionsApi(params = { page: 1, size: 200 }) {
  return apiClient.get('/positions', { params })
}

export function createPositionApi(payload) {
  return apiClient.post('/positions', payload)
}

export function updatePositionApi(positionId, payload) {
  return apiClient.put(`/positions/${positionId}`, payload)
}

export function deletePositionApi(positionId) {
  return apiClient.delete(`/positions/${positionId}`)
}
