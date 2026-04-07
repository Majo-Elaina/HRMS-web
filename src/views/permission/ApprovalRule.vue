<script setup>
import { computed, reactive, ref, watch } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { listRolesApi } from '@/api/role'
import { createApprovalRuleApi, deleteApprovalRuleApi, listApprovalRulesApi, updateApprovalRuleApi } from '@/api/approvalRule'
import { createApprovalRuleTypeApi, listApprovalRuleTypesApi } from '@/api/approvalRuleType'
import { MODULE_SCOPE_OPTIONS } from '@/stores/user'

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
const roleOptions = ref([])
const ruleTypes = ref([])
const selectedType = ref('leave')
const rulesMap = ref({})
const dialogVisible = ref(false)
const dialogTitle = ref('新增规则')
const typeDialogVisible = ref(false)
const typeDialogTitle = ref('新增规则类型')

const scopeOptions = MODULE_SCOPE_OPTIONS

const form = reactive({
  id: null,
  applicantTag: '*',
  daysOp: '<=',
  daysValue: 3,
  firstApproverTag: '',
  secondApproverTag: '',
  secondApproverScope: 'dept'
})

const typeForm = reactive({
  type: '',
  name: '',
  desc: ''
})

const applicantOptions = computed(() => [
  { value: '*', label: '任意' },
  ...tagOptions.value.map((item) => ({ value: item.tagCode, label: item.tagName }))
])

const approverOptions = computed(() => 
  roleOptions.value.map((item) => ({ value: item.roleCode, label: item.roleName }))
)

const isLeaveType = computed(() => selectedType.value === 'leave')

const daysOptions = [
  { value: 'any', label: '不限天数' },
  { value: '<=', label: '小于等于' },
  { value: '>', label: '大于' }
]

const getTagLabel = (value) => {
  const found = tagOptions.value.find((item) => item.tagCode === value)
  return found ? found.tagName : value || '-'
}

const getRoleLabel = (value) => {
  const found = roleOptions.value.find((item) => item.roleCode === value)
  return found ? found.roleName : value || '-'
}

const getDaysText = (row) => {
  if (!isLeaveType.value || row.daysOp === 'any') return '不限'
  return `${row.daysOp}${row.daysValue}天`
}

const currentRules = computed(() => rulesMap.value[selectedType.value] || [])

const getDefaultRuleForType = (type) => {
  if (type === 'leave') {
    return {
      applicantTag: '*',
      daysOp: '<=',
      daysValue: 3,
      firstApproverTag: 'HR',
      secondApproverTag: '',
      secondApproverScope: 'dept'
    }
  }

  return {
    applicantTag: 'FINANCE_SPECIALIST',
    daysOp: 'any',
    daysValue: 0,
    firstApproverTag: 'FINANCE_MANAGER',
    secondApproverTag: '',
    secondApproverScope: 'company'
  }
}

const normalizeRule = (rule) => ({
  id: rule.ruleId,
  applicantTag: rule.applicantTag,
  daysOp: rule.daysOp || 'any',
  daysValue: Number(rule.daysValue || 0),
  firstApproverTag: rule.firstApproverTag,
  secondApproverTag: rule.secondApproverTag || '',
  secondApproverScope: rule.secondApproverScope || 'dept',
  sortOrder: rule.sortOrder || 0
})

const loadRuleTypes = async () => {
  const items = await listApprovalRuleTypesApi()
  ruleTypes.value = (items || []).map((item) => ({
    type: item.typeCode,
    name: item.typeName,
    desc: item.typeDesc,
    status: item.status
  }))

  if (!ruleTypes.value.some((item) => item.type === selectedType.value)) {
    selectedType.value = ruleTypes.value[0]?.type || 'leave'
  }
}

const loadRulesByType = async (typeCode) => {
  if (!typeCode) return
  const page = await listApprovalRulesApi({ page: 1, size: 200, typeCode })
  rulesMap.value[typeCode] = (page.items || [])
    .map(normalizeRule)
    .sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0) || a.id - b.id)
}

const loadPageData = async () => {
  loading.value = true
  try {
    const rolesPage = await listRolesApi({ page: 1, size: 100 })
    await loadRuleTypes()
    roleOptions.value = rolesPage.items || []
    await loadRulesByType(selectedType.value)
  } catch (error) {
    ElMessage.error(error.message || '加载审批规则失败')
  } finally {
    loading.value = false
  }
}

watch(selectedType, async (typeCode, previousType) => {
  if (!typeCode || typeCode === previousType) return
  if (rulesMap.value[typeCode]) return
  loading.value = true
  try {
    await loadRulesByType(typeCode)
  } catch (error) {
    ElMessage.error(error.message || '加载审批规则失败')
  } finally {
    loading.value = false
  }
})

const handleAdd = () => {
  dialogTitle.value = '新增规则'
  Object.assign(form, { id: null, ...getDefaultRuleForType(selectedType.value) })
  dialogVisible.value = true
}

const handleEdit = (row) => {
  dialogTitle.value = '编辑规则'
  Object.assign(form, { ...row })
  dialogVisible.value = true
}

const handleDelete = (row) => {
  ElMessageBox.confirm('确定删除该审批规则吗？', '提示', {
    confirmButtonText: '确定',
    cancelButtonText: '取消',
    type: 'warning'
  }).then(async () => {
    try {
      await deleteApprovalRuleApi(row.id)
      await loadRulesByType(selectedType.value)
      ElMessage.success('规则已删除')
    } catch (error) {
      ElMessage.error(error.message || '删除审批规则失败')
    }
  }).catch(() => {})
}

const buildRulePayload = () => ({
  typeCode: selectedType.value,
  applicantTag: form.applicantTag,
  daysOp: isLeaveType.value ? form.daysOp : 'any',
  daysValue: isLeaveType.value && form.daysOp !== 'any' ? Number(form.daysValue || 0) : 0,
  firstApproverTag: form.firstApproverTag,
  secondApproverTag: form.secondApproverTag || null,
  secondApproverScope: form.secondApproverTag ? form.secondApproverScope : null,
  sortOrder: form.id
    ? currentRules.value.find((item) => item.id === form.id)?.sortOrder || 0
    : currentRules.value.length + 1
})

const handleSave = async () => {
  if (!form.firstApproverTag) {
    ElMessage.warning('请选择一级审批人')
    return
  }

  saving.value = true
  try {
    const payload = buildRulePayload()
    if (form.id) {
      await updateApprovalRuleApi(form.id, payload)
    } else {
      await createApprovalRuleApi(payload)
    }
    await loadRulesByType(selectedType.value)
    dialogVisible.value = false
    ElMessage.success('审批规则已保存')
  } catch (error) {
    ElMessage.error(error.message || '保存审批规则失败')
  } finally {
    saving.value = false
  }
}

const handleAddType = () => {
  typeDialogTitle.value = '新增规则类型'
  Object.assign(typeForm, { type: '', name: '', desc: '' })
  typeDialogVisible.value = true
}

const handleSaveType = async () => {
  const type = typeForm.type.trim()
  const name = typeForm.name.trim()

  if (!type || !name) {
    ElMessage.warning('请填写类型编码和名称')
    return
  }
  if (!/^[a-z][a-z0-9_]*$/.test(type)) {
    ElMessage.warning('类型编码需以小写字母开头，可包含数字和下划线')
    return
  }
  if (ruleTypes.value.some((item) => item.type === type)) {
    ElMessage.warning('类型编码已存在')
    return
  }

  saving.value = true
  try {
    await createApprovalRuleTypeApi({
      typeCode: type,
      typeName: name,
      typeDesc: typeForm.desc.trim(),
      status: '启用'
    })
    await loadRuleTypes()
    rulesMap.value[type] = []
    selectedType.value = type
    typeDialogVisible.value = false
    ElMessage.success('规则类型已保存')
  } catch (error) {
    ElMessage.error(error.message || '保存规则类型失败')
  } finally {
    saving.value = false
  }
}

loadPageData()
</script>

<template>
  <div class="approval-rule-page" v-loading="loading || saving">
    <el-card shadow="never">
      <template #header>
        <div class="card-header">
          <div class="title-wrap">
            <el-select v-model="selectedType" class="type-select" placeholder="选择审批类型">
              <el-option v-for="item in ruleTypes" :key="item.type" :label="item.name" :value="item.type" />
            </el-select>
          </div>
          <div class="header-actions">
            <el-button type="info" @click="handleAddType">
              <el-icon><Plus /></el-icon>
              新增类型
            </el-button>
            <el-button type="primary" @click="handleAdd">
              <el-icon><Plus /></el-icon>
              新增规则
            </el-button>
          </div>
        </div>
      </template>

      <el-table :data="currentRules" stripe border class="desktop-table">
        <el-table-column label="申请人标签" width="150">
          <template #default="{ row }">
            {{ row.applicantTag === '*' ? '任意' : getTagLabel(row.applicantTag) }}
          </template>
        </el-table-column>
        <el-table-column :label="isLeaveType ? '请假天数' : '条件'" width="120">
          <template #default="{ row }">{{ getDaysText(row) }}</template>
        </el-table-column>
        <el-table-column label="一级审批人" width="150">
          <template #default="{ row }">{{ getRoleLabel(row.firstApproverTag) }}</template>
        </el-table-column>
        <el-table-column label="二级审批人" min-width="200">
          <template #default="{ row }">
            <span v-if="row.secondApproverTag">
              {{ getRoleLabel(row.secondApproverTag) }}（{{ scopeOptions.find((item) => item.value === row.secondApproverScope)?.label || '本部门' }}）
            </span>
            <span v-else>-</span>
          </template>
        </el-table-column>
        <el-table-column label="操作" width="160" fixed="right">
          <template #default="{ row }">
            <el-button type="primary" link @click="handleEdit(row)">编辑</el-button>
            <el-button type="danger" link @click="handleDelete(row)">删除</el-button>
          </template>
        </el-table-column>
      </el-table>

      <div class="mobile-list">
        <div v-for="row in currentRules" :key="row.id" class="mobile-card">
          <div class="mobile-card-top">
            <div class="mobile-card-title">
              {{ row.applicantTag === '*' ? '任意申请人' : getTagLabel(row.applicantTag) }}
            </div>
            <el-tag round>{{ getDaysText(row) }}</el-tag>
          </div>

          <div class="mobile-card-grid">
            <div class="mobile-item">
              <span>一级审批人</span>
              <strong>{{ getRoleLabel(row.firstApproverTag) }}</strong>
            </div>
            <div class="mobile-item">
              <span>二级审批人</span>
              <strong>{{ row.secondApproverTag ? getRoleLabel(row.secondApproverTag) : '-' }}</strong>
            </div>
            <div class="mobile-item mobile-item-wide" v-if="row.secondApproverTag">
              <span>二级审批范围</span>
              <strong>{{ scopeOptions.find((item) => item.value === row.secondApproverScope)?.label || '-' }}</strong>
            </div>
          </div>

          <div class="mobile-card-actions">
            <el-button type="primary" plain @click="handleEdit(row)">编辑</el-button>
            <el-button type="danger" plain @click="handleDelete(row)">删除</el-button>
          </div>
        </div>
      </div>
    </el-card>

    <el-dialog v-model="dialogVisible" :title="dialogTitle" width="520px" destroy-on-close>
      <el-form :model="form" label-width="100px">
        <el-form-item label="申请人标签">
          <el-select v-model="form.applicantTag" style="width: 220px">
            <el-option v-for="option in applicantOptions" :key="option.value" :label="option.label" :value="option.value" />
          </el-select>
        </el-form-item>
        <el-form-item v-if="isLeaveType" label="请假天数">
          <el-select v-model="form.daysOp" style="width: 140px">
            <el-option v-for="option in daysOptions" :key="option.value" :label="option.label" :value="option.value" />
          </el-select>
          <el-input-number v-if="form.daysOp !== 'any'" v-model="form.daysValue" :min="0.5" :step="0.5" style="margin-left: 10px" />
        </el-form-item>
        <el-form-item label="一级审批人">
          <el-select v-model="form.firstApproverTag" style="width: 220px">
            <el-option
              v-for="option in approverOptions"
              :key="option.value"
              :label="option.label"
              :value="option.value"
            />
          </el-select>
        </el-form-item>
        <el-form-item label="二级审批人">
          <el-select v-model="form.secondApproverTag" placeholder="可选" style="width: 220px" clearable>
            <el-option
              v-for="option in approverOptions"
              :key="option.value"
              :label="option.label"
              :value="option.value"
            />
          </el-select>
        </el-form-item>
        <el-form-item v-if="form.secondApproverTag" label="范围">
          <el-select v-model="form.secondApproverScope" style="width: 220px">
            <el-option v-for="option in scopeOptions" :key="option.value" :label="option.label" :value="option.value" />
          </el-select>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="dialogVisible = false">取消</el-button>
        <el-button type="primary" @click="handleSave">保存</el-button>
      </template>
    </el-dialog>

    <el-dialog v-model="typeDialogVisible" :title="typeDialogTitle" width="460px" destroy-on-close>
      <el-form :model="typeForm" label-width="90px">
        <el-form-item label="类型编码">
          <el-input v-model="typeForm.type" placeholder="如：finance_bonus" />
        </el-form-item>
        <el-form-item label="类型名称">
          <el-input v-model="typeForm.name" placeholder="如：奖金审批规则" />
        </el-form-item>
        <el-form-item label="类型说明">
          <el-input v-model="typeForm.desc" type="textarea" :rows="2" placeholder="可选" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="typeDialogVisible = false">取消</el-button>
        <el-button type="primary" @click="handleSaveType">保存</el-button>
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

.title-wrap {
  display: flex;
  align-items: center;
  gap: 12px;
}

.type-select {
  width: 220px;
}

.type-select :deep(.el-input__wrapper) {
  border-radius: 999px;
  background: #f5f7fa;
}

.type-select :deep(.el-input__inner) {
  font-weight: 600;
  color: #303133;
}

.type-select :deep(.el-input__suffix-inner) {
  color: #606266;
}

.header-actions {
  display: flex;
  gap: 10px;
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
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 14px;
}

.mobile-card-title {
  font-size: 16px;
  font-weight: 700;
  color: #0f172a;
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

@media (max-width: 768px) {
  .card-header {
    align-items: stretch;
    flex-direction: column;
    gap: 12px;
  }

  .title-wrap,
  .header-actions {
    width: 100%;
  }

  .type-select {
    width: 100%;
  }

  .header-actions {
    flex-direction: column;
  }

  .header-actions .el-button {
    width: 100%;
  }

  .desktop-table {
    display: none;
  }

  .mobile-list {
    display: flex;
    flex-direction: column;
    gap: 14px;
  }

  .mobile-card-grid {
    grid-template-columns: 1fr;
  }
}
</style>
