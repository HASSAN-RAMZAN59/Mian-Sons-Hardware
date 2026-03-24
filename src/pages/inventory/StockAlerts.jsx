import React, { useState, useEffect } from 'react';
import { toast } from 'react-toastify';
import { 
  FaExclamationTriangle,
  FaExclamationCircle,
  FaTimesCircle,
  FaShoppingCart,
  FaWhatsapp,
  FaSync,
  FaClock,
  FaCheckSquare
} from 'react-icons/fa';
import { useAuth } from '../../context/AuthContext';
import { hasPermission } from '../../utils/permissions';
import Card from '../../components/common/Card';
import Table from '../../components/common/Table';
import Button from '../../components/common/Button';
import Badge from '../../components/common/Badge';
import SearchBar from '../../components/common/SearchBar';
import { productsData } from '../../data/productsData';

const INVENTORY_STOCK_KEY = 'admin_inventory_stock';
const STOCK_ALERT_PO_KEY = 'admin_stock_alert_purchase_orders';

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
      supplier: product.company || 'General Supplier',
      supplierContact: 'N/A',
      lastPurchaseDate: today
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

const writeStoredData = (key, value) => {
  localStorage.setItem(key, JSON.stringify(value));
};

const resolveAlertLevel = (currentStock, minStock) => {
  if (currentStock === 0) return 'Out of Stock';
  if (currentStock <= Math.max(1, Math.floor(minStock * 0.5))) return 'Critical';
  if (currentStock < minStock) return 'Low Stock';
  return null;
};

const StockAlerts = () => {
  const { user } = useAuth();
  const [activeFilter, setActiveFilter] = useState('All');
  const [searchTerm, setSearchTerm] = useState('');
  const [stockAlerts, setStockAlerts] = useState([]);
  const [selectedItems, setSelectedItems] = useState([]);
  const [lastRefresh, setLastRefresh] = useState(new Date());
  const [autoRefreshEnabled, setAutoRefreshEnabled] = useState(true);

  // Initialize stock alerts data
  useEffect(() => {
    loadStockAlerts();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Auto-refresh every 5 minutes
  useEffect(() => {
    if (!autoRefreshEnabled) return;

    const interval = setInterval(() => {
      loadStockAlerts();
      setLastRefresh(new Date());
      toast.info('Stock alerts refreshed automatically');
    }, 5 * 60 * 1000); // 5 minutes

    return () => clearInterval(interval);
  }, [autoRefreshEnabled]);

  const loadStockAlerts = () => {
    const savedStockData = readStoredData(INVENTORY_STOCK_KEY, buildDefaultStockData());
    const alerts = savedStockData
      .map((item) => {
        const alertLevel = resolveAlertLevel(Number(item.currentStock) || 0, Number(item.minStock) || 0);
        if (!alertLevel) return null;

        return {
          ...item,
          id: item.id || Number(String(item.productCode || '').replace('PRD-', '')) || Math.random(),
          supplier: item.supplier || productsData.find((p) => getProductCode(p.id) === item.productCode)?.company || 'General Supplier',
          supplierContact: item.supplierContact || 'N/A',
          lastPurchaseDate: item.lastUpdated || new Date().toISOString().split('T')[0],
          alertLevel
        };
      })
      .filter(Boolean)
      .sort((a, b) => a.currentStock - b.currentStock);

    setStockAlerts(alerts);
  };

  // Get alert level badge
  const getAlertBadge = (alertLevel) => {
    switch (alertLevel) {
      case 'Out of Stock':
        return (
          <Badge variant="danger" icon={<FaTimesCircle />}>
            Out of Stock
          </Badge>
        );
      case 'Critical':
        return (
          <Badge variant="danger" icon={<FaExclamationCircle />}>
            Critical
          </Badge>
        );
      case 'Low Stock':
        return (
          <Badge variant="warning" icon={<FaExclamationTriangle />}>
            Low Stock
          </Badge>
        );
      default:
        return <Badge variant="default">Unknown</Badge>;
    }
  };

  // Get row class based on alert level
  const getRowClass = (alertLevel) => {
    switch (alertLevel) {
      case 'Out of Stock':
        return 'bg-red-100 dark:bg-red-900/30 border-l-4 border-red-600';
      case 'Critical':
        return 'bg-red-50 dark:bg-red-900/20 border-l-4 border-red-500';
      case 'Low Stock':
        return 'bg-orange-50 dark:bg-orange-900/20 border-l-4 border-orange-500';
      default:
        return '';
    }
  };

  // Calculate counts
  const counts = {
    all: stockAlerts.length,
    critical: stockAlerts.filter(a => a.alertLevel === 'Critical').length,
    lowStock: stockAlerts.filter(a => a.alertLevel === 'Low Stock').length,
    outOfStock: stockAlerts.filter(a => a.alertLevel === 'Out of Stock').length
  };

  // Filter alerts
  const filteredAlerts = stockAlerts.filter(alert => {
    const matchesSearch = alert.productName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         alert.productCode.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         alert.category.toLowerCase().includes(searchTerm.toLowerCase());
    
    if (activeFilter === 'All') return matchesSearch;
    if (activeFilter === 'Critical') return matchesSearch && alert.alertLevel === 'Critical';
    if (activeFilter === 'Low Stock') return matchesSearch && alert.alertLevel === 'Low Stock';
    if (activeFilter === 'Out of Stock') return matchesSearch && alert.alertLevel === 'Out of Stock';
    
    return matchesSearch;
  });

  // Handle checkbox change
  const handleCheckboxChange = (id) => {
    setSelectedItems(prev => 
      prev.includes(id) 
        ? prev.filter(item => item !== id)
        : [...prev, id]
    );
  };

  // Handle select all
  const handleSelectAll = () => {
    if (selectedItems.length === filteredAlerts.length) {
      setSelectedItems([]);
    } else {
      setSelectedItems(filteredAlerts.map(alert => alert.id));
    }
  };

  // Create purchase order for single item
  const handleCreatePO = (alert) => {
    if (!canCreatePO) {
      toast.error('You do not have permission to create purchase orders');
      return;
    }

    const restockQuantity = Math.max(alert.maxStock - alert.currentStock, alert.minStock);
    const savedStockData = readStoredData(INVENTORY_STOCK_KEY, buildDefaultStockData());
    const existingPOs = readStoredData(STOCK_ALERT_PO_KEY);
    const today = new Date().toISOString().split('T')[0];

    const nextPoNumber = `PO-SA-${new Date().getFullYear()}-${String(existingPOs.length + 1).padStart(4, '0')}`;

    const newPO = {
      id: existingPOs.length ? Math.max(...existingPOs.map((po) => Number(po.id) || 0)) + 1 : 1,
      poNo: nextPoNumber,
      date: today,
      productCode: alert.productCode,
      productName: alert.productName,
      quantity: restockQuantity,
      supplier: alert.supplier || 'General Supplier',
      status: 'Created',
      createdBy: user?.name || 'Current User'
    };

    const updatedStockData = savedStockData.map((item) => {
      if (item.productCode !== alert.productCode) return item;
      return {
        ...item,
        currentStock: Number(item.currentStock) + restockQuantity,
        lastUpdated: today
      };
    });

    writeStoredData(INVENTORY_STOCK_KEY, updatedStockData);
    writeStoredData(STOCK_ALERT_PO_KEY, [newPO, ...existingPOs]);
    loadStockAlerts();
    toast.success(`Purchase Order ${nextPoNumber} created for ${alert.productName} (+${restockQuantity})`);
  };

  // Create bulk purchase orders
  const handleBulkCreatePO = () => {
    if (!canCreatePO) {
      toast.error('You do not have permission to create purchase orders');
      return;
    }

    if (selectedItems.length === 0) {
      toast.error('Please select at least one item');
      return;
    }

    const selectedAlerts = stockAlerts.filter((alert) => selectedItems.includes(alert.id));
    const savedStockData = readStoredData(INVENTORY_STOCK_KEY, buildDefaultStockData());
    const existingPOs = readStoredData(STOCK_ALERT_PO_KEY);
    const today = new Date().toISOString().split('T')[0];

    const newPOs = selectedAlerts.map((alert, index) => {
      const restockQuantity = Math.max(alert.maxStock - alert.currentStock, alert.minStock);
      return {
        id: existingPOs.length + index + 1,
        poNo: `PO-SA-${new Date().getFullYear()}-${String(existingPOs.length + index + 1).padStart(4, '0')}`,
        date: today,
        productCode: alert.productCode,
        productName: alert.productName,
        quantity: restockQuantity,
        supplier: alert.supplier || 'General Supplier',
        status: 'Created',
        createdBy: user?.name || 'Current User'
      };
    });

    const updatedStockData = savedStockData.map((item) => {
      const matchedAlert = selectedAlerts.find((alert) => alert.productCode === item.productCode);
      if (!matchedAlert) return item;

      const restockQuantity = Math.max(matchedAlert.maxStock - matchedAlert.currentStock, matchedAlert.minStock);
      return {
        ...item,
        currentStock: Number(item.currentStock) + restockQuantity,
        lastUpdated: today
      };
    });

    writeStoredData(INVENTORY_STOCK_KEY, updatedStockData);
    writeStoredData(STOCK_ALERT_PO_KEY, [...newPOs, ...existingPOs]);
    loadStockAlerts();
    toast.success(`Created ${selectedItems.length} purchase orders and updated stock levels.`);
    setSelectedItems([]);
  };

  // Send WhatsApp alert
  const handleSendWhatsAppAlert = () => {
    toast.success('Stock alert WhatsApp notification sent to administrators and suppliers!');
    // In real app, this would send actual WhatsApp notifications
  };

  // Manual refresh
  const handleManualRefresh = () => {
    loadStockAlerts();
    setLastRefresh(new Date());
    toast.success('Stock alerts refreshed successfully!');
  };

  // Format time ago
  const formatTimeAgo = (date) => {
    const seconds = Math.floor((new Date() - date) / 1000);
    const minutes = Math.floor(seconds / 60);
    
    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes} minute${minutes > 1 ? 's' : ''} ago`;
    
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours} hour${hours > 1 ? 's' : ''} ago`;
    
    const days = Math.floor(hours / 24);
    return `${days} day${days > 1 ? 's' : ''} ago`;
  };

  // Check permissions
  const canCreatePO = hasPermission(user?.role, 'inventory', 'create');
  const canSendEmail = hasPermission(user?.role, 'inventory', 'create') && 
                       (user?.role === 'superadmin' || user?.role === 'admin');

  // Table columns
  const columns = [
    {
      key: 'checkbox',
      label: (
        <input
          type="checkbox"
          checked={selectedItems.length === filteredAlerts.length && filteredAlerts.length > 0}
          onChange={handleSelectAll}
          className="w-4 h-4 text-primary bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600 rounded focus:ring-primary"
        />
      ),
      render: (row) => (
        <input
          type="checkbox"
          checked={selectedItems.includes(row.id)}
          onChange={() => handleCheckboxChange(row.id)}
          className="w-4 h-4 text-primary bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600 rounded focus:ring-primary"
        />
      )
    },
    {
      key: 'productCode',
      label: 'Product',
      render: (row) => (
        <div>
          <p className="font-semibold text-gray-900 dark:text-white">{row.productName}</p>
          <p className="text-xs font-mono text-gray-500 dark:text-gray-400">{row.productCode}</p>
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
        <div className="text-center">
          <p className={`text-xl font-bold ${
            row.currentStock === 0 ? 'text-red-600' :
            row.alertLevel === 'Critical' ? 'text-red-500' :
            'text-orange-500'
          }`}>
            {row.currentStock}
          </p>
          <p className="text-xs text-gray-500 dark:text-gray-400">{row.unit}</p>
        </div>
      )
    },
    {
      key: 'minStock',
      label: 'Min Stock',
      render: (row) => (
        <div className="text-center">
          <p className="font-semibold text-gray-700 dark:text-gray-300">{row.minStock}</p>
          <p className="text-xs text-gray-500 dark:text-gray-400">{row.unit}</p>
        </div>
      )
    },
    {
      key: 'status',
      label: 'Status',
      render: (row) => getAlertBadge(row.alertLevel)
    },
    {
      key: 'supplier',
      label: 'Supplier',
      render: (row) => (
        <div>
          <p className="font-medium text-gray-900 dark:text-white">{row.supplier}</p>
          <p className="text-xs text-gray-500 dark:text-gray-400">{row.supplierContact}</p>
        </div>
      )
    },
    {
      key: 'lastPurchaseDate',
      label: 'Last Purchase',
      render: (row) => (
        <span className="text-sm text-gray-600 dark:text-gray-400">
          {new Date(row.lastPurchaseDate).toLocaleDateString()}
        </span>
      )
    },
    {
      key: 'action',
      label: 'Action',
      render: (row) => (
        <Button
          variant="primary"
          size="sm"
          icon={<FaShoppingCart />}
          onClick={() => handleCreatePO(row)}
          disabled={!canCreatePO}
        >
          Create PO
        </Button>
      )
    }
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Stock Alerts</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            Monitor and manage low stock and out-of-stock items
          </p>
        </div>
        <div className="flex items-center space-x-3">
          <div className="flex items-center space-x-2 text-sm text-gray-600 dark:text-gray-400">
            <FaClock />
            <span>Last refresh: {formatTimeAgo(lastRefresh)}</span>
          </div>
          <Button
            variant="outline"
            size="sm"
            icon={<FaSync />}
            onClick={handleManualRefresh}
          >
            Refresh
          </Button>
        </div>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Total Alerts</p>
              <p className="text-3xl font-bold text-gray-900 dark:text-white">{counts.all}</p>
            </div>
            <div className="bg-blue-100 dark:bg-blue-900/30 p-3 rounded-lg">
              <FaExclamationTriangle className="text-3xl text-blue-600" />
            </div>
          </div>
        </Card>
        <Card>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Critical</p>
              <p className="text-3xl font-bold text-red-600">{counts.critical}</p>
            </div>
            <div className="bg-red-100 dark:bg-red-900/30 p-3 rounded-lg">
              <FaExclamationCircle className="text-3xl text-red-600" />
            </div>
          </div>
          <Badge variant="danger" className="mt-2">Immediate Action Required</Badge>
        </Card>
        <Card>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Low Stock</p>
              <p className="text-3xl font-bold text-orange-600">{counts.lowStock}</p>
            </div>
            <div className="bg-orange-100 dark:bg-orange-900/30 p-3 rounded-lg">
              <FaExclamationTriangle className="text-3xl text-orange-600" />
            </div>
          </div>
          <Badge variant="warning" className="mt-2">Reorder Soon</Badge>
        </Card>
        <Card>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Out of Stock</p>
              <p className="text-3xl font-bold text-red-700">{counts.outOfStock}</p>
            </div>
            <div className="bg-red-100 dark:bg-red-900/30 p-3 rounded-lg">
              <FaTimesCircle className="text-3xl text-red-700" />
            </div>
          </div>
          <Badge variant="danger" className="mt-2">Urgent</Badge>
        </Card>
      </div>

      {/* Auto-refresh indicator */}
      <div className="flex items-center justify-between bg-blue-50 dark:bg-blue-900/20 px-4 py-3 rounded-lg border border-blue-200 dark:border-blue-800">
        <div className="flex items-center space-x-3">
          <FaSync className={`text-blue-600 ${autoRefreshEnabled ? 'animate-spin-slow' : ''}`} />
          <div>
            <p className="text-sm font-medium text-gray-900 dark:text-white">
              Auto-refresh: {autoRefreshEnabled ? 'Enabled' : 'Disabled'}
            </p>
            <p className="text-xs text-gray-600 dark:text-gray-400">
              {autoRefreshEnabled ? 'Updates every 5 minutes' : 'Manual refresh only'}
            </p>
          </div>
        </div>
        <button
          onClick={() => setAutoRefreshEnabled(!autoRefreshEnabled)}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
            autoRefreshEnabled
              ? 'bg-blue-600 text-white hover:bg-blue-700'
              : 'bg-gray-300 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-400 dark:hover:bg-gray-600'
          }`}
        >
          {autoRefreshEnabled ? 'Disable' : 'Enable'}
        </button>
      </div>

      {/* Filter Tabs */}
      <div className="border-b border-gray-200 dark:border-gray-700">
        <nav className="-mb-px flex space-x-8">
          {[
            { key: 'All', label: 'All Alerts', count: counts.all, color: 'blue' },
            { key: 'Critical', label: 'Critical', count: counts.critical, color: 'red' },
            { key: 'Low Stock', label: 'Low Stock', count: counts.lowStock, color: 'orange' },
            { key: 'Out of Stock', label: 'Out of Stock', count: counts.outOfStock, color: 'red' }
          ].map((filter) => (
            <button
              key={filter.key}
              onClick={() => setActiveFilter(filter.key)}
              className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                activeFilter === filter.key
                  ? 'border-primary text-primary'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300'
              }`}
            >
              <div className="flex items-center space-x-2">
                <span>{filter.label}</span>
                <Badge 
                  variant={filter.color === 'blue' ? 'info' : filter.color === 'orange' ? 'warning' : 'danger'}
                  size="sm"
                >
                  {filter.count}
                </Badge>
              </div>
            </button>
          ))}
        </nav>
      </div>

      {/* Actions Bar */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center space-y-4 md:space-y-0">
        <SearchBar
          value={searchTerm}
          onChange={setSearchTerm}
          placeholder="Search alerts by product, code, or category..."
          className="w-full md:w-96"
        />
        
        <div className="flex flex-wrap gap-3">
          <Button
            variant="primary"
            icon={<FaShoppingCart />}
            onClick={handleBulkCreatePO}
            disabled={!canCreatePO || selectedItems.length === 0}
          >
            Create POs ({selectedItems.length})
          </Button>
          
          {canSendEmail && (
            <Button
              variant="danger"
              icon={<FaWhatsapp />}
              onClick={handleSendWhatsAppAlert}
            >
              Send WhatsApp Alert
            </Button>
          )}
        </div>
      </div>

      {/* Alerts Table */}
      <Card title={`${activeFilter} (${filteredAlerts.length} items)`}>
        <Table
          columns={columns}
          data={filteredAlerts}
          emptyMessage="No stock alerts found"
          getRowClassName={(row) => getRowClass(row.alertLevel)}
        />
      </Card>

      {/* Info Footer */}
      {selectedItems.length > 0 && (
        <div className="fixed bottom-6 left-1/2 transform -translate-x-1/2 bg-primary text-white px-6 py-4 rounded-lg shadow-2xl flex items-center space-x-4 z-50">
          <FaCheckSquare className="text-2xl" />
          <span className="font-medium">{selectedItems.length} item{selectedItems.length > 1 ? 's' : ''} selected</span>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setSelectedItems([])}
            className="bg-white text-primary hover:bg-gray-100"
          >
            Clear Selection
          </Button>
        </div>
      )}
    </div>
  );
};

export default StockAlerts;
