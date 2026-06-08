import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ShoppingCart, Menu, X, Plus, Trash2, Play, Phone, Award, Instagram, Facebook, Edit, Save, Image as ImageIcon, Upload, LogIn, LogOut } from 'lucide-react';
import { Product, Page, SiteConfig, HeroSlide } from './types';
import { 
  db, 
  auth, 
  login, 
  logout, 
  onAuthStateChanged, 
  collection, 
  doc, 
  setDoc, 
  deleteDoc, 
  onSnapshot, 
  query, 
  orderBy, 
  handleFirestoreError, 
  OperationType, 
  User 
} from './firebase';

// --- Mock Data ---
const INITIAL_PRODUCTS: Product[] = [
  {
    id: '1',
    name: 'VAINILLA',
    description: 'Nuestro licor de vainilla, suave and aromático, elaborado con vainas seleccionadas.',
    price: 250,
    volume: '1L',
    image: 'https://picsum.photos/seed/vanilla-bottle/400/600',
    category: 'licor'
  },
  {
    id: '2',
    name: 'COCOTAZO',
    description: 'El torito de coco, cremoso y refrescante, un clásico veracruzano.',
    price: 280,
    volume: '1L',
    image: 'https://picsum.photos/seed/coconut-drink/400/600',
    category: 'torito'
  },
  {
    id: '3',
    name: 'MORA AZUL',
    description: 'Explosión frutal con notas silvestres y un toque artesanal único.',
    price: 260,
    volume: '1L',
    image: 'https://picsum.photos/seed/blueberry-liqueur/400/600',
    category: 'licor'
  },
  {
    id: '4',
    name: 'CAFÉ DE ALTURA',
    description: 'Torito cremoso con el mejor café veracruzano tostado artesanalmente.',
    price: 290,
    volume: '1L',
    image: 'https://picsum.photos/seed/coffee-torito/400/600',
    category: 'torito'
  }
];

const INITIAL_SITE_CONFIG: SiteConfig = {
  heroSlides: [
    {
      title: "¡Bienvenidos a Tropicaña!",
      subtitle: "El sabor de lo nuestro.",
      image: "https://picsum.photos/seed/tropical-field/1920/1080",
      cta: "Explorar Sabores"
    },
    {
      title: "Nuestros Licores Artesanales",
      subtitle: "Tradición embotellada con pasión.",
      image: "https://picsum.photos/seed/vanilla-pods/1920/1080",
      cta: "Ver Licores"
    },
    {
      title: "El Clásico Torito Veracruzano",
      subtitle: "Cremosidad que deleita el alma.",
      image: "https://picsum.photos/seed/clay-pot/1920/1080",
      cta: "Ver Toritos"
    }
  ],
  introTitle: "Nuestra Esencia Artesanal",
  introText: "En Tropicaña, rescatamos las recetas tradicionales de Veracruz para llevarte el sabor auténtico de la caña, el coco y la vainilla. Cada botella es un tributo a nuestra tierra, elaborada con paciencia y pasión por manos mexicanas.",
  videoTitle: "El Arte de la Destilación",
  videoSubtitle: "Conoce nuestro proceso desde la caña hasta tu mesa.",
  videoImage: "https://picsum.photos/seed/distillery/1280/720",
  licoresHeaderImage: "https://picsum.photos/seed/sugarcane/1200/400",
  toritosHeaderImage: "https://picsum.photos/seed/coconut-palm/1200/400",
  contactPhone: "664 725 4250",
  footerText: "El sabor de lo nuestro."
};

// --- Components ---

const Navbar = ({ currentPage, setPage, cartCount }: { currentPage: Page, setPage: (p: Page) => void, cartCount: number }) => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-white/90 backdrop-blur-md border-b border-brand-gold/20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-20">
          <div className="flex-shrink-0 flex items-center cursor-pointer" onClick={() => setPage('home')}>
            <span className="text-4xl font-display text-brand-lime drop-shadow-sm">Tropicaña</span>
          </div>
          
          <div className="hidden md:flex items-center space-x-8">
            <button onClick={() => setPage('home')} className={`text-lg font-medium hover:text-brand-orange transition-colors ${currentPage === 'home' ? 'text-brand-orange underline underline-offset-8' : ''}`}>Principal</button>
            <button onClick={() => setPage('licores')} className={`text-lg font-medium hover:text-brand-orange transition-colors ${currentPage === 'licores' ? 'text-brand-orange underline underline-offset-8' : ''}`}>Licores</button>
            <button onClick={() => setPage('toritos')} className={`text-lg font-medium hover:text-brand-orange transition-colors ${currentPage === 'toritos' ? 'text-brand-orange underline underline-offset-8' : ''}`}>Toritos</button>
            <button onClick={() => setPage('admin')} className="text-sm opacity-50 hover:opacity-100 flex items-center gap-1"><Edit size={14} /> Editar Sitio</button>
          </div>

          <div className="flex items-center space-x-4">
            <button onClick={() => setPage('cart')} className="relative p-2 text-brand-brown hover:text-brand-orange transition-colors">
              <ShoppingCart size={28} />
              {cartCount > 0 && (
                <span className="absolute top-0 right-0 bg-brand-orange text-white text-xs font-bold rounded-full h-5 w-5 flex items-center justify-center">
                  {cartCount}
                </span>
              )}
            </button>
            <button className="md:hidden p-2" onClick={() => setIsOpen(!isOpen)}>
              {isOpen ? <X size={28} /> : <Menu size={28} />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Menu */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="md:hidden bg-white border-b border-brand-gold/20 overflow-hidden"
          >
            <div className="px-4 pt-2 pb-6 space-y-4">
              <button onClick={() => { setPage('home'); setIsOpen(false); }} className="block w-full text-left text-xl py-2">Principal</button>
              <button onClick={() => { setPage('licores'); setIsOpen(false); }} className="block w-full text-left text-xl py-2">Licores</button>
              <button onClick={() => { setPage('toritos'); setIsOpen(false); }} className="block w-full text-left text-xl py-2">Toritos</button>
              <button onClick={() => { setPage('admin'); setIsOpen(false); }} className="block w-full text-left text-sm py-2 opacity-50">Editar Sitio</button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </nav>
  );
};

const Hero = ({ config, setPage }: { config: SiteConfig, setPage: (p: Page) => void }) => {
  const [activeSlide, setActiveSlide] = useState(0);
  const slides = config.heroSlides;

  useEffect(() => {
    const timer = setInterval(() => {
      setActiveSlide((prev) => (prev + 1) % slides.length);
    }, 5000);
    return () => clearInterval(timer);
  }, [slides.length]);

  return (
    <div className="relative h-[80vh] overflow-hidden">
      <AnimatePresence mode="wait">
        <motion.div
          key={activeSlide}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 1 }}
          className="absolute inset-0"
        >
          <div className="absolute inset-0 bg-black/40 z-10" />
          <img
            src={slides[activeSlide].image}
            alt={slides[activeSlide].title}
            className="w-full h-full object-cover"
            referrerPolicy="no-referrer"
          />
          <div className="absolute inset-0 z-20 flex flex-col items-center justify-center text-center px-4">
            <motion.h1
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.5 }}
              className="text-6xl md:text-8xl text-brand-lime mb-4 drop-shadow-lg"
            >
              {slides[activeSlide].title}
            </motion.h1>
            <motion.p
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.7 }}
              className="text-2xl md:text-3xl text-white mb-8 font-light italic"
            >
              {slides[activeSlide].subtitle}
            </motion.p>
            <motion.button
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 0.9 }}
              onClick={() => setPage('licores')}
              className="btn-primary text-xl"
            >
              {slides[activeSlide].cta}
            </motion.button>
          </div>
        </motion.div>
      </AnimatePresence>
      
      <div className="absolute bottom-8 left-1/2 -translate-x-1/2 z-30 flex space-x-2">
        {slides.map((_, i) => (
          <button
            key={i}
            onClick={() => setActiveSlide(i)}
            className={`h-3 w-3 rounded-full transition-all ${activeSlide === i ? 'bg-brand-lime w-8' : 'bg-white/50'}`}
          />
        ))}
      </div>
    </div>
  );
};

const ProductCard: React.FC<{ product: Product, onAddToCart: (p: Product) => void }> = ({ product, onAddToCart }) => {
  return (
    <motion.div
      whileHover={{ y: -10 }}
      className="glass-card overflow-hidden flex flex-col h-full group"
    >
      <div className="relative h-64 overflow-hidden">
        <img
          src={product.image}
          alt={product.name}
          className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
          referrerPolicy="no-referrer"
        />
        <div className="absolute top-4 right-4 bg-brand-orange text-white px-3 py-1 rounded-full text-sm font-bold shadow-lg">
          {product.volume}
        </div>
        <div className="absolute inset-0 bg-gradient-to-t from-brand-brown/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end p-4">
          <span className="text-white text-xs font-bold uppercase tracking-tighter">Artesanal de Veracruz</span>
        </div>
      </div>
      <div className="p-6 flex-grow flex flex-col border-t-4 border-brand-lime">
        <h3 className="text-3xl text-brand-orange mb-2 font-display">{product.name}</h3>
        <p className="text-brand-brown/70 mb-4 text-sm line-clamp-3 leading-relaxed">{product.description}</p>
        <div className="mt-auto flex items-center justify-between">
          <div className="flex flex-col">
            <span className="text-xs text-brand-gold font-bold uppercase">Precio</span>
            <span className="text-2xl font-bold text-brand-brown">${product.price.toFixed(2)} <span className="text-sm font-normal">MXN</span></span>
          </div>
          <button
            onClick={() => onAddToCart(product)}
            className="p-3 bg-brand-lime rounded-full text-brand-brown hover:bg-brand-orange hover:text-white transition-all shadow-md hover:shadow-xl"
          >
            <Plus size={24} />
          </button>
        </div>
      </div>
    </motion.div>
  );
};

const AdminPanel = ({ 
  products,
  onAddProduct,
  onUpdateProduct,
  onDeleteProduct,
  siteConfig, 
  onUpdateConfig,
  user
}: { 
  products: Product[],
  onAddProduct: (p: Product) => void, 
  onUpdateProduct: (p: Product) => void,
  onDeleteProduct: (id: string) => void,
  siteConfig: SiteConfig, 
  onUpdateConfig: (c: SiteConfig) => void,
  user: User | null
}) => {
  const [activeTab, setActiveTab] = useState<'products' | 'site'>('site');
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    price: '',
    volume: '1L',
    category: 'licor' as 'licor' | 'torito',
    image: ''
  });

  const [configForm, setConfigForm] = useState<SiteConfig>(siteConfig);

  useEffect(() => {
    setConfigForm(siteConfig);
  }, [siteConfig]);

  if (!user) {
    return (
      <div className="py-20 text-center">
        <h2 className="text-4xl text-brand-orange mb-8">Acceso Restringido</h2>
        <p className="text-brand-brown/60 mb-8">Inicia sesión con la cuenta de administrador para continuar.</p>
        <button onClick={login} className="btn-primary flex items-center gap-2 mx-auto">
          <LogIn size={20} /> Iniciar Sesión con Google
        </button>
      </div>
    );
  }

  if (user.email !== 'yamilethklunder@gmail.com') {
    return (
      <div className="py-20 text-center">
        <h2 className="text-4xl text-brand-orange mb-8">Acceso Denegado</h2>
        <p className="text-brand-brown/60 mb-8">Tu cuenta ({user.email}) no tiene permisos de administrador.</p>
        <button onClick={logout} className="btn-primary flex items-center gap-2 mx-auto">
          <LogOut size={20} /> Cerrar Sesión
        </button>
      </div>
    );
  }

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>, callback: (base64: string) => void) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        callback(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmitProduct = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingProduct) {
      onUpdateProduct({
        ...editingProduct,
        ...formData,
        price: parseFloat(formData.price) || 0,
      });
      setEditingProduct(null);
    } else {
      onAddProduct({
        id: Date.now().toString(),
        ...formData,
        price: parseFloat(formData.price) || 0,
        image: formData.image || `https://picsum.photos/seed/${formData.name}/400/600`
      });
    }
    setFormData({ name: '', description: '', price: '', volume: '1L', category: 'licor', image: '' });
    alert(editingProduct ? 'Producto actualizado' : 'Producto añadido');
  };

  const startEdit = (p: Product) => {
    setEditingProduct(p);
    setFormData({
      name: p.name,
      description: p.description,
      price: p.price.toString(),
      volume: p.volume,
      category: p.category,
      image: p.image
    });
    setActiveTab('products');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleUpdateHeroSlide = (index: number, field: keyof HeroSlide, value: string) => {
    const newSlides = [...configForm.heroSlides];
    newSlides[index] = { ...newSlides[index], [field]: value };
    setConfigForm({ ...configForm, heroSlides: newSlides });
  };

  return (
    <section className="py-16 px-4 max-w-6xl mx-auto">
      <div className="flex justify-center mb-12 space-x-4">
        <button 
          onClick={() => setActiveTab('site')} 
          className={`px-8 py-3 rounded-full font-bold transition-all shadow-md ${activeTab === 'site' ? 'bg-brand-orange text-white scale-105' : 'bg-white text-brand-brown border border-brand-gold/20 hover:bg-brand-brown/5'}`}
        >
          Configuración del Sitio
        </button>
        <button 
          onClick={() => setActiveTab('products')} 
          className={`px-8 py-3 rounded-full font-bold transition-all shadow-md ${activeTab === 'products' ? 'bg-brand-orange text-white scale-105' : 'bg-white text-brand-brown border border-brand-gold/20 hover:bg-brand-brown/5'}`}
        >
          Gestionar Sabores
        </button>
      </div>

      {activeTab === 'site' ? (
        <div className="glass-card p-8 space-y-10">
          <div className="text-center">
            <h2 className="text-5xl text-brand-orange mb-2">Diseño del Sitio</h2>
            <p className="text-brand-brown/60 italic">Personaliza la apariencia y textos de Tropicaña</p>
          </div>
          
          <div className="space-y-8">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="space-y-2">
                <label className="block text-sm font-bold uppercase tracking-widest text-brand-gold">Título de Introducción</label>
                <input
                  type="text"
                  value={configForm.introTitle}
                  onChange={(e) => setConfigForm({ ...configForm, introTitle: e.target.value })}
                  className="w-full p-4 rounded-xl border border-brand-gold/20 focus:ring-2 focus:ring-brand-lime outline-none bg-white/50"
                />
              </div>
              <div className="space-y-2">
                <label className="block text-sm font-bold uppercase tracking-widest text-brand-gold">Celular de Contacto</label>
                <input
                  type="text"
                  value={configForm.contactPhone}
                  onChange={(e) => setConfigForm({ ...configForm, contactPhone: e.target.value })}
                  className="w-full p-4 rounded-xl border border-brand-gold/20 focus:ring-2 focus:ring-brand-lime outline-none bg-white/50"
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="block text-sm font-bold uppercase tracking-widest text-brand-gold">Texto de Introducción</label>
              <textarea
                value={configForm.introText}
                onChange={(e) => setConfigForm({ ...configForm, introText: e.target.value })}
                className="w-full p-4 rounded-xl border border-brand-gold/20 focus:ring-2 focus:ring-brand-lime outline-none h-32 bg-white/50"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              <div className="space-y-2">
                <label className="block text-sm font-bold uppercase tracking-widest text-brand-gold">Imagen de Video</label>
                <div className="flex gap-2">
                  <input
                    type="url"
                    value={configForm.videoImage}
                    onChange={(e) => setConfigForm({ ...configForm, videoImage: e.target.value })}
                    className="flex-grow p-4 rounded-xl border border-brand-gold/20 focus:ring-2 focus:ring-brand-lime outline-none bg-white/50"
                    placeholder="URL de imagen"
                  />
                  <label className="cursor-pointer bg-brand-lime p-4 rounded-xl hover:bg-brand-orange hover:text-white transition-colors">
                    <Upload size={24} />
                    <input type="file" className="hidden" accept="image/*" onChange={(e) => handleFileUpload(e, (base64) => setConfigForm({ ...configForm, videoImage: base64 }))} />
                  </label>
                </div>
              </div>
              <div className="space-y-2">
                <label className="block text-sm font-bold uppercase tracking-widest text-brand-gold">Cabecera Licores</label>
                <div className="flex gap-2">
                  <input
                    type="url"
                    value={configForm.licoresHeaderImage}
                    onChange={(e) => setConfigForm({ ...configForm, licoresHeaderImage: e.target.value })}
                    className="flex-grow p-4 rounded-xl border border-brand-gold/20 focus:ring-2 focus:ring-brand-lime outline-none bg-white/50"
                    placeholder="URL de imagen"
                  />
                  <label className="cursor-pointer bg-brand-lime p-4 rounded-xl hover:bg-brand-orange hover:text-white transition-colors">
                    <Upload size={24} />
                    <input type="file" className="hidden" accept="image/*" onChange={(e) => handleFileUpload(e, (base64) => setConfigForm({ ...configForm, licoresHeaderImage: base64 }))} />
                  </label>
                </div>
              </div>
              <div className="space-y-2">
                <label className="block text-sm font-bold uppercase tracking-widest text-brand-gold">Cabecera Toritos</label>
                <div className="flex gap-2">
                  <input
                    type="url"
                    value={configForm.toritosHeaderImage}
                    onChange={(e) => setConfigForm({ ...configForm, toritosHeaderImage: e.target.value })}
                    className="flex-grow p-4 rounded-xl border border-brand-gold/20 focus:ring-2 focus:ring-brand-lime outline-none bg-white/50"
                    placeholder="URL de imagen"
                  />
                  <label className="cursor-pointer bg-brand-lime p-4 rounded-xl hover:bg-brand-orange hover:text-white transition-colors">
                    <Upload size={24} />
                    <input type="file" className="hidden" accept="image/*" onChange={(e) => handleFileUpload(e, (base64) => setConfigForm({ ...configForm, toritosHeaderImage: base64 }))} />
                  </label>
                </div>
              </div>
            </div>

            <div className="border-t border-brand-gold/20 pt-10">
              <h3 className="text-3xl text-brand-brown mb-8 flex items-center gap-2"><ImageIcon className="text-brand-orange" /> Imágenes del Carrusel</h3>
              <div className="grid grid-cols-1 gap-8">
                {configForm.heroSlides.map((slide, idx) => (
                  <div key={idx} className="glass-card p-6 bg-brand-brown/5 border-none space-y-4">
                    <div className="flex items-center justify-between">
                      <h4 className="font-bold text-brand-orange text-xl">Slide {idx + 1}</h4>
                      <div className="h-12 w-20 rounded-lg overflow-hidden border border-brand-gold/20">
                        <img src={slide.image} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                      </div>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-1">
                        <span className="text-[10px] font-bold uppercase text-brand-brown/40">Título Principal</span>
                        <input
                          value={slide.title}
                          onChange={(e) => handleUpdateHeroSlide(idx, 'title', e.target.value)}
                          className="w-full p-3 rounded-lg border border-brand-gold/10 bg-white"
                        />
                      </div>
                      <div className="space-y-1">
                        <span className="text-[10px] font-bold uppercase text-brand-brown/40">Subtítulo</span>
                        <input
                          value={slide.subtitle}
                          onChange={(e) => handleUpdateHeroSlide(idx, 'subtitle', e.target.value)}
                          className="w-full p-3 rounded-lg border border-brand-gold/10 bg-white"
                        />
                      </div>
                      <div className="space-y-1">
                        <span className="text-[10px] font-bold uppercase text-brand-brown/40">URL de Imagen</span>
                        <div className="flex gap-2">
                          <input
                            value={slide.image}
                            onChange={(e) => handleUpdateHeroSlide(idx, 'image', e.target.value)}
                            className="flex-grow p-3 rounded-lg border border-brand-gold/10 bg-white"
                            placeholder="URL de imagen"
                          />
                          <label className="cursor-pointer bg-brand-lime p-3 rounded-lg hover:bg-brand-orange hover:text-white transition-colors">
                            <Upload size={18} />
                            <input type="file" className="hidden" accept="image/*" onChange={(e) => handleFileUpload(e, (base64) => handleUpdateHeroSlide(idx, 'image', base64))} />
                          </label>
                        </div>
                      </div>
                      <div className="space-y-1">
                        <span className="text-[10px] font-bold uppercase text-brand-brown/40">Texto del Botón</span>
                        <input
                          value={slide.cta}
                          onChange={(e) => handleUpdateHeroSlide(idx, 'cta', e.target.value)}
                          className="w-full p-3 rounded-lg border border-brand-gold/10 bg-white"
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <button 
              onClick={() => { onUpdateConfig(configForm); alert('Configuración guardada'); }}
              className="w-full btn-primary py-5 text-2xl font-display shadow-xl"
            >
              <Save size={24} className="inline mr-2" /> Guardar Cambios del Sitio
            </button>
          </div>
        </div>
      ) : (
        <div className="space-y-12">
          {/* Form Section */}
          <div className="glass-card p-8 border-2 border-dashed border-brand-gold/40">
            <h2 className="text-4xl text-brand-orange mb-8 text-center">
              {editingProduct ? 'Editar Sabor' : 'Añadir Nuevo Sabor'}
            </h2>
            <form onSubmit={handleSubmitProduct} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-bold mb-2 uppercase tracking-widest text-brand-gold">Nombre del Sabor</label>
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full p-4 rounded-xl border border-brand-gold/20 focus:ring-2 focus:ring-brand-lime outline-none bg-white"
                    placeholder="Ej: VAINILLA SUPREMA"
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold mb-2 uppercase tracking-widest text-brand-gold">Imagen del Sabor</label>
                  <div className="flex gap-2">
                    <input
                      type="url"
                      value={formData.image}
                      onChange={(e) => setFormData({ ...formData, image: e.target.value })}
                      className="flex-grow p-4 rounded-xl border border-brand-gold/20 focus:ring-2 focus:ring-brand-lime outline-none bg-white"
                      placeholder="URL de imagen"
                    />
                    <label className="cursor-pointer bg-brand-lime p-4 rounded-xl hover:bg-brand-orange hover:text-white transition-colors">
                      <Upload size={24} />
                      <input type="file" className="hidden" accept="image/*" onChange={(e) => handleFileUpload(e, (base64) => setFormData({ ...formData, image: base64 }))} />
                    </label>
                  </div>
                </div>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div>
                  <label className="block text-sm font-bold mb-2 uppercase tracking-widest text-brand-gold">Categoría</label>
                  <select
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value as 'licor' | 'torito' })}
                    className="w-full p-4 rounded-xl border border-brand-gold/20 focus:ring-2 focus:ring-brand-lime outline-none bg-white"
                  >
                    <option value="licor">Licor Artesanal</option>
                    <option value="torito">Torito Tradicional</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-bold mb-2 uppercase tracking-widest text-brand-gold">Precio (MXN)</label>
                  <input
                    type="number"
                    required
                    value={formData.price}
                    onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                    className="w-full p-4 rounded-xl border border-brand-gold/20 focus:ring-2 focus:ring-brand-lime outline-none bg-white"
                    placeholder="250.00"
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold mb-2 uppercase tracking-widest text-brand-gold">Volumen</label>
                  <input
                    type="text"
                    value={formData.volume}
                    onChange={(e) => setFormData({ ...formData, volume: e.target.value })}
                    className="w-full p-4 rounded-xl border border-brand-gold/20 focus:ring-2 focus:ring-brand-lime outline-none bg-white"
                    placeholder="1L"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-bold mb-2 uppercase tracking-widest text-brand-gold">Descripción del Sabor</label>
                <textarea
                  required
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full p-4 rounded-xl border border-brand-gold/20 focus:ring-2 focus:ring-brand-lime outline-none h-32 bg-white"
                  placeholder="Describe las notas de cata y el proceso..."
                />
              </div>

              <div className="flex gap-4">
                <button type="submit" className="flex-grow btn-primary py-4 text-xl shadow-lg">
                  {editingProduct ? 'Actualizar Sabor' : 'Publicar Nuevo Sabor'}
                </button>
                {editingProduct && (
                  <button 
                    type="button" 
                    onClick={() => { setEditingProduct(null); setFormData({ name: '', description: '', price: '', volume: '1L', category: 'licor', image: '' }); }}
                    className="px-8 py-4 bg-brand-brown text-white rounded-full font-bold"
                  >
                    Cancelar
                  </button>
                )}
              </div>
            </form>
          </div>

          {/* List Section */}
          <div className="space-y-6">
            <h3 className="text-3xl text-brand-brown border-b border-brand-gold/20 pb-4">Sabores Actuales ({products.length})</h3>
            <div className="grid grid-cols-1 gap-4">
              {products.map((p) => (
                <div key={p.id} className="glass-card p-4 flex items-center gap-6 group">
                  <img src={p.image} className="w-20 h-20 object-cover rounded-lg shadow-sm" referrerPolicy="no-referrer" />
                  <div className="flex-grow">
                    <h4 className="text-xl font-bold text-brand-brown">{p.name}</h4>
                    <p className="text-sm text-brand-brown/60 uppercase tracking-tighter">{p.category} - {p.volume} - ${p.price}</p>
                  </div>
                  <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button 
                      onClick={() => startEdit(p)}
                      className="p-2 bg-brand-lime text-brand-brown rounded-full hover:bg-brand-orange hover:text-white transition-colors"
                      title="Editar"
                    >
                      <Edit size={20} />
                    </button>
                    <button 
                      onClick={() => { if(confirm('¿Eliminar este sabor?')) onDeleteProduct(p.id); }}
                      className="p-2 bg-red-100 text-red-600 rounded-full hover:bg-red-600 hover:text-white transition-colors"
                      title="Eliminar"
                    >
                      <Trash2 size={20} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </section>
  );
};

const Footer = ({ config }: { config: SiteConfig }) => {
  return (
    <footer className="bg-brand-brown text-white pt-16 pb-8 px-4">
      <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-12 mb-12">
        <div className="text-center md:text-left">
          <h2 className="text-5xl font-display text-brand-lime mb-4">Tropicaña</h2>
          <p className="text-white/70 italic">"{config.footerText}"</p>
          <div className="flex justify-center md:justify-start space-x-4 mt-6">
            <Facebook className="hover:text-brand-lime cursor-pointer transition-colors" />
            <Instagram className="hover:text-brand-lime cursor-pointer transition-colors" />
          </div>
        </div>
        
        <div className="text-center">
          <h4 className="text-xl font-bold mb-4 uppercase tracking-widest text-brand-gold">Cel: {config.contactPhone}</h4>
          <div className="space-y-2 flex flex-col items-center">
            <div className="flex items-center space-x-2">
              <Phone size={18} className="text-brand-lime" />
              <span>Tropicaña</span>
            </div>
          </div>
        </div>

        <div className="text-center md:text-right">
          <h4 className="text-xl font-bold mb-4 uppercase tracking-widest text-brand-gold">Frutas del Trópico</h4>
          <div className="flex justify-center md:justify-end gap-4 opacity-80">
            <span title="Coco" className="text-2xl">🥥</span>
            <span title="Caña" className="text-2xl">🎋</span>
            <span title="Vainilla" className="text-2xl">🌼</span>
            <span title="Mora" className="text-2xl">🫐</span>
          </div>
        </div>
      </div>
      
      <div className="border-t border-white/10 pt-8 text-center text-sm text-white/50">
        <p className="mb-2">Elaborado, envasado y distribuido por: <span className="text-brand-lime font-bold">TROPICAÑA</span></p>
        <p>&copy; {new Date().getFullYear()} Tropicaña. Todos los derechos reservados.</p>
      </div>
    </footer>
  );
};

// --- Main App ---

export default function App() {
  const [page, setPage] = useState<Page>('home');
  const [products, setProducts] = useState<Product[]>(INITIAL_PRODUCTS);
  const [cart, setCart] = useState<Product[]>([]);
  const [siteConfig, setSiteConfig] = useState<SiteConfig>(INITIAL_SITE_CONFIG);
  const [user, setUser] = useState<User | null>(null);
  const [isAuthReady, setIsAuthReady] = useState(false);

  // Auth Listener
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setIsAuthReady(true);
    });
    return () => unsubscribe();
  }, []);

  // Firestore Listeners
  useEffect(() => {
    const productsQuery = query(collection(db, 'products'), orderBy('name'));
    const unsubscribeProducts = onSnapshot(productsQuery, (snapshot) => {
      const productsData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Product));
      if (productsData.length > 0) {
        setProducts(productsData);
      }
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, 'products');
    });

    const unsubscribeConfig = onSnapshot(doc(db, 'config', 'site'), (snapshot) => {
      if (snapshot.exists()) {
        setSiteConfig(snapshot.data() as SiteConfig);
      }
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, 'config/site');
    });

    return () => {
      unsubscribeProducts();
      unsubscribeConfig();
    };
  }, []);

  const addToCart = (product: Product) => {
    setCart([...cart, product]);
  };

  const removeFromCart = (index: number) => {
    const newCart = [...cart];
    newCart.splice(index, 1);
    setCart(newCart);
  };

  const addProduct = async (product: Product) => {
    try {
      const { id, ...data } = product;
      await setDoc(doc(db, 'products', id), data);
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, `products/${product.id}`);
    }
  };

  const updateProduct = async (updatedProduct: Product) => {
    try {
      const { id, ...data } = updatedProduct;
      await setDoc(doc(db, 'products', id), data);
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, `products/${updatedProduct.id}`);
    }
  };

  const deleteProduct = async (id: string) => {
    try {
      await deleteDoc(doc(db, 'products', id));
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `products/${id}`);
    }
  };

  const updateConfig = async (newConfig: SiteConfig) => {
    try {
      await setDoc(doc(db, 'config', 'site'), newConfig);
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, 'config/site');
    }
  };

  const cartTotal = cart.reduce((sum, item) => sum + item.price, 0);

  return (
    <div className="min-h-screen pt-20">
      <Navbar currentPage={page} setPage={setPage} cartCount={cart.length} />

      {user && user.email === 'yamilethklunder@gmail.com' && (
        <div className="fixed bottom-4 right-4 z-50">
          <button 
            onClick={logout}
            className="bg-brand-brown text-white p-3 rounded-full shadow-xl hover:bg-brand-orange transition-colors flex items-center gap-2"
            title="Cerrar Sesión"
          >
            <LogOut size={20} />
            <span className="text-xs font-bold">Admin</span>
          </button>
        </div>
      )}

      <AnimatePresence mode="wait">
        {page === 'home' && (
          <motion.div
            key="home"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <Hero config={siteConfig} setPage={setPage} />
            
            {/* Intro Section */}
            <section className="py-20 px-4 max-w-4xl mx-auto text-center">
              <h2 className="text-5xl text-brand-orange mb-8">{siteConfig.introTitle}</h2>
              <p className="text-xl leading-relaxed text-brand-brown/80 italic">
                {siteConfig.introText}
              </p>
            </section>

            {/* Video Section */}
            <section className="py-16 bg-brand-brown/5">
              <div className="max-w-5xl mx-auto px-4">
                <div className="relative aspect-video rounded-3xl overflow-hidden shadow-2xl border-8 border-white">
                  <img
                    src={siteConfig.videoImage}
                    alt="Proceso Artesanal"
                    className="w-full h-full object-cover"
                    referrerPolicy="no-referrer"
                  />
                  <div className="absolute inset-0 flex items-center justify-center bg-black/20 hover:bg-black/40 transition-colors group cursor-pointer">
                    <div className="w-20 h-20 bg-brand-lime rounded-full flex items-center justify-center group-hover:scale-110 transition-transform">
                      <Play fill="currentColor" size={32} className="text-brand-brown ml-1" />
                    </div>
                  </div>
                  <div className="absolute bottom-6 left-6 text-white">
                    <h4 className="text-2xl font-bold">{siteConfig.videoTitle}</h4>
                    <p className="opacity-80">{siteConfig.videoSubtitle}</p>
                  </div>
                </div>
              </div>
            </section>

            {/* Featured Products */}
            <section className="py-20 px-4 max-w-7xl mx-auto">
              <h2 className="text-5xl text-brand-orange mb-12 text-center">Favoritos de la Casa</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
                {products.slice(0, 4).map(p => (
                  <ProductCard key={p.id} product={p} onAddToCart={addToCart} />
                ))}
              </div>
              <div className="mt-16 text-center">
                <button onClick={() => setPage('licores')} className="btn-secondary text-lg">Ver Catálogo Completo</button>
              </div>
            </section>
          </motion.div>
        )}

        {page === 'licores' && (
          <motion.div
            key="licores"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="py-12 px-4 max-w-7xl mx-auto"
          >
            <div className="relative h-64 rounded-3xl overflow-hidden mb-12 flex items-center justify-center">
              <img src={siteConfig.licoresHeaderImage} className="absolute inset-0 w-full h-full object-cover" referrerPolicy="no-referrer" />
              <div className="absolute inset-0 bg-brand-brown/40" />
              <h2 className="relative text-6xl text-brand-lime drop-shadow-lg">Licores Artesanales</h2>
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
              {products.filter(p => p.category === 'licor').map(p => (
                <ProductCard key={p.id} product={p} onAddToCart={addToCart} />
              ))}
            </div>
          </motion.div>
        )}

        {page === 'toritos' && (
          <motion.div
            key="toritos"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="py-12 px-4 max-w-7xl mx-auto"
          >
            <div className="relative h-64 rounded-3xl overflow-hidden mb-12 flex items-center justify-center">
              <img src={siteConfig.toritosHeaderImage} className="absolute inset-0 w-full h-full object-cover" referrerPolicy="no-referrer" />
              <div className="absolute inset-0 bg-brand-brown/40" />
              <h2 className="relative text-6xl text-brand-lime drop-shadow-lg">Toritos Tradicionales</h2>
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
              {products.filter(p => p.category === 'torito').map(p => (
                <ProductCard key={p.id} product={p} onAddToCart={addToCart} />
              ))}
            </div>
          </motion.div>
        )}

        {page === 'cart' && (
          <motion.div
            key="cart"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="py-12 px-4 max-w-4xl mx-auto"
          >
            <h2 className="text-5xl text-brand-orange mb-12 text-center">Tu Carrito Tropicaña</h2>
            
            {cart.length === 0 ? (
              <div className="text-center py-20 glass-card">
                <p className="text-2xl text-brand-brown/60 mb-8">Aún no has añadido delicias a tu carrito.</p>
                <button onClick={() => setPage('licores')} className="btn-primary">Ir a la Tienda</button>
              </div>
            ) : (
              <div className="space-y-6">
                {cart.map((item, idx) => (
                  <motion.div
                    layout
                    key={`${item.id}-${idx}`}
                    className="glass-card p-4 flex items-center space-x-6"
                  >
                    <img src={item.image} className="w-20 h-20 object-cover rounded-lg" referrerPolicy="no-referrer" />
                    <div className="flex-grow">
                      <h4 className="text-xl font-bold">{item.name}</h4>
                      <p className="text-sm text-brand-brown/60">{item.category === 'licor' ? 'Licor Artesanal' : 'Torito Tradicional'} - {item.volume}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-lg">${item.price.toFixed(2)}</p>
                      <button onClick={() => removeFromCart(idx)} className="text-red-500 hover:text-red-700 p-1">
                        <Trash2 size={20} />
                      </button>
                    </div>
                  </motion.div>
                ))}
                
                <div className="glass-card p-8 mt-12">
                  <div className="flex justify-between items-center mb-6">
                    <span className="text-2xl font-bold">Total de la Compra:</span>
                    <span className="text-4xl font-bold text-brand-orange">${cartTotal.toFixed(2)} MXN</span>
                  </div>
                  <button 
                    onClick={() => {
                      if (cart.length === 0) return;

                      const infoProductos = cart.reduce((acc, item) => {
                        acc[item.name] = acc[item.name] 
                          ? { ...acc[item.name], cant: acc[item.name].cant + 1 } 
                          : { price: item.price, volume: item.volume, cant: 1 };
                        return acc;
                      }, {} as Record<string, { price: number, volume: string, cant: number }>);

                      let mensaje = `¡Hola! Me interesa realizar el siguiente pedido en *Tropicaña* 🌴🍹:\n\n`;
                      
                      Object.entries(infoProductos).forEach(([name, info]) => {
                        mensaje += `▪️ *${info.cant}x* ${name} (${info.volume}) - $${(info.price * info.cant).toFixed(2)} MXN\n`;
                      });

                      mensaje += `\n💰 *Total a pagar:* $${cartTotal.toFixed(2)} MXN\n`;
                      mensaje += `📌 _Por favor, indícame los pasos para el pago y envío._`;

                      const mensajeCodificado = encodeURIComponent(mensaje);
                      const telefonoLimpio = siteConfig.contactPhone.replace(/\s+/g, '');
                      
                      window.open(`https://wa.me/52${telefonoLimpio}?text=${mensajeCodificado}`, '_blank');
                    }}
                    className="w-full btn-primary py-5 text-2xl font-display flex items-center justify-center gap-3 shadow-xl hover:bg-brand-orange transition-colors"
                  >
                    <Phone size={24} /> Enviar Pedido por WhatsApp
                  </button>
                </div>
              </div>
            )}
          </motion.div>
        )}

        {page === 'admin' && (
          <motion.div
            key="admin"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <AdminPanel 
              products={products}
              onAddProduct={addProduct}
              onUpdateProduct={updateProduct}
              onDeleteProduct={deleteProduct}
              siteConfig={siteConfig}
              onUpdateConfig={updateConfig}
              user={user}
            />
          </motion.div>
        )}
      </AnimatePresence>

      <Footer config={siteConfig} />
    </div>
  );
}