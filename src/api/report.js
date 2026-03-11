import apiClient from './client'

export function getReportSummaryApi() {
  return apiClient.get('/report/summary')
}
