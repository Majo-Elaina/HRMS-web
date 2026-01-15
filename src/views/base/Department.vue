<script setup>
import { ref, reactive, computed } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { departments as mockDepartments } from '@/mock'
import { useUserStore } from '@/stores/user'

const userStore = useUserStore()
const departments = ref([...mockDepartments])
const dialogVisible = ref(false)
const dialogTitle = ref('新增部门')
const formRef = ref(null)

const form = reactive({
  deptId: null,
  deptName: '',
  deptDesc: '',
  parentId: null
})

const rules = {
  deptName: [{ required: true, message: '请输入部门名称', trigger: 'blur' }]
}

const departmentScope = computed(() => userStore.getModuleScope('base:department'))

const visibleDepartments = computed(() => {
  if (departmentScope.value === 'company') return departments.value
  return departments.value.filter(d => d.deptId === userStore.deptId)
})

const canAddDepartment = computed(() => userStore.hasPermission('base:department:add'))
const canEditDepartment = computed(() => userStore.hasPermission('base:department:edit'))
const canDeleteDepartment = computed(() => userStore.hasPermission('base:department:delete'))

const getParentName = (parentId) => {
  if (!parentId) return '-'
  return departments.value.find(d => d.deptId === parentId)?.deptName || '-'
}

const handleAdd = () => {
  dialogTitle.value = '新增部门'
  Object.assign(form, { deptId: null, deptName: '', deptDesc: '', parentId: null })
  dialogVisible.value = true
}

const handleEdit = (row) => {
  dialogTitle.value = '编辑部门'
  Object.assign(form, { ...row })
  dialogVisible.value = true
}

const handleDelete = (row) => {
  // 检查是否有子部门
  const hasChildren = departments.value.some(d => d.parentId === row.deptId)
  if (hasChildren) {
    ElMessage.warning('该部门下存在子部门，无法删除')
    return
  }
  
  ElMessageBox.confirm(`确定要删除部门"${row.deptName}"吗？`, '提示', {
    confirmButtonText: '确定',
    cancelButtonText: '取消',
    type: 'warning'
  }).then(() => {
    const index = departments.value.findIndex(d => d.deptId === row.deptId)
    if (index > -1) {
      departments.value.splice(index, 1)
      ElMessage.success('删除成功')
    }
  }).catch(() => {})
}

const handleSubmit = async () => {
  if (!formRef.value) return
  await formRef.value.validate((valid) => {
    if (valid) {
      if (form.deptId) {
        const index = departments.value.findIndex(d => d.deptId === form.deptId)
        if (index > -1) {
          departments.value[index] = { ...form }
        }
        ElMessage.success('修改成功')
      } else {
        const newId = Math.max(...departments.value.map(d => d.deptId)) + 1
        departments.value.push({ ...form, deptId: newId })
        ElMessage.success('新增成功')
      }
      dialogVisible.value = false
    }
  })
}

// 获取可选的上级部门（排除自己和自己的子部门）
const getAvailableParents = () => {
  const base = visibleDepartments.value
  if (!form.deptId) return base
  return base.filter(d => d.deptId !== form.deptId && d.parentId !== form.deptId)
}
</script>

<template>
  <div class="department-page">
    <el-card shadow="never">
      <template #header>
        <div class="card-header">
          <span>部门列表</span>
          <el-button v-if="canAddDepartment" type="primary" @click="handleAdd"><el-icon><Plus /></el-icon>新增部门</el-button>
        </div>
      </template>
      <el-table :data="visibleDepartments" stripe border>
        <el-table-column prop="deptId" label="部门ID" width="100" align="center" />
        <el-table-column prop="deptName" label="部门名称" width="150" />
        <el-table-column label="上级部门" width="150">
          <template #default="{ row }">{{ getParentName(row.parentId) }}</template>
        </el-table-column>
        <el-table-column prop="deptDesc" label="部门描述" min-width="200" />
        <el-table-column label="操作" width="150" fixed="right">
          <template #default="{ row }">
            <el-button v-if="canEditDepartment" type="primary" link @click="handleEdit(row)">编辑</el-button>
            <el-button v-if="canDeleteDepartment" type="danger" link @click="handleDelete(row)">删除</el-button>
          </template>
        </el-table-column>
      </el-table>
    </el-card>

    <!-- 新增/编辑对话框 -->
    <el-dialog v-model="dialogVisible" :title="dialogTitle" width="500px" destroy-on-close>
      <el-form ref="formRef" :model="form" :rules="rules" label-width="80px">
        <el-form-item label="部门名称" prop="deptName">
          <el-input v-model="form.deptName" placeholder="请输入部门名称" />
        </el-form-item>
        <el-form-item label="上级部门" prop="parentId">
          <el-select v-model="form.parentId" placeholder="请选择上级部门" clearable style="width: 100%">
            <el-option v-for="dept in getAvailableParents()" :key="dept.deptId" :label="dept.deptName" :value="dept.deptId" />
          </el-select>
        </el-form-item>
        <el-form-item label="部门描述" prop="deptDesc">
          <el-input v-model="form.deptDesc" type="textarea" :rows="3" placeholder="请输入部门描述" />
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
.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}
</style>
