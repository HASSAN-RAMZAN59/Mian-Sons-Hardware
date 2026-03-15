import React, { useState, useEffect } from 'react';
import { toast } from 'react-toastify';
import { 
  FaPlus,
  FaEdit,
  FaEye,
  FaFileExcel,
  FaFilePdf,
  FaDollarSign,
  FaUsers,
  FaMoneyBillWave,
  FaCreditCard
} from 'react-icons/fa';
import { useAuth } from '../../context/AuthContext';
import { hasPermission } from '../../utils/permissions';
import Card from '../../components/common/Card';
import Table from '../../components/common/Table';
import Button from '../../components/common/Button';
import Modal from '../../components/common/Modal';
import Input from '../../components/common/Input';
import Select from '../../components/common/Select';
import Badge from '../../components/common/Badge';
import SearchBar from '../../components/common/SearchBar';

const POS_SALES_KEY = 'admin_pos_sales';
const WEBSITE_ORDERS_KEY = 'website_orders';
const CUSTOMER_ACCOUNTS_KEY = 'website_customer_accounts';

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

const toDatePart = (value) => {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return date.toISOString().split('T')[0];
};

const normalizeItems = (items = []) =>
  (Array.isArray(items) ? items : []).map((item) => {
    const qty = Number(item?.qty ?? item?.quantity ?? 0);
    const price = Number(item?.price ?? item?.unitPrice ?? 0);
    const total = Number(item?.total ?? item?.lineTotal ?? qty * price);

    return {
      name: item?.name || item?.productName || item?.title || 'Item',
      qty,
      price,
      total
    };
  });

const mapPosSales = (rows = []) =>
  (Array.isArray(rows) ? rows : []).map((sale) => {
    const mappedItems = normalizeItems(sale.items);
    const paymentMethod = sale.paymentMethod || 'Cash';
    const paymentStatus = sale.paymentStatus || (String(paymentMethod).toLowerCase() === 'credit' ? 'Credit' : 'Paid');

    return {
      id: `pos-${sale.id}`,
      invoiceNo: sale.invoiceNumber || `INV-POS-${String(sale.id).padStart(4, '0')}`,
      date: sale.date || toDatePart(sale.createdAt),
      customerName: sale.customerName || 'Walk-in Customer',
      netAmount: Number(sale.grandTotal ?? sale.netAmount ?? 0),
      paymentMethod,
      paymentStatus,
      cashReceived: Number(sale.cashReceived || 0),
      items: mappedItems
    };
  });

const mapWebsiteOrders = (rows = []) =>
  (Array.isArray(rows) ? rows : []).map((order, index) => {
    const mappedItems = normalizeItems(order.items);
    const createdAt = order.createdAt || order.date;
    const paymentMethod = order.paymentMethod || 'COD';
    const paymentStatus =
      order.paymentStatus ||
      (String(order.status || '').toLowerCase().includes('paid') ? 'Paid' :
        String(paymentMethod).toLowerCase() === 'cod' ? 'Credit' : 'Paid');

    return {
      id: `web-${order.id || index + 1}`,
      invoiceNo: `WEB-${order.id || String(index + 1).padStart(4, '0')}`,
      date: toDatePart(createdAt),
      customerName: order.customer?.fullName || order.customer?.name || 'Website Customer',
      customerEmail: order.customer?.email || '',
      customerPhone: order.customer?.phone || '',
      customerAddress: order.shipping?.address || '',
      customerCity: order.shipping?.city || '',
      netAmount: Number(order.totals?.grandTotal ?? order.amount ?? 0),
      paymentMethod,
      paymentStatus,
      items: mappedItems
    };
  });

const normalizeKey = (value) => String(value || '').trim().toLowerCase();

const getCustomerKey = ({ email, phone, fullName, name, customerName }) => {
  const normalizedEmail = normalizeKey(email);
  if (normalizedEmail) return `email:${normalizedEmail}`;
  const normalizedPhone = normalizeKey(phone);
  if (normalizedPhone) return `phone:${normalizedPhone}`;
  const normalizedName = normalizeKey(fullName || name || customerName);
  return normalizedName ? `name:${normalizedName}` : `unknown:${Date.now()}`;
};

const getPaidAmount = (sale) => {
  if (sale.paymentStatus === 'Paid') return sale.netAmount;
  const paidCandidate = Number(
    sale.paidAmount ?? sale.amountPaid ?? sale.cashReceived ?? 0
  );
  if (sale.paymentStatus === 'Partial') return Math.min(paidCandidate, sale.netAmount);
  return 0;
};

const Customers = () => {
  const { user } = useAuth();
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [customers, setCustomers] = useState([]);
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  
  const [formData, setFormData] = useState({
    fullName: '',
    phone: '',
    whatsapp: '',
    email: '',
    address: '',
    city: '',
    cnic: '',
    customerType: 'Retail',
    creditLimit: '',
    openingBalance: '',
    notes: '',
    status: 'Active'
  });

  const [paymentData, setPaymentData] = useState({
    amount: '',
    paymentMethod: 'Cash',
    notes: ''
  });

  const loadCustomersFromOrders = () => {
    const posSales = mapPosSales(readStoredData(POS_SALES_KEY));
    const websiteSales = mapWebsiteOrders(readStoredData(WEBSITE_ORDERS_KEY));
    const customerAccounts = readStoredData(CUSTOMER_ACCOUNTS_KEY);

    const customersMap = new Map();

    const upsertCustomer = (key, data) => {
      if (!customersMap.has(key)) {
        customersMap.set(key, {
          id: null,
          fullName: data.fullName || data.name || data.customerName || 'Customer',
          phone: data.phone || '',
          whatsapp: data.whatsapp || data.phone || '',
          email: data.email || '',
          address: data.address || '',
          city: data.city || '',
          cnic: data.cnic || '',
          customerType: data.customerType || 'Retail',
          creditLimit: Number(data.creditLimit || 0),
          openingBalance: Number(data.openingBalance || 0),
          totalPurchases: 0,
          totalPaid: 0,
          balanceDue: 0,
          notes: data.notes || '',
          status: 'Active',
          createdDate: data.createdDate || data.createdAt || new Date().toISOString().split('T')[0],
          lastPurchaseDate: '',
          purchaseHistory: []
        });
      } else {
        const existing = customersMap.get(key);
        customersMap.set(key, {
          ...existing,
          fullName: existing.fullName || data.fullName || data.name || data.customerName,
          phone: existing.phone || data.phone || '',
          whatsapp: existing.whatsapp || data.whatsapp || data.phone || '',
          email: existing.email || data.email || '',
          address: existing.address || data.address || '',
          city: existing.city || data.city || '',
          customerType: existing.customerType || data.customerType || 'Retail',
          creditLimit: existing.creditLimit || Number(data.creditLimit || 0),
          createdDate: existing.createdDate || data.createdDate || data.createdAt
        });
      }
    };

    customerAccounts.forEach((account) => {
      const key = getCustomerKey(account);
      upsertCustomer(key, {
        fullName: account.fullName || account.name,
        phone: account.phone,
        whatsapp: account.whatsapp,
        email: account.email,
        address: account.address,
        city: account.city,
        customerType: account.customerType,
        createdAt: account.createdAt,
        creditLimit: account.creditLimit
      });
    });

    const allSales = [...posSales, ...websiteSales].filter((sale) => sale.customerName);
    allSales.forEach((sale) => {
      const key = getCustomerKey({
        customerName: sale.customerName,
        email: sale.customerEmail,
        phone: sale.customerPhone
      });

      upsertCustomer(key, {
        fullName: sale.customerName,
        email: sale.customerEmail,
        phone: sale.customerPhone,
        address: sale.customerAddress,
        city: sale.customerCity
      });

      const customer = customersMap.get(key);
      const paidAmount = getPaidAmount(sale);

      customer.totalPurchases += Number(sale.netAmount || 0);
      customer.totalPaid += paidAmount;
      if (sale.date) {
        customer.lastPurchaseDate = customer.lastPurchaseDate
          ? (new Date(sale.date) > new Date(customer.lastPurchaseDate) ? sale.date : customer.lastPurchaseDate)
          : sale.date;
      }

      customer.purchaseHistory.push({
        date: sale.date || new Date().toISOString().split('T')[0],
        invoice: sale.invoiceNo || '',
        amount: Number(sale.netAmount || 0),
        paid: paidAmount
      });
    });

    const customersList = Array.from(customersMap.values()).map((customer, index) => {
      const balanceDue = Math.max(0, customer.openingBalance + customer.totalPurchases - customer.totalPaid);
      const status = customer.totalPurchases > 0 ? 'Active' : 'Inactive';

      return {
        ...customer,
        id: index + 1,
        balanceDue,
        status,
        purchaseHistory: customer.purchaseHistory
          .sort((a, b) => new Date(b.date) - new Date(a.date))
      };
    });

    customersList.sort((a, b) => b.totalPurchases - a.totalPurchases);

    setCustomers(customersList);
  };

  // Initialize customers data from current sales/orders
  useEffect(() => {
    loadCustomersFromOrders();
  }, []);

  useEffect(() => {
    const watchedKeys = [POS_SALES_KEY, WEBSITE_ORDERS_KEY, CUSTOMER_ACCOUNTS_KEY];

    const handleStorage = (event) => {
      if (event?.key && !watchedKeys.includes(event.key)) return;
      loadCustomersFromOrders();
    };

    const handleCustomUpdate = (event) => {
      const key = event?.detail?.key;
      if (key && !watchedKeys.includes(key)) return;
      loadCustomersFromOrders();
    };

    window.addEventListener('storage', handleStorage);
    window.addEventListener('app-storage-updated', handleCustomUpdate);

    return () => {
      window.removeEventListener('storage', handleStorage);
      window.removeEventListener('app-storage-updated', handleCustomUpdate);
    };
  }, []);

  // Filter customers
  const filteredCustomers = customers.filter(customer => {
    const matchesSearch = customer.fullName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         customer.phone.includes(searchTerm) ||
                         customer.email.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesType = filterType === '' || customer.customerType === filterType;
    const matchesStatus = filterStatus === '' || customer.status === filterStatus;
    
    return matchesSearch && matchesType && matchesStatus;
  });

  // Calculate summary statistics
  const summary = {
    totalCustomers: customers.filter(c => c.status === 'Active').length,
    totalBalanceDue: customers.reduce((sum, c) => sum + c.balanceDue, 0),
    totalCreditLimit: customers.reduce((sum, c) => sum + c.creditLimit, 0),
    totalPurchases: customers.reduce((sum, c) => sum + c.totalPurchases, 0)
  };

  // Handle form input change
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  // Handle payment input change
  const handlePaymentChange = (e) => {
    const { name, value } = e.target;
    setPaymentData(prev => ({ ...prev, [name]: value }));
  };

  // Reset form
  const resetForm = () => {
    setFormData({
      fullName: '',
      phone: '',
      whatsapp: '',
      email: '',
      address: '',
      city: '',
      cnic: '',
      customerType: 'Retail',
      creditLimit: '',
      openingBalance: '',
      notes: '',
      status: 'Active'
    });
  };

  // Add customer
  const handleAddCustomer = () => {
    if (!formData.fullName || !formData.phone) {
      toast.error('Please fill all required fields');
      return;
    }

    const nextId = customers.length
      ? Math.max(...customers.map((customer) => Number(customer.id) || 0)) + 1
      : 1;

    const newCustomer = {
      id: nextId,
      ...formData,
      creditLimit: parseInt(formData.creditLimit) || 0,
      openingBalance: parseInt(formData.openingBalance) || 0,
      totalPurchases: 0,
      totalPaid: 0,
      balanceDue: parseInt(formData.openingBalance) || 0,
      createdDate: new Date().toISOString().split('T')[0],
      purchaseHistory: []
    };

    setCustomers([...customers, newCustomer]);
    toast.success('Customer added successfully!');
    setIsAddModalOpen(false);
    resetForm();
  };

  // Edit customer
  const handleEditCustomer = () => {
    if (!formData.fullName || !formData.phone) {
      toast.error('Please fill all required fields');
      return;
    }

    const updatedCustomers = customers.map(c => 
      c.id === selectedCustomer.id 
        ? { 
            ...c, 
            ...formData,
            creditLimit: parseInt(formData.creditLimit) || 0,
            openingBalance: parseInt(formData.openingBalance) || 0
          }
        : c
    );

    setCustomers(updatedCustomers);
    toast.success('Customer updated successfully!');
    setIsEditModalOpen(false);
    setSelectedCustomer(null);
    resetForm();
  };

  // Open edit modal
  const openEditModal = (customer) => {
    setSelectedCustomer(customer);
    setFormData({
      fullName: customer.fullName,
      phone: customer.phone,
      whatsapp: customer.whatsapp,
      email: customer.email,
      address: customer.address,
      city: customer.city,
      cnic: customer.cnic,
      customerType: customer.customerType,
      creditLimit: customer.creditLimit.toString(),
      openingBalance: customer.openingBalance.toString(),
      notes: customer.notes,
      status: customer.status
    });
    setIsEditModalOpen(true);
  };

  // View customer detail
  const viewCustomerDetail = (customer) => {
    setSelectedCustomer(customer);
    setIsDetailModalOpen(true);
  };

  // Open payment modal
  const openPaymentModal = (customer) => {
    setSelectedCustomer(customer);
    setPaymentData({ amount: '', paymentMethod: 'Cash', notes: '' });
    setIsPaymentModalOpen(true);
  };

  // Process payment
  const handleProcessPayment = () => {
    if (!paymentData.amount || parseFloat(paymentData.amount) <= 0) {
      toast.error('Please enter a valid amount');
      return;
    }

    const amount = parseFloat(paymentData.amount);
    if (amount > selectedCustomer.balanceDue) {
      toast.error('Payment amount cannot exceed balance due');
      return;
    }

    const updatedCustomers = customers.map(c => 
      c.id === selectedCustomer.id 
        ? { ...c, balanceDue: c.balanceDue - amount }
        : c
    );

    setCustomers(updatedCustomers);
    toast.success(`Payment of Rs. ${amount.toLocaleString()} received successfully!`);
    setIsPaymentModalOpen(false);
    setSelectedCustomer(null);
    setPaymentData({ amount: '', paymentMethod: 'Cash', notes: '' });
  };

  // Export to Excel
  const handleExportExcel = () => {
    if (!filteredCustomers.length) {
      toast.error('No customer data to export');
      return;
    }

    const headers = [
      'Customer ID',
      'Full Name',
      'Phone',
      'Email',
      'Address',
      'City',
      'Customer Type',
      'Status',
      'Total Purchases',
      'Total Paid',
      'Balance Due',
      'Credit Limit'
    ];

    const rows = filteredCustomers.map((customer) => [
      `CUS-${String(customer.id).padStart(3, '0')}`,
      customer.fullName,
      customer.phone,
      customer.email || '',
      customer.address || '',
      customer.city || '',
      customer.customerType || '',
      customer.status || '',
      Number(customer.totalPurchases || 0),
      Number(customer.totalPaid || 0),
      Number(customer.balanceDue || 0),
      Number(customer.creditLimit || 0)
    ]);

    const csvContent = [headers, ...rows]
      .map((row) => row.map((cell) => `"${String(cell ?? '').replace(/"/g, '""')}"`).join(','))
      .join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `customers-${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    toast.success('Customer list exported successfully!');
  };

  // Generate customer statement PDF
  const handleGenerateStatement = (customer) => {
    toast.success(`Generating statement for ${customer.fullName}...`);
  };

  // Check permissions
  const canCreate = hasPermission(user?.role, 'customers', 'create');
  const canUpdate = hasPermission(user?.role, 'customers', 'update');
  const canView = hasPermission(user?.role, 'customers', 'read');

  // Get customer type badge
  const getTypeBadge = (type) => {
    switch (type) {
      case 'Retail':
        return <Badge variant="info">Retail</Badge>;
      case 'Wholesale':
        return <Badge variant="success">Wholesale</Badge>;
      case 'Contractor':
        return <Badge variant="warning">Contractor</Badge>;
      default:
        return <Badge variant="default">{type}</Badge>;
    }
  };

  // Get status badge
  const getStatusBadge = (status) => {
    return status === 'Active' 
      ? <Badge variant="success">Active</Badge>
      : <Badge variant="default">Inactive</Badge>;
  };

  // City options
  const cityOptions = [
    { value: 'Lahore', label: 'Lahore' },
    { value: 'Karachi', label: 'Karachi' },
    { value: 'Islamabad', label: 'Islamabad' },
    { value: 'Rawalpindi', label: 'Rawalpindi' },
    { value: 'Faisalabad', label: 'Faisalabad' },
    { value: 'Multan', label: 'Multan' }
  ];

  // Table columns
  const columns = [
    {
      key: 'id',
      label: 'ID',
      render: (row) => (
        <span className="font-mono font-semibold text-gray-900 dark:text-white">
          CUS-{String(row.id).padStart(3, '0')}
        </span>
      )
    },
    {
      key: 'fullName',
      label: 'Name',
      render: (row) => (
        <div>
          <p className="font-semibold text-gray-900 dark:text-white">{row.fullName}</p>
          <p className="text-xs text-gray-500 dark:text-gray-400">{getTypeBadge(row.customerType)}</p>
        </div>
      )
    },
    {
      key: 'phone',
      label: 'Phone',
      render: (row) => (
        <span className="text-sm text-gray-700 dark:text-gray-300">{row.phone}</span>
      )
    },
    {
      key: 'email',
      label: 'Email',
      render: (row) => (
        <span className="text-sm text-gray-600 dark:text-gray-400">
          {row.email || 'N/A'}
        </span>
      )
    },
    {
      key: 'address',
      label: 'Address',
      render: (row) => (
        <div>
          <p className="text-sm text-gray-700 dark:text-gray-300">{row.address}</p>
          <p className="text-xs text-gray-500 dark:text-gray-400">{row.city}</p>
        </div>
      )
    },
    {
      key: 'totalPurchases',
      label: 'Total Purchases',
      render: (row) => (
        <span className="font-semibold text-green-600">
          Rs. {row.totalPurchases.toLocaleString()}
        </span>
      )
    },
    {
      key: 'balanceDue',
      label: 'Balance Due',
      render: (row) => (
        <span className={`font-bold ${row.balanceDue > 0 ? 'text-red-600' : 'text-green-600'}`}>
          Rs. {row.balanceDue.toLocaleString()}
        </span>
      )
    },
    {
      key: 'creditLimit',
      label: 'Credit Limit',
      render: (row) => (
        <span className="text-sm text-gray-700 dark:text-gray-300">
          Rs. {row.creditLimit.toLocaleString()}
        </span>
      )
    },
    {
      key: 'status',
      label: 'Status',
      render: (row) => getStatusBadge(row.status)
    },
    {
      key: 'actions',
      label: 'Actions',
      render: (row) => (
        <div className="flex space-x-2">
          {canView && (
            <button
              onClick={() => viewCustomerDetail(row)}
              className="text-blue-600 hover:text-blue-800 dark:text-blue-400"
              title="View Details"
            >
              <FaEye size={16} />
            </button>
          )}
          {canUpdate && (
            <button
              onClick={() => openEditModal(row)}
              className="text-green-600 hover:text-green-800 dark:text-green-400"
              title="Edit"
            >
              <FaEdit size={16} />
            </button>
          )}
          {row.balanceDue > 0 && (
            <button
              onClick={() => openPaymentModal(row)}
              className="text-purple-600 hover:text-purple-800 dark:text-purple-400"
              title="Receive Payment"
            >
              <FaDollarSign size={16} />
            </button>
          )}
          <button
            onClick={() => handleGenerateStatement(row)}
            className="text-red-600 hover:text-red-800 dark:text-red-400"
            title="Generate Statement"
          >
            <FaFilePdf size={16} />
          </button>
        </div>
      )
    }
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Customers</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            Manage customer information and accounts
          </p>
        </div>
        <div className="flex space-x-3">
          {canCreate && (
            <Button 
              variant="primary" 
              icon={<FaPlus />}
              onClick={() => {
                resetForm();
                setIsAddModalOpen(true);
              }}
            >
              Add Customer
            </Button>
          )}
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Total Customers</p>
              <p className="text-3xl font-bold text-gray-900 dark:text-white">{summary.totalCustomers}</p>
            </div>
            <FaUsers className="text-3xl text-blue-600" />
          </div>
        </Card>
        <Card>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Total Balance Due</p>
              <p className="text-2xl font-bold text-red-600">
                Rs. {(summary.totalBalanceDue / 1000).toFixed(0)}K
              </p>
            </div>
            <FaMoneyBillWave className="text-3xl text-red-600" />
          </div>
        </Card>
        <Card>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Total Credit Limit</p>
              <p className="text-2xl font-bold text-orange-600">
                Rs. {(summary.totalCreditLimit / 1000).toFixed(0)}K
              </p>
            </div>
            <FaCreditCard className="text-3xl text-orange-600" />
          </div>
        </Card>
        <Card>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Total Sales</p>
              <p className="text-2xl font-bold text-green-600">
                Rs. {(summary.totalPurchases / 1000).toFixed(0)}K
              </p>
            </div>
            <FaDollarSign className="text-3xl text-green-600" />
          </div>
        </Card>
      </div>

      {/* Search and Filters */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center space-y-4 md:space-y-0">
        <SearchBar
          value={searchTerm}
          onChange={setSearchTerm}
          placeholder="Search by name, phone, or email..."
          className="w-full md:w-96"
        />
        
        <div className="flex flex-wrap gap-3">
          <Select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
            options={[
              { value: 'Retail', label: 'Retail' },
              { value: 'Wholesale', label: 'Wholesale' },
              { value: 'Contractor', label: 'Contractor' }
            ]}
            placeholder="All Types"
            className="w-40"
          />
          <Select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            options={[
              { value: 'Active', label: 'Active' },
              { value: 'Inactive', label: 'Inactive' }
            ]}
            placeholder="All Status"
            className="w-40"
          />
          <Button
            variant="success"
            icon={<FaFileExcel />}
            onClick={handleExportExcel}
          >
            Export Excel
          </Button>
        </div>
      </div>

      {/* Customers Table */}
      <Card title={`Customers (${filteredCustomers.length} records)`}>
        <Table
          columns={columns}
          data={filteredCustomers}
          emptyMessage="No customers found"
        />
      </Card>

      {/* Add/Edit Customer Modal */}
      <Modal
        isOpen={isAddModalOpen || isEditModalOpen}
        onClose={() => {
          isAddModalOpen ? setIsAddModalOpen(false) : setIsEditModalOpen(false);
          resetForm();
          setSelectedCustomer(null);
        }}
        title={isAddModalOpen ? 'Add New Customer' : 'Edit Customer'}
        size="xl"
        footer={
          <div className="flex justify-end space-x-3">
            <Button
              variant="outline"
              onClick={() => {
                isAddModalOpen ? setIsAddModalOpen(false) : setIsEditModalOpen(false);
                resetForm();
                setSelectedCustomer(null);
              }}
            >
              Cancel
            </Button>
            <Button
              variant="primary"
              onClick={isAddModalOpen ? handleAddCustomer : handleEditCustomer}
            >
              {isAddModalOpen ? 'Add Customer' : 'Save Changes'}
            </Button>
          </div>
        }
      >
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Input
            label="Full Name"
            name="fullName"
            value={formData.fullName}
            onChange={handleInputChange}
            placeholder="Enter full name"
            required
          />

          <Input
            label="Phone Number"
            name="phone"
            value={formData.phone}
            onChange={handleInputChange}
            placeholder="+92-XXX-XXXXXXX"
            required
          />

          <Input
            label="WhatsApp Number"
            name="whatsapp"
            value={formData.whatsapp}
            onChange={handleInputChange}
            placeholder="+92-XXX-XXXXXXX"
          />

          <Input
            label="Email"
            name="email"
            type="email"
            value={formData.email}
            onChange={handleInputChange}
            placeholder="email@example.com"
          />

          <Input
            label="Address"
            name="address"
            value={formData.address}
            onChange={handleInputChange}
            placeholder="Street address"
          />

          <Select
            label="City"
            name="city"
            value={formData.city}
            onChange={handleInputChange}
            options={cityOptions}
            placeholder="Select city"
          />

          <Input
            label="CNIC"
            name="cnic"
            value={formData.cnic}
            onChange={handleInputChange}
            placeholder="XXXXX-XXXXXXX-X"
          />

          <Select
            label="Customer Type"
            name="customerType"
            value={formData.customerType}
            onChange={handleInputChange}
            options={[
              { value: 'Retail', label: 'Retail' },
              { value: 'Wholesale', label: 'Wholesale' },
              { value: 'Contractor', label: 'Contractor' }
            ]}
            required
          />

          <Input
            label="Credit Limit (Rs.)"
            name="creditLimit"
            type="number"
            value={formData.creditLimit}
            onChange={handleInputChange}
            placeholder="0"
            min="0"
          />

          <Input
            label="Opening Balance (Rs.)"
            name="openingBalance"
            type="number"
            value={formData.openingBalance}
            onChange={handleInputChange}
            placeholder="0"
            min="0"
          />

          <Select
            label="Status"
            name="status"
            value={formData.status}
            onChange={handleInputChange}
            options={[
              { value: 'Active', label: 'Active' },
              { value: 'Inactive', label: 'Inactive' }
            ]}
          />

          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Notes
            </label>
            <textarea
              name="notes"
              value={formData.notes}
              onChange={handleInputChange}
              placeholder="Additional notes about customer..."
              rows="3"
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>
        </div>
      </Modal>

      {/* Customer Detail Modal */}
      <Modal
        isOpen={isDetailModalOpen}
        onClose={() => {
          setIsDetailModalOpen(false);
          setSelectedCustomer(null);
        }}
        title="Customer Details"
        size="xl"
      >
        {selectedCustomer && (
          <div className="space-y-6">
            {/* Customer Info */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-gray-50 dark:bg-gray-800 p-4 rounded-lg">
              <div>
                <p className="text-xs text-gray-500 dark:text-gray-400">Customer ID</p>
                <p className="font-semibold text-gray-900 dark:text-white">CUS-{String(selectedCustomer.id).padStart(3, '0')}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500 dark:text-gray-400">Name</p>
                <p className="font-semibold text-gray-900 dark:text-white">{selectedCustomer.fullName}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500 dark:text-gray-400">Phone</p>
                <p className="font-semibold text-gray-900 dark:text-white">{selectedCustomer.phone}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500 dark:text-gray-400">Email</p>
                <p className="font-semibold text-gray-900 dark:text-white">{selectedCustomer.email || 'N/A'}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500 dark:text-gray-400">Address</p>
                <p className="font-semibold text-gray-900 dark:text-white">{selectedCustomer.address}, {selectedCustomer.city}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500 dark:text-gray-400">CNIC</p>
                <p className="font-semibold text-gray-900 dark:text-white">{selectedCustomer.cnic}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500 dark:text-gray-400">Customer Type</p>
                <p className="font-semibold text-gray-900 dark:text-white">{getTypeBadge(selectedCustomer.customerType)}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500 dark:text-gray-400">Status</p>
                <p className="font-semibold text-gray-900 dark:text-white">{getStatusBadge(selectedCustomer.status)}</p>
              </div>
            </div>

            {/* Financial Summary */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="bg-green-50 dark:bg-green-900/20 p-4 rounded-lg">
                <p className="text-xs text-gray-600 dark:text-gray-400">Total Purchases</p>
                <p className="text-xl font-bold text-green-600">Rs. {selectedCustomer.totalPurchases.toLocaleString()}</p>
              </div>
              <div className="bg-red-50 dark:bg-red-900/20 p-4 rounded-lg">
                <p className="text-xs text-gray-600 dark:text-gray-400">Balance Due</p>
                <p className="text-xl font-bold text-red-600">Rs. {selectedCustomer.balanceDue.toLocaleString()}</p>
              </div>
              <div className="bg-orange-50 dark:bg-orange-900/20 p-4 rounded-lg">
                <p className="text-xs text-gray-600 dark:text-gray-400">Credit Limit</p>
                <p className="text-xl font-bold text-orange-600">Rs. {selectedCustomer.creditLimit.toLocaleString()}</p>
              </div>
              <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg">
                <p className="text-xs text-gray-600 dark:text-gray-400">Available Credit</p>
                <p className="text-xl font-bold text-blue-600">
                  Rs. {(selectedCustomer.creditLimit - selectedCustomer.balanceDue).toLocaleString()}
                </p>
              </div>
            </div>

            {/* Purchase History */}
            <div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">Purchase History</h3>
              <div className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
                <table className="w-full">
                  <thead className="bg-gray-50 dark:bg-gray-800">
                    <tr>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400">Date</th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400">Invoice</th>
                      <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 dark:text-gray-400">Amount</th>
                      <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 dark:text-gray-400">Paid</th>
                      <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 dark:text-gray-400">Balance</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                    {selectedCustomer.purchaseHistory.length > 0 ? (
                      selectedCustomer.purchaseHistory.map((purchase, index) => (
                        <tr key={index}>
                          <td className="px-4 py-2 text-sm text-gray-900 dark:text-white">
                            {new Date(purchase.date).toLocaleDateString()}
                          </td>
                          <td className="px-4 py-2 text-sm font-mono text-gray-900 dark:text-white">{purchase.invoice}</td>
                          <td className="px-4 py-2 text-sm text-right text-gray-900 dark:text-white">
                            Rs. {purchase.amount.toLocaleString()}
                          </td>
                          <td className="px-4 py-2 text-sm text-right text-green-600">
                            Rs. {purchase.paid.toLocaleString()}
                          </td>
                          <td className="px-4 py-2 text-sm text-right font-semibold text-red-600">
                            Rs. {(purchase.amount - purchase.paid).toLocaleString()}
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan="5" className="px-4 py-8 text-center text-gray-500 dark:text-gray-400">
                          No purchase history available
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </Modal>

      {/* Quick Payment Modal */}
      <Modal
        isOpen={isPaymentModalOpen}
        onClose={() => {
          setIsPaymentModalOpen(false);
          setSelectedCustomer(null);
          setPaymentData({ amount: '', paymentMethod: 'Cash', notes: '' });
        }}
        title="Receive Payment"
        size="md"
        footer={
          <div className="flex justify-end space-x-3">
            <Button
              variant="outline"
              onClick={() => {
                setIsPaymentModalOpen(false);
                setSelectedCustomer(null);
                setPaymentData({ amount: '', paymentMethod: 'Cash', notes: '' });
              }}
            >
              Cancel
            </Button>
            <Button
              variant="primary"
              onClick={handleProcessPayment}
            >
              Process Payment
            </Button>
          </div>
        }
      >
        {selectedCustomer && (
          <div className="space-y-4">
            <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg">
              <p className="text-sm text-gray-600 dark:text-gray-400">Customer</p>
              <p className="text-lg font-semibold text-gray-900 dark:text-white">{selectedCustomer.fullName}</p>
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">Current Balance Due</p>
              <p className="text-2xl font-bold text-red-600">Rs. {selectedCustomer.balanceDue.toLocaleString()}</p>
            </div>

            <Input
              label="Payment Amount (Rs.)"
              name="amount"
              type="number"
              value={paymentData.amount}
              onChange={handlePaymentChange}
              placeholder="Enter amount"
              required
              min="0"
              max={selectedCustomer.balanceDue}
            />

            <Select
              label="Payment Method"
              name="paymentMethod"
              value={paymentData.paymentMethod}
              onChange={handlePaymentChange}
              options={[
                { value: 'Cash', label: 'Cash' },
                { value: 'Bank Transfer', label: 'Bank Transfer' },
                { value: 'Cheque', label: 'Cheque' },
                { value: 'Online', label: 'Online Payment' }
              ]}
            />

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Notes
              </label>
              <textarea
                name="notes"
                value={paymentData.notes}
                onChange={handlePaymentChange}
                placeholder="Payment notes..."
                rows="3"
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>

            {paymentData.amount && (
              <div className="bg-green-50 dark:bg-green-900/20 p-4 rounded-lg">
                <p className="text-sm text-gray-600 dark:text-gray-400">Remaining Balance After Payment</p>
                <p className="text-2xl font-bold text-green-600">
                  Rs. {(selectedCustomer.balanceDue - parseFloat(paymentData.amount || 0)).toLocaleString()}
                </p>
              </div>
            )}
          </div>
        )}
      </Modal>
    </div>
  );
};

export default Customers;
