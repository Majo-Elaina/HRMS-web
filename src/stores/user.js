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

const DEPT_TEMPLATE_KEY = 'dept_permissions'
const DEFAULT_DEPT_TEMPLATES = {
  '人力资源部': ['dashboard', 'base', 'attendance', 'report', 'salary:record'],
  '财务部': ['dashboard', 'salary', 'report'],
  '_default': ['dashboard', 'attendance', 'salary:record']
}

const loadDeptTemplates = () => {
  const stored = localStorage.getItem(DEPT_TEMPLATE_KEY)
  if (!stored) return { ...DEFAULT_DEPT_TEMPLATES }
  try {
    const parsed = JSON.parse(stored)
    return parsed && typeof parsed === 'object' ? parsed : { ...DEFAULT_DEPT_TEMPLATES }
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
    permissions: getRolePermissions(roleCode, dept?.deptName)
  }
}

export const useUserStore = defineStore('user', () => {
  const user = ref(null)
  const token = ref(localStorage.getItem('token') || '')

  const isLoggedIn = computed(() => !!token.value)
  const permissions = computed(() => user.value?.permissions || [])
  const roleCode = computed(() => user.value?.roleCode || '')
  const empId = computed(() => user.value?.empId || null)
  const deptId = computed(() => user.value?.deptId || null)
  const deptName = computed(() => user.value?.deptName || '')
  const positionName = computed(() => user.value?.positionName || '')

  const isAdmin = computed(() => roleCode.value === 'ADMIN')
  const isHr = computed(() => roleCode.value === 'HR' || roleCode.value === 'HR_MANAGER')
  const isFinance = computed(() => roleCode.value === 'FINANCE')
  const isFinanceManager = computed(() => roleCode.value === 'FINANCE_MANAGER')
  const isDepartmentManager = computed(() => roleCode.value === 'MANAGER' || roleCode.value === 'FINANCE_MANAGER')
  const isEmployee = computed(() => roleCode.value === 'EMPLOYEE')
  const isHrDept = computed(() => deptName.value === '人力资源部')
  const isFinanceDept = computed(() => deptName.value === '财务部')
  const canAccessAllDepartments = computed(() => isAdmin.value || isHrDept.value)
  const canAccessSalaryAll = computed(() => isAdmin.value || isHrDept.value || isFinanceDept.value)

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
    user.value = {
      ...user.value,
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

  return {
    user,
    token,
    isLoggedIn,
    permissions,
    roleCode,
    empId,
    deptId,
    deptName,
    positionName,
    isAdmin,
    isHr,
    isFinance,
    isFinanceManager,
    isDepartmentManager,
    isEmployee,
    isHrDept,
    isFinanceDept,
    canAccessAllDepartments,
    canAccessSalaryAll,
    login,
    logout,
    restoreLogin,
    refreshPermissions,
    hasPermission
  }
})
