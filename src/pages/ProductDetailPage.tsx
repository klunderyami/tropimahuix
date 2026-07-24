import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { subscribeToProducts } from '../supabase.js';
import { useCart } from '../contexts/CartContext.js';
import type { Product } from '../types.js';

export const ProductDetailPage = () => {
  const { id } = useParams<{ id: string }>();
  const { addToCart } = useCart();
  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);
  const [quantity, setQuantity] = useState(1);
  const [addedToCart, setAddedToCart] = useState(false);

  useEffect(() => {
    const unsubscribe = subscribeToProducts(
      (products) => {
        const found = products.find(p => p.id === id);
        setProduct(found || null);
        setLoading(false);
      },
      (error) => {
        console.error('Error fetching product:', error);
        setLoading(false);
      }
    );

    return unsubscribe;
  }, [id]);

  const handleAddToCart = () => {
    if (product && product.stock > 0) {
      addToCart(product, quantity);
      setAddedToCart(true);
      setTimeout(() => setAddedToCart(false), 2000);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-paper flex items-center justify-center">
        <div className="text-center">
          <div className="mb-4 text-4xl">🌴</div>
          <p className="text-stone-600 font-medium">Cargando producto...</p>
        </div>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="min-h-screen bg-paper flex items-center justify-center">
        <div className="text-center">
          <div className="mb-4 text-6xl">😕</div>
          <h1 className="text-3xl font-display text-brand-brown mb-4">Producto no encontrado</h1>
          <p className="text-stone-600 mb-8">El producto que buscas no existe o ha sido eliminado.</p>
          <Link to="/" className="btn-primary">
            Volver al catálogo
          </Link>
        </div>
      </div>
    );
  }

  const isOutOfStock = product.stock === 0;

  return (
    <div className="min-h-screen bg-paper">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <nav className="mb-8">
          <ol className="flex items-center gap-2 text-sm text-stone-600">
            <li>
              <Link to="/" className="hover:text-brand-orange transition-colors">Inicio</Link>
            </li>
            <li>/</li>
            <li>
              <Link to="/#catalog" className="hover:text-brand-orange transition-colors">Catálogo</Link>
            </li>
            <li>/</li>
            <li className="text-brand-brown font-semibold">{product.name}</li>
          </ol>
        </nav>

        <div className="grid gap-12 lg:grid-cols-2">
          {/* Imagen del producto */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="glass-card overflow-hidden border border-stone-200 bg-white/85 shadow-xl"
          >
            <div className="relative h-96 lg:h-[500px] bg-stone-50">
              <img
                src={product.image}
                alt={product.name}
                className={`w-full h-full object-contain ${isOutOfStock ? 'grayscale' : ''}`}
              />
              {isOutOfStock && (
                <div className="absolute inset-0 flex items-center justify-center bg-stone-950/50">
                  <div className="rounded-2xl bg-stone-950/80 px-6 py-3 text-center">
                    <p className="text-lg font-bold uppercase tracking-wider text-white">Agotado</p>
                  </div>
                </div>
              )}
            </div>
          </motion.div>

          {/* Información del producto */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            className="flex flex-col"
          >
            <div className="glass-card border border-stone-200 bg-white/85 p-8 shadow-xl flex-grow">
              <div className="mb-4">
                <span className={`inline-block rounded-full px-4 py-2 text-xs font-bold uppercase tracking-wider ${
                  product.category === 'licor' 
                    ? 'bg-brand-orange/95 text-white' 
                    : 'bg-brand-lime/95 text-brand-brown'
                }`}>
                  {product.category === 'licor' ? 'Licor Artesanal' : 'Torito Cremoso'}
                </span>
              </div>

              <h1 className="text-4xl lg:text-5xl font-display text-brand-brown mb-4">
                {product.name}
              </h1>

              <p className="text-stone-600 text-lg leading-relaxed mb-6">
                {product.description}
              </p>

              <div className="mb-6">
                <p className="text-sm font-semibold text-stone-700 uppercase tracking-wider">
                  Contenido Neto
                </p>
                <p className="text-2xl font-bold text-brand-brown mt-1">{product.volume}</p>
              </div>

              <div className="mb-8">
                <p className="text-sm font-semibold text-stone-700 uppercase tracking-wider mb-2">
                  Stock Disponible
                </p>
                <p className={`text-lg font-bold ${product.stock <= 3 ? 'text-rose-600' : 'text-emerald-600'}`}>
                  {product.stock > 0 ? `${product.stock} unidades` : 'Sin stock'}
                </p>
              </div>

              <div className="mb-8">
                <p className="text-5xl font-extrabold text-brand-brown flex items-center gap-2">
                  <span className="text-3xl font-bold text-brand-orange">$</span>
                  {product.price.toFixed(2)}
                  <span className="text-lg text-stone-400 font-semibold">MXN</span>
                </p>
              </div>

              {!isOutOfStock && (
                <div className="flex flex-col gap-4">
                  <div className="flex items-center gap-4">
                    <label className="text-sm font-semibold text-stone-700">Cantidad:</label>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => setQuantity(Math.max(1, quantity - 1))}
                        className="w-10 h-10 rounded-full border border-stone-300 bg-white hover:bg-stone-50 font-bold text-brand-brown transition-colors"
                      >
                        -
                      </button>
                      <span className="w-12 text-center text-lg font-bold text-brand-brown">{quantity}</span>
                      <button
                        onClick={() => setQuantity(Math.min(product.stock, quantity + 1))}
                        className="w-10 h-10 rounded-full border border-stone-300 bg-white hover:bg-stone-50 font-bold text-brand-brown transition-colors"
                      >
                        +
                      </button>
                    </div>
                  </div>

                  <button
                    onClick={handleAddToCart}
                    className={`w-full rounded-3xl py-4 font-bold tracking-wide shadow-md transition-all duration-300 ${
                      addedToCart
                        ? 'bg-emerald-500 text-white'
                        : product.category === 'torito'
                          ? 'bg-brand-lime text-brand-brown hover:bg-brand-lime/85 hover:shadow-xl active:scale-[0.98]'
                          : 'bg-brand-orange text-white hover:bg-brand-orange/90 hover:shadow-xl active:scale-[0.98]'
                    }`}
                  >
                    {addedToCart ? '✓ Agregado al carrito' : 'Agregar al carrito'}
                  </button>
                </div>
              )}

              {isOutOfStock && (
                <div className="rounded-2xl bg-stone-100 px-4 py-3 text-center">
                  <p className="text-sm font-semibold text-stone-600">
                    Este producto está temporalmente agotado.
                  </p>
                </div>
              )}
            </div>
          </motion.div>
        </div>

        {/* Galería del producto */}
        {product.gallery && product.gallery.length > 0 && (
          <div className="mt-16">
            <h2 className="text-3xl font-display text-brand-brown mb-8">Galería</h2>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {product.gallery.map((mediaUrl, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.1 }}
                  className="glass-card overflow-hidden border border-stone-200 bg-white/85 shadow-lg"
                >
                  {mediaUrl.match(/\.(mp4|webm|mov)$/i) ? (
                    <video
                      src={mediaUrl}
                      controls
                      className="w-full h-64 object-contain bg-black"
                      autoPlay
                      muted
                      loop
                      playsInline
                    />
                  ) : (
                    <img
                      src={mediaUrl}
                      alt={`${product.name} - Imagen ${index + 1}`}
                      className="w-full h-64 object-contain"
                    />
                  )}
                </motion.div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};