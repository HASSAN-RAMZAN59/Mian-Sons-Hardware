import React, { useState, useEffect, useRef } from 'react';
import { toast } from 'react-toastify';
import { FaPlus, FaEdit, FaTrash, FaEye, FaFileExcel, FaFileUpload, FaBoxOpen } from 'react-icons/fa';
import * as XLSX from 'xlsx';
import { useAuth } from '../../context/AuthContext';
import { hasPermission } from '../../utils/permissions';
import { handleImageError } from '../../utils/helpers';
import productsData from '../../data/productsData';
import Card from '../../components/common/Card';
import Table from '../../components/common/Table';
import Button from '../../components/common/Button';
import SearchBar from '../../components/common/SearchBar';
import Modal from '../../components/common/Modal';
import Input from '../../components/common/Input';
import Select from '../../components/common/Select';
import Badge from '../../components/common/Badge';
import ConfirmDialog from '../../components/common/ConfirmDialog';

const Products = () => {
  const { user } = useAuth();
  const importInputRef = useRef(null);
  const [products, setProducts] = useState([]);
  const [filteredProducts, setFilteredProducts] = useState([]);
  const [search, setSearch] = useState('');
  const [selectedProducts, setSelectedProducts] = useState([]);
  
  // Filters
  const [filters, setFilters] = useState({
    category: '',
    brand: '',
    status: '',
    stockStatus: ''
  });

  // Modals
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isBulkDeleteDialogOpen, setIsBulkDeleteDialogOpen] = useState(false);
  
  // Selected data
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    code: '',
    category: '',
    brand: '',
    model: '',
    description: '',
    purchasePrice: '',
    salePrice: '',
    wholesalePrice: '',
    minStock: '',
    currentStock: '',
    unit: 'Piece',
    supplier: '',
    branch: '',
    image: '',
    warrantyPeriod: '',
    status: 'Active'
  });

  const categories = Array.from(new Set(productsData.map((product) => product.category)))
    .filter(Boolean)
    .map((category) => ({ value: category, label: category }));

  const brands = Array.from(new Set(productsData.map((product) => product.company)))
    .filter(Boolean)
    .map((brand) => ({ value: brand, label: brand }));

  const suppliers = Array.from(new Set(productsData.map((product) => product.company)))
    .filter(Boolean)
    .map((company) => ({ value: `${company} Supplies`, label: `${company} Supplies` }));

  const branches = [
    { value: 'Main Branch - Gulberg', label: 'Main Branch - Gulberg' },
    { value: 'Branch 2 - DHA', label: 'Branch 2 - DHA' },
    { value: 'Branch 3 - Johar Town', label: 'Branch 3 - Johar Town' }
  ];

  const units = [
    { value: 'Piece', label: 'Piece' },
    { value: 'Kg', label: 'Kilogram' },
    { value: 'Meter', label: 'Meter' },
    { value: 'Box', label: 'Box' },
    { value: 'Liter', label: 'Liter' },
    { value: 'Pack', label: 'Pack' }
  ];

  // Load products from catalog data (37 hardware products)
  useEffect(() => {
    const mappedProducts = productsData.map((product) => {
      const currentStock = Number(product.stockQty ?? product.stock ?? 0);
      const minStock = Number(product.minStock ?? 5);
      const name = product.size ? `${product.name} - ${product.size}` : product.name;

      return {
        id: Number(product.id),
        code: `PRD-${String(product.id).padStart(3, '0')}`,
        name,
        category: product.category,
        brand: product.company,
        model: product.type || product.name,
        description: product.description || `${name} (${product.category})`,
        purchasePrice: Number(product.purchasePrice ?? 0),
        salePrice: Number(product.salePrice ?? product.price ?? 0),
        wholesalePrice: Number((Number(product.salePrice ?? product.price ?? 0) * 0.95).toFixed(2)),
        currentStock,
        minStock,
        unit: product.unit || 'Piece',
        supplier: `${product.company} Supplies`,
        branch: 'Main Branch - Gulberg',
        image: product.images?.[0] || '',
        warrantyPeriod: Number(product.warrantyPeriod ?? 0),
        status: currentStock > 0 ? 'Active' : 'Inactive'
      };
    });

    setProducts(mappedProducts);
    setFilteredProducts(mappedProducts);
  }, []);

  // Filter and search products
  useEffect(() => {
    let result = products;

    // Search
    if (search) {
      result = result.filter(p => 
        p.name.toLowerCase().includes(search.toLowerCase()) ||
        p.code.toLowerCase().includes(search.toLowerCase()) ||
        p.brand.toLowerCase().includes(search.toLowerCase())
      );
    }

    // Category filter
    if (filters.category) {
      result = result.filter(p => p.category === filters.category);
    }

    // Brand filter
    if (filters.brand) {
      result = result.filter(p => p.brand === filters.brand);
    }

    // Status filter
    if (filters.status) {
      result = result.filter(p => p.status === filters.status);
    }

    // Stock status filter
    if (filters.stockStatus) {
      result = result.filter(p => {
        if (filters.stockStatus === 'Out of Stock') return p.currentStock === 0;
        if (filters.stockStatus === 'Low Stock') return p.currentStock > 0 && p.currentStock < p.minStock;
        if (filters.stockStatus === 'In Stock') return p.currentStock >= p.minStock;
        return true;
      });
    }

    setFilteredProducts(result);
  }, [search, filters, products]);

  // Form handlers
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const resetForm = () => {
    setFormData({
      name: '',
      code: '',
      category: '',
      brand: '',
      model: '',
      description: '',
      purchasePrice: '',
      salePrice: '',
      wholesalePrice: '',
      minStock: '',
      currentStock: '',
      unit: 'Piece',
      supplier: '',
      branch: '',
      image: '',
      warrantyPeriod: '',
      status: 'Active'
    });
  };

  // Auto-generate product code
  const generateProductCode = () => {
    const code = `PRD-${String(products.length + 1).padStart(3, '0')}`;
    setFormData(prev => ({ ...prev, code }));
  };

  // Add product
  const handleAddProduct = () => {
    if (!formData.name || !formData.category || !formData.salePrice) {
      toast.error('Please fill all required fields');
      return;
    }

    const newProduct = {
      id: products.length + 1,
      ...formData,
      purchasePrice: parseFloat(formData.purchasePrice) || 0,
      salePrice: parseFloat(formData.salePrice) || 0,
      wholesalePrice: parseFloat(formData.wholesalePrice) || 0,
      currentStock: parseInt(formData.currentStock) || 0,
      minStock: parseInt(formData.minStock) || 0,
      warrantyPeriod: parseInt(formData.warrantyPeriod) || 0
    };

    setProducts([...products, newProduct]);
    toast.success('Product added successfully!');
    setIsAddModalOpen(false);
    resetForm();
  };

  // Edit product
  const handleEditProduct = () => {
    if (!formData.name || !formData.category || !formData.salePrice) {
      toast.error('Please fill all required fields');
      return;
    }

    const updatedProducts = products.map(p => 
      p.id === selectedProduct.id 
        ? {
            ...p,
            ...formData,
            purchasePrice: parseFloat(formData.purchasePrice) || 0,
            salePrice: parseFloat(formData.salePrice) || 0,
            wholesalePrice: parseFloat(formData.wholesalePrice) || 0,
            currentStock: parseInt(formData.currentStock) || 0,
            minStock: parseInt(formData.minStock) || 0,
            warrantyPeriod: parseInt(formData.warrantyPeriod) || 0
          }
        : p
    );

    setProducts(updatedProducts);
    toast.success('Product updated successfully!');
    setIsEditModalOpen(false);
    setSelectedProduct(null);
    resetForm();
  };

  // Delete product
  const handleDeleteProduct = () => {
    setProducts(products.filter(p => p.id !== selectedProduct.id));
    toast.success('Product deleted successfully!');
    setIsDeleteDialogOpen(false);
    setSelectedProduct(null);
  };

  // Bulk delete
  const handleBulkDelete = () => {
    setProducts(products.filter(p => !selectedProducts.includes(p.id)));
    toast.success(`${selectedProducts.length} products deleted successfully!`);
    setIsBulkDeleteDialogOpen(false);
    setSelectedProducts([]);
  };

  // Open edit modal
  const openEditModal = (product) => {
    setSelectedProduct(product);
    setFormData({ ...product });
    setIsEditModalOpen(true);
  };

  // Open detail modal
  const openDetailModal = (product) => {
    setSelectedProduct(product);
    setIsDetailModalOpen(true);
  };

  // Open delete dialog
  const openDeleteDialog = (product) => {
    setSelectedProduct(product);
    setIsDeleteDialogOpen(true);
  };

  // Bulk select
  const handleSelectAll = (e) => {
    if (e.target.checked) {
      setSelectedProducts(filteredProducts.map(p => p.id));
    } else {
      setSelectedProducts([]);
    }
  };

  const handleSelectProduct = (productId) => {
    if (selectedProducts.includes(productId)) {
      setSelectedProducts(selectedProducts.filter(id => id !== productId));
    } else {
      setSelectedProducts([...selectedProducts, productId]);
    }
  };

  // Export to Excel
  const handleExportExcel = () => {
    try {
      const exportRows = products.map((product) => ({
        id: product.id,
        code: product.code,
        name: product.name,
        category: product.category,
        brand: product.brand,
        model: product.model,
        purchasePrice: Number(product.purchasePrice || 0),
        salePrice: Number(product.salePrice || 0),
        wholesalePrice: Number(product.wholesalePrice || 0),
        currentStock: Number(product.currentStock || 0),
        minStock: Number(product.minStock || 0),
        unit: product.unit,
        supplier: product.supplier,
        branch: product.branch,
        status: product.status,
        warrantyPeriod: Number(product.warrantyPeriod || 0),
        description: product.description,
        image: product.image
      }));

      const worksheet = XLSX.utils.json_to_sheet(exportRows);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, 'Products');

      const dateTag = new Date().toISOString().slice(0, 10);
      XLSX.writeFile(workbook, `products-export-${dateTag}.xlsx`);
      toast.success('Products exported to Excel successfully.');
    } catch {
      toast.error('Unable to export Excel file.');
    }
  };

  // Import from Excel
  const handleImportExcel = () => {
    importInputRef.current?.click();
  };

  const handleImportFileChange = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      const fileBuffer = await file.arrayBuffer();
      const workbook = XLSX.read(fileBuffer, { type: 'array' });
      const firstSheetName = workbook.SheetNames[0];

      if (!firstSheetName) {
        toast.error('No worksheet found in uploaded file.');
        return;
      }

      const worksheet = workbook.Sheets[firstSheetName];
      const rows = XLSX.utils.sheet_to_json(worksheet, { defval: '' });

      if (!rows.length) {
        toast.error('Excel file is empty.');
        return;
      }

      const toNumber = (value, fallback = 0) => {
        const parsed = Number(value);
        return Number.isFinite(parsed) ? parsed : fallback;
      };

      const mapped = rows
        .map((row, index) => {
          const id = toNumber(row.id || row.ID || index + 1, index + 1);
          const name = String(row.name || row.Name || '').trim();
          const category = String(row.category || row.Category || '').trim();
          const salePrice = toNumber(row.salePrice || row.SalePrice || row['Sale Price']);

          if (!name || !category || salePrice <= 0) {
            return null;
          }

          return {
            id,
            code: String(row.code || row.Code || `PRD-${String(id).padStart(3, '0')}`),
            name,
            category,
            brand: String(row.brand || row.Brand || 'Local'),
            model: String(row.model || row.Model || name),
            description: String(row.description || row.Description || ''),
            purchasePrice: toNumber(row.purchasePrice || row.PurchasePrice || row['Purchase Price']),
            salePrice,
            wholesalePrice: toNumber(
              row.wholesalePrice || row.WholesalePrice || row['Wholesale Price'],
              Number((salePrice * 0.95).toFixed(2))
            ),
            minStock: toNumber(row.minStock || row.MinStock || row['Min Stock'], 5),
            currentStock: toNumber(row.currentStock || row.CurrentStock || row['Current Stock']),
            unit: String(row.unit || row.Unit || 'Piece'),
            supplier: String(row.supplier || row.Supplier || 'General Supplier'),
            branch: String(row.branch || row.Branch || 'Main Branch - Gulberg'),
            image: String(row.image || row.Image || ''),
            warrantyPeriod: toNumber(row.warrantyPeriod || row.WarrantyPeriod || row['Warranty Period']),
            status: String(row.status || row.Status || 'Active')
          };
        })
        .filter(Boolean);

      if (!mapped.length) {
        toast.error('No valid products found. Required columns: name, category, salePrice.');
        return;
      }

      setProducts(mapped);
      setSelectedProducts([]);
      toast.success(`${mapped.length} product(s) imported successfully.`);
    } catch {
      toast.error('Failed to import Excel file. Please check file format.');
    } finally {
      event.target.value = '';
    }
  };

  // Get stock status
  const getStockStatus = (product) => {
    if (product.currentStock === 0) return 'Out';
    if (product.currentStock < product.minStock) return 'Low';
    return 'In Stock';
  };

  // Get stock badge variant
  const getStockBadgeVariant = (product) => {
    if (product.currentStock === 0) return 'danger';
    if (product.currentStock < product.minStock) return 'warning';
    return 'success';
  };

  // Table columns
  const columns = [
    {
      key: 'select',
      label: (
        <input
          type="checkbox"
          checked={selectedProducts.length === filteredProducts.length && filteredProducts.length > 0}
          onChange={handleSelectAll}
          className="rounded"
        />
      ),
      render: (row) => (
        <input
          type="checkbox"
          checked={selectedProducts.includes(row.id)}
          onChange={() => handleSelectProduct(row.id)}
          className="rounded"
        />
      )
    },
    {
      key: 'image',
      label: 'Image',
      render: (row) => (
        <div className="w-10 h-10 rounded border border-gray-200 overflow-hidden bg-gray-100">
          <div className="w-full h-full flex items-center justify-center bg-white">
            <img
              src={row.image || ''}
              alt={row.name}
              loading="lazy"
              onError={(event) => handleImageError(event, row.name)}
              className="w-full h-full object-contain p-1"
            />
          </div>
        </div>
      )
    },
    { key: 'code', label: 'Product ID' },
    { key: 'name', label: 'Product Name' },
    { key: 'category', label: 'Category' },
    { key: 'brand', label: 'Brand' },
    { key: 'model', label: 'Model' },
    {
      key: 'purchasePrice',
      label: 'Purchase Price',
      render: (row) => `Rs. ${Number(row.purchasePrice || 0).toLocaleString()}`
    },
    {
      key: 'salePrice',
      label: 'Sale Price',
      render: (row) => `Rs. ${Number(row.salePrice || 0).toLocaleString()}`
    },
    {
      key: 'currentStock',
      label: 'Stock Qty',
      render: (row) => (
        <span className={`font-semibold ${
          row.currentStock === 0 ? 'text-red-600' : 
          row.currentStock < row.minStock ? 'text-yellow-600' : 
          'text-green-600'
        }`}>
          {row.currentStock}
        </span>
      )
    },
    { key: 'minStock', label: 'Min Stock' },
    { key: 'supplier', label: 'Supplier' },
    { key: 'branch', label: 'Branch' },
    {
      key: 'status',
      label: 'Status',
      render: (row) => (
        <Badge variant={row.status === 'Active' ? 'success' : 'default'}>
          {row.status}
        </Badge>
      )
    },
    {
      key: 'stockStatus',
      label: 'Stock Status',
      render: (row) => (
        <Badge variant={getStockBadgeVariant(row)}>
          {getStockStatus(row)}
        </Badge>
      )
    },
    {
      key: 'actions',
      label: 'Actions',
      render: (row) => (
        <div className="flex space-x-2">
          <button
            onClick={() => openDetailModal(row)}
            className="text-blue-600 hover:text-blue-800 dark:text-blue-400"
            title="View Details"
          >
            <FaEye size={16} />
          </button>
          {hasPermission(user?.role, 'products', 'update') && (
            <button
              onClick={() => openEditModal(row)}
              className="text-green-600 hover:text-green-800 dark:text-green-400"
              title="Edit"
            >
              <FaEdit size={16} />
            </button>
          )}
          {hasPermission(user?.role, 'products', 'delete') && (
            <button
              onClick={() => openDeleteDialog(row)}
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

  // Check permissions
  const canCreate = hasPermission(user?.role, 'products', 'create');
  const canExport = user?.role === 'admin' || user?.role === 'superadmin';

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Products</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">Manage your inventory products</p>
        </div>
        <div className="flex space-x-3">
          {canExport && (
            <>
              <input
                ref={importInputRef}
                type="file"
                accept=".xlsx,.xls,.csv"
                onChange={handleImportFileChange}
                className="hidden"
              />
              <Button variant="outline" icon={<FaFileUpload />} onClick={handleImportExcel}>
                Import Excel
              </Button>
              <Button variant="outline" icon={<FaFileExcel />} onClick={handleExportExcel}>
                Export Excel
              </Button>
            </>
          )}
          {canCreate && (
            <Button variant="primary" icon={<FaPlus />} onClick={() => {
              resetForm();
              generateProductCode();
              setIsAddModalOpen(true);
            }}>
              Add Product
            </Button>
          )}
        </div>
      </div>

      {/* Filters */}
      <Card>
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          <SearchBar
            value={search}
            onSearch={setSearch}
            placeholder="Search by name, code, brand..."
            className="md:col-span-2"
          />
          
          <Select
            name="category"
            value={filters.category}
            onChange={(e) => setFilters({ ...filters, category: e.target.value })}
            options={categories}
            placeholder="All Categories"
          />

          <Select
            name="brand"
            value={filters.brand}
            onChange={(e) => setFilters({ ...filters, brand: e.target.value })}
            options={brands}
            placeholder="All Brands"
          />

          <Select
            name="stockStatus"
            value={filters.stockStatus}
            onChange={(e) => setFilters({ ...filters, stockStatus: e.target.value })}
            options={[
              { value: 'In Stock', label: 'In Stock' },
              { value: 'Low Stock', label: 'Low Stock' },
              { value: 'Out of Stock', label: 'Out of Stock' }
            ]}
            placeholder="Stock Status"
          />
        </div>

        {/* Bulk Actions */}
        {selectedProducts.length > 0 && (
          <div className="mt-4 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg flex items-center justify-between">
            <span className="text-sm font-medium text-blue-900 dark:text-blue-300">
              {selectedProducts.length} product(s) selected
            </span>
            <Button
              variant="danger"
              size="sm"
              onClick={() => setIsBulkDeleteDialogOpen(true)}
            >
              Delete Selected
            </Button>
          </div>
        )}
      </Card>

      {/* Products Table */}
      <Card>
        <Table
          columns={columns}
          data={filteredProducts}
          emptyMessage="No products found"
          onRowClick={(row) => {
            // Highlight low stock rows
            if (row.currentStock < row.minStock) {
              return 'bg-yellow-50 dark:bg-yellow-900/10';
            }
            if (row.currentStock === 0) {
              return 'bg-red-50 dark:bg-red-900/10';
            }
          }}
        />
      </Card>

      {/* Add/Edit Product Modal */}
      <Modal
        isOpen={isAddModalOpen || isEditModalOpen}
        onClose={() => {
          isAddModalOpen ? setIsAddModalOpen(false) : setIsEditModalOpen(false);
          resetForm();
          setSelectedProduct(null);
        }}
        title={isAddModalOpen ? 'Add New Product' : 'Edit Product'}
        size="xl"
        footer={
          <div className="flex justify-end space-x-3">
            <Button
              variant="outline"
              onClick={() => {
                isAddModalOpen ? setIsAddModalOpen(false) : setIsEditModalOpen(false);
                resetForm();
                setSelectedProduct(null);
              }}
            >
              Cancel
            </Button>
            <Button
              variant="primary"
              onClick={isAddModalOpen ? handleAddProduct : handleEditProduct}
            >
              {isAddModalOpen ? 'Add Product' : 'Save Changes'}
            </Button>
          </div>
        }
      >
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Input
            label="Product Name"
            name="name"
            value={formData.name}
            onChange={handleInputChange}
            required
          />

          <div className="flex space-x-2">
            <Input
              label="Product Code"
              name="code"
              value={formData.code}
              onChange={handleInputChange}
              className="flex-1"
              required
            />
            <Button
              variant="outline"
              size="sm"
              onClick={generateProductCode}
              className="mt-7"
            >
              Auto
            </Button>
          </div>

          <Select
            label="Category"
            name="category"
            value={formData.category}
            onChange={handleInputChange}
            options={categories}
            required
          />

          <Input
            label="Brand"
            name="brand"
            value={formData.brand}
            onChange={handleInputChange}
          />

          <Input
            label="Model"
            name="model"
            value={formData.model}
            onChange={handleInputChange}
          />

          <Select
            label="Unit"
            name="unit"
            value={formData.unit}
            onChange={handleInputChange}
            options={units}
          />

          <Input
            label="Purchase Price (Rs.)"
            name="purchasePrice"
            type="number"
            value={formData.purchasePrice}
            onChange={handleInputChange}
            required
          />

          <Input
            label="Sale Price (Rs.)"
            name="salePrice"
            type="number"
            value={formData.salePrice}
            onChange={handleInputChange}
            required
          />

          <Input
            label="Wholesale Price (Rs.)"
            name="wholesalePrice"
            type="number"
            value={formData.wholesalePrice}
            onChange={handleInputChange}
          />

          <Input
            label="Current Stock"
            name="currentStock"
            type="number"
            value={formData.currentStock}
            onChange={handleInputChange}
          />

          <Input
            label="Min Stock Level"
            name="minStock"
            type="number"
            value={formData.minStock}
            onChange={handleInputChange}
          />

          <Input
            label="Warranty Period (months)"
            name="warrantyPeriod"
            type="number"
            value={formData.warrantyPeriod}
            onChange={handleInputChange}
          />

          <Select
            label="Supplier"
            name="supplier"
            value={formData.supplier}
            onChange={handleInputChange}
            options={suppliers}
          />

          <Select
            label="Branch"
            name="branch"
            value={formData.branch}
            onChange={handleInputChange}
            options={branches}
          />

          <Select
            label="Status"
            name="status"
            value={formData.status}
            onChange={handleInputChange}
            options={[
              { value: 'Active', label: 'Active' },
              { value: 'Inactive', label: 'Inactive' }
            ]}
          />

          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Description
            </label>
            <textarea
              name="description"
              value={formData.description}
              onChange={handleInputChange}
              rows="3"
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>

          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Product Image
            </label>
            <input
              type="file"
              accept="image/*"
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>
        </div>
      </Modal>

      {/* Product Detail Modal */}
      <Modal
        isOpen={isDetailModalOpen}
        onClose={() => {
          setIsDetailModalOpen(false);
          setSelectedProduct(null);
        }}
        title="Product Details"
        size="lg"
      >
        {selectedProduct && (
          <div className="space-y-6">
            {/* Product Info */}
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2 flex items-center justify-center">
                <div className="w-32 h-32 bg-gray-200 dark:bg-gray-700 rounded-lg overflow-hidden">
                  <div className="w-full h-full flex items-center justify-center bg-white">
                    <img
                      src={selectedProduct.image || ''}
                      alt={selectedProduct.name}
                      loading="lazy"
                      onError={(event) => handleImageError(event, selectedProduct.name)}
                      className="w-full h-full object-contain p-2"
                    />
                  </div>
                </div>
              </div>

              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Product Name</p>
                <p className="font-semibold text-gray-900 dark:text-white">{selectedProduct.name}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Product Code</p>
                <p className="font-semibold text-gray-900 dark:text-white">{selectedProduct.code}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Category</p>
                <p className="font-semibold text-gray-900 dark:text-white">{selectedProduct.category}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Brand</p>
                <p className="font-semibold text-gray-900 dark:text-white">{selectedProduct.brand}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Model</p>
                <p className="font-semibold text-gray-900 dark:text-white">{selectedProduct.model}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Purchase Price</p>
                <p className="font-semibold text-gray-900 dark:text-white">Rs. {selectedProduct.purchasePrice.toLocaleString()}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Sale Price</p>
                <p className="font-semibold text-gray-900 dark:text-white">Rs. {selectedProduct.salePrice.toLocaleString()}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Current Stock</p>
                <p className="font-semibold text-gray-900 dark:text-white">{selectedProduct.currentStock}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Min Stock</p>
                <p className="font-semibold text-gray-900 dark:text-white">{selectedProduct.minStock}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Supplier</p>
                <p className="font-semibold text-gray-900 dark:text-white">{selectedProduct.supplier}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Branch</p>
                <p className="font-semibold text-gray-900 dark:text-white">{selectedProduct.branch}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Warranty</p>
                <p className="font-semibold text-gray-900 dark:text-white">{selectedProduct.warrantyPeriod} months</p>
              </div>
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Status</p>
                <Badge variant={selectedProduct.status === 'Active' ? 'success' : 'default'}>
                  {selectedProduct.status}
                </Badge>
              </div>
              <div className="col-span-2">
                <p className="text-sm text-gray-600 dark:text-gray-400">Description</p>
                <p className="text-gray-900 dark:text-white">{selectedProduct.description}</p>
              </div>
            </div>

            {/* Stock History */}
            <div>
              <h4 className="font-semibold text-gray-900 dark:text-white mb-3">Recent Stock History</h4>
              <div className="space-y-2">
                <div className="p-3 bg-gray-50 dark:bg-gray-700 rounded">
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600 dark:text-gray-400">Current Stock Position</span>
                    <span className="text-sm font-medium text-green-600">{selectedProduct.currentStock} units</span>
                  </div>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Live snapshot from inventory data</p>
                </div>
                <div className="p-3 bg-gray-50 dark:bg-gray-700 rounded">
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600 dark:text-gray-400">Minimum Stock Threshold</span>
                    <span className="text-sm font-medium text-red-600">{selectedProduct.minStock} units</span>
                  </div>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    {selectedProduct.currentStock <= selectedProduct.minStock ? 'Reorder recommended' : 'Stock level is healthy'}
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}
      </Modal>

      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        isOpen={isDeleteDialogOpen}
        onClose={() => {
          setIsDeleteDialogOpen(false);
          setSelectedProduct(null);
        }}
        onConfirm={handleDeleteProduct}
        title="Delete Product"
        message={`Are you sure you want to delete "${selectedProduct?.name}"? This action cannot be undone.`}
        type="danger"
      />

      {/* Bulk Delete Confirmation Dialog */}
      <ConfirmDialog
        isOpen={isBulkDeleteDialogOpen}
        onClose={() => setIsBulkDeleteDialogOpen(false)}
        onConfirm={handleBulkDelete}
        title="Delete Multiple Products"
        message={`Are you sure you want to delete ${selectedProducts.length} products? This action cannot be undone.`}
        type="danger"
      />
    </div>
  );
};

export default Products;
