import { createRouter, createWebHistory } from 'vue-router'
import { useUserStore } from '@/stores/user'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/login',
      name: 'Login',
      component: () => import('@/views/Login.vue'),
      meta: { requiresAuth: false }
    },
    {
      path: '/',
      component: () => import('@/layout/MainLayout.vue'),
      redirect: '/dashboard',
      children: [
        {
          path: 'dashboard',
          name: 'Dashboard',
          component: () => import('@/views/Dashboard.vue'),
          meta: { title: '首页', icon: 'HomeFilled', permission: 'dashboard:view' }
        },
        {
          path: 'base/employee',
          name: 'Employee',
          component: () => import('@/views/base/Employee.vue'),
          meta: { title: '员工管理', icon: 'User', permission: 'base:employee:view' }
        },
        {
          path: 'base/department',
          name: 'Department',
          component: () => import('@/views/base/Department.vue'),
          meta: { title: '部门管理', icon: 'OfficeBuilding', permission: 'base:department:view' }
        },
        {
          path: 'base/position',
          name: 'Position',
          component: () => import('@/views/base/Position.vue'),
          meta: { title: '职位管理', icon: 'Briefcase', permission: 'base:position:view' }
        },
        {
          path: 'attendance/record',
          name: 'AttendanceRecord',
          component: () => import('@/views/attendance/Record.vue'),
          meta: { title: '考勤记录', icon: 'Calendar', permission: 'attendance:record:view' }
        },
        {
          path: 'attendance/leave',
          name: 'LeaveRequest',
          component: () => import('@/views/attendance/Leave.vue'),
          meta: { title: '请假管理', icon: 'Document', permission: 'attendance:leave:view' }
        },
        {
          path: 'salary/record',
          name: 'SalaryRecord',
          component: () => import('@/views/salary/Record.vue'),
          meta: { title: '薪资记录', icon: 'List', permission: 'salary:record:view' }
        },
        {
          path: 'salary/config',
          name: 'SalaryConfig',
          component: () => import('@/views/salary/Config.vue'),
          meta: { title: '薪资配置', icon: 'Tools', permission: 'salary:config:view' }
        },
        {
          path: 'permission/user',
          name: 'UserManage',
          component: () => import('@/views/permission/User.vue'),
          meta: { title: '用户管理', icon: 'UserFilled', permission: 'permission:user:view' }
        },
        {
          path: 'permission/role',
          name: 'RoleManage',
          component: () => import('@/views/permission/Role.vue'),
          meta: { title: '角色管理', icon: 'Avatar', permission: 'permission:role:view' }
        },
        {
          path: 'permission/dept-template',
          name: 'DeptTemplate',
          component: () => import('@/views/permission/DeptTemplate.vue'),
          meta: { title: '部门权限', icon: 'Tickets', permission: 'permission:dept-template:view' }
        },
        {
          path: 'permission/identity',
          name: 'PermissionIdentity',
          component: () => import('@/views/permission/Identity.vue'),
          meta: { title: '身份标签', icon: 'UserFilled', permission: 'permission:identity:view' }
        },
        {
          path: 'permission/module-scope',
          name: 'PermissionModuleScope',
          component: () => import('@/views/permission/ModuleScope.vue'),
          meta: { title: '模块范围', icon: 'List', permission: 'permission:module-scope:view' }
        },
        {
          path: 'permission/approval-rule',
          name: 'PermissionApprovalRule',
          component: () => import('@/views/permission/ApprovalRule.vue'),
          meta: { title: '审批规则', icon: 'Document', permission: 'permission:approval-rule:view' }
        },
        {
          path: 'report',
          name: 'Report',
          component: () => import('@/views/Report.vue'),
          meta: { title: '数据报表', icon: 'DataAnalysis', permission: 'report:view' }
        }
      ]
    },
    {
      path: '/:pathMatch(.*)*',
      redirect: '/dashboard'
    }
  ]
})

// 路由守卫
router.beforeEach((to, from, next) => {
  const userStore = useUserStore()
  userStore.restoreLogin()

  if (to.meta.requiresAuth === false) {
    if (userStore.isLoggedIn && to.path === '/login') {
      next('/dashboard')
    } else {
      next()
    }
  } else {
    if (!userStore.isLoggedIn) {
      next('/login')
    } else if (to.meta.permission && !userStore.hasPermission(to.meta.permission)) {
      next('/dashboard')
    } else {
      next()
    }
  }
})

export default router
