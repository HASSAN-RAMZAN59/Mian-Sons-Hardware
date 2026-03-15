import React, { useEffect, useState } from 'react';
import { FaCalendarAlt, FaCheckCircle, FaTimesCircle, FaClock, FaChartBar, FaPlus } from 'react-icons/fa';
import Card from '../../components/common/Card';
import Button from '../../components/common/Button';
import Input from '../../components/common/Input';
import Select from '../../components/common/Select';
import Badge from '../../components/common/Badge';
import { useAuth } from '../../context/AuthContext';
import { toast } from 'react-toastify';
import { logAudit } from '../../utils/audit';

const EMPLOYEES_KEY = 'admin_employees';
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

const writeStoredData = (key, value) => {
  localStorage.setItem(key, JSON.stringify(value));
  window.dispatchEvent(new CustomEvent('app-storage-updated', { detail: { key } }));
};

const Leaves = () => {
  const { user, checkPermission } = useAuth();
  const [activeTab, setActiveTab] = useState('requests');
  const [employees, setEmployees] = useState([]);

  // Leave Requests Data
  const [leaveRequests, setLeaveRequests] = useState([]);

  // Leave Balance Data
  const [leaveBalances, setLeaveBalances] = useState([]);

  // Apply Leave Form State
  const [leaveForm, setLeaveForm] = useState({
    employee: '',
    leaveType: '',
    fromDate: '',
    toDate: '',
    reason: '',
  });

  // Employee list for dropdown
  const normalizeEmployees = (rows = []) =>
    (Array.isArray(rows) ? rows : []).map((emp) => ({
      id: emp.id,
      name: emp.fullName || emp.name || 'Employee',
      designation: emp.designation || ''
    }));

  const buildDefaultBalance = (employee) => {
    const annualLeave = 20;
    const sickLeave = 10;
    const casualLeave = 5;
    const used = 0;
    const remaining = annualLeave + sickLeave + casualLeave - used;
    return {
      employeeId: employee.id,
      employeeName: employee.name,
      annualLeave,
      sickLeave,
      casualLeave,
      used,
      remaining
    };
  };

  const reconcileBalances = (currentEmployees, storedBalances = []) => {
    const balanceById = new Map();
    const balanceByName = new Map();

    (storedBalances || []).forEach((balance) => {
      if (balance.employeeId) balanceById.set(balance.employeeId, balance);
      if (balance.employeeName) balanceByName.set(balance.employeeName, balance);
    });

    return (currentEmployees || []).map((employee) => {
      const existing = balanceById.get(employee.id) || balanceByName.get(employee.name);
      if (existing) {
        return {
          ...existing,
          employeeId: employee.id,
          employeeName: employee.name
        };
      }
      return buildDefaultBalance(employee);
    });
  };

  const reconcileRequests = (currentEmployees, storedRequests = []) => {
    const employeeById = new Map((currentEmployees || []).map((emp) => [emp.id, emp]));
    const employeeByName = new Map((currentEmployees || []).map((emp) => [emp.name, emp]));

    return (storedRequests || [])
      .map((request) => {
        const matchedEmployee =
          employeeById.get(request.employeeId) || employeeByName.get(request.employeeName);
        if (!matchedEmployee) return null;
        return {
          ...request,
          employeeId: matchedEmployee.id,
          employeeName: matchedEmployee.name
        };
      })
      .filter(Boolean);
  };

  const persistRequests = (nextRequests) => {
    setLeaveRequests(nextRequests);
    writeStoredData(LEAVES_KEY, nextRequests);
  };

  const persistBalances = (nextBalances) => {
    setLeaveBalances(nextBalances);
    writeStoredData(LEAVE_BALANCES_KEY, nextBalances);
  };

  // Leave types
  const leaveTypes = [
    { value: 'Annual', label: 'Annual Leave' },
    { value: 'Sick', label: 'Sick Leave' },
    { value: 'Casual', label: 'Casual Leave' },
    { value: 'Emergency', label: 'Emergency Leave' },
    { value: 'Unpaid', label: 'Unpaid Leave' },
  ];

  // Calculate days between dates
  const calculateDays = (fromDate, toDate) => {
    if (!fromDate || !toDate) return 0;
    const from = new Date(fromDate);
    const to = new Date(toDate);
    const diffTime = Math.abs(to - from);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
    return diffDays;
  };

  useEffect(() => {
    const storedEmployees = normalizeEmployees(readStoredData(EMPLOYEES_KEY, []));
    setEmployees(storedEmployees);

    const storedRequests = readStoredData(LEAVES_KEY, []);
    const storedBalances = readStoredData(LEAVE_BALANCES_KEY, []);
    const nextRequests = reconcileRequests(storedEmployees, storedRequests);
    const nextBalances = reconcileBalances(storedEmployees, storedBalances);

    setLeaveRequests(nextRequests);
    setLeaveBalances(nextBalances);
    if (!storedBalances.length && nextBalances.length) {
      writeStoredData(LEAVE_BALANCES_KEY, nextBalances);
    }
  }, []);

  useEffect(() => {
    const handleStorage = (event) => {
      if (!event?.key) return;
      if (event.key === EMPLOYEES_KEY) {
        const nextEmployees = normalizeEmployees(readStoredData(EMPLOYEES_KEY, []));
        setEmployees(nextEmployees);
        persistRequests(reconcileRequests(nextEmployees, leaveRequests));
        persistBalances(reconcileBalances(nextEmployees, leaveBalances));
      }
      if (event.key === LEAVES_KEY) {
        const storedRequests = readStoredData(LEAVES_KEY, []);
        setLeaveRequests(reconcileRequests(employees, storedRequests));
      }
      if (event.key === LEAVE_BALANCES_KEY) {
        const storedBalances = readStoredData(LEAVE_BALANCES_KEY, []);
        setLeaveBalances(reconcileBalances(employees, storedBalances));
      }
    };

    const handleCustomUpdate = (event) => {
      const key = event?.detail?.key;
      if (!key) return;
      if (key === EMPLOYEES_KEY) {
        const nextEmployees = normalizeEmployees(readStoredData(EMPLOYEES_KEY, []));
        setEmployees(nextEmployees);
        persistRequests(reconcileRequests(nextEmployees, leaveRequests));
        persistBalances(reconcileBalances(nextEmployees, leaveBalances));
      }
      if (key === LEAVES_KEY) {
        const storedRequests = readStoredData(LEAVES_KEY, []);
        setLeaveRequests(reconcileRequests(employees, storedRequests));
      }
      if (key === LEAVE_BALANCES_KEY) {
        const storedBalances = readStoredData(LEAVE_BALANCES_KEY, []);
        setLeaveBalances(reconcileBalances(employees, storedBalances));
      }
    };

    window.addEventListener('storage', handleStorage);
    window.addEventListener('app-storage-updated', handleCustomUpdate);

    return () => {
      window.removeEventListener('storage', handleStorage);
      window.removeEventListener('app-storage-updated', handleCustomUpdate);
    };
  }, [employees, leaveRequests, leaveBalances]);

  // Handle Approve Leave
  const handleApprove = (request) => {
    if (!checkPermission('hr', 'update')) {
      toast.error('You do not have permission to approve leave requests');
      return;
    }

    const nextRequests = leaveRequests.map((req) =>
      req.id === request.id
        ? {
            ...req,
            status: 'Approved',
            approvedBy: user.username,
            approvedOn: new Date().toISOString().split('T')[0],
          }
        : req
    );
    persistRequests(nextRequests);
    logAudit({
      user,
      action: 'Updated',
      module: 'Leaves',
      description: `Approved leave request ${request.id}`
    });
    toast.success(`Leave request ${request.id} approved successfully!`);
  };

  // Handle Reject Leave
  const handleReject = (request) => {
    if (!checkPermission('hr', 'update')) {
      toast.error('You do not have permission to reject leave requests');
      return;
    }

    const nextRequests = leaveRequests.map((req) =>
      req.id === request.id
        ? {
            ...req,
            status: 'Rejected',
            rejectedBy: user.username,
            rejectedOn: new Date().toISOString().split('T')[0],
          }
        : req
    );
    persistRequests(nextRequests);
    logAudit({
      user,
      action: 'Updated',
      module: 'Leaves',
      description: `Rejected leave request ${request.id}`
    });
    toast.warning(`Leave request ${request.id} rejected!`);
  };

  // Handle Apply Leave Form Submit
  const handleApplyLeave = (e) => {
    e.preventDefault();

    if (!leaveForm.employee || !leaveForm.leaveType || !leaveForm.fromDate || !leaveForm.toDate || !leaveForm.reason) {
      toast.error('Please fill in all fields');
      return;
    }

    const days = calculateDays(leaveForm.fromDate, leaveForm.toDate);

    const selectedEmployee = employees.find((emp) => emp.id === leaveForm.employee);
    if (!selectedEmployee) {
      toast.error('Selected employee is no longer available');
      return;
    }

    const newRequest = {
      id: `LR-${String(leaveRequests.length + 1).padStart(3, '0')}`,
      employeeId: selectedEmployee.id,
      employeeName: selectedEmployee.name,
      leaveType: leaveForm.leaveType,
      fromDate: leaveForm.fromDate,
      toDate: leaveForm.toDate,
      days: days,
      reason: leaveForm.reason,
      status: 'Pending',
      appliedOn: new Date().toISOString().split('T')[0],
    };

    persistRequests([newRequest, ...leaveRequests]);
    logAudit({
      user,
      action: 'Created',
      module: 'Leaves',
      description: `Applied leave for ${selectedEmployee.name}`
    });
    toast.success('Leave application submitted successfully!');

    // Reset form
    setLeaveForm({
      employee: '',
      leaveType: '',
      fromDate: '',
      toDate: '',
      reason: '',
    });
  };

  // Get status badge
  const getStatusBadge = (status) => {
    switch (status) {
      case 'Approved':
        return <Badge variant="success">Approved</Badge>;
      case 'Rejected':
        return <Badge variant="danger">Rejected</Badge>;
      case 'Pending':
        return <Badge variant="warning">Pending</Badge>;
      default:
        return <Badge>{status}</Badge>;
    }
  };

  // Calculate summary stats
  const totalRequests = leaveRequests.length;
  const pendingRequests = leaveRequests.filter((req) => req.status === 'Pending').length;
  const approvedRequests = leaveRequests.filter((req) => req.status === 'Approved').length;
  const rejectedRequests = leaveRequests.filter((req) => req.status === 'Rejected').length;

  return (
    <div>
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-800 dark:text-white">Leave Management</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">Manage employee leaves and balances</p>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
        <Card>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Total Requests</p>
              <p className="text-2xl font-bold text-gray-800 dark:text-white mt-1">{totalRequests}</p>
            </div>
            <div className="p-3 bg-blue-100 dark:bg-blue-900 rounded-lg">
              <FaCalendarAlt className="text-2xl text-blue-600 dark:text-blue-400" />
            </div>
          </div>
        </Card>

        <Card>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Pending</p>
              <p className="text-2xl font-bold text-gray-800 dark:text-white mt-1">{pendingRequests}</p>
            </div>
            <div className="p-3 bg-yellow-100 dark:bg-yellow-900 rounded-lg">
              <FaClock className="text-2xl text-yellow-600 dark:text-yellow-400" />
            </div>
          </div>
        </Card>

        <Card>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Approved</p>
              <p className="text-2xl font-bold text-gray-800 dark:text-white mt-1">{approvedRequests}</p>
            </div>
            <div className="p-3 bg-green-100 dark:bg-green-900 rounded-lg">
              <FaCheckCircle className="text-2xl text-green-600 dark:text-green-400" />
            </div>
          </div>
        </Card>

        <Card>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Rejected</p>
              <p className="text-2xl font-bold text-gray-800 dark:text-white mt-1">{rejectedRequests}</p>
            </div>
            <div className="p-3 bg-red-100 dark:bg-red-900 rounded-lg">
              <FaTimesCircle className="text-2xl text-red-600 dark:text-red-400" />
            </div>
          </div>
        </Card>
      </div>

      {/* Tabs */}
      <div className="mb-6">
        <div className="border-b border-gray-200 dark:border-gray-700">
          <nav className="-mb-px flex space-x-8">
            <button
              onClick={() => setActiveTab('requests')}
              className={`${
                activeTab === 'requests'
                  ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                  : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 hover:border-gray-300'
              } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm flex items-center`}
            >
              <FaCalendarAlt className="mr-2" />
              Leave Requests
            </button>
            <button
              onClick={() => setActiveTab('balance')}
              className={`${
                activeTab === 'balance'
                  ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                  : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 hover:border-gray-300'
              } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm flex items-center`}
            >
              <FaChartBar className="mr-2" />
              Leave Balance
            </button>
            <button
              onClick={() => setActiveTab('apply')}
              className={`${
                activeTab === 'apply'
                  ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                  : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 hover:border-gray-300'
              } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm flex items-center`}
            >
              <FaPlus className="mr-2" />
              Apply Leave
            </button>
          </nav>
        </div>
      </div>

      {/* Tab 1 - Leave Requests */}
      {activeTab === 'requests' && (
        <Card>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
              <thead className="bg-gray-50 dark:bg-gray-800">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Employee
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Leave Type
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    From Date
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    To Date
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Days
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Reason
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Applied On
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-gray-900 divide-y divide-gray-200 dark:divide-gray-700">
                {leaveRequests.map((request) => (
                  <tr key={request.id} className="hover:bg-gray-50 dark:hover:bg-gray-800">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900 dark:text-white">
                        {request.employeeName}
                      </div>
                      <div className="text-xs text-gray-500 dark:text-gray-400">{request.id}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200">
                        {request.leaveType}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                      {new Date(request.fromDate).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                      {new Date(request.toDate).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">
                      {request.days}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900 dark:text-white max-w-xs truncate">
                      {request.reason}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">{getStatusBadge(request.status)}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                      {new Date(request.appliedOn).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      {request.status === 'Pending' && (
                        <div className="flex space-x-2">
                          <button
                            onClick={() => handleApprove(request)}
                            className="text-green-600 hover:text-green-900 dark:text-green-400 dark:hover:text-green-300"
                            title="Approve"
                          >
                            <FaCheckCircle className="text-lg" />
                          </button>
                          <button
                            onClick={() => handleReject(request)}
                            className="text-red-600 hover:text-red-900 dark:text-red-400 dark:hover:text-red-300"
                            title="Reject"
                          >
                            <FaTimesCircle className="text-lg" />
                          </button>
                        </div>
                      )}
                      {request.status === 'Approved' && (
                        <span className="text-xs text-gray-500 dark:text-gray-400">
                          by {request.approvedBy}
                        </span>
                      )}
                      {request.status === 'Rejected' && (
                        <span className="text-xs text-gray-500 dark:text-gray-400">
                          by {request.rejectedBy}
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* Tab 2 - Leave Balance */}
      {activeTab === 'balance' && (
        <Card>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
              <thead className="bg-gray-50 dark:bg-gray-800">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Employee
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Annual Leave
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Sick Leave
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Casual Leave
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Used
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Remaining
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-gray-900 divide-y divide-gray-200 dark:divide-gray-700">
                {leaveBalances.map((balance, index) => (
                  <tr key={index} className="hover:bg-gray-50 dark:hover:bg-gray-800">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900 dark:text-white">
                        {balance.employeeName}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                      {balance.annualLeave} days
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                      {balance.sickLeave} days
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                      {balance.casualLeave} days
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200">
                        {balance.used} days
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
                        {balance.remaining} days
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* Tab 3 - Apply Leave */}
      {activeTab === 'apply' && (
        <Card>
          <h2 className="text-xl font-bold text-gray-800 dark:text-white mb-6">Apply for Leave</h2>
          <form onSubmit={handleApplyLeave} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Employee Select */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Employee <span className="text-red-500">*</span>
                </label>
                <Select
                  value={leaveForm.employee}
                  onChange={(e) => setLeaveForm({ ...leaveForm, employee: e.target.value })}
                  required
                >
                  <option value="">Select Employee</option>
                  {employees.map((emp) => (
                    <option key={emp.id} value={emp.id}>
                      {emp.name}
                    </option>
                  ))}
                </Select>
              </div>

              {/* Leave Type */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Leave Type <span className="text-red-500">*</span>
                </label>
                <Select
                  value={leaveForm.leaveType}
                  onChange={(e) => setLeaveForm({ ...leaveForm, leaveType: e.target.value })}
                  required
                >
                  <option value="">Select Leave Type</option>
                  {leaveTypes.map((type) => (
                    <option key={type.value} value={type.value}>
                      {type.label}
                    </option>
                  ))}
                </Select>
              </div>

              {/* From Date */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  From Date <span className="text-red-500">*</span>
                </label>
                <Input
                  type="date"
                  value={leaveForm.fromDate}
                  onChange={(e) => setLeaveForm({ ...leaveForm, fromDate: e.target.value })}
                  required
                />
              </div>

              {/* To Date */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  To Date <span className="text-red-500">*</span>
                </label>
                <Input
                  type="date"
                  value={leaveForm.toDate}
                  onChange={(e) => setLeaveForm({ ...leaveForm, toDate: e.target.value })}
                  required
                  min={leaveForm.fromDate}
                />
              </div>
            </div>

            {/* Days Calculation Display */}
            {leaveForm.fromDate && leaveForm.toDate && (
              <div className="p-4 bg-blue-50 dark:bg-blue-900 border border-blue-200 dark:border-blue-700 rounded-lg">
                <p className="text-sm text-blue-800 dark:text-blue-200">
                  <strong>Total Days:</strong> {calculateDays(leaveForm.fromDate, leaveForm.toDate)} day(s)
                </p>
              </div>
            )}

            {/* Reason */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Reason <span className="text-red-500">*</span>
              </label>
              <textarea
                value={leaveForm.reason}
                onChange={(e) => setLeaveForm({ ...leaveForm, reason: e.target.value })}
                rows="4"
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                placeholder="Enter reason for leave..."
                required
              ></textarea>
            </div>

            {/* Submit Button */}
            <div className="flex justify-end">
              <Button type="submit" className="flex items-center">
                <FaPlus className="mr-2" />
                Submit Leave Application
              </Button>
            </div>
          </form>
        </Card>
      )}
    </div>
  );
};

export default Leaves;
