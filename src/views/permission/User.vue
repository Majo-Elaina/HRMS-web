<script setup>
import { computed, onMounted, reactive, ref } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { useUserStore } from '@/stores/user'
import { listEmployeesApi } from '@/api/employee'
import { listRolesApi } from '@/api/role'
import { createUserApi, deleteUserApi, listUsersApi, updateUserApi } from '@/api/user'

const userStore = useUserStore()

const loading = ref(false)
const users = ref([])
const employees = ref([])
const roles = ref([])
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

const canAddUser = computed(() => userStore.hasPermission('permission:user:add'))
const canEditUser = computed(() => userStore.hasPermission('permission:user:edit'))
const canDeleteUser = computed(() => userStore.hasPermission('permission:user:delete'))

const visibleRoles = computed(() => roles.value)

const filteredUsers = computed(() => {
  return users.value.filter(item => {
    const keyword = searchForm.username.trim()
    const matchUsername = !keyword || item.username?.includes(keyword)
    const matchRole = !searchForm.roleId || item.roleId === searchForm.roleId
    const matchStatus = !searchForm.status || item.status === searchForm.status
    return matchUsername && matchRole && matchStatus
  })
})

const availableEmployees = computed(() => {
  const usedEmpIds = users.value
    .filter(item => item.userId !== form.userId)
    .map(item => item.empId)
  return employees.value.filter(item => !usedEmpIds.includes(item.empId))
})

const getEmpName = (empId) => employees.value.find(item => item.empId === empId)?.empName || '-'
const getRoleName = (roleId) => roles.value.find(item => item.roleId === roleId)?.roleName || '-'

const loadPageData = async () => {
  loading.value = true
  try {
    const [userPage, employeePage, rolePage] = await Promise.all([
      listUsersApi({ page: 1, size: 200 }),
      listEmployeesApi({ page: 1, size: 200 }),
      listRolesApi({ page: 1, size: 200 })
    ])
    users.value = userPage.items || []
    employees.value = employeePage.items || []
    roles.value = rolePage.items || []
  } catch (error) {
    ElMessage.error(error.message || '用户数据加载失败')
  } finally {
    loading.value = false
  }
}

const resetForm = () => {
  Object.assign(form, {
    userId: null,
    empId: '',
    username: '',
    password: '',
    roleId: '',
    status: '启用'
  })
}

const handleAdd = () => {
  dialogTitle.value = '新增用户'
  resetForm()
  dialogVisible.value = true
}

const handleEdit = (row) => {
  dialogTitle.value = '编辑用户'
  Object.assign(form, {
    userId: row.userId,
    empId: row.empId,
    username: row.username,
    password: '',
    roleId: row.roleId,
    status: row.status
  })
  dialogVisible.value = true
}

const handleDelete = (row) => {
  ElMessageBox.confirm(`确定要删除用户“${row.username}”吗？`, '提示', {
    confirmButtonText: '确定',
    cancelButtonText: '取消',
    type: 'warning'
  }).then(async () => {
    try {
      await deleteUserApi(row.userId)
      await loadPageData()
      ElMessage.success('删除成功')
    } catch (error) {
      ElMessage.error(error.message || '删除失败')
    }
  }).catch(() => {})
}

const saveUser = async (payload) => {
  if (form.userId) {
    await updateUserApi(form.userId, payload)
  } else {
    await createUserApi(payload)
  }
}

const handleToggleStatus = async (row) => {
  const nextStatus = row.status === '启用' ? '禁用' : '启用'
  try {
    await updateUserApi(row.userId, {
      empId: row.empId,
      username: row.username,
      roleId: row.roleId,
      status: nextStatus
    })
    row.status = nextStatus
    ElMessage.success(`已${nextStatus}`)
  } catch (error) {
    ElMessage.error(error.message || '状态更新失败')
  }
}

const handleResetPassword = (row) => {
  ElMessageBox.confirm(`确定要重置用户“${row.username}”的密码吗？`, '提示', {
    confirmButtonText: '确定',
    cancelButtonText: '取消',
    type: 'warning'
  }).then(async () => {
    try {
      await updateUserApi(row.userId, {
        empId: row.empId,
        username: row.username,
        roleId: row.roleId,
        status: row.status,
        password: '123456'
      })
      ElMessage.success('密码已重置为：123456')
    } catch (error) {
      ElMessage.error(error.message || '密码重置失败')
    }
  }).catch(() => {})
}

const handleSubmit = async () => {
  if (!formRef.value) return
  const valid = await formRef.value.validate().catch(() => false)
  if (!valid) return

  try {
    const payload = {
      empId: form.empId,
      username: form.username,
      roleId: form.roleId,
      status: form.status
    }
    if (form.password) {
      payload.password = form.password
    }

    await saveUser(payload)
    dialogVisible.value = false
    await loadPageData()
    ElMessage.success(form.userId ? '修改成功' : '新增成功')
  } catch (error) {
    ElMessage.error(error.message || '保存失败')
  }
}

const handleReset = () => {
  Object.assign(searchForm, { username: '', roleId: '', status: '' })
}

onMounted(loadPageData)
</script>

<template>
  <div class="user-page" v-loading="loading">
    <el-card shadow="never" class="search-card">
      <el-form :model="searchForm" inline>
        <el-form-item label="用户名">
          <el-input v-model="searchForm.username" placeholder="请输入用户名" clearable style="width: 160px" />
        </el-form-item>
        <el-form-item label="角色">
          <el-select v-model="searchForm.roleId" placeholder="请选择" clearable style="width: 160px">
            <el-option v-for="role in visibleRoles" :key="role.roleId" :label="role.roleName" :value="role.roleId" />
          </el-select>
        </el-form-item>
        <el-form-item label="状态">
          <el-select v-model="searchForm.status" placeholder="请选择" clearable style="width: 120px">
            <el-option label="启用" value="启用" />
            <el-option label="禁用" value="禁用" />
          </el-select>
        </el-form-item>
        <el-form-item>
          <el-button type="primary">
            <el-icon><Search /></el-icon>
            搜索
          </el-button>
          <el-button @click="handleReset">
            <el-icon><Refresh /></el-icon>
            重置
          </el-button>
        </el-form-item>
      </el-form>
    </el-card>

    <el-card shadow="never">
      <template #header>
        <div class="card-header">
          <span>用户列表</span>
          <el-button v-if="canAddUser" type="primary" @click="handleAdd">
            <el-icon><Plus /></el-icon>
            新增用户
          </el-button>
        </div>
      </template>

      <el-table :data="filteredUsers" stripe border>
        <el-table-column prop="userId" label="用户ID" width="90" align="center" />
        <el-table-column prop="username" label="用户名" width="140" />
        <el-table-column label="关联员工" width="120">
          <template #default="{ row }">{{ getEmpName(row.empId) }}</template>
        </el-table-column>
        <el-table-column label="角色" width="130">
          <template #default="{ row }">{{ getRoleName(row.roleId) }}</template>
        </el-table-column>
        <el-table-column prop="status" label="状态" width="90" align="center">
          <template #default="{ row }">
            <el-tag :type="row.status === '启用' ? 'success' : 'danger'">{{ row.status }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column label="操作" width="300" fixed="right">
          <template #default="{ row }">
            <el-button v-if="canEditUser" type="primary" link @click="handleEdit(row)">编辑</el-button>
            <el-button v-if="canEditUser" type="warning" link @click="handleResetPassword(row)">重置密码</el-button>
            <el-button
              v-if="canEditUser"
              :type="row.status === '启用' ? 'danger' : 'success'"
              link
              @click="handleToggleStatus(row)"
            >
              {{ row.status === '启用' ? '禁用' : '启用' }}
            </el-button>
            <el-button v-if="canDeleteUser" type="danger" link @click="handleDelete(row)">删除</el-button>
          </template>
        </el-table-column>
      </el-table>
    </el-card>

    <el-dialog v-model="dialogVisible" :title="dialogTitle" width="500px" destroy-on-close>
      <el-form ref="formRef" :model="form" :rules="rules" label-width="90px">
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
        <el-form-item v-else label="密码">
          <el-input v-model="form.password" type="password" placeholder="留空表示不修改密码" show-password />
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
