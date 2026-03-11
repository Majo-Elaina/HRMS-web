<script setup>
import { computed, onMounted, reactive, ref } from 'vue'
import { ElMessage } from 'element-plus'
import { useUserStore } from '@/stores/user'
import { createSalaryConfigApi, listSalaryConfigsApi, updateSalaryConfigApi } from '@/api/salaryConfig'

const userStore = useUserStore()
const loading = ref(false)
const configs = ref([])
const dialogVisible = ref(false)
const formRef = ref(null)
const selectedRows = ref([])

const isFinanceSpecialist = computed(() => userStore.matchIdentityTag('FINANCE_SPECIALIST', userStore.identityTag))

const searchForm = reactive({
  configName: '',
  status: ''
})

const form = reactive({
  configId: null,
  configName: '',
  configKey: '',
  configValue: '',
  configDesc: '',
  effectiveDate: '',
  status: ''
})

const rules = {
  configName: [{ required: true, message: '请输入配置名称', trigger: 'blur' }],
  configKey: [{ required: true, message: '请输入配置键', trigger: 'blur' }],
  configValue: [{ required: true, message: '请输入配置值', trigger: 'blur' }],
  effectiveDate: [{ required: true, message: '请选择生效日期', trigger: 'change' }]
}

const canAddConfig = computed(() => userStore.hasPermission('salary:config:add'))
const canEditConfig = computed(() => userStore.hasPermission('salary:config:edit'))
const canSubmitConfig = computed(() => userStore.hasPermission('salary:config:submit'))
const canApproveConfig = computed(() => userStore.hasPermission('salary:config:approve'))
const canBatchSubmit = computed(() => canSubmitConfig.value && selectedRows.value.some(row => row.status === '待提交'))

const filteredConfigs = computed(() => {
  return configs.value.filter(item => {
    const matchName = !searchForm.configName || item.configName?.includes(searchForm.configName.trim())
    const matchStatus = !searchForm.status || item.status === searchForm.status
    return matchName && matchStatus
  })
})

const getStatusType = (status) => {
  if (status === '已生效') return 'success'
  if (status === '待提交') return 'info'
  if (status === '待审批') return 'warning'
  return 'info'
}

const loadConfigs = async () => {
  loading.value = true
  try {
    const page = await listSalaryConfigsApi({ page: 1, size: 200 })
    configs.value = page.items || []
  } catch (error) {
    ElMessage.error(error.message || '薪资配置加载失败')
  } finally {
    loading.value = false
  }
}

const resetForm = () => {
  Object.assign(form, {
    configId: null,
    configName: '',
    configKey: '',
    configValue: '',
    configDesc: '',
    effectiveDate: '',
    status: ''
  })
}

const handleAdd = () => {
  resetForm()
  dialogVisible.value = true
}

const handleEdit = (row) => {
  Object.assign(form, { ...row })
  dialogVisible.value = true
}

const handleSelectionChange = (rows) => {
  selectedRows.value = rows
}

const buildPayload = (overrides = {}) => ({
  configName: form.configName,
  configKey: form.configKey,
  configValue: form.configValue,
  configDesc: form.configDesc,
  effectiveDate: form.effectiveDate,
  status: isFinanceSpecialist.value ? '待提交' : (form.status || '已生效'),
  ...overrides
})

const handleSubmit = async () => {
  if (!formRef.value) return
  const valid = await formRef.value.validate().catch(() => false)
  if (!valid) return

  try {
    if (form.configId) {
      await updateSalaryConfigApi(form.configId, buildPayload())
      ElMessage.success('修改成功')
    } else {
      await createSalaryConfigApi(buildPayload())
      ElMessage.success('新增成功')
    }
    dialogVisible.value = false
    await loadConfigs()
  } catch (error) {
    ElMessage.error(error.message || '保存失败')
  }
}

const updateConfigStatus = async (row, overrides) => {
  await updateSalaryConfigApi(row.configId, {
    configName: row.configName,
    configKey: row.configKey,
    configValue: row.configValue,
    configDesc: row.configDesc,
    effectiveDate: row.effectiveDate,
    status: row.status,
    submitDate: row.submitDate || null,
    approveDate: row.approveDate || null,
    ...overrides
  })
}

const handleSubmitApproval = async () => {
  const rows = selectedRows.value.filter(row => row.status === '待提交')
  if (!rows.length) {
    ElMessage.warning('请选择待提交的配置')
    return
  }
  try {
    const submitDate = new Date().toISOString().slice(0, 10)
    await Promise.all(rows.map(row => updateConfigStatus(row, { status: '待审批', submitDate })))
    await loadConfigs()
    ElMessage.success('已批量提交审批')
  } catch (error) {
    ElMessage.error(error.message || '提交审批失败')
  }
}

const handleApproveConfig = async (row) => {
  try {
    await updateConfigStatus(row, {
      status: '已生效',
      approveDate: new Date().toISOString().slice(0, 10)
    })
    await loadConfigs()
    ElMessage.success('审批通过并生效')
  } catch (error) {
    ElMessage.error(error.message || '审批失败')
  }
}

const handleReset = () => {
    Object.assign(searchForm, { configName: '', status: '' })
}

onMounted(loadConfigs)
</script>

<template>
  <div class="config-page" v-loading="loading">
    <el-card shadow="never" class="search-card">
      <el-form :model="searchForm" inline>
        <el-form-item label="配置名称">
          <el-input v-model="searchForm.configName" placeholder="请输入" clearable style="width: 180px" />
        </el-form-item>
        <el-form-item label="状态">
          <el-select v-model="searchForm.status" placeholder="请选择" clearable style="width: 140px">
            <el-option label="待提交" value="待提交" />
            <el-option label="待审批" value="待审批" />
            <el-option label="已生效" value="已生效" />
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
          <span>薪资配置</span>
          <div class="header-actions">
            <el-button v-if="canSubmitConfig" type="warning" :disabled="!canBatchSubmit" @click="handleSubmitApproval">
              <el-icon><Upload /></el-icon>
              提交审批
            </el-button>
            <el-button v-if="canAddConfig" type="primary" @click="handleAdd">
              <el-icon><Plus /></el-icon>
              新增配置
            </el-button>
          </div>
        </div>
      </template>
      <el-table :data="filteredConfigs" stripe border @selection-change="handleSelectionChange">
        <el-table-column type="selection" width="50" />
        <el-table-column prop="configId" label="ID" width="70" align="center" />
        <el-table-column prop="configName" label="配置名称" width="150" />
        <el-table-column prop="configKey" label="配置键" width="180" />
        <el-table-column prop="configValue" label="配置值" width="120" />
        <el-table-column prop="configDesc" label="配置说明" min-width="200" />
        <el-table-column prop="effectiveDate" label="生效日期" width="120" />
        <el-table-column prop="status" label="状态" width="120" align="center">
          <template #default="{ row }">
            <el-tag :type="getStatusType(row.status)">{{ row.status }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column label="操作" width="160" fixed="right">
          <template #default="{ row }">
            <el-button v-if="canEditConfig" type="primary" link @click="handleEdit(row)">编辑</el-button>
            <el-button v-if="row.status === '待审批' && canApproveConfig" type="success" link @click="handleApproveConfig(row)">审批通过</el-button>
          </template>
        </el-table-column>
      </el-table>
    </el-card>

    <el-dialog v-model="dialogVisible" :title="form.configId ? '编辑配置' : '新增配置'" width="500px" destroy-on-close>
      <el-form ref="formRef" :model="form" :rules="rules" label-width="90px">
        <el-form-item label="配置名称" prop="configName">
          <el-input v-model="form.configName" placeholder="请输入配置名称" />
        </el-form-item>
        <el-form-item label="配置键" prop="configKey">
          <el-input v-model="form.configKey" placeholder="请输入配置键" :disabled="!!form.configId" />
        </el-form-item>
        <el-form-item label="配置值" prop="configValue">
          <el-input v-model="form.configValue" placeholder="请输入配置值" />
        </el-form-item>
        <el-form-item label="生效日期" prop="effectiveDate">
          <el-date-picker v-model="form.effectiveDate" type="date" placeholder="选择日期" value-format="YYYY-MM-DD" style="width: 100%" />
        </el-form-item>
        <el-form-item label="配置说明" prop="configDesc">
          <el-input v-model="form.configDesc" type="textarea" :rows="2" placeholder="请输入配置说明" />
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
.header-actions {
  display: flex;
  align-items: center;
  gap: 10px;
}
.search-card {
  margin-bottom: 15px;
}
.search-card :deep(.el-card__body) {
  padding-bottom: 0;
}
</style>
