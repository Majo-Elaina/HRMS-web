<script setup>
import { computed, onMounted, reactive, ref } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { useUserStore } from '@/stores/user'
import { listDepartmentsApi } from '@/api/department'
import {
  createPositionApi,
  deletePositionApi,
  listPositionsApi,
  updatePositionApi
} from '@/api/position'

const userStore = useUserStore()

const loading = ref(false)
const positions = ref([])
const departments = ref([])
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

const positionScope = computed(() => userStore.getModuleScope('base:position'))
const departmentScope = computed(() => userStore.getModuleScope('base:department'))
const canAddPosition = computed(() => userStore.hasPermission('base:position:add'))
const canEditPosition = computed(() => userStore.hasPermission('base:position:edit'))
const canDeletePosition = computed(() => userStore.hasPermission('base:position:delete'))

const visibleDepartments = computed(() => {
  if (departmentScope.value === 'company') return departments.value
  return departments.value.filter(item => item.deptId === userStore.deptId)
})

const visiblePositions = computed(() => {
  if (positionScope.value === 'company') return positions.value
  return positions.value.filter(item => item.deptId === userStore.deptId)
})

const filteredPositions = computed(() => {
  if (!searchDeptId.value) return visiblePositions.value
  return visiblePositions.value.filter(item => item.deptId === searchDeptId.value)
})

const getDeptName = (deptId) => departments.value.find(item => item.deptId === deptId)?.deptName || '-'

const loadPageData = async () => {
  loading.value = true
  try {
    const [positionPage, departmentPage] = await Promise.all([
      listPositionsApi({ page: 1, size: 200 }),
      listDepartmentsApi({ page: 1, size: 200 })
    ])
    positions.value = positionPage.items || []
    departments.value = departmentPage.items || []
  } catch (error) {
    ElMessage.error(error.message || '职位数据加载失败')
  } finally {
    loading.value = false
  }
}

const resetForm = () => {
  Object.assign(form, {
    positionId: null,
    positionName: '',
    positionDesc: '',
    deptId: ''
  })
}

const handleAdd = () => {
  dialogTitle.value = '新增职位'
  resetForm()
  dialogVisible.value = true
}

const handleEdit = (row) => {
  dialogTitle.value = '编辑职位'
  Object.assign(form, { ...row })
  dialogVisible.value = true
}

const handleDelete = (row) => {
  ElMessageBox.confirm(`确定要删除职位“${row.positionName}”吗？`, '提示', {
    confirmButtonText: '确定',
    cancelButtonText: '取消',
    type: 'warning'
  }).then(async () => {
    try {
      await deletePositionApi(row.positionId)
      await loadPageData()
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
      positionName: form.positionName,
      positionDesc: form.positionDesc,
      deptId: form.deptId
    }
    if (form.positionId) {
      await updatePositionApi(form.positionId, payload)
      ElMessage.success('修改成功')
    } else {
      await createPositionApi(payload)
      ElMessage.success('新增成功')
    }
    dialogVisible.value = false
    await loadPageData()
  } catch (error) {
    ElMessage.error(error.message || '保存失败')
  }
}

onMounted(loadPageData)
</script>

<template>
  <div class="position-page" v-loading="loading">
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
          <el-button v-if="canAddPosition" type="primary" @click="handleAdd">
            <el-icon><Plus /></el-icon>
            新增职位
          </el-button>
        </div>
      </template>

      <el-table :data="filteredPositions" stripe border class="desktop-table">
        <el-table-column prop="positionId" label="职位ID" width="100" align="center" />
        <el-table-column prop="positionName" label="职位名称" width="160" />
        <el-table-column label="所属部门" width="160">
          <template #default="{ row }">{{ getDeptName(row.deptId) }}</template>
        </el-table-column>
        <el-table-column prop="positionDesc" label="职位描述" min-width="220" />
        <el-table-column label="操作" width="160" fixed="right">
          <template #default="{ row }">
            <el-button v-if="canEditPosition" type="primary" link @click="handleEdit(row)">编辑</el-button>
            <el-button v-if="canDeletePosition" type="danger" link @click="handleDelete(row)">删除</el-button>
          </template>
        </el-table-column>
      </el-table>

      <div class="mobile-list">
        <div v-for="row in filteredPositions" :key="row.positionId" class="mobile-card">
          <div class="mobile-card-top">
            <div>
              <div class="mobile-card-title">{{ row.positionName }}</div>
              <div class="mobile-card-subtitle">职位 ID：{{ row.positionId }}</div>
            </div>
          </div>
          <div class="mobile-card-grid">
            <div class="mobile-item">
              <span>所属部门</span>
              <strong>{{ getDeptName(row.deptId) }}</strong>
            </div>
            <div class="mobile-item mobile-item-wide">
              <span>职位描述</span>
              <strong>{{ row.positionDesc || '-' }}</strong>
            </div>
          </div>
          <div class="mobile-card-actions">
            <el-button v-if="canEditPosition" type="primary" plain @click="handleEdit(row)">编辑</el-button>
            <el-button v-if="canDeletePosition" type="danger" plain @click="handleDelete(row)">删除</el-button>
          </div>
        </div>
      </div>
    </el-card>

    <el-dialog v-model="dialogVisible" :title="dialogTitle" width="500px" destroy-on-close>
      <el-form ref="formRef" :model="form" :rules="rules" label-width="90px">
        <el-form-item label="职位名称" prop="positionName">
          <el-input v-model="form.positionName" placeholder="请输入职位名称" />
        </el-form-item>
        <el-form-item label="所属部门" prop="deptId">
          <el-select v-model="form.deptId" placeholder="请选择所属部门" style="width: 100%">
            <el-option
              v-for="dept in visibleDepartments"
              :key="dept.deptId"
              :label="dept.deptName"
              :value="dept.deptId"
            />
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

.mobile-list {
  display: none;
}

.mobile-card {
  padding: 16px;
  border-radius: 18px;
  background: linear-gradient(180deg, #ffffff 0%, #f8fbff 100%);
  border: 1px solid rgba(226, 232, 240, 0.9);
  box-shadow: 0 10px 24px rgba(15, 23, 42, 0.06);
}

.mobile-card-top {
  margin-bottom: 14px;
}

.mobile-card-title {
  font-size: 16px;
  font-weight: 700;
  color: #0f172a;
}

.mobile-card-subtitle {
  margin-top: 4px;
  font-size: 13px;
  color: #64748b;
}

.mobile-card-grid {
  display: grid;
  grid-template-columns: 1fr;
  gap: 10px;
}

.mobile-item {
  display: flex;
  flex-direction: column;
  gap: 4px;
  padding: 12px;
  border-radius: 14px;
  background: #f8fafc;
}

.mobile-item span {
  font-size: 12px;
  color: #64748b;
}

.mobile-item strong {
  font-size: 13px;
  line-height: 1.5;
  color: #0f172a;
}

.mobile-card-actions {
  display: flex;
  gap: 10px;
  margin-top: 14px;
}

.mobile-card-actions .el-button {
  flex: 1;
}

@media (max-width: 768px) {
  .desktop-table {
    display: none;
  }

  .mobile-list {
    display: flex;
    flex-direction: column;
    gap: 14px;
  }
}
</style>
