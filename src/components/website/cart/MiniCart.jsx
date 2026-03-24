import React from 'react';
import { Link } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { FaMinus, FaPlus, FaShoppingCart, FaTimes, FaTrashAlt } from 'react-icons/fa';
import { useCart } from '../../../context/CartContext';
import { handleImageError } from '../../../utils/helpers';

const MiniCart = () => {
  const {
    cartItems,
    cartCount,
    cartTotal,
    isCartOpen,
    setIsCartOpen,
    removeFromCart,
    updateQuantity
  } = useCart();

  return (
    <AnimatePresence>
      {isCartOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/40 z-50"
            onClick={() => setIsCartOpen(false)}
          />

          <motion.aside
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'tween', duration: 0.3 }}
            className="fixed top-0 right-0 h-full w-96 max-w-[92%] bg-white z-50 flex flex-col shadow-2xl"
          >
            <div className="px-4 py-3 border-b border-gray-200 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-primary">My Cart ({cartCount} items)</h3>
              <button
                type="button"
                onClick={() => setIsCartOpen(false)}
                className="text-gray-500 hover:text-primary"
                aria-label="Close mini cart"
              >
                <FaTimes size={18} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-3 pb-44">
              {cartItems.length === 0 ? (
                <div className="h-full min-h-[320px] flex flex-col items-center justify-center text-center px-4">
                  <div className="w-16 h-16 rounded-full bg-orange-50 text-secondary flex items-center justify-center mb-4">
                    <FaShoppingCart size={24} />
                  </div>
                  <p className="text-lg font-semibold text-primary">Your cart is empty</p>
                  <p className="text-sm text-gray-500 mt-1">Add products to continue shopping.</p>
                  <Link
                    to="/shop"
                    onClick={() => setIsCartOpen(false)}
                    className="mt-5 inline-flex items-center justify-center rounded-md bg-secondary text-white px-5 py-2.5 font-semibold hover:bg-orange-600 transition-colors"
                  >
                    Start Shopping
                  </Link>
                </div>
              ) : (
                cartItems.map((item) => (
                  <div key={item.id} className="border border-gray-200 rounded-lg p-3">
                    <div className="flex items-start gap-3">
                      <div className="w-[50px] h-[50px] rounded-md border border-gray-200 overflow-hidden">
                        <div className="w-full h-full flex items-center justify-center bg-white">
                          <img
                            src={item.images?.[0] || item.image || ''}
                            alt={item.name}
                            loading="lazy"
                            onError={(event) => handleImageError(event, item.name)}
                            className="w-full h-full object-contain p-1"
                          />
                        </div>
                      </div>

                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-gray-800 truncate">{item.name}</p>
                        <p className="text-xs text-gray-600 mt-1">
                          Rs. {(item.salePrice ?? item.price).toLocaleString()} × {item.quantity}
                        </p>

                        <div className="mt-3 inline-flex items-center border border-gray-300 rounded-md overflow-hidden">
                          <button
                            type="button"
                            onClick={() => updateQuantity(item.id, item.quantity - 1)}
                            className="w-8 h-8 flex items-center justify-center text-gray-600 hover:bg-gray-100"
                            aria-label="Decrease quantity"
                          >
                            <FaMinus size={10} />
                          </button>
                          <span className="w-8 text-center text-sm font-semibold text-gray-800">{item.quantity}</span>
                          <button
                            type="button"
                            onClick={() => updateQuantity(item.id, item.quantity + 1)}
                            className="w-8 h-8 flex items-center justify-center text-gray-600 hover:bg-gray-100"
                            aria-label="Increase quantity"
                          >
                            <FaPlus size={10} />
                          </button>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => removeFromCart(item.id)}
                        className="text-red-500 hover:text-red-600 mt-1"
                        aria-label="Remove item"
                      >
                        <FaTrashAlt size={14} />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>

            <div className="border-t border-gray-200 p-4 space-y-3 sticky bottom-0 bg-white">
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-600">Subtotal</span>
                <span className="font-semibold text-primary">Rs. {cartTotal.toLocaleString()}</span>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <Link
                  to="/cart"
                  onClick={() => setIsCartOpen(false)}
                  className="text-center py-2.5 border border-primary text-primary rounded-md hover:bg-primary hover:text-white transition-colors text-sm font-medium"
                >
                  View Cart
                </Link>
                <Link
                  to="/checkout"
                  onClick={() => setIsCartOpen(false)}
                  className="text-center py-2.5 bg-secondary text-white rounded-md hover:bg-orange-600 transition-colors text-sm font-semibold col-span-2"
                >
                  Checkout
                </Link>
              </div>
            </div>
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  );
};

export default MiniCart;