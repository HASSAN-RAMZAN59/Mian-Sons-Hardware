import React, { useState, useEffect } from 'react';
import { toast } from 'react-toastify';
import { 
  FaExclamationTriangle,
  FaPlus,
  FaFileExcel,
  FaFilePdf,
  FaTrash,
  FaBoxOpen,
  FaDollarSign,
  FaListAlt
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

const DamagedStock = () => {
  const { user } = useAuth();
  const [searchTerm, setSearchTerm] = useState('');
  const [damagedRecords, setDamagedRecords] = useState([]);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [formData, setFormData] = useState({
    product: '',
    quantity: '',
    damageReason: '',
    description: '',
    date: new Date().toISOString().split('T')[0],
    reportedBy: user?.name || '',
    actionTaken: 'Write-off'
  });

  // Initialize damaged stock records
  useEffect(() => {
    const sampleRecords = [
      {
        id: 1,
        date: '2026-03-10',
        productCode: 'PRD-002',
        productName: 'Asian Paint Interior (5L)',
        category: 'Paints & Chemicals',
        quantity: 5,
        unit: 'Gallon',
        damageReason: 'Water Damage',
        description: 'Leaked during storage due to roof leak',
        reportedBy: 'Manager User',
        estimatedLoss: 22500,
        actionTaken: 'Write-off',
        status: 'Completed'
      },
      {
        id: 2,
        date: '2026-03-08',
        productCode: 'PRD-001',
        productName: 'Makita Cordless Drill',
        category: 'Power Tools',
        quantity: 2,
        unit: 'Pcs',
        damageReason: 'Broken',
        description: 'Fell from shelf during inventory check',
        reportedBy: 'Admin User',
        estimatedLoss: 30000,
        actionTaken: 'Return to Supplier',
        status: 'Pending'
      },
      {
        id: 3,
        date: '2026-03-07',
        productCode: 'PRD-015',
        productName: 'Wire Cable 2.5mm',
        category: 'Electrical',
        quantity: 50,
        unit: 'Meters',
        damageReason: 'Expired',
        description: 'Insulation degraded beyond usable condition',
        reportedBy: 'Warehouse Staff',
        estimatedLoss: 5000,
        actionTaken: 'Write-off',
        status: 'Completed'
      },
      {
        id: 4,
        date: '2026-03-05',
        productCode: 'PRD-025',
        productName: 'Safety Gloves Pair',
        category: 'Safety Equipment',
        quantity: 20,
        unit: 'Pairs',
        damageReason: 'Theft',
        description: 'Missing from storage area after inventory',
        reportedBy: 'Security Officer',
        estimatedLoss: 6000,
        actionTaken: 'Write-off',
        status: 'Completed'
      },
      {
        id: 5,
        date: '2026-03-03',
        productCode: 'PRD-022',
        productName: 'Wood Varnish 1L',
        category: 'Paints & Chemicals',
        quantity: 8,
        unit: 'Liters',
        damageReason: 'Broken',
        description: 'Container damaged during transport',
        reportedBy: 'Delivery Staff',
        estimatedLoss: 12000,
        actionTaken: 'Return to Supplier',
        status: 'In Progress'
      },
      {
        id: 6,
        date: '2026-03-01',
        productCode: 'PRD-003',
        productName: 'LED Light 20W',
        category: 'Electrical',
        quantity: 15,
        unit: 'Pcs',
        damageReason: 'Broken',
        description: 'Manufacturing defect - not working',
        reportedBy: 'Quality Control',
        estimatedLoss: 5250,
        actionTaken: 'Return to Supplier',
        status: 'Completed'
      },
      {
        id: 7,
        date: '2026-02-28',
        productCode: 'PRD-037',
        productName: 'Circuit Breaker 15A',
        category: 'Electrical',
        quantity: 3,
        unit: 'Pcs',
        damageReason: 'Other',
        description: 'Customer return - faulty product',
        reportedBy: 'Sales Counter',
        estimatedLoss: 2400,
        actionTaken: 'Repair',
        status: 'In Progress'
      },
      {
        id: 8,
        date: '2026-02-25',
        productCode: 'PRD-034',
        productName: 'PVC Elbow Joint',
        category: 'Plumbing & Pipes',
        quantity: 30,
        unit: 'Pcs',
        damageReason: 'Broken',
        description: 'Crushed in storage area',
        reportedBy: 'Warehouse Manager',
        estimatedLoss: 3600,
        actionTaken: 'Write-off',
        status: 'Completed'
      },
      {
        id: 9,
        date: '2026-02-22',
        productCode: 'PRD-005',
        productName: 'Cement Bag 50kg',
        category: 'Cement & Construction',
        quantity: 10,
        unit: 'Bags',
        damageReason: 'Water Damage',
        description: 'Got wet during rainy season',
        reportedBy: 'Warehouse Staff',
        estimatedLoss: 6500,
        actionTaken: 'Write-off',
        status: 'Completed'
      },
      {
        id: 10,
        date: '2026-02-20',
        productCode: 'PRD-031',
        productName: 'Masking Tape Roll',
        category: 'Paints & Chemicals',
        quantity: 12,
        unit: 'Rolls',
        damageReason: 'Expired',
        description: 'Adhesive lost effectiveness',
        reportedBy: 'Store Keeper',
        estimatedLoss: 1800,
        actionTaken: 'Write-off',
        status: 'Completed'
      }
    ];

    setDamagedRecords(sampleRecords);
  }, []);

  // Filter records
  const filteredRecords = damagedRecords.filter(record => 
    record.productName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    record.productCode.toLowerCase().includes(searchTerm.toLowerCase()) ||
    record.category.toLowerCase().includes(searchTerm.toLowerCase()) ||
    record.damageReason.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Calculate summary statistics
  const summary = {
    totalRecords: damagedRecords.length,
    totalQuantityLost: damagedRecords.reduce((sum, record) => sum + record.quantity, 0),
    totalValueLost: damagedRecords.reduce((sum, record) => sum + record.estimatedLoss, 0)
  };

  // Handle form input change
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  // Reset form
  const resetForm = () => {
    setFormData({
      product: '',
      quantity: '',
      damageReason: '',
      description: '',
      date: new Date().toISOString().split('T')[0],
      reportedBy: user?.name || '',
      actionTaken: 'Write-off'
    });
  };

  // Add damaged stock record
  const handleAddDamagedStock = () => {
    if (!formData.product || !formData.quantity || !formData.damageReason) {
      toast.error('Please fill all required fields');
      return;
    }

    // In real app, this would calculate estimated loss based on product price
    const estimatedLoss = parseInt(formData.quantity) * 500; // Mock calculation

    const newRecord = {
      id: damagedRecords.length + 1,
      date: formData.date,
      productCode: 'PRD-' + String(damagedRecords.length + 1).padStart(3, '0'),
      productName: formData.product,
      category: 'General', // In real app, this would be fetched from product data
      quantity: parseInt(formData.quantity),
      unit: 'Pcs',
      damageReason: formData.damageReason,
      description: formData.description,
      reportedBy: formData.reportedBy,
      estimatedLoss: estimatedLoss,
      actionTaken: formData.actionTaken,
      status: 'Pending'
    };

    setDamagedRecords([newRecord, ...damagedRecords]);
    toast.success('Damaged stock record added successfully!');
    setIsAddModalOpen(false);
    resetForm();
  };

  // Export to Excel
  const handleExportExcel = () => {
    toast.success('Exporting damaged stock report to Excel...');
    // In real app, this would generate and download Excel file
  };

  // Export to PDF
  const handleExportPDF = () => {
    toast.success('Exporting damaged stock report to PDF...');
    // In real app, this would generate and download PDF file
  };

  // Get status badge
  const getStatusBadge = (status) => {
    switch (status) {
      case 'Completed':
        return <Badge variant="success">Completed</Badge>;
      case 'Pending':
        return <Badge variant="warning">Pending</Badge>;
      case 'In Progress':
        return <Badge variant="info">In Progress</Badge>;
      default:
        return <Badge variant="default">{status}</Badge>;
    }
  };

  // Get action badge
  const getActionBadge = (action) => {
    switch (action) {
      case 'Write-off':
        return <Badge variant="danger">Write-off</Badge>;
      case 'Return to Supplier':
        return <Badge variant="warning">Return to Supplier</Badge>;
      case 'Repair':
        return <Badge variant="info">Repair</Badge>;
      default:
        return <Badge variant="default">{action}</Badge>;
    }
  };

  // Check permissions
  const canAdd = hasPermission(user?.role, 'inventory', 'create');

  // Product options (in real app, this would come from products API)
  const productOptions = [
    { value: 'Makita Cordless Drill', label: 'Makita Cordless Drill (PRD-001)' },
    { value: 'Asian Paint Interior (5L)', label: 'Asian Paint Interior (PRD-002)' },
    { value: 'LED Light 20W', label: 'LED Light 20W (PRD-003)' },
    { value: 'PVC Pipe 2 inch', label: 'PVC Pipe 2 inch (PRD-004)' },
    { value: 'Cement Bag 50kg', label: 'Cement Bag 50kg (PRD-005)' },
    { value: 'Safety Helmet', label: 'Safety Helmet (PRD-006)' },
    { value: 'Door Lock Set', label: 'Door Lock Set (PRD-007)' }
  ];

  // Table columns
  const columns = [
    {
      key: 'id',
      label: 'ID',
      render: (row) => (
        <span className="font-mono font-semibold text-gray-900 dark:text-white">
          DMG-{String(row.id).padStart(3, '0')}
        </span>
      )
    },
    {
      key: 'date',
      label: 'Date',
      render: (row) => (
        <span className="text-sm text-gray-600 dark:text-gray-400">
          {new Date(row.date).toLocaleDateString()}
        </span>
      )
    },
    {
      key: 'product',
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
      key: 'quantity',
      label: 'Quantity',
      render: (row) => (
        <div className="text-center">
          <p className="text-lg font-bold text-red-600">{row.quantity}</p>
          <p className="text-xs text-gray-500 dark:text-gray-400">{row.unit}</p>
        </div>
      )
    },
    {
      key: 'damageReason',
      label: 'Damage Reason',
      render: (row) => (
        <div className="flex items-center space-x-2">
          <FaExclamationTriangle className="text-orange-500" />
          <span className="font-medium text-gray-900 dark:text-white">{row.damageReason}</span>
        </div>
      )
    },
    {
      key: 'reportedBy',
      label: 'Reported By',
      render: (row) => (
        <span className="text-gray-700 dark:text-gray-300">{row.reportedBy}</span>
      )
    },
    {
      key: 'estimatedLoss',
      label: 'Estimated Loss',
      render: (row) => (
        <span className="font-bold text-red-600">
          Rs. {row.estimatedLoss.toLocaleString()}
        </span>
      )
    },
    {
      key: 'actionTaken',
      label: 'Action Taken',
      render: (row) => getActionBadge(row.actionTaken)
    },
    {
      key: 'status',
      label: 'Status',
      render: (row) => getStatusBadge(row.status)
    }
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Damaged Stock</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            Track and manage damaged inventory items
          </p>
        </div>
        <div className="flex space-x-3">
          {canAdd && (
            <Button 
              variant="primary" 
              icon={<FaPlus />}
              onClick={() => {
                resetForm();
                setIsAddModalOpen(true);
              }}
            >
              Add Damaged Stock
            </Button>
          )}
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Total Records</p>
              <p className="text-3xl font-bold text-gray-900 dark:text-white">{summary.totalRecords}</p>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Damage incidents</p>
            </div>
            <div className="bg-blue-100 dark:bg-blue-900/30 p-3 rounded-lg">
              <FaListAlt className="text-3xl text-blue-600" />
            </div>
          </div>
        </Card>
        <Card>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Total Quantity Lost</p>
              <p className="text-3xl font-bold text-orange-600">{summary.totalQuantityLost}</p>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Units damaged</p>
            </div>
            <div className="bg-orange-100 dark:bg-orange-900/30 p-3 rounded-lg">
              <FaBoxOpen className="text-3xl text-orange-600" />
            </div>
          </div>
        </Card>
        <Card>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Total Value Lost</p>
              <p className="text-3xl font-bold text-red-600">
                Rs. {(summary.totalValueLost / 1000).toFixed(0)}K
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Financial impact</p>
            </div>
            <div className="bg-red-100 dark:bg-red-900/30 p-3 rounded-lg">
              <FaDollarSign className="text-3xl text-red-600" />
            </div>
          </div>
        </Card>
      </div>

      {/* Search and Export */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center space-y-4 md:space-y-0">
        <SearchBar
          value={searchTerm}
          onChange={setSearchTerm}
          placeholder="Search by product, category, or reason..."
          className="w-full md:w-96"
        />
        
        <div className="flex space-x-3">
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
      </div>

      {/* Damaged Stock Table */}
      <Card title={`Damaged Stock Records (${filteredRecords.length} items)`}>
        <Table
          columns={columns}
          data={filteredRecords}
          emptyMessage="No damaged stock records found"
        />
      </Card>

      {/* Add Damaged Stock Modal */}
      <Modal
        isOpen={isAddModalOpen}
        onClose={() => {
          setIsAddModalOpen(false);
          resetForm();
        }}
        title="Add Damaged Stock Record"
        size="lg"
        footer={
          <div className="flex justify-end space-x-3">
            <Button
              variant="outline"
              onClick={() => {
                setIsAddModalOpen(false);
                resetForm();
              }}
            >
              Cancel
            </Button>
            <Button
              variant="primary"
              onClick={handleAddDamagedStock}
            >
              Add Record
            </Button>
          </div>
        }
      >
        <div className="space-y-4">
          <Select
            label="Product"
            name="product"
            value={formData.product}
            onChange={handleInputChange}
            options={productOptions}
            placeholder="Select product"
            required
          />

          <Input
            label="Quantity Damaged"
            name="quantity"
            type="number"
            value={formData.quantity}
            onChange={handleInputChange}
            placeholder="Enter quantity"
            required
            min="1"
          />

          <Select
            label="Damage Reason"
            name="damageReason"
            value={formData.damageReason}
            onChange={handleInputChange}
            options={[
              { value: 'Broken', label: 'Broken' },
              { value: 'Expired', label: 'Expired' },
              { value: 'Water Damage', label: 'Water Damage' },
              { value: 'Theft', label: 'Theft' },
              { value: 'Other', label: 'Other' }
            ]}
            placeholder="Select damage reason"
            required
          />

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Description / Notes <span className="text-red-500">*</span>
            </label>
            <textarea
              name="description"
              value={formData.description}
              onChange={handleInputChange}
              placeholder="Describe the damage in detail..."
              rows="4"
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-primary"
              required
            />
          </div>

          <Input
            label="Date"
            name="date"
            type="date"
            value={formData.date}
            onChange={handleInputChange}
            required
          />

          <Input
            label="Reported By"
            name="reportedBy"
            value={formData.reportedBy}
            onChange={handleInputChange}
            placeholder="Enter reporter name"
            required
          />

          <Select
            label="Action Taken"
            name="actionTaken"
            value={formData.actionTaken}
            onChange={handleInputChange}
            options={[
              { value: 'Write-off', label: 'Write-off' },
              { value: 'Return to Supplier', label: 'Return to Supplier' },
              { value: 'Repair', label: 'Repair' }
            ]}
            required
          />

          {/* Preview of estimated loss */}
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Estimated Loss</p>
                <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">
                  Calculated based on purchase price
                </p>
              </div>
              <p className="text-2xl font-bold text-red-600">
                Rs. {formData.quantity ? (parseInt(formData.quantity) * 500).toLocaleString() : '0'}
              </p>
            </div>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default DamagedStock;
