import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { getProfileApi, loginApi } from '@/api/auth'
import { listModuleScopeConfigsApi } from '@/api/moduleScope'
import { listApprovalRuleTypesApi } from '@/api/approvalRuleType'
import { listApprovalRulesApi } from '@/api/approvalRule'

const ALL_PERMISSIONS = [
  'dashboard', 'dashboard:view',
  'base', 'base:employee', 'base:department', 'base:position',
  'base:employee:view', 'base:department:view', 'base:position:view',
  'base:employee:add', 'base:employee:edit', 'base:employee:delete',
  'base:department:add', 'base:department:edit', 'base:department:delete',
  'base:position:add', 'base:position:edit', 'base:position:delete',
  'attendance', 'attendance:record', 'attendance:leave',
  'attendance:record:view', 'attendance:leave:view',
  'attendance:record:add', 'attendance:record:edit',
  'attendance:leave:add', 'attendance:leave:approve', 'attendance:leave:cancel',
  'salary', 'salary:record', 'salary:config',
  'salary:record:view', 'salary:config:view',
  'salary:record:add', 'salary:record:edit', 'salary:record:submit', 'salary:record:approve', 'salary:record:pay',
  'salary:config:add', 'salary:config:edit', 'salary:config:submit', 'salary:config:approve',
  'permission', 'permission:user', 'permission:role',
  'permission:user:view', 'permission:role:view', 'permission:dept-template:view',
  'permission:identity:view', 'permission:module-scope:view', 'permission:approval-rule:view',
  'permission:user:add', 'permission:user:edit', 'permission:user:delete',
  'permission:role:add', 'permission:role:edit', 'permission:role:delete', 'permission:role:perm',
  'report', 'report:view'
]

const ROLE_PERMISSIONS = {
  HR: [
    'dashboard', 'dashboard:view',
    'base', 'base:employee', 'base:department', 'base:position',
    'base:employee:view', 'base:department:view', 'base:position:view',
    'base:employee:add', 'base:employee:edit', 'base:employee:delete',
    'base:department:add', 'base:department:edit', 'base:department:delete',
    'base:position:add', 'base:position:edit', 'base:position:delete',
    'attendance', 'attendance:record', 'attendance:leave',
    'attendance:record:view', 'attendance:leave:view',
    'attendance:record:add', 'attendance:record:edit',
    'attendance:leave:add', 'attendance:leave:approve', 'attendance:leave:cancel',
    'salary', 'salary:record', 'salary:record:view',
    'report', 'report:view'
  ],
  HR_MANAGER: [
    'dashboard', 'dashboard:view',
    'base', 'base:employee', 'base:department', 'base:position',
    'base:employee:view', 'base:department:view', 'base:position:view',
    'base:employee:add', 'base:employee:edit', 'base:employee:delete',
    'base:department:add', 'base:department:edit', 'base:department:delete',
    'base:position:add', 'base:position:edit', 'base:position:delete',
    'attendance', 'attendance:record', 'attendance:leave',
    'attendance:record:view', 'attendance:leave:view',
    'attendance:record:add', 'attendance:record:edit',
    'attendance:leave:add', 'attendance:leave:approve', 'attendance:leave:cancel',
    'salary', 'salary:record', 'salary:record:view',
    'report', 'report:view'
  ],
  MANAGER: [
    'dashboard', 'dashboard:view',
    'base', 'base:employee', 'base:employee:view',
    'base:employee:edit',
    'attendance', 'attendance:record', 'attendance:record:view', 'attendance:leave', 'attendance:leave:view',
    'attendance:leave:approve', 'attendance:leave:cancel',
    'salary', 'salary:record', 'salary:record:view',
    'report', 'report:view'
  ],
  EMPLOYEE: [
    'dashboard', 'dashboard:view',
    'attendance', 'attendance:record', 'attendance:record:view', 'attendance:leave', 'attendance:leave:view',
    'attendance:leave:add', 'attendance:leave:cancel',
    'salary', 'salary:record', 'salary:record:view'
  ],
  FINANCE_MANAGER: [
    'dashboard', 'dashboard:view',
    'salary', 'salary:record', 'salary:record:view', 'salary:config', 'salary:config:view',
    'salary:record:approve', 'salary:record:pay',
    'salary:config:approve'
  ],
  FINANCE: [
    'dashboard', 'dashboard:view',
    'salary', 'salary:record', 'salary:record:view', 'salary:config', 'salary:config:view',
    'salary:record:add', 'salary:record:edit', 'salary:record:submit',
    'salary:config:add', 'salary:config:edit', 'salary:config:submit'
  ]
}

export const IDENTITY_TAG_OPTIONS = [
  { value: 'ADMIN', label: 'Admin' },
  { value: 'HR_MANAGER', label: 'HR Manager' },
  { value: 'HR_SPECIALIST', label: 'HR Specialist' },
  { value: 'FINANCE_MANAGER', label: 'Finance Manager' },
  { value: 'FINANCE_SPECIALIST', label: 'Finance Specialist' },
  { value: 'MANAGER', label: 'Manager' },
  { value: 'EMPLOYEE', label: 'Employee' }
]

export const MODULE_SCOPE_OPTIONS = [
  { value: 'self', label: 'Self' },
  { value: 'dept', label: 'Department' },
  { value: 'company', label: 'Company' }
]

const DEFAULT_MODULE_SCOPES = {
  'base:employee': {
    default: 'dept',
    tagScopes: {
      ADMIN: 'company',
      HR_SPECIALIST: 'company',
      HR_MANAGER: 'company',
      FINANCE_SPECIALIST: 'dept',
      FINANCE_MANAGER: 'dept',
      MANAGER: 'dept',
      EMPLOYEE: 'self'
    }
  },
  'base:department': {
    default: 'dept',
    tagScopes: {
      ADMIN: 'company',
      HR_SPECIALIST: 'company',
      HR_MANAGER: 'company',
      FINANCE_SPECIALIST: 'dept',
      FINANCE_MANAGER: 'dept',
      MANAGER: 'dept',
      EMPLOYEE: 'dept'
    }
  },
  'base:position': {
    default: 'dept',
    tagScopes: {
      ADMIN: 'company',
      HR_SPECIALIST: 'company',
      HR_MANAGER: 'company',
      FINANCE_SPECIALIST: 'dept',
      FINANCE_MANAGER: 'dept',
      MANAGER: 'dept',
      EMPLOYEE: 'dept'
    }
  },
  'attendance:record': {
    default: 'dept',
    tagScopes: {
      ADMIN: 'company',
      HR_SPECIALIST: 'company',
      HR_MANAGER: 'company',
      MANAGER: 'dept',
      EMPLOYEE: 'self'
    }
  },
  'attendance:leave': {
    default: 'dept',
    tagScopes: {
      ADMIN: 'company',
      HR_SPECIALIST: 'company',
      HR_MANAGER: 'company',
      MANAGER: 'dept',
      EMPLOYEE: 'self'
    }
  },
  'salary:record': {
    default: 'dept',
    tagScopes: {
      ADMIN: 'company',
      FINANCE_SPECIALIST: 'company',
      FINANCE_MANAGER: 'company'
    }
  },
  'salary:config': {
    default: 'company',
    tagScopes: {
      ADMIN: 'company',
      FINANCE_SPECIALIST: 'company',
      FINANCE_MANAGER: 'company'
    }
  },
  report: {
    default: 'dept',
    tagScopes: {
      ADMIN: 'company',
      HR_SPECIALIST: 'company',
      HR_MANAGER: 'company',
      FINANCE_SPECIALIST: 'company',
      FINANCE_MANAGER: 'company',
      MANAGER: 'dept',
      EMPLOYEE: 'self'
    }
  }
}

const DEFAULT_LEAVE_APPROVAL_RULES = [
  {
    id: 1,
    applicantTag: 'EMPLOYEE',
    daysOp: '<=',
    daysValue: 3,
    firstApproverTag: 'HR_SPECIALIST',
    secondApproverTag: 'HR_MANAGER',
    secondApproverScope: 'company'
  },
  {
    id: 2,
    applicantTag: 'EMPLOYEE',
    daysOp: '>',
    daysValue: 3,
    firstApproverTag: 'HR_SPECIALIST',
    secondApproverTag: 'HR_MANAGER',
    secondApproverScope: 'company'
  },
  {
    id: 3,
    applicantTag: 'MANAGER',
    daysOp: 'any',
    daysValue: 0,
    firstApproverTag: 'HR_MANAGER',
    secondApproverTag: 'ADMIN',
    secondApproverScope: 'company'
  },
  {
    id: 4,
    applicantTag: 'HR_MANAGER',
    daysOp: 'any',
    daysValue: 0,
    firstApproverTag: 'ADMIN',
    secondApproverTag: '',
    secondApproverScope: 'company'
  }
]

const DEFAULT_APPROVAL_RULE_TYPES = [
  { type: 'leave', name: 'Leave Approval', desc: 'Approval flow for leave requests' },
  { type: 'salary_record', name: 'Salary Record Approval', desc: 'Approval flow for salary record submissions' },
  { type: 'salary_config', name: 'Salary Config Approval', desc: 'Approval flow for salary configuration submissions' }
]
const DEFAULT_APPROVAL_RULES = {
  leave: [...DEFAULT_LEAVE_APPROVAL_RULES],
  salary_record: [
    {
      id: 1,
      applicantTag: 'FINANCE_SPECIALIST',
      daysOp: 'any',
      daysValue: 0,
      firstApproverTag: 'FINANCE_MANAGER',
      secondApproverTag: '',
      secondApproverScope: 'company'
    }
  ],
  salary_config: [
    {
      id: 1,
      applicantTag: 'FINANCE_SPECIALIST',
      daysOp: 'any',
      daysValue: 0,
      firstApproverTag: 'FINANCE_MANAGER',
      secondApproverTag: '',
      secondApproverScope: 'company'
    }
  ]
}

const resolveIdentityTag = ({ roleCode, deptName, positionName }) => {
  if (roleCode === 'ADMIN') return 'ADMIN'
  if (deptName === '人力资源部') {
    return positionName?.includes('经理') ? 'HR_MANAGER' : 'HR_SPECIALIST'
  }
  if (deptName === '财务部') {
    return positionName?.includes('经理') ? 'FINANCE_MANAGER' : 'FINANCE_SPECIALIST'
  }
  if (roleCode === 'MANAGER') return 'MANAGER'
  return 'EMPLOYEE'
}
const getIdentityTagAliases = (tag) => {
  const aliasMap = {
    ADMIN: ['ADMIN'],
    HR_MANAGER: ['HR_MANAGER', 'MANAGER'],
    HR_SPECIALIST: ['HR_SPECIALIST', 'EMPLOYEE'],
    FINANCE_MANAGER: ['FINANCE_MANAGER', 'MANAGER'],
    FINANCE_SPECIALIST: ['FINANCE_SPECIALIST', 'EMPLOYEE'],
    MANAGER: ['MANAGER'],
    EMPLOYEE: ['EMPLOYEE']
  }
  return aliasMap[tag] || [tag].filter(Boolean)
}

const matchIdentityTag = (expectedTag, actualTag) => {
  if (expectedTag === '*' || expectedTag === 'ANY') return true
  return getIdentityTagAliases(actualTag).includes(expectedTag)
}

const getIdentityTagByEmpId = (empId, fallback) => {
  const storedTag = fallback?.identityTag
  if (storedTag && !['EMPLOYEE', 'MANAGER'].includes(storedTag)) {
    return storedTag
  }
  return resolveIdentityTag(fallback)
}

const normalizeModuleScopes = (scopes) => {
  const normalized = {}
  Object.keys(DEFAULT_MODULE_SCOPES).forEach(code => {
    const base = DEFAULT_MODULE_SCOPES[code]
    const stored = scopes?.[code]
    normalized[code] = {
      default: stored?.default || base.default,
      tagScopes: {
        ...base.tagScopes,
        ...(stored?.tagScopes || {})
      }
    }
  })
  return normalized
}

let cachedModuleScopes = normalizeModuleScopes()

const loadModuleScopes = () => {
  return cachedModuleScopes
}

const getModuleScopeByTag = (moduleCode, tag) => {
  const scopes = loadModuleScopes()
  const moduleScope = scopes[moduleCode] || DEFAULT_MODULE_SCOPES[moduleCode]
  if (!moduleScope) return 'dept'
  const tags = getIdentityTagAliases(tag)
  for (const t of tags) {
    if (moduleScope.tagScopes?.[t]) return moduleScope.tagScopes[t]
  }
  return moduleScope.default || 'dept'
}

const loadLeaveApprovalRules = () => {
  return [...(cachedApprovalRules.leave || DEFAULT_LEAVE_APPROVAL_RULES)]
}

const normalizeApprovalRules = (rulesByType = {}) => {
  const normalized = {}
  const types = Object.keys(DEFAULT_APPROVAL_RULES)
  types.forEach(type => {
    const storedRules = rulesByType[type]
    if (Array.isArray(storedRules) && storedRules.length) {
      normalized[type] = storedRules
    } else {
      normalized[type] = [...DEFAULT_APPROVAL_RULES[type]]
    }
  })
  Object.keys(rulesByType).forEach(type => {
    if (!normalized[type] && Array.isArray(rulesByType[type])) {
      normalized[type] = rulesByType[type]
    }
  })
  return normalized
}

let cachedApprovalRuleTypes = [...DEFAULT_APPROVAL_RULE_TYPES]
let cachedApprovalRules = normalizeApprovalRules({})

const loadApprovalRuleTypes = () => {
  return [...cachedApprovalRuleTypes]
}

const loadApprovalRules = () => {
  return normalizeApprovalRules(cachedApprovalRules)
}

const getRolePermissions = (roleCode) => {
  if (roleCode === 'ADMIN') return [...ALL_PERMISSIONS]
  return ROLE_PERMISSIONS[roleCode] ? [...ROLE_PERMISSIONS[roleCode]] : []
}

const normalizeUserProfile = (profile = {}) => ({
  ...profile,
  permissions: Array.isArray(profile.permissions)
    ? [...profile.permissions]
    : getRolePermissions(profile.roleCode)
})

export const useUserStore = defineStore('user', () => {
  const user = ref(null)
  const token = ref(localStorage.getItem('token') || '')
  const restored = ref(false)

  const isLoggedIn = computed(() => !!token.value)
  const permissions = computed(() => user.value?.permissions || [])
  const roleCode = computed(() => user.value?.roleCode || '')
  const identityTag = computed(() => user.value?.identityTag || '')
  const empId = computed(() => user.value?.empId || null)
  const deptId = computed(() => user.value?.deptId || null)
  const deptName = computed(() => user.value?.deptName || '')
  const positionName = computed(() => user.value?.positionName || '')

  const isAdmin = computed(() => roleCode.value === 'ADMIN')
  const identityTagAliases = computed(() => getIdentityTagAliases(identityTag.value))

  const hasIdentityTag = (tag) => matchIdentityTag(tag, identityTag.value)
  const getModuleScope = (moduleCode, tag = identityTag.value) => getModuleScopeByTag(moduleCode, tag)

  const hydrateRemoteConfigs = async () => {
    try {
      const [moduleConfigs, approvalRuleTypes] = await Promise.all([
        listModuleScopeConfigsApi(),
        listApprovalRuleTypesApi()
      ])

      const nextModuleScopes = {}
      ;(moduleConfigs || []).forEach((config) => {
        nextModuleScopes[config.moduleCode] = {
          default: config.defaultScope,
          tagScopes: { ...(config.tagScopes || {}) }
        }
      })
      cachedModuleScopes = normalizeModuleScopes(nextModuleScopes)

      const normalizedTypes = (approvalRuleTypes || []).map((item) => ({
        type: item.typeCode,
        name: item.typeName,
        desc: item.typeDesc
      }))
      cachedApprovalRuleTypes = normalizedTypes.length
        ? normalizedTypes
        : [...DEFAULT_APPROVAL_RULE_TYPES]

      const rulePages = await Promise.all(cachedApprovalRuleTypes.map(async (type) => {
        try {
          const page = await listApprovalRulesApi({ page: 1, size: 200, typeCode: type.type })
          return [type.type, page.items || []]
        } catch {
          return [type.type, []]
        }
      }))

      const nextRules = {}
      rulePages.forEach(([typeCode, items]) => {
        nextRules[typeCode] = items.map((item) => ({
          id: item.ruleId,
          applicantTag: item.applicantTag,
          daysOp: item.daysOp,
          daysValue: Number(item.daysValue || 0),
          firstApproverTag: item.firstApproverTag,
          secondApproverTag: item.secondApproverTag || '',
          secondApproverScope: item.secondApproverScope || 'dept',
          sortOrder: item.sortOrder || 0
        }))
      })
      cachedApprovalRules = normalizeApprovalRules(nextRules)
    } catch {
      cachedModuleScopes = normalizeModuleScopes()
      cachedApprovalRuleTypes = [...DEFAULT_APPROVAL_RULE_TYPES]
      cachedApprovalRules = normalizeApprovalRules({})
    }
  }

  const persistUser = (profile) => {
    user.value = {
      ...normalizeUserProfile(profile),
      identityTag: getIdentityTagByEmpId(profile.empId, {
        identityTag: profile.identityTag,
        roleCode: profile.roleCode,
        deptName: profile.deptName,
        positionName: profile.positionName
      })
    }
    localStorage.setItem('user', JSON.stringify(user.value))
  }

  async function loginByApi(username, password) {
    try {
      const result = await loginApi({ username, password })
      persistUser(result.user)
      await hydrateRemoteConfigs()
      token.value = result.token
      restored.value = true
      localStorage.setItem('token', token.value)
      return { success: true }
    } catch (error) {
      return { success: false, message: error.message || 'login failed' }
    }
  }

  async function restoreLoginByApi(force = false) {
    if (!token.value) {
      restored.value = true
      return
    }
    if (restored.value && !force) return

    const savedUser = localStorage.getItem('user')
    if (!savedUser) {
      logout()
      restored.value = true
      return
    }

    try {
      const parsed = JSON.parse(savedUser)
      if (!parsed?.userId) {
        persistUser(parsed)
      } else {
        const profile = await getProfileApi(parsed.userId)
        persistUser(profile)
      }
      await hydrateRemoteConfigs()
    } catch {
      logout()
    } finally {
      restored.value = true
    }
  }

  async function refreshPermissionsByApi() {
    if (!user.value) return
    if (user.value.userId) {
      try {
        const profile = await getProfileApi(user.value.userId)
        persistUser(profile)
        await hydrateRemoteConfigs()
        return
      } catch {
        // Fall back to the current in-memory profile when the profile API is unavailable.
      }
    }

    user.value = {
      ...normalizeUserProfile(user.value),
      identityTag: getIdentityTagByEmpId(user.value.empId, {
        identityTag: user.value.identityTag,
        roleCode: user.value.roleCode,
        deptName: user.value.deptName,
        positionName: user.value.positionName
      })
    }
    localStorage.setItem('user', JSON.stringify(user.value))
  }

  // 鐧诲嚭
  function logout() {
    user.value = null
    token.value = ''
    cachedModuleScopes = normalizeModuleScopes()
    cachedApprovalRuleTypes = [...DEFAULT_APPROVAL_RULE_TYPES]
    cachedApprovalRules = normalizeApprovalRules({})
    localStorage.removeItem('token')
    localStorage.removeItem('user')
  }

  // 检查权限
  function hasPermission(perm) {
    if (!user.value) return false
    if (user.value.roleCode === 'ADMIN') return true
    if (permissions.value.includes(perm)) return true
    if (perm.endsWith(':view')) {
      const legacy = perm.replace(':view', '')
      return permissions.value.includes(legacy)
    }
    if (perm === 'dashboard:view') return permissions.value.includes('dashboard')
    if (perm === 'report:view') return permissions.value.includes('report')
    return false
  }

  return {
    user,
    token,
    isLoggedIn,
    permissions,
    roleCode,
    identityTag,
    empId,
    deptId,
    deptName,
    positionName,
    isAdmin,
    identityTagAliases,
    login: loginByApi,
    logout,
    restoreLogin: restoreLoginByApi,
    refreshPermissions: refreshPermissionsByApi,
    hasPermission,
    hasIdentityTag,
    getIdentityTagAliases,
    matchIdentityTag,
    getIdentityTagByEmpId,
    getModuleScope,
      }
})





