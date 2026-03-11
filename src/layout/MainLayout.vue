<script setup>
import { computed, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import { useUserStore } from '@/stores/user'

const router = useRouter()
const route = useRoute()
const userStore = useUserStore()

const isCollapse = ref(false)

const menuList = computed(() => {
  const allMenus = [
    { index: '/dashboard', title: '首页', icon: 'HomeFilled', permission: 'dashboard:view' },
    {
      index: '/base',
      title: '基础信息管理',
      icon: 'Setting',
      children: [
        { index: '/base/employee', title: '员工管理', icon: 'User', permission: 'base:employee:view' },
        { index: '/base/department', title: '部门管理', icon: 'OfficeBuilding', permission: 'base:department:view' },
        { index: '/base/position', title: '职位管理', icon: 'Briefcase', permission: 'base:position:view' }
      ]
    },
    {
      index: '/attendance',
      title: '考勤管理',
      icon: 'Clock',
      children: [
        { index: '/attendance/record', title: '考勤记录', icon: 'Calendar', permission: 'attendance:record:view' },
        { index: '/attendance/leave', title: '请假管理', icon: 'Document', permission: 'attendance:leave:view' }
      ]
    },
    {
      index: '/salary',
      title: '薪酬管理',
      icon: 'Money',
      children: [
        { index: '/salary/record', title: '薪资记录', icon: 'List', permission: 'salary:record:view' },
        { index: '/salary/config', title: '薪资配置', icon: 'Tools', permission: 'salary:config:view' }
      ]
    },
    {
      index: '/permission',
      title: '权限管理',
      icon: 'Lock',
      children: [
        { index: '/permission/user', title: '用户管理', icon: 'UserFilled', permission: 'permission:user:view' },
        { index: '/permission/role', title: '角色管理', icon: 'Avatar', permission: 'permission:role:view' },
        { index: '/permission/dept-template', title: '部门权限', icon: 'Tickets', permission: 'permission:dept-template:view' },
        { index: '/permission/identity', title: '身份标签', icon: 'UserFilled', permission: 'permission:identity:view' },
        { index: '/permission/module-scope', title: '模块范围', icon: 'List', permission: 'permission:module-scope:view' },
        { index: '/permission/approval-rule', title: '审批规则', icon: 'Document', permission: 'permission:approval-rule:view' }
      ]
    },
    { index: '/report', title: '数据报表', icon: 'DataAnalysis', permission: 'report:view' }
  ]

  const filterMenus = (menus) => menus
    .map((menu) => ({
      ...menu,
      children: menu.children ? filterMenus(menu.children) : undefined
    }))
    .filter((menu) => {
      if (menu.permission && !userStore.hasPermission(menu.permission)) return false
      if (menu.children) return menu.children.length > 0
      return true
    })

  return filterMenus(allMenus)
})

const handleLogout = () => {
  ElMessageBox.confirm('确定要退出登录吗？', '提示', {
    confirmButtonText: '确定',
    cancelButtonText: '取消',
    type: 'warning'
  }).then(() => {
    userStore.logout()
    router.push('/login')
    ElMessage.success('已退出登录')
  }).catch(() => {})
}
</script>

<template>
  <el-container class="layout-container">
    <el-aside :width="isCollapse ? '72px' : '240px'" class="aside">
      <div class="logo">
        <el-icon size="26"><OfficeBuilding /></el-icon>
        <span v-show="!isCollapse">企业人事管理系统</span>
      </div>

      <div class="menu-scroll">
        <el-menu
          :default-active="route.path"
          :collapse="isCollapse"
          :collapse-transition="false"
          router
          background-color="transparent"
          text-color="#c8d2df"
          active-text-color="#ffffff"
        >
          <template v-for="menu in menuList" :key="menu.index">
            <el-sub-menu v-if="menu.children" :index="menu.index">
              <template #title>
                <el-icon><component :is="menu.icon" /></el-icon>
                <span>{{ menu.title }}</span>
              </template>
              <el-menu-item v-for="child in menu.children" :key="child.index" :index="child.index">
                <el-icon><component :is="child.icon" /></el-icon>
                <span>{{ child.title }}</span>
              </el-menu-item>
            </el-sub-menu>
            <el-menu-item v-else :index="menu.index">
              <el-icon><component :is="menu.icon" /></el-icon>
              <span>{{ menu.title }}</span>
            </el-menu-item>
          </template>
        </el-menu>
      </div>
    </el-aside>

    <el-container>
      <el-header class="header">
        <div class="header-left">
          <el-icon class="collapse-btn" @click="isCollapse = !isCollapse">
            <Fold v-if="!isCollapse" />
            <Expand v-else />
          </el-icon>
          <el-breadcrumb separator="/">
            <el-breadcrumb-item :to="{ path: '/dashboard' }">首页</el-breadcrumb-item>
            <el-breadcrumb-item v-if="route.meta.title">{{ route.meta.title }}</el-breadcrumb-item>
          </el-breadcrumb>
        </div>

        <div class="header-right">
          <el-dropdown>
            <span class="user-info">
              <el-avatar :size="34" icon="UserFilled" />
              <span class="username">{{ userStore.user?.empName }}</span>
              <el-icon><ArrowDown /></el-icon>
            </span>
            <template #dropdown>
              <el-dropdown-menu>
                <el-dropdown-item>
                  <el-icon><User /></el-icon>个人信息
                </el-dropdown-item>
                <el-dropdown-item divided @click="handleLogout">
                  <el-icon><SwitchButton /></el-icon>退出登录
                </el-dropdown-item>
              </el-dropdown-menu>
            </template>
          </el-dropdown>
        </div>
      </el-header>

      <el-main class="main">
        <router-view />
      </el-main>
    </el-container>
  </el-container>
</template>

<style scoped>
.layout-container {
  height: 100vh;
  background:
    radial-gradient(circle at top left, rgba(33, 96, 180, 0.08), transparent 28%),
    linear-gradient(180deg, #f5f7fb 0%, #eef2f7 100%);
}

.aside {
  display: flex;
  flex-direction: column;
  background:
    linear-gradient(180deg, #18283e 0%, #213754 52%, #22395b 100%);
  transition: width 0.28s ease;
  overflow: hidden;
  box-shadow: 8px 0 24px rgba(12, 27, 52, 0.16);
}

.logo {
  height: 72px;
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 12px;
  color: #fff;
  font-size: 18px;
  font-weight: 700;
  letter-spacing: 0.5px;
  background: rgba(255, 255, 255, 0.05);
  border-bottom: 1px solid rgba(255, 255, 255, 0.08);
  white-space: nowrap;
  overflow: hidden;
}

.menu-scroll {
  flex: 1;
  overflow-y: auto;
  overflow-x: hidden;
  padding: 14px 10px 16px;
  overflow-anchor: none;
  overscroll-behavior: contain;
  scrollbar-width: thin;
  scrollbar-color: rgba(255, 255, 255, 0.22) transparent;
}

.menu-scroll::-webkit-scrollbar {
  width: 8px;
}

.menu-scroll::-webkit-scrollbar-track {
  background: transparent;
}

.menu-scroll::-webkit-scrollbar-thumb {
  background: rgba(255, 255, 255, 0.18);
  border-radius: 999px;
}

.menu-scroll :deep(.el-menu) {
  border-right: none;
}

.menu-scroll :deep(.el-menu-item),
.menu-scroll :deep(.el-sub-menu__title) {
  height: 46px;
  margin: 4px 0;
  border-radius: 12px;
  transition:
    background-color 0.2s ease,
    color 0.2s ease,
    box-shadow 0.2s ease,
    transform 0.2s ease;
}

.menu-scroll :deep(.el-menu-item:hover),
.menu-scroll :deep(.el-sub-menu__title:hover) {
  background: rgba(255, 255, 255, 0.08);
  color: #fff;
}

.menu-scroll :deep(.el-menu-item.is-active) {
  background: linear-gradient(135deg, #2563eb 0%, #1d9f94 100%);
  color: #fff;
  box-shadow: 0 10px 24px rgba(36, 99, 235, 0.22);
}

.menu-scroll :deep(.el-sub-menu .el-menu-item) {
  min-width: unset;
  margin-left: 10px;
  height: 42px;
  border-radius: 10px;
  background: rgba(255, 255, 255, 0.03);
}

.menu-scroll :deep(.el-menu-item-group__title),
.menu-scroll :deep(.el-menu--inline) {
  transition: none !important;
}

.menu-scroll :deep(.el-sub-menu__icon-arrow) {
  transition: transform 0.22s ease, color 0.22s ease;
}

.menu-scroll :deep(.el-sub-menu .el-menu-item.is-active) {
  background: rgba(37, 99, 235, 0.24);
  box-shadow: none;
}

.header {
  height: 72px;
  background: rgba(255, 255, 255, 0.82);
  backdrop-filter: blur(14px);
  display: flex;
  align-items: center;
  justify-content: space-between;
  box-shadow: 0 10px 30px rgba(15, 23, 42, 0.06);
  padding: 0 24px;
}

.header-left {
  display: flex;
  align-items: center;
  gap: 16px;
}

.collapse-btn {
  font-size: 20px;
  cursor: pointer;
  color: #475569;
  padding: 10px;
  border-radius: 12px;
  transition: all 0.2s ease;
}

.collapse-btn:hover {
  color: #2563eb;
  background: rgba(37, 99, 235, 0.08);
}

.header-right {
  display: flex;
  align-items: center;
}

.user-info {
  display: flex;
  align-items: center;
  gap: 10px;
  cursor: pointer;
  color: #334155;
  padding: 8px 12px;
  border-radius: 999px;
  transition: background 0.2s ease;
}

.user-info:hover {
  background: rgba(15, 23, 42, 0.05);
}

.username {
  font-size: 14px;
  font-weight: 600;
}

.main {
  padding: 22px;
  overflow-y: auto;
}
</style>
