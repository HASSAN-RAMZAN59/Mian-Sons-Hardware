import React, { useEffect, useState } from 'react';
import { FaShieldAlt, FaExclamationTriangle, FaCheckCircle, FaClock, FaTimesCircle, FaFileAlt } from 'react-icons/fa';
import Card from '../../components/common/Card';
import Button from '../../components/common/Button';
import Input from '../../components/common/Input';
import Select from '../../components/common/Select';
import Modal from '../../components/common/Modal';
import Badge from '../../components/common/Badge';
import { useAuth } from '../../context/AuthContext';
import { toast } from 'react-toastify';
import { logAudit } from '../../utils/audit';

const Warranties = () => {
  const { checkPermission, user } = useAuth();
  const [showClaimModal, setShowClaimModal] = useState(false);
  const [selectedWarranty, setSelectedWarranty] = useState(null);
  const [statusFilter, setStatusFilter] = useState('All');
  const WARRANTIES_KEY = 'admin_warranties';

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

  // Warranty Data
  const [warranties, setWarranties] = useState([]);

  // Claim Form State
  const [claimForm, setClaimForm] = useState({
    issue: '',
    description: '',
    claimDate: new Date().toISOString().split('T')[0],
  });

  useEffect(() => {
    setWarranties(readStoredData(WARRANTIES_KEY, []));
  }, []);

  useEffect(() => {
    const handleStorage = (event) => {
      if (event?.key && event.key !== WARRANTIES_KEY) return;
      setWarranties(readStoredData(WARRANTIES_KEY, []));
    };

    const handleCustomUpdate = (event) => {
      const key = event?.detail?.key;
      if (key && key !== WARRANTIES_KEY) return;
      setWarranties(readStoredData(WARRANTIES_KEY, []));
    };

    window.addEventListener('storage', handleStorage);
    window.addEventListener('app-storage-updated', handleCustomUpdate);

    return () => {
      window.removeEventListener('storage', handleStorage);
      window.removeEventListener('app-storage-updated', handleCustomUpdate);
    };
  }, []);

  // Calculate warranty status
  const getWarrantyStatus = (expiryDate) => {
    const today = new Date();
    const expiry = new Date(expiryDate);
    const daysUntilExpiry = Math.ceil((expiry - today) / (1000 * 60 * 60 * 24));

    if (daysUntilExpiry < 0) return 'Expired';
    if (daysUntilExpiry <= 30) return 'Expiring Soon';
    return 'Active';
  };

  // Get days remaining
  const getDaysRemaining = (expiryDate) => {
    const today = new Date();
    const expiry = new Date(expiryDate);
    const daysUntilExpiry = Math.ceil((expiry - today) / (1000 * 60 * 60 * 24));
    return daysUntilExpiry;
  };

  // Filter warranties
  const filteredWarranties = warranties.filter((warranty) => {
    if (statusFilter === 'All') return true;
    const status = warranty.status === 'Active' ? getWarrantyStatus(warranty.expiryDate) : warranty.status;
    return status === statusFilter;
  });

  // Get expiring soon warranties
  const expiringSoonWarranties = warranties.filter(
    (w) => getWarrantyStatus(w.expiryDate) === 'Expiring Soon'
  );

  // Calculate statistics
  const activeWarranties = warranties.filter((w) => getWarrantyStatus(w.expiryDate) === 'Active').length;
  const expiringSoon = warranties.filter((w) => getWarrantyStatus(w.expiryDate) === 'Expiring Soon').length;
  const expiredWarranties = warranties.filter((w) => w.status === 'Expired').length;
  const claimedWarranties = warranties.filter((w) => w.status === 'Claimed').length;

  // Handle Claim Warranty
  const handleOpenClaimModal = (warranty) => {
    if (!checkPermission('warranties', 'update')) {
      toast.error('You do not have permission to claim warranties');
      return;
    }
    setSelectedWarranty(warranty);
    setClaimForm({
      issue: '',
      description: '',
      claimDate: new Date().toISOString().split('T')[0],
    });
    setShowClaimModal(true);
  };

  // Handle Close Claim Modal
  const handleCloseClaimModal = () => {
    setShowClaimModal(false);
    setSelectedWarranty(null);
    setClaimForm({
      issue: '',
      description: '',
      claimDate: new Date().toISOString().split('T')[0],
    });
  };

  // Handle Claim Submit
  const handleClaimSubmit = (e) => {
    e.preventDefault();

    if (!claimForm.issue || !claimForm.description) {
      toast.error('Please fill in all required fields');
      return;
    }

    const nextWarranties = warranties.map((w) =>
      w.id === selectedWarranty.id
        ? {
            ...w,
            status: 'Claimed',
            claimHistory: [
              ...(w.claimHistory || []),
              {
                claimDate: claimForm.claimDate,
                issue: claimForm.issue,
                description: claimForm.description,
                status: 'Pending',
              },
            ],
          }
        : w
    );
    setWarranties(nextWarranties);
    writeStoredData(WARRANTIES_KEY, nextWarranties);
    logAudit({
      user,
      action: 'Updated',
      module: 'Warranties',
      description: `Warranty claim submitted for ${selectedWarranty.product || selectedWarranty.id}`
    });
    toast.success('Warranty claim submitted successfully!');
    handleCloseClaimModal();
  };

  // Get status badge
  const getStatusBadge = (warranty) => {
    const status = warranty.status === 'Active' ? getWarrantyStatus(warranty.expiryDate) : warranty.status;
    
    switch (status) {
      case 'Active':
        return <Badge variant="success"><FaCheckCircle className="inline mr-1" />Active</Badge>;
      case 'Expiring Soon':
        return <Badge variant="warning"><FaClock className="inline mr-1" />Expiring Soon</Badge>;
      case 'Expired':
        return <Badge variant="danger"><FaTimesCircle className="inline mr-1" />Expired</Badge>;
      case 'Claimed':
        return <Badge variant="info"><FaFileAlt className="inline mr-1" />Claimed</Badge>;
      default:
        return <Badge>{status}</Badge>;
    }
  };

  // Get status color class
  const getStatusColorClass = (warranty) => {
    const status = warranty.status === 'Active' ? getWarrantyStatus(warranty.expiryDate) : warranty.status;
    
    switch (status) {
      case 'Active':
        return 'bg-green-50 dark:bg-green-900/20';
      case 'Expiring Soon':
        return 'bg-yellow-50 dark:bg-yellow-900/20';
      case 'Expired':
        return 'bg-red-50 dark:bg-red-900/20';
      case 'Claimed':
        return 'bg-blue-50 dark:bg-blue-900/20';
      default:
        return '';
    }
  };

  return (
    <div>
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-800 dark:text-white">Warranty Management</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">Track and manage product warranties</p>
        </div>
      </div>

      {/* Alert Section - Expiring Soon */}
      {expiringSoonWarranties.length > 0 && (
        <div className="mb-6 p-4 bg-yellow-50 dark:bg-yellow-900/20 border-l-4 border-yellow-500 rounded-lg">
          <div className="flex items-center mb-2">
            <FaExclamationTriangle className="text-yellow-600 dark:text-yellow-400 mr-2" />
            <h3 className="text-lg font-semibold text-yellow-800 dark:text-yellow-200">
              Warranties Expiring in Next 30 Days
            </h3>
          </div>
          <div className="space-y-2">
            {expiringSoonWarranties.map((warranty) => (
              <div key={warranty.id} className="flex justify-between items-center text-sm text-yellow-700 dark:text-yellow-300">
                <span>
                  <strong>{warranty.product}</strong> ({warranty.brand} {warranty.model}) - Customer: {warranty.customer}
                </span>
                <span className="font-semibold">
                  Expires in {getDaysRemaining(warranty.expiryDate)} days ({new Date(warranty.expiryDate).toLocaleDateString()})
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
        <Card>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Active Warranties</p>
              <p className="text-2xl font-bold text-gray-800 dark:text-white mt-1">{activeWarranties}</p>
            </div>
            <div className="p-3 bg-green-100 dark:bg-green-900 rounded-lg">
              <FaCheckCircle className="text-2xl text-green-600 dark:text-green-400" />
            </div>
          </div>
        </Card>

        <Card>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Expiring Soon</p>
              <p className="text-2xl font-bold text-gray-800 dark:text-white mt-1">{expiringSoon}</p>
            </div>
            <div className="p-3 bg-yellow-100 dark:bg-yellow-900 rounded-lg">
              <FaClock className="text-2xl text-yellow-600 dark:text-yellow-400" />
            </div>
          </div>
        </Card>

        <Card>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Expired</p>
              <p className="text-2xl font-bold text-gray-800 dark:text-white mt-1">{expiredWarranties}</p>
            </div>
            <div className="p-3 bg-red-100 dark:bg-red-900 rounded-lg">
              <FaTimesCircle className="text-2xl text-red-600 dark:text-red-400" />
            </div>
          </div>
        </Card>

        <Card>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Claimed</p>
              <p className="text-2xl font-bold text-gray-800 dark:text-white mt-1">{claimedWarranties}</p>
            </div>
            <div className="p-3 bg-blue-100 dark:bg-blue-900 rounded-lg">
              <FaFileAlt className="text-2xl text-blue-600 dark:text-blue-400" />
            </div>
          </div>
        </Card>
      </div>

      {/* Filter Section */}
      <div className="mb-6">
        <Card>
          <div className="flex items-center space-x-4">
            <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Filter by Status:</label>
            <Select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-48"
            >
              <option value="All">All Warranties</option>
              <option value="Active">Active</option>
              <option value="Expiring Soon">Expiring Soon</option>
              <option value="Expired">Expired</option>
              <option value="Claimed">Claimed</option>
            </Select>
            <span className="text-sm text-gray-600 dark:text-gray-400">
              Showing {filteredWarranties.length} of {warranties.length} warranties
            </span>
          </div>
        </Card>
      </div>

      {/* Warranties Table */}
      <Card>
        <h2 className="text-xl font-bold text-gray-800 dark:text-white mb-4">Warranty Records</h2>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
            <thead className="bg-gray-50 dark:bg-gray-800">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  ID
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Product
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Brand
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Model
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Serial No
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Customer
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Purchase Date
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Warranty Period
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Expiry Date
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
              {filteredWarranties.map((warranty) => (
                <tr key={warranty.id} className={`${getStatusColorClass(warranty)} hover:opacity-80 transition-opacity`}>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">
                    {warranty.id}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">
                    {warranty.product}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                    {warranty.brand}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                    {warranty.model}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400 font-mono">
                    {warranty.serialNo}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900 dark:text-white">{warranty.customer}</div>
                    <div className="text-xs text-gray-500 dark:text-gray-400">{warranty.customerPhone}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                    {new Date(warranty.purchaseDate).toLocaleDateString()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                    {warranty.warrantyPeriod}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900 dark:text-white">
                      {new Date(warranty.expiryDate).toLocaleDateString()}
                    </div>
                    {warranty.status === 'Active' && getDaysRemaining(warranty.expiryDate) > 0 && (
                      <div className="text-xs text-gray-500 dark:text-gray-400">
                        {getDaysRemaining(warranty.expiryDate)} days remaining
                      </div>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {getStatusBadge(warranty)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    {warranty.status !== 'Claimed' && warranty.status !== 'Expired' && (
                      <button
                        onClick={() => handleOpenClaimModal(warranty)}
                        className="text-blue-600 hover:text-blue-900 dark:text-blue-400 dark:hover:text-blue-300 flex items-center"
                        title="Claim Warranty"
                      >
                        <FaShieldAlt className="mr-1" />
                        Claim
                      </button>
                    )}
                    {warranty.status === 'Claimed' && (
                      <span className="text-xs text-gray-500 dark:text-gray-400">
                        {warranty.claimHistory.length} claim(s)
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Claim Warranty Modal */}
      <Modal isOpen={showClaimModal} onClose={handleCloseClaimModal} title="Claim Warranty">
        {selectedWarranty && (
          <div className="mb-4 p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
            <h3 className="font-semibold text-gray-800 dark:text-white mb-2">Warranty Details</h3>
            <div className="grid grid-cols-2 gap-2 text-sm">
              <div>
                <span className="text-gray-600 dark:text-gray-400">Product:</span>
                <span className="ml-2 font-medium text-gray-900 dark:text-white">{selectedWarranty.product}</span>
              </div>
              <div>
                <span className="text-gray-600 dark:text-gray-400">Brand:</span>
                <span className="ml-2 font-medium text-gray-900 dark:text-white">{selectedWarranty.brand}</span>
              </div>
              <div>
                <span className="text-gray-600 dark:text-gray-400">Model:</span>
                <span className="ml-2 font-medium text-gray-900 dark:text-white">{selectedWarranty.model}</span>
              </div>
              <div>
                <span className="text-gray-600 dark:text-gray-400">Serial No:</span>
                <span className="ml-2 font-medium text-gray-900 dark:text-white font-mono">{selectedWarranty.serialNo}</span>
              </div>
              <div>
                <span className="text-gray-600 dark:text-gray-400">Customer:</span>
                <span className="ml-2 font-medium text-gray-900 dark:text-white">{selectedWarranty.customer}</span>
              </div>
              <div>
                <span className="text-gray-600 dark:text-gray-400">Expiry:</span>
                <span className="ml-2 font-medium text-gray-900 dark:text-white">
                  {new Date(selectedWarranty.expiryDate).toLocaleDateString()}
                </span>
              </div>
            </div>
          </div>
        )}

        <form onSubmit={handleClaimSubmit} className="space-y-4">
          {/* Claim Date */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Claim Date <span className="text-red-500">*</span>
            </label>
            <Input
              type="date"
              value={claimForm.claimDate}
              onChange={(e) => setClaimForm({ ...claimForm, claimDate: e.target.value })}
              required
            />
          </div>

          {/* Issue */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Issue <span className="text-red-500">*</span>
            </label>
            <Input
              type="text"
              value={claimForm.issue}
              onChange={(e) => setClaimForm({ ...claimForm, issue: e.target.value })}
              placeholder="e.g., Motor malfunction, Power failure, etc."
              required
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Description <span className="text-red-500">*</span>
            </label>
            <textarea
              value={claimForm.description}
              onChange={(e) => setClaimForm({ ...claimForm, description: e.target.value })}
              rows="4"
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
              placeholder="Describe the issue in detail..."
              required
            ></textarea>
          </div>

          {/* Submit Buttons */}
          <div className="flex justify-end space-x-3 mt-6">
            <Button type="button" variant="secondary" onClick={handleCloseClaimModal}>
              Cancel
            </Button>
            <Button type="submit">Submit Claim</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default Warranties;
