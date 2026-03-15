import React, { useEffect, useState } from 'react';
import { toast } from 'react-toastify';
import { FaPlus, FaEdit, FaTrash, FaSearch, FaFileExcel, FaExclamationTriangle } from 'react-icons/fa';
import Card from '../../components/common/Card';
import Button from '../../components/common/Button';
import Table from '../../components/common/Table';
import Badge from '../../components/common/Badge';
import Input from '../../components/common/Input';
import Modal from '../../components/common/Modal';
import Select from '../../components/common/Select';
import { useAuth } from '../../context/AuthContext';
import { productsData } from '../../data/productsData';
import { hasPermission } from '../../utils/permissions';

const DAMAGED_STOCK_KEY = 'admin_damaged_stock';
const INVENTORY_STOCK_KEY = 'admin_inventory_stock';

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
      currentStock,
      minStock,
      maxStock,
      purchasePrice: Number(product.purchasePrice || 0),
      unit: product.unit || 'Piece',
      lastUpdated: today
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

const DamagedStock = () => {
  const { user } = useAuth();
  const [searchTerm, setSearchTerm] = useState('');
  const [damagedItems, setDamagedItems] = useState([]);
  const [inventoryStock, setInventoryStock] = useState([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [formData, setFormData] = useState({
    product: '',
    sku: '',
    quantity: '',
    reason: '',
    date: new Date().toISOString().split('T')[0],
    status: 'pending',
    notes: ''
  });

  useEffect(() => {
    const stockRows = readStoredData(INVENTORY_STOCK_KEY, buildDefaultStockData());
    setInventoryStock(stockRows);
    setDamagedItems(readStoredData(DAMAGED_STOCK_KEY));
  }, []);

  useEffect(() => {
    localStorage.setItem(DAMAGED_STOCK_KEY, JSON.stringify(damagedItems));
  }, [damagedItems]);

  const formatCurrency = (value) => `Rs. ${Number(value || 0).toLocaleString()}`;

  const resetForm = () => {
    setFormData({
      product: '',
      sku: '',
      quantity: '',
      reason: '',
      date: new Date().toISOString().split('T')[0],
      status: 'pending',
      notes: ''
    });
    setEditingItem(null);
  };

  const openCreateModal = () => {
    resetForm();
    setIsModalOpen(true);
  };

  const openEditModal = (item) => {
    setEditingItem(item);
    setFormData({
      product: item.product,
      sku: item.sku,
      quantity: item.quantity,
      reason: item.reason,
      date: item.date,
      status: item.status,
      notes: item.notes || ''
    });
    setIsModalOpen(true);
  };

  const handleFormChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => {
      const nextForm = { ...prev, [name]: value };
      if (name === 'product') {
        const selectedStockItem = inventoryStock.find((item) => item.productName === value);
        if (selectedStockItem) {
          nextForm.sku = selectedStockItem.productCode;
        }
      }
      return nextForm;
    });
  };

  const handleSave = () => {
    if (!editingItem && !canCreate) {
      toast.error('You do not have permission to report damaged stock');
      return;
    }

    if (editingItem && !canEdit) {
      toast.error('You do not have permission to edit damaged stock');
      return;
    }

    if (!formData.product || !formData.quantity || !formData.reason || !formData.date) {
      toast.error('Please fill all required fields');
      return;
    }

    const quantity = parseInt(formData.quantity, 10);
    if (Number.isNaN(quantity) || quantity <= 0) {
      toast.error('Please enter a valid quantity');
      return;
    }

    const stockItem = inventoryStock.find((item) => item.productName === formData.product);
    if (!stockItem) {
      toast.error('Selected product is not available in inventory');
      return;
    }

    const unitPrice = stockItem?.purchasePrice || 0;
    const valueLost = quantity * unitPrice;

    if (editingItem) {
      const previousQuantity = Number(editingItem.quantity || 0);
      const previousProduct = editingItem.product;

      const stockRestored = inventoryStock.map((item) => {
        if (item.productName !== previousProduct) return item;
        return { ...item, currentStock: Number(item.currentStock || 0) + previousQuantity };
      });

      const currentProductStock = stockRestored.find((item) => item.productName === formData.product);
      if (!currentProductStock || Number(currentProductStock.currentStock || 0) < quantity) {
        toast.error(`Only ${currentProductStock?.currentStock || 0} units are available`);
        return;
      }

      const updatedInventory = stockRestored.map((item) => {
        if (item.productName !== formData.product) return item;
        return {
          ...item,
          currentStock: Math.max(0, Number(item.currentStock || 0) - quantity),
          lastUpdated: formData.date
        };
      });

      setInventoryStock(updatedInventory);
      localStorage.setItem(INVENTORY_STOCK_KEY, JSON.stringify(updatedInventory));

      const updatedItems = damagedItems.map((item) =>
        item.id === editingItem.id
          ? {
              ...item,
              ...formData,
              quantity,
              valueLost
            }
          : item
      );
      setDamagedItems(updatedItems);
      toast.success('Damaged stock record updated successfully');
    } else {
      if (Number(stockItem.currentStock || 0) < quantity) {
        toast.error(`Only ${stockItem.currentStock} units are available`);
        return;
      }

      const updatedInventory = inventoryStock.map((item) => {
        if (item.productName !== formData.product) return item;
        return {
          ...item,
          currentStock: Math.max(0, Number(item.currentStock || 0) - quantity),
          lastUpdated: formData.date
        };
      });

      setInventoryStock(updatedInventory);
      localStorage.setItem(INVENTORY_STOCK_KEY, JSON.stringify(updatedInventory));

      const nextId = damagedItems.length
        ? Math.max(...damagedItems.map((item) => Number(item.id) || 0)) + 1
        : 1;
      const newItem = {
        id: nextId,
        ...formData,
        quantity,
        valueLost
      };
      setDamagedItems([newItem, ...damagedItems]);
      toast.success('Damaged stock reported successfully');
    }

    setIsModalOpen(false);
    resetForm();
  };

  const handleDelete = (id) => {
    if (!canDelete) {
      toast.error('You do not have permission to delete damaged stock records');
      return;
    }

    const deletedItem = damagedItems.find((item) => item.id === id);
    if (deletedItem) {
      const restoredInventory = inventoryStock.map((item) => {
        if (item.productName !== deletedItem.product) return item;
        return {
          ...item,
          currentStock: Number(item.currentStock || 0) + Number(deletedItem.quantity || 0),
          lastUpdated: new Date().toISOString().split('T')[0]
        };
      });

      setInventoryStock(restoredInventory);
      localStorage.setItem(INVENTORY_STOCK_KEY, JSON.stringify(restoredInventory));
    }

    setDamagedItems((prev) => prev.filter((item) => item.id !== id));
    toast.success('Damaged stock record deleted');
  };

  const handleExport = () => {
    if (!canExport) {
      toast.error('You do not have permission to export damaged stock records');
      return;
    }

    if (!damagedItems.length) {
      toast.error('No damaged stock records to export');
      return;
    }

    const headers = ['ID', 'Product', 'SKU', 'Quantity', 'Reason', 'Date', 'ValueLost', 'Status', 'Notes'];
    const rows = damagedItems.map((item) => [
      item.id,
      item.product,
      item.sku,
      item.quantity,
      item.reason,
      item.date,
      item.valueLost,
      item.status,
      item.notes || ''
    ]);
    const csvContent = [headers, ...rows]
      .map((row) => row.map((cell) => `"${String(cell ?? '').replace(/"/g, '""')}"`).join(','))
      .join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `damaged-stock-${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    toast.success('Damaged stock report exported successfully');
  };

  const columns = [
    { key: 'product', label: 'Product' },
    { key: 'sku', label: 'SKU' },
    { 
      key: 'quantity', 
      label: 'Quantity',
      render: (row) => <span className="font-semibold text-red-600">{row.quantity}</span>
    },
    { key: 'reason', label: 'Reason' },
    { key: 'date', label: 'Date' },
    {
      key: 'valueLost',
      label: 'Value Lost',
      render: (row) => formatCurrency(row.valueLost)
    },
    { 
      key: 'status', 
      label: 'Status',
      render: (row) => {
        const variants = {
          pending: 'warning',
          approved: 'success',
          rejected: 'danger'
        };
        return <Badge variant={variants[row.status]}>{row.status}</Badge>;
      }
    },
    { 
      key: 'actions', 
      label: 'Actions',
      render: (row) => (
        <div className="flex gap-2">
          {canEdit && (
            <Button size="sm" variant="secondary" onClick={() => openEditModal(row)}>
              <FaEdit />
            </Button>
          )}
          {canDelete && (
            <Button size="sm" variant="danger" onClick={() => handleDelete(row.id)}>
              <FaTrash />
            </Button>
          )}
        </div>
      )
    },
  ];

  const filteredItems = damagedItems.filter(item =>
    String(item.product || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
    String(item.sku || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
    String(item.reason || '').toLowerCase().includes(searchTerm.toLowerCase())
  );

  const totalValue = damagedItems.reduce((sum, item) => sum + Number(item.valueLost || 0), 0);

  const canCreate = hasPermission(user?.role, 'damaged_stock', 'create');
  const canEdit = hasPermission(user?.role, 'damaged_stock', 'edit');
  const canDelete = hasPermission(user?.role, 'damaged_stock', 'delete');
  const canExport = hasPermission(user?.role, 'damaged_stock', 'export');

  const productOptions = inventoryStock.map((item) => ({
    value: item.productName,
    label: `${item.productName} (${item.productCode})`
  }));

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold text-gray-800 dark:text-white">Damaged Stock</h1>
        <div className="flex gap-3">
          <Button variant="secondary" onClick={handleExport} disabled={!canExport}>
            <FaFileExcel className="mr-2" /> Export
          </Button>
          {canCreate && (
            <Button onClick={openCreateModal}>
              <FaPlus className="mr-2" /> Report Damage
            </Button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card title="Total Damaged Items" value={damagedItems.length} icon={FaExclamationTriangle} color="red" />
        <Card title="Pending Approvals" value={damagedItems.filter(i => i.status === 'pending').length} icon={FaExclamationTriangle} color="orange" />
        <Card title="Total Value Lost" value={`Rs. ${totalValue.toLocaleString()}`} icon={FaExclamationTriangle} color="red" />
      </div>

      <Card>
        <div className="mb-4">
          <Input
            icon={FaSearch}
            placeholder="Search damaged items..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <Table columns={columns} data={filteredItems} />
      </Card>

      <Modal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          resetForm();
        }}
        title={editingItem ? 'Edit Damaged Stock' : 'Report Damaged Stock'}
        size="lg"
        footer={
          <div className="flex justify-end space-x-3">
            <Button
              variant="outline"
              onClick={() => {
                setIsModalOpen(false);
                resetForm();
              }}
            >
              Cancel
            </Button>
            <Button variant="primary" onClick={handleSave}>
              {editingItem ? 'Update Record' : 'Save Record'}
            </Button>
          </div>
        }
      >
        <div className="space-y-4">
          <Select
            label="Product"
            name="product"
            value={formData.product}
            onChange={handleFormChange}
            options={productOptions}
            placeholder="Select product"
            required
          />

          <Input
            label="SKU"
            name="sku"
            value={formData.sku}
            onChange={handleFormChange}
            placeholder="Auto-filled from selected product"
            readOnly
          />

          <Input
            label="Quantity"
            name="quantity"
            type="number"
            value={formData.quantity}
            onChange={handleFormChange}
            min="1"
            required
          />

          <Select
            label="Reason"
            name="reason"
            value={formData.reason}
            onChange={handleFormChange}
            options={[
              { value: 'Water Damage', label: 'Water Damage' },
              { value: 'Expired', label: 'Expired' },
              { value: 'Manufacturing Defect', label: 'Manufacturing Defect' },
              { value: 'Broken in Transit', label: 'Broken in Transit' },
              { value: 'Handling Damage', label: 'Handling Damage' },
              { value: 'Other', label: 'Other' }
            ]}
            placeholder="Select reason"
            required
          />

          <Input
            label="Date"
            name="date"
            type="date"
            value={formData.date}
            onChange={handleFormChange}
            required
          />

          <Select
            label="Status"
            name="status"
            value={formData.status}
            onChange={handleFormChange}
            options={[
              { value: 'pending', label: 'Pending' },
              { value: 'approved', label: 'Approved' },
              { value: 'rejected', label: 'Rejected' }
            ]}
            required
          />

          <Input
            label="Notes"
            name="notes"
            value={formData.notes}
            onChange={handleFormChange}
            placeholder="Optional notes"
          />
        </div>
      </Modal>
    </div>
  );
};

export default DamagedStock;
