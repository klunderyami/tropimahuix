import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import type { CartItem, Product, DiscoverySource } from '../types.js';

interface CartContextType {
  cartItems: CartItem[];
  addToCart: (product: Product, quantity: number) => void;
  removeFromCart: (productId: string) => void;
  updateQuantity: (productId: string, newQuantity: number) => void;
  clearCart: () => void;
  totalItems: number;
  totalPrice: number;
  isCartOpen: boolean;
  setIsCartOpen: (isOpen: boolean) => void;
  discoverySource: DiscoverySource | null;
  setDiscoverySource: (source: DiscoverySource | null) => void;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

export const useCart = () => {
  const ctx = useContext(CartContext);
  if (!ctx) {
    throw new Error('useCart debe ser utilizado dentro de un CartProvider');
  }
  return ctx;
};

export const CartProvider = ({ children }: { children: ReactNode }) => {
  const [cartItems, setCartItems] = useState<CartItem[]>(() => {
    try {
      const localData = localStorage.getItem('tropicaña-cart');
      return localData ? JSON.parse(localData) : [];
    } catch (error) {
      console.error('Error al leer el carrito desde localStorage', error);
      return [];
    }
  });

  const [isCartOpen, setIsCartOpen] = useState(false);
  const [discoverySource, setDiscoverySource] = useState<DiscoverySource | null>(null);

  useEffect(() => {
    try {
      localStorage.setItem('tropicaña-cart', JSON.stringify(cartItems));
    } catch (error) {
      console.error('Error al guardar el carrito en localStorage', error);
    }
  }, [cartItems]);

  const addToCart = (product: Product, quantity: number) => {
    setCartItems(prevItems => {
      const existingItem = prevItems.find(item => item.product.id === product.id);
      if (existingItem) {
        return prevItems.map(item =>
          item.product.id === product.id
            ? { ...item, quantity: item.quantity + quantity }
            : item
        );
      }
      return [...prevItems, { product, quantity }];
    });
    setIsCartOpen(true);
  };

  const removeFromCart = (productId: string) => {
    setCartItems(prevItems => prevItems.filter(item => item.product.id !== productId));
  };

  const updateQuantity = (productId: string, newQuantity: number) => {
    if (newQuantity <= 0) {
      removeFromCart(productId);
    } else {
      setCartItems(prevItems =>
        prevItems.map(item =>
          item.product.id === productId ? { ...item, quantity: newQuantity } : item
        )
      );
    }
  };

  const clearCart = () => {
    setCartItems([]);
  };

  const totalItems = cartItems.reduce((sum, item) => sum + item.quantity, 0);
  const totalPrice = cartItems.reduce((sum, item) => sum + item.product.price * item.quantity, 0);

  const value = { cartItems, addToCart, removeFromCart, updateQuantity, clearCart, totalItems, totalPrice, isCartOpen, setIsCartOpen, discoverySource, setDiscoverySource };

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
};
