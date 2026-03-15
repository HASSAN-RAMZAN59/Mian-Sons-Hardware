import React, { useState, useEffect } from 'react';
import { toast } from 'react-toastify';
import { 
  FaPlus, 
  FaEye, 
  FaPrint, 
  FaTrash,
  FaFileExcel,
  FaTimes
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
import TextArea from '../../components/common/TextArea';
import productsData from '../../data/productsData';
import { logAudit } from '../../utils/audit';

const PURCHASES_KEY = 'admin_purchases';
const SUPPLIERS_KEY = 'admin_suppliers';

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
};

const getProductName = (product) => `${product.name}${product.size ? ` ${product.size}` : ''}`.trim();

const Purchases = () => {
  const { user } = useAuth();
  const [purchases, setPurchases] = useState([]);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [filterSupplier, setFilterSupplier] = useState('');
  const [filterPaymentStatus, setFilterPaymentStatus] = useState('');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [selectedPurchase, setSelectedPurchase] = useState(null);

  // Form data
  const [formData, setFormData] = useState({
    supplierId: '',
    date: new Date().toISOString().split('T')[0],
    items: [],
    amountPaid: 0,
    paymentMethod: 'Cash',
    paymentStatus: 'Credit',
    notes: ''
  });

  const [currentItem, setCurrentItem] = useState({
    productId: '',
    productName: '',
    quantity: '',
    purchasePrice: '',
    total: 0
  });

  const defaultPurchases = [
      {
        id: 1,
        poNo: 'PO-2026-001',
        date: '2026-03-11',
        supplierId: 1,
        supplierName: 'Diamond Paints Industries',
        items: [
          { productName: 'Wall Paint 5L - White', quantity: 50, price: 3200, total: 160000 },
          { productName: 'Primer 5L', quantity: 30, price: 2500, total: 75000 }
        ],
        totalAmount: 235000,
        paidAmount: 235000,
        balance: 0,
        paymentMethod: 'Bank Transfer',
        paymentStatus: 'Paid',
        receivedStatus: 'Received',
        createdBy: 'Ali Hassan',
        notes: 'Bulk order for paint inventory'
      },
      {
        id: 2,
        poNo: 'PO-2026-002',
        date: '2026-03-10',
        supplierId: 2,
        supplierName: 'Universal Electricals',
        items: [
          { productName: 'Electric Wire 1.5mm', quantity: 100, price: 2600, total: 260000 },
          { productName: 'LED Bulbs 12W', quantity: 200, price: 320, total: 64000 },
          { productName: 'Switches 2-Way', quantity: 150, price: 85, total: 12750 }
        ],
        totalAmount: 336750,
        paidAmount: 150000,
        balance: 186750,
        paymentMethod: 'Bank Transfer',
        paymentStatus: 'Partial',
        receivedStatus: 'Received',
        createdBy: 'Sara Ahmed',
        notes: 'Electrical supplies for monthly stock'
      },
      {
        id: 3,
        poNo: 'PO-2026-003',
        date: '2026-03-09',
        supplierId: 3,
        supplierName: 'Al-Hadi Hardware Suppliers',
        items: [
          { productName: 'Steel Bars 10mm', quantity: 200, price: 600, total: 120000 },
          { productName: 'Cement Bag 50kg', quantity: 100, price: 1100, total: 110000 }
        ],
        totalAmount: 230000,
        paidAmount: 0,
        balance: 230000,
        paymentMethod: 'Credit',
        paymentStatus: 'Credit',
        receivedStatus: 'Pending',
        createdBy: 'Ali Hassan',
        notes: 'Construction materials - 30 days credit'
      },
      {
        id: 4,
        poNo: 'PO-2026-004',
        date: '2026-03-08',
        supplierId: 4,
        supplierName: 'Pak Plumbing Supplies',
        items: [
          { productName: 'PVC Pipes 1/2"', quantity: 500, price: 250, total: 125000 },
          { productName: 'PVC Pipes 3/4"', quantity: 300, price: 380, total: 114000 },
          { productName: 'Brass Taps', quantity: 80, price: 420, total: 33600 }
        ],
        totalAmount: 272600,
        paidAmount: 272600,
        balance: 0,
        paymentMethod: 'Cash',
        paymentStatus: 'Paid',
        receivedStatus: 'Received',
        createdBy: 'Sara Ahmed',
        notes: 'Plumbing inventory restocking'
      },
      {
        id: 5,
        poNo: 'PO-2026-005',
        date: '2026-03-07',
        supplierId: 5,
        supplierName: 'Cement & Steel Corporation',
        items: [
          { productName: 'Cement Bag 50kg', quantity: 200, price: 1100, total: 220000 },
          { productName: 'Steel Bars 12mm', quantity: 150, price: 750, total: 112500 }
        ],
        totalAmount: 332500,
        paidAmount: 100000,
        balance: 232500,
        paymentMethod: 'Bank Transfer',
        paymentStatus: 'Partial',
        receivedStatus: 'Partial',
        createdBy: 'Ali Hassan',
        notes: 'Large construction order - partial delivery'
      },
      {
        id: 6,
        poNo: 'PO-2026-006',
        date: '2026-03-06',
        supplierId: 1,
        supplierName: 'Diamond Paints Industries',
        items: [
          { productName: 'Wood Varnish 5L', quantity: 40, price: 800, total: 32000 },
          { productName: 'Paint Thinner 5L', quantity: 25, price: 450, total: 11250 }
        ],
        totalAmount: 43250,
        paidAmount: 43250,
        balance: 0,
        paymentMethod: 'Cash',
        paymentStatus: 'Paid',
        receivedStatus: 'Received',
        createdBy: 'Sara Ahmed',
        notes: 'Regular paint supplies'
      },
      {
        id: 7,
        poNo: 'PO-2026-007',
        date: '2026-03-05',
        supplierId: 2,
        supplierName: 'Universal Electricals',
        items: [
          { productName: 'Ceiling Fans 56"', quantity: 30, price: 3800, total: 114000 },
          { productName: 'Wall Sockets', quantity: 100, price: 120, total: 12000 }
        ],
        totalAmount: 126000,
        paidAmount: 0,
        balance: 126000,
        paymentMethod: 'Credit',
        paymentStatus: 'Credit',
        receivedStatus: 'Received',
        createdBy: 'Ali Hassan',
        notes: '15 days credit term'
      },
      {
        id: 8,
        poNo: 'PO-2026-008',
        date: '2026-03-04',
        supplierId: 6,
        supplierName: 'Master Paints Pakistan',
        items: [
          { productName: 'Exterior Paint 5L', quantity: 60, price: 3800, total: 228000 },
          { productName: 'Paint Rollers Professional', quantity: 50, price: 250, total: 12500 }
        ],
        totalAmount: 240500,
        paidAmount: 240500,
        balance: 0,
        paymentMethod: 'Bank Transfer',
        paymentStatus: 'Paid',
        receivedStatus: 'Received',
        createdBy: 'Sara Ahmed',
        notes: 'Premium paint stock'
      },
      {
        id: 9,
        poNo: 'PO-2026-009',
        date: '2026-03-03',
        supplierId: 3,
        supplierName: 'Al-Hadi Hardware Suppliers',
        items: [
          { productName: 'Power Tools - Drills', quantity: 15, price: 14000, total: 210000 },
          { productName: 'Hand Tools Set', quantity: 25, price: 1200, total: 30000 }
        ],
        totalAmount: 240000,
        paidAmount: 120000,
        balance: 120000,
        paymentMethod: 'Cash',
        paymentStatus: 'Partial',
        receivedStatus: 'Received',
        createdBy: 'Ali Hassan',
        notes: 'Tools inventory - 50% advance paid'
      },
      {
        id: 10,
        poNo: 'PO-2026-010',
        date: '2026-03-02',
        supplierId: 4,
        supplierName: 'Pak Plumbing Supplies',
        items: [
          { productName: 'Water Tanks 500L', quantity: 10, price: 12000, total: 120000 },
          { productName: 'Pipe Fittings Assorted', quantity: 200, price: 95, total: 19000 }
        ],
        totalAmount: 139000,
        paidAmount: 0,
        balance: 139000,
        paymentMethod: 'Credit',
        paymentStatus: 'Credit',
        receivedStatus: 'Pending',
        createdBy: 'Sara Ahmed',
        notes: 'Special order - awaiting delivery'
      }
    ];

  // Initialize purchases data
  useEffect(() => {
    const stored = readStoredData(PURCHASES_KEY, defaultPurchases);
    setPurchases(stored);
  }, []);

  useEffect(() => {
    writeStoredData(PURCHASES_KEY, purchases);
  }, [purchases]);

  const storedSuppliers = readStoredData(SUPPLIERS_KEY);
  const suppliers = [
    ...storedSuppliers.map((supplier) => ({
      value: String(supplier.id ?? supplier.supplierId ?? supplier.name),
      label: supplier.name || supplier.companyName || 'Supplier'
    })),
    ...purchases.map((purchase) => ({
      value: String(purchase.supplierId ?? purchase.supplierName),
      label: purchase.supplierName || 'Supplier'
    }))
  ].filter((value, index, self) => self.findIndex((item) => item.label === value.label) === index);

  const products = productsData.map((product) => ({
    value: String(product.id),
    label: getProductName(product),
    price: Number(product.purchasePrice || 0)
  }));

  const paymentMethods = [
    { value: 'Cash', label: 'Cash' },
    { value: 'Bank Transfer', label: 'Bank Transfer' },
    { value: 'Cheque', label: 'Cheque' },
    { value: 'Credit', label: 'Credit' }
  ];

  const paymentStatuses = [
    { value: 'Paid', label: 'Paid' },
    { value: 'Partial', label: 'Partial' },
    { value: 'Credit', label: 'Credit' }
  ];

  // Filter purchases
  const filteredPurchases = purchases.filter(purchase => {
    const matchesStartDate = !startDate || new Date(purchase.date) >= new Date(startDate);
    const matchesEndDate = !endDate || new Date(purchase.date) <= new Date(endDate);
    const matchesDateRange = matchesStartDate && matchesEndDate;
    const matchesSupplier = filterSupplier === '' || purchase.supplierId === parseInt(filterSupplier);
    const matchesPaymentStatus = filterPaymentStatus === '' || purchase.paymentStatus === filterPaymentStatus;
    
    return matchesDateRange && matchesSupplier && matchesPaymentStatus;
  });

  // Calculate total for current item
  useEffect(() => {
    const quantity = parseFloat(currentItem.quantity) || 0;
    const price = parseFloat(currentItem.purchasePrice) || 0;
    setCurrentItem(prev => ({ ...prev, total: quantity * price }));
  }, [currentItem.quantity, currentItem.purchasePrice]);

  // Calculate total amount
  const calculateTotalAmount = () => {
    return formData.items.reduce((sum, item) => sum + item.total, 0);
  };

  // Add item to purchase
  const handleAddItem = () => {
    if (!currentItem.productId || !currentItem.quantity || !currentItem.purchasePrice) {
      toast.error('Please fill all item fields');
      return;
    }

    const product = products.find(p => p.value === currentItem.productId);
    const newItem = {
      productId: currentItem.productId,
      productName: product?.label || currentItem.productName,
      quantity: parseFloat(currentItem.quantity),
      price: parseFloat(currentItem.purchasePrice),
      total: currentItem.total
    };

    setFormData(prev => ({
      ...prev,
      items: [...prev.items, newItem]
    }));

    // Reset current item
    setCurrentItem({
      productId: '',
      productName: '',
      quantity: '',
      purchasePrice: '',
      total: 0
    });

    toast.success('Item added to purchase order');
  };

  // Remove item from purchase
  const handleRemoveItem = (index) => {
    setFormData(prev => ({
      ...prev,
      items: prev.items.filter((_, i) => i !== index)
    }));
    toast.info('Item removed');
  };

  // Handle product selection
  const handleProductSelect = (productId) => {
    const product = products.find(p => p.value === productId);
    setCurrentItem(prev => ({
      ...prev,
      productId,
      productName: product?.label || '',
      purchasePrice: product?.price || ''
    }));
  };

  // Submit purchase
  const handleSubmit = (e) => {
    e.preventDefault();

    if (!canCreate) {
      toast.error('You do not have permission to create purchases');
      return;
    }

    if (!formData.supplierId) {
      toast.error('Please select a supplier');
      return;
    }

    if (formData.items.length === 0) {
      toast.error('Please add at least one item');
      return;
    }

    const totalAmount = calculateTotalAmount();
    const paidAmount = parseFloat(formData.amountPaid) || 0;

    const nextId = purchases.length
      ? Math.max(...purchases.map((purchase) => Number(purchase.id) || 0)) + 1
      : 1;

    const newPurchase = {
      id: nextId,
      poNo: `PO-${new Date().getFullYear()}-${String(nextId).padStart(3, '0')}`,
      date: formData.date,
      supplierId: parseInt(formData.supplierId),
      supplierName: suppliers.find(s => s.value === formData.supplierId)?.label || '',
      items: formData.items,
      totalAmount,
      paidAmount,
      balance: totalAmount - paidAmount,
      paymentMethod: formData.paymentMethod,
      paymentStatus: formData.paymentStatus,
      receivedStatus: 'Pending',
      createdBy: user?.name || 'Current User',
      notes: formData.notes
    };

    setPurchases([newPurchase, ...purchases]);
    logAudit({
      user,
      action: 'Created',
      module: 'Purchases',
      description: `Created purchase order ${newPurchase.poNo}`
    });
    setIsAddModalOpen(false);
    resetForm();
    toast.success(`Purchase order ${newPurchase.poNo} created successfully!`);
  };

  // Reset form
  const resetForm = () => {
    setFormData({
      supplierId: '',
      date: new Date().toISOString().split('T')[0],
      items: [],
      amountPaid: 0,
      paymentMethod: 'Cash',
      paymentStatus: 'Credit',
      notes: ''
    });
    setCurrentItem({
      productId: '',
      productName: '',
      quantity: '',
      purchasePrice: '',
      total: 0
    });
  };

  // View purchase details
  const viewPurchase = (purchase) => {
    setSelectedPurchase(purchase);
    setIsViewModalOpen(true);
  };

  // Print purchase order
  const printPurchase = (purchase) => {
    toast.info(`Printing purchase order ${purchase.poNo}...`);
    // In real app, this would open a print dialog with formatted PO
  };

  // Delete purchase
  const deletePurchase = (purchase) => {
    if (window.confirm(`Are you sure you want to delete ${purchase.poNo}?`)) {
      setPurchases(purchases.filter(p => p.id !== purchase.id));
      logAudit({
        user,
        action: 'Deleted',
        module: 'Purchases',
        description: `Deleted purchase order ${purchase.poNo}`
      });
      toast.success('Purchase order deleted');
    }
  };

  // Export to Excel
  const handleExport = () => {
    if (!canExport) {
      toast.error('You do not have permission to export purchases');
      return;
    }

    if (!filteredPurchases.length) {
      toast.error('No purchases to export');
      return;
    }

    const headers = ['PO Number', 'Date', 'Supplier', 'Items', 'Total', 'Paid', 'Balance', 'Payment Method', 'Payment Status', 'Received Status', 'Created By'];
    const rows = filteredPurchases.map((purchase) => [
      purchase.poNo,
      purchase.date,
      purchase.supplierName,
      purchase.items.length,
      purchase.totalAmount,
      purchase.paidAmount,
      purchase.balance,
      purchase.paymentMethod,
      purchase.paymentStatus,
      purchase.receivedStatus,
      purchase.createdBy
    ]);

    const csvContent = [headers, ...rows]
      .map((row) => row.map((cell) => `"${String(cell ?? '').replace(/"/g, '""')}"`).join(','))
      .join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `purchases-${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    toast.success('Purchases exported successfully!');
  };

  // Get payment status badge
  const getPaymentStatusBadge = (status) => {
    switch (status) {
      case 'Paid':
        return <Badge variant="success">Paid</Badge>;
      case 'Partial':
        return <Badge variant="warning">Partial</Badge>;
      case 'Credit':
        return <Badge variant="info">Credit</Badge>;
      default:
        return <Badge variant="default">{status}</Badge>;
    }
  };

  // Get received status badge
  const getReceivedStatusBadge = (status) => {
    switch (status) {
      case 'Received':
        return <Badge variant="success">Received</Badge>;
      case 'Partial':
        return <Badge variant="warning">Partial</Badge>;
      case 'Pending':
        return <Badge variant="info">Pending</Badge>;
      default:
        return <Badge variant="default">{status}</Badge>;
    }
  };

  // Permissions
  const canCreate = hasPermission(user?.role, 'purchases', 'create');
  const canDelete = hasPermission(user?.role, 'purchases', 'delete');
  const canExport = hasPermission(user?.role, 'purchases', 'export');

  // Table columns
  const columns = [
    {
      key: 'poNo',
      label: 'PO #',
      render: (row) => (
        <span className="font-mono font-semibold text-primary">{row.poNo}</span>
      )
    },
    {
      key: 'date',
      label: 'Date',
      render: (row) => (
        <span className="text-sm text-gray-900 dark:text-white">
          {new Date(row.date).toLocaleDateString()}
        </span>
      )
    },
    {
      key: 'supplierName',
      label: 'Supplier',
      render: (row) => (
        <span className="text-sm text-gray-900 dark:text-white">{row.supplierName}</span>
      )
    },
    {
      key: 'itemsCount',
      label: 'Items',
      render: (row) => (
        <Badge variant="info">{row.items.length}</Badge>
      )
    },
    {
      key: 'totalAmount',
      label: 'Total',
      render: (row) => (
        <span className="text-sm font-semibold text-gray-900 dark:text-white">
          Rs. {row.totalAmount.toLocaleString()}
        </span>
      )
    },
    {
      key: 'paidAmount',
      label: 'Paid',
      render: (row) => (
        <span className="text-sm font-semibold text-green-600">
          Rs. {row.paidAmount.toLocaleString()}
        </span>
      )
    },
    {
      key: 'balance',
      label: 'Balance',
      render: (row) => (
        <span className={`text-sm font-semibold ${row.balance > 0 ? 'text-red-600' : 'text-green-600'}`}>
          Rs. {row.balance.toLocaleString()}
        </span>
      )
    },
    {
      key: 'paymentStatus',
      label: 'Payment',
      render: (row) => getPaymentStatusBadge(row.paymentStatus)
    },
    {
      key: 'receivedStatus',
      label: 'Received',
      render: (row) => getReceivedStatusBadge(row.receivedStatus)
    },
    {
      key: 'actions',
      label: 'Actions',
      render: (row) => (
        <div className="flex space-x-2">
          <button
            onClick={() => viewPurchase(row)}
            className="text-blue-600 hover:text-blue-800 dark:text-blue-400"
            title="View Details"
          >
            <FaEye size={16} />
          </button>
          <button
            onClick={() => printPurchase(row)}
            className="text-green-600 hover:text-green-800 dark:text-green-400"
            title="Print PO"
          >
            <FaPrint size={16} />
          </button>
          {canDelete && (
            <button
              onClick={() => deletePurchase(row)}
              className="text-red-600 hover:text-red-800 dark:text-red-400"
              title="Delete"
            >
              <FaTrash size={16} />
            </button>
          )}
        </div>
      )
    }
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Purchase Orders</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            Manage supplier purchase orders and inventory
          </p>
        </div>
        <div className="flex space-x-3">
          {canCreate && (
            <Button
              variant="primary"
              icon={<FaPlus />}
              onClick={() => setIsAddModalOpen(true)}
            >
              New Purchase
            </Button>
          )}
          <Button
            variant="success"
            icon={<FaFileExcel />}
            onClick={handleExport}
            disabled={!canExport}
          >
            Export
          </Button>
        </div>
      </div>

      {/* Filters */}
      <Card>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Start Date
            </label>
            <Input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              End Date
            </label>
            <Input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
            />
          </div>
          <Select
            label="Supplier"
            value={filterSupplier}
            onChange={(e) => setFilterSupplier(e.target.value)}
            options={suppliers}
            placeholder="All Suppliers"
          />
          <Select
            label="Payment Status"
            value={filterPaymentStatus}
            onChange={(e) => setFilterPaymentStatus(e.target.value)}
            options={paymentStatuses}
            placeholder="All Status"
          />
        </div>
      </Card>

      {/* Purchases Table */}
      <Card title={`Purchase Orders (${filteredPurchases.length} total)`}>
        <Table
          columns={columns}
          data={filteredPurchases}
          emptyMessage="No purchase orders found"
        />
      </Card>

      {/* Add Purchase Modal */}
      <Modal
        isOpen={isAddModalOpen}
        onClose={() => {
          setIsAddModalOpen(false);
          resetForm();
        }}
        title="Create Purchase Order"
        size="xl"
      >
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Supplier and Date */}
          <div className="grid grid-cols-2 gap-4">
            <Select
              label="Supplier"
              value={formData.supplierId}
              onChange={(e) => setFormData({ ...formData, supplierId: e.target.value })}
              options={suppliers}
              placeholder="Select Supplier"
              required
            />
            <Input
              label="Purchase Date"
              type="date"
              value={formData.date}
              onChange={(e) => setFormData({ ...formData, date: e.target.value })}
              required
            />
          </div>

          {/* Items Section */}
          <div className="border-t border-gray-200 dark:border-gray-700 pt-4">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              Purchase Items
            </h3>
            
            {/* Add Item Form */}
            <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded-lg mb-4">
              <div className="grid grid-cols-12 gap-3">
                <div className="col-span-4">
                  <Select
                    label="Product"
                    value={currentItem.productId}
                    onChange={(e) => handleProductSelect(e.target.value)}
                    options={products}
                    placeholder="Select Product"
                  />
                </div>
                <div className="col-span-2">
                  <Input
                    label="Quantity"
                    type="number"
                    value={currentItem.quantity}
                    onChange={(e) => setCurrentItem({ ...currentItem, quantity: e.target.value })}
                    placeholder="Qty"
                    min="1"
                  />
                </div>
                <div className="col-span-3">
                  <Input
                    label="Purchase Price"
                    type="number"
                    value={currentItem.purchasePrice}
                    onChange={(e) => setCurrentItem({ ...currentItem, purchasePrice: e.target.value })}
                    placeholder="Price"
                    min="0"
                    step="0.01"
                  />
                </div>
                <div className="col-span-2">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Total
                  </label>
                  <div className="px-3 py-2 bg-gray-100 dark:bg-gray-700 rounded-md text-sm font-semibold text-gray-900 dark:text-white">
                    Rs. {currentItem.total.toLocaleString()}
                  </div>
                </div>
                <div className="col-span-1 flex items-end">
                  <Button
                    type="button"
                    variant="primary"
                    onClick={handleAddItem}
                    className="w-full"
                  >
                    <FaPlus />
                  </Button>
                </div>
              </div>
            </div>

            {/* Items List */}
            {formData.items.length > 0 && (
              <div className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
                <table className="w-full">
                  <thead className="bg-gray-50 dark:bg-gray-800">
                    <tr>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400">Product</th>
                      <th className="px-4 py-2 text-center text-xs font-medium text-gray-500 dark:text-gray-400">Qty</th>
                      <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 dark:text-gray-400">Price</th>
                      <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 dark:text-gray-400">Total</th>
                      <th className="px-4 py-2 text-center text-xs font-medium text-gray-500 dark:text-gray-400">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                    {formData.items.map((item, index) => (
                      <tr key={index}>
                        <td className="px-4 py-2 text-sm text-gray-900 dark:text-white">{item.productName}</td>
                        <td className="px-4 py-2 text-sm text-center text-gray-700 dark:text-gray-300">{item.quantity}</td>
                        <td className="px-4 py-2 text-sm text-right text-gray-700 dark:text-gray-300">
                          Rs. {item.price.toLocaleString()}
                        </td>
                        <td className="px-4 py-2 text-sm text-right font-semibold text-gray-900 dark:text-white">
                          Rs. {item.total.toLocaleString()}
                        </td>
                        <td className="px-4 py-2 text-center">
                          <button
                            type="button"
                            onClick={() => handleRemoveItem(index)}
                            className="text-red-600 hover:text-red-800"
                          >
                            <FaTimes />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Payment Section */}
          <div className="border-t border-gray-200 dark:border-gray-700 pt-4">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              Payment Details
            </h3>
            
            <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg mb-4">
              <div className="flex justify-between items-center">
                <span className="text-lg font-semibold text-gray-900 dark:text-white">Total Amount:</span>
                <span className="text-2xl font-bold text-primary">
                  Rs. {calculateTotalAmount().toLocaleString()}
                </span>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <Input
                label="Amount Paid"
                type="number"
                value={formData.amountPaid}
                onChange={(e) => setFormData({ ...formData, amountPaid: e.target.value })}
                placeholder="0.00"
                min="0"
                step="0.01"
              />
              <Select
                label="Payment Method"
                value={formData.paymentMethod}
                onChange={(e) => setFormData({ ...formData, paymentMethod: e.target.value })}
                options={paymentMethods}
              />
              <Select
                label="Payment Status"
                value={formData.paymentStatus}
                onChange={(e) => setFormData({ ...formData, paymentStatus: e.target.value })}
                options={paymentStatuses}
              />
            </div>

            <div className="mt-3 text-sm">
              <span className="text-gray-600 dark:text-gray-400">Balance Due: </span>
              <span className="font-bold text-red-600">
                Rs. {(calculateTotalAmount() - (parseFloat(formData.amountPaid) || 0)).toLocaleString()}
              </span>
            </div>
          </div>

          {/* Notes */}
          <TextArea
            label="Notes"
            value={formData.notes}
            onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
            placeholder="Additional notes or instructions..."
            rows={3}
          />

          {/* Form Actions */}
          <div className="flex justify-end space-x-3 pt-4 border-t border-gray-200 dark:border-gray-700">
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setIsAddModalOpen(false);
                resetForm();
              }}
            >
              Cancel
            </Button>
            <Button type="submit" variant="primary">
              Create Purchase Order
            </Button>
          </div>
        </form>
      </Modal>

      {/* View Purchase Modal */}
      <Modal
        isOpen={isViewModalOpen}
        onClose={() => {
          setIsViewModalOpen(false);
          setSelectedPurchase(null);
        }}
        title="Purchase Order Details"
        size="xl"
      >
        {selectedPurchase && (
          <div className="space-y-6">
            {/* PO Header */}
            <div className="grid grid-cols-2 gap-6">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">PO Number</p>
                <p className="text-lg font-semibold text-primary">{selectedPurchase.poNo}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Date</p>
                <p className="text-lg font-semibold text-gray-900 dark:text-white">
                  {new Date(selectedPurchase.date).toLocaleDateString()}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Supplier</p>
                <p className="text-lg font-semibold text-gray-900 dark:text-white">
                  {selectedPurchase.supplierName}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Created By</p>
                <p className="text-lg font-semibold text-gray-900 dark:text-white">
                  {selectedPurchase.createdBy}
                </p>
              </div>
            </div>

            {/* Items Table */}
            <div>
              <h4 className="font-semibold text-gray-900 dark:text-white mb-3">Items Ordered</h4>
              <div className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
                <table className="w-full">
                  <thead className="bg-gray-50 dark:bg-gray-800">
                    <tr>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400">Product</th>
                      <th className="px-4 py-2 text-center text-xs font-medium text-gray-500 dark:text-gray-400">Quantity</th>
                      <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 dark:text-gray-400">Unit Price</th>
                      <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 dark:text-gray-400">Total</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                    {selectedPurchase.items.map((item, index) => (
                      <tr key={index}>
                        <td className="px-4 py-2 text-sm text-gray-900 dark:text-white">{item.productName}</td>
                        <td className="px-4 py-2 text-sm text-center text-gray-700 dark:text-gray-300">{item.quantity}</td>
                        <td className="px-4 py-2 text-sm text-right text-gray-700 dark:text-gray-300">
                          Rs. {item.price.toLocaleString()}
                        </td>
                        <td className="px-4 py-2 text-sm text-right font-semibold text-gray-900 dark:text-white">
                          Rs. {item.total.toLocaleString()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Payment Summary */}
            <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded-lg">
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600 dark:text-gray-400">Total Amount:</span>
                  <span className="font-semibold text-gray-900 dark:text-white">
                    Rs. {selectedPurchase.totalAmount.toLocaleString()}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600 dark:text-gray-400">Amount Paid:</span>
                  <span className="font-semibold text-green-600">
                    Rs. {selectedPurchase.paidAmount.toLocaleString()}
                  </span>
                </div>
                <div className="flex justify-between text-sm pt-2 border-t border-gray-300 dark:border-gray-600">
                  <span className="font-semibold text-gray-900 dark:text-white">Balance Due:</span>
                  <span className={`font-bold ${selectedPurchase.balance > 0 ? 'text-red-600' : 'text-green-600'}`}>
                    Rs. {selectedPurchase.balance.toLocaleString()}
                  </span>
                </div>
              </div>
              <div className="mt-4 grid grid-cols-3 gap-4 pt-4 border-t border-gray-300 dark:border-gray-600">
                <div>
                  <p className="text-xs text-gray-600 dark:text-gray-400">Payment Method</p>
                  <p className="font-semibold text-gray-900 dark:text-white">{selectedPurchase.paymentMethod}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-600 dark:text-gray-400">Payment Status</p>
                  <div className="mt-1">{getPaymentStatusBadge(selectedPurchase.paymentStatus)}</div>
                </div>
                <div>
                  <p className="text-xs text-gray-600 dark:text-gray-400">Received Status</p>
                  <div className="mt-1">{getReceivedStatusBadge(selectedPurchase.receivedStatus)}</div>
                </div>
              </div>
            </div>

            {/* Notes */}
            {selectedPurchase.notes && (
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Notes</p>
                <p className="text-gray-900 dark:text-white bg-gray-50 dark:bg-gray-800 p-3 rounded-lg">
                  {selectedPurchase.notes}
                </p>
              </div>
            )}

            {/* Actions */}
            <div className="flex justify-end space-x-3 pt-4 border-t border-gray-200 dark:border-gray-700">
              <Button
                variant="outline"
                onClick={() => setIsViewModalOpen(false)}
              >
                Close
              </Button>
              <Button
                variant="primary"
                icon={<FaPrint />}
                onClick={() => printPurchase(selectedPurchase)}
              >
                Print PO
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};

export default Purchases;
