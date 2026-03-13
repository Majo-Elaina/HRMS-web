<script setup>
import { computed, onMounted, reactive, ref } from 'vue'
import { ElMessage } from 'element-plus'
import { useUserStore } from '@/stores/user'
import { listEmployeesApi } from '@/api/employee'
import { createSalaryRecordApi, listSalaryRecordsApi, updateSalaryRecordApi } from '@/api/salaryRecord'

const userStore = useUserStore()

const loading = ref(false)
const salaryRecords = ref([])
const employees = ref([])
const dialogVisible = ref(false)
const detailDialogVisible = ref(false)
const formRef = ref(null)
const currentDetail = ref(null)
const selectedRows = ref([])

const searchForm = reactive({
  empName: '',
  salaryMonth: '',
  status: ''
})

const form = reactive({
  salaryId: null,
  empId: '',
  salaryMonth: '',
  baseSalary: 0,
  positionSalary: 0,
  bonus: 0,
  overtimePay: 0,
  socialInsurance: 0,
  housingFund: 0,
  attendanceDeduct: 0,
  tax: 0,
  otherDeduct: 0,
  status: ''
})

const rules = {
  empId: [{ required: true, message: '请选择员工', trigger: 'change' }],
  salaryMonth: [{ required: true, message: '请选择薪资月份', trigger: 'change' }],
  baseSalary: [{ required: true, message: '请输入基本工资', trigger: 'blur' }]
}

const salaryScope = computed(() => userStore.getModuleScope('salary:record'))
const isFinanceSpecialist = computed(() => userStore.matchIdentityTag('FINANCE_SPECIALIST', userStore.identityTag))

const canAddSalary = computed(() => userStore.hasPermission('salary:record:add'))
const canEditSalary = computed(() => userStore.hasPermission('salary:record:edit'))
const canSubmitSalary = computed(() => userStore.hasPermission('salary:record:submit'))
const canApproveSalary = computed(() => userStore.hasPermission('salary:record:approve'))
const canDirectPay = computed(() => userStore.hasPermission('salary:record:pay'))
const canBatchSubmit = computed(() => canSubmitSalary.value && selectedRows.value.some(row => row.status === '待提交'))

const filterEmployeesByScope = (list, scopeValue) => {
  if (scopeValue === 'company') return list
  if (scopeValue === 'dept') return list.filter(item => item.deptId === userStore.deptId)
  if (scopeValue === 'self') return list.filter(item => item.empId === userStore.empId)
  return list
}

const visibleEmployees = computed(() => filterEmployeesByScope(employees.value, salaryScope.value))

const employeeNameMap = computed(() => {
  return employees.value.reduce((acc, item) => {
    acc[item.empId] = item.empName
    return acc
  }, {})
})

const visibleSalaries = computed(() => {
  if (salaryScope.value === 'company') return salaryRecords.value
  if (salaryScope.value === 'dept') {
    const visibleIds = new Set(visibleEmployees.value.map(item => item.empId))
    return salaryRecords.value.filter(item => visibleIds.has(item.empId))
  }
  return salaryRecords.value.filter(item => item.empId === userStore.empId)
})

const formatMonthForView = (value) => (value ? String(value).slice(0, 7) : '')
const formatMonthForApi = (value) => (value ? `${String(value).slice(0, 7)}-01` : null)
const formatMoney = (val) => Number(val || 0).toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })

const normalizeRecord = (item) => ({
  ...item,
  salaryMonth: formatMonthForView(item.salaryMonth)
})

const filteredSalaries = computed(() => {
  return visibleSalaries.value.filter(item => {
    const empName = employeeNameMap.value[item.empId] || ''
    const matchName = !searchForm.empName || empName.includes(searchForm.empName.trim())
    const matchMonth = !searchForm.salaryMonth || item.salaryMonth === searchForm.salaryMonth
    const matchStatus = !searchForm.status || item.status === searchForm.status
    return matchName && matchMonth && matchStatus
  })
})

const getStatusType = (status) => {
  if (status === '已发放') return 'success'
  if (status === '待发放') return 'warning'
  if (status === '待提交') return 'info'
  if (status === '待审批') return 'primary'
  return 'info'
}

const calculateSalary = () => {
  const gross = Number(form.baseSalary) + Number(form.positionSalary) + Number(form.bonus) + Number(form.overtimePay)
  const deduct = Number(form.socialInsurance) + Number(form.housingFund) + Number(form.attendanceDeduct) + Number(form.tax) + Number(form.otherDeduct)
  return { gross, net: gross - deduct }
}

const loadPageData = async () => {
  loading.value = true
  try {
    const [salaryPage, employeePage] = await Promise.all([
      listSalaryRecordsApi({ page: 1, size: 200 }),
      listEmployeesApi({ page: 1, size: 200 })
    ])
    salaryRecords.value = (salaryPage.items || []).map(normalizeRecord)
    employees.value = employeePage.items || []
  } catch (error) {
    ElMessage.error(error.message || '薪资数据加载失败')
  } finally {
    loading.value = false
  }
}

const resetForm = () => {
  Object.assign(form, {
    salaryId: null,
    empId: '',
    salaryMonth: '',
    baseSalary: 0,
    positionSalary: 0,
    bonus: 0,
    overtimePay: 0,
    socialInsurance: 0,
    housingFund: 0,
    attendanceDeduct: 0,
    tax: 0,
    otherDeduct: 0,
    status: ''
  })
}

const buildPayload = (overrides = {}) => {
  const { gross, net } = calculateSalary()
  return {
    empId: form.empId,
    salaryMonth: formatMonthForApi(form.salaryMonth),
    baseSalary: Number(form.baseSalary),
    positionSalary: Number(form.positionSalary),
    bonus: Number(form.bonus),
    overtimePay: Number(form.overtimePay),
    grossSalary: gross,
    socialInsurance: Number(form.socialInsurance),
    housingFund: Number(form.housingFund),
    attendanceDeduct: Number(form.attendanceDeduct),
    tax: Number(form.tax),
    otherDeduct: Number(form.otherDeduct),
    netSalary: net,
    status: isFinanceSpecialist.value ? '待提交' : (form.status || '待发放'),
    ...overrides
  }
}

const handleAdd = () => {
  resetForm()
  dialogVisible.value = true
}

const handleEdit = (row) => {
  Object.assign(form, {
    salaryId: row.salaryId,
    empId: row.empId,
    salaryMonth: row.salaryMonth,
    baseSalary: Number(row.baseSalary || 0),
    positionSalary: Number(row.positionSalary || 0),
    bonus: Number(row.bonus || 0),
    overtimePay: Number(row.overtimePay || 0),
    socialInsurance: Number(row.socialInsurance || 0),
    housingFund: Number(row.housingFund || 0),
    attendanceDeduct: Number(row.attendanceDeduct || 0),
    tax: Number(row.tax || 0),
    otherDeduct: Number(row.otherDeduct || 0),
    status: row.status || ''
  })
  dialogVisible.value = true
}

const handleDetail = (row) => {
  currentDetail.value = row
  detailDialogVisible.value = true
}

const handleSubmit = async () => {
  if (!formRef.value) return
  const valid = await formRef.value.validate().catch(() => false)
  if (!valid) return

  try {
    if (form.salaryId) {
      await updateSalaryRecordApi(form.salaryId, buildPayload())
      ElMessage.success('修改成功')
    } else {
      await createSalaryRecordApi(buildPayload())
      ElMessage.success('新增成功')
    }
    dialogVisible.value = false
    await loadPageData()
  } catch (error) {
    ElMessage.error(error.message || '保存失败')
  }
}

const updateSalaryStatus = async (row, overrides) => {
  await updateSalaryRecordApi(row.salaryId, {
    empId: row.empId,
    salaryMonth: formatMonthForApi(row.salaryMonth),
    baseSalary: Number(row.baseSalary),
    positionSalary: Number(row.positionSalary),
    bonus: Number(row.bonus),
    overtimePay: Number(row.overtimePay),
    grossSalary: Number(row.grossSalary),
    socialInsurance: Number(row.socialInsurance),
    housingFund: Number(row.housingFund),
    attendanceDeduct: Number(row.attendanceDeduct),
    tax: Number(row.tax),
    otherDeduct: Number(row.otherDeduct),
    netSalary: Number(row.netSalary),
    status: row.status,
    submitDate: row.submitDate || null,
    approveDate: row.approveDate || null,
    payDate: row.payDate || null,
    ...overrides
  })
}

const handlePay = async (row) => {
  try {
    await updateSalaryStatus(row, {
      status: '已发放',
      payDate: new Date().toISOString().slice(0, 10)
    })
    await loadPageData()
    ElMessage.success('发放成功')
  } catch (error) {
    ElMessage.error(error.message || '发放失败')
  }
}

const handleSelectionChange = (rows) => {
  selectedRows.value = rows
}

const handleSubmitApproval = async () => {
  const rows = selectedRows.value.filter(row => row.status === '待提交')
  if (!rows.length) {
    ElMessage.warning('请选择待提交的薪资记录')
    return
  }
  try {
    const submitDate = new Date().toISOString().slice(0, 10)
    await Promise.all(rows.map(row => updateSalaryStatus(row, { status: '待审批', submitDate })))
    await loadPageData()
    ElMessage.success('已批量提交审批')
  } catch (error) {
    ElMessage.error(error.message || '提交审批失败')
  }
}

const handleApprove = async (row) => {
  try {
    await updateSalaryStatus(row, {
      status: '待发放',
      approveDate: new Date().toISOString().slice(0, 10)
    })
    await loadPageData()
    ElMessage.success('审批通过，待发放')
  } catch (error) {
    ElMessage.error(error.message || '审批失败')
  }
}

const handleReset = () => {
  Object.assign(searchForm, { empName: '', salaryMonth: '', status: '' })
}

onMounted(loadPageData)
</script>

<template>
  <div class="salary-page" v-loading="loading">
    <el-card shadow="never" class="search-card">
      <el-form :model="searchForm" inline>
        <el-form-item label="员工姓名">
          <el-input v-model="searchForm.empName" placeholder="请输入" clearable style="width: 150px" />
        </el-form-item>
        <el-form-item label="薪资月份">
          <el-date-picker v-model="searchForm.salaryMonth" type="month" placeholder="选择月份" value-format="YYYY-MM" style="width: 150px" />
        </el-form-item>
        <el-form-item label="发放状态">
          <el-select v-model="searchForm.status" placeholder="请选择" clearable style="width: 140px">
            <el-option label="待提交" value="待提交" />
            <el-option label="待审批" value="待审批" />
            <el-option label="待发放" value="待发放" />
            <el-option label="已发放" value="已发放" />
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
          <span>薪资记录</span>
          <div class="header-actions">
            <el-button v-if="canSubmitSalary" type="warning" :disabled="!canBatchSubmit" @click="handleSubmitApproval">
              <el-icon><Upload /></el-icon>
              提交审批
            </el-button>
            <el-button v-if="canAddSalary" type="primary" @click="handleAdd">
              <el-icon><Plus /></el-icon>
              新增记录
            </el-button>
          </div>
        </div>
      </template>
      <el-table :data="filteredSalaries" stripe border @selection-change="handleSelectionChange">
        <el-table-column type="selection" width="50" />
        <el-table-column prop="salaryId" label="ID" width="70" align="center" />
        <el-table-column label="员工姓名" width="110">
          <template #default="{ row }">{{ employeeNameMap[row.empId] || '-' }}</template>
        </el-table-column>
        <el-table-column prop="salaryMonth" label="薪资月份" width="100" />
        <el-table-column prop="grossSalary" label="应发工资" width="120" align="right">
          <template #default="{ row }">{{ formatMoney(row.grossSalary) }}</template>
        </el-table-column>
        <el-table-column prop="netSalary" label="实发工资" width="120" align="right">
          <template #default="{ row }">
            <span style="color: #67C23A; font-weight: bold;">{{ formatMoney(row.netSalary) }}</span>
          </template>
        </el-table-column>
        <el-table-column prop="status" label="状态" width="90" align="center">
          <template #default="{ row }">
            <el-tag :type="getStatusType(row.status)">{{ row.status }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="approveDate" label="审批日期" width="110">
          <template #default="{ row }">{{ row.approveDate || '-' }}</template>
        </el-table-column>
        <el-table-column prop="payDate" label="发放日期" width="110">
          <template #default="{ row }">{{ row.payDate || '-' }}</template>
        </el-table-column>
        <el-table-column label="操作" width="220" fixed="right">
          <template #default="{ row }">
            <div class="action-buttons">
              <el-button type="primary" link @click="handleDetail(row)">详情</el-button>
              <el-button v-if="canEditSalary" type="primary" link @click="handleEdit(row)">编辑</el-button>
              <el-button v-if="row.status === '待发放' && canDirectPay" type="success" link @click="handlePay(row)">直接发放</el-button>
              <el-button v-if="row.status === '待审批' && canApproveSalary" type="warning" link @click="handleApprove(row)">审批通过</el-button>
            </div>
          </template>
        </el-table-column>
      </el-table>
    </el-card>

    <el-dialog v-model="dialogVisible" :title="form.salaryId ? '编辑薪资' : '新增薪资'" width="600px" destroy-on-close>
      <el-form ref="formRef" :model="form" :rules="rules" label-width="100px">
        <el-row :gutter="20">
          <el-col :span="12">
            <el-form-item label="员工" prop="empId">
              <el-select v-model="form.empId" placeholder="请选择" style="width: 100%" :disabled="!!form.salaryId">
                <el-option v-for="emp in visibleEmployees" :key="emp.empId" :label="emp.empName" :value="emp.empId" />
              </el-select>
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="薪资月份" prop="salaryMonth">
              <el-date-picker v-model="form.salaryMonth" type="month" placeholder="选择月份" value-format="YYYY-MM" style="width: 100%" />
            </el-form-item>
          </el-col>
        </el-row>
        <el-divider content-position="left">收入项</el-divider>
        <el-row :gutter="20">
          <el-col :span="12">
            <el-form-item label="基本工资" prop="baseSalary">
              <el-input-number v-model="form.baseSalary" :min="0" :precision="2" style="width: 100%" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="岗位工资">
              <el-input-number v-model="form.positionSalary" :min="0" :precision="2" style="width: 100%" />
            </el-form-item>
          </el-col>
        </el-row>
        <el-row :gutter="20">
          <el-col :span="12">
            <el-form-item label="奖金">
              <el-input-number v-model="form.bonus" :min="0" :precision="2" style="width: 100%" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="加班费">
              <el-input-number v-model="form.overtimePay" :min="0" :precision="2" style="width: 100%" />
            </el-form-item>
          </el-col>
        </el-row>
        <el-divider content-position="left">扣款项</el-divider>
        <el-row :gutter="20">
          <el-col :span="12">
            <el-form-item label="社保扣款">
              <el-input-number v-model="form.socialInsurance" :min="0" :precision="2" style="width: 100%" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="公积金扣款">
              <el-input-number v-model="form.housingFund" :min="0" :precision="2" style="width: 100%" />
            </el-form-item>
          </el-col>
        </el-row>
        <el-row :gutter="20">
          <el-col :span="12">
            <el-form-item label="考勤扣款">
              <el-input-number v-model="form.attendanceDeduct" :min="0" :precision="2" style="width: 100%" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="个人所得税">
              <el-input-number v-model="form.tax" :min="0" :precision="2" style="width: 100%" />
            </el-form-item>
          </el-col>
        </el-row>
        <el-row :gutter="20">
          <el-col :span="12">
            <el-form-item label="其他扣款">
              <el-input-number v-model="form.otherDeduct" :min="0" :precision="2" style="width: 100%" />
            </el-form-item>
          </el-col>
        </el-row>
      </el-form>
      <template #footer>
        <el-button @click="dialogVisible = false">取消</el-button>
        <el-button type="primary" @click="handleSubmit">确定</el-button>
      </template>
    </el-dialog>

    <el-dialog v-model="detailDialogVisible" title="薪资详情" width="520px">
      <el-descriptions v-if="currentDetail" :column="2" border>
        <el-descriptions-item label="员工姓名">{{ employeeNameMap[currentDetail.empId] || '-' }}</el-descriptions-item>
        <el-descriptions-item label="薪资月份">{{ currentDetail.salaryMonth }}</el-descriptions-item>
        <el-descriptions-item label="基本工资">{{ formatMoney(currentDetail.baseSalary) }}</el-descriptions-item>
        <el-descriptions-item label="岗位工资">{{ formatMoney(currentDetail.positionSalary) }}</el-descriptions-item>
        <el-descriptions-item label="奖金">{{ formatMoney(currentDetail.bonus) }}</el-descriptions-item>
        <el-descriptions-item label="加班费">{{ formatMoney(currentDetail.overtimePay) }}</el-descriptions-item>
        <el-descriptions-item label="应发工资" :span="2">
          <span style="color: #409EFF; font-weight: bold;">{{ formatMoney(currentDetail.grossSalary) }}</span>
        </el-descriptions-item>
        <el-descriptions-item label="社保扣款">{{ formatMoney(currentDetail.socialInsurance) }}</el-descriptions-item>
        <el-descriptions-item label="公积金扣款">{{ formatMoney(currentDetail.housingFund) }}</el-descriptions-item>
        <el-descriptions-item label="考勤扣款">{{ formatMoney(currentDetail.attendanceDeduct) }}</el-descriptions-item>
        <el-descriptions-item label="个人所得税">{{ formatMoney(currentDetail.tax) }}</el-descriptions-item>
        <el-descriptions-item label="其他扣款">{{ formatMoney(currentDetail.otherDeduct) }}</el-descriptions-item>
        <el-descriptions-item label="实发工资">
          <span style="color: #67C23A; font-weight: bold; font-size: 16px;">{{ formatMoney(currentDetail.netSalary) }}</span>
        </el-descriptions-item>
      </el-descriptions>
      <template #footer>
        <el-button @click="detailDialogVisible = false">关闭</el-button>
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
.header-actions {
  display: flex;
  align-items: center;
  gap: 10px;
}
.action-buttons {
  display: flex;
  align-items: center;
  gap: 8px;
  white-space: nowrap;
}
</style>
