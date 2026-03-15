import React, { useEffect, useState } from 'react';
import { FaPercent, FaPlus, FaEdit, FaToggleOn, FaToggleOff, FaTag } from 'react-icons/fa';
import Card from '../../components/common/Card';
import Button from '../../components/common/Button';
import Input from '../../components/common/Input';
import Select from '../../components/common/Select';
import Modal from '../../components/common/Modal';
import Badge from '../../components/common/Badge';
import { useAuth } from '../../context/AuthContext';
import { toast } from 'react-toastify';
import { hasPermission } from '../../utils/permissions';
import productsData from '../../data/productsData';

const DISCOUNTS_KEY = 'admin_discounts';

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

const getProductName = (product) => `${product.name}${product.size ? ` ${product.size}` : ''}`.trim();

const Discounts = () => {
  const { user } = useAuth();
  const [showModal, setShowModal] = useState(false);
  const [editingDiscount, setEditingDiscount] = useState(null);

  // Discount Data
  const defaultDiscounts = [
    {
      id: 'DIS-001',
      name: 'Eid Discount',
      type: 'Percentage',
      value: 10,
      applicableOn: 'All',
      validFrom: '2026-03-10',
      validTo: '2026-04-10',
      status: 'Active',
      description: 'Special Eid celebration discount for all customers',
    },
    {
      id: 'DIS-002',
      name: 'Contractor Discount',
      type: 'Percentage',
      value: 5,
      applicableOn: 'Category',
      categoryName: 'Building Materials',
      validFrom: '2026-01-01',
      validTo: '2026-12-31',
      status: 'Active',
      description: 'Year-round discount for contractors on building materials',
    },
    {
      id: 'DIS-003',
      name: 'Clearance Sale',
      type: 'Percentage',
      value: 20,
      applicableOn: 'All',
      validFrom: '2026-03-01',
      validTo: '2026-03-15',
      status: 'Active',
      description: 'Clearance sale on all items',
    },
    {
      id: 'DIS-004',
      name: 'Bulk Purchase Discount',
      type: 'Fixed Amount',
      value: 5000,
      applicableOn: 'All',
      validFrom: '2026-02-01',
      validTo: '2026-02-28',
      status: 'Inactive',
      description: 'Flat discount on bulk purchases',
    },
    {
      id: 'DIS-005',
      name: 'Paint Products Discount',
      type: 'Percentage',
      value: 15,
      applicableOn: 'Category',
      categoryName: 'Paints & Chemicals',
      validFrom: '2026-01-15',
      validTo: '2026-03-05',
      status: 'Inactive',
      description: 'Special discount on paint products (Expired)',
    },
    {
      id: 'DIS-006',
      name: 'Tools Discount',
      type: 'Percentage',
      value: 8,
      applicableOn: 'Product',
      productName: 'Electric Drill',
      validFrom: '2026-03-08',
      validTo: '2026-03-20',
      status: 'Active',
      description: 'Special discount on electric drill',
    },
  ];

  const [discounts, setDiscounts] = useState([]);

  useEffect(() => {
    const stored = readStoredData(DISCOUNTS_KEY, defaultDiscounts);
    setDiscounts(stored);
  }, []);

  useEffect(() => {
    writeStoredData(DISCOUNTS_KEY, discounts);
  }, [discounts]);

  // Form State
  const [formData, setFormData] = useState({
    name: '',
    type: 'Percentage',
    value: '',
    applicableOn: 'All',
    categoryName: '',
    productName: '',
    validFrom: '',
    validTo: '',
    status: 'Active',
    description: '',
  });

  // Categories and Products for dropdown
  const categories = [...new Set(productsData.map((product) => product.category))].sort();

  const products = productsData.map((product) => getProductName(product));

  // Check if discount is expired
  const isExpired = (validTo) => {
    const today = new Date();
    const endDate = new Date(validTo);
    return endDate < today;
  };

  // Handle Open Modal for Add
  const handleOpenAddModal = () => {
    if (!hasPermission(user?.role, 'discounts', 'create')) {
      toast.error('You do not have permission to add discounts');
      return;
    }
    setEditingDiscount(null);
    setFormData({
      name: '',
      type: 'Percentage',
      value: '',
      applicableOn: 'All',
      categoryName: '',
      productName: '',
      validFrom: '',
      validTo: '',
      status: 'Active',
      description: '',
    });
    setShowModal(true);
  };

  // Handle Open Modal for Edit
  const handleOpenEditModal = (discount) => {
    if (!hasPermission(user?.role, 'discounts', 'edit')) {
      toast.error('You do not have permission to edit discounts');
      return;
    }
    setEditingDiscount(discount);
    setFormData({
      name: discount.name,
      type: discount.type,
      value: discount.value,
      applicableOn: discount.applicableOn,
      categoryName: discount.categoryName || '',
      productName: discount.productName || '',
      validFrom: discount.validFrom,
      validTo: discount.validTo,
      status: discount.status,
      description: discount.description || '',
    });
    setShowModal(true);
  };

  // Handle Close Modal
  const handleCloseModal = () => {
    setShowModal(false);
    setEditingDiscount(null);
    setFormData({
      name: '',
      type: 'Percentage',
      value: '',
      applicableOn: 'All',
      categoryName: '',
      productName: '',
      validFrom: '',
      validTo: '',
      status: 'Active',
      description: '',
    });
  };

  // Handle Form Submit
  const handleSubmit = (e) => {
    e.preventDefault();

    if (!formData.name || !formData.value || !formData.validFrom || !formData.validTo) {
      toast.error('Please fill in all required fields');
      return;
    }

    if (formData.applicableOn === 'Category' && !formData.categoryName) {
      toast.error('Please select a category');
      return;
    }

    if (formData.applicableOn === 'Product' && !formData.productName) {
      toast.error('Please select a product');
      return;
    }

    const normalizedDiscount = {
      ...formData,
      value: Number(formData.value)
    };

    if (editingDiscount) {
      // Update existing discount
      setDiscounts(
        discounts.map((discount) =>
          discount.id === editingDiscount.id
            ? {
                ...discount,
                ...normalizedDiscount,
              }
            : discount
        )
      );
      toast.success('Discount updated successfully!');
    } else {
      // Add new discount
      const newDiscount = {
        id: `DIS-${String(discounts.length + 1).padStart(3, '0')}`,
        ...normalizedDiscount,
      };
      setDiscounts([...discounts, newDiscount]);
      toast.success('Discount added successfully!');
    }

    handleCloseModal();
  };

  // Handle Input Change
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData({
      ...formData,
      [name]: value,
    });
  };

  // Handle Toggle Status
  const handleToggleStatus = (discount) => {
    if (!hasPermission(user?.role, 'discounts', 'edit')) {
      toast.error('You do not have permission to update discount status');
      return;
    }

    const newStatus = discount.status === 'Active' ? 'Inactive' : 'Active';
    setDiscounts(
      discounts.map((d) =>
        d.id === discount.id
          ? { ...d, status: newStatus }
          : d
      )
    );
    toast.success(`Discount ${newStatus === 'Active' ? 'activated' : 'deactivated'} successfully!`);
  };

  // Calculate statistics
  const totalDiscounts = discounts.length;
  const activeDiscounts = discounts.filter((d) => d.status === 'Active').length;
  const expiredDiscounts = discounts.filter((d) => isExpired(d.validTo)).length;
  const percentageDiscounts = discounts.filter((d) => d.type === 'Percentage').length;

  const canCreate = hasPermission(user?.role, 'discounts', 'create');
  const canEdit = hasPermission(user?.role, 'discounts', 'edit');

  // Get discount display value
  const getDiscountValue = (discount) => {
    if (discount.type === 'Percentage') {
      return `${discount.value}%`;
    } else {
      return `Rs. ${discount.value.toLocaleString()}`;
    }
  };

  // Get row styling based on status and expiry
  const getRowClass = (discount) => {
    if (isExpired(discount.validTo)) {
      return 'bg-red-50 dark:bg-red-900/20';
    } else if (discount.status === 'Active') {
      return 'bg-green-50 dark:bg-green-900/20';
    }
    return '';
  };

  return (
    <div>
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-800 dark:text-white">Discount Management</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">Manage product and category discounts</p>
        </div>
        <Button onClick={handleOpenAddModal} className="flex items-center" disabled={!canCreate}>
          <FaPlus className="mr-2" />
          Add New Discount
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
        <Card>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Total Discounts</p>
              <p className="text-2xl font-bold text-gray-800 dark:text-white mt-1">{totalDiscounts}</p>
            </div>
            <div className="p-3 bg-blue-100 dark:bg-blue-900 rounded-lg">
              <FaTag className="text-2xl text-blue-600 dark:text-blue-400" />
            </div>
          </div>
        </Card>

        <Card>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Active Discounts</p>
              <p className="text-2xl font-bold text-gray-800 dark:text-white mt-1">{activeDiscounts}</p>
            </div>
            <div className="p-3 bg-green-100 dark:bg-green-900 rounded-lg">
              <FaToggleOn className="text-2xl text-green-600 dark:text-green-400" />
            </div>
          </div>
        </Card>

        <Card>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Expired</p>
              <p className="text-2xl font-bold text-gray-800 dark:text-white mt-1">{expiredDiscounts}</p>
            </div>
            <div className="p-3 bg-red-100 dark:bg-red-900 rounded-lg">
              <FaToggleOff className="text-2xl text-red-600 dark:text-red-400" />
            </div>
          </div>
        </Card>

        <Card>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Percentage Type</p>
              <p className="text-2xl font-bold text-gray-800 dark:text-white mt-1">{percentageDiscounts}</p>
            </div>
            <div className="p-3 bg-purple-100 dark:bg-purple-900 rounded-lg">
              <FaPercent className="text-2xl text-purple-600 dark:text-purple-400" />
            </div>
          </div>
        </Card>
      </div>

      {/* Discounts Table */}
      <Card>
        <h2 className="text-xl font-bold text-gray-800 dark:text-white mb-4">All Discounts</h2>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
            <thead className="bg-gray-50 dark:bg-gray-800">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  ID
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Name
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Type
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Value
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Applicable On
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Valid From
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Valid To
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-gray-900 divide-y divide-gray-200 dark:divide-gray-700">
              {discounts.map((discount) => (
                <tr key={discount.id} className={`${getRowClass(discount)} hover:opacity-80 transition-opacity`}>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">
                    {discount.id}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900 dark:text-white">{discount.name}</div>
                    <div className="text-xs text-gray-500 dark:text-gray-400">{discount.description}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                      discount.type === 'Percentage'
                        ? 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200'
                        : 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200'
                    }`}>
                      {discount.type}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-gray-900 dark:text-white">
                    {getDiscountValue(discount)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900 dark:text-white">{discount.applicableOn}</div>
                    {discount.categoryName && (
                      <div className="text-xs text-gray-500 dark:text-gray-400">{discount.categoryName}</div>
                    )}
                    {discount.productName && (
                      <div className="text-xs text-gray-500 dark:text-gray-400">{discount.productName}</div>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                    {new Date(discount.validFrom).toLocaleDateString()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                    {new Date(discount.validTo).toLocaleDateString()}
                    {isExpired(discount.validTo) && (
                      <div className="text-xs text-red-600 dark:text-red-400 font-semibold">Expired</div>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <button
                      onClick={() => handleToggleStatus(discount)}
                      className="flex items-center space-x-2"
                      disabled={!canEdit || isExpired(discount.validTo)}
                    >
                      {discount.status === 'Active' ? (
                        <>
                          <FaToggleOn className="text-2xl text-green-600 dark:text-green-400" />
                          <Badge variant="success">Active</Badge>
                        </>
                      ) : (
                        <>
                          <FaToggleOff className="text-2xl text-gray-400" />
                          <Badge variant="secondary">Inactive</Badge>
                        </>
                      )}
                    </button>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <button
                      onClick={() => handleOpenEditModal(discount)}
                      className="text-blue-600 hover:text-blue-900 dark:text-blue-400 dark:hover:text-blue-300"
                      title="Edit"
                      disabled={!canEdit}
                    >
                      <FaEdit className="text-lg" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Add/Edit Discount Modal */}
      <Modal isOpen={showModal} onClose={handleCloseModal} title={editingDiscount ? 'Edit Discount' : 'Add New Discount'}>
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Discount Name */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Discount Name <span className="text-red-500">*</span>
            </label>
            <Input
              type="text"
              name="name"
              value={formData.name}
              onChange={handleInputChange}
              placeholder="Enter discount name"
              required
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Discount Type */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Discount Type <span className="text-red-500">*</span>
              </label>
              <Select name="type" value={formData.type} onChange={handleInputChange} required>
                <option value="Percentage">Percentage</option>
                <option value="Fixed Amount">Fixed Amount</option>
              </Select>
            </div>

            {/* Discount Value */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                {formData.type === 'Percentage' ? 'Percentage (%)' : 'Amount (Rs.)'} <span className="text-red-500">*</span>
              </label>
              <Input
                type="number"
                name="value"
                value={formData.value}
                onChange={handleInputChange}
                placeholder={formData.type === 'Percentage' ? 'e.g., 10' : 'e.g., 5000'}
                min="0"
                max={formData.type === 'Percentage' ? '100' : undefined}
                required
              />
            </div>
          </div>

          {/* Applicable On */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Applicable On <span className="text-red-500">*</span>
            </label>
            <Select name="applicableOn" value={formData.applicableOn} onChange={handleInputChange} required>
              <option value="All">All Products</option>
              <option value="Category">Specific Category</option>
              <option value="Product">Specific Product</option>
            </Select>
          </div>

          {/* Category Selection (if applicable) */}
          {formData.applicableOn === 'Category' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Select Category <span className="text-red-500">*</span>
              </label>
              <Select name="categoryName" value={formData.categoryName} onChange={handleInputChange} required>
                <option value="">Select Category</option>
                {categories.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </Select>
            </div>
          )}

          {/* Product Selection (if applicable) */}
          {formData.applicableOn === 'Product' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Select Product <span className="text-red-500">*</span>
              </label>
              <Select name="productName" value={formData.productName} onChange={handleInputChange} required>
                <option value="">Select Product</option>
                {products.map((prod) => (
                  <option key={prod} value={prod}>
                    {prod}
                  </option>
                ))}
              </Select>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Valid From */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Valid From <span className="text-red-500">*</span>
              </label>
              <Input
                type="date"
                name="validFrom"
                value={formData.validFrom}
                onChange={handleInputChange}
                required
              />
            </div>

            {/* Valid To */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Valid To <span className="text-red-500">*</span>
              </label>
              <Input
                type="date"
                name="validTo"
                value={formData.validTo}
                onChange={handleInputChange}
                min={formData.validFrom}
                required
              />
            </div>
          </div>

          {/* Status */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Status <span className="text-red-500">*</span>
            </label>
            <Select name="status" value={formData.status} onChange={handleInputChange} required>
              <option value="Active">Active</option>
              <option value="Inactive">Inactive</option>
            </Select>
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Description
            </label>
            <textarea
              name="description"
              value={formData.description}
              onChange={handleInputChange}
              rows="3"
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
              placeholder="Enter discount description..."
            ></textarea>
          </div>

          {/* Submit Buttons */}
          <div className="flex justify-end space-x-3 mt-6">
            <Button type="button" variant="secondary" onClick={handleCloseModal}>
              Cancel
            </Button>
            <Button type="submit">{editingDiscount ? 'Update Discount' : 'Add Discount'}</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default Discounts;
