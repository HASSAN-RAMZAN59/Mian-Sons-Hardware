import React, { useState, useEffect } from 'react';
import { toast } from 'react-toastify';
import { 
  FaEye,
  FaPrint,
  FaEdit,
  FaTrash,
  FaFileExcel,
  FaFilePdf,
  FaDollarSign,
  FaShoppingCart,
  FaChartLine,
  FaPercentage
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
import Pagination from '../../components/common/Pagination';
import { logAudit } from '../../utils/audit';

const POS_SALES_KEY = 'admin_pos_sales';
const WEBSITE_ORDERS_KEY = 'website_orders';

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

const toDatePart = (value) => {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return date.toISOString().split('T')[0];
};

const toTimePart = (value) => {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleTimeString();
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

    return {
      id: `pos-${sale.id}`,
      rawId: sale.id,
      source: 'pos',
      invoiceNo: sale.invoiceNumber || `INV-POS-${String(sale.id).padStart(4, '0')}`,
      date: sale.date || toDatePart(sale.createdAt),
      time: sale.time || toTimePart(sale.createdAt),
      customerName: sale.customerName || 'Walk-in Customer',
      itemsCount: mappedItems.reduce((sum, item) => sum + Number(item.qty || 0), 0),
      subtotal: Number(sale.subtotal || 0),
      discount: Number(sale.discountAmount ?? sale.discount ?? 0),
      tax: Number(sale.tax || 0),
      netAmount: Number(sale.grandTotal ?? sale.netAmount ?? 0),
      paymentMethod,
      paymentStatus: sale.paymentStatus || (String(paymentMethod).toLowerCase() === 'credit' ? 'Credit' : 'Paid'),
      cashierName: sale.cashier || 'POS Cashier',
      branch: sale.branch || 'Main Branch',
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
      rawId: order.id,
      source: 'website',
      invoiceNo: `WEB-${order.id || String(index + 1).padStart(4, '0')}`,
      date: toDatePart(createdAt),
      time: toTimePart(createdAt),
      customerName: order.customer?.fullName || order.customer?.name || 'Website Customer',
      itemsCount: mappedItems.reduce((sum, item) => sum + Number(item.qty || 0), 0),
      subtotal: Number(order.totals?.subtotal ?? order.amount ?? 0),
      discount: Number(order.totals?.discount ?? 0),
      tax: Number(order.totals?.tax ?? 0),
      netAmount: Number(order.totals?.grandTotal ?? order.amount ?? 0),
      paymentMethod,
      paymentStatus,
      cashierName: 'Website',
      branch: 'Online Store',
      items: mappedItems
    };
  });

const Sales = () => {
  const { user } = useAuth();
  const [sales, setSales] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [filterCustomer, setFilterCustomer] = useState('');
  const [filterPaymentStatus, setFilterPaymentStatus] = useState('');
  const [filterBranch, setFilterBranch] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10);
  const [selectedInvoice, setSelectedInvoice] = useState(null);
  const [isInvoiceModalOpen, setIsInvoiceModalOpen] = useState(false);

  const loadSalesData = () => {
    const posSales = mapPosSales(readStoredData(POS_SALES_KEY));
    const websiteSales = mapWebsiteOrders(readStoredData(WEBSITE_ORDERS_KEY));

    const mergedSales = [...posSales, ...websiteSales]
      .filter((sale) => sale.date)
      .sort((a, b) => {
        const dateA = new Date(`${a.date} ${a.time || '00:00:00'}`).getTime();
        const dateB = new Date(`${b.date} ${b.time || '00:00:00'}`).getTime();
        return dateB - dateA;
      });

    setSales(mergedSales);
  };

  useEffect(() => {
    loadSalesData();
  }, []);

  // Filter sales
  const filteredSales = sales.filter(sale => {
    const query = searchTerm.toLowerCase();
    const matchesSearch =
      sale.invoiceNo.toLowerCase().includes(query) ||
      sale.customerName.toLowerCase().includes(query) ||
      sale.cashierName.toLowerCase().includes(query);

    const saleDate = new Date(sale.date);
    const matchesStartDate = !startDate || saleDate >= new Date(startDate);
    const matchesEndDate = !endDate || saleDate <= new Date(endDate);
    const matchesDateRange = matchesStartDate && matchesEndDate;
    const matchesCustomer = filterCustomer === '' || sale.customerName === filterCustomer;
    const matchesPaymentStatus = filterPaymentStatus === '' || sale.paymentStatus === filterPaymentStatus;
    const matchesBranch = filterBranch === '' || sale.branch === filterBranch;
    
    return matchesSearch && matchesDateRange && matchesCustomer && matchesPaymentStatus && matchesBranch;
  });

  // Calculate summary
  const summary = {
    totalSales: filteredSales.length,
    totalAmount: filteredSales.reduce((sum, s) => sum + s.subtotal, 0),
    totalDiscount: filteredSales.reduce((sum, s) => sum + s.discount, 0),
    netRevenue: filteredSales.reduce((sum, s) => sum + s.netAmount, 0)
  };

  // Pagination
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentSales = filteredSales.slice(indexOfFirstItem, indexOfLastItem);
  const totalPages = Math.ceil(filteredSales.length / itemsPerPage);

  // Get unique customers for filter
  const uniqueCustomers = [...new Set(sales.map(s => s.customerName))].sort();
  const branches = [...new Set(sales.map((s) => s.branch))].sort();

  // View invoice
  const viewInvoice = (sale) => {
    setSelectedInvoice(sale);
    setIsInvoiceModalOpen(true);
  };

  // Print invoice
  const printInvoice = (sale) => {
    toast.info(`Printing invoice ${sale.invoiceNo}...`);
    window.print();
  };

  // Edit sale
  const editSale = (sale) => {
    const saleDate = new Date(sale.date);
    const today = new Date();
    const isToday = saleDate.toDateString() === today.toDateString();

    if (!isToday) {
      toast.error('Can only edit today\'s sales!');
      return;
    }

    const nextStatus = window.prompt('Update payment status: Paid / Partial / Credit', sale.paymentStatus);
    if (!nextStatus) return;

    const normalizedStatus = nextStatus.trim();
    if (!['Paid', 'Partial', 'Credit'].includes(normalizedStatus)) {
      toast.error('Invalid status. Use Paid, Partial, or Credit.');
      return;
    }

    if (sale.source === 'pos') {
      const posSales = readStoredData(POS_SALES_KEY);
      const updated = posSales.map((row) =>
        Number(row.id) === Number(sale.rawId)
          ? { ...row, paymentStatus: normalizedStatus }
          : row
      );
      writeStoredData(POS_SALES_KEY, updated);
    } else if (sale.source === 'website') {
      const websiteOrders = readStoredData(WEBSITE_ORDERS_KEY);
      const updated = websiteOrders.map((row) =>
        String(row.id) === String(sale.rawId)
          ? { ...row, paymentStatus: normalizedStatus }
          : row
      );
      writeStoredData(WEBSITE_ORDERS_KEY, updated);
    }

    loadSalesData();
    logAudit({
      user,
      action: 'Updated',
      module: 'Sales',
      description: `Updated payment status for ${sale.invoiceNo} to ${normalizedStatus}`
    });
    toast.success(`Invoice ${sale.invoiceNo} payment status updated.`);
  };

  // Delete sale
  const deleteSale = (sale) => {
    if (window.confirm(`Are you sure you want to delete invoice ${sale.invoiceNo}?`)) {
      if (sale.source === 'pos') {
        const posSales = readStoredData(POS_SALES_KEY);
        writeStoredData(
          POS_SALES_KEY,
          posSales.filter((row) => Number(row.id) !== Number(sale.rawId))
        );
      } else if (sale.source === 'website') {
        const websiteOrders = readStoredData(WEBSITE_ORDERS_KEY);
        writeStoredData(
          WEBSITE_ORDERS_KEY,
          websiteOrders.filter((row) => String(row.id) !== String(sale.rawId))
        );
      }

      loadSalesData();
      logAudit({
        user,
        action: 'Deleted',
        module: 'Sales',
        description: `Deleted sale ${sale.invoiceNo}`
      });
      toast.success('Sale deleted successfully!');
    }
  };

  // Export functions
  const handleExportExcel = () => {
    if (!filteredSales.length) {
      toast.error('No sales data to export');
      return;
    }

    const headers = ['Invoice', 'Date', 'Time', 'Customer', 'Items', 'Subtotal', 'Discount', 'Tax', 'NetAmount', 'PaymentMethod', 'PaymentStatus', 'Cashier', 'Branch', 'Source'];
    const rows = filteredSales.map((sale) => [
      sale.invoiceNo,
      sale.date,
      sale.time,
      sale.customerName,
      sale.itemsCount,
      sale.subtotal,
      sale.discount,
      sale.tax,
      sale.netAmount,
      sale.paymentMethod,
      sale.paymentStatus,
      sale.cashierName,
      sale.branch,
      sale.source
    ]);
    const csvContent = [headers, ...rows]
      .map((row) => row.map((cell) => `"${String(cell ?? '').replace(/"/g, '""')}"`).join(','))
      .join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `sales-report-${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    toast.success('Sales report exported successfully!');
  };

  const handleExportPDF = () => {
    toast.success('PDF report generation initiated.');
    window.print();
  };

  // Check permissions
  const canView = hasPermission(user?.role, 'sales', 'view');
  const canEdit = hasPermission(user?.role, 'sales', 'edit');
  const canDelete = hasPermission(user?.role, 'sales', 'delete') && ['admin', 'superadmin'].includes(user?.role);
  const canExport = hasPermission(user?.role, 'sales', 'export');

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

  // Table columns
  const columns = [
    {
      key: 'invoiceNo',
      label: 'Invoice #',
      render: (row) => (
        <span className="font-mono font-semibold text-primary">{row.invoiceNo}</span>
      )
    },
    {
      key: 'dateTime',
      label: 'Date & Time',
      render: (row) => (
        <div>
          <p className="text-sm font-semibold text-gray-900 dark:text-white">
            {new Date(row.date).toLocaleDateString()}
          </p>
          <p className="text-xs text-gray-500 dark:text-gray-400">{row.time}</p>
        </div>
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
      key: 'itemsCount',
      label: 'Items',
      render: (row) => (
        <Badge variant="info">{row.itemsCount}</Badge>
      )
    },
    {
      key: 'subtotal',
      label: 'Subtotal',
      render: (row) => (
        <span className="text-sm font-semibold text-gray-900 dark:text-white">
          Rs. {row.subtotal.toLocaleString()}
        </span>
      )
    },
    {
      key: 'discount',
      label: 'Discount',
      render: (row) => (
        <span className="text-sm text-orange-600">
          Rs. {row.discount.toLocaleString()}
        </span>
      )
    },
    {
      key: 'tax',
      label: 'Tax',
      render: (row) => (
        <span className="text-sm text-gray-600 dark:text-gray-400">
          Rs. {row.tax.toLocaleString()}
        </span>
      )
    },
    {
      key: 'netAmount',
      label: 'Net Amount',
      render: (row) => (
        <span className="text-sm font-bold text-green-600">
          Rs. {row.netAmount.toLocaleString()}
        </span>
      )
    },
    {
      key: 'paymentMethod',
      label: 'Payment',
      render: (row) => (
        <div>
          <p className="text-xs text-gray-600 dark:text-gray-400">{row.paymentMethod}</p>
          <p className="text-xs">{getPaymentStatusBadge(row.paymentStatus)}</p>
        </div>
      )
    },
    {
      key: 'cashierName',
      label: 'Cashier',
      render: (row) => (
        <span className="text-xs text-gray-700 dark:text-gray-300">{row.cashierName}</span>
      )
    },
    {
      key: 'branch',
      label: 'Branch',
      render: (row) => (
        <span className="text-xs text-gray-600 dark:text-gray-400">{row.branch}</span>
      )
    },
    {
      key: 'actions',
      label: 'Actions',
      render: (row) => (
        <div className="flex space-x-2">
          {canView && (
            <button
              onClick={() => viewInvoice(row)}
              className="text-blue-600 hover:text-blue-800 dark:text-blue-400"
              title="View Invoice"
            >
              <FaEye size={16} />
            </button>
          )}
          <button
            onClick={() => printInvoice(row)}
            className="text-green-600 hover:text-green-800 dark:text-green-400"
            title="Print"
          >
            <FaPrint size={16} />
          </button>
          {canEdit && (
            <button
              onClick={() => editSale(row)}
              className="text-yellow-600 hover:text-yellow-800 dark:text-yellow-400"
              title="Edit (Today's sale only)"
            >
              <FaEdit size={16} />
            </button>
          )}
          {canDelete && (
            <button
              onClick={() => deleteSale(row)}
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
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Sales Management</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            View and manage all sales transactions
          </p>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Total Sales</p>
              <p className="text-3xl font-bold text-gray-900 dark:text-white">{summary.totalSales}</p>
            </div>
            <FaShoppingCart className="text-3xl text-blue-600" />
          </div>
        </Card>
        <Card>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Total Amount</p>
              <p className="text-2xl font-bold text-purple-600">
                Rs. {(summary.totalAmount / 1000).toFixed(0)}K
              </p>
            </div>
            <FaDollarSign className="text-3xl text-purple-600" />
          </div>
        </Card>
        <Card>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Total Discount</p>
              <p className="text-2xl font-bold text-orange-600">
                Rs. {(summary.totalDiscount / 1000).toFixed(0)}K
              </p>
            </div>
            <FaPercentage className="text-3xl text-orange-600" />
          </div>
        </Card>
        <Card>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Net Revenue</p>
              <p className="text-2xl font-bold text-green-600">
                Rs. {(summary.netRevenue / 1000).toFixed(0)}K
              </p>
            </div>
            <FaChartLine className="text-3xl text-green-600" />
          </div>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4">
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
            label="Customer"
            value={filterCustomer}
            onChange={(e) => setFilterCustomer(e.target.value)}
            options={uniqueCustomers.map(c => ({ value: c, label: c }))}
            placeholder="All Customers"
          />
          <Select
            label="Payment Status"
            value={filterPaymentStatus}
            onChange={(e) => setFilterPaymentStatus(e.target.value)}
            options={[
              { value: 'Paid', label: 'Paid' },
              { value: 'Partial', label: 'Partial' },
              { value: 'Credit', label: 'Credit' }
            ]}
            placeholder="All Status"
          />
          <Select
            label="Branch"
            value={filterBranch}
            onChange={(e) => setFilterBranch(e.target.value)}
            options={branches.map(b => ({ value: b, label: b }))}
            placeholder="All Branches"
          />
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Search Invoice
            </label>
            <SearchBar
              value={searchTerm}
              onChange={setSearchTerm}
              placeholder="INV-2026-001..."
            />
          </div>
        </div>
      </Card>

      {/* Export Buttons */}
      {canExport && (
        <div className="flex justify-end space-x-3">
          <Button
            variant="success"
            icon={<FaFileExcel />}
            onClick={handleExportExcel}
          >
            Export Excel
          </Button>
          <Button
            variant="danger"
            icon={<FaFilePdf />}
            onClick={handleExportPDF}
          >
            Export PDF
          </Button>
        </div>
      )}

      {/* Sales Table */}
      <Card title={`Sales Records (${filteredSales.length} total)`}>
        <Table
          columns={columns}
          data={currentSales}
          emptyMessage="No sales found"
        />
        
        {/* Pagination */}
        {totalPages > 1 && (
          <div className="mt-6">
            <Pagination
              currentPage={currentPage}
              totalPages={totalPages}
              onPageChange={setCurrentPage}
            />
          </div>
        )}
      </Card>

      {/* Invoice Detail Modal */}
      <Modal
        isOpen={isInvoiceModalOpen}
        onClose={() => {
          setIsInvoiceModalOpen(false);
          setSelectedInvoice(null);
        }}
        title="Invoice Details"
        size="xl"
      >
        {selectedInvoice && (
          <div className="space-y-6">
            {/* Invoice Header */}
            <div className="flex justify-between items-start pb-4 border-b border-gray-200 dark:border-gray-700">
              <div>
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Mian & Sons Hardware</h2>
                <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">Main Market, Lahore</p>
                <p className="text-sm text-gray-600 dark:text-gray-400">Phone: +92-42-12345678</p>
              </div>
              <div className="text-right">
                <h3 className="text-xl font-bold text-primary">{selectedInvoice.invoiceNo}</h3>
                <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                  {new Date(selectedInvoice.date).toLocaleDateString()} {selectedInvoice.time}
                </p>
                <p className="text-sm mt-2">{getPaymentStatusBadge(selectedInvoice.paymentStatus)}</p>
              </div>
            </div>

            {/* Customer & Sale Info */}
            <div className="grid grid-cols-2 gap-6">
              <div>
                <h4 className="font-semibold text-gray-900 dark:text-white mb-2">Customer Details</h4>
                <p className="text-sm text-gray-700 dark:text-gray-300">
                  <strong>Name:</strong> {selectedInvoice.customerName}
                </p>
              </div>
              <div>
                <h4 className="font-semibold text-gray-900 dark:text-white mb-2">Sale Information</h4>
                <p className="text-sm text-gray-700 dark:text-gray-300">
                  <strong>Cashier:</strong> {selectedInvoice.cashierName}
                </p>
                <p className="text-sm text-gray-700 dark:text-gray-300">
                  <strong>Branch:</strong> {selectedInvoice.branch}
                </p>
                <p className="text-sm text-gray-700 dark:text-gray-300">
                  <strong>Payment:</strong> {selectedInvoice.paymentMethod}
                </p>
              </div>
            </div>

            {/* Items Table */}
            <div>
              <h4 className="font-semibold text-gray-900 dark:text-white mb-3">Items</h4>
              <div className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
                <table className="w-full">
                  <thead className="bg-gray-50 dark:bg-gray-800">
                    <tr>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400">Item</th>
                      <th className="px-4 py-2 text-center text-xs font-medium text-gray-500 dark:text-gray-400">Qty</th>
                      <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 dark:text-gray-400">Price</th>
                      <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 dark:text-gray-400">Total</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                    {selectedInvoice.items.map((item, index) => (
                      <tr key={index}>
                        <td className="px-4 py-2 text-sm text-gray-900 dark:text-white">{item.name}</td>
                        <td className="px-4 py-2 text-sm text-center text-gray-700 dark:text-gray-300">{item.qty}</td>
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

            {/* Totals */}
            <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded-lg">
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600 dark:text-gray-400">Subtotal:</span>
                  <span className="font-semibold text-gray-900 dark:text-white">
                    Rs. {selectedInvoice.subtotal.toLocaleString()}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600 dark:text-gray-400">Discount:</span>
                  <span className="font-semibold text-orange-600">
                    - Rs. {selectedInvoice.discount.toLocaleString()}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600 dark:text-gray-400">Tax:</span>
                  <span className="font-semibold text-gray-900 dark:text-white">
                    Rs. {selectedInvoice.tax.toLocaleString()}
                  </span>
                </div>
                <div className="flex justify-between text-lg font-bold pt-2 border-t border-gray-300 dark:border-gray-600">
                  <span className="text-gray-900 dark:text-white">Grand Total:</span>
                  <span className="text-green-600">Rs. {selectedInvoice.netAmount.toLocaleString()}</span>
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex justify-end space-x-3 pt-4 border-t border-gray-200 dark:border-gray-700">
              <Button
                variant="outline"
                onClick={() => setIsInvoiceModalOpen(false)}
              >
                Close
              </Button>
              <Button
                variant="success"
                icon={<FaPrint />}
                onClick={() => printInvoice(selectedInvoice)}
              >
                Print Invoice
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};

export default Sales;
