<script setup>
import { ref, reactive, computed } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { salaryRecords as mockSalaries, employees } from '@/mock'
import { useUserStore } from '@/stores/user'

const userStore = useUserStore()
const STORAGE_KEY = 'salary_records'
const DEFAULT_SALARY_RECORDS = [...mockSalaries]

const loadSalaryRecords = () => {
  const stored = localStorage.getItem(STORAGE_KEY)
  if (!stored) return [...DEFAULT_SALARY_RECORDS]
  try {
    const parsed = JSON.parse(stored)
    return Array.isArray(parsed) ? parsed : [...DEFAULT_SALARY_RECORDS]
  } catch {
    return [...DEFAULT_SALARY_RECORDS]
  }
}

const salaryRecords = ref(loadSalaryRecords())
const dialogVisible = ref(false)
const detailDialogVisible = ref(false)
const formRef = ref(null)
const currentDetail = ref(null)

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

const filterEmployeesByScope = (list, scopeValue) => {
  if (scopeValue === 'company') return list
  if (scopeValue === 'dept') return list.filter(emp => emp.deptId === userStore.deptId)
  if (scopeValue === 'self') return list.filter(emp => emp.empId === userStore.empId)
  return list
}

const visibleEmployees = computed(() => filterEmployeesByScope(employees, salaryScope.value))

const filteredSalaries = computed(() => {
  return salaryRecords.value.filter(s => {
    const emp = employees.find(e => e.empId === s.empId)
    if (salaryScope.value === 'dept' && emp?.deptId !== userStore.deptId) return false
    if (salaryScope.value === 'self' && s.empId !== userStore.empId) return false
    const matchName = !searchForm.empName || s.empName.includes(searchForm.empName)
    const matchMonth = !searchForm.salaryMonth || s.salaryMonth === searchForm.salaryMonth
    const matchStatus = !searchForm.status
      || s.status === searchForm.status
      || (searchForm.status === '待审批' && s.status === '待财务经理审批')
    return matchName && matchMonth && matchStatus
  })
})

const getStatusType = (status) => {
  if (status === '已发放') return 'success'
  if (status === '待发放') return 'warning'
  if (status === '待提交') return 'info'
  if (status === '待审批' || status === '待财务经理审批') return 'primary'
  return 'info'
}

const calculateSalary = () => {
  const gross = form.baseSalary + form.positionSalary + form.bonus + form.overtimePay
  const deduct = form.socialInsurance + form.housingFund + form.attendanceDeduct + form.tax + form.otherDeduct
  return { gross, net: gross - deduct }
}

const handleAdd = () => {
  Object.assign(form, {
    salaryId: null, empId: '', salaryMonth: '', baseSalary: 0, positionSalary: 0,
    bonus: 0, overtimePay: 0, socialInsurance: 0, housingFund: 0, attendanceDeduct: 0, tax: 0, otherDeduct: 0,
    status: ''
  })
  dialogVisible.value = true
}

const handleEdit = (row) => {
  Object.assign(form, { ...row })
  dialogVisible.value = true
}

const handleDetail = (row) => {
  currentDetail.value = row
  detailDialogVisible.value = true
}

const handleSubmit = async () => {
  if (!formRef.value) return
  await formRef.value.validate((valid) => {
    if (valid) {
      const emp = employees.find(e => e.empId === form.empId)
      const { gross, net } = calculateSalary()
      const resolvedStatus = isFinanceSpecialist.value
        ? '待提交'
        : (form.status || '待发放')
      
      if (form.salaryId) {
        const index = salaryRecords.value.findIndex(s => s.salaryId === form.salaryId)
        if (index > -1) {
          salaryRecords.value[index] = { ...form, status: resolvedStatus, empName: emp?.empName, grossSalary: gross, netSalary: net }
        }
        localStorage.setItem(STORAGE_KEY, JSON.stringify(salaryRecords.value))
        ElMessage.success('修改成功')
      } else {
        const newId = Math.max(...salaryRecords.value.map(s => s.salaryId)) + 1
        salaryRecords.value.push({
          ...form, salaryId: newId, empName: emp?.empName, grossSalary: gross, netSalary: net, status: resolvedStatus
        })
        localStorage.setItem(STORAGE_KEY, JSON.stringify(salaryRecords.value))
        ElMessage.success('新增成功')
      }
      dialogVisible.value = false
    }
  })
}

const handlePay = (row) => {
  row.status = '已发放'
  row.payDate = new Date().toISOString().split('T')[0]
  localStorage.setItem(STORAGE_KEY, JSON.stringify(salaryRecords.value))
  ElMessage.success('发放成功')
}

const selectedRows = ref([])

const handleSelectionChange = (rows) => {
  selectedRows.value = rows
}

const handleSubmitApproval = () => {
  const rows = selectedRows.value.filter(row => row.status === '待提交')
  if (!rows.length) {
    ElMessage.warning('请选择待提交的薪资记录')
    return
  }
  const submitDate = new Date().toISOString().split('T')[0]
  rows.forEach(row => {
    row.status = '待审批'
    row.submitDate = submitDate
  })
  localStorage.setItem(STORAGE_KEY, JSON.stringify(salaryRecords.value))
  ElMessage.success('已批量提交审批')
}

const handleApprove = (row) => {
  row.status = '待发放'
  row.approveDate = new Date().toISOString().split('T')[0]
  localStorage.setItem(STORAGE_KEY, JSON.stringify(salaryRecords.value))
  ElMessage.success('审批通过，待发放')
}

const handleResetRecords = () => {
  ElMessageBox.confirm('确定要重置薪资记录吗？重置后将恢复为初始数据。', '提示', {
    confirmButtonText: '确定',
    cancelButtonText: '取消',
    type: 'warning'
  }).then(() => {
    salaryRecords.value = [...DEFAULT_SALARY_RECORDS]
    localStorage.setItem(STORAGE_KEY, JSON.stringify(salaryRecords.value))
    ElMessage.success('薪资记录已重置')
  }).catch(() => {})
}

const handleReset = () => {
  Object.assign(searchForm, { empName: '', salaryMonth: '', status: '' })
}

const formatMoney = (val) => val?.toLocaleString('zh-CN', { minimumFractionDigits: 2 }) || '0.00'

const canAddSalary = computed(() => userStore.hasPermission('salary:record:add'))
const canEditSalary = computed(() => userStore.hasPermission('salary:record:edit'))
const canSubmitSalary = computed(() => userStore.hasPermission('salary:record:submit'))
const canApproveSalary = computed(() => userStore.hasPermission('salary:record:approve'))
const canDirectPay = computed(() => userStore.hasPermission('salary:record:pay'))
const canBatchSubmit = computed(() => canSubmitSalary.value && selectedRows.value.some(row => row.status === '待提交'))
</script>

<template>
  <div class="salary-page">
    <!-- 搜索区域 -->
    <el-card shadow="never" class="search-card">
      <el-form :model="searchForm" inline>
        <el-form-item label="员工姓名">
          <el-input v-model="searchForm.empName" placeholder="请输入" clearable style="width: 150px" />
        </el-form-item>
        <el-form-item label="薪资月份">
          <el-date-picker v-model="searchForm.salaryMonth" type="month" placeholder="选择月份" value-format="YYYY-MM" style="width: 150px" />
        </el-form-item>
        <el-form-item label="发放状态">
          <el-select v-model="searchForm.status" placeholder="请选择" clearable style="width: 160px">
            <el-option label="待提交" value="待提交" />
            <el-option label="待发放" value="待发放" />
            <el-option label="待审批" value="待审批" />
            <el-option label="已发放" value="已发放" />
          </el-select>
        </el-form-item>
        <el-form-item>
          <el-button type="primary"><el-icon><Search /></el-icon>搜索</el-button>
          <el-button @click="handleReset"><el-icon><Refresh /></el-icon>重置</el-button>
        </el-form-item>
      </el-form>
    </el-card>

    <!-- 表格区域 -->
    <el-card shadow="never">
      <template #header>
        <div class="card-header">
          <span>薪资记录</span>
          <div class="header-actions">
            <el-button type="info" @click="handleResetRecords">
              <el-icon><Refresh /></el-icon>重置记录
            </el-button>
            <el-button v-if="canSubmitSalary" type="warning" :disabled="!canBatchSubmit" @click="handleSubmitApproval">
              <el-icon><Upload /></el-icon>提交审批
            </el-button>
            <el-button v-if="canAddSalary" type="primary" @click="handleAdd">
              <el-icon><Plus /></el-icon>新增记录
            </el-button>
          </div>
        </div>
      </template>
      <el-table :data="filteredSalaries" stripe border @selection-change="handleSelectionChange">
        <el-table-column type="selection" width="50" />
        <el-table-column prop="salaryId" label="ID" width="60" align="center" />
        <el-table-column prop="empName" label="员工姓名" width="100" />
        <el-table-column prop="salaryMonth" label="薪资月份" width="100" />
        <el-table-column prop="grossSalary" label="应发工资" width="120" align="right">
          <template #default="{ row }">¥{{ formatMoney(row.grossSalary) }}</template>
        </el-table-column>
        <el-table-column prop="netSalary" label="实发工资" width="120" align="right">
          <template #default="{ row }">
            <span style="color: #67C23A; font-weight: bold;">¥{{ formatMoney(row.netSalary) }}</span>
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
        <el-table-column label="操作" width="180" fixed="right">
          <template #default="{ row }">
            <el-button type="primary" link @click="handleDetail(row)">详情</el-button>
            <el-button v-if="canEditSalary" type="primary" link @click="handleEdit(row)">编辑</el-button>
            <el-button v-if="row.status === '待发放' && canDirectPay" type="success" link @click="handlePay(row)">直接发放</el-button>
            <el-button v-if="(row.status === '待审批' || row.status === '待财务经理审批') && canApproveSalary" type="warning" link @click="handleApprove(row)">审批通过</el-button>
          </template>
        </el-table-column>
      </el-table>
    </el-card>

    <!-- 新增/编辑对话框 -->
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

    <!-- 详情对话框 -->
    <el-dialog v-model="detailDialogVisible" title="薪资详情" width="500px">
      <el-descriptions v-if="currentDetail" :column="2" border>
        <el-descriptions-item label="员工姓名">{{ currentDetail.empName }}</el-descriptions-item>
        <el-descriptions-item label="薪资月份">{{ currentDetail.salaryMonth }}</el-descriptions-item>
        <el-descriptions-item label="基本工资">¥{{ formatMoney(currentDetail.baseSalary) }}</el-descriptions-item>
        <el-descriptions-item label="岗位工资">¥{{ formatMoney(currentDetail.positionSalary) }}</el-descriptions-item>
        <el-descriptions-item label="奖金">¥{{ formatMoney(currentDetail.bonus) }}</el-descriptions-item>
        <el-descriptions-item label="加班费">¥{{ formatMoney(currentDetail.overtimePay) }}</el-descriptions-item>
        <el-descriptions-item label="应发工资" :span="2">
          <span style="color: #409EFF; font-weight: bold;">¥{{ formatMoney(currentDetail.grossSalary) }}</span>
        </el-descriptions-item>
        <el-descriptions-item label="社保扣款">¥{{ formatMoney(currentDetail.socialInsurance) }}</el-descriptions-item>
        <el-descriptions-item label="公积金扣款">¥{{ formatMoney(currentDetail.housingFund) }}</el-descriptions-item>
        <el-descriptions-item label="考勤扣款">¥{{ formatMoney(currentDetail.attendanceDeduct) }}</el-descriptions-item>
        <el-descriptions-item label="个人所得税">¥{{ formatMoney(currentDetail.tax) }}</el-descriptions-item>
        <el-descriptions-item label="其他扣款">¥{{ formatMoney(currentDetail.otherDeduct) }}</el-descriptions-item>
        <el-descriptions-item label="实发工资">
          <span style="color: #67C23A; font-weight: bold; font-size: 16px;">¥{{ formatMoney(currentDetail.netSalary) }}</span>
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
</style>
