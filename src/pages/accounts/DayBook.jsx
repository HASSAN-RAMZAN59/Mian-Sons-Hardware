import React, { useEffect, useState } from 'react';
import { FaPrint, FaShoppingCart, FaMoneyBillWave, FaReceipt, FaArrowDown, FaArrowUp, FaClock } from 'react-icons/fa';
import Card from '../../components/common/Card';
import Button from '../../components/common/Button';
import Input from '../../components/common/Input';
import Badge from '../../components/common/Badge';
import { toast } from 'react-toastify';

const POS_SALES_KEY = 'admin_pos_sales';
const WEBSITE_ORDERS_KEY = 'website_orders';
const PURCHASES_KEY = 'admin_purchases';
const PAYMENTS_KEY = 'admin_payments';

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

const DayBook = () => {
  const [selectedDate, setSelectedDate] = useState('2026-03-11');
  const [transactions, setTransactions] = useState([]);

  const loadDayBookData = () => {
    const posSales = mapPosSales(readStoredData(POS_SALES_KEY));
    const websiteSales = mapWebsiteOrders(readStoredData(WEBSITE_ORDERS_KEY));
    const purchases = readStoredData(PURCHASES_KEY);
    const payments = readStoredData(PAYMENTS_KEY);

    const entries = [];

    [...posSales, ...websiteSales].forEach((sale) => {
      if (!sale.date) return;
      entries.push({
        id: `sale-${sale.id}`,
        date: sale.date,
        time: sale.time || '00:00:00',
        type: 'Sale',
        description: `Sale - Invoice #${sale.invoiceNo}`,
        voucher: sale.invoiceNo,
        amount: Number(sale.netAmount || 0),
        category: 'Income'
      });
    });

    (Array.isArray(purchases) ? purchases : []).forEach((purchase, index) => {
      if (!purchase?.date) return;
      entries.push({
        id: `purchase-${purchase.id || index + 1}`,
        date: purchase.date,
        time: '00:00:00',
        type: 'Purchase',
        description: `Purchase - ${purchase.supplierName || 'Supplier'}`,
        voucher: purchase.poNo || purchase.purchaseNo || '',
        amount: Number(purchase.totalAmount || 0),
        category: 'Expense'
      });
    });

    (Array.isArray(payments) ? payments : []).forEach((payment) => {
      if (!payment?.date) return;

      const isReceived = payment.type === 'Received';
      entries.push({
        id: `payment-${payment.id || payment.paymentId}`,
        date: payment.date,
        time: payment.time || '00:00:00',
        type: isReceived ? 'Payment Received' : 'Payment Made',
        description: isReceived
          ? `Payment Received - ${payment.partyName || 'Customer'}`
          : `Payment Made - ${payment.partyName || 'Supplier'}`,
        voucher: payment.paymentId || payment.reference || '',
        amount: Number(payment.amount || 0),
        category: isReceived ? 'Income' : 'Expense'
      });
    });

    entries.sort((a, b) => {
      const timeA = new Date(`${a.date} ${a.time || '00:00:00'}`).getTime();
      const timeB = new Date(`${b.date} ${b.time || '00:00:00'}`).getTime();
      return timeA - timeB;
    });

    setTransactions(entries);
  };

  useEffect(() => {
    loadDayBookData();
  }, []);

  useEffect(() => {
    const watchedKeys = [POS_SALES_KEY, WEBSITE_ORDERS_KEY, PURCHASES_KEY, PAYMENTS_KEY];

    const handleStorage = (event) => {
      if (event?.key && !watchedKeys.includes(event.key)) return;
      loadDayBookData();
    };

    const handleCustomUpdate = (event) => {
      const key = event?.detail?.key;
      if (key && !watchedKeys.includes(key)) return;
      loadDayBookData();
    };

    window.addEventListener('storage', handleStorage);
    window.addEventListener('app-storage-updated', handleCustomUpdate);

    return () => {
      window.removeEventListener('storage', handleStorage);
      window.removeEventListener('app-storage-updated', handleCustomUpdate);
    };
  }, []);

  // Filter transactions for selected date
  const filteredTransactions = transactions.filter((t) => t.date === selectedDate);

  // Calculate summary totals
  const salesTotal = filteredTransactions
    .filter(t => t.type === 'Sale')
    .reduce((sum, t) => sum + t.amount, 0);

  const purchasesTotal = filteredTransactions
    .filter(t => t.type === 'Purchase')
    .reduce((sum, t) => sum + t.amount, 0);

  const expensesTotal = filteredTransactions
    .filter(t => t.type === 'Expense')
    .reduce((sum, t) => sum + t.amount, 0);

  const paymentsReceived = filteredTransactions
    .filter(t => t.type === 'Payment Received')
    .reduce((sum, t) => sum + t.amount, 0);

  const paymentsMade = filteredTransactions
    .filter(t => t.type === 'Payment Made')
    .reduce((sum, t) => sum + t.amount, 0);

  const totalIncome = salesTotal + paymentsReceived;
  const totalExpenses = purchasesTotal + expensesTotal + paymentsMade;
  const netCash = totalIncome - totalExpenses;

  const handlePrint = () => {
    window.print();
    toast.success('Opening print dialog...');
  };

  const getTypeColor = (type) => {
    switch (type) {
      case 'Sale':
        return 'success';
      case 'Purchase':
        return 'warning';
      case 'Expense':
        return 'danger';
      case 'Payment Received':
        return 'info';
      case 'Payment Made':
        return 'secondary';
      default:
        return 'default';
    }
  };

  const getTypeIcon = (type) => {
    switch (type) {
      case 'Sale':
        return <FaShoppingCart className="text-green-600" />;
      case 'Purchase':
        return <FaReceipt className="text-orange-600" />;
      case 'Expense':
        return <FaMoneyBillWave className="text-red-600" />;
      case 'Payment Received':
        return <FaArrowDown className="text-blue-600" />;
      case 'Payment Made':
        return <FaArrowUp className="text-gray-600" />;
      default:
        return null;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center print:hidden">
        <h1 className="text-3xl font-bold text-gray-800 dark:text-white">Day Book</h1>
        <Button onClick={handlePrint}>
          <FaPrint className="mr-2" /> Print Day Report
        </Button>
      </div>

      {/* Print Header - Only visible when printing */}
      <div className="hidden print:block text-center mb-6">
        <h1 className="text-3xl font-bold text-gray-900">Mian & Sons Hardware Store</h1>
        <h2 className="text-xl font-semibold text-gray-700 mt-2">Day Book Report</h2>
        <p className="text-gray-600 mt-1">
          Date: {new Date(selectedDate).toLocaleDateString('en-US', { 
            weekday: 'long', 
            year: 'numeric', 
            month: 'long', 
            day: 'numeric' 
          })}
        </p>
      </div>

      {/* Date Selector */}
      <Card className="print:hidden">
        <div className="flex items-center gap-4">
          <div className="flex-1">
            <Input
              label="Select Date"
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
            />
          </div>
          <div className="flex-1 flex items-end">
            <Button
              variant="secondary"
              onClick={() => setSelectedDate(new Date().toISOString().split('T')[0])}
              className="w-full"
            >
              Today
            </Button>
          </div>
        </div>
      </Card>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4">
        <Card>
          <div className="text-center">
            <div className="flex items-center justify-center mb-2">
              <FaShoppingCart className="text-2xl text-green-600 dark:text-green-400" />
            </div>
            <p className="text-xs text-gray-600 dark:text-gray-400 mb-1">Sales Total</p>
            <p className="text-lg font-bold text-green-600 dark:text-green-400">
              Rs. {salesTotal.toLocaleString()}
            </p>
          </div>
        </Card>
        
        <Card>
          <div className="text-center">
            <div className="flex items-center justify-center mb-2">
              <FaReceipt className="text-2xl text-orange-600 dark:text-orange-400" />
            </div>
            <p className="text-xs text-gray-600 dark:text-gray-400 mb-1">Purchases Total</p>
            <p className="text-lg font-bold text-orange-600 dark:text-orange-400">
              Rs. {purchasesTotal.toLocaleString()}
            </p>
          </div>
        </Card>
        
        <Card>
          <div className="text-center">
            <div className="flex items-center justify-center mb-2">
              <FaMoneyBillWave className="text-2xl text-red-600 dark:text-red-400" />
            </div>
            <p className="text-xs text-gray-600 dark:text-gray-400 mb-1">Expenses Total</p>
            <p className="text-lg font-bold text-red-600 dark:text-red-400">
              Rs. {expensesTotal.toLocaleString()}
            </p>
          </div>
        </Card>
        
        <Card>
          <div className="text-center">
            <div className="flex items-center justify-center mb-2">
              <FaArrowDown className="text-2xl text-blue-600 dark:text-blue-400" />
            </div>
            <p className="text-xs text-gray-600 dark:text-gray-400 mb-1">Payments Received</p>
            <p className="text-lg font-bold text-blue-600 dark:text-blue-400">
              Rs. {paymentsReceived.toLocaleString()}
            </p>
          </div>
        </Card>
        
        <Card>
          <div className="text-center">
            <div className="flex items-center justify-center mb-2">
              <FaArrowUp className="text-2xl text-gray-600 dark:text-gray-400" />
            </div>
            <p className="text-xs text-gray-600 dark:text-gray-400 mb-1">Payments Made</p>
            <p className="text-lg font-bold text-gray-600 dark:text-gray-400">
              Rs. {paymentsMade.toLocaleString()}
            </p>
          </div>
        </Card>
        
        <Card className={netCash >= 0 ? 'bg-green-50 dark:bg-green-900/20' : 'bg-red-50 dark:bg-red-900/20'}>
          <div className="text-center">
            <div className="flex items-center justify-center mb-2">
              <FaMoneyBillWave className={`text-2xl ${netCash >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`} />
            </div>
            <p className="text-xs text-gray-600 dark:text-gray-400 mb-1">Net Cash</p>
            <p className={`text-lg font-bold ${netCash >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
              Rs. {netCash.toLocaleString()}
            </p>
          </div>
        </Card>
      </div>

      {/* Detailed Transaction List */}
      <Card>
        <div className="mb-4">
          <h2 className="text-xl font-semibold text-gray-800 dark:text-white mb-2">
            Transaction Details
          </h2>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            {filteredTransactions.length} transactions on {new Date(selectedDate).toLocaleDateString()}
          </p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b-2 border-gray-200 dark:border-gray-700">
                <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700 dark:text-gray-300">Time</th>
                <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700 dark:text-gray-300">Type</th>
                <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700 dark:text-gray-300">Description</th>
                <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700 dark:text-gray-300">Voucher #</th>
                <th className="text-right py-3 px-4 text-sm font-semibold text-gray-700 dark:text-gray-300">Amount</th>
              </tr>
            </thead>
            <tbody>
              {filteredTransactions.length > 0 ? (
                filteredTransactions.map((transaction) => (
                  <tr
                    key={transaction.id}
                    className="border-b border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800"
                  >
                    <td className="py-3 px-4 text-sm text-gray-600 dark:text-gray-400">
                      <div className="flex items-center gap-2">
                        <FaClock className="text-gray-400" />
                        {transaction.time}
                      </div>
                    </td>
                    <td className="py-3 px-4 text-sm">
                      <div className="flex items-center gap-2">
                        {getTypeIcon(transaction.type)}
                        <Badge variant={getTypeColor(transaction.type)}>
                          {transaction.type}
                        </Badge>
                      </div>
                    </td>
                    <td className="py-3 px-4 text-sm text-gray-900 dark:text-gray-100">
                      {transaction.description}
                    </td>
                    <td className="py-3 px-4 text-sm text-gray-600 dark:text-gray-400">
                      {transaction.voucher}
                    </td>
                    <td className="py-3 px-4 text-sm text-right font-semibold">
                      <span className={transaction.category === 'Income' ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}>
                        {transaction.category === 'Income' ? '+' : '-'} Rs. {transaction.amount.toLocaleString()}
                      </span>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="5" className="py-8 text-center text-gray-500 dark:text-gray-400">
                    No transactions found for the selected date
                  </td>
                </tr>
              )}
            </tbody>
            <tfoot>
              <tr className="bg-gray-100 dark:bg-gray-800 font-bold border-t-2 border-gray-300 dark:border-gray-600">
                <td colSpan="4" className="py-4 px-4 text-sm text-gray-900 dark:text-white">
                  TOTAL INCOME
                </td>
                <td className="py-4 px-4 text-sm text-right text-green-600 dark:text-green-400">
                  Rs. {totalIncome.toLocaleString()}
                </td>
              </tr>
              <tr className="bg-gray-100 dark:bg-gray-800 font-bold">
                <td colSpan="4" className="py-4 px-4 text-sm text-gray-900 dark:text-white">
                  TOTAL EXPENSES
                </td>
                <td className="py-4 px-4 text-sm text-right text-red-600 dark:text-red-400">
                  Rs. {totalExpenses.toLocaleString()}
                </td>
              </tr>
              <tr className="bg-primary text-white font-bold">
                <td colSpan="4" className="py-4 px-4 text-sm">
                  NET CASH FLOW
                </td>
                <td className="py-4 px-4 text-sm text-right">
                  Rs. {netCash.toLocaleString()}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      </Card>

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

export default DayBook;
