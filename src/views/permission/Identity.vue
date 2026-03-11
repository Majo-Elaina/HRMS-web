<script setup>
import { computed, onMounted, ref } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { listEmployeesApi, updateEmployeeApi } from '@/api/employee'
import { listDepartmentsApi } from '@/api/department'
import { listPositionsApi } from '@/api/position'
import { listIdentityTagsApi } from '@/api/identityTag'
import { useUserStore } from '@/stores/user'

const userStore = useUserStore()

const loading = ref(false)
const saving = ref(false)
const employees = ref([])
const departments = ref([])
const positions = ref([])
const tagOptions = ref([])
const tagMap = ref({})

const departmentNameMap = computed(() => {
  const map = {}
  departments.value.forEach((item) => {
    map[item.deptId] = item.deptName
  })
  return map
})

const positionNameMap = computed(() => {
  const map = {}
  positions.value.forEach((item) => {
    map[item.positionId] = item.positionName
  })
  return map
})

const getDefaultTag = (employee) => {
  const deptName = departmentNameMap.value[employee.deptId] || ''
  const positionName = positionNameMap.value[employee.positionId] || ''

  if (deptName === '人力资源部') {
    return positionName.includes('经理') ? 'HR_MANAGER' : 'HR_SPECIALIST'
  }
  if (deptName === '财务部') {
    return positionName.includes('经理') ? 'FINANCE_MANAGER' : 'FINANCE_SPECIALIST'
  }
  if (positionName.includes('经理')) {
    return 'MANAGER'
  }
  return 'EMPLOYEE'
}

const rows = computed(() => employees.value.map((employee) => ({
  ...employee,
  deptName: departmentNameMap.value[employee.deptId] || '-',
  positionName: positionNameMap.value[employee.positionId] || '-',
  currentTag: tagMap.value[employee.empId] || getDefaultTag(employee)
})))

const initTagMap = () => {
  const next = {}
  employees.value.forEach((employee) => {
    next[employee.empId] = employee.identityTagCode || getDefaultTag(employee)
  })
  tagMap.value = next
}

const loadPageData = async () => {
  loading.value = true
  try {
    const [employeePage, departmentPage, positionPage, identityTags] = await Promise.all([
      listEmployeesApi({ page: 1, size: 200 }),
      listDepartmentsApi({ page: 1, size: 200 }),
      listPositionsApi({ page: 1, size: 200 }),
      listIdentityTagsApi()
    ])

    employees.value = employeePage.items || []
    departments.value = departmentPage.items || []
    positions.value = positionPage.items || []
    tagOptions.value = identityTags || []
    initTagMap()
  } catch (error) {
    ElMessage.error(error.message || '加载身份标签配置失败')
  } finally {
    loading.value = false
  }
}

const buildEmployeePayload = (employee, identityTagCode) => ({
  empName: employee.empName,
  gender: employee.gender,
  phone: employee.phone,
  email: employee.email,
  idCard: employee.idCard,
  birthday: employee.birthday,
  address: employee.address,
  hireDate: employee.hireDate,
  leaveDate: employee.leaveDate,
  deptId: employee.deptId,
  positionId: employee.positionId,
  identityTagCode,
  status: employee.status
})

const refreshCurrentUserIfNeeded = async (changedEmpIds) => {
  if (userStore.empId && changedEmpIds.includes(userStore.empId)) {
    await userStore.refreshPermissions()
  }
}

const handleSave = async () => {
  const changedRows = employees.value.filter((employee) => {
    const nextTag = tagMap.value[employee.empId] || getDefaultTag(employee)
    return nextTag !== (employee.identityTagCode || '')
  })

  if (!changedRows.length) {
    ElMessage.info('没有需要保存的变更')
    return
  }

  saving.value = true
  try {
    await Promise.all(changedRows.map((employee) => {
      const identityTagCode = tagMap.value[employee.empId] || getDefaultTag(employee)
      return updateEmployeeApi(employee.empId, buildEmployeePayload(employee, identityTagCode))
    }))
    await refreshCurrentUserIfNeeded(changedRows.map((item) => item.empId))
    await loadPageData()
    ElMessage.success('身份标签已保存')
  } catch (error) {
    ElMessage.error(error.message || '保存身份标签失败')
  } finally {
    saving.value = false
  }
}

const handleReset = () => {
  ElMessageBox.confirm('确定恢复为系统默认身份标签吗？这会覆盖当前页面配置。', '提示', {
    confirmButtonText: '确定',
    cancelButtonText: '取消',
    type: 'warning'
  }).then(async () => {
    saving.value = true
    try {
      await Promise.all(employees.value.map((employee) => (
        updateEmployeeApi(employee.empId, buildEmployeePayload(employee, getDefaultTag(employee)))
      )))
      await refreshCurrentUserIfNeeded(employees.value.map((item) => item.empId))
      await loadPageData()
      ElMessage.success('已恢复默认身份标签')
    } catch (error) {
      ElMessage.error(error.message || '恢复默认身份标签失败')
    } finally {
      saving.value = false
    }
  }).catch(() => {})
}

onMounted(loadPageData)
</script>

<template>
  <div class="identity-page" v-loading="loading || saving">
    <el-card shadow="never">
      <template #header>
        <div class="card-header">
          <span>身份标签配置</span>
          <div class="header-actions">
            <el-button type="info" @click="handleReset">
              <el-icon><Refresh /></el-icon>
              恢复默认
            </el-button>
            <el-button type="primary" @click="handleSave">
              <el-icon><Check /></el-icon>
              保存配置
            </el-button>
          </div>
        </div>
      </template>

      <el-table :data="rows" stripe border>
        <el-table-column prop="empId" label="员工ID" width="90" align="center" />
        <el-table-column prop="empName" label="员工姓名" width="120" />
        <el-table-column prop="deptName" label="所属部门" width="160" />
        <el-table-column prop="positionName" label="职位" width="160" />
        <el-table-column label="身份标签" min-width="180">
          <template #default="{ row }">
            <el-select v-model="tagMap[row.empId]" placeholder="请选择身份标签" style="width: 180px">
              <el-option
                v-for="option in tagOptions"
                :key="option.tagCode"
                :label="option.tagName"
                :value="option.tagCode"
              />
            </el-select>
          </template>
        </el-table-column>
      </el-table>
    </el-card>
  </div>
</template>

<style scoped>
.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.header-actions {
  display: flex;
  gap: 10px;
}
</style>
