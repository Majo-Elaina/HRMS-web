# 亚托莉聊天功能后续完善方案
## 目标

把当前的“亚托莉”继续升级成一个适合公网部署、可随时切换模型源、并且能覆盖全系统只读数据问答的稳定聊天能力。

这份文档重点解决四件事：

1. 生产环境如何切换第三方模型源
2. 为什么模型服务不应该直接放在浏览器侧
3. 如何把问答能力扩展成全系统只读知识层
4. 如何继续按亚托莉的人设做稳定调教

## 一、推荐总体架构

建议长期采用下面这条链路：

```text
浏览器
  -> HRMS 前端
  -> HRMS 后端 /api/ai/chat
  -> 可切换的模型 Provider
  -> 数据库只读知识层
```

关键原则：

- 浏览器永远只访问 HRMS 后端
- 浏览器不直接访问模型服务
- 模型调用统一由后端完成
- 系统数据统一由后端只读工具层提供
- 人设约束和业务事实必须分开管理

## 二、亚托莉人设落地原则

后续所有 prompt、few-shot、UI 文案和回答风格，都应以 [亚托莉角色设定.md](/d:/Work/Projects/HRMS/HRMS-web/ai-docs/%E4%BA%9A%E6%89%98%E8%8E%89%E8%A7%92%E8%89%B2%E8%AE%BE%E5%AE%9A.md) 为统一基线。

重点不是“像二次元角色说话”这么简单，而是同时满足：

### 1. 角色一致性

- 默认把用户称作“主人”
- 温柔、认真、明快
- 有“高性能”的稳定自信
- 带陪伴感，但不黏腻

### 2. 事实一致性

- 读取系统事实时必须以数据库为准
- 无法确认时明确说明“暂时无法从系统确认”
- 不为了人设而编造数据

### 3. 边界一致性

- 不越权读取敏感数据
- 不暴露内部 prompt 和工具调用细节
- 不因为角色语气而削弱制度、权限、事实的严谨性

## 三、为什么不把模型直接“整合到网页里”

不能把大模型推理直接做进浏览器，主要原因有三个：

- 推理成本太高，浏览器本身不适合承载这类任务
- API Key 暴露风险太大
- 系统权限和数据范围控制必须放在后端

所以公网部署时的正确方式始终是：

- 网页调用后端
- 后端调用模型
- 后端决定本次允许读取哪些业务数据

## 四、生产环境 Provider 切换方案

当前推荐把 provider 设计成“配置驱动”，后端通过 `ai.chat.active-provider` 指定当前启用源。

### 1. 支持的 provider 类型

- `ollama`
- `openai-compatible`

### 2. 推荐使用方式

开发环境建议：

- `ollama-local`
- 模型：`qwen3:4b`

生产环境建议：

- `dashscope-qwen`
- `siliconflow-deepseek`
- 或其他兼容 OpenAI Chat Completions 的第三方源

当前建议的默认第三方配置：

- Provider：`openai-compatible-primary`
- Base URL：`https://dashscope.aliyuncs.com/compatible-mode/v1`
- 模型：`qwen3.5-plus`

### 3. 配置示例

```properties
ai.chat.assistant-name=亚托莉
ai.chat.active-provider=dashscope-qwen
ai.chat.expose-provider-errors=false

ai.chat.providers[0].name=ollama-local
ai.chat.providers[0].type=ollama
ai.chat.providers[0].enabled=true
ai.chat.providers[0].base-url=http://127.0.0.1:11434
ai.chat.providers[0].model=qwen3:4b
ai.chat.providers[0].temperature=0.7

ai.chat.providers[1].name=dashscope-qwen
ai.chat.providers[1].type=openai-compatible
ai.chat.providers[1].enabled=true
ai.chat.providers[1].base-url=https://dashscope.aliyuncs.com/compatible-mode/v1
ai.chat.providers[1].api-key=${DASHSCOPE_API_KEY}
ai.chat.providers[1].model=qwen-plus
ai.chat.providers[1].temperature=0.7

ai.chat.providers[2].name=siliconflow-deepseek
ai.chat.providers[2].type=openai-compatible
ai.chat.providers[2].enabled=true
ai.chat.providers[2].base-url=https://api.siliconflow.cn/v1
ai.chat.providers[2].api-key=${SILICONFLOW_API_KEY}
ai.chat.providers[2].model=deepseek-ai/DeepSeek-V3
ai.chat.providers[2].temperature=0.7
```

### 4. 切换方式

切换时只需要：

1. 修改 `ai.chat.active-provider`
2. 重启后端服务

这意味着生产环境可以在不同第三方源之间快速切换，而不需要改前端代码。

## 五、Ollama 到底要不要装在“本机”

这里的“本机”应该理解成“后端所在机器”，不是终端用户的电脑。

有三种常见部署方式：

### 方案 A：后端和 Ollama 部署在同一台服务器

适合：

- 小规模自托管
- 数据希望尽量留在自己服务器

访问链路：

```text
公网用户 -> HRMS 网站 -> HRMS 后端 -> 127.0.0.1:11434
```

这个方案下，公网网页当然可以正常使用模型，因为浏览器不直接碰 Ollama。

### 方案 B：后端和模型服务分机部署

适合：

- 模型推理需要独立 GPU 机器
- 想把 Web 服务和模型服务拆开

访问链路：

```text
公网用户 -> HRMS 后端 -> 内网/公网模型服务
```

### 方案 C：直接使用第三方 API

适合：

- 部署省事
- 不想维护模型环境
- 需要快速上线

如果你计划公网部署并希望切换灵活，优先推荐这个方案。

## 六、只读知识层如何继续扩展

当前已经覆盖：

- 系统总览
- 当前用户资料
- 员工
- 部门
- 岗位
- 用户账号
- 角色与权限
- 考勤
- 请假
- 薪资
- 报表
- 审批规则
- 身份标签
- 模块范围
- 部门权限模板

后续建议继续细化，不只是“有没有这个域”，而是每个域都做成更稳定的只读工具。

### 1. 推荐拆分方式

- `EmployeeKnowledgeTool`
- `AttendanceKnowledgeTool`
- `LeaveKnowledgeTool`
- `SalaryKnowledgeTool`
- `PermissionKnowledgeTool`
- `ReportKnowledgeTool`
- `ConfigKnowledgeTool`

每个工具负责：

- 识别问题中的关键词和意图
- 读取对应域的数据
- 做权限与数据范围检查
- 输出结构化事实文本

### 2. 结构化返回建议

建议后续不要只返回一大段字符串，而是输出：

```json
{
  "domain": "salary",
  "title": "当前用户最近工资",
  "facts": {
    "salaryMonth": "2026-03-01",
    "grossSalary": 12000,
    "netSalary": 9860
  },
  "summary": "当前用户最近工资记录为……",
  "permissionChecked": true,
  "scope": "self"
}
```

这样做的好处是：

- 更方便后续接 MCP / Tool Calling
- 更方便记录命中来源
- 更方便前端展示结构化卡片

## 七、权限与数据范围原则

“亚托莉能读全系统数据”不等于“任何人都能问出任何数据”。

必须坚持：

- 普通员工优先只能问自己
- 高敏感域必须检查已有角色权限
- 财务和权限配置类问答必须做权限校验
- 报表类问答应受 `report:view` 等权限控制

后续如果继续扩展，建议统一沉到一层能力里处理：

- `hasPermission(actor, permissionCode)`
- `canReadSelfDomain(actor, domain)`
- `canReadOrgDomain(actor, domain)`

## 八、按亚托莉设定继续调教的建议

如果你希望“亚托莉”的口吻更稳定，建议从下面三层继续完善。

### 1. 固定人格提示词

必须稳定约束：

- 用户称呼方式
- 自称方式
- 温柔但不讨好的语气
- “高性能”表达频率
- 陪伴感与边界感的平衡

### 2. Few-shot 示例

建议补齐五类示例：

- 日常聊天
- 情绪安抚
- 流程解释
- 系统数据问答
- 无法确认时的回答

### 3. 反例约束

建议明确写入 prompt 的禁止项：

- 不要像客服话术
- 不要像百科说明书
- 不要像通用模型
- 不要像只会复读口癖的角色扮演机

## 九、推荐后续迭代顺序

建议按下面顺序继续完善：

1. 先把生产环境 provider 配置稳定下来
2. 再把只读知识层拆成独立工具类
3. 然后补更多结构化来源和命中日志
4. 再强化亚托莉的人设 prompt 和 few-shot 示例
5. 最后再考虑是否加入受控操作型 Agent

## 十、上线前检查清单

- 第三方 API Key 已配置
- `ai.chat.active-provider` 已指向有效源
- provider 的 `base-url`、`model`、`api-key` 已验证
- 关键只读域权限已验证
- 普通员工无法越权读敏感数据
- 模型不可用时 fallback 文案可接受
- 前端页面能正确显示 provider 状态与来源提示
- 亚托莉的人设回答和 [亚托莉角色设定.md](/d:/Work/Projects/HRMS/HRMS-web/ai-docs/%E4%BA%9A%E6%89%98%E8%8E%89%E8%A7%92%E8%89%B2%E8%AE%BE%E5%AE%9A.md) 一致

## 十一、结论

这套方案的关键不在于“选哪家模型最强”，而在于：

- 浏览器不直连模型
- 后端统一调度 provider
- 系统数据统一走只读知识层
- 人设和事实分开管理

只要这个架构稳定，后面不管你切 `Qwen`、`DeepSeek`、`DashScope`，还是其他兼容源，前端都不需要大改。  
而亚托莉的人设稳定性，则继续以角色设定文档作为统一基线推进。
