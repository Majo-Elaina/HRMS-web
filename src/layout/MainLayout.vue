<script setup>
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import { useUserStore } from '@/stores/user'

const router = useRouter()
const route = useRoute()
const userStore = useUserStore()

const isCollapse = ref(false)
const isMobile = ref(false)
const mobileMenuVisible = ref(false)

const checkViewport = () => {
  isMobile.value = window.innerWidth <= 768
  if (!isMobile.value) {
    mobileMenuVisible.value = false
  }
}

const menuList = computed(() => {
  const allMenus = [
    { index: '/dashboard', title: '首页', icon: 'HomeFilled', permission: 'dashboard:view' },
    { index: '/ai-assistant', title: '亚托莉', icon: 'ChatDotRound', permission: 'dashboard:ai:view' },
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

const toggleMenu = () => {
  if (isMobile.value) {
    mobileMenuVisible.value = !mobileMenuVisible.value
    return
  }
  isCollapse.value = !isCollapse.value
}

watch(() => route.path, () => {
  if (isMobile.value) {
    mobileMenuVisible.value = false
  }
})

onMounted(() => {
  checkViewport()
  window.addEventListener('resize', checkViewport)
})

onBeforeUnmount(() => {
  window.removeEventListener('resize', checkViewport)
})
</script>

<template>
  <el-container class="layout-container">
    <el-aside v-if="!isMobile" :width="isCollapse ? '72px' : '240px'" class="aside">
      <div class="logo">
        <div v-show="!isCollapse" class="logo-atri-text">
          <span class="atri-main">ATRI</span>
          <span class="atri-sub">HRMS</span>
        </div>
        <div v-show="isCollapse" class="logo-atri-mini">
          <span class="atri-mini">A</span>
        </div>
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

    <transition name="mobile-mask">
      <div v-if="isMobile && mobileMenuVisible" class="mobile-mask" @click="mobileMenuVisible = false"></div>
    </transition>

    <transition name="mobile-drawer">
      <aside v-if="isMobile && mobileMenuVisible" class="mobile-aside">
        <div class="logo">
          <div class="logo-atri-text">
            <span class="atri-main">ATRI</span>
            <span class="atri-sub">HRMS</span>
          </div>
        </div>

        <div class="menu-scroll">
          <el-menu
            :default-active="route.path"
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
      </aside>
    </transition>

    <el-container>
      <el-header class="header">
        <div class="header-left">
          <el-icon class="collapse-btn" @click="toggleMenu">
            <Expand v-if="isMobile || isCollapse" />
            <Fold v-else />
          </el-icon>
          <el-breadcrumb v-if="!isMobile" separator="/">
            <el-breadcrumb-item :to="{ path: '/dashboard' }">首页</el-breadcrumb-item>
            <el-breadcrumb-item v-if="route.meta.title">{{ route.meta.title }}</el-breadcrumb-item>
          </el-breadcrumb>
          <div v-else class="mobile-page-title">{{ route.meta.title || '首页' }}</div>
        </div>

        <div class="header-right">
          <div v-if="!isMobile" class="atri-badge">
            <span class="atri-badge-text">ATRI</span>
            <span class="powered-text">Powered</span>
          </div>
          <el-dropdown>
            <span class="user-info">
              <el-avatar :size="34" icon="UserFilled" />
              <span v-if="!isMobile" class="username">{{ userStore.user?.empName }}</span>
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

      <el-main :class="['main', { 'main-fullscreen': route.path === '/ai-assistant' }]">
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

.aside,
.mobile-aside {
  display: flex;
  flex-direction: column;
  background: linear-gradient(180deg, #18283e 0%, #213754 52%, #22395b 100%);
  overflow: hidden;
}

.aside {
  transition: width 0.28s ease;
  box-shadow: 8px 0 24px rgba(12, 27, 52, 0.16);
}

.mobile-aside {
  position: fixed;
  top: 0;
  left: 0;
  bottom: 0;
  width: min(82vw, 320px);
  z-index: 1200;
  box-shadow: 18px 0 40px rgba(12, 27, 52, 0.28);
}

.mobile-mask {
  position: fixed;
  inset: 0;
  z-index: 1190;
  background: rgba(15, 23, 42, 0.38);
  backdrop-filter: blur(2px);
}

.logo {
  height: 72px;
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #fff;
  background: rgba(255, 255, 255, 0.05);
  border-bottom: 1px solid rgba(255, 255, 255, 0.08);
  white-space: nowrap;
  overflow: hidden;
  padding: 0 16px;
}

.logo-atri-text {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2px;
}

.atri-main {
  font-size: 24px;
  font-weight: 900;
  font-family: 'Arial Black', 'Helvetica', sans-serif;
  background: linear-gradient(135deg, #ffffff 0%, #e3f2fd 50%, #90caf9 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
  letter-spacing: 2px;
  line-height: 1;
  text-shadow: 0 0 20px rgba(255, 255, 255, 0.3);
}

.atri-sub {
  font-size: 10px;
  font-weight: 600;
  color: #90caf9;
  letter-spacing: 1px;
  line-height: 1;
}

.logo-atri-mini {
  display: flex;
  align-items: center;
  justify-content: center;
}

.atri-mini {
  font-size: 28px;
  font-weight: 900;
  font-family: 'Arial Black', 'Helvetica', sans-serif;
  background: linear-gradient(135deg, #ffffff 0%, #e3f2fd 50%, #90caf9 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
  letter-spacing: 1px;
  text-shadow: 0 0 20px rgba(255, 255, 255, 0.3);
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
  height: 56px;
  background: rgba(255, 255, 255, 0.82);
  backdrop-filter: blur(14px);
  display: flex;
  align-items: center;
  justify-content: space-between;
  box-shadow: 0 10px 30px rgba(15, 23, 42, 0.06);
  padding: 0 20px;
}

.header-left {
  display: flex;
  align-items: center;
  gap: 16px;
  min-width: 0;
}

.collapse-btn {
  font-size: 18px;
  cursor: pointer;
  color: #475569;
  padding: 8px;
  border-radius: 10px;
  transition: all 0.2s ease;
}

.collapse-btn:hover {
  color: #2563eb;
  background: rgba(37, 99, 235, 0.08);
}

.header-right {
  display: flex;
  align-items: center;
  gap: 16px;
}

.mobile-page-title {
  font-size: 16px;
  font-weight: 700;
  color: #0f172a;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.atri-badge {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px 16px;
  background: linear-gradient(135deg, rgba(102, 126, 234, 0.1) 0%, rgba(118, 75, 162, 0.1) 100%);
  border-radius: 25px;
  border: 1px solid rgba(102, 126, 234, 0.2);
  position: relative;
  overflow: hidden;
}

.atri-badge::before {
  content: '';
  position: absolute;
  top: 0;
  left: -100%;
  width: 100%;
  height: 100%;
  background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.2), transparent);
  animation: shine 3s infinite;
}

@keyframes shine {
  0% { left: -100%; }
  50% { left: 100%; }
  100% { left: 100%; }
}

.atri-badge-text {
  font-size: 14px;
  font-weight: 900;
  font-family: 'Arial Black', 'Helvetica', sans-serif;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
  letter-spacing: 1px;
}

.powered-text {
  font-size: 11px;
  color: #667eea;
  font-weight: 500;
  opacity: 0.8;
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
  font-size: 13px;
  font-weight: 600;
}

.main {
  padding: 22px;
  overflow-y: auto;
}

.main-fullscreen {
  padding: 0;
  overflow: hidden;
}

.mobile-drawer-enter-active,
.mobile-drawer-leave-active {
  transition: transform 0.24s ease;
}

.mobile-drawer-enter-from,
.mobile-drawer-leave-to {
  transform: translateX(-100%);
}

.mobile-mask-enter-active,
.mobile-mask-leave-active {
  transition: opacity 0.24s ease;
}

.mobile-mask-enter-from,
.mobile-mask-leave-to {
  opacity: 0;
}

@media (max-width: 768px) {
  .layout-container {
    height: 100dvh;
  }

  .header {
    padding: 0 12px;
    gap: 8px;
  }

  .header-left {
    gap: 8px;
    flex: 1;
  }

  .header-right {
    gap: 8px;
  }

  .user-info {
    padding: 6px 8px;
    gap: 6px;
  }

  .mobile-page-title {
    font-size: 15px;
  }

  .main {
    padding: 12px;
  }

  .menu-scroll {
    padding: 12px 10px 16px;
  }

  .mobile-aside {
    width: min(84vw, 300px);
  }
}

@media (max-width: 480px) {
  .header {
    padding: 0 10px;
  }

  .collapse-btn {
    padding: 6px;
  }

  .mobile-page-title {
    font-size: 14px;
  }

  .main {
    padding: 10px;
  }

  .logo {
    height: 68px;
  }
}
</style>
