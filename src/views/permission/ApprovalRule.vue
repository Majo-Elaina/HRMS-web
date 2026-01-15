<script setup>
import { ref, reactive, computed } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { useUserStore, IDENTITY_TAG_OPTIONS, MODULE_SCOPE_OPTIONS } from '@/stores/user'

const userStore = useUserStore()
const tagOptions = IDENTITY_TAG_OPTIONS
const scopeOptions = MODULE_SCOPE_OPTIONS

const ruleTypes = ref([...userStore.getApprovalRuleTypes()])
const selectedType = ref(ruleTypes.value[0]?.type || 'leave')
const rulesMap = ref(userStore.getApprovalRules())
const dialogVisible = ref(false)
const dialogTitle = ref('新增规则')
const typeDialogVisible = ref(false)
const typeDialogTitle = ref('新增规则类型')

const form = reactive({
  id: null,
  applicantTag: '*',
  daysOp: '<=',
  daysValue: 3,
  firstApproverTag: 'HR_SPECIALIST',
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
  ...tagOptions
])

const isLeaveType = computed(() => selectedType.value === 'leave')

const daysOptions = [
  { value: 'any', label: '不限天数' },
  { value: '<=', label: '小于等于' },
  { value: '>', label: '大于' }
]

const getTagLabel = (value) => {
  const found = tagOptions.find(item => item.value === value)
  return found ? found.label : value || '-'
}

const getDaysText = (row) => {
  if (!isLeaveType.value || row.daysOp === 'any') return '不限'
  return `${row.daysOp}${row.daysValue}天`
}

const currentRules = computed(() => rulesMap.value[selectedType.value] || [])

const getTypeName = (type) => {
  const found = ruleTypes.value.find(item => item.type === type)
  return found ? found.name : type
}

const getDefaultRuleForType = (type) => {
  if (type === 'leave') {
    return {
      applicantTag: '*',
      daysOp: '<=',
      daysValue: 3,
      firstApproverTag: 'HR_SPECIALIST',
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

const persistRules = () => {
  userStore.saveApprovalRules(rulesMap.value)
}

const persistTypes = () => {
  userStore.saveApprovalRuleTypes(ruleTypes.value)
}

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
  ElMessageBox.confirm('确定要删除该规则吗？', '提示', {
    confirmButtonText: '确定',
    cancelButtonText: '取消',
    type: 'warning'
  }).then(() => {
    rulesMap.value[selectedType.value] = currentRules.value.filter(item => item.id !== row.id)
    persistRules()
    if (selectedType.value === 'leave') {
      userStore.saveLeaveApprovalRules(rulesMap.value[selectedType.value])
    }
    ElMessage.success('已删除')
  }).catch(() => {})
}

const handleSave = () => {
  if (!form.firstApproverTag) {
    ElMessage.warning('请选择一级审批人')
    return
  }
  const payload = { ...form }
  if (!isLeaveType.value) {
    payload.daysOp = 'any'
    payload.daysValue = 0
  } else if (payload.daysOp === 'any') {
    payload.daysValue = 0
  }

  if (payload.id) {
    const index = currentRules.value.findIndex(item => item.id === payload.id)
    if (index > -1) {
      rulesMap.value[selectedType.value].splice(index, 1, payload)
    }
  } else {
    const newId = currentRules.value.length ? Math.max(...currentRules.value.map(r => r.id)) + 1 : 1
    if (!rulesMap.value[selectedType.value]) rulesMap.value[selectedType.value] = []
    rulesMap.value[selectedType.value].push({ ...payload, id: newId })
  }
  persistRules()
  if (selectedType.value === 'leave') {
    userStore.saveLeaveApprovalRules(rulesMap.value[selectedType.value])
  }
  ElMessage.success('规则已保存')
  dialogVisible.value = false
}

const handleAddType = () => {
  typeDialogTitle.value = '新增规则类型'
  Object.assign(typeForm, { type: '', name: '', desc: '' })
  typeDialogVisible.value = true
}

const handleSaveType = () => {
  const type = typeForm.type.trim()
  const name = typeForm.name.trim()
  if (!type || !name) {
    ElMessage.warning('请填写类型编码和名称')
    return
  }
  if (!/^[a-z][a-z0-9_]*$/.test(type)) {
    ElMessage.warning('类型编码需为小写字母开头，可包含数字和下划线')
    return
  }
  if (ruleTypes.value.some(item => item.type === type)) {
    ElMessage.warning('类型编码已存在')
    return
  }
  ruleTypes.value.push({ type, name, desc: typeForm.desc.trim() })
  rulesMap.value[type] = []
  persistTypes()
  persistRules()
  selectedType.value = type
  typeDialogVisible.value = false
}
</script>

<template>
  <div class="approval-rule-page">
    <el-card shadow="never">
      <template #header>
        <div class="card-header">
          <div class="title-wrap">
            <el-select v-model="selectedType" class="type-select" placeholder="选择审批类型">
              <el-option v-for="item in ruleTypes" :key="item.type" :label="item.name" :value="item.type" />
            </el-select>
          </div>
          <div class="header-actions">
            <el-button type="info" @click="handleAddType"><el-icon><Plus /></el-icon>新增类型</el-button>
            <el-button type="primary" @click="handleAdd"><el-icon><Plus /></el-icon>新增规则</el-button>
          </div>
        </div>
      </template>
      <el-table :data="currentRules" stripe border>
        <el-table-column label="申请人标签" width="150">
          <template #default="{ row }">
            {{ row.applicantTag === '*' ? '任意' : getTagLabel(row.applicantTag) }}
          </template>
        </el-table-column>
        <el-table-column :label="isLeaveType ? '请假天数' : '条件'" width="120">
          <template #default="{ row }">{{ getDaysText(row) }}</template>
        </el-table-column>
        <el-table-column label="一级审批人" width="150">
          <template #default="{ row }">{{ getTagLabel(row.firstApproverTag) }}</template>
        </el-table-column>
        <el-table-column label="二级审批人" min-width="180">
          <template #default="{ row }">
            <span v-if="row.secondApproverTag">
              {{ getTagLabel(row.secondApproverTag) }}（{{ scopeOptions.find(s => s.value === row.secondApproverScope)?.label || '本部门' }}）
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
    </el-card>

    <el-dialog v-model="dialogVisible" :title="dialogTitle" width="520px" destroy-on-close>
      <el-form :model="form" label-width="100px">
        <el-form-item label="申请人标签">
          <el-select v-model="form.applicantTag" style="width: 220px">
            <el-option v-for="opt in applicantOptions" :key="opt.value" :label="opt.label" :value="opt.value" />
          </el-select>
        </el-form-item>
        <el-form-item v-if="isLeaveType" label="请假天数">
          <el-select v-model="form.daysOp" style="width: 140px">
            <el-option v-for="opt in daysOptions" :key="opt.value" :label="opt.label" :value="opt.value" />
          </el-select>
          <el-input-number v-if="form.daysOp !== 'any'" v-model="form.daysValue" :min="0.5" :step="0.5" style="margin-left: 10px" />
        </el-form-item>
        <el-form-item label="一级审批人">
          <el-select v-model="form.firstApproverTag" style="width: 220px">
            <el-option v-for="opt in tagOptions" :key="opt.value" :label="opt.label" :value="opt.value" />
          </el-select>
        </el-form-item>
        <el-form-item label="二级审批人">
          <el-select v-model="form.secondApproverTag" placeholder="可选" style="width: 220px" clearable>
            <el-option v-for="opt in tagOptions" :key="opt.value" :label="opt.label" :value="opt.value" />
          </el-select>
        </el-form-item>
        <el-form-item v-if="form.secondApproverTag" label="范围">
          <el-select v-model="form.secondApproverScope" style="width: 220px">
            <el-option v-for="opt in scopeOptions" :key="opt.value" :label="opt.label" :value="opt.value" />
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
</style>
