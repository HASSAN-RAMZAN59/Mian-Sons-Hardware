import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Helmet } from 'react-helmet-async';
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { FaXTwitter } from 'react-icons/fa6';
import {
  FaBoxOpen,
  FaCopy,
  FaFacebookF,
  FaHeart,
  FaShieldAlt,
  FaStar,
  FaSyncAlt,
  FaTruck,
  FaWhatsapp
} from 'react-icons/fa';
import { toast } from 'react-toastify';
import Breadcrumb from '../../components/website/common/Breadcrumb';
import ProductDetailSkeleton from '../../components/website/common/ProductDetailSkeleton';
import { useCart } from '../../context/CartContext';
import { useWishlist } from '../../context/WishlistContext';
import productsData from '../../data/productsData';
import { handleImageError } from '../../utils/helpers';
import { showActionToast } from '../../utils/toastActions';

const defaultProductData = {
  id: 'pd-1',
  category: 'Power Tools',
  subCategory: 'Drill Machines',
  name: 'Bosch Professional Drill Machine',
  brand: 'Bosch',
  rating: 0,
  reviewCount: 0,
  sku: 'BOS-DRL-5999',
  price: 8500,
  salePrice: 5999,
  unitPriceText: 'Rs. 5,999 per piece',
  stock: 25,
  description:
    'High-performance drill machine designed for professional construction work and heavy-duty home projects. Features robust motor, precision chuck, and ergonomic grip for superior control.',
  fullDescription:
    'Bosch Professional Drill Machine is engineered for reliability and long working hours. It supports concrete, metal, and wood drilling with precision. The reinforced body, overheat protection, and anti-slip handle make it ideal for both site professionals and workshop users.',
  specs: {
    Brand: 'Bosch',
    Model: 'GBM 500 RE',
    Warranty: '12 Months Official Warranty',
    Unit: 'Piece',
    Power: '500W',
    Voltage: '220-240V',
    Speed: '2600 RPM',
    ChuckSize: '13mm'
  },
  images: ['https://images.unsplash.com/photo-1504148455328-c376907d081c?w=800']
};

const defaultRelatedProducts = [
  { id: 'rp-1', name: 'Makita Impact Drill 13mm', price: 7199, category: 'Power Tools' },
  { id: 'rp-2', name: 'DeWalt Cordless Drill 20V', price: 28999, category: 'Power Tools' },
  { id: 'rp-3', name: 'Stanley Rotary Hammer', price: 11499, category: 'Power Tools' },
  { id: 'rp-4', name: 'Ingco Electric Drill 10mm', price: 4899, category: 'Power Tools' }
];

const tabItems = ['Description', 'Specifications', 'Reviews', 'Warranty & Returns'];
const PRODUCT_REVIEWS_KEY = 'website_product_reviews';
const COMPARE_STORAGE_KEY = 'website_compare_items';

const loadStoredReviewsByProduct = () => {
  try {
    const parsed = JSON.parse(localStorage.getItem(PRODUCT_REVIEWS_KEY) || '{}');
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    return {};
  }
};

const ProductDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { addToCart } = useCart();
  const { addToWishlist, removeFromWishlist, isInWishlist } = useWishlist();

  const productData = useMemo(() => {
    const selected = productsData.find((item) => String(item.id) === String(id));

    if (!selected) {
      return defaultProductData;
    }

    const productName = selected.size ? `${selected.name} - ${selected.size}` : selected.name;
    const salePrice = Number(selected.salePrice) || 0;
    const unitLabel = String(selected.unit || 'Piece').toLowerCase();

    return {
      id: String(selected.id),
      category: selected.category,
      subCategory: selected.type || selected.category,
      name: productName,
      brand: selected.company,
      rating: Number(selected.rating) > 0 ? Number(selected.rating) : 0,
      reviewCount: Number(selected.reviewCount) || 0,
      sku: `MS-${String(selected.id).padStart(4, '0')}`,
      price: salePrice,
      salePrice,
      unitPriceText: `Rs. ${salePrice.toLocaleString()} per ${unitLabel}`,
      stock: Number(selected.stockQty ?? selected.stock ?? 0),
      description: selected.description,
      fullDescription: `${selected.description} Built for reliable day-to-day use in homes, shops, and maintenance work.`,
      specs: {
        Brand: selected.company,
        Model: selected.type || selected.name,
        Warranty: '7 Days Checking Warranty',
        Unit: selected.unit,
        Category: selected.category,
        Size: selected.size || 'Standard'
      },
      images: selected.images?.length ? selected.images : defaultProductData.images
    };
  }, [id]);

  const relatedProducts = useMemo(() => {
    const relatedFromData = productsData
      .filter((item) => item.category === productData.category && String(item.id) !== String(productData.id))
      .slice(0, 4)
      .map((item) => ({
        id: String(item.id),
        name: item.size ? `${item.name} - ${item.size}` : item.name,
        salePrice: Number(item.salePrice) || 0,
        category: item.category,
        images: item.images || []
      }));

    if (relatedFromData.length) {
      return relatedFromData;
    }

    return defaultRelatedProducts.map((item) => ({
      ...item,
      id: String(item.id),
      salePrice: item.price,
      images: []
    }));
  }, [productData.category, productData.id]);

  const [activeImageIndex, setActiveImageIndex] = useState(0);
  const [quantity, setQuantity] = useState(1);
  const [activeTab, setActiveTab] = useState('Description');
  const [reviews, setReviews] = useState([]);
  const [reviewForm, setReviewForm] = useState({ name: '', rating: 5, comment: '' });
  const [recentlyViewed, setRecentlyViewed] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showStickyMobileBar, setShowStickyMobileBar] = useState(false);
  const addToCartActionsRef = useRef(null);

  useEffect(() => {
    const timer = setTimeout(() => setIsLoading(false), 420);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    const key = 'website_recently_viewed';
    const existing = JSON.parse(localStorage.getItem(key) || '[]');
    const updated = [
      {
        id: productData.id,
        name: productData.name,
        price: productData.salePrice,
        category: productData.category,
        image: productData.images?.[0] || ''
      },
      ...existing.filter((item) => item.id !== productData.id)
    ].slice(0, 6);
    localStorage.setItem(key, JSON.stringify(updated));
    setRecentlyViewed(updated.filter((item) => item.id !== productData.id).slice(0, 6));
  }, [productData]);

  useEffect(() => {
    setActiveImageIndex(0);
  }, [productData.id]);

  useEffect(() => {
    const stored = loadStoredReviewsByProduct();
    const productReviews = stored[productData.id] || [];
    setReviews(Array.isArray(productReviews) ? productReviews : []);
  }, [productData.id]);

  useEffect(() => {
    const handleScroll = () => {
      if (!addToCartActionsRef.current) return;
      const rect = addToCartActionsRef.current.getBoundingClientRect();
      const crossed = rect.bottom < 0;
      setShowStickyMobileBar(crossed);
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const stockStatus = useMemo(() => {
    if (productData.stock <= 0) return { label: '❌ Out of Stock', classes: 'text-red-600 bg-red-50' };
    if (productData.stock <= 3) return { label: `⚠️ Only ${productData.stock} left!`, classes: 'text-orange-600 bg-orange-50' };
    return { label: `✅ In Stock - ${productData.stock} units available`, classes: 'text-green-700 bg-green-50' };
  }, [productData]);

  const handleAddToCart = () => {
    if (productData.stock <= 0) return;
    addToCart(productData, quantity);
  };

  const handleBuyNow = () => {
    if (productData.stock <= 0) return;
    addToCart(productData, quantity);
  };

  const handleGoBack = () => {
    const hasHistory = window.history.length > 1;

    if (hasHistory) {
      navigate(-1);
      return;
    }

    navigate('/shop', { replace: true, state: { from: location.pathname } });
  };

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      toast.success('Product link copied.');
    } catch {
      toast.error('Unable to copy link.');
    }
  };

  const handleAddToCompare = () => {
    const compareProduct = {
      id: productData.id,
      name: productData.name,
      salePrice: productData.salePrice,
      price: productData.price,
      brand: productData.brand,
      category: productData.category,
      rating: Number.isFinite(Number(productData.rating)) ? Number(productData.rating) : null,
      stock: productData.stock,
      warranty: productData.specs?.Warranty,
      image: productData.images?.[0] || ''
    };

    const existing = JSON.parse(localStorage.getItem(COMPARE_STORAGE_KEY) || '[]');
    if (existing.some((item) => String(item.id) === String(compareProduct.id))) {
      showActionToast('info', `${productData.name} is already in compare list.`, { path: '/compare' });
      return;
    }

    const updated = [...existing, compareProduct].slice(0, 6);
    localStorage.setItem(COMPARE_STORAGE_KEY, JSON.stringify(updated));
    window.dispatchEvent(new CustomEvent('app-storage-updated', { detail: { key: COMPARE_STORAGE_KEY } }));
    showActionToast('success', `${productData.name} added to compare.`, { path: '/compare' });
  };

  const handleSubmitReview = (event) => {
    event.preventDefault();
    if (!reviewForm.name.trim() || !reviewForm.comment.trim()) {
      toast.error('Please fill all review fields.');
      return;
    }

    const newReview = {
      name: reviewForm.name,
      date: new Date().toISOString().slice(0, 10),
      rating: Number(reviewForm.rating),
      comment: reviewForm.comment
    };

    const stored = loadStoredReviewsByProduct();
    const nextProductReviews = [newReview, ...(stored[productData.id] || [])];
    const nextStored = {
      ...stored,
      [productData.id]: nextProductReviews
    };

    localStorage.setItem(PRODUCT_REVIEWS_KEY, JSON.stringify(nextStored));
    setReviews(nextProductReviews);
    setReviewForm({ name: '', rating: 5, comment: '' });
    showActionToast('success', 'Review submitted successfully.', { path: `/shop/product/${productData.id}` });
  };

  const ratingBreakdown = useMemo(() => {
    const result = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };
    reviews.forEach((review) => {
      result[review.rating] += 1;
    });
    return result;
  }, [reviews]);

  const breadcrumbItems = [
    { label: 'Home', to: '/' },
    { label: productData.category, to: `/shop?category=${encodeURIComponent(productData.category)}` },
    { label: productData.name }
  ];

  if (isLoading) {
    return <ProductDetailSkeleton />;
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-6">
      <Helmet>
        <title>{`${productData.name} | Rs. ${productData.salePrice.toLocaleString()} | Mian & Sons Hardware Store`}</title>
        <meta name="description" content={productData.description} />
        <meta property="product:price:amount" content={String(productData.salePrice)} />
        <meta property="product:price:currency" content="PKR" />
      </Helmet>

      <div className="mb-4 flex items-center justify-between gap-3">
        <Breadcrumb items={breadcrumbItems} />
        <button
          type="button"
          onClick={handleGoBack}
          className="text-sm font-semibold text-primary hover:text-secondary"
        >
          ← Back
        </button>
      </div>

      <div className="grid lg:grid-cols-12 gap-6">
        <motion.section initial={{ opacity: 0, x: -14 }} animate={{ opacity: 1, x: 0 }} className="lg:col-span-5">
          <div className="rounded-xl border border-gray-200 bg-gray-50 p-6 overflow-hidden">
            <div className="h-[400px] rounded-lg bg-white border border-gray-200 overflow-hidden">
              <div className="w-full h-full bg-white flex items-center justify-center">
                <img
                  src={productData.images[activeImageIndex] || productData.images[0] || ''}
                  alt={productData.name}
                  loading="lazy"
                  onError={(event) => handleImageError(event, productData.name)}
                  className="w-full h-full object-contain"
                />
              </div>
            </div>

            {productData.images.length > 1 && (
              <div className="grid grid-cols-5 gap-2 mt-3">
                {productData.images.map((thumb, index) => (
                  <button
                    key={`${thumb}-${index}`}
                    type="button"
                    onClick={() => setActiveImageIndex(index)}
                    className={`h-16 rounded-md border overflow-hidden ${
                      activeImageIndex === index ? 'border-secondary bg-orange-50' : 'border-gray-200 bg-white'
                    }`}
                  >
                    <div className="w-full h-full flex items-center justify-center bg-white">
                      <img
                        src={thumb}
                        alt={`${productData.name} ${index + 1}`}
                        loading="lazy"
                        onError={(event) => handleImageError(event, productData.name)}
                        className="w-full h-full object-contain"
                      />
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        </motion.section>

        <motion.section initial={{ opacity: 0, x: 14 }} animate={{ opacity: 1, x: 0 }} className="lg:col-span-7">
          <span className="inline-flex px-3 py-1 rounded-full bg-primary text-white text-xs font-semibold mb-2">{productData.category}</span>
          <h1 className="text-3xl font-bold text-primary leading-tight">{productData.name}</h1>

          <div className="mt-2 flex flex-wrap items-center gap-3 text-sm">
            <span className="text-gray-600">
              Brand:{' '}
              <Link to={`/shop?brand=${encodeURIComponent(productData.brand)}`} className="text-primary font-semibold hover:text-secondary">
                {productData.brand}
              </Link>
            </span>
            <span className="text-gray-700">{reviews.length} reviews</span>
            <span className="text-gray-500">SKU: {productData.sku}</span>
          </div>

          <div className="mt-4 p-4 rounded-xl border border-orange-100 bg-orange-50">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-3xl font-bold text-secondary">Rs. {productData.salePrice.toLocaleString()}</span>
            </div>
            <p className="text-xs text-gray-500 mt-1">{productData.unitPriceText}</p>
          </div>

          <div className={`mt-4 inline-flex px-3 py-1.5 rounded-lg text-sm font-semibold ${stockStatus.classes}`}>
            {stockStatus.label}
          </div>

          <p className="mt-4 text-gray-600 leading-7">{productData.description}</p>

          <div className="grid sm:grid-cols-2 gap-3 mt-4 text-sm">
            <div className="flex items-center gap-2"><FaBoxOpen className="text-secondary" /> Brand: {productData.specs.Brand}</div>
            <div className="flex items-center gap-2"><FaBoxOpen className="text-secondary" /> Model: {productData.specs.Model}</div>
            <div className="flex items-center gap-2"><FaBoxOpen className="text-secondary" /> Warranty: {productData.specs.Warranty}</div>
            <div className="flex items-center gap-2"><FaBoxOpen className="text-secondary" /> Unit: {productData.specs.Unit}</div>
          </div>

          <div ref={addToCartActionsRef} className="mt-5 flex items-center gap-3">
            <div className="inline-flex items-center border border-gray-300 rounded-md overflow-hidden">
              <button
                type="button"
                onClick={() => setQuantity((prev) => Math.max(1, prev - 1))}
                className="px-3 py-2 text-gray-600 hover:bg-gray-50"
              >
                -
              </button>
              <span className="w-10 text-center text-sm font-semibold">{quantity}</span>
              <button
                type="button"
                onClick={() => setQuantity((prev) => Math.min(productData.stock, prev + 1))}
                className="px-3 py-2 text-gray-600 hover:bg-gray-50"
              >
                +
              </button>
            </div>

            <button
              type="button"
              onClick={handleAddToCart}
              disabled={productData.stock <= 0}
              className={`px-6 py-3 rounded-md font-semibold ${
                productData.stock <= 0 ? 'bg-gray-300 text-gray-500 cursor-not-allowed' : 'bg-secondary text-white hover:opacity-90'
              }`}
            >
              Add to Cart
            </button>

            <button
              type="button"
              onClick={handleBuyNow}
              disabled={productData.stock <= 0}
              className={`px-6 py-3 rounded-md font-semibold ${
                productData.stock <= 0 ? 'bg-gray-300 text-gray-500 cursor-not-allowed' : 'bg-primary text-white hover:bg-primary/90'
              }`}
            >
              Buy Now
            </button>
          </div>

          <div className="mt-3 flex flex-wrap gap-3">
            <button
              type="button"
              onClick={() =>
                isInWishlist(productData.id)
                  ? removeFromWishlist(productData.id)
                  : addToWishlist(productData)
              }
              className="inline-flex items-center gap-2 px-4 py-2 rounded-md border border-primary text-primary hover:bg-primary hover:text-white"
            >
              <FaHeart size={13} /> {isInWishlist(productData.id) ? 'Remove Wishlist' : 'Add to Wishlist'}
            </button>
            <button
              type="button"
              onClick={handleAddToCompare}
              className="px-4 py-2 rounded-md border border-gray-300 text-gray-700 hover:bg-gray-50"
            >
              Compare
            </button>
          </div>

          <div className="mt-5 grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
            <div className="rounded-md bg-gray-100 px-3 py-2 flex items-center gap-2"><FaShieldAlt /> Secure Payment</div>
            <div className="rounded-md bg-gray-100 px-3 py-2 flex items-center gap-2"><FaSyncAlt /> 7 Day Returns</div>
            <div className="rounded-md bg-gray-100 px-3 py-2 flex items-center gap-2"><FaBoxOpen /> Genuine Product</div>
            <div className="rounded-md bg-gray-100 px-3 py-2 flex items-center gap-2"><FaTruck /> Fast Delivery</div>
          </div>

          <div className="mt-5 flex items-center gap-2 text-sm">
            <span className="font-semibold text-gray-700">Share:</span>
            <button type="button" className="w-8 h-8 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center"><FaFacebookF size={12} /></button>
            <button type="button" className="w-8 h-8 rounded-full bg-green-100 text-green-700 flex items-center justify-center"><FaWhatsapp size={12} /></button>
            <button type="button" className="w-8 h-8 rounded-full bg-gray-900 text-white flex items-center justify-center"><FaXTwitter size={12} /></button>
            <button type="button" onClick={handleCopyLink} className="inline-flex items-center gap-1 px-3 py-1.5 rounded-md bg-gray-100 text-gray-700"><FaCopy size={11} /> Copy Link</button>
          </div>
        </motion.section>
      </div>

      <section className="mt-10">
        <div className="border-b border-gray-200 flex flex-wrap gap-2">
          {tabItems.map((tab) => (
            <button
              key={tab}
              type="button"
              onClick={() => setActiveTab(tab)}
              className={`px-4 py-2 text-sm font-semibold border-b-2 ${
                activeTab === tab ? 'border-secondary text-secondary' : 'border-transparent text-gray-600'
              }`}
            >
              {tab}
            </button>
          ))}
        </div>

        <div className="mt-4 bg-white border border-gray-200 rounded-xl p-5">
          {activeTab === 'Description' && (
            <p className="text-gray-700 leading-7">{productData.fullDescription}</p>
          )}

          {activeTab === 'Specifications' && (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <tbody>
                  {Object.entries(productData.specs).map(([key, value]) => (
                    <tr key={key} className="border-b border-gray-100">
                      <td className="py-3 pr-4 font-semibold text-gray-700 w-40">{key}</td>
                      <td className="py-3 text-gray-600">{value}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {activeTab === 'Reviews' && (
            <div className="space-y-5">
              <p className="text-sm text-gray-600">Customer reviews ({reviews.length})</p>

              <div className="space-y-3">
                {reviews.length === 0 ? (
                  <p className="text-sm text-gray-500">No customer reviews submitted yet for this product.</p>
                ) : (
                  reviews.map((review, index) => (
                    <article key={`${review.name}-${review.date}-${index}`} className="border border-gray-200 rounded-lg p-4">
                      <div className="flex items-center justify-between">
                        <p className="font-semibold text-primary">{review.name}</p>
                        <span className="text-xs text-gray-500">{review.date}</span>
                      </div>
                      <div className="flex items-center gap-1 mt-1">
                        {Array.from({ length: 5 }).map((_, i) => (
                          <FaStar key={i} className={i < review.rating ? 'text-yellow-500' : 'text-gray-300'} size={12} />
                        ))}
                      </div>
                      <p className="text-sm text-gray-600 mt-2">{review.comment}</p>
                    </article>
                  ))
                )}
              </div>

              <form onSubmit={handleSubmitReview} className="border border-gray-200 rounded-lg p-4 space-y-3">
                <h4 className="font-semibold text-primary">Write a Review</h4>
                <input
                  type="text"
                  value={reviewForm.name}
                  onChange={(event) => setReviewForm((prev) => ({ ...prev, name: event.target.value }))}
                  placeholder="Your name"
                  className="w-full rounded-md border border-gray-300 text-sm"
                />
                <select
                  value={reviewForm.rating}
                  onChange={(event) => setReviewForm((prev) => ({ ...prev, rating: Number(event.target.value) }))}
                  className="w-full rounded-md border border-gray-300 text-sm"
                >
                  <option value={5}>5 Stars</option>
                  <option value={4}>4 Stars</option>
                  <option value={3}>3 Stars</option>
                  <option value={2}>2 Stars</option>
                  <option value={1}>1 Star</option>
                </select>
                <textarea
                  rows={4}
                  value={reviewForm.comment}
                  onChange={(event) => setReviewForm((prev) => ({ ...prev, comment: event.target.value }))}
                  placeholder="Write your review"
                  className="w-full rounded-md border border-gray-300 text-sm"
                />
                <button type="submit" className="px-5 py-2 rounded-md bg-primary text-white font-semibold hover:bg-primary/90">
                  Submit Review
                </button>
              </form>
            </div>
          )}

          {activeTab === 'Warranty & Returns' && (
            <div className="text-gray-700 leading-7 text-sm">
              <p>All products are covered by official brand warranty as mentioned on product page.</p>
              <p className="mt-2">Returns are accepted within 7 days for manufacturing defects and incorrect deliveries.</p>
              <p className="mt-2">For warranty claims, please keep invoice and original packaging for smooth support.</p>
            </div>
          )}
        </div>
      </section>

      <section className="mt-10">
        <h3 className="text-2xl font-bold text-primary mb-4">Related Products</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {relatedProducts.map((product) => (
            <article key={product.id} className="bg-white border border-gray-200 rounded-xl overflow-hidden">
              <div className="h-32 bg-gray-100 overflow-hidden">
                <div className="w-full h-full flex items-center justify-center bg-white">
                  <img
                    src={product.images?.[0] || ''}
                    alt={product.name}
                    loading="lazy"
                    onError={(event) => handleImageError(event, product.name)}
                    className="w-full h-full object-contain p-2"
                  />
                </div>
              </div>
              <div className="p-3">
                <p className="text-xs text-gray-500">{product.category}</p>
                <h4 className="font-semibold text-primary line-clamp-2 min-h-[3rem]">{product.name}</h4>
                <p className="text-secondary font-bold mt-2">Rs. {product.salePrice.toLocaleString()}</p>
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className="mt-10">
        <h3 className="text-2xl font-bold text-primary mb-4">Recently Viewed</h3>
        {recentlyViewed.length === 0 ? (
          <p className="text-sm text-gray-500">No recently viewed products.</p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {recentlyViewed.map((item) => (
              <Link key={item.id} to={`/shop/product/${item.id}`} className="block bg-white border border-gray-200 rounded-xl overflow-hidden hover:shadow-md transition-shadow">
                <div className="h-32 bg-gray-100 overflow-hidden">
                  <div className="w-full h-full flex items-center justify-center bg-white">
                    <img
                      src={item.image || ''}
                      alt={item.name}
                      loading="lazy"
                      onError={(event) => handleImageError(event, item.name)}
                      className="w-full h-full object-contain p-2"
                    />
                  </div>
                </div>
                <div className="p-4">
                <p className="text-xs text-gray-500">{item.category}</p>
                <h4 className="font-semibold text-primary line-clamp-2 min-h-[3rem]">{item.name}</h4>
                <p className="text-secondary font-bold mt-2">Rs. {item.price.toLocaleString()}</p>
                </div>
              </Link>
            ))}
          </div>
        )}
      </section>

      <motion.div
        initial={{ y: 120, opacity: 0 }}
        animate={{ y: showStickyMobileBar ? 0 : 120, opacity: showStickyMobileBar ? 1 : 0 }}
        transition={{ duration: 0.2 }}
        className="fixed bottom-0 left-0 right-0 z-50 bg-white border-t border-gray-200 p-3 md:hidden"
      >
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-3">
          <div>
            <p className="text-xs text-gray-500">Price</p>
            <p className="text-lg font-bold text-secondary">Rs. {productData.salePrice.toLocaleString()}</p>
          </div>
          <button
            type="button"
            onClick={handleAddToCart}
            disabled={productData.stock <= 0}
            className="px-5 py-2.5 rounded-md bg-secondary text-white font-semibold disabled:bg-gray-300 disabled:text-gray-500"
          >
            Add to Cart
          </button>
        </div>
      </motion.div>
    </div>
  );
};

export default ProductDetail;