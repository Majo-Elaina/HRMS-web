<script setup>
import { ref, reactive, computed } from 'vue'
import { ElMessage } from 'element-plus'
import { attendances as mockAttendances, employees } from '@/mock'
import { useUserStore } from '@/stores/user'

const userStore = useUserStore()
const attendances = ref([...mockAttendances])
const dialogVisible = ref(false)
const formRef = ref(null)

const searchForm = reactive({
  empName: '',
  deptId: '',
  status: '',
  dateRange: []
})

const form = reactive({
  attendanceId: null,
  empId: '',
  attendanceDate: '',
  clockIn: '',
  clockOut: '',
  status: '正常',
  remark: ''
})

const rules = {
  empId: [{ required: true, message: '请选择员工', trigger: 'change' }],
  attendanceDate: [{ required: true, message: '请选择考勤日期', trigger: 'change' }],
  status: [{ required: true, message: '请选择考勤状态', trigger: 'change' }]
}

const statusOptions = ['正常', '迟到', '早退', '缺勤', '请假', '加班']

const visibleEmployees = computed(() => {
  if (userStore.canAccessAllDepartments) return employees
  if (userStore.isDepartmentManager) {
    return employees.filter(emp => emp.deptId === userStore.deptId)
  }
  if (userStore.isEmployee) {
    return employees.filter(emp => emp.empId === userStore.empId)
  }
  return employees
})

const filteredAttendances = computed(() => {
  return attendances.value.filter(att => {
    const attEmp = employees.find(e => e.empId === att.empId)
    if (!userStore.canAccessAllDepartments) {
      if (userStore.isDepartmentManager && attEmp?.deptId !== userStore.deptId) return false
      if (userStore.isEmployee && att.empId !== userStore.empId) return false
    }
    const matchName = !searchForm.empName || att.empName.includes(searchForm.empName)
    const matchStatus = !searchForm.status || att.status === searchForm.status
    let matchDate = true
    if (searchForm.dateRange && searchForm.dateRange.length === 2) {
      const attDate = new Date(att.attendanceDate)
      matchDate = attDate >= new Date(searchForm.dateRange[0]) && attDate <= new Date(searchForm.dateRange[1])
    }
    return matchName && matchStatus && matchDate
  })
})

const getStatusType = (status) => {
  const types = { '正常': 'success', '迟到': 'warning', '早退': 'warning', '缺勤': 'danger', '请假': 'info', '加班': 'primary' }
  return types[status] || 'info'
}

const canAddAttendance = computed(() => userStore.hasPermission('attendance:record:add'))
const canEditAttendance = computed(() => userStore.hasPermission('attendance:record:edit'))
const canManageAttendance = computed(() => canAddAttendance.value || canEditAttendance.value)

const handleAdd = () => {
  Object.assign(form, { attendanceId: null, empId: '', attendanceDate: '', clockIn: '', clockOut: '', status: '正常', remark: '' })
  dialogVisible.value = true
}

const handleEdit = (row) => {
  Object.assign(form, { ...row })
  dialogVisible.value = true
}

const handleSubmit = async () => {
  if (!formRef.value) return
  await formRef.value.validate((valid) => {
    if (valid) {
      const emp = employees.find(e => e.empId === form.empId)
      if (form.attendanceId) {
        const index = attendances.value.findIndex(a => a.attendanceId === form.attendanceId)
        if (index > -1) {
          attendances.value[index] = { ...form, empName: emp?.empName }
        }
        ElMessage.success('修改成功')
      } else {
        const newId = Math.max(...attendances.value.map(a => a.attendanceId)) + 1
        attendances.value.push({ ...form, attendanceId: newId, empName: emp?.empName })
        ElMessage.success('新增成功')
      }
      dialogVisible.value = false
    }
  })
}

const handleReset = () => {
  Object.assign(searchForm, { empName: '', deptId: '', status: '', dateRange: [] })
}
</script>

<template>
  <div class="attendance-page">
    <!-- 搜索区域 -->
    <el-card shadow="never" class="search-card">
      <el-form :model="searchForm" inline>
        <el-form-item label="员工姓名">
          <el-input v-model="searchForm.empName" placeholder="请输入" clearable style="width: 150px" />
        </el-form-item>
        <el-form-item label="考勤状态">
          <el-select v-model="searchForm.status" placeholder="请选择" clearable style="width: 120px">
            <el-option v-for="s in statusOptions" :key="s" :label="s" :value="s" />
          </el-select>
        </el-form-item>
        <el-form-item label="日期范围">
          <el-date-picker v-model="searchForm.dateRange" type="daterange" range-separator="至" start-placeholder="开始日期" end-placeholder="结束日期" value-format="YYYY-MM-DD" style="width: 240px" />
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
          <span>考勤记录</span>
          <el-button v-if="canAddAttendance" type="primary" @click="handleAdd"><el-icon><Plus /></el-icon>新增记录</el-button>
        </div>
      </template>
      <el-table :data="filteredAttendances" stripe border>
        <el-table-column prop="attendanceId" label="ID" width="70" align="center" />
        <el-table-column prop="empName" label="员工姓名" width="100" />
        <el-table-column prop="attendanceDate" label="考勤日期" width="120" />
        <el-table-column prop="clockIn" label="上班打卡" width="100">
          <template #default="{ row }">{{ row.clockIn || '-' }}</template>
        </el-table-column>
        <el-table-column prop="clockOut" label="下班打卡" width="100">
          <template #default="{ row }">{{ row.clockOut || '-' }}</template>
        </el-table-column>
        <el-table-column prop="status" label="考勤状态" width="100" align="center">
          <template #default="{ row }">
            <el-tag :type="getStatusType(row.status)">{{ row.status }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="remark" label="备注" min-width="150" />
        <el-table-column label="操作" width="100" fixed="right">
          <template #default="{ row }">
            <el-button v-if="canEditAttendance" type="primary" link @click="handleEdit(row)">编辑</el-button>
          </template>
        </el-table-column>
      </el-table>
    </el-card>

    <!-- 新增/编辑对话框 -->
    <el-dialog v-model="dialogVisible" :title="form.attendanceId ? '编辑考勤' : '新增考勤'" width="500px" destroy-on-close>
      <el-form ref="formRef" :model="form" :rules="rules" label-width="80px">
        <el-form-item label="员工" prop="empId">
          <el-select v-model="form.empId" placeholder="请选择员工" style="width: 100%" :disabled="!!form.attendanceId">
            <el-option v-for="emp in visibleEmployees" :key="emp.empId" :label="emp.empName" :value="emp.empId" />
          </el-select>
        </el-form-item>
        <el-form-item label="考勤日期" prop="attendanceDate">
          <el-date-picker v-model="form.attendanceDate" type="date" placeholder="选择日期" value-format="YYYY-MM-DD" style="width: 100%" />
        </el-form-item>
        <el-form-item label="上班打卡" prop="clockIn">
          <el-time-picker v-model="form.clockIn" placeholder="选择时间" format="HH:mm" value-format="HH:mm" style="width: 100%" />
        </el-form-item>
        <el-form-item label="下班打卡" prop="clockOut">
          <el-time-picker v-model="form.clockOut" placeholder="选择时间" format="HH:mm" value-format="HH:mm" style="width: 100%" />
        </el-form-item>
        <el-form-item label="考勤状态" prop="status">
          <el-select v-model="form.status" style="width: 100%">
            <el-option v-for="s in statusOptions" :key="s" :label="s" :value="s" />
          </el-select>
        </el-form-item>
        <el-form-item label="备注" prop="remark">
          <el-input v-model="form.remark" type="textarea" :rows="2" placeholder="请输入备注" />
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
