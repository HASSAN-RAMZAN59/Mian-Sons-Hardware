import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import { useCart } from '../../../context/CartContext';
import { useWishlist } from '../../../context/WishlistContext';
import { useCustomerAuth } from '../../../context/CustomerAuthContext';

const navItems = [
  { key: 'profile', label: 'My Profile' },
  { key: 'orders', label: 'My Orders' },
  { key: 'wishlist', label: 'Wishlist' },
  { key: 'addresses', label: 'Addresses' },
  { key: 'password', label: 'Change Password' },
  { key: 'logout', label: 'Logout' }
];

const statusClasses = {
  Pending: 'bg-yellow-100 text-yellow-700',
  Processing: 'bg-blue-100 text-blue-700',
  Confirmed: 'bg-indigo-100 text-indigo-700',
  Dispatched: 'bg-purple-100 text-purple-700',
  Delivered: 'bg-green-100 text-green-700',
  Cancelled: 'bg-red-100 text-red-700'
};

const getPasswordChecks = (password) => ({
  minLength: password.length >= 8,
  upper: /[A-Z]/.test(password),
  lower: /[a-z]/.test(password),
  number: /\d/.test(password),
  special: /[^A-Za-z0-9]/.test(password)
});

const CustomerProfile = () => {
  const navigate = useNavigate();
  const { wishlistItems, removeFromWishlist, moveToCart } = useWishlist();
  const { addToCart, clearCart } = useCart();
  const { customerUser: customer, logoutCustomer, refreshCustomerAuth } = useCustomerAuth();

  const [activeTab, setActiveTab] = useState('profile');

  const [profileForm, setProfileForm] = useState({
    fullName: customer?.fullName || customer?.name || '',
    email: customer?.email || '',
    phone: customer?.phone || '',
    whatsapp: customer?.whatsapp || customer?.phone || '',
    address: customer?.address || '',
    city: customer?.city || '',
    customerType: customer?.customerType || 'Retail'
  });

  const [orders, setOrders] = useState(() => {
    try {
      const stored = JSON.parse(localStorage.getItem('website_orders') || '[]');
      return stored.map((order, index) => ({
        ...order,
        status: order.status || (index % 5 === 0 ? 'Pending' : index % 5 === 1 ? 'Processing' : index % 5 === 2 ? 'Dispatched' : index % 5 === 3 ? 'Delivered' : 'Confirmed')
      }));
    } catch {
      return [];
    }
  });

  const [addresses, setAddresses] = useState(() => {
    const initial = [
      {
        id: `addr_${Date.now()}`,
        label: 'Home',
        address: customer?.address || 'Main Road, Lahore',
        city: customer?.city || 'Lahore',
        isDefault: true
      }
    ];
    try {
      const stored = JSON.parse(localStorage.getItem('website_customer_addresses') || 'null');
      if (Array.isArray(stored) && stored.length) return stored;
      return initial;
    } catch {
      return initial;
    }
  });

  const [newAddress, setNewAddress] = useState({ label: '', address: '', city: '' });
  const [passwordForm, setPasswordForm] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' });
  const passwordChecks = getPasswordChecks(passwordForm.newPassword);
  const isStrongPassword = Object.values(passwordChecks).every(Boolean);

  const saveProfile = () => {
    const updatedCustomer = {
      ...customer,
      ...profileForm,
      name: profileForm.fullName
    };
    localStorage.setItem('customerUser', JSON.stringify(updatedCustomer));
    refreshCustomerAuth();
    toast.success('Profile updated successfully.');
  };

  const cancelOrder = (orderId) => {
    const next = orders.map((order) =>
      order.id === orderId && order.status === 'Pending' ? { ...order, status: 'Cancelled' } : order
    );
    setOrders(next);
    localStorage.setItem('website_orders', JSON.stringify(next));
    window.dispatchEvent(new CustomEvent('app-storage-updated', { detail: { key: 'website_orders' } }));
    toast.info('Order has been cancelled.');
  };

  const reorder = (order) => {
    (order.items || []).forEach((item) => addToCart(item, item.quantity || 1));
    toast.success('Items added to cart again.');
  };

  const addAddress = (event) => {
    event.preventDefault();
    if (!newAddress.label.trim() || !newAddress.address.trim() || !newAddress.city.trim()) {
      toast.error('Please fill all address fields.');
      return;
    }

    const updated = [
      ...addresses,
      { id: `addr_${Date.now()}`, ...newAddress, isDefault: addresses.length === 0 }
    ];
    setAddresses(updated);
    localStorage.setItem('website_customer_addresses', JSON.stringify(updated));
    setNewAddress({ label: '', address: '', city: '' });
    toast.success('Address added.');
  };

  const setDefaultAddress = (addressId) => {
    const updated = addresses.map((item) => ({ ...item, isDefault: item.id === addressId }));
    setAddresses(updated);
    localStorage.setItem('website_customer_addresses', JSON.stringify(updated));
    toast.success('Default address updated.');
  };

  const handlePasswordChange = (event) => {
    event.preventDefault();
    if (!passwordForm.currentPassword || !passwordForm.newPassword || !passwordForm.confirmPassword) {
      toast.error('Please fill all password fields.');
      return;
    }
    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      toast.error('New passwords do not match.');
      return;
    }
    if (!isStrongPassword) {
      toast.error('New password must be at least 8 characters and include uppercase, lowercase, number, and special character.');
      return;
    }

    const allAccounts = JSON.parse(localStorage.getItem('website_customer_accounts') || '[]');
    const accountIndex = allAccounts.findIndex((acc) => acc.id === customer?.id);
    if (accountIndex === -1) {
      toast.error('Account not found.');
      return;
    }
    if (allAccounts[accountIndex].password !== passwordForm.currentPassword) {
      toast.error('Current password is incorrect.');
      return;
    }

    allAccounts[accountIndex].password = passwordForm.newPassword;
    localStorage.setItem('website_customer_accounts', JSON.stringify(allAccounts));
    window.dispatchEvent(new CustomEvent('app-storage-updated', { detail: { key: 'website_customer_accounts' } }));
    setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
    toast.success('Password updated successfully.');
  };

  const handleLogout = () => {
    logoutCustomer();
    clearCart();
    toast.info('Logged out successfully.');
    navigate('/', { replace: true });
  };

  const renderContent = () => {
    if (activeTab === 'profile') {
      return (
        <div className="space-y-5">
          <div className="flex items-center gap-3">
            <div className="w-14 h-14 rounded-full bg-primary text-white font-bold flex items-center justify-center text-lg">
              {(profileForm.fullName || 'CU')
                .split(' ')
                .map((part) => part[0])
                .join('')
                .slice(0, 2)
                .toUpperCase()}
            </div>
            <div>
              <p className="font-semibold text-primary">{profileForm.fullName || 'Customer'}</p>
              <p className="text-sm text-gray-500">{profileForm.customerType} Customer</p>
            </div>
          </div>

          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium text-gray-700">Full Name</label>
              <input value={profileForm.fullName} onChange={(e) => setProfileForm((p) => ({ ...p, fullName: e.target.value }))} className="mt-1 w-full rounded-md border border-gray-300" />
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700">Email</label>
              <input value={profileForm.email} onChange={(e) => setProfileForm((p) => ({ ...p, email: e.target.value }))} className="mt-1 w-full rounded-md border border-gray-300" />
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700">Phone</label>
              <input value={profileForm.phone} onChange={(e) => setProfileForm((p) => ({ ...p, phone: e.target.value }))} className="mt-1 w-full rounded-md border border-gray-300" />
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700">WhatsApp</label>
              <input value={profileForm.whatsapp} onChange={(e) => setProfileForm((p) => ({ ...p, whatsapp: e.target.value }))} className="mt-1 w-full rounded-md border border-gray-300" />
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700">Address</label>
              <input value={profileForm.address} onChange={(e) => setProfileForm((p) => ({ ...p, address: e.target.value }))} className="mt-1 w-full rounded-md border border-gray-300" />
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700">City</label>
              <input value={profileForm.city} onChange={(e) => setProfileForm((p) => ({ ...p, city: e.target.value }))} className="mt-1 w-full rounded-md border border-gray-300" />
            </div>
          </div>

          <div>
            <label className="text-sm font-medium text-gray-700">Customer Type</label>
            <select
              value={profileForm.customerType}
              onChange={(e) => setProfileForm((p) => ({ ...p, customerType: e.target.value }))}
              className="mt-1 w-full max-w-xs rounded-md border border-gray-300"
            >
              <option>Retail</option>
              <option>Contractor</option>
              <option>Wholesaler</option>
            </select>
          </div>

          <button type="button" onClick={saveProfile} className="px-5 py-2 rounded-md bg-secondary text-white font-semibold hover:opacity-90">
            Save Profile
          </button>
        </div>
      );
    }

    if (activeTab === 'orders') {
      return (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[700px] text-sm">
            <thead>
              <tr className="bg-gray-50 text-left text-gray-600 border-b border-gray-200">
                <th className="px-3 py-2">Order#</th>
                <th className="px-3 py-2">Date</th>
                <th className="px-3 py-2">Items</th>
                <th className="px-3 py-2">Total</th>
                <th className="px-3 py-2">Status</th>
                <th className="px-3 py-2">Actions</th>
              </tr>
            </thead>
            <tbody>
              {orders.length === 0 ? (
                <tr>
                  <td className="px-3 py-4 text-gray-500" colSpan={6}>No orders found.</td>
                </tr>
              ) : (
                orders.map((order) => (
                  <tr key={order.id} className="border-b border-gray-100">
                    <td className="px-3 py-3 font-semibold text-primary">{order.id}</td>
                    <td className="px-3 py-3 text-gray-600">{new Date(order.createdAt || Date.now()).toLocaleDateString()}</td>
                    <td className="px-3 py-3 text-gray-600">{order.items?.length || 0}</td>
                    <td className="px-3 py-3 font-semibold text-secondary">Rs. {Number(order.totals?.grandTotal || 0).toLocaleString()}</td>
                    <td className="px-3 py-3">
                      <span className={`px-2 py-1 rounded-full text-xs font-semibold ${statusClasses[order.status] || 'bg-gray-100 text-gray-700'}`}>
                        {order.status}
                      </span>
                    </td>
                    <td className="px-3 py-3">
                      <div className="flex flex-wrap gap-2">
                        <Link to={`/track-order/${order.id}`} className="text-xs px-2 py-1 rounded border border-primary text-primary">
                          View Detail
                        </Link>
                        {order.status === 'Pending' && (
                          <button type="button" onClick={() => cancelOrder(order.id)} className="text-xs px-2 py-1 rounded border border-red-300 text-red-600">
                            Cancel
                          </button>
                        )}
                        <button type="button" onClick={() => reorder(order)} className="text-xs px-2 py-1 rounded border border-gray-300 text-gray-700">
                          Reorder
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      );
    }

    if (activeTab === 'wishlist') {
      return (
        <div>
          {wishlistItems.length === 0 ? (
            <p className="text-gray-500 text-sm">Your wishlist is empty.</p>
          ) : (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {wishlistItems.map((item) => (
                <article key={item.id} className="border border-gray-200 rounded-xl p-4">
                  <div className="h-24 bg-gray-100 rounded-md flex items-center justify-center text-primary text-2xl font-bold">
                    {item.name?.charAt(0) || 'P'}
                  </div>
                  <h3 className="mt-3 font-semibold text-primary line-clamp-2 min-h-[3rem]">{item.name}</h3>
                  <p className="text-xs text-gray-500">{item.brand || 'Brand'} • {item.category || 'Category'}</p>
                  <p className="text-secondary font-bold mt-2">Rs. {Number(item.salePrice ?? item.price ?? 0).toLocaleString()}</p>
                  <div className="mt-3 flex gap-2">
                    <button type="button" onClick={() => removeFromWishlist(item.id)} className="flex-1 py-2 rounded-md border border-gray-300 text-sm">
                      Remove
                    </button>
                    <button type="button" onClick={() => moveToCart(item.id)} className="flex-1 py-2 rounded-md bg-primary text-white text-sm">
                      Add to cart
                    </button>
                  </div>
                </article>
              ))}
            </div>
          )}
        </div>
      );
    }

    if (activeTab === 'addresses') {
      return (
        <div className="space-y-5">
          <div className="space-y-3">
            {addresses.map((item) => (
              <div key={item.id} className="border border-gray-200 rounded-lg p-4 flex items-start justify-between gap-3">
                <div>
                  <p className="font-semibold text-primary">{item.label} {item.isDefault && <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full ml-2">Default</span>}</p>
                  <p className="text-sm text-gray-600 mt-1">{item.address}</p>
                  <p className="text-sm text-gray-500">{item.city}</p>
                </div>
                {!item.isDefault && (
                  <button type="button" onClick={() => setDefaultAddress(item.id)} className="text-xs px-3 py-1.5 rounded-md border border-primary text-primary">
                    Set as default
                  </button>
                )}
              </div>
            ))}
          </div>

          <form onSubmit={addAddress} className="border border-gray-200 rounded-lg p-4 space-y-3">
            <h3 className="font-semibold text-primary">Add New Address</h3>
            <div className="grid sm:grid-cols-3 gap-3">
              <input
                type="text"
                placeholder="Label (Home/Office)"
                value={newAddress.label}
                onChange={(event) => setNewAddress((prev) => ({ ...prev, label: event.target.value }))}
                className="rounded-md border border-gray-300"
              />
              <input
                type="text"
                placeholder="Address"
                value={newAddress.address}
                onChange={(event) => setNewAddress((prev) => ({ ...prev, address: event.target.value }))}
                className="rounded-md border border-gray-300 sm:col-span-2"
              />
            </div>
            <div className="flex items-center gap-3">
              <input
                type="text"
                placeholder="City"
                value={newAddress.city}
                onChange={(event) => setNewAddress((prev) => ({ ...prev, city: event.target.value }))}
                className="rounded-md border border-gray-300"
              />
              <button type="submit" className="px-4 py-2 rounded-md bg-secondary text-white text-sm font-semibold">
                Add Address
              </button>
            </div>
          </form>
        </div>
      );
    }

    if (activeTab === 'password') {
      return (
        <form onSubmit={handlePasswordChange} className="max-w-md space-y-3">
          <div>
            <label className="text-sm font-medium text-gray-700">Current Password</label>
            <input
              type="password"
              value={passwordForm.currentPassword}
              onChange={(e) => setPasswordForm((prev) => ({ ...prev, currentPassword: e.target.value }))}
              className="mt-1 w-full rounded-md border border-gray-300"
            />
          </div>
          <div>
            <label className="text-sm font-medium text-gray-700">New Password</label>
            <input
              type="password"
              value={passwordForm.newPassword}
              onChange={(e) => setPasswordForm((prev) => ({ ...prev, newPassword: e.target.value }))}
              className="mt-1 w-full rounded-md border border-gray-300"
            />
            <ul className="mt-2 space-y-1 text-xs">
              <li className={passwordChecks.minLength ? 'text-green-600' : 'text-gray-500'}>
                At least 8 characters
              </li>
              <li className={passwordChecks.upper ? 'text-green-600' : 'text-gray-500'}>
                At least one uppercase letter
              </li>
              <li className={passwordChecks.lower ? 'text-green-600' : 'text-gray-500'}>
                At least one lowercase letter
              </li>
              <li className={passwordChecks.number ? 'text-green-600' : 'text-gray-500'}>
                At least one number
              </li>
              <li className={passwordChecks.special ? 'text-green-600' : 'text-gray-500'}>
                At least one special character
              </li>
            </ul>
          </div>
          <div>
            <label className="text-sm font-medium text-gray-700">Confirm New Password</label>
            <input
              type="password"
              value={passwordForm.confirmPassword}
              onChange={(e) => setPasswordForm((prev) => ({ ...prev, confirmPassword: e.target.value }))}
              className="mt-1 w-full rounded-md border border-gray-300"
            />
          </div>
          <button type="submit" className="px-5 py-2 rounded-md bg-primary text-white font-semibold">
            Update Password
          </button>
        </form>
      );
    }

    return null;
  };

  if (!customer) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-12 text-center">
        <h1 className="text-2xl font-bold text-primary">Customer Account</h1>
        <p className="text-gray-600 mt-2">Please login to access your profile dashboard.</p>
        <Link to="/customer/login" className="inline-flex mt-5 px-5 py-2.5 rounded-md bg-secondary text-white font-semibold">
          Go to Login
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <div className="grid lg:grid-cols-12 gap-6">
        <aside className="lg:col-span-3">
          <div className="bg-white border border-gray-200 rounded-xl p-3 sticky top-24">
            {navItems.map((item) => (
              <button
                key={item.key}
                type="button"
                onClick={() => {
                  if (item.key === 'logout') {
                    handleLogout();
                  } else {
                    setActiveTab(item.key);
                  }
                }}
                className={`w-full text-left px-3 py-2 rounded-md text-sm font-medium mb-1 ${
                  activeTab === item.key ? 'bg-primary text-white' : 'text-gray-700 hover:bg-gray-50'
                }`}
              >
                {item.label}
              </button>
            ))}
          </div>
        </aside>

        <section className="lg:col-span-9 bg-white border border-gray-200 rounded-xl p-5">
          <h1 className="text-2xl font-bold text-primary mb-4">
            {navItems.find((item) => item.key === activeTab)?.label || 'Customer Dashboard'}
          </h1>
          {renderContent()}
        </section>
      </div>
    </div>
  );
};

export default CustomerProfile;