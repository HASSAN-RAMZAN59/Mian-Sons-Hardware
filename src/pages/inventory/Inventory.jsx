import React, { useState, useEffect } from 'react';
import { toast } from 'react-toastify';
import { 
  FaBoxes, 
  FaExchangeAlt, 
  FaEdit, 
  FaChartLine,
  FaFilePdf,
  FaPlus,
  FaExclamationTriangle,
  FaCheckCircle,
  FaTimesCircle
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
import { productsData } from '../../data/productsData';
import { logAudit } from '../../utils/audit';

const INVENTORY_STOCK_KEY = 'admin_inventory_stock';
const INVENTORY_ADJUSTMENTS_KEY = 'admin_inventory_adjustments';
const INVENTORY_TRANSFERS_KEY = 'admin_inventory_transfers';
const DAMAGED_STOCK_KEY = 'admin_damaged_stock';

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
      productId: product.id,
      productCode: getProductCode(product.id),
      productName: getProductName(product),
      category: product.category,
      currentStock,
      minStock,
      maxStock,
      unit: product.unit || 'Piece',
      purchasePrice: Number(product.purchasePrice || 0),
      lastUpdated: today,
      branch: 'Main Branch'
    };
  });
};

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

const mergeStockDataWithCatalog = (storedStockData) => {
  const defaultStockData = buildDefaultStockData();
  if (!storedStockData.length) return defaultStockData;

  const storedByCode = new Map(storedStockData.map((item) => [item.productCode, item]));
  const mergedCatalogStock = defaultStockData.map((catalogItem) => {
    const savedItem = storedByCode.get(catalogItem.productCode);
    return savedItem
      ? {
          ...catalogItem,
          ...savedItem,
          id: catalogItem.id,
          productId: catalogItem.productId,
          productCode: catalogItem.productCode,
          productName: catalogItem.productName,
          category: catalogItem.category,
          unit: catalogItem.unit,
          purchasePrice: catalogItem.purchasePrice
        }
      : catalogItem;
  });

  const catalogCodes = new Set(defaultStockData.map((item) => item.productCode));
  const customItems = storedStockData.filter((item) => !catalogCodes.has(item.productCode));
  return [...mergedCatalogStock, ...customItems];
};

const Inventory = () => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('current-stock');
  const [searchTerm, setSearchTerm] = useState('');
  const [filterCategory, setFilterCategory] = useState('');
  const [filterStockStatus, setFilterStockStatus] = useState('');
  const [filterBranch, setFilterBranch] = useState('');
  
  // Current Stock State
  const [stockData, setStockData] = useState([]);
  
  // Stock Adjustment State
  const [isAdjustmentModalOpen, setIsAdjustmentModalOpen] = useState(false);
  const [adjustmentHistory, setAdjustmentHistory] = useState([]);
  const [adjustmentForm, setAdjustmentForm] = useState({
    product: '',
    adjustmentType: 'Add',
    quantity: '',
    reason: '',
    notes: '',
    date: new Date().toISOString().split('T')[0]
  });

  // Stock Transfer State
  const [isTransferModalOpen, setIsTransferModalOpen] = useState(false);
  const [transferHistory, setTransferHistory] = useState([]);
  const [transferForm, setTransferForm] = useState({
    fromBranch: '',
    toBranch: '',
    product: '',
    quantity: '',
    notes: '',
    date: new Date().toISOString().split('T')[0]
  });

  // Initialize stock data
  useEffect(() => {
    const storedStock = readStoredData(INVENTORY_STOCK_KEY);
    const storedAdjustments = readStoredData(INVENTORY_ADJUSTMENTS_KEY);
    const storedTransfers = readStoredData(INVENTORY_TRANSFERS_KEY);

    setStockData(mergeStockDataWithCatalog(storedStock));
    setAdjustmentHistory(storedAdjustments);
    setTransferHistory(storedTransfers);
  }, []);

  useEffect(() => {
    localStorage.setItem(INVENTORY_STOCK_KEY, JSON.stringify(stockData));
  }, [stockData]);

  useEffect(() => {
    localStorage.setItem(INVENTORY_ADJUSTMENTS_KEY, JSON.stringify(adjustmentHistory));
  }, [adjustmentHistory]);

  useEffect(() => {
    localStorage.setItem(INVENTORY_TRANSFERS_KEY, JSON.stringify(transferHistory));
  }, [transferHistory]);

  // Get stock status
  const getStockStatus = (current, min, max) => {
    if (current === 0) return 'Out of Stock';
    if (current < min) return 'Low Stock';
    if (current >= min && current <= max) return 'OK';
    return 'Overstock';
  };

  // Get stock status badge
  const getStockStatusBadge = (current, min, max) => {
    const status = getStockStatus(current, min, max);
    switch (status) {
      case 'Out of Stock':
        return <Badge variant="danger" icon={<FaTimesCircle />}>Out of Stock</Badge>;
      case 'Low Stock':
        return <Badge variant="warning" icon={<FaExclamationTriangle />}>Low Stock</Badge>;
      case 'OK':
        return <Badge variant="success" icon={<FaCheckCircle />}>OK</Badge>;
      case 'Overstock':
        return <Badge variant="info">Overstock</Badge>;
      default:
        return <Badge variant="default">Unknown</Badge>;
    }
  };

  // Get row class based on stock status
  const getRowClass = (current, min) => {
    if (current === 0) return 'bg-red-50 dark:bg-red-900/20';
    if (current < min) return 'bg-yellow-50 dark:bg-yellow-900/20';
    return '';
  };

  // Filter stock data
  const filteredStockData = stockData.filter(item => {
    const matchesSearch = item.productName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         item.productCode.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = filterCategory === '' || item.category === filterCategory;
    const matchesStockStatus = filterStockStatus === '' || 
                               getStockStatus(item.currentStock, item.minStock, item.maxStock) === filterStockStatus;
    const matchesBranch = filterBranch === '' || item.branch === filterBranch;
    
    return matchesSearch && matchesCategory && matchesStockStatus && matchesBranch;
  });

  // Calculate stock statistics
  const stockStats = {
    totalProducts: stockData.length,
    outOfStock: stockData.filter(s => s.currentStock === 0).length,
    lowStock: stockData.filter(s => s.currentStock > 0 && s.currentStock < s.minStock).length,
    okStock: stockData.filter(s => s.currentStock >= s.minStock && s.currentStock <= s.maxStock).length,
    totalValue: stockData.reduce((sum, item) => sum + (item.currentStock * item.purchasePrice), 0)
  };

  // Handle adjustment form change
  const handleAdjustmentChange = (e) => {
    const { name, value } = e.target;
    setAdjustmentForm(prev => ({ ...prev, [name]: value }));
  };

  // Handle transfer form change
  const handleTransferChange = (e) => {
    const { name, value } = e.target;
    setTransferForm(prev => ({ ...prev, [name]: value }));
  };

  // Submit stock adjustment
  const handleSubmitAdjustment = () => {
    if (!adjustmentForm.product || !adjustmentForm.quantity || !adjustmentForm.reason) {
      toast.error('Please fill all required fields');
      return;
    }

    const quantity = parseInt(adjustmentForm.quantity, 10);
    if (Number.isNaN(quantity) || quantity < 0) {
      toast.error('Please enter a valid quantity');
      return;
    }

    const selectedProduct = stockData.find((p) => p.productName === adjustmentForm.product);
    if (!selectedProduct) {
      toast.error('Selected product was not found');
      return;
    }

    if (adjustmentForm.adjustmentType === 'Remove' && quantity > selectedProduct.currentStock) {
      toast.error(`Only ${selectedProduct.currentStock} units are available in stock`);
      return;
    }

    const nextAdjustmentId = adjustmentHistory.length
      ? Math.max(...adjustmentHistory.map((item) => Number(item.id) || 0)) + 1
      : 1;

    const newAdjustment = {
      id: nextAdjustmentId,
      ...adjustmentForm,
      adjustedBy: user?.name || 'Current User',
      branch: 'Main Branch',
      quantity
    };

    // Update stock quantity
    const updatedStock = stockData.map(item => {
      if (item.productName === adjustmentForm.product) {
        let newStock = item.currentStock;
        if (adjustmentForm.adjustmentType === 'Add') {
          newStock += quantity;
        } else if (adjustmentForm.adjustmentType === 'Remove') {
          newStock -= quantity;
        } else if (adjustmentForm.adjustmentType === 'Correction') {
          newStock = quantity;
        }
        return { ...item, currentStock: Math.max(0, newStock), lastUpdated: adjustmentForm.date };
      }
      return item;
    });
    setStockData(updatedStock);

    if (adjustmentForm.adjustmentType === 'Remove' && adjustmentForm.reason === 'Damaged Stock') {
      const damagedRecords = readStoredData(DAMAGED_STOCK_KEY);
      const nextDamagedId = damagedRecords.length
        ? Math.max(...damagedRecords.map((item) => Number(item.id) || 0)) + 1
        : 1;

      const damagedEntry = {
        id: nextDamagedId,
        product: selectedProduct.productName,
        sku: selectedProduct.productCode,
        quantity,
        reason: adjustmentForm.reason,
        date: adjustmentForm.date,
        valueLost: quantity * selectedProduct.purchasePrice,
        status: 'pending',
        notes: adjustmentForm.notes || ''
      };

      localStorage.setItem(DAMAGED_STOCK_KEY, JSON.stringify([damagedEntry, ...damagedRecords]));
    }

    setAdjustmentHistory([newAdjustment, ...adjustmentHistory]);
      logAudit({
        user,
        action: 'Updated',
        module: 'Inventory',
        description: `${adjustmentForm.adjustmentType} stock for ${adjustmentForm.product} (${quantity})`
      });
    toast.success('Stock adjustment recorded successfully!');
    setIsAdjustmentModalOpen(false);
    setAdjustmentForm({
      product: '',
      adjustmentType: 'Add',
      quantity: '',
      reason: '',
      notes: '',
      date: new Date().toISOString().split('T')[0]
    });
  };

  // Submit stock transfer
  const handleSubmitTransfer = () => {
    if (!transferForm.fromBranch || !transferForm.toBranch || !transferForm.product || !transferForm.quantity) {
      toast.error('Please fill all required fields');
      return;
    }

    if (transferForm.fromBranch === transferForm.toBranch) {
      toast.error('From and To branches cannot be the same');
      return;
    }

    const quantity = parseInt(transferForm.quantity, 10);
    if (Number.isNaN(quantity) || quantity <= 0) {
      toast.error('Please enter a valid transfer quantity');
      return;
    }

    const selectedProduct = stockData.find((p) => p.productName === transferForm.product);
    if (!selectedProduct) {
      toast.error('Selected product was not found');
      return;
    }

    if (transferForm.fromBranch === 'Main Branch' && quantity > selectedProduct.currentStock) {
      toast.error(`Only ${selectedProduct.currentStock} units are available in Main Branch`);
      return;
    }

    const nextTransferId = transferHistory.length
      ? Math.max(...transferHistory.map((item) => Number(item.id) || 0)) + 1
      : 1;

    const newTransfer = {
      id: nextTransferId,
      ...transferForm,
      transferredBy: user?.name || 'Current User',
      status: 'Completed',
      quantity
    };

    const updatedStock = stockData.map((item) => {
      if (item.productName !== transferForm.product) return item;

      let newStock = item.currentStock;
      if (transferForm.fromBranch === 'Main Branch') {
        newStock -= quantity;
      }
      if (transferForm.toBranch === 'Main Branch') {
        newStock += quantity;
      }

      return {
        ...item,
        currentStock: Math.max(0, newStock),
        lastUpdated: transferForm.date
      };
    });

    setStockData(updatedStock);

      logAudit({
        user,
        action: 'Updated',
        module: 'Inventory',
        description: `Transferred ${quantity} of ${transferForm.product} from ${transferForm.fromBranch} to ${transferForm.toBranch}`
      });
    setTransferHistory([newTransfer, ...transferHistory]);
    toast.success('Stock transfer recorded successfully!');
    setIsTransferModalOpen(false);
    setTransferForm({
      fromBranch: '',
      toBranch: '',
      product: '',
      quantity: '',
      notes: '',
      date: new Date().toISOString().split('T')[0]
    });
  };

  // Export stock valuation to PDF
  const handleExportValuation = () => {
    window.print();
    toast.info("Use your browser's Print to PDF feature to save as PDF");
  };

  // Check permissions
  const canAdjustStock = hasPermission(user?.role, 'inventory', 'create');
  const canTransferStock = hasPermission(user?.role, 'inventory', 'create');

  // Get unique categories
  const categories = [...new Set(stockData.map(item => item.category))];

  // Get unique branches
  const branches = [...new Set(stockData.map(item => item.branch))];
  const allBranches = ['Main Branch', 'North Branch', 'South Branch', 'East Branch', 'West Branch'];

  // Product options for forms
  const productOptions = stockData.map(item => ({
    value: item.productName,
    label: `${item.productName} (${item.productCode})`
  }));

  // Branch options
  const branchOptions = allBranches.map(branch => ({ value: branch, label: branch }));

  // Current Stock Table Columns
  const currentStockColumns = [
    { 
      key: 'productCode', 
      label: 'Product Code',
      render: (row) => (
        <span className="font-mono text-sm font-semibold text-gray-900 dark:text-white">
          {row.productCode}
        </span>
      )
    },
    { 
      key: 'productName', 
      label: 'Product Name',
      render: (row) => (
        <div>
          <p className="font-semibold text-gray-900 dark:text-white">{row.productName}</p>
          <p className="text-xs text-gray-500 dark:text-gray-400">{row.category}</p>
        </div>
      )
    },
    { 
      key: 'category', 
      label: 'Category',
      render: (row) => (
        <Badge variant="info">{row.category}</Badge>
      )
    },
    { 
      key: 'currentStock', 
      label: 'Current Stock',
      render: (row) => (
        <span className={`font-bold text-lg ${
          row.currentStock === 0 ? 'text-red-600' :
          row.currentStock < row.minStock ? 'text-orange-600' :
          'text-green-600'
        }`}>
          {row.currentStock}
        </span>
      )
    },
    { 
      key: 'minStock', 
      label: 'Min Stock',
      render: (row) => (
        <span className="text-gray-700 dark:text-gray-300">{row.minStock}</span>
      )
    },
    { 
      key: 'maxStock', 
      label: 'Max Stock',
      render: (row) => (
        <span className="text-gray-700 dark:text-gray-300">{row.maxStock}</span>
      )
    },
    { 
      key: 'unit', 
      label: 'Unit',
      render: (row) => (
        <Badge variant="default">{row.unit}</Badge>
      )
    },
    { 
      key: 'lastUpdated', 
      label: 'Last Updated',
      render: (row) => (
        <span className="text-sm text-gray-600 dark:text-gray-400">
          {new Date(row.lastUpdated).toLocaleDateString()}
        </span>
      )
    },
    { 
      key: 'stockStatus', 
      label: 'Stock Status',
      render: (row) => getStockStatusBadge(row.currentStock, row.minStock, row.maxStock)
    }
  ];

  // Adjustment History Columns
  const adjustmentColumns = [
    { key: 'id', label: 'ID', render: (row) => `ADJ-${String(row.id).padStart(3, '0')}` },
    { key: 'date', label: 'Date', render: (row) => new Date(row.date).toLocaleDateString() },
    { key: 'product', label: 'Product' },
    { 
      key: 'adjustmentType', 
      label: 'Type',
      render: (row) => {
        const variant = row.adjustmentType === 'Add' ? 'success' : 
                       row.adjustmentType === 'Remove' ? 'danger' : 'warning';
        return <Badge variant={variant}>{row.adjustmentType}</Badge>;
      }
    },
    { 
      key: 'quantity', 
      label: 'Quantity',
      render: (row) => (
        <span className="font-semibold text-gray-900 dark:text-white">
          {row.adjustmentType === 'Add' ? '+' : row.adjustmentType === 'Remove' ? '-' : '='}{row.quantity}
        </span>
      )
    },
    { key: 'reason', label: 'Reason' },
    { key: 'adjustedBy', label: 'Adjusted By' }
  ];

  // Transfer History Columns
  const transferColumns = [
    { key: 'id', label: 'ID', render: (row) => `TRF-${String(row.id).padStart(3, '0')}` },
    { key: 'date', label: 'Date', render: (row) => new Date(row.date).toLocaleDateString() },
    { key: 'product', label: 'Product' },
    { 
      key: 'fromBranch', 
      label: 'From',
      render: (row) => <Badge variant="warning">{row.fromBranch}</Badge>
    },
    { 
      key: 'toBranch', 
      label: 'To',
      render: (row) => <Badge variant="success">{row.toBranch}</Badge>
    },
    { 
      key: 'quantity', 
      label: 'Quantity',
      render: (row) => <span className="font-semibold text-gray-900 dark:text-white">{row.quantity}</span>
    },
    { 
      key: 'status', 
      label: 'Status',
      render: (row) => (
        <Badge variant={row.status === 'Completed' ? 'success' : 'warning'}>
          {row.status}
        </Badge>
      )
    },
    { key: 'transferredBy', label: 'Transferred By' }
  ];

  // Stock Valuation Columns
  const valuationColumns = [
    { key: 'productCode', label: 'Product Code' },
    { key: 'productName', label: 'Product Name' },
    { 
      key: 'currentStock', 
      label: 'Quantity',
      render: (row) => (
        <span className="font-semibold text-gray-900 dark:text-white">
          {row.currentStock} {row.unit}
        </span>
      )
    },
    { 
      key: 'purchasePrice', 
      label: 'Purchase Price',
      render: (row) => (
        <span className="text-gray-700 dark:text-gray-300">
          Rs. {row.purchasePrice.toLocaleString()}
        </span>
      )
    },
    { 
      key: 'totalValue', 
      label: 'Total Value',
      render: (row) => (
        <span className="font-bold text-green-600 dark:text-green-400">
          Rs. {(row.currentStock * row.purchasePrice).toLocaleString()}
        </span>
      )
    }
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Inventory Management</h1>
        <p className="text-gray-600 dark:text-gray-400 mt-1">
          Track and manage stock levels, adjustments, and transfers
        </p>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-6">
        <Card>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Total Products</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{stockStats.totalProducts}</p>
            </div>
            <FaBoxes className="text-3xl text-blue-600" />
          </div>
        </Card>
        <Card>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Out of Stock</p>
              <p className="text-2xl font-bold text-red-600">{stockStats.outOfStock}</p>
            </div>
            <FaTimesCircle className="text-3xl text-red-600" />
          </div>
        </Card>
        <Card>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Low Stock</p>
              <p className="text-2xl font-bold text-orange-600">{stockStats.lowStock}</p>
            </div>
            <FaExclamationTriangle className="text-3xl text-orange-600" />
          </div>
        </Card>
        <Card>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">OK Stock</p>
              <p className="text-2xl font-bold text-green-600">{stockStats.okStock}</p>
            </div>
            <FaCheckCircle className="text-3xl text-green-600" />
          </div>
        </Card>
        <Card>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Total Value</p>
              <p className="text-xl font-bold text-purple-600">
                Rs. {(stockStats.totalValue / 1000).toFixed(0)}K
              </p>
            </div>
            <FaChartLine className="text-3xl text-purple-600" />
          </div>
        </Card>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200 dark:border-gray-700">
        <nav className="-mb-px flex space-x-8">
          <button
            onClick={() => setActiveTab('current-stock')}
            className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
              activeTab === 'current-stock'
                ? 'border-primary text-primary'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300'
            }`}
          >
            <div className="flex items-center space-x-2">
              <FaBoxes />
              <span>Current Stock</span>
            </div>
          </button>
          <button
            onClick={() => setActiveTab('adjustments')}
            className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
              activeTab === 'adjustments'
                ? 'border-primary text-primary'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300'
            }`}
          >
            <div className="flex items-center space-x-2">
              <FaEdit />
              <span>Stock Adjustment</span>
            </div>
          </button>
          <button
            onClick={() => setActiveTab('transfers')}
            className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
              activeTab === 'transfers'
                ? 'border-primary text-primary'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300'
            }`}
          >
            <div className="flex items-center space-x-2">
              <FaExchangeAlt />
              <span>Stock Transfer</span>
            </div>
          </button>
          <button
            onClick={() => setActiveTab('valuation')}
            className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
              activeTab === 'valuation'
                ? 'border-primary text-primary'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300'
            }`}
          >
            <div className="flex items-center space-x-2">
              <FaChartLine />
              <span>Stock Valuation</span>
            </div>
          </button>
        </nav>
      </div>

      {/* Tab Content */}
      <div className="mt-6">
        {/* Current Stock Tab */}
        {activeTab === 'current-stock' && (
          <div className="space-y-6">
            {/* Filters */}
            <Card>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <SearchBar
                  value={searchTerm}
                  onChange={setSearchTerm}
                  placeholder="Search products..."
                />
                <Select
                  value={filterCategory}
                  onChange={(e) => setFilterCategory(e.target.value)}
                  options={categories.map(cat => ({ value: cat, label: cat }))}
                  placeholder="All Categories"
                />
                <Select
                  value={filterStockStatus}
                  onChange={(e) => setFilterStockStatus(e.target.value)}
                  options={[
                    { value: 'Out of Stock', label: 'Out of Stock' },
                    { value: 'Low Stock', label: 'Low Stock' },
                    { value: 'OK', label: 'OK Stock' }
                  ]}
                  placeholder="All Stock Status"
                />
                <Select
                  value={filterBranch}
                  onChange={(e) => setFilterBranch(e.target.value)}
                  options={branches.map(branch => ({ value: branch, label: branch }))}
                  placeholder="All Branches"
                />
              </div>
            </Card>

            {/* Stock Table */}
            <Card title={`Current Stock (${filteredStockData.length} items)`}>
              <Table
                columns={currentStockColumns}
                data={filteredStockData}
                emptyMessage="No stock data found"
                getRowClassName={(row) => getRowClass(row.currentStock, row.minStock)}
              />
            </Card>
          </div>
        )}

        {/* Stock Adjustment Tab */}
        {activeTab === 'adjustments' && (
          <div className="space-y-6">
            {/* Adjustment Form Card */}
            <Card 
              title="Stock Adjustment Form"
              actions={
                canAdjustStock && (
                  <Button 
                    variant="primary" 
                    icon={<FaPlus />}
                    onClick={() => setIsAdjustmentModalOpen(true)}
                  >
                    New Adjustment
                  </Button>
                )
              }
            >
              {!canAdjustStock ? (
                <div className="text-center py-8">
                  <FaExclamationTriangle className="text-5xl text-yellow-500 mx-auto mb-4" />
                  <p className="text-gray-600 dark:text-gray-400">
                    You don't have permission to adjust stock. Contact your administrator.
                  </p>
                </div>
              ) : (
                <p className="text-gray-600 dark:text-gray-400">
                  Click "New Adjustment" to record stock changes, damages, or corrections.
                </p>
              )}
            </Card>

            {/* Adjustment History */}
            <Card title={`Adjustment History (${adjustmentHistory.length} records)`}>
              <Table
                columns={adjustmentColumns}
                data={adjustmentHistory}
                emptyMessage="No adjustment history found"
              />
            </Card>
          </div>
        )}

        {/* Stock Transfer Tab */}
        {activeTab === 'transfers' && (
          <div className="space-y-6">
            {/* Transfer Form Card */}
            <Card 
              title="Stock Transfer Form"
              actions={
                canTransferStock && (
                  <Button 
                    variant="primary" 
                    icon={<FaExchangeAlt />}
                    onClick={() => setIsTransferModalOpen(true)}
                  >
                    New Transfer
                  </Button>
                )
              }
            >
              {!canTransferStock ? (
                <div className="text-center py-8">
                  <FaExclamationTriangle className="text-5xl text-yellow-500 mx-auto mb-4" />
                  <p className="text-gray-600 dark:text-gray-400">
                    You don't have permission to transfer stock. Contact your administrator.
                  </p>
                </div>
              ) : (
                <p className="text-gray-600 dark:text-gray-400">
                  Click "New Transfer" to move stock between branches.
                </p>
              )}
            </Card>

            {/* Transfer History */}
            <Card title={`Transfer History (${transferHistory.length} records)`}>
              <Table
                columns={transferColumns}
                data={transferHistory}
                emptyMessage="No transfer history found"
              />
            </Card>
          </div>
        )}

        {/* Stock Valuation Tab */}
        {activeTab === 'valuation' && (
          <div className="space-y-6">
            {/* Valuation Table */}
            <Card 
              title="Stock Valuation Report"
              actions={
                <Button 
                  variant="danger" 
                  icon={<FaFilePdf />}
                  onClick={handleExportValuation}
                >
                  Export to PDF
                </Button>
              }
            >
              <Table
                columns={valuationColumns}
                data={stockData}
                emptyMessage="No stock data found"
              />
              
              {/* Grand Total */}
              <div className="mt-6 pt-6 border-t border-gray-200 dark:border-gray-700">
                <div className="flex justify-end">
                  <div className="bg-green-50 dark:bg-green-900/20 px-6 py-4 rounded-lg">
                    <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Grand Total Stock Value</p>
                    <p className="text-3xl font-bold text-green-600 dark:text-green-400">
                      Rs. {stockStats.totalValue.toLocaleString()}
                    </p>
                  </div>
                </div>
              </div>
            </Card>
          </div>
        )}
      </div>

      {/* Stock Adjustment Modal */}
      <Modal
        isOpen={isAdjustmentModalOpen}
        onClose={() => {
          setIsAdjustmentModalOpen(false);
          setAdjustmentForm({
            product: '',
            adjustmentType: 'Add',
            quantity: '',
            reason: '',
            notes: '',
            date: new Date().toISOString().split('T')[0]
          });
        }}
        title="Stock Adjustment"
        size="lg"
        footer={
          <div className="flex justify-end space-x-3">
            <Button
              variant="outline"
              onClick={() => setIsAdjustmentModalOpen(false)}
            >
              Cancel
            </Button>
            <Button
              variant="primary"
              onClick={handleSubmitAdjustment}
            >
              Record Adjustment
            </Button>
          </div>
        }
      >
        <div className="space-y-4">
          <Select
            label="Product"
            name="product"
            value={adjustmentForm.product}
            onChange={handleAdjustmentChange}
            options={productOptions}
            placeholder="Select product"
            required
          />

          <Select
            label="Adjustment Type"
            name="adjustmentType"
            value={adjustmentForm.adjustmentType}
            onChange={handleAdjustmentChange}
            options={[
              { value: 'Add', label: 'Add Stock' },
              { value: 'Remove', label: 'Remove Stock' },
              { value: 'Correction', label: 'Stock Correction' }
            ]}
            required
          />

          <Input
            label="Quantity"
            name="quantity"
            type="number"
            value={adjustmentForm.quantity}
            onChange={handleAdjustmentChange}
            placeholder="Enter quantity"
            required
            min="0"
          />

          <Select
            label="Reason"
            name="reason"
            value={adjustmentForm.reason}
            onChange={handleAdjustmentChange}
            options={[
              { value: 'New Stock Arrival', label: 'New Stock Arrival' },
              { value: 'Damaged Stock', label: 'Damaged Stock' },
              { value: 'Expired Stock', label: 'Expired Stock' },
              { value: 'Stock Count Error', label: 'Stock Count Error' },
              { value: 'Return to Supplier', label: 'Return to Supplier' },
              { value: 'Other', label: 'Other' }
            ]}
            placeholder="Select reason"
            required
          />

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Notes
            </label>
            <textarea
              name="notes"
              value={adjustmentForm.notes}
              onChange={handleAdjustmentChange}
              placeholder="Additional notes..."
              rows="3"
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>

          <Input
            label="Date"
            name="date"
            type="date"
            value={adjustmentForm.date}
            onChange={handleAdjustmentChange}
            required
          />
        </div>
      </Modal>

      {/* Stock Transfer Modal */}
      <Modal
        isOpen={isTransferModalOpen}
        onClose={() => {
          setIsTransferModalOpen(false);
          setTransferForm({
            fromBranch: '',
            toBranch: '',
            product: '',
            quantity: '',
            notes: '',
            date: new Date().toISOString().split('T')[0]
          });
        }}
        title="Stock Transfer"
        size="lg"
        footer={
          <div className="flex justify-end space-x-3">
            <Button
              variant="outline"
              onClick={() => setIsTransferModalOpen(false)}
            >
              Cancel
            </Button>
            <Button
              variant="primary"
              onClick={handleSubmitTransfer}
            >
              Record Transfer
            </Button>
          </div>
        }
      >
        <div className="space-y-4">
          <Select
            label="From Branch"
            name="fromBranch"
            value={transferForm.fromBranch}
            onChange={handleTransferChange}
            options={branchOptions}
            placeholder="Select source branch"
            required
          />

          <Select
            label="To Branch"
            name="toBranch"
            value={transferForm.toBranch}
            onChange={handleTransferChange}
            options={branchOptions}
            placeholder="Select destination branch"
            required
          />

          <Select
            label="Product"
            name="product"
            value={transferForm.product}
            onChange={handleTransferChange}
            options={productOptions}
            placeholder="Select product"
            required
          />

          <Input
            label="Quantity"
            name="quantity"
            type="number"
            value={transferForm.quantity}
            onChange={handleTransferChange}
            placeholder="Enter quantity to transfer"
            required
            min="1"
          />

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Notes
            </label>
            <textarea
              name="notes"
              value={transferForm.notes}
              onChange={handleTransferChange}
              placeholder="Transfer notes..."
              rows="3"
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>

          <Input
            label="Date"
            name="date"
            type="date"
            value={transferForm.date}
            onChange={handleTransferChange}
            required
          />
        </div>
      </Modal>
    </div>
  );
};

export default Inventory;
