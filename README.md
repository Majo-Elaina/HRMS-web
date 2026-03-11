# 企业人事管理系统 HRMS Web

这是一个企业人事管理系统的前端项目，基于 `Vue 3 + Vite + Pinia + Vue Router + Element Plus` 构建，对接后端接口与 MySQL 数据库，覆盖人事、权限、考勤、请假、薪资、报表等核心场景。

项目当前已经从原型式前端页面演进为数据库驱动的业务系统，主要特征是：

- 角色权限由数据库 `role_permission` 驱动
- 员工身份通过 `employee.identity_tag_code` 统一建模
- 模块范围通过配置控制“本人 / 部门 / 公司”数据访问边界
- 请假审批、薪资审批通过 `approval_rule` 配置化驱动
- Dashboard / Report 基于真实业务数据汇总展示

## 功能概览

### 1. 基础信息管理

- 员工管理：员工档案、状态维护、身份标签联动
- 部门管理：部门维护与层级管理
- 职位管理：职位维护与组织归属

### 2. 考勤与请假

- 考勤记录：签到、签退、状态判断、记录维护
- 请假管理：发起申请、取消申请、逐级审批
- 首页快捷入口：个人签到/签退、个人请假申请

### 3. 薪资管理

- 薪资记录：录入、提交、审批、发放
- 薪资配置：配置项维护、提交审批、生效管理

### 4. 权限与配置

- 用户管理
- 角色管理与权限配置
- 身份标签管理
- 部门权限模板
- 模块范围配置
- 审批规则配置

### 5. 数据展示

- Dashboard：首页指标、图表、待办事项
- Report：统计报表与业务汇总

## 项目结构

```text
HRMS-web/
├─ src/
│  ├─ api/                 # 前端 API 封装
│  ├─ assets/              # 全局样式与静态资源
│  ├─ layout/              # 主布局
│  ├─ router/              # 路由与菜单入口
│  ├─ stores/              # Pinia 状态管理
│  ├─ utils/               # 工具函数
│  └─ views/               # 业务页面
├─ ai-docs/                # 接口、架构、审批、复盘等文档
├─ hrms-db.sql             # 数据库初始化与升级脚本
├─ vite.config.js          # Vite 配置与开发代理
└─ README.md               # 项目说明
```

`src/views` 主要按业务域划分：

- `base/`：员工、部门、职位
- `attendance/`：考勤记录、请假管理
- `salary/`：薪资记录、薪资配置
- `permission/`：用户、角色、身份标签、模块范围、审批规则等

## 技术栈

- Vue 3
- Vite 7
- Pinia
- Vue Router 4
- Element Plus
- Axios
- ECharts / vue-echarts

## 运行环境

- Node.js：`^20.19.0` 或 `>=22.12.0`
- npm
- 后端服务：默认 `http://localhost:8080`
- 数据库：MySQL

前端开发代理已配置：

- `/api -> http://localhost:8080`

并且开发模式会自动打开浏览器。

## 快速开始

### 1. 准备数据库

执行项目根目录下的数据库脚本：

```sql
hrms-db.sql
```

说明：

- 该脚本包含初始化表结构、基础数据、权限、审批规则、身份标签等内容
- 如果你的数据库已经有旧版本数据，至少要补齐脚本里的升级部分，例如 `employee.identity_tag_code`

### 2. 启动后端

确保后端项目已经启动，并监听：

```text
http://localhost:8080
```

如果后端地址不是这个端口，需要同步修改 [vite.config.js](/d:/Work/Projects/HRMS/HRMS-web/vite.config.js) 中的代理目标。

### 3. 安装依赖

在当前目录执行：

```bash
npm install
```

### 4. 启动前端开发环境

```bash
npm run dev
```

启动后会自动打开浏览器。

### 5. 构建生产版本

```bash
npm run build
```

### 6. 预览生产构建

```bash
npm run preview
```

## 默认测试账号 / 角色说明

数据库初始化脚本 `hrms-db.sql` 内置了一组默认测试账号，可用于快速验证不同角色的菜单、权限、审批链和数据范围。

| 用户名 | 密码 | 角色 | 典型用途 |
| --- | --- | --- | --- |
| `admin` | `admin123` | 系统管理员 `ADMIN` | 查看全系统、配置角色权限、审批规则、模块范围 |
| `hr_lina` | `123456` | HR专员 `HR` | 员工管理、请假一级审批、考勤维护 |
| `hr_manager` | `123456` | HR经理 `HR_MANAGER` | 请假高级审批、人事管理 |
| `manager_zhao` | `123456` | 部门经理 `MANAGER` | 本部门员工查看、部门相关审批 |
| `emp_zhou` | `123456` | 普通员工 `EMPLOYEE` | 个人签到、请假申请、个人薪资查看 |
| `finance_liu` | `123456` | 财务经理 `FINANCE_MANAGER` | 薪资审批、薪资发放 |
| `finance_chen` | `123456` | 财务专员 `FINANCE` | 薪资记录录入、薪资配置提交 |

说明：

- 这些账号依赖 `hrms-db.sql` 中的初始化用户数据
- 角色权限最终以数据库 `role_permission` 为准
- 业务审批身份最终以 `employee.identity_tag_code` 为准，不完全等同于登录角色
- 如果你修改了初始化 SQL、身份标签或角色权限，以上账号行为也会随之变化

## 文档入口

详细接口与系统说明统一维护在 [ai-docs/README.md](/d:/Work/Projects/HRMS/HRMS-web/ai-docs/README.md)，包括：

- 认证与权限接口
- 组织与员工接口
- 考勤、请假、薪资接口
- 模块范围与审批规则接口
- 系统 OA / 架构说明
- AI agent 接入方案
- 请假审批规则说明
- 项目重点问题复盘

## 当前实现特点

- 登录态缓存保留在前端，但业务数据以后端和数据库为准
- 角色权限、模块范围、审批规则均支持配置化
- 请假审批支持多级审批与历史单据自动纠偏
- 首页快捷操作与业务菜单共用同一套数据结构和后端接口

## 注意事项

- 当前后端配置为 `spring.jpa.hibernate.ddl-auto=none`
- 数据库结构变更不会自动建表，必须手动执行 SQL
- 如果前端页面与数据库规则不一致，优先检查：
  - `approval_rule`
  - `role_permission`
  - `employee.identity_tag_code`
  - `module_scope_rule / module_scope_detail`

## 相关文件

- 数据库脚本：[hrms-db.sql](/d:/Work/Projects/HRMS/HRMS-web/hrms-db.sql)
- 文档目录：[ai-docs/README.md](/d:/Work/Projects/HRMS/HRMS-web/ai-docs/README.md)
- Vite 配置：[vite.config.js](/d:/Work/Projects/HRMS/HRMS-web/vite.config.js)
