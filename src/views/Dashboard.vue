<script setup>
import { computed, onMounted, reactive, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { use } from 'echarts/core'
import { BarChart, PieChart } from 'echarts/charts'
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
import { ATTENDANCE_STATUS, getAttendanceStatusType, resolveAttendanceStatus } from '@/utils/smartRemark'

use([CanvasRenderer, PieChart, BarChart, TitleComponent, TooltipComponent, LegendComponent, GridComponent])

const router = useRouter()
const userStore = useUserStore()

const LEAVE_TYPES = ['年假', '病假', '事假', '婚假', '产假', '陪产假', '丧假']
const LEAVE_STATUS = {
  pending1: '待审批',
  pending2: '待二级审批',
  approved: '已通过',
  rejected: '已拒绝',
  canceled: '已取消'
}

const loading = ref(false)
const attendanceSubmitting = ref(false)
const leaveSubmitting = ref(false)
const leaveDialogVisible = ref(false)
const leaveFormRef = ref(null)

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
  endDate: [{ required: true, message: '请选择结束日期', trigger: 'change' }]
}

const today = computed(() => new Date().toISOString().slice(0, 10))
const currentEmployee = computed(() => employees.value.find(item => item.empId === userStore.empId) || null)
const leaveScope = computed(() => userStore.getModuleScope('attendance:leave'))

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

const getMatchedRule = (empId, days) => {
  const applicantTag = getEmployeeTag(empId)
  return [...approvalRules.value]
    .map(rule => {
      let score = 0
      if (matchDays(rule, days)) {
        if (rule.applicantTag === applicantTag) score = 2
        else if (userStore.matchIdentityTag(rule.applicantTag, applicantTag)) score = 1
      }
      return { rule, score }
    })
    .filter(item => item.score > 0)
    .sort((a, b) => (b.score - a.score) || ((a.rule.sortOrder ?? 0) - (b.rule.sortOrder ?? 0)))
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
      status: LEAVE_STATUS.pending1,
      pendingApproverTag: chain.firstApproverTag,
      pendingApproverScope: chain.firstApproverScope,
      nextApproverTag: chain.secondApproverTag || '',
      nextApproverScope: chain.secondApproverTag ? chain.secondApproverScope : '',
      approveTime: leave.approveTime || ''
    }
  }
  if (leave.status === LEAVE_STATUS.pending2) {
    if (!chain.secondApproverTag) {
      return {
        status: LEAVE_STATUS.approved,
        pendingApproverTag: '',
        pendingApproverScope: 'company',
        nextApproverTag: '',
        nextApproverScope: '',
        approveTime: leave.approveTime || new Date().toISOString().slice(0, 19)
      }
    }
    return {
      status: LEAVE_STATUS.pending2,
      pendingApproverTag: chain.secondApproverTag,
      pendingApproverScope: chain.secondApproverScope || 'company',
      nextApproverTag: '',
      nextApproverScope: '',
      approveTime: leave.approveTime || ''
    }
  }
  return null
}

const shouldNormalizeApproval = (leave) => {
  const normalized = getNormalizedApprovalPayload(leave)
  if (!normalized) return false
  return normalized.status !== leave.status
    || normalized.pendingApproverTag !== (leave.pendingApproverTag || '')
    || normalized.pendingApproverScope !== (leave.pendingApproverScope || '')
    || normalized.nextApproverTag !== (leave.nextApproverTag || '')
    || normalized.nextApproverScope !== (leave.nextApproverScope || '')
    || (normalized.approveTime || '') !== (leave.approveTime || '')
}

const normalizeLeaveRequests = async (items) => {
  const pendingItems = (items || []).filter(item => item.status === LEAVE_STATUS.pending1 || item.status === LEAVE_STATUS.pending2)
  const corrections = pendingItems.filter(shouldNormalizeApproval)
  if (!corrections.length) return items || []
  await Promise.all(corrections.map((item) => {
    const normalized = getNormalizedApprovalPayload(item)
    return updateLeaveRequestApi(item.leaveId, { ...item, ...normalized, days: String(item.days) })
  }))
  const refreshed = await listLeaveRequestsApi({ page: 1, size: 500 })
  return refreshed.items || []
}

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

const pendingLeaves = computed(() => {
  return leaveRequests.value
    .filter(item => item.status === LEAVE_STATUS.pending1 || item.status === LEAVE_STATUS.pending2)
    .filter((item) => {
      const emp = employees.value.find(empItem => empItem.empId === item.empId)
      if (leaveScope.value === 'dept' && emp?.deptId !== userStore.deptId) return false
      if (leaveScope.value === 'self' && item.empId !== userStore.empId) return false
      const pending = item.status === LEAVE_STATUS.pending1
        ? { tag: getApprovalChain(item).firstApproverTag, scope: 'company' }
        : { tag: getApprovalChain(item).secondApproverTag || item.pendingApproverTag, scope: getApprovalChain(item).secondApproverScope || 'company' }
      if (!pending.tag) return false
      if (!userStore.matchIdentityTag(pending.tag, userStore.identityTag)) return false
      if (pending.scope === 'dept') return emp?.deptId === userStore.deptId
      return true
    })
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
  title: { text: '部门人员分布', left: 'center' },
  tooltip: { trigger: 'item', formatter: '{b}: {c}人 ({d}%)' },
  legend: { orient: 'vertical', left: 'left', top: 'middle' },
  series: [{ type: 'pie', radius: ['38%', '68%'], data: summary.value.departmentStats || [] }]
}))

const attendanceChartOption = computed(() => {
  const keys = ['正常', '迟到', '早退', '缺勤', '加班']
  const monthKeys = Array.from({ length: 6 }).map((_, index) => {
    const date = new Date()
    date.setMonth(date.getMonth() - (5 - index))
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
  })
  const source = monthKeys.map((month) => {
    const bucket = { month, 正常: 0, 迟到: 0, 早退: 0, 缺勤: 0, 加班: 0 }
    attendanceRecords.value.forEach((item) => {
      if (String(item.attendanceDate || '').slice(0, 7) !== month) return
      const status = String(item.status || '')
      if (status.includes(ATTENDANCE_STATUS.normal)) bucket.正常 += 1
      if (status.includes(ATTENDANCE_STATUS.late)) bucket.迟到 += 1
      if (status.includes(ATTENDANCE_STATUS.early)) bucket.早退 += 1
      if (status.includes(ATTENDANCE_STATUS.absent)) bucket.缺勤 += 1
      if (status.includes(ATTENDANCE_STATUS.overtime)) bucket.加班 += 1
    })
    return bucket
  })
  return {
    title: { text: '月度考勤统计', left: 'center' },
    tooltip: { trigger: 'axis' },
    legend: { data: keys, bottom: 0 },
    grid: { left: '3%', right: '4%', bottom: '15%', containLabel: true },
    xAxis: { type: 'category', data: source.map(item => item.month) },
    yAxis: { type: 'value', name: '人次' },
    series: keys.map((key) => ({ name: key, type: 'bar', stack: 'total', data: source.map(item => item[key]) }))
  }
})

const calculateLeaveDays = (startDate, endDate) => {
  if (!startDate || !endDate) return 1
  const start = new Date(`${startDate}T00:00:00`)
  const end = new Date(`${endDate}T00:00:00`)
  const diff = end.getTime() - start.getTime()
  if (Number.isNaN(diff) || diff < 0) return 1
  return Math.floor(diff / 86400000) + 1
}

watch(() => [leaveForm.startDate, leaveForm.endDate], ([startDate, endDate]) => {
  leaveForm.days = calculateLeaveDays(startDate, endDate)
})

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
  if (!userStore.empId || !canClockIn.value) return
  attendanceSubmitting.value = true
  try {
    const existed = personalAttendance.value
    const clockIn = getNowTime()
    const payload = {
      empId: userStore.empId,
      attendanceDate: today.value,
      clockIn,
      clockOut: existed?.clockOut || null,
      status: resolveAttendanceStatus({
        clockIn,
        clockOut: existed?.clockOut || '',
        currentStatus: existed?.status || ATTENDANCE_STATUS.normal
      }),
      remark: existed?.remark || ''
    }
    if (existed?.attendanceId) await updateAttendanceApi(existed.attendanceId, payload)
    else await createAttendanceApi(payload)
    ElMessage.success('签到成功')
    await loadPageData()
  } catch (error) {
    ElMessage.error(error.message || '签到失败')
  } finally {
    attendanceSubmitting.value = false
  }
}

const handleClockOut = async () => {
  const existed = personalAttendance.value
  if (!userStore.empId || !existed?.attendanceId || !existed.clockIn || !canClockOut.value) return
  attendanceSubmitting.value = true
  try {
    const clockOut = getNowTime()
    await updateAttendanceApi(existed.attendanceId, {
      empId: existed.empId,
      attendanceDate: existed.attendanceDate,
      clockIn: existed.clockIn || null,
      clockOut,
      status: resolveAttendanceStatus({
        clockIn: existed.clockIn || '',
        clockOut,
        currentStatus: existed.status || ATTENDANCE_STATUS.normal
      }),
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
  leaveForm.leaveType = LEAVE_TYPES[0]
  leaveForm.startDate = ''
  leaveForm.endDate = ''
  leaveForm.days = 1
  leaveForm.reason = ''
  leaveDialogVisible.value = true
}

const handleSubmitLeave = async () => {
  if (!leaveFormRef.value) return
  const valid = await leaveFormRef.value.validate().catch(() => false)
  if (!valid) return
  leaveSubmitting.value = true
  try {
    const rule = getMatchedRule(userStore.empId, leaveForm.days)
    await createLeaveRequestApi({
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
    })
    leaveDialogVisible.value = false
    ElMessage.success('请假申请提交成功')
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
      <div>
        <div class="eyebrow">企业人事管理系统</div>
        <h1>欢迎回来，{{ userStore.user?.empName }}</h1>
        <p class="hero-desc">当前角色为 {{ userStore.user?.roleName }}，你可以在首页快速完成个人考勤与请假申请。</p>
        <div class="hero-meta">
          <span>所属部门：{{ userStore.user?.deptName || '-' }}</span>
          <span>当前岗位：{{ userStore.user?.positionName || '-' }}</span>
          <span>日期：{{ today }}</span>
        </div>
      </div>
      <div class="hero-actions">
        <el-button class="hero-btn" @click="router.push('/attendance/record')">进入考勤管理</el-button>
        <el-button class="hero-btn" @click="router.push('/attendance/leave')">进入请假管理</el-button>
      </div>
    </section>

    <section class="metrics-grid">
      <el-card v-for="item in metricCards" :key="item.label" shadow="hover">
        <div class="metric">
          <div class="metric-label">{{ item.label }}</div>
          <div class="metric-value">{{ item.value }}</div>
        </div>
      </el-card>
    </section>

    <el-row :gutter="20" class="content-row">
      <el-col :xs="24" :lg="12">
        <el-card shadow="hover">
          <template #header><div class="card-header"><span>个人考勤</span><span class="pill">{{ today }}</span></div></template>
          <div class="grid-two">
            <div class="tile"><span>员工</span><strong>{{ currentEmployee?.empName || userStore.user?.empName || '-' }}</strong></div>
            <div class="tile"><span>签到时间</span><strong>{{ personalAttendance?.clockIn || '未签到' }}</strong></div>
            <div class="tile"><span>签退时间</span><strong>{{ personalAttendance?.clockOut || '未签退' }}</strong></div>
            <div class="tile"><span>当前状态</span><el-tag :type="attendanceTagType">{{ personalAttendance?.status || '未生成记录' }}</el-tag></div>
          </div>
          <div class="actions">
            <el-button type="primary" :loading="attendanceSubmitting" :disabled="!canClockIn" @click="handleClockIn">上班签到</el-button>
            <el-button type="success" :loading="attendanceSubmitting" :disabled="!canClockOut" @click="handleClockOut">下班签退</el-button>
            <el-button @click="router.push('/attendance/record')">查看考勤记录</el-button>
          </div>
        </el-card>
      </el-col>
      <el-col :xs="24" :lg="12">
        <el-card shadow="hover">
          <template #header><div class="card-header"><span>个人请假申请</span><el-button type="primary" link @click="router.push('/attendance/leave')">查看全部</el-button></div></template>
          <div v-if="personalLeaveList.length" class="leave-list">
            <div v-for="item in personalLeaveList" :key="item.leaveId" class="leave-item">
              <div>
                <div class="leave-type">{{ item.leaveType }}</div>
                <div class="leave-time">{{ item.startDate }} 至 {{ item.endDate }}</div>
              </div>
              <el-tag :type="item.status === LEAVE_STATUS.approved ? 'success' : item.status === LEAVE_STATUS.rejected ? 'danger' : 'warning'">{{ item.status }}</el-tag>
            </div>
          </div>
          <el-empty v-else description="暂无个人请假记录" :image-size="80" />
          <div class="actions">
            <el-button type="primary" @click="openLeaveDialog">发起请假申请</el-button>
          </div>
        </el-card>
      </el-col>
    </el-row>

    <el-row :gutter="20" class="content-row">
      <el-col :xs="24" :xl="12">
        <el-card shadow="hover"><v-chart class="chart" :option="deptChartOption" autoresize /></el-card>
      </el-col>
      <el-col :xs="24" :xl="12">
        <el-card shadow="hover"><v-chart class="chart" :option="attendanceChartOption" autoresize /></el-card>
      </el-col>
    </el-row>

    <el-row :gutter="20" class="content-row">
      <el-col :xs="24" :xl="12">
        <el-card shadow="hover">
          <template #header><div class="card-header"><span>待处理请假</span><el-button type="primary" link @click="router.push('/attendance/leave')">查看全部</el-button></div></template>
          <el-table :data="pendingLeaves" size="small" max-height="300">
            <el-table-column label="申请人">
              <template #default="{ row }">{{ employees.find(item => item.empId === row.empId)?.empName || '-' }}</template>
            </el-table-column>
            <el-table-column prop="leaveType" label="类型" width="80" />
            <el-table-column prop="days" label="天数" width="70" />
            <el-table-column prop="status" label="状态" width="120" />
          </el-table>
        </el-card>
      </el-col>
      <el-col :xs="24" :xl="12">
        <el-card shadow="hover">
          <template #header><div class="card-header"><span>近期薪资记录</span></div></template>
          <el-table :data="salaryRecords.slice(0, 6)" size="small" max-height="300">
            <el-table-column prop="salaryMonth" label="月份" width="110" />
            <el-table-column prop="netSalary" label="实发工资" />
            <el-table-column prop="status" label="状态" width="110" />
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
        <el-form-item label="请假天数">
          <el-input :model-value="`${leaveForm.days} 天`" readonly />
        </el-form-item>
        <el-form-item label="请假原因">
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
.hero-panel { display: flex; justify-content: space-between; gap: 24px; padding: 32px; margin-bottom: 22px; border-radius: 28px; color: #fff; background: linear-gradient(135deg, #0f3f85 0%, #145da0 38%, #127a72 100%); }
.eyebrow { display: inline-flex; padding: 6px 12px; border-radius: 999px; background: rgba(255,255,255,.14); font-size: 12px; margin-bottom: 14px; }
.hero-desc { margin: 16px 0 0; line-height: 1.75; color: rgba(255,255,255,.88); }
.hero-meta { display: flex; flex-wrap: wrap; gap: 12px; margin-top: 22px; }
.hero-meta span, .pill { padding: 8px 12px; border-radius: 999px; background: rgba(255,255,255,.14); }
.hero-actions { display: flex; gap: 14px; }
.hero-btn { min-width: 138px; color: #fff; border-color: rgba(255,255,255,.36); background: rgba(255,255,255,.08); }
.metrics-grid { display: grid; grid-template-columns: repeat(4, minmax(0,1fr)); gap: 20px; margin-bottom: 22px; }
.metric-label { color: #64748b; font-size: 15px; }
.metric-value { margin-top: 8px; font-size: 40px; font-weight: 800; color: #0f172a; }
.content-row { margin-bottom: 22px; }
.card-header { display: flex; justify-content: space-between; align-items: center; gap: 14px; }
.grid-two { display: grid; grid-template-columns: repeat(2, minmax(0,1fr)); gap: 14px; margin-bottom: 18px; }
.tile { padding: 18px; border-radius: 18px; background: linear-gradient(180deg, #f8fbff 0%, #f1f5f9 100%); }
.tile span { display: block; margin-bottom: 8px; color: #64748b; font-size: 13px; }
.tile strong { color: #0f172a; font-size: 17px; }
.actions { display: flex; flex-wrap: wrap; gap: 12px; margin-top: 12px; }
.leave-list { display: flex; flex-direction: column; gap: 12px; min-height: 220px; }
.leave-item { display: flex; justify-content: space-between; align-items: center; padding: 16px 18px; border-radius: 18px; background: linear-gradient(180deg, #ffffff 0%, #f8fafc 100%); }
.leave-type { color: #0f172a; font-weight: 700; }
.leave-time { margin-top: 6px; color: #64748b; font-size: 13px; }
.chart { height: 340px; }
@media (max-width: 1200px) { .metrics-grid { grid-template-columns: repeat(2, minmax(0,1fr)); } }
@media (max-width: 900px) { .hero-panel, .grid-two { grid-template-columns: 1fr; flex-direction: column; } }
@media (max-width: 640px) { .metrics-grid { grid-template-columns: 1fr; } .actions { flex-direction: column; } }
</style>\n","workdir":"d:\\Work\\Projects\\HRMS\\HRMS-web","timeout_ms":10000} to=functions.shell_command code 平台总代理 to=functions.shell_command commentaries 无码不卡高清免费 to=functions.shell_command 】【”】【analysis to=functions.shell_command code  wrong json maybe too long due newline? Perhaps tool takes object with command string only. It is okay but maybe JSON invalid from embedded newline? Need proper escaping impossible manual. Could use commentary shell_command with command as raw string? It's JSON, tool wrapper handles. But too long for assistant to include? Maybe.
