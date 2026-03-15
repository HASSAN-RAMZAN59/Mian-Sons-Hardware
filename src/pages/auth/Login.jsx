import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import { FaUser, FaLock, FaEye, FaEyeSlash, FaTools, FaHammer, FaWrench, FaScrewdriver } from 'react-icons/fa';
import { useAuth } from '../../context/AuthContext';
import Button from '../../components/common/Button';
import Input from '../../components/common/Input';

const Login = () => {
  const navigate = useNavigate();
  const { login } = useAuth();
  
  const [formData, setFormData] = useState({
    username: '',
    password: '',
    rememberMe: false
  });
  
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
    // Clear error for this field
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }));
    }
  };

  const validate = () => {
    const newErrors = {};
    
    if (!formData.username.trim()) {
      newErrors.username = 'Username is required';
    }
    
    if (!formData.password) {
      newErrors.password = 'Password is required';
    } else if (formData.password.length < 4) {
      newErrors.password = 'Password must be at least 4 characters';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validate()) {
      return;
    }

    setLoading(true);

    try {
      // Simulate API call delay
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Demo credentials for testing
      const demoAccounts = {
        superadmin: { password: 'super123', role: 'superadmin', name: 'Super Admin' },
        admin: { password: 'admin123', role: 'admin', name: 'Admin User' },
        manager: { password: 'manager123', role: 'manager', name: 'Store Manager' },
        cashier: { password: 'cashier123', role: 'cashier', name: 'Cashier' }
      };

      const account = demoAccounts[formData.username.toLowerCase()];

      if (account && account.password === formData.password) {
        // Successful login
        const userData = {
          id: Math.random().toString(36).substr(2, 9),
          username: formData.username,
          name: account.name,
          role: account.role,
          email: `${formData.username}@miansons.com`,
          token: 'demo-jwt-token-' + Date.now()
        };

        // Call login from AuthContext
        login(userData);

        // Show success message
        toast.success(`Welcome back, ${account.name}!`, {
          position: 'top-right',
          autoClose: 3000,
          hideProgressBar: false,
          closeOnClick: true,
          pauseOnHover: true,
          draggable: true,
        });

        // Role-based redirect
        setTimeout(() => {
          switch (account.role) {
            case 'cashier':
              navigate('/admin/pos');
              break;
            default:
              navigate('/admin/dashboard');
              break;
          }
        }, 500);

      } else {
        // Invalid credentials
        toast.error('Invalid username or password. Please try again.', {
          position: 'top-right',
          autoClose: 4000,
          hideProgressBar: false,
          closeOnClick: true,
          pauseOnHover: true,
          draggable: true,
        });
      }

    } catch (error) {
      toast.error('Login failed. Please try again later.', {
        position: 'top-right',
        autoClose: 4000,
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex">
      {/* Left Side - Branding */}
      <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-primary via-blue-700 to-blue-900 relative overflow-hidden">
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-10 left-10 animate-pulse">
            <FaTools size={80} className="text-white" />
          </div>
          <div className="absolute bottom-20 right-20 animate-pulse delay-100">
            <FaHammer size={100} className="text-white" />
          </div>
          <div className="absolute top-1/3 right-10 animate-pulse delay-200">
            <FaWrench size={60} className="text-white" />
          </div>
          <div className="absolute bottom-1/3 left-20 animate-pulse delay-300">
            <FaScrewdriver size={70} className="text-white" />
          </div>
        </div>

        <div className="relative z-10 flex flex-col justify-center items-center w-full px-12 text-white">
          {/* Logo */}
          <div className="mb-8">
            <div className="w-32 h-32 bg-white bg-opacity-20 rounded-full flex items-center justify-center backdrop-blur-sm border-4 border-white border-opacity-30">
              <span className="text-6xl font-bold">M&S</span>
            </div>
          </div>

          {/* Store Name */}
          <h1 className="text-5xl font-bold mb-4 text-center">
            Mian & Sons
          </h1>
          <h2 className="text-3xl font-semibold mb-6 text-center">
            Hardware Store
          </h2>

          {/* Tagline */}
          <p className="text-xl text-blue-100 mb-12 text-center max-w-md">
            Your Complete Hardware Solution
          </p>

          {/* Decorative Line */}
          <div className="w-24 h-1 bg-white bg-opacity-50 mb-8"></div>

          {/* Additional Info */}
          <div className="text-center text-blue-100">
            <p className="text-sm">Trusted Since 1990</p>
            <p className="text-sm mt-2">Quality Products • Expert Service • Best Prices</p>
          </div>
        </div>
      </div>

      {/* Right Side - Login Form */}
      <div className="w-full lg:w-1/2 flex items-center justify-center bg-gray-50 dark:bg-gray-900 px-6 py-12">
        <div className="w-full max-w-md">
          {/* Mobile Logo */}
          <div className="lg:hidden text-center mb-8">
            <div className="inline-flex w-20 h-20 bg-primary rounded-full items-center justify-center mb-4">
              <span className="text-3xl font-bold text-white">M&S</span>
            </div>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
              Mian & Sons Hardware Store
            </h2>
          </div>

          {/* Welcome Header */}
          <div className="text-center mb-8">
            <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
              Welcome Back
            </h2>
            <p className="text-gray-600 dark:text-gray-400">
              Sign in to your account to continue
            </p>
          </div>

          {/* Login Form */}
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Username Input */}
            <div>
              <Input
                label="Username"
                type="text"
                name="username"
                value={formData.username}
                onChange={handleChange}
                placeholder="Enter your username"
                icon={<FaUser />}
                error={errors.username}
                required
              />
            </div>

            {/* Password Input */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Password <span className="text-red-500 ml-1">*</span>
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <FaLock className="text-gray-400 dark:text-gray-500" />
                </div>
                <input
                  type={showPassword ? 'text' : 'password'}
                  name="password"
                  value={formData.password}
                  onChange={handleChange}
                  placeholder="Enter your password"
                  className={`
                    w-full pl-10 pr-10 py-2 border rounded-md
                    bg-white dark:bg-gray-800
                    text-gray-900 dark:text-gray-100
                    placeholder-gray-400 dark:placeholder-gray-500
                    focus:outline-none focus:ring-2 focus:ring-primary
                    transition-colors
                    ${errors.password ? 'border-red-500 dark:border-red-400' : 'border-gray-300 dark:border-gray-600'}
                  `}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
                >
                  {showPassword ? <FaEyeSlash size={18} /> : <FaEye size={18} />}
                </button>
              </div>
              {errors.password && (
                <p className="mt-1 text-sm text-red-500 dark:text-red-400">{errors.password}</p>
              )}
            </div>

            {/* Remember Me & Forgot Password */}
            <div className="flex items-center justify-between">
              <label className="flex items-center">
                <input
                  type="checkbox"
                  name="rememberMe"
                  checked={formData.rememberMe}
                  onChange={handleChange}
                  className="h-4 w-4 text-primary border-gray-300 rounded focus:ring-primary"
                />
                <span className="ml-2 text-sm text-gray-700 dark:text-gray-300">
                  Remember me
                </span>
              </label>
              <a
                href="/admin/forgot-password"
                className="text-sm text-primary hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 font-medium transition-colors"
              >
                Forgot Password?
              </a>
            </div>

            {/* Login Button */}
            <Button
              type="submit"
              variant="primary"
              size="lg"
              fullWidth
              loading={loading}
              disabled={loading}
            >
              {loading ? 'Signing in...' : 'Sign In'}
            </Button>

            <Link
              to="/"
              className="block w-full text-center py-2.5 rounded-md border border-primary text-primary font-semibold hover:bg-primary hover:text-white transition-colors"
            >
              Go to Storefront
            </Link>
          </form>

          {/* Demo Credentials */}
          <div className="mt-8 p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
            <p className="text-sm font-semibold text-blue-900 dark:text-blue-300 mb-2">
              Demo Credentials for Testing:
            </p>
            <div className="space-y-1 text-xs text-blue-800 dark:text-blue-400 font-mono">
              <p>• Superadmin: <span className="font-semibold">superadmin</span> / super123</p>
              <p>• Admin: <span className="font-semibold">admin</span> / admin123</p>
              <p>• Manager: <span className="font-semibold">manager</span> / manager123</p>
              <p>• Cashier: <span className="font-semibold">cashier</span> / cashier123</p>
            </div>
          </div>

          {/* Footer */}
          <p className="mt-6 text-center text-sm text-gray-600 dark:text-gray-400">
            © 2026 Mian & Sons Hardware Store. All rights reserved.
          </p>
        </div>
      </div>
    </div>
  );
};

export default Login;
