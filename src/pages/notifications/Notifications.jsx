import React, { useEffect, useState } from 'react';
import { FaBell, FaExclamationCircle, FaMoneyBillWave, FaShoppingCart } from 'react-icons/fa';
import Card from '../../components/common/Card';
import Badge from '../../components/common/Badge';
import { notificationService } from '../../services/notificationService';

const Notifications = () => {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    let isMounted = true;

    const loadNotifications = async (silent = false) => {
      if (!silent) {
        setLoading(true);
      }
      try {
        const data = await notificationService.list();
        if (isMounted) {
          setNotifications(data);
          setError('');
        }
      } catch (err) {
        if (isMounted) {
          setNotifications([]);
          setError('Unable to load notifications.');
        }
      } finally {
        if (isMounted && !silent) {
          setLoading(false);
        }
      }
    };

    loadNotifications();
    const interval = setInterval(() => loadNotifications(true), 30000);

    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, []);

  const getLevelBadge = (level) => {
    if (level === 'danger' || level === 'error') return 'danger';
    if (level === 'warning') return 'warning';
    if (level === 'success') return 'success';
    return 'default';
  };

  const getIconColor = (level) => {
    if (level === 'danger' || level === 'error') return 'text-red-600';
    if (level === 'warning') return 'text-orange-600';
    if (level === 'success') return 'text-green-600';
    return 'text-blue-600';
  };

  const getIconForType = (level) => {
    if (level === 'danger' || level === 'error') return FaExclamationCircle;
    if (level === 'warning') return FaExclamationCircle;
    if (level === 'success') return FaShoppingCart;
    return FaMoneyBillWave;
  };

  const formatTime = (value) => {
    if (!value) {
      return 'Just now';
    }
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
      return 'Just now';
    }
    return date.toLocaleString('en-PK', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
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
        {loading ? (
          <div className="py-10 text-center text-sm text-gray-500">Loading notifications...</div>
        ) : error ? (
          <div className="py-10 text-center text-sm text-red-500">{error}</div>
        ) : notifications.length === 0 ? (
          <div className="py-10 text-center text-sm text-gray-500">No notifications yet.</div>
        ) : (
          <div className="space-y-3">
            {notifications.map((notification) => {
              const Icon = getIconForType(notification.type);
              return (
                <div key={notification.id} className="p-4 rounded-lg border border-gray-200 bg-white dark:bg-gray-900">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-start gap-3">
                      <Icon className={getIconColor(notification.type)} size={20} />
                      <div>
                        <p className="font-semibold text-gray-900 dark:text-white">{notification.title}</p>
                        <p className="text-sm text-gray-600 dark:text-gray-400">{notification.message}</p>
                        <p className="text-xs text-gray-500 mt-1">{formatTime(notification.createdAt)}</p>
                      </div>
                    </div>
                    <Badge variant={getLevelBadge(notification.type)}>
                      {String(notification.type || 'info').toUpperCase()}
                    </Badge>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </Card>
    </div>
  );
};

export default Notifications;
