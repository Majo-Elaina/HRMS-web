# 04 Config Report API

## 模块范围

### GET /api/module-scope-rules/configs
用途：查询模块范围配置列表，返回模块名、默认范围、身份标签细粒度范围。

响应示例：
```json
[
  {
    "moduleCode": "base:employee",
    "moduleName": "员工管理",
    "defaultScope": "dept",
    "tagScopes": {
      "ADMIN": "company",
      "EMPLOYEE": "self"
    }
  }
]
```

### PUT /api/module-scope-rules/{moduleCode}/config
用途：保存单个模块范围配置。

请求示例：
```json
{
  "moduleCode": "base:employee",
  "defaultScope": "dept",
  "tagScopes": {
    "ADMIN": "company",
    "HR_SPECIALIST": "company",
    "EMPLOYEE": "self"
  }
}
```

### GET /api/module-scope-rules/all
### GET /api/module-scope-rules
### GET /api/module-scope-rules/{id}
### POST /api/module-scope-rules
### PUT /api/module-scope-rules/{id}
### DELETE /api/module-scope-rules/{id}
用途：模块范围规则基础接口。

### GET /api/module-scope-details
### GET /api/module-scope-details/{id}
### POST /api/module-scope-details
### PUT /api/module-scope-details/{id}
### DELETE /api/module-scope-details/{id}
用途：模块范围明细基础接口。

## 审批规则类型

### GET /api/approval-rule-types/all
用途：查询全部审批规则类型，用于审批规则页类型切换。

### GET /api/approval-rule-types
### GET /api/approval-rule-types/{id}
### POST /api/approval-rule-types
### PUT /api/approval-rule-types/{id}
### DELETE /api/approval-rule-types/{id}
用途：审批规则类型 CRUD。

## 审批规则

### GET /api/approval-rules
参数：`page` `size` `typeCode` `applicantTag`
用途：按类型查询审批规则。

### GET /api/approval-rules/{id}
### POST /api/approval-rules
### PUT /api/approval-rules/{id}
### DELETE /api/approval-rules/{id}
用途：审批规则 CRUD。

请求示例：
```json
{
  "typeCode": "leave",
  "applicantTag": "EMPLOYEE",
  "daysOp": "<=",
  "daysValue": 3,
  "firstApproverTag": "HR_SPECIALIST",
  "secondApproverTag": "HR_MANAGER",
  "secondApproverScope": "company",
  "sortOrder": 5
}
```

默认请假审批规则：
- 普通员工请假：`HR_SPECIALIST -> HR_MANAGER`
- 部门经理请假：`HR_MANAGER -> ADMIN`
- HR经理请假：`ADMIN`

## 报表

### GET /api/report/summary
用途：仪表盘和报表页的汇总统计接口。

响应字段示例：
```json
{
  "totalEmployees": 15,
  "newEmployeesThisMonth": 2,
  "attendanceRate": 96.2,
  "leaveCountThisMonth": 5,
  "salaryPaidCount": 4
}
```
