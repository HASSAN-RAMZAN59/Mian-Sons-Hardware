import React, { useEffect, useMemo, useState } from 'react';
import { toast } from 'react-toastify';
import { FaPlus, FaEdit, FaTrash, FaSearch, FaFileExcel, FaBoxes, FaBolt, FaPaintBrush, FaWrench, FaHammer, FaTools } from 'react-icons/fa';
import * as XLSX from 'xlsx';
import Card from '../../components/common/Card';
import Button from '../../components/common/Button';
import Table from '../../components/common/Table';
import Badge from '../../components/common/Badge';
import Input from '../../components/common/Input';
import Modal from '../../components/common/Modal';
import Select from '../../components/common/Select';
import ConfirmDialog from '../../components/common/ConfirmDialog';
import { useAuth } from '../../context/AuthContext';
import productsData from '../../data/productsData';

const STORAGE_CUSTOM_CATEGORIES = 'admin_custom_categories';
const STORAGE_CATEGORY_META = 'admin_category_meta';

const availableIcons = [
  { value: 'FaBoxes', label: 'Boxes' },
  { value: 'FaTools', label: 'Tools' },
  { value: 'FaHammer', label: 'Hammer' },
  { value: 'FaWrench', label: 'Wrench' },
  { value: 'FaPaintBrush', label: 'Paint Brush' },
  { value: 'FaBolt', label: 'Bolt' }
];

const iconMap = {
  FaBoxes,
  FaTools,
  FaHammer,
  FaWrench,
  FaPaintBrush,
  FaBolt
};

const defaultCategoryMeta = (categoryName) => {
  const name = String(categoryName || '').toLowerCase();
  if (name.includes('paint')) return { icon: 'FaPaintBrush', color: '#ec4899' };
  if (name.includes('electrical')) return { icon: 'FaBolt', color: '#f59e0b' };
  if (name.includes('plumbing') || name.includes('tap') || name.includes('bath')) return { icon: 'FaWrench', color: '#06b6d4' };
  if (name.includes('tools') || name.includes('hardware')) return { icon: 'FaTools', color: '#1e3a5f' };
  return { icon: 'FaBoxes', color: '#1e3a5f' };
};

const Categories = () => {
  const { checkPermission } = useAuth();
  const [searchTerm, setSearchTerm] = useState('');
  const [customCategories, setCustomCategories] = useState([]);
  const [categoryMeta, setCategoryMeta] = useState({});
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState(null);
  const [categoryToDelete, setCategoryToDelete] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    parentCategory: '',
    icon: 'FaBoxes',
    color: '#1e3a5f',
    status: 'Active'
  });

  useEffect(() => {
    try {
      const savedCustom = JSON.parse(localStorage.getItem(STORAGE_CUSTOM_CATEGORIES) || '[]');
      const savedMeta = JSON.parse(localStorage.getItem(STORAGE_CATEGORY_META) || '{}');
      setCustomCategories(Array.isArray(savedCustom) ? savedCustom : []);
      setCategoryMeta(savedMeta && typeof savedMeta === 'object' ? savedMeta : {});
    } catch {
      setCustomCategories([]);
      setCategoryMeta({});
    }
  }, []);

  useEffect(() => {
    localStorage.setItem(STORAGE_CUSTOM_CATEGORIES, JSON.stringify(customCategories));
  }, [customCategories]);

  useEffect(() => {
    localStorage.setItem(STORAGE_CATEGORY_META, JSON.stringify(categoryMeta));
  }, [categoryMeta]);

  const catalogCategories = useMemo(() => {
    const counts = productsData.reduce((acc, product) => {
      const category = String(product.category || '').trim();
      if (!category) return acc;
      acc[category] = (acc[category] || 0) + 1;
      return acc;
    }, {});

    return Object.entries(counts)
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([name, productCount], index) => {
        const metaOverride = categoryMeta[name] || {};
        const defaults = defaultCategoryMeta(name);
        return {
          id: `catalog-${index + 1}`,
          name,
          description: metaOverride.description || `${name} category from current product catalog.`,
          parentCategory: metaOverride.parentCategory || '',
          icon: metaOverride.icon || defaults.icon,
          color: metaOverride.color || defaults.color,
          status: metaOverride.status || 'Active',
          productCount,
          source: 'Catalog'
        };
      });
  }, [categoryMeta]);

  const categories = useMemo(() => {
    const custom = customCategories.map((category) => ({
      ...category,
      source: 'Custom',
      productCount: Number(category.productCount || 0)
    }));
    return [...catalogCategories, ...custom];
  }, [catalogCategories, customCategories]);

  const parentCategoryOptions = useMemo(
    () => categories.map((category) => ({ value: category.name, label: category.name })),
    [categories]
  );

  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
      parentCategory: '',
      icon: 'FaBoxes',
      color: '#1e3a5f',
      status: 'Active'
    });
  };

  const openAddModal = () => {
    setEditingCategory(null);
    resetForm();
    setIsModalOpen(true);
  };

  const openEditModal = (category) => {
    setEditingCategory(category);
    setFormData({
      name: category.name,
      description: category.description || '',
      parentCategory: category.parentCategory || '',
      icon: category.icon || 'FaBoxes',
      color: category.color || '#1e3a5f',
      status: category.status || 'Active'
    });
    setIsModalOpen(true);
  };

  const handleSaveCategory = () => {
    const trimmedName = formData.name.trim();
    if (!trimmedName) {
      toast.error('Category name is required.');
      return;
    }

    const duplicate = categories.some((category) => {
      if (editingCategory && category.id === editingCategory.id) return false;
      return category.name.toLowerCase() === trimmedName.toLowerCase();
    });

    if (duplicate) {
      toast.error('Category with this name already exists.');
      return;
    }

    if (!editingCategory) {
      const newCategory = {
        id: `custom-${Date.now()}`,
        name: trimmedName,
        description: formData.description.trim(),
        parentCategory: formData.parentCategory,
        icon: formData.icon,
        color: formData.color,
        status: formData.status,
        productCount: 0
      };

      setCustomCategories((prev) => [newCategory, ...prev]);
      toast.success('Category added successfully.');
      setIsModalOpen(false);
      resetForm();
      return;
    }

    if (editingCategory.source === 'Catalog') {
      setCategoryMeta((prev) => ({
        ...prev,
        [editingCategory.name]: {
          description: formData.description.trim(),
          parentCategory: formData.parentCategory,
          icon: formData.icon,
          color: formData.color,
          status: formData.status
        }
      }));
      toast.success('Category settings updated.');
    } else {
      setCustomCategories((prev) => prev.map((category) => (
        category.id === editingCategory.id
          ? {
              ...category,
              name: trimmedName,
              description: formData.description.trim(),
              parentCategory: formData.parentCategory,
              icon: formData.icon,
              color: formData.color,
              status: formData.status
            }
          : category
      )));
      toast.success('Custom category updated.');
    }

    setIsModalOpen(false);
    setEditingCategory(null);
    resetForm();
  };

  const handleDeleteCategory = () => {
    if (!categoryToDelete) return;

    if (categoryToDelete.source === 'Catalog') {
      toast.error('Catalog categories cannot be deleted because they are linked to products.');
      setCategoryToDelete(null);
      return;
    }

    setCustomCategories((prev) => prev.filter((category) => category.id !== categoryToDelete.id));
    toast.success('Custom category deleted.');
    setCategoryToDelete(null);
  };

  const handleExport = () => {
    try {
      const rows = categories.map((category) => ({
        name: category.name,
        description: category.description,
        parentCategory: category.parentCategory || '',
        icon: category.icon,
        color: category.color,
        status: category.status,
        totalProducts: category.productCount,
        source: category.source
      }));

      const worksheet = XLSX.utils.json_to_sheet(rows);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, 'Categories');
      XLSX.writeFile(workbook, `categories-export-${new Date().toISOString().slice(0, 10)}.xlsx`);
      toast.success('Categories exported successfully.');
    } catch {
      toast.error('Failed to export categories.');
    }
  };

  const columns = [
    {
      key: 'icon',
      label: 'Icon',
      render: (row) => {
        const Icon = iconMap[row.icon] || FaBoxes;
        return (
          <div className="w-9 h-9 rounded-md flex items-center justify-center" style={{ backgroundColor: `${row.color}22`, color: row.color }}>
            <Icon size={14} />
          </div>
        );
      }
    },
    { key: 'name', label: 'Category Name' },
    { key: 'description', label: 'Description' },
    {
      key: 'parentCategory',
      label: 'Parent',
      render: (row) => row.parentCategory || '-'
    },
    { 
      key: 'productCount', 
      label: 'Total Products',
      render: (row) => <span className="font-semibold">{row.productCount}</span>
    },
    {
      key: 'source',
      label: 'Source',
      render: (row) => (
        <Badge variant={row.source === 'Catalog' ? 'info' : 'warning'}>
          {row.source}
        </Badge>
      )
    },
    { 
      key: 'status', 
      label: 'Status',
      render: (row) => (
        <Badge variant={row.status === 'Active' ? 'success' : 'danger'}>
          {row.status}
        </Badge>
      )
    },
    { 
      key: 'actions', 
      label: 'Actions',
      render: (row) => (
        <div className="flex gap-2">
          {checkPermission('categories', 'update') && (
            <Button size="sm" variant="secondary" onClick={() => openEditModal(row)}>
              <FaEdit />
            </Button>
          )}
          {checkPermission('categories', 'delete') && (
            <Button
              size="sm"
              variant="danger"
              onClick={() => setCategoryToDelete(row)}
              disabled={row.source === 'Catalog'}
            >
              <FaTrash />
            </Button>
          )}
        </div>
      )
    },
  ];

  const filteredCategories = categories.filter(cat =>
    cat.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    cat.description.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold text-gray-800 dark:text-white">Categories</h1>
        <div className="flex gap-3">
          <Button variant="secondary" onClick={handleExport}>
            <FaFileExcel className="mr-2" /> Export
          </Button>
          {checkPermission('categories', 'create') && (
            <Button onClick={openAddModal}>
              <FaPlus className="mr-2" /> Add Category
            </Button>
          )}
        </div>
      </div>

      <Card>
        <div className="mb-4">
          <Input
            icon={FaSearch}
            placeholder="Search categories..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <Table columns={columns} data={filteredCategories} emptyMessage="No categories found" />
      </Card>

      <Modal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setEditingCategory(null);
          resetForm();
        }}
        title={editingCategory ? 'Edit Category' : 'Add Category'}
        footer={(
          <div className="flex justify-end gap-2">
            <Button
              variant="outline"
              onClick={() => {
                setIsModalOpen(false);
                setEditingCategory(null);
                resetForm();
              }}
            >
              Cancel
            </Button>
            <Button onClick={handleSaveCategory}>Save</Button>
          </div>
        )}
      >
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Input
            label="Category Name"
            name="name"
            value={formData.name}
            onChange={(event) => setFormData((prev) => ({ ...prev, name: event.target.value }))}
            disabled={Boolean(editingCategory?.source === 'Catalog')}
            required
          />
          <Select
            label="Parent Category"
            name="parentCategory"
            value={formData.parentCategory}
            onChange={(event) => setFormData((prev) => ({ ...prev, parentCategory: event.target.value }))}
            options={parentCategoryOptions.filter((option) => option.value !== formData.name)}
            placeholder="None"
          />
          <Input
            label="Description"
            name="description"
            value={formData.description}
            onChange={(event) => setFormData((prev) => ({ ...prev, description: event.target.value }))}
            className="md:col-span-2"
          />
          <Select
            label="Icon"
            name="icon"
            value={formData.icon}
            onChange={(event) => setFormData((prev) => ({ ...prev, icon: event.target.value }))}
            options={availableIcons}
          />
          <Input
            label="Color"
            type="color"
            name="color"
            value={formData.color}
            onChange={(event) => setFormData((prev) => ({ ...prev, color: event.target.value }))}
          />
          <Select
            label="Status"
            name="status"
            value={formData.status}
            onChange={(event) => setFormData((prev) => ({ ...prev, status: event.target.value }))}
            options={[
              { value: 'Active', label: 'Active' },
              { value: 'Inactive', label: 'Inactive' }
            ]}
          />
        </div>
      </Modal>

      <ConfirmDialog
        isOpen={isDeleteDialogOpen || Boolean(categoryToDelete)}
        onClose={() => {
          setIsDeleteDialogOpen(false);
          setCategoryToDelete(null);
        }}
        onConfirm={handleDeleteCategory}
        title="Delete Category"
        message={`Are you sure you want to delete "${categoryToDelete?.name || ''}"?`}
        type="danger"
      />
    </div>
  );
};

export default Categories;
