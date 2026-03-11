const normalizeText = (value) => String(value || '').trim()
const compareTime = (source, target) => String(source || '').localeCompare(String(target || ''))
const OVERTIME_START = '18:30'

export const ATTENDANCE_STATUS = {
  normal: '正常',
  late: '迟到',
  early: '早退',
  absent: '缺勤',
  leave: '请假',
  overtime: '加班'
}

export const splitAttendanceStatus = (value) => {
  const text = normalizeText(value)
  if (!text) return []
  return text.split(/[\/、,，]/).map(item => item.trim()).filter(Boolean)
}

export const formatAttendanceStatus = (parts) => {
  const unique = [...new Set(parts.filter(Boolean))]
  return unique.length ? unique.join('/') : ATTENDANCE_STATUS.normal
}

export const resolveAttendanceStatus = ({ clockIn, clockOut, currentStatus }) => {
  const manualParts = splitAttendanceStatus(currentStatus)
  if (manualParts.includes(ATTENDANCE_STATUS.absent) || manualParts.includes(ATTENDANCE_STATUS.leave)) {
    return formatAttendanceStatus(manualParts)
  }

  const parts = []
  if (clockIn && compareTime(clockIn, '09:00') > 0) {
    parts.push(ATTENDANCE_STATUS.late)
  }

  if (clockOut) {
    if (compareTime(clockOut, '18:00') < 0) {
      parts.push(ATTENDANCE_STATUS.early)
    } else if (compareTime(clockOut, OVERTIME_START) > 0) {
      parts.push(ATTENDANCE_STATUS.overtime)
    }
  }

  return formatAttendanceStatus(parts)
}

export const getAttendanceStatusType = (status) => {
  const parts = splitAttendanceStatus(status)
  if (!parts.length || (parts.length === 1 && parts[0] === ATTENDANCE_STATUS.normal)) return 'success'
  if (parts.includes(ATTENDANCE_STATUS.absent)) return 'danger'
  if (parts.includes(ATTENDANCE_STATUS.leave)) return 'info'
  if (parts.includes(ATTENDANCE_STATUS.late) || parts.includes(ATTENDANCE_STATUS.early)) return 'warning'
  if (parts.includes(ATTENDANCE_STATUS.overtime)) return 'primary'
  return 'info'
}
