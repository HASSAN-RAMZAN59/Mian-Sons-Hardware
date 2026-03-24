import React, { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { FaEye, FaHeart, FaRegHeart, FaStar } from 'react-icons/fa';
import { useCart } from '../../../context/CartContext';
import { useWishlist } from '../../../context/WishlistContext';
import productsData from '../../../data/productsData';
import useActiveDiscounts from '../../../hooks/useActiveDiscounts';
import { applyDiscountsToProducts } from '../../../utils/discounts';
import { handleImageError } from '../../../utils/helpers';

const NewArrivals = () => {
  const { addToCart } = useCart();
  const { addToWishlist, removeFromWishlist, isInWishlist } = useWishlist();
  const [addedState, setAddedState] = useState({});
  const { discounts } = useActiveDiscounts();

  const discountedProducts = useMemo(
    () => applyDiscountsToProducts(productsData, discounts),
    [discounts]
  );

  const newArrivalProducts = useMemo(() => {
    const preferredIds = [1, 10, 14, 18, 22, 24, 28, 33];
    const curated = preferredIds
      .map((id) => discountedProducts.find((product) => Number(product.id) === id))
      .filter(Boolean);

    const list = curated.length ? curated : discountedProducts.slice(0, 8);

    return list.slice(0, 8).map((product) => ({
      id: String(product.id),
      name: product.size ? `${product.name} - ${product.size}` : product.name,
      brand: product.company,
      category: product.category,
      price: Number(product.price ?? product.salePrice ?? 0),
      salePrice: Number.isFinite(product.salePrice) ? Number(product.salePrice) : null,
      rating: Number(product.rating) > 0 ? Number(product.rating) : null,
      stock: Number(product.stockQty ?? product.stock ?? 0),
      images: product.images || []
    }));
  }, [discountedProducts]);

  const handleAddToCart = (product) => {
    if (product.stock <= 0) return;
    addToCart(product, 1);
    setAddedState((prev) => ({ ...prev, [product.id]: true }));
    setTimeout(() => {
      setAddedState((prev) => ({ ...prev, [product.id]: false }));
    }, 1200);
  };

  return (
    <section className="py-12">
      <div className="max-w-7xl mx-auto px-4">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl md:text-3xl font-bold text-primary">New Arrivals</h2>
          <Link to="/shop?new=true" className="text-sm text-secondary font-semibold hover:underline">
            View All
          </Link>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
          {newArrivalProducts.map((product) => {
            const inWishlist = isInWishlist(product.id);
            const isAdded = Boolean(addedState[product.id]);

            return (
              <motion.article
                key={product.id}
                whileHover={{ y: -6 }}
                transition={{ duration: 0.2 }}
                className="group bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm hover:shadow-md"
              >
                <div className="relative h-44 bg-gray-100 flex items-center justify-center overflow-hidden">
                  <span className="absolute top-2 left-2 bg-primary text-white text-[10px] font-semibold px-2 py-1 rounded-full">
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
                    </div>
                  )}

                  <div className="mt-2 flex items-center gap-2">
                    <span className="text-secondary font-bold text-lg">
                      PKR {(Number.isFinite(product.salePrice) ? product.salePrice : product.price).toLocaleString()}
                    </span>
                    {Number.isFinite(product.salePrice) && product.salePrice < product.price && (
                      <span className="text-gray-400 text-sm line-through">PKR {product.price.toLocaleString()}</span>
                    )}
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
                    {product.stock <= 0 ? 'Out of Stock' : isAdded ? 'Added' : 'Add to Cart'}
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

export default NewArrivals;