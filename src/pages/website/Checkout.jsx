import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { toast } from 'react-toastify';
import { useCart } from '../../context/CartContext';
import { showActionToast } from '../../utils/toastActions';

const steps = ['Information', 'Shipping', 'Payment', 'Confirm'];

const deliveryOptions = [
  { id: 'standard', label: 'Standard Delivery (3-5 days)', charge: 250 },
  { id: 'express', label: 'Express Delivery (1-2 days)', charge: 500 },
  { id: 'pickup', label: 'Free Pickup from Store', charge: 0 }
];

const paymentMethods = [
  { id: 'cod', label: 'Cash on Delivery', details: 'Recommended for quick and safe payment.' },
  { id: 'easypaisa', label: 'EasyPaisa', details: 'Send payment to: 03XX-XXXXXXX' },
  { id: 'jazzcash', label: 'JazzCash', details: 'Send payment to: 03YY-YYYYYYY' },
  { id: 'bank', label: 'Bank Transfer', details: 'A/C: 001234567890 | Bank: HBL' },
  { id: 'credit', label: 'Credit on Account', details: 'Available for registered customers with approved credit limit.' }
];

const cities = ['Lahore', 'Karachi', 'Islamabad', 'Rawalpindi', 'Faisalabad', 'Multan', 'Peshawar', 'Quetta'];

const Checkout = () => {
  const navigate = useNavigate();
  const { cartItems, cartTotal, cartDiscount, clearCart } = useCart();

  const [currentStep, setCurrentStep] = useState(1);
  const [errors, setErrors] = useState({});
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [form, setForm] = useState({
    fullName: '',
    email: '',
    phone: '',
    address: '',
    city: '',
    area: '',
    notes: '',
    deliveryType: 'standard',
    paymentMethod: 'cod'
  });

  useEffect(() => {
    const customer = JSON.parse(localStorage.getItem('customerUser') || 'null');
    const user = JSON.parse(localStorage.getItem('user') || 'null');
    const profile = customer || user;

    if (profile) {
      setForm((prev) => ({
        ...prev,
        fullName: profile.fullName || profile.name || prev.fullName,
        email: profile.email || prev.email,
        phone: profile.phone || prev.phone,
        address: profile.address || prev.address,
        city: profile.city || prev.city,
        area: profile.area || prev.area
      }));
    }
  }, []);

  const selectedDelivery = deliveryOptions.find((item) => item.id === form.deliveryType) || deliveryOptions[0];
  const deliveryCharge = selectedDelivery.charge;
  const grandTotal = Math.max(cartTotal + deliveryCharge, 0);

  const isCustomerLoggedIn = Boolean(localStorage.getItem('customerUser'));

  const validateStep = (stepNumber) => {
    const nextErrors = {};

    if (stepNumber === 1) {
      if (!form.fullName.trim()) nextErrors.fullName = 'Full name is required.';
      if (!form.email.trim()) nextErrors.email = 'Email is required.';
      else if (!/^\S+@\S+\.\S+$/.test(form.email)) nextErrors.email = 'Enter a valid email.';
      if (!form.phone.trim()) nextErrors.phone = 'Phone number is required.';
    }

    if (stepNumber === 2) {
      if (!form.address.trim()) nextErrors.address = 'Full address is required.';
      if (!form.city) nextErrors.city = 'City is required.';
      if (!form.area.trim()) nextErrors.area = 'Area/Locality is required.';
    }

    if (stepNumber === 3) {
      if (!form.paymentMethod) nextErrors.paymentMethod = 'Please select a payment method.';
      if (form.paymentMethod === 'credit' && !isCustomerLoggedIn) {
        nextErrors.paymentMethod = 'Credit on Account is only for registered customers.';
      }
    }

    if (stepNumber === 4 && !termsAccepted) {
      nextErrors.terms = 'Please accept Terms & Conditions.';
    }

    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const nextStep = () => {
    if (!validateStep(currentStep)) return;
    setCurrentStep((prev) => Math.min(prev + 1, 4));
  };

  const prevStep = () => {
    setErrors({});
    setCurrentStep((prev) => Math.max(prev - 1, 1));
  };

  const placeOrder = () => {
    if (!validateStep(4)) return;

    const order = {
      id: `ORD-${Date.now()}`,
      createdAt: new Date().toISOString(),
      status: 'Pending',
      statusUpdatedAt: new Date().toISOString(),
      statusHistory: [
        {
          status: 'Pending',
          dateTime: new Date().toISOString()
        }
      ],
      customer: {
        fullName: form.fullName,
        email: form.email,
        phone: form.phone
      },
      shipping: {
        address: form.address,
        city: form.city,
        area: form.area,
        notes: form.notes,
        deliveryType: form.deliveryType,
        deliveryCharge
      },
      paymentMethod: form.paymentMethod,
      items: cartItems,
      totals: {
        subtotal: cartTotal + cartDiscount,
        discount: cartDiscount,
        delivery: deliveryCharge,
        grandTotal
      }
    };

    const existingOrders = JSON.parse(localStorage.getItem('website_orders') || '[]');
    localStorage.setItem('website_orders', JSON.stringify([order, ...existingOrders]));
    window.dispatchEvent(new CustomEvent('app-storage-updated', { detail: { key: 'website_orders' } }));
    clearCart();
    showActionToast('success', 'Order placed successfully.', { path: `/track-order/${order.id}` });
    navigate('/order-success');
  };

  const renderStepContent = () => {
    if (currentStep === 1) {
      return (
        <div className="space-y-4">
          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium text-gray-700">Full Name</label>
              <input
                type="text"
                value={form.fullName}
                onChange={(event) => setForm((prev) => ({ ...prev, fullName: event.target.value }))}
                className="mt-1 w-full rounded-md border border-gray-300"
              />
              {errors.fullName && <p className="text-xs text-red-500 mt-1">{errors.fullName}</p>}
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700">Email</label>
              <input
                type="email"
                value={form.email}
                onChange={(event) => setForm((prev) => ({ ...prev, email: event.target.value }))}
                className="mt-1 w-full rounded-md border border-gray-300"
              />
              {errors.email && <p className="text-xs text-red-500 mt-1">{errors.email}</p>}
            </div>
          </div>

          <div>
            <label className="text-sm font-medium text-gray-700">Phone Number</label>
            <input
              type="text"
              value={form.phone}
              onChange={(event) => setForm((prev) => ({ ...prev, phone: event.target.value }))}
              className="mt-1 w-full rounded-md border border-gray-300"
            />
            {errors.phone && <p className="text-xs text-red-500 mt-1">{errors.phone}</p>}
          </div>

          <p className="text-sm text-gray-600">
            Already have an account?{' '}
            <Link to="/customer/login" className="text-primary font-semibold hover:text-secondary">
              Login
            </Link>
          </p>
        </div>
      );
    }

    if (currentStep === 2) {
      return (
        <div className="space-y-4">
          <div>
            <label className="text-sm font-medium text-gray-700">Full Address</label>
            <textarea
              rows={3}
              value={form.address}
              onChange={(event) => setForm((prev) => ({ ...prev, address: event.target.value }))}
              className="mt-1 w-full rounded-md border border-gray-300"
            />
            {errors.address && <p className="text-xs text-red-500 mt-1">{errors.address}</p>}
          </div>

          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium text-gray-700">City</label>
              <select
                value={form.city}
                onChange={(event) => setForm((prev) => ({ ...prev, city: event.target.value }))}
                className="mt-1 w-full rounded-md border border-gray-300"
              >
                <option value="">Select City</option>
                {cities.map((city) => (
                  <option key={city} value={city}>
                    {city}
                  </option>
                ))}
              </select>
              {errors.city && <p className="text-xs text-red-500 mt-1">{errors.city}</p>}
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700">Area/Locality</label>
              <input
                type="text"
                value={form.area}
                onChange={(event) => setForm((prev) => ({ ...prev, area: event.target.value }))}
                className="mt-1 w-full rounded-md border border-gray-300"
              />
              {errors.area && <p className="text-xs text-red-500 mt-1">{errors.area}</p>}
            </div>
          </div>

          <div>
            <label className="text-sm font-medium text-gray-700">Delivery Notes (Optional)</label>
            <textarea
              rows={2}
              value={form.notes}
              onChange={(event) => setForm((prev) => ({ ...prev, notes: event.target.value }))}
              className="mt-1 w-full rounded-md border border-gray-300"
            />
          </div>

          <div>
            <label className="text-sm font-semibold text-gray-700">Delivery Type</label>
            <div className="mt-2 space-y-2">
              {deliveryOptions.map((option) => (
                <label key={option.id} className="flex items-center justify-between rounded-md border border-gray-200 px-3 py-2">
                  <span className="flex items-center gap-2 text-sm text-gray-700">
                    <input
                      type="radio"
                      name="deliveryType"
                      checked={form.deliveryType === option.id}
                      onChange={() => setForm((prev) => ({ ...prev, deliveryType: option.id }))}
                    />
                    {option.label}
                  </span>
                  <span className="text-sm font-semibold text-secondary">
                    {option.charge === 0 ? 'Free' : `Rs. ${option.charge}`}
                  </span>
                </label>
              ))}
            </div>
          </div>
        </div>
      );
    }

    if (currentStep === 3) {
      return (
        <div className="space-y-3">
          {paymentMethods.map((method) => (
            <label key={method.id} className="block rounded-md border border-gray-200 p-3">
              <div className="flex items-start gap-3">
                <input
                  type="radio"
                  name="paymentMethod"
                  checked={form.paymentMethod === method.id}
                  onChange={() => setForm((prev) => ({ ...prev, paymentMethod: method.id }))}
                />
                <div>
                  <div className="flex items-center gap-2">
                    <p className="font-semibold text-primary">{method.label}</p>
                    {method.id === 'cod' && (
                      <span className="text-xs bg-orange-100 text-orange-700 px-2 py-0.5 rounded-full">Recommended</span>
                    )}
                  </div>
                  <p className="text-sm text-gray-600 mt-1">{method.details}</p>
                </div>
              </div>
            </label>
          ))}
          {errors.paymentMethod && <p className="text-xs text-red-500">{errors.paymentMethod}</p>}
        </div>
      );
    }

    return (
      <div className="space-y-5">
        <div className="rounded-md border border-gray-200 p-4">
          <h3 className="font-semibold text-primary mb-2">Order Items</h3>
          <div className="space-y-2">
            {cartItems.map((item) => (
              <div key={item.id} className="flex justify-between text-sm">
                <span className="text-gray-700">
                  {item.name} × {item.quantity}
                </span>
                <span className="font-semibold">Rs. {((item.salePrice ?? item.price) * item.quantity).toLocaleString()}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-md border border-gray-200 p-4 text-sm">
          <h3 className="font-semibold text-primary mb-2">Delivery Details</h3>
          <p>{form.fullName}</p>
          <p>{form.phone}</p>
          <p>{form.address}, {form.area}, {form.city}</p>
          {form.notes && <p className="text-gray-600 mt-1">Notes: {form.notes}</p>}
        </div>

        <div className="rounded-md border border-gray-200 p-4 text-sm">
          <h3 className="font-semibold text-primary mb-2">Payment Method</h3>
          <p>{paymentMethods.find((m) => m.id === form.paymentMethod)?.label}</p>
        </div>

        <div className="rounded-md border border-gray-200 p-4">
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={termsAccepted} onChange={(event) => setTermsAccepted(event.target.checked)} />
            I agree to Terms & Conditions
          </label>
          {errors.terms && <p className="text-xs text-red-500 mt-1">{errors.terms}</p>}
        </div>

        <button
          type="button"
          onClick={placeOrder}
          className="w-full py-3 rounded-md bg-secondary text-white text-lg font-bold hover:opacity-90"
        >
          Place Order
        </button>
      </div>
    );
  };

  if (cartItems.length === 0) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-12 text-center">
        <h1 className="text-2xl font-bold text-primary mb-3">Checkout</h1>
        <p className="text-gray-600 mb-6">Your cart is empty. Add products before checkout.</p>
        <Link to="/shop" className="inline-flex px-6 py-3 rounded-md bg-secondary text-white font-semibold">
          Continue Shopping
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <div className="mb-6 grid grid-cols-2 sm:grid-cols-4 gap-2">
        {steps.map((step, index) => {
          const stepNo = index + 1;
          const isActive = currentStep === stepNo;
          const isCompleted = currentStep > stepNo;

          return (
            <div key={step} className={`rounded-md px-3 py-2 text-sm text-center border ${isActive ? 'border-secondary bg-orange-50 text-secondary' : isCompleted ? 'border-green-200 bg-green-50 text-green-700' : 'border-gray-200 text-gray-500'}`}>
              {stepNo}. {step}
            </div>
          );
        })}
      </div>

      <div className="grid lg:grid-cols-12 gap-6">
        <section className="lg:col-span-8 bg-white border border-gray-200 rounded-xl p-5">
          <h2 className="text-xl font-bold text-primary mb-4">Step {currentStep}: {steps[currentStep - 1]}</h2>

          <AnimatePresence mode="wait">
            <motion.div
              key={currentStep}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.2 }}
            >
              {renderStepContent()}
            </motion.div>
          </AnimatePresence>

          {currentStep < 4 && (
            <div className="mt-6 flex items-center justify-between">
              <button
                type="button"
                onClick={prevStep}
                disabled={currentStep === 1}
                className={`px-5 py-2 rounded-md font-semibold ${currentStep === 1 ? 'bg-gray-200 text-gray-500 cursor-not-allowed' : 'border border-gray-300 text-gray-700 hover:bg-gray-50'}`}
              >
                Back
              </button>
              <button
                type="button"
                onClick={nextStep}
                className="px-5 py-2 rounded-md bg-primary text-white font-semibold hover:bg-primary/90"
              >
                Continue
              </button>
            </div>
          )}
        </section>

        <aside className="lg:col-span-4">
          <div className="bg-white border border-gray-200 rounded-xl p-5 sticky top-24">
            <h3 className="text-lg font-bold text-primary mb-3">Order Summary</h3>
            <div className="space-y-2 text-sm">
              {cartItems.map((item) => (
                <div key={item.id} className="flex items-center justify-between text-gray-600">
                  <span className="line-clamp-1 mr-2">{item.name} × {item.quantity}</span>
                  <span>Rs. {((item.salePrice ?? item.price) * item.quantity).toLocaleString()}</span>
                </div>
              ))}
            </div>

            <div className="mt-4 pt-4 border-t border-gray-200 space-y-2 text-sm">
              <div className="flex items-center justify-between text-gray-600">
                <span>Subtotal</span>
                <span>Rs. {(cartTotal + cartDiscount).toLocaleString()}</span>
              </div>
              {cartDiscount > 0 && (
                <div className="flex items-center justify-between text-green-600">
                  <span>Discount</span>
                  <span>- Rs. {cartDiscount.toLocaleString()}</span>
                </div>
              )}
              <div className="flex items-center justify-between text-gray-600">
                <span>Delivery</span>
                <span>{deliveryCharge === 0 ? 'Free' : `Rs. ${deliveryCharge}`}</span>
              </div>
            </div>

            <div className="mt-4 pt-4 border-t border-gray-200 flex items-center justify-between">
              <span className="font-semibold text-primary">Total</span>
              <span className="text-2xl font-bold text-secondary">Rs. {grandTotal.toLocaleString()}</span>
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
};

export default Checkout;