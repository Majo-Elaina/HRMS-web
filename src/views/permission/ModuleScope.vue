<script setup>
import { computed, onMounted, ref } from 'vue'
import { ElMessage } from 'element-plus'
import { listModuleScopeConfigsApi, updateModuleScopeConfigApi } from '@/api/moduleScope'
import { MODULE_SCOPE_OPTIONS, useUserStore } from '@/stores/user'

const userStore = useUserStore()

const loading = ref(false)
const saving = ref(false)
const tagOptions = ref([
  { tagCode: 'ADMIN', tagName: '管理员' },
  { tagCode: 'GENERAL_MANAGER', tagName: '总经理' },
  { tagCode: 'HR_MANAGER', tagName: 'HR经理' },
  { tagCode: 'HR_SPECIALIST', tagName: 'HR专员' },
  { tagCode: 'FINANCE_MANAGER', tagName: '财务经理' },
  { tagCode: 'FINANCE_SPECIALIST', tagName: '财务专员' },
  { tagCode: 'MANAGER', tagName: '部门经理' },
  { tagCode: 'EMPLOYEE', tagName: '普通员工' }
])
const rows = ref([])
const dialogVisible = ref(false)
const currentModule = ref(null)
const editForm = ref({
  moduleCode: '',
  defaultScope: 'dept',
  tagScopes: {}
})

const scopeOptions = MODULE_SCOPE_OPTIONS
const scopeLabelMap = scopeOptions.reduce((acc, item) => {
  acc[item.value] = item.label
  return acc
}, {})

const getTagScopeSummary = (scopeConfig) => {
  if (!scopeConfig) return []
  return tagOptions.value.map((tag) => ({
    tag: tag.tagName,
    scope: scopeLabelMap[scopeConfig.tagScopes?.[tag.tagCode] || scopeConfig.defaultScope || 'dept']
  }))
}

const loadPageData = async () => {
  loading.value = true
  try {
    const configs = await listModuleScopeConfigsApi()
    rows.value = configs || []
  } catch (error) {
    ElMessage.error(error.message || '加载模块范围配置失败')
  } finally {
    loading.value = false
  }
}

const handleEdit = (row) => {
  currentModule.value = row
  editForm.value = {
    moduleCode: row.moduleCode,
    defaultScope: row.defaultScope || 'dept',
    tagScopes: { ...(row.tagScopes || {}) }
  }
  dialogVisible.value = true
}

const handleSave = async () => {
  saving.value = true
  try {
    await updateModuleScopeConfigApi(editForm.value.moduleCode, {
      moduleCode: editForm.value.moduleCode,
      defaultScope: editForm.value.defaultScope,
      tagScopes: { ...editForm.value.tagScopes }
    })
    await userStore.refreshPermissions()
    await loadPageData()
    dialogVisible.value = false
    ElMessage.success('模块范围已保存')
  } catch (error) {
    ElMessage.error(error.message || '保存模块范围失败')
  } finally {
    saving.value = false
  }
}

onMounted(loadPageData)
</script>

<template>
  <div class="module-scope-page" v-loading="loading || saving">
    <el-card shadow="never">
      <template #header>
        <div class="card-header">
          <span>模块数据范围</span>
          <span class="tips">按身份标签配置不同模块的数据可见范围</span>
        </div>
      </template>
      <el-table :data="rows" stripe border class="desktop-table">
        <el-table-column prop="moduleName" label="模块" width="180" />
        <el-table-column label="范围规则" min-width="320">
          <template #default="{ row }">
            <div class="tag-row">
              <el-tag
                v-for="item in getTagScopeSummary(row)"
                :key="`${row.moduleCode}-${item.tag}`"
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

      <div class="mobile-list">
        <div v-for="row in rows" :key="row.moduleCode" class="mobile-card">
          <div class="mobile-card-top">
            <div class="mobile-card-title">{{ row.moduleName }}</div>
          </div>
          <div class="tag-row">
            <el-tag
              v-for="item in getTagScopeSummary(row)"
              :key="`${row.moduleCode}-${item.tag}`"
              size="small"
              class="rule-tag"
            >
              {{ item.tag }}：{{ item.scope }}
            </el-tag>
          </div>
          <div class="mobile-card-actions">
            <el-button type="primary" plain @click="handleEdit(row)">编辑</el-button>
          </div>
        </div>
      </div>
    </el-card>

    <el-dialog v-model="dialogVisible" title="编辑模块范围" width="600px" destroy-on-close>
      <el-form :model="editForm" label-width="90px">
        <el-form-item label="模块">
          <el-input :model-value="currentModule?.moduleName || ''" disabled />
        </el-form-item>
        <el-form-item label="默认范围">
          <el-select v-model="editForm.defaultScope" style="width: 200px">
            <el-option v-for="option in scopeOptions" :key="option.value" :label="option.label" :value="option.value" />
          </el-select>
        </el-form-item>
        <el-divider content-position="left">身份标签范围</el-divider>
        <el-row :gutter="16">
          <el-col v-for="tag in tagOptions" :key="tag.tagCode" :span="12">
            <el-form-item :label="tag.tagName">
              <el-select v-model="editForm.tagScopes[tag.tagCode]" style="width: 180px">
                <el-option v-for="option in scopeOptions" :key="option.value" :label="option.label" :value="option.value" />
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

.mobile-list {
  display: none;
}

.mobile-card {
  padding: 16px;
  border-radius: 18px;
  background: linear-gradient(180deg, #ffffff 0%, #f8fbff 100%);
  border: 1px solid rgba(226, 232, 240, 0.9);
  box-shadow: 0 10px 24px rgba(15, 23, 42, 0.06);
}

.mobile-card-top {
  margin-bottom: 14px;
}

.mobile-card-title {
  font-size: 16px;
  font-weight: 700;
  color: #0f172a;
}

.mobile-card-actions {
  margin-top: 14px;
}

.mobile-card-actions .el-button {
  width: 100%;
}

@media (max-width: 768px) {
  .card-header {
    align-items: stretch;
    flex-direction: column;
    gap: 8px;
  }

  .tips {
    line-height: 1.5;
  }

  .desktop-table {
    display: none;
  }

  .mobile-list {
    display: flex;
    flex-direction: column;
    gap: 14px;
  }
}
</style>
