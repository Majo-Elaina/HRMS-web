<script setup>
import { ref, computed } from 'vue'
import { use } from 'echarts/core'
import { CanvasRenderer } from 'echarts/renderers'
import { PieChart, BarChart, LineChart } from 'echarts/charts'
import { TitleComponent, TooltipComponent, LegendComponent, GridComponent } from 'echarts/components'
import VChart from 'vue-echarts'
import { statistics, employees, departments } from '@/mock'
import { useUserStore } from '@/stores/user'

use([CanvasRenderer, PieChart, BarChart, LineChart, TitleComponent, TooltipComponent, LegendComponent, GridComponent])

const userStore = useUserStore()
const activeTab = ref('employee')

const reportScope = computed(() => userStore.getModuleScope('report'))
const salaryScope = computed(() => userStore.getModuleScope('salary:record'))

const visibleDepartments = computed(() => {
  if (reportScope.value === 'company') return departments
  return departments.filter(d => d.deptId === userStore.deptId)
})

const visibleEmployees = computed(() => {
  if (reportScope.value === 'company') return employees
  if (reportScope.value === 'dept') return employees.filter(emp => emp.deptId === userStore.deptId)
  return employees.filter(emp => emp.empId === userStore.empId)
})

// 员工性别分布
const genderData = computed(() => {
  return visibleEmployees.value.reduce((acc, emp) => {
    acc[emp.gender] = (acc[emp.gender] || 0) + 1
    return acc
  }, {})
})

const genderChartOption = computed(() => ({
  title: { text: '员工性别分布', left: 'center' },
  tooltip: { trigger: 'item', formatter: '{b}: {c}人 ({d}%)' },
  legend: { orient: 'vertical', left: 'left', top: 'middle' },
  series: [{
    type: 'pie',
    radius: '60%',
    data: Object.entries(genderData.value).map(([name, value]) => ({ name, value })),
    itemStyle: { borderRadius: 5 },
    emphasis: { itemStyle: { shadowBlur: 10, shadowOffsetX: 0, shadowColor: 'rgba(0, 0, 0, 0.5)' } }
  }]
}))

// 员工状态分布
const statusData = computed(() => {
  return visibleEmployees.value.reduce((acc, emp) => {
    acc[emp.status] = (acc[emp.status] || 0) + 1
    return acc
  }, {})
})

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

// 部门人员分布
const deptStats = computed(() => {
  if (reportScope.value === 'company') return statistics.departmentStats
  const deptMap = visibleEmployees.value.reduce((acc, emp) => {
    acc[emp.deptId] = (acc[emp.deptId] || 0) + 1
    return acc
  }, {})
  return visibleDepartments.value.map(d => ({ name: d.deptName, value: deptMap[d.deptId] || 0 }))
})

const deptChartOption = computed(() => ({
  title: { text: '部门人员分布', left: 'center' },
  tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' } },
  grid: { left: '3%', right: '4%', bottom: '3%', containLabel: true },
  xAxis: { type: 'category', data: deptStats.value.map(d => d.name) },
  yAxis: { type: 'value', name: '人数' },
  series: [{
    type: 'bar',
    data: deptStats.value.map(d => d.value),
    itemStyle: {
      color: function(params) {
        const colors = ['#409EFF', '#67C23A', '#E6A23C', '#F56C6C', '#909399', '#00D4FF']
        return colors[params.dataIndex % colors.length]
      }
    },
    label: { show: true, position: 'top' }
  }]
}))

// 考勤统计
const attendanceChartOption = ref({
  title: { text: '月度考勤统计趋势', left: 'center' },
  tooltip: { trigger: 'axis' },
  legend: { data: ['正常', '迟到', '早退', '缺勤'], bottom: 0 },
  grid: { left: '3%', right: '4%', bottom: '15%', containLabel: true },
  xAxis: { type: 'category', data: statistics.monthlyAttendance.map(i => i.month) },
  yAxis: { type: 'value', name: '人次' },
  series: [
    { name: '正常', type: 'line', data: statistics.monthlyAttendance.map(i => i.normal), smooth: true, itemStyle: { color: '#67C23A' } },
    { name: '迟到', type: 'line', data: statistics.monthlyAttendance.map(i => i.late), smooth: true, itemStyle: { color: '#E6A23C' } },
    { name: '早退', type: 'line', data: statistics.monthlyAttendance.map(i => i.early), smooth: true, itemStyle: { color: '#F56C6C' } },
    { name: '缺勤', type: 'line', data: statistics.monthlyAttendance.map(i => i.absent), smooth: true, itemStyle: { color: '#909399' } }
  ]
})

// 考勤状态占比
const attendanceStatusOption = ref({
  title: { text: '本月考勤状态占比', left: 'center' },
  tooltip: { trigger: 'item', formatter: '{b}: {c}人次 ({d}%)' },
  legend: { orient: 'vertical', left: 'left', top: 'middle' },
  series: [{
    type: 'pie',
    radius: '60%',
    data: [
      { name: '正常', value: 89, itemStyle: { color: '#67C23A' } },
      { name: '迟到', value: 6, itemStyle: { color: '#E6A23C' } },
      { name: '早退', value: 3, itemStyle: { color: '#F56C6C' } },
      { name: '缺勤', value: 2, itemStyle: { color: '#909399' } }
    ]
  }]
})

// 薪资趋势
const salaryTrendOption = ref({
  title: { text: '月度薪资发放趋势', left: 'center' },
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
    { name: '平均薪资', type: 'line', yAxisIndex: 1, data: statistics.salarySummary.map(i => i.avg), smooth: true, itemStyle: { color: '#67C23A' } }
  ]
})

// 部门薪资分布
const deptNames = departments.map(d => d.deptName)
const deptSalaryData = [33000, 17500, 16000, 22000, 15000, 12000, 11000]
const deptSalaryOption = computed(() => {
  const visibleDeptNames = visibleDepartments.value.map(d => d.deptName)
  const visibleDeptSalary = salaryScope.value === 'company'
    ? deptSalaryData
    : visibleDeptNames.map(name => {
        const index = deptNames.indexOf(name)
        return index >= 0 ? deptSalaryData[index] : 0
      })

  return {
    title: { text: '部门薪资分布', left: 'center' },
    tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' } },
    grid: { left: '3%', right: '4%', bottom: '3%', containLabel: true },
    xAxis: { type: 'category', data: visibleDeptNames },
    yAxis: { type: 'value', name: '薪资(元)' },
    series: [{
      type: 'bar',
      data: visibleDeptSalary,
      itemStyle: {
        color: function(params) {
          const colors = ['#409EFF', '#67C23A', '#E6A23C', '#F56C6C', '#909399', '#00D4FF']
          return colors[params.dataIndex % colors.length]
        }
      },
      label: { show: true, position: 'top', formatter: '￥{c}' }
    }]
  }
})
</script>

<template>
  <div class="report-page">
    <el-tabs v-model="activeTab" type="border-card">
      <!-- 员工统计 -->
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
                <span class="value success">{{ statistics.newEmployeesThisMonth }}</span>
              </div>
              <div class="stat-item">
                <span class="label">在职员工</span>
                <span class="value">{{ visibleEmployees.filter(e => e.status === '在职').length }}</span>
              </div>
              <div class="stat-item">
                <span class="label">试用期员工</span>
                <span class="value warning">{{ visibleEmployees.filter(e => e.status === '试用').length }}</span>
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

      <!-- 考勤统计 -->
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
                    <div class="stat-num">{{ statistics.attendanceRate }}%</div>
                    <div class="stat-label">本月出勤率</div>
                  </div>
                </el-col>
                <el-col :span="6">
                  <div class="stat-box">
                    <div class="stat-num success">89</div>
                    <div class="stat-label">正常出勤(人次)</div>
                  </div>
                </el-col>
                <el-col :span="6">
                  <div class="stat-box">
                    <div class="stat-num warning">6</div>
                    <div class="stat-label">迟到(人次)</div>
                  </div>
                </el-col>
                <el-col :span="6">
                  <div class="stat-box">
                    <div class="stat-num danger">2</div>
                    <div class="stat-label">缺勤(人次)</div>
                  </div>
                </el-col>
              </el-row>
            </el-card>
          </el-col>
        </el-row>
      </el-tab-pane>

      <!-- 薪酬统计 -->
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
                <span class="value">￥305,000</span>
              </div>
              <div class="stat-item">
                <span class="label">平均薪资</span>
                <span class="value">￥25,417</span>
              </div>
              <div class="stat-item">
                <span class="label">最高薪资</span>
                <span class="value success">￥33,000</span>
              </div>
              <div class="stat-item">
                <span class="label">最低薪资</span>
                <span class="value warning">￥8,096</span>
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
