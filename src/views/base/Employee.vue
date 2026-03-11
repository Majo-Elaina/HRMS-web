<script setup>
import { computed, onMounted, reactive, ref } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { useUserStore } from '@/stores/user'
import { createEmployeeApi, deleteEmployeeApi, listEmployeesApi, updateEmployeeApi } from '@/api/employee'
import { listDepartmentsApi } from '@/api/department'
import { listPositionsApi } from '@/api/position'

const userStore = useUserStore()

const loading = ref(false)
const employees = ref([])
const departments = ref([])
const positions = ref([])
const dialogVisible = ref(false)
const dialogTitle = ref('新增员工')
const formRef = ref(null)

const searchForm = reactive({
  keyword: '',
  deptId: '',
  status: ''
})

const form = reactive({
  empId: null,
  empName: '',
  gender: '男',
  phone: '',
  email: '',
  hireDate: '',
  deptId: '',
  positionId: '',
  status: '在职'
})

const rules = {
  empName: [{ required: true, message: '请输入员工姓名', trigger: 'blur' }],
  gender: [{ required: true, message: '请选择性别', trigger: 'change' }],
  phone: [{ required: true, message: '请输入联系电话', trigger: 'blur' }],
  hireDate: [{ required: true, message: '请选择入职日期', trigger: 'change' }],
  deptId: [{ required: true, message: '请选择部门', trigger: 'change' }],
  positionId: [{ required: true, message: '请选择职位', trigger: 'change' }]
}

const employeeScope = computed(() => userStore.getModuleScope('base:employee'))
const departmentScope = computed(() => userStore.getModuleScope('base:department'))

const filterEmployeesByScope = (list, scopeValue) => {
  if (scopeValue === 'company') return list
  if (scopeValue === 'dept') return list.filter(item => item.deptId === userStore.deptId)
  if (scopeValue === 'self') return list.filter(item => item.empId === userStore.empId)
  return list
}

const filterDepartmentsByScope = (list, scopeValue) => {
  if (scopeValue === 'company') return list
  if (scopeValue === 'dept' || scopeValue === 'self') {
    return list.filter(item => item.deptId === userStore.deptId)
  }
  return list
}

const visibleDepartments = computed(() => filterDepartmentsByScope(departments.value, departmentScope.value))
const visibleEmployees = computed(() => filterEmployeesByScope(employees.value, employeeScope.value))

const filteredEmployees = computed(() => {
  return visibleEmployees.value.filter(emp => {
    const keyword = searchForm.keyword.trim()
    const matchKeyword = !keyword ||
      emp.empName?.includes(keyword) ||
      emp.phone?.includes(keyword) ||
      emp.email?.includes(keyword)
    const matchDept = !searchForm.deptId || emp.deptId === searchForm.deptId
    const matchStatus = !searchForm.status || emp.status === searchForm.status
    return matchKeyword && matchDept && matchStatus
  })
})

const filteredPositions = computed(() => {
  if (!form.deptId) return positions.value
  return positions.value.filter(item => item.deptId === form.deptId)
})

const canAddEmployee = computed(() => userStore.hasPermission('base:employee:add'))
const canEditEmployee = computed(() => userStore.hasPermission('base:employee:edit'))
const canDeleteEmployee = computed(() => userStore.hasPermission('base:employee:delete'))

const getDeptName = (deptId) => departments.value.find(item => item.deptId === deptId)?.deptName || '-'
const getPositionName = (positionId) => positions.value.find(item => item.positionId === positionId)?.positionName || '-'

const resetForm = () => {
  Object.assign(form, {
    empId: null,
    empName: '',
    gender: '男',
    phone: '',
    email: '',
    hireDate: '',
    deptId: '',
    positionId: '',
    status: '在职'
  })
}

const normalizeEmployeePayload = () => ({
  empName: form.empName,
  gender: form.gender,
  phone: form.phone,
  email: form.email,
  hireDate: form.hireDate,
  deptId: form.deptId,
  positionId: form.positionId,
  status: form.status
})

const loadPageData = async () => {
  loading.value = true
  try {
    const [employeePage, departmentPage, positionPage] = await Promise.all([
      listEmployeesApi({ page: 1, size: 200 }),
      listDepartmentsApi({ page: 1, size: 200 }),
      listPositionsApi({ page: 1, size: 200 })
    ])
    employees.value = employeePage.items || []
    departments.value = departmentPage.items || []
    positions.value = positionPage.items || []
  } catch (error) {
    ElMessage.error(error.message || '员工数据加载失败')
  } finally {
    loading.value = false
  }
}

const handleAdd = () => {
  dialogTitle.value = '新增员工'
  resetForm()
  dialogVisible.value = true
}

const handleEdit = (row) => {
  dialogTitle.value = '编辑员工'
  Object.assign(form, {
    empId: row.empId,
    empName: row.empName,
    gender: row.gender,
    phone: row.phone,
    email: row.email,
    hireDate: row.hireDate,
    deptId: row.deptId,
    positionId: row.positionId,
    status: row.status
  })
  dialogVisible.value = true
}

const handleDelete = (row) => {
  ElMessageBox.confirm(`确定要删除员工“${row.empName}”吗？`, '提示', {
    confirmButtonText: '确定',
    cancelButtonText: '取消',
    type: 'warning'
  }).then(async () => {
    try {
      await deleteEmployeeApi(row.empId)
      await loadPageData()
      ElMessage.success('删除成功')
    } catch (error) {
      ElMessage.error(error.message || '删除失败')
    }
  }).catch(() => {})
}

const handleSubmit = async () => {
  if (!formRef.value) return
  const valid = await formRef.value.validate().catch(() => false)
  if (!valid) return

  try {
    if (form.empId) {
      await updateEmployeeApi(form.empId, normalizeEmployeePayload())
      ElMessage.success('修改成功')
    } else {
      await createEmployeeApi(normalizeEmployeePayload())
      ElMessage.success('新增成功')
    }
    dialogVisible.value = false
    await loadPageData()
  } catch (error) {
    ElMessage.error(error.message || '保存失败')
  }
}

const handleReset = () => {
  Object.assign(searchForm, { keyword: '', deptId: '', status: '' })
}

onMounted(loadPageData)
</script>

<template>
  <div class="employee-page" v-loading="loading">
    <el-card shadow="never" class="search-card">
      <el-form :model="searchForm" inline>
        <el-form-item label="关键字">
          <el-input
            v-model="searchForm.keyword"
            placeholder="姓名/手机号/邮箱"
            clearable
            style="width: 220px"
          />
        </el-form-item>
        <el-form-item label="部门">
          <el-select v-model="searchForm.deptId" placeholder="请选择" clearable style="width: 150px">
            <el-option
              v-for="dept in visibleDepartments"
              :key="dept.deptId"
              :label="dept.deptName"
              :value="dept.deptId"
            />
          </el-select>
        </el-form-item>
        <el-form-item label="状态">
          <el-select v-model="searchForm.status" placeholder="请选择" clearable style="width: 120px">
            <el-option label="在职" value="在职" />
            <el-option label="离职" value="离职" />
            <el-option label="试用" value="试用" />
          </el-select>
        </el-form-item>
        <el-form-item>
          <el-button type="primary">
            <el-icon><Search /></el-icon>
            搜索
          </el-button>
          <el-button @click="handleReset">
            <el-icon><Refresh /></el-icon>
            重置
          </el-button>
        </el-form-item>
      </el-form>
    </el-card>

    <el-card shadow="never">
      <template #header>
        <div class="card-header">
          <span>员工列表</span>
          <el-button v-if="canAddEmployee" type="primary" @click="handleAdd">
            <el-icon><Plus /></el-icon>
            新增员工
          </el-button>
        </div>
      </template>

      <el-table :data="filteredEmployees" stripe border>
        <el-table-column prop="empId" label="员工编号" width="100" align="center" />
        <el-table-column prop="empName" label="姓名" width="110" />
        <el-table-column prop="gender" label="性别" width="80" align="center" />
        <el-table-column prop="phone" label="联系电话" width="140" />
        <el-table-column prop="email" label="邮箱" min-width="180" />
        <el-table-column label="部门" width="130">
          <template #default="{ row }">{{ getDeptName(row.deptId) }}</template>
        </el-table-column>
        <el-table-column label="职位" width="130">
          <template #default="{ row }">{{ getPositionName(row.positionId) }}</template>
        </el-table-column>
        <el-table-column prop="hireDate" label="入职日期" width="120" />
        <el-table-column prop="status" label="状态" width="90" align="center">
          <template #default="{ row }">
            <el-tag :type="row.status === '在职' ? 'success' : row.status === '试用' ? 'warning' : 'info'">
              {{ row.status }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="操作" width="160" fixed="right">
          <template #default="{ row }">
            <el-button v-if="canEditEmployee" type="primary" link @click="handleEdit(row)">编辑</el-button>
            <el-button v-if="canDeleteEmployee" type="danger" link @click="handleDelete(row)">删除</el-button>
          </template>
        </el-table-column>
      </el-table>
    </el-card>

    <el-dialog v-model="dialogVisible" :title="dialogTitle" width="600px" destroy-on-close>
      <el-form ref="formRef" :model="form" :rules="rules" label-width="80px">
        <el-row :gutter="20">
          <el-col :span="12">
            <el-form-item label="姓名" prop="empName">
              <el-input v-model="form.empName" placeholder="请输入姓名" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="性别" prop="gender">
              <el-radio-group v-model="form.gender">
                <el-radio value="男">男</el-radio>
                <el-radio value="女">女</el-radio>
              </el-radio-group>
            </el-form-item>
          </el-col>
        </el-row>
        <el-row :gutter="20">
          <el-col :span="12">
            <el-form-item label="联系电话" prop="phone">
              <el-input v-model="form.phone" placeholder="请输入手机号" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="邮箱" prop="email">
              <el-input v-model="form.email" placeholder="请输入邮箱" />
            </el-form-item>
          </el-col>
        </el-row>
        <el-row :gutter="20">
          <el-col :span="12">
            <el-form-item label="部门" prop="deptId">
              <el-select v-model="form.deptId" placeholder="请选择部门" style="width: 100%" @change="form.positionId = ''">
                <el-option
                  v-for="dept in visibleDepartments"
                  :key="dept.deptId"
                  :label="dept.deptName"
                  :value="dept.deptId"
                />
              </el-select>
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="职位" prop="positionId">
              <el-select v-model="form.positionId" placeholder="请选择职位" style="width: 100%">
                <el-option
                  v-for="item in filteredPositions"
                  :key="item.positionId"
                  :label="item.positionName"
                  :value="item.positionId"
                />
              </el-select>
            </el-form-item>
          </el-col>
        </el-row>
        <el-row :gutter="20">
          <el-col :span="12">
            <el-form-item label="入职日期" prop="hireDate">
              <el-date-picker
                v-model="form.hireDate"
                type="date"
                placeholder="选择日期"
                value-format="YYYY-MM-DD"
                style="width: 100%"
              />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="状态" prop="status">
              <el-select v-model="form.status" style="width: 100%">
                <el-option label="在职" value="在职" />
                <el-option label="离职" value="离职" />
                <el-option label="试用" value="试用" />
              </el-select>
            </el-form-item>
          </el-col>
        </el-row>
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
