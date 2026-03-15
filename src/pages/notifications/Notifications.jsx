import React, { useMemo } from 'react';
import { FaBell, FaExclamationCircle, FaMoneyBillWave, FaShoppingCart } from 'react-icons/fa';
import Card from '../../components/common/Card';
import Badge from '../../components/common/Badge';
import productsData from '../../data/productsData';

const Notifications = () => {
  const notifications = useMemo(() => {
    const lowStockItems = productsData.filter((product) => {
      const stock = Number(product.stockQty ?? product.stock ?? 0);
      const minStock = Number(product.minStock ?? 5);
      return stock <= minStock;
    });

    let websiteOrders = [];
    try {
      const parsed = JSON.parse(localStorage.getItem('website_orders') || '[]');
      websiteOrders = Array.isArray(parsed) ? parsed : [];
    } catch {
      websiteOrders = [];
    }

    const pendingOrders = websiteOrders.filter((order) => {
      const status = String(order?.status || '').toLowerCase();
      const method = String(order?.paymentMethod || '').toLowerCase();
      return status.includes('pending') || method === 'cod';
    });

    const todayIso = new Date().toISOString().slice(0, 10);
    const todayOrders = websiteOrders.filter((order) =>
      String(order?.createdAt || order?.date || '').slice(0, 10) === todayIso
    );
    const todaySalesAmount = todayOrders.reduce(
      (sum, order) => sum + Number(order?.totals?.grandTotal ?? order?.amount ?? 0),
      0
    );

    const list = [
      {
        id: 'low-stock',
        icon: FaExclamationCircle,
        title: 'Low Stock Alert',
        message: `${lowStockItems.length} product(s) are at or below minimum stock level.`,
        level: lowStockItems.length > 0 ? 'warning' : 'info',
        time: 'Updated now'
      },
      {
        id: 'pending-payments',
        icon: FaMoneyBillWave,
        title: 'Pending Payments',
        message: `${pendingOrders.length} order(s) require payment follow-up.`,
        level: pendingOrders.length > 0 ? 'warning' : 'success',
        time: 'Updated now'
      },
      {
        id: 'today-sales',
        icon: FaShoppingCart,
        title: 'Today Sales',
        message: `${todayOrders.length} order(s), PKR ${todaySalesAmount.toLocaleString()} total sales today.`,
        level: todayOrders.length > 0 ? 'success' : 'info',
        time: 'Updated now'
      }
    ];

    const lowStockProductAlerts = lowStockItems.slice(0, 10).map((product) => {
      const stock = Number(product.stockQty ?? product.stock ?? 0);
      const minStock = Number(product.minStock ?? 5);
      const productName = product.size ? `${product.name} - ${product.size}` : product.name;

      return {
        id: `product-${product.id}`,
        icon: FaExclamationCircle,
        title: productName,
        message: `Current stock ${stock} is below/near minimum ${minStock}.`,
        level: stock <= Math.max(2, Math.ceil(minStock * 0.5)) ? 'danger' : 'warning',
        time: 'Inventory alert'
      };
    });

    return [...list, ...lowStockProductAlerts];
  }, []);

  const getLevelBadge = (level) => {
    if (level === 'danger') return 'danger';
    if (level === 'warning') return 'warning';
    if (level === 'success') return 'success';
    return 'default';
  };

  const getIconColor = (level) => {
    if (level === 'danger') return 'text-red-600';
    if (level === 'warning') return 'text-orange-600';
    if (level === 'success') return 'text-green-600';
    return 'text-blue-600';
  };

  return (
    <div className="space-y-6">
      <div className="bg-gradient-to-r from-primary to-blue-700 rounded-lg p-6 text-white">
        <div className="flex items-center gap-3">
          <FaBell size={22} />
          <div>
            <h1 className="text-2xl font-bold">Notifications</h1>
            <p className="text-blue-100 text-sm">Live operational alerts for inventory, payments, and sales.</p>
          </div>
        </div>
      </div>

      <Card title={`All Notifications (${notifications.length})`}>
        <div className="space-y-3">
          {notifications.map((notification) => {
            const Icon = notification.icon;
            return (
              <div key={notification.id} className="p-4 rounded-lg border border-gray-200 bg-white dark:bg-gray-900">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-start gap-3">
                    <Icon className={getIconColor(notification.level)} size={20} />
                    <div>
                      <p className="font-semibold text-gray-900 dark:text-white">{notification.title}</p>
                      <p className="text-sm text-gray-600 dark:text-gray-400">{notification.message}</p>
                      <p className="text-xs text-gray-500 mt-1">{notification.time}</p>
                    </div>
                  </div>
                  <Badge variant={getLevelBadge(notification.level)}>
                    {notification.level?.toUpperCase()}
                  </Badge>
                </div>
              </div>
            );
          })}
        </div>
      </Card>
    </div>
  );
};

export default Notifications;
