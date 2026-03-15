import React from 'react';
import { Link } from 'react-router-dom';
import { FaStar } from 'react-icons/fa';
import { useCart } from '../../../context/CartContext';
import { handleImageError } from '../../../utils/helpers';

const ProductCard = ({ product, view = 'grid' }) => {
  const { addToCart } = useCart();

  if (!product) return null;

  const hasRating = Number(product.rating) > 0;
  const ratingValue = hasRating ? Number(product.rating).toFixed(1) : null;

  const handleAddToCart = () => {
    if (product.stock <= 0) return;
    addToCart(product, 1);
  };

  const stockLabel = product.stock <= 0 ? 'Out of Stock' : product.stock <= 5 ? 'Low Stock' : 'In Stock';
  const stockClasses =
    product.stock <= 0
      ? 'bg-red-100 text-red-600'
      : product.stock <= 5
        ? 'bg-orange-100 text-orange-600'
        : 'bg-green-100 text-green-600';

  if (view === 'list') {
    return (
      <article className="bg-white border border-gray-200 rounded-xl p-4 flex flex-col sm:flex-row gap-4">
        <Link to={`/shop/product/${product.id}`} className="w-full sm:w-36 h-32 rounded-lg bg-gray-100 overflow-hidden flex items-center justify-center">
          <img
            src={product.images?.[0] || ''}
            alt={product.name}
            loading="lazy"
            onError={(event) => handleImageError(event, product.name)}
            className="w-full h-full object-contain p-2"
          />
        </Link>
        <div className="flex-1">
          <div className="flex flex-wrap items-center gap-2 mb-1">
            <span className="text-xs bg-primary text-white px-2 py-1 rounded-full">{product.category}</span>
            {product.salePrice && <span className="text-xs bg-red-500 text-white px-2 py-1 rounded-full">SALE</span>}
          </div>
          <h3 className="font-semibold text-primary text-lg line-clamp-2">{product.name}</h3>
          <p className="text-sm text-gray-500">{product.brand}</p>
          <p className="text-sm text-gray-600 mt-2 line-clamp-2">{product.description}</p>

          {hasRating && (
            <div className="flex items-center gap-1 text-sm mt-2">
              <FaStar className="text-yellow-500" size={13} />
              <span>{ratingValue}</span>
            </div>
          )}

          <div className="flex flex-wrap items-center justify-between gap-3 mt-3">
            <div className="flex items-center gap-2">
              <span className="text-secondary font-bold text-lg">PKR {Number(product.salePrice ?? product.price ?? 0).toLocaleString()}</span>
            </div>
            <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${stockClasses}`}>{stockLabel}</span>
          </div>
        </div>
        <div className="sm:w-32 flex sm:flex-col gap-2 sm:justify-center">
          <button
            type="button"
            disabled={product.stock <= 0}
            onClick={handleAddToCart}
            className={`flex-1 sm:flex-none px-3 py-2 rounded-md text-sm font-semibold ${
              product.stock <= 0 ? 'bg-gray-300 text-gray-500 cursor-not-allowed' : 'bg-primary text-white hover:bg-primary/90'
            }`}
          >
            Add to Cart
          </button>
          <Link
            to={`/shop/product/${product.id}`}
            className="flex-1 sm:flex-none px-3 py-2 rounded-md text-sm font-semibold border border-primary text-primary hover:bg-primary hover:text-white text-center"
          >
            View
          </Link>
        </div>
      </article>
    );
  }

  return (
    <article className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm hover:shadow-md transition-shadow">
      <div className="h-[200px] bg-gray-100 relative rounded-t-lg overflow-hidden">
        <Link to={`/shop/product/${product.id}`} className="w-full h-full flex items-center justify-center">
          <img
            src={product.images?.[0] || ''}
            alt={product.name}
            loading="lazy"
            onError={(event) => handleImageError(event, product.name)}
            className="w-full h-full object-contain p-2"
          />
        </Link>
        <span className="absolute top-2 left-2 text-[10px] bg-primary text-white px-2 py-1 rounded-full">{product.category}</span>
      </div>
      <div className="p-4">
        <h3 className="font-semibold text-primary line-clamp-2 min-h-[3rem]">{product.name}</h3>
        <p className="text-xs text-gray-500 mt-1">{product.brand}</p>
        {hasRating && (
          <div className="flex items-center gap-1 text-sm mt-2">
            <FaStar className="text-yellow-500" size={13} />
            <span>{ratingValue}</span>
          </div>
        )}
        <div className="mt-2 flex items-center gap-2">
          <span className="text-secondary font-bold text-lg">PKR {Number(product.salePrice ?? product.price ?? 0).toLocaleString()}</span>
        </div>
        <div className="mt-2">
          <span className={`inline-flex text-xs font-semibold px-2.5 py-1 rounded-full ${stockClasses}`}>{stockLabel}</span>
        </div>
        <button
          type="button"
          disabled={product.stock <= 0}
          onClick={handleAddToCart}
          className={`w-full mt-3 py-2 rounded-md text-sm font-semibold ${
            product.stock <= 0 ? 'bg-gray-300 text-gray-500 cursor-not-allowed' : 'bg-primary text-white hover:bg-primary/90'
          }`}
        >
          Add to Cart
        </button>
      </div>
    </article>
  );
};

export default ProductCard;