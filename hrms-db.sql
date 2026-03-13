CREATE DATABASE IF NOT EXISTS `hrms_db`
  DEFAULT CHARACTER SET utf8mb4
  DEFAULT COLLATE utf8mb4_0900_ai_ci;

USE `hrms_db`;

SET NAMES utf8mb4;
SET FOREIGN_KEY_CHECKS = 0;

DROP TABLE IF EXISTS `agent_execution_log`;
DROP TABLE IF EXISTS `agent_approval_record`;
DROP TABLE IF EXISTS `agent_task`;
DROP TABLE IF EXISTS `operation_log`;
DROP TABLE IF EXISTS `role_permission`;
DROP TABLE IF EXISTS `permission`;
DROP TABLE IF EXISTS `leave_request`;
DROP TABLE IF EXISTS `sys_user`;
DROP TABLE IF EXISTS `salary_record`;
DROP TABLE IF EXISTS `salary_config`;
DROP TABLE IF EXISTS `attendance`;
DROP TABLE IF EXISTS `employee`;
DROP TABLE IF EXISTS `job_position`;
DROP TABLE IF EXISTS `dept_permission_template`;
DROP TABLE IF EXISTS `module_scope_detail`;
DROP TABLE IF EXISTS `module_scope_rule`;
DROP TABLE IF EXISTS `approval_rule`;
DROP TABLE IF EXISTS `approval_rule_type`;
DROP TABLE IF EXISTS `identity_tag`;
DROP TABLE IF EXISTS `role`;
DROP TABLE IF EXISTS `department`;

CREATE TABLE `department` (
  `dept_id` INT NOT NULL AUTO_INCREMENT,
  `dept_name` VARCHAR(100) NOT NULL,
  `dept_desc` TEXT NULL,
  `parent_id` INT NULL,
  `create_time` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `update_time` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`dept_id`),
  UNIQUE KEY `uk_department_name` (`dept_name`),
  KEY `idx_department_parent_id` (`parent_id`),
  CONSTRAINT `fk_department_parent`
    FOREIGN KEY (`parent_id`) REFERENCES `department` (`dept_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE `role` (
  `role_id` INT NOT NULL AUTO_INCREMENT,
  `role_name` VARCHAR(50) NOT NULL,
  `role_code` VARCHAR(50) NOT NULL,
  `role_desc` VARCHAR(255) NULL,
  `create_time` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`role_id`),
  UNIQUE KEY `uk_role_code` (`role_code`),
  UNIQUE KEY `uk_role_name` (`role_name`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE `identity_tag` (
  `tag_code` VARCHAR(50) NOT NULL,
  `tag_name` VARCHAR(50) NOT NULL,
  `tag_desc` VARCHAR(255) NULL,
  `create_time` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`tag_code`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE `approval_rule_type` (
  `type_code` VARCHAR(50) NOT NULL,
  `type_name` VARCHAR(100) NOT NULL,
  `type_desc` VARCHAR(255) NULL,
  `status` VARCHAR(20) NOT NULL DEFAULT '启用',
  `create_time` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `update_time` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`type_code`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE `approval_rule` (
  `rule_id` INT NOT NULL AUTO_INCREMENT,
  `type_code` VARCHAR(50) NOT NULL,
  `applicant_tag` VARCHAR(50) NOT NULL,
  `days_op` VARCHAR(10) NOT NULL,
  `days_value` DECIMAL(6,2) NOT NULL DEFAULT 0.00,
  `first_approver_tag` VARCHAR(50) NOT NULL,
  `second_approver_tag` VARCHAR(50) NULL,
  `second_approver_scope` VARCHAR(20) NULL,
  `sort_order` INT NOT NULL DEFAULT 0,
  `create_time` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `update_time` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`rule_id`),
  KEY `idx_approval_rule_type_code` (`type_code`),
  KEY `idx_approval_rule_applicant_tag` (`applicant_tag`),
  CONSTRAINT `fk_approval_rule_type`
    FOREIGN KEY (`type_code`) REFERENCES `approval_rule_type` (`type_code`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE `module_scope_rule` (
  `module_code` VARCHAR(50) NOT NULL,
  `module_name` VARCHAR(100) NOT NULL,
  `default_scope` VARCHAR(20) NOT NULL DEFAULT 'dept',
  `create_time` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `update_time` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`module_code`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE `module_scope_detail` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `module_code` VARCHAR(50) NOT NULL,
  `tag_code` VARCHAR(50) NOT NULL,
  `scope` VARCHAR(20) NOT NULL,
  `create_time` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `update_time` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_module_scope_detail` (`module_code`, `tag_code`),
  KEY `idx_module_scope_detail_tag_code` (`tag_code`),
  CONSTRAINT `fk_module_scope_detail_rule`
    FOREIGN KEY (`module_code`) REFERENCES `module_scope_rule` (`module_code`),
  CONSTRAINT `fk_module_scope_detail_tag`
    FOREIGN KEY (`tag_code`) REFERENCES `identity_tag` (`tag_code`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE `dept_permission_template` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `dept_id` INT NOT NULL,
  `module_code` VARCHAR(50) NOT NULL,
  `create_time` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_dept_permission_template` (`dept_id`, `module_code`),
  KEY `idx_dept_permission_template_module_code` (`module_code`),
  CONSTRAINT `fk_dept_permission_template_dept`
    FOREIGN KEY (`dept_id`) REFERENCES `department` (`dept_id`),
  CONSTRAINT `fk_dept_permission_template_module`
    FOREIGN KEY (`module_code`) REFERENCES `module_scope_rule` (`module_code`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE `job_position` (
  `position_id` INT NOT NULL AUTO_INCREMENT,
  `position_name` VARCHAR(100) NOT NULL,
  `position_desc` TEXT NULL,
  `dept_id` INT NOT NULL,
  `create_time` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `update_time` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`position_id`),
  KEY `idx_job_position_dept_id` (`dept_id`),
  CONSTRAINT `fk_job_position_dept`
    FOREIGN KEY (`dept_id`) REFERENCES `department` (`dept_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE `employee` (
  `emp_id` INT NOT NULL AUTO_INCREMENT,
  `emp_name` VARCHAR(50) NOT NULL,
  `gender` ENUM('男', '女') NOT NULL,
  `phone` VARCHAR(20) NOT NULL,
  `email` VARCHAR(100) NULL,
  `id_card` VARCHAR(18) NULL,
  `birthday` DATE NULL,
  `address` VARCHAR(255) NULL,
  `hire_date` DATE NOT NULL,
  `leave_date` DATE NULL,
  `dept_id` INT NOT NULL,
  `position_id` INT NOT NULL,
  `status` VARCHAR(20) NOT NULL DEFAULT '在职',
  `create_time` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `update_time` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`emp_id`),
  UNIQUE KEY `uk_employee_phone` (`phone`),
  UNIQUE KEY `uk_employee_email` (`email`),
  UNIQUE KEY `uk_employee_id_card` (`id_card`),
  KEY `idx_employee_dept_id` (`dept_id`),
  KEY `idx_employee_position_id` (`position_id`),
  KEY `idx_employee_hire_date` (`hire_date`),
  CONSTRAINT `fk_employee_dept`
    FOREIGN KEY (`dept_id`) REFERENCES `department` (`dept_id`),
  CONSTRAINT `fk_employee_position`
    FOREIGN KEY (`position_id`) REFERENCES `job_position` (`position_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE `attendance` (
  `attendance_id` INT NOT NULL AUTO_INCREMENT,
  `emp_id` INT NOT NULL,
  `attendance_date` DATE NOT NULL,
  `clock_in` TIME NULL,
  `clock_out` TIME NULL,
  `status` VARCHAR(20) NOT NULL,
  `remark` VARCHAR(255) NULL,
  `create_time` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`attendance_id`),
  UNIQUE KEY `uk_attendance_emp_date` (`emp_id`, `attendance_date`),
  KEY `idx_attendance_date_status` (`attendance_date`, `status`),
  CONSTRAINT `fk_attendance_emp`
    FOREIGN KEY (`emp_id`) REFERENCES `employee` (`emp_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE `salary_config` (
  `config_id` INT NOT NULL AUTO_INCREMENT,
  `config_name` VARCHAR(100) NOT NULL,
  `config_key` VARCHAR(100) NOT NULL,
  `config_value` VARCHAR(255) NOT NULL,
  `config_desc` VARCHAR(255) NULL,
  `effective_date` DATE NULL,
  `status` VARCHAR(20) NOT NULL DEFAULT '草稿',
  `submit_date` DATE NULL,
  `approve_date` DATE NULL,
  `create_time` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `update_time` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`config_id`),
  UNIQUE KEY `uk_salary_config_key_effective` (`config_key`, `effective_date`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE `salary_record` (
  `salary_id` INT NOT NULL AUTO_INCREMENT,
  `emp_id` INT NOT NULL,
  `salary_month` DATE NOT NULL,
  `base_salary` DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  `position_salary` DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  `bonus` DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  `overtime_pay` DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  `gross_salary` DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  `social_insurance` DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  `housing_fund` DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  `attendance_deduct` DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  `tax` DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  `other_deduct` DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  `net_salary` DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  `status` VARCHAR(20) NOT NULL DEFAULT '待发放',
  `submit_date` DATE NULL,
  `approve_date` DATE NULL,
  `pay_date` DATE NULL,
  `create_time` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `update_time` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`salary_id`),
  UNIQUE KEY `uk_salary_record_emp_month` (`emp_id`, `salary_month`),
  KEY `idx_salary_record_month` (`salary_month`),
  KEY `idx_salary_record_status` (`status`),
  CONSTRAINT `fk_salary_record_emp`
    FOREIGN KEY (`emp_id`) REFERENCES `employee` (`emp_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE `sys_user` (
  `user_id` INT NOT NULL AUTO_INCREMENT,
  `emp_id` INT NOT NULL,
  `username` VARCHAR(50) NOT NULL,
  `password` VARCHAR(255) NOT NULL,
  `role_id` INT NOT NULL,
  `status` VARCHAR(20) NOT NULL DEFAULT '启用',
  `last_login` DATETIME NULL,
  `create_time` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `update_time` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`user_id`),
  UNIQUE KEY `uk_sys_user_emp_id` (`emp_id`),
  UNIQUE KEY `uk_sys_user_username` (`username`),
  KEY `idx_sys_user_role_id` (`role_id`),
  CONSTRAINT `fk_sys_user_emp`
    FOREIGN KEY (`emp_id`) REFERENCES `employee` (`emp_id`),
  CONSTRAINT `fk_sys_user_role`
    FOREIGN KEY (`role_id`) REFERENCES `role` (`role_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE `agent_task` (
  `task_id` INT NOT NULL AUTO_INCREMENT,
  `user_id` INT NOT NULL,
  `command_text` TEXT NOT NULL,
  `intent` VARCHAR(100) NOT NULL,
  `risk_level` VARCHAR(20) NOT NULL,
  `status` VARCHAR(20) NOT NULL,
  `provider_name` VARCHAR(100) NULL,
  `requires_approval` TINYINT(1) NOT NULL DEFAULT 1,
  `executable` TINYINT(1) NOT NULL DEFAULT 0,
  `plan_json` TEXT NOT NULL,
  `result_summary` VARCHAR(255) NULL,
  `create_time` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `update_time` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`task_id`),
  KEY `idx_agent_task_user_id` (`user_id`),
  KEY `idx_agent_task_status` (`status`),
  KEY `idx_agent_task_create_time` (`create_time`),
  CONSTRAINT `fk_agent_task_user`
    FOREIGN KEY (`user_id`) REFERENCES `sys_user` (`user_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE `agent_approval_record` (
  `approval_id` INT NOT NULL AUTO_INCREMENT,
  `task_id` INT NOT NULL,
  `approver_user_id` INT NOT NULL,
  `action` VARCHAR(20) NOT NULL,
  `remark` VARCHAR(255) NULL,
  `create_time` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`approval_id`),
  KEY `idx_agent_approval_task_id` (`task_id`),
  KEY `idx_agent_approval_user_id` (`approver_user_id`),
  CONSTRAINT `fk_agent_approval_task`
    FOREIGN KEY (`task_id`) REFERENCES `agent_task` (`task_id`),
  CONSTRAINT `fk_agent_approval_user`
    FOREIGN KEY (`approver_user_id`) REFERENCES `sys_user` (`user_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE `agent_execution_log` (
  `log_id` INT NOT NULL AUTO_INCREMENT,
  `task_id` INT NOT NULL,
  `step_no` INT NOT NULL DEFAULT 0,
  `log_level` VARCHAR(20) NOT NULL,
  `message` VARCHAR(500) NOT NULL,
  `create_time` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`log_id`),
  KEY `idx_agent_execution_task_id` (`task_id`),
  KEY `idx_agent_execution_step_no` (`step_no`),
  CONSTRAINT `fk_agent_execution_task`
    FOREIGN KEY (`task_id`) REFERENCES `agent_task` (`task_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE `leave_request` (
  `leave_id` INT NOT NULL AUTO_INCREMENT,
  `emp_id` INT NOT NULL,
  `leave_type` VARCHAR(20) NOT NULL,
  `start_date` DATE NOT NULL,
  `end_date` DATE NOT NULL,
  `days` DECIMAL(6,2) NOT NULL,
  `reason` TEXT NOT NULL,
  `status` VARCHAR(20) NOT NULL,
  `approver_id` INT NULL,
  `pending_approver_tag` VARCHAR(50) NULL,
  `pending_approver_scope` VARCHAR(20) NULL,
  `next_approver_tag` VARCHAR(50) NULL,
  `next_approver_scope` VARCHAR(20) NULL,
  `apply_time` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `approve_time` DATETIME NULL,
  `approve_remark` VARCHAR(255) NULL,
  PRIMARY KEY (`leave_id`),
  KEY `idx_leave_request_emp_id` (`emp_id`),
  KEY `idx_leave_request_apply_time` (`apply_time`),
  KEY `idx_leave_request_status` (`status`),
  KEY `idx_leave_request_approver_id` (`approver_id`),
  CONSTRAINT `fk_leave_request_emp`
    FOREIGN KEY (`emp_id`) REFERENCES `employee` (`emp_id`),
  CONSTRAINT `fk_leave_request_approver`
    FOREIGN KEY (`approver_id`) REFERENCES `sys_user` (`user_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE `permission` (
  `perm_id` INT NOT NULL AUTO_INCREMENT,
  `perm_name` VARCHAR(100) NOT NULL,
  `perm_code` VARCHAR(100) NOT NULL,
  `perm_type` VARCHAR(20) NOT NULL DEFAULT 'BUTTON',
  `parent_id` INT NULL,
  `path` VARCHAR(255) NULL,
  `icon` VARCHAR(50) NULL,
  `sort_order` INT NOT NULL DEFAULT 0,
  `create_time` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`perm_id`),
  UNIQUE KEY `uk_permission_code` (`perm_code`),
  KEY `idx_permission_parent_id` (`parent_id`),
  CONSTRAINT `fk_permission_parent`
    FOREIGN KEY (`parent_id`) REFERENCES `permission` (`perm_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE `role_permission` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `role_id` INT NOT NULL,
  `perm_id` INT NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_role_permission` (`role_id`, `perm_id`),
  KEY `idx_role_permission_perm_id` (`perm_id`),
  CONSTRAINT `fk_role_permission_role`
    FOREIGN KEY (`role_id`) REFERENCES `role` (`role_id`),
  CONSTRAINT `fk_role_permission_perm`
    FOREIGN KEY (`perm_id`) REFERENCES `permission` (`perm_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE `operation_log` (
  `log_id` BIGINT NOT NULL AUTO_INCREMENT,
  `user_id` INT NULL,
  `operation_time` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `operation_type` VARCHAR(50) NOT NULL,
  `operation_module` VARCHAR(100) NOT NULL,
  `operation_desc` TEXT NOT NULL,
  PRIMARY KEY (`log_id`),
  KEY `idx_operation_log_user_id` (`user_id`),
  KEY `idx_operation_log_time` (`operation_time`),
  CONSTRAINT `fk_operation_log_user`
    FOREIGN KEY (`user_id`) REFERENCES `sys_user` (`user_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

INSERT INTO `department` (`dept_id`, `dept_name`, `dept_desc`, `parent_id`, `create_time`, `update_time`) VALUES
  (1, '总经办', '公司最高管理层', NULL, '2024-01-01 09:00:00', '2024-01-01 09:00:00'),
  (2, '人力资源部', '负责人力资源管理', 1, '2024-01-01 09:00:00', '2024-01-01 09:00:00'),
  (3, '财务部', '负责财务管理', 1, '2024-01-01 09:00:00', '2024-01-01 09:00:00'),
  (4, '技术部', '负责技术研发', 1, '2024-01-01 09:00:00', '2024-01-01 09:00:00'),
  (5, '市场部', '负责市场运营', 1, '2024-01-01 09:00:00', '2024-01-01 09:00:00'),
  (6, '行政部', '负责行政事务', 1, '2024-01-01 09:00:00', '2024-01-01 09:00:00'),
  (7, '综合部', '负责后勤与综合事务', 1, '2024-01-01 09:00:00', '2024-01-01 09:00:00');

INSERT INTO `role` (`role_id`, `role_name`, `role_code`, `role_desc`, `create_time`) VALUES
  (1, '系统管理员', 'ADMIN', '拥有系统全部权限', '2024-01-01 09:00:00'),
  (2, 'HR专员', 'HR', '负责人事基础信息与请假处理', '2024-01-01 09:00:00'),
  (3, '部门经理', 'MANAGER', '管理本部门员工与审批', '2024-01-01 09:00:00'),
  (4, '普通员工', 'EMPLOYEE', '普通员工自助权限', '2024-01-01 09:00:00'),
  (5, '财务经理', 'FINANCE_MANAGER', '负责薪资审批与发放', '2024-01-01 09:00:00'),
  (6, '财务专员', 'FINANCE', '负责薪资制单与配置提交', '2024-01-01 09:00:00'),
  (7, 'HR经理', 'HR_MANAGER', '负责人事审批与管理', '2024-01-01 09:00:00');

INSERT INTO `identity_tag` (`tag_code`, `tag_name`, `tag_desc`, `create_time`) VALUES
  ('ADMIN', '管理员', '系统管理员身份标签', '2024-01-01 09:00:00'),
  ('HR_MANAGER', 'HR经理', '人力资源经理身份标签', '2024-01-01 09:00:00'),
  ('HR_SPECIALIST', 'HR专员', '人力资源专员身份标签', '2024-01-01 09:00:00'),
  ('FINANCE_MANAGER', '财务经理', '财务经理身份标签', '2024-01-01 09:00:00'),
  ('FINANCE_SPECIALIST', '财务专员', '财务专员身份标签', '2024-01-01 09:00:00'),
  ('MANAGER', '部门经理', '普通业务部门经理身份标签', '2024-01-01 09:00:00'),
  ('EMPLOYEE', '普通员工', '普通员工身份标签', '2024-01-01 09:00:00');

INSERT INTO `approval_rule_type` (`type_code`, `type_name`, `type_desc`, `status`, `create_time`, `update_time`) VALUES
  ('leave', '请假审批规则', '请假申请的审批流转规则', '启用', '2024-01-01 09:00:00', '2024-01-01 09:00:00'),
  ('salary_record', '薪资记录审批规则', '薪资记录提交与审批流程', '启用', '2024-01-01 09:00:00', '2024-01-01 09:00:00'),
  ('salary_config', '薪资配置审批规则', '薪资配置提交与审批流程', '启用', '2024-01-01 09:00:00', '2024-01-01 09:00:00');

INSERT INTO `approval_rule` (`rule_id`, `type_code`, `applicant_tag`, `days_op`, `days_value`, `first_approver_tag`, `second_approver_tag`, `second_approver_scope`, `sort_order`, `create_time`, `update_time`) VALUES
  (1, 'leave', 'EMPLOYEE', '<=', 3.00, 'HR_SPECIALIST', 'HR_MANAGER', 'company', 1, '2024-01-01 09:00:00', '2024-01-01 09:00:00'),
  (2, 'leave', 'EMPLOYEE', '>', 3.00, 'HR_SPECIALIST', 'HR_MANAGER', 'company', 2, '2024-01-01 09:00:00', '2024-01-01 09:00:00'),
  (3, 'leave', 'MANAGER', 'any', 0.00, 'HR_MANAGER', 'ADMIN', 'company', 3, '2024-01-01 09:00:00', '2024-01-01 09:00:00'),
  (4, 'leave', 'HR_MANAGER', 'any', 0.00, 'ADMIN', NULL, 'company', 4, '2024-01-01 09:00:00', '2024-01-01 09:00:00'),
  (5, 'salary_record', 'FINANCE_SPECIALIST', 'any', 0.00, 'FINANCE_MANAGER', NULL, 'company', 1, '2024-01-01 09:00:00', '2024-01-01 09:00:00'),
  (6, 'salary_config', 'FINANCE_SPECIALIST', 'any', 0.00, 'FINANCE_MANAGER', NULL, 'company', 1, '2024-01-01 09:00:00', '2024-01-01 09:00:00');

INSERT INTO `module_scope_rule` (`module_code`, `module_name`, `default_scope`, `create_time`, `update_time`) VALUES
  ('base:employee', '员工管理', 'dept', '2024-01-01 09:00:00', '2024-01-01 09:00:00'),
  ('base:department', '部门管理', 'dept', '2024-01-01 09:00:00', '2024-01-01 09:00:00'),
  ('base:position', '职位管理', 'dept', '2024-01-01 09:00:00', '2024-01-01 09:00:00'),
  ('attendance:record', '考勤记录', 'dept', '2024-01-01 09:00:00', '2024-01-01 09:00:00'),
  ('attendance:leave', '请假管理', 'dept', '2024-01-01 09:00:00', '2024-01-01 09:00:00'),
  ('salary:record', '薪资记录', 'dept', '2024-01-01 09:00:00', '2024-01-01 09:00:00'),
  ('salary:config', '薪资配置', 'company', '2024-01-01 09:00:00', '2024-01-01 09:00:00'),
  ('report', '报表中心', 'dept', '2024-01-01 09:00:00', '2024-01-01 09:00:00');

INSERT INTO `module_scope_detail` (`id`, `module_code`, `tag_code`, `scope`, `create_time`, `update_time`) VALUES
  (1, 'base:employee', 'ADMIN', 'company', '2024-01-01 09:00:00', '2024-01-01 09:00:00'),
  (2, 'base:employee', 'HR_SPECIALIST', 'company', '2024-01-01 09:00:00', '2024-01-01 09:00:00'),
  (3, 'base:employee', 'HR_MANAGER', 'company', '2024-01-01 09:00:00', '2024-01-01 09:00:00'),
  (4, 'base:employee', 'FINANCE_SPECIALIST', 'dept', '2024-01-01 09:00:00', '2024-01-01 09:00:00'),
  (5, 'base:employee', 'FINANCE_MANAGER', 'dept', '2024-01-01 09:00:00', '2024-01-01 09:00:00'),
  (6, 'base:employee', 'MANAGER', 'dept', '2024-01-01 09:00:00', '2024-01-01 09:00:00'),
  (7, 'base:employee', 'EMPLOYEE', 'self', '2024-01-01 09:00:00', '2024-01-01 09:00:00'),
  (8, 'base:department', 'ADMIN', 'company', '2024-01-01 09:00:00', '2024-01-01 09:00:00'),
  (9, 'base:department', 'HR_SPECIALIST', 'company', '2024-01-01 09:00:00', '2024-01-01 09:00:00'),
  (10, 'base:department', 'HR_MANAGER', 'company', '2024-01-01 09:00:00', '2024-01-01 09:00:00'),
  (11, 'base:department', 'FINANCE_SPECIALIST', 'dept', '2024-01-01 09:00:00', '2024-01-01 09:00:00'),
  (12, 'base:department', 'FINANCE_MANAGER', 'dept', '2024-01-01 09:00:00', '2024-01-01 09:00:00'),
  (13, 'base:department', 'MANAGER', 'dept', '2024-01-01 09:00:00', '2024-01-01 09:00:00'),
  (14, 'base:department', 'EMPLOYEE', 'dept', '2024-01-01 09:00:00', '2024-01-01 09:00:00'),
  (15, 'base:position', 'ADMIN', 'company', '2024-01-01 09:00:00', '2024-01-01 09:00:00'),
  (16, 'base:position', 'HR_SPECIALIST', 'company', '2024-01-01 09:00:00', '2024-01-01 09:00:00'),
  (17, 'base:position', 'HR_MANAGER', 'company', '2024-01-01 09:00:00', '2024-01-01 09:00:00'),
  (18, 'base:position', 'FINANCE_SPECIALIST', 'dept', '2024-01-01 09:00:00', '2024-01-01 09:00:00'),
  (19, 'base:position', 'FINANCE_MANAGER', 'dept', '2024-01-01 09:00:00', '2024-01-01 09:00:00'),
  (20, 'base:position', 'MANAGER', 'dept', '2024-01-01 09:00:00', '2024-01-01 09:00:00'),
  (21, 'base:position', 'EMPLOYEE', 'dept', '2024-01-01 09:00:00', '2024-01-01 09:00:00'),
  (22, 'attendance:record', 'ADMIN', 'company', '2024-01-01 09:00:00', '2024-01-01 09:00:00'),
  (23, 'attendance:record', 'HR_SPECIALIST', 'company', '2024-01-01 09:00:00', '2024-01-01 09:00:00'),
  (24, 'attendance:record', 'HR_MANAGER', 'company', '2024-01-01 09:00:00', '2024-01-01 09:00:00'),
  (25, 'attendance:record', 'MANAGER', 'dept', '2024-01-01 09:00:00', '2024-01-01 09:00:00'),
  (26, 'attendance:record', 'EMPLOYEE', 'self', '2024-01-01 09:00:00', '2024-01-01 09:00:00'),
  (27, 'attendance:leave', 'ADMIN', 'company', '2024-01-01 09:00:00', '2024-01-01 09:00:00'),
  (28, 'attendance:leave', 'HR_SPECIALIST', 'company', '2024-01-01 09:00:00', '2024-01-01 09:00:00'),
  (29, 'attendance:leave', 'HR_MANAGER', 'company', '2024-01-01 09:00:00', '2024-01-01 09:00:00'),
  (30, 'attendance:leave', 'MANAGER', 'dept', '2024-01-01 09:00:00', '2024-01-01 09:00:00'),
  (31, 'attendance:leave', 'EMPLOYEE', 'self', '2024-01-01 09:00:00', '2024-01-01 09:00:00'),
  (32, 'salary:record', 'ADMIN', 'company', '2024-01-01 09:00:00', '2024-01-01 09:00:00'),
  (33, 'salary:record', 'FINANCE_SPECIALIST', 'company', '2024-01-01 09:00:00', '2024-01-01 09:00:00'),
  (34, 'salary:record', 'FINANCE_MANAGER', 'company', '2024-01-01 09:00:00', '2024-01-01 09:00:00'),
  (35, 'salary:config', 'ADMIN', 'company', '2024-01-01 09:00:00', '2024-01-01 09:00:00'),
  (36, 'salary:config', 'FINANCE_SPECIALIST', 'company', '2024-01-01 09:00:00', '2024-01-01 09:00:00'),
  (37, 'salary:config', 'FINANCE_MANAGER', 'company', '2024-01-01 09:00:00', '2024-01-01 09:00:00'),
  (38, 'report', 'ADMIN', 'company', '2024-01-01 09:00:00', '2024-01-01 09:00:00'),
  (39, 'report', 'HR_SPECIALIST', 'company', '2024-01-01 09:00:00', '2024-01-01 09:00:00'),
  (40, 'report', 'HR_MANAGER', 'company', '2024-01-01 09:00:00', '2024-01-01 09:00:00'),
  (41, 'report', 'FINANCE_SPECIALIST', 'company', '2024-01-01 09:00:00', '2024-01-01 09:00:00'),
  (42, 'report', 'FINANCE_MANAGER', 'company', '2024-01-01 09:00:00', '2024-01-01 09:00:00'),
  (43, 'report', 'MANAGER', 'dept', '2024-01-01 09:00:00', '2024-01-01 09:00:00'),
  (44, 'report', 'EMPLOYEE', 'self', '2024-01-01 09:00:00', '2024-01-01 09:00:00');

INSERT INTO `dept_permission_template` (`id`, `dept_id`, `module_code`, `create_time`) VALUES
  (1, 2, 'base:employee', '2024-01-01 09:00:00'),
  (2, 2, 'base:department', '2024-01-01 09:00:00'),
  (3, 2, 'base:position', '2024-01-01 09:00:00'),
  (4, 2, 'attendance:record', '2024-01-01 09:00:00'),
  (5, 2, 'attendance:leave', '2024-01-01 09:00:00'),
  (6, 2, 'report', '2024-01-01 09:00:00'),
  (7, 3, 'salary:record', '2024-01-01 09:00:00'),
  (8, 3, 'salary:config', '2024-01-01 09:00:00'),
  (9, 3, 'report', '2024-01-01 09:00:00'),
  (10, 4, 'attendance:record', '2024-01-01 09:00:00'),
  (11, 4, 'base:employee', '2024-01-01 09:00:00');

INSERT INTO `job_position` (`position_id`, `position_name`, `position_desc`, `dept_id`, `create_time`, `update_time`) VALUES
  (1, '总经理', '公司总负责人', 1, '2024-01-01 09:00:00', '2024-01-01 09:00:00'),
  (2, 'HR经理', '人力资源部负责人', 2, '2024-01-01 09:00:00', '2024-01-01 09:00:00'),
  (3, 'HR专员', '人力资源专员', 2, '2024-01-01 09:00:00', '2024-01-01 09:00:00'),
  (4, '财务经理', '财务部负责人', 3, '2024-01-01 09:00:00', '2024-01-01 09:00:00'),
  (5, '财务专员', '财务日常处理', 3, '2024-01-01 09:00:00', '2024-01-01 09:00:00'),
  (6, '技术总监', '技术部负责人', 4, '2024-01-01 09:00:00', '2024-01-01 09:00:00'),
  (7, '高级工程师', '技术骨干岗位', 4, '2024-01-01 09:00:00', '2024-01-01 09:00:00'),
  (8, '软件工程师', '技术研发岗位', 4, '2024-01-01 09:00:00', '2024-01-01 09:00:00'),
  (9, '市场经理', '市场部负责人', 5, '2024-01-01 09:00:00', '2024-01-01 09:00:00'),
  (10, '市场专员', '市场运营岗位', 5, '2024-01-01 09:00:00', '2024-01-01 09:00:00'),
  (11, '行政经理', '行政部负责人', 6, '2024-01-01 09:00:00', '2024-01-01 09:00:00'),
  (12, '行政专员', '行政事务岗位', 6, '2024-01-01 09:00:00', '2024-01-01 09:00:00'),
  (13, '综合部经理', '综合部负责人', 7, '2024-01-01 09:00:00', '2024-01-01 09:00:00'),
  (14, '后勤专员', '后勤与宿舍管理', 7, '2024-01-01 09:00:00', '2024-01-01 09:00:00');

INSERT INTO `employee` (`emp_id`, `emp_name`, `gender`, `phone`, `email`, `id_card`, `birthday`, `address`, `hire_date`, `leave_date`, `dept_id`, `position_id`, `status`, `create_time`, `update_time`) VALUES
  (1, '张伟', '男', '13800000001', 'zhangwei@company.com', '110101199001010011', '1990-01-01', '北京市海淀区', '2020-01-15', NULL, 1, 1, '在职', '2024-01-01 09:00:00', '2024-01-01 09:00:00'),
  (2, '李娜', '女', '13800000002', 'lina@company.com', '110101199203120022', '1992-03-12', '北京市朝阳区', '2020-03-01', NULL, 2, 3, '在职', '2024-01-01 09:00:00', '2024-01-01 09:00:00'),
  (3, '王芳', '女', '13800000003', 'wangfang@company.com', '110101199508080033', '1995-08-08', '北京市丰台区', '2021-06-15', NULL, 2, 3, '在职', '2024-01-01 09:00:00', '2024-01-01 09:00:00'),
  (4, '刘强', '男', '13800000004', 'liuqiang@company.com', '110101198909210044', '1989-09-21', '北京市西城区', '2020-05-20', NULL, 3, 4, '在职', '2024-01-01 09:00:00', '2024-01-01 09:00:00'),
  (5, '陈静', '女', '13800000005', 'chenjing@company.com', '110101199704150055', '1997-04-15', '北京市通州区', '2022-01-10', NULL, 3, 5, '在职', '2024-01-01 09:00:00', '2024-01-01 09:00:00'),
  (6, '赵明', '男', '13800000006', 'zhaoming@company.com', '110101198811180066', '1988-11-18', '北京市昌平区', '2019-08-01', NULL, 4, 6, '在职', '2024-01-01 09:00:00', '2024-01-01 09:00:00'),
  (7, '孙磊', '男', '13800000007', 'sunlei@company.com', '110101199402140077', '1994-02-14', '北京市顺义区', '2021-03-15', NULL, 4, 7, '在职', '2024-01-01 09:00:00', '2024-01-01 09:00:00'),
  (8, '周洋', '男', '13800000008', 'zhouyang@company.com', '110101199909090088', '1999-09-09', '北京市大兴区', '2022-07-01', NULL, 4, 8, '试用', '2024-01-01 09:00:00', '2024-01-01 09:00:00'),
  (9, '吴敏', '女', '13800000009', 'wumin@company.com', '110101199105260099', '1991-05-26', '北京市石景山区', '2020-11-01', NULL, 5, 9, '在职', '2024-01-01 09:00:00', '2024-01-01 09:00:00'),
  (10, '郑涛', '男', '13800000010', 'zhengtao@company.com', '110101199612300010', '1996-12-30', '北京市房山区', '2023-02-15', NULL, 5, 10, '在职', '2024-01-01 09:00:00', '2024-01-01 09:00:00'),
  (11, '黄丽', '女', '13800000011', 'huangli@company.com', '110101199303030011', '1993-03-03', '北京市门头沟区', '2021-09-01', NULL, 6, 11, '在职', '2024-01-01 09:00:00', '2024-01-01 09:00:00'),
  (12, '林峰', '男', '13800000012', 'linfeng@company.com', '110101199807170012', '1998-07-17', '北京市延庆区', '2023-05-01', NULL, 6, 12, '在职', '2024-01-01 09:00:00', '2024-01-01 09:00:00'),
  (13, '何军', '男', '13800000013', 'hejun@company.com', '110101199211110013', '1992-11-11', '北京市密云区', '2021-11-01', NULL, 7, 13, '在职', '2024-01-01 09:00:00', '2024-01-01 09:00:00'),
  (14, '许洁', '女', '13800000014', 'xujie@company.com', '110101199606060014', '1996-06-06', '北京市怀柔区', '2022-10-18', NULL, 7, 14, '在职', '2024-01-01 09:00:00', '2024-01-01 09:00:00'),
  (15, '郭婷', '女', '13800000015', 'guoting@company.com', '110101199410100015', '1994-10-10', '北京市东城区', '2019-12-20', NULL, 2, 2, '在职', '2024-01-01 09:00:00', '2024-01-01 09:00:00');

INSERT INTO `sys_user` (`user_id`, `emp_id`, `username`, `password`, `role_id`, `status`, `last_login`, `create_time`, `update_time`) VALUES
  (1, 1, 'admin', 'admin123', 1, '启用', NULL, '2024-01-01 09:00:00', '2024-01-01 09:00:00'),
  (2, 2, 'hr_lina', '123456', 2, '启用', NULL, '2024-01-01 09:00:00', '2024-01-01 09:00:00'),
  (3, 6, 'manager_zhao', '123456', 3, '启用', NULL, '2024-01-01 09:00:00', '2024-01-01 09:00:00'),
  (4, 8, 'emp_zhou', '123456', 4, '启用', NULL, '2024-01-01 09:00:00', '2024-01-01 09:00:00'),
  (5, 4, 'finance_liu', '123456', 5, '启用', NULL, '2024-01-01 09:00:00', '2024-01-01 09:00:00'),
  (6, 5, 'finance_chen', '123456', 6, '启用', NULL, '2024-01-01 09:00:00', '2024-01-01 09:00:00'),
  (7, 15, 'hr_manager', '123456', 7, '启用', NULL, '2024-01-01 09:00:00', '2024-01-01 09:00:00');

INSERT INTO `attendance` (`attendance_id`, `emp_id`, `attendance_date`, `clock_in`, `clock_out`, `status`, `remark`, `create_time`) VALUES
  (1, 1, '2024-01-15', '08:55:00', '18:05:00', '正常', NULL, '2024-01-15 18:05:00'),
  (2, 2, '2024-01-15', '09:10:00', '18:00:00', '迟到', '早会迟到10分钟', '2024-01-15 18:00:00'),
  (3, 3, '2024-01-15', '08:50:00', '17:30:00', '早退', '身体不适提前离岗', '2024-01-15 17:30:00'),
  (4, 4, '2024-01-15', '08:45:00', '18:10:00', '正常', NULL, '2024-01-15 18:10:00'),
  (5, 5, '2024-01-15', NULL, NULL, '请假', '年假中', '2024-01-15 09:00:00'),
  (6, 6, '2024-01-15', '08:30:00', '20:00:00', '加班', '项目上线支持', '2024-01-15 20:00:00'),
  (7, 7, '2024-01-15', '08:58:00', '18:02:00', '正常', NULL, '2024-01-15 18:02:00'),
  (8, 8, '2024-01-15', NULL, NULL, '缺勤', '未打卡且无请假记录', '2024-01-15 18:00:00');

INSERT INTO `leave_request` (`leave_id`, `emp_id`, `leave_type`, `start_date`, `end_date`, `days`, `reason`, `status`, `approver_id`, `pending_approver_tag`, `pending_approver_scope`, `next_approver_tag`, `next_approver_scope`, `apply_time`, `approve_time`, `approve_remark`) VALUES
  (1, 5, '年假', '2024-01-15', '2024-01-17', 3.00, '回老家探亲', 'HR已批', 2, NULL, NULL, NULL, NULL, '2024-01-10 09:30:00', '2024-01-11 14:00:00', '资料齐全，同意请假'),
  (2, 3, '病假', '2024-01-20', '2024-01-21', 2.00, '感冒发烧需要休息', '待审批', NULL, 'HR_SPECIALIST', 'company', 'HR_MANAGER', 'company', '2024-01-18 14:20:00', NULL, NULL),
  (3, 8, '事假', '2024-01-22', '2024-01-22', 1.00, '处理个人事务', '部门经理已批', 3, 'HR_SPECIALIST', 'dept', NULL, NULL, '2024-01-19 10:00:00', '2024-01-19 16:10:00', '先由HR继续处理'),
  (4, 10, '婚假', '2024-02-01', '2024-02-10', 10.00, '办理婚礼', '待审批', NULL, 'HR_SPECIALIST', 'company', 'HR_MANAGER', 'company', '2024-01-20 16:00:00', NULL, NULL),
  (5, 7, '年假', '2024-01-25', '2024-01-26', 2.00, '个人休假', '已拒绝', 3, NULL, NULL, NULL, NULL, '2024-01-15 11:30:00', '2024-01-16 09:30:00', '项目关键期暂不批准');

INSERT INTO `salary_config` (`config_id`, `config_name`, `config_key`, `config_value`, `config_desc`, `effective_date`, `status`, `submit_date`, `approve_date`, `create_time`, `update_time`) VALUES
  (1, '社保比例', 'social_insurance_rate', '0.105', '员工个人社保扣缴比例', '2024-01-01', '已审批', '2023-12-25', '2023-12-28', '2023-12-25 09:00:00', '2023-12-28 10:00:00'),
  (2, '公积金比例', 'housing_fund_rate', '0.08', '员工公积金扣缴比例', '2024-01-01', '已审批', '2023-12-25', '2023-12-28', '2023-12-25 09:00:00', '2023-12-28 10:00:00'),
  (3, '个税起征点', 'tax_threshold', '5000', '工资薪金个税起征点', '2024-01-01', '已审批', '2023-12-25', '2023-12-28', '2023-12-25 09:00:00', '2023-12-28 10:00:00'),
  (4, '迟到扣款', 'late_deduct', '50', '每次迟到扣款金额', '2024-01-01', '已审批', '2023-12-25', '2023-12-28', '2023-12-25 09:00:00', '2023-12-28 10:00:00');

INSERT INTO `salary_record` (`salary_id`, `emp_id`, `salary_month`, `base_salary`, `position_salary`, `bonus`, `overtime_pay`, `gross_salary`, `social_insurance`, `housing_fund`, `attendance_deduct`, `tax`, `other_deduct`, `net_salary`, `status`, `submit_date`, `approve_date`, `pay_date`, `create_time`, `update_time`) VALUES
  (1, 1, '2024-01-01', 25000.00, 5000.00, 3000.00, 0.00, 33000.00, 2475.00, 2400.00, 0.00, 2590.00, 0.00, 25535.00, '已发放', '2024-01-20', '2024-01-25', '2024-01-31', '2024-01-20 09:00:00', '2024-01-31 12:00:00'),
  (2, 2, '2024-01-01', 15000.00, 3000.00, 1500.00, 0.00, 19500.00, 1575.00, 1440.00, 50.00, 1045.00, 0.00, 15390.00, '已发放', '2024-01-20', '2024-01-25', '2024-01-31', '2024-01-20 09:00:00', '2024-01-31 12:00:00'),
  (3, 3, '2024-01-01', 10000.00, 2000.00, 800.00, 0.00, 12800.00, 1050.00, 960.00, 50.00, 434.00, 0.00, 10306.00, '已发放', '2024-01-20', '2024-01-25', '2024-01-31', '2024-01-20 09:00:00', '2024-01-31 12:00:00'),
  (4, 6, '2024-01-01', 20000.00, 5000.00, 2000.00, 1500.00, 28500.00, 2100.00, 1920.00, 0.00, 2095.00, 0.00, 22385.00, '已发放', '2024-01-20', '2024-01-25', '2024-01-31', '2024-01-20 09:00:00', '2024-01-31 12:00:00'),
  (5, 8, '2024-01-01', 8000.00, 1500.00, 500.00, 0.00, 10000.00, 840.00, 720.00, 200.00, 144.00, 0.00, 8096.00, '待发放', '2024-01-20', NULL, NULL, '2024-01-20 09:00:00', '2024-01-20 09:00:00');

INSERT INTO `permission` (`perm_id`, `perm_name`, `perm_code`, `perm_type`, `parent_id`, `path`, `icon`, `sort_order`, `create_time`) VALUES
  (1, '仪表盘', 'dashboard', 'MENU', NULL, '/dashboard', 'DataLine', 1, '2024-01-01 09:00:00'),
  (2, '仪表盘查看', 'dashboard:view', 'BUTTON', 1, NULL, NULL, 1, '2024-01-01 09:00:00'),
  (61, '亚托莉', 'dashboard:ai', 'MENU', 1, '/ai-assistant', 'ChatDotRound', 2, '2024-01-01 09:00:00'),
  (62, '亚托莉查看', 'dashboard:ai:view', 'BUTTON', 61, NULL, NULL, 1, '2024-01-01 09:00:00'),
  (3, '基础信息', 'base', 'MENU', NULL, '/base', 'Menu', 2, '2024-01-01 09:00:00'),
  (4, '员工管理', 'base:employee', 'MENU', 3, '/base/employee', 'User', 1, '2024-01-01 09:00:00'),
  (5, '部门管理', 'base:department', 'MENU', 3, '/base/department', 'OfficeBuilding', 2, '2024-01-01 09:00:00'),
  (6, '职位管理', 'base:position', 'MENU', 3, '/base/position', 'Suitcase', 3, '2024-01-01 09:00:00'),
  (7, '员工查看', 'base:employee:view', 'BUTTON', 4, NULL, NULL, 1, '2024-01-01 09:00:00'),
  (8, '部门查看', 'base:department:view', 'BUTTON', 5, NULL, NULL, 1, '2024-01-01 09:00:00'),
  (9, '职位查看', 'base:position:view', 'BUTTON', 6, NULL, NULL, 1, '2024-01-01 09:00:00'),
  (10, '员工新增', 'base:employee:add', 'BUTTON', 4, NULL, NULL, 2, '2024-01-01 09:00:00'),
  (11, '员工编辑', 'base:employee:edit', 'BUTTON', 4, NULL, NULL, 3, '2024-01-01 09:00:00'),
  (12, '员工删除', 'base:employee:delete', 'BUTTON', 4, NULL, NULL, 4, '2024-01-01 09:00:00'),
  (13, '部门新增', 'base:department:add', 'BUTTON', 5, NULL, NULL, 2, '2024-01-01 09:00:00'),
  (14, '部门编辑', 'base:department:edit', 'BUTTON', 5, NULL, NULL, 3, '2024-01-01 09:00:00'),
  (15, '部门删除', 'base:department:delete', 'BUTTON', 5, NULL, NULL, 4, '2024-01-01 09:00:00'),
  (16, '职位新增', 'base:position:add', 'BUTTON', 6, NULL, NULL, 2, '2024-01-01 09:00:00'),
  (17, '职位编辑', 'base:position:edit', 'BUTTON', 6, NULL, NULL, 3, '2024-01-01 09:00:00'),
  (18, '职位删除', 'base:position:delete', 'BUTTON', 6, NULL, NULL, 4, '2024-01-01 09:00:00'),
  (19, '考勤管理', 'attendance', 'MENU', NULL, '/attendance', 'Calendar', 3, '2024-01-01 09:00:00'),
  (20, '考勤记录', 'attendance:record', 'MENU', 19, '/attendance/record', 'Calendar', 1, '2024-01-01 09:00:00'),
  (21, '请假管理', 'attendance:leave', 'MENU', 19, '/attendance/leave', 'Document', 2, '2024-01-01 09:00:00'),
  (22, '考勤查看', 'attendance:record:view', 'BUTTON', 20, NULL, NULL, 1, '2024-01-01 09:00:00'),
  (23, '请假查看', 'attendance:leave:view', 'BUTTON', 21, NULL, NULL, 1, '2024-01-01 09:00:00'),
  (24, '考勤新增', 'attendance:record:add', 'BUTTON', 20, NULL, NULL, 2, '2024-01-01 09:00:00'),
  (25, '考勤编辑', 'attendance:record:edit', 'BUTTON', 20, NULL, NULL, 3, '2024-01-01 09:00:00'),
  (26, '请假申请', 'attendance:leave:add', 'BUTTON', 21, NULL, NULL, 2, '2024-01-01 09:00:00'),
  (27, '请假审批', 'attendance:leave:approve', 'BUTTON', 21, NULL, NULL, 3, '2024-01-01 09:00:00'),
  (28, '请假撤销', 'attendance:leave:cancel', 'BUTTON', 21, NULL, NULL, 4, '2024-01-01 09:00:00'),
  (29, '薪资管理', 'salary', 'MENU', NULL, '/salary', 'Money', 4, '2024-01-01 09:00:00'),
  (30, '薪资记录', 'salary:record', 'MENU', 29, '/salary/record', 'List', 1, '2024-01-01 09:00:00'),
  (31, '薪资配置', 'salary:config', 'MENU', 29, '/salary/config', 'Tools', 2, '2024-01-01 09:00:00'),
  (32, '薪资记录查看', 'salary:record:view', 'BUTTON', 30, NULL, NULL, 1, '2024-01-01 09:00:00'),
  (33, '薪资配置查看', 'salary:config:view', 'BUTTON', 31, NULL, NULL, 1, '2024-01-01 09:00:00'),
  (34, '薪资记录新增', 'salary:record:add', 'BUTTON', 30, NULL, NULL, 2, '2024-01-01 09:00:00'),
  (35, '薪资记录编辑', 'salary:record:edit', 'BUTTON', 30, NULL, NULL, 3, '2024-01-01 09:00:00'),
  (36, '薪资记录提交', 'salary:record:submit', 'BUTTON', 30, NULL, NULL, 4, '2024-01-01 09:00:00'),
  (37, '薪资记录审批', 'salary:record:approve', 'BUTTON', 30, NULL, NULL, 5, '2024-01-01 09:00:00'),
  (38, '薪资记录发放', 'salary:record:pay', 'BUTTON', 30, NULL, NULL, 6, '2024-01-01 09:00:00'),
  (39, '薪资配置新增', 'salary:config:add', 'BUTTON', 31, NULL, NULL, 2, '2024-01-01 09:00:00'),
  (40, '薪资配置编辑', 'salary:config:edit', 'BUTTON', 31, NULL, NULL, 3, '2024-01-01 09:00:00'),
  (41, '薪资配置提交', 'salary:config:submit', 'BUTTON', 31, NULL, NULL, 4, '2024-01-01 09:00:00'),
  (42, '薪资配置审批', 'salary:config:approve', 'BUTTON', 31, NULL, NULL, 5, '2024-01-01 09:00:00'),
  (43, '权限管理', 'permission', 'MENU', NULL, '/permission', 'Lock', 5, '2024-01-01 09:00:00'),
  (44, '用户管理', 'permission:user', 'MENU', 43, '/permission/user', 'UserFilled', 1, '2024-01-01 09:00:00'),
  (45, '角色管理', 'permission:role', 'MENU', 43, '/permission/role', 'Avatar', 2, '2024-01-01 09:00:00'),
  (46, '用户查看', 'permission:user:view', 'BUTTON', 44, NULL, NULL, 1, '2024-01-01 09:00:00'),
  (47, '角色查看', 'permission:role:view', 'BUTTON', 45, NULL, NULL, 1, '2024-01-01 09:00:00'),
  (48, '部门模板查看', 'permission:dept-template:view', 'BUTTON', 43, NULL, NULL, 3, '2024-01-01 09:00:00'),
  (49, '身份标签查看', 'permission:identity:view', 'BUTTON', 43, NULL, NULL, 4, '2024-01-01 09:00:00'),
  (50, '模块范围查看', 'permission:module-scope:view', 'BUTTON', 43, NULL, NULL, 5, '2024-01-01 09:00:00'),
  (51, '审批规则查看', 'permission:approval-rule:view', 'BUTTON', 43, NULL, NULL, 6, '2024-01-01 09:00:00'),
  (52, '用户新增', 'permission:user:add', 'BUTTON', 44, NULL, NULL, 2, '2024-01-01 09:00:00'),
  (53, '用户编辑', 'permission:user:edit', 'BUTTON', 44, NULL, NULL, 3, '2024-01-01 09:00:00'),
  (54, '用户删除', 'permission:user:delete', 'BUTTON', 44, NULL, NULL, 4, '2024-01-01 09:00:00'),
  (55, '角色新增', 'permission:role:add', 'BUTTON', 45, NULL, NULL, 2, '2024-01-01 09:00:00'),
  (56, '角色编辑', 'permission:role:edit', 'BUTTON', 45, NULL, NULL, 3, '2024-01-01 09:00:00'),
  (57, '角色删除', 'permission:role:delete', 'BUTTON', 45, NULL, NULL, 4, '2024-01-01 09:00:00'),
  (58, '角色授权', 'permission:role:perm', 'BUTTON', 45, NULL, NULL, 5, '2024-01-01 09:00:00'),
  (59, '报表中心', 'report', 'MENU', NULL, '/report', 'PieChart', 6, '2024-01-01 09:00:00'),
  (60, '报表查看', 'report:view', 'BUTTON', 59, NULL, NULL, 1, '2024-01-01 09:00:00');

INSERT INTO `role_permission` (`role_id`, `perm_id`)
SELECT 1, `perm_id` FROM `permission`;

INSERT INTO `role_permission` (`role_id`, `perm_id`)
SELECT 2, `perm_id` FROM `permission`
WHERE `perm_code` IN ('dashboard', 'dashboard:view', 'base', 'base:employee', 'base:department', 'base:position', 'base:employee:view', 'base:department:view', 'base:position:view', 'base:employee:add', 'base:employee:edit', 'base:employee:delete', 'base:department:add', 'base:department:edit', 'base:department:delete', 'base:position:add', 'base:position:edit', 'base:position:delete', 'attendance', 'attendance:record', 'attendance:leave', 'attendance:record:view', 'attendance:leave:view', 'attendance:record:add', 'attendance:record:edit', 'attendance:leave:add', 'attendance:leave:approve', 'attendance:leave:cancel', 'salary', 'salary:record', 'salary:record:view', 'report', 'report:view');

INSERT INTO `role_permission` (`role_id`, `perm_id`)
SELECT 7, `perm_id` FROM `permission`
WHERE `perm_code` IN ('dashboard', 'dashboard:view', 'base', 'base:employee', 'base:department', 'base:position', 'base:employee:view', 'base:department:view', 'base:position:view', 'base:employee:add', 'base:employee:edit', 'base:employee:delete', 'base:department:add', 'base:department:edit', 'base:department:delete', 'base:position:add', 'base:position:edit', 'base:position:delete', 'attendance', 'attendance:record', 'attendance:leave', 'attendance:record:view', 'attendance:leave:view', 'attendance:record:add', 'attendance:record:edit', 'attendance:leave:add', 'attendance:leave:approve', 'attendance:leave:cancel', 'salary', 'salary:record', 'salary:record:view', 'report', 'report:view');

INSERT INTO `role_permission` (`role_id`, `perm_id`)
SELECT 3, `perm_id` FROM `permission`
WHERE `perm_code` IN ('dashboard', 'dashboard:view', 'base', 'base:employee', 'base:employee:view', 'base:employee:edit', 'attendance', 'attendance:record', 'attendance:record:view', 'attendance:leave', 'attendance:leave:view', 'attendance:leave:approve', 'attendance:leave:cancel', 'salary', 'salary:record', 'salary:record:view', 'report', 'report:view');

INSERT INTO `role_permission` (`role_id`, `perm_id`)
SELECT 4, `perm_id` FROM `permission`
WHERE `perm_code` IN ('dashboard', 'dashboard:view', 'attendance', 'attendance:record', 'attendance:record:view', 'attendance:leave', 'attendance:leave:view', 'attendance:leave:add', 'attendance:leave:cancel', 'salary', 'salary:record', 'salary:record:view');

INSERT INTO `role_permission` (`role_id`, `perm_id`)
SELECT 5, `perm_id` FROM `permission`
WHERE `perm_code` IN ('dashboard', 'dashboard:view', 'salary', 'salary:record', 'salary:record:view', 'salary:config', 'salary:config:view', 'salary:record:approve', 'salary:record:pay', 'salary:config:approve');

INSERT INTO `role_permission` (`role_id`, `perm_id`)
SELECT 6, `perm_id` FROM `permission`
WHERE `perm_code` IN ('dashboard', 'dashboard:view', 'salary', 'salary:record', 'salary:record:view', 'salary:config', 'salary:config:view', 'salary:record:add', 'salary:record:edit', 'salary:record:submit', 'salary:config:add', 'salary:config:edit', 'salary:config:submit');

INSERT INTO `operation_log` (`log_id`, `user_id`, `operation_time`, `operation_type`, `operation_module`, `operation_desc`) VALUES
  (1, 1, '2024-01-01 09:30:00', '登录', '认证中心', '系统管理员首次登录系统'),
  (2, 2, '2024-01-10 09:35:00', '审批', '请假管理', 'HR专员审批了陈静的请假申请'),
  (3, 5, '2024-01-25 10:00:00', '审批', '薪资管理', '财务经理审批了2024年1月薪资记录');

ALTER TABLE `employee`
  ADD COLUMN `identity_tag_code` VARCHAR(50) NULL AFTER `position_id`,
  ADD KEY `idx_employee_identity_tag_code` (`identity_tag_code`),
  ADD CONSTRAINT `fk_employee_identity_tag`
    FOREIGN KEY (`identity_tag_code`) REFERENCES `identity_tag` (`tag_code`);

UPDATE `employee` SET `identity_tag_code` = 'ADMIN' WHERE `emp_id` = 1;
UPDATE `employee` SET `identity_tag_code` = 'HR_SPECIALIST' WHERE `emp_id` IN (2, 3);
UPDATE `employee` SET `identity_tag_code` = 'FINANCE_MANAGER' WHERE `emp_id` = 4;
UPDATE `employee` SET `identity_tag_code` = 'FINANCE_SPECIALIST' WHERE `emp_id` = 5;
UPDATE `employee` SET `identity_tag_code` = 'MANAGER' WHERE `emp_id` IN (6, 9, 11, 13);
UPDATE `employee` SET `identity_tag_code` = 'EMPLOYEE' WHERE `emp_id` IN (7, 8, 10, 12, 14);
UPDATE `employee` SET `identity_tag_code` = 'HR_MANAGER' WHERE `emp_id` = 15;

SET FOREIGN_KEY_CHECKS = 1;

-- =====================================================
-- AI聊天记录表
-- =====================================================

-- 亚托莉聊天记录表
CREATE TABLE IF NOT EXISTS `ai_chat_message` (
  `id` BIGINT NOT NULL AUTO_INCREMENT COMMENT '主键ID',
  `user_id` BIGINT NOT NULL COMMENT '用户ID',
  `role` VARCHAR(20) NOT NULL COMMENT '角色：user/assistant',
  `content` TEXT NOT NULL COMMENT '消息内容',
  `provider_name` VARCHAR(100) DEFAULT NULL COMMENT 'AI提供商名称',
  `model_name` VARCHAR(100) DEFAULT NULL COMMENT '模型名称',
  `used_system_data` TINYINT(1) DEFAULT 0 COMMENT '是否使用了系统数据',
  `create_time` DATETIME NOT NULL COMMENT '创建时间',
  PRIMARY KEY (`id`),
  KEY `idx_user_id` (`user_id`),
  KEY `idx_create_time` (`create_time`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='AI聊天记录表';

-- 为管理员账号添加AI助手访问权限（如果不存在）
INSERT IGNORE INTO `permission` (`perm_name`, `perm_code`, `parent_id`, `perm_type`, `sort_order`)
VALUES ('AI助手', 'dashboard:ai', 1, 'menu', 2);

INSERT IGNORE INTO `permission` (`perm_name`, `perm_code`, `parent_id`, `perm_type`, `sort_order`)
SELECT 'AI助手查看', 'dashboard:ai:view', `perm_id`, 'button', 1
FROM `permission`
WHERE `perm_code` = 'dashboard:ai'
LIMIT 1;

-- 为所有角色添加AI助手权限（如果不存在）
INSERT IGNORE INTO `role_permission` (`role_id`, `perm_id`)
SELECT r.`role_id`, p.`perm_id`
FROM `role` r
CROSS JOIN `permission` p
WHERE p.`perm_code` IN ('dashboard:ai', 'dashboard:ai:view');
