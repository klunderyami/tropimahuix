import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import type { CartItem, Product } from '../types.js';

interface CartContextValue {
  cart: CartItem[];
  addToCart: (product: Product) => void;
  updateQuantity: (productId: string, newQuantity: number) => void;
  removeFromCart: (productId: string) => void;
  clearCart: () => void;
  cartItemCount: number;
  isCartOpen: boolean;
  setIsCartOpen: (v: boolean) => void;
}

const CartContext = createContext<CartContextValue | undefined>(undefined);

export const useCart = () => {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error('useCart must be used within CartProvider');
  return ctx;
};

export const CartProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [cart, setCart] = useState<CartItem[]>(() => {
    try {
      const raw = localStorage.getItem('tropicana_cart');
      if (!raw) return [];
      const parsed = JSON.parse(raw) as CartItem[];
      return Array.isArray(parsed)
        ? parsed.filter((item) => item.product?.id && item.quantity > 0)
        : [];
    } catch {
      return [];
    }
  });

  const [isCartOpen, setIsCartOpen] = useState(false);

  useEffect(() => {
    try {
      localStorage.setItem('tropicana_cart', JSON.stringify(cart));
    } catch {
      // localStorage can be unavailable in private browsing or restricted environments.
    }
  }, [cart]);

  const addToCart = (product: Product) => {
    setCart((prevCart) => {
      const existing = prevCart.find((i) => i.product.id === product.id);
      if (existing) {
        return prevCart.map((i) =>
          i.product.id === product.id ? { ...i, quantity: Math.max(1, i.quantity) + 1 } : i
        );
      }
      return [...prevCart, { product, quantity: 1 }];
    });
    setIsCartOpen(true);
  };

  const updateQuantity = (productId: string, newQuantity: number) => {
    if (newQuantity < 1) {
      removeFromCart(productId);
      return;
    }

    setCart((prev) =>
      prev.map((i) => (i.product.id === productId ? { ...i, quantity: Math.floor(newQuantity) } : i))
    );
  };

  const removeFromCart = (productId: string) => setCart((prev) => prev.filter((i) => i.product.id !== productId));

  const clearCart = () => setCart([]);

  const cartItemCount = useMemo(() => cart.reduce((s, i) => s + i.quantity, 0), [cart]);

  return (
    <CartContext.Provider value={{ cart, addToCart, updateQuantity, removeFromCart, clearCart, cartItemCount, isCartOpen, setIsCartOpen }}>
      {children}
    </CartContext.Provider>
  );
};

export default CartContext;
