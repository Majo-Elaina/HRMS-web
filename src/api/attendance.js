import apiClient from './client'

export function listAttendanceApi(params = { page: 1, size: 200 }) {
  return apiClient.get('/attendance', { params })
}

export function createAttendanceApi(payload) {
  return apiClient.post('/attendance', payload)
}

export function updateAttendanceApi(attendanceId, payload) {
  return apiClient.put(`/attendance/${attendanceId}`, payload)
}
