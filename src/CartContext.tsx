import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import type { CartItem, Product } from '../types';

interface CartContextType {
  cartItems: CartItem[];
  addToCart: (product: Product, quantity: number) => void;
  removeFromCart: (productId: string) => void;
  updateQuantity: (productId: string, newQuantity: number) => void;
  clearCart: () => void;
  totalItems: number;
  totalPrice: number;
  isCartLoaded: boolean;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

export const useCart = () => {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error('useCart debe ser utilizado dentro de un CartProvider');
  }
  return context;
};

export const CartProvider = ({ children }: { children: ReactNode }) => {
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [isCartLoaded, setIsCartLoaded] = useState(false);

  // Cargar carrito desde localStorage de forma robusta
  useEffect(() => {
    try {
      const localData = localStorage.getItem('tropicaña-cart');
      if (localData) {
        const parsed = JSON.parse(localData);
        if (Array.isArray(parsed)) {
          setCartItems(parsed);
        }
      }
    } catch (error) {
      console.error('Error al leer el carrito desde localStorage', error);
      // Limpiar datos corruptos
      try {
        localStorage.removeItem('tropicaña-cart');
      } catch {
        // Ignorar errores de limpieza
      }
    } finally {
      setIsCartLoaded(true);
    }
  }, []);

  // Guardar carrito en localStorage con debounce y validación
  useEffect(() => {
    if (!isCartLoaded) return;

    const timeoutId = setTimeout(() => {
      try {
        localStorage.setItem('tropicaña-cart', JSON.stringify(cartItems));
      } catch (error) {
        console.error('Error al guardar el carrito en localStorage', error);
        // Posible quota exceeded - intentar limpiar o notificar
        if (error instanceof Error && error.name === 'QuotaExceededError') {
          console.warn('localStorage quota exceeded. Considerando limpiar carrito.');
        }
      }
    }, 100); // Debounce de 100ms para evitar escrituras excesivas

    return () => clearTimeout(timeoutId);
  }, [cartItems, isCartLoaded]);

  const addToCart = useCallback((product: Product, quantity: number) => {
    if (quantity <= 0) return;
    
    setCartItems(prevItems => {
      const existingItem = prevItems.find(item => item.product.id === product.id);
      if (existingItem) {
        return prevItems.map(item =>
          item.product.id === product.id
            ? { ...item, quantity: Math.min(item.quantity + quantity, 99) }
            : item
        );
      }
      return [...prevItems, { product, quantity: Math.min(quantity, 99) }];
    });
  }, []);

  const removeFromCart = useCallback((productId: string) => {
    setCartItems(prevItems => prevItems.filter(item => item.product.id !== productId));
  }, []);

  const updateQuantity = useCallback((productId: string, newQuantity: number) => {
    if (newQuantity <= 0) {
      removeFromCart(productId);
    } else {
      setCartItems(prevItems =>
        prevItems.map(item =>
          item.product.id === productId ? { ...item, quantity: Math.min(newQuantity, 99) } : item
        )
      );
    }
  }, [removeFromCart]);

  const clearCart = useCallback(() => {
    setCartItems([]);
  }, []);

  const totalItems = cartItems.reduce((sum, item) => sum + item.quantity, 0);
  const totalPrice = cartItems.reduce((sum, item) => sum + item.product.price * item.quantity, 0);

  const value = { 
    cartItems, 
    addToCart, 
    removeFromCart, 
    updateQuantity, 
    clearCart, 
    totalItems, 
    totalPrice,
    isCartLoaded 
  };

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
};
