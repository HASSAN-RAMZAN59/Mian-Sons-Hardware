import React, { useEffect, useState } from 'react';
import { FaSave, FaDatabase, FaDownload, FaUpload, FaKey, FaStore, FaFileInvoice, FaBell, FaCog } from 'react-icons/fa';
import { Navigate } from 'react-router-dom';
import Card from '../../components/common/Card';
import Button from '../../components/common/Button';
import Input from '../../components/common/Input';
import Select from '../../components/common/Select';
import { useAuth } from '../../context/AuthContext';
import { toast } from 'react-toastify';

const Settings = () => {
  const { user: currentUser } = useAuth();

  const STORE_INFO_KEY = 'admin_store_info';

  // Active Tab State
  const [activeTab, setActiveTab] = useState('store');

  // Store Information State
  const [storeInfo, setStoreInfo] = useState({
    storeName: 'Mian & Sons Hardware Store',
    logoUrl: '',
    tagline: 'Your Trusted Hardware Partner',
    address: '59-JB Amin Pur Road',
    city: 'Faisalabad',
    phone: '+92-342-6435527',
    whatsapp: '+92-342-6435527',
    email: 'info@miansons.pk',
    website: 'www.miansons.pk',
    facebook: 'facebook.com/miansonshardware',
    instagram: '@miansonshardware',
    ntnNumber: 'NTN-1234567-8',
    gstNumber: 'GST-PAK-987654',
    workingHours: {
      weekdaysLabel: 'Mon - Sat',
      weekdaysTime: '9:00 AM - 9:00 PM',
      sundayLabel: 'Sunday',
      sundayTime: '11:00 AM - 6:00 PM'
    }
  });

  useEffect(() => {
    try {
      const storedStoreInfo = JSON.parse(localStorage.getItem(STORE_INFO_KEY) || 'null');
      if (storedStoreInfo && typeof storedStoreInfo === 'object') {
        setStoreInfo((prev) => ({ ...prev, ...storedStoreInfo }));
      }
    } catch (error) {
      // Ignore malformed storage data.
    }
  }, [STORE_INFO_KEY]);

  // Invoice Settings State
  const [invoiceSettings, setInvoiceSettings] = useState({
    invoicePrefix: 'INV-',
    startingNumber: '1001',
    showTax: true,
    taxRate: '18',
    footerMessage: 'Thank you for your business!',
    returnPolicy: 'Returns accepted within 7 days with original receipt.',
    signatureLabel1: 'Customer Signature',
    signatureLabel2: 'Authorized Signature',
  });

  // Notification Settings State
  const [notificationSettings, setNotificationSettings] = useState({
    lowStockThreshold: '10',
    emailNotifications: {
      lowStock: true,
      newOrder: true,
      dailyReport: false,
      paymentReceived: true,
      newCustomer: false,
    },
    smsNotifications: {
      lowStock: true,
      newOrder: false,
      paymentReceived: false,
    },
  });

  // System Settings State
  const [systemSettings, setSystemSettings] = useState({
    currencySymbol: 'Rs.',
    dateFormat: 'DD/MM/YYYY',
    language: 'English',
    maintenanceMode: false,
  });

  // Backup Settings State
  const [backupInfo, setBackupInfo] = useState({
    lastBackupDate: '2026-03-10 11:30 PM',
    autoBackup: true,
  });

  // Change Password State
  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });

  // Check if user has access (superadmin only)
  if (currentUser?.role !== 'superadmin') {
    toast.error('Access denied. This page is only accessible to superadmins.');
    return <Navigate to="/dashboard" replace />;
  }

  // Tabs Configuration
  const tabs = [
    { id: 'store', label: 'Store Information', icon: <FaStore /> },
    { id: 'invoice', label: 'Invoice Settings', icon: <FaFileInvoice /> },
    { id: 'notifications', label: 'Notifications', icon: <FaBell /> },
    { id: 'system', label: 'System Settings', icon: <FaCog /> },
    { id: 'backup', label: 'Backup & Data', icon: <FaDatabase /> },
    { id: 'password', label: 'Change Password', icon: <FaKey /> },
  ];

  // Handle Store Info Save
  const handleSaveStoreInfo = () => {
    localStorage.setItem(STORE_INFO_KEY, JSON.stringify(storeInfo));
    window.dispatchEvent(new CustomEvent('app-storage-updated', { detail: { key: STORE_INFO_KEY } }));
    toast.success('Store information saved successfully!');
  };

  // Handle Invoice Settings Save
  const handleSaveInvoiceSettings = () => {
    toast.success('Invoice settings saved successfully!');
  };

  // Handle Notification Settings Save
  const handleSaveNotificationSettings = () => {
    toast.success('Notification settings saved successfully!');
  };

  // Handle System Settings Save
  const handleSaveSystemSettings = () => {
    if (systemSettings.maintenanceMode) {
      toast.warning('Maintenance mode activated! Users will see a maintenance page.');
    } else {
      toast.success('System settings saved successfully!');
    }
  };

  // Handle Backup Database
  const handleBackupDatabase = () => {
    toast.info('Creating database backup...');
    setTimeout(() => {
      setBackupInfo({ ...backupInfo, lastBackupDate: new Date().toLocaleString() });
      toast.success('Database backup created successfully!');
    }, 2000);
  };

  // Handle Export All Data
  const handleExportAllData = () => {
    toast.info('Exporting all data...');
    setTimeout(() => {
      toast.success('All data exported successfully!');
    }, 1500);
  };

  // Handle Restore Backup
  const handleRestoreBackup = () => {
    if (window.confirm('Are you sure you want to restore from backup? Current data will be replaced.')) {
      toast.info('Restoring from backup...');
      setTimeout(() => {
        toast.success('Data restored successfully!');
      }, 2000);
    }
  };

  // Handle Change Password
  const handleChangePassword = () => {
    if (!passwordData.currentPassword || !passwordData.newPassword || !passwordData.confirmPassword) {
      toast.error('Please fill in all password fields!');
      return;
    }

    if (passwordData.newPassword !== passwordData.confirmPassword) {
      toast.error('New password and confirm password do not match!');
      return;
    }

    if (passwordData.newPassword.length < 6) {
      toast.error('New password must be at least 6 characters long!');
      return;
    }

    toast.success('Password changed successfully!');
    setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' });
  };

  // Handle Logo Upload
  const handleLogoUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setStoreInfo({ ...storeInfo, logoUrl: reader.result });
        toast.success('Logo uploaded successfully!');
      };
      reader.readAsDataURL(file);
    }
  };

  return (
    <div>
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-800 dark:text-white">Settings</h1>
        <p className="text-gray-600 dark:text-gray-400 mt-1">
          Manage your store settings and configurations
        </p>
      </div>

      {/* Tabs Navigation */}
      <div className="mb-6 border-b border-gray-200 dark:border-gray-700">
        <div className="flex flex-wrap -mb-px">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`inline-flex items-center px-6 py-3 border-b-2 font-medium text-sm transition-colors ${
                activeTab === tab.id
                  ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300'
              }`}
            >
              <span className="mr-2">{tab.icon}</span>
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Tab Content */}
      <div>
        {/* Store Information Tab */}
        {activeTab === 'store' && (
          <Card>
            <h2 className="text-xl font-bold text-gray-800 dark:text-white mb-4">Store Information</h2>
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Input
                  label="Store Name"
                  value={storeInfo.storeName}
                  onChange={(e) => setStoreInfo({ ...storeInfo, storeName: e.target.value })}
                />
                <Input
                  label="Tagline"
                  value={storeInfo.tagline}
                  onChange={(e) => setStoreInfo({ ...storeInfo, tagline: e.target.value })}
                />
              </div>

              {/* Logo Upload */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Store Logo
                </label>
                <div className="flex items-center space-x-4">
                  {storeInfo.logoUrl && (
                    <img src={storeInfo.logoUrl} alt="Store Logo" className="h-20 w-20 object-cover rounded" />
                  )}
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleLogoUpload}
                    className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="md:col-span-2">
                  <Input
                    label="Address"
                    value={storeInfo.address}
                    onChange={(e) => setStoreInfo({ ...storeInfo, address: e.target.value })}
                  />
                </div>
                <Input
                  label="City"
                  value={storeInfo.city}
                  onChange={(e) => setStoreInfo({ ...storeInfo, city: e.target.value })}
                />
                <Input
                  label="Phone"
                  value={storeInfo.phone}
                  onChange={(e) => setStoreInfo({ ...storeInfo, phone: e.target.value })}
                />
                <Input
                  label="WhatsApp"
                  value={storeInfo.whatsapp}
                  onChange={(e) => setStoreInfo({ ...storeInfo, whatsapp: e.target.value })}
                />
                <Input
                  label="Email"
                  type="email"
                  value={storeInfo.email}
                  onChange={(e) => setStoreInfo({ ...storeInfo, email: e.target.value })}
                />
                <Input
                  label="Website"
                  value={storeInfo.website}
                  onChange={(e) => setStoreInfo({ ...storeInfo, website: e.target.value })}
                />
                <Input
                  label="Facebook"
                  value={storeInfo.facebook}
                  onChange={(e) => setStoreInfo({ ...storeInfo, facebook: e.target.value })}
                />
                <Input
                  label="Instagram"
                  value={storeInfo.instagram}
                  onChange={(e) => setStoreInfo({ ...storeInfo, instagram: e.target.value })}
                />
                <Input
                  label="Working Days Label"
                  value={storeInfo.workingHours.weekdaysLabel}
                  onChange={(e) => setStoreInfo({
                    ...storeInfo,
                    workingHours: { ...storeInfo.workingHours, weekdaysLabel: e.target.value }
                  })}
                />
                <Input
                  label="Working Days Time"
                  value={storeInfo.workingHours.weekdaysTime}
                  onChange={(e) => setStoreInfo({
                    ...storeInfo,
                    workingHours: { ...storeInfo.workingHours, weekdaysTime: e.target.value }
                  })}
                />
                <Input
                  label="Sunday Label"
                  value={storeInfo.workingHours.sundayLabel}
                  onChange={(e) => setStoreInfo({
                    ...storeInfo,
                    workingHours: { ...storeInfo.workingHours, sundayLabel: e.target.value }
                  })}
                />
                <Input
                  label="Sunday Time"
                  value={storeInfo.workingHours.sundayTime}
                  onChange={(e) => setStoreInfo({
                    ...storeInfo,
                    workingHours: { ...storeInfo.workingHours, sundayTime: e.target.value }
                  })}
                />
                <Input
                  label="NTN Number"
                  value={storeInfo.ntnNumber}
                  onChange={(e) => setStoreInfo({ ...storeInfo, ntnNumber: e.target.value })}
                />
                <Input
                  label="GST Number"
                  value={storeInfo.gstNumber}
                  onChange={(e) => setStoreInfo({ ...storeInfo, gstNumber: e.target.value })}
                />
              </div>

              <div className="flex justify-end pt-4">
                <Button onClick={handleSaveStoreInfo}>
                  <FaSave className="mr-2" />
                  Save Store Information
                </Button>
              </div>
            </div>
          </Card>
        )}

        {/* Invoice Settings Tab */}
        {activeTab === 'invoice' && (
          <Card>
            <h2 className="text-xl font-bold text-gray-800 dark:text-white mb-4">Invoice Settings</h2>
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Input
                  label="Invoice Prefix"
                  value={invoiceSettings.invoicePrefix}
                  onChange={(e) => setInvoiceSettings({ ...invoiceSettings, invoicePrefix: e.target.value })}
                  placeholder="INV-, BILL-"
                />
                <Input
                  label="Starting Invoice Number"
                  type="number"
                  value={invoiceSettings.startingNumber}
                  onChange={(e) => setInvoiceSettings({ ...invoiceSettings, startingNumber: e.target.value })}
                />
              </div>

              {/* Show Tax Toggle */}
              <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                <div>
                  <p className="font-medium text-gray-800 dark:text-white">Show Tax on Invoice</p>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Display tax calculations on invoices</p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={invoiceSettings.showTax}
                    onChange={(e) => setInvoiceSettings({ ...invoiceSettings, showTax: e.target.checked })}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-blue-600"></div>
                </label>
              </div>

              <Input
                label="Tax Rate (%)"
                type="number"
                value={invoiceSettings.taxRate}
                onChange={(e) => setInvoiceSettings({ ...invoiceSettings, taxRate: e.target.value })}
              />

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Invoice Footer Message
                </label>
                <textarea
                  value={invoiceSettings.footerMessage}
                  onChange={(e) => setInvoiceSettings({ ...invoiceSettings, footerMessage: e.target.value })}
                  rows="3"
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Return Policy Text
                </label>
                <textarea
                  value={invoiceSettings.returnPolicy}
                  onChange={(e) => setInvoiceSettings({ ...invoiceSettings, returnPolicy: e.target.value })}
                  rows="3"
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Input
                  label="Signature Field 1 Label"
                  value={invoiceSettings.signatureLabel1}
                  onChange={(e) => setInvoiceSettings({ ...invoiceSettings, signatureLabel1: e.target.value })}
                />
                <Input
                  label="Signature Field 2 Label"
                  value={invoiceSettings.signatureLabel2}
                  onChange={(e) => setInvoiceSettings({ ...invoiceSettings, signatureLabel2: e.target.value })}
                />
              </div>

              <div className="flex justify-end pt-4">
                <Button onClick={handleSaveInvoiceSettings}>
                  <FaSave className="mr-2" />
                  Save Invoice Settings
                </Button>
              </div>
            </div>
          </Card>
        )}

        {/* Notification Settings Tab */}
        {activeTab === 'notifications' && (
          <Card>
            <h2 className="text-xl font-bold text-gray-800 dark:text-white mb-4">Notification Settings</h2>
            <div className="space-y-4">
              <Input
                label="Low Stock Threshold"
                type="number"
                value={notificationSettings.lowStockThreshold}
                onChange={(e) =>
                  setNotificationSettings({ ...notificationSettings, lowStockThreshold: e.target.value })
                }
                helper="Trigger alert when stock falls below this number"
              />

              {/* Email Notifications */}
              <div className="border-t border-gray-200 dark:border-gray-700 pt-4">
                <h3 className="text-lg font-semibold text-gray-800 dark:text-white mb-3">Email Notifications</h3>
                <div className="space-y-3">
                  {Object.keys(notificationSettings.emailNotifications).map((key) => (
                    <div key={key} className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                      <div>
                        <p className="font-medium text-gray-800 dark:text-white capitalize">
                          {key.replace(/([A-Z])/g, ' $1').trim()}
                        </p>
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                          Receive email notifications for {key.replace(/([A-Z])/g, ' $1').toLowerCase()}
                        </p>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input
                          type="checkbox"
                          checked={notificationSettings.emailNotifications[key]}
                          onChange={(e) =>
                            setNotificationSettings({
                              ...notificationSettings,
                              emailNotifications: {
                                ...notificationSettings.emailNotifications,
                                [key]: e.target.checked,
                              },
                            })
                          }
                          className="sr-only peer"
                        />
                        <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-blue-600"></div>
                      </label>
                    </div>
                  ))}
                </div>
              </div>

              {/* SMS Notifications */}
              <div className="border-t border-gray-200 dark:border-gray-700 pt-4">
                <h3 className="text-lg font-semibold text-gray-800 dark:text-white mb-3">SMS Notifications</h3>
                <div className="space-y-3">
                  {Object.keys(notificationSettings.smsNotifications).map((key) => (
                    <div key={key} className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                      <div>
                        <p className="font-medium text-gray-800 dark:text-white capitalize">
                          {key.replace(/([A-Z])/g, ' $1').trim()}
                        </p>
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                          Receive SMS notifications for {key.replace(/([A-Z])/g, ' $1').toLowerCase()}
                        </p>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input
                          type="checkbox"
                          checked={notificationSettings.smsNotifications[key]}
                          onChange={(e) =>
                            setNotificationSettings({
                              ...notificationSettings,
                              smsNotifications: {
                                ...notificationSettings.smsNotifications,
                                [key]: e.target.checked,
                              },
                            })
                          }
                          className="sr-only peer"
                        />
                        <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-blue-600"></div>
                      </label>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex justify-end pt-4">
                <Button onClick={handleSaveNotificationSettings}>
                  <FaSave className="mr-2" />
                  Save Notification Settings
                </Button>
              </div>
            </div>
          </Card>
        )}

        {/* System Settings Tab */}
        {activeTab === 'system' && (
          <Card>
            <h2 className="text-xl font-bold text-gray-800 dark:text-white mb-4">System Settings</h2>
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Select
                  label="Currency Symbol"
                  value={systemSettings.currencySymbol}
                  onChange={(e) => setSystemSettings({ ...systemSettings, currencySymbol: e.target.value })}
                  options={[
                    { value: 'Rs.', label: 'Rs. (Rupees)' },
                    { value: 'PKR', label: 'PKR (Pakistani Rupee)' },
                    { value: '$', label: '$ (Dollar)' },
                    { value: '€', label: '€ (Euro)' },
                  ]}
                />
                <Select
                  label="Date Format"
                  value={systemSettings.dateFormat}
                  onChange={(e) => setSystemSettings({ ...systemSettings, dateFormat: e.target.value })}
                  options={[
                    { value: 'DD/MM/YYYY', label: 'DD/MM/YYYY' },
                    { value: 'MM/DD/YYYY', label: 'MM/DD/YYYY' },
                    { value: 'YYYY-MM-DD', label: 'YYYY-MM-DD' },
                  ]}
                />
                <Select
                  label="Language"
                  value={systemSettings.language}
                  onChange={(e) => setSystemSettings({ ...systemSettings, language: e.target.value })}
                  options={[
                    { value: 'English', label: 'English' },
                    { value: 'Urdu', label: 'اردو (Urdu)' },
                  ]}
                />
              </div>

              {/* Maintenance Mode */}
              <div className="border-t border-gray-200 dark:border-gray-700 pt-4">
                <div className="flex items-center justify-between p-4 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg border border-yellow-200 dark:border-yellow-800">
                  <div>
                    <p className="font-medium text-gray-800 dark:text-white">Maintenance Mode</p>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      Enable maintenance mode to prevent user access while updating the system
                    </p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={systemSettings.maintenanceMode}
                      onChange={(e) =>
                        setSystemSettings({ ...systemSettings, maintenanceMode: e.target.checked })
                      }
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-yellow-300 dark:peer-focus:ring-yellow-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-yellow-600"></div>
                  </label>
                </div>
              </div>

              <div className="flex justify-end pt-4">
                <Button onClick={handleSaveSystemSettings}>
                  <FaSave className="mr-2" />
                  Save System Settings
                </Button>
              </div>
            </div>
          </Card>
        )}

        {/* Backup & Data Tab */}
        {activeTab === 'backup' && (
          <Card>
            <h2 className="text-xl font-bold text-gray-800 dark:text-white mb-4">Backup & Data Management</h2>
            <div className="space-y-6">
              {/* Last Backup Info */}
              <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-gray-800 dark:text-white">Last Backup</p>
                    <p className="text-sm text-gray-600 dark:text-gray-400">{backupInfo.lastBackupDate}</p>
                  </div>
                  <FaDatabase className="text-3xl text-blue-600 dark:text-blue-400" />
                </div>
              </div>

              {/* Backup Actions */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="p-6 bg-gray-50 dark:bg-gray-800 rounded-lg text-center">
                  <FaDatabase className="text-4xl text-blue-600 dark:text-blue-400 mx-auto mb-3" />
                  <h3 className="font-semibold text-gray-800 dark:text-white mb-2">Backup Database</h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                    Create a complete backup of your database
                  </p>
                  <Button onClick={handleBackupDatabase} className="w-full">
                    <FaDatabase className="mr-2" />
                    Backup Now
                  </Button>
                </div>

                <div className="p-6 bg-gray-50 dark:bg-gray-800 rounded-lg text-center">
                  <FaDownload className="text-4xl text-green-600 dark:text-green-400 mx-auto mb-3" />
                  <h3 className="font-semibold text-gray-800 dark:text-white mb-2">Export All Data</h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                    Download all your data as CSV/Excel files
                  </p>
                  <Button onClick={handleExportAllData} variant="success" className="w-full">
                    <FaDownload className="mr-2" />
                    Export Data
                  </Button>
                </div>

                <div className="p-6 bg-gray-50 dark:bg-gray-800 rounded-lg text-center">
                  <FaUpload className="text-4xl text-orange-600 dark:text-orange-400 mx-auto mb-3" />
                  <h3 className="font-semibold text-gray-800 dark:text-white mb-2">Restore Backup</h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                    Restore your data from a previous backup
                  </p>
                  <Button onClick={handleRestoreBackup} variant="warning" className="w-full">
                    <FaUpload className="mr-2" />
                    Restore
                  </Button>
                </div>
              </div>

              {/* Auto Backup Toggle */}
              <div className="border-t border-gray-200 dark:border-gray-700 pt-4">
                <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                  <div>
                    <p className="font-medium text-gray-800 dark:text-white">Automatic Daily Backup</p>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      Automatically backup your database every day at midnight
                    </p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={backupInfo.autoBackup}
                      onChange={(e) => setBackupInfo({ ...backupInfo, autoBackup: e.target.checked })}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-blue-600"></div>
                  </label>
                </div>
              </div>
            </div>
          </Card>
        )}

        {/* Change Password Tab */}
        {activeTab === 'password' && (
          <Card>
            <h2 className="text-xl font-bold text-gray-800 dark:text-white mb-4">Change Password</h2>
            <div className="max-w-md space-y-4">
              <Input
                label="Current Password"
                type="password"
                value={passwordData.currentPassword}
                onChange={(e) => setPasswordData({ ...passwordData, currentPassword: e.target.value })}
              />
              <Input
                label="New Password"
                type="password"
                value={passwordData.newPassword}
                onChange={(e) => setPasswordData({ ...passwordData, newPassword: e.target.value })}
                helper="Minimum 6 characters"
              />
              <Input
                label="Confirm New Password"
                type="password"
                value={passwordData.confirmPassword}
                onChange={(e) => setPasswordData({ ...passwordData, confirmPassword: e.target.value })}
              />

              <div className="p-4 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg border border-yellow-200 dark:border-yellow-800">
                <p className="text-sm text-gray-700 dark:text-gray-300">
                  <strong>Password Tips:</strong>
                  <ul className="list-disc list-inside mt-2 space-y-1">
                    <li>Use at least 6 characters</li>
                    <li>Include uppercase and lowercase letters</li>
                    <li>Add numbers and special characters</li>
                    <li>Don't use common words or phrases</li>
                  </ul>
                </p>
              </div>

              <div className="flex justify-end pt-4">
                <Button onClick={handleChangePassword}>
                  <FaKey className="mr-2" />
                  Change Password
                </Button>
              </div>
            </div>
          </Card>
        )}
      </div>
    </div>
  );
};

export default Settings;
