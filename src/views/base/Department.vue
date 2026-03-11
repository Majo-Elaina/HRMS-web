<script setup>
import { computed, onMounted, reactive, ref } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { useUserStore } from '@/stores/user'
import {
  createDepartmentApi,
  deleteDepartmentApi,
  listDepartmentsApi,
  updateDepartmentApi
} from '@/api/department'

const userStore = useUserStore()

const loading = ref(false)
const departments = ref([])
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
const canAddDepartment = computed(() => userStore.hasPermission('base:department:add'))
const canEditDepartment = computed(() => userStore.hasPermission('base:department:edit'))
const canDeleteDepartment = computed(() => userStore.hasPermission('base:department:delete'))

const visibleDepartments = computed(() => {
  if (departmentScope.value === 'company') return departments.value
  return departments.value.filter(item => item.deptId === userStore.deptId)
})

const getParentName = (parentId) => {
  if (!parentId) return '-'
  return departments.value.find(item => item.deptId === parentId)?.deptName || '-'
}

const getAvailableParents = () => {
  const base = visibleDepartments.value
  if (!form.deptId) return base
  return base.filter(item => item.deptId !== form.deptId && item.parentId !== form.deptId)
}

const loadDepartments = async () => {
  loading.value = true
  try {
    const page = await listDepartmentsApi({ page: 1, size: 200 })
    departments.value = page.items || []
  } catch (error) {
    ElMessage.error(error.message || '部门数据加载失败')
  } finally {
    loading.value = false
  }
}

const resetForm = () => {
  Object.assign(form, {
    deptId: null,
    deptName: '',
    deptDesc: '',
    parentId: null
  })
}

const handleAdd = () => {
  dialogTitle.value = '新增部门'
  resetForm()
  dialogVisible.value = true
}

const handleEdit = (row) => {
  dialogTitle.value = '编辑部门'
  Object.assign(form, { ...row })
  dialogVisible.value = true
}

const handleDelete = (row) => {
  const hasChildren = departments.value.some(item => item.parentId === row.deptId)
  if (hasChildren) {
    ElMessage.warning('该部门下存在子部门，无法删除')
    return
  }

  ElMessageBox.confirm(`确定要删除部门“${row.deptName}”吗？`, '提示', {
    confirmButtonText: '确定',
    cancelButtonText: '取消',
    type: 'warning'
  }).then(async () => {
    try {
      await deleteDepartmentApi(row.deptId)
      await loadDepartments()
      ElMessage.success('删除成功')
    } catch (error) {
      ElMessage.error(error.message || '删除失败')
    }
  }).catch(() => {})
}

const handleSubmit = async () => {
  if (!formRef.value) return
  const valid = await formRef.value.validate().catch(() => false)
  if (!valid) return

  try {
    const payload = {
      deptName: form.deptName,
      deptDesc: form.deptDesc,
      parentId: form.parentId
    }
    if (form.deptId) {
      await updateDepartmentApi(form.deptId, payload)
      ElMessage.success('修改成功')
    } else {
      await createDepartmentApi(payload)
      ElMessage.success('新增成功')
    }
    dialogVisible.value = false
    await loadDepartments()
  } catch (error) {
    ElMessage.error(error.message || '保存失败')
  }
}

onMounted(loadDepartments)
</script>

<template>
  <div class="department-page" v-loading="loading">
    <el-card shadow="never">
      <template #header>
        <div class="card-header">
          <span>部门列表</span>
          <el-button v-if="canAddDepartment" type="primary" @click="handleAdd">
            <el-icon><Plus /></el-icon>
            新增部门
          </el-button>
        </div>
      </template>

      <el-table :data="visibleDepartments" stripe border>
        <el-table-column prop="deptId" label="部门ID" width="100" align="center" />
        <el-table-column prop="deptName" label="部门名称" width="160" />
        <el-table-column label="上级部门" width="160">
          <template #default="{ row }">{{ getParentName(row.parentId) }}</template>
        </el-table-column>
        <el-table-column prop="deptDesc" label="部门描述" min-width="220" />
        <el-table-column label="操作" width="160" fixed="right">
          <template #default="{ row }">
            <el-button v-if="canEditDepartment" type="primary" link @click="handleEdit(row)">编辑</el-button>
            <el-button v-if="canDeleteDepartment" type="danger" link @click="handleDelete(row)">删除</el-button>
          </template>
        </el-table-column>
      </el-table>
    </el-card>

    <el-dialog v-model="dialogVisible" :title="dialogTitle" width="500px" destroy-on-close>
      <el-form ref="formRef" :model="form" :rules="rules" label-width="90px">
        <el-form-item label="部门名称" prop="deptName">
          <el-input v-model="form.deptName" placeholder="请输入部门名称" />
        </el-form-item>
        <el-form-item label="上级部门" prop="parentId">
          <el-select v-model="form.parentId" placeholder="请选择上级部门" clearable style="width: 100%">
            <el-option
              v-for="dept in getAvailableParents()"
              :key="dept.deptId"
              :label="dept.deptName"
              :value="dept.deptId"
            />
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
