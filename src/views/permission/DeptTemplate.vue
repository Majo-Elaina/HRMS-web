<script setup>
import { ref, reactive } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { departments } from '@/mock'
import { useUserStore } from '@/stores/user'

const STORAGE_KEY = 'dept_permissions'
const DEFAULT_TEMPLATES = {
  '人力资源部': ['dashboard', 'base', 'attendance', 'report', 'salary:record'],
  '财务部': ['dashboard', 'salary', 'report'],
  '_default': ['dashboard', 'attendance', 'salary:record']
}

const loadTemplates = () => {
  const stored = localStorage.getItem(STORAGE_KEY)
  if (!stored) return { ...DEFAULT_TEMPLATES }
  try {
    const parsed = JSON.parse(stored)
    return parsed && typeof parsed === 'object' ? parsed : { ...DEFAULT_TEMPLATES }
  } catch {
    return { ...DEFAULT_TEMPLATES }
  }
}

const userStore = useUserStore()
const templates = ref(loadTemplates())
const dialogVisible = ref(false)
const formRef = ref(null)

const form = reactive({
  deptName: '',
  modules: []
})

const moduleOptions = [
  { label: '首页', value: 'dashboard' },
  { label: '基础信息', value: 'base' },
  { label: '考勤管理', value: 'attendance' },
  { label: '薪资记录', value: 'salary:record' },
  { label: '薪资配置', value: 'salary:config' },
  { label: '数据报表', value: 'report' }
]

const moduleLabelMap = moduleOptions.reduce((acc, item) => {
  acc[item.value] = item.label
  return acc
}, {})

const deptOptions = departments.map(d => d.deptName)

const handleEdit = (deptName) => {
  form.deptName = deptName
  form.modules = [...(templates.value[deptName] || [])]
  dialogVisible.value = true
}

const handleAdd = () => {
  form.deptName = ''
  form.modules = []
  dialogVisible.value = true
}

const handleSave = () => {
  if (!form.deptName) {
    ElMessage.warning('请选择部门')
    return
  }
  templates.value[form.deptName] = [...form.modules]
  localStorage.setItem(STORAGE_KEY, JSON.stringify(templates.value))
  userStore.refreshPermissions()
  ElMessage.success('保存成功')
  dialogVisible.value = false
}

const handleResetDefault = () => {
  ElMessageBox.confirm('确定要恢复默认权限吗？将覆盖当前设置。', '提示', {
    confirmButtonText: '确定',
    cancelButtonText: '取消',
    type: 'warning'
  }).then(() => {
    templates.value = { ...DEFAULT_TEMPLATES }
    localStorage.setItem(STORAGE_KEY, JSON.stringify(templates.value))
    userStore.refreshPermissions()
    ElMessage.success('已恢复默认权限')
  }).catch(() => {})
}
</script>

<template>
  <div class="dept-template-page">
    <el-card shadow="never">
      <template #header>
        <div class="card-header">
          <span>部门权限</span>
          <div class="header-actions">
            <el-button type="info" @click="handleResetDefault"><el-icon><Refresh /></el-icon>恢复默认</el-button>
            <el-button type="primary" @click="handleAdd"><el-icon><Plus /></el-icon>新增权限</el-button>
          </div>
        </div>
      </template>
      <el-table :data="deptOptions" stripe border>
        <el-table-column label="部门名称" width="200">
          <template #default="{ row }">{{ row }}</template>
        </el-table-column>
        <el-table-column label="可见模块" min-width="300">
          <template #default="{ row }">
            <el-tag v-for="m in (templates[row] || [])" :key="m" class="module-tag">{{ moduleLabelMap[m] || m }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column label="操作" width="120" fixed="right">
          <template #default="{ row }">
            <el-button type="primary" link @click="handleEdit(row)">编辑</el-button>
          </template>
        </el-table-column>
      </el-table>
    </el-card>

    <el-dialog v-model="dialogVisible" title="编辑部门权限" width="520px" destroy-on-close>
      <el-form ref="formRef" :model="form" label-width="80px">
        <el-form-item label="部门">
          <el-select v-model="form.deptName" placeholder="请选择部门" style="width: 100%">
            <el-option v-for="d in deptOptions" :key="d" :label="d" :value="d" />
          </el-select>
        </el-form-item>
        <el-form-item label="模块">
          <el-checkbox-group v-model="form.modules">
            <el-checkbox v-for="m in moduleOptions" :key="m.value" :label="m.value">{{ m.label }}</el-checkbox>
          </el-checkbox-group>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="dialogVisible = false">取消</el-button>
        <el-button type="primary" @click="handleSave">保存</el-button>
      </template>
    </el-dialog>
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
.module-tag {
  margin-right: 6px;
}
</style>
