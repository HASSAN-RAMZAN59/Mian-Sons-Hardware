import React, { useEffect, useState } from 'react';
import { FaPlus, FaEdit, FaTrash, FaFileExcel, FaFilePdf, FaSearch, FaMoneyBillWave, FaCalendarAlt, FaFilter } from 'react-icons/fa';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import Card from '../../components/common/Card';
import Button from '../../components/common/Button';
import Table from '../../components/common/Table';
import Badge from '../../components/common/Badge';
import Input from '../../components/common/Input';
import Select from '../../components/common/Select';
import TextArea from '../../components/common/TextArea';
import { useAuth } from '../../context/AuthContext';
import { toast } from 'react-toastify';
import { logAudit } from '../../utils/audit';

const EXPENSES_KEY = 'admin_expenses';

const readStoredData = (key, fallback = []) => {
  try {
    const rawData = localStorage.getItem(key);
    if (!rawData) return fallback;
    const parsed = JSON.parse(rawData);
    return Array.isArray(parsed) ? parsed : fallback;
  } catch (error) {
    return fallback;
  }
};

const writeStoredData = (key, value) => {
  localStorage.setItem(key, JSON.stringify(value));
  window.dispatchEvent(new CustomEvent('app-storage-updated', { detail: { key } }));
};

const Expenses = () => {
  const { checkPermission, user } = useAuth();
  const [showAddModal, setShowAddModal] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [selectedMonth, setSelectedMonth] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [expenses, setExpenses] = useState([]);

  // Expense categories
  const categories = [
    'Rent',
    'Electricity',
    'Salaries',
    'Fuel',
    'Repair & Maintenance',
    'Stationery',
    'Miscellaneous',
    'Marketing',
    'Transport'
  ];

  // Default expense data
  const defaultExpenses = [
    { id: 'EXP-001', date: '2026-03-11', category: 'Electricity', description: 'Monthly electricity bill', amount: 25000, paymentMethod: 'Bank Transfer', paidBy: 'Admin User', reference: 'INV-2026-03-001', notes: 'March 2026 bill' },
    { id: 'EXP-002', date: '2026-03-10', category: 'Fuel', description: 'Delivery vehicle fuel', amount: 8500, paymentMethod: 'Cash', paidBy: 'Store Manager', reference: '', notes: '' },
    { id: 'EXP-003', date: '2026-03-09', category: 'Stationery', description: 'Office supplies', amount: 3200, paymentMethod: 'Cash', paidBy: 'Admin User', reference: 'PO-445', notes: 'Printer paper, pens' },
    { id: 'EXP-004', date: '2026-03-08', category: 'Repair & Maintenance', description: 'AC repair', amount: 12000, paymentMethod: 'Cash', paidBy: 'Store Manager', reference: '', notes: 'Main showroom AC unit' },
    { id: 'EXP-005', date: '2026-03-07', category: 'Marketing', description: 'Facebook ads', amount: 15000, paymentMethod: 'Credit Card', paidBy: 'Admin User', reference: 'AD-2026-03', notes: 'March campaign' },
    { id: 'EXP-006', date: '2026-03-05', category: 'Salaries', description: 'Staff salaries - March', amount: 450000, paymentMethod: 'Bank Transfer', paidBy: 'Admin User', reference: 'SAL-2026-03', notes: 'Monthly payroll' },
    { id: 'EXP-007', date: '2026-03-04', category: 'Transport', description: 'Delivery charges', amount: 6800, paymentMethod: 'Cash', paidBy: 'Store Manager', reference: '', notes: 'Customer deliveries' },
    { id: 'EXP-008', date: '2026-03-03', category: 'Rent', description: 'Shop rent - March', amount: 85000, paymentMethod: 'Bank Transfer', paidBy: 'Admin User', reference: 'RENT-2026-03', notes: 'Monthly rent payment' },
    { id: 'EXP-009', date: '2026-03-02', category: 'Miscellaneous', description: 'Tea/Coffee supplies', amount: 2500, paymentMethod: 'Cash', paidBy: 'Store Manager', reference: '', notes: '' },
    { id: 'EXP-010', date: '2026-02-28', category: 'Electricity', description: 'February electricity bill', amount: 22000, paymentMethod: 'Bank Transfer', paidBy: 'Admin User', reference: 'INV-2026-02-028', notes: 'February 2026 bill' },
  ];

  useEffect(() => {
    const storedExpenses = readStoredData(EXPENSES_KEY);
    if (storedExpenses.length) {
      setExpenses(storedExpenses);
      return;
    }
    setExpenses(defaultExpenses);
    writeStoredData(EXPENSES_KEY, defaultExpenses);
  }, []);

  useEffect(() => {
    const watchedKeys = [EXPENSES_KEY];

    const handleStorage = (event) => {
      if (event?.key && !watchedKeys.includes(event.key)) return;
      setExpenses(readStoredData(EXPENSES_KEY));
    };

    const handleCustomUpdate = (event) => {
      const key = event?.detail?.key;
      if (key && !watchedKeys.includes(key)) return;
      setExpenses(readStoredData(EXPENSES_KEY));
    };

    window.addEventListener('storage', handleStorage);
    window.addEventListener('app-storage-updated', handleCustomUpdate);

    return () => {
      window.removeEventListener('storage', handleStorage);
      window.removeEventListener('app-storage-updated', handleCustomUpdate);
    };
  }, []);

  // Calculate summary statistics
  const today = new Date().toISOString().split('T')[0];
  const todayExpenses = expenses.filter(e => e.date === today).reduce((sum, e) => sum + e.amount, 0);
  
  const startOfWeek = new Date();
  startOfWeek.setDate(startOfWeek.getDate() - startOfWeek.getDay());
  const weekExpenses = expenses.filter(e => new Date(e.date) >= startOfWeek).reduce((sum, e) => sum + e.amount, 0);
  
  const startOfMonth = new Date();
  startOfMonth.setDate(1);
  const monthExpenses = expenses.filter(e => new Date(e.date) >= startOfMonth).reduce((sum, e) => sum + e.amount, 0);

  const buildMonthlyData = () => {
    const months = [];
    const now = new Date();
    for (let offset = 6; offset >= 0; offset -= 1) {
      const date = new Date(now.getFullYear(), now.getMonth() - offset, 1);
      months.push({
        key: date.toISOString().slice(0, 7),
        label: date.toLocaleString('en-US', { month: 'short' })
      });
    }

    const totals = new Map(months.map((month) => [month.key, 0]));
    expenses.forEach((expense) => {
      const key = String(expense.date || '').slice(0, 7);
      if (!totals.has(key)) return;
      totals.set(key, totals.get(key) + Number(expense.amount || 0));
    });

    return months.map((month) => ({
      month: month.label,
      amount: totals.get(month.key) || 0
    }));
  };

  const monthlyData = buildMonthlyData();

  // Category-wise expenses for current month
  const categoryExpenses = categories.map(cat => ({
    category: cat,
    amount: expenses.filter(e => e.category === cat && new Date(e.date) >= startOfMonth).reduce((sum, e) => sum + e.amount, 0)
  })).filter(c => c.amount > 0);

  // Table columns
  const columns = [
    { key: 'id', label: 'ID' },
    { key: 'date', label: 'Date' },
    { key: 'category', label: 'Category' },
    { key: 'description', label: 'Description' },
    { 
      key: 'amount', 
      label: 'Amount',
      render: (row) => <span className="font-semibold text-gray-900 dark:text-white">Rs. {row.amount.toLocaleString()}</span>
    },
    { 
      key: 'paymentMethod', 
      label: 'Payment Method',
      render: (row) => {
        const variants = {
          'Cash': 'success',
          'Bank Transfer': 'primary',
          'Credit Card': 'warning',
          'Cheque': 'secondary'
        };
        return <Badge variant={variants[row.paymentMethod] || 'secondary'}>{row.paymentMethod}</Badge>;
      }
    },
    { key: 'paidBy', label: 'Paid By' },
    { key: 'reference', label: 'Reference' },
    { 
      key: 'notes', 
      label: 'Notes',
      render: (row) => <span className="text-sm text-gray-500">{row.notes || '-'}</span>
    },
    { 
      key: 'actions', 
      label: 'Actions',
      render: (row) => (
        <div className="flex gap-2">
          {checkPermission('expenses', 'update') && (
            <Button size="sm" variant="secondary" onClick={() => handleEdit(row)}>
              <FaEdit />
            </Button>
          )}
          {checkPermission('expenses', 'delete') && (
            <Button size="sm" variant="danger" onClick={() => handleDelete(row.id)}>
              <FaTrash />
            </Button>
          )}
        </div>
      )
    },
  ];

  // Filter expenses
  const filteredExpenses = expenses.filter(expense => {
    const matchesSearch = expense.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         expense.category.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         expense.id.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesCategory = !selectedCategory || expense.category === selectedCategory;
    
    const matchesMonth = !selectedMonth || expense.date.startsWith(selectedMonth);
    
    const matchesDateRange = (!dateFrom || expense.date >= dateFrom) && (!dateTo || expense.date <= dateTo);
    
    return matchesSearch && matchesCategory && matchesMonth && matchesDateRange;
  });

  const handleEdit = (expense) => {
    toast.info(`Edit expense: ${expense.id}`);
  };

  const handleDelete = (id) => {
    const nextExpenses = expenses.filter((expense) => expense.id !== id);
    setExpenses(nextExpenses);
    writeStoredData(EXPENSES_KEY, nextExpenses);
    logAudit({
      user,
      action: 'Deleted',
      module: 'Expenses',
      description: `Deleted expense ${id}`
    });
    toast.success(`Expense ${id} deleted successfully`);
  };

  const handleExportPDF = () => {
    if (!checkPermission('expenses', 'export')) {
      toast.error('You do not have permission to export');
      return;
    }
    if (!filteredExpenses.length) {
      toast.error('No expense data to export');
      return;
    }
    toast.info('Preparing PDF preview...');
    window.print();
  };

  const handleExportExcel = () => {
    if (!checkPermission('expenses', 'export')) {
      toast.error('You do not have permission to export');
      return;
    }
    if (!filteredExpenses.length) {
      toast.error('No expense data to export');
      return;
    }

    const headers = [
      'Expense ID',
      'Date',
      'Category',
      'Description',
      'Amount',
      'Payment Method',
      'Paid By',
      'Reference',
      'Notes'
    ];

    const rows = filteredExpenses.map((expense) => [
      expense.id,
      expense.date,
      expense.category,
      expense.description,
      Number(expense.amount || 0),
      expense.paymentMethod,
      expense.paidBy,
      expense.reference || '',
      expense.notes || ''
    ]);

    const csvContent = [headers, ...rows]
      .map((row) => row.map((cell) => `"${String(cell ?? '').replace(/"/g, '""')}"`).join(','))
      .join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `expenses-${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    toast.success('Expenses exported successfully!');
  };

  const [formData, setFormData] = useState({
    date: new Date().toISOString().split('T')[0],
    category: '',
    description: '',
    amount: '',
    paymentMethod: 'Cash',
    reference: '',
    notes: ''
  });

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!checkPermission('expenses', 'create')) {
      toast.error('You do not have permission to add expenses');
      return;
    }
    const nextId = expenses.length
      ? Math.max(...expenses.map((expense) => Number(String(expense.id || '').split('-')[1]) || 0)) + 1
      : 1;
    const newExpense = {
      id: `EXP-${String(nextId).padStart(3, '0')}`,
      date: formData.date,
      category: formData.category,
      description: formData.description,
      amount: Number(formData.amount || 0),
      paymentMethod: formData.paymentMethod,
      paidBy: user?.name || 'Current User',
      reference: formData.reference || '',
      notes: formData.notes || ''
    };
    const nextExpenses = [newExpense, ...expenses];
    setExpenses(nextExpenses);
    writeStoredData(EXPENSES_KEY, nextExpenses);
    logAudit({
      user,
      action: 'Created',
      module: 'Expenses',
      description: `Added expense ${newExpense.id} (${newExpense.category})`
    });
    toast.success('Expense added successfully!');
    setShowAddModal(false);
    setFormData({
      date: new Date().toISOString().split('T')[0],
      category: '',
      description: '',
      amount: '',
      paymentMethod: 'Cash',
      reference: '',
      notes: ''
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold text-gray-800 dark:text-white">Expenses</h1>
        <div className="flex gap-3">
          {(user?.role === 'admin' || user?.role === 'superadmin') && (
            <>
              <Button variant="secondary" onClick={handleExportExcel}>
                <FaFileExcel className="mr-2" /> Excel
              </Button>
              <Button variant="secondary" onClick={handleExportPDF}>
                <FaFilePdf className="mr-2" /> PDF
              </Button>
            </>
          )}
          {checkPermission('expenses', 'create') && (
            <Button onClick={() => setShowAddModal(true)}>
              <FaPlus className="mr-2" /> Add Expense
            </Button>
          )}
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card 
          title="Today's Expenses" 
          value={`Rs. ${todayExpenses.toLocaleString()}`}
          icon={FaMoneyBillWave} 
          color="red" 
        />
        <Card 
          title="This Week" 
          value={`Rs. ${weekExpenses.toLocaleString()}`}
          icon={FaCalendarAlt} 
          color="orange" 
        />
        <Card 
          title="This Month" 
          value={`Rs. ${monthExpenses.toLocaleString()}`}
          icon={FaMoneyBillWave} 
          color="purple" 
        />
      </div>

      {/* Monthly Expense Chart */}
      <Card title="Monthly Expenses Trend">
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={monthlyData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="month" />
            <YAxis />
            <Tooltip formatter={(value) => `Rs. ${value.toLocaleString()}`} />
            <Legend />
            <Bar dataKey="amount" fill="#ef4444" name="Expenses (Rs.)" />
          </BarChart>
        </ResponsiveContainer>
      </Card>

      {/* Category-wise Expenses */}
      <Card title="Category-wise Expenses (This Month)">
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
          {categoryExpenses.map((cat) => (
            <div key={cat.category} className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">{cat.category}</p>
              <p className="text-xl font-bold text-gray-900 dark:text-white">
                Rs. {cat.amount.toLocaleString()}
              </p>
            </div>
          ))}
        </div>
      </Card>

      {/* Filters */}
      <Card>
        <div className="flex items-center gap-2 mb-4">
          <FaFilter className="text-gray-500" />
          <h3 className="text-lg font-semibold text-gray-800 dark:text-white">Filters</h3>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
          <Input
            icon={FaSearch}
            placeholder="Search expenses..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
          <Select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
          >
            <option value="">All Categories</option>
            {categories.map(cat => (
              <option key={cat} value={cat}>{cat}</option>
            ))}
          </Select>
          <Input
            type="month"
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(e.target.value)}
            placeholder="Select month"
          />
          <Input
            type="date"
            value={dateFrom}
            onChange={(e) => setDateFrom(e.target.value)}
            placeholder="From date"
          />
          <Input
            type="date"
            value={dateTo}
            onChange={(e) => setDateTo(e.target.value)}
            placeholder="To date"
          />
        </div>
      </Card>

      {/* Expenses Table */}
      <Card>
        <Table columns={columns} data={filteredExpenses} />
      </Card>

      {/* Add Expense Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-bold text-gray-800 dark:text-white">Add New Expense</h2>
                <button
                  onClick={() => setShowAddModal(false)}
                  className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Input
                    label="Date"
                    type="date"
                    name="date"
                    value={formData.date}
                    onChange={handleChange}
                    required
                  />
                  <Select
                    label="Category"
                    name="category"
                    value={formData.category}
                    onChange={handleChange}
                    required
                  >
                    <option value="">Select Category</option>
                    {categories.map(cat => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))}
                  </Select>
                </div>

                <Input
                  label="Description"
                  name="description"
                  value={formData.description}
                  onChange={handleChange}
                  placeholder="Enter expense description"
                  required
                />

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Input
                    label="Amount (Rs.)"
                    type="number"
                    name="amount"
                    value={formData.amount}
                    onChange={handleChange}
                    placeholder="0.00"
                    required
                    min="0"
                    step="0.01"
                  />
                  <Select
                    label="Payment Method"
                    name="paymentMethod"
                    value={formData.paymentMethod}
                    onChange={handleChange}
                    required
                  >
                    <option value="Cash">Cash</option>
                    <option value="Bank Transfer">Bank Transfer</option>
                    <option value="Credit Card">Credit Card</option>
                    <option value="Cheque">Cheque</option>
                  </Select>
                </div>

                <Input
                  label="Reference Number"
                  name="reference"
                  value={formData.reference}
                  onChange={handleChange}
                  placeholder="Invoice/Reference number (optional)"
                />

                <TextArea
                  label="Notes"
                  name="notes"
                  value={formData.notes}
                  onChange={handleChange}
                  placeholder="Additional notes (optional)"
                  rows={3}
                />

                <div className="flex gap-3 pt-4">
                  <Button type="submit" className="flex-1">
                    Add Expense
                  </Button>
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={() => setShowAddModal(false)}
                    className="flex-1"
                  >
                    Cancel
                  </Button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Expenses;
