<script setup>
import { ref, reactive, computed } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { useUserStore } from '@/stores/user'

const userStore = useUserStore()
const isFinanceSpecialist = computed(() => userStore.matchIdentityTag('FINANCE_SPECIALIST', userStore.identityTag))

const STORAGE_KEY = 'salary_configs'
const DEFAULT_CONFIGS = [
  { configId: 1, configName: '社保比例-个人', configKey: 'social_insurance_rate', configValue: '0.105', configDesc: '个人社保缴纳比例', effectiveDate: '2024-01-01', status: '已生效' },
  { configId: 2, configName: '公积金比例-个人', configKey: 'housing_fund_rate', configValue: '0.12', configDesc: '个人公积金缴纳比例', effectiveDate: '2024-01-01', status: '已生效' },
  { configId: 3, configName: '个税起征点', configKey: 'tax_threshold', configValue: '5000', configDesc: '个人所得税起征点', effectiveDate: '2024-01-01', status: '已生效' },
  { configId: 4, configName: '迟到扣款', configKey: 'late_deduct', configValue: '50', configDesc: '每次迟到扣款金额', effectiveDate: '2024-01-01', status: '已生效' },
  { configId: 5, configName: '早退扣款', configKey: 'early_deduct', configValue: '50', configDesc: '每次早退扣款金额', effectiveDate: '2024-01-01', status: '已生效' },
  { configId: 6, configName: '缺勤扣款', configKey: 'absent_deduct', configValue: '200', configDesc: '每天缺勤扣款金额', effectiveDate: '2024-01-01', status: '已生效' }
]

const loadConfigs = () => {
  const stored = localStorage.getItem(STORAGE_KEY)
  if (!stored) return [...DEFAULT_CONFIGS]
  try {
    const parsed = JSON.parse(stored)
    return Array.isArray(parsed) ? parsed : [...DEFAULT_CONFIGS]
  } catch {
    return [...DEFAULT_CONFIGS]
  }
}

const configs = ref(loadConfigs())

const persistConfigs = () => {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(configs.value))
}

const dialogVisible = ref(false)
const formRef = ref(null)

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

const handleAdd = () => {
  Object.assign(form, { configId: null, configName: '', configKey: '', configValue: '', configDesc: '', effectiveDate: '', status: '' })
  dialogVisible.value = true
}

const handleEdit = (row) => {
  Object.assign(form, { ...row })
  dialogVisible.value = true
}

const selectedRows = ref([])

const handleSelectionChange = (rows) => {
  selectedRows.value = rows
}

const handleSubmitApproval = () => {
  const rows = selectedRows.value.filter(row => row.status === '待提交')
  if (!rows.length) {
    ElMessage.warning('请选择待提交的配置')
    return
  }
  const submitDate = new Date().toISOString().split('T')[0]
  rows.forEach(row => {
    row.status = '待审批'
    row.submitDate = submitDate
  })
  persistConfigs()
  ElMessage.success('已批量提交审批')
}

const handleApproveConfig = (row) => {
  row.status = '已生效'
  row.approveDate = new Date().toISOString().split('T')[0]
  persistConfigs()
  ElMessage.success('审批通过并生效')
}

const handleResetConfigs = () => {
  ElMessageBox.confirm('确定要重置薪资配置吗？重置后将恢复为初始数据。', '提示', {
    confirmButtonText: '确定',
    cancelButtonText: '取消',
    type: 'warning'
  }).then(() => {
    configs.value = [...DEFAULT_CONFIGS]
    persistConfigs()
    ElMessage.success('薪资配置已重置')
  }).catch(() => {})
}

const filteredConfigs = computed(() => {
  return configs.value.filter(config => {
    const matchName = !searchForm.configName || config.configName.includes(searchForm.configName)
    const matchStatus = !searchForm.status || config.status === searchForm.status
      || (searchForm.status === '待审批' && config.status === '待财务经理审批')
    return matchName && matchStatus
  })
})

const handleSubmit = async () => {
  if (!formRef.value) return
  await formRef.value.validate((valid) => {
    if (valid) {
      const resolvedStatus = isFinanceSpecialist.value
        ? '待提交'
        : (form.status || '已生效')

      if (form.configId) {
        const index = configs.value.findIndex(c => c.configId === form.configId)
        if (index > -1) {
          configs.value[index] = { ...form, status: resolvedStatus }
        }
        persistConfigs()
        ElMessage.success('修改成功')
      } else {
        const newId = Math.max(...configs.value.map(c => c.configId)) + 1
        configs.value.push({ ...form, configId: newId, status: resolvedStatus })
        persistConfigs()
        ElMessage.success('新增成功')
      }
      dialogVisible.value = false
    }
  })
}

const getStatusType = (status) => {
  if (status === '已生效') return 'success'
  if (status === '待提交') return 'info'
  if (status === '待审批' || status === '待财务经理审批') return 'warning'
  return 'info'
}

const canAddConfig = computed(() => userStore.hasPermission('salary:config:add'))
const canEditConfig = computed(() => userStore.hasPermission('salary:config:edit'))
const canSubmitConfig = computed(() => userStore.hasPermission('salary:config:submit'))
const canApproveConfig = computed(() => userStore.hasPermission('salary:config:approve'))
const canBatchSubmit = computed(() => canSubmitConfig.value && selectedRows.value.some(row => row.status === '待提交'))

const handleReset = () => {
  Object.assign(searchForm, { configName: '', status: '' })
}
</script>

<template>
  <div class="config-page">
    <!-- 搜索区域 -->
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
          <el-button type="primary"><el-icon><Search /></el-icon>搜索</el-button>
          <el-button @click="handleReset"><el-icon><Refresh /></el-icon>重置</el-button>
        </el-form-item>
      </el-form>
    </el-card>

    <el-card shadow="never">
      <template #header>
        <div class="card-header">
          <span>薪资配置</span>
          <div class="header-actions">
            <el-button type="info" @click="handleResetConfigs">
              <el-icon><Refresh /></el-icon>重置配置
            </el-button>
            <el-button v-if="canSubmitConfig" type="warning" :disabled="!canBatchSubmit" @click="handleSubmitApproval">
              <el-icon><Upload /></el-icon>提交审批
            </el-button>
            <el-button v-if="canAddConfig" type="primary" @click="handleAdd"><el-icon><Plus /></el-icon>新增配置</el-button>
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
            <el-button v-if="(row.status === '待审批' || row.status === '待财务经理审批') && canApproveConfig" type="success" link @click="handleApproveConfig(row)">审批通过</el-button>
          </template>
        </el-table-column>
      </el-table>
    </el-card>

    <!-- 新增/编辑对话框 -->
    <el-dialog v-model="dialogVisible" :title="form.configId ? '编辑配置' : '新增配置'" width="500px" destroy-on-close>
      <el-form ref="formRef" :model="form" :rules="rules" label-width="80px">
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
