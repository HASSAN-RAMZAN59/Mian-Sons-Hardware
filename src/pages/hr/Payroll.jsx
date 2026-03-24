import React, { useCallback, useEffect, useState } from 'react';
import { FaMoneyCheckAlt, FaFileInvoice, FaPrint, FaCheckCircle, FaTimesCircle, FaCalendarAlt } from 'react-icons/fa';
import Card from '../../components/common/Card';
import Button from '../../components/common/Button';
import Input from '../../components/common/Input';
import Badge from '../../components/common/Badge';
import Modal from '../../components/common/Modal';
import { useAuth } from '../../context/AuthContext';
import { toast } from 'react-toastify';
import { logAudit } from '../../utils/audit';

const ATTENDANCE_KEY = 'admin_attendance';
const EMPLOYEES_KEY = 'admin_employees';
const PAYROLL_KEY = 'admin_payroll';

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

const writeStoredData = (key, value) => {
  localStorage.setItem(key, JSON.stringify(value));
  window.dispatchEvent(new CustomEvent('app-storage-updated', { detail: { key } }));
};

const normalizePayrollStore = (value) => {
  if (!value || Array.isArray(value) || typeof value !== 'object') return {};
  return value;
};

const Payroll = () => {
  const { user, checkPermission } = useAuth();
  const [selectedMonth, setSelectedMonth] = useState(new Date().toISOString().substring(0, 7));
  const [showSalarySlip, setShowSalarySlip] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState(null);
  const [attendanceRecords, setAttendanceRecords] = useState({});
  const [employees, setEmployees] = useState([]);
  const [payrollStore, setPayrollStore] = useState({});

  const [payrollData, setPayrollData] = useState([]);

  const normalizeEmployees = (rows = []) =>
    (Array.isArray(rows) ? rows : []).map((emp) => ({
      id: emp.id,
      employeeName: emp.fullName || emp.name || 'Employee',
      designation: emp.designation || '',
      department: emp.department || '',
      basicSalary: Number(emp.basicSalary || emp.salary || 0),
      allowances: Number(emp.allowances || 0)
    }));

  const buildAttendanceStats = useCallback((employeeId) => {
    const year = parseInt(selectedMonth.split('-')[0]);
    const month = parseInt(selectedMonth.split('-')[1]);
    const daysInMonth = new Date(year, month, 0).getDate();
    let present = 0;
    let absent = 0;
    let late = 0;
    let halfDay = 0;
    let holidays = 0;

    for (let day = 1; day <= daysInMonth; day += 1) {
      const dateKey = `${selectedMonth}-${String(day).padStart(2, '0')}`;
      const dayRecords = attendanceRecords[dateKey] || {};
      const numericEmployeeId = Number(String(employeeId).split('-')[1]) || Number(employeeId);
      const record =
        dayRecords[employeeId] ||
        dayRecords[String(employeeId)] ||
        dayRecords[numericEmployeeId] ||
        dayRecords[String(numericEmployeeId)];
      if (!record?.status) continue;

      const status = record.status;
      if (status === 'Present' || status === 'P') present += 1;
      else if (status === 'Absent' || status === 'A') absent += 1;
      else if (status === 'Late' || status === 'L') late += 1;
      else if (status === 'Half Day' || status === 'HD') halfDay += 1;
      else if (status === 'Holiday' || status === 'H') holidays += 1;
    }

    const workingDays = Math.max(0, daysInMonth - holidays);
    const payableDays = present + late + (halfDay * 0.5);

    return { workingDays, presentDays: present + late + halfDay, payableDays, absent };
  }, [attendanceRecords, selectedMonth]);

  const getAbsenceFine = useCallback((employee) => {
    const stats = buildAttendanceStats(employee.id);
    if (stats.absent > 3) {
      return Math.round(Number(employee.basicSalary || 0) * 0.05);
    }
    return 0;
  }, [buildAttendanceStats]);

  const persistPayroll = useCallback((nextData) => {
    const latestStore = normalizePayrollStore(readStoredData(PAYROLL_KEY, {}));
    const nextStore = {
      ...latestStore,
      [selectedMonth]: nextData
    };
    setPayrollStore(nextStore);
    setPayrollData(nextData);
    writeStoredData(PAYROLL_KEY, nextStore);
  }, [selectedMonth]);

  const computePayrollData = useCallback((employeesList, storeForMonth = []) => {
    const storedById = new Map((storeForMonth || []).map((item) => [item.id, item]));

    return (employeesList || []).map((emp) => {
      const stored = storedById.get(emp.id) || {};
      const stats = buildAttendanceStats(emp.id);
      const basicSalary = Number(emp.basicSalary || stored.basicSalary || 0);
      const allowances = Number(emp.allowances || stored.allowances || 0);
      const overtime = Number(stored.overtime || 0);
      const deductions = Number(stored.deductions || 0);
      const advanceDeduction = Number(stored.advanceDeduction || 0);
      const absenceFine = Number(stored.absenceFine ?? getAbsenceFine(emp));
      const grossSalary = basicSalary + allowances + overtime;
      const netSalary = Math.max(0, grossSalary - deductions - advanceDeduction - absenceFine);

      return {
        id: emp.id,
        employeeName: emp.employeeName,
        designation: emp.designation,
        department: emp.department,
        basicSalary,
        allowances,
        overtime,
        deductions,
        advanceDeduction,
        absenceFine,
        grossSalary,
        netSalary,
        status: stored.status || 'Pending',
        workingDays: stats.workingDays,
        presentDays: stats.presentDays,
        payableDays: stats.payableDays,
        paidDate: stored.paidDate || null
      };
    });
  }, [buildAttendanceStats, getAbsenceFine]);

  const handleGeneratePayroll = () => {
    if (!checkPermission('hr', 'create')) {
      toast.error('You do not have permission to generate payroll');
      return;
    }
    if (!employees.length) {
      toast.error('Add employees first to generate payroll');
      return;
    }
    const nextData = computePayrollData(employees, payrollStore[selectedMonth]);
    persistPayroll(nextData);
    logAudit({
      user,
      action: 'Created',
      module: 'Payroll',
      description: `Generated payroll for ${selectedMonth}`
    });
    toast.success('Payroll generated successfully based on attendance!');
  };

  const handlePayIndividual = (employee) => {
    if (!checkPermission('hr', 'update')) {
      toast.error('You do not have permission to process payments');
      return;
    }
    
    const nextData = payrollData.map(emp => 
      emp.id === employee.id 
        ? { ...emp, status: 'Paid', paidDate: new Date().toISOString().split('T')[0] }
        : emp
    );
    persistPayroll(nextData);
    logAudit({
      user,
      action: 'Updated',
      module: 'Payroll',
      description: `Marked payroll paid for ${employee.employeeName || employee.id}`
    });
    
    toast.success(`Payment processed for ${employee.employeeName}`);
  };

  const handlePayAll = () => {
    if (!checkPermission('hr', 'update')) {
      toast.error('You do not have permission to process payments');
      return;
    }
    
    const pendingCount = payrollData.filter(emp => emp.status === 'Pending').length;
    
    const nextData = payrollData.map(emp => 
      emp.status === 'Pending'
        ? { ...emp, status: 'Paid', paidDate: new Date().toISOString().split('T')[0] }
        : emp
    );
    persistPayroll(nextData);
    logAudit({
      user,
      action: 'Updated',
      module: 'Payroll',
      description: `Marked payroll paid for ${pendingCount} employees`
    });
    
    toast.success(`Bulk payment processed for ${pendingCount} employees!`);
  };

  const handleViewSalarySlip = (employee) => {
    setSelectedEmployee(employee);
    setShowSalarySlip(true);
  };

  const handlePrintSlip = () => {
    window.print();
    toast.success('Opening print dialog...');
  };

  const syncPayrollState = useCallback(() => {
    setAttendanceRecords(readStoredData(ATTENDANCE_KEY, {}));
    setEmployees(normalizeEmployees(readStoredData(EMPLOYEES_KEY, [])));
    setPayrollStore(normalizePayrollStore(readStoredData(PAYROLL_KEY, {})));
  }, []);

  useEffect(() => {
    syncPayrollState();
  }, [syncPayrollState]);

  useEffect(() => {
    const handleStorage = (event) => {
      if (!event?.key) return;
      if (event.key === ATTENDANCE_KEY) {
        setAttendanceRecords(readStoredData(ATTENDANCE_KEY, {}));
      }
      if (event.key === EMPLOYEES_KEY) {
        setEmployees(normalizeEmployees(readStoredData(EMPLOYEES_KEY, [])));
      }
      if (event.key === PAYROLL_KEY) {
        setPayrollStore(normalizePayrollStore(readStoredData(PAYROLL_KEY, {})));
      }
    };

    const handleCustomUpdate = (event) => {
      const key = event?.detail?.key;
      if (!key) return;
      if (key === ATTENDANCE_KEY) {
        setAttendanceRecords(readStoredData(ATTENDANCE_KEY, {}));
      }
      if (key === EMPLOYEES_KEY) {
        setEmployees(normalizeEmployees(readStoredData(EMPLOYEES_KEY, [])));
      }
      if (key === PAYROLL_KEY) {
        setPayrollStore(normalizePayrollStore(readStoredData(PAYROLL_KEY, {})));
      }
    };

    const interval = setInterval(syncPayrollState, 10000);

    window.addEventListener('storage', handleStorage);
    window.addEventListener('app-storage-updated', handleCustomUpdate);

    return () => {
      clearInterval(interval);
      window.removeEventListener('storage', handleStorage);
      window.removeEventListener('app-storage-updated', handleCustomUpdate);
    };
  }, [syncPayrollState]);

  useEffect(() => {
    const storedMonth = payrollStore[selectedMonth] || [];
    const nextData = computePayrollData(employees, storedMonth);
    const storedById = new Map(storedMonth.map((item) => [item.id, item]));
    const shouldPersist =
      storedMonth.length !== nextData.length ||
      nextData.some((item) => {
        const stored = storedById.get(item.id);
        if (!stored) return true;
        return (
          stored.basicSalary !== item.basicSalary ||
          stored.allowances !== item.allowances ||
          stored.overtime !== item.overtime ||
          stored.deductions !== item.deductions ||
          stored.advanceDeduction !== item.advanceDeduction ||
          stored.status !== item.status ||
          stored.paidDate !== item.paidDate ||
          stored.workingDays !== item.workingDays ||
          stored.presentDays !== item.presentDays
        );
      });

    setPayrollData(nextData);

    if (shouldPersist) {
      persistPayroll(nextData);
    }
  }, [computePayrollData, employees, payrollStore, selectedMonth, persistPayroll, attendanceRecords]);

  // Check permission
  if (!checkPermission('hr', 'read') && user?.role !== 'admin' && user?.role !== 'superadmin') {
    return (
      <div className="flex items-center justify-center h-96">
        <Card className="p-8 text-center">
          <h2 className="text-2xl font-bold text-red-600 mb-4">Access Denied</h2>
          <p className="text-gray-600 dark:text-gray-400">
            Only administrators can access payroll management.
          </p>
        </Card>
      </div>
    );
  }

  // Calculate totals
  const totals = payrollData.reduce(
    (acc, emp) => ({
      basicSalary: acc.basicSalary + emp.basicSalary,
      allowances: acc.allowances + emp.allowances,
      overtime: acc.overtime + emp.overtime,
      deductions: acc.deductions + emp.deductions,
      advanceDeduction: acc.advanceDeduction + emp.advanceDeduction,
      absenceFine: acc.absenceFine + Number(emp.absenceFine || 0),
      grossSalary: acc.grossSalary + emp.grossSalary,
      netSalary: acc.netSalary + emp.netSalary,
    }),
    { basicSalary: 0, allowances: 0, overtime: 0, deductions: 0, advanceDeduction: 0, absenceFine: 0, grossSalary: 0, netSalary: 0 }
  );

  const pendingCount = payrollData.filter(emp => emp.status === 'Pending').length;
  const paidCount = payrollData.filter(emp => emp.status === 'Paid').length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold text-gray-800 dark:text-white">Payroll Management</h1>
        <div className="flex gap-2">
          <Button onClick={handleGeneratePayroll} variant="secondary">
            <FaMoneyCheckAlt className="mr-2" /> Generate Payroll
          </Button>
          {pendingCount > 0 && (
            <Button onClick={handlePayAll}>
              <FaCheckCircle className="mr-2" /> Pay All ({pendingCount})
            </Button>
          )}
        </div>
      </div>

      {/* Month Selector & Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <Input
            label="Select Month"
            type="month"
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(e.target.value)}
          />
        </Card>

        <Card>
          <div className="flex items-center gap-3">
            <FaCalendarAlt className="text-2xl text-primary" />
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Total Employees</p>
              <p className="text-2xl font-bold text-primary">{payrollData.length}</p>
            </div>
          </div>
        </Card>

        <Card className="bg-green-50 dark:bg-green-900/20">
          <div className="flex items-center gap-3">
            <FaCheckCircle className="text-2xl text-green-600 dark:text-green-400" />
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Paid</p>
              <p className="text-2xl font-bold text-green-600 dark:text-green-400">{paidCount}</p>
            </div>
          </div>
        </Card>

        <Card className="bg-orange-50 dark:bg-orange-900/20">
          <div className="flex items-center gap-3">
            <FaTimesCircle className="text-2xl text-orange-600 dark:text-orange-400" />
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Pending</p>
              <p className="text-2xl font-bold text-orange-600 dark:text-orange-400">{pendingCount}</p>
            </div>
          </div>
        </Card>
      </div>

      {/* Payroll Table */}
      <Card>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b-2 border-gray-200 dark:border-gray-700">
                <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700 dark:text-gray-300">Employee Name</th>
                <th className="text-right py-3 px-4 text-sm font-semibold text-gray-700 dark:text-gray-300">Basic Salary</th>
                <th className="text-right py-3 px-4 text-sm font-semibold text-gray-700 dark:text-gray-300">Allowances</th>
                <th className="text-right py-3 px-4 text-sm font-semibold text-gray-700 dark:text-gray-300">Overtime</th>
                <th className="text-right py-3 px-4 text-sm font-semibold text-gray-700 dark:text-gray-300">Deductions</th>
                <th className="text-right py-3 px-4 text-sm font-semibold text-gray-700 dark:text-gray-300">Advance</th>
                <th className="text-right py-3 px-4 text-sm font-semibold text-gray-700 dark:text-gray-300">Gross Salary</th>
                <th className="text-right py-3 px-4 text-sm font-semibold text-gray-700 dark:text-gray-300">Net Salary</th>
                <th className="text-center py-3 px-4 text-sm font-semibold text-gray-700 dark:text-gray-300">Status</th>
                <th className="text-center py-3 px-4 text-sm font-semibold text-gray-700 dark:text-gray-300">Actions</th>
              </tr>
            </thead>
            <tbody>
              {payrollData.map((employee) => (
                <tr
                  key={employee.id}
                  className="border-b border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800"
                >
                  <td className="py-3 px-4">
                    <div>
                      <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                        {employee.employeeName}
                      </p>
                      <p className="text-xs text-gray-600 dark:text-gray-400">
                        {employee.id} - {employee.designation}
                      </p>
                    </div>
                  </td>
                  <td className="py-3 px-4 text-sm text-right text-gray-900 dark:text-gray-100">
                    Rs. {employee.basicSalary.toLocaleString()}
                  </td>
                  <td className="py-3 px-4 text-sm text-right text-gray-900 dark:text-gray-100">
                    Rs. {employee.allowances.toLocaleString()}
                  </td>
                  <td className="py-3 px-4 text-sm text-right text-green-600 dark:text-green-400">
                    Rs. {employee.overtime.toLocaleString()}
                  </td>
                  <td className="py-3 px-4 text-sm text-right text-red-600 dark:text-red-400">
                    Rs. {employee.deductions.toLocaleString()}
                  </td>
                  <td className="py-3 px-4 text-sm text-right text-orange-600 dark:text-orange-400">
                    Rs. {employee.advanceDeduction.toLocaleString()}
                  </td>
                  <td className="py-3 px-4 text-sm text-right font-semibold text-gray-900 dark:text-white">
                    Rs. {employee.grossSalary.toLocaleString()}
                  </td>
                  <td className="py-3 px-4 text-sm text-right font-bold text-primary">
                    Rs. {employee.netSalary.toLocaleString()}
                  </td>
                  <td className="py-3 px-4 text-center">
                    <Badge variant={employee.status === 'Paid' ? 'success' : 'warning'}>
                      {employee.status}
                    </Badge>
                  </td>
                  <td className="py-3 px-4">
                    <div className="flex items-center justify-center gap-2">
                      <button
                        onClick={() => handleViewSalarySlip(employee)}
                        className="text-blue-600 hover:text-blue-800 dark:text-blue-400"
                        title="View Salary Slip"
                      >
                        <FaFileInvoice />
                      </button>
                      {employee.status === 'Pending' && (
                        <button
                          onClick={() => handlePayIndividual(employee)}
                          className="text-green-600 hover:text-green-800 dark:text-green-400"
                          title="Mark as Paid"
                        >
                          <FaCheckCircle />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="bg-gray-100 dark:bg-gray-800 font-bold border-t-2 border-gray-300 dark:border-gray-600">
                <td className="py-4 px-4 text-sm text-gray-900 dark:text-white">TOTALS</td>
                <td className="py-4 px-4 text-sm text-right text-gray-900 dark:text-white">
                  Rs. {totals.basicSalary.toLocaleString()}
                </td>
                <td className="py-4 px-4 text-sm text-right text-gray-900 dark:text-white">
                  Rs. {totals.allowances.toLocaleString()}
                </td>
                <td className="py-4 px-4 text-sm text-right text-green-600 dark:text-green-400">
                  Rs. {totals.overtime.toLocaleString()}
                </td>
                <td className="py-4 px-4 text-sm text-right text-red-600 dark:text-red-400">
                  Rs. {totals.deductions.toLocaleString()}
                </td>
                <td className="py-4 px-4 text-sm text-right text-orange-600 dark:text-orange-400">
                  Rs. {totals.advanceDeduction.toLocaleString()}
                </td>
                <td className="py-4 px-4 text-sm text-right text-gray-900 dark:text-white">
                  Rs. {totals.grossSalary.toLocaleString()}
                </td>
                <td className="py-4 px-4 text-sm text-right text-primary">
                  Rs. {totals.netSalary.toLocaleString()}
                </td>
                <td colSpan="2"></td>
              </tr>
            </tfoot>
          </table>
        </div>
      </Card>

      {/* Salary Slip Modal */}
      {selectedEmployee && (
        <Modal
          isOpen={showSalarySlip}
          onClose={() => setShowSalarySlip(false)}
          title="Salary Slip"
          size="large"
        >
          <div className="space-y-6 print:p-8">
            {/* Company Header */}
            <div className="text-center border-b-2 border-gray-300 dark:border-gray-600 pb-4">
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Mian & Sons Hardware Store</h1>
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                Main Market, Rawalpindi, Pakistan
              </p>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Phone: +92-300-1234567 | Email: info@miansons.com
              </p>
              <h2 className="text-xl font-semibold text-primary mt-3">SALARY SLIP</h2>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Month: {new Date(selectedMonth + '-01').toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
              </p>
            </div>

            {/* Employee Details */}
            <div className="grid grid-cols-2 gap-4 bg-gray-50 dark:bg-gray-800 p-4 rounded-lg">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Employee ID</p>
                <p className="font-semibold text-gray-900 dark:text-white">{selectedEmployee.id}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Employee Name</p>
                <p className="font-semibold text-gray-900 dark:text-white">{selectedEmployee.employeeName}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Designation</p>
                <p className="font-semibold text-gray-900 dark:text-white">{selectedEmployee.designation}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Department</p>
                <p className="font-semibold text-gray-900 dark:text-white">{selectedEmployee.department}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Working Days</p>
                <p className="font-semibold text-gray-900 dark:text-white">{selectedEmployee.workingDays}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Present Days</p>
                <p className="font-semibold text-gray-900 dark:text-white">{selectedEmployee.presentDays}</p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-6">
              {/* Earnings Table */}
              <div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3 border-b border-gray-300 dark:border-gray-600 pb-2">
                  Earnings
                </h3>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600 dark:text-gray-400">Basic Salary</span>
                    <span className="text-sm font-semibold text-gray-900 dark:text-white">
                      Rs. {selectedEmployee.basicSalary.toLocaleString()}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600 dark:text-gray-400">HRA (House Rent)</span>
                    <span className="text-sm font-semibold text-gray-900 dark:text-white">
                      Rs. {(selectedEmployee.allowances * 0.5).toLocaleString()}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600 dark:text-gray-400">Transport Allowance</span>
                    <span className="text-sm font-semibold text-gray-900 dark:text-white">
                      Rs. {(selectedEmployee.allowances * 0.3).toLocaleString()}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600 dark:text-gray-400">Other Allowances</span>
                    <span className="text-sm font-semibold text-gray-900 dark:text-white">
                      Rs. {(selectedEmployee.allowances * 0.2).toLocaleString()}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600 dark:text-gray-400">Overtime Pay</span>
                    <span className="text-sm font-semibold text-green-600 dark:text-green-400">
                      Rs. {selectedEmployee.overtime.toLocaleString()}
                    </span>
                  </div>
                  <div className="flex justify-between pt-2 border-t border-gray-300 dark:border-gray-600">
                    <span className="text-sm font-semibold text-gray-900 dark:text-white">Gross Salary</span>
                    <span className="text-sm font-bold text-primary">
                      Rs. {selectedEmployee.grossSalary.toLocaleString()}
                    </span>
                  </div>
                </div>
              </div>

              {/* Deductions Table */}
              <div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3 border-b border-gray-300 dark:border-gray-600 pb-2">
                  Deductions
                </h3>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600 dark:text-gray-400">Income Tax</span>
                    <span className="text-sm font-semibold text-red-600 dark:text-red-400">
                      Rs. {(selectedEmployee.deductions * 0.5).toLocaleString()}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600 dark:text-gray-400">Provident Fund</span>
                    <span className="text-sm font-semibold text-red-600 dark:text-red-400">
                      Rs. {(selectedEmployee.deductions * 0.3).toLocaleString()}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600 dark:text-gray-400">Other Deductions</span>
                    <span className="text-sm font-semibold text-red-600 dark:text-red-400">
                      Rs. {(selectedEmployee.deductions * 0.2).toLocaleString()}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600 dark:text-gray-400">Advance Deduction</span>
                    <span className="text-sm font-semibold text-orange-600 dark:text-orange-400">
                      Rs. {selectedEmployee.advanceDeduction.toLocaleString()}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600 dark:text-gray-400">Absence Fine</span>
                    <span className="text-sm font-semibold text-red-600 dark:text-red-400">
                      Rs. {Number(selectedEmployee.absenceFine || 0).toLocaleString()}
                    </span>
                  </div>
                  <div className="flex justify-between pt-2 border-t border-gray-300 dark:border-gray-600">
                    <span className="text-sm font-semibold text-gray-900 dark:text-white">Total Deductions</span>
                    <span className="text-sm font-bold text-red-600 dark:text-red-400">
                      Rs. {(selectedEmployee.deductions + selectedEmployee.advanceDeduction + Number(selectedEmployee.absenceFine || 0)).toLocaleString()}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Net Salary */}
            <div className="bg-primary text-white p-4 rounded-lg">
              <div className="flex justify-between items-center">
                <div>
                  <p className="text-sm opacity-90">Net Salary Payable</p>
                  <p className="text-3xl font-bold">
                    Rs. {selectedEmployee.netSalary.toLocaleString()}
                  </p>
                </div>
                {selectedEmployee.status === 'Paid' && (
                  <div className="text-right">
                    <Badge variant="success" className="mb-1">PAID</Badge>
                    <p className="text-xs opacity-90">
                      Paid on: {new Date(selectedEmployee.paidDate).toLocaleDateString()}
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* Footer */}
            <div className="text-center text-xs text-gray-600 dark:text-gray-400 border-t border-gray-300 dark:border-gray-600 pt-4">
              <p>This is a computer-generated salary slip and does not require a signature.</p>
              <p className="mt-1">For queries, contact HR Department: hr@miansons.com</p>
            </div>

            {/* Action Buttons */}
            <div className="flex justify-end gap-3 pt-4 border-t border-gray-200 dark:border-gray-700 print:hidden">
              <Button variant="secondary" onClick={() => setShowSalarySlip(false)}>
                Close
              </Button>
              <Button onClick={handlePrintSlip}>
                <FaPrint className="mr-2" /> Print Slip
              </Button>
            </div>
          </div>

          {/* Print Styles */}
          <style>{`
            @media print {
              body * {
                visibility: hidden;
              }
              .print\\:p-8, .print\\:p-8 * {
                visibility: visible;
              }
              .print\\:hidden {
                display: none !important;
              }
              @page {
                margin: 1cm;
              }
            }
          `}</style>
        </Modal>
      )}
    </div>
  );
};

export default Payroll;
