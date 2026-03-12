<script setup>
import { computed, onMounted, reactive, ref, watch } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { useUserStore, IDENTITY_TAG_OPTIONS } from '@/stores/user'
import { listApprovalRulesApi } from '@/api/approvalRule'
import { listDepartmentsApi } from '@/api/department'
import { listEmployeesApi } from '@/api/employee'
import { createLeaveRequestApi, listLeaveRequestsApi, updateLeaveRequestApi } from '@/api/leave'
import { listPositionsApi } from '@/api/position'

const userStore = useUserStore()

const loading = ref(false)
const leaveRequests = ref([])
const employees = ref([])
const departments = ref([])
const positions = ref([])
const approvalRules = ref([])
const dialogVisible = ref(false)
const approveDialogVisible = ref(false)
const formRef = ref(null)
const currentApprove = ref(null)

const LEAVE_TYPES = ['年假', '病假', '事假', '婚假', '产假', '陪产假', '丧假']
const LEAVE_STATUS = {
  pending1: '待审批',
  pending2: '待二级审批',
  approved: '已通过',
  rejected: '已拒绝',
  canceled: '已取消'
}

const tagLabelMap = IDENTITY_TAG_OPTIONS.reduce((acc, item) => {
  acc[item.value] = item.label
  return acc
}, {})

const searchForm = reactive({
  empName: '',
  leaveType: '',
  status: ''
})

const form = reactive({
  leaveId: null,
  empId: '',
  leaveType: LEAVE_TYPES[0],
  startDate: '',
  endDate: '',
  days: 1,
  reason: ''
})

const approveForm = reactive({
  action: 'approve',
  remark: ''
})

const rules = {
  empId: [{ required: true, message: '请选择员工', trigger: 'change' }],
  leaveType: [{ required: true, message: '请选择请假类型', trigger: 'change' }],
  startDate: [{ required: true, message: '请选择开始日期', trigger: 'change' }],
  endDate: [{ required: true, message: '请选择结束日期', trigger: 'change' }],
  days: [{ required: true, message: '请确认请假天数', trigger: 'blur' }]
}

const leaveTypes = LEAVE_TYPES
const statusOptions = Object.values(LEAVE_STATUS)
const leaveScope = computed(() => userStore.getModuleScope('attendance:leave'))
const canAddLeave = computed(() => userStore.hasPermission('attendance:leave:add'))

const getTagLabel = (tag) => tagLabelMap[tag] || ''
const getDeptName = (deptId) => departments.value.find(item => item.deptId === deptId)?.deptName || '-'
const getPositionName = (positionId) => positions.value.find(item => item.positionId === positionId)?.positionName || '-'

const filterByScope = (list, scopeValue) => {
  if (scopeValue === 'company') return list
  if (scopeValue === 'dept') return list.filter(item => item.deptId === userStore.deptId)
  if (scopeValue === 'self') return list.filter(item => item.empId === userStore.empId)
  return list
}

const visibleEmployees = computed(() => filterByScope(employees.value, leaveScope.value))

const employeeMap = computed(() => employees.value.reduce((acc, item) => {
  acc[item.empId] = item
  return acc
}, {}))

const getEmployeeTag = (empId) => {
  const emp = employeeMap.value[empId]
  const deptName = getDeptName(emp?.deptId)
  const positionName = getPositionName(emp?.positionId)
  const roleCode = positionName.includes('经理') ? 'MANAGER' : 'EMPLOYEE'
  return userStore.getIdentityTagByEmpId(empId, {
    identityTag: emp?.identityTagCode || emp?.identityTag || '',
    roleCode,
    deptName,
    positionName
  })
}

const matchDays = (rule, days) => {
  const value = Number(rule.daysValue || 0)
  if (rule.daysOp === 'any') return true
  if (rule.daysOp === '<=') return Number(days) <= value
  if (rule.daysOp === '>') return Number(days) > value
  return false
}

const getRuleMatchScore = (rule, applicantTag, days) => {
  if (!matchDays(rule, days)) return 0
  if (rule.applicantTag === applicantTag) return 2
  if (userStore.matchIdentityTag(rule.applicantTag, applicantTag)) return 1
  return 0
}

const getMatchedRule = (empId, days) => {
  const applicantTag = getEmployeeTag(empId)
  return [...approvalRules.value]
    .map(rule => ({ rule, score: getRuleMatchScore(rule, applicantTag, days) }))
    .filter(item => item.score > 0)
    .sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score
      return (a.rule.sortOrder ?? 0) - (b.rule.sortOrder ?? 0)
    })
    .map(item => item.rule)[0]
}

const getApprovalChain = (row) => {
  const rule = getMatchedRule(row.empId, Number(row.days || 0))
  return {
    firstApproverTag: rule?.firstApproverTag || row.pendingApproverTag || 'ADMIN',
    firstApproverScope: 'company',
    secondApproverTag: rule?.secondApproverTag || row.nextApproverTag || '',
    secondApproverScope: rule?.secondApproverScope || row.nextApproverScope || 'dept'
  }
}

const getNormalizedApprovalPayload = (row) => {
  const chain = getApprovalChain(row)
  if (row.status === LEAVE_STATUS.pending1) {
    return {
      status: LEAVE_STATUS.pending1,
      pendingApproverTag: chain.firstApproverTag,
      pendingApproverScope: chain.firstApproverScope,
      nextApproverTag: chain.secondApproverTag || '',
      nextApproverScope: chain.secondApproverTag ? chain.secondApproverScope : '',
      approveTime: row.approveTime || ''
    }
  }
  if (row.status === LEAVE_STATUS.pending2) {
    if (!chain.secondApproverTag) {
      return {
        status: LEAVE_STATUS.approved,
        pendingApproverTag: '',
        pendingApproverScope: 'company',
        nextApproverTag: '',
        nextApproverScope: '',
        approveTime: row.approveTime || new Date().toISOString().slice(0, 19)
      }
    }
    return {
      status: LEAVE_STATUS.pending2,
      pendingApproverTag: chain.secondApproverTag,
      pendingApproverScope: chain.secondApproverScope || 'company',
      nextApproverTag: '',
      nextApproverScope: '',
      approveTime: row.approveTime || ''
    }
  }
  return null
}

const shouldNormalizeApproval = (row) => {
  const normalized = getNormalizedApprovalPayload(row)
  if (!normalized) return false
  return normalized.status !== row.status
    || normalized.pendingApproverTag !== (row.pendingApproverTag || '')
    || normalized.pendingApproverScope !== (row.pendingApproverScope || '')
    || normalized.nextApproverTag !== (row.nextApproverTag || '')
    || normalized.nextApproverScope !== (row.nextApproverScope || '')
    || (normalized.approveTime || '') !== (row.approveTime || '')
}

const normalizeLeaveRequests = async (items) => {
  const pendingItems = (items || []).filter(item => item.status === LEAVE_STATUS.pending1 || item.status === LEAVE_STATUS.pending2)
  const corrections = pendingItems.filter(shouldNormalizeApproval)
  if (!corrections.length) return items || []

  await Promise.all(corrections.map((item) => {
    const normalized = getNormalizedApprovalPayload(item)
    return updateLeaveRequestApi(item.leaveId, {
      ...item,
      ...normalized,
      days: String(item.days)
    })
  }))

  const refreshed = await listLeaveRequestsApi({ page: 1, size: 200 })
  return refreshed.items || []
}

const visibleLeaves = computed(() => {
  if (leaveScope.value === 'company') return leaveRequests.value
  if (leaveScope.value === 'dept') {
    const visibleIds = new Set(visibleEmployees.value.map(item => item.empId))
    return leaveRequests.value.filter(item => visibleIds.has(item.empId))
  }
  return leaveRequests.value.filter(item => item.empId === userStore.empId)
})

const filteredLeaves = computed(() => visibleLeaves.value.filter(item => {
  const empName = employeeMap.value[item.empId]?.empName || ''
  const matchName = !searchForm.empName || empName.includes(searchForm.empName.trim())
  const matchType = !searchForm.leaveType || item.leaveType === searchForm.leaveType
  const matchStatus = !searchForm.status || item.status === searchForm.status
  return matchName && matchType && matchStatus
}))

const getStatusType = (status) => ({
  [LEAVE_STATUS.pending1]: 'warning',
  [LEAVE_STATUS.pending2]: 'warning',
  [LEAVE_STATUS.approved]: 'success',
  [LEAVE_STATUS.rejected]: 'danger',
  [LEAVE_STATUS.canceled]: 'info'
}[status] || 'info')

const getStatusLabel = (row) => {
  if (row.status === LEAVE_STATUS.pending1 || row.status === LEAVE_STATUS.pending2) {
    const chain = getApprovalChain(row)
    const currentTag = row.status === LEAVE_STATUS.pending1
      ? chain.firstApproverTag
      : chain.secondApproverTag || row.pendingApproverTag
    const tagLabel = getTagLabel(currentTag)
    return tagLabel ? `待 ${tagLabel} 审批` : row.status
  }
  return row.status
}

const canApprove = (row) => {
  if (row.status !== LEAVE_STATUS.pending1 && row.status !== LEAVE_STATUS.pending2) return false
  if (!userStore.hasPermission('attendance:leave:approve')) return false
  const chain = getApprovalChain(row)
  const expectedTag = row.status === LEAVE_STATUS.pending1
    ? chain.firstApproverTag
    : chain.secondApproverTag || row.pendingApproverTag
  const expectedScope = row.status === LEAVE_STATUS.pending1
    ? chain.firstApproverScope
    : (chain.secondApproverScope || 'company')
  if (!expectedTag) return false
  if (!userStore.matchIdentityTag(expectedTag, userStore.identityTag)) return false
  if (expectedScope === 'dept') {
    return employeeMap.value[row.empId]?.deptId === userStore.deptId
  }
  if (expectedScope === 'self') return row.empId === userStore.empId
  return true
}

const canCancel = (row) => {
  if (!userStore.hasPermission('attendance:leave:cancel')) return false
  return row.empId === userStore.empId && (row.status === LEAVE_STATUS.pending1 || row.status === LEAVE_STATUS.pending2)
}

const calculateLeaveDays = (startDate, endDate) => {
  if (!startDate || !endDate) return 1
  const start = new Date(`${startDate}T00:00:00`)
  const end = new Date(`${endDate}T00:00:00`)
  const diff = end.getTime() - start.getTime()
  if (Number.isNaN(diff) || diff < 0) return 1
  return Math.floor(diff / 86400000) + 1
}

const loadPageData = async () => {
  loading.value = true
  try {
    const [leavePage, employeePage, departmentPage, positionPage, rulePage] = await Promise.all([
      listLeaveRequestsApi({ page: 1, size: 200 }),
      listEmployeesApi({ page: 1, size: 200 }),
      listDepartmentsApi({ page: 1, size: 200 }),
      listPositionsApi({ page: 1, size: 200 }),
      listApprovalRulesApi({ page: 1, size: 200, typeCode: 'leave' })
    ])
    employees.value = employeePage.items || []
    departments.value = departmentPage.items || []
    positions.value = positionPage.items || []
    approvalRules.value = rulePage.items || []
    leaveRequests.value = await normalizeLeaveRequests(leavePage.items || [])
  } catch (error) {
    ElMessage.error(error.message || '请假数据加载失败')
  } finally {
    loading.value = false
  }
}

const resetForm = () => {
  Object.assign(form, {
    leaveId: null,
    empId: '',
    leaveType: LEAVE_TYPES[0],
    startDate: '',
    endDate: '',
    days: 1,
    reason: ''
  })
}

watch(
  () => [form.startDate, form.endDate],
  ([startDate, endDate]) => {
    form.days = calculateLeaveDays(startDate, endDate)
  }
)

const buildLeavePayload = () => {
  const rule = getMatchedRule(form.empId, form.days)
  return {
    empId: form.empId,
    leaveType: form.leaveType,
    startDate: form.startDate,
    endDate: form.endDate,
    days: String(form.days),
    reason: form.reason,
    status: LEAVE_STATUS.pending1,
    pendingApproverTag: rule?.firstApproverTag || 'ADMIN',
    pendingApproverScope: 'company',
    nextApproverTag: rule?.secondApproverTag || '',
    nextApproverScope: rule?.secondApproverScope || 'dept',
    applyTime: new Date().toISOString().slice(0, 19)
  }
}

const handleAdd = () => {
  resetForm()
  dialogVisible.value = true
}

const handleSubmit = async () => {
  if (!formRef.value) return
  const valid = await formRef.value.validate().catch(() => false)
  if (!valid) return

  try {
    await createLeaveRequestApi(buildLeavePayload())
    dialogVisible.value = false
    await loadPageData()
    ElMessage.success('申请提交成功')
  } catch (error) {
    ElMessage.error(error.message || '申请提交失败')
  }
}

const handleApprove = (row) => {
  currentApprove.value = row
  Object.assign(approveForm, { action: 'approve', remark: '' })
  approveDialogVisible.value = true
}

const submitApprove = async () => {
  const row = currentApprove.value
  if (!row) return

  const payload = { ...row }
  const chain = getApprovalChain(row)
  if (approveForm.action === 'approve') {
    if (row.status === LEAVE_STATUS.pending1 && chain.secondApproverTag) {
      payload.status = LEAVE_STATUS.pending2
      payload.pendingApproverTag = chain.secondApproverTag
      payload.pendingApproverScope = chain.secondApproverScope || 'dept'
      payload.nextApproverTag = ''
      payload.nextApproverScope = ''
    } else {
      payload.status = LEAVE_STATUS.approved
      payload.pendingApproverTag = ''
      payload.pendingApproverScope = 'company'
      payload.nextApproverTag = ''
      payload.nextApproverScope = ''
      payload.approveTime = new Date().toISOString().slice(0, 19)
    }
  } else {
    payload.status = LEAVE_STATUS.rejected
    payload.pendingApproverTag = ''
    payload.pendingApproverScope = 'company'
    payload.nextApproverTag = ''
    payload.nextApproverScope = ''
    payload.approveTime = new Date().toISOString().slice(0, 19)
  }

  payload.approveRemark = approveForm.remark
  payload.days = String(payload.days)

  try {
    await updateLeaveRequestApi(row.leaveId, payload)
    approveDialogVisible.value = false
    await loadPageData()
    ElMessage.success(approveForm.action === 'approve' ? '审批通过' : '已拒绝')
  } catch (error) {
    ElMessage.error(error.message || '审批失败')
  }
}

const handleCancel = (row) => {
  ElMessageBox.confirm('确定要取消该请假申请吗？', '提示', {
    confirmButtonText: '确定',
    cancelButtonText: '取消',
    type: 'warning'
  }).then(async () => {
    try {
      await updateLeaveRequestApi(row.leaveId, {
        ...row,
        days: String(row.days),
        status: LEAVE_STATUS.canceled,
        pendingApproverTag: '',
        pendingApproverScope: 'company',
        nextApproverTag: '',
        nextApproverScope: ''
      })
      await loadPageData()
      ElMessage.success('已取消')
    } catch (error) {
      ElMessage.error(error.message || '取消失败')
    }
  }).catch(() => {})
}

const handleReset = () => {
  Object.assign(searchForm, { empName: '', leaveType: '', status: '' })
}

onMounted(loadPageData)
</script>

<template>
  <div class="leave-page" v-loading="loading">
    <el-card shadow="never" class="search-card">
      <el-form :model="searchForm" inline>
        <el-form-item label="员工姓名">
          <el-input v-model="searchForm.empName" placeholder="请输入员工姓名" clearable style="width: 150px" />
        </el-form-item>
        <el-form-item label="请假类型">
          <el-select v-model="searchForm.leaveType" placeholder="请选择" clearable style="width: 120px">
            <el-option v-for="item in leaveTypes" :key="item" :label="item" :value="item" />
          </el-select>
        </el-form-item>
        <el-form-item label="审批状态">
          <el-select v-model="searchForm.status" placeholder="请选择" clearable style="width: 140px">
            <el-option v-for="item in statusOptions" :key="item" :label="item" :value="item" />
          </el-select>
        </el-form-item>
        <el-form-item>
          <el-button type="primary">搜索</el-button>
          <el-button @click="handleReset">重置</el-button>
        </el-form-item>
      </el-form>
    </el-card>

    <el-card shadow="never">
      <template #header>
        <div class="card-header">
          <span>请假申请列表</span>
          <el-button v-if="canAddLeave" type="primary" @click="handleAdd">新增申请</el-button>
        </div>
      </template>

      <el-table :data="filteredLeaves" stripe border>
        <el-table-column prop="leaveId" label="ID" width="70" align="center" />
        <el-table-column label="申请人" width="100">
          <template #default="{ row }">{{ employeeMap[row.empId]?.empName || '-' }}</template>
        </el-table-column>
        <el-table-column prop="leaveType" label="请假类型" width="100" />
        <el-table-column prop="startDate" label="开始日期" width="120" />
        <el-table-column prop="endDate" label="结束日期" width="120" />
        <el-table-column prop="days" label="天数" width="70" align="center" />
        <el-table-column prop="reason" label="请假原因/备注" min-width="220" show-overflow-tooltip />
        <el-table-column prop="status" label="状态" width="140" align="center">
          <template #default="{ row }">
            <el-tag :type="getStatusType(row.status)">{{ getStatusLabel(row) }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="applyTime" label="申请时间" width="180" />
        <el-table-column label="操作" width="160" fixed="right">
          <template #default="{ row }">
            <el-button v-if="canApprove(row)" type="primary" link @click="handleApprove(row)">审批</el-button>
            <el-button v-if="canCancel(row)" type="danger" link @click="handleCancel(row)">取消</el-button>
          </template>
        </el-table-column>
      </el-table>
    </el-card>

    <el-dialog v-model="dialogVisible" title="新增请假申请" width="520px" destroy-on-close>
      <el-form ref="formRef" :model="form" :rules="rules" label-width="90px">
        <el-form-item label="员工" prop="empId">
          <el-select v-model="form.empId" placeholder="请选择员工" style="width: 100%">
            <el-option v-for="emp in visibleEmployees" :key="emp.empId" :label="emp.empName" :value="emp.empId" />
          </el-select>
        </el-form-item>
        <el-form-item label="请假类型" prop="leaveType">
          <el-select v-model="form.leaveType" style="width: 100%">
            <el-option v-for="item in leaveTypes" :key="item" :label="item" :value="item" />
          </el-select>
        </el-form-item>
        <el-form-item label="开始日期" prop="startDate">
          <el-date-picker v-model="form.startDate" type="date" placeholder="选择开始日期" value-format="YYYY-MM-DD" style="width: 100%" />
        </el-form-item>
        <el-form-item label="结束日期" prop="endDate">
          <el-date-picker v-model="form.endDate" type="date" placeholder="选择结束日期" value-format="YYYY-MM-DD" style="width: 100%" />
        </el-form-item>
        <el-form-item label="请假天数" prop="days">
          <el-input :model-value="`${form.days} 天`" readonly />
        </el-form-item>
        <el-form-item label="请假原因" prop="reason">
          <el-input v-model="form.reason" type="textarea" :rows="3" placeholder="请输入请假原因" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="dialogVisible = false">取消</el-button>
        <el-button type="primary" @click="handleSubmit">提交申请</el-button>
      </template>
    </el-dialog>

    <el-dialog v-model="approveDialogVisible" title="审批请假申请" width="420px">
      <el-form :model="approveForm" label-width="90px">
        <el-form-item label="审批操作">
          <el-radio-group v-model="approveForm.action">
            <el-radio value="approve">通过</el-radio>
            <el-radio value="reject">拒绝</el-radio>
          </el-radio-group>
        </el-form-item>
        <el-form-item label="审批备注">
          <el-input v-model="approveForm.remark" type="textarea" :rows="3" placeholder="请输入审批备注" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="approveDialogVisible = false">取消</el-button>
        <el-button type="primary" @click="submitApprove">确定</el-button>
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
