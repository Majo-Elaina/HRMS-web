<script setup>
import { computed, onMounted, ref } from 'vue'
import { use } from 'echarts/core'
import { CanvasRenderer } from 'echarts/renderers'
import { PieChart, BarChart, LineChart } from 'echarts/charts'
import { TitleComponent, TooltipComponent, LegendComponent, GridComponent } from 'echarts/components'
import VChart from 'vue-echarts'
import { ElMessage } from 'element-plus'
import { useUserStore } from '@/stores/user'
import { getReportSummaryApi } from '@/api/report'
import { listEmployeesApi } from '@/api/employee'
import { listDepartmentsApi } from '@/api/department'
import { listAttendanceApi } from '@/api/attendance'
import { listSalaryRecordsApi } from '@/api/salaryRecord'

use([CanvasRenderer, PieChart, BarChart, LineChart, TitleComponent, TooltipComponent, LegendComponent, GridComponent])

const userStore = useUserStore()
const activeTab = ref('employee')
const loading = ref(false)

const summary = ref({
  totalEmployees: 0,
  newEmployeesThisMonth: 0,
  attendanceRate: 0,
  leaveCount: 0,
  departmentStats: []
})
const employees = ref([])
const departments = ref([])
const attendanceRecords = ref([])
const salaryRecords = ref([])

const reportScope = computed(() => userStore.getModuleScope('report'))
const salaryScope = computed(() => userStore.getModuleScope('salary:record'))

const visibleDepartments = computed(() => {
  if (reportScope.value === 'company') return departments.value
  return departments.value.filter(item => item.deptId === userStore.deptId)
})

const visibleEmployees = computed(() => {
  if (reportScope.value === 'company') return employees.value
  if (reportScope.value === 'dept') return employees.value.filter(item => item.deptId === userStore.deptId)
  return employees.value.filter(item => item.empId === userStore.empId)
})

const visibleSalaryRecords = computed(() => {
  if (salaryScope.value === 'company') return salaryRecords.value
  if (salaryScope.value === 'dept') return salaryRecords.value.filter(item => visibleEmployees.value.some(emp => emp.empId === item.empId))
  return salaryRecords.value.filter(item => item.empId === userStore.empId)
})

const genderData = computed(() => {
  return visibleEmployees.value.reduce((acc, item) => {
    acc[item.gender] = (acc[item.gender] || 0) + 1
    return acc
  }, {})
})

const statusData = computed(() => {
  return visibleEmployees.value.reduce((acc, item) => {
    acc[item.status] = (acc[item.status] || 0) + 1
    return acc
  }, {})
})

const deptStats = computed(() => {
  if (reportScope.value === 'company') return summary.value.departmentStats || []
  const deptMap = visibleEmployees.value.reduce((acc, item) => {
    acc[item.deptId] = (acc[item.deptId] || 0) + 1
    return acc
  }, {})
  return visibleDepartments.value.map(item => ({ name: item.deptName, value: deptMap[item.deptId] || 0 }))
})

const monthKeys = computed(() => {
  const now = new Date()
  return Array.from({ length: 6 }).map((_, index) => {
    const date = new Date(now.getFullYear(), now.getMonth() - (5 - index), 1)
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
  })
})

const attendanceSeries = computed(() => {
  const initial = monthKeys.value.reduce((acc, key) => {
    acc[key] = { 正常: 0, 迟到: 0, 早退: 0, 缺勤: 0 }
    return acc
  }, {})

  attendanceRecords.value.forEach(item => {
    const month = String(item.attendanceDate || '').slice(0, 7)
    if (!initial[month]) return
    if (initial[month][item.status] !== undefined) {
      initial[month][item.status] += 1
    }
  })
  return initial
})

const attendanceStatusPie = computed(() => {
  const currentMonth = monthKeys.value[monthKeys.value.length - 1]
  const current = attendanceSeries.value[currentMonth] || { 正常: 0, 迟到: 0, 早退: 0, 缺勤: 0 }
  return [
    { name: '正常', value: current.正常, itemStyle: { color: '#67C23A' } },
    { name: '迟到', value: current.迟到, itemStyle: { color: '#E6A23C' } },
    { name: '早退', value: current.早退, itemStyle: { color: '#F56C6C' } },
    { name: '缺勤', value: current.缺勤, itemStyle: { color: '#909399' } }
  ]
})

const salaryMonthStats = computed(() => {
  const initial = monthKeys.value.reduce((acc, key) => {
    acc[key] = { total: 0, count: 0 }
    return acc
  }, {})
  visibleSalaryRecords.value.forEach(item => {
    const month = String(item.salaryMonth || '').slice(0, 7)
    if (!initial[month]) return
    initial[month].total += Number(item.netSalary || 0)
    initial[month].count += 1
  })
  return initial
})

const deptSalaryOptionData = computed(() => {
  const base = visibleDepartments.value.map(item => ({ name: item.deptName, value: 0 }))
  const indexMap = new Map(base.map((item, index) => [item.name, index]))
  visibleSalaryRecords.value.forEach(item => {
    const emp = employees.value.find(empItem => empItem.empId === item.empId)
    const dept = visibleDepartments.value.find(deptItem => deptItem.deptId === emp?.deptId)
    if (!dept) return
    const index = indexMap.get(dept.deptName)
    if (index !== undefined) {
      base[index].value += Number(item.netSalary || 0)
    }
  })
  return base
})

const salaryTotals = computed(() => {
  const values = visibleSalaryRecords.value.map(item => Number(item.netSalary || 0))
  const total = values.reduce((sum, item) => sum + item, 0)
  return {
    total,
    avg: values.length ? total / values.length : 0,
    max: values.length ? Math.max(...values) : 0,
    min: values.length ? Math.min(...values) : 0
  }
})

const genderChartOption = computed(() => ({
  title: { text: '员工性别分布', left: 'center' },
  tooltip: { trigger: 'item', formatter: '{b}: {c}人 ({d}%)' },
  legend: { orient: 'vertical', left: 'left', top: 'middle' },
  series: [{
    type: 'pie',
    radius: '60%',
    data: Object.entries(genderData.value).map(([name, value]) => ({ name, value })),
    itemStyle: { borderRadius: 5 }
  }]
}))

const statusChartOption = computed(() => ({
  title: { text: '员工状态分布', left: 'center' },
  tooltip: { trigger: 'item', formatter: '{b}: {c}人 ({d}%)' },
  legend: { orient: 'vertical', left: 'left', top: 'middle' },
  series: [{
    type: 'pie',
    radius: ['40%', '70%'],
    avoidLabelOverlap: false,
    itemStyle: { borderRadius: 10, borderColor: '#fff', borderWidth: 2 },
    label: { show: false },
    emphasis: { label: { show: true, fontSize: 14, fontWeight: 'bold' } },
    data: Object.entries(statusData.value).map(([name, value]) => ({ name, value }))
  }]
}))

const deptChartOption = computed(() => ({
  title: { text: '部门人员分布', left: 'center' },
  tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' } },
  grid: { left: '3%', right: '4%', bottom: '3%', containLabel: true },
  xAxis: { type: 'category', data: deptStats.value.map(item => item.name) },
  yAxis: { type: 'value', name: '人数' },
  series: [{
    type: 'bar',
    data: deptStats.value.map(item => item.value),
    itemStyle: {
      color: (params) => ['#409EFF', '#67C23A', '#E6A23C', '#F56C6C', '#909399', '#00D4FF'][params.dataIndex % 6]
    },
    label: { show: true, position: 'top' }
  }]
}))

const attendanceChartOption = computed(() => ({
  title: { text: '月度考勤统计趋势', left: 'center' },
  tooltip: { trigger: 'axis' },
  legend: { data: ['正常', '迟到', '早退', '缺勤'], bottom: 0 },
  grid: { left: '3%', right: '4%', bottom: '15%', containLabel: true },
  xAxis: { type: 'category', data: monthKeys.value },
  yAxis: { type: 'value', name: '人次' },
  series: [
    { name: '正常', type: 'line', data: monthKeys.value.map(key => attendanceSeries.value[key].正常), smooth: true, itemStyle: { color: '#67C23A' } },
    { name: '迟到', type: 'line', data: monthKeys.value.map(key => attendanceSeries.value[key].迟到), smooth: true, itemStyle: { color: '#E6A23C' } },
    { name: '早退', type: 'line', data: monthKeys.value.map(key => attendanceSeries.value[key].早退), smooth: true, itemStyle: { color: '#F56C6C' } },
    { name: '缺勤', type: 'line', data: monthKeys.value.map(key => attendanceSeries.value[key].缺勤), smooth: true, itemStyle: { color: '#909399' } }
  ]
}))

const attendanceStatusOption = computed(() => ({
  title: { text: '本月考勤状态占比', left: 'center' },
  tooltip: { trigger: 'item', formatter: '{b}: {c}人次 ({d}%)' },
  legend: { orient: 'vertical', left: 'left', top: 'middle' },
  series: [{ type: 'pie', radius: '60%', data: attendanceStatusPie.value }]
}))

const salaryTrendOption = computed(() => ({
  title: { text: '月度薪资发放趋势', left: 'center' },
  tooltip: { trigger: 'axis' },
  legend: { data: ['总薪资', '平均薪资'], bottom: 0 },
  grid: { left: '3%', right: '4%', bottom: '15%', containLabel: true },
  xAxis: { type: 'category', data: monthKeys.value },
  yAxis: [
    { type: 'value', name: '总薪资(元)', position: 'left' },
    { type: 'value', name: '平均薪资(元)', position: 'right' }
  ],
  series: [
    { name: '总薪资', type: 'bar', data: monthKeys.value.map(key => Number(salaryMonthStats.value[key].total.toFixed(2))), itemStyle: { color: '#409EFF' } },
    {
      name: '平均薪资',
      type: 'line',
      yAxisIndex: 1,
      data: monthKeys.value.map((key) => {
        const item = salaryMonthStats.value[key]
        return item.count ? Number((item.total / item.count).toFixed(2)) : 0
      }),
      smooth: true,
      itemStyle: { color: '#67C23A' }
    }
  ]
}))

const deptSalaryOption = computed(() => ({
  title: { text: '部门薪资分布', left: 'center' },
  tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' } },
  grid: { left: '3%', right: '4%', bottom: '3%', containLabel: true },
  xAxis: { type: 'category', data: deptSalaryOptionData.value.map(item => item.name) },
  yAxis: { type: 'value', name: '薪资(元)' },
  series: [{
    type: 'bar',
    data: deptSalaryOptionData.value.map(item => Number(item.value.toFixed(2))),
    itemStyle: {
      color: (params) => ['#409EFF', '#67C23A', '#E6A23C', '#F56C6C', '#909399', '#00D4FF'][params.dataIndex % 6]
    },
    label: { show: true, position: 'top' }
  }]
}))

const formatMoney = (value) => Number(value || 0).toLocaleString('zh-CN', { minimumFractionDigits: 0, maximumFractionDigits: 0 })

const loadPageData = async () => {
  loading.value = true
  try {
    const [summaryData, employeePage, departmentPage, attendancePage, salaryPage] = await Promise.all([
      getReportSummaryApi(),
      listEmployeesApi({ page: 1, size: 200 }),
      listDepartmentsApi({ page: 1, size: 200 }),
      listAttendanceApi({ page: 1, size: 500 }),
      listSalaryRecordsApi({ page: 1, size: 500 })
    ])
    summary.value = summaryData
    employees.value = employeePage.items || []
    departments.value = departmentPage.items || []
    attendanceRecords.value = attendancePage.items || []
    salaryRecords.value = (salaryPage.items || []).map(item => ({
      ...item,
      salaryMonth: String(item.salaryMonth || '').slice(0, 7)
    }))
  } catch (error) {
    ElMessage.error(error.message || '报表数据加载失败')
  } finally {
    loading.value = false
  }
}

onMounted(loadPageData)
</script>

<template>
  <div class="report-page" v-loading="loading">
    <el-tabs v-model="activeTab" type="border-card">
      <el-tab-pane label="员工统计" name="employee">
        <el-row :gutter="20">
          <el-col :span="8">
            <el-card shadow="hover">
              <v-chart class="chart" :option="genderChartOption" autoresize />
            </el-card>
          </el-col>
          <el-col :span="8">
            <el-card shadow="hover">
              <v-chart class="chart" :option="statusChartOption" autoresize />
            </el-card>
          </el-col>
          <el-col :span="8">
            <el-card shadow="hover" class="stat-summary">
              <h3>员工概况</h3>
              <div class="stat-item">
                <span class="label">员工总数</span>
                <span class="value">{{ visibleEmployees.length }}</span>
              </div>
              <div class="stat-item">
                <span class="label">本月新入职</span>
                <span class="value success">{{ summary.newEmployeesThisMonth }}</span>
              </div>
              <div class="stat-item">
                <span class="label">在职员工</span>
                <span class="value">{{ visibleEmployees.filter(item => item.status === '在职').length }}</span>
              </div>
              <div class="stat-item">
                <span class="label">试用期员工</span>
                <span class="value warning">{{ visibleEmployees.filter(item => item.status === '试用').length }}</span>
              </div>
            </el-card>
          </el-col>
        </el-row>
        <el-row :gutter="20" style="margin-top: 20px;">
          <el-col :span="24">
            <el-card shadow="hover">
              <v-chart class="chart-large" :option="deptChartOption" autoresize />
            </el-card>
          </el-col>
        </el-row>
      </el-tab-pane>

      <el-tab-pane label="考勤统计" name="attendance">
        <el-row :gutter="20">
          <el-col :span="16">
            <el-card shadow="hover">
              <v-chart class="chart" :option="attendanceChartOption" autoresize />
            </el-card>
          </el-col>
          <el-col :span="8">
            <el-card shadow="hover">
              <v-chart class="chart" :option="attendanceStatusOption" autoresize />
            </el-card>
          </el-col>
        </el-row>
        <el-row :gutter="20" style="margin-top: 20px;">
          <el-col :span="24">
            <el-card shadow="hover" class="stat-summary">
              <h3>考勤概况</h3>
              <el-row :gutter="40">
                <el-col :span="6">
                  <div class="stat-box">
                    <div class="stat-num">{{ summary.attendanceRate }}%</div>
                    <div class="stat-label">本月出勤率</div>
                  </div>
                </el-col>
                <el-col :span="6">
                  <div class="stat-box">
                    <div class="stat-num success">{{ attendanceStatusPie.find(item => item.name === '正常')?.value || 0 }}</div>
                    <div class="stat-label">正常出勤(人次)</div>
                  </div>
                </el-col>
                <el-col :span="6">
                  <div class="stat-box">
                    <div class="stat-num warning">{{ attendanceStatusPie.find(item => item.name === '迟到')?.value || 0 }}</div>
                    <div class="stat-label">迟到(人次)</div>
                  </div>
                </el-col>
                <el-col :span="6">
                  <div class="stat-box">
                    <div class="stat-num danger">{{ attendanceStatusPie.find(item => item.name === '缺勤')?.value || 0 }}</div>
                    <div class="stat-label">缺勤(人次)</div>
                  </div>
                </el-col>
              </el-row>
            </el-card>
          </el-col>
        </el-row>
      </el-tab-pane>

      <el-tab-pane label="薪酬统计" name="salary">
        <el-row :gutter="20">
          <el-col :span="24">
            <el-card shadow="hover">
              <v-chart class="chart-large" :option="salaryTrendOption" autoresize />
            </el-card>
          </el-col>
        </el-row>
        <el-row :gutter="20" style="margin-top: 20px;">
          <el-col :span="16">
            <el-card shadow="hover">
              <v-chart class="chart" :option="deptSalaryOption" autoresize />
            </el-card>
          </el-col>
          <el-col :span="8">
            <el-card shadow="hover" class="stat-summary">
              <h3>薪酬概况</h3>
              <div class="stat-item">
                <span class="label">本月总薪资</span>
                <span class="value">{{ formatMoney(salaryTotals.total) }}</span>
              </div>
              <div class="stat-item">
                <span class="label">平均薪资</span>
                <span class="value">{{ formatMoney(salaryTotals.avg) }}</span>
              </div>
              <div class="stat-item">
                <span class="label">最高薪资</span>
                <span class="value success">{{ formatMoney(salaryTotals.max) }}</span>
              </div>
              <div class="stat-item">
                <span class="label">最低薪资</span>
                <span class="value warning">{{ formatMoney(salaryTotals.min) }}</span>
              </div>
            </el-card>
          </el-col>
        </el-row>
      </el-tab-pane>
    </el-tabs>
  </div>
</template>

<style scoped>
.report-page {
  padding: 0;
}

.chart {
  height: 320px;
}

.chart-large {
  height: 380px;
}

.stat-summary {
  height: 100%;
}

.stat-summary h3 {
  margin: 0 0 20px 0;
  padding-bottom: 10px;
  border-bottom: 1px solid #eee;
  color: #303133;
}

.stat-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 0;
  border-bottom: 1px dashed #eee;
}

.stat-item:last-child {
  border-bottom: none;
}

.stat-item .label {
  color: #606266;
}

.stat-item .value {
  font-size: 20px;
  font-weight: bold;
  color: #303133;
}

.stat-item .value.success {
  color: #67C23A;
}

.stat-item .value.warning {
  color: #E6A23C;
}

.stat-box {
  text-align: center;
  padding: 20px;
}

.stat-box .stat-num {
  font-size: 36px;
  font-weight: bold;
  color: #409EFF;
}

.stat-box .stat-num.success {
  color: #67C23A;
}

.stat-box .stat-num.warning {
  color: #E6A23C;
}

.stat-box .stat-num.danger {
  color: #F56C6C;
}

.stat-box .stat-label {
  margin-top: 10px;
  color: #909399;
}
</style>
