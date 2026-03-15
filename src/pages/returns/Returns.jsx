import React, { useState, useEffect } from 'react';
import { toast } from 'react-toastify';
import { 
  FaUndo, 
  FaCheck, 
  FaTimes, 
  FaPlus,
  FaEye,
  FaFileExcel 
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

const CUSTOMER_RETURNS_KEY = 'admin_customer_returns';
const SUPPLIER_RETURNS_KEY = 'admin_supplier_returns';
const POS_SALES_KEY = 'admin_pos_sales';
const WEBSITE_ORDERS_KEY = 'website_orders';
const INVENTORY_STOCK_KEY = 'admin_inventory_stock';
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

const getProductCode = (id) => `PRD-${String(id).padStart(3, '0')}`;
const getProductName = (product) => `${product.name}${product.size ? ` ${product.size}` : ''}`.trim();

const buildDefaultStockData = () => {
  const today = new Date().toISOString().split('T')[0];
  return productsData.map((product) => {
    const currentStock = Number(product.currentStock ?? product.stockQty ?? product.stock ?? 0);
    const minStock = Number(product.minStock ?? Math.max(5, Math.floor(currentStock * 0.3)));
    const maxStock = Number(Math.max(minStock * 4, currentStock * 2, minStock + 10));

    return {
      id: product.id,
      productCode: getProductCode(product.id),
      productName: getProductName(product),
      category: product.category,
      currentStock,
      minStock,
      maxStock,
      unit: product.unit || 'Piece',
      purchasePrice: Number(product.purchasePrice || 0),
      salePrice: Number(product.salePrice || product.price || 0),
      lastUpdated: today,
      branch: 'Main Branch'
    };
  });
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
    return {
      id: sale.id,
      invoiceNo: sale.invoiceNumber || `INV-POS-${String(sale.id).padStart(4, '0')}`,
      date: sale.date,
      customerName: sale.customerName || 'Walk-in Customer',
      items: mappedItems
    };
  });

const mapWebsiteOrders = (rows = []) =>
  (Array.isArray(rows) ? rows : []).map((order, index) => {
    const mappedItems = normalizeItems(order.items);
    return {
      id: order.id || index + 1,
      invoiceNo: `WEB-${order.id || String(index + 1).padStart(4, '0')}`,
      date: String(order.createdAt || order.date || '').slice(0, 10),
      customerName: order.customer?.fullName || order.customer?.name || 'Website Customer',
      items: mappedItems
    };
  });

const Returns = () => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('customer');
  const [customerReturns, setCustomerReturns] = useState([]);
  const [supplierReturns, setSupplierReturns] = useState([]);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [selectedReturn, setSelectedReturn] = useState(null);
  const [inventoryStock, setInventoryStock] = useState([]);

  // Form states for Customer Returns
  const [customerFormData, setCustomerFormData] = useState({
    customerId: '',
    invoiceNo: '',
    productId: '',
    quantity: '',
    reason: '',
    refundMethod: 'Cash',
    refundAmount: ''
  });

  // Form states for Supplier Returns
  const [supplierFormData, setSupplierFormData] = useState({
    supplierId: '',
    purchaseNo: '',
    productId: '',
    quantity: '',
    reason: ''
  });

  useEffect(() => {
    const storedCustomerReturns = readStoredData(CUSTOMER_RETURNS_KEY);
    const storedSupplierReturns = readStoredData(SUPPLIER_RETURNS_KEY);
    const stockData = readStoredData(INVENTORY_STOCK_KEY, buildDefaultStockData());

    writeStoredData(INVENTORY_STOCK_KEY, stockData);
    setInventoryStock(stockData);
    setCustomerReturns(storedCustomerReturns);
    setSupplierReturns(storedSupplierReturns);
  }, []);

  useEffect(() => {
    writeStoredData(CUSTOMER_RETURNS_KEY, customerReturns);
  }, [customerReturns]);

  useEffect(() => {
    writeStoredData(SUPPLIER_RETURNS_KEY, supplierReturns);
  }, [supplierReturns]);

  const customerAccounts = readStoredData('website_customer_accounts');
  const salesInvoices = [
    ...mapPosSales(readStoredData(POS_SALES_KEY)),
    ...mapWebsiteOrders(readStoredData(WEBSITE_ORDERS_KEY))
  ];

  const customers = [
    ...customerAccounts.map((account) => ({
      value: String(account.id),
      label: `${account.name || account.fullName || account.email}`
    })),
    ...salesInvoices.map((sale) => ({
      value: String(sale.id),
      label: sale.customerName
    }))
  ].filter((value, index, self) => self.findIndex((item) => item.label === value.label) === index);

  const suppliersFromStorage = readStoredData(SUPPLIERS_KEY);
  const purchases = readStoredData(PURCHASES_KEY);
  const suppliers = [
    ...suppliersFromStorage.map((supplier) => ({
      value: String(supplier.id ?? supplier.supplierId ?? supplier.name),
      label: supplier.name || supplier.companyName || 'Supplier'
    })),
    ...purchases.map((purchase) => ({
      value: String(purchase.supplierId ?? purchase.supplierName),
      label: purchase.supplierName || 'Supplier'
    }))
  ].filter((value, index, self) => self.findIndex((item) => item.label === value.label) === index);

  const invoices = salesInvoices.map((sale) => ({
    value: sale.invoiceNo,
    label: `${sale.invoiceNo} - ${sale.customerName}`
  }));

  const purchaseOrders = purchases.map((purchase) => ({
    value: purchase.poNo || purchase.purchaseNo,
    label: `${purchase.poNo || purchase.purchaseNo} - ${purchase.supplierName || 'Supplier'}`
  }));

  const products = productsData.map((product) => ({
    value: String(product.id),
    label: `${getProductName(product)} - Rs. ${Number(product.salePrice || product.price || 0).toLocaleString()}`
  }));

  const refundMethods = [
    { value: 'Cash', label: 'Cash' },
    { value: 'Bank Transfer', label: 'Bank Transfer' },
    { value: 'Credit Note', label: 'Credit Note' },
    { value: 'Exchange', label: 'Exchange' }
  ];

  // Filter returns
  const getFilteredReturns = (returns) => {
    return returns.filter(ret => {
      const matchesStartDate = !startDate || new Date(ret.date) >= new Date(startDate);
      const matchesEndDate = !endDate || new Date(ret.date) <= new Date(endDate);
      const matchesDateRange = matchesStartDate && matchesEndDate;
      const matchesStatus = filterStatus === '' || ret.status === filterStatus;
      return matchesDateRange && matchesStatus;
    });
  };

  const filteredCustomerReturns = getFilteredReturns(customerReturns);
  const filteredSupplierReturns = getFilteredReturns(supplierReturns);

  // Get status badge
  const getStatusBadge = (status) => {
    switch (status) {
      case 'Pending':
        return <Badge variant="warning">Pending</Badge>;
      case 'Approved':
        return <Badge variant="info">Approved</Badge>;
      case 'Completed':
        return <Badge variant="success">Completed</Badge>;
      case 'Rejected':
        return <Badge variant="danger">Rejected</Badge>;
      default:
        return <Badge variant="default">{status}</Badge>;
    }
  };

  // Handle add customer return
  const handleAddCustomerReturn = (e) => {
    e.preventDefault();
    if (!canCreate) {
      toast.error('You do not have permission to add returns');
      return;
    }

    if (!customerFormData.customerId || !customerFormData.invoiceNo || !customerFormData.productId || !customerFormData.quantity) {
      toast.error('Please fill all required fields');
      return;
    }

    const quantity = parseInt(customerFormData.quantity, 10);
    if (Number.isNaN(quantity) || quantity <= 0) {
      toast.error('Please enter a valid quantity');
      return;
    }

    const selectedProduct = productsData.find((product) => String(product.id) === String(customerFormData.productId));
    const unitPrice = Number(selectedProduct?.salePrice || selectedProduct?.price || 0);
    const refundAmount = customerFormData.refundAmount
      ? parseFloat(customerFormData.refundAmount)
      : unitPrice * quantity;

    const newReturn = {
      id: customerReturns.length ? Math.max(...customerReturns.map((item) => Number(item.id) || 0)) + 1 : 1,
      returnId: `CR-${new Date().getFullYear()}-${String(customerReturns.length + 1).padStart(3, '0')}`,
      date: new Date().toISOString().split('T')[0],
      invoiceNo: customerFormData.invoiceNo,
      customerId: parseInt(customerFormData.customerId),
      customerName: customers.find(c => c.value === customerFormData.customerId)?.label || '',
      productName: selectedProduct ? getProductName(selectedProduct) : '',
      productCode: selectedProduct ? getProductCode(selectedProduct.id) : '',
      qtyReturned: quantity,
      reason: customerFormData.reason,
      refundAmount,
      refundMethod: customerFormData.refundMethod,
      status: 'Pending',
      requestedBy: user?.name || 'Current User',
      requestDate: new Date().toISOString().split('T')[0],
      stockAdjusted: false
    };

    setCustomerReturns([newReturn, ...customerReturns]);
    setIsAddModalOpen(false);
    resetCustomerForm();
    toast.success('Customer return added successfully!');
  };

  // Handle add supplier return
  const handleAddSupplierReturn = (e) => {
    e.preventDefault();
    if (!canCreate) {
      toast.error('You do not have permission to add returns');
      return;
    }

    if (!supplierFormData.supplierId || !supplierFormData.purchaseNo || !supplierFormData.productId || !supplierFormData.quantity) {
      toast.error('Please fill all required fields');
      return;
    }

    const quantity = parseInt(supplierFormData.quantity, 10);
    if (Number.isNaN(quantity) || quantity <= 0) {
      toast.error('Please enter a valid quantity');
      return;
    }

    const selectedProduct = productsData.find((product) => String(product.id) === String(supplierFormData.productId));

    const newReturn = {
      id: supplierReturns.length ? Math.max(...supplierReturns.map((item) => Number(item.id) || 0)) + 1 : 1,
      returnId: `SR-${new Date().getFullYear()}-${String(supplierReturns.length + 1).padStart(3, '0')}`,
      date: new Date().toISOString().split('T')[0],
      purchaseNo: supplierFormData.purchaseNo,
      supplierId: parseInt(supplierFormData.supplierId),
      supplierName: suppliers.find(s => s.value === supplierFormData.supplierId)?.label || '',
      productName: selectedProduct ? getProductName(selectedProduct) : '',
      productCode: selectedProduct ? getProductCode(selectedProduct.id) : '',
      qtyReturned: quantity,
      reason: supplierFormData.reason,
      status: 'Pending',
      requestedBy: user?.name || 'Current User',
      requestDate: new Date().toISOString().split('T')[0],
      stockAdjusted: false
    };

    setSupplierReturns([newReturn, ...supplierReturns]);
    setIsAddModalOpen(false);
    resetSupplierForm();
    toast.success('Supplier return added successfully!');
  };

  // Reset forms
  const resetCustomerForm = () => {
    setCustomerFormData({
      customerId: '',
      invoiceNo: '',
      productId: '',
      quantity: '',
      reason: '',
      refundMethod: 'Cash',
      refundAmount: ''
    });
  };

  const resetSupplierForm = () => {
    setSupplierFormData({
      supplierId: '',
      purchaseNo: '',
      productId: '',
      quantity: '',
      reason: ''
    });
  };

  // Approve return
  const handleApprove = (returnItem, type) => {
    if (!canApprove) {
      toast.error('You do not have permission to approve returns');
      return;
    }

    if (type === 'customer') {
      let updatedStock = inventoryStock;
      if (!returnItem.stockAdjusted) {
        updatedStock = inventoryStock.map((item) =>
          item.productCode === returnItem.productCode
            ? {
                ...item,
                currentStock: Number(item.currentStock || 0) + Number(returnItem.qtyReturned || 0),
                lastUpdated: new Date().toISOString().split('T')[0]
              }
            : item
        );
        setInventoryStock(updatedStock);
        writeStoredData(INVENTORY_STOCK_KEY, updatedStock);
      }

      setCustomerReturns(customerReturns.map(r => 
        r.id === returnItem.id 
          ? { 
              ...r, 
              status: 'Approved',
              approvedBy: user?.name || 'Current User',
              approvedDate: new Date().toISOString().split('T')[0],
              stockAdjusted: true
            }
          : r
      ));
    } else {
      let updatedStock = inventoryStock;
      if (!returnItem.stockAdjusted) {
        const stockItem = inventoryStock.find((item) => item.productCode === returnItem.productCode);
        if (stockItem && Number(stockItem.currentStock || 0) < Number(returnItem.qtyReturned || 0)) {
          toast.error('Insufficient stock to return to supplier');
          return;
        }

        updatedStock = inventoryStock.map((item) =>
          item.productCode === returnItem.productCode
            ? {
                ...item,
                currentStock: Math.max(0, Number(item.currentStock || 0) - Number(returnItem.qtyReturned || 0)),
                lastUpdated: new Date().toISOString().split('T')[0]
              }
            : item
        );
        setInventoryStock(updatedStock);
        writeStoredData(INVENTORY_STOCK_KEY, updatedStock);
      }

      setSupplierReturns(supplierReturns.map(r => 
        r.id === returnItem.id 
          ? { 
              ...r, 
              status: 'Approved',
              approvedBy: user?.name || 'Current User',
              approvedDate: new Date().toISOString().split('T')[0],
              stockAdjusted: true
            }
          : r
      ));
    }
    toast.success('Return approved successfully!');
  };

  // Reject return
  const handleReject = (returnItem, type) => {
    if (!canApprove) {
      toast.error('You do not have permission to reject returns');
      return;
    }

    const reason = window.prompt('Enter rejection reason:');
    if (!reason) return;

    if (type === 'customer') {
      setCustomerReturns(customerReturns.map(r => 
        r.id === returnItem.id 
          ? { 
              ...r, 
              status: 'Rejected',
              rejectedBy: user?.name || 'Current User',
              rejectedDate: new Date().toISOString().split('T')[0],
              rejectionReason: reason
            }
          : r
      ));
    } else {
      setSupplierReturns(supplierReturns.map(r => 
        r.id === returnItem.id 
          ? { 
              ...r, 
              status: 'Rejected',
              rejectedBy: user?.name || 'Current User',
              rejectedDate: new Date().toISOString().split('T')[0],
              rejectionReason: reason
            }
          : r
      ));
    }
    toast.success('Return rejected!');
  };

  // View details
  const viewDetails = (returnItem) => {
    setSelectedReturn(returnItem);
    setIsViewModalOpen(true);
  };

  // Export to Excel
  const handleExport = () => {
    const data = activeTab === 'customer' ? filteredCustomerReturns : filteredSupplierReturns;
    if (!data.length) {
      toast.error('No returns data to export');
      return;
    }

    const headers = activeTab === 'customer'
      ? ['Return ID', 'Date', 'Invoice', 'Customer', 'Product', 'Qty', 'Refund', 'Refund Method', 'Status', 'Reason']
      : ['Return ID', 'Date', 'Purchase', 'Supplier', 'Product', 'Qty', 'Status', 'Reason'];

    const rows = data.map((row) =>
      activeTab === 'customer'
        ? [
            row.returnId,
            row.date,
            row.invoiceNo,
            row.customerName,
            row.productName,
            row.qtyReturned,
            row.refundAmount,
            row.refundMethod,
            row.status,
            row.reason
          ]
        : [
            row.returnId,
            row.date,
            row.purchaseNo,
            row.supplierName,
            row.productName,
            row.qtyReturned,
            row.status,
            row.reason
          ]
    );

    const csvContent = [headers, ...rows]
      .map((row) => row.map((cell) => `"${String(cell ?? '').replace(/"/g, '""')}"`).join(','))
      .join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `returns-${activeTab}-${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    toast.success('Returns report exported successfully!');
  };

  // Permissions
  const canApprove = hasPermission(user?.role, 'returns', 'edit') && 
                    ['manager', 'admin', 'superadmin'].includes(user?.role);
  const canCreate = hasPermission(user?.role, 'returns', 'create');
  const canExport = hasPermission(user?.role, 'returns', 'export');

  // Customer returns columns
  const customerColumns = [
    {
      key: 'returnId',
      label: 'Return ID',
      render: (row) => (
        <span className="font-mono font-semibold text-primary">{row.returnId}</span>
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
      key: 'invoiceNo',
      label: 'Invoice #',
      render: (row) => (
        <span className="font-mono text-sm text-blue-600">{row.invoiceNo}</span>
      )
    },
    {
      key: 'customerName',
      label: 'Customer',
      render: (row) => (
        <span className="text-sm text-gray-900 dark:text-white">{row.customerName}</span>
      )
    },
    {
      key: 'product',
      label: 'Product',
      render: (row) => (
        <div>
          <p className="text-sm font-medium text-gray-900 dark:text-white">{row.productName}</p>
          <p className="text-xs text-gray-500 dark:text-gray-400">{row.productCode}</p>
        </div>
      )
    },
    {
      key: 'qtyReturned',
      label: 'Qty',
      render: (row) => (
        <Badge variant="info">{row.qtyReturned}</Badge>
      )
    },
    {
      key: 'reason',
      label: 'Reason',
      render: (row) => (
        <span className="text-xs text-gray-700 dark:text-gray-300 max-w-xs truncate block">
          {row.reason}
        </span>
      )
    },
    {
      key: 'refundAmount',
      label: 'Refund',
      render: (row) => (
        <div>
          <p className="text-sm font-semibold text-green-600">
            Rs. {row.refundAmount.toLocaleString()}
          </p>
          <p className="text-xs text-gray-500">{row.refundMethod}</p>
        </div>
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
          <button
            onClick={() => viewDetails(row)}
            className="text-blue-600 hover:text-blue-800 dark:text-blue-400"
            title="View Details"
          >
            <FaEye size={16} />
          </button>
          {canApprove && row.status === 'Pending' && (
            <>
              <button
                onClick={() => handleApprove(row, 'customer')}
                className="text-green-600 hover:text-green-800 dark:text-green-400"
                title="Approve"
              >
                <FaCheck size={16} />
              </button>
              <button
                onClick={() => handleReject(row, 'customer')}
                className="text-red-600 hover:text-red-800 dark:text-red-400"
                title="Reject"
              >
                <FaTimes size={16} />
              </button>
            </>
          )}
        </div>
      )
    }
  ];

  // Supplier returns columns
  const supplierColumns = [
    {
      key: 'returnId',
      label: 'Return ID',
      render: (row) => (
        <span className="font-mono font-semibold text-primary">{row.returnId}</span>
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
      key: 'purchaseNo',
      label: 'Purchase #',
      render: (row) => (
        <span className="font-mono text-sm text-purple-600">{row.purchaseNo}</span>
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
      key: 'product',
      label: 'Product',
      render: (row) => (
        <div>
          <p className="text-sm font-medium text-gray-900 dark:text-white">{row.productName}</p>
          <p className="text-xs text-gray-500 dark:text-gray-400">{row.productCode}</p>
        </div>
      )
    },
    {
      key: 'qtyReturned',
      label: 'Qty',
      render: (row) => (
        <Badge variant="info">{row.qtyReturned}</Badge>
      )
    },
    {
      key: 'reason',
      label: 'Reason',
      render: (row) => (
        <span className="text-xs text-gray-700 dark:text-gray-300 max-w-xs truncate block">
          {row.reason}
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
          <button
            onClick={() => viewDetails(row)}
            className="text-blue-600 hover:text-blue-800 dark:text-blue-400"
            title="View Details"
          >
            <FaEye size={16} />
          </button>
          {canApprove && row.status === 'Pending' && (
            <>
              <button
                onClick={() => handleApprove(row, 'supplier')}
                className="text-green-600 hover:text-green-800 dark:text-green-400"
                title="Approve"
              >
                <FaCheck size={16} />
              </button>
              <button
                onClick={() => handleReject(row, 'supplier')}
                className="text-red-600 hover:text-red-800 dark:text-red-400"
                title="Reject"
              >
                <FaTimes size={16} />
              </button>
            </>
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
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Returns Management</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            Manage customer and supplier returns
          </p>
        </div>
        <div className="flex space-x-3">
          <Button
            variant="primary"
            icon={<FaPlus />}
            onClick={() => setIsAddModalOpen(true)}
            disabled={!canCreate}
          >
            Add Return
          </Button>
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

      {/* Tabs */}
      <div className="border-b border-gray-200 dark:border-gray-700">
        <nav className="-mb-px flex space-x-8">
          <button
            onClick={() => setActiveTab('customer')}
            className={`py-4 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'customer'
                ? 'border-primary text-primary'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300'
            }`}
          >
            <div className="flex items-center">
              <FaUndo className="mr-2" />
              Customer Returns ({filteredCustomerReturns.length})
            </div>
          </button>
          <button
            onClick={() => setActiveTab('supplier')}
            className={`py-4 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'supplier'
                ? 'border-primary text-primary'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300'
            }`}
          >
            <div className="flex items-center">
              <FaUndo className="mr-2" />
              Supplier Returns ({filteredSupplierReturns.length})
            </div>
          </button>
        </nav>
      </div>

      {/* Filters */}
      <Card>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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
            label="Status"
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            options={[
              { value: 'Pending', label: 'Pending' },
              { value: 'Approved', label: 'Approved' },
              { value: 'Completed', label: 'Completed' },
              { value: 'Rejected', label: 'Rejected' }
            ]}
            placeholder="All Status"
          />
        </div>
      </Card>

      {/* Tables */}
      {activeTab === 'customer' ? (
        <Card title="Customer Returns">
          <Table
            columns={customerColumns}
            data={filteredCustomerReturns}
            emptyMessage="No customer returns found"
          />
        </Card>
      ) : (
        <Card title="Supplier Returns">
          <Table
            columns={supplierColumns}
            data={filteredSupplierReturns}
            emptyMessage="No supplier returns found"
          />
        </Card>
      )}

      {/* Add Return Modal */}
      <Modal
        isOpen={isAddModalOpen}
        onClose={() => {
          setIsAddModalOpen(false);
          resetCustomerForm();
          resetSupplierForm();
        }}
        title={activeTab === 'customer' ? 'Add Customer Return' : 'Add Supplier Return'}
        size="lg"
      >
        {activeTab === 'customer' ? (
          <form onSubmit={handleAddCustomerReturn} className="space-y-4">
            <Select
              label="Customer"
              value={customerFormData.customerId}
              onChange={(e) => setCustomerFormData({ ...customerFormData, customerId: e.target.value })}
              options={customers}
              placeholder="Select Customer"
              required
            />
            <Select
              label="Invoice #"
              value={customerFormData.invoiceNo}
              onChange={(e) => setCustomerFormData({ ...customerFormData, invoiceNo: e.target.value })}
              options={invoices}
              placeholder="Select Invoice"
              required
            />
            <Select
              label="Product"
              value={customerFormData.productId}
              onChange={(e) => setCustomerFormData({ ...customerFormData, productId: e.target.value })}
              options={products}
              placeholder="Select Product"
              required
            />
            <Input
              label="Quantity to Return"
              type="number"
              value={customerFormData.quantity}
              onChange={(e) => setCustomerFormData({ ...customerFormData, quantity: e.target.value })}
              placeholder="Enter quantity"
              min="1"
              required
            />
            <TextArea
              label="Reason for Return"
              value={customerFormData.reason}
              onChange={(e) => setCustomerFormData({ ...customerFormData, reason: e.target.value })}
              placeholder="Enter reason for return"
              rows={3}
              required
            />
            <Select
              label="Refund Method"
              value={customerFormData.refundMethod}
              onChange={(e) => setCustomerFormData({ ...customerFormData, refundMethod: e.target.value })}
              options={refundMethods}
              required
            />
            <Input
              label="Refund Amount (Rs.)"
              type="number"
              value={customerFormData.refundAmount}
              onChange={(e) => setCustomerFormData({ ...customerFormData, refundAmount: e.target.value })}
              placeholder="Enter refund amount"
              min="0"
              step="0.01"
              required
            />
            <div className="flex justify-end space-x-3 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setIsAddModalOpen(false);
                  resetCustomerForm();
                }}
              >
                Cancel
              </Button>
              <Button type="submit" variant="primary">
                Add Return
              </Button>
            </div>
          </form>
        ) : (
          <form onSubmit={handleAddSupplierReturn} className="space-y-4">
            <Select
              label="Supplier"
              value={supplierFormData.supplierId}
              onChange={(e) => setSupplierFormData({ ...supplierFormData, supplierId: e.target.value })}
              options={suppliers}
              placeholder="Select Supplier"
              required
            />
            <Select
              label="Purchase Order #"
              value={supplierFormData.purchaseNo}
              onChange={(e) => setSupplierFormData({ ...supplierFormData, purchaseNo: e.target.value })}
              options={purchaseOrders}
              placeholder="Select Purchase Order"
              required
            />
            <Select
              label="Product"
              value={supplierFormData.productId}
              onChange={(e) => setSupplierFormData({ ...supplierFormData, productId: e.target.value })}
              options={products}
              placeholder="Select Product"
              required
            />
            <Input
              label="Quantity to Return"
              type="number"
              value={supplierFormData.quantity}
              onChange={(e) => setSupplierFormData({ ...supplierFormData, quantity: e.target.value })}
              placeholder="Enter quantity"
              min="1"
              required
            />
            <TextArea
              label="Reason for Return"
              value={supplierFormData.reason}
              onChange={(e) => setSupplierFormData({ ...supplierFormData, reason: e.target.value })}
              placeholder="Enter reason for return"
              rows={3}
              required
            />
            <div className="flex justify-end space-x-3 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setIsAddModalOpen(false);
                  resetSupplierForm();
                }}
              >
                Cancel
              </Button>
              <Button type="submit" variant="primary">
                Add Return
              </Button>
            </div>
          </form>
        )}
      </Modal>

      {/* View Details Modal */}
      <Modal
        isOpen={isViewModalOpen}
        onClose={() => {
          setIsViewModalOpen(false);
          setSelectedReturn(null);
        }}
        title="Return Details"
        size="lg"
      >
        {selectedReturn && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Return ID</p>
                <p className="font-semibold text-gray-900 dark:text-white">{selectedReturn.returnId}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Date</p>
                <p className="font-semibold text-gray-900 dark:text-white">
                  {new Date(selectedReturn.date).toLocaleDateString()}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  {activeTab === 'customer' ? 'Invoice #' : 'Purchase #'}
                </p>
                <p className="font-semibold text-gray-900 dark:text-white">
                  {activeTab === 'customer' ? selectedReturn.invoiceNo : selectedReturn.purchaseNo}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  {activeTab === 'customer' ? 'Customer' : 'Supplier'}
                </p>
                <p className="font-semibold text-gray-900 dark:text-white">
                  {activeTab === 'customer' ? selectedReturn.customerName : selectedReturn.supplierName}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Product</p>
                <p className="font-semibold text-gray-900 dark:text-white">{selectedReturn.productName}</p>
                <p className="text-xs text-gray-500">{selectedReturn.productCode}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Quantity</p>
                <p className="font-semibold text-gray-900 dark:text-white">{selectedReturn.qtyReturned}</p>
              </div>
              {activeTab === 'customer' && (
                <>
                  <div>
                    <p className="text-sm text-gray-600 dark:text-gray-400">Refund Amount</p>
                    <p className="font-semibold text-green-600">Rs. {selectedReturn.refundAmount.toLocaleString()}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600 dark:text-gray-400">Refund Method</p>
                    <p className="font-semibold text-gray-900 dark:text-white">{selectedReturn.refundMethod}</p>
                  </div>
                </>
              )}
              <div className="col-span-2">
                <p className="text-sm text-gray-600 dark:text-gray-400">Reason</p>
                <p className="text-gray-900 dark:text-white">{selectedReturn.reason}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Status</p>
                <div className="mt-1">{getStatusBadge(selectedReturn.status)}</div>
              </div>
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Requested By</p>
                <p className="font-semibold text-gray-900 dark:text-white">{selectedReturn.requestedBy}</p>
                <p className="text-xs text-gray-500">{selectedReturn.requestDate}</p>
              </div>
              {selectedReturn.approvedBy && (
                <div className="col-span-2">
                  <p className="text-sm text-gray-600 dark:text-gray-400">Approved By</p>
                  <p className="font-semibold text-green-600">{selectedReturn.approvedBy}</p>
                  <p className="text-xs text-gray-500">{selectedReturn.approvedDate}</p>
                </div>
              )}
              {selectedReturn.rejectedBy && (
                <div className="col-span-2">
                  <p className="text-sm text-gray-600 dark:text-gray-400">Rejected By</p>
                  <p className="font-semibold text-red-600">{selectedReturn.rejectedBy}</p>
                  <p className="text-xs text-gray-500">{selectedReturn.rejectedDate}</p>
                  {selectedReturn.rejectionReason && (
                    <p className="mt-1 text-sm text-gray-700 dark:text-gray-300">
                      Reason: {selectedReturn.rejectionReason}
                    </p>
                  )}
                </div>
              )}
            </div>
            <div className="flex justify-end pt-4 border-t border-gray-200 dark:border-gray-700">
              <Button
                variant="outline"
                onClick={() => setIsViewModalOpen(false)}
              >
                Close
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};

export default Returns;
