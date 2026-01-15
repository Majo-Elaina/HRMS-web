<script setup>
import { ref, computed, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { employees, departments, positions } from '@/mock'
import { useUserStore, IDENTITY_TAG_OPTIONS } from '@/stores/user'

const userStore = useUserStore()
const tagOptions = IDENTITY_TAG_OPTIONS

const tagMap = ref({})

const getDeptName = (deptId) => departments.find(d => d.deptId === deptId)?.deptName || '-'
const getPositionName = (positionId) => positions.find(p => p.positionId === positionId)?.positionName || '-'

const getDefaultTag = (emp) => {
  const deptName = getDeptName(emp.deptId)
  const positionName = getPositionName(emp.positionId)
  const roleCode = positionName.includes('经理') ? 'MANAGER' : 'EMPLOYEE'
  return userStore.getIdentityTagByEmpId(emp.empId, { roleCode, deptName, positionName })
}

const initTagMap = () => {
  const stored = userStore.getIdentityTags()
  const next = {}
  employees.forEach(emp => {
    next[emp.empId] = stored[emp.empId] || getDefaultTag(emp)
  })
  tagMap.value = next
}

const rows = computed(() => {
  return employees.map(emp => ({
    ...emp,
    deptName: getDeptName(emp.deptId),
    positionName: getPositionName(emp.positionId),
    tag: tagMap.value[emp.empId] || getDefaultTag(emp)
  }))
})

const handleSave = () => {
  const payload = {}
  Object.keys(tagMap.value).forEach(key => {
    payload[key] = tagMap.value[key]
  })
  userStore.saveIdentityTags(payload)
  ElMessage.success('身份标签已保存')
}

const handleReset = () => {
  ElMessageBox.confirm('确定要恢复默认身份标签吗？将覆盖当前设置。', '提示', {
    confirmButtonText: '确定',
    cancelButtonText: '取消',
    type: 'warning'
  }).then(() => {
    userStore.saveIdentityTags({})
    initTagMap()
    ElMessage.success('已恢复默认')
  }).catch(() => {})
}

onMounted(() => {
  initTagMap()
})
</script>

<template>
  <div class="identity-page">
    <el-card shadow="never">
      <template #header>
        <div class="card-header">
          <span>身份标签配置</span>
          <div class="header-actions">
            <el-button type="info" @click="handleReset"><el-icon><Refresh /></el-icon>恢复默认</el-button>
            <el-button type="primary" @click="handleSave"><el-icon><Check /></el-icon>保存配置</el-button>
          </div>
        </div>
      </template>
      <el-table :data="rows" stripe border>
        <el-table-column prop="empId" label="员工ID" width="90" align="center" />
        <el-table-column prop="empName" label="员工姓名" width="110" />
        <el-table-column prop="deptName" label="所属部门" width="140" />
        <el-table-column prop="positionName" label="职位" width="140" />
        <el-table-column label="身份标签" min-width="160">
          <template #default="{ row }">
            <el-select v-model="tagMap[row.empId]" placeholder="选择标签" style="width: 160px">
              <el-option v-for="opt in tagOptions" :key="opt.value" :label="opt.label" :value="opt.value" />
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
