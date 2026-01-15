<script setup>
import { ref, computed } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useUserStore } from '@/stores/user'
import { ElMessage, ElMessageBox } from 'element-plus'

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

  const filterMenus = (menus) => {
    return menus.filter(menu => {
      if (menu.permission && !userStore.hasPermission(menu.permission)) return false
      if (menu.children) {
        menu.children = filterMenus(menu.children)
        return menu.children.length > 0
      }
      return true
    })
  }

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
    <!-- 侧边栏 -->
    <el-aside :width="isCollapse ? '64px' : '220px'" class="aside">
      <div class="logo">
        <el-icon size="24"><OfficeBuilding /></el-icon>
        <span v-show="!isCollapse">企业人事管理系统</span>
      </div>
      <el-menu
        :default-active="route.path"
        :collapse="isCollapse"
        :collapse-transition="false"
        router
        background-color="#304156"
        text-color="#bfcbd9"
        active-text-color="#409EFF"
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
    </el-aside>

    <el-container>
      <!-- 头部 -->
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
              <el-avatar :size="32" icon="UserFilled" />
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

      <!-- 主内容区 -->
      <el-main class="main">
        <router-view />
      </el-main>
    </el-container>
  </el-container>
</template>

<style scoped>
.layout-container {
  height: 100vh;
}

.aside {
  background-color: #304156;
  transition: width 0.3s;
  overflow: hidden;
}

.logo {
  height: 60px;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
  color: #fff;
  font-size: 16px;
  font-weight: bold;
  background-color: #263445;
  white-space: nowrap;
  overflow: hidden;
}

.el-menu {
  border-right: none;
}

.header {
  background-color: #fff;
  display: flex;
  align-items: center;
  justify-content: space-between;
  box-shadow: 0 1px 4px rgba(0, 21, 41, 0.08);
  padding: 0 20px;
}

.header-left {
  display: flex;
  align-items: center;
  gap: 15px;
}

.collapse-btn {
  font-size: 20px;
  cursor: pointer;
  color: #606266;
}

.collapse-btn:hover {
  color: #409EFF;
}

.header-right {
  display: flex;
  align-items: center;
}

.user-info {
  display: flex;
  align-items: center;
  gap: 8px;
  cursor: pointer;
  color: #606266;
}

.username {
  font-size: 14px;
}

.main {
  background-color: #f0f2f5;
  padding: 20px;
  overflow-y: auto;
}
</style>
