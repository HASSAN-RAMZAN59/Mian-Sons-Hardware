import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { showActionToast } from '../utils/toastActions';
import useActiveDiscounts from '../hooks/useActiveDiscounts';
import { applyDiscountsToProduct } from '../utils/discounts';

const CartContext = createContext();

const CART_STORAGE_KEY = 'website_cart';

const COUPON_CODES = {
  SAVE10: 10,
  HARDWARE20: 20,
  EID15: 15
};

const getPrimaryImage = (product = {}) => {
  if (product.image) return String(product.image);
  if (Array.isArray(product.images) && product.images.length > 0) {
    return String(product.images[0] || '');
  }
  return '';
};

export const CartProvider = ({ children }) => {
  const [cartItems, setCartItems] = useState(() => {
    const savedCart = localStorage.getItem(CART_STORAGE_KEY);
    if (!savedCart) return [];

    try {
      const parsed = JSON.parse(savedCart);
      return Array.isArray(parsed?.cartItems) ? parsed.cartItems : [];
    } catch {
      return [];
    }
  });

  const [couponCode, setCouponCode] = useState(() => {
    const savedCart = localStorage.getItem(CART_STORAGE_KEY);
    if (!savedCart) return '';

    try {
      const parsed = JSON.parse(savedCart);
      return parsed?.couponCode || '';
    } catch {
      return '';
    }
  });

  const [isCartOpen, setIsCartOpen] = useState(false);
  const { discounts } = useActiveDiscounts();

  useEffect(() => {
    localStorage.setItem(
      CART_STORAGE_KEY,
      JSON.stringify({
        cartItems,
        couponCode
      })
    );
  }, [cartItems, couponCode]);

  useEffect(() => {
    setCartItems((prevItems) =>
      prevItems.map((item) => {
        const updated = applyDiscountsToProduct(item, discounts);
        return {
          ...item,
          price: Number(updated.price ?? item.price ?? 0),
          salePrice: Number.isFinite(updated.salePrice) ? updated.salePrice : null
        };
      })
    );
  }, [discounts]);

  const cartCount = useMemo(
    () => cartItems.reduce((total, item) => total + item.quantity, 0),
    [cartItems]
  );

  const subTotal = useMemo(
    () => cartItems.reduce((total, item) => total + (item.salePrice ?? item.price) * item.quantity, 0),
    [cartItems]
  );

  const cartDiscount = useMemo(() => {
    if (!couponCode) return 0;
    const discountPercent = COUPON_CODES[couponCode] || 0;
    return Number(((subTotal * discountPercent) / 100).toFixed(2));
  }, [couponCode, subTotal]);

  const cartTotal = useMemo(
    () => Number(Math.max(subTotal - cartDiscount, 0).toFixed(2)),
    [subTotal, cartDiscount]
  );

  const getItemStockLimit = (product = {}) => {
    const parsedStock = Number(product.stock);
    return Number.isFinite(parsedStock) && parsedStock > 0 ? parsedStock : Infinity;
  };

  const normalizeCartItem = (product, quantity) => ({
    id: product.id,
    name: product.name,
    price: Number(product.price) || 0,
    salePrice: product.salePrice !== undefined && product.salePrice !== null ? Number(product.salePrice) : null,
    image: getPrimaryImage(product),
    images: Array.isArray(product.images) ? product.images : (getPrimaryImage(product) ? [getPrimaryImage(product)] : []),
    category: product.category || '',
    brand: product.brand || '',
    quantity,
    stock: product.stock,
    unit: product.unit || 'pcs'
  });

  const showToast = (type, message, toastId, path = '/cart') => {
    showActionToast(type, message, { toastId, path });
  };

  const addToCart = (product, quantity = 1) => {
    if (!product?.id) return;

    const qtyToAdd = Math.max(Number(quantity) || 1, 1);
    const stockLimit = getItemStockLimit(product);

    setCartItems((prevItems) => {
      const existingItem = prevItems.find((item) => item.id === product.id);

      if (existingItem) {
        const nextQuantity = existingItem.quantity + qtyToAdd;

        if (nextQuantity > stockLimit) {
          showToast('warning', `Only ${stockLimit} in stock for ${product.name}.`, `cart-stock-${product.id}`, '/cart');
          return prevItems;
        }

        showToast('success', `${product.name} quantity updated in cart.`, `cart-updated-${product.id}`, '/cart');
        return prevItems.map((item) =>
          item.id === product.id ? { ...item, quantity: nextQuantity } : item
        );
      }

      if (qtyToAdd > stockLimit) {
        showToast('warning', `Only ${stockLimit} in stock for ${product.name}.`, `cart-stock-${product.id}`, '/cart');
        return prevItems;
      }

      showToast('success', `${product.name} added to cart.`, `cart-added-${product.id}`, '/cart');
      return [...prevItems, normalizeCartItem(product, qtyToAdd)];
    });
  };

  const removeFromCart = (productId, options = {}) => {
    const { silent = false } = options;

    setCartItems((prevItems) => {
      const itemToRemove = prevItems.find((item) => item.id === productId);
      if (!itemToRemove) return prevItems;

      if (!silent) {
        showToast('info', `${itemToRemove.name} removed from cart.`, `cart-removed-${productId}`, '/cart');
      }
      return prevItems.filter((item) => item.id !== productId);
    });
  };

  const updateQuantity = (productId, quantity) => {
    const nextQty = Number(quantity);
    if (!Number.isFinite(nextQty)) return;

    setCartItems((prevItems) => {
      const currentItem = prevItems.find((item) => item.id === productId);
      if (!currentItem) return prevItems;

      if (nextQty <= 0) {
        showToast('info', `${currentItem.name} removed from cart.`, `cart-removed-${productId}`, '/cart');
        return prevItems.filter((item) => item.id !== productId);
      }

      const stockLimit = getItemStockLimit(currentItem);
      if (nextQty > stockLimit) {
        showToast('warning', `Only ${stockLimit} in stock for ${currentItem.name}.`, `cart-stock-${productId}`, '/cart');
        return prevItems;
      }

      return prevItems.map((item) =>
        item.id === productId ? { ...item, quantity: nextQty } : item
      );
    });
  };

  const clearCart = () => {
    setCartItems([]);
    setCouponCode('');
  };

  const applyCoupon = (code) => {
    const normalizedCode = String(code || '').trim().toUpperCase();

    if (!normalizedCode || !COUPON_CODES[normalizedCode]) {
      return {
        success: false,
        message: 'Invalid coupon code.'
      };
    }

    setCouponCode(normalizedCode);
    return {
      success: true,
      message: 'Coupon applied successfully.'
    };
  };

  const removeCoupon = () => {
    setCouponCode('');
  };

  const getCartItem = (productId) => cartItems.find((item) => item.id === productId) || null;

  const isInCart = (productId) => cartItems.some((item) => item.id === productId);

  const value = {
    cartItems,
    cartCount,
    cartTotal,
    cartDiscount,
    couponCode,
    isCartOpen,
    setIsCartOpen,
    addToCart,
    removeFromCart,
    updateQuantity,
    clearCart,
    applyCoupon,
    removeCoupon,
    getCartItem,
    isInCart
  };

  return (
    <CartContext.Provider value={value}>
      {children}
    </CartContext.Provider>
  );
};

export const useCart = () => {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error('useCart must be used within a CartProvider');
  }
  return context;
};

export default CartContext;