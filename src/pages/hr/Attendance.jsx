import React, { useEffect, useState } from 'react';
import { FaSave, FaFileExcel, FaFilePdf, FaCalendarAlt, FaCheck, FaTimes, FaClock } from 'react-icons/fa';
import Card from '../../components/common/Card';
import Button from '../../components/common/Button';
import Input from '../../components/common/Input';
import Badge from '../../components/common/Badge';
import { useAuth } from '../../context/AuthContext';
import { toast } from 'react-toastify';
import { logAudit } from '../../utils/audit';

const EMPLOYEES_KEY = 'admin_employees';
const ATTENDANCE_KEY = 'admin_attendance';

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

const STATUS_TO_CODE = {
  Present: 'P',
  Absent: 'A',
  Late: 'L',
  'Half Day': 'HD',
  Holiday: 'H'
};

const Attendance = () => {
  const { checkPermission, user } = useAuth();
  const [activeTab, setActiveTab] = useState('mark');
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [selectedMonth, setSelectedMonth] = useState(new Date().toISOString().substring(0, 7));
  const [employees, setEmployees] = useState([]);
  const [attendanceRecords, setAttendanceRecords] = useState({});

  const defaultEmployees = [];

  // Today's attendance state
  const [todayAttendance, setTodayAttendance] = useState([]);

  const buildDailyAttendance = (date, staff, records) => {
    const daily = records[date] || {};
    return staff.map((emp) => {
      const record = daily[emp.id] || {};
      return {
        employeeId: emp.id,
        employeeName: emp.name,
        designation: emp.designation,
        status: record.status || 'Present',
        timeIn: record.timeIn || '09:00',
        timeOut: record.timeOut || '18:00',
        notes: record.notes || ''
      };
    });
  };

  const buildMonthAttendance = () => {
    const year = parseInt(selectedMonth.split('-')[0]);
    const month = parseInt(selectedMonth.split('-')[1]);
    const daysInMonth = new Date(year, month, 0).getDate();
    const attendance = {};

    employees.forEach((emp) => {
      attendance[emp.id] = {};
      for (let day = 1; day <= daysInMonth; day += 1) {
        const dateKey = `${selectedMonth}-${String(day).padStart(2, '0')}`;
        const dayOfWeek = new Date(year, month - 1, day).getDay();
        const daily = attendanceRecords[dateKey] || {};
        const record = daily[emp.id];

        if (record?.status) {
          attendance[emp.id][day] = STATUS_TO_CODE[record.status] || 'P';
        } else if (dayOfWeek === 0) {
          attendance[emp.id][day] = 'H';
        } else {
          attendance[emp.id][day] = 'A';
        }
      }
    });

    return attendance;
  };

  const monthAttendance = buildMonthAttendance();

  // Calculate monthly stats
  const calculateMonthlyStats = (employeeId) => {
    const year = parseInt(selectedMonth.split('-')[0]);
    const month = parseInt(selectedMonth.split('-')[1]);
    const daysInMonth = new Date(year, month, 0).getDate();
    
    let present = 0, absent = 0, late = 0, halfDay = 0, holidays = 0;
    
    for (let day = 1; day <= daysInMonth; day++) {
      const status = monthAttendance[employeeId][day];
      if (status === 'P') present++;
      else if (status === 'A') absent++;
      else if (status === 'L') late++;
      else if (status === 'HD') halfDay++;
      else if (status === 'H') holidays++;
    }
    
    const workingDays = daysInMonth - holidays;
    
    return { workingDays, present, absent, late, halfDay, holidays };
  };

  const handleAttendanceChange = (index, field, value) => {
    const updated = [...todayAttendance];
    updated[index][field] = value;
    setTodayAttendance(updated);
  };

  const handleSaveAttendance = () => {
    if (!checkPermission('hr', 'create')) {
      toast.error('You do not have permission to mark attendance');
      return;
    }
    const nextRecords = {
      ...attendanceRecords,
      [selectedDate]: todayAttendance.reduce((acc, att) => {
        acc[att.employeeId] = {
          status: att.status,
          timeIn: att.timeIn,
          timeOut: att.timeOut,
          notes: att.notes
        };
        return acc;
      }, {})
    };

    setAttendanceRecords(nextRecords);
    writeStoredData(ATTENDANCE_KEY, nextRecords);
    logAudit({
      user,
      action: 'Updated',
      module: 'Attendance',
      description: `Saved attendance for ${selectedDate}`
    });
    toast.success(`Attendance for ${new Date(selectedDate).toLocaleDateString()} saved successfully!`);
  };

  const handleExportPDF = () => {
    if (!checkPermission('hr', 'export')) {
      toast.error('You do not have permission to export');
      return;
    }
    toast.info('Preparing PDF preview...');
    window.print();
  };

  const handleExportExcel = () => {
    if (!checkPermission('hr', 'export')) {
      toast.error('You do not have permission to export');
      return;
    }
    if (!todayAttendance.length) {
      toast.error('No attendance data to export');
      return;
    }

    const headers = ['Employee ID', 'Name', 'Designation', 'Status', 'Time In', 'Time Out', 'Notes', 'Date'];
    const rows = todayAttendance.map((att) => [
      att.employeeId,
      att.employeeName,
      att.designation,
      att.status,
      att.timeIn,
      att.timeOut,
      att.notes || '',
      selectedDate
    ]);

    const csvContent = [headers, ...rows]
      .map((row) => row.map((cell) => `"${String(cell ?? '').replace(/"/g, '""')}"`).join(','))
      .join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `attendance-${selectedDate}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    toast.success('Attendance exported successfully!');
  };

  const getStatusBadge = (status) => {
    const variants = {
      'P': 'success',
      'A': 'danger',
      'L': 'warning',
      'HD': 'info',
      'H': 'secondary',
      'Present': 'success',
      'Absent': 'danger',
      'Late': 'warning',
      'Half Day': 'info',
      'Holiday': 'secondary',
    };
    return variants[status] || 'default';
  };

  const getDaysInMonth = () => {
    const year = parseInt(selectedMonth.split('-')[0]);
    const month = parseInt(selectedMonth.split('-')[1]);
    return new Date(year, month, 0).getDate();
  };

  const getAbsenceFine = (employee) => {
    const stats = calculateMonthlyStats(employee.id);
    if (stats.absent > 3) {
      return Math.round(Number(employee.basicSalary || 0) * 0.05);
    }
    return 0;
  };

  useEffect(() => {
    const storedEmployees = readStoredData(EMPLOYEES_KEY);
    if (storedEmployees.length) {
      const normalizedEmployees = storedEmployees.map((emp) => ({
        id: emp.id,
        name: emp.fullName || emp.name || 'Employee',
        designation: emp.designation || '',
        basicSalary: Number(emp.basicSalary || emp.salary || 0)
      }));
      setEmployees(normalizedEmployees);
    } else {
      setEmployees(defaultEmployees);
    }

    const storedAttendance = readStoredData(ATTENDANCE_KEY, {});
    setAttendanceRecords(storedAttendance);
  }, []);

  useEffect(() => {
    if (!employees.length) return;
    setTodayAttendance(buildDailyAttendance(selectedDate, employees, attendanceRecords));
  }, [selectedDate, employees, attendanceRecords]);

  useEffect(() => {
    const watchedKeys = [EMPLOYEES_KEY, ATTENDANCE_KEY];

    const handleStorage = (event) => {
      if (event?.key && !watchedKeys.includes(event.key)) return;
      if (event.key === EMPLOYEES_KEY) {
        const storedEmployees = readStoredData(EMPLOYEES_KEY);
        const normalizedEmployees = storedEmployees.map((emp) => ({
          id: emp.id,
          name: emp.fullName || emp.name || 'Employee',
          designation: emp.designation || '',
          basicSalary: Number(emp.basicSalary || emp.salary || 0)
        }));
        setEmployees(normalizedEmployees);
      }
      if (event.key === ATTENDANCE_KEY) {
        setAttendanceRecords(readStoredData(ATTENDANCE_KEY, {}));
      }
    };

    const handleCustomUpdate = (event) => {
      const key = event?.detail?.key;
      if (key && !watchedKeys.includes(key)) return;
      if (key === EMPLOYEES_KEY) {
        const storedEmployees = readStoredData(EMPLOYEES_KEY);
        const normalizedEmployees = storedEmployees.map((emp) => ({
          id: emp.id,
          name: emp.fullName || emp.name || 'Employee',
          designation: emp.designation || '',
          basicSalary: Number(emp.basicSalary || emp.salary || 0)
        }));
        setEmployees(normalizedEmployees);
      }
      if (key === ATTENDANCE_KEY) {
        setAttendanceRecords(readStoredData(ATTENDANCE_KEY, {}));
      }
    };

    window.addEventListener('storage', handleStorage);
    window.addEventListener('app-storage-updated', handleCustomUpdate);

    return () => {
      window.removeEventListener('storage', handleStorage);
      window.removeEventListener('app-storage-updated', handleCustomUpdate);
    };
  }, []);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold text-gray-800 dark:text-white">Attendance Management</h1>
        <div className="flex gap-2">
          <Button onClick={handleExportExcel} variant="secondary">
            <FaFileExcel className="mr-2" /> Export Excel
          </Button>
          <Button onClick={handleExportPDF} variant="secondary">
            <FaFilePdf className="mr-2" /> Export PDF
          </Button>
        </div>
      </div>

      {/* Tabs */}
      <Card>
        <div className="flex border-b border-gray-200 dark:border-gray-700">
          <button
            onClick={() => setActiveTab('mark')}
            className={`px-6 py-3 font-semibold transition-colors ${
              activeTab === 'mark'
                ? 'text-primary border-b-2 border-primary'
                : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
            }`}
          >
            Mark Attendance
          </button>
          <button
            onClick={() => setActiveTab('report')}
            className={`px-6 py-3 font-semibold transition-colors ${
              activeTab === 'report'
                ? 'text-primary border-b-2 border-primary'
                : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
            }`}
          >
            Attendance Report
          </button>
          <button
            onClick={() => setActiveTab('summary')}
            className={`px-6 py-3 font-semibold transition-colors ${
              activeTab === 'summary'
                ? 'text-primary border-b-2 border-primary'
                : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
            }`}
          >
            Summary
          </button>
        </div>
      </Card>

      {/* Tab 1: Mark Attendance */}
      {activeTab === 'mark' && (
        <div className="space-y-6">
          <Card>
            <div className="flex items-center gap-4">
              <div className="flex-1">
                <Input
                  label="Select Date"
                  type="date"
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                />
              </div>
              <div className="flex items-end">
                <Button onClick={handleSaveAttendance}>
                  <FaSave className="mr-2" /> Save All Attendance
                </Button>
              </div>
            </div>
          </Card>

          <Card>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b-2 border-gray-200 dark:border-gray-700">
                    <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700 dark:text-gray-300">Employee ID</th>
                    <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700 dark:text-gray-300">Name</th>
                    <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700 dark:text-gray-300">Designation</th>
                    <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700 dark:text-gray-300">Status</th>
                    <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700 dark:text-gray-300">Time In</th>
                    <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700 dark:text-gray-300">Time Out</th>
                    <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700 dark:text-gray-300">Notes</th>
                  </tr>
                </thead>
                <tbody>
                  {todayAttendance.map((att, index) => (
                    <tr
                      key={att.employeeId}
                      className="border-b border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800"
                    >
                      <td className="py-3 px-4 text-sm font-medium text-gray-900 dark:text-gray-100">
                        {att.employeeId}
                      </td>
                      <td className="py-3 px-4 text-sm text-gray-900 dark:text-gray-100">
                        {att.employeeName}
                      </td>
                      <td className="py-3 px-4 text-sm text-gray-600 dark:text-gray-400">
                        {att.designation}
                      </td>
                      <td className="py-3 px-4">
                        <select
                          value={att.status}
                          onChange={(e) => handleAttendanceChange(index, 'status', e.target.value)}
                          className="px-3 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary"
                        >
                          <option value="Present">Present</option>
                          <option value="Absent">Absent</option>
                          <option value="Late">Late</option>
                          <option value="Half Day">Half Day</option>
                          <option value="Holiday">Holiday</option>
                        </select>
                      </td>
                      <td className="py-3 px-4">
                        <input
                          type="time"
                          value={att.timeIn}
                          onChange={(e) => handleAttendanceChange(index, 'timeIn', e.target.value)}
                          className="px-3 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary"
                          disabled={att.status === 'Absent' || att.status === 'Holiday'}
                        />
                      </td>
                      <td className="py-3 px-4">
                        <input
                          type="time"
                          value={att.timeOut}
                          onChange={(e) => handleAttendanceChange(index, 'timeOut', e.target.value)}
                          className="px-3 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary"
                          disabled={att.status === 'Absent' || att.status === 'Holiday'}
                        />
                      </td>
                      <td className="py-3 px-4">
                        <input
                          type="text"
                          value={att.notes}
                          onChange={(e) => handleAttendanceChange(index, 'notes', e.target.value)}
                          placeholder="Add notes..."
                          className="px-3 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary w-full"
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </div>
      )}

      {/* Tab 2: Attendance Report */}
      {activeTab === 'report' && (
        <div className="space-y-6">
          <Card>
            <div className="flex items-center gap-4">
              <div className="flex-1">
                <Input
                  label="Select Month"
                  type="month"
                  value={selectedMonth}
                  onChange={(e) => setSelectedMonth(e.target.value)}
                />
              </div>
              <div className="flex items-center gap-4 text-sm">
                <div className="flex items-center gap-2">
                  <Badge variant="success">P</Badge>
                  <span className="text-gray-600 dark:text-gray-400">Present</span>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="danger">A</Badge>
                  <span className="text-gray-600 dark:text-gray-400">Absent</span>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="warning">L</Badge>
                  <span className="text-gray-600 dark:text-gray-400">Late</span>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="info">HD</Badge>
                  <span className="text-gray-600 dark:text-gray-400">Half Day</span>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="secondary">H</Badge>
                  <span className="text-gray-600 dark:text-gray-400">Holiday</span>
                </div>
              </div>
            </div>
          </Card>

          {employees.map((emp) => {
            const stats = calculateMonthlyStats(emp.id);
            return (
              <Card key={emp.id}>
                <div className="mb-4 flex justify-between items-center">
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white">{emp.name}</h3>
                    <p className="text-sm text-gray-600 dark:text-gray-400">{emp.designation} - {emp.id}</p>
                  </div>
                  <div className="flex gap-6 text-sm">
                    <div className="text-center">
                      <p className="text-gray-600 dark:text-gray-400">Working Days</p>
                      <p className="text-lg font-bold text-gray-900 dark:text-white">{stats.workingDays}</p>
                    </div>
                    <div className="text-center">
                      <p className="text-gray-600 dark:text-gray-400">Present</p>
                      <p className="text-lg font-bold text-green-600">{stats.present}</p>
                    </div>
                    <div className="text-center">
                      <p className="text-gray-600 dark:text-gray-400">Absent</p>
                      <p className="text-lg font-bold text-red-600">{stats.absent}</p>
                    </div>
                    <div className="text-center">
                      <p className="text-gray-600 dark:text-gray-400">Late</p>
                      <p className="text-lg font-bold text-orange-600">{stats.late}</p>
                    </div>
                    <div className="text-center">
                      <p className="text-gray-600 dark:text-gray-400">Half Days</p>
                      <p className="text-lg font-bold text-blue-600">{stats.halfDay}</p>
                    </div>
                  </div>
                </div>

                {/* Calendar Grid */}
                <div className="grid grid-cols-7 gap-2">
                  {Array.from({ length: getDaysInMonth() }, (_, i) => i + 1).map((day) => {
                    const status = monthAttendance[emp.id][day];
                    return (
                      <div
                        key={day}
                        className="aspect-square border border-gray-200 dark:border-gray-700 rounded-lg p-2 flex flex-col items-center justify-center hover:shadow-md transition-shadow"
                      >
                        <span className="text-xs text-gray-600 dark:text-gray-400 mb-1">{day}</span>
                        <Badge variant={getStatusBadge(status)} className="text-xs">
                          {status}
                        </Badge>
                      </div>
                    );
                  })}
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {/* Tab 3: Summary Table */}
      {activeTab === 'summary' && (
        <div className="space-y-6">
          <Card>
            <div className="flex items-center gap-4 mb-4">
              <FaCalendarAlt className="text-2xl text-primary" />
              <div>
                <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                  Monthly Attendance Summary
                </h2>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  {new Date(selectedMonth + '-01').toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
                </p>
              </div>
              <div className="ml-auto">
                <Input
                  label="Select Month"
                  type="month"
                  value={selectedMonth}
                  onChange={(e) => setSelectedMonth(e.target.value)}
                />
              </div>
            </div>
          </Card>

          <Card>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b-2 border-gray-200 dark:border-gray-700">
                    <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700 dark:text-gray-300">Employee ID</th>
                    <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700 dark:text-gray-300">Name</th>
                    <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700 dark:text-gray-300">Designation</th>
                    <th className="text-center py-3 px-4 text-sm font-semibold text-gray-700 dark:text-gray-300">Working Days</th>
                    <th className="text-center py-3 px-4 text-sm font-semibold text-gray-700 dark:text-gray-300">Present</th>
                    <th className="text-center py-3 px-4 text-sm font-semibold text-gray-700 dark:text-gray-300">Absent</th>
                    <th className="text-center py-3 px-4 text-sm font-semibold text-gray-700 dark:text-gray-300">Late</th>
                    <th className="text-center py-3 px-4 text-sm font-semibold text-gray-700 dark:text-gray-300">Half Days</th>
                    <th className="text-center py-3 px-4 text-sm font-semibold text-gray-700 dark:text-gray-300">Fine (Rs.)</th>
                    <th className="text-center py-3 px-4 text-sm font-semibold text-gray-700 dark:text-gray-300">Attendance %</th>
                  </tr>
                </thead>
                <tbody>
                  {employees.map((emp) => {
                    const stats = calculateMonthlyStats(emp.id);
                    const attendancePercentage = ((stats.present / stats.workingDays) * 100).toFixed(1);
                    const fineAmount = getAbsenceFine(emp);
                    return (
                      <tr
                        key={emp.id}
                        className="border-b border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800"
                      >
                        <td className="py-3 px-4 text-sm font-medium text-gray-900 dark:text-gray-100">
                          {emp.id}
                        </td>
                        <td className="py-3 px-4 text-sm text-gray-900 dark:text-gray-100">
                          {emp.name}
                        </td>
                        <td className="py-3 px-4 text-sm text-gray-600 dark:text-gray-400">
                          {emp.designation}
                        </td>
                        <td className="py-3 px-4 text-sm text-center font-semibold text-gray-900 dark:text-white">
                          {stats.workingDays}
                        </td>
                        <td className="py-3 px-4 text-sm text-center">
                          <Badge variant="success">{stats.present}</Badge>
                        </td>
                        <td className="py-3 px-4 text-sm text-center">
                          <Badge variant="danger">{stats.absent}</Badge>
                        </td>
                        <td className="py-3 px-4 text-sm text-center">
                          <Badge variant="warning">{stats.late}</Badge>
                        </td>
                        <td className="py-3 px-4 text-sm text-center">
                          <Badge variant="info">{stats.halfDay}</Badge>
                        </td>
                        <td className="py-3 px-4 text-sm text-center font-semibold text-red-600">
                          {fineAmount > 0 ? `Rs. ${fineAmount.toLocaleString()}` : '-'}
                        </td>
                        <td className="py-3 px-4 text-sm text-center">
                          <div className="flex items-center justify-center gap-2">
                            <div className="w-24 bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                              <div
                                className={`h-2 rounded-full ${
                                  attendancePercentage >= 90 ? 'bg-green-600' :
                                  attendancePercentage >= 75 ? 'bg-yellow-600' : 'bg-red-600'
                                }`}
                                style={{ width: `${attendancePercentage}%` }}
                              ></div>
                            </div>
                            <span className="font-semibold text-gray-900 dark:text-white">
                              {attendancePercentage}%
                            </span>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </Card>

          {/* Summary Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card>
              <div className="flex items-center gap-3">
                <div className="p-3 bg-green-100 dark:bg-green-900 rounded-full">
                  <FaCheck className="text-2xl text-green-600 dark:text-green-400" />
                </div>
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Avg. Attendance</p>
                  <p className="text-2xl font-bold text-green-600 dark:text-green-400">
                    {(employees.reduce((sum, emp) => {
                      const stats = calculateMonthlyStats(emp.id);
                      return sum + (stats.present / stats.workingDays) * 100;
                    }, 0) / employees.length).toFixed(1)}%
                  </p>
                </div>
              </div>
            </Card>

            <Card>
              <div className="flex items-center gap-3">
                <div className="p-3 bg-blue-100 dark:bg-blue-900 rounded-full">
                  <FaCalendarAlt className="text-2xl text-blue-600 dark:text-blue-400" />
                </div>
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Total Employees</p>
                  <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                    {employees.length}
                  </p>
                </div>
              </div>
            </Card>

            <Card>
              <div className="flex items-center gap-3">
                <div className="p-3 bg-red-100 dark:bg-red-900 rounded-full">
                  <FaTimes className="text-2xl text-red-600 dark:text-red-400" />
                </div>
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Total Absences</p>
                  <p className="text-2xl font-bold text-red-600 dark:text-red-400">
                    {employees.reduce((sum, emp) => sum + calculateMonthlyStats(emp.id).absent, 0)}
                  </p>
                </div>
              </div>
            </Card>

            <Card>
              <div className="flex items-center gap-3">
                <div className="p-3 bg-orange-100 dark:bg-orange-900 rounded-full">
                  <FaClock className="text-2xl text-orange-600 dark:text-orange-400" />
                </div>
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Total Late</p>
                  <p className="text-2xl font-bold text-orange-600 dark:text-orange-400">
                    {employees.reduce((sum, emp) => sum + calculateMonthlyStats(emp.id).late, 0)}
                  </p>
                </div>
              </div>
            </Card>
          </div>
        </div>
      )}
    </div>
  );
};

export default Attendance;
