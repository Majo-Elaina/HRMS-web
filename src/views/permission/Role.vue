<script setup>
import { computed, nextTick, onMounted, reactive, ref } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { useUserStore } from '@/stores/user'
import {
  createRoleApi,
  deleteRoleApi,
  getRolePermissionIdsApi,
  listRolesApi,
  updateRoleApi,
  updateRolePermissionApi
} from '@/api/role'
import { listAllPermissionsApi } from '@/api/permission'

const userStore = useUserStore()

const loading = ref(false)
const permLoading = ref(false)
const roles = ref([])
const allPermissions = ref([])
const permissionTree = ref([])
const checkedPermissions = ref([])
const dialogVisible = ref(false)
const permDialogVisible = ref(false)
const dialogTitle = ref('新增角色')
const formRef = ref(null)
const treeRef = ref(null)
const currentRole = ref(null)

const form = reactive({
  roleId: null,
  roleName: '',
  roleCode: '',
  roleDesc: ''
})

const rules = {
  roleName: [{ required: true, message: '请输入角色名称', trigger: 'blur' }],
  roleCode: [{ required: true, message: '请输入角色编码', trigger: 'blur' }]
}

const canAddRole = computed(() => userStore.hasPermission('permission:role:add'))
const canEditRole = computed(() => userStore.hasPermission('permission:role:edit'))
const canDeleteRole = computed(() => userStore.hasPermission('permission:role:delete'))
const canConfigRole = computed(() => userStore.hasPermission('permission:role:perm'))
const visibleRoles = computed(() => roles.value)

const sortPermissions = (items) => {
  return [...items].sort((a, b) => {
    const sortA = a.sortOrder ?? 0
    const sortB = b.sortOrder ?? 0
    if (sortA !== sortB) return sortA - sortB
    return (a.permId ?? 0) - (b.permId ?? 0)
  })
}

const buildPermissionTree = (items) => {
  const sorted = sortPermissions(items)
  const nodeMap = new Map(
    sorted.map(item => [item.permId, {
      id: item.permId,
      label: item.permName,
      code: item.permCode,
      children: []
    }])
  )

  const roots = []
  sorted.forEach(item => {
    const node = nodeMap.get(item.permId)
    if (item.parentId && nodeMap.has(item.parentId)) {
      nodeMap.get(item.parentId).children.push(node)
    } else {
      roots.push(node)
    }
  })
  return roots
}

const loadRoles = async () => {
  const page = await listRolesApi({ page: 1, size: 100 })
  roles.value = page.items || []
}

const loadPermissions = async () => {
  allPermissions.value = await listAllPermissionsApi()
  permissionTree.value = buildPermissionTree(allPermissions.value)
}

const loadPageData = async () => {
  loading.value = true
  try {
    await Promise.all([loadRoles(), loadPermissions()])
  } catch (error) {
    ElMessage.error(error.message || '角色数据加载失败')
  } finally {
    loading.value = false
  }
}

const resetForm = () => {
  Object.assign(form, {
    roleId: null,
    roleName: '',
    roleCode: '',
    roleDesc: ''
  })
}

const handleAdd = () => {
  dialogTitle.value = '新增角色'
  resetForm()
  dialogVisible.value = true
}

const handleEdit = (row) => {
  dialogTitle.value = '编辑角色'
  Object.assign(form, { ...row })
  dialogVisible.value = true
}

const handleDelete = (row) => {
  if (row.roleCode === 'ADMIN') {
    ElMessage.warning('系统管理员角色不能删除')
    return
  }

  ElMessageBox.confirm(`确定要删除角色“${row.roleName}”吗？`, '提示', {
    confirmButtonText: '确定',
    cancelButtonText: '取消',
    type: 'warning'
  }).then(async () => {
    try {
      await deleteRoleApi(row.roleId)
      await loadRoles()
      ElMessage.success('删除成功')
    } catch (error) {
      ElMessage.error(error.message || '删除失败')
    }
  }).catch(() => {})
}

const handlePermission = async (row) => {
  currentRole.value = row
  permLoading.value = true
  try {
    checkedPermissions.value = await getRolePermissionIdsApi(row.roleId)
    permDialogVisible.value = true
    await nextTick()
    treeRef.value?.setCheckedKeys(checkedPermissions.value)
  } catch (error) {
    ElMessage.error(error.message || '权限加载失败')
  } finally {
    permLoading.value = false
  }
}

const handleSubmit = async () => {
  if (!formRef.value) return
  const valid = await formRef.value.validate().catch(() => false)
  if (!valid) return

  try {
    if (form.roleId) {
      await updateRoleApi(form.roleId, {
        roleName: form.roleName,
        roleCode: form.roleCode,
        roleDesc: form.roleDesc
      })
      ElMessage.success('修改成功')
    } else {
      await createRoleApi({
        roleName: form.roleName,
        roleCode: form.roleCode,
        roleDesc: form.roleDesc
      })
      ElMessage.success('新增成功')
    }
    dialogVisible.value = false
    await loadRoles()
  } catch (error) {
    ElMessage.error(error.message || '保存失败')
  }
}

const savePermission = async () => {
  const checkedKeys = treeRef.value?.getCheckedKeys?.() || []

  try {
    await updateRolePermissionApi(currentRole.value.roleId, checkedKeys)
    if (userStore.user?.roleId === currentRole.value.roleId) {
      await userStore.refreshPermissions()
    }
    ElMessage.success('权限配置保存成功')
    permDialogVisible.value = false
  } catch (error) {
    ElMessage.error(error.message || '权限保存失败')
  }
}

onMounted(loadPageData)
</script>

<template>
  <div class="role-page" v-loading="loading">
    <el-card shadow="never">
      <template #header>
        <div class="card-header">
          <span>角色列表</span>
          <el-button v-if="canAddRole" type="primary" @click="handleAdd">
            <el-icon><Plus /></el-icon>
            新增角色
          </el-button>
        </div>
      </template>

      <el-table :data="visibleRoles" stripe border>
        <el-table-column prop="roleId" label="角色ID" width="100" align="center" />
        <el-table-column prop="roleName" label="角色名称" width="180" />
        <el-table-column prop="roleCode" label="角色编码" width="180" />
        <el-table-column prop="roleDesc" label="角色描述" min-width="220" />
        <el-table-column label="操作" width="220" fixed="right">
          <template #default="{ row }">
            <el-button v-if="canEditRole" type="primary" link @click="handleEdit(row)">编辑</el-button>
            <el-button v-if="canConfigRole" type="warning" link @click="handlePermission(row)">权限配置</el-button>
            <el-button
              v-if="canDeleteRole"
              type="danger"
              link
              :disabled="row.roleCode === 'ADMIN'"
              @click="handleDelete(row)"
            >
              删除
            </el-button>
          </template>
        </el-table-column>
      </el-table>
    </el-card>

    <el-dialog v-model="dialogVisible" :title="dialogTitle" width="500px" destroy-on-close>
      <el-form ref="formRef" :model="form" :rules="rules" label-width="90px">
        <el-form-item label="角色名称" prop="roleName">
          <el-input v-model="form.roleName" placeholder="请输入角色名称" />
        </el-form-item>
        <el-form-item label="角色编码" prop="roleCode">
          <el-input v-model="form.roleCode" placeholder="请输入角色编码" :disabled="!!form.roleId" />
        </el-form-item>
        <el-form-item label="角色描述" prop="roleDesc">
          <el-input v-model="form.roleDesc" type="textarea" :rows="3" placeholder="请输入角色描述" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="dialogVisible = false">取消</el-button>
        <el-button type="primary" @click="handleSubmit">确定</el-button>
      </template>
    </el-dialog>

    <el-dialog v-model="permDialogVisible" title="权限配置" width="560px">
      <div class="perm-header">
        <span>角色：{{ currentRole?.roleName }}</span>
      </div>
      <el-tree
        ref="treeRef"
        v-loading="permLoading"
        :data="permissionTree"
        show-checkbox
        check-strictly
        node-key="id"
        :default-checked-keys="checkedPermissions"
        :props="{ children: 'children', label: 'label' }"
      />
      <template #footer>
        <el-button @click="permDialogVisible = false">取消</el-button>
        <el-button type="primary" @click="savePermission">保存</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<style scoped>
.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.perm-header {
  margin-bottom: 15px;
  padding-bottom: 10px;
  border-bottom: 1px solid #eee;
  color: #606266;
}
</style>


