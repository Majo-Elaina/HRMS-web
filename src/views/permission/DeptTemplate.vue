<script setup>
import { computed, onMounted, reactive, ref } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { listDepartmentsApi } from '@/api/department'
import { listDeptPermissionTemplatesApi, replaceDeptPermissionTemplateModulesApi } from '@/api/deptPermissionTemplate'
import { listModuleScopeRulesApi } from '@/api/moduleScopeRule'

const loading = ref(false)
const saving = ref(false)
const departments = ref([])
const templates = ref({})
const moduleOptions = ref([])
const dialogVisible = ref(false)

const form = reactive({
  deptId: '',
  modules: []
})

const moduleLabelMap = computed(() => moduleOptions.value.reduce((map, item) => {
  map[item.value] = item.label
  return map
}, {}))

const tableRows = computed(() => departments.value.map((department) => ({
  ...department,
  modules: templates.value[department.deptId] || []
})))

const normalizeModules = (modules = []) => Array.from(new Set(
  (modules || []).filter((item) => moduleOptions.value.some((option) => option.value === item))
))

const buildTemplateMap = (items = []) => {
  const next = {}
  items.forEach((item) => {
    if (!next[item.deptId]) {
      next[item.deptId] = []
    }
    if (!next[item.deptId].includes(item.moduleCode)) {
      next[item.deptId].push(item.moduleCode)
    }
  })
  return next
}

const loadPageData = async () => {
  loading.value = true
  try {
    const [departmentPage, templateItems, moduleScopePage] = await Promise.all([
      listDepartmentsApi({ page: 1, size: 200 }),
      listDeptPermissionTemplatesApi(),
      listModuleScopeRulesApi({ page: 1, size: 200 })
    ])

    departments.value = departmentPage.items || []
    templates.value = buildTemplateMap(templateItems || [])
    moduleOptions.value = (moduleScopePage.items || []).map((item) => ({
      label: item.moduleName,
      value: item.moduleCode
    }))
  } catch (error) {
    ElMessage.error(error.message || '加载部门权限模板失败')
  } finally {
    loading.value = false
  }
}

const handleEdit = (row) => {
  form.deptId = row.deptId
  form.modules = [...normalizeModules(row.modules)]
  dialogVisible.value = true
}

const handleSave = async () => {
  if (!form.deptId) {
    ElMessage.warning('请选择部门')
    return
  }

  saving.value = true
  try {
    await replaceDeptPermissionTemplateModulesApi(form.deptId, normalizeModules(form.modules))
    dialogVisible.value = false
    await loadPageData()
    ElMessage.success('部门权限模板已保存')
  } catch (error) {
    ElMessage.error(error.message || '保存部门权限模板失败')
  } finally {
    saving.value = false
  }
}

const handleResetDefault = () => {
  ElMessageBox.confirm(
    '确定清空所有部门模板配置吗？清空后将由其他权限规则自行决定展示效果。',
    '提示',
    {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      type: 'warning'
    }
  ).then(async () => {
    saving.value = true
    try {
      await Promise.all(departments.value.map((department) => (
        replaceDeptPermissionTemplateModulesApi(department.deptId, [])
      )))
      await loadPageData()
      ElMessage.success('部门权限模板已清空')
    } catch (error) {
      ElMessage.error(error.message || '清空部门权限模板失败')
    } finally {
      saving.value = false
    }
  }).catch(() => {})
}

onMounted(loadPageData)
</script>

<template>
  <div class="dept-template-page" v-loading="loading || saving">
    <el-card shadow="never">
      <template #header>
        <div class="card-header">
          <span>部门权限模板</span>
          <div class="header-actions">
            <el-button type="info" @click="handleResetDefault">
              <el-icon><Refresh /></el-icon>
              清空模板
            </el-button>
          </div>
        </div>
      </template>

      <el-table :data="tableRows" stripe border>
        <el-table-column prop="deptName" label="部门名称" width="220" />
        <el-table-column label="可见模块" min-width="420">
          <template #default="{ row }">
            <div v-if="!row.modules.length" class="empty-modules">
              <span class="empty-modules__badge">未配置</span>
              <span class="empty-modules__text">当前部门还没有设置可见模块，点击右侧“编辑”即可配置</span>
            </div>
            <div v-else class="module-tag-list">
              <el-tag v-for="moduleCode in row.modules" :key="moduleCode" class="module-tag">
                {{ moduleLabelMap[moduleCode] || moduleCode }}
              </el-tag>
            </div>
          </template>
        </el-table-column>
        <el-table-column label="操作" width="120" fixed="right">
          <template #default="{ row }">
            <el-button type="primary" link @click="handleEdit(row)">编辑</el-button>
          </template>
        </el-table-column>
      </el-table>
    </el-card>

    <el-dialog v-model="dialogVisible" title="编辑部门权限模板" width="520px" destroy-on-close>
      <el-form :model="form" label-width="80px">
        <el-form-item label="部门">
          <el-select v-model="form.deptId" disabled style="width: 100%">
            <el-option
              v-for="department in departments"
              :key="department.deptId"
              :label="department.deptName"
              :value="department.deptId"
            />
          </el-select>
        </el-form-item>
        <el-form-item label="模块">
          <el-checkbox-group v-model="form.modules">
            <el-checkbox v-for="module in moduleOptions" :key="module.value" :label="module.value">
              {{ module.label }}
            </el-checkbox>
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

.module-tag-list {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.module-tag {
  margin: 0;
}

.empty-modules {
  display: inline-flex;
  align-items: center;
  gap: 10px;
  max-width: 100%;
  min-height: 40px;
  padding: 10px 14px;
  border: 1px dashed rgba(59, 130, 246, 0.22);
  border-radius: 14px;
  background: linear-gradient(135deg, rgba(59, 130, 246, 0.08), rgba(56, 189, 248, 0.05));
}

.empty-modules__badge {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 4px 10px;
  border-radius: 999px;
  background: rgba(59, 130, 246, 0.14);
  color: #2563eb;
  font-size: 12px;
  font-weight: 700;
  white-space: nowrap;
}

.empty-modules__text {
  color: #64748b;
  font-size: 13px;
  line-height: 1.5;
}

:deep(.el-table .cell) {
  padding-top: 10px;
  padding-bottom: 10px;
}
</style>
