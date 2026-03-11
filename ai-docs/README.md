# HRMS API Docs

本文档目录统一维护当前 HRMS 项目的接口说明，覆盖前端已接通的主要业务接口。

文档列表：
- `01-auth-permission-api.md`：认证、角色、权限、用户、身份标签、部门模板
- `02-org-employee-api.md`：部门、职位、员工
- `03-attendance-salary-api.md`：考勤、请假、薪资记录、薪资配置
- `04-config-report-api.md`：模块范围、审批规则类型、审批规则、报表
- `05-system-oa-architecture.md`：系统 OA 流程、角色权限、整体架构
- `06-ai-agent-execution-guide.md`：AI agent 规划审批执行方案
- `07-leave-approval-rules.md`：请假审批规则口径与数据库映射
- `08-project-key-issues-retrospective.md`：项目重点问题与解决方案复盘

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
- 如果数据库还是旧版本，需要先执行 [hrms-db.sql](/d:/Work/Projects/HRMS/HRMS-web/hrms-db.sql) 或至少补上 `employee.identity_tag_code` 字段升级 SQL
