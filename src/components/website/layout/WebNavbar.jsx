import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import {
  FaBars,
  FaChevronDown,
  FaFacebookF,
  FaHeart,
  FaInstagram,
  FaSearch,
  FaShoppingCart,
  FaBalanceScale,
  FaUser,
  FaWhatsapp
} from 'react-icons/fa';
import { useCart } from '../../../context/CartContext';
import { useWishlist } from '../../../context/WishlistContext';
import { useCustomerAuth } from '../../../context/CustomerAuthContext';
import productsData from '../../../data/productsData';
import MobileMenu from './MobileMenu';

const SEARCH_PRODUCTS = productsData.map((product) => ({
  id: String(product.id),
  name: product.size ? `${product.name} - ${product.size}` : product.name,
  category: product.category,
  brand: product.company,
  stock: Number(product.stockQty ?? product.stock ?? 0)
}));

const MEGA_MENU = [
  {
    label: 'Plumbing & Sanitary (15)',
    category: 'Plumbing & Sanitary',
    items: ['Pipes', 'Water Tanks', 'Sink Bowls', 'Basins']
  },
  {
    label: 'Bath Accessories & Taps (8)',
    category: 'Bath Accessories & Taps',
    items: ['Bath Seats', 'Simple Taps', 'T-Cock', 'Shower Heads']
  },
  {
    label: 'Paints & Accessories (6)',
    category: 'Paints & Accessories',
    items: ['Paint Brushes', 'Paint Sprays']
  },
  {
    label: 'Electrical Hardware (8)',
    category: 'Electrical Hardware',
    items: ['Wiring Pipes', 'Fan Boxes', 'Breakers', 'Bulb Holders']
  }
];

const NAV_LINKS = [
  { label: 'Home', to: '/' },
  { label: 'Shop', to: '/shop' },
  { label: 'Special Offers', to: '/shop?offer=true' },
  { label: 'New Arrivals', to: '/shop?new=true' },
  { label: 'Brands', to: '/brands' },
  { label: 'Contact', to: '/contact' }
];

const WebNavbar = () => {
  const navigate = useNavigate();
  const { cartCount, cartTotal, setIsCartOpen, clearCart } = useCart();
  const { wishlistCount } = useWishlist();
  const { customerUser, logoutCustomer } = useCustomerAuth();

  const [isSticky, setIsSticky] = useState(false);
  const [searchCategory, setSearchCategory] = useState('All Categories');
  const [searchText, setSearchText] = useState('');
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [showAccountMenu, setShowAccountMenu] = useState(false);
  const [showMobileMenu, setShowMobileMenu] = useState(false);
  const [activeMegaCategory, setActiveMegaCategory] = useState(null);
  const [latestOrderId, setLatestOrderId] = useState('');
  const [searchInteracted, setSearchInteracted] = useState(false);
  const [compareCount, setCompareCount] = useState(0);

  const searchCategories = useMemo(() => {
    const categories = Array.from(
      new Set(
        productsData
          .map((product) => product.category)
          .filter(Boolean)
      )
    );
    return ['All Categories', ...categories];
  }, []);

  const searchWrapRef = useRef(null);
  const mobileSearchWrapRef = useRef(null);
  const accountMenuRef = useRef(null);

  useEffect(() => {
    const handleScroll = () => {
      setIsSticky(window.scrollY > 12);
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    const handleOutsideClick = (event) => {
      const desktopSearchClicked = searchWrapRef.current && searchWrapRef.current.contains(event.target);
      const mobileSearchClicked = mobileSearchWrapRef.current && mobileSearchWrapRef.current.contains(event.target);

      if (!desktopSearchClicked && !mobileSearchClicked) {
        setShowSuggestions(false);
      }

      if (accountMenuRef.current && !accountMenuRef.current.contains(event.target)) {
        setShowAccountMenu(false);
      }
    };

    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, []);

  useEffect(() => {
    const loadLatestOrder = () => {
      try {
        const stored = JSON.parse(localStorage.getItem('website_orders') || '[]');
        const latest = Array.isArray(stored) && stored.length ? stored[0]?.id : '';
        setLatestOrderId(latest || '');
      } catch {
        setLatestOrderId('');
      }
    };

    loadLatestOrder();

    const handleStorageUpdated = (event) => {
      if (!event?.detail?.key || event.detail.key === 'website_orders') {
        loadLatestOrder();
      }
    };

    window.addEventListener('app-storage-updated', handleStorageUpdated);
    window.addEventListener('storage', loadLatestOrder);

    return () => {
      window.removeEventListener('app-storage-updated', handleStorageUpdated);
      window.removeEventListener('storage', loadLatestOrder);
    };
  }, []);

  useEffect(() => {
    const loadCompareCount = () => {
      try {
        const stored = JSON.parse(localStorage.getItem('website_compare_items') || '[]');
        setCompareCount(Array.isArray(stored) ? stored.length : 0);
      } catch {
        setCompareCount(0);
      }
    };

    loadCompareCount();

    const handleStorageUpdated = (event) => {
      if (!event?.detail?.key || event.detail.key === 'website_compare_items') {
        loadCompareCount();
      }
    };

    window.addEventListener('app-storage-updated', handleStorageUpdated);
    window.addEventListener('storage', loadCompareCount);

    return () => {
      window.removeEventListener('app-storage-updated', handleStorageUpdated);
      window.removeEventListener('storage', loadCompareCount);
    };
  }, []);

  const suggestions = useMemo(() => {
    const normalized = searchText.trim().toLowerCase();
    return SEARCH_PRODUCTS.filter((product) => {
      if (product.stock <= 0) return false;

      if (!normalized) {
        return searchCategory === 'All Categories' || product.category === searchCategory;
      }

      const matchesText =
        product.name.toLowerCase().includes(normalized) ||
        String(product.brand || '').toLowerCase().includes(normalized) ||
        String(product.category || '').toLowerCase().includes(normalized);
      const matchesCategory =
        searchCategory === 'All Categories' || product.category === searchCategory;
      return matchesText && matchesCategory;
    }).slice(0, 6);
  }, [searchText, searchCategory]);

  const buildShopSearch = () => {
    const normalizedSearch = searchText.trim();
    const isOnShop = window.location.pathname === '/shop';
    const baseParams = isOnShop ? new URLSearchParams(window.location.search) : new URLSearchParams();

    if (normalizedSearch) baseParams.set('search', normalizedSearch);
    else baseParams.delete('search');

    if (searchCategory !== 'All Categories') baseParams.set('category', searchCategory);
    else baseParams.delete('category');

    if (!isOnShop) {
      baseParams.delete('page');
    }

    return baseParams.toString();
  };

  const handleSearchSubmit = (event) => {
    event.preventDefault();
    setSearchInteracted(true);
    const nextSearch = buildShopSearch();

    setShowSuggestions(false);
    navigate(`/shop${nextSearch ? `?${nextSearch}` : ''}`);
  };

  useEffect(() => {
    if (!searchInteracted) return;

    const normalizedSearch = searchText.trim();
    const isOnShop = window.location.pathname === '/shop';
    if (!normalizedSearch && searchCategory === 'All Categories' && !isOnShop) return;

    const nextSearch = buildShopSearch();
    const targetPath = `/shop${nextSearch ? `?${nextSearch}` : ''}`;
    const currentPath = `${window.location.pathname}${window.location.search}`;

    if (targetPath !== currentPath) {
      navigate(targetPath, { replace: true });
    }
  }, [searchInteracted, searchText, searchCategory, navigate]);

  const handleSearchTextChange = (value) => {
    setSearchInteracted(true);
    setSearchText(value);
    setShowSuggestions(true);
  };

  const handleSearchCategoryChange = (value) => {
    setSearchInteracted(true);
    setSearchCategory(value);
    setShowSuggestions(true);
  };

  const handleLogout = () => {
    logoutCustomer();
    clearCart();
    setShowAccountMenu(false);
    navigate('/', { replace: true });
  };

  return (
    <div className="bg-white">
      <div className="hidden md:block bg-primary text-white text-xs">
        <div className="max-w-7xl mx-auto px-4 py-2 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <span>+923426435527</span>
            <span>hassanramzan59@gmail.com</span>
            <span>Shop Timing: Monday-Thursday & Saturday-Sunday: 8:00 AM - 8:00 PM | Friday: Off</span>
          </div>
          <div className="flex items-center gap-4">
            <Link to="/track-order" className="hover:text-secondary transition-colors">
              Track Order
            </Link>
            {latestOrderId && (
              <Link to={`/track-order/${latestOrderId}`} className="hover:text-secondary transition-colors">
                Track Latest Order
              </Link>
            )}
            <Link to="/admin/login" className="hover:text-secondary transition-colors">
              Admin Panel
            </Link>
            <div className="flex items-center gap-2">
              <a href="https://facebook.com" target="_blank" rel="noreferrer" className="hover:text-secondary transition-colors" aria-label="Facebook">
                <FaFacebookF size={12} />
              </a>
              <a href="https://instagram.com" target="_blank" rel="noreferrer" className="hover:text-secondary transition-colors" aria-label="Instagram">
                <FaInstagram size={12} />
              </a>
              <a href="https://wa.me/923426435527" target="_blank" rel="noreferrer" className="hover:text-secondary transition-colors" aria-label="WhatsApp">
                <FaWhatsapp size={12} />
              </a>
            </div>
          </div>
        </div>
      </div>

      <header className={`sticky top-0 z-50 bg-white transition-shadow ${isSticky ? 'shadow-md' : ''}`}>
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center gap-3 lg:gap-5">
          <button
            type="button"
            className="lg:hidden p-2 rounded-md border border-gray-200 text-primary"
            onClick={() => setShowMobileMenu(true)}
            aria-label="Open navigation menu"
          >
            <FaBars size={18} />
          </button>

          <Link to="/" className="shrink-0">
            <div className="flex items-center gap-3">
              <img src="/images/store-logo.png" alt="Mian & Sons logo" className="w-10 h-10 rounded-full object-cover object-center" />
              <div className="hidden sm:block">
                <p className="text-primary font-bold leading-none">Mian & Sons</p>
                <p className="text-xs text-gray-500">Hardware Store</p>
              </div>
            </div>
          </Link>

          <div className="hidden lg:flex flex-1" ref={searchWrapRef}>
            <form onSubmit={handleSearchSubmit} className="w-full relative">
              <div className="flex border border-gray-300 rounded-md overflow-hidden">
                <select
                  value={searchCategory}
                  onChange={(event) => handleSearchCategoryChange(event.target.value)}
                  className="w-52 border-0 border-r border-gray-300 text-sm focus:ring-0"
                >
                  {searchCategories.map((category) => (
                    <option key={category} value={category}>
                      {category}
                    </option>
                  ))}
                </select>
                <input
                  type="text"
                  value={searchText}
                  onChange={(event) => handleSearchTextChange(event.target.value)}
                  onFocus={() => setShowSuggestions(true)}
                  placeholder="Search for tools, materials, brands..."
                  className="flex-1 border-0 text-sm focus:ring-0"
                />
                <button type="submit" className="bg-secondary px-5 text-white flex items-center justify-center" aria-label="Search">
                  <FaSearch size={14} />
                </button>
              </div>

              <AnimatePresence>
                {showSuggestions && (
                  <motion.div
                    initial={{ opacity: 0, y: -6 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -6 }}
                    className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-md shadow-lg z-50"
                  >
                    {suggestions.length > 0 ? (
                      suggestions.map((item) => (
                        <Link
                          key={item.id}
                          to={`/shop/product/${item.id}`}
                          onClick={() => setShowSuggestions(false)}
                          className="block px-4 py-2 text-sm hover:bg-gray-50"
                        >
                          <p className="text-gray-800">{item.name}</p>
                          <p className="text-xs text-gray-500">{item.category}</p>
                        </Link>
                      ))
                    ) : (
                      <p className="px-4 py-3 text-sm text-gray-500">No matching products found.</p>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>
            </form>
          </div>

          <div className="ml-auto flex items-center gap-2 sm:gap-4">
            <Link to="/compare" className="relative p-2 text-primary hover:text-secondary transition-colors" aria-label="Compare list">
              <FaBalanceScale size={20} />
              {compareCount > 0 && (
                <span className="absolute -top-1 -right-1 min-w-5 h-5 rounded-full bg-secondary text-white text-[10px] font-semibold flex items-center justify-center px-1">
                  {compareCount}
                </span>
              )}
            </Link>

            <Link to="/wishlist" className="relative p-2 text-primary hover:text-secondary transition-colors" aria-label="Wishlist">
              <FaHeart size={20} />
              {wishlistCount > 0 && (
                <span className="absolute -top-1 -right-1 min-w-5 h-5 rounded-full bg-secondary text-white text-[10px] font-semibold flex items-center justify-center px-1">
                  {wishlistCount}
                </span>
              )}
            </Link>

            <button
              type="button"
              onClick={() => setIsCartOpen(true)}
              className="relative p-2 text-primary hover:text-secondary transition-colors"
              aria-label="Cart"
            >
              <FaShoppingCart size={20} />
              {cartCount > 0 && (
                <span className="absolute -top-1 -right-1 min-w-5 h-5 rounded-full bg-secondary text-white text-[10px] font-semibold flex items-center justify-center px-1">
                  {cartCount}
                </span>
              )}
            </button>

            <div className="hidden sm:block text-right text-xs leading-tight">
              <p className="text-gray-500">Cart Total</p>
              <p className="text-primary font-semibold">PKR {cartTotal.toLocaleString()}</p>
            </div>

            <div className="relative" ref={accountMenuRef}>
              <button
                type="button"
                onClick={() => setShowAccountMenu((prev) => !prev)}
                className="flex items-center gap-1 text-primary hover:text-secondary transition-colors"
                aria-label="Account"
              >
                <FaUser size={18} />
                <FaChevronDown size={12} />
              </button>

              <AnimatePresence>
                {showAccountMenu && (
                  <motion.div
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 8 }}
                    className="absolute right-0 mt-2 w-44 bg-white border border-gray-200 rounded-md shadow-lg z-50"
                  >
                    {customerUser ? (
                      <>
                        <Link to="/customer/account" className="block px-4 py-2 text-sm hover:bg-gray-50">My Account</Link>
                        <Link to="/customer/orders" className="block px-4 py-2 text-sm hover:bg-gray-50">My Orders</Link>
                        <Link to="/customer/account" className="block px-4 py-2 text-sm hover:bg-gray-50">Profile</Link>
                        <button
                          type="button"
                          onClick={handleLogout}
                          className="w-full text-left px-4 py-2 text-sm hover:bg-gray-50"
                        >
                          Logout
                        </button>
                      </>
                    ) : (
                      <>
                        <Link to="/customer/login" className="block px-4 py-2 text-sm hover:bg-gray-50">Login</Link>
                        <Link to="/customer/register" className="block px-4 py-2 text-sm hover:bg-gray-50">Register</Link>
                      </>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </div>

        <div className="lg:hidden px-4 pb-3" ref={mobileSearchWrapRef}>
          <form onSubmit={handleSearchSubmit} className="relative">
            <div className="flex border border-gray-300 rounded-md overflow-hidden bg-white">
              <input
                type="text"
                value={searchText}
                onChange={(event) => handleSearchTextChange(event.target.value)}
                onFocus={() => setShowSuggestions(true)}
                placeholder="Search products..."
                className="flex-1 border-0 text-sm focus:ring-0"
              />
              <button type="submit" className="bg-secondary px-4 text-white flex items-center justify-center" aria-label="Search">
                <FaSearch size={14} />
              </button>
            </div>

            <AnimatePresence>
              {showSuggestions && (
                <motion.div
                  initial={{ opacity: 0, y: -6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -6 }}
                  className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-md shadow-lg z-50"
                >
                  {suggestions.length > 0 ? (
                    suggestions.map((item) => (
                      <Link
                        key={`mobile-${item.id}`}
                        to={`/shop/product/${item.id}`}
                        onClick={() => setShowSuggestions(false)}
                        className="block px-4 py-2 text-sm hover:bg-gray-50"
                      >
                        <p className="text-gray-800">{item.name}</p>
                        <p className="text-xs text-gray-500">{item.category}</p>
                      </Link>
                    ))
                  ) : (
                    <p className="px-4 py-3 text-sm text-gray-500">No matching products found.</p>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </form>
        </div>

        <div className="hidden lg:block border-t border-gray-200">
          <div className="max-w-7xl mx-auto px-4 flex items-center justify-between">
            <nav className="flex items-center">
              {MEGA_MENU.map((category) => (
                <div
                  key={category.label}
                  className="relative"
                  onMouseEnter={() => setActiveMegaCategory(category.label)}
                  onMouseLeave={() => setActiveMegaCategory(null)}
                >
                  <Link
                    to={`/shop?category=${encodeURIComponent(category.category)}`}
                    className="block px-3 py-3 text-sm font-medium text-primary hover:text-secondary transition-colors"
                  >
                    {category.label}
                  </Link>

                  <AnimatePresence>
                    {activeMegaCategory === category.label && (
                      <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 10 }}
                        className="absolute left-0 top-full min-w-64 bg-white border border-gray-200 rounded-md shadow-lg p-4 z-40"
                      >
                        <div className="grid grid-cols-1 gap-2">
                          {category.items.map((item) => (
                            <Link
                              key={item}
                              to={`/shop?category=${encodeURIComponent(category.category)}`}
                              className="text-sm text-gray-700 hover:text-secondary"
                            >
                              {item}
                            </Link>
                          ))}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              ))}
            </nav>

            <div className="flex items-center gap-5 text-sm font-medium">
              <Link to="/shop?offer=true" className="text-primary hover:text-secondary transition-colors inline-flex items-center gap-2">
                Special Offers
                <span className="text-[10px] bg-red-500 text-white px-2 py-0.5 rounded-full">HOT</span>
              </Link>
              <Link to="/shop?new=true" className="text-primary hover:text-secondary transition-colors">New Arrivals</Link>
              <Link to="/brands" className="text-primary hover:text-secondary transition-colors">Brands</Link>
            </div>
          </div>
        </div>
      </header>

      <MobileMenu
        open={showMobileMenu}
        onClose={() => setShowMobileMenu(false)}
        navLinks={NAV_LINKS}
        megaMenu={MEGA_MENU}
        customerUser={customerUser}
        onLogout={handleLogout}
      />
    </div>
  );
};

export default WebNavbar;