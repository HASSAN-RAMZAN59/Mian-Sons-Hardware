import React, { createContext, useContext, useState, useEffect } from 'react';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  // Check for stored user data on mount
  useEffect(() => {
    const storedUser = localStorage.getItem('user');
    const storedToken = localStorage.getItem('token');
    if (storedUser && storedToken) {
      setUser(JSON.parse(storedUser));
      setIsAuthenticated(true);
    }
  }, []);

  const login = (userData) => {
    setUser(userData);
    setIsAuthenticated(true);
    // Store in localStorage
    localStorage.setItem('user', JSON.stringify(userData));
    localStorage.setItem('token', userData.token);
  };

  const logout = () => {
    setUser(null);
    setIsAuthenticated(false);
    // Clear localStorage
    localStorage.removeItem('user');
    localStorage.removeItem('token');
  };

  // Permission checking function
  const checkPermission = (module, action) => {
    if (!user) return false;
    
    // Superadmin has all permissions
    if (user.role === 'superadmin') return true;
    
    // Admin has most permissions
    if (user.role === 'admin') {
      // Admin cannot delete critical data
      if (action === 'delete' && ['users', 'settings'].includes(module)) {
        return false;
      }
      return true;
    }
    
    // Manager has limited permissions
    if (user.role === 'manager') {
      const managerPermissions = {
        dashboard: ['read'],
        products: ['read', 'create', 'update'],
        categories: ['read', 'create', 'update'],
        inventory: ['read', 'update'],
        customers: ['read', 'create', 'update'],
        suppliers: ['read', 'create', 'update'],
        sales: ['read', 'create'],
        pos: ['read', 'create'],
        purchases: ['read', 'create'],
        returns: ['read', 'create'],
        payments: ['read', 'create']
      };
      return managerPermissions[module]?.includes(action) || false;
    }
    
    // Cashier has minimal permissions
    if (user.role === 'cashier') {
      const cashierPermissions = {
        pos: ['read', 'create'],
        sales: ['read'],
        customers: ['read']
      };
      return cashierPermissions[module]?.includes(action) || false;
    }
    
    return false;
  };

  return (
    <AuthContext.Provider value={{ user, isAuthenticated, login, logout, checkPermission }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
