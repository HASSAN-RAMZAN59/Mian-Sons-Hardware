import React, { useEffect, useState } from 'react';
import { FaPrint, FaEdit, FaSave, FaTimes, FaMoneyBillWave, FaArrowDown, FaArrowUp } from 'react-icons/fa';
import Card from '../../components/common/Card';
import Button from '../../components/common/Button';
import Input from '../../components/common/Input';
import { useAuth } from '../../context/AuthContext';
import { toast } from 'react-toastify';

const POS_SALES_KEY = 'admin_pos_sales';
const WEBSITE_ORDERS_KEY = 'website_orders';
const PURCHASES_KEY = 'admin_purchases';
const PAYMENTS_KEY = 'admin_payments';
const CASHBOOK_OPENING_BALANCE_KEY = 'admin_cashbook_opening_balance';

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

const getPaidAmount = (sale) => {
  if (sale.paymentStatus === 'Paid') return sale.netAmount;
  const paidCandidate = Number(
    sale.paidAmount ?? sale.amountPaid ?? sale.cashReceived ?? 0
  );
  if (sale.paymentStatus === 'Partial') return Math.min(paidCandidate, sale.netAmount);
  return 0;
};

const isCashMethod = (method) => {
  const normalized = String(method || '').toLowerCase();
  return normalized === 'cash' || normalized === 'cod';
};

const CashBook = () => {
  const { user } = useAuth();
  const [dateFrom, setDateFrom] = useState('2026-03-01');
  const [dateTo, setDateTo] = useState('2026-03-11');
  const [editingBalance, setEditingBalance] = useState(false);
  const [openingBalance, setOpeningBalance] = useState(150000);
  const [tempBalance, setTempBalance] = useState(150000);
  const [transactions, setTransactions] = useState([]);

  const loadCashBookData = () => {
    const storedOpening = Number(localStorage.getItem(CASHBOOK_OPENING_BALANCE_KEY));
    if (Number.isFinite(storedOpening)) {
      setOpeningBalance(storedOpening);
      setTempBalance(storedOpening);
    }

    const posSales = mapPosSales(readStoredData(POS_SALES_KEY));
    const websiteSales = mapWebsiteOrders(readStoredData(WEBSITE_ORDERS_KEY));
    const purchases = readStoredData(PURCHASES_KEY);
    const manualPayments = readStoredData(PAYMENTS_KEY);

    const cashEntries = [];

    [...posSales, ...websiteSales].forEach((sale) => {
      if (!sale.date || !isCashMethod(sale.paymentMethod)) return;
      const paidAmount = getPaidAmount(sale);
      if (!paidAmount) return;

      cashEntries.push({
        id: `sale-${sale.id}`,
        date: sale.date,
        time: sale.time || '00:00:00',
        description: `Cash Sale - Invoice #${sale.invoiceNo}`,
        voucher: sale.invoiceNo,
        debit: paidAmount,
        credit: 0
      });
    });

    (Array.isArray(purchases) ? purchases : []).forEach((purchase, index) => {
      if (!purchase?.date || !isCashMethod(purchase.paymentMethod)) return;
      const paidAmount = Number(purchase.paidAmount || 0);
      if (!paidAmount) return;

      cashEntries.push({
        id: `purchase-${purchase.id || index + 1}`,
        date: purchase.date,
        time: '00:00:00',
        description: `Cash Payment - ${purchase.supplierName || 'Supplier'}`,
        voucher: purchase.poNo || purchase.purchaseNo || '',
        debit: 0,
        credit: paidAmount
      });
    });

    (Array.isArray(manualPayments) ? manualPayments : []).forEach((payment) => {
      if (!payment?.date || !isCashMethod(payment.method)) return;

      cashEntries.push({
        id: `payment-${payment.id || payment.paymentId}`,
        date: payment.date,
        time: payment.time || '00:00:00',
        description: payment.type === 'Received'
          ? `Cash Received - ${payment.partyName || 'Customer'}`
          : `Cash Paid - ${payment.partyName || 'Supplier'}`,
        voucher: payment.paymentId || payment.reference || '',
        debit: payment.type === 'Received' ? Number(payment.amount || 0) : 0,
        credit: payment.type === 'Paid' ? Number(payment.amount || 0) : 0
      });
    });

    cashEntries.sort((a, b) => {
      const timeA = new Date(`${a.date} ${a.time || '00:00:00'}`).getTime();
      const timeB = new Date(`${b.date} ${b.time || '00:00:00'}`).getTime();
      return timeA - timeB;
    });

    setTransactions(cashEntries);
  };

  useEffect(() => {
    loadCashBookData();
  }, []);

  useEffect(() => {
    const watchedKeys = [POS_SALES_KEY, WEBSITE_ORDERS_KEY, PURCHASES_KEY, PAYMENTS_KEY, CASHBOOK_OPENING_BALANCE_KEY];

    const handleStorage = (event) => {
      if (event?.key && !watchedKeys.includes(event.key)) return;
      loadCashBookData();
    };

    const handleCustomUpdate = (event) => {
      const key = event?.detail?.key;
      if (key && !watchedKeys.includes(key)) return;
      loadCashBookData();
    };

    window.addEventListener('storage', handleStorage);
    window.addEventListener('app-storage-updated', handleCustomUpdate);

    return () => {
      window.removeEventListener('storage', handleStorage);
      window.removeEventListener('app-storage-updated', handleCustomUpdate);
    };
  }, []);

  // Filter transactions by date range
  const openingRow = {
    id: 'opening-balance',
    date: dateFrom,
    description: 'Opening Balance',
    voucher: '',
    debit: openingBalance,
    credit: 0,
    time: '00:00:00'
  };

  const filteredTransactions = [
    openingRow,
    ...transactions.filter((t) => t.date >= dateFrom && t.date <= dateTo)
  ];

  // Calculate running balance
  let runningBalance = 0;
  const transactionsWithBalance = filteredTransactions.map(t => {
    if (t.description === 'Opening Balance') {
      runningBalance = openingBalance;
    } else {
      runningBalance = runningBalance + t.debit - t.credit;
    }
    return { ...t, balance: runningBalance };
  });

  // Calculate totals
  const totalDebit = filteredTransactions.reduce((sum, t) => sum + t.debit, 0);
  const totalCredit = filteredTransactions.reduce((sum, t) => sum + t.credit, 0);
  const closingBalance = runningBalance;

  const handlePrint = () => {
    window.print();
    toast.success('Opening print dialog...');
  };

  const handleEditBalance = () => {
    if (user?.role !== 'admin' && user?.role !== 'superadmin') {
      toast.error('Only admins can edit opening balance');
      return;
    }
    setEditingBalance(true);
    setTempBalance(openingBalance);
  };

  const handleSaveBalance = () => {
    setOpeningBalance(tempBalance);
    localStorage.setItem(CASHBOOK_OPENING_BALANCE_KEY, String(tempBalance));
    window.dispatchEvent(new CustomEvent('app-storage-updated', { detail: { key: CASHBOOK_OPENING_BALANCE_KEY } }));
    setEditingBalance(false);
    toast.success('Opening balance updated successfully');
  };

  const handleCancelEdit = () => {
    setEditingBalance(false);
    setTempBalance(openingBalance);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center print:hidden">
        <h1 className="text-3xl font-bold text-gray-800 dark:text-white">Cash Book</h1>
        <Button onClick={handlePrint}>
          <FaPrint className="mr-2" /> Print Cash Book
        </Button>
      </div>

      {/* Print Header - Only visible when printing */}
      <div className="hidden print:block text-center mb-6">
        <h1 className="text-3xl font-bold text-gray-900">Mian & Sons Hardware Store</h1>
        <h2 className="text-xl font-semibold text-gray-700 mt-2">Cash Book</h2>
        <p className="text-gray-600 mt-1">
          Period: {new Date(dateFrom).toLocaleDateString()} to {new Date(dateTo).toLocaleDateString()}
        </p>
      </div>

      {/* Opening Balance Card */}
      <Card>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-green-100 dark:bg-green-900 rounded-full">
              <FaMoneyBillWave className="text-2xl text-green-600 dark:text-green-400" />
            </div>
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Opening Balance</p>
              {editingBalance ? (
                <div className="flex items-center gap-2 mt-1">
                  <Input
                    type="number"
                    value={tempBalance}
                    onChange={(e) => setTempBalance(Number(e.target.value))}
                    className="w-48"
                    min="0"
                    step="0.01"
                  />
                  <Button size="sm" onClick={handleSaveBalance}>
                    <FaSave />
                  </Button>
                  <Button size="sm" variant="secondary" onClick={handleCancelEdit}>
                    <FaTimes />
                  </Button>
                </div>
              ) : (
                <div className="flex items-center gap-3">
                  <p className="text-2xl font-bold text-gray-900 dark:text-white">
                    Rs. {openingBalance.toLocaleString()}
                  </p>
                  {(user?.role === 'admin' || user?.role === 'superadmin') && (
                    <button
                      onClick={handleEditBalance}
                      className="text-primary hover:text-primary-dark print:hidden"
                    >
                      <FaEdit />
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>
          <div className="text-right print:hidden">
            <p className="text-sm text-gray-600 dark:text-gray-400">Closing Balance</p>
            <p className="text-2xl font-bold text-primary">Rs. {closingBalance.toLocaleString()}</p>
          </div>
        </div>
      </Card>

      {/* Date Range Filter */}
      <Card className="print:hidden">
        <div className="flex items-center gap-4">
          <div className="flex-1">
            <Input
              label="From Date"
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
            />
          </div>
          <div className="flex-1">
            <Input
              label="To Date"
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
            />
          </div>
          <div className="flex-1 flex items-end">
            <Button
              variant="secondary"
              onClick={() => {
                setDateFrom('2026-03-01');
                setDateTo('2026-03-11');
              }}
              className="w-full"
            >
              Reset Dates
            </Button>
          </div>
        </div>
      </Card>

      {/* Cash Book Table */}
      <Card>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b-2 border-gray-200 dark:border-gray-700">
                <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700 dark:text-gray-300">Date</th>
                <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700 dark:text-gray-300">Description</th>
                <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700 dark:text-gray-300">Voucher #</th>
                <th className="text-right py-3 px-4 text-sm font-semibold text-gray-700 dark:text-gray-300">
                  <div className="flex items-center justify-end gap-1">
                    <FaArrowDown className="text-green-600" />
                    Debit (Cash In)
                  </div>
                </th>
                <th className="text-right py-3 px-4 text-sm font-semibold text-gray-700 dark:text-gray-300">
                  <div className="flex items-center justify-end gap-1">
                    <FaArrowUp className="text-red-600" />
                    Credit (Cash Out)
                  </div>
                </th>
                <th className="text-right py-3 px-4 text-sm font-semibold text-gray-700 dark:text-gray-300">Balance</th>
              </tr>
            </thead>
            <tbody>
              {transactionsWithBalance.map((transaction, index) => (
                <tr
                  key={transaction.id}
                  className={`border-b border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800 ${
                    transaction.description === 'Opening Balance' ? 'bg-blue-50 dark:bg-blue-900/20 font-semibold' : ''
                  }`}
                >
                  <td className="py-3 px-4 text-sm text-gray-900 dark:text-gray-100">
                    {transaction.date}
                  </td>
                  <td className="py-3 px-4 text-sm text-gray-900 dark:text-gray-100">
                    {transaction.description}
                  </td>
                  <td className="py-3 px-4 text-sm text-gray-600 dark:text-gray-400">
                    {transaction.voucher || '-'}
                  </td>
                  <td className="py-3 px-4 text-sm text-right">
                    {transaction.debit > 0 ? (
                      <span className="text-green-600 dark:text-green-400 font-medium">
                        Rs. {transaction.debit.toLocaleString()}
                      </span>
                    ) : (
                      <span className="text-gray-400">-</span>
                    )}
                  </td>
                  <td className="py-3 px-4 text-sm text-right">
                    {transaction.credit > 0 ? (
                      <span className="text-red-600 dark:text-red-400 font-medium">
                        Rs. {transaction.credit.toLocaleString()}
                      </span>
                    ) : (
                      <span className="text-gray-400">-</span>
                    )}
                  </td>
                  <td className="py-3 px-4 text-sm text-right font-semibold text-gray-900 dark:text-white">
                    Rs. {transaction.balance.toLocaleString()}
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="bg-gray-100 dark:bg-gray-800 font-bold border-t-2 border-gray-300 dark:border-gray-600">
                <td colSpan="3" className="py-4 px-4 text-sm text-gray-900 dark:text-white">
                  TOTALS
                </td>
                <td className="py-4 px-4 text-sm text-right text-green-600 dark:text-green-400">
                  Rs. {totalDebit.toLocaleString()}
                </td>
                <td className="py-4 px-4 text-sm text-right text-red-600 dark:text-red-400">
                  Rs. {totalCredit.toLocaleString()}
                </td>
                <td className="py-4 px-4 text-sm text-right text-gray-900 dark:text-white">
                  -
                </td>
              </tr>
              <tr className="bg-primary text-white font-bold">
                <td colSpan="5" className="py-4 px-4 text-sm">
                  CLOSING BALANCE
                </td>
                <td className="py-4 px-4 text-sm text-right">
                  Rs. {closingBalance.toLocaleString()}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      </Card>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 print:hidden">
        <Card>
          <div className="text-center">
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">Total Cash Received</p>
            <p className="text-2xl font-bold text-green-600 dark:text-green-400">
              Rs. {totalDebit.toLocaleString()}
            </p>
          </div>
        </Card>
        <Card>
          <div className="text-center">
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">Total Cash Paid</p>
            <p className="text-2xl font-bold text-red-600 dark:text-red-400">
              Rs. {totalCredit.toLocaleString()}
            </p>
          </div>
        </Card>
        <Card>
          <div className="text-center">
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">Net Cash Flow</p>
            <p className={`text-2xl font-bold ${(totalDebit - totalCredit) >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
              Rs. {(totalDebit - totalCredit).toLocaleString()}
            </p>
          </div>
        </Card>
      </div>

      {/* Print Styles */}
      <style>{`
        @media print {
          body * {
            visibility: hidden;
          }
          .print\\:block, .print\\:block * {
            visibility: visible;
          }
          table, table * {
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
    </div>
  );
};

export default CashBook;
