export const LEAVE_TYPES = ['年假', '病假', '事假', '婚假', '产假', '陪产假', '丧假']

export const LEAVE_STATUS = {
  pending1: '待审批',
  pending2: '待二级审批',
  approved: '已通过',
  rejected: '已拒绝',
  canceled: '已取消'
}

export const IDENTITY_TAG_OPTIONS = [
  { tagCode: 'ADMIN', tagName: '管理员' },
  { tagCode: 'GENERAL_MANAGER', tagName: '总经理' },
  { tagCode: 'HR_MANAGER', tagName: 'HR经理' },
  { tagCode: 'HR_SPECIALIST', tagName: 'HR专员' },
  { tagCode: 'FINANCE_MANAGER', tagName: '财务经理' },
  { tagCode: 'FINANCE_SPECIALIST', tagName: '财务专员' },
  { tagCode: 'MANAGER', tagName: '部门经理' },
  { tagCode: 'EMPLOYEE', tagName: '普通员工' }
]

export const APPROVAL_TAG_OPTIONS = [
  { tagCode: 'ADMIN', tagName: '管理员' },
  { tagCode: 'GENERAL_MANAGER', tagName: '总经理' },
  { tagCode: 'HR_MANAGER', tagName: 'HR经理' },
  { tagCode: 'HR_SPECIALIST', tagName: 'HR专员' },
  { tagCode: 'FINANCE_MANAGER', tagName: '财务经理' },
  { tagCode: 'MANAGER', tagName: '部门经理' }
]

const TAG_LABEL_MAP = IDENTITY_TAG_OPTIONS.reduce((acc, item) => {
  acc[item.tagCode] = item.tagName
  return acc
}, {})

const LEGACY_TAG_MAP = {
  HR: 'HR_SPECIALIST',
  FINANCE: 'FINANCE_SPECIALIST'
}

const ROLE_APPROVAL_TAG_MAP = {
  ADMIN: ['ADMIN'],
  GENERAL_MANAGER: ['GENERAL_MANAGER'],
  HR: ['HR_SPECIALIST'],
  HR_MANAGER: ['HR_MANAGER'],
  FINANCE: ['FINANCE_SPECIALIST'],
  FINANCE_MANAGER: ['FINANCE_MANAGER'],
  MANAGER: ['MANAGER'],
  EMPLOYEE: ['EMPLOYEE']
}

export function normalizeTagCode(tagCode) {
  if (!tagCode) return ''
  return LEGACY_TAG_MAP[tagCode] || tagCode
}

export function getTagLabel(tagCode) {
  const normalized = normalizeTagCode(tagCode)
  return TAG_LABEL_MAP[normalized] || normalized || '-'
}

export function getIdentityTagAliases(tagCode) {
  const normalized = normalizeTagCode(tagCode)
  const aliasMap = {
    ADMIN: ['ADMIN'],
    GENERAL_MANAGER: ['GENERAL_MANAGER', 'ADMIN'],
    HR_MANAGER: ['HR_MANAGER', 'MANAGER'],
    HR_SPECIALIST: ['HR_SPECIALIST', 'EMPLOYEE'],
    FINANCE_MANAGER: ['FINANCE_MANAGER', 'MANAGER'],
    FINANCE_SPECIALIST: ['FINANCE_SPECIALIST', 'EMPLOYEE'],
    MANAGER: ['MANAGER'],
    EMPLOYEE: ['EMPLOYEE']
  }
  return aliasMap[normalized] || [normalized].filter(Boolean)
}

export function matchIdentityTag(expectedTag, actualTag) {
  const normalizedExpected = normalizeTagCode(expectedTag)
  if (normalizedExpected === '*' || normalizedExpected === 'ANY') return true
  return getIdentityTagAliases(actualTag).includes(normalizedExpected)
}

export function resolveApprovalAssigneeTags(profile = {}) {
  const tags = new Set()
  const explicitTags = Array.isArray(profile.approvalAssigneeTags) ? profile.approvalAssigneeTags : []

  explicitTags
    .map(normalizeTagCode)
    .filter(Boolean)
    .forEach((tag) => tags.add(tag))

  const identityTag = normalizeTagCode(profile.identityTag)
  if (identityTag) {
    tags.add(identityTag)
  }

  const roleTags = ROLE_APPROVAL_TAG_MAP[profile.roleCode] || []
  roleTags
    .map(normalizeTagCode)
    .filter(Boolean)
    .forEach((tag) => tags.add(tag))

  return [...tags]
}

export function canApproveTag(profile, expectedTag) {
  const normalizedExpected = normalizeTagCode(expectedTag)
  if (!normalizedExpected) return false
  return resolveApprovalAssigneeTags(profile).includes(normalizedExpected)
}
