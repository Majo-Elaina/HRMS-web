# 02 Org Employee API

## 部门

### GET /api/departments
参数：`page` `size` `keyword`
用途：分页查询部门。

### GET /api/departments/{id}
### POST /api/departments
### PUT /api/departments/{id}
### DELETE /api/departments/{id}
用途：部门 CRUD。

## 职位

### GET /api/positions
参数：`page` `size` `keyword` `deptId`
用途：分页查询职位。

### GET /api/positions/{id}
### POST /api/positions
### PUT /api/positions/{id}
### DELETE /api/positions/{id}
用途：职位 CRUD。

## 员工

### GET /api/employees
参数：`page` `size` `keyword` `deptId` `positionId` `status`
用途：分页查询员工。

### GET /api/employees/{id}
### POST /api/employees
### PUT /api/employees/{id}
### DELETE /api/employees/{id}
用途：员工 CRUD。

说明：
- `PUT /api/employees/{id}`` 为全量更新接口
- 员工状态切换、身份标签保存都通过该接口持久化
- 新增字段 `identityTagCode` 对应数据库列 `employee.identity_tag_code`

请求示例：
```json
{
  "empName": "李娜",
  "gender": "女",
  "phone": "13800000002",
  "email": "lina@company.com",
  "idCard": "110101199203120022",
  "birthday": "1992-03-12",
  "address": "北京市朝阳区",
  "hireDate": "2020-03-01",
  "leaveDate": null,
  "deptId": 2,
  "positionId": 3,
  "identityTagCode": "HR_SPECIALIST",
  "status": "在职"
}
```
