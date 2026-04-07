<script setup>
import { computed, onMounted, reactive, ref } from 'vue'
import { ElMessage } from 'element-plus'
import { useUserStore } from '@/stores/user'
import { listEmployeesApi } from '@/api/employee'
import { createSalaryRecordApi, listSalaryRecordsApi, updateSalaryRecordApi } from '@/api/salaryRecord'
import { listApprovalRulesApi } from '@/api/approvalRule'

const userStore = useUserStore()

const loading = ref(false)
const salaryRecords = ref([])
const employees = ref([])
const approvalRules = ref([])
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

// 获取员工的身份标签
const getEmployeeIdentityTag = (empId) => {
  const emp = employees.value.find(e => e.empId === empId)
  if (!emp) return 'EMPLOYEE'
  
  // 使用员工的identityTagCode，如果没有则推导
  if (emp.identityTagCode) return emp.identityTagCode
  
  // 简单推导逻辑
  return userStore.getIdentityTagByEmpId(empId, {
    identityTag: emp.identityTagCode || '',
    roleCode: emp.roleCode || 'EMPLOYEE',
    deptName: emp.deptName || '',
    positionName: emp.positionName || ''
  })
}

// 匹配审批规则
const matchApprovalRule = (empId) => {
  const applicantTag = getEmployeeIdentityTag(empId)
  
  // 查找匹配的规则
  const matchedRules = approvalRules.value.filter(rule => {
    // 如果规则的申请人标签是*（任意），或者匹配当前员工的标签
    if (rule.applicantTag === '*') return true
    if (rule.applicantTag === applicantTag) return true
    // 检查标签别名匹配
    return userStore.matchIdentityTag(rule.applicantTag, applicantTag)
  })
  
  // 按优先级排序：精确匹配 > 别名匹配 > 通配符
  matchedRules.sort((a, b) => {
    const aScore = a.applicantTag === applicantTag ? 2 : (a.applicantTag === '*' ? 0 : 1)
    const bScore = b.applicantTag === applicantTag ? 2 : (b.applicantTag === '*' ? 0 : 1)
    return bScore - aScore
  })
  
  return matchedRules[0] || null
}

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
    const [salaryPage, employeePage, rulePage] = await Promise.all([
      listSalaryRecordsApi({ page: 1, size: 200 }),
      listEmployeesApi({ page: 1, size: 200 }),
      listApprovalRulesApi({ page: 1, size: 200, typeCode: 'salary_record' })
    ])
    salaryRecords.value = (salaryPage.items || []).map(normalizeRecord)
    employees.value = employeePage.items || []
    approvalRules.value = rulePage.items || []
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
    
    // 为每条记录匹配审批规则
    await Promise.all(rows.map(row => {
      const rule = matchApprovalRule(row.empId)
      
      if (!rule) {
        // 没有匹配的规则，使用默认流程
        return updateSalaryStatus(row, { 
          status: '待审批', 
          submitDate,
          pendingApproverRole: 'FINANCE_MANAGER',
          nextApproverRole: ''
        })
      }
      
      // 使用规则中的审批人
      return updateSalaryStatus(row, { 
        status: '待审批', 
        submitDate,
        pendingApproverRole: rule.firstApproverTag,
        nextApproverRole: rule.secondApproverTag || '',
        nextApproverScope: rule.secondApproverTag ? (rule.secondApproverScope || 'company') : ''
      })
    }))
    
    await loadPageData()
    ElMessage.success('已批量提交审批')
  } catch (error) {
    ElMessage.error(error.message || '提交审批失败')
  }
}

const handleApprove = async (row) => {
  try {
    const approveDate = new Date().toISOString().slice(0, 10)
    
    // 检查是否有下一级审批人
    if (row.nextApproverRole && row.nextApproverRole.trim()) {
      // 需要二级审批，更新为待二级审批状态
      await updateSalaryStatus(row, {
        status: '待审批',
        approveDate,
        pendingApproverRole: row.nextApproverRole,
        nextApproverRole: '',
        nextApproverScope: ''
      })
      ElMessage.success('一级审批通过，等待二级审批')
    } else {
      // 不需要二级审批，直接进入待发放
      await updateSalaryStatus(row, {
        status: '待发放',
        approveDate
      })
      ElMessage.success('审批通过，待发放')
    }
    
    await loadPageData()
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
      <el-table :data="filteredSalaries" stripe border class="desktop-table" @selection-change="handleSelectionChange">
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

      <div class="salary-mobile-list">
        <div v-for="row in filteredSalaries" :key="row.salaryId" class="salary-mobile-card">
          <div class="mobile-card-top">
            <div>
              <div class="mobile-card-title">{{ employeeNameMap[row.empId] || '-' }}</div>
              <div class="mobile-card-subtitle">薪资月份：{{ row.salaryMonth }}</div>
            </div>
            <el-tag :type="getStatusType(row.status)" round>{{ row.status }}</el-tag>
          </div>

          <div class="mobile-money-grid">
            <div class="money-item">
              <span>应发工资</span>
              <strong>{{ formatMoney(row.grossSalary) }}</strong>
            </div>
            <div class="money-item money-item-emphasis">
              <span>实发工资</span>
              <strong>{{ formatMoney(row.netSalary) }}</strong>
            </div>
            <div class="money-item">
              <span>审批日期</span>
              <strong>{{ row.approveDate || '-' }}</strong>
            </div>
            <div class="money-item">
              <span>发放日期</span>
              <strong>{{ row.payDate || '-' }}</strong>
            </div>
          </div>

          <div class="mobile-card-actions">
            <el-button type="primary" plain @click="handleDetail(row)">详情</el-button>
            <el-button v-if="canEditSalary" type="primary" plain @click="handleEdit(row)">编辑</el-button>
            <el-button v-if="row.status === '寰呭彂鏀?' && canDirectPay" type="success" plain @click="handlePay(row)">直接发放</el-button>
            <el-button v-if="row.status === '寰呭鎵?' && canApproveSalary" type="warning" plain @click="handleApprove(row)">审批通过</el-button>
          </div>
        </div>
      </div>
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

.salary-mobile-list {
  display: none;
}

.salary-mobile-card {
  padding: 16px;
  border-radius: 18px;
  background: linear-gradient(180deg, #ffffff 0%, #f8fbff 100%);
  border: 1px solid rgba(226, 232, 240, 0.9);
  box-shadow: 0 10px 24px rgba(15, 23, 42, 0.06);
}

.mobile-card-top {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
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

.mobile-money-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 10px;
}

.money-item {
  display: flex;
  flex-direction: column;
  gap: 4px;
  padding: 12px;
  border-radius: 14px;
  background: #f8fafc;
}

.money-item span {
  font-size: 12px;
  color: #64748b;
}

.money-item strong {
  font-size: 13px;
  color: #0f172a;
}

.money-item-emphasis strong {
  color: #16a34a;
}

.mobile-card-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  margin-top: 14px;
}

.mobile-card-actions .el-button {
  flex: 1 1 calc(50% - 5px);
  min-width: 0;
}

@media (max-width: 768px) {
  .header-actions {
    width: 100%;
    flex-direction: column;
  }

  .header-actions .el-button {
    width: 100%;
  }

  .desktop-table {
    display: none;
  }

  .salary-mobile-list {
    display: flex;
    flex-direction: column;
    gap: 14px;
  }

  .mobile-money-grid {
    grid-template-columns: 1fr;
  }

  .action-buttons {
    white-space: normal;
  }

  :deep(.el-descriptions) {
    --el-descriptions-item-bordered-label-background: #f8fafc;
  }

  :deep(.el-descriptions__table) {
    display: block;
    overflow-x: auto;
  }
}
</style>
