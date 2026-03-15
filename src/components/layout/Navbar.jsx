import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import productsData from '../../data/productsData';
import { 
  FaBars, FaBell, FaSun, FaMoon, FaSignOutAlt,
  FaKey, FaUserCircle, FaChevronDown, FaExclamationCircle,
  FaMoneyBillWave, FaShoppingCart, FaHome
} from 'react-icons/fa';
import ConfirmDialog from '../common/ConfirmDialog';

const Navbar = ({ onToggleSidebar }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  
  const [showNotifications, setShowNotifications] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [readNotificationIds, setReadNotificationIds] = useState([]);

  const notificationRef = useRef(null);
  const userMenuRef = useRef(null);
  const notificationStorageKey = `admin_read_notifications_${user?.id || user?.role || 'default'}`;

  // Update time every minute
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 60000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    try {
      const parsed = JSON.parse(localStorage.getItem(notificationStorageKey) || '[]');
      setReadNotificationIds(Array.isArray(parsed) ? parsed : []);
    } catch {
      setReadNotificationIds([]);
    }
  }, [notificationStorageKey]);

  useEffect(() => {
    localStorage.setItem(notificationStorageKey, JSON.stringify(readNotificationIds));
  }, [notificationStorageKey, readNotificationIds]);

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (notificationRef.current && !notificationRef.current.contains(event.target)) {
        setShowNotifications(false);
      }
      if (userMenuRef.current && !userMenuRef.current.contains(event.target)) {
        setShowUserMenu(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Get page title and breadcrumbs from route
  const getPageInfo = () => {
    const path = location.pathname;
    const segments = path.split('/').filter(Boolean);
    const adminSegments = segments[0] === 'admin' ? segments.slice(1) : segments;
    
    const titleMap = {
      'dashboard': 'Dashboard',
      'products': 'Products',
      'categories': 'Categories',
      'inventory': 'Inventory Management',
      'customers': 'Customers',
      'suppliers': 'Suppliers',
      'sales': 'Sales',
      'purchases': 'Purchases',
      'payments': 'Payments',
      'pos': 'Point of Sale',
      'employees': 'Employees',
      'hr': 'Human Resources',
      'branches': 'Branches',
      'discounts': 'Discounts',
      'returns': 'Returns',
      'damaged': 'Damaged Stock',
      'expenses': 'Expenses',
      'warranties': 'Warranties',
      'accounts': 'Accounts',
      'reports': 'Reports',
      'users': 'Users',
      'audit': 'Audit Logs',
      'settings': 'Settings',
      'notifications': 'Notifications'
    };

    const title = adminSegments.length > 0
      ? titleMap[adminSegments[0]] || adminSegments[0]
      : 'Dashboard';
    
    const breadcrumbs = [
      { label: 'Home', path: '/admin/dashboard' },
      ...adminSegments.map((segment, index) => ({
        label: titleMap[segment] || segment.charAt(0).toUpperCase() + segment.slice(1),
        path: '/admin/' + adminSegments.slice(0, index + 1).join('/')
      }))
    ];

    return { title, breadcrumbs };
  };

  const { title, breadcrumbs } = getPageInfo();

  const notifications = useMemo(() => {
    const lowStockCount = productsData.filter((product) => {
      const stock = Number(product.stockQty ?? product.stock ?? 0);
      const minStock = Number(product.minStock ?? 5);
      return stock <= minStock;
    }).length;

    let websiteOrders = [];
    try {
      const parsed = JSON.parse(localStorage.getItem('website_orders') || '[]');
      websiteOrders = Array.isArray(parsed) ? parsed : [];
    } catch {
      websiteOrders = [];
    }

    const pendingOrdersCount = websiteOrders.filter((order) => {
      const status = String(order?.status || '').toLowerCase();
      const method = String(order?.paymentMethod || '').toLowerCase();
      return status.includes('pending') || method === 'cod';
    }).length;

    const todayIso = new Date().toISOString().slice(0, 10);
    const todaySalesAmount = websiteOrders
      .filter((order) => String(order?.createdAt || order?.date || '').slice(0, 10) === todayIso)
      .reduce((sum, order) => sum + Number(order?.totals?.grandTotal ?? order?.amount ?? 0), 0);

    return [
      {
        id: 1,
        type: 'warning',
        icon: FaExclamationCircle,
        title: 'Low Stock Alert',
        message: `${lowStockCount} product(s) are at or below minimum stock`,
        color: 'text-red-500',
        bg: 'bg-red-50',
        time: 'Updated now',
        target: '/admin/stock-alerts'
      },
      {
        id: 2,
        type: 'info',
        icon: FaMoneyBillWave,
        title: 'Pending Payments',
        message: `${pendingOrdersCount} order(s) need payment follow-up`,
        color: 'text-yellow-500',
        bg: 'bg-yellow-50',
        time: 'Updated now',
        target: '/admin/payments'
      },
      {
        id: 3,
        type: 'success',
        icon: FaShoppingCart,
        title: 'Today Sales',
        message: `PKR ${Number(todaySalesAmount || 0).toLocaleString()} recorded today`,
        color: 'text-green-500',
        bg: 'bg-green-50',
        time: 'Updated now',
        target: '/admin/sales'
      }
    ];
  }, []);

  // Filter notifications based on user role
  const getFilteredNotifications = () => {
    const role = user?.role || 'cashier';
    if (role === 'cashier') {
      return notifications.filter(n => n.type === 'success');
    }
    return notifications;
  };

  const filteredNotifications = getFilteredNotifications();
  const unreadNotifications = filteredNotifications.filter(
    (notification) => !readNotificationIds.includes(notification.id)
  );
  const notificationCount = unreadNotifications.length;

  const markNotificationAsRead = (notificationId) => {
    setReadNotificationIds((prev) => (
      prev.includes(notificationId) ? prev : [...prev, notificationId]
    ));
  };

  // Get user initials for avatar
  const getUserInitials = () => {
    const name = user?.name || 'User';
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };

  // Format date and time
  const formatDateTime = () => {
    return currentTime.toLocaleDateString('en-PK', { 
      weekday: 'short', 
      year: 'numeric', 
      month: 'short', 
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const handleLogout = () => {
    setShowLogoutConfirm(true);
    setShowUserMenu(false);
  };

  const confirmLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <>
      <header className="bg-white dark:bg-gray-800 shadow-md sticky top-0 z-40 transition-colors">
        <div className="flex items-center justify-between px-6 py-4">
          {/* Left Side */}
          <div className="flex items-center space-x-4 flex-1">
            {/* Hamburger Menu */}
            <button
              onClick={onToggleSidebar}
              className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
              title="Toggle Sidebar"
            >
              <FaBars className="text-gray-600 dark:text-gray-300" size={20} />
            </button>

            {/* Page Title & Breadcrumbs */}
            <div className="hidden md:block">
              <h1 className="text-xl font-bold text-gray-800 dark:text-white">{title}</h1>
              <nav className="flex items-center space-x-2 text-sm text-gray-500 dark:text-gray-400">
                {breadcrumbs.map((crumb, index) => (
                  <React.Fragment key={index}>
                    {index > 0 && <span>/</span>}
                    {index === breadcrumbs.length - 1 ? (
                      <span className="text-primary dark:text-blue-400">{crumb.label}</span>
                    ) : (
                      <Link 
                        to={crumb.path} 
                        className="hover:text-primary dark:hover:text-blue-400 transition-colors"
                      >
                        {index === 0 ? <FaHome className="inline" /> : crumb.label}
                      </Link>
                    )}
                  </React.Fragment>
                ))}
              </nav>
            </div>
          </div>

          {/* Right Side */}
          <div className="flex items-center space-x-4">
            {/* Date & Time */}
            <div className="hidden lg:block text-sm text-gray-600 dark:text-gray-300">
              {formatDateTime()}
            </div>

            {/* Dark/Light Mode Toggle */}
            <button
              onClick={toggleTheme}
              className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
              title={theme === 'light' ? 'Switch to Dark Mode' : 'Switch to Light Mode'}
            >
              {theme === 'light' ? (
                <FaMoon className="text-gray-600 dark:text-gray-300" size={18} />
              ) : (
                <FaSun className="text-yellow-500" size={18} />
              )}
            </button>

            {/* Notifications */}
            <div className="relative" ref={notificationRef}>
              <button
                onClick={() => setShowNotifications(!showNotifications)}
                className="relative p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                title="Notifications"
              >
                <FaBell className="text-gray-600 dark:text-gray-300" size={18} />
                {notificationCount > 0 && (
                  <span className="absolute top-0 right-0 bg-red-500 text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center">
                    {notificationCount > 9 ? '9+' : notificationCount}
                  </span>
                )}
              </button>

              {/* Notifications Dropdown */}
              {showNotifications && (
                <div className="absolute right-0 mt-2 w-80 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 z-50">
                  <div className="p-4 border-b border-gray-200 dark:border-gray-700">
                    <h3 className="font-semibold text-gray-800 dark:text-white">
                      Notifications ({notificationCount})
                    </h3>
                  </div>
                  <div className="max-h-96 overflow-y-auto">
                    {unreadNotifications.length > 0 ? (
                      unreadNotifications.map((notification) => {
                        const Icon = notification.icon;
                        return (
                          <div
                            key={notification.id}
                            className={`p-4 border-b border-gray-100 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer transition-colors ${notification.bg} dark:${notification.bg}`}
                            onClick={() => {
                              markNotificationAsRead(notification.id);
                              setShowNotifications(false);
                              if (notification.target) navigate(notification.target);
                            }}
                          >
                            <div className="flex items-start space-x-3">
                              <Icon className={notification.color} size={20} />
                              <div className="flex-1">
                                <p className="font-semibold text-sm text-gray-800 dark:text-white">
                                  {notification.title}
                                </p>
                                <p className="text-sm text-gray-600 dark:text-gray-400">
                                  {notification.message}
                                </p>
                                <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">
                                  {notification.time}
                                </p>
                              </div>
                            </div>
                          </div>
                        );
                      })
                    ) : (
                      <div className="p-8 text-center text-gray-500 dark:text-gray-400">
                        All notifications are read
                      </div>
                    )}
                  </div>
                  <div className="p-3 border-t border-gray-200 dark:border-gray-700">
                    <Link
                      to="/admin/notifications"
                      className="block text-center text-sm text-primary dark:text-blue-400 hover:underline"
                      onClick={() => setShowNotifications(false)}
                    >
                      View all notifications
                    </Link>
                  </div>
                </div>
              )}
            </div>

            <Link
              to="/"
              className="hidden md:inline-flex items-center space-x-2 px-3 py-2 rounded-lg bg-secondary text-white hover:bg-orange-600 transition-colors"
              title="View Storefront"
            >
              <FaHome className="text-sm" />
              <span className="text-sm font-semibold">Storefront</span>
            </Link>

            {/* User Profile Dropdown */}
            <div className="relative" ref={userMenuRef}>
              <button
                onClick={() => setShowUserMenu(!showUserMenu)}
                className="flex items-center space-x-2 p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
              >
                <div className="w-8 h-8 bg-primary dark:bg-blue-600 text-white rounded-full flex items-center justify-center font-semibold text-sm">
                  {getUserInitials()}
                </div>
                <div className="hidden md:block text-left">
                  <p className="text-sm font-semibold text-gray-800 dark:text-white">
                    {user?.name || 'User'}
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400 capitalize">
                    {user?.role || 'cashier'}
                  </p>
                </div>
                <FaChevronDown className="text-gray-600 dark:text-gray-300" size={12} />
              </button>

              {/* User Menu Dropdown */}
              {showUserMenu && (
                <div className="absolute right-0 mt-2 w-56 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 z-50">
                  <div className="p-4 border-b border-gray-200 dark:border-gray-700">
                    <div className="flex items-center space-x-3">
                      <div className="w-12 h-12 bg-primary dark:bg-blue-600 text-white rounded-full flex items-center justify-center font-bold text-lg">
                        {getUserInitials()}
                      </div>
                      <div>
                        <p className="font-semibold text-gray-800 dark:text-white">
                          {user?.name || 'User'}
                        </p>
                        <p className="text-xs text-gray-500 dark:text-gray-400 capitalize">
                          {user?.role || 'cashier'}
                        </p>
                        <span className="inline-block mt-1 px-2 py-0.5 text-xs bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 rounded-full capitalize">
                          {user?.role || 'cashier'}
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="py-2">
                    <Link
                      to="/admin/profile"
                      className="flex items-center space-x-3 px-4 py-2 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                      onClick={() => setShowUserMenu(false)}
                    >
                      <FaUserCircle className="text-gray-600 dark:text-gray-300" />
                      <span className="text-sm text-gray-700 dark:text-gray-300">My Profile</span>
                    </Link>
                    <Link
                      to="/change-password"
                      className="flex items-center space-x-3 px-4 py-2 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                      onClick={() => setShowUserMenu(false)}
                    >
                      <FaKey className="text-gray-600 dark:text-gray-300" />
                      <span className="text-sm text-gray-700 dark:text-gray-300">Change Password</span>
                    </Link>
                  </div>
                  <div className="border-t border-gray-200 dark:border-gray-700 py-2">
                    <button
                      onClick={handleLogout}
                      className="flex items-center space-x-3 px-4 py-2 w-full hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                    >
                      <FaSignOutAlt className="text-red-600 dark:text-red-400" />
                      <span className="text-sm text-red-600 dark:text-red-400">Logout</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Logout Confirmation Dialog */}
      <ConfirmDialog
        isOpen={showLogoutConfirm}
        onClose={() => setShowLogoutConfirm(false)}
        onConfirm={confirmLogout}
        title="Confirm Logout"
        message="Are you sure you want to logout? Any unsaved changes will be lost."
      />
    </>
  );
};

export default Navbar;
