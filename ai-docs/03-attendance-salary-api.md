# 03 Attendance Salary API

## 考勤

### GET /api/attendance
参数：`page` `size` `empId` `status` `dateFrom` `dateTo`
用途：分页查询考勤记录。

### GET /api/attendance/{id}
### POST /api/attendance
### PUT /api/attendance/{id}
### DELETE /api/attendance/{id}
用途：考勤记录 CRUD。

## 请假

### GET /api/leave-requests
参数：`page` `size` `empId` `status` `leaveType`
用途：分页查询请假单。

### GET /api/leave-requests/{id}
### POST /api/leave-requests
### PUT /api/leave-requests/{id}
### DELETE /api/leave-requests/{id}
用途：请假申请、审批、取消都通过更新接口落库。

常见更新字段：
- `status`
- `approverId`
- `pendingApproverTag`
- `pendingApproverScope`
- `nextApproverTag`
- `nextApproverScope`
- `approveRemark`

## 薪资记录

### GET /api/salary-records
参数：`page` `size` `empId` `status` `salaryMonth`
用途：分页查询薪资记录。

### GET /api/salary-records/{id}
### POST /api/salary-records
### PUT /api/salary-records/{id}
### DELETE /api/salary-records/{id}
用途：薪资记录 CRUD、提交审批、审批通过、发放。

说明：
- 前端展示月份为 `YYYY-MM`
- 提交后端时统一转为 `YYYY-MM-01`

## 薪资配置

### GET /api/salary-configs
参数：`page` `size` `keyword` `status`
用途：分页查询薪资配置。

### GET /api/salary-configs/{id}
### POST /api/salary-configs
### PUT /api/salary-configs/{id}
### DELETE /api/salary-configs/{id}
用途：薪资配置 CRUD、提交审批、审批生效。
