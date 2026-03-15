import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';

const CustomerAuthContext = createContext();

export const CustomerAuthProvider = ({ children }) => {
  const [customerUser, setCustomerUser] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem('customerUser') || 'null');
    } catch {
      return null;
    }
  });

  const [customerToken, setCustomerToken] = useState(() => localStorage.getItem('customerToken'));

  const refreshCustomerAuth = useCallback(() => {
    try {
      setCustomerUser(JSON.parse(localStorage.getItem('customerUser') || 'null'));
    } catch {
      setCustomerUser(null);
    }
    setCustomerToken(localStorage.getItem('customerToken'));
  }, []);

  useEffect(() => {
    const handleStorage = () => refreshCustomerAuth();
    window.addEventListener('storage', handleStorage);
    return () => window.removeEventListener('storage', handleStorage);
  }, [refreshCustomerAuth]);

  const loginCustomer = useCallback((user, token) => {
    localStorage.setItem('customerUser', JSON.stringify(user));
    localStorage.setItem('customerToken', token);
    localStorage.removeItem('customerGuest');
    refreshCustomerAuth();
  }, [refreshCustomerAuth]);

  const logoutCustomer = useCallback(() => {
    localStorage.removeItem('customerUser');
    localStorage.removeItem('customerToken');
    localStorage.removeItem('customerGuest');
    localStorage.removeItem('website_cart');
    refreshCustomerAuth();
  }, [refreshCustomerAuth]);

  const value = useMemo(
    () => ({
      customerUser,
      customerToken,
      isCustomerAuthenticated: Boolean(customerUser && customerToken),
      loginCustomer,
      logoutCustomer,
      refreshCustomerAuth
    }),
    [customerUser, customerToken, loginCustomer, logoutCustomer, refreshCustomerAuth]
  );

  return <CustomerAuthContext.Provider value={value}>{children}</CustomerAuthContext.Provider>;
};

export const useCustomerAuth = () => {
  const context = useContext(CustomerAuthContext);
  if (!context) {
    throw new Error('useCustomerAuth must be used within a CustomerAuthProvider');
  }
  return context;
};

export default CustomerAuthContext;
