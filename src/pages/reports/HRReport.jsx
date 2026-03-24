import React, { useEffect, useRef, useState } from 'react';
import { FaFileExport, FaPrint, FaUsers, FaCalendarCheck, FaMoneyBillWave, FaUmbrellaBeach, FaChartPie, FaChartBar } from 'react-icons/fa';
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import Card from '../../components/common/Card';
import Button from '../../components/common/Button';
import Badge from '../../components/common/Badge';
import { useAuth } from '../../context/AuthContext';
import { toast } from 'react-toastify';
import { Navigate } from 'react-router-dom';

const HRReport = () => {
  const { user } = useAuth();
  const printRef = useRef();
  const [selectedMonth, setSelectedMonth] = useState(new Date().toISOString().substring(0, 7));
  const EMPLOYEES_KEY = 'admin_employees';
  const ATTENDANCE_KEY = 'admin_attendance';
  const PAYROLL_KEY = 'admin_payroll';
  const LEAVES_KEY = 'admin_leaves';
  const LEAVE_BALANCES_KEY = 'admin_leave_balances';

  const readStoredData = (key, fallback = []) => {
    try {
      const rawData = localStorage.getItem(key);
      if (!rawData) return fallback;
      const parsed = JSON.parse(rawData);
      return Array.isArray(parsed) || typeof parsed === 'object' ? parsed : fallback;
    } catch (error) {
      return fallback;
    }
  };

  const [employees, setEmployees] = useState([]);
  const [attendanceRecords, setAttendanceRecords] = useState({});
  const [payrollStore, setPayrollStore] = useState({});
  const [leaveRequests, setLeaveRequests] = useState([]);
  const [leaveBalances, setLeaveBalances] = useState([]);

  const normalizeEmployees = (rows = []) =>
    (Array.isArray(rows) ? rows : []).map((emp) => ({
      id: emp.id,
      name: emp.fullName || emp.name || 'Employee',
      designation: emp.designation || '',
      department: emp.department || '',
      salary: Number(emp.basicSalary || emp.salary || 0) + Number(emp.allowances || 0)
    }));

  const normalizeLeaveRequests = (rows = []) =>
    (Array.isArray(rows) ? rows : []).map((req) => ({
      ...req,
      employeeId: req.employeeId,
      employeeName: req.employeeName
    }));

  const normalizeLeaveBalances = (rows = []) =>
    (Array.isArray(rows) ? rows : []).map((bal) => ({
      ...bal,
      employeeId: bal.employeeId,
      employeeName: bal.employeeName
    }));

  useEffect(() => {
    setEmployees(normalizeEmployees(readStoredData(EMPLOYEES_KEY, [])));
    setAttendanceRecords(readStoredData(ATTENDANCE_KEY, {}));
    const storedPayroll = readStoredData(PAYROLL_KEY, {});
    setPayrollStore(storedPayroll && !Array.isArray(storedPayroll) ? storedPayroll : {});
    setLeaveRequests(normalizeLeaveRequests(readStoredData(LEAVES_KEY, [])));
    setLeaveBalances(normalizeLeaveBalances(readStoredData(LEAVE_BALANCES_KEY, [])));
  }, []);

  useEffect(() => {
    const watchedKeys = [EMPLOYEES_KEY, ATTENDANCE_KEY, PAYROLL_KEY, LEAVES_KEY, LEAVE_BALANCES_KEY];

    const handleStorage = (event) => {
      if (!event?.key || !watchedKeys.includes(event.key)) return;
      if (event.key === EMPLOYEES_KEY) setEmployees(normalizeEmployees(readStoredData(EMPLOYEES_KEY, [])));
      if (event.key === ATTENDANCE_KEY) setAttendanceRecords(readStoredData(ATTENDANCE_KEY, {}));
      if (event.key === PAYROLL_KEY) {
        const storedPayroll = readStoredData(PAYROLL_KEY, {});
        setPayrollStore(storedPayroll && !Array.isArray(storedPayroll) ? storedPayroll : {});
      }
      if (event.key === LEAVES_KEY) setLeaveRequests(normalizeLeaveRequests(readStoredData(LEAVES_KEY, [])));
      if (event.key === LEAVE_BALANCES_KEY) setLeaveBalances(normalizeLeaveBalances(readStoredData(LEAVE_BALANCES_KEY, [])));
    };

    const handleCustomUpdate = (event) => {
      const key = event?.detail?.key;
      if (!key || !watchedKeys.includes(key)) return;
      if (key === EMPLOYEES_KEY) setEmployees(normalizeEmployees(readStoredData(EMPLOYEES_KEY, [])));
      if (key === ATTENDANCE_KEY) setAttendanceRecords(readStoredData(ATTENDANCE_KEY, {}));
      if (key === PAYROLL_KEY) {
        const storedPayroll = readStoredData(PAYROLL_KEY, {});
        setPayrollStore(storedPayroll && !Array.isArray(storedPayroll) ? storedPayroll : {});
      }
      if (key === LEAVES_KEY) setLeaveRequests(normalizeLeaveRequests(readStoredData(LEAVES_KEY, [])));
      if (key === LEAVE_BALANCES_KEY) setLeaveBalances(normalizeLeaveBalances(readStoredData(LEAVE_BALANCES_KEY, [])));
    };

    window.addEventListener('storage', handleStorage);
    window.addEventListener('app-storage-updated', handleCustomUpdate);

    return () => {
      window.removeEventListener('storage', handleStorage);
      window.removeEventListener('app-storage-updated', handleCustomUpdate);
    };
  }, []);

  const getDaysInMonth = (monthKey) => {
    const [year, month] = monthKey.split('-').map((part) => parseInt(part));
    return new Date(year, month, 0).getDate();
  };

  const isSunday = (year, monthIndex, day) => new Date(year, monthIndex, day).getDay() === 0;

  const getLeaveDatesForEmployee = (employeeId) => {
    const leaveDates = new Set();
    leaveRequests
      .filter((req) => req.status === 'Approved' && (req.employeeId === employeeId || req.employeeName))
      .forEach((req) => {
        const start = new Date(req.fromDate);
        const end = new Date(req.toDate);
        if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return;

        for (let date = new Date(start); date <= end; date.setDate(date.getDate() + 1)) {
          const key = date.toISOString().split('T')[0];
          if (key.startsWith(selectedMonth)) {
            leaveDates.add(key);
          }
        }
      });

    return leaveDates;
  };

  const buildEmployeeAttendance = (employee) => {
    const [year, month] = selectedMonth.split('-').map((part) => parseInt(part));
    const daysInMonth = getDaysInMonth(selectedMonth);
    let presentDays = 0;
    let absentDays = 0;
    let leaveDays = 0;
    let holidayDays = 0;

    const leaveDates = getLeaveDatesForEmployee(employee.id);

    for (let day = 1; day <= daysInMonth; day += 1) {
      const dateKey = `${selectedMonth}-${String(day).padStart(2, '0')}`;
      if (leaveDates.has(dateKey)) {
        leaveDays += 1;
        continue;
      }

      const record = attendanceRecords[dateKey]?.[employee.id];
      const status = record?.status;

      if (status === 'Present' || status === 'P' || status === 'Late' || status === 'L' || status === 'Half Day' || status === 'HD') {
        presentDays += 1;
        continue;
      }

      if (status === 'Holiday' || status === 'H') {
        holidayDays += 1;
        continue;
      }

      if (status === 'Absent' || status === 'A') {
        absentDays += 1;
        continue;
      }

      if (isSunday(year, month - 1, day)) {
        holidayDays += 1;
      } else {
        absentDays += 1;
      }
    }

    const workingDays = Math.max(0, daysInMonth - holidayDays);
    const attendancePercentage = workingDays > 0 ? ((presentDays / workingDays) * 100) : 0;

    return {
      workingDays,
      presentDays,
      absentDays,
      leaveDays,
      attendancePercentage: Number(attendancePercentage.toFixed(1))
    };
  };

  const employeesData = employees.map((employee) => {
    const attendance = buildEmployeeAttendance(employee);
    return {
      ...employee,
      ...attendance
    };
  });

  const payrollForMonth = payrollStore[selectedMonth] || [];
  const payrollById = new Map(payrollForMonth.map((row) => [row.id, row]));

  const monthlyPayrollData = (() => {
    const months = [];
    const now = new Date();
    for (let offset = 5; offset >= 0; offset -= 1) {
      const date = new Date(now.getFullYear(), now.getMonth() - offset, 1);
      const key = date.toISOString().slice(0, 7);
      months.push({ key, label: date.toLocaleString('en-US', { month: 'short' }) });
    }

    return months.map((month) => {
      const rows = payrollStore[month.key] || [];
      const totalSalary = rows.reduce((sum, row) => sum + Number(row.netSalary ?? row.basicSalary ?? 0), 0);
      return { month: month.label, totalSalary, employees: rows.length };
    });
  })();

  const leaveTotalsByType = leaveRequests
    .filter((req) => req.status === 'Approved' && req.fromDate && req.toDate)
    .reduce((acc, req) => {
      if (!req.fromDate.startsWith(selectedMonth) && !req.toDate.startsWith(selectedMonth)) return acc;
      const start = new Date(req.fromDate);
      const end = new Date(req.toDate);
      if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return acc;

      let days = 0;
      for (let date = new Date(start); date <= end; date.setDate(date.getDate() + 1)) {
        const key = date.toISOString().split('T')[0];
        if (key.startsWith(selectedMonth)) days += 1;
      }

      const type = req.leaveType || 'Other';
      acc[type] = (acc[type] || 0) + days;
      return acc;
    }, {});

  const totalAnnual = leaveBalances.reduce((sum, row) => sum + Number(row.annualLeave || 0), 0);
  const totalSick = leaveBalances.reduce((sum, row) => sum + Number(row.sickLeave || 0), 0);
  const totalCasual = leaveBalances.reduce((sum, row) => sum + Number(row.casualLeave || 0), 0);

  const leaveSummaryData = [
    { type: 'Annual Leave', total: totalAnnual, taken: leaveTotalsByType.Annual || 0 },
    { type: 'Sick Leave', total: totalSick, taken: leaveTotalsByType.Sick || 0 },
    { type: 'Casual Leave', total: totalCasual, taken: leaveTotalsByType.Casual || 0 },
    { type: 'Emergency Leave', total: leaveTotalsByType.Emergency || 0, taken: leaveTotalsByType.Emergency || 0 },
    { type: 'Unpaid Leave', total: leaveTotalsByType.Unpaid || 0, taken: leaveTotalsByType.Unpaid || 0 }
  ].map((row) => ({
    ...row,
    remaining: Math.max(0, Number(row.total || 0) - Number(row.taken || 0))
  }));

  // Check if user has access (admin or superadmin only)
  if (user?.role !== 'admin' && user?.role !== 'superadmin') {
    toast.error('Access denied. This page is only accessible to administrators.');
    return <Navigate to="/dashboard" replace />;
  }

  // Calculate Summary Statistics
  const totalEmployees = employeesData.length;
  const totalWorkingDays = employeesData[0]?.workingDays || 0;
  const totalPresentDays = employeesData.reduce((sum, emp) => sum + emp.presentDays, 0);
  const totalAbsentDays = employeesData.reduce((sum, emp) => sum + emp.absentDays, 0);
  const totalLeaveDays = employeesData.reduce((sum, emp) => sum + emp.leaveDays, 0);
  const averageAttendance = totalEmployees && totalWorkingDays
    ? ((totalPresentDays / (totalEmployees * totalWorkingDays)) * 100).toFixed(1)
    : '0.0';
  const totalSalaryPaid = payrollForMonth.length
    ? payrollForMonth.reduce((sum, row) => sum + Number(row.netSalary ?? row.basicSalary ?? 0), 0)
    : employeesData.reduce((sum, emp) => sum + emp.salary, 0);

  // Attendance Distribution for Pie Chart
  const attendanceDistribution = [
    { name: 'Present', value: totalPresentDays, color: '#10B981' },
    { name: 'Absent', value: totalAbsentDays, color: '#EF4444' },
    { name: 'On Leave', value: totalLeaveDays, color: '#F59E0B' },
  ];

  // Format currency
  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-PK', {
      style: 'currency',
      currency: 'PKR',
      minimumFractionDigits: 0,
    }).format(amount);
  };

  // Handle Print
  const handlePrint = () => {
    window.print();
  };

  // Handle Export to Excel
  const handleExportExcel = () => {
    const headers = ['Employee ID', 'Name', 'Designation', 'Department', 'Salary', 'Working Days', 'Present', 'Absent', 'Leave', 'Attendance %'];
    const rows = employeesData.map((emp) => [
      emp.id,
      emp.name,
      emp.designation,
      emp.department,
      emp.salary,
      emp.workingDays,
      emp.presentDays,
      emp.absentDays,
      emp.leaveDays,
      emp.attendancePercentage,
    ]);

    let csvContent = 'data:text/csv;charset=utf-8,';
    csvContent += headers.join(',') + '\n';
    rows.forEach((row) => {
      csvContent += row.map((cell) => `"${cell}"`).join(',') + '\n';
    });

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `hr_report_${selectedMonth}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    toast.success('HR report exported successfully!');
  };

  // Handle Export to PDF
  const handleExportPDF = () => {
    window.print();
    toast.info("Use your browser's Print to PDF feature to save as PDF");
  };

  return (
    <div ref={printRef}>
      {/* Header */}
      <div className="flex justify-between items-center mb-6 print:mb-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-800 dark:text-white print:text-black">HR Report</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1 print:text-gray-700">
            Human Resources analytics and reporting
          </p>
        </div>
        <div className="flex space-x-3 print:hidden">
          <Button onClick={handlePrint} variant="secondary">
            <FaPrint className="mr-2" />
            Print
          </Button>
          <Button onClick={handleExportExcel} variant="secondary">
            <FaFileExport className="mr-2" />
            Export Excel
          </Button>
          <Button onClick={handleExportPDF}>
            <FaFileExport className="mr-2" />
            Export PDF
          </Button>
        </div>
      </div>

      {/* Month Selector */}
      <Card className="mb-6 print:mb-4 print:border print:border-gray-300">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold text-gray-800 dark:text-white print:text-black">Report Period</h2>
          <div className="flex items-center space-x-4">
            <label className="text-sm font-medium text-gray-700 dark:text-gray-300 print:text-black">
              Select Month:
            </label>
            <input
              type="month"
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-800 text-gray-900 dark:text-white print:hidden"
            />
            <span className="hidden print:inline font-semibold">
              {new Date(selectedMonth + '-01').toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
            </span>
          </div>
        </div>
      </Card>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6 print:mb-4">
        <Card className="print:border print:border-gray-300">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400 print:text-gray-700">Total Employees</p>
              <p className="text-2xl font-bold text-gray-800 dark:text-white mt-1 print:text-black">{totalEmployees}</p>
            </div>
            <div className="p-3 bg-blue-100 dark:bg-blue-900 rounded-lg print:bg-blue-100">
              <FaUsers className="text-2xl text-blue-600 dark:text-blue-400 print:text-blue-600" />
            </div>
          </div>
        </Card>

        <Card className="print:border print:border-gray-300">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400 print:text-gray-700">Avg Attendance</p>
              <p className="text-2xl font-bold text-gray-800 dark:text-white mt-1 print:text-black">{averageAttendance}%</p>
            </div>
            <div className="p-3 bg-green-100 dark:bg-green-900 rounded-lg print:bg-green-100">
              <FaCalendarCheck className="text-2xl text-green-600 dark:text-green-400 print:text-green-600" />
            </div>
          </div>
        </Card>

        <Card className="print:border print:border-gray-300">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400 print:text-gray-700">Total Salary Paid</p>
              <p className="text-2xl font-bold text-gray-800 dark:text-white mt-1 print:text-black">
                {formatCurrency(totalSalaryPaid)}
              </p>
            </div>
            <div className="p-3 bg-purple-100 dark:bg-purple-900 rounded-lg print:bg-purple-100">
              <FaMoneyBillWave className="text-2xl text-purple-600 dark:text-purple-400 print:text-purple-600" />
            </div>
          </div>
        </Card>

        <Card className="print:border print:border-gray-300">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400 print:text-gray-700">Total Leaves</p>
              <p className="text-2xl font-bold text-gray-800 dark:text-white mt-1 print:text-black">{totalLeaveDays}</p>
            </div>
            <div className="p-3 bg-yellow-100 dark:bg-yellow-900 rounded-lg print:bg-yellow-100">
              <FaUmbrellaBeach className="text-2xl text-yellow-600 dark:text-yellow-400 print:text-yellow-600" />
            </div>
          </div>
        </Card>
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6 print:grid-cols-1 print:mb-4">
        {/* Attendance Pie Chart */}
        <Card className="print:border print:border-gray-300 print:page-break-inside-avoid">
          <h2 className="text-xl font-bold text-gray-800 dark:text-white mb-4 print:text-black flex items-center">
            <FaChartPie className="mr-2" />
            Attendance Distribution
          </h2>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={attendanceDistribution}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ name, value, percent }) => `${name}: ${value} (${(percent * 100).toFixed(0)}%)`}
                outerRadius={80}
                fill="#8884d8"
                dataKey="value"
              >
                {attendanceDistribution.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
          <div className="mt-4 space-y-2">
            {attendanceDistribution.map((item) => (
              <div key={item.name} className="flex justify-between items-center text-sm">
                <div className="flex items-center">
                  <div className="w-4 h-4 rounded mr-2" style={{ backgroundColor: item.color }}></div>
                  <span className="text-gray-700 dark:text-gray-300 print:text-black">{item.name}</span>
                </div>
                <span className="font-semibold text-gray-900 dark:text-white print:text-black">
                  {item.value} days
                </span>
              </div>
            ))}
          </div>
        </Card>

        {/* Monthly Salary Bar Chart */}
        <Card className="print:border print:border-gray-300 print:page-break-inside-avoid">
          <h2 className="text-xl font-bold text-gray-800 dark:text-white mb-4 print:text-black flex items-center">
            <FaChartBar className="mr-2" />
            Monthly Salary Disbursement
          </h2>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={monthlyPayrollData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="month" />
              <YAxis />
              <Tooltip formatter={(value) => formatCurrency(value)} />
              <Legend />
              <Bar dataKey="totalSalary" fill="#8B5CF6" name="Total Salary" />
            </BarChart>
          </ResponsiveContainer>
        </Card>
      </div>

      {/* Attendance Summary by Month */}
      <Card className="mb-6 print:mb-4 print:border print:border-gray-300 print:page-break-inside-avoid">
        <h2 className="text-xl font-bold text-gray-800 dark:text-white mb-4 print:text-black">
          Attendance Summary - {new Date(selectedMonth + '-01').toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
        </h2>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700 print:divide-gray-300">
            <thead className="bg-gray-50 dark:bg-gray-800 print:bg-gray-100">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase print:text-black">
                  Metric
                </th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase print:text-black">
                  Value
                </th>
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-gray-900 divide-y divide-gray-200 dark:divide-gray-700 print:bg-white print:divide-gray-300">
              <tr>
                <td className="px-4 py-3 text-sm text-gray-900 dark:text-white print:text-black">Total Working Days</td>
                <td className="px-4 py-3 text-sm text-right font-semibold text-gray-900 dark:text-white print:text-black">
                  {totalWorkingDays}
                </td>
              </tr>
              <tr className="bg-green-50 dark:bg-green-900/20 print:bg-green-50">
                <td className="px-4 py-3 text-sm text-gray-900 dark:text-white print:text-black">Total Present Days</td>
                <td className="px-4 py-3 text-sm text-right font-semibold text-green-600 dark:text-green-400 print:text-green-700">
                  {totalPresentDays}
                </td>
              </tr>
              <tr className="bg-red-50 dark:bg-red-900/20 print:bg-red-50">
                <td className="px-4 py-3 text-sm text-gray-900 dark:text-white print:text-black">Total Absent Days</td>
                <td className="px-4 py-3 text-sm text-right font-semibold text-red-600 dark:text-red-400 print:text-red-700">
                  {totalAbsentDays}
                </td>
              </tr>
              <tr className="bg-yellow-50 dark:bg-yellow-900/20 print:bg-yellow-50">
                <td className="px-4 py-3 text-sm text-gray-900 dark:text-white print:text-black">Total Leave Days</td>
                <td className="px-4 py-3 text-sm text-right font-semibold text-yellow-600 dark:text-yellow-400 print:text-yellow-700">
                  {totalLeaveDays}
                </td>
              </tr>
              <tr className="bg-blue-50 dark:bg-blue-900/20 print:bg-blue-50">
                <td className="px-4 py-3 text-sm font-bold text-gray-900 dark:text-white print:text-black">
                  Average Attendance
                </td>
                <td className="px-4 py-3 text-sm text-right font-bold text-blue-600 dark:text-blue-400 print:text-blue-700">
                  {averageAttendance}%
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </Card>

      {/* Employee-wise Attendance Percentage */}
      <Card className="mb-6 print:mb-4 print:border print:border-gray-300 print:page-break-inside-avoid">
        <h2 className="text-xl font-bold text-gray-800 dark:text-white mb-4 print:text-black">
          Employee-wise Attendance Report
        </h2>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700 print:divide-gray-300">
            <thead className="bg-gray-50 dark:bg-gray-800 print:bg-gray-100">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase print:text-black">
                  Employee ID
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase print:text-black">
                  Name
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase print:text-black">
                  Designation
                </th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase print:text-black">
                  Working Days
                </th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase print:text-black">
                  Present
                </th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase print:text-black">
                  Absent
                </th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase print:text-black">
                  Leave
                </th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase print:text-black">
                  Attendance %
                </th>
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-gray-900 divide-y divide-gray-200 dark:divide-gray-700 print:bg-white print:divide-gray-300">
              {employeesData.map((emp) => (
                <tr key={emp.id} className="hover:bg-gray-50 dark:hover:bg-gray-800 print:hover:bg-white">
                  <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white print:text-black">
                    {emp.id}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900 dark:text-white print:text-black">
                    {emp.name}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-700 dark:text-gray-300 print:text-black">
                    {emp.designation}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-sm text-right text-gray-900 dark:text-white print:text-black">
                    {emp.workingDays}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-sm text-right text-green-600 dark:text-green-400 print:text-green-700">
                    {emp.presentDays}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-sm text-right text-red-600 dark:text-red-400 print:text-red-700">
                    {emp.absentDays}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-sm text-right text-yellow-600 dark:text-yellow-400 print:text-yellow-700">
                    {emp.leaveDays}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-sm text-right print:text-black">
                    <Badge
                      variant={
                        emp.attendancePercentage >= 95
                          ? 'success'
                          : emp.attendancePercentage >= 85
                          ? 'warning'
                          : 'danger'
                      }
                    >
                      {emp.attendancePercentage}%
                    </Badge>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Payroll Summary */}
      <Card className="mb-6 print:mb-4 print:border print:border-gray-300 print:page-break-inside-avoid">
        <h2 className="text-xl font-bold text-gray-800 dark:text-white mb-4 print:text-black">
          Payroll Summary - {new Date(selectedMonth + '-01').toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
        </h2>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700 print:divide-gray-300">
            <thead className="bg-gray-50 dark:bg-gray-800 print:bg-gray-100">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase print:text-black">
                  Employee
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase print:text-black">
                  Designation
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase print:text-black">
                  Department
                </th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase print:text-black">
                  Monthly Salary
                </th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase print:text-black">
                  Days Present
                </th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase print:text-black">
                  Amount Paid
                </th>
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-gray-900 divide-y divide-gray-200 dark:divide-gray-700 print:bg-white print:divide-gray-300">
              {employeesData.map((emp) => {
                const payrollRow = payrollById.get(emp.id);
                const amountPaid = payrollRow
                  ? Number(payrollRow.netSalary ?? payrollRow.basicSalary ?? emp.salary)
                  : emp.salary;
                return (
                  <tr key={emp.id} className="hover:bg-gray-50 dark:hover:bg-gray-800 print:hover:bg-white">
                    <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white print:text-black">
                      {emp.name}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-700 dark:text-gray-300 print:text-black">
                      {emp.designation}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-700 dark:text-gray-300 print:text-black">
                      {emp.department}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-right text-gray-900 dark:text-white print:text-black">
                      {formatCurrency(emp.salary)}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-right text-gray-900 dark:text-white print:text-black">
                      {emp.presentDays}/{emp.workingDays}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-right font-semibold text-gray-900 dark:text-white print:text-black">
                      {formatCurrency(amountPaid)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot className="bg-gray-50 dark:bg-gray-800 print:bg-gray-100">
              <tr className="font-bold">
                <td colSpan="5" className="px-4 py-3 text-right text-sm text-gray-900 dark:text-white print:text-black">
                  TOTAL SALARY PAID:
                </td>
                <td className="px-4 py-3 whitespace-nowrap text-sm text-right text-gray-900 dark:text-white print:text-black">
                  {formatCurrency(totalSalaryPaid)}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      </Card>

      {/* Leave Summary Report */}
      <Card className="mb-6 print:mb-4 print:border print:border-gray-300 print:page-break-inside-avoid">
        <h2 className="text-xl font-bold text-gray-800 dark:text-white mb-4 print:text-black">
          Leave Summary Report
        </h2>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700 print:divide-gray-300">
            <thead className="bg-gray-50 dark:bg-gray-800 print:bg-gray-100">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase print:text-black">
                  Leave Type
                </th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase print:text-black">
                  Total Allocated
                </th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase print:text-black">
                  Taken
                </th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase print:text-black">
                  Remaining
                </th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase print:text-black">
                  Utilization %
                </th>
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-gray-900 divide-y divide-gray-200 dark:divide-gray-700 print:bg-white print:divide-gray-300">
              {leaveSummaryData.map((leave) => {
                const utilizationPercent = ((leave.taken / leave.total) * 100).toFixed(1);
                return (
                  <tr key={leave.type} className="hover:bg-gray-50 dark:hover:bg-gray-800 print:hover:bg-white">
                    <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white print:text-black">
                      {leave.type}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-right text-gray-900 dark:text-white print:text-black">
                      {leave.total}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-right text-red-600 dark:text-red-400 print:text-red-700">
                      {leave.taken}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-right text-green-600 dark:text-green-400 print:text-green-700">
                      {leave.remaining}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-right text-gray-900 dark:text-white print:text-black">
                      {utilizationPercent}%
                    </td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot className="bg-gray-50 dark:bg-gray-800 print:bg-gray-100">
              <tr className="font-bold">
                <td className="px-4 py-3 text-left text-sm text-gray-900 dark:text-white print:text-black">TOTAL</td>
                <td className="px-4 py-3 whitespace-nowrap text-sm text-right text-gray-900 dark:text-white print:text-black">
                  {leaveSummaryData.reduce((sum, l) => sum + l.total, 0)}
                </td>
                <td className="px-4 py-3 whitespace-nowrap text-sm text-right text-red-600 dark:text-red-400 print:text-red-700">
                  {leaveSummaryData.reduce((sum, l) => sum + l.taken, 0)}
                </td>
                <td className="px-4 py-3 whitespace-nowrap text-sm text-right text-green-600 dark:text-green-400 print:text-green-700">
                  {leaveSummaryData.reduce((sum, l) => sum + l.remaining, 0)}
                </td>
                <td className="px-4 py-3 whitespace-nowrap text-sm text-right text-gray-900 dark:text-white print:text-black">
                  {(
                    (leaveSummaryData.reduce((sum, l) => sum + l.taken, 0) /
                      leaveSummaryData.reduce((sum, l) => sum + l.total, 0)) *
                    100
                  ).toFixed(1)}
                  %
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      </Card>

      {/* Footer for Print */}
      <div className="hidden print:block mt-8 pt-4 border-t border-gray-300 text-center text-sm text-gray-600">
        <p>Generated by Mian & Sons Hardware Management System</p>
        <p>Report Date: {new Date().toLocaleString()}</p>
      </div>

      {/* Print Styles */}
      <style>{`
        @media print {
          body * {
            visibility: hidden;
          }
          #root, #root * {
            visibility: visible;
          }
          .print\\:hidden {
            display: none !important;
          }
          .print\\:page-break-inside-avoid {
            page-break-inside: avoid;
          }
          .print\\:block {
            display: block !important;
          }
        }
      `}</style>
    </div>
  );
};

export default HRReport;
