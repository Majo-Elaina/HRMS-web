// Mock 数据

// 部门数据
export const departments = [
  { deptId: 1, deptName: '总经办', deptDesc: '公司最高管理层', parentId: null },
  { deptId: 2, deptName: '人力资源部', deptDesc: '负责人力资源管理', parentId: 1 },
  { deptId: 3, deptName: '财务部', deptDesc: '负责财务管理', parentId: 1 },
  { deptId: 4, deptName: '技术部', deptDesc: '负责技术研发', parentId: 1 },
  { deptId: 5, deptName: '市场部', deptDesc: '负责市场营销', parentId: 1 },
  { deptId: 6, deptName: '行政部', deptDesc: '负责行政事务', parentId: 1 },
  { deptId: 7, deptName: '综合部', deptDesc: '负责综合事务，如住宿、后勤等', parentId: 1 }
]

// 职位数据
export const positions = [
  { positionId: 1, positionName: '总经理', positionDesc: '公司总经理', deptId: 1 },
  { positionId: 2, positionName: 'HR经理', positionDesc: '人力资源部经理', deptId: 2 },
  { positionId: 3, positionName: 'HR专员', positionDesc: '人力资源专员', deptId: 2 },
  { positionId: 4, positionName: '财务经理', positionDesc: '财务部经理', deptId: 3 },
  { positionId: 5, positionName: '财务专员', positionDesc: '财务日常处理', deptId: 3 },
  { positionId: 6, positionName: '技术总监', positionDesc: '技术部总监', deptId: 4 },
  { positionId: 7, positionName: '高级工程师', positionDesc: '高级软件工程师', deptId: 4 },
  { positionId: 8, positionName: '软件工程师', positionDesc: '软件工程师', deptId: 4 },
  { positionId: 9, positionName: '市场经理', positionDesc: '市场部经理', deptId: 5 },
  { positionId: 10, positionName: '市场专员', positionDesc: '市场专员', deptId: 5 },
  { positionId: 11, positionName: '行政经理', positionDesc: '行政部经理', deptId: 6 },
  { positionId: 12, positionName: '行政专员', positionDesc: '行政专员', deptId: 6 },
  { positionId: 13, positionName: '综合部经理', positionDesc: '综合部负责人', deptId: 7 },
  { positionId: 14, positionName: '后勤专员', positionDesc: '住宿与后勤事务', deptId: 7 }
]

// 员工数据
export const employees = [
  { empId: 1, empName: '张伟', gender: '男', phone: '13800000001', email: 'zhangwei@company.com', hireDate: '2020-01-15', deptId: 1, positionId: 1, status: '在职' },
  { empId: 2, empName: '李娜', gender: '女', phone: '13800000002', email: 'lina@company.com', hireDate: '2020-03-01', deptId: 2, positionId: 2, status: '在职' },
  { empId: 3, empName: '王芳', gender: '女', phone: '13800000003', email: 'wangfang@company.com', hireDate: '2021-06-15', deptId: 2, positionId: 3, status: '在职' },
  { empId: 4, empName: '刘强', gender: '男', phone: '13800000004', email: 'liuqiang@company.com', hireDate: '2020-05-20', deptId: 3, positionId: 4, status: '在职' },
  { empId: 5, empName: '陈静', gender: '女', phone: '13800000005', email: 'chenjing@company.com', hireDate: '2022-01-10', deptId: 3, positionId: 5, status: '在职' },
  { empId: 6, empName: '赵明', gender: '男', phone: '13800000006', email: 'zhaoming@company.com', hireDate: '2019-08-01', deptId: 4, positionId: 6, status: '在职' },
  { empId: 7, empName: '孙磊', gender: '男', phone: '13800000007', email: 'sunlei@company.com', hireDate: '2021-03-15', deptId: 4, positionId: 7, status: '在职' },
  { empId: 8, empName: '周洋', gender: '男', phone: '13800000008', email: 'zhouyang@company.com', hireDate: '2022-07-01', deptId: 4, positionId: 8, status: '试用' },
  { empId: 9, empName: '吴敏', gender: '女', phone: '13800000009', email: 'wumin@company.com', hireDate: '2020-11-01', deptId: 5, positionId: 9, status: '在职' },
  { empId: 10, empName: '郑涛', gender: '男', phone: '13800000010', email: 'zhengtao@company.com', hireDate: '2023-02-15', deptId: 5, positionId: 10, status: '在职' },
  { empId: 11, empName: '黄丽', gender: '女', phone: '13800000011', email: 'huangli@company.com', hireDate: '2021-09-01', deptId: 6, positionId: 11, status: '在职' },
  { empId: 12, empName: '林峰', gender: '男', phone: '13800000012', email: 'linfeng@company.com', hireDate: '2023-05-01', deptId: 6, positionId: 12, status: '在职' },
  { empId: 13, empName: '何军', gender: '男', phone: '13800000013', email: 'hejun@company.com', hireDate: '2021-11-01', deptId: 7, positionId: 13, status: '在职' },
  { empId: 14, empName: '许洁', gender: '女', phone: '13800000014', email: 'xujie@company.com', hireDate: '2022-10-18', deptId: 7, positionId: 14, status: '在职' },
  { empId: 15, empName: '郭婷', gender: '女', phone: '13800000015', email: 'guoting@company.com', hireDate: '2019-12-20', deptId: 2, positionId: 2, status: '在职' }
]

// 用户数据
export const users = [
  { userId: 1, empId: 1, username: 'admin', roleId: 1, roleName: '系统管理员', status: '启用' },
  { userId: 2, empId: 2, username: 'hr_lina', roleId: 3, roleName: '部门经理', status: '启用' },
  { userId: 3, empId: 6, username: 'manager_zhao', roleId: 3, roleName: '部门经理', status: '启用' },
  { userId: 4, empId: 8, username: 'emp_zhou', roleId: 4, roleName: '普通员工', status: '启用' },
  { userId: 5, empId: 4, username: 'finance_liu', roleId: 3, roleName: '部门经理', status: '启用' },
  { userId: 6, empId: 5, username: 'finance_chen', roleId: 4, roleName: '普通员工', status: '启用' },
  { userId: 7, empId: 15, username: 'hr_manager', roleId: 3, roleName: '部门经理', status: '启用' }
]

// 角色数据
export const roles = [
  { roleId: 1, roleName: '系统管理员', roleCode: 'ADMIN', roleDesc: '拥有系统所有权限' },
  { roleId: 3, roleName: '部门经理', roleCode: 'MANAGER', roleDesc: '管理本部门员工' },
  { roleId: 4, roleName: '普通员工', roleCode: 'EMPLOYEE', roleDesc: '普通员工权限' }
]

// 考勤数据
export const attendances = [
  { attendanceId: 1, empId: 1, empName: '张伟', attendanceDate: '2024-01-15', clockIn: '08:55', clockOut: '18:05', status: '正常' },
  { attendanceId: 2, empId: 2, empName: '李娜', attendanceDate: '2024-01-15', clockIn: '09:10', clockOut: '18:00', status: '迟到' },
  { attendanceId: 3, empId: 3, empName: '王芳', attendanceDate: '2024-01-15', clockIn: '08:50', clockOut: '17:30', status: '早退' },
  { attendanceId: 4, empId: 4, empName: '刘强', attendanceDate: '2024-01-15', clockIn: '08:45', clockOut: '18:10', status: '正常' },
  { attendanceId: 5, empId: 5, empName: '陈静', attendanceDate: '2024-01-15', clockIn: null, clockOut: null, status: '请假' },
  { attendanceId: 6, empId: 6, empName: '赵明', attendanceDate: '2024-01-15', clockIn: '08:30', clockOut: '20:00', status: '加班' },
  { attendanceId: 7, empId: 7, empName: '孙磊', attendanceDate: '2024-01-15', clockIn: '08:58', clockOut: '18:02', status: '正常' },
  { attendanceId: 8, empId: 8, empName: '周洋', attendanceDate: '2024-01-15', clockIn: null, clockOut: null, status: '缺勤' }
]

// 请假数据
export const leaveRequests = [
  { leaveId: 1, empId: 5, empName: '陈静', leaveType: '年假', startDate: '2024-01-15', endDate: '2024-01-17', days: 3, reason: '回老家探亲', status: 'HR已批', applyTime: '2024-01-10 09:30:00' },
  { leaveId: 2, empId: 3, empName: '王芳', leaveType: '病假', startDate: '2024-01-20', endDate: '2024-01-21', days: 2, reason: '感冒发烧需要休息', status: '待审批', applyTime: '2024-01-18 14:20:00' },
  { leaveId: 3, empId: 8, empName: '周洋', leaveType: '事假', startDate: '2024-01-22', endDate: '2024-01-22', days: 1, reason: '处理个人事务', status: '部门经理已批', applyTime: '2024-01-19 10:00:00' },
  { leaveId: 4, empId: 10, empName: '郑涛', leaveType: '婚假', startDate: '2024-02-01', endDate: '2024-02-10', days: 10, reason: '结婚', status: '待审批', applyTime: '2024-01-20 16:00:00' },
  { leaveId: 5, empId: 7, empName: '孙磊', leaveType: '年假', startDate: '2024-01-25', endDate: '2024-01-26', days: 2, reason: '个人休假', status: '已拒绝', applyTime: '2024-01-15 11:30:00' }
]

// 薪资数据
export const salaryRecords = [
  { salaryId: 1, empId: 1, empName: '张伟', salaryMonth: '2024-01', baseSalary: 25000, positionSalary: 5000, bonus: 3000, overtimePay: 0, grossSalary: 33000, socialInsurance: 2475, housingFund: 2400, attendanceDeduct: 0, tax: 2590, otherDeduct: 0, netSalary: 25535, status: '已发放' },
  { salaryId: 2, empId: 2, empName: '李娜', salaryMonth: '2024-01', baseSalary: 15000, positionSalary: 3000, bonus: 1500, overtimePay: 0, grossSalary: 19500, socialInsurance: 1575, housingFund: 1440, attendanceDeduct: 50, tax: 1045, otherDeduct: 0, netSalary: 15390, status: '已发放' },
  { salaryId: 3, empId: 3, empName: '王芳', salaryMonth: '2024-01', baseSalary: 10000, positionSalary: 2000, bonus: 800, overtimePay: 0, grossSalary: 12800, socialInsurance: 1050, housingFund: 960, attendanceDeduct: 50, tax: 434, otherDeduct: 0, netSalary: 10306, status: '已发放' },
  { salaryId: 4, empId: 6, empName: '赵明', salaryMonth: '2024-01', baseSalary: 20000, positionSalary: 5000, bonus: 2000, overtimePay: 1500, grossSalary: 28500, socialInsurance: 2100, housingFund: 1920, attendanceDeduct: 0, tax: 2095, otherDeduct: 0, netSalary: 22385, status: '已发放' },
  { salaryId: 5, empId: 8, empName: '周洋', salaryMonth: '2024-01', baseSalary: 8000, positionSalary: 1500, bonus: 500, overtimePay: 0, grossSalary: 10000, socialInsurance: 840, housingFund: 720, attendanceDeduct: 200, tax: 144, otherDeduct: 0, netSalary: 8096, status: '待发放' }
]

// 统计数据
export const statistics = {
  totalEmployees: 15,
  newEmployeesThisMonth: 2,
  attendanceRate: 91.7,
  leaveCount: 5,
  departmentStats: [
    { name: '总经办', value: 1 },
    { name: '人力资源部', value: 3 },
    { name: '财务部', value: 2 },
    { name: '技术部', value: 3 },
    { name: '市场部', value: 2 },
    { name: '行政部', value: 2 },
    { name: '综合部', value: 2 }
  ],
  monthlyAttendance: [
    { month: '2024-01', normal: 85, late: 8, early: 3, absent: 4 },
    { month: '2024-02', normal: 88, late: 6, early: 2, absent: 4 },
    { month: '2024-03', normal: 90, late: 5, early: 2, absent: 3 },
    { month: '2024-04', normal: 87, late: 7, early: 3, absent: 3 },
    { month: '2024-05', normal: 92, late: 4, early: 2, absent: 2 },
    { month: '2024-06', normal: 89, late: 6, early: 3, absent: 2 }
  ],
  salarySummary: [
    { month: '2024-01', total: 285000, avg: 23750 },
    { month: '2024-02', total: 290000, avg: 24167 },
    { month: '2024-03', total: 295000, avg: 24583 },
    { month: '2024-04', total: 288000, avg: 24000 },
    { month: '2024-05', total: 300000, avg: 25000 },
    { month: '2024-06', total: 305000, avg: 25417 }
  ]
}
