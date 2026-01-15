<script setup>
import { ref, reactive, computed } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { leaveRequests as mockLeaves, employees, departments, positions } from '@/mock'
import { useUserStore, IDENTITY_TAG_OPTIONS } from '@/stores/user'

const userStore = useUserStore()
const tagLabelMap = IDENTITY_TAG_OPTIONS.reduce((acc, item) => {
  acc[item.value] = item.label
  return acc
}, {})

const getTagLabel = (tag) => tagLabelMap[tag] || ''

const getDeptName = (deptId) => departments.find(d => d.deptId === deptId)?.deptName || '-'
const getPositionName = (positionId) => positions.find(p => p.positionId === positionId)?.positionName || '-'

const getEmployeeTag = (empId) => {
  const emp = employees.find(item => item.empId === empId)
  const deptName = getDeptName(emp?.deptId)
  const positionName = getPositionName(emp?.positionId)
  const roleCode = positionName.includes('经理') ? 'MANAGER' : 'EMPLOYEE'
  return userStore.getIdentityTagByEmpId(empId, { roleCode, deptName, positionName })
}

const matchDays = (rule, days) => {
  if (rule.daysOp === 'any') return true
  if (rule.daysOp === '<=') return days <= rule.daysValue
  if (rule.daysOp === '>') return days > rule.daysValue
  return false
}

const matchRule = (rule, applicantTag, days) => {
  if (!userStore.matchIdentityTag(rule.applicantTag, applicantTag)) return false
  return matchDays(rule, days)
}

const getMatchedRule = (empId, days) => {
  const applicantTag = getEmployeeTag(empId)
  const rules = userStore.getLeaveApprovalRules()
  const exact = rules.find(rule => rule.applicantTag === applicantTag && matchDays(rule, days))
  return exact || rules.find(rule => matchRule(rule, applicantTag, days))
}

const normalizeLeave = (leave) => {
  const rule = getMatchedRule(leave.empId, leave.days)
  const normalized = { ...leave }
  const legacyStatusMap = {
    'HR已批': '已通过',
    '部门经理已批': '已通过',
    '待经理审批': '待二级审批'
  }
  normalized.status = legacyStatusMap[normalized.status] || normalized.status
  if (normalized.status === '待审批') {
    normalized.pendingApproverTag = rule?.firstApproverTag || 'ADMIN'
    normalized.pendingApproverScope = 'company'
    normalized.nextApproverTag = rule?.secondApproverTag || ''
    normalized.nextApproverScope = rule?.secondApproverScope || 'dept'
  } else if (normalized.status === '待二级审批') {
    normalized.pendingApproverTag = rule?.secondApproverTag || ''
    normalized.pendingApproverScope = rule?.secondApproverScope || 'dept'
    normalized.nextApproverTag = ''
    normalized.nextApproverScope = rule?.secondApproverScope || 'dept'
  } else {
    normalized.pendingApproverTag = ''
    normalized.pendingApproverScope = 'company'
    normalized.nextApproverTag = rule?.secondApproverTag || ''
    normalized.nextApproverScope = rule?.secondApproverScope || 'dept'
  }
  return normalized
}

const leaveRequests = ref(mockLeaves.map(item => normalizeLeave(item)))
const dialogVisible = ref(false)
const approveDialogVisible = ref(false)
const formRef = ref(null)
const currentApprove = ref(null)

const searchForm = reactive({
  empName: '',
  leaveType: '',
  status: ''
})

const form = reactive({
  leaveId: null,
  empId: '',
  leaveType: '年假',
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
  days: [{ required: true, message: '请输入请假天数', trigger: 'blur' }],
  reason: [{ required: true, message: '请输入请假原因', trigger: 'blur' }]
}

const leaveTypes = ['年假', '病假', '事假', '婚假', '产假', '陪产假', '丧假']
const statusOptions = ['待审批', '待二级审批', '已通过', '已拒绝', '已取消']

const leaveScope = computed(() => userStore.getModuleScope('attendance:leave'))

const filterByScope = (list, scopeValue) => {
  if (scopeValue === 'company') return list
  if (scopeValue === 'dept') return list.filter(emp => emp.deptId === userStore.deptId)
  if (scopeValue === 'self') return list.filter(emp => emp.empId === userStore.empId)
  return list
}

const visibleEmployees = computed(() => filterByScope(employees, leaveScope.value))

const filteredLeaves = computed(() => {
  return leaveRequests.value.filter(leave => {
    const emp = employees.find(e => e.empId === leave.empId)
    if (leaveScope.value === 'dept' && emp?.deptId !== userStore.deptId) return false
    if (leaveScope.value === 'self' && leave.empId !== userStore.empId) return false
    const matchName = !searchForm.empName || leave.empName.includes(searchForm.empName)
    const matchType = !searchForm.leaveType || leave.leaveType === searchForm.leaveType
    const matchStatus = !searchForm.status || leave.status === searchForm.status
    return matchName && matchType && matchStatus
  })
})

const getStatusType = (status) => {
  const types = {
    '待审批': 'warning',
    '待二级审批': 'warning',
    '已通过': 'success',
    '已拒绝': 'danger',
    '已取消': 'info'
  }
  return types[status] || 'info'
}

const getStatusLabel = (row) => {
  if (row.status === '待审批' || row.status === '待二级审批') {
    const tagLabel = getTagLabel(row.pendingApproverTag)
    return tagLabel ? `待${tagLabel}审批` : row.status
  }
  return row.status
}

const canApprove = (row) => {
  if (!userStore.hasPermission('attendance:leave:approve')) return false
  if (!row.pendingApproverTag) return false
  if (!userStore.matchIdentityTag(row.pendingApproverTag, userStore.identityTag)) return false
  if (row.pendingApproverScope === 'dept') {
    const emp = employees.find(e => e.empId === row.empId)
    return emp?.deptId === userStore.deptId
  }
  if (row.pendingApproverScope === 'self') {
    return row.empId === userStore.empId
  }
  return true
}

const canCancel = (row) => {
  if (!userStore.hasPermission('attendance:leave:cancel')) return false
  return row.empId === userStore.empId && (row.status === '待审批' || row.status === '待二级审批')
}

const canAddLeave = computed(() => userStore.hasPermission('attendance:leave:add'))

const buildLeaveWithRule = (payload) => {
  const rule = getMatchedRule(payload.empId, payload.days)
  return {
    ...payload,
    status: '待审批',
    pendingApproverTag: rule?.firstApproverTag || 'ADMIN',
    pendingApproverScope: 'company',
    nextApproverTag: rule?.secondApproverTag || '',
    nextApproverScope: rule?.secondApproverScope || 'dept'
  }
}

const handleAdd = () => {
  Object.assign(form, { leaveId: null, empId: '', leaveType: '年假', startDate: '', endDate: '', days: 1, reason: '' })
  dialogVisible.value = true
}

const handleSubmit = async () => {
  if (!formRef.value) return
  await formRef.value.validate((valid) => {
    if (valid) {
      const emp = employees.find(e => e.empId === form.empId)
      const newId = Math.max(...leaveRequests.value.map(l => l.leaveId)) + 1
      const payload = buildLeaveWithRule({
        ...form,
        leaveId: newId,
        empName: emp?.empName,
        applyTime: new Date().toLocaleString()
      })
      leaveRequests.value.push(payload)
      ElMessage.success('申请提交成功')
      dialogVisible.value = false
    }
  })
}

const handleApprove = (row) => {
  currentApprove.value = row
  Object.assign(approveForm, { action: 'approve', remark: '' })
  approveDialogVisible.value = true
}

const submitApprove = () => {
  const row = currentApprove.value
  if (!row) return

  if (approveForm.action === 'approve') {
    if (row.status === '待审批') {
      if (row.nextApproverTag) {
        row.status = '待二级审批'
        row.pendingApproverTag = row.nextApproverTag
        row.pendingApproverScope = row.nextApproverScope || 'dept'
        row.nextApproverTag = ''
      } else {
        row.status = '已通过'
        row.pendingApproverTag = ''
        row.pendingApproverScope = 'company'
      }
    } else if (row.status === '待二级审批') {
      row.status = '已通过'
      row.pendingApproverTag = ''
      row.pendingApproverScope = 'company'
    }
    ElMessage.success('审批通过')
  } else {
    row.status = '已拒绝'
    row.pendingApproverTag = ''
    row.pendingApproverScope = 'company'
    ElMessage.success('已拒绝')
  }
  row.approveRemark = approveForm.remark
  approveDialogVisible.value = false
}

const handleCancel = (row) => {
  ElMessageBox.confirm('确定要取消该请假申请吗？', '提示', {
    confirmButtonText: '确定',
    cancelButtonText: '取消',
    type: 'warning'
  }).then(() => {
    row.status = '已取消'
    ElMessage.success('已取消')
  }).catch(() => {})
}

const handleReset = () => {
  Object.assign(searchForm, { empName: '', leaveType: '', status: '' })
}
</script>

<template>
  <div class="leave-page">
    <!-- 搜索区域 -->
    <el-card shadow="never" class="search-card">
      <el-form :model="searchForm" inline>
        <el-form-item label="员工姓名">
          <el-input v-model="searchForm.empName" placeholder="请输入" clearable style="width: 150px" />
        </el-form-item>
        <el-form-item label="请假类型">
          <el-select v-model="searchForm.leaveType" placeholder="请选择" clearable style="width: 120px">
            <el-option v-for="t in leaveTypes" :key="t" :label="t" :value="t" />
          </el-select>
        </el-form-item>
        <el-form-item label="审批状态">
          <el-select v-model="searchForm.status" placeholder="请选择" clearable style="width: 140px">
            <el-option v-for="s in statusOptions" :key="s" :label="s" :value="s" />
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
          <span>请假申请列表</span>
          <el-button v-if="canAddLeave" type="primary" @click="handleAdd"><el-icon><Plus /></el-icon>新增申请</el-button>
        </div>
      </template>
      <el-table :data="filteredLeaves" stripe border>
        <el-table-column prop="leaveId" label="ID" width="60" align="center" />
        <el-table-column prop="empName" label="申请人" width="90" />
        <el-table-column prop="leaveType" label="请假类型" width="90" />
        <el-table-column prop="startDate" label="开始日期" width="110" />
        <el-table-column prop="endDate" label="结束日期" width="110" />
        <el-table-column prop="days" label="天数" width="60" align="center" />
        <el-table-column prop="reason" label="请假原因" min-width="150" show-overflow-tooltip />
        <el-table-column prop="status" label="状态" width="120" align="center">
          <template #default="{ row }">
            <el-tag :type="getStatusType(row.status)">{{ getStatusLabel(row) }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="applyTime" label="申请时间" width="160" />
        <el-table-column label="操作" width="150" fixed="right">
          <template #default="{ row }">
            <el-button v-if="canApprove(row)" type="primary" link @click="handleApprove(row)">审批</el-button>
            <el-button v-if="canCancel(row)" type="danger" link @click="handleCancel(row)">取消</el-button>
          </template>
        </el-table-column>
      </el-table>
    </el-card>

    <!-- 新增申请对话框 -->
    <el-dialog v-model="dialogVisible" title="新增请假申请" width="500px" destroy-on-close>
      <el-form ref="formRef" :model="form" :rules="rules" label-width="80px">
        <el-form-item label="员工" prop="empId">
          <el-select v-model="form.empId" placeholder="请选择员工" style="width: 100%">
            <el-option v-for="emp in visibleEmployees" :key="emp.empId" :label="emp.empName" :value="emp.empId" />
          </el-select>
        </el-form-item>
        <el-form-item label="请假类型" prop="leaveType">
          <el-select v-model="form.leaveType" style="width: 100%">
            <el-option v-for="t in leaveTypes" :key="t" :label="t" :value="t" />
          </el-select>
        </el-form-item>
        <el-form-item label="开始日期" prop="startDate">
          <el-date-picker v-model="form.startDate" type="date" placeholder="选择日期" value-format="YYYY-MM-DD" style="width: 100%" />
        </el-form-item>
        <el-form-item label="结束日期" prop="endDate">
          <el-date-picker v-model="form.endDate" type="date" placeholder="选择日期" value-format="YYYY-MM-DD" style="width: 100%" />
        </el-form-item>
        <el-form-item label="请假天数" prop="days">
          <el-input-number v-model="form.days" :min="0.5" :step="0.5" style="width: 100%" />
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

    <!-- 审批对话框 -->
    <el-dialog v-model="approveDialogVisible" title="审批请假申请" width="400px">
      <el-form :model="approveForm" label-width="80px">
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
