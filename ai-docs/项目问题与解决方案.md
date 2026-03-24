# HRMS 项目重点问题与解决方案复盘

本文档基于本项目几轮核心开发与修复记录整理，只保留真正影响系统可用性、数据可信性、权限正确性和后续扩展能力的重点问题，不记录零碎 UI 修补。

## 1. 前端“假持久化”导致业务数据不可信

### 问题

项目早期大量页面虽然看起来“能保存”，但本质上只是写入前端 `localStorage` 或页面内存，包括：

- 角色权限配置
- 员工状态修改
- 部分请假、薪资、配置类页面
- Dashboard / Report 汇总展示

直接后果是：

- 页面刷新、换浏览器、缓存被覆盖后数据回退
- 前端展示状态与数据库真实状态脱节
- 无法支撑权限、审批、统计这类依赖真实数据链路的功能

### 根因

- 前端先做了原型，但没有同步接入后端接口
- 项目同时存在 mock、`localStorage`、数据库三套数据来源
- 用户看到的是“看起来已保存”，但数据库并没有变化

### 解决方案

- 将核心业务页逐步切到真实 API 与数据库：
  - 组织人事：部门、职位、员工、用户、角色
  - 考勤请假：考勤记录、请假申请、审批
  - 薪资：薪资记录、薪资配置
  - 配置中心：身份标签、模块范围、审批规则、部门权限模板
  - 汇总页：Dashboard、Report
- 收口 `user.js` 中历史兼容逻辑，移除业务配置类 `localStorage`
- 保留 `token/user` 作为登录态缓存，但不再作为业务真值来源

### 结果

系统从“前端演示型原型”变成了“数据库驱动的业务系统”，这是整个项目最关键的一次质变。

## 2. 权限系统从静态演示改造成数据库驱动

### 问题

角色管理中的权限修改最初只是改前端缓存，没有真正写入 `role_permission`，导致：

- 权限修改无法持久化
- 登录后的菜单、路由、按钮权限与角色配置不一致
- 权限系统无法作为审批、菜单控制的可信基础

### 根因

- 前端权限树只做了静态状态维护
- 后端未形成“角色权限查询/保存 -> 登录态权限装配 -> 前端权限校验”的完整闭环

### 解决方案

- 接通角色权限真实接口，写入 `role_permission`
- 登录态和资料刷新统一从后端返回 `permissions`
- 前端路由、菜单、按钮统一通过 `hasPermission()` 控制
- 修复角色权限保存时因批量删除后立即插入导致的唯一键冲突问题

### 结果

权限不再是“页面表现”，而是系统运行基础能力。后续审批、菜单显示、操作按钮显示才有了稳定依据。

## 3. 审批系统的核心问题不是按钮显示，而是“审批规则建模”

### 问题

请假审批在后期暴露出一系列看似分散、实则同源的问题：

- 多级审批时一级无法审批
- 一级通过后不能正确流转给二级
- HR 专员 / HR 经理 / 部门经理的审批资格混乱
- 历史单据状态与新规则不一致
- HR 经理申请被错误识别成普通员工申请

### 根因

审批系统真正的复杂点不在弹窗，而在以下几个模型是否一致：

- 申请人业务身份：`employee.identity_tag_code`
- 审批规则：`approval_rule`
- 当前待审批节点：`pendingApproverTag / pendingApproverScope / nextApproverTag`
- 权限校验：角色权限 + 身份标签 + 模块范围

前期的问题主要来自四类偏差：

1. 申请人身份标签靠前端猜，不优先用数据库身份标签
2. 规则命中时把“别名兼容”放在了过高优先级，导致 `HR_MANAGER` 会先命中 `MANAGER`
3. 历史单据沿用旧规则字段，和新规则不一致
4. 终态单据仍显示审批按钮，审批状态机边界不严

### 解决方案

- 为员工引入并持久化 `identity_tag_code`
- 请假审批统一改为按数据库身份标签 + `approval_rule` 决定流转
- 规则命中改为：
  - 精确身份优先
  - 别名匹配仅作回退
- 统一请假规则口径：
  - 普通员工：`HR专员 -> HR经理`
  - 部门经理：`HR经理 -> 管理员`
  - HR经理：`管理员`
- 增加历史请假单自动纠偏：
  - 页面加载时根据当前规则重算待审批链
  - 若旧单据字段不一致，则自动写回数据库修正
- 审批按钮只允许在 `pending1 / pending2` 阶段显示

### 结果

审批流从“若干页面判断拼出来的流程”变成了“由身份标签 + 审批规则 + 当前节点字段共同驱动的状态机”。这是项目第二个最有含金量的改造。

## 4. 身份标签是整个系统的数据枢纽，不是附属字段

### 问题

项目中后期发现，很多业务逻辑虽然表面上属于“请假审批”或“模块范围”，但根因其实是员工缺少稳定的业务身份标识。

如果没有统一身份标签，系统只能靠：

- 角色代码
- 部门名
- 岗位名是否包含“经理”

来猜测用户身份，这会在跨部门审批、HR/财务岗位、经理层角色中不断出错。

### 解决方案

- 为 `employee` 增加 `identity_tag_code`
- 身份标签页实现真实维护与持久化
- 登录资料和前端 store 优先读取后端身份标签
- 审批规则、模块范围、部门模板等全部以身份标签作为业务判断基础

### 结果

身份标签从“附加配置”升级成了系统的核心业务主键之一。它把权限、数据范围、审批流三条链真正串起来了。

## 5. 模块范围与审批规则配置化，解决了“功能能跑但不可治理”的问题

### 问题

即使业务页面接通后端，如果数据范围和审批规则仍然写死在前端，系统仍然不可治理：

- 谁能看本部门/全公司数据无法动态调整
- 审批链变更要改代码
- 规则与业务单据之间无法建立长期稳定关系

### 解决方案

- 接入 `module_scope_rule + module_scope_detail`
- 接入 `approval_rule_type + approval_rule`
- 前端运行时动态拉取：
  - 模块范围配置
  - 审批规则类型
  - 审批规则明细
- 补齐对应文档与 SQL 种子数据

### 结果

系统从“代码驱动业务规则”升级为“数据驱动业务规则”，为后续扩展更多审批类型、更多岗位身份、更多数据范围控制打下基础。

## 6. 数据库约束与服务层默认值必须同步考虑

### 问题

在项目接通真实数据库后，暴露出两类典型后端问题：

- `create_time` 非空约束，但前端不传，新增接口直接报错
- 批量替换角色权限时，删除未及时落库，插入命中唯一键冲突

### 根因

- 原型期用 mock 数据时不会暴露数据库约束问题
- 进入真实持久化阶段后，服务层没有承担默认值和事务边界责任

### 解决方案

- 在服务层统一补齐 `createTime`
- 扫描同类实体，避免同型问题反复出现
- 在角色权限替换逻辑中增加 `flush()`，确保删除先落库再插入

### 结果

后端从“接口看起来能用”提升为“面对真实数据库约束时仍能稳定运行”。

## 7. 文档与初始化 SQL 必须和代码一起演进

### 问题

随着系统从 mock 走向数据库驱动，若文档、初始化 SQL、代码三者不一致，会立即造成：

- 联调时前后认知不一致
- 新环境部署后规则失真
- 后续继续开发时无法判断什么是当前真实口径

### 解决方案

- 将接口文档统一收口到 `ai-docs`
- 补充系统架构、审批逻辑、AI agent 方案、请假审批规则文档
- 将新的身份标签、审批规则、模块范围、权限映射同步写入 `hrms-db.sql`

### 结果

代码、数据库、文档三者开始对齐，项目从“边改边试”进入“可交付、可迁移、可复现”的状态。

## 最终结论

这次项目最有含金量的工作，不是把某个页面改漂亮，也不是把某个按钮点通，而是完成了下面三件事：

1. 把系统从前端假数据原型改造成数据库驱动的真实业务系统
2. 把权限、身份标签、模块范围、审批规则四套机制打通成统一模型
3. 把历史脏数据、旧规则、前端猜测逻辑逐步收敛到数据库规则与文档口径

如果再往后看，项目后续最值得继续投入的方向不是再修小问题，而是：

- 将审批状态机进一步下沉到后端统一处理
- 为关键业务增加审计日志与操作追踪
- 在现有规则化基础上引入 AI agent 的“先规划、后审批、再执行”能力

## 8. AI助手动态数据获取架构设计

### 问题

传统AI助手通常基于静态知识库或预设问答，无法实时反映业务系统的最新状态变化，导致：

- 回答内容与实际数据不符
- 业务规则变更后需要重新训练或配置
- 无法支持复杂的权限控制和数据范围限制
- 缺乏与业务系统的深度集成

### 技术方案

实现了完全动态的AI数据获取架构：

#### 核心组件设计

1. **AiReadonlyKnowledgeService**：只读知识服务层
   - 问题分类识别：自动识别用户问题涉及的业务域
   - 实时数据查询：直接从数据库查询最新数据
   - 权限范围过滤：根据当前用户权限过滤可见数据
   - 结构化上下文构建：将数据转换为模型可理解的上下文

2. **AiChatService**：聊天服务协调层
   - 多模型支持：Ollama本地模型 + OpenAI兼容API
   - 角色人设管理：亚托莉角色设定与系统事实分离
   - 聊天记录持久化：用户级别的历史记录管理
   - 优雅降级处理：模型不可用时的兜底机制

3. **动态权限控制**：
   ```java
   // 权限检查示例
   private boolean hasPermission(UserProfile actor, String permission) {
       return actor.getPermissions().contains(permission);
   }
   
   // 数据范围过滤
   if (leaveScope.value === 'dept' && emp?.deptId !== userStore.deptId) return false;
   if (leaveScope.value === 'self' && item.empId !== userStore.empId) return false;
   ```

#### 技术特性

- **零重启更新**：业务数据变更立即生效，无需重启服务
- **权限边界严格**：基于角色权限和身份标签的多层控制
- **模型无关性**：支持多种AI模型的热切换
- **结构化响应**：返回数据来源、权限检查状态等元信息

### 结果

AI助手从"静态问答机器人"升级为"动态业务数据助手"，实现了与业务系统的深度集成。

## 9. 聊天记录持久化与用户体验优化

### 问题

传统聊天界面通常只在内存中保存对话，导致：

- 页面刷新后聊天记录丢失
- 用户切换后无法恢复个人对话历史
- 缺乏对话上下文的持续性
- 无法追踪AI使用情况和效果

### 技术方案

#### 数据库设计

```sql
CREATE TABLE `ai_chat_message` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `user_id` bigint NOT NULL,
  `role` varchar(20) NOT NULL COMMENT 'user/assistant',
  `content` text NOT NULL,
  `provider_name` varchar(100) DEFAULT NULL,
  `model_name` varchar(100) DEFAULT NULL,
  `used_system_data` tinyint(1) DEFAULT 0,
  `create_time` datetime NOT NULL
);
```

#### 前端实现特性

1. **自动历史加载**：
   ```javascript
   // 监听用户变化，重新加载历史记录
   watch(() => userStore.user?.userId, async (newUserId) => {
     if (newUserId) {
       await loadHistory()
     }
   }, { immediate: true })
   ```

2. **思考状态动画**：
   ```javascript
   const thinkingMessages = [
     '亚托莉正在高性能思考中......',
     '让我来仔细分析一下......',
     '高性能的我正在处理你的问题......'
   ]
   ```

3. **消息来源提示**：显示回答是否使用了系统数据，增强用户信任度

### 结果

实现了完整的聊天体验闭环，用户可以在任何时候恢复之前的对话，大大提升了AI助手的实用性。

## 10. 多模型AI Provider架构与配置驱动设计

### 问题

企业级AI应用需要支持多种模型源的灵活切换，但传统方案存在以下问题：

- 模型源硬编码，切换需要修改代码
- 不同模型API格式不统一，适配复杂
- 生产环境与开发环境模型配置割裂
- 缺乏模型不可用时的优雅降级机制

### 技术方案

#### 配置驱动的Provider架构

```properties
# 核心配置
ai.chat.active-provider=dashscope-qwen
ai.chat.assistant-name=亚托莉

# 多Provider支持
ai.chat.providers[0].name=ollama-local
ai.chat.providers[0].type=ollama
ai.chat.providers[0].base-url=http://127.0.0.1:11434
ai.chat.providers[0].model=qwen3:4b

ai.chat.providers[1].name=dashscope-qwen
ai.chat.providers[1].type=openai-compatible
ai.chat.providers[1].base-url=https://dashscope.aliyuncs.com/compatible-mode/v1
ai.chat.providers[1].api-key=${DASHSCOPE_API_KEY}
ai.chat.providers[1].model=qwen-plus
```

#### 统一的调用接口

```java
private String callProvider(AiChatProperties.ProviderConfig providerConfig, 
                           List<Map<String, String>> messages) {
    switch (providerConfig.getType()) {
        case "ollama":
            return callOllama(providerConfig, messages);
        case "openai-compatible":
            return callOpenAiCompatible(providerConfig, messages);
        default:
            throw new IllegalArgumentException("Unsupported provider type");
    }
}
```

#### 优雅降级机制

当模型不可用时，系统会：
1. 使用只读数据构建结构化回答
2. 保持亚托莉的角色设定
3. 提供友好的错误提示
4. 记录模型状态供前端显示

### 结果

实现了真正的模型无关性，支持开发环境本地模型和生产环境云端API的无缝切换。

## 11. 基于身份标签的细粒度权限控制体系

### 问题

传统RBAC权限模型在复杂企业场景中存在局限：

- 角色粒度过粗，无法精确控制业务权限
- 跨部门协作时权限边界模糊
- 审批流程中身份识别依赖人工判断
- 数据范围控制缺乏统一标准

### 技术方案

#### 三层权限架构

1. **角色层（Role）**：基础功能权限
2. **身份标签层（Identity Tag）**：业务身份标识
3. **模块范围层（Module Scope）**：数据访问范围

```sql
-- 身份标签表
CREATE TABLE `identity_tag` (
  `tag_code` varchar(50) NOT NULL,
  `tag_name` varchar(50) NOT NULL,
  `tag_desc` varchar(255) DEFAULT NULL,
  PRIMARY KEY (`tag_code`)
);

-- 模块范围详情表
CREATE TABLE `module_scope_detail` (
  `module_code` varchar(50) NOT NULL,
  `tag_code` varchar(50) NOT NULL,
  `scope` varchar(20) NOT NULL, -- 'self', 'dept', 'company'
  UNIQUE KEY `uk_module_scope_detail` (`module_code`, `tag_code`)
);
```

#### 动态权限计算

```javascript
// 前端权限检查
const hasModulePermission = (moduleCode) => {
  const userTag = userStore.user?.identityTagCode
  const scopeDetail = moduleScopeDetails.find(d => 
    d.moduleCode === moduleCode && d.tagCode === userTag
  )
  return scopeDetail?.scope || 'none'
}

// 后端数据过滤
private boolean canAccessData(UserProfile actor, String dataScope, Object targetData) {
    String userScope = getModuleScope(actor.getIdentityTagCode(), moduleCode);
    switch (userScope) {
        case "company": return true;
        case "dept": return isSameDepartment(actor, targetData);
        case "self": return isOwnData(actor, targetData);
        default: return false;
    }
}
```

### 结果

建立了灵活而精确的权限控制体系，支持复杂的企业级权限需求。

## 12. 审批状态机与规则引擎设计

### 问题

传统审批系统通常将流程逻辑硬编码在前端，导致：

- 审批规则变更需要修改代码
- 多级审批的状态流转容易出错
- 历史数据与新规则不兼容
- 审批权限判断逻辑分散

### 技术方案

#### 规则驱动的审批引擎

```sql
-- 审批规则表
CREATE TABLE `approval_rule` (
  `rule_id` int NOT NULL AUTO_INCREMENT,
  `type_code` varchar(50) NOT NULL,
  `applicant_tag` varchar(50) NOT NULL,
  `days_op` varchar(10) NOT NULL, -- '<=', '>', 'any'
  `days_value` decimal(6,2) NOT NULL DEFAULT 0.00,
  `first_approver_tag` varchar(50) NOT NULL,
  `second_approver_tag` varchar(50) DEFAULT NULL,
  `second_approver_scope` varchar(20) DEFAULT NULL,
  `sort_order` int NOT NULL DEFAULT 0
);
```

#### 状态机实现

```javascript
const getMatchedRule = (empId, days) => {
  const applicantTag = getEmployeeTag(empId)
  return approvalRules.value
    .filter(rule => matchDays(rule, days))
    .map(rule => ({
      rule,
      score: rule.applicantTag === applicantTag ? 2 : 
             userStore.matchIdentityTag(rule.applicantTag, applicantTag) ? 1 : 0
    }))
    .filter(item => item.score > 0)
    .sort((a, b) => (b.score - a.score) || (a.rule.sortOrder - b.rule.sortOrder))
    .map(item => item.rule)[0]
}

const getApprovalChain = (leave) => {
  const rule = getMatchedRule(leave.empId, Number(leave.days || 0))
  return {
    firstApproverTag: rule?.firstApproverTag || 'HR',
    secondApproverTag: rule?.secondApproverTag || '',
    secondApproverScope: rule?.secondApproverScope || 'company'
  }
}
```

#### 历史数据自动纠偏

```javascript
const normalizeLeaveRequests = async (items) => {
  const pendingItems = items.filter(item => 
    item.status === 'pending1' || item.status === 'pending2'
  )
  const corrections = pendingItems.filter(shouldNormalizeApproval)
  
  if (corrections.length > 0) {
    await Promise.all(corrections.map(item => {
      const normalized = getNormalizedApprovalPayload(item)
      return updateLeaveRequestApi(item.leaveId, { ...item, ...normalized })
    }))
  }
  
  return refreshedData
}
```

### 结果

实现了完全配置化的审批流程，支持复杂的多级审批和动态规则调整。

## 更新后的最终结论

这次项目最有含金量的工作，不是把某个页面改漂亮，也不是把某个按钮点通，而是完成了下面几件事：

1. **数据驱动转型**：把系统从前端假数据原型改造成数据库驱动的真实业务系统
2. **权限模型统一**：建立了角色+身份标签+模块范围的三层权限控制体系
3. **AI深度集成**：实现了完全动态的AI助手，支持实时数据获取和多模型切换
4. **审批引擎设计**：构建了配置驱动的审批状态机，支持复杂的多级审批流程
5. **架构可扩展性**：建立了数据驱动的配置化架构，支持业务规则的灵活调整

### 核心技术突破

- **多模型AI架构**：支持Ollama本地模型和云端API的无缝切换
- **细粒度权限控制**：基于身份标签的精确权限管理
- **规则引擎设计**：配置化的审批流程和状态机实现
- **动态数据获取**：AI助手与业务系统的深度集成
- **聊天记录持久化**：完整的用户体验闭环设计

如果再往后看，项目后续最值得继续投入的方向不是再修小问题，而是：

- 将审批状态机进一步下沉到后端统一处理
- 为关键业务增加审计日志与操作追踪
- 在现有规则化基础上引入更多AI能力（如文档生成、数据分析）
- 构建企业级的AI工作流平台