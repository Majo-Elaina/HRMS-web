import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { currentUser, users, employees, roles, departments, positions } from '@/mock'

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

const ACCOUNT_PASSWORDS = {
  admin: 'admin123',
  hr_lina: '123456',
  hr_manager: '123456',
  manager_zhao: '123456',
  emp_zhou: '123456',
  finance_liu: '123456',
  finance_chen: '123456'
}

export const IDENTITY_TAG_OPTIONS = [
  { value: 'ADMIN', label: '管理员' },
  { value: 'HR_MANAGER', label: 'HR经理' },
  { value: 'HR_SPECIALIST', label: 'HR专员' },
  { value: 'FINANCE_MANAGER', label: '财务经理' },
  { value: 'FINANCE_SPECIALIST', label: '财务专员' },
  { value: 'MANAGER', label: '部门经理' },
  { value: 'EMPLOYEE', label: '普通员工' }
]

export const MODULE_SCOPE_OPTIONS = [
  { value: 'self', label: '仅本人' },
  { value: 'dept', label: '本部门' },
  { value: 'company', label: '全公司' }
]

const DEPT_TEMPLATE_KEY = 'dept_permissions'
const DEFAULT_DEPT_TEMPLATES = {
  '人力资源部': ['dashboard', 'base', 'attendance', 'report'],
  '财务部': ['dashboard', 'salary', 'report'],
  '_default': ['dashboard', 'attendance', 'base']
}

const IDENTITY_TAG_STORAGE_KEY = 'user_identity_tags'
const MODULE_SCOPE_STORAGE_KEY = 'module_data_scopes'
const LEAVE_APPROVAL_RULES_KEY = 'leave_approval_rules'
const APPROVAL_RULES_KEY = 'approval_rules'
const APPROVAL_RULE_TYPES_KEY = 'approval_rule_types'

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
    secondApproverTag: '',
    secondApproverScope: 'dept'
  },
  {
    id: 2,
    applicantTag: 'EMPLOYEE',
    daysOp: '>',
    daysValue: 3,
    firstApproverTag: 'HR_SPECIALIST',
    secondApproverTag: 'MANAGER',
    secondApproverScope: 'dept'
  },
  {
    id: 3,
    applicantTag: 'MANAGER',
    daysOp: 'any',
    daysValue: 0,
    firstApproverTag: 'HR_MANAGER',
    secondApproverTag: '',
    secondApproverScope: 'dept'
  },
  {
    id: 4,
    applicantTag: 'HR_MANAGER',
    daysOp: 'any',
    daysValue: 0,
    firstApproverTag: 'ADMIN',
    secondApproverTag: '',
    secondApproverScope: 'dept'
  }
]

const DEFAULT_APPROVAL_RULE_TYPES = [
  { type: 'leave', name: '请假审批规则', desc: '请假申请的审批流程' },
  { type: 'salary_record', name: '薪资记录审批规则', desc: '薪资记录提交与审批流程' },
  { type: 'salary_config', name: '薪资配置审批规则', desc: '薪资配置提交与审批流程' }
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

const loadDeptTemplates = () => {
  const stored = localStorage.getItem(DEPT_TEMPLATE_KEY)
  if (!stored) return { ...DEFAULT_DEPT_TEMPLATES }
  try {
    const parsed = JSON.parse(stored)
    if (!parsed || typeof parsed !== 'object') return { ...DEFAULT_DEPT_TEMPLATES }
    const normalized = {}
    Object.keys(parsed).forEach(key => {
      normalized[key] = (parsed[key] || []).map(item => {
        if (item === 'salary:record' || item === 'salary:config') return 'salary'
        return item
      })
    })
    return { ...DEFAULT_DEPT_TEMPLATES, ...normalized }
  } catch {
    return { ...DEFAULT_DEPT_TEMPLATES }
  }
}

const getDeptPermissionPrefixes = (deptName) => {
  const templates = loadDeptTemplates()
  return templates[deptName] || templates._default || DEFAULT_DEPT_TEMPLATES._default
}

const filterPermissionsByDept = (rolePerms, deptPrefixes) => {
  if (!deptPrefixes?.length) return rolePerms
  return rolePerms.filter(perm => deptPrefixes.some(prefix => perm === prefix || perm.startsWith(prefix + ':')))
}

const loadIdentityTags = () => {
  const stored = localStorage.getItem(IDENTITY_TAG_STORAGE_KEY)
  if (!stored) return {}
  try {
    const parsed = JSON.parse(stored)
    return parsed && typeof parsed === 'object' ? parsed : {}
  } catch {
    return {}
  }
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
  const stored = loadIdentityTags()
  if (stored && stored[empId]) return stored[empId]
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

const loadModuleScopes = () => {
  const stored = localStorage.getItem(MODULE_SCOPE_STORAGE_KEY)
  if (!stored) return normalizeModuleScopes()
  try {
    const parsed = JSON.parse(stored)
    return normalizeModuleScopes(parsed && typeof parsed === 'object' ? parsed : {})
  } catch {
    return normalizeModuleScopes()
  }
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
  const stored = localStorage.getItem(LEAVE_APPROVAL_RULES_KEY)
  if (!stored) return [...DEFAULT_LEAVE_APPROVAL_RULES]
  try {
    const parsed = JSON.parse(stored)
    return Array.isArray(parsed) ? parsed : [...DEFAULT_LEAVE_APPROVAL_RULES]
  } catch {
    return [...DEFAULT_LEAVE_APPROVAL_RULES]
  }
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

const loadApprovalRuleTypes = () => {
  const stored = localStorage.getItem(APPROVAL_RULE_TYPES_KEY)
  if (!stored) return [...DEFAULT_APPROVAL_RULE_TYPES]
  try {
    const parsed = JSON.parse(stored)
    return Array.isArray(parsed) ? parsed : [...DEFAULT_APPROVAL_RULE_TYPES]
  } catch {
    return [...DEFAULT_APPROVAL_RULE_TYPES]
  }
}

const loadApprovalRules = () => {
  const stored = localStorage.getItem(APPROVAL_RULES_KEY)
  if (!stored) {
    const legacyLeave = loadLeaveApprovalRules()
    return normalizeApprovalRules({ leave: legacyLeave })
  }
  try {
    const parsed = JSON.parse(stored)
    return normalizeApprovalRules(parsed && typeof parsed === 'object' ? parsed : {})
  } catch {
    const legacyLeave = loadLeaveApprovalRules()
    return normalizeApprovalRules({ leave: legacyLeave })
  }
}

const getRolePermissions = (roleCode, deptName) => {
  if (roleCode === 'ADMIN') return [...ALL_PERMISSIONS]
  const stored = JSON.parse(localStorage.getItem('role_permissions') || '{}')
  const basePerms = stored[roleCode]?.length
    ? [...stored[roleCode]]
    : (ROLE_PERMISSIONS[roleCode] ? [...ROLE_PERMISSIONS[roleCode]] : [])
  return filterPermissionsByDept(basePerms, getDeptPermissionPrefixes(deptName))
}

const buildUserProfile = (baseUser) => {
  const emp = employees.find(e => e.empId === baseUser.empId)
  const role = roles.find(r => r.roleId === baseUser.roleId)
  const dept = departments.find(d => d.deptId === emp?.deptId)
  const position = positions.find(p => p.positionId === emp?.positionId)
  const roleCode = role?.roleCode || baseUser.roleCode || ''
  const roleName = role?.roleName || baseUser.roleName || ''
  const identityTag = getIdentityTagByEmpId(emp?.empId ?? baseUser.empId, {
    roleCode,
    deptName: dept?.deptName ?? baseUser.deptName,
    positionName: position?.positionName ?? baseUser.positionName
  })

  return {
    ...baseUser,
    empId: emp?.empId ?? baseUser.empId,
    empName: emp?.empName ?? baseUser.empName,
    deptId: emp?.deptId ?? baseUser.deptId,
    deptName: dept?.deptName ?? baseUser.deptName,
    positionId: emp?.positionId ?? baseUser.positionId,
    positionName: position?.positionName ?? baseUser.positionName,
    roleCode,
    roleName,
    identityTag,
    permissions: getRolePermissions(roleCode, dept?.deptName)
  }
}

export const useUserStore = defineStore('user', () => {
  const user = ref(null)
  const token = ref(localStorage.getItem('token') || '')

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

  // 登录
  function login(username, password) {
    const expectedPassword = ACCOUNT_PASSWORDS[username]
    if (!expectedPassword || expectedPassword !== password) {
      return { success: false, message: '用户名或密码错误' }
    }

    const baseUser = username === 'admin'
      ? currentUser
      : users.find(u => u.username === username)

    if (baseUser) {
      const userData = buildUserProfile(baseUser)
      user.value = userData
      refreshPermissions()
      token.value = 'mock_token_' + Date.now()
      localStorage.setItem('token', token.value)
      return { success: true }
    }
    return { success: false, message: '用户名或密码错误' }
  }

  // 登出
  function logout() {
    user.value = null
    token.value = ''
    localStorage.removeItem('token')
    localStorage.removeItem('user')
  }

  // 恢复登录状态
  function restoreLogin() {
    const savedUser = localStorage.getItem('user')
    if (savedUser && token.value) {
      const parsed = JSON.parse(savedUser)
      user.value = buildUserProfile(parsed)
      localStorage.setItem('user', JSON.stringify(user.value))
    }
  }

  function refreshPermissions() {
    if (!user.value) return
    const refreshedIdentityTag = getIdentityTagByEmpId(user.value.empId, {
      roleCode: user.value.roleCode,
      deptName: user.value.deptName,
      positionName: user.value.positionName
    })
    user.value = {
      ...user.value,
      identityTag: refreshedIdentityTag,
      permissions: getRolePermissions(user.value.roleCode, user.value.deptName)
    }
    localStorage.setItem('user', JSON.stringify(user.value))
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

  const getIdentityTags = () => loadIdentityTags()
  const saveIdentityTags = (tags) => {
    localStorage.setItem(IDENTITY_TAG_STORAGE_KEY, JSON.stringify(tags))
    refreshPermissions()
  }

  const getModuleScopes = () => loadModuleScopes()
  const saveModuleScopes = (scopes) => {
    localStorage.setItem(MODULE_SCOPE_STORAGE_KEY, JSON.stringify(scopes))
    refreshPermissions()
  }

  const getApprovalRuleTypes = () => loadApprovalRuleTypes()
  const saveApprovalRuleTypes = (types) => {
    localStorage.setItem(APPROVAL_RULE_TYPES_KEY, JSON.stringify(types))
  }

  const getApprovalRules = () => loadApprovalRules()
  const getApprovalRulesByType = (type) => {
    const rules = loadApprovalRules()
    return rules[type] ? [...rules[type]] : []
  }
  const saveApprovalRules = (rulesByType) => {
    localStorage.setItem(APPROVAL_RULES_KEY, JSON.stringify(rulesByType))
  }
  const saveApprovalRulesByType = (type, rules) => {
    const stored = loadApprovalRules()
    stored[type] = rules
    saveApprovalRules(stored)
    if (type === 'leave') {
      localStorage.setItem(LEAVE_APPROVAL_RULES_KEY, JSON.stringify(rules))
    }
  }

  const getLeaveApprovalRules = () => getApprovalRulesByType('leave')
  const saveLeaveApprovalRules = (rules) => saveApprovalRulesByType('leave', rules)

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
    login,
    logout,
    restoreLogin,
    refreshPermissions,
    hasPermission,
    hasIdentityTag,
    getIdentityTagAliases,
    matchIdentityTag,
    getIdentityTagByEmpId,
    getModuleScope,
    getIdentityTags,
    saveIdentityTags,
    getModuleScopes,
    saveModuleScopes,
    getApprovalRuleTypes,
    saveApprovalRuleTypes,
    getApprovalRules,
    getApprovalRulesByType,
    saveApprovalRules,
    saveApprovalRulesByType,
    getLeaveApprovalRules,
    saveLeaveApprovalRules
  }
})
