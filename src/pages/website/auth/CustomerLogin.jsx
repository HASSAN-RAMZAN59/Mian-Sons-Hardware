import React, { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import { useCustomerAuth } from '../../../context/CustomerAuthContext';

const isValidEmail = (email) => /^\S+@\S+\.\S+$/.test(email);

const getNameFromEmail = (email) => {
  const localPart = String(email || '').split('@')[0] || 'Customer';
  return localPart
    .replace(/[._-]+/g, ' ')
    .trim()
    .split(' ')
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
};

const CustomerLogin = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { loginCustomer, refreshCustomerAuth } = useCustomerAuth();

  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(true);
  const [errors, setErrors] = useState({});

  const saveCustomerSession = (customerRecord) => {
    const customerPayload = {
      id: customerRecord.id,
      fullName: customerRecord.fullName,
      name: customerRecord.fullName,
      email: customerRecord.email,
      phone: customerRecord.phone,
      city: customerRecord.city,
      address: customerRecord.address,
      customerType: customerRecord.customerType
    };

    const token = `cust_${customerRecord.id}_${Date.now()}`;
    loginCustomer(customerPayload, token);
    localStorage.setItem('customerRememberMe', rememberMe ? '1' : '0');
  };

  const handleLogin = (event) => {
    event.preventDefault();

    const nextErrors = {};
    if (!identifier.trim()) nextErrors.identifier = 'Email or phone is required.';
    if (!password) nextErrors.password = 'Password is required.';

    if (Object.keys(nextErrors).length > 0) {
      setErrors(nextErrors);
      return;
    }

    const registeredUsers = JSON.parse(localStorage.getItem('website_customer_accounts') || '[]');

    const matchedUser = registeredUsers.find(
      (user) =>
        (user.email?.toLowerCase() === identifier.trim().toLowerCase() || user.phone === identifier.trim()) &&
        user.password === password
    );

    if (!matchedUser) {
      setErrors({ form: 'Invalid credentials. Please try again.' });
      return;
    }

    saveCustomerSession(matchedUser);

    toast.success(`Welcome back, ${matchedUser.fullName}!`);
    navigate(location.state?.from || '/', { replace: true });
  };

  const continueAsGuest = () => {
    localStorage.removeItem('customerUser');
    localStorage.removeItem('customerToken');
    localStorage.setItem('customerGuest', '1');
    refreshCustomerAuth();
    toast.info('Continuing as guest.');
    navigate(location.state?.from || '/checkout', { replace: true });
  };

  const handleSocialLogin = (provider) => {
    const enteredEmail = window.prompt(`Enter your ${provider} email to continue:`)?.trim() || '';
    if (!enteredEmail) return;

    if (!isValidEmail(enteredEmail)) {
      toast.error('Please enter a valid email address.');
      return;
    }

    const existingUsers = JSON.parse(localStorage.getItem('website_customer_accounts') || '[]');
    const normalizedEmail = enteredEmail.toLowerCase();
    const matchedUser = existingUsers.find(
      (user) => String(user.email || '').toLowerCase() === normalizedEmail
    );

    if (matchedUser) {
      saveCustomerSession(matchedUser);
      toast.success(`Welcome back, ${matchedUser.fullName}!`);
      navigate(location.state?.from || '/', { replace: true });
      return;
    }

    const newUser = {
      id: `cust_${Date.now()}`,
      fullName: getNameFromEmail(enteredEmail),
      email: enteredEmail,
      phone: '',
      password: '',
      address: '',
      city: '',
      customerType: 'Retail',
      authProvider: provider.toLowerCase(),
      createdAt: new Date().toISOString()
    };

    localStorage.setItem('website_customer_accounts', JSON.stringify([newUser, ...existingUsers]));
    window.dispatchEvent(new CustomEvent('app-storage-updated', { detail: { key: 'website_customer_accounts' } }));
    saveCustomerSession(newUser);
    toast.success(`Account created with ${provider}.`);
    navigate(location.state?.from || '/', { replace: true });
  };

  return (
    <div className="min-h-[80vh] bg-gray-50 py-10 px-4 flex items-center justify-center">
      <div className="w-full max-w-md bg-white border border-gray-200 rounded-2xl p-6 sm:p-8 shadow-sm">
        <div className="text-center mb-6">
          <div className="mx-auto w-12 h-12 rounded-lg bg-primary text-white font-bold flex items-center justify-center mb-3">M&S</div>
          <h1 className="text-2xl font-bold text-primary">Customer Login</h1>
          <p className="text-sm text-gray-500 mt-1">Mian & Sons Hardware Store</p>
        </div>

        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label className="text-sm font-medium text-gray-700">Email / Phone</label>
            <input
              type="text"
              value={identifier}
              onChange={(event) => {
                setIdentifier(event.target.value);
                setErrors((prev) => ({ ...prev, identifier: '', form: '' }));
              }}
              className="mt-1 w-full rounded-md border border-gray-300"
              placeholder="Enter email or phone"
            />
            {errors.identifier && <p className="text-xs text-red-500 mt-1">{errors.identifier}</p>}
          </div>

          <div>
            <label className="text-sm font-medium text-gray-700">Password</label>
            <input
              type="password"
              value={password}
              onChange={(event) => {
                setPassword(event.target.value);
                setErrors((prev) => ({ ...prev, password: '', form: '' }));
              }}
              className="mt-1 w-full rounded-md border border-gray-300"
              placeholder="Enter password"
            />
            {errors.password && <p className="text-xs text-red-500 mt-1">{errors.password}</p>}
          </div>

          <div className="flex items-center justify-between text-sm">
            <label className="inline-flex items-center gap-2 text-gray-700">
              <input
                type="checkbox"
                checked={rememberMe}
                onChange={(event) => setRememberMe(event.target.checked)}
              />
              Remember me
            </label>

            <Link to="/customer/register" className="text-primary hover:text-secondary font-medium">
              Forgot Password?
            </Link>
          </div>

          {errors.form && <p className="text-sm text-red-500">{errors.form}</p>}

          <button type="submit" className="w-full py-2.5 rounded-md bg-secondary text-white font-semibold hover:opacity-90">
            Login
          </button>

          <button
            type="button"
            onClick={continueAsGuest}
            className="w-full py-2.5 rounded-md border border-gray-300 text-gray-700 font-semibold hover:bg-gray-50"
          >
            Or continue as Guest
          </button>

          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => handleSocialLogin('Google')}
              className="py-2 rounded-md border border-gray-300 text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              Google
            </button>
            <button
              type="button"
              onClick={() => handleSocialLogin('Facebook')}
              className="py-2 rounded-md border border-gray-300 text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              Facebook
            </button>
          </div>
        </form>

        <p className="text-sm text-center text-gray-600 mt-5">
          Don&apos;t have account?{' '}
          <Link to="/customer/register" className="text-primary font-semibold hover:text-secondary">
            Register
          </Link>
        </p>
      </div>
    </div>
  );
};

export default CustomerLogin;