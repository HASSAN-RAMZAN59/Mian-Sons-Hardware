import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';

const statusClasses = {
  Pending: 'bg-yellow-100 text-yellow-700',
  Processing: 'bg-blue-100 text-blue-700',
  Confirmed: 'bg-indigo-100 text-indigo-700',
  Dispatched: 'bg-purple-100 text-purple-700',
  Delivered: 'bg-green-100 text-green-700',
  Cancelled: 'bg-red-100 text-red-700'
};

const formatStatus = (value) => {
  const raw = String(value || 'Pending').trim();
  if (!raw) return 'Pending';
  return raw.charAt(0).toUpperCase() + raw.slice(1).toLowerCase();
};

const MyOrders = () => {
  const [orders, setOrders] = useState([]);

  useEffect(() => {
    const loadOrders = () => {
      try {
        const stored = JSON.parse(localStorage.getItem('website_orders') || '[]');
        setOrders(Array.isArray(stored) ? stored : []);
      } catch {
        setOrders([]);
      }
    };

    loadOrders();

    const handleStorageUpdated = (event) => {
      if (!event?.detail?.key || event.detail.key === 'website_orders') {
        loadOrders();
      }
    };

    window.addEventListener('app-storage-updated', handleStorageUpdated);
    window.addEventListener('storage', loadOrders);

    return () => {
      window.removeEventListener('app-storage-updated', handleStorageUpdated);
      window.removeEventListener('storage', loadOrders);
    };
  }, []);

  const sortedOrders = useMemo(() => {
    return [...orders].sort((left, right) => new Date(right.createdAt || 0).getTime() - new Date(left.createdAt || 0).getTime());
  }, [orders]);

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <div className="bg-white border border-gray-200 rounded-2xl p-6">
        <h1 className="text-3xl font-bold text-primary">My Orders</h1>
        <p className="text-gray-600 mt-1">View your latest order details and live tracking updates.</p>

        <div className="mt-6 overflow-x-auto">
          <table className="w-full min-w-[760px] text-sm">
            <thead>
              <tr className="bg-gray-50 text-left text-gray-600 border-b border-gray-200">
                <th className="px-3 py-2">Order#</th>
                <th className="px-3 py-2">Date</th>
                <th className="px-3 py-2">Items</th>
                <th className="px-3 py-2">Total</th>
                <th className="px-3 py-2">Status</th>
                <th className="px-3 py-2">Action</th>
              </tr>
            </thead>
            <tbody>
              {sortedOrders.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-3 py-6 text-center text-gray-500">No orders found yet.</td>
                </tr>
              ) : (
                sortedOrders.map((order) => {
                  const status = formatStatus(order.status);
                  const itemCount = (order.items || []).reduce((total, item) => total + Number(item.quantity || 1), 0);

                  return (
                    <tr key={order.id} className="border-b border-gray-100">
                      <td className="px-3 py-3 font-semibold text-primary">{order.id}</td>
                      <td className="px-3 py-3 text-gray-600">{new Date(order.createdAt || Date.now()).toLocaleDateString('en-PK')}</td>
                      <td className="px-3 py-3 text-gray-600">{itemCount}</td>
                      <td className="px-3 py-3 font-semibold text-secondary">Rs. {Number(order.totals?.grandTotal || 0).toLocaleString()}</td>
                      <td className="px-3 py-3">
                        <span className={`px-2 py-1 rounded-full text-xs font-semibold ${statusClasses[status] || 'bg-gray-100 text-gray-700'}`}>
                          {status}
                        </span>
                      </td>
                      <td className="px-3 py-3">
                        <Link to={`/track-order/${order.id}`} className="text-xs px-3 py-1.5 rounded border border-primary text-primary hover:bg-primary hover:text-white">
                          Track Order
                        </Link>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default MyOrders;