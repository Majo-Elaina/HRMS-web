# 请假审批规则

当前系统统一采用以下请假审批链：

- 普通员工请假：`HR专员 -> HR经理`
- 部门经理请假：`HR经理 -> 管理员`
- HR经理请假：`管理员`

## 规则说明

### 1. 普通员工 `EMPLOYEE`

- 一级审批人：`HR_SPECIALIST`
- 二级审批人：`HR_MANAGER`
- 二级审批范围：`company`

### 2. 部门经理 `MANAGER`

- 一级审批人：`HR_MANAGER`
- 二级审批人：`ADMIN`
- 二级审批范围：`company`

### 3. HR经理 `HR_MANAGER`

- 一级审批人：`ADMIN`
- 无二级审批

## 对应数据库规则

`approval_rule.type_code = 'leave'`

| applicant_tag | days_op | days_value | first_approver_tag | second_approver_tag | second_approver_scope |
| --- | --- | --- | --- | --- | --- |
| EMPLOYEE | <= | 3 | HR_SPECIALIST | HR_MANAGER | company |
| EMPLOYEE | > | 3 | HR_SPECIALIST | HR_MANAGER | company |
| MANAGER | any | 0 | HR_MANAGER | ADMIN | company |
| HR_MANAGER | any | 0 | ADMIN | 空 | company |

## 落地位置

- 前端默认规则：`src/stores/user.js`
- 数据库初始化：`hrms-db.sql`
- 审批规则接口文档：`ai-docs/04-config-report-api.md`
