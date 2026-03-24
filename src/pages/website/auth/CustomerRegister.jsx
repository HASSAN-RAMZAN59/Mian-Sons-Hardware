import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';

const cities = ['Lahore', 'Karachi', 'Islamabad', 'Rawalpindi', 'Faisalabad', 'Multan', 'Peshawar', 'Quetta'];

const customerTypes = ['Retail', 'Contractor', 'Wholesaler'];

const getPasswordChecks = (password) => ({
  minLength: password.length >= 8,
  upper: /[A-Z]/.test(password),
  lower: /[a-z]/.test(password),
  number: /\d/.test(password),
  special: /[^A-Za-z0-9]/.test(password)
});

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

const CustomerRegister = () => {
  const navigate = useNavigate();

  const [form, setForm] = useState({
    fullName: '',
    email: '',
    phone: '',
    password: '',
    confirmPassword: '',
    address: '',
    city: '',
    customerType: 'Retail',
    acceptTerms: false
  });

  const [errors, setErrors] = useState({});
  const passwordChecks = getPasswordChecks(form.password);
  const isStrongPassword = Object.values(passwordChecks).every(Boolean);

  const updateField = (field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    setErrors((prev) => ({ ...prev, [field]: '', form: '' }));
  };

  const saveCustomerSession = (customerRecord) => {
    const customerPayload = {
      id: customerRecord.id,
      fullName: customerRecord.fullName,
      name: customerRecord.fullName,
      email: customerRecord.email,
      phone: customerRecord.phone,
      address: customerRecord.address,
      city: customerRecord.city,
      customerType: customerRecord.customerType
    };

    localStorage.setItem('customerUser', JSON.stringify(customerPayload));
    localStorage.setItem('customerToken', `cust_${customerRecord.id}_${Date.now()}`);
    localStorage.removeItem('customerGuest');
  };

  const handleRegister = (event) => {
    event.preventDefault();

    const nextErrors = {};

    if (!form.fullName.trim()) nextErrors.fullName = 'Full name is required.';
    if (!form.email.trim()) nextErrors.email = 'Email is required.';
    else if (!/^\S+@\S+\.\S+$/.test(form.email)) nextErrors.email = 'Invalid email format.';
    if (!form.phone.trim()) nextErrors.phone = 'Phone is required.';
    if (!form.password) nextErrors.password = 'Password is required.';
    else if (!isStrongPassword) {
      nextErrors.password = 'Password must be at least 8 characters and include uppercase, lowercase, number, and special character.';
    }
    if (!form.confirmPassword) nextErrors.confirmPassword = 'Confirm your password.';
    if (form.password && form.confirmPassword && form.password !== form.confirmPassword) {
      nextErrors.confirmPassword = 'Passwords do not match.';
    }
    if (!form.city) nextErrors.city = 'Please select city.';
    if (!form.acceptTerms) nextErrors.acceptTerms = 'You must accept terms.';

    const existingUsers = JSON.parse(localStorage.getItem('website_customer_accounts') || '[]');
    if (existingUsers.some((user) => user.email?.toLowerCase() === form.email.toLowerCase())) {
      nextErrors.email = 'Email is already registered.';
    }
    if (existingUsers.some((user) => user.phone === form.phone)) {
      nextErrors.phone = 'Phone is already registered.';
    }

    if (Object.keys(nextErrors).length > 0) {
      setErrors(nextErrors);
      return;
    }

    const newUser = {
      id: `cust_${Date.now()}`,
      fullName: form.fullName.trim(),
      email: form.email.trim(),
      phone: form.phone.trim(),
      password: form.password,
      address: form.address.trim(),
      city: form.city,
      customerType: form.customerType,
      createdAt: new Date().toISOString()
    };

    localStorage.setItem('website_customer_accounts', JSON.stringify([newUser, ...existingUsers]));
    window.dispatchEvent(new CustomEvent('app-storage-updated', { detail: { key: 'website_customer_accounts' } }));

    saveCustomerSession(newUser);

    toast.success(`Welcome ${newUser.fullName}! Your account has been created.`);
    navigate('/');
  };

  const handleSocialRegister = (provider) => {
    if (!form.acceptTerms) {
      toast.error('Please accept Terms & Conditions before continuing.');
      return;
    }

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
      navigate('/');
      return;
    }

    const newUser = {
      id: `cust_${Date.now()}`,
      fullName: getNameFromEmail(enteredEmail),
      email: enteredEmail,
      phone: '',
      password: '',
      address: '',
      city: form.city || '',
      customerType: form.customerType || 'Retail',
      authProvider: provider.toLowerCase(),
      createdAt: new Date().toISOString()
    };

    localStorage.setItem('website_customer_accounts', JSON.stringify([newUser, ...existingUsers]));
    window.dispatchEvent(new CustomEvent('app-storage-updated', { detail: { key: 'website_customer_accounts' } }));
    saveCustomerSession(newUser);
    toast.success(`Account created with ${provider}.`);
    navigate('/');
  };

  return (
    <div className="min-h-[80vh] bg-gray-50 py-10 px-4 flex items-center justify-center">
      <div className="w-full max-w-2xl bg-white border border-gray-200 rounded-2xl p-6 sm:p-8 shadow-sm">
        <div className="text-center mb-6">
          <img src="/images/store-logo.png" alt="Mian & Sons logo" className="mx-auto w-12 h-12 object-contain mb-3" />
          <h1 className="text-2xl font-bold text-primary">Create Customer Account</h1>
          <p className="text-sm text-gray-500 mt-1">Mian & Sons Hardware Store</p>
        </div>

        <form onSubmit={handleRegister} className="space-y-4">
          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium text-gray-700">Full Name *</label>
              <input
                type="text"
                value={form.fullName}
                onChange={(event) => updateField('fullName', event.target.value)}
                className="mt-1 w-full rounded-md border border-gray-300"
              />
              {errors.fullName && <p className="text-xs text-red-500 mt-1">{errors.fullName}</p>}
            </div>

            <div>
              <label className="text-sm font-medium text-gray-700">Email *</label>
              <input
                type="email"
                value={form.email}
                onChange={(event) => updateField('email', event.target.value)}
                className="mt-1 w-full rounded-md border border-gray-300"
              />
              {errors.email && <p className="text-xs text-red-500 mt-1">{errors.email}</p>}
            </div>
          </div>

          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium text-gray-700">Phone *</label>
              <input
                type="text"
                value={form.phone}
                onChange={(event) => updateField('phone', event.target.value)}
                className="mt-1 w-full rounded-md border border-gray-300"
              />
              {errors.phone && <p className="text-xs text-red-500 mt-1">{errors.phone}</p>}
            </div>

            <div>
              <label className="text-sm font-medium text-gray-700">City</label>
              <select
                value={form.city}
                onChange={(event) => updateField('city', event.target.value)}
                className="mt-1 w-full rounded-md border border-gray-300"
              >
                <option value="">Select city</option>
                {cities.map((city) => (
                  <option key={city} value={city}>
                    {city}
                  </option>
                ))}
              </select>
              {errors.city && <p className="text-xs text-red-500 mt-1">{errors.city}</p>}
            </div>
          </div>

          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium text-gray-700">Password *</label>
              <input
                type="password"
                value={form.password}
                onChange={(event) => updateField('password', event.target.value)}
                className="mt-1 w-full rounded-md border border-gray-300"
              />
              {errors.password && <p className="text-xs text-red-500 mt-1">{errors.password}</p>}
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
              <label className="text-sm font-medium text-gray-700">Confirm Password *</label>
              <input
                type="password"
                value={form.confirmPassword}
                onChange={(event) => updateField('confirmPassword', event.target.value)}
                className="mt-1 w-full rounded-md border border-gray-300"
              />
              {errors.confirmPassword && <p className="text-xs text-red-500 mt-1">{errors.confirmPassword}</p>}
            </div>
          </div>

          <div>
            <label className="text-sm font-medium text-gray-700">Address (optional)</label>
            <textarea
              rows={2}
              value={form.address}
              onChange={(event) => updateField('address', event.target.value)}
              className="mt-1 w-full rounded-md border border-gray-300"
            />
          </div>

          <div>
            <label className="text-sm font-medium text-gray-700">Customer Type</label>
            <div className="mt-2 grid grid-cols-1 sm:grid-cols-3 gap-2">
              {customerTypes.map((type) => (
                <label key={type} className="inline-flex items-center gap-2 rounded-md border border-gray-200 px-3 py-2 text-sm">
                  <input
                    type="radio"
                    name="customerType"
                    value={type}
                    checked={form.customerType === type}
                    onChange={(event) => updateField('customerType', event.target.value)}
                  />
                  {type}
                </label>
              ))}
            </div>
          </div>

          <label className="inline-flex items-center gap-2 text-sm text-gray-700">
            <input
              type="checkbox"
              checked={form.acceptTerms}
              onChange={(event) => updateField('acceptTerms', event.target.checked)}
            />
            I accept Terms & Conditions
          </label>
          {errors.acceptTerms && <p className="text-xs text-red-500 -mt-2">{errors.acceptTerms}</p>}

          <button type="submit" className="w-full py-2.5 rounded-md bg-secondary text-white font-semibold hover:opacity-90">
            Register Now
          </button>

          <div className="relative pt-1">
            <div className="absolute inset-0 flex items-center" aria-hidden="true">
              <div className="w-full border-t border-gray-200" />
            </div>
            <div className="relative flex justify-center">
              <span className="bg-white px-3 text-xs text-gray-500">or continue with</span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => handleSocialRegister('Google')}
              className="py-2 rounded-md border border-gray-300 text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              Google
            </button>
            <button
              type="button"
              onClick={() => handleSocialRegister('Facebook')}
              className="py-2 rounded-md border border-gray-300 text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              Facebook
            </button>
          </div>
        </form>

        <p className="text-sm text-center text-gray-600 mt-5">
          Already have account?{' '}
          <Link to="/customer/login" className="text-primary font-semibold hover:text-secondary">
            Login
          </Link>
        </p>
      </div>
    </div>
  );
};

export default CustomerRegister;