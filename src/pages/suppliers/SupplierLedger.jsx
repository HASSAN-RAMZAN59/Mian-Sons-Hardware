import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import Card from '../../components/common/Card';
import Button from '../../components/common/Button';
import { FaArrowLeft, FaFileExport, FaPrint } from 'react-icons/fa';
import { toast } from 'react-toastify';

const SUPPLIERS_KEY = 'admin_suppliers';
const PURCHASES_KEY = 'admin_purchases';

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

const buildSuppliersFromPurchases = (purchases = []) => {
  const uniqueNames = Array.from(
    new Set((Array.isArray(purchases) ? purchases : []).map((purchase) => purchase.supplierName || 'Supplier'))
  );

  return uniqueNames.map((name, index) => ({
    id: index + 1,
    companyName: name,
    contactPerson: '',
    phone: '',
    email: '',
    address: '',
    city: '',
    balancePayable: 0
  }));
};

const buildLedgerEntries = (purchases = [], supplierName) => {
  const entries = [];

  (Array.isArray(purchases) ? purchases : [])
    .filter((purchase) => purchase.supplierName === supplierName)
    .forEach((purchase) => {
      entries.push({
        date: purchase.date,
        description: `Purchase Order ${purchase.poNo || purchase.purchaseNo}`,
        invoice: purchase.poNo || purchase.purchaseNo,
        debit: 0,
        credit: Number(purchase.totalAmount || 0)
      });

      if (Number(purchase.paidAmount || 0) > 0) {
        entries.push({
          date: purchase.date,
          description: `Payment received (${purchase.paymentMethod || 'Payment'})`,
          invoice: `PAY-${purchase.poNo || purchase.purchaseNo}`,
          debit: Number(purchase.paidAmount || 0),
          credit: 0
        });
      }
    });

  return entries;
};

const SupplierLedger = () => {
  const { id } = useParams();
  const [ledger, setLedger] = useState([]);
  const [supplier, setSupplier] = useState(null);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [summary, setSummary] = useState({ totalDebit: 0, totalCredit: 0, balance: 0 });

  useEffect(() => {
    const purchases = readStoredData(PURCHASES_KEY);
    const storedSuppliers = readStoredData(SUPPLIERS_KEY);
    const suppliersData = storedSuppliers.length
      ? storedSuppliers
      : buildSuppliersFromPurchases(purchases);

    const supplierId = id || suppliersData[0]?.id;
    const found = suppliersData.find(s => s.id === parseInt(supplierId));
    if (found) {
      const supplierName = found.companyName || found.name;
      setSupplier({
        name: supplierName,
        contact: found.phone || found.contactPerson || 'N/A',
        address: found.address || 'N/A',
        balance: Number(found.balancePayable || 0)
      });

      const entries = buildLedgerEntries(purchases, supplierName);
      const filteredEntries = entries.filter((entry) => {
        const matchesStart = !startDate || new Date(entry.date) >= new Date(startDate);
        const matchesEnd = !endDate || new Date(entry.date) <= new Date(endDate);
        return matchesStart && matchesEnd;
      });

      let runningBalance = 0;
      const entriesWithBalance = filteredEntries.map(e => {
        runningBalance = runningBalance - e.debit + e.credit;
        return { ...e, balance: runningBalance };
      });
      setLedger(entriesWithBalance);

      const totalDebit = filteredEntries.reduce((s, e) => s + e.debit, 0);
      const totalCredit = filteredEntries.reduce((s, e) => s + e.credit, 0);
      setSummary({ totalDebit, totalCredit, balance: totalCredit - totalDebit });
    }
  }, [id, startDate, endDate]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleExport = () => {
    if (!ledger.length) {
      toast.error('No ledger entries to export');
      return;
    }

    const headers = ['Date', 'Description', 'Invoice', 'Debit', 'Credit', 'Balance'];
    const rows = ledger.map((entry) => [
      entry.date,
      entry.description,
      entry.invoice,
      entry.debit,
      entry.credit,
      entry.balance
    ]);
    const csvContent = [headers, ...rows]
      .map((row) => row.map((cell) => `"${String(cell ?? '').replace(/"/g, '""')}"`).join(','))
      .join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `supplier-ledger-${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    toast.success('Ledger exported successfully!');
  };
  const handlePrint = () => window.print();

  const formatCurrency = (amount) => `Rs. ${amount.toLocaleString('en-PK', { minimumFractionDigits: 2 })}`;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link to="/admin/suppliers">
            <Button variant="outline" size="sm"><FaArrowLeft className="mr-2" />Back</Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-gray-800 dark:text-white">Supplier Ledger</h1>
            {supplier && <p className="text-gray-500">{supplier.name}</p>}
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={handleExport}><FaFileExport className="mr-2" />Export</Button>
          <Button variant="outline" size="sm" onClick={handlePrint}><FaPrint className="mr-2" />Print</Button>
        </div>
      </div>

      {supplier && (
        <Card>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <p className="text-sm text-gray-500">Supplier Name</p>
              <p className="font-semibold text-gray-800 dark:text-white">{supplier.name}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Contact</p>
              <p className="font-semibold text-gray-800 dark:text-white">{supplier.contact}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Current Balance (Payable)</p>
              <p className="font-semibold text-red-600">{formatCurrency(summary.balance)}</p>
            </div>
          </div>
        </Card>
      )}

      <Card>
        <div className="flex flex-wrap gap-4 mb-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">From Date</label>
            <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)}
              className="border border-gray-300 dark:border-gray-600 rounded px-3 py-2 text-sm bg-white dark:bg-gray-700 text-gray-800 dark:text-white" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">To Date</label>
            <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)}
              className="border border-gray-300 dark:border-gray-600 rounded px-3 py-2 text-sm bg-white dark:bg-gray-700 text-gray-800 dark:text-white" />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
            <thead>
              <tr className="bg-gray-50 dark:bg-gray-700">
                {['Date', 'Description', 'Invoice #', 'Debit', 'Credit', 'Balance'].map(h => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
              {ledger.length === 0 ? (
                <tr><td colSpan={6} className="text-center py-8 text-gray-400">No ledger entries found</td></tr>
              ) : ledger.map((entry, idx) => (
                <tr key={idx} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                  <td className="px-4 py-3 text-sm text-gray-700 dark:text-gray-300">{entry.date}</td>
                  <td className="px-4 py-3 text-sm text-gray-700 dark:text-gray-300">{entry.description}</td>
                  <td className="px-4 py-3 text-sm font-mono text-primary">{entry.invoice || '-'}</td>
                  <td className="px-4 py-3 text-sm text-green-600 font-medium">{entry.debit > 0 ? formatCurrency(entry.debit) : '-'}</td>
                  <td className="px-4 py-3 text-sm text-red-600 font-medium">{entry.credit > 0 ? formatCurrency(entry.credit) : '-'}</td>
                  <td className={`px-4 py-3 text-sm font-semibold ${entry.balance > 0 ? 'text-red-600' : 'text-green-600'}`}>{formatCurrency(Math.abs(entry.balance))}</td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="bg-gray-50 dark:bg-gray-700 font-semibold">
                <td colSpan={3} className="px-4 py-3 text-sm text-gray-700 dark:text-gray-300">Totals</td>
                <td className="px-4 py-3 text-sm text-green-600">{formatCurrency(summary.totalDebit)}</td>
                <td className="px-4 py-3 text-sm text-red-600">{formatCurrency(summary.totalCredit)}</td>
                <td className={`px-4 py-3 text-sm ${summary.balance > 0 ? 'text-red-600' : 'text-green-600'}`}>{formatCurrency(Math.abs(summary.balance))}</td>
              </tr>
            </tfoot>
          </table>
        </div>

        <div className="mt-4 grid grid-cols-3 gap-4">
          <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-4 text-center">
            <p className="text-sm text-gray-500">Total Payments Made</p>
            <p className="text-xl font-bold text-green-600">{formatCurrency(summary.totalDebit)}</p>
          </div>
          <div className="bg-red-50 dark:bg-red-900/20 rounded-lg p-4 text-center">
            <p className="text-sm text-gray-500">Total Purchases</p>
            <p className="text-xl font-bold text-red-600">{formatCurrency(summary.totalCredit)}</p>
          </div>
          <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4 text-center">
            <p className="text-sm text-gray-500">Outstanding Balance</p>
            <p className={`text-xl font-bold ${summary.balance > 0 ? 'text-red-600' : 'text-green-600'}`}>{formatCurrency(Math.abs(summary.balance))}</p>
          </div>
        </div>
      </Card>
    </div>
  );
};

export default SupplierLedger;

