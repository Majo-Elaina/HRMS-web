<script setup>
import { ref, computed } from 'vue'
import { ElMessage } from 'element-plus'
import { useUserStore, IDENTITY_TAG_OPTIONS, MODULE_SCOPE_OPTIONS } from '@/stores/user'

const userStore = useUserStore()
const tagOptions = IDENTITY_TAG_OPTIONS
const scopeOptions = MODULE_SCOPE_OPTIONS

const moduleOptions = [
  { code: 'base:employee', label: '员工管理' },
  { code: 'base:department', label: '部门管理' },
  { code: 'base:position', label: '职位管理' },
  { code: 'attendance:record', label: '考勤记录' },
  { code: 'attendance:leave', label: '请假管理' },
  { code: 'salary:record', label: '薪资记录' },
  { code: 'salary:config', label: '薪资配置' },
  { code: 'report', label: '数据报表' }
]

const scopeLabelMap = scopeOptions.reduce((acc, item) => {
  acc[item.value] = item.label
  return acc
}, {})

const moduleScopes = ref(userStore.getModuleScopes())
const dialogVisible = ref(false)
const currentModule = ref(null)

const editForm = ref({
  moduleCode: '',
  defaultScope: 'dept',
  tagScopes: {}
})

const rows = computed(() => {
  return moduleOptions.map(mod => ({
    ...mod,
    scope: moduleScopes.value[mod.code]
  }))
})

const getTagScopeSummary = (scopeConfig) => {
  if (!scopeConfig) return []
  return tagOptions.map(tag => ({
    tag: tag.label,
    scope: scopeLabelMap[scopeConfig.tagScopes?.[tag.value] || scopeConfig.default || 'dept']
  }))
}

const handleEdit = (row) => {
  const scopeConfig = moduleScopes.value[row.code] || { default: 'dept', tagScopes: {} }
  currentModule.value = row
  editForm.value = {
    moduleCode: row.code,
    defaultScope: scopeConfig.default || 'dept',
    tagScopes: { ...(scopeConfig.tagScopes || {}) }
  }
  dialogVisible.value = true
}

const handleSave = () => {
  const payload = {
    ...moduleScopes.value,
    [editForm.value.moduleCode]: {
      default: editForm.value.defaultScope,
      tagScopes: { ...editForm.value.tagScopes }
    }
  }
  moduleScopes.value = payload
  userStore.saveModuleScopes(payload)
  ElMessage.success('模块范围已保存')
  dialogVisible.value = false
}
</script>

<template>
  <div class="module-scope-page">
    <el-card shadow="never">
      <template #header>
        <div class="card-header">
          <span>模块数据范围</span>
          <span class="tips">按身份标签配置不同模块的数据范围</span>
        </div>
      </template>
      <el-table :data="rows" stripe border>
        <el-table-column prop="label" label="模块" width="160" />
        <el-table-column label="范围规则" min-width="280">
          <template #default="{ row }">
            <div class="tag-row">
              <el-tag
                v-for="item in getTagScopeSummary(row.scope)"
                :key="item.tag"
                size="small"
                class="rule-tag"
              >
                {{ item.tag }}：{{ item.scope }}
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

    <el-dialog v-model="dialogVisible" title="编辑模块范围" width="600px" destroy-on-close>
      <el-form :model="editForm" label-width="90px">
        <el-form-item label="模块">
          <el-input :model-value="currentModule?.label || ''" disabled />
        </el-form-item>
        <el-form-item label="默认范围">
          <el-select v-model="editForm.defaultScope" style="width: 200px">
            <el-option v-for="opt in scopeOptions" :key="opt.value" :label="opt.label" :value="opt.value" />
          </el-select>
        </el-form-item>
        <el-divider content-position="left">身份标签范围</el-divider>
        <el-row :gutter="16">
          <el-col v-for="tag in tagOptions" :key="tag.value" :span="12">
            <el-form-item :label="tag.label">
              <el-select v-model="editForm.tagScopes[tag.value]" style="width: 180px">
                <el-option v-for="opt in scopeOptions" :key="opt.value" :label="opt.label" :value="opt.value" />
              </el-select>
            </el-form-item>
          </el-col>
        </el-row>
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
.tips {
  color: #909399;
  font-size: 12px;
}
.tag-row {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}
.rule-tag {
  margin: 2px 0;
}
</style>
