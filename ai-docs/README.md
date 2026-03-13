# HRMS API Docs

本文档目录统一维护当前 HRMS 项目的接口说明，覆盖前端已接通的主要业务接口。

文档列表：
- `01-auth-permission-api.md`：认证、角色、权限、用户、部门模板
- `02-org-employee-api.md`：部门、职位、员工
- `03-attendance-salary-api.md`：考勤、请假、薪资记录、薪资配置
- `04-config-report-api.md`：模块范围、审批规则类型、审批规则、报表
- `05-system-oa-architecture.md`：系统 OA 流程、角色权限、整体架构
- `06-ai-agent-execution-guide.md`：AI agent 规划审批执行方案
- `07-leave-approval-rules.md`：请假审批规则口径与数据库映射
- `08-project-key-issues-retrospective.md`：项目重点问题与解决方案复盘
- `09-homepage-ai-agent-mvp.md`：亚托莉聊天助手、模型接入与动态数据获取说明
- `10-atri-chat-provider-roadmap.md`：亚托莉聊天功能的 provider 切换、部署与后续完善方案

## 重要更新说明

### 2026年3月更新
- **身份标签系统保留**：系统同时支持角色和身份标签双重权限管理体系
- **审批规则优化**：审批流程基于身份标签（identity_tag_code）进行匹配
- **UI全面现代化**：
  - 登录页面融入ATRI元素，采用双栏布局和动态背景
  - 身份标签页面采用现代化卡片布局
  - 薪资记录页面优化按钮布局
  - 考勤时间精确到秒
- **亚托莉助手完整实现**：
  - 支持完全动态的数据获取，实时反映系统最新状态
  - 聊天记录持久化，支持用户切换和页面刷新
  - 思考状态动画和现代化聊天界面
  - 全系统只读数据问答能力
- **多语言支持**：错误提示信息全面中文化
- **用户状态管理**：试用期员工无法登录，增强账户状态验证

通用响应结构：
```json
{
  "success": true,
  "message": "ok",
  "data": {}
}
```

分页响应 `data` 结构：
```json
{
  "items": [],
  "total": 0,
  "page": 1,
  "size": 10
}
```

后端默认地址：`http://localhost:8080`
前端开发代理：`/api -> http://localhost:8080`

数据库说明：
- 当前后端配置为 `spring.jpa.hibernate.ddl-auto=none`
- 使用最新的 [hrms-db.sql](/d:/Work/Projects/HRMS/HRMS-web/hrms-db.sql) 数据库结构
- 审批规则基于身份标签（identity_tag_code）进行匹配
- 支持角色和身份标签双重权限管理体系
