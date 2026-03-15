import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import productsData from '../../../data/productsData';
import {
  FaFacebookF,
  FaInstagram,
  FaYoutube,
  FaWhatsapp,
  FaMapMarkerAlt,
  FaPhoneAlt,
  FaEnvelope
} from 'react-icons/fa';

const STORE_INFO_KEY = 'admin_store_info';

const defaultStoreInfo = {
  storeName: 'Mian & Sons Hardware Store',
  address: '59-JB Amin Pur Road',
  city: 'Faisalabad',
  phone: '+92-342-6435527',
  whatsapp: '+92-342-6435527',
  email: 'info@miansons.pk',
  workingHours: {
    weekdaysLabel: 'Mon - Sat',
    weekdaysTime: '9:00 AM - 9:00 PM',
    sundayLabel: 'Sunday',
    sundayTime: '11:00 AM - 6:00 PM'
  }
};

const normalizeWhatsApp = (value) => String(value || '').replace(/\D/g, '');

const WebFooter = () => {
  const [storeInfo, setStoreInfo] = useState(defaultStoreInfo);

  useEffect(() => {
    const loadStoreInfo = () => {
      try {
        const storedStoreInfo = JSON.parse(localStorage.getItem(STORE_INFO_KEY) || 'null');
        if (storedStoreInfo && typeof storedStoreInfo === 'object') {
          setStoreInfo({ ...defaultStoreInfo, ...storedStoreInfo });
        }
      } catch (error) {
        setStoreInfo(defaultStoreInfo);
      }
    };

    loadStoreInfo();

    const handleStorage = (event) => {
      if (event.key === STORE_INFO_KEY) {
        loadStoreInfo();
      }
    };

    const handleCustomUpdate = (event) => {
      if (event?.detail?.key === STORE_INFO_KEY) {
        loadStoreInfo();
      }
    };

    window.addEventListener('storage', handleStorage);
    window.addEventListener('app-storage-updated', handleCustomUpdate);

    return () => {
      window.removeEventListener('storage', handleStorage);
      window.removeEventListener('app-storage-updated', handleCustomUpdate);
    };
  }, []);
  const quickLinks = [
    { label: 'Home', to: '/' },
    { label: 'Shop', to: '/shop' },
    { label: 'About Us', to: '/about' },
    { label: 'Contact Us', to: '/contact' },
    { label: 'Track Your Order', to: '/track-order' },
    { label: 'My Account', to: '/customer/account' },
    { label: 'Wishlist', to: '/wishlist' },
    { label: 'Brands', to: '/brands' }
  ];

  const categories = [
    'Plumbing & Sanitary',
    'Bath Accessories & Taps',
    'Paints & Accessories',
    'Electrical Hardware'
  ];

  const customerService = [
    { label: 'FAQs', subject: 'FAQs' },
    { label: 'Returns Policy', subject: 'Returns Policy' },
    { label: 'Warranty Information', subject: 'Warranty Information' },
    { label: 'Bulk/Wholesale Inquiry', subject: 'Bulk/Wholesale Inquiry' },
    { label: 'Complaint Portal', subject: 'Complaint' }
  ];

  const brands = [...new Set(productsData.map((product) => product.company))];
  const paymentMethods = ['Cash', 'EasyPaisa', 'JazzCash', 'Bank Transfer'];

  const workingHoursText =
    storeInfo.workingHours && typeof storeInfo.workingHours === 'object'
      ? `${storeInfo.workingHours.weekdaysLabel}: ${storeInfo.workingHours.weekdaysTime}`
      : storeInfo.workingHours;

  return (
    <footer>
      <div className="bg-secondary">
        <div className="max-w-7xl mx-auto px-4 py-6 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div className="text-white">
            <h3 className="text-xl font-bold">Subscribe to Our Newsletter</h3>
            <p className="text-sm text-orange-100">Get latest offers and updates</p>
          </div>
          <form className="w-full lg:w-auto" onSubmit={(event) => event.preventDefault()}>
            <div className="flex w-full lg:w-[460px] bg-white rounded-md overflow-hidden">
              <input
                type="email"
                placeholder="Enter your email"
                className="flex-1 border-0 focus:ring-0 text-sm"
              />
              <button
                type="submit"
                className="bg-primary px-5 text-white text-sm font-semibold hover:opacity-90 transition-opacity"
              >
                Subscribe
              </button>
            </div>
          </form>
        </div>
      </div>

      <div className="bg-[#1e3a5f] text-white">
        <div className="max-w-7xl mx-auto px-4 py-12">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
            <div>
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 bg-white text-primary rounded-md font-bold flex items-center justify-center">
                  M&S
                </div>
                <p className="font-bold text-lg">{storeInfo.storeName}</p>
              </div>
              <p className="text-sm text-blue-100 leading-6 mb-4">
                Your trusted partner for quality hardware, construction materials, tools, and industrial supplies across Pakistan.
              </p>
              <div className="space-y-2 text-sm text-blue-100">
                <p className="flex items-start gap-2"><FaMapMarkerAlt className="mt-1" /> {storeInfo.address}{storeInfo.city ? `, ${storeInfo.city}` : ''}, Pakistan</p>
                <p className="flex items-center gap-2"><FaPhoneAlt /> {storeInfo.phone}</p>
                <p className="flex items-center gap-2"><FaEnvelope /> {storeInfo.email}</p>
                <p>{workingHoursText}</p>
              </div>
              <div className="flex items-center gap-3 mt-4">
                <a href="https://facebook.com" target="_blank" rel="noreferrer" className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center hover:bg-secondary transition-colors" aria-label="Facebook">
                  <FaFacebookF size={14} />
                </a>
                <a href="https://instagram.com" target="_blank" rel="noreferrer" className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center hover:bg-secondary transition-colors" aria-label="Instagram">
                  <FaInstagram size={14} />
                </a>
                <a href="https://youtube.com" target="_blank" rel="noreferrer" className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center hover:bg-secondary transition-colors" aria-label="YouTube">
                  <FaYoutube size={14} />
                </a>
                <a href={`https://wa.me/${normalizeWhatsApp(storeInfo.whatsapp || storeInfo.phone)}`} target="_blank" rel="noreferrer" className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center hover:bg-secondary transition-colors" aria-label="WhatsApp">
                  <FaWhatsapp size={14} />
                </a>
              </div>
            </div>

            <div>
              <h4 className="font-semibold text-lg mb-4">Quick Links</h4>
              <ul className="space-y-2 text-sm text-blue-100">
                {quickLinks.map((link) => (
                  <li key={link.label}>
                    <Link to={link.to} className="hover:text-secondary transition-colors">
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>

            <div>
              <h4 className="font-semibold text-lg mb-4">Product Categories</h4>
              <ul className="space-y-2 text-sm text-blue-100">
                {categories.map((category) => (
                  <li key={category}>
                    <Link
                      to={`/shop?category=${encodeURIComponent(category)}`}
                      className="hover:text-secondary transition-colors"
                    >
                      {category}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>

            <div>
              <h4 className="font-semibold text-lg mb-4">Customer Service</h4>
              <ul className="space-y-2 text-sm text-blue-100">
                {customerService.map((item) => (
                  <li key={item.label}>
                    <Link
                      to={`/contact?subject=${encodeURIComponent(item.subject)}`}
                      className="hover:text-secondary transition-colors"
                    >
                      {item.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          <div className="mt-10 pt-6 border-t border-white/20">
            <h5 className="font-semibold mb-3">Brands</h5>
            <div className="flex flex-wrap gap-2">
              {brands.map((brand) => (
                <span key={brand} className="px-3 py-1.5 bg-white/10 rounded-full text-sm text-blue-100">
                  {brand}
                </span>
              ))}
            </div>
          </div>
        </div>

        <div className="bg-[#162f4d] border-t border-white/10">
          <div className="max-w-7xl mx-auto px-4 py-4 flex flex-col lg:flex-row items-center justify-between gap-3 text-sm text-blue-100">
            <p>© 2024 Mian & Sons Hardware Store. All Rights Reserved</p>
            <div className="flex flex-wrap items-center justify-center gap-2">
              {paymentMethods.map((method) => (
                <span key={method} className="px-2.5 py-1 bg-white/10 rounded text-xs">
                  {method}
                </span>
              ))}
            </div>
            <p>Made with ❤️ in Pakistan</p>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default WebFooter;