import { LEAVE_STATUS, LEAVE_TYPES } from './approvalModel'

export { LEAVE_STATUS, LEAVE_TYPES }

export const AGENT_EXAMPLE_COMMANDS = [
  '帮我提交 2026-03-20 到 2026-03-21 的病假，原因发烧需要休息',
  '补录我 2026-03-10 的考勤，上班 09:05，下班 18:40，备注出差返程',
  '给 HR专员 增加 报表中心 权限'
]

export function calculateLeaveDays(startDate, endDate) {
  if (!startDate || !endDate) return 1
  const start = new Date(`${startDate}T00:00:00`)
  const end = new Date(`${endDate}T00:00:00`)
  const diff = end.getTime() - start.getTime()
  if (Number.isNaN(diff) || diff < 0) return 1
  return Math.floor(diff / 86400000) + 1
}
