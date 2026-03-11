<script setup>
import { computed, onMounted, reactive, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { use } from 'echarts/core'
import { BarChart, LineChart, PieChart } from 'echarts/charts'
import { GridComponent, LegendComponent, TitleComponent, TooltipComponent } from 'echarts/components'
import { CanvasRenderer } from 'echarts/renderers'
import VChart from 'vue-echarts'
import { ElMessage } from 'element-plus'
import { useUserStore } from '@/stores/user'
import { listApprovalRulesApi } from '@/api/approvalRule'
import { listAttendanceApi, createAttendanceApi, updateAttendanceApi } from '@/api/attendance'
import { listDepartmentsApi } from '@/api/department'
import { listEmployeesApi } from '@/api/employee'
import { createLeaveRequestApi, listLeaveRequestsApi, updateLeaveRequestApi } from '@/api/leave'
import { listPositionsApi } from '@/api/position'
import { getReportSummaryApi } from '@/api/report'
import { listSalaryRecordsApi } from '@/api/salaryRecord'
import {
  ATTENDANCE_STATUS,
  getAttendanceStatusType,
  resolveAttendanceStatus
} from '@/utils/smartRemark'

use([CanvasRenderer, PieChart, BarChart, LineChart, TitleComponent, TooltipComponent, LegendComponent, GridComponent])

const router = useRouter()
const userStore = useUserStore()

const loading = ref(false)
const attendanceSubmitting = ref(false)
const leaveSubmitting = ref(false)
const leaveDialogVisible = ref(false)
const leaveFormRef = ref(null)

const LEAVE_TYPES = ['年假', '病假', '事假', '婚假', '产假', '陪产假', '丧假']
const LEAVE_STATUS = {
  pending1: '待审批',
  pending2: '待二级审批',
  approved: '已通过',
  rejected: '已拒绝',
  canceled: '已取消'
}

const summary = ref({
  totalEmployees: 0,
  newEmployeesThisMonth: 0,
  attendanceRate: 0,
  leaveCount: 0,
  departmentStats: []
})
const employees = ref([])
const departments = ref([])
const positions = ref([])
const leaveRequests = ref([])
const attendanceRecords = ref([])
const salaryRecords = ref([])
const approvalRules = ref([])

const leaveForm = reactive({
  leaveType: LEAVE_TYPES[0],
  startDate: '',
  endDate: '',
  days: 1,
  reason: ''
})

const leaveRules = {
  leaveType: [{ required: true, message: '请选择请假类型', trigger: 'change' }],
  startDate: [{ required: true, message: '请选择开始日期', trigger: 'change' }],
  endDate: [{ required: true, message: '请选择结束日期', trigger: 'change' }],
  days: [{ required: true, message: '请输入请假天数', trigger: 'blur' }]
}

const leaveTypes = LEAVE_TYPES
const leaveScope = computed(() => userStore.getModuleScope('attendance:leave'))
const today = computed(() => new Date().toISOString().slice(0, 10))
const currentEmployee = computed(() => employees.value.find(item => item.empId === userStore.empId) || null)

const getDeptName = (deptId) => departments.value.find(item => item.deptId === deptId)?.deptName || '-'
const getPositionName = (positionId) => positions.value.find(item => item.positionId === positionId)?.positionName || '-'

const getEmployeeTag = (empId) => {
  const emp = employees.value.find(item => item.empId === empId)
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

const getApprovalChain = (leave) => {
  const rule = getMatchedRule(leave.empId, Number(leave.days || 0))
  return {
    firstApproverTag: rule?.firstApproverTag || leave.pendingApproverTag || 'ADMIN',
    firstApproverScope: 'company',
    secondApproverTag: rule?.secondApproverTag || leave.nextApproverTag || '',
    secondApproverScope: rule?.secondApproverScope || leave.nextApproverScope || 'dept'
  }
}

const getNormalizedApprovalPayload = (leave) => {
  const chain = getApprovalChain(leave)
  if (leave.status === LEAVE_STATUS.pending1) {
    return {
      pendingApproverTag: chain.firstApproverTag,
      pendingApproverScope: chain.firstApproverScope,
      nextApproverTag: chain.secondApproverTag || '',
      nextApproverScope: chain.secondApproverTag ? chain.secondApproverScope : ''
    }
  }
  if (leave.status === LEAVE_STATUS.pending2) {
    return {
      pendingApproverTag: chain.secondApproverTag || '',
      pendingApproverScope: chain.secondApproverTag ? chain.secondApproverScope : 'company',
      nextApproverTag: '',
      nextApproverScope: ''
    }
  }
  return null
}

const shouldNormalizeApproval = (leave) => {
  const normalized = getNormalizedApprovalPayload(leave)
  if (!normalized) return false
  return normalized.pendingApproverTag !== (leave.pendingApproverTag || '')
    || normalized.pendingApproverScope !== (leave.pendingApproverScope || '')
    || normalized.nextApproverTag !== (leave.nextApproverTag || '')
    || normalized.nextApproverScope !== (leave.nextApproverScope || '')
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

  const refreshed = await listLeaveRequestsApi({ page: 1, size: 500 })
  return refreshed.items || []
}

const getPendingApprover = (leave) => {
  const chain = getApprovalChain(leave)
  if (leave.status === LEAVE_STATUS.pending1) {
    return {
      tag: chain.firstApproverTag,
      scope: chain.firstApproverScope
    }
  }
  if (leave.status === LEAVE_STATUS.pending2) {
    return {
      tag: chain.secondApproverTag || leave.pendingApproverTag,
      scope: chain.secondApproverScope
    }
  }
  return { tag: '', scope: 'company' }
}

const monthKeys = computed(() => {
  const now = new Date()
  return Array.from({ length: 6 }).map((_, index) => {
    const date = new Date(now.getFullYear(), now.getMonth() - (5 - index), 1)
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
  })
})

const attendanceStatsByMonth = computed(() => {
  const initial = monthKeys.value.reduce((acc, key) => {
    acc[key] = { normal: 0, late: 0, early: 0, absent: 0, overtime: 0 }
    return acc
  }, {})

  attendanceRecords.value.forEach((item) => {
    const month = String(item.attendanceDate || '').slice(0, 7)
    if (!initial[month]) return
    const status = String(item.status || '')
    if (status.includes(ATTENDANCE_STATUS.normal)) initial[month].normal += 1
    if (status.includes(ATTENDANCE_STATUS.late)) initial[month].late += 1
    if (status.includes(ATTENDANCE_STATUS.early)) initial[month].early += 1
    if (status.includes(ATTENDANCE_STATUS.absent)) initial[month].absent += 1
    if (status.includes(ATTENDANCE_STATUS.overtime)) initial[month].overtime += 1
  })

  return initial
})

const salaryStatsByMonth = computed(() => {
  const initial = monthKeys.value.reduce((acc, key) => {
    acc[key] = { total: 0, count: 0 }
    return acc
  }, {})

  salaryRecords.value.forEach((item) => {
    const month = String(item.salaryMonth || '').slice(0, 7)
    if (!initial[month]) return
    initial[month].total += Number(item.netSalary || 0)
    initial[month].count += 1
  })

  return initial
})

const pendingLeaves = computed(() => {
  return leaveRequests.value
    .filter(item => item.status === LEAVE_STATUS.pending1 || item.status === LEAVE_STATUS.pending2)
    .filter((item) => {
      const emp = employees.value.find(empItem => empItem.empId === item.empId)
      if (leaveScope.value === 'dept' && emp?.deptId !== userStore.deptId) return false
      if (leaveScope.value === 'self' && item.empId !== userStore.empId) return false
      return true
    })
    .filter((item) => {
      if (!userStore.hasPermission('attendance:leave:approve')) return false
      const pending = getPendingApprover(item)
      if (!pending.tag) return false
      if (!userStore.matchIdentityTag(pending.tag, userStore.identityTag)) return false
      if (pending.scope === 'dept') {
        const emp = employees.value.find(empItem => empItem.empId === item.empId)
        return emp?.deptId === userStore.deptId
      }
      if (pending.scope === 'self') return item.empId === userStore.empId
      return true
    })
})

const personalAttendance = computed(() => {
  return [...attendanceRecords.value]
    .filter(item => item.empId === userStore.empId && item.attendanceDate === today.value)
    .sort((a, b) => (b.attendanceId || 0) - (a.attendanceId || 0))[0] || null
})

const personalLeaveList = computed(() => {
  return [...leaveRequests.value]
    .filter(item => item.empId === userStore.empId)
    .sort((a, b) => String(b.applyTime || '').localeCompare(String(a.applyTime || '')))
    .slice(0, 5)
})

const canClockIn = computed(() => !!userStore.empId && !personalAttendance.value?.clockIn)
const canClockOut = computed(() => !!userStore.empId && !!personalAttendance.value?.clockIn && !personalAttendance.value?.clockOut)

const attendanceTagType = computed(() => getAttendanceStatusType(personalAttendance.value?.status))

const metricCards = computed(() => [
  { label: '员工总数', value: summary.value.totalEmployees, icon: 'User', tone: 'blue' },
  { label: '本月新入职', value: summary.value.newEmployeesThisMonth, icon: 'UserFilled', tone: 'green' },
  { label: '出勤率', value: `${summary.value.attendanceRate}%`, icon: 'Clock', tone: 'amber' },
  { label: '待审批请假', value: pendingLeaves.value.length, icon: 'Document', tone: 'red' }
])

const deptChartOption = computed(() => ({
  title: { text: '部门人员分布', left: 'center', textStyle: { fontSize: 18, fontWeight: 700, color: '#1f2937' } },
  tooltip: { trigger: 'item', formatter: '{b}: {c}人 ({d}%)' },
  legend: { orient: 'vertical', left: 'left', top: 'middle' },
  series: [{
    type: 'pie',
    radius: ['38%', '68%'],
    itemStyle: { borderRadius: 14, borderColor: '#fff', borderWidth: 3 },
    label: { show: false },
    emphasis: { label: { show: true, fontSize: 14, fontWeight: 'bold' } },
    data: summary.value.departmentStats || []
  }]
}))

const attendanceChartOption = computed(() => ({
  title: { text: '月度考勤统计', left: 'center', textStyle: { fontSize: 18, fontWeight: 700, color: '#1f2937' } },
  tooltip: { trigger: 'axis' },
  legend: { data: ['正常', '迟到', '早退', '缺勤', '加班'], bottom: 0 },
  grid: { left: '3%', right: '4%', bottom: '15%', containLabel: true },
  xAxis: { type: 'category', data: monthKeys.value },
  yAxis: { type: 'value', name: '人次' },
  series: [
    { name: '正常', type: 'bar', stack: 'total', data: monthKeys.value.map(key => attendanceStatsByMonth.value[key].normal), itemStyle: { color: '#22c55e' } },
    { name: '迟到', type: 'bar', stack: 'total', data: monthKeys.value.map(key => attendanceStatsByMonth.value[key].late), itemStyle: { color: '#f59e0b' } },
    { name: '早退', type: 'bar', stack: 'total', data: monthKeys.value.map(key => attendanceStatsByMonth.value[key].early), itemStyle: { color: '#fb7185' } },
    { name: '缺勤', type: 'bar', stack: 'total', data: monthKeys.value.map(key => attendanceStatsByMonth.value[key].absent), itemStyle: { color: '#94a3b8' } },
    { name: '加班', type: 'bar', stack: 'total', data: monthKeys.value.map(key => attendanceStatsByMonth.value[key].overtime), itemStyle: { color: '#2563eb' } }
  ]
}))

const salaryChartOption = computed(() => ({
  title: { text: '月度薪资趋势', left: 'center', textStyle: { fontSize: 18, fontWeight: 700, color: '#1f2937' } },
  tooltip: { trigger: 'axis' },
  legend: { data: ['总薪资', '平均薪资'], bottom: 0 },
  grid: { left: '3%', right: '4%', bottom: '15%', containLabel: true },
  xAxis: { type: 'category', data: monthKeys.value },
  yAxis: [
    { type: 'value', name: '总薪资(元)', position: 'left' },
    { type: 'value', name: '平均薪资(元)', position: 'right' }
  ],
  series: [
    { name: '总薪资', type: 'bar', data: monthKeys.value.map(key => Number(salaryStatsByMonth.value[key].total.toFixed(2))), itemStyle: { color: '#2563eb' } },
    {
      name: '平均薪资',
      type: 'line',
      yAxisIndex: 1,
      smooth: true,
      data: monthKeys.value.map((key) => {
        const item = salaryStatsByMonth.value[key]
        return item.count ? Number((item.total / item.count).toFixed(2)) : 0
      }),
      itemStyle: { color: '#14b8a6' }
    }
  ]
}))

const calculateLeaveDays = (startDate, endDate) => {
  if (!startDate || !endDate) return 1
  const start = new Date(`${startDate}T00:00:00`)
  const end = new Date(`${endDate}T00:00:00`)
  const diff = end.getTime() - start.getTime()
  if (Number.isNaN(diff) || diff < 0) return 1
  return Math.floor(diff / 86400000) + 1
}

const resetLeaveForm = () => {
  Object.assign(leaveForm, {
    leaveType: LEAVE_TYPES[0],
    startDate: '',
    endDate: '',
    days: 1,
    reason: ''
  })
}

watch(
  () => [leaveForm.startDate, leaveForm.endDate],
  ([startDate, endDate]) => {
    leaveForm.days = calculateLeaveDays(startDate, endDate)
  }
)

const getNowTime = () => {
  const now = new Date()
  return `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`
}

const loadPageData = async () => {
  loading.value = true
  try {
    const [summaryData, employeePage, departmentPage, positionPage, leavePage, attendancePage, salaryPage, rulePage] = await Promise.all([
      getReportSummaryApi(),
      listEmployeesApi({ page: 1, size: 200 }),
      listDepartmentsApi({ page: 1, size: 200 }),
      listPositionsApi({ page: 1, size: 200 }),
      listLeaveRequestsApi({ page: 1, size: 500 }),
      listAttendanceApi({ page: 1, size: 500 }),
      listSalaryRecordsApi({ page: 1, size: 500 }),
      listApprovalRulesApi({ page: 1, size: 200, typeCode: 'leave' })
    ])

    summary.value = summaryData
    employees.value = employeePage.items || []
    departments.value = departmentPage.items || []
    positions.value = positionPage.items || []
    attendanceRecords.value = attendancePage.items || []
    salaryRecords.value = salaryPage.items || []
    approvalRules.value = rulePage.items || []
    leaveRequests.value = await normalizeLeaveRequests(leavePage.items || [])
  } catch (error) {
    ElMessage.error(error.message || '首页数据加载失败')
  } finally {
    loading.value = false
  }
}

const handleClockIn = async () => {
  if (!userStore.empId) {
    ElMessage.warning('当前用户未绑定员工信息')
    return
  }
  if (!canClockIn.value) {
    ElMessage.warning('今天已经签到')
    return
  }

  attendanceSubmitting.value = true
  try {
    const clockIn = getNowTime()
    const existed = personalAttendance.value
    const status = resolveAttendanceStatus({
      clockIn,
      clockOut: existed?.clockOut || '',
      currentStatus: existed?.status || ATTENDANCE_STATUS.normal
    })
    const payload = {
      empId: userStore.empId,
      attendanceDate: today.value,
      clockIn,
      clockOut: existed?.clockOut || null,
      status,
      remark: existed?.remark || ''
    }

    if (existed?.attendanceId) {
      await updateAttendanceApi(existed.attendanceId, payload)
    } else {
      await createAttendanceApi(payload)
    }
    ElMessage.success('签到成功')
    await loadPageData()
  } catch (error) {
    ElMessage.error(error.message || '签到失败')
  } finally {
    attendanceSubmitting.value = false
  }
}

const handleClockOut = async () => {
  if (!userStore.empId) {
    ElMessage.warning('当前用户未绑定员工信息')
    return
  }
  const existed = personalAttendance.value
  if (!existed?.attendanceId || !existed.clockIn) {
    ElMessage.warning('请先签到后再签退')
    return
  }
  if (!canClockOut.value) {
    ElMessage.warning('今天已经签退')
    return
  }

  attendanceSubmitting.value = true
  try {
    const clockOut = getNowTime()
    const status = resolveAttendanceStatus({
      clockIn: existed.clockIn || '',
      clockOut,
      currentStatus: existed.status || ATTENDANCE_STATUS.normal
    })
    await updateAttendanceApi(existed.attendanceId, {
      empId: existed.empId,
      attendanceDate: existed.attendanceDate,
      clockIn: existed.clockIn || null,
      clockOut,
      status,
      remark: existed.remark || ''
    })
    ElMessage.success('签退成功')
    await loadPageData()
  } catch (error) {
    ElMessage.error(error.message || '签退失败')
  } finally {
    attendanceSubmitting.value = false
  }
}

const openLeaveDialog = () => {
  if (!userStore.empId) {
    ElMessage.warning('当前用户未绑定员工信息')
    return
  }
  resetLeaveForm()
  leaveDialogVisible.value = true
}

const buildLeavePayload = () => {
  const rule = getMatchedRule(userStore.empId, leaveForm.days)
  return {
    empId: userStore.empId,
    leaveType: leaveForm.leaveType,
    startDate: leaveForm.startDate,
    endDate: leaveForm.endDate,
    days: String(leaveForm.days),
    reason: leaveForm.reason,
    status: LEAVE_STATUS.pending1,
    pendingApproverTag: rule?.firstApproverTag || 'ADMIN',
    pendingApproverScope: 'company',
    nextApproverTag: rule?.secondApproverTag || '',
    nextApproverScope: rule?.secondApproverScope || 'dept',
    applyTime: new Date().toISOString().slice(0, 19)
  }
}

const handleSubmitLeave = async () => {
  if (!leaveFormRef.value) return
  const valid = await leaveFormRef.value.validate().catch(() => false)
  if (!valid) return

  leaveSubmitting.value = true
  try {
    await createLeaveRequestApi(buildLeavePayload())
    leaveDialogVisible.value = false
    ElMessage.success('请假申请已提交')
    await loadPageData()
  } catch (error) {
    ElMessage.error(error.message || '请假申请提交失败')
  } finally {
    leaveSubmitting.value = false
  }
}

onMounted(loadPageData)
</script>

<template>
  <div class="dashboard" v-loading="loading">
    <section class="hero-panel">
      <div class="hero-copy">
        <div class="eyebrow">智能人事总览</div>
        <h1>欢迎回来，{{ userStore.user?.empName }}</h1>
        <p class="hero-desc">
          你当前的角色是 {{ userStore.user?.roleName }}，可在首页直接完成个人签到、请假申请，并快速查看待处理事务与核心经营指标。
        </p>
        <div class="hero-meta">
          <span>所属部门：{{ userStore.user?.deptName || '-' }}</span>
          <span>当前岗位：{{ userStore.user?.positionName || '-' }}</span>
          <span>今日日期：{{ today }}</span>
        </div>
      </div>

      <div class="hero-actions">
        <el-button class="hero-btn" @click="router.push('/attendance/record')">进入考勤管理</el-button>
        <el-button class="hero-btn" @click="router.push('/attendance/leave')">进入请假管理</el-button>
      </div>
    </section>

    <section class="metrics-grid">
      <el-card v-for="item in metricCards" :key="item.label" shadow="hover" class="metric-card">
        <div class="metric-shell" :class="item.tone">
          <div class="metric-icon">
            <el-icon size="28"><component :is="item.icon" /></el-icon>
          </div>
          <div class="metric-body">
            <div class="metric-label">{{ item.label }}</div>
            <div class="metric-value">{{ item.value }}</div>
          </div>
        </div>
      </el-card>
    </section>

    <el-row :gutter="20" class="action-row">
      <el-col :xs="24" :lg="12">
        <el-card shadow="hover" class="feature-card">
          <template #header>
            <div class="card-header">
              <div>
                <div class="card-title">个人考勤</div>
                <div class="card-subtitle">个人签到签退与今日状态总览</div>
              </div>
              <span class="pill">{{ today }}</span>
            </div>
          </template>

          <div class="attendance-grid">
            <div class="info-tile">
              <span class="tile-label">员工</span>
              <strong>{{ currentEmployee?.empName || userStore.user?.empName || '-' }}</strong>
            </div>
            <div class="info-tile">
              <span class="tile-label">签到时间</span>
              <strong>{{ personalAttendance?.clockIn || '未签到' }}</strong>
            </div>
            <div class="info-tile">
              <span class="tile-label">签退时间</span>
              <strong>{{ personalAttendance?.clockOut || '未签退' }}</strong>
            </div>
            <div class="info-tile">
              <span class="tile-label">当前状态</span>
              <el-tag round :type="attendanceTagType">
                {{ personalAttendance?.status || '未生成记录' }}
              </el-tag>
            </div>
          </div>

          <div class="action-buttons">
            <el-button type="primary" :loading="attendanceSubmitting" :disabled="!canClockIn" @click="handleClockIn">上班签到</el-button>
            <el-button type="success" :loading="attendanceSubmitting" :disabled="!canClockOut" @click="handleClockOut">下班签退</el-button>
            <el-button @click="router.push('/attendance/record')">查看考勤记录</el-button>
          </div>

          <div class="tips-text">状态会同时判断上班和下班时间。两项都正常显示“正常”；若上班、下班分别异常，则会组合显示，例如“迟到/早退”或“迟到/加班”。</div>
        </el-card>
      </el-col>

      <el-col :xs="24" :lg="12">
        <el-card shadow="hover" class="feature-card">
          <template #header>
            <div class="card-header">
              <div>
                <div class="card-title">个人请假申请</div>
                <div class="card-subtitle">最近申请记录与审批状态</div>
              </div>
              <el-button type="primary" link @click="router.push('/attendance/leave')">查看全部</el-button>
            </div>
          </template>

          <div class="leave-list">
            <div v-if="personalLeaveList.length" class="leave-list-inner">
              <article v-for="item in personalLeaveList" :key="item.leaveId" class="leave-item">
                <div>
                  <div class="leave-type">{{ item.leaveType }}</div>
                  <div class="leave-time">{{ item.startDate }} 至 {{ item.endDate }}</div>
                </div>
                <div class="leave-side">
                  <div class="leave-days">{{ item.days }} 天</div>
                  <el-tag round :type="item.status === LEAVE_STATUS.approved ? 'success' : item.status === LEAVE_STATUS.rejected ? 'danger' : 'warning'">
                    {{ item.status }}
                  </el-tag>
                </div>
              </article>
            </div>
            <el-empty v-else description="暂无个人请假记录" :image-size="90" />
          </div>

          <div class="action-buttons">
            <el-button type="primary" @click="openLeaveDialog">发起请假申请</el-button>
          </div>

          <div class="tips-text">请假申请与请假管理菜单共用同一套字段和审批规则，提交后直接写入数据库。</div>
        </el-card>
      </el-col>
    </el-row>

    <el-row :gutter="20" class="chart-row">
      <el-col :xs="24" :xl="12">
        <el-card shadow="hover" class="chart-card">
          <v-chart class="chart" :option="deptChartOption" autoresize />
        </el-card>
      </el-col>
      <el-col :xs="24" :xl="12">
        <el-card shadow="hover" class="chart-card">
          <v-chart class="chart" :option="attendanceChartOption" autoresize />
        </el-card>
      </el-col>
    </el-row>

    <el-row :gutter="20" class="chart-row">
      <el-col :xs="24" :xl="16">
        <el-card shadow="hover" class="chart-card">
          <v-chart class="chart" :option="salaryChartOption" autoresize />
        </el-card>
      </el-col>
      <el-col :xs="24" :xl="8">
        <el-card shadow="hover" class="pending-card">
          <template #header>
            <div class="card-header">
              <div>
                <div class="card-title">待处理请假申请</div>
                <div class="card-subtitle">当前你有审批权限的待办事项</div>
              </div>
              <el-button type="primary" link @click="router.push('/attendance/leave')">查看全部</el-button>
            </div>
          </template>
          <el-table :data="pendingLeaves" size="small" max-height="300">
            <el-table-column label="申请人" width="96">
              <template #default="{ row }">{{ employees.find(item => item.empId === row.empId)?.empName || '-' }}</template>
            </el-table-column>
            <el-table-column prop="leaveType" label="类型" width="78" />
            <el-table-column prop="days" label="天数" width="64" />
            <el-table-column label="状态">
              <template #default="{ row }">
                <el-tag round :type="row.status === LEAVE_STATUS.pending1 || row.status === LEAVE_STATUS.pending2 ? 'warning' : 'primary'" size="small">
                  {{ row.status }}
                </el-tag>
              </template>
            </el-table-column>
          </el-table>
        </el-card>
      </el-col>
    </el-row>

    <el-dialog v-model="leaveDialogVisible" title="发起请假申请" width="520px" destroy-on-close>
      <el-form ref="leaveFormRef" :model="leaveForm" :rules="leaveRules" label-width="90px">
        <el-form-item label="申请人">
          <el-input :model-value="userStore.user?.empName || '-'" disabled />
        </el-form-item>
        <el-form-item label="请假类型" prop="leaveType">
          <el-select v-model="leaveForm.leaveType" style="width: 100%">
            <el-option v-for="item in leaveTypes" :key="item" :label="item" :value="item" />
          </el-select>
        </el-form-item>
        <el-form-item label="开始日期" prop="startDate">
          <el-date-picker v-model="leaveForm.startDate" type="date" value-format="YYYY-MM-DD" placeholder="请选择开始日期" style="width: 100%" />
        </el-form-item>
        <el-form-item label="结束日期" prop="endDate">
          <el-date-picker v-model="leaveForm.endDate" type="date" value-format="YYYY-MM-DD" placeholder="请选择结束日期" style="width: 100%" />
        </el-form-item>
        <el-form-item label="请假天数" prop="days">
          <el-input :model-value="`${leaveForm.days} 天`" readonly />
        </el-form-item>
        <el-form-item label="请假原因" prop="reason">
          <el-input v-model="leaveForm.reason" type="textarea" :rows="3" placeholder="请输入请假原因" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="leaveDialogVisible = false">取消</el-button>
        <el-button type="primary" :loading="leaveSubmitting" @click="handleSubmitLeave">提交申请</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<style scoped>
.dashboard {
  padding: 0;
}

.hero-panel {
  display: flex;
  justify-content: space-between;
  gap: 28px;
  padding: 32px;
  margin-bottom: 22px;
  border-radius: 28px;
  color: #fff;
  position: relative;
  overflow: hidden;
  background:
    radial-gradient(circle at 16% 20%, rgba(255, 255, 255, 0.26), transparent 18%),
    radial-gradient(circle at 88% 18%, rgba(45, 212, 191, 0.28), transparent 22%),
    linear-gradient(135deg, #0f3f85 0%, #145da0 38%, #127a72 100%);
  box-shadow: 0 24px 60px rgba(15, 63, 133, 0.28);
}

.hero-panel::after {
  content: '';
  position: absolute;
  inset: auto -40px -90px auto;
  width: 220px;
  height: 220px;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.08);
  filter: blur(4px);
}

.hero-copy {
  position: relative;
  z-index: 1;
  max-width: 860px;
}

.eyebrow {
  display: inline-flex;
  align-items: center;
  padding: 6px 12px;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.14);
  font-size: 12px;
  letter-spacing: 1px;
  margin-bottom: 14px;
}

.hero-copy h1 {
  margin: 0;
  font-size: 42px;
  line-height: 1.1;
  font-weight: 800;
}

.hero-desc {
  margin: 16px 0 0;
  max-width: 700px;
  line-height: 1.75;
  font-size: 16px;
  color: rgba(255, 255, 255, 0.88);
}

.hero-meta {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  margin-top: 22px;
}

.hero-meta span {
  padding: 10px 14px;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.14);
  font-size: 14px;
  font-weight: 600;
}

.hero-actions {
  position: relative;
  z-index: 1;
  display: flex;
  gap: 14px;
  align-items: flex-start;
}

.hero-btn {
  min-width: 138px;
  height: 40px;
  border-radius: 14px;
  border-color: rgba(255, 255, 255, 0.36);
  background: rgba(255, 255, 255, 0.08);
  color: #fff;
}

.metrics-grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 20px;
  margin-bottom: 22px;
}

.metric-card {
  border-radius: 24px;
}

.metric-shell {
  display: flex;
  align-items: center;
  gap: 18px;
}

.metric-icon {
  width: 76px;
  height: 76px;
  border-radius: 22px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  color: #fff;
  box-shadow: 0 18px 32px rgba(37, 99, 235, 0.18);
}

.metric-shell.blue .metric-icon { background: linear-gradient(135deg, #3b82f6, #60a5fa); }
.metric-shell.green .metric-icon { background: linear-gradient(135deg, #65a30d, #84cc16); }
.metric-shell.amber .metric-icon { background: linear-gradient(135deg, #d97706, #f59e0b); }
.metric-shell.red .metric-icon { background: linear-gradient(135deg, #ef4444, #fb7185); }

.metric-label {
  color: #64748b;
  font-size: 15px;
}

.metric-value {
  margin-top: 8px;
  font-size: 44px;
  line-height: 1;
  font-weight: 800;
  color: #0f172a;
}

.action-row,
.chart-row {
  margin-bottom: 22px;
}

.feature-card :deep(.el-card__body),
.pending-card :deep(.el-card__body) {
  padding: 24px;
}

.chart-card :deep(.el-card__body) {
  padding: 18px 12px 10px;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 14px;
}

.card-title {
  font-size: 24px;
  line-height: 1.1;
  font-weight: 800;
  color: #0f172a;
}

.card-subtitle {
  margin-top: 8px;
  font-size: 13px;
  color: #64748b;
}

.pill {
  display: inline-flex;
  align-items: center;
  padding: 8px 12px;
  border-radius: 999px;
  background: #eef6ff;
  color: #2563eb;
  font-size: 13px;
  font-weight: 600;
}

.attendance-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 14px;
  margin-bottom: 20px;
}

.info-tile {
  padding: 18px;
  border-radius: 18px;
  background: linear-gradient(180deg, #f8fbff 0%, #f1f5f9 100%);
  box-shadow: inset 0 0 0 1px rgba(148, 163, 184, 0.14);
}

.tile-label {
  display: block;
  margin-bottom: 8px;
  color: #64748b;
  font-size: 13px;
}

.info-tile strong {
  color: #0f172a;
  font-size: 17px;
}

.action-buttons {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
}

.action-buttons :deep(.el-button) {
  min-width: 120px;
  border-radius: 14px;
}

.tips-text {
  margin-top: 16px;
  padding: 14px 16px;
  border-radius: 16px;
  background: #f8fafc;
  color: #64748b;
  line-height: 1.7;
  font-size: 13px;
}

.leave-list {
  min-height: 224px;
}

.leave-list-inner {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.leave-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 14px;
  padding: 16px 18px;
  border-radius: 18px;
  background: linear-gradient(180deg, #ffffff 0%, #f8fafc 100%);
  box-shadow: inset 0 0 0 1px rgba(148, 163, 184, 0.14);
}

.leave-type {
  color: #0f172a;
  font-size: 16px;
  font-weight: 700;
}

.leave-time {
  margin-top: 6px;
  color: #64748b;
  font-size: 13px;
}

.leave-side {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 8px;
}

.leave-days {
  color: #475569;
  font-size: 13px;
}

.chart {
  height: 340px;
}

@media (max-width: 1400px) {
  .metrics-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

@media (max-width: 900px) {
  .hero-panel {
    flex-direction: column;
    padding: 24px;
  }

  .hero-copy h1 {
    font-size: 34px;
  }

  .attendance-grid {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 640px) {
  .metrics-grid {
    grid-template-columns: 1fr;
  }

  .action-buttons {
    flex-direction: column;
  }

  .action-buttons :deep(.el-button) {
    margin-left: 0;
    width: 100%;
  }
}
</style>
