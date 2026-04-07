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
    <!-- 页面头部 -->
    <div class="page-header">
      <div class="header-content">
        <div class="header-info">
          <h1 class="page-title">员工管理</h1>
          <p class="page-description">管理企业员工信息，包括基本资料、部门职位分配和状态维护</p>
        </div>
        <div class="header-actions">
          <el-button v-if="canAddEmployee" type="primary" size="large" @click="handleAdd">
            <el-icon><Plus /></el-icon>
            新增员工
          </el-button>
        </div>
      </div>
    </div>

    <!-- 统计卡片 -->
    <div class="stats-grid">
      <div class="stat-card">
        <div class="stat-icon total">
          <el-icon><User /></el-icon>
        </div>
        <div class="stat-content">
          <div class="stat-value">{{ filteredEmployees.length }}</div>
          <div class="stat-label">员工总数</div>
        </div>
      </div>
      <div class="stat-card">
        <div class="stat-icon active">
          <el-icon><Check /></el-icon>
        </div>
        <div class="stat-content">
          <div class="stat-value">{{ filteredEmployees.filter(e => e.status === '在职').length }}</div>
          <div class="stat-label">在职员工</div>
        </div>
      </div>
      <div class="stat-card">
        <div class="stat-icon trial">
          <el-icon><Clock /></el-icon>
        </div>
        <div class="stat-content">
          <div class="stat-value">{{ filteredEmployees.filter(e => e.status === '试用').length }}</div>
          <div class="stat-label">试用期员工</div>
        </div>
      </div>
      <div class="stat-card">
        <div class="stat-icon departments">
          <el-icon><OfficeBuilding /></el-icon>
        </div>
        <div class="stat-content">
          <div class="stat-value">{{ visibleDepartments.length }}</div>
          <div class="stat-label">部门数量</div>
        </div>
      </div>
    </div>

    <!-- 搜索区域 -->
    <div class="main-content">
      <el-card shadow="never" class="search-card">
        <template #header>
          <div class="search-header">
            <el-icon class="search-icon"><Search /></el-icon>
            <span class="search-title">筛选条件</span>
          </div>
        </template>
        <el-form :model="searchForm" inline class="search-form">
          <el-form-item label="关键字">
            <el-input
              v-model="searchForm.keyword"
              placeholder="姓名/手机号/邮箱"
              clearable
              style="width: 220px"
              prefix-icon="Search"
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
            <el-button type="primary" size="large">
              <el-icon><Search /></el-icon>
              搜索
            </el-button>
            <el-button size="large" @click="handleReset">
              <el-icon><Refresh /></el-icon>
              重置
            </el-button>
          </el-form-item>
        </el-form>
      </el-card>

      <!-- 员工列表 -->
      <el-card shadow="never" class="table-card">
        <template #header>
          <div class="table-header">
            <div class="header-left">
              <el-icon class="header-icon"><UserFilled /></el-icon>
              <span class="header-title">员工列表</span>
            </div>
            <div class="header-right">
              <el-tag type="info" size="small">共 {{ filteredEmployees.length }} 名员工</el-tag>
            </div>
          </div>
        </template>

        <el-table :data="filteredEmployees" class="employee-table desktop-table" size="large">
          <el-table-column prop="empId" label="ID" width="80" align="center">
            <template #default="{ row }">
              <div class="emp-id">#{{ row.empId }}</div>
            </template>
          </el-table-column>
          
          <el-table-column label="员工信息" width="200">
            <template #default="{ row }">
              <div class="employee-info">
                <div class="emp-avatar">
                  <el-avatar :size="40" icon="UserFilled" />
                </div>
                <div class="emp-details">
                  <div class="emp-name">{{ row.empName }}</div>
                  <div class="emp-meta">{{ row.gender }} · {{ row.phone }}</div>
                </div>
              </div>
            </template>
          </el-table-column>

          <el-table-column label="部门职位" width="280">
            <template #default="{ row }">
              <div class="dept-position">
                <div class="dept-info">
                  <el-icon class="dept-icon"><OfficeBuilding /></el-icon>
                  <span>{{ getDeptName(row.deptId) }}</span>
                </div>
                <div class="position-info">
                  <el-icon class="position-icon"><Briefcase /></el-icon>
                  <span>{{ getPositionName(row.positionId) }}</span>
                </div>
              </div>
            </template>
          </el-table-column>

          <el-table-column prop="email" label="邮箱" min-width="180" />
          
          <el-table-column prop="hireDate" label="入职日期" width="120" align="center">
            <template #default="{ row }">
              <div class="hire-date">{{ row.hireDate }}</div>
            </template>
          </el-table-column>
          
          <el-table-column label="状态" width="100" align="center" fixed="right" class-name="status-column">
            <template #default="{ row }">
              <el-tag 
                :type="row.status === '在职' ? 'success' : row.status === '试用' ? 'warning' : 'info'" 
                size="large"
                effect="dark"
                round
              >
                {{ row.status }}
              </el-tag>
            </template>
          </el-table-column>
          
          <el-table-column label="操作" width="160" fixed="right" align="center" class-name="action-column">
            <template #default="{ row }">
              <div class="action-buttons">
                <el-button v-if="canEditEmployee" type="primary" link size="small" @click="handleEdit(row)">
                  <el-icon><Edit /></el-icon>
                  编辑
                </el-button>
                <el-button v-if="canDeleteEmployee" type="danger" link size="small" @click="handleDelete(row)">
                  <el-icon><Delete /></el-icon>
                  删除
                </el-button>
              </div>
            </template>
          </el-table-column>
        </el-table>

        <div class="employee-mobile-list">
          <div v-for="row in filteredEmployees" :key="row.empId" class="employee-mobile-card">
            <div class="mobile-card-top">
              <div class="employee-info">
                <div class="emp-avatar">
                  <el-avatar :size="42" icon="UserFilled" />
                </div>
                <div class="emp-details">
                  <div class="emp-name">{{ row.empName }}</div>
                  <div class="emp-meta">#{{ row.empId }} · {{ row.gender }} · {{ row.phone }}</div>
                </div>
              </div>
              <el-tag
                :type="row.status === '鍦ㄨ亴' ? 'success' : row.status === '璇曠敤' ? 'warning' : 'info'"
                round
              >
                {{ row.status }}
              </el-tag>
            </div>

            <div class="mobile-card-grid">
              <div class="mobile-item">
                <span>部门</span>
                <strong>{{ getDeptName(row.deptId) }}</strong>
              </div>
              <div class="mobile-item">
                <span>职位</span>
                <strong>{{ getPositionName(row.positionId) }}</strong>
              </div>
              <div class="mobile-item mobile-item-wide">
                <span>邮箱</span>
                <strong>{{ row.email || '-' }}</strong>
              </div>
              <div class="mobile-item">
                <span>入职日期</span>
                <strong>{{ row.hireDate }}</strong>
              </div>
            </div>

            <div class="mobile-card-actions">
              <el-button v-if="canEditEmployee" type="primary" plain @click="handleEdit(row)">编辑</el-button>
              <el-button v-if="canDeleteEmployee" type="danger" plain @click="handleDelete(row)">删除</el-button>
            </div>
          </div>
        </div>
      </el-card>
    </div>

    <!-- 新增/编辑对话框 -->
    <el-dialog v-model="dialogVisible" :title="dialogTitle" width="700px" destroy-on-close class="employee-dialog">
      <el-form ref="formRef" :model="form" :rules="rules" label-width="90px" class="employee-form">
        <el-row :gutter="20">
          <el-col :span="12">
            <el-form-item label="姓名" prop="empName">
              <el-input v-model="form.empName" placeholder="请输入姓名" size="large" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="性别" prop="gender">
              <el-radio-group v-model="form.gender" size="large">
                <el-radio value="男">男</el-radio>
                <el-radio value="女">女</el-radio>
              </el-radio-group>
            </el-form-item>
          </el-col>
        </el-row>
        <el-row :gutter="20">
          <el-col :span="12">
            <el-form-item label="联系电话" prop="phone">
              <el-input v-model="form.phone" placeholder="请输入手机号" size="large" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="邮箱" prop="email">
              <el-input v-model="form.email" placeholder="请输入邮箱" size="large" />
            </el-form-item>
          </el-col>
        </el-row>
        <el-row :gutter="20">
          <el-col :span="12">
            <el-form-item label="部门" prop="deptId">
              <el-select v-model="form.deptId" placeholder="请选择部门" style="width: 100%" size="large" @change="form.positionId = ''">
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
              <el-select v-model="form.positionId" placeholder="请选择职位" style="width: 100%" size="large">
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
                size="large"
              />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="状态" prop="status">
              <el-select v-model="form.status" style="width: 100%" size="large">
                <el-option label="在职" value="在职" />
                <el-option label="离职" value="离职" />
                <el-option label="试用" value="试用" />
              </el-select>
            </el-form-item>
          </el-col>
        </el-row>
      </el-form>
      <template #footer>
        <div class="dialog-footer">
          <el-button size="large" @click="dialogVisible = false">取消</el-button>
          <el-button type="primary" size="large" @click="handleSubmit">确定</el-button>
        </div>
      </template>
    </el-dialog>
  </div>
</template>

<style scoped>
.employee-page {
  padding: 0;
  background: #f8fafc;
  min-height: 100vh;
}

.page-header {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  padding: 32px;
  margin-bottom: 24px;
  border-radius: 0 0 24px 24px;
}

.header-content {
  display: flex;
  justify-content: space-between;
  align-items: center;
  max-width: 1200px;
  margin: 0 auto;
}

.header-info h1 {
  margin: 0 0 8px 0;
  font-size: 28px;
  font-weight: 700;
}

.page-description {
  margin: 0;
  opacity: 0.9;
  font-size: 16px;
  line-height: 1.5;
}

.header-actions {
  display: flex;
  gap: 12px;
}

.stats-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 20px;
  margin: 0 32px 24px;
  max-width: 1200px;
  margin-left: auto;
  margin-right: auto;
}

.stat-card {
  background: white;
  padding: 24px;
  border-radius: 16px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05);
  display: flex;
  align-items: center;
  gap: 16px;
  transition: all 0.3s ease;
}

.stat-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.1);
}

.stat-icon {
  width: 48px;
  height: 48px;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 20px;
  color: white;
}

.stat-icon.total {
  background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%);
}

.stat-icon.active {
  background: linear-gradient(135deg, #10b981 0%, #059669 100%);
}

.stat-icon.trial {
  background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%);
}

.stat-icon.departments {
  background: linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%);
}

.stat-value {
  font-size: 24px;
  font-weight: 700;
  color: #1f2937;
  line-height: 1;
}

.stat-label {
  font-size: 14px;
  color: #6b7280;
  margin-top: 4px;
}

.main-content {
  max-width: 1200px;
  margin: 0 auto;
  padding: 0 32px;
}

.search-card {
  border-radius: 16px;
  overflow: hidden;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05);
  margin-bottom: 24px;
}

.search-header {
  display: flex;
  align-items: center;
  gap: 12px;
}

.search-icon {
  font-size: 20px;
  color: #667eea;
}

.search-title {
  font-size: 18px;
  font-weight: 600;
  color: #1f2937;
}

.search-form {
  padding: 8px 0;
}

.search-form :deep(.el-form-item) {
  margin-bottom: 16px;
}

.search-form :deep(.el-input__wrapper) {
  border-radius: 8px;
  border: 2px solid #e5e7eb;
  transition: all 0.2s ease;
}

.search-form :deep(.el-input__wrapper:hover) {
  border-color: #667eea;
}

.search-form :deep(.el-input__wrapper.is-focus) {
  border-color: #667eea;
  box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.1);
}

.table-card {
  border-radius: 16px;
  overflow: hidden;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05);
}

.table-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.header-left {
  display: flex;
  align-items: center;
  gap: 12px;
}

.header-icon {
  font-size: 20px;
  color: #667eea;
}

.header-title {
  font-size: 18px;
  font-weight: 600;
  color: #1f2937;
}

.employee-table {
  border-radius: 12px;
  overflow: hidden;
}

.employee-mobile-list {
  display: none;
}

.employee-mobile-card {
  padding: 16px;
  border-radius: 18px;
  background: linear-gradient(180deg, #ffffff 0%, #f8fbff 100%);
  border: 1px solid rgba(226, 232, 240, 0.9);
  box-shadow: 0 10px 24px rgba(15, 23, 42, 0.06);
}

.mobile-card-top {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 14px;
}

.mobile-card-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 10px;
}

.mobile-item {
  display: flex;
  flex-direction: column;
  gap: 4px;
  padding: 12px;
  border-radius: 14px;
  background: #f8fafc;
}

.mobile-item span {
  font-size: 12px;
  color: #64748b;
}

.mobile-item strong {
  font-size: 13px;
  line-height: 1.5;
  color: #0f172a;
  word-break: break-all;
}

.mobile-item-wide {
  grid-column: 1 / -1;
}

.mobile-card-actions {
  display: flex;
  gap: 10px;
  margin-top: 14px;
}

.mobile-card-actions .el-button {
  flex: 1;
}

.employee-table :deep(.el-table__header) {
  background: #f8fafc;
}

.employee-table :deep(.el-table__row) {
  transition: all 0.2s ease;
}

.employee-table :deep(.el-table__row:hover) {
  background: #f1f5f9;
}

.emp-id {
  font-family: 'Courier New', monospace;
  font-weight: 600;
  color: #6b7280;
  font-size: 12px;
}

.employee-info {
  display: flex;
  align-items: center;
  gap: 12px;
}

.emp-details {
  flex: 1;
}

.emp-name {
  font-weight: 600;
  color: #1f2937;
  font-size: 14px;
}

.emp-meta {
  font-size: 12px;
  color: #6b7280;
  margin-top: 2px;
}

.dept-position {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.dept-info, .position-info {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 14px;
}

.dept-icon {
  color: #3b82f6;
  font-size: 16px;
}

.position-icon {
  color: #10b981;
  font-size: 16px;
}

.hire-date {
  font-size: 13px;
  color: #6b7280;
}

.action-buttons {
  display: flex;
  gap: 8px;
  justify-content: center;
  align-items: center;
  flex-wrap: nowrap;
}

.status-column {
  border-right: 1px solid var(--el-table-border-color);
}

.action-column {
  border-left: 1px solid var(--el-table-border-color);
}

.employee-dialog :deep(.el-dialog__header) {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  padding: 20px 24px;
  margin: 0;
}

.employee-dialog :deep(.el-dialog__title) {
  color: white;
  font-weight: 600;
}

.employee-dialog :deep(.el-dialog__headerbtn .el-dialog__close) {
  color: white;
}

.employee-form {
  padding: 24px;
}

.employee-form :deep(.el-form-item__label) {
  font-weight: 600;
  color: #374151;
}

.employee-form :deep(.el-input__wrapper) {
  border-radius: 8px;
  border: 2px solid #e5e7eb;
  transition: all 0.2s ease;
}

.employee-form :deep(.el-input__wrapper:hover) {
  border-color: #667eea;
}

.employee-form :deep(.el-input__wrapper.is-focus) {
  border-color: #667eea;
  box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.1);
}

.dialog-footer {
  padding: 0 24px 24px;
  display: flex;
  justify-content: flex-end;
  gap: 12px;
}

@media (max-width: 1024px) {
  .stats-grid {
    grid-template-columns: repeat(2, 1fr);
  }
  
  .header-content {
    flex-direction: column;
    gap: 20px;
    text-align: center;
  }
}

@media (max-width: 768px) {
  .stats-grid {
    grid-template-columns: 1fr;
    margin: 0 16px 24px;
  }
  
  .main-content {
    padding: 0 16px;
  }
  
  .page-header {
    padding: 24px 16px;
  }
  
  .search-form {
    flex-direction: column;
  }
  
  .search-form :deep(.el-form-item) {
    width: 100%;
  }

  .header-actions,
  .table-header,
  .header-left,
  .header-right {
    width: 100%;
  }

  .header-actions .el-button,
  .header-right .el-tag {
    width: 100%;
    justify-content: center;
  }

  .page-title {
    font-size: 24px;
  }

  .page-description {
    font-size: 14px;
  }

  .desktop-table {
    display: none;
  }

  .employee-mobile-list {
    display: flex;
    flex-direction: column;
    gap: 14px;
  }

  .employee-form {
    padding: 0;
  }

  .employee-dialog :deep(.el-row) {
    margin-left: 0 !important;
    margin-right: 0 !important;
  }

  .employee-dialog :deep(.el-col) {
    max-width: 100%;
    flex: 0 0 100%;
    padding-left: 0 !important;
    padding-right: 0 !important;
  }

  .dialog-footer {
    padding: 0;
    flex-direction: column-reverse;
  }

  .dialog-footer .el-button {
    width: 100%;
  }
}
</style>
