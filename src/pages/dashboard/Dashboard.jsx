import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import Card from '../../components/common/Card';
import Table from '../../components/common/Table';
import Badge from '../../components/common/Badge';
import productsData from '../../data/productsData';
import { LineChart, Line, BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { 
  FaBoxOpen, 
  FaShoppingCart, 
  FaUsers, 
  FaMoneyBill,
  FaDollarSign,
  FaChartLine,
  FaArrowUp,
  FaArrowDown,
  FaExclamationTriangle,
  FaBuilding
} from 'react-icons/fa';

const Dashboard = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [greeting, setGreeting] = useState('');

  // Set greeting based on time
  useEffect(() => {
    const hour = new Date().getHours();
    if (hour < 12) {
      setGreeting('Good Morning');
    } else if (hour < 18) {
      setGreeting('Good Afternoon');
    } else {
      setGreeting('Good Evening');
    }
  }, []);

  const safeParseArray = (key) => {
    try {
      const parsed = JSON.parse(localStorage.getItem(key) || '[]');
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  };

  const productCatalog = useMemo(
    () => productsData.map((product) => ({
      ...product,
      stockQty: Number(product.stockQty ?? product.stock ?? 0),
      minStock: Number(product.minStock ?? 5),
      salePrice: Number(product.salePrice ?? product.price ?? 0),
      purchasePrice: Number(product.purchasePrice ?? 0)
    })),
    []
  );

  const websiteOrders = useMemo(() => safeParseArray('website_orders'), []);
  const customerAccounts = useMemo(() => safeParseArray('website_customer_accounts'), []);

  const normalizedOrders = useMemo(() => {
    const getOrderTotal = (order) => {
      const directTotal = Number(order?.totals?.grandTotal ?? order?.amount ?? order?.grandTotal ?? 0);
      if (Number.isFinite(directTotal) && directTotal > 0) return directTotal;

      const itemTotal = (order?.items || []).reduce((sum, item) => {
        const quantity = Number(item?.quantity ?? 1);
        const price = Number(item?.salePrice ?? item?.price ?? 0);
        return sum + (Number.isFinite(quantity) ? quantity : 1) * (Number.isFinite(price) ? price : 0);
      }, 0);

      return itemTotal;
    };

    const getOrderItemsCount = (order) =>
      (order?.items || []).reduce((sum, item) => sum + Number(item?.quantity ?? 1), 0);

    return websiteOrders.map((order, index) => {
      const dateValue = order?.createdAt || order?.date || new Date().toISOString();
      const orderDate = new Date(dateValue);
      const paymentMethodRaw = String(order?.paymentMethod || 'Online').trim();
      const paymentMethod = paymentMethodRaw
        ? paymentMethodRaw.charAt(0).toUpperCase() + paymentMethodRaw.slice(1)
        : 'Online';
      const status = order?.status || (String(paymentMethodRaw).toLowerCase() === 'cod' ? 'Pending' : 'Paid');

      return {
        id: order?.id || `ORD-${index + 1}`,
        invoice: String(order?.id || `ORD-${index + 1}`),
        customer:
          order?.customer?.fullName ||
          order?.customerName ||
          order?.customer?.name ||
          'Walk-in Customer',
        customerEmail: order?.customer?.email || '',
        customerPhone: order?.customer?.phone || '',
        items: getOrderItemsCount(order),
        amount: getOrderTotal(order),
        paymentMethod,
        status,
        date: Number.isNaN(orderDate.getTime()) ? new Date().toISOString().slice(0, 10) : orderDate.toISOString().slice(0, 10),
        orderDate: Number.isNaN(orderDate.getTime()) ? new Date() : orderDate,
        shippingCity: order?.shipping?.city || 'Online',
        rawItems: Array.isArray(order?.items) ? order.items : []
      };
    });
  }, [websiteOrders]);

  const lowStockAlerts = useMemo(
    () => productCatalog
      .filter((product) => product.stockQty <= product.minStock)
      .sort((a, b) => a.stockQty - b.stockQty)
      .slice(0, 8)
      .map((product) => ({
        id: product.id,
        product: product.size ? `${product.name} - ${product.size}` : product.name,
        category: product.category,
        currentStock: product.stockQty,
        minStock: product.minStock,
        status: product.stockQty <= Math.max(2, Math.ceil(product.minStock * 0.5)) ? 'Critical' : 'Low'
      })),
    [productCatalog]
  );

  const todayIso = new Date().toISOString().slice(0, 10);
  const currentMonthKey = new Date().toISOString().slice(0, 7);

  const stats = useMemo(() => {
    const todaysSales = normalizedOrders.filter((order) => order.date === todayIso).length;
    const monthRevenue = normalizedOrders
      .filter((order) => order.date.startsWith(currentMonthKey))
      .reduce((sum, order) => sum + Number(order.amount || 0), 0);

    const estimatedRestockCost = lowStockAlerts.reduce((sum, item) => {
      const matching = productCatalog.find((product) => product.id === item.id);
      if (!matching) return sum;
      const reorderQty = Math.max(0, matching.minStock - matching.stockQty);
      return sum + reorderQty * matching.purchasePrice;
    }, 0);

    const monthExpenses = Math.round(monthRevenue > 0 ? monthRevenue * 0.68 : estimatedRestockCost);

    const pendingPayments = normalizedOrders.filter((order) => {
      const status = String(order.status || '').toLowerCase();
      const payment = String(order.paymentMethod || '').toLowerCase();
      return status.includes('pending') || status.includes('unpaid') || payment.includes('credit') || payment.includes('cod');
    }).length;

    const uniqueCustomersFromOrders = new Set(
      normalizedOrders
        .map((order) => order.customerEmail || order.customerPhone || order.customer)
        .filter(Boolean)
    ).size;

    return {
      totalProducts: productCatalog.length,
      todaysSales,
      totalCustomers: Math.max(customerAccounts.length, uniqueCustomersFromOrders),
      pendingPayments,
      monthRevenue,
      monthExpenses,
      netProfit: monthRevenue - monthExpenses,
      lowStockItems: lowStockAlerts.length
    };
  }, [normalizedOrders, productCatalog, customerAccounts.length, lowStockAlerts, todayIso, currentMonthKey]);

  const salesTrendData = useMemo(() => {
    const monthFormatter = new Intl.DateTimeFormat('en', { month: 'short', year: '2-digit' });
    const monthKeys = [];

    for (let i = 11; i >= 0; i -= 1) {
      const monthDate = new Date();
      monthDate.setDate(1);
      monthDate.setMonth(monthDate.getMonth() - i);
      const key = `${monthDate.getFullYear()}-${String(monthDate.getMonth() + 1).padStart(2, '0')}`;
      monthKeys.push({
        key,
        label: monthFormatter.format(monthDate)
      });
    }

    const revenueByMonth = normalizedOrders.reduce((acc, order) => {
      const key = order.date.slice(0, 7);
      acc[key] = (acc[key] || 0) + Number(order.amount || 0);
      return acc;
    }, {});

    return monthKeys.map((month) => {
      const sales = Math.round(revenueByMonth[month.key] || 0);
      return {
        month: month.label,
        sales,
        target: Math.round(sales * 1.1)
      };
    });
  }, [normalizedOrders]);

  const categorySalesData = useMemo(() => {
    const categoryTotalsFromOrders = normalizedOrders.reduce((acc, order) => {
      (order.rawItems || []).forEach((item) => {
        const category = item?.category || 'Others';
        const quantity = Number(item?.quantity ?? 1);
        const price = Number(item?.salePrice ?? item?.price ?? 0);
        acc[category] = (acc[category] || 0) + quantity * price;
      });
      return acc;
    }, {});

    const sourceTotals = Object.keys(categoryTotalsFromOrders).length
      ? categoryTotalsFromOrders
      : productCatalog.reduce((acc, product) => {
          const value = product.salePrice * product.stockQty;
          acc[product.category] = (acc[product.category] || 0) + value;
          return acc;
        }, {});

    const total = Object.values(sourceTotals).reduce((sum, value) => sum + value, 0) || 1;

    return Object.entries(sourceTotals)
      .map(([name, value]) => ({
        name,
        value: Math.round(value),
        percentage: Math.round((value / total) * 100)
      }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 6);
  }, [normalizedOrders, productCatalog]);

  const COLORS = ['#1e3a5f', '#f97316', '#10b981', '#f59e0b', '#6366f1'];

  const topSellingData = useMemo(() => {
    const catalogLookup = new Map(productCatalog.map((product) => {
      const name = product.size ? `${product.name} - ${product.size}` : product.name;
      return [String(product.id), {
        id: String(product.id),
        name,
        salePrice: Number(product.salePrice || 0)
      }];
    }));

    const monthlyOrders = normalizedOrders.filter((order) => order.date.startsWith(currentMonthKey));
    if (!monthlyOrders.length) return [];

    const salesByProduct = monthlyOrders.reduce((acc, order) => {
      (order.rawItems || []).forEach((item) => {
        const itemId = String(item?.id || '');
        const itemName = String(item?.name || '').toLowerCase();

        let matched = catalogLookup.get(itemId);
        if (!matched && itemName) {
          const matchedProduct = productCatalog.find((product) => {
            const fullName = `${product.name} ${product.size || ''}`.toLowerCase();
            return fullName.includes(itemName) || itemName.includes(product.name.toLowerCase());
          });
          if (matchedProduct) {
            matched = {
              id: String(matchedProduct.id),
              name: matchedProduct.size ? `${matchedProduct.name} - ${matchedProduct.size}` : matchedProduct.name,
              salePrice: Number(matchedProduct.salePrice || 0)
            };
          }
        }

        if (!matched) return;

        const quantity = Math.max(1, Number(item?.quantity ?? 1));
        if (!acc[matched.id]) {
          acc[matched.id] = { product: matched.name, units: 0, revenue: 0 };
        }

        acc[matched.id].units += quantity;
        acc[matched.id].revenue += quantity * Number(item?.salePrice ?? item?.price ?? matched.salePrice ?? 0);
      });

      return acc;
    }, {});

    return Object.values(salesByProduct)
      .filter((item) => item.units > 0)
      .sort((a, b) => b.units - a.units)
      .slice(0, 5);
  }, [normalizedOrders, productCatalog, currentMonthKey]);

  const recentSales = useMemo(
    () => normalizedOrders
      .slice()
      .sort((a, b) => new Date(b.orderDate).getTime() - new Date(a.orderDate).getTime())
      .slice(0, 8),
    [normalizedOrders]
  );

  const pendingPurchaseOrders = useMemo(
    () => lowStockAlerts.slice(0, 5).map((item, index) => {
      const product = productCatalog.find((entry) => entry.id === item.id);
      const reorderQty = Math.max(0, Number(item.minStock) - Number(item.currentStock));
      const amount = Math.round(reorderQty * Number(product?.purchasePrice || 0));
      const expectedDate = new Date();
      expectedDate.setDate(expectedDate.getDate() + index + 2);

      return {
        id: item.id,
        poNumber: `PO-${new Date().getFullYear()}-${String(index + 1).padStart(3, '0')}`,
        supplier: product?.company || 'General Supplier',
        items: reorderQty,
        amount,
        expectedDate: expectedDate.toISOString().slice(0, 10),
        status: index % 2 === 0 ? 'Pending' : 'Confirmed'
      };
    }),
    [lowStockAlerts, productCatalog]
  );

  const branchPerformance = useMemo(() => {
    const byCity = normalizedOrders.reduce((acc, order) => {
      const city = order.shippingCity || 'Online';
      if (!acc[city]) {
        acc[city] = {
          branch: city,
          sales: 0,
          target: 0,
          customerSet: new Set()
        };
      }

      acc[city].sales += Number(order.amount || 0);
      acc[city].target += Number(order.amount || 0) * 1.1;
      if (order.customerEmail || order.customerPhone || order.customer) {
        acc[city].customerSet.add(order.customerEmail || order.customerPhone || order.customer);
      }

      return acc;
    }, {});

    const list = Object.values(byCity).map((entry) => {
      const target = Math.max(1, Math.round(entry.target));
      const sales = Math.round(entry.sales);
      return {
        branch: entry.branch,
        sales,
        target,
        customers: entry.customerSet.size,
        performance: Math.round((sales / target) * 100)
      };
    });

    if (list.length) {
      return list.sort((a, b) => b.sales - a.sales).slice(0, 5);
    }

    return [
      {
        branch: 'Online Store',
        sales: stats.monthRevenue,
        target: Math.max(1, Math.round(stats.monthRevenue * 1.1)),
        customers: stats.totalCustomers,
        performance: stats.monthRevenue > 0 ? 91 : 0
      }
    ];
  }, [normalizedOrders, stats.monthRevenue, stats.totalCustomers]);

  const systemActivity = useMemo(() => {
    const toIsoDate = (date) => date.toISOString().slice(0, 10);
    const today = new Date();
    const yesterday = new Date();
    yesterday.setDate(today.getDate() - 1);
    const todayKey = toIsoDate(today);
    const yesterdayKey = toIsoDate(yesterday);

    const currentMonth = today.toISOString().slice(0, 7);
    const previousMonthDate = new Date(today.getFullYear(), today.getMonth() - 1, 1);
    const previousMonth = previousMonthDate.toISOString().slice(0, 7);

    const formatDelta = (value) => `${value > 0 ? '+' : ''}${value}`;

    const totalUsers = customerAccounts.length + (user ? 1 : 0);
    const usersThisMonth = customerAccounts.filter(
      (account) => String(account?.createdAt || '').slice(0, 7) === currentMonth
    ).length;
    const usersPrevMonth = customerAccounts.filter(
      (account) => String(account?.createdAt || '').slice(0, 7) === previousMonth
    ).length;
    const totalUsersDelta = usersThisMonth - usersPrevMonth;

    const uniqueSessionKey = (order) => order.customerEmail || order.customerPhone || order.customer;
    const activeSessionsToday = new Set(
      normalizedOrders
        .filter((order) => order.date === todayKey)
        .map(uniqueSessionKey)
        .filter(Boolean)
    ).size;
    const activeSessionsYesterday = new Set(
      normalizedOrders
        .filter((order) => order.date === yesterdayKey)
        .map(uniqueSessionKey)
        .filter(Boolean)
    ).size;

    const adminSession = localStorage.getItem('token') ? 1 : 0;
    const activeSessions = activeSessionsToday + adminSession;
    const activeSessionsDelta = activeSessions - activeSessionsYesterday;

    const ordersToday = normalizedOrders.filter((order) => order.date === todayKey).length;
    const ordersYesterday = normalizedOrders.filter((order) => order.date === yesterdayKey).length;
    const ordersTodayDelta = ordersToday - ordersYesterday;

    const pendingOrders = normalizedOrders.filter((order) => String(order.status).toLowerCase().includes('pending')).length;
    const pendingOrdersYesterday = normalizedOrders
      .filter((order) => order.date === yesterdayKey)
      .filter((order) => String(order.status).toLowerCase().includes('pending')).length;
    const pendingOrdersDelta = pendingOrders - pendingOrdersYesterday;

    return [
      {
        activity: 'Total Users',
        count: totalUsers,
        change: formatDelta(totalUsersDelta),
        trend: totalUsersDelta >= 0 ? 'up' : 'down'
      },
      {
        activity: 'Active Sessions',
        count: activeSessions,
        change: formatDelta(activeSessionsDelta),
        trend: activeSessionsDelta >= 0 ? 'up' : 'down'
      },
      {
        activity: 'Orders Today',
        count: ordersToday,
        change: formatDelta(ordersTodayDelta),
        trend: ordersTodayDelta >= 0 ? 'up' : 'down'
      },
      {
        activity: 'Pending Orders',
        count: pendingOrders,
        change: formatDelta(pendingOrdersDelta),
        trend: pendingOrdersDelta >= 0 ? 'up' : 'down'
      }
    ];
  }, [customerAccounts, user, normalizedOrders]);

  // Check user role
  const isAdminOrSuper = user?.role === 'admin' || user?.role === 'superadmin';
  const isManagerOrAbove = user?.role === 'manager' || isAdminOrSuper;
  const isSuperAdmin = user?.role === 'superadmin';

  // Table columns
  const salesColumns = [
    { key: 'invoice', label: 'Invoice#' },
    { key: 'customer', label: 'Customer' },
    { key: 'items', label: 'Items' },
    { 
      key: 'amount', 
      label: 'Amount',
      render: (row) => `Rs. ${row.amount.toLocaleString()}`
    },
    { key: 'paymentMethod', label: 'Payment' },
    { 
      key: 'status', 
      label: 'Status',
      render: (row) => (
        <Badge variant={row.status === 'Paid' ? 'success' : 'warning'}>
          {row.status}
        </Badge>
      )
    },
    { key: 'date', label: 'Date' }
  ];

  const stockColumns = [
    { key: 'product', label: 'Product' },
    { key: 'category', label: 'Category' },
    { key: 'currentStock', label: 'Current Stock' },
    { key: 'minStock', label: 'Min Stock' },
    { 
      key: 'status', 
      label: 'Status',
      render: (row) => (
        <Badge variant={row.status === 'Critical' ? 'danger' : 'warning'}>
          {row.status}
        </Badge>
      )
    }
  ];

  return (
    <div className="space-y-6">
      {/* Greeting Header */}
      <div className="bg-gradient-to-r from-primary to-blue-700 dark:from-blue-800 dark:to-blue-900 rounded-lg p-6 text-white shadow-lg">
        <h1 className="text-3xl font-bold mb-2">
          {greeting}, {user?.name || 'User'}! 👋
        </h1>
        <p className="text-blue-100">
          Welcome to Mian & Sons Hardware Store Dashboard
        </p>
      </div>

      {/* Top Stats Cards - For All Roles */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card 
          title="Total Products" 
          value={stats.totalProducts} 
          icon={FaBoxOpen} 
          color="blue"
        />
        <Card 
          title="Today's Sales" 
          value={stats.todaysSales} 
          icon={FaShoppingCart} 
          color="green"
        />
        <Card 
          title="Total Customers" 
          value={stats.totalCustomers} 
          icon={FaUsers} 
          color="purple"
        />
        <Card 
          title="Pending Payments" 
          value={stats.pendingPayments} 
          icon={FaMoneyBill} 
          color="red"
        />
      </div>

      {/* Additional Stats for Admin/Superadmin */}
      {isAdminOrSuper && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <Card 
            title="This Month Revenue" 
            value={`Rs. ${(stats.monthRevenue / 1000).toFixed(0)}K`}
            icon={FaDollarSign} 
            color="green"
            trend={12.5}
          />
          <Card 
            title="This Month Expenses" 
            value={`Rs. ${(stats.monthExpenses / 1000).toFixed(0)}K`}
            icon={FaChartLine} 
            color="red"
            trend={-5.2}
          />
          <Card 
            title="Net Profit" 
            value={`Rs. ${(stats.netProfit / 1000).toFixed(0)}K`}
            icon={FaArrowUp} 
            color="blue"
            trend={8.3}
          />
          <div onClick={() => navigate('/inventory/stock-alerts')} className="cursor-pointer">
            <Card 
              title="Low Stock Items" 
              value={stats.lowStockItems}
              icon={FaExclamationTriangle} 
              color="orange"
            />
          </div>
        </div>
      )}

      {/* Charts Section - For Admin/Superadmin */}
      {isAdminOrSuper && (
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
          {/* Sales Trend Chart - 60% width */}
          <Card title="Sales Trend - Last 12 Months" className="lg:col-span-3">
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={salesTrendData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis />
                <Tooltip formatter={(value) => `Rs. ${value.toLocaleString()}`} />
                <Legend />
                <Line type="monotone" dataKey="sales" stroke="#1e3a5f" strokeWidth={2} name="Actual Sales" />
                <Line type="monotone" dataKey="target" stroke="#f97316" strokeWidth={2} strokeDasharray="5 5" name="Target" />
              </LineChart>
            </ResponsiveContainer>
          </Card>

          {/* Category Sales Pie Chart - 40% width */}
          <Card title="Category-wise Sales" className="lg:col-span-2">
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={categorySalesData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percentage }) => `${name}: ${percentage}%`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {categorySalesData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={(value) => `Rs. ${value.toLocaleString()}`} />
              </PieChart>
            </ResponsiveContainer>
          </Card>
        </div>
      )}

      {/* Tables Section - For All Roles */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Sales Table */}
        <Card title="Recent Sales">
          <Table 
            columns={salesColumns}
            data={recentSales}
            emptyMessage="No sales found"
          />
        </Card>

        {/* Low Stock Alerts Table */}
        <Card title="Low Stock Alerts">
          <Table 
            columns={stockColumns}
            data={lowStockAlerts}
            emptyMessage="No low stock items"
          />
        </Card>
      </div>

      {/* Top Selling Products - For Manager/Admin/Superadmin */}
      {isManagerOrAbove && (
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
          <Card title="Top Selling Products - This Month" className="lg:col-span-3">
            {topSellingData.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={topSellingData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis
                    dataKey="product"
                    angle={-15}
                    textAnchor="end"
                    height={80}
                    tickFormatter={(value) => (value.length > 24 ? `${value.slice(0, 24)}...` : value)}
                  />
                  <YAxis yAxisId="left" />
                  <YAxis yAxisId="right" orientation="right" />
                  <Tooltip
                    formatter={(value, name) => {
                      if (name === 'Revenue (Rs.)') return `Rs. ${Number(value).toLocaleString()}`;
                      return Number(value).toLocaleString();
                    }}
                  />
                  <Legend />
                  <Bar yAxisId="left" dataKey="units" fill="#10b981" name="Units Sold" />
                  <Bar yAxisId="right" dataKey="revenue" fill="#1e3a5f" name="Revenue (Rs.)" />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-[300px] flex items-center justify-center text-sm text-gray-500 dark:text-gray-400">
                No top-selling data available for this month.
              </div>
            )}
          </Card>

          {/* Pending Purchase Orders */}
          <Card title="Pending Purchase Orders" className="lg:col-span-2">
            <div className="space-y-3">
              {pendingPurchaseOrders.map((po) => (
                <div key={po.id} className="p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <p className="font-semibold text-gray-900 dark:text-white">{po.poNumber}</p>
                      <p className="text-sm text-gray-600 dark:text-gray-400">{po.supplier}</p>
                    </div>
                    <Badge variant={po.status === 'Confirmed' ? 'success' : 'warning'}>
                      {po.status}
                    </Badge>
                  </div>
                  <div className="text-sm space-y-1">
                    <p className="text-gray-600 dark:text-gray-400">
                      Items: <span className="font-medium text-gray-900 dark:text-white">{po.items}</span>
                    </p>
                    <p className="text-gray-600 dark:text-gray-400">
                      Amount: <span className="font-medium text-gray-900 dark:text-white">Rs. {po.amount.toLocaleString()}</span>
                    </p>
                    <p className="text-gray-600 dark:text-gray-400">
                      Expected: <span className="font-medium text-gray-900 dark:text-white">{po.expectedDate}</span>
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </div>
      )}

      {/* Superadmin Only Content */}
      {isSuperAdmin && (
        <>
          {/* Branch Performance */}
          <Card title="Branch Performance Comparison">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                <thead className="bg-gray-50 dark:bg-gray-800">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Branch</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Sales</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Target</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Customers</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Performance</th>
                  </tr>
                </thead>
                <tbody className="bg-white dark:bg-gray-900 divide-y divide-gray-200 dark:divide-gray-700">
                  {branchPerformance.map((branch, index) => (
                    <tr key={index}>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <FaBuilding className="text-primary mr-2" />
                          <span className="text-sm font-medium text-gray-900 dark:text-white">{branch.branch}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                        Rs. {branch.sales.toLocaleString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                        Rs. {branch.target.toLocaleString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                        {branch.customers}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <span className={`text-sm font-semibold ${branch.performance >= 100 ? 'text-green-600' : 'text-orange-600'}`}>
                            {branch.performance}%
                          </span>
                          {branch.performance >= 100 ? (
                            <FaArrowUp className="ml-2 text-green-600" />
                          ) : (
                            <FaArrowDown className="ml-2 text-orange-600" />
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>

          {/* System Activity Summary */}
          <Card title="System Activity Summary">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {systemActivity.map((item, index) => (
                <div key={index} className="p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">{item.activity}</p>
                  <div className="flex items-center justify-between">
                    <p className="text-2xl font-bold text-gray-900 dark:text-white">{item.count}</p>
                    <div className={`flex items-center ${item.trend === 'up' ? 'text-green-600' : 'text-red-600'}`}>
                      {item.trend === 'up' ? <FaArrowUp className="mr-1" /> : <FaArrowDown className="mr-1" />}
                      <span className="text-sm font-semibold">{item.change}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </>
      )}
    </div>
  );
};

export default Dashboard;
