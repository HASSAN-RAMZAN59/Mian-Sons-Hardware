import React, { useState, useEffect } from 'react';
import { toast } from 'react-toastify';
import { 
  FaFilePdf,
  FaPrint,
  FaUser,
  FaPhoneAlt,
  FaShoppingCart,
  FaMoneyBillWave
} from 'react-icons/fa';
import { useAuth } from '../../context/AuthContext';
import { hasPermission } from '../../utils/permissions';
import Card from '../../components/common/Card';
import Button from '../../components/common/Button';
import Select from '../../components/common/Select';
import Input from '../../components/common/Input';

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

const CustomerLedger = () => {
  const { user } = useAuth();
  const [selectedCustomerId, setSelectedCustomerId] = useState('');
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [startDate, setStartDate] = useState('2026-01-01');
  const [endDate, setEndDate] = useState('2026-03-11');
  const [ledgerEntries, setLedgerEntries] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [salesByCustomer, setSalesByCustomer] = useState({});

  const loadCustomersFromOrders = () => {
    const posSales = mapPosSales(readStoredData(POS_SALES_KEY));
    const websiteSales = mapWebsiteOrders(readStoredData(WEBSITE_ORDERS_KEY));
    const customerAccounts = readStoredData(CUSTOMER_ACCOUNTS_KEY);

    const customersMap = new Map();
    const salesMap = new Map();

    const upsertCustomer = (key, data) => {
      if (!customersMap.has(key)) {
        customersMap.set(key, {
          id: null,
          customerKey: key,
          fullName: data.fullName || data.name || data.customerName || 'Customer',
          phone: data.phone || '',
          email: data.email || '',
          customerType: data.customerType || 'Retail',
          openingBalance: Number(data.openingBalance || 0),
          totalPurchases: 0,
          totalPaid: 0,
          balanceDue: 0
        });
      } else {
        const existing = customersMap.get(key);
        customersMap.set(key, {
          ...existing,
          fullName: existing.fullName || data.fullName || data.name || data.customerName,
          phone: existing.phone || data.phone || '',
          email: existing.email || data.email || '',
          customerType: existing.customerType || data.customerType || 'Retail'
        });
      }
    };

    customerAccounts.forEach((account) => {
      const key = getCustomerKey(account);
      upsertCustomer(key, {
        fullName: account.fullName || account.name,
        phone: account.phone,
        email: account.email,
        customerType: account.customerType,
        openingBalance: account.openingBalance
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
        phone: sale.customerPhone
      });

      const customer = customersMap.get(key);
      const paidAmount = getPaidAmount(sale);

      customer.totalPurchases += Number(sale.netAmount || 0);
      customer.totalPaid += paidAmount;

      if (!salesMap.has(key)) salesMap.set(key, []);
      salesMap.get(key).push(sale);
    });

    const customersList = Array.from(customersMap.values()).map((customer, index) => {
      const balanceDue = Math.max(0, customer.openingBalance + customer.totalPurchases - customer.totalPaid);
      return {
        ...customer,
        id: index + 1,
        balanceDue
      };
    });

    customersList.sort((a, b) => b.totalPurchases - a.totalPurchases);

    setCustomers(customersList);
    setSalesByCustomer(Object.fromEntries(salesMap));
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

  // Generate ledger entries for selected customer
  useEffect(() => {
    if (!selectedCustomerId) {
      setLedgerEntries([]);
      setSelectedCustomer(null);
      return;
    }

    const customer = customers.find(c => c.id === parseInt(selectedCustomerId));
    if (!customer) return;

    setSelectedCustomer(customer);

    const entries = buildLedgerEntries(customer);
    setLedgerEntries(entries);
  }, [selectedCustomerId, customers, startDate, endDate]); // eslint-disable-line react-hooks/exhaustive-deps

  const buildLedgerEntries = (customer) => {
    const sales = salesByCustomer[customer.customerKey] || [];
    const entries = [];

    sales.forEach((sale) => {
      if (!sale.date) return;

      entries.push({
        date: sale.date,
        description: 'Invoice Sale',
        invoice: sale.invoiceNo || '',
        debit: Number(sale.netAmount || 0),
        credit: 0
      });

      const paidAmount = getPaidAmount(sale);
      if (paidAmount > 0) {
        entries.push({
          date: sale.date,
          description: `Payment Received - ${sale.paymentMethod || 'Payment'}`,
          invoice: '',
          debit: 0,
          credit: paidAmount
        });
      }
    });

    // Filter by date range
    return entries.filter(entry => {
      const entryDate = new Date(entry.date);
      const start = new Date(startDate);
      const end = new Date(endDate);
      return entryDate >= start && entryDate <= end;
    }).sort((a, b) => new Date(a.date) - new Date(b.date));
  };

  // Calculate running balance
  const calculateLedgerWithBalance = () => {
    if (!selectedCustomer || ledgerEntries.length === 0) return [];

    let runningBalance = selectedCustomer.openingBalance;
    const ledgerWithBalance = [];

    ledgerEntries.forEach(entry => {
      runningBalance += entry.debit - entry.credit;
      ledgerWithBalance.push({
        ...entry,
        balance: runningBalance
      });
    });

    return ledgerWithBalance;
  };

  const ledgerWithBalance = calculateLedgerWithBalance();
  const closingBalance = ledgerWithBalance.length > 0 
    ? ledgerWithBalance[ledgerWithBalance.length - 1].balance 
    : selectedCustomer?.openingBalance || 0;

  // Calculate totals
  const totalDebit = ledgerEntries.reduce((sum, entry) => sum + entry.debit, 0);
  const totalCredit = ledgerEntries.reduce((sum, entry) => sum + entry.credit, 0);

  // Handle print/PDF
  const handlePrintLedger = () => {
    if (!selectedCustomer) {
      toast.error('Please select a customer first');
      return;
    }
    toast.info(`Preparing ledger for ${selectedCustomer.fullName}...`);
    window.print();
  };

  // Customer options for dropdown
  const customerOptions = customers.map(c => ({
    value: c.id.toString(),
    label: `${c.fullName} - ${c.phone}`
  }));

  // Check permissions
  const canView = hasPermission(user?.role, 'customers', 'view');

  if (!canView) {
    return (
      <div className="text-center py-12">
        <p className="text-red-600 text-lg">You do not have permission to view customer ledgers.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Customer Ledger</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            View detailed transaction history and account statement
          </p>
        </div>
        <div className="flex space-x-3">
          <Button 
            variant="danger" 
            icon={<FaFilePdf />}
            onClick={handlePrintLedger}
            disabled={!selectedCustomer}
          >
            Generate PDF
          </Button>
          <Button 
            variant="outline" 
            icon={<FaPrint />}
            onClick={handlePrintLedger}
            disabled={!selectedCustomer}
          >
            Print Ledger
          </Button>
        </div>
      </div>

      {/* Customer Selector and Date Filter */}
      <Card>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="md:col-span-1">
            <Select
              label="Select Customer"
              value={selectedCustomerId}
              onChange={(e) => setSelectedCustomerId(e.target.value)}
              options={customerOptions}
              placeholder="Choose a customer..."
              required
            />
          </div>
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
        </div>
      </Card>

      {/* Customer Info Card */}
      {selectedCustomer && (
        <Card>
          <div className="grid grid-cols-1 md:grid-cols-5 gap-6">
            <div className="flex items-start space-x-3">
              <div className="bg-blue-100 dark:bg-blue-900/30 p-3 rounded-lg">
                <FaUser className="text-2xl text-blue-600" />
              </div>
              <div>
                <p className="text-xs text-gray-500 dark:text-gray-400">Customer Name</p>
                <p className="text-lg font-semibold text-gray-900 dark:text-white">
                  {selectedCustomer.fullName}
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  {selectedCustomer.customerType}
                </p>
              </div>
            </div>

            <div className="flex items-start space-x-3">
              <div className="bg-green-100 dark:bg-green-900/30 p-3 rounded-lg">
                <FaPhoneAlt className="text-2xl text-green-600" />
              </div>
              <div>
                <p className="text-xs text-gray-500 dark:text-gray-400">Phone Number</p>
                <p className="text-sm font-semibold text-gray-900 dark:text-white">
                  {selectedCustomer.phone}
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  {selectedCustomer.email || 'No email'}
                </p>
              </div>
            </div>

            <div className="flex items-start space-x-3">
              <div className="bg-purple-100 dark:bg-purple-900/30 p-3 rounded-lg">
                <FaShoppingCart className="text-2xl text-purple-600" />
              </div>
              <div>
                <p className="text-xs text-gray-500 dark:text-gray-400">Total Purchases</p>
                <p className="text-lg font-bold text-purple-600">
                  Rs. {selectedCustomer.totalPurchases.toLocaleString()}
                </p>
              </div>
            </div>

            <div className="flex items-start space-x-3">
              <div className="bg-green-100 dark:bg-green-900/30 p-3 rounded-lg">
                <FaMoneyBillWave className="text-2xl text-green-600" />
              </div>
              <div>
                <p className="text-xs text-gray-500 dark:text-gray-400">Total Paid</p>
                <p className="text-lg font-bold text-green-600">
                  Rs. {selectedCustomer.totalPaid.toLocaleString()}
                </p>
              </div>
            </div>

            <div className="flex items-start space-x-3">
              <div className={`${selectedCustomer.balanceDue > 0 ? 'bg-red-100 dark:bg-red-900/30' : 'bg-gray-100 dark:bg-gray-800'} p-3 rounded-lg`}>
                <FaMoneyBillWave className={`text-2xl ${selectedCustomer.balanceDue > 0 ? 'text-red-600' : 'text-gray-500'}`} />
              </div>
              <div>
                <p className="text-xs text-gray-500 dark:text-gray-400">Balance Due</p>
                <p className={`text-lg font-bold ${selectedCustomer.balanceDue > 0 ? 'text-red-600' : 'text-gray-600'}`}>
                  Rs. {selectedCustomer.balanceDue.toLocaleString()}
                </p>
              </div>
            </div>
          </div>
        </Card>
      )}

      {/* Ledger Table */}
      {selectedCustomer && (
        <Card title={`Account Ledger - ${startDate} to ${endDate}`}>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-100 dark:bg-gray-800 border-b-2 border-gray-300 dark:border-gray-600">
                <tr>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700 dark:text-gray-300">
                    Date
                  </th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700 dark:text-gray-300">
                    Description
                  </th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700 dark:text-gray-300">
                    Invoice #
                  </th>
                  <th className="px-4 py-3 text-right text-sm font-semibold text-gray-700 dark:text-gray-300">
                    Debit (Rs.)
                  </th>
                  <th className="px-4 py-3 text-right text-sm font-semibold text-gray-700 dark:text-gray-300">
                    Credit (Rs.)
                  </th>
                  <th className="px-4 py-3 text-right text-sm font-semibold text-gray-700 dark:text-gray-300">
                    Balance (Rs.)
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                {/* Opening Balance Row */}
                <tr className="bg-blue-50 dark:bg-blue-900/10 font-semibold">
                  <td className="px-4 py-3 text-sm text-gray-900 dark:text-white">
                    {startDate}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-900 dark:text-white">
                    Opening Balance
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400">
                    -
                  </td>
                  <td className="px-4 py-3 text-sm text-right text-gray-600 dark:text-gray-400">
                    -
                  </td>
                  <td className="px-4 py-3 text-sm text-right text-gray-600 dark:text-gray-400">
                    -
                  </td>
                  <td className="px-4 py-3 text-sm text-right font-bold text-blue-600">
                    {selectedCustomer.openingBalance.toLocaleString()}
                  </td>
                </tr>

                {/* Ledger Entries */}
                {ledgerWithBalance.length > 0 ? (
                  ledgerWithBalance.map((entry, index) => (
                    <tr 
                      key={index}
                      className="hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors"
                    >
                      <td className="px-4 py-3 text-sm text-gray-900 dark:text-white">
                        {new Date(entry.date).toLocaleDateString('en-GB')}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-700 dark:text-gray-300">
                        {entry.description}
                      </td>
                      <td className="px-4 py-3 text-sm font-mono text-gray-600 dark:text-gray-400">
                        {entry.invoice || '-'}
                      </td>
                      <td className="px-4 py-3 text-sm text-right font-semibold text-red-600">
                        {entry.debit > 0 ? entry.debit.toLocaleString() : '-'}
                      </td>
                      <td className="px-4 py-3 text-sm text-right font-semibold text-green-600">
                        {entry.credit > 0 ? entry.credit.toLocaleString() : '-'}
                      </td>
                      <td className={`px-4 py-3 text-sm text-right font-bold ${
                        entry.balance > 0 ? 'text-red-600' : entry.balance < 0 ? 'text-green-600' : 'text-gray-600'
                      }`}>
                        {entry.balance.toLocaleString()}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="6" className="px-4 py-8 text-center text-gray-500 dark:text-gray-400">
                      No transactions found in the selected date range
                    </td>
                  </tr>
                )}

                {/* Totals Row */}
                {ledgerWithBalance.length > 0 && (
                  <tr className="bg-gray-100 dark:bg-gray-800 font-bold border-t-2 border-gray-300 dark:border-gray-600">
                    <td className="px-4 py-3 text-sm text-gray-900 dark:text-white" colSpan="3">
                      TOTAL
                    </td>
                    <td className="px-4 py-3 text-sm text-right text-red-600">
                      {totalDebit.toLocaleString()}
                    </td>
                    <td className="px-4 py-3 text-sm text-right text-green-600">
                      {totalCredit.toLocaleString()}
                    </td>
                    <td className="px-4 py-3 text-sm text-right text-gray-600 dark:text-gray-400">
                      -
                    </td>
                  </tr>
                )}

                {/* Closing Balance Row */}
                {ledgerWithBalance.length > 0 && (
                  <tr className="bg-yellow-50 dark:bg-yellow-900/10 font-bold border-t border-gray-300 dark:border-gray-600">
                    <td className="px-4 py-3 text-sm text-gray-900 dark:text-white">
                      {endDate}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-900 dark:text-white">
                      Closing Balance
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400">
                      -
                    </td>
                    <td className="px-4 py-3 text-sm text-right text-gray-600 dark:text-gray-400">
                      -
                    </td>
                    <td className="px-4 py-3 text-sm text-right text-gray-600 dark:text-gray-400">
                      -
                    </td>
                    <td className={`px-4 py-3 text-sm text-right font-bold ${
                      closingBalance > 0 ? 'text-red-600' : closingBalance < 0 ? 'text-green-600' : 'text-gray-600'
                    }`}>
                      {closingBalance.toLocaleString()}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* Empty State */}
      {!selectedCustomer && (
        <Card>
          <div className="text-center py-12">
            <FaUser className="mx-auto text-6xl text-gray-300 dark:text-gray-600 mb-4" />
            <p className="text-xl text-gray-600 dark:text-gray-400 mb-2">
              No Customer Selected
            </p>
            <p className="text-sm text-gray-500 dark:text-gray-500">
              Please select a customer from the dropdown above to view their ledger
            </p>
          </div>
        </Card>
      )}
    </div>
  );
};

export default CustomerLedger;
