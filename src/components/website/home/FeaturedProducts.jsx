import React, { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { FaEye, FaHeart, FaRegHeart, FaStar } from 'react-icons/fa';
import { useCart } from '../../../context/CartContext';
import { useWishlist } from '../../../context/WishlistContext';
import productsData from '../../../data/productsData';
import { handleImageError } from '../../../utils/helpers';

const tabs = ['All', 'New Arrivals', 'Best Sellers', 'On Sale', 'Top Rated'];

const FeaturedProducts = ({ products = productsData }) => {
  const { addToCart } = useCart();
  const { addToWishlist, removeFromWishlist, isInWishlist } = useWishlist();

  const [activeTab, setActiveTab] = useState('All');
  const [addedState, setAddedState] = useState({});

  const normalizedProducts = useMemo(
    () => products.slice(0, 16).map((product) => ({
      id: String(product.id),
      name: product.size ? `${product.name} - ${product.size}` : product.name,
      brand: product.company,
      category: product.category,
      salePrice: Number(product.salePrice),
      rating: Number(product.rating) > 0 ? Number(product.rating) : null,
      stock: Number(product.stockQty ?? product.stock ?? 0),
      isNewArrival: Boolean(product.isNewArrival),
      isFeatured: Boolean(product.isFeatured),
      onSale: Number(product.discount) > 0,
      topRated: Number(product.rating) >= 4.2,
      images: product.images || []
    })),
    [products]
  );

  const filteredProducts = useMemo(() => {
    if (activeTab === 'All') return normalizedProducts;
    if (activeTab === 'New Arrivals') return normalizedProducts.filter((product) => product.isNewArrival);
    if (activeTab === 'Best Sellers') return normalizedProducts.filter((product) => product.isFeatured);
    if (activeTab === 'On Sale') return normalizedProducts.filter((product) => product.onSale);
    if (activeTab === 'Top Rated') return normalizedProducts.filter((product) => product.topRated);
    return normalizedProducts;
  }, [activeTab, normalizedProducts]);

  const handleAddToCart = (product) => {
    if (product.stock <= 0) return;

    addToCart(product, 1);
    setAddedState((prev) => ({ ...prev, [product.id]: true }));

    setTimeout(() => {
      setAddedState((prev) => ({ ...prev, [product.id]: false }));
    }, 1400);
  };

  const getStockBadge = (stock) => {
    if (stock <= 0) return { label: 'Out of Stock', classes: 'bg-red-100 text-red-600' };
    if (stock <= 5) return { label: 'Low Stock', classes: 'bg-orange-100 text-orange-600' };
    return { label: 'In Stock', classes: 'bg-green-100 text-green-600' };
  };

  const formatPkr = (value) => `PKR ${value.toLocaleString()}`;

  return (
    <section className="py-12">
      <div className="max-w-7xl mx-auto px-4">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
          <h2 className="text-2xl md:text-3xl font-bold text-primary">Featured Products</h2>

          <div className="flex flex-wrap gap-2">
            {tabs.map((tab) => (
              <button
                key={tab}
                type="button"
                onClick={() => setActiveTab(tab)}
                className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                  activeTab === tab
                    ? 'bg-primary text-white'
                    : 'bg-white border border-gray-200 text-gray-600 hover:border-primary hover:text-primary'
                }`}
              >
                {tab}
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
          {filteredProducts.map((product) => {
            const stockBadge = getStockBadge(product.stock);
            const inWishlist = isInWishlist(product.id);
            const isAdded = Boolean(addedState[product.id]);

            return (
              <motion.article
                key={product.id}
                whileHover={{ y: -6 }}
                transition={{ duration: 0.2, ease: 'easeOut' }}
                className="group bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm hover:shadow-md transition-shadow"
              >
                <div className="relative h-44 bg-gray-100 flex items-center justify-center overflow-hidden">
                  {product.onSale && (
                    <span className="absolute top-2 left-2 bg-red-500 text-white text-[10px] font-semibold px-2 py-1 rounded-full">
                      SALE
                    </span>
                  )}
                  <span className={`absolute ${product.onSale ? 'top-9' : 'top-2'} left-2 bg-primary text-white text-[10px] font-semibold px-2 py-1 rounded-full`}>
                    {product.category}
                  </span>

                  <button
                    type="button"
                    onClick={() => (inWishlist ? removeFromWishlist(product.id) : addToWishlist(product))}
                    className="absolute top-2 right-2 w-8 h-8 rounded-full bg-white/90 border border-gray-200 flex items-center justify-center text-secondary"
                    aria-label="Toggle wishlist"
                  >
                    {inWishlist ? <FaHeart size={14} /> : <FaRegHeart size={14} />}
                  </button>

                  <div className="w-full h-full flex items-center justify-center">
                    <img
                      src={product.images?.[0] || ''}
                      alt={product.name}
                      loading="lazy"
                      onError={(event) => handleImageError(event, product.name)}
                      className="w-full h-full object-contain p-2"
                    />
                  </div>

                  <Link
                    to={`/shop/product/${product.id}`}
                    className="absolute bottom-2 right-2 w-9 h-9 rounded-full bg-primary text-white items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity flex"
                    aria-label="Quick view"
                  >
                    <FaEye size={14} />
                  </Link>
                </div>

                <div className="p-4">
                  <h3 className="font-semibold text-gray-800 line-clamp-2 min-h-[3rem]">{product.name}</h3>
                  <p className="text-xs text-gray-500 mt-1">{product.brand}</p>

                  {Number.isFinite(product.rating) && (
                    <div className="flex items-center gap-1 text-sm mt-2">
                      <FaStar className="text-yellow-500" size={13} />
                      <span className="font-medium text-gray-700">{product.rating.toFixed(1)}</span>
                      <span className="text-gray-400">⭐</span>
                    </div>
                  )}

                  <div className="mt-2 flex items-center gap-2">
                    <span className="text-secondary font-bold text-lg">
                      {formatPkr(product.salePrice)}
                    </span>
                  </div>

                  <div className="mt-3">
                    <span className={`inline-flex px-2.5 py-1 rounded-full text-xs font-semibold ${stockBadge.classes}`}>
                      {stockBadge.label}
                    </span>
                  </div>

                  <button
                    type="button"
                    onClick={() => handleAddToCart(product)}
                    disabled={product.stock <= 0}
                    className={`w-full mt-3 py-2.5 rounded-md text-sm font-semibold transition-colors ${
                      product.stock <= 0
                        ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                        : isAdded
                          ? 'bg-green-600 text-white'
                          : 'bg-primary text-white hover:bg-primary/90'
                    }`}
                  >
                    {product.stock <= 0 ? 'Out of Stock' : isAdded ? 'Added ✓' : 'Add to Cart'}
                  </button>
                </div>
              </motion.article>
            );
          })}
        </div>
      </div>
    </section>
  );
};

export default FeaturedProducts;