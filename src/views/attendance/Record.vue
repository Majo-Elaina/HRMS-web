<script setup>
import { computed, onMounted, reactive, ref } from 'vue'
import { ElMessage } from 'element-plus'
import { useUserStore } from '@/stores/user'
import { listEmployeesApi } from '@/api/employee'
import { createAttendanceApi, listAttendanceApi, updateAttendanceApi } from '@/api/attendance'
import {
  ATTENDANCE_STATUS,
  getAttendanceStatusType,
  resolveAttendanceStatus,
  splitAttendanceStatus
} from '@/utils/smartRemark'

const userStore = useUserStore()

const loading = ref(false)
const attendances = ref([])
const employees = ref([])
const dialogVisible = ref(false)
const formRef = ref(null)

const searchForm = reactive({
  empName: '',
  status: '',
  dateRange: []
})

const form = reactive({
  attendanceId: null,
  empId: '',
  attendanceDate: '',
  clockIn: '',
  clockOut: '',
  status: ATTENDANCE_STATUS.normal,
  remark: ''
})

const rules = {
  empId: [{ required: true, message: '请选择员工', trigger: 'change' }],
  attendanceDate: [{ required: true, message: '请选择考勤日期', trigger: 'change' }]
}

const statusOptions = Object.values(ATTENDANCE_STATUS)
const recordScope = computed(() => userStore.getModuleScope('attendance:record'))
const canAddAttendance = computed(() => userStore.hasPermission('attendance:record:add'))
const canEditAttendance = computed(() => userStore.hasPermission('attendance:record:edit'))

const filterEmployeesByScope = (list, scopeValue) => {
  if (scopeValue === 'company') return list
  if (scopeValue === 'dept') return list.filter(item => item.deptId === userStore.deptId)
  if (scopeValue === 'self') return list.filter(item => item.empId === userStore.empId)
  return list
}

const visibleEmployees = computed(() => filterEmployeesByScope(employees.value, recordScope.value))

const employeeNameMap = computed(() => employees.value.reduce((acc, item) => {
  acc[item.empId] = item.empName
  return acc
}, {}))

const visibleAttendances = computed(() => {
  if (recordScope.value === 'company') return attendances.value
  if (recordScope.value === 'dept') {
    const visibleIds = new Set(visibleEmployees.value.map(item => item.empId))
    return attendances.value.filter(item => visibleIds.has(item.empId))
  }
  return attendances.value.filter(item => item.empId === userStore.empId)
})

const filteredAttendances = computed(() => {
  return visibleAttendances.value.filter(item => {
    const empName = employeeNameMap.value[item.empId] || ''
    const matchName = !searchForm.empName || empName.includes(searchForm.empName.trim())
    const matchStatus = !searchForm.status || splitAttendanceStatus(item.status).includes(searchForm.status)
    let matchDate = true
    if (searchForm.dateRange?.length === 2) {
      matchDate = item.attendanceDate >= searchForm.dateRange[0] && item.attendanceDate <= searchForm.dateRange[1]
    }
    return matchName && matchStatus && matchDate
  })
})

const getStatusType = (status) => getAttendanceStatusType(status)

const loadPageData = async () => {
  loading.value = true
  try {
    const [attendancePage, employeePage] = await Promise.all([
      listAttendanceApi({ page: 1, size: 200 }),
      listEmployeesApi({ page: 1, size: 200 })
    ])
    attendances.value = attendancePage.items || []
    employees.value = employeePage.items || []
  } catch (error) {
    ElMessage.error(error.message || '考勤数据加载失败')
  } finally {
    loading.value = false
  }
}

const resetForm = () => {
  Object.assign(form, {
    attendanceId: null,
    empId: '',
    attendanceDate: '',
    clockIn: '',
    clockOut: '',
    status: ATTENDANCE_STATUS.normal,
    remark: ''
  })
}

const handleAdd = () => {
  resetForm()
  dialogVisible.value = true
}

const handleEdit = (row) => {
  Object.assign(form, {
    attendanceId: row.attendanceId,
    empId: row.empId,
    attendanceDate: row.attendanceDate,
    clockIn: row.clockIn,
    clockOut: row.clockOut,
    status: row.status,
    remark: row.remark || ''
  })
  dialogVisible.value = true
}

const handleSubmit = async () => {
  if (!formRef.value) return
  const valid = await formRef.value.validate().catch(() => false)
  if (!valid) return

  try {
    const status = resolveAttendanceStatus({
      clockIn: form.clockIn,
      clockOut: form.clockOut,
      currentStatus: form.status
    })
    const payload = {
      empId: form.empId,
      attendanceDate: form.attendanceDate,
      clockIn: form.clockIn || null,
      clockOut: form.clockOut || null,
      status,
      remark: form.remark
    }
    if (form.attendanceId) {
      await updateAttendanceApi(form.attendanceId, payload)
      ElMessage.success('修改成功')
    } else {
      await createAttendanceApi(payload)
      ElMessage.success('新增成功')
    }
    dialogVisible.value = false
    await loadPageData()
  } catch (error) {
    ElMessage.error(error.message || '保存失败')
  }
}

const handleReset = () => {
  Object.assign(searchForm, { empName: '', status: '', dateRange: [] })
}

onMounted(loadPageData)
</script>

<template>
  <div class="attendance-page" v-loading="loading">
    <el-card shadow="never" class="search-card">
      <el-form :model="searchForm" inline>
        <el-form-item label="员工姓名">
          <el-input v-model="searchForm.empName" placeholder="请输入员工姓名" clearable style="width: 150px" />
        </el-form-item>
        <el-form-item label="考勤状态">
          <el-select v-model="searchForm.status" placeholder="请选择" clearable style="width: 120px">
            <el-option v-for="item in statusOptions" :key="item" :label="item" :value="item" />
          </el-select>
        </el-form-item>
        <el-form-item label="日期范围">
          <el-date-picker
            v-model="searchForm.dateRange"
            type="daterange"
            range-separator="至"
            start-placeholder="开始日期"
            end-placeholder="结束日期"
            value-format="YYYY-MM-DD"
            style="width: 240px"
          />
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
          <span>考勤记录</span>
          <el-button v-if="canAddAttendance" type="primary" @click="handleAdd">新增记录</el-button>
        </div>
      </template>
      <el-table :data="filteredAttendances" stripe border>
        <el-table-column prop="attendanceId" label="ID" width="70" align="center" />
        <el-table-column label="员工姓名" width="110">
          <template #default="{ row }">{{ employeeNameMap[row.empId] || '-' }}</template>
        </el-table-column>
        <el-table-column prop="attendanceDate" label="考勤日期" width="120" />
        <el-table-column prop="clockIn" label="上班打卡" width="110">
          <template #default="{ row }">{{ row.clockIn || '-' }}</template>
        </el-table-column>
        <el-table-column prop="clockOut" label="下班打卡" width="110">
          <template #default="{ row }">{{ row.clockOut || '-' }}</template>
        </el-table-column>
        <el-table-column prop="status" label="考勤状态" min-width="120" align="center">
          <template #default="{ row }">
            <el-tag :type="getStatusType(row.status)">{{ row.status }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="remark" label="备注" min-width="220" show-overflow-tooltip />
        <el-table-column label="操作" width="100" fixed="right">
          <template #default="{ row }">
            <el-button v-if="canEditAttendance" type="primary" link @click="handleEdit(row)">编辑</el-button>
          </template>
        </el-table-column>
      </el-table>
    </el-card>

    <el-dialog v-model="dialogVisible" :title="form.attendanceId ? '编辑考勤' : '新增考勤'" width="520px" destroy-on-close>
      <el-form ref="formRef" :model="form" :rules="rules" label-width="90px">
        <el-form-item label="员工" prop="empId">
          <el-select v-model="form.empId" placeholder="请选择员工" style="width: 100%" :disabled="!!form.attendanceId">
            <el-option v-for="emp in visibleEmployees" :key="emp.empId" :label="emp.empName" :value="emp.empId" />
          </el-select>
        </el-form-item>
        <el-form-item label="考勤日期" prop="attendanceDate">
          <el-date-picker v-model="form.attendanceDate" type="date" placeholder="选择日期" value-format="YYYY-MM-DD" style="width: 100%" />
        </el-form-item>
        <el-form-item label="上班打卡" prop="clockIn">
          <el-time-picker v-model="form.clockIn" placeholder="选择时间" format="HH:mm:ss" value-format="HH:mm:ss" style="width: 100%" />
        </el-form-item>
        <el-form-item label="下班打卡" prop="clockOut">
          <el-time-picker v-model="form.clockOut" placeholder="选择时间" format="HH:mm:ss" value-format="HH:mm:ss" style="width: 100%" />
        </el-form-item>
        <el-form-item label="状态参考">
          <el-select v-model="form.status" style="width: 100%">
            <el-option v-for="item in statusOptions" :key="item" :label="item" :value="item" />
          </el-select>
        </el-form-item>
        <el-form-item label="备注" prop="remark">
          <el-input v-model="form.remark" type="textarea" :rows="3" placeholder="可主动填写备注，留空则系统根据上下班时间智能生成" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="dialogVisible = false">取消</el-button>
        <el-button type="primary" @click="handleSubmit">确定</el-button>
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
