import React, { useEffect, useState } from 'react';
import Card from '../../components/common/Card';
import Table from '../../components/common/Table';
import Button from '../../components/common/Button';
import Input from '../../components/common/Input';
import Select from '../../components/common/Select';
import Modal from '../../components/common/Modal';
import Badge from '../../components/common/Badge';
import { useAuth } from '../../context/AuthContext';
import { toast } from 'react-toastify';
import { logAudit } from '../../utils/audit';

const USERS_KEY = 'admin_users';

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
  window.dispatchEvent(new CustomEvent('app-storage-updated', { detail: { key } }));
};

const Users = () => {
  const { user, checkPermission } = useAuth();
  const [users, setUsers] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingUser, setEditingUser] = useState(null);

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    role: 'manager',
    status: 'Active'
  });

  useEffect(() => {
    setUsers(readStoredData(USERS_KEY, []));
  }, []);

  useEffect(() => {
    const handleStorage = (event) => {
      if (event?.key && event.key !== USERS_KEY) return;
      setUsers(readStoredData(USERS_KEY, []));
    };

    const handleCustomUpdate = (event) => {
      const key = event?.detail?.key;
      if (key && key !== USERS_KEY) return;
      setUsers(readStoredData(USERS_KEY, []));
    };

    window.addEventListener('storage', handleStorage);
    window.addEventListener('app-storage-updated', handleCustomUpdate);

    return () => {
      window.removeEventListener('storage', handleStorage);
      window.removeEventListener('app-storage-updated', handleCustomUpdate);
    };
  }, []);

  if (!checkPermission('users', 'read') && user?.role !== 'admin' && user?.role !== 'superadmin') {
    return (
      <div className="flex items-center justify-center h-96">
        <Card className="p-8 text-center">
          <h2 className="text-2xl font-bold text-red-600 mb-4">Access Denied</h2>
          <p className="text-gray-600 dark:text-gray-400">
            Only administrators can access user management.
          </p>
        </Card>
      </div>
    );
  }

  const canCreate = checkPermission('users', 'create');
  const canEdit = checkPermission('users', 'update');
  const canDelete = checkPermission('users', 'delete');

  const roleOptions = [
    { value: 'superadmin', label: 'Super Admin' },
    { value: 'admin', label: 'Admin' },
    { value: 'manager', label: 'Manager' },
    { value: 'cashier', label: 'Cashier' }
  ];

  const statusOptions = [
    { value: 'Active', label: 'Active' },
    { value: 'Inactive', label: 'Inactive' }
  ];

  const filteredUsers = users.filter((row) => {
    const query = searchTerm.toLowerCase();
    const matchesSearch =
      String(row.name || '').toLowerCase().includes(query) ||
      String(row.email || '').toLowerCase().includes(query) ||
      String(row.id || '').toLowerCase().includes(query);
    const matchesRole = !roleFilter || row.role === roleFilter;
    const matchesStatus = !statusFilter || row.status === statusFilter;
    return matchesSearch && matchesRole && matchesStatus;
  });

  const handleOpenAdd = () => {
    if (!canCreate) {
      toast.error('You do not have permission to add users');
      return;
    }
    setEditingUser(null);
    setFormData({ name: '', email: '', role: 'manager', status: 'Active' });
    setShowModal(true);
  };

  const handleOpenEdit = (row) => {
    if (!canEdit) {
      toast.error('You do not have permission to edit users');
      return;
    }
    setEditingUser(row);
    setFormData({
      name: row.name || '',
      email: row.email || '',
      role: row.role || 'manager',
      status: row.status || 'Active'
    });
    setShowModal(true);
  };

  const handleDelete = (row) => {
    if (!canDelete) {
      toast.error('You do not have permission to delete users');
      return;
    }
    if (window.confirm(`Delete user ${row.name || row.email || row.id}?`)) {
      const nextUsers = users.filter((item) => item.id !== row.id);
      setUsers(nextUsers);
      writeStoredData(USERS_KEY, nextUsers);
      logAudit({
        user,
        action: 'Deleted',
        module: 'Users',
        description: `Deleted user ${row.name || row.email || row.id}`
      });
      toast.success('User deleted successfully');
    }
  };

  const handleSave = (e) => {
    e.preventDefault();
    if (!formData.name || !formData.email || !formData.role || !formData.status) {
      toast.error('Please fill in all required fields');
      return;
    }

    const emailExists = users.some((row) =>
      row.email?.toLowerCase() === formData.email.toLowerCase() && row.id !== editingUser?.id
    );
    if (emailExists) {
      toast.error('A user with this email already exists');
      return;
    }

    if (editingUser) {
      const nextUsers = users.map((row) =>
        row.id === editingUser.id ? { ...row, ...formData } : row
      );
      setUsers(nextUsers);
      writeStoredData(USERS_KEY, nextUsers);
      logAudit({
        user,
        action: 'Updated',
        module: 'Users',
        description: `Updated user ${formData.name || formData.email}`
      });
      toast.success('User updated successfully');
    } else {
      const nextId = users.length
        ? Math.max(...users.map((row) => Number(String(row.id || '').split('-')[1]) || 0)) + 1
        : 1;
      const newUser = {
        id: `USR-${String(nextId).padStart(3, '0')}`,
        ...formData
      };
      const nextUsers = [newUser, ...users];
      setUsers(nextUsers);
      writeStoredData(USERS_KEY, nextUsers);
      logAudit({
        user,
        action: 'Created',
        module: 'Users',
        description: `Created user ${newUser.name || newUser.email}`
      });
      toast.success('User added successfully');
    }

    setShowModal(false);
    setEditingUser(null);
  };

  const columns = [
    { label: 'ID', key: 'id' },
    { label: 'Name', key: 'name' },
    { label: 'Email', key: 'email' },
    {
      label: 'Role',
      key: 'role',
      render: (row) => (
        <span className="capitalize text-gray-900 dark:text-gray-100">{row.role}</span>
      )
    },
    {
      label: 'Status',
      key: 'status',
      render: (row) => (
        <Badge variant={row.status === 'Active' ? 'success' : 'danger'}>{row.status}</Badge>
      )
    },
    {
      label: 'Actions',
      key: 'actions',
      render: (row) => (
        <div className="flex gap-2">
          {canEdit && (
            <Button size="sm" variant="secondary" onClick={() => handleOpenEdit(row)}>
              Edit
            </Button>
          )}
          {canDelete && (
            <Button size="sm" variant="danger" onClick={() => handleDelete(row)}>
              Delete
            </Button>
          )}
        </div>
      )
    }
  ];

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold text-gray-800">Users</h1>
        <Button onClick={handleOpenAdd} disabled={!canCreate}>Add User</Button>
      </div>

      <Card className="mb-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Input
            label="Search"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search by name or email"
          />
          <Select
            label="Role"
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
            options={[{ value: '', label: 'All Roles' }, ...roleOptions]}
          />
          <Select
            label="Status"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            options={[{ value: '', label: 'All Status' }, ...statusOptions]}
          />
        </div>
      </Card>

      <Card>
        <Table columns={columns} data={filteredUsers} emptyMessage="No users found" />
      </Card>

      <Modal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        title={editingUser ? 'Edit User' : 'Add User'}
      >
        <form onSubmit={handleSave} className="space-y-4">
          <Input
            label="Full Name"
            name="name"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            required
          />
          <Input
            label="Email"
            name="email"
            type="email"
            value={formData.email}
            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
            required
          />
          <Select
            label="Role"
            name="role"
            value={formData.role}
            onChange={(e) => setFormData({ ...formData, role: e.target.value })}
            options={roleOptions}
            required
          />
          <Select
            label="Status"
            name="status"
            value={formData.status}
            onChange={(e) => setFormData({ ...formData, status: e.target.value })}
            options={statusOptions}
            required
          />
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="secondary" type="button" onClick={() => setShowModal(false)}>
              Cancel
            </Button>
            <Button type="submit">{editingUser ? 'Update User' : 'Add User'}</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default Users;
