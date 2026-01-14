<script setup>
import { ref, reactive, computed } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { positions as mockPositions, departments } from '@/mock'
import { useUserStore } from '@/stores/user'

const userStore = useUserStore()
const positions = ref([...mockPositions])
const dialogVisible = ref(false)
const dialogTitle = ref('新增职位')
const formRef = ref(null)
const searchDeptId = ref('')

const form = reactive({
  positionId: null,
  positionName: '',
  positionDesc: '',
  deptId: ''
})

const rules = {
  positionName: [{ required: true, message: '请输入职位名称', trigger: 'blur' }],
  deptId: [{ required: true, message: '请选择所属部门', trigger: 'change' }]
}

const visibleDepartments = computed(() => {
  if (userStore.canAccessAllDepartments) return departments
  return departments.filter(d => d.deptId === userStore.deptId)
})

const visiblePositions = computed(() => {
  if (userStore.canAccessAllDepartments) return positions.value
  return positions.value.filter(p => p.deptId === userStore.deptId)
})

const filteredPositions = computed(() => {
  if (!searchDeptId.value) return visiblePositions.value
  return visiblePositions.value.filter(p => p.deptId === searchDeptId.value)
})

const canAddPosition = computed(() => userStore.hasPermission('base:position:add'))
const canEditPosition = computed(() => userStore.hasPermission('base:position:edit'))
const canDeletePosition = computed(() => userStore.hasPermission('base:position:delete'))

const getDeptName = (deptId) => departments.find(d => d.deptId === deptId)?.deptName || '-'

const handleAdd = () => {
  dialogTitle.value = '新增职位'
  Object.assign(form, { positionId: null, positionName: '', positionDesc: '', deptId: '' })
  dialogVisible.value = true
}

const handleEdit = (row) => {
  dialogTitle.value = '编辑职位'
  Object.assign(form, { ...row })
  dialogVisible.value = true
}

const handleDelete = (row) => {
  ElMessageBox.confirm(`确定要删除职位"${row.positionName}"吗？`, '提示', {
    confirmButtonText: '确定',
    cancelButtonText: '取消',
    type: 'warning'
  }).then(() => {
    const index = positions.value.findIndex(p => p.positionId === row.positionId)
    if (index > -1) {
      positions.value.splice(index, 1)
      ElMessage.success('删除成功')
    }
  }).catch(() => {})
}

const handleSubmit = async () => {
  if (!formRef.value) return
  await formRef.value.validate((valid) => {
    if (valid) {
      if (form.positionId) {
        const index = positions.value.findIndex(p => p.positionId === form.positionId)
        if (index > -1) {
          positions.value[index] = { ...form }
        }
        ElMessage.success('修改成功')
      } else {
        const newId = Math.max(...positions.value.map(p => p.positionId)) + 1
        positions.value.push({ ...form, positionId: newId })
        ElMessage.success('新增成功')
      }
      dialogVisible.value = false
    }
  })
}
</script>

<template>
  <div class="position-page">
    <!-- 搜索区域 -->
    <el-card shadow="never" class="search-card">
      <el-form inline>
        <el-form-item label="所属部门">
          <el-select v-model="searchDeptId" placeholder="请选择部门" clearable style="width: 180px">
            <el-option v-for="dept in visibleDepartments" :key="dept.deptId" :label="dept.deptName" :value="dept.deptId" />
          </el-select>
        </el-form-item>
      </el-form>
    </el-card>

    <el-card shadow="never">
      <template #header>
        <div class="card-header">
          <span>职位列表</span>
          <el-button v-if="canAddPosition" type="primary" @click="handleAdd"><el-icon><Plus /></el-icon>新增职位</el-button>
        </div>
      </template>
      <el-table :data="filteredPositions" stripe border>
        <el-table-column prop="positionId" label="职位ID" width="100" align="center" />
        <el-table-column prop="positionName" label="职位名称" width="150" />
        <el-table-column label="所属部门" width="150">
          <template #default="{ row }">{{ getDeptName(row.deptId) }}</template>
        </el-table-column>
        <el-table-column prop="positionDesc" label="职位描述" min-width="200" />
        <el-table-column label="操作" width="150" fixed="right">
          <template #default="{ row }">
            <el-button v-if="canEditPosition" type="primary" link @click="handleEdit(row)">编辑</el-button>
            <el-button v-if="canDeletePosition" type="danger" link @click="handleDelete(row)">删除</el-button>
          </template>
        </el-table-column>
      </el-table>
    </el-card>

    <!-- 新增/编辑对话框 -->
    <el-dialog v-model="dialogVisible" :title="dialogTitle" width="500px" destroy-on-close>
      <el-form ref="formRef" :model="form" :rules="rules" label-width="80px">
        <el-form-item label="职位名称" prop="positionName">
          <el-input v-model="form.positionName" placeholder="请输入职位名称" />
        </el-form-item>
        <el-form-item label="所属部门" prop="deptId">
          <el-select v-model="form.deptId" placeholder="请选择所属部门" style="width: 100%">
            <el-option v-for="dept in visibleDepartments" :key="dept.deptId" :label="dept.deptName" :value="dept.deptId" />
          </el-select>
        </el-form-item>
        <el-form-item label="职位描述" prop="positionDesc">
          <el-input v-model="form.positionDesc" type="textarea" :rows="3" placeholder="请输入职位描述" />
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
