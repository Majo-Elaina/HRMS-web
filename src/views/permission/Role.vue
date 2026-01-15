<script setup>
import { ref, reactive, computed } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { roles as mockRoles } from '@/mock'
import { useUserStore } from '@/stores/user'

const userStore = useUserStore()
const roles = ref([...mockRoles])
const dialogVisible = ref(false)
const permDialogVisible = ref(false)
const dialogTitle = ref('新增角色')
const formRef = ref(null)
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

// 权限树数据
const permissionTree = ref([
  { id: 1, label: '首页', code: 'dashboard:view', children: [] },
  {
    id: 2, label: '基础信息管理', code: 'base', children: [
      {
        id: 3, label: '员工管理', code: 'base:employee', children: [
          { id: 30, label: '查看员工', code: 'base:employee:view' },
          { id: 31, label: '新增员工', code: 'base:employee:add' },
          { id: 32, label: '编辑员工', code: 'base:employee:edit' },
          { id: 33, label: '删除员工', code: 'base:employee:delete' }
        ]
      },
      {
        id: 4, label: '部门管理', code: 'base:department', children: [
          { id: 40, label: '查看部门', code: 'base:department:view' },
          { id: 41, label: '新增部门', code: 'base:department:add' },
          { id: 42, label: '编辑部门', code: 'base:department:edit' },
          { id: 43, label: '删除部门', code: 'base:department:delete' }
        ]
      },
      {
        id: 5, label: '职位管理', code: 'base:position', children: [
          { id: 50, label: '查看职位', code: 'base:position:view' },
          { id: 51, label: '新增职位', code: 'base:position:add' },
          { id: 52, label: '编辑职位', code: 'base:position:edit' },
          { id: 53, label: '删除职位', code: 'base:position:delete' }
        ]
      }
    ]
  },
  {
    id: 6, label: '考勤管理', code: 'attendance', children: [
      {
        id: 7, label: '考勤记录', code: 'attendance:record', children: [
          { id: 70, label: '查看记录', code: 'attendance:record:view' },
          { id: 71, label: '新增记录', code: 'attendance:record:add' },
          { id: 72, label: '编辑记录', code: 'attendance:record:edit' }
        ]
      },
      {
        id: 8, label: '请假管理', code: 'attendance:leave', children: [
          { id: 80, label: '查看申请', code: 'attendance:leave:view' },
          { id: 81, label: '新增申请', code: 'attendance:leave:add' },
          { id: 82, label: '审批申请', code: 'attendance:leave:approve' },
          { id: 83, label: '取消申请', code: 'attendance:leave:cancel' }
        ]
      }
    ]
  },
  {
    id: 9, label: '薪酬管理', code: 'salary', children: [
      {
        id: 10, label: '薪资记录', code: 'salary:record', children: [
          { id: 100, label: '查看记录', code: 'salary:record:view' },
          { id: 101, label: '新增记录', code: 'salary:record:add' },
          { id: 102, label: '编辑记录', code: 'salary:record:edit' },
          { id: 103, label: '提交审批', code: 'salary:record:submit' },
          { id: 104, label: '审批通过', code: 'salary:record:approve' },
          { id: 105, label: '发放', code: 'salary:record:pay' }
        ]
      },
      {
        id: 11, label: '薪资配置', code: 'salary:config', children: [
          { id: 110, label: '查看配置', code: 'salary:config:view' },
          { id: 111, label: '新增配置', code: 'salary:config:add' },
          { id: 112, label: '编辑配置', code: 'salary:config:edit' },
          { id: 113, label: '提交审批', code: 'salary:config:submit' },
          { id: 114, label: '审批通过', code: 'salary:config:approve' }
        ]
      }
    ]
  },
  {
    id: 12, label: '权限管理', code: 'permission', children: [
      {
        id: 13, label: '用户管理', code: 'permission:user', children: [
          { id: 130, label: '查看用户', code: 'permission:user:view' },
          { id: 131, label: '新增用户', code: 'permission:user:add' },
          { id: 132, label: '编辑用户', code: 'permission:user:edit' },
          { id: 133, label: '删除用户', code: 'permission:user:delete' }
        ]
      },
      {
        id: 14, label: '角色管理', code: 'permission:role', children: [
          { id: 140, label: '查看角色', code: 'permission:role:view' },
          { id: 141, label: '新增角色', code: 'permission:role:add' },
          { id: 142, label: '编辑角色', code: 'permission:role:edit' },
          { id: 143, label: '删除角色', code: 'permission:role:delete' },
          { id: 144, label: '权限配置', code: 'permission:role:perm' }
        ]
      },
      { id: 16, label: '部门权限', code: 'permission:dept-template:view', children: [] },
      { id: 17, label: '身份标签', code: 'permission:identity:view', children: [] },
      { id: 18, label: '模块范围', code: 'permission:module-scope:view', children: [] },
      { id: 19, label: '审批规则', code: 'permission:approval-rule:view', children: [] }
    ]
  },
  { id: 15, label: '数据报表', code: 'report:view', children: [] }
])

const checkedPermissions = ref([])
const treeRef = ref(null)
const ROLE_PERMISSION_STORAGE_KEY = 'role_permissions'

const permissionCodeById = new Map()
const permissionIdByCode = new Map()

const buildPermissionMaps = (nodes) => {
  nodes.forEach(node => {
    if (node.code) {
      permissionCodeById.set(node.id, node.code)
      permissionIdByCode.set(node.code, node.id)
    }
    if (node.children?.length) buildPermissionMaps(node.children)
  })
}

buildPermissionMaps(permissionTree.value)

const getDefaultPermissionsByRole = (roleCode) => {
  if (roleCode === 'ADMIN') {
    return [
      'dashboard:view',
      'base', 'base:employee', 'base:employee:view', 'base:employee:add', 'base:employee:edit', 'base:employee:delete',
      'base:department', 'base:department:view', 'base:department:add', 'base:department:edit', 'base:department:delete',
      'base:position', 'base:position:view', 'base:position:add', 'base:position:edit', 'base:position:delete',
      'attendance', 'attendance:record', 'attendance:record:view', 'attendance:record:add', 'attendance:record:edit',
      'attendance:leave', 'attendance:leave:view', 'attendance:leave:add', 'attendance:leave:approve', 'attendance:leave:cancel',
      'salary', 'salary:record', 'salary:record:view', 'salary:record:add', 'salary:record:edit', 'salary:record:submit', 'salary:record:approve', 'salary:record:pay',
      'salary:config', 'salary:config:view', 'salary:config:add', 'salary:config:edit', 'salary:config:submit', 'salary:config:approve',
      'permission', 'permission:user', 'permission:user:view', 'permission:user:add', 'permission:user:edit', 'permission:user:delete',
      'permission:role', 'permission:role:view', 'permission:role:add', 'permission:role:edit', 'permission:role:delete', 'permission:role:perm',
      'permission:dept-template:view', 'permission:identity:view', 'permission:module-scope:view', 'permission:approval-rule:view',
      'report:view'
    ]
  }
  if (roleCode === 'HR' || roleCode === 'HR_MANAGER') {
    return [
      'dashboard:view',
      'base', 'base:employee', 'base:employee:view', 'base:employee:add', 'base:employee:edit', 'base:employee:delete',
      'base:department', 'base:department:view', 'base:department:add', 'base:department:edit', 'base:department:delete',
      'base:position', 'base:position:view', 'base:position:add', 'base:position:edit', 'base:position:delete',
      'attendance', 'attendance:record', 'attendance:record:view', 'attendance:record:add', 'attendance:record:edit',
      'attendance:leave', 'attendance:leave:view', 'attendance:leave:add', 'attendance:leave:approve', 'attendance:leave:cancel',
      'salary', 'salary:record', 'salary:record:view',
      'report:view'
    ]
  }
  if (roleCode === 'FINANCE_MANAGER') {
    return [
      'dashboard:view',
      'salary', 'salary:record', 'salary:record:view', 'salary:record:approve', 'salary:record:pay',
      'salary:config', 'salary:config:view', 'salary:config:approve'
    ]
  }
  if (roleCode === 'FINANCE') {
    return [
      'dashboard:view',
      'salary', 'salary:record', 'salary:record:view', 'salary:record:add', 'salary:record:edit', 'salary:record:submit',
      'salary:config', 'salary:config:view', 'salary:config:add', 'salary:config:edit', 'salary:config:submit'
    ]
  }
  if (roleCode === 'MANAGER') {
    return [
      'dashboard:view',
      'base', 'base:employee', 'base:employee:view', 'base:employee:edit',
      'attendance', 'attendance:leave', 'attendance:leave:view', 'attendance:leave:approve', 'attendance:leave:cancel',
      'salary', 'salary:record', 'salary:record:view',
      'report:view'
    ]
  }
  return [
    'dashboard:view',
    'attendance', 'attendance:record', 'attendance:record:view',
    'attendance:leave', 'attendance:leave:view', 'attendance:leave:add', 'attendance:leave:cancel',
    'salary', 'salary:record', 'salary:record:view'
  ]
}

const canAddRole = computed(() => userStore.hasPermission('permission:role:add'))
const canEditRole = computed(() => userStore.hasPermission('permission:role:edit'))
const canDeleteRole = computed(() => userStore.hasPermission('permission:role:delete'))
const canConfigRole = computed(() => userStore.hasPermission('permission:role:perm'))

const visibleRoles = computed(() => roles.value)

const handleAdd = () => {
  dialogTitle.value = '新增角色'
  Object.assign(form, { roleId: null, roleName: '', roleCode: '', roleDesc: '' })
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
  ElMessageBox.confirm(`确定要删除角色"${row.roleName}"吗？`, '提示', {
    confirmButtonText: '确定',
    cancelButtonText: '取消',
    type: 'warning'
  }).then(() => {
    const index = roles.value.findIndex(r => r.roleId === row.roleId)
    if (index > -1) {
      roles.value.splice(index, 1)
      ElMessage.success('删除成功')
    }
  }).catch(() => {})
}

const handlePermission = (row) => {
  currentRole.value = row
  const stored = JSON.parse(localStorage.getItem(ROLE_PERMISSION_STORAGE_KEY) || '{}')
  const permissionCodes = stored[row.roleCode] || getDefaultPermissionsByRole(row.roleCode)
  checkedPermissions.value = permissionCodes
    .map(code => permissionIdByCode.get(code))
    .filter(id => id)
  permDialogVisible.value = true
}

const handleSubmit = async () => {
  if (!formRef.value) return
  await formRef.value.validate((valid) => {
    if (valid) {
      if (form.roleId) {
        const index = roles.value.findIndex(r => r.roleId === form.roleId)
        if (index > -1) {
          roles.value[index] = { ...form }
        }
        ElMessage.success('修改成功')
      } else {
        const newId = Math.max(...roles.value.map(r => r.roleId)) + 1
        roles.value.push({ ...form, roleId: newId })
        ElMessage.success('新增成功')
      }
      dialogVisible.value = false
    }
  })
}

const savePermission = () => {
  const checkedKeys = treeRef.value?.getCheckedKeys?.() || checkedPermissions.value
  const halfCheckedKeys = treeRef.value?.getHalfCheckedKeys?.() || []
  const mergedKeys = Array.from(new Set([...checkedKeys, ...halfCheckedKeys]))
  const permissionCodes = mergedKeys
    .map(id => permissionCodeById.get(id))
    .filter(Boolean)

  const stored = JSON.parse(localStorage.getItem(ROLE_PERMISSION_STORAGE_KEY) || '{}')
  stored[currentRole.value?.roleCode] = permissionCodes
  localStorage.setItem(ROLE_PERMISSION_STORAGE_KEY, JSON.stringify(stored))
  userStore.refreshPermissions()
  ElMessage.success('权限配置保存成功')
  permDialogVisible.value = false
}
</script>

<template>
  <div class="role-page">
    <el-card shadow="never">
      <template #header>
        <div class="card-header">
          <span>角色列表</span>
          <el-button v-if="canAddRole" type="primary" @click="handleAdd"><el-icon><Plus /></el-icon>新增角色</el-button>
        </div>
      </template>
      <el-table :data="visibleRoles" stripe border>
        <el-table-column prop="roleId" label="角色ID" width="80" align="center" />
        <el-table-column prop="roleName" label="角色名称" width="150" />
        <el-table-column prop="roleCode" label="角色编码" width="150" />
        <el-table-column prop="roleDesc" label="角色描述" min-width="200" />
        <el-table-column label="操作" width="200" fixed="right">
          <template #default="{ row }">
            <el-button v-if="canEditRole" type="primary" link @click="handleEdit(row)">编辑</el-button>
            <el-button v-if="canConfigRole" type="warning" link @click="handlePermission(row)">权限配置</el-button>
            <el-button v-if="canDeleteRole" type="danger" link @click="handleDelete(row)" :disabled="row.roleCode === 'ADMIN'">删除</el-button>
          </template>
        </el-table-column>
      </el-table>
    </el-card>

    <!-- 新增/编辑对话框 -->
    <el-dialog v-model="dialogVisible" :title="dialogTitle" width="500px" destroy-on-close>
      <el-form ref="formRef" :model="form" :rules="rules" label-width="80px">
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

    <!-- 权限配置对话框 -->
    <el-dialog v-model="permDialogVisible" title="权限配置" width="500px">
      <div class="perm-header">
        <span>角色：{{ currentRole?.roleName }}</span>
      </div>
      <el-tree
        ref="treeRef"
        :data="permissionTree"
        show-checkbox
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
