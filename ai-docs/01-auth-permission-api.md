# 01 Auth Permission API

## 认证

### POST /api/auth/login
用途：账号登录，返回 token 和当前用户资料。

请求示例：
```json
{
  "username": "emp_zhou",
  "password": "123456"
}
```

### GET /api/auth/profile/{userId}
用途：刷新登录用户资料与权限上下文。

## 角色与权限

### GET /api/roles
参数：`page` `size`
用途：分页查询角色列表。

### GET /api/roles/{id}
### POST /api/roles
### PUT /api/roles/{id}
### DELETE /api/roles/{id}
用途：角色基础 CRUD。

### GET /api/permissions/all
用途：查询全部权限树节点，前端角色权限树直接使用该接口。

### GET /api/permissions
### GET /api/permissions/{id}
### POST /api/permissions
### PUT /api/permissions/{id}
### DELETE /api/permissions/{id}
用途：权限基础 CRUD。

### GET /api/role-permissions/role/{roleId}
用途：查询角色权限关系明细。

### GET /api/role-permissions/role/{roleId}/perm-ids
用途：查询角色已分配权限 ID 列表，用于权限配置弹窗回显。

响应示例：
```json
[1, 2, 3, 30]
```

### GET /api/role-permissions/role/{roleId}/permissions
用途：查询角色权限实体列表。

### PUT /api/role-permissions/role/{roleId}
用途：整组替换角色权限。

请求示例：
```json
{
  "permIds": [1, 2, 3, 30, 43]
}
```

处理逻辑：
1. 删除当前角色旧的 `role_permission`
2. 立即 flush
3. 批量写入新的 `perm_id`

## 用户管理

### GET /api/users
参数：`page` `size` `keyword` `roleId` `status`
用途：分页查询系统用户。

### GET /api/users/{id}
### POST /api/users
### PUT /api/users/{id}
### DELETE /api/users/{id}
用途：用户基础 CRUD。

## 身份标签

### GET /api/identity-tags/all
用途：查询全部身份标签字典，身份标签页下拉框直接使用。

### GET /api/identity-tags
### GET /api/identity-tags/{id}
### POST /api/identity-tags
### PUT /api/identity-tags/{id}
### DELETE /api/identity-tags/{id}
用途：身份标签字典 CRUD。

## 部门权限模板

### GET /api/dept-permission-templates/all
用途：查询全部部门模板明细。

### GET /api/dept-permission-templates
参数：`page` `size` `deptId` `moduleCode`
用途：分页查询部门模板。

### GET /api/dept-permission-templates/{id}
### POST /api/dept-permission-templates
### PUT /api/dept-permission-templates/{id}
### DELETE /api/dept-permission-templates/{id}
用途：部门模板基础 CRUD。

### GET /api/dept-permission-templates/dept/{deptId}/modules
用途：查询单个部门已配置模块编码列表。

### PUT /api/dept-permission-templates/dept/{deptId}/modules
用途：整组替换单个部门的模块模板。

请求示例：
```json
[
  "base:employee",
  "attendance:record",
  "report"
]
```
