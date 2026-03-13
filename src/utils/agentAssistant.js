export const LEAVE_TYPES = ['年假', '病假', '事假', '婚假', '产假', '陪产假', '丧假']

export const LEAVE_STATUS = {
  pending1: '待一级审批',
  pending2: '待二级审批',
  approved: '已通过',
  rejected: '已拒绝',
  canceled: '已取消'
}

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
