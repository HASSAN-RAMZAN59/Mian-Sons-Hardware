import React, { useState, useEffect } from 'react';
import { toast } from 'react-toastify';
import { 
  FaDollarSign,
  FaFileExcel,
  FaReceipt,
  FaMoneyBillWave,
  FaHandHoldingUsd,
  FaWallet
} from 'react-icons/fa';
import { useAuth } from '../../context/AuthContext';
import Card from '../../components/common/Card';
import Table from '../../components/common/Table';
import Button from '../../components/common/Button';
import Modal from '../../components/common/Modal';
import Input from '../../components/common/Input';
import Select from '../../components/common/Select';
import Badge from '../../components/common/Badge';
import TextArea from '../../components/common/TextArea';

const POS_SALES_KEY = 'admin_pos_sales';
const WEBSITE_ORDERS_KEY = 'website_orders';
const PURCHASES_KEY = 'admin_purchases';
const PAYMENTS_KEY = 'admin_payments';
const CUSTOMER_ACCOUNTS_KEY = 'website_customer_accounts';
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
      source: 'pos',
      invoiceNo: sale.invoiceNumber || `INV-POS-${String(sale.id).padStart(4, '0')}`,
      date: sale.date || toDatePart(sale.createdAt),
      time: sale.time || toTimePart(sale.createdAt),
      customerName: sale.customerName || 'Walk-in Customer',
      netAmount: Number(sale.grandTotal ?? sale.netAmount ?? 0),
      paymentMethod,
      paymentStatus: sale.paymentStatus || (String(paymentMethod).toLowerCase() === 'credit' ? 'Credit' : 'Paid'),
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
      source: 'website',
      invoiceNo: `WEB-${order.id || String(index + 1).padStart(4, '0')}`,
      date: toDatePart(createdAt),
      time: toTimePart(createdAt),
      customerName: order.customer?.fullName || order.customer?.name || 'Website Customer',
      netAmount: Number(order.totals?.grandTotal ?? order.amount ?? 0),
      paymentMethod,
      paymentStatus,
      items: mappedItems
    };
  });

const getTimestamp = (date, time) => {
  if (!date) return 0;
  return new Date(`${date} ${time || '00:00:00'}`).getTime();
};

const getPaidAmount = (sale) => {
  if (sale.paymentStatus === 'Paid') return sale.netAmount;
  const paidCandidate = Number(
    sale.paidAmount ?? sale.amountPaid ?? sale.cashReceived ?? 0
  );
  if (sale.paymentStatus === 'Partial') return Math.min(paidCandidate, sale.netAmount);
  return 0;
};

const Payments = () => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('all');
  const [payments, setPayments] = useState([]);
  const [startDate, setStartDate] = useState('2026-03-01');
  const [endDate, setEndDate] = useState('2026-03-11');
  const [filterType, setFilterType] = useState('');
  const [filterMethod, setFilterMethod] = useState('');
  const [customers, setCustomers] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [isReceiptOpen, setIsReceiptOpen] = useState(false);
  const [receiptData, setReceiptData] = useState(null);

  // Receive Payment Form
  const [receivePaymentForm, setReceivePaymentForm] = useState({
    customerId: '',
    amount: '',
    paymentMethod: 'Cash',
    reference: '',
    date: new Date().toISOString().split('T')[0],
    notes: ''
  });

  // Make Payment Form
  const [makePaymentForm, setMakePaymentForm] = useState({
    supplierId: '',
    amount: '',
    paymentMethod: 'Cash',
    reference: '',
    date: new Date().toISOString().split('T')[0],
    notes: ''
  });

  const loadPaymentsData = () => {
    const posSales = mapPosSales(readStoredData(POS_SALES_KEY));
    const websiteSales = mapWebsiteOrders(readStoredData(WEBSITE_ORDERS_KEY));
    const purchases = readStoredData(PURCHASES_KEY);
    const storedPayments = readStoredData(PAYMENTS_KEY);
    const storedSuppliers = readStoredData(SUPPLIERS_KEY);
    const customerAccounts = readStoredData(CUSTOMER_ACCOUNTS_KEY);

    const sales = [...posSales, ...websiteSales].filter((sale) => sale.date);

    const derivedCustomerPayments = sales
      .map((sale, index) => {
        const paidAmount = getPaidAmount(sale);
        if (!paidAmount) return null;

        return {
          id: `sale-${sale.id}-${index}`,
          paymentId: `RCV-${sale.invoiceNo || String(index + 1).padStart(4, '0')}`,
          date: sale.date,
          time: sale.time || '00:00:00',
          type: 'Received',
          partyType: 'Customer',
          partyName: sale.customerName,
          amount: paidAmount,
          method: sale.paymentMethod || 'Cash',
          reference: sale.invoiceNo || '',
          notes: `Auto from sale ${sale.invoiceNo || ''}`,
          receivedBy: sale.cashierName || 'System',
          source: 'sales'
        };
      })
      .filter(Boolean);

    const derivedSupplierPayments = (Array.isArray(purchases) ? purchases : [])
      .map((purchase, index) => {
        const amount = Number(purchase.paidAmount || 0);
        if (!amount) return null;

        return {
          id: `purchase-${purchase.id || index + 1}`,
          paymentId: `PAY-${purchase.poNo || purchase.purchaseNo || String(index + 1).padStart(4, '0')}`,
          date: purchase.date,
          time: '00:00:00',
          type: 'Paid',
          partyType: 'Supplier',
          partyName: purchase.supplierName || 'Supplier',
          amount,
          method: purchase.paymentMethod || 'Cash',
          reference: purchase.poNo || purchase.purchaseNo || '',
          notes: `Auto from purchase ${purchase.poNo || purchase.purchaseNo || ''}`,
          paidBy: purchase.createdBy || 'System',
          source: 'purchases'
        };
      })
      .filter(Boolean);

    const manualPayments = (Array.isArray(storedPayments) ? storedPayments : []).map((payment) => ({
      ...payment,
      source: 'manual'
    }));

    const combinedPayments = [...manualPayments, ...derivedCustomerPayments, ...derivedSupplierPayments];

    const salesByCustomer = new Map();
    sales.forEach((sale) => {
      if (!sale.customerName) return;
      const list = salesByCustomer.get(sale.customerName) || [];
      list.push({
        amount: Number(sale.netAmount || 0),
        timestamp: getTimestamp(sale.date, sale.time)
      });
      salesByCustomer.set(sale.customerName, list);
    });

    const purchasesBySupplier = new Map();
    (Array.isArray(purchases) ? purchases : []).forEach((purchase) => {
      const name = purchase.supplierName || 'Supplier';
      const list = purchasesBySupplier.get(name) || [];
      list.push({
        amount: Number(purchase.totalAmount || 0),
        timestamp: getTimestamp(purchase.date, '00:00:00')
      });
      purchasesBySupplier.set(name, list);
    });

    const paymentsByParty = new Map();
    combinedPayments.forEach((payment) => {
      const key = `${payment.partyType}:${payment.partyName}`;
      const list = paymentsByParty.get(key) || [];
      list.push(payment);
      paymentsByParty.set(key, list);
    });

    paymentsByParty.forEach((partyPayments, key) => {
      const [partyType, partyName] = key.split(':');
      const sortedPayments = [...partyPayments].sort((a, b) =>
        getTimestamp(a.date, a.time) - getTimestamp(b.date, b.time)
      );

      let runningPaid = 0;
      sortedPayments.forEach((payment) => {
        const timestamp = getTimestamp(payment.date, payment.time);

        if (partyType === 'Customer') {
          const purchases = salesByCustomer.get(partyName) || [];
          const totalPurchases = purchases
            .filter((sale) => sale.timestamp <= timestamp)
            .reduce((sum, sale) => sum + sale.amount, 0);

          const previousBalance = Math.max(0, totalPurchases - runningPaid);
          const currentBalance = Math.max(0, previousBalance - Number(payment.amount || 0));

          payment.previousBalance = previousBalance;
          payment.currentBalance = currentBalance;
        } else {
          const supplierPurchases = purchasesBySupplier.get(partyName) || [];
          const totalPurchases = supplierPurchases
            .filter((purchase) => purchase.timestamp <= timestamp)
            .reduce((sum, purchase) => sum + purchase.amount, 0);

          const previousBalance = Math.max(0, totalPurchases - runningPaid);
          const currentBalance = Math.max(0, previousBalance - Number(payment.amount || 0));

          payment.previousBalance = previousBalance;
          payment.currentBalance = currentBalance;
        }

        runningPaid += Number(payment.amount || 0);
      });
    });

    const enrichedPayments = combinedPayments
      .map((payment, index) => ({
        ...payment,
        id: payment.id || index + 1,
        previousBalance: Number(payment.previousBalance || 0),
        currentBalance: Number(payment.currentBalance || 0)
      }))
      .sort((a, b) => getTimestamp(b.date, b.time) - getTimestamp(a.date, a.time));

    setPayments(enrichedPayments);

    const customerBalances = new Map();
    sales.forEach((sale) => {
      if (!sale.customerName) return;
      const entry = customerBalances.get(sale.customerName) || { totalPurchases: 0, totalPaid: 0 };
      entry.totalPurchases += Number(sale.netAmount || 0);
      entry.totalPaid += Number(getPaidAmount(sale) || 0);
      customerBalances.set(sale.customerName, entry);
    });

    manualPayments
      .filter((payment) => payment.type === 'Received' && payment.partyType === 'Customer')
      .forEach((payment) => {
        const entry = customerBalances.get(payment.partyName) || { totalPurchases: 0, totalPaid: 0 };
        entry.totalPaid += Number(payment.amount || 0);
        customerBalances.set(payment.partyName, entry);
      });

    const accountByName = new Map();
    customerAccounts.forEach((account) => {
      const name = account.fullName || account.name || account.email || 'Customer';
      accountByName.set(name, account);
    });

    const customerOptions = Array.from(customerBalances.entries())
      .map(([name, totals], index) => {
        const balance = Math.max(0, totals.totalPurchases - totals.totalPaid);
        return {
          value: String(index + 1),
          label: name,
          balance
        };
      })
      .sort((a, b) => a.label.localeCompare(b.label));

    if (!customerOptions.length && accountByName.size) {
      accountByName.forEach((account, name) => {
        customerOptions.push({
          value: String(customerOptions.length + 1),
          label: name,
          balance: Number(account.openingBalance || 0)
        });
      });
    }

    setCustomers(customerOptions);

    const supplierBalances = new Map();
    (Array.isArray(purchases) ? purchases : []).forEach((purchase) => {
      const name = purchase.supplierName || 'Supplier';
      const entry = supplierBalances.get(name) || { totalPurchases: 0, totalPaid: 0 };
      entry.totalPurchases += Number(purchase.totalAmount || 0);
      entry.totalPaid += Number(purchase.paidAmount || 0);
      supplierBalances.set(name, entry);
    });

    manualPayments
      .filter((payment) => payment.type === 'Paid' && payment.partyType === 'Supplier')
      .forEach((payment) => {
        const entry = supplierBalances.get(payment.partyName) || { totalPurchases: 0, totalPaid: 0 };
        entry.totalPaid += Number(payment.amount || 0);
        supplierBalances.set(payment.partyName, entry);
      });

    const supplierOptions = Array.from(supplierBalances.entries())
      .map(([name, totals], index) => ({
        value: String(index + 1),
        label: name,
        payable: Math.max(0, totals.totalPurchases - totals.totalPaid)
      }))
      .sort((a, b) => a.label.localeCompare(b.label));

    if (!supplierOptions.length && Array.isArray(storedSuppliers)) {
      storedSuppliers.forEach((supplier, index) => {
        supplierOptions.push({
          value: String(index + 1),
          label: supplier.companyName || supplier.name || 'Supplier',
          payable: Number(supplier.balancePayable || 0)
        });
      });
    }

    setSuppliers(supplierOptions);
  };

  // Initialize payments data
  useEffect(() => {
    loadPaymentsData();
  }, []);

  useEffect(() => {
    const watchedKeys = [
      POS_SALES_KEY,
      WEBSITE_ORDERS_KEY,
      PURCHASES_KEY,
      PAYMENTS_KEY,
      CUSTOMER_ACCOUNTS_KEY,
      SUPPLIERS_KEY
    ];

    const handleStorage = (event) => {
      if (event?.key && !watchedKeys.includes(event.key)) return;
      loadPaymentsData();
    };

    const handleCustomUpdate = (event) => {
      const key = event?.detail?.key;
      if (key && !watchedKeys.includes(key)) return;
      loadPaymentsData();
    };

    window.addEventListener('storage', handleStorage);
    window.addEventListener('app-storage-updated', handleCustomUpdate);

    return () => {
      window.removeEventListener('storage', handleStorage);
      window.removeEventListener('app-storage-updated', handleCustomUpdate);
    };
  }, []);

  const paymentMethods = [
    { value: 'Cash', label: 'Cash' },
    { value: 'Bank Transfer', label: 'Bank Transfer' },
    { value: 'Cheque', label: 'Cheque' },
    { value: 'Card', label: 'Card' }
  ];

  // Filter payments
  const filteredPayments = payments.filter(payment => {
    const matchesDateRange = new Date(payment.date) >= new Date(startDate) && 
                             new Date(payment.date) <= new Date(endDate);
    const matchesType = filterType === '' || payment.type === filterType;
    const matchesMethod = filterMethod === '' || payment.method === filterMethod;
    
    return matchesDateRange && matchesType && matchesMethod;
  });

  // Calculate today's summary
  const today = new Date().toISOString().split('T')[0];
  const todayPayments = payments.filter(p => p.date === today);
  const totalReceivedToday = todayPayments
    .filter(p => p.type === 'Received')
    .reduce((sum, p) => sum + p.amount, 0);
  const totalPaidToday = todayPayments
    .filter(p => p.type === 'Paid')
    .reduce((sum, p) => sum + p.amount, 0);
  const cashInHand = todayPayments
    .filter(p => p.method === 'Cash')
    .reduce((sum, p) => p.type === 'Received' ? sum + p.amount : sum - p.amount, 0);

  // Get selected customer balance
  const getCustomerBalance = () => {
    const customer = customers.find(c => c.value === receivePaymentForm.customerId);
    return customer?.balance || 0;
  };

  // Get selected supplier payable
  const getSupplierPayable = () => {
    const supplier = suppliers.find(s => s.value === makePaymentForm.supplierId);
    return supplier?.payable || 0;
  };

  // Handle receive payment
  const handleReceivePayment = (e) => {
    e.preventDefault();

    if (!receivePaymentForm.customerId || !receivePaymentForm.amount) {
      toast.error('Please fill all required fields');
      return;
    }

    const customer = customers.find(c => c.value === receivePaymentForm.customerId);
    const amount = parseFloat(receivePaymentForm.amount);

    const existingPayments = readStoredData(PAYMENTS_KEY);
    const nextId = existingPayments.length
      ? Math.max(...existingPayments.map((payment) => Number(payment.id) || 0)) + 1
      : 1;

    const newPayment = {
      id: nextId,
      paymentId: `PAY-${new Date().getFullYear()}-${String(nextId).padStart(3, '0')}`,
      date: receivePaymentForm.date,
      time: new Date().toLocaleTimeString(),
      type: 'Received',
      partyType: 'Customer',
      partyName: customer?.label || '',
      amount,
      method: receivePaymentForm.paymentMethod,
      reference: receivePaymentForm.reference || `${receivePaymentForm.paymentMethod}-${Date.now()}`,
      previousBalance: customer?.balance || 0,
      currentBalance: Math.max(0, (customer?.balance || 0) - amount),
      notes: receivePaymentForm.notes,
      receivedBy: user?.name || 'Current User'
    };

    writeStoredData(PAYMENTS_KEY, [newPayment, ...existingPayments]);
    loadPaymentsData();
    setStartDate((prev) => (prev && new Date(prev) <= new Date(newPayment.date) ? prev : newPayment.date));
    setEndDate((prev) => (prev && new Date(prev) >= new Date(newPayment.date) ? prev : newPayment.date));
    resetReceiveForm();
    toast.success('Payment received successfully!');
    
    // Generate receipt
    setReceiptData(newPayment);
    setIsReceiptOpen(true);
  };

  // Handle make payment
  const handleMakePayment = (e) => {
    e.preventDefault();

    if (!makePaymentForm.supplierId || !makePaymentForm.amount) {
      toast.error('Please fill all required fields');
      return;
    }

    const supplier = suppliers.find(s => s.value === makePaymentForm.supplierId);
    const amount = parseFloat(makePaymentForm.amount);

    const existingPayments = readStoredData(PAYMENTS_KEY);
    const nextId = existingPayments.length
      ? Math.max(...existingPayments.map((payment) => Number(payment.id) || 0)) + 1
      : 1;

    const newPayment = {
      id: nextId,
      paymentId: `PAY-${new Date().getFullYear()}-${String(nextId).padStart(3, '0')}`,
      date: makePaymentForm.date,
      time: new Date().toLocaleTimeString(),
      type: 'Paid',
      partyType: 'Supplier',
      partyName: supplier?.label || '',
      amount,
      method: makePaymentForm.paymentMethod,
      reference: makePaymentForm.reference || `${makePaymentForm.paymentMethod}-${Date.now()}`,
      previousBalance: supplier?.payable || 0,
      currentBalance: Math.max(0, (supplier?.payable || 0) - amount),
      notes: makePaymentForm.notes,
      paidBy: user?.name || 'Current User'
    };

    writeStoredData(PAYMENTS_KEY, [newPayment, ...existingPayments]);
    loadPaymentsData();
    setStartDate((prev) => (prev && new Date(prev) <= new Date(newPayment.date) ? prev : newPayment.date));
    setEndDate((prev) => (prev && new Date(prev) >= new Date(newPayment.date) ? prev : newPayment.date));
    resetMakeForm();
    toast.success('Payment made successfully!');
  };

  // Reset forms
  const resetReceiveForm = () => {
    setReceivePaymentForm({
      customerId: '',
      amount: '',
      paymentMethod: 'Cash',
      reference: '',
      date: new Date().toISOString().split('T')[0],
      notes: ''
    });
  };

  const resetMakeForm = () => {
    setMakePaymentForm({
      supplierId: '',
      amount: '',
      paymentMethod: 'Cash',
      reference: '',
      date: new Date().toISOString().split('T')[0],
      notes: ''
    });
  };

  const handlePrintReceipt = () => {
    if (!receiptData) {
      toast.error('No receipt data available');
      return;
    }
    window.print();
  };

  // Export to Excel
  const handleExport = () => {
    if (!filteredPayments.length) {
      toast.error('No payment data to export');
      return;
    }

    const headers = [
      'Payment ID',
      'Date',
      'Time',
      'Type',
      'Party Type',
      'Party Name',
      'Amount',
      'Method',
      'Reference',
      'Previous Balance',
      'Current Balance',
      'Notes'
    ];

    const rows = filteredPayments.map((payment) => [
      payment.paymentId,
      payment.date,
      payment.time,
      payment.type,
      payment.partyType,
      payment.partyName,
      Number(payment.amount || 0),
      payment.method,
      payment.reference,
      Number(payment.previousBalance || 0),
      Number(payment.currentBalance || 0),
      payment.notes || ''
    ]);

    const csvContent = [headers, ...rows]
      .map((row) => row.map((cell) => `"${String(cell ?? '').replace(/"/g, '""')}"`).join(','))
      .join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `payments-${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    toast.success('Payments exported successfully!');
  };

  // Get type badge
  const getTypeBadge = (type) => {
    return type === 'Received' 
      ? <Badge variant="success">Received</Badge>
      : <Badge variant="danger">Paid</Badge>;
  };

  // All Payments Table columns
  const columns = [
    {
      key: 'paymentId',
      label: 'ID',
      render: (row) => (
        <span className="font-mono font-semibold text-primary">{row.paymentId}</span>
      )
    },
    {
      key: 'date',
      label: 'Date',
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
      key: 'type',
      label: 'Type',
      render: (row) => getTypeBadge(row.type)
    },
    {
      key: 'party',
      label: 'Party',
      render: (row) => (
        <div>
          <p className="text-sm font-medium text-gray-900 dark:text-white">{row.partyName}</p>
          <p className="text-xs text-gray-500 dark:text-gray-400">{row.partyType}</p>
        </div>
      )
    },
    {
      key: 'amount',
      label: 'Amount',
      render: (row) => (
        <span className={`text-sm font-bold ${row.type === 'Received' ? 'text-green-600' : 'text-red-600'}`}>
          {row.type === 'Received' ? '+' : '-'} Rs. {row.amount.toLocaleString()}
        </span>
      )
    },
    {
      key: 'method',
      label: 'Method',
      render: (row) => (
        <Badge variant="info">{row.method}</Badge>
      )
    },
    {
      key: 'reference',
      label: 'Reference #',
      render: (row) => (
        <span className="font-mono text-xs text-gray-700 dark:text-gray-300">{row.reference}</span>
      )
    },
    {
      key: 'balance',
      label: 'Balance',
      render: (row) => (
        <div>
          <p className="text-xs text-gray-500 dark:text-gray-400">
            Previous: Rs. {row.previousBalance.toLocaleString()}
          </p>
          <p className="text-sm font-semibold text-gray-900 dark:text-white">
            Current: Rs. {row.currentBalance.toLocaleString()}
          </p>
        </div>
      )
    },
    {
      key: 'notes',
      label: 'Notes',
      render: (row) => (
        <span className="text-xs text-gray-600 dark:text-gray-400 max-w-xs truncate block">
          {row.notes}
        </span>
      )
    }
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Payments Management</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            Track all payment transactions
          </p>
        </div>
        <Button
          variant="success"
          icon={<FaFileExcel />}
          onClick={handleExport}
        >
          Export Excel
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Received Today</p>
              <p className="text-2xl font-bold text-green-600">
                Rs. {(totalReceivedToday / 1000).toFixed(0)}K
              </p>
            </div>
            <FaHandHoldingUsd className="text-3xl text-green-600" />
          </div>
        </Card>
        <Card>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Paid Today</p>
              <p className="text-2xl font-bold text-red-600">
                Rs. {(totalPaidToday / 1000).toFixed(0)}K
              </p>
            </div>
            <FaMoneyBillWave className="text-3xl text-red-600" />
          </div>
        </Card>
        <Card>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Cash in Hand</p>
              <p className="text-2xl font-bold text-blue-600">
                Rs. {(cashInHand / 1000).toFixed(0)}K
              </p>
            </div>
            <FaWallet className="text-3xl text-blue-600" />
          </div>
        </Card>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200 dark:border-gray-700">
        <nav className="-mb-px flex space-x-8">
          <button
            onClick={() => setActiveTab('all')}
            className={`py-4 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'all'
                ? 'border-primary text-primary'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300'
            }`}
          >
            <div className="flex items-center">
              <FaDollarSign className="mr-2" />
              All Payments ({filteredPayments.length})
            </div>
          </button>
          <button
            onClick={() => setActiveTab('receive')}
            className={`py-4 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'receive'
                ? 'border-primary text-primary'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300'
            }`}
          >
            <div className="flex items-center">
              <FaHandHoldingUsd className="mr-2" />
              Receive Payment
            </div>
          </button>
          <button
            onClick={() => setActiveTab('make')}
            className={`py-4 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'make'
                ? 'border-primary text-primary'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300'
            }`}
          >
            <div className="flex items-center">
              <FaMoneyBillWave className="mr-2" />
              Make Payment
            </div>
          </button>
        </nav>
      </div>

      {/* Tab Content */}
      {activeTab === 'all' && (
        <>
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
                label="Type"
                value={filterType}
                onChange={(e) => setFilterType(e.target.value)}
                options={[
                  { value: 'Received', label: 'Received' },
                  { value: 'Paid', label: 'Paid' }
                ]}
                placeholder="All Types"
              />
              <Select
                label="Method"
                value={filterMethod}
                onChange={(e) => setFilterMethod(e.target.value)}
                options={paymentMethods}
                placeholder="All Methods"
              />
            </div>
          </Card>

          {/* Payments Table */}
          <Card title="All Payments">
            <Table
              columns={columns}
              data={filteredPayments}
              emptyMessage="No payments found"
            />
          </Card>
        </>
      )}

      {activeTab === 'receive' && (
        <Card title="Receive Payment from Customer">
          <form onSubmit={handleReceivePayment} className="space-y-6">
            <div className="grid grid-cols-2 gap-4">
              <Select
                label="Customer"
                value={receivePaymentForm.customerId}
                onChange={(e) => setReceivePaymentForm({ ...receivePaymentForm, customerId: e.target.value })}
                options={customers.map(c => ({ value: c.value, label: `${c.label} (Balance: Rs. ${c.balance.toLocaleString()})` }))}
                placeholder="Select Customer"
                required
              />
              <Input
                label="Payment Date"
                type="date"
                value={receivePaymentForm.date}
                onChange={(e) => setReceivePaymentForm({ ...receivePaymentForm, date: e.target.value })}
                required
              />
            </div>

            {receivePaymentForm.customerId && (
              <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg">
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    Outstanding Balance:
                  </span>
                  <span className="text-2xl font-bold text-red-600">
                    Rs. {getCustomerBalance().toLocaleString()}
                  </span>
                </div>
              </div>
            )}

            <div className="grid grid-cols-2 gap-4">
              <Input
                label="Amount to Receive"
                type="number"
                value={receivePaymentForm.amount}
                onChange={(e) => setReceivePaymentForm({ ...receivePaymentForm, amount: e.target.value })}
                placeholder="0.00"
                min="0"
                step="0.01"
                required
              />
              <Select
                label="Payment Method"
                value={receivePaymentForm.paymentMethod}
                onChange={(e) => setReceivePaymentForm({ ...receivePaymentForm, paymentMethod: e.target.value })}
                options={paymentMethods}
                required
              />
            </div>

            <Input
              label="Reference Number (Optional)"
              value={receivePaymentForm.reference}
              onChange={(e) => setReceivePaymentForm({ ...receivePaymentForm, reference: e.target.value })}
              placeholder="Cheque/Transaction number"
            />

            <TextArea
              label="Notes"
              value={receivePaymentForm.notes}
              onChange={(e) => setReceivePaymentForm({ ...receivePaymentForm, notes: e.target.value })}
              placeholder="Payment details, invoice numbers, etc."
              rows={3}
            />

            {receivePaymentForm.amount && receivePaymentForm.customerId && (
              <div className="bg-green-50 dark:bg-green-900/20 p-4 rounded-lg">
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600 dark:text-gray-400">Previous Balance:</span>
                    <span className="font-semibold text-gray-900 dark:text-white">
                      Rs. {getCustomerBalance().toLocaleString()}
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600 dark:text-gray-400">Amount Received:</span>
                    <span className="font-semibold text-green-600">
                      - Rs. {parseFloat(receivePaymentForm.amount || 0).toLocaleString()}
                    </span>
                  </div>
                  <div className="flex justify-between text-lg font-bold pt-2 border-t border-green-200 dark:border-green-700">
                    <span className="text-gray-900 dark:text-white">Remaining Balance:</span>
                    <span className="text-red-600">
                      Rs. {(getCustomerBalance() - parseFloat(receivePaymentForm.amount || 0)).toLocaleString()}
                    </span>
                  </div>
                </div>
              </div>
            )}

            <div className="flex justify-end space-x-3 pt-4 border-t border-gray-200 dark:border-gray-700">
              <Button
                type="button"
                variant="outline"
                onClick={resetReceiveForm}
              >
                Reset
              </Button>
              <Button
                type="submit"
                variant="success"
                icon={<FaReceipt />}
              >
                Receive Payment & Generate Receipt
              </Button>
            </div>
          </form>
        </Card>
      )}

      {activeTab === 'make' && (
        <Card title="Make Payment to Supplier">
          <form onSubmit={handleMakePayment} className="space-y-6">
            <div className="grid grid-cols-2 gap-4">
              <Select
                label="Supplier"
                value={makePaymentForm.supplierId}
                onChange={(e) => setMakePaymentForm({ ...makePaymentForm, supplierId: e.target.value })}
                options={suppliers.map(s => ({ value: s.value, label: `${s.label} (Payable: Rs. ${s.payable.toLocaleString()})` }))}
                placeholder="Select Supplier"
                required
              />
              <Input
                label="Payment Date"
                type="date"
                value={makePaymentForm.date}
                onChange={(e) => setMakePaymentForm({ ...makePaymentForm, date: e.target.value })}
                required
              />
            </div>

            {makePaymentForm.supplierId && (
              <div className="bg-orange-50 dark:bg-orange-900/20 p-4 rounded-lg">
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    Outstanding Payable:
                  </span>
                  <span className="text-2xl font-bold text-red-600">
                    Rs. {getSupplierPayable().toLocaleString()}
                  </span>
                </div>
              </div>
            )}

            <div className="grid grid-cols-2 gap-4">
              <Input
                label="Amount to Pay"
                type="number"
                value={makePaymentForm.amount}
                onChange={(e) => setMakePaymentForm({ ...makePaymentForm, amount: e.target.value })}
                placeholder="0.00"
                min="0"
                step="0.01"
                required
              />
              <Select
                label="Payment Method"
                value={makePaymentForm.paymentMethod}
                onChange={(e) => setMakePaymentForm({ ...makePaymentForm, paymentMethod: e.target.value })}
                options={paymentMethods}
                required
              />
            </div>

            <Input
              label="Reference Number (Optional)"
              value={makePaymentForm.reference}
              onChange={(e) => setMakePaymentForm({ ...makePaymentForm, reference: e.target.value })}
              placeholder="Cheque/Transaction number"
            />

            <TextArea
              label="Notes"
              value={makePaymentForm.notes}
              onChange={(e) => setMakePaymentForm({ ...makePaymentForm, notes: e.target.value })}
              placeholder="Payment details, purchase order numbers, etc."
              rows={3}
            />

            {makePaymentForm.amount && makePaymentForm.supplierId && (
              <div className="bg-red-50 dark:bg-red-900/20 p-4 rounded-lg">
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600 dark:text-gray-400">Previous Payable:</span>
                    <span className="font-semibold text-gray-900 dark:text-white">
                      Rs. {getSupplierPayable().toLocaleString()}
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600 dark:text-gray-400">Amount Paying:</span>
                    <span className="font-semibold text-green-600">
                      - Rs. {parseFloat(makePaymentForm.amount || 0).toLocaleString()}
                    </span>
                  </div>
                  <div className="flex justify-between text-lg font-bold pt-2 border-t border-red-200 dark:border-red-700">
                    <span className="text-gray-900 dark:text-white">Remaining Payable:</span>
                    <span className="text-red-600">
                      Rs. {(getSupplierPayable() - parseFloat(makePaymentForm.amount || 0)).toLocaleString()}
                    </span>
                  </div>
                </div>
              </div>
            )}

            <div className="flex justify-end space-x-3 pt-4 border-t border-gray-200 dark:border-gray-700">
              <Button
                type="button"
                variant="outline"
                onClick={resetMakeForm}
              >
                Reset
              </Button>
              <Button
                type="submit"
                variant="danger"
                icon={<FaMoneyBillWave />}
              >
                Make Payment
              </Button>
            </div>
          </form>
        </Card>
      )}

      <Modal
        isOpen={isReceiptOpen}
        onClose={() => {
          setIsReceiptOpen(false);
          setReceiptData(null);
        }}
        title="Payment Receipt"
        size="md"
        footer={
          <div className="flex justify-end space-x-3">
            <Button
              variant="outline"
              onClick={() => {
                setIsReceiptOpen(false);
                setReceiptData(null);
              }}
            >
              Close
            </Button>
            <Button
              variant="primary"
              onClick={handlePrintReceipt}
            >
              Print Receipt
            </Button>
          </div>
        }
      >
        {receiptData && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-500 dark:text-gray-400">Receipt ID</p>
                <p className="text-sm font-semibold text-gray-900 dark:text-white">{receiptData.paymentId}</p>
              </div>
              <div className="text-right">
                <p className="text-xs text-gray-500 dark:text-gray-400">Date</p>
                <p className="text-sm font-semibold text-gray-900 dark:text-white">
                  {new Date(receiptData.date).toLocaleDateString()} {receiptData.time}
                </p>
              </div>
            </div>

            <div className="border-t border-b border-gray-200 dark:border-gray-700 py-4 space-y-2">
              <div className="flex justify-between">
                <span className="text-sm text-gray-600 dark:text-gray-400">Customer</span>
                <span className="text-sm font-semibold text-gray-900 dark:text-white">{receiptData.partyName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-gray-600 dark:text-gray-400">Method</span>
                <span className="text-sm font-semibold text-gray-900 dark:text-white">{receiptData.method}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-gray-600 dark:text-gray-400">Reference</span>
                <span className="text-sm font-semibold text-gray-900 dark:text-white">{receiptData.reference || 'N/A'}</span>
              </div>
            </div>

            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600 dark:text-gray-400">Amount Received</span>
              <span className="text-lg font-bold text-green-600">Rs. {Number(receiptData.amount || 0).toLocaleString()}</span>
            </div>

            {receiptData.notes && (
              <div>
                <p className="text-xs text-gray-500 dark:text-gray-400">Notes</p>
                <p className="text-sm text-gray-700 dark:text-gray-300">{receiptData.notes}</p>
              </div>
            )}
          </div>
        )}
      </Modal>
    </div>
  );
};

export default Payments;
