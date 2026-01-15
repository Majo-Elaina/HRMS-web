<script setup>
import { ref, computed } from 'vue'
import { use } from 'echarts/core'
import { CanvasRenderer } from 'echarts/renderers'
import { PieChart, BarChart, LineChart } from 'echarts/charts'
import { TitleComponent, TooltipComponent, LegendComponent, GridComponent } from 'echarts/components'
import VChart from 'vue-echarts'
import { statistics, employees, positions, departments, leaveRequests } from '@/mock'
import { useUserStore } from '@/stores/user'

use([CanvasRenderer, PieChart, BarChart, LineChart, TitleComponent, TooltipComponent, LegendComponent, GridComponent])

const userStore = useUserStore()
const leaveScope = computed(() => userStore.getModuleScope('attendance:leave'))

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

const getMatchedRule = (leave) => {
  const applicantTag = getEmployeeTag(leave.empId)
  const rules = userStore.getLeaveApprovalRules()
  const exact = rules.find(rule => rule.applicantTag === applicantTag && matchDays(rule, leave.days))
  return exact || rules.find(rule => matchRule(rule, applicantTag, leave.days))
}

const normalizeStatus = (status) => {
  const legacyStatusMap = {
    'HR已批': '已通过',
    '部门经理已批': '已通过',
    '待经理审批': '待二级审批'
  }
  return legacyStatusMap[status] || status
}

const getPendingApprover = (leave) => {
  const status = normalizeStatus(leave.status)
  const rule = getMatchedRule(leave)
  if (status === '待审批') return { tag: rule?.firstApproverTag || 'ADMIN', scope: 'company' }
  if (status === '待二级审批') return { tag: rule?.secondApproverTag || '', scope: rule?.secondApproverScope || 'dept' }
  return { tag: '', scope: 'company' }
}

// 部门人员分布图
const deptChartOption = ref({
  title: { text: '部门人员分布', left: 'center' },
  tooltip: { trigger: 'item', formatter: '{b}: {c}人 ({d}%)' },
  legend: { orient: 'vertical', left: 'left', top: 'middle' },
  series: [{
    type: 'pie',
    radius: ['40%', '70%'],
    avoidLabelOverlap: false,
    itemStyle: { borderRadius: 10, borderColor: '#fff', borderWidth: 2 },
    label: { show: false },
    emphasis: { label: { show: true, fontSize: 14, fontWeight: 'bold' } },
    data: statistics.departmentStats
  }]
})

// 考勤趋势图
const attendanceChartOption = ref({
  title: { text: '月度考勤统计', left: 'center' },
  tooltip: { trigger: 'axis' },
  legend: { data: ['正常', '迟到', '早退', '缺勤'], bottom: 0 },
  grid: { left: '3%', right: '4%', bottom: '15%', containLabel: true },
  xAxis: { type: 'category', data: statistics.monthlyAttendance.map(i => i.month) },
  yAxis: { type: 'value', name: '人次' },
  series: [
    { name: '正常', type: 'bar', stack: 'total', data: statistics.monthlyAttendance.map(i => i.normal), itemStyle: { color: '#67C23A' } },
    { name: '迟到', type: 'bar', stack: 'total', data: statistics.monthlyAttendance.map(i => i.late), itemStyle: { color: '#E6A23C' } },
    { name: '早退', type: 'bar', stack: 'total', data: statistics.monthlyAttendance.map(i => i.early), itemStyle: { color: '#F56C6C' } },
    { name: '缺勤', type: 'bar', stack: 'total', data: statistics.monthlyAttendance.map(i => i.absent), itemStyle: { color: '#909399' } }
  ]
})

// 薪资趋势图
const salaryChartOption = ref({
  title: { text: '月度薪资趋势', left: 'center' },
  tooltip: { trigger: 'axis' },
  legend: { data: ['总薪资', '平均薪资'], bottom: 0 },
  grid: { left: '3%', right: '4%', bottom: '15%', containLabel: true },
  xAxis: { type: 'category', data: statistics.salarySummary.map(i => i.month) },
  yAxis: [
    { type: 'value', name: '总薪资(元)', position: 'left' },
    { type: 'value', name: '平均薪资(元)', position: 'right' }
  ],
  series: [
    { name: '总薪资', type: 'bar', data: statistics.salarySummary.map(i => i.total), itemStyle: { color: '#409EFF' } },
    { name: '平均薪资', type: 'line', yAxisIndex: 1, data: statistics.salarySummary.map(i => i.avg), itemStyle: { color: '#67C23A' } }
  ]
})

// 待处理请假
const pendingLeaves = computed(() => {
  return leaveRequests
    .map(item => ({ ...item, status: normalizeStatus(item.status) }))
    .filter(l => l.status === '待审批' || l.status === '待二级审批')
    .filter(l => {
      const emp = employees.find(e => e.empId === l.empId)
      if (leaveScope.value === 'dept' && emp?.deptId !== userStore.deptId) return false
      if (leaveScope.value === 'self' && l.empId !== userStore.empId) return false
      return true
    })
    .filter(l => {
      if (!userStore.hasPermission('attendance:leave:approve')) return false
      const pending = getPendingApprover(l)
      if (!pending.tag) return false
      if (!userStore.matchIdentityTag(pending.tag, userStore.identityTag)) return false
      if (pending.scope === 'dept') {
        const emp = employees.find(e => e.empId === l.empId)
        return emp?.deptId === userStore.deptId
      }
      return true
    })
})
</script>

<template>
  <div class="dashboard">
    <!-- 欢迎信息 -->
    <div class="welcome-card">
      <h2>欢迎回来，{{ userStore.user?.empName }}！</h2>
      <p>当前角色：{{ userStore.user?.roleName }}</p>
      <p>所属部门：{{ userStore.user?.deptName || '-' }}</p>
      <p>岗位定位：{{ userStore.user?.positionName || '-' }}</p>
    </div>

    <!-- 统计卡片 -->
    <el-row :gutter="20" class="stat-cards">
      <el-col :span="6">
        <el-card shadow="hover" class="stat-card">
          <div class="stat-content">
            <div class="stat-icon" style="background: #409EFF;">
              <el-icon size="30"><User /></el-icon>
            </div>
            <div class="stat-info">
              <div class="stat-value">{{ statistics.totalEmployees }}</div>
              <div class="stat-label">员工总数</div>
            </div>
          </div>
        </el-card>
      </el-col>
      <el-col :span="6">
        <el-card shadow="hover" class="stat-card">
          <div class="stat-content">
            <div class="stat-icon" style="background: #67C23A;">
              <el-icon size="30"><UserFilled /></el-icon>
            </div>
            <div class="stat-info">
              <div class="stat-value">{{ statistics.newEmployeesThisMonth }}</div>
              <div class="stat-label">本月新入职</div>
            </div>
          </div>
        </el-card>
      </el-col>
      <el-col :span="6">
        <el-card shadow="hover" class="stat-card">
          <div class="stat-content">
            <div class="stat-icon" style="background: #E6A23C;">
              <el-icon size="30"><Clock /></el-icon>
            </div>
            <div class="stat-info">
              <div class="stat-value">{{ statistics.attendanceRate }}%</div>
              <div class="stat-label">出勤率</div>
            </div>
          </div>
        </el-card>
      </el-col>
      <el-col :span="6">
        <el-card shadow="hover" class="stat-card">
          <div class="stat-content">
            <div class="stat-icon" style="background: #F56C6C;">
              <el-icon size="30"><Document /></el-icon>
            </div>
            <div class="stat-info">
              <div class="stat-value">{{ pendingLeaves.length }}</div>
              <div class="stat-label">待审批请假</div>
            </div>
          </div>
        </el-card>
      </el-col>
    </el-row>

    <!-- 图表区域 -->
    <el-row :gutter="20" class="chart-row">
      <el-col :span="12">
        <el-card shadow="hover">
          <v-chart class="chart" :option="deptChartOption" autoresize />
        </el-card>
      </el-col>
      <el-col :span="12">
        <el-card shadow="hover">
          <v-chart class="chart" :option="attendanceChartOption" autoresize />
        </el-card>
      </el-col>
    </el-row>

    <el-row :gutter="20" class="chart-row">
      <el-col :span="16">
        <el-card shadow="hover">
          <v-chart class="chart" :option="salaryChartOption" autoresize />
        </el-card>
      </el-col>
      <el-col :span="8">
        <el-card shadow="hover" class="pending-card">
          <template #header>
            <div class="card-header">
              <span>待处理请假申请</span>
              <el-button type="primary" link>查看全部</el-button>
            </div>
          </template>
          <el-table :data="pendingLeaves" size="small" max-height="280">
            <el-table-column prop="empName" label="申请人" width="80" />
            <el-table-column prop="leaveType" label="类型" width="60" />
            <el-table-column prop="days" label="天数" width="50" />
            <el-table-column prop="status" label="状态">
              <template #default="{ row }">
                <el-tag :type="row.status === '待审批' || row.status === '待二级审批' ? 'warning' : 'primary'" size="small">
                  {{ row.status }}
                </el-tag>
              </template>
            </el-table-column>
          </el-table>
        </el-card>
      </el-col>
    </el-row>
  </div>
</template>

<style scoped>
.dashboard {
  padding: 0;
}

.welcome-card {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: #fff;
  padding: 20px 30px;
  border-radius: 8px;
  margin-bottom: 20px;
}

.welcome-card h2 {
  margin: 0 0 8px 0;
  font-size: 24px;
}

.welcome-card p {
  margin: 0;
  opacity: 0.9;
}

.stat-cards {
  margin-bottom: 20px;
}

.stat-card {
  border-radius: 8px;
}

.stat-content {
  display: flex;
  align-items: center;
  gap: 20px;
}

.stat-icon {
  width: 60px;
  height: 60px;
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #fff;
}

.stat-info {
  flex: 1;
}

.stat-value {
  font-size: 28px;
  font-weight: bold;
  color: #303133;
}

.stat-label {
  font-size: 14px;
  color: #909399;
  margin-top: 5px;
}

.chart-row {
  margin-bottom: 20px;
}

.chart {
  height: 320px;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.pending-card :deep(.el-card__body) {
  padding: 0;
}
</style>
