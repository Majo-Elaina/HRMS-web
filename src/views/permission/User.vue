<script setup>
import { ref, reactive, computed } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { users as mockUsers, employees, roles } from '@/mock'
import { useUserStore } from '@/stores/user'

const userStore = useUserStore()
const users = ref([...mockUsers])
const dialogVisible = ref(false)
const dialogTitle = ref('新增用户')
const formRef = ref(null)

const searchForm = reactive({
  username: '',
  roleId: '',
  status: ''
})

const form = reactive({
  userId: null,
  empId: '',
  username: '',
  password: '',
  roleId: '',
  status: '启用'
})

const rules = {
  empId: [{ required: true, message: '请选择关联员工', trigger: 'change' }],
  username: [{ required: true, message: '请输入用户名', trigger: 'blur' }],
  password: [{ required: true, message: '请输入密码', trigger: 'blur' }],
  roleId: [{ required: true, message: '请选择角色', trigger: 'change' }]
}

const isVisibleRoleId = (roleId) => visibleRoles.value.some(role => role.roleId === roleId)

const filteredUsers = computed(() => {
  if (searchForm.roleId && !isVisibleRoleId(searchForm.roleId)) {
    searchForm.roleId = ''
  }
  return users.value.filter(u => {
    const matchUsername = !searchForm.username || u.username.includes(searchForm.username)
    const matchRole = !searchForm.roleId || u.roleId === searchForm.roleId
    const matchStatus = !searchForm.status || u.status === searchForm.status
    return matchUsername && matchRole && matchStatus
  })
})

const visibleRoles = computed(() => roles)

const canAddUser = computed(() => userStore.hasPermission('permission:user:add'))
const canEditUser = computed(() => userStore.hasPermission('permission:user:edit'))
const canDeleteUser = computed(() => userStore.hasPermission('permission:user:delete'))
const getEmpName = (empId) => employees.find(e => e.empId === empId)?.empName || '-'

// 获取未关联用户的员工
const availableEmployees = computed(() => {
  const usedEmpIds = users.value.filter(u => u.userId !== form.userId).map(u => u.empId)
  return employees.filter(e => !usedEmpIds.includes(e.empId))
})

const handleAdd = () => {
  dialogTitle.value = '新增用户'
  Object.assign(form, { userId: null, empId: '', username: '', password: '', roleId: '', status: '启用' })
  dialogVisible.value = true
}

const handleEdit = (row) => {
  dialogTitle.value = '编辑用户'
  Object.assign(form, { ...row, password: '' })
  dialogVisible.value = true
}

const handleDelete = (row) => {
  ElMessageBox.confirm(`确定要删除用户"${row.username}"吗？`, '提示', {
    confirmButtonText: '确定',
    cancelButtonText: '取消',
    type: 'warning'
  }).then(() => {
    const index = users.value.findIndex(u => u.userId === row.userId)
    if (index > -1) {
      users.value.splice(index, 1)
      ElMessage.success('删除成功')
    }
  }).catch(() => {})
}

const handleToggleStatus = (row) => {
  row.status = row.status === '启用' ? '禁用' : '启用'
  ElMessage.success(`已${row.status}`)
}

const handleResetPassword = (row) => {
  ElMessageBox.confirm(`确定要重置用户"${row.username}"的密码吗？`, '提示', {
    confirmButtonText: '确定',
    cancelButtonText: '取消',
    type: 'warning'
  }).then(() => {
    ElMessage.success('密码已重置为：123456')
  }).catch(() => {})
}

const handleSubmit = async () => {
  if (!formRef.value) return
  await formRef.value.validate((valid) => {
    if (valid) {
      const role = roles.find(r => r.roleId === form.roleId)
      if (form.userId) {
        const index = users.value.findIndex(u => u.userId === form.userId)
        if (index > -1) {
          users.value[index] = { ...users.value[index], ...form, roleName: role?.roleName }
        }
        ElMessage.success('修改成功')
      } else {
        const newId = Math.max(...users.value.map(u => u.userId)) + 1
        users.value.push({ ...form, userId: newId, roleName: role?.roleName })
        ElMessage.success('新增成功')
      }
      dialogVisible.value = false
    }
  })
}

const handleReset = () => {
  Object.assign(searchForm, { username: '', roleId: '', status: '' })
}
</script>

<template>
  <div class="user-page">
    <!-- 搜索区域 -->
    <el-card shadow="never" class="search-card">
      <el-form :model="searchForm" inline>
        <el-form-item label="用户名">
          <el-input v-model="searchForm.username" placeholder="请输入" clearable style="width: 150px" />
        </el-form-item>
        <el-form-item label="角色">
          <el-select v-model="searchForm.roleId" placeholder="请选择" clearable style="width: 150px">
            <el-option v-for="role in visibleRoles" :key="role.roleId" :label="role.roleName" :value="role.roleId" />
          </el-select>
        </el-form-item>
        <el-form-item label="状态">
          <el-select v-model="searchForm.status" placeholder="请选择" clearable style="width: 100px">
            <el-option label="启用" value="启用" />
            <el-option label="禁用" value="禁用" />
          </el-select>
        </el-form-item>
        <el-form-item>
          <el-button type="primary"><el-icon><Search /></el-icon>搜索</el-button>
          <el-button @click="handleReset"><el-icon><Refresh /></el-icon>重置</el-button>
        </el-form-item>
      </el-form>
    </el-card>

    <!-- 表格区域 -->
    <el-card shadow="never">
      <template #header>
        <div class="card-header">
          <span>用户列表</span>
          <el-button v-if="canAddUser" type="primary" @click="handleAdd"><el-icon><Plus /></el-icon>新增用户</el-button>
        </div>
      </template>
      <el-table :data="filteredUsers" stripe border>
        <el-table-column prop="userId" label="用户ID" width="80" align="center" />
        <el-table-column prop="username" label="用户名" width="120" />
        <el-table-column label="关联员工" width="100">
          <template #default="{ row }">{{ getEmpName(row.empId) }}</template>
        </el-table-column>
        <el-table-column prop="roleName" label="角色" width="120" />
        <el-table-column prop="status" label="状态" width="80" align="center">
          <template #default="{ row }">
            <el-tag :type="row.status === '启用' ? 'success' : 'danger'">{{ row.status }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column label="操作" width="280" fixed="right">
          <template #default="{ row }">
            <el-button v-if="canEditUser" type="primary" link @click="handleEdit(row)">编辑</el-button>
            <el-button v-if="canEditUser" type="warning" link @click="handleResetPassword(row)">重置密码</el-button>
            <el-button v-if="canEditUser" :type="row.status === '启用' ? 'danger' : 'success'" link @click="handleToggleStatus(row)">
              {{ row.status === '启用' ? '禁用' : '启用' }}
            </el-button>
            <el-button v-if="canDeleteUser" type="danger" link @click="handleDelete(row)">删除</el-button>
          </template>
        </el-table-column>
      </el-table>
    </el-card>

    <!-- 新增/编辑对话框 -->
    <el-dialog v-model="dialogVisible" :title="dialogTitle" width="500px" destroy-on-close>
      <el-form ref="formRef" :model="form" :rules="rules" label-width="80px">
        <el-form-item label="关联员工" prop="empId">
          <el-select v-model="form.empId" placeholder="请选择员工" style="width: 100%" :disabled="!!form.userId">
            <el-option v-for="emp in availableEmployees" :key="emp.empId" :label="emp.empName" :value="emp.empId" />
          </el-select>
        </el-form-item>
        <el-form-item label="用户名" prop="username">
          <el-input v-model="form.username" placeholder="请输入用户名" />
        </el-form-item>
        <el-form-item v-if="!form.userId" label="密码" prop="password">
          <el-input v-model="form.password" type="password" placeholder="请输入密码" show-password />
        </el-form-item>
        <el-form-item label="角色" prop="roleId">
          <el-select v-model="form.roleId" placeholder="请选择角色" style="width: 100%">
            <el-option v-for="role in visibleRoles" :key="role.roleId" :label="role.roleName" :value="role.roleId" />
          </el-select>
        </el-form-item>
        <el-form-item label="状态" prop="status">
          <el-radio-group v-model="form.status">
            <el-radio value="启用">启用</el-radio>
            <el-radio value="禁用">禁用</el-radio>
          </el-radio-group>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="dialogVisible = false">取消</el-button>
        <el-button type="primary" @click="handleSubmit">确定</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<style scoped>
.search-card {
  margin-bottom: 15px;
}
.search-card :deep(.el-card__body) {
  padding-bottom: 0;
}
.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}
</style>
