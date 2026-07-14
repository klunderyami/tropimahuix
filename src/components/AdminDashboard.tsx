import { FormEvent, useEffect, useMemo, useRef, useState } from 'react';
import toast, { Toaster } from 'react-hot-toast';
import { signOut } from 'firebase/auth';
import { auth } from '../firebase.js';
import {
  subscribeToProducts,
  createProduct,
  updateProduct,
  deleteProduct,
  getOrders,
  updateOrderStatus,
  getSiteConfig,
  updateSiteConfig,
  addGalleryPhoto,
  uploadMedia,
  getGalleryPhotos,
  deleteGalleryPhoto,
} from '../supabase.js';
import type { GalleryPhoto, NewProduct, Order, OrderStatus, Product, SiteConfig } from '../types.js';

type AdminTab = 'products' | 'gallery' | 'orders';

const blankProduct: NewProduct = {
  name: '',
  description: '',
  price: 0,
  volume: '750ml',
  image: '',
  category: 'licor',
  stock: 0,
  active: true,
  gallery: [],
};

const statusLabels: Record<OrderStatus | 'all', string> = {
  all: 'Todas',
  pending: 'Pendientes',
  paid: 'Pagadas',
  failed: 'Fallidas',
  delivered: 'Entregadas',
};

async function getAccessToken(): Promise<string> {
  const token = await auth.currentUser?.getIdToken();
  if (!token) throw new Error('No hay una sesión administrativa activa.');
  return token;
}

const AdminDashboard = () => {
  const [activeTab, setActiveTab] = useState<AdminTab>('products');
  const [products, setProducts] = useState<Product[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [galleryPhotos, setGalleryPhotos] = useState<GalleryPhoto[]>([]);
  const [formState, setFormState] = useState<NewProduct>(blankProduct);
  const [editingProductId, setEditingProductId] = useState<string | null>(null);
  const [siteConfig, setSiteConfig] = useState<Partial<SiteConfig>>({});
  const [orderFilter, setOrderFilter] = useState<OrderStatus | 'all'>('paid');
  const [isSavingProduct, setIsSavingProduct] = useState(false);
  const [isSavingConfig, setIsSavingConfig] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [productToDelete, setProductToDelete] = useState<string | null>(null);

  // State para el logo del sitio
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const logoFileInputRef = useRef<HTMLInputElement>(null);

  // Subida de imagen de producto
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // State para la galería de producto
  const [galleryFiles, setGalleryFiles] = useState<File[]>([]);
  const [galleryPreviews, setGalleryPreviews] = useState<{ url: string; type: string }[]>([]);
  const galleryFileInputRef = useRef<HTMLInputElement>(null);

  // Función para comprimir imagen (reutilizamos la lógica de firebase.ts)
  const compressImageLocally = async (file: File): Promise<File> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const img = new Image();
        img.onload = () => {
          let width = img.width;
          let height = img.height;
          const maxWidth = 800;
          
          if (width > maxWidth) {
            height = Math.round((height * maxWidth) / width);
            width = maxWidth;
          }

          const canvas = document.createElement('canvas');
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          
          if (!ctx) {
            reject(new Error('No se pudo crear el contexto de canvas'));
            return;
          }

          ctx.imageSmoothingEnabled = true;
          ctx.imageSmoothingQuality = 'high';
          ctx.drawImage(img, 0, 0, width, height);

          canvas.toBlob(
            (blob) => {
              if (!blob) {
                reject(new Error('Error al comprimir la imagen'));
                return;
              }
              
              const compressedFile = new File([blob], file.name.replace(/\.[^/.]+$/, '.jpg'), {
                type: 'image/jpeg',
                lastModified: Date.now(),
              });
              
              const reduction = Math.round((1 - compressedFile.size / file.size) * 100);
              console.log(`📸 Imagen comprimida al seleccionar: ${(file.size / 1024).toFixed(1)}KB → ${(compressedFile.size / 1024).toFixed(1)}KB (${reduction}% reducción)`);
              
              resolve(compressedFile);
            },
            'image/jpeg',
            0.7
          );
        };
        img.onerror = () => reject(new Error('Error al cargar la imagen'));
        img.src = e.target?.result as string;
      };
      reader.onerror = () => reject(new Error('Error al leer el archivo'));
      reader.readAsDataURL(file);
    });
  };

  // Foto Gallery state
  const [galleryFile, setGalleryFile] = useState<File | null>(null);
  const [galleryPreview, setGalleryPreview] = useState<string | null>(null);
  const [galleryLabel, setGalleryLabel] = useState('');
  const [isSavingPhoto, setIsSavingPhoto] = useState(false);
  const galleryPhotoInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    // --- Product Listener (Supabase realtime) ---
    const unsubscribeProducts = subscribeToProducts(
      (nextProducts) => setProducts(nextProducts),
      (err) => console.error('Error en productos:', err),
    );

    // --- Orders fetcher (Supabase) ---
    const fetchOrders = async () => {
      try {
        const token = await getAccessToken();
        const nextOrders = await getOrders(token);
        setOrders(nextOrders);
      } catch (err) {
        console.error('Error fetching orders:', err);
      }
    };
    fetchOrders();

    // --- Site Config Fetcher (Supabase) ---
    const fetchConfig = async () => {
      try {
        const config = await getSiteConfig();
        if (config) setSiteConfig(config);
      } catch (err) {
        console.error(err);
      }
    };
    fetchConfig();

    // --- Gallery Photos Fetcher ---
    const fetchGalleryPhotos = async () => {
      try {
        const photos = await getGalleryPhotos();
        setGalleryPhotos(photos);
      } catch (err) {
        console.error('Error fetching gallery photos:', err);
      }
    };
    fetchGalleryPhotos();

    return () => {
      unsubscribeProducts();
    };
  }, []);

  const filteredOrders = useMemo(
    () => (orderFilter === 'all' ? orders : orders.filter((order) => order.status === orderFilter)),
    [orderFilter, orders],
  );

  const metrics = useMemo(() => {
    const paidOrders = orders.filter((order) => order.status === 'paid' || order.status === 'delivered');
    return {
      activeProducts: products.filter((product) => product.active !== false).length,
      lowStock: products.filter((product) => product.active !== false && product.stock <= 3).length,
      paidOrders: paidOrders.length,
      revenue: paidOrders.reduce((sum, order) => sum + order.total, 0),
    };
  }, [orders, products]);

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0] ?? null;
    
    if (file) {
      try {
        // Comprimir imagen inmediatamente al seleccionarla
        console.log('📸 Comprimiendo imagen seleccionada...');
        const compressedFile = await compressImageLocally(file);
        setSelectedFile(compressedFile);
        
        // Actualizar preview con la imagen comprimida
        const reader = new FileReader();
        reader.onloadend = () => {
          setImagePreview(reader.result as string);
        };
        reader.readAsDataURL(compressedFile);
        
        console.log(`✅ Imagen lista para subir: ${(compressedFile.size / 1024).toFixed(1)}KB`);
      } catch (err) {
        console.error('Error al comprimir imagen:', err);
        // Si falla la compresión, usar la imagen original
        setSelectedFile(file);
        const reader = new FileReader();
        reader.onloadend = () => {
          setImagePreview(reader.result as string);
        };
        reader.readAsDataURL(file);
      }
    } else {
      setSelectedFile(null);
      setImagePreview(null);
    }
  };

  const handleGalleryFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    if (!files.length) return;

    const newFiles: File[] = [];
    const newPreviews: { url: string; type: string }[] = [];

    for (const file of files) {
      if (file.type.startsWith('image/')) {
        try {
          const compressedFile = await compressImageLocally(file);
          newFiles.push(compressedFile);
          newPreviews.push({ url: URL.createObjectURL(compressedFile), type: compressedFile.type });
        } catch (err) {
          toast.error(`Error al procesar la imagen ${file.name}`);
        }
      } else if (file.type.startsWith('video/')) {
        const MAX_VIDEO_SIZE_MB = 50;
        if (file.size > MAX_VIDEO_SIZE_MB * 1024 * 1024) {
          toast.error(`El video "${file.name}" es demasiado grande (máx. ${MAX_VIDEO_SIZE_MB}MB).`);
          continue;
        }
        newFiles.push(file);
        newPreviews.push({ url: URL.createObjectURL(file), type: file.type });
      } else {
        toast.error(`Archivo no soportado: ${file.name}`);
      }
    }

    setGalleryFiles((current) => [...current, ...newFiles]);
    setGalleryPreviews((current) => [...current, ...newPreviews]);
  };

  const handleGalleryPhotoSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0] ?? null;
    if (file) {
      try {
        const compressedFile = await compressImageLocally(file);
        setGalleryFile(compressedFile);
        const reader = new FileReader();
        reader.onloadend = () => {
          setGalleryPreview(reader.result as string);
        };
        reader.readAsDataURL(compressedFile);
      } catch (err) {
        toast.error('Error al procesar la imagen.');
        setGalleryFile(file);
        setGalleryPreview(URL.createObjectURL(file));
      }
    } else {
      setGalleryFile(null);
      setGalleryPreview(null);
    }
  };

  const handleLogoSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0] ?? null;
    if (file) {
      try {
        const compressedFile = await compressImageLocally(file);
        setLogoFile(compressedFile);
        const reader = new FileReader();
        reader.onloadend = () => {
          setLogoPreview(reader.result as string);
        };
        reader.readAsDataURL(compressedFile);
      } catch (err) {
        toast.error('Error al procesar el logo.');
        setLogoFile(file);
        setLogoPreview(URL.createObjectURL(file));
      }
    }
  };

  const resetForm = () => {
    setEditingProductId(null);
    setFormState(blankProduct);
    setSelectedFile(null);
    setImagePreview(null);
    // Limpiar previews de galería para evitar memory leaks
    galleryPreviews.forEach((p) => URL.revokeObjectURL(p.url));
    setGalleryFiles([]);
    setGalleryPreviews([]);
  };

  const removeNewGalleryItem = (indexToRemove: number) => {
    URL.revokeObjectURL(galleryPreviews[indexToRemove].url);
    setGalleryFiles((files) => files.filter((_, i) => i !== indexToRemove));
    setGalleryPreviews((previews) => previews.filter((_, i) => i !== indexToRemove));
  };

  const handleProductSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsSavingProduct(true);

    try {
      // 1. Subir imagen a Supabase Storage si hay un archivo seleccionado
      let imageUrl = formState.image;
      if (selectedFile) {
        setIsUploadingImage(true);
        const productName = formState.name.trim() || 'producto';
        try {
          // Convertir archivo a base64
          const imageBase64 = await fileToBase64(selectedFile);
          const accessToken = await getAccessToken();
          imageUrl = await uploadMedia(imageBase64, productName, accessToken, selectedFile.type);
        } catch (imageErr) {
          setIsUploadingImage(false);
          const imageErrorMsg = imageErr instanceof Error ? imageErr.message : 'Error al subir imagen';
          throw new Error(`📸 ${imageErrorMsg}`);
        }
        setIsUploadingImage(false);
      }

      // 3. Subir archivos de la galería si los hay
      const newGalleryUrls: string[] = [];
      if (galleryFiles.length > 0) {
        toast.loading('Subiendo archivos de galería...', { id: 'gallery-upload' });
        for (const file of galleryFiles) {
          const base64 = await fileToBase64(file);
          const accessToken = await getAccessToken();
          const url = await uploadMedia(base64, file.name, accessToken, file.type);
          newGalleryUrls.push(url);
        }
        toast.success('Galería subida.', { id: 'gallery-upload' });
      }

      const accessToken = await getAccessToken();
      const finalGallery = [...(formState.gallery || []), ...newGalleryUrls];

      const productPayload = {
        ...formState,
        image: imageUrl,
        gallery: finalGallery,
        price: Number(formState.price),
        stock: Number(formState.stock),
        category: formState.category.toLowerCase() as 'licor' | 'torito', // Forzar a minúsculas
      };

      // 2. Guardar/Actualizar producto con la URL de la imagen
      // Con timeout de 8 segundos integrado en createProduct/updateProduct
      if (editingProductId) {
        await updateProduct(
          editingProductId,
          productPayload,
          accessToken,
        );
      } else {
        await createProduct(
          productPayload,
          accessToken,
        );
      }

      toast.success(editingProductId ? 'Producto actualizado correctamente.' : 'Producto creado correctamente.');
      resetForm();
    } catch (caughtError) {
      // Mostrar error detallado
      console.error('❌ [AdminDashboard] Error al guardar producto:', caughtError);
      
      let errorMessage = 'No se pudo guardar el producto.';
      
      if (caughtError instanceof Error) {
        errorMessage = caughtError.message;
        
        // Detectar tipos específicos de errores
        if (caughtError.message.includes('Timeout')) {
          errorMessage = '⏱️ ' + caughtError.message;
        } else if (caughtError.message.includes('Failed to fetch')) {
          errorMessage = '🌐 Error de conexión: Verifica tu conexión a internet.';
        } else if (caughtError.message.includes('Missing authorization')) {
          errorMessage = '🔐 Sesión expirada. Por favor, inicia sesión nuevamente.';
        } else if (caughtError.message.includes('database')) {
          errorMessage = '💾 Error de base de datos: El servidor está sobrecargado. Intenta de nuevo en 30 segundos.';
        } else if (caughtError.message.toLowerCase().includes('bucket not found')) {
          errorMessage = "🪣 Error: El bucket 'productos' no se encontró en Supabase Storage. Por favor, créalo manualmente desde tu panel de Supabase y asegúrate de que sea público.";
        }
      }
      
      toast.error(errorMessage);
      
      // Alerta visual si es un error crítico
      if (errorMessage.includes('Timeout') || errorMessage.includes('base de datos')) {
        console.warn('⚠️ Notificando al usuario sobre error crítico:', errorMessage);
      }
    } finally {
      // Asegurar que los estados de loading se desactiven SIEMPRE, pase lo que pase
      // Esta sección se ejecuta GARANTIZADO incluso si hay error
      setIsSavingProduct(false);
      setIsUploadingImage(false);
    }
  };

  // Helper para convertir archivo a base64
  const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.onerror = () => reject(new Error('Error al leer el archivo de imagen'));
      reader.readAsDataURL(file);
    });
  };

  const handleEditProduct = (product: Product) => {
    setEditingProductId(product.id);
    setFormState({
      name: product.name,
      description: product.description,
      price: product.price,
      volume: product.volume,
      image: product.image,
      category: product.category,
      stock: product.stock,
      active: product.active !== false,
      gallery: product.gallery || [],
    });
    galleryPreviews.forEach((p) => URL.revokeObjectURL(p.url));
    setGalleryFiles([]);
    setGalleryPreviews([]);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleDeleteProductClick = (productId: string) => {
    setProductToDelete(productId);
    setShowDeleteModal(true);
  };

  const handleDeleteProductConfirm = async () => {
    if (!productToDelete) return;
    try {
      const accessToken = await getAccessToken();
      await deleteProduct(productToDelete, accessToken);
      toast.success('Producto eliminado permanentemente.');
    } catch (caughtError) {
      console.error('❌ [AdminDashboard] Error al eliminar producto:', caughtError);
      toast.error(caughtError instanceof Error ? caughtError.message : 'No se pudo eliminar el producto.');
    } finally {
      setShowDeleteModal(false);
      setProductToDelete(null);
    }
  };

  const handleDeleteProductCancel = () => {
    setShowDeleteModal(false);
    setProductToDelete(null);
  };

  const handleOrderStatus = async (orderId: string, status: OrderStatus) => {
    try {
      const accessToken = await getAccessToken();
      await updateOrderStatus(orderId, status, accessToken);
      // Update local state instead of re-fetching all orders
      setOrders((prevOrders) =>
        prevOrders.map((order) => (order.id === orderId ? { ...order, status } : order)),
      );
      toast.success('Orden actualizada.');
    } catch (caughtError) {
      console.error('❌ [AdminDashboard] Error al actualizar orden:', caughtError);
      toast.error(caughtError instanceof Error ? caughtError.message : 'No se pudo actualizar la orden.');
    }
  };

  const handleConfigSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsSavingConfig(true);

    let configToSave = { ...siteConfig };

    try {
      const accessToken = await getAccessToken();

      // Subir logo si hay uno nuevo seleccionado
      if (logoFile) {
        toast.loading('Subiendo nuevo logo...', { id: 'logo-upload' });
        const imageBase64 = await fileToBase64(logoFile);
        const logoUrl = await uploadMedia(imageBase64, logoFile.name, accessToken, logoFile.type);
        configToSave.logoUrl = logoUrl;
        toast.success('Logo subido.', { id: 'logo-upload' });
      }

      await updateSiteConfig(configToSave, accessToken);
      toast.success('Ajustes del sitio actualizados.');
    } catch (caughtError) {
      console.error('❌ [AdminDashboard] Error al guardar configuración:', caughtError);
      toast.error(caughtError instanceof Error ? caughtError.message : 'No se pudieron guardar los ajustes.');
    } finally {
      setIsSavingConfig(false);
    }
  };

  const handlePhotoSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!galleryFile) {
      toast.error('Por favor, selecciona una imagen para subir.');
      return;
    }
    setIsSavingPhoto(true);

    try {
      const accessToken = await getAccessToken();
      const imageBase64 = await fileToBase64(galleryFile);
      const imageUrl = await uploadMedia(imageBase64, galleryFile.name, accessToken, galleryFile.type);

      const newPhotoId = await addGalleryPhoto(imageUrl, galleryLabel || 'Galería', accessToken);

      setGalleryPhotos(current => [{ id: newPhotoId, url: imageUrl, label: galleryLabel || 'Galería', createdAt: new Date().toISOString() }, ...current]);
      toast.success('Foto agregada a la galería.');

      // Reset form
      setGalleryFile(null);
      setGalleryPreview(null);
      setGalleryLabel('');
      if (galleryPhotoInputRef.current) galleryPhotoInputRef.current.value = '';

    } catch (caughtError) {
      console.error('❌ [AdminDashboard] Error al guardar foto:', caughtError);
      toast.error(caughtError instanceof Error ? caughtError.message : 'No se pudo guardar la foto.');
    } finally {
      setIsSavingPhoto(false);
    }
  };

  const handleDeleteGalleryPhoto = async (photoId: string) => {
    if (!window.confirm('¿Estás seguro de que quieres eliminar esta foto de la galería?')) {
      return;
    }
    try {
      const accessToken = await getAccessToken();
      await deleteGalleryPhoto(photoId, accessToken);
      // Update state locally to remove the photo instantly from the UI
      setGalleryPhotos(currentPhotos => currentPhotos.filter(p => p.id !== photoId));
      toast.success('Foto eliminada de la galería.');
    } catch (caughtError) {
      console.error('❌ [AdminDashboard] Error al eliminar foto de la galería:', caughtError);
      toast.error(caughtError instanceof Error ? caughtError.message : 'No se pudo eliminar la foto.');
    }
  };

  const handleSignOut = async () => {
    await signOut(auth);
    window.location.href = '/';
  };

  const tabs: { id: AdminTab; label: string; icon: string }[] = [
    { id: 'products', label: 'Productos y Ajustes', icon: '📦' },
    { id: 'gallery', label: 'Galería', icon: '🖼️' },
    { id: 'orders', label: 'Pedidos', icon: '📋' },
  ];

  return (
    <main className="min-h-screen bg-paper px-4 py-10 font-sans text-stone-900 sm:px-6 lg:px-8">
      <Toaster position="bottom-center" toastOptions={{ duration: 5000, className: 'font-semibold' }} />
      <div className="mx-auto max-w-7xl">
        <header className="mb-8 flex flex-col gap-5 rounded-[2rem] border border-brand-gold/20 bg-brand-brown px-6 py-7 text-white shadow-2xl sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.35em] text-brand-gold">Tropicaña Admin</p>
            <h1 className="mt-3 text-5xl font-display">Panel de control</h1>
            <p className="mt-2 max-w-2xl text-sm text-stone-200">
              Gestión de productos, galería de fotos y monitor de pedidos.
            </p>
          </div>
          <button
            onClick={handleSignOut}
            className="rounded-full border border-white/20 bg-white/10 px-5 py-3 text-sm font-bold text-white transition hover:bg-white/20"
          >
            Cerrar sesión
          </button>
        </header>

        {/* Métricas */}
        <section className="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[
            ['Productos activos', metrics.activeProducts.toString()],
            ['Stock bajo', metrics.lowStock.toString()],
            ['Pedidos pagados', metrics.paidOrders.toString()],
            ['Ingresos totales', `$${metrics.revenue.toFixed(2)}`],
          ].map(([label, value]) => (
            <div key={label} className="glass-card border border-stone-200 bg-white/85 p-5 shadow-lg">
              <p className="text-xs font-bold uppercase tracking-[0.2em] text-stone-400">{label}</p>
              <p className="mt-2 text-3xl font-black text-brand-brown">{value}</p>
            </div>
          ))}
        </section>

        {/* Pestañas */}
        <div className="mb-8 flex flex-wrap gap-2 rounded-2xl border border-stone-200 bg-white/70 p-2 shadow-sm">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 rounded-2xl px-5 py-3 text-sm font-bold transition ${
                activeTab === tab.id
                  ? 'bg-brand-orange text-white shadow-md'
                  : 'text-stone-600 hover:bg-stone-100'
              }`}
            >
              <span>{tab.icon}</span>
              <span>{tab.label}</span>
            </button>
          ))}
        </div>

        {/* TAB: Gestión de Productos */}
        {activeTab === 'products' && (
          <section className="grid gap-8 xl:grid-cols-[0.9fr_1.1fr]">
            <div className="flex flex-col gap-8">
              <div className="glass-card h-fit border border-brand-gold/20 bg-white/90 p-6 shadow-xl">
                <div className="mb-6">
                  <p className="text-xs font-bold uppercase tracking-[0.3em] text-brand-orange">Catálogo</p>
                  <h2 className="mt-2 text-4xl font-display text-brand-brown">
                    {editingProductId ? 'Editar producto' : 'Nuevo producto'}
                  </h2>
                </div>

                <form onSubmit={handleProductSubmit} className="grid gap-4">
                  {/* Subida de imagen con preview */}
                  <div>
                    <div
                      onClick={() => fileInputRef.current?.click()}
                      className={`flex cursor-pointer flex-col items-center justify-center rounded-3xl border-2 border-dashed px-4 py-6 transition ${
                        imagePreview ? 'border-emerald-300 bg-emerald-50/50' : 'border-stone-300 bg-white hover:border-brand-orange hover:bg-brand-orange/5'
                      }`}
                    >
                      {imagePreview ? (
                        <img src={imagePreview} alt="Vista previa" className="mb-3 max-h-40 rounded-2xl object-contain shadow-sm" />
                      ) : formState.image && !selectedFile ? (
                        <img src={formState.image} alt="Imagen actual" className="mb-3 max-h-40 rounded-2xl object-contain shadow-sm" />
                      ) : (
                        <svg className="mb-3 h-10 w-10 text-stone-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                      )}
                      <p className="text-sm font-semibold text-stone-500">
                        {imagePreview || (formState.image && !selectedFile)
                          ? 'Toca para cambiar imagen'
                          : 'Haz clic para seleccionar imagen'}
                      </p>
                      <p className="mt-1 text-xs text-stone-400">PNG, JPG o WebP</p>
                    </div>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      onChange={handleFileSelect}
                      className="hidden"
                    />
                    <input type="hidden" name="image" value={formState.image} />
                  </div>

                  {/* Galería de Producto */}
                  <div>
                    <label className="text-sm font-semibold text-stone-700">Galería de Producto (imágenes y videos)</label>
                    <div className="mt-2 grid grid-cols-3 gap-2 sm:grid-cols-4">
                      {/* Previews de la galería existente */}
                      {formState.gallery?.map((url, index) => (
                        <div key={`existing-${index}`} className="relative group">
                          {url.match(/\.(mp4|webm)$/i) ? (
                            <video src={url} controls className="h-24 w-full rounded-lg object-cover" />
                          ) : (
                            <img src={url} alt={`Galería ${index + 1}`} className="h-24 w-full rounded-lg object-cover" />
                          )}
                          <button
                            type="button"
                            onClick={() => setFormState(current => ({...current, gallery: current.gallery?.filter((_, i) => i !== index)}))}
                            className="absolute -right-1 -top-1 h-6 w-6 rounded-full border border-rose-200 bg-white text-rose-500 opacity-0 transition group-hover:opacity-100"
                          >
                            &times;
                          </button>
                        </div>
                      ))}
                      {/* Previews de nuevos archivos */}
                      {galleryPreviews.map((preview, index) => (
                        <div key={`new-${index}`} className="relative group">
                          {preview.type.startsWith('video/') ? (
                            <video src={preview.url} controls className="h-24 w-full rounded-lg object-cover" />
                          ) : (
                            <img src={preview.url} alt={`Nuevo ${index + 1}`} className="h-24 w-full rounded-lg object-cover" />
                          )}
                          <button
                            type="button"
                            onClick={() => removeNewGalleryItem(index)}
                            className="absolute -right-1 -top-1 h-6 w-6 rounded-full border border-rose-200 bg-white text-rose-500 opacity-0 transition group-hover:opacity-100"
                          >
                            &times;
                          </button>
                        </div>
                      ))}
                    </div>
                    <button type="button" onClick={() => galleryFileInputRef.current?.click()} className="mt-3 w-full rounded-xl border border-dashed border-stone-300 py-2 text-center text-xs font-semibold text-stone-600 hover:border-brand-orange hover:text-brand-orange">
                      + Agregar Medios
                    </button>
                    <input ref={galleryFileInputRef} type="file" accept="image/*,video/*" multiple onChange={handleGalleryFileSelect} className="hidden" />
                  </div>

                  <input
                    id="product-name"
                    name="product-name"
                    value={formState.name}
                    onChange={(event) => setFormState((current) => ({ ...current, name: event.target.value }))}
                    placeholder="Nombre del producto"
                    required
                    className="rounded-3xl border border-stone-200 bg-white px-4 py-3 text-sm outline-none focus:border-brand-orange focus:ring-2 focus:ring-brand-orange/20"
                  />
                  <textarea
                    id="product-description"
                    name="product-description"
                    value={formState.description}
                    onChange={(event) => setFormState((current) => ({ ...current, description: event.target.value }))}
                    placeholder="Descripción"
                    required
                    className="min-h-28 rounded-3xl border border-stone-200 bg-white px-4 py-3 text-sm outline-none focus:border-brand-orange focus:ring-2 focus:ring-brand-orange/20"
                  />
                  <div className="grid gap-4 sm:grid-cols-2">
                    <input
                      id="product-price"
                      name="product-price"
                      type="number"
                      min={1}
                      step="0.01"
                      value={formState.price}
                      onChange={(event) => setFormState((current) => ({ ...current, price: Number(event.target.value) }))}
                      placeholder="Precio"
                      required
                      className="rounded-3xl border border-stone-200 bg-white px-4 py-3 text-sm outline-none focus:border-brand-orange focus:ring-2 focus:ring-brand-orange/20"
                    />
                    <input
                      id="product-stock"
                      name="product-stock"
                      type="number"
                      min={0}
                      step={1}
                      value={formState.stock}
                      onChange={(event) => setFormState((current) => ({ ...current, stock: Number(event.target.value) }))}
                      placeholder="Stock"
                      required
                      className="rounded-3xl border border-stone-200 bg-white px-4 py-3 text-sm outline-none focus:border-brand-orange focus:ring-2 focus:ring-brand-orange/20"
                    />
                  </div>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <input
                      id="product-volume"
                      name="product-volume"
                      value={formState.volume}
                      onChange={(event) => setFormState((current) => ({ ...current, volume: event.target.value }))}
                      placeholder="Volumen (ej: 750ml)"
                      required
                      className="rounded-3xl border border-stone-200 bg-white px-4 py-3 text-sm outline-none focus:border-brand-orange focus:ring-2 focus:ring-brand-orange/20"
                    />
                    <select
                      id="product-category"
                      name="product-category"
                      value={formState.category}
                      onChange={(event) =>
                        setFormState((current) => ({
                          ...current,
                          category: event.target.value === 'torito' ? 'torito' : 'licor',
                        }))
                      }
                      className="rounded-3xl border border-stone-200 bg-white px-4 py-3 text-sm outline-none focus:border-brand-orange focus:ring-2 focus:ring-brand-orange/20"
                    >
                      <option value="licor">Licor</option>
                      <option value="torito">Torito</option>
                    </select>
                  </div>
                  <div className="flex items-center gap-3">
                    <input
                      id="product-active"
                      type="checkbox"
                      checked={formState.active !== false}
                      onChange={(event) => setFormState((current) => ({ ...current, active: event.target.checked }))}
                      className="h-5 w-5 accent-brand-orange"
                    />
                    <label htmlFor="product-active" className="text-sm font-semibold text-stone-700">
                      Visible en catálogo
                    </label>
                  </div>
                  <div className="flex flex-col gap-3 sm:flex-row">
                    <button
                      type="submit"
                      disabled={isSavingProduct || isUploadingImage}
                      className="flex-1 rounded-3xl bg-brand-orange px-6 py-4 text-sm font-bold text-white transition hover:bg-brand-orange/90 disabled:bg-stone-300"
                    >
                      {isUploadingImage ? 'Subiendo imagen...' : isSavingProduct ? 'Guardando...' : editingProductId ? 'Actualizar producto' : 'Crear producto'}
                    </button>
                    {editingProductId && (
                      <button
                        type="button"
                        onClick={resetForm}
                        className="rounded-3xl border border-stone-300 px-6 py-4 text-sm font-bold text-stone-700 hover:bg-stone-100"
                      >
                        Cancelar
                      </button>
                    )}
                  </div>
                </form>
              </div>

              {/* Ajustes del Sitio */}
              <div className="glass-card h-fit border border-brand-gold/20 bg-white/90 p-6 shadow-xl">
                <div className="mb-6">
                  <p className="text-xs font-bold uppercase tracking-[0.3em] text-brand-orange">Ajustes</p>
                  <h2 className="mt-2 text-4xl font-display text-brand-brown">Contenido Global</h2>
                </div>
                <form onSubmit={handleConfigSubmit} className="grid gap-4">
                  {/* Logo Uploader */}
                  <div>
                    <label className="text-sm font-semibold text-stone-700">Logo del Sitio</label>
                    <div
                      onClick={() => logoFileInputRef.current?.click()}
                      className="mt-2 flex cursor-pointer items-center gap-4 rounded-3xl border-2 border-dashed border-stone-300 bg-white p-4 transition hover:border-brand-orange"
                    >
                      {(logoPreview || siteConfig.logoUrl) && (
                        <img
                          src={logoPreview || siteConfig.logoUrl}
                          alt="Logo"
                          className="h-16 w-16 rounded-full object-contain"
                        />
                      )}
                      <div className="text-sm">
                        <p className="font-semibold text-stone-600">
                          {logoPreview || siteConfig.logoUrl ? 'Cambiar logo' : 'Seleccionar logo'}
                        </p>
                        <p className="text-xs text-stone-400">Recomendado: SVG, PNG transparente</p>
                      </div>
                    </div>
                    <input
                      ref={logoFileInputRef}
                      type="file" accept="image/*"
                      onChange={handleLogoSelect} className="hidden"
                    />
                  </div>
                  <input
                    id="config-hero-title"
                    name="config-hero-title"
                    value={siteConfig.heroTitle || ''}
                    onChange={(event) => setSiteConfig((current) => ({ ...current, heroTitle: event.target.value }))}
                    placeholder="Titular del Hero"
                    className="rounded-3xl border border-stone-200 bg-white px-4 py-3 text-sm outline-none focus:border-brand-orange focus:ring-2 focus:ring-brand-orange/20"
                  />
                  <input
                    id="config-contact-phone"
                    name="config-contact-phone"
                    value={siteConfig.contactPhone || ''}
                    onChange={(event) => setSiteConfig((current) => ({ ...current, contactPhone: event.target.value }))}
                    placeholder="Teléfono de Contacto"
                    className="rounded-3xl border border-stone-200 bg-white px-4 py-3 text-sm outline-none focus:border-brand-orange focus:ring-2 focus:ring-brand-orange/20"
                  />
                  <button
                    type="submit"
                    disabled={isSavingConfig}
                    className="flex-1 rounded-3xl bg-brand-brown px-6 py-4 text-sm font-bold text-white transition hover:bg-brand-brown/90 disabled:bg-stone-300"
                  >
                    {isSavingConfig ? 'Guardando...' : 'Guardar Ajustes del Sitio'}
                  </button>
                </form>
              </div>
            </div>

            {/* Lista de Productos */}
            <div className="glass-card border border-stone-200 bg-white/90 p-6 shadow-xl">
              <div className="mb-6 flex items-center justify-between gap-4">
                <div>
                  <p className="text-xs font-bold uppercase tracking-[0.3em] text-brand-orange">Inventario</p>
                  <h2 className="mt-2 text-4xl font-display text-brand-brown">
                    Todos los productos
                    <span className="ml-2 text-base font-normal text-stone-400">({products.length})</span>
                  </h2>
                </div>
              </div>
              {products.length === 0 ? (
                <div className="rounded-3xl border border-stone-200 bg-stone-50 p-8 text-center text-sm font-semibold text-stone-500">
                  No hay productos. Crea tu primer producto.
                </div>
              ) : (
                <div className="grid gap-4">
                  {products.map((product) => (
                    <article key={product.id} className="grid gap-4 rounded-3xl border border-stone-200 bg-white p-4 shadow-sm lg:grid-cols-[96px_1fr_auto]">
                      <img src={product.image} alt={product.name} className="h-24 w-24 rounded-2xl object-contain" />
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <h3 className="text-lg font-black text-brand-brown">{product.name}</h3>
                          <span className="rounded-full bg-brand-lime px-3 py-1 text-xs font-bold text-brand-brown">{product.category}</span>
                          {product.active === false && (
                            <span className="rounded-full bg-stone-200 px-3 py-1 text-xs font-bold text-stone-600">Archivado</span>
                          )}
                        </div>
                        <p className="mt-1 line-clamp-2 text-sm text-stone-500">{product.description}</p>
                        <p className="mt-2 text-sm font-bold text-stone-700">
                          ${product.price.toFixed(2)} MXN · {product.volume} · Stock {product.stock}
                        </p>
                      </div>
                      <div className="flex items-center gap-2 lg:flex-col lg:items-stretch">
                        <button
                          onClick={() => handleEditProduct(product)}
                          className="flex-1 rounded-full bg-brand-brown px-4 py-2 text-xs font-bold text-white hover:bg-brand-brown/90 lg:flex-none"
                        >
                          Editar
                        </button>
                        <button
                          onClick={() => handleDeleteProductClick(product.id)}
                          className="flex-1 rounded-full border border-rose-300 bg-rose-50 px-4 py-2 text-xs font-bold text-rose-700 hover:bg-rose-100 lg:flex-none"
                        >
                          Eliminar
                        </button>
                      </div>
                    </article>
                  ))}
                </div>
              )}
            </div>
          </section>
        )}

        {/* TAB: Galería de Fotos */}
        {activeTab === 'gallery' && (
          <section className="grid gap-8 xl:grid-cols-[0.5fr_1fr]">
            <div className="glass-card h-fit border border-brand-gold/20 bg-white/90 p-6 shadow-xl">
              <div className="mb-6">
                <p className="text-xs font-bold uppercase tracking-[0.3em] text-brand-orange">Galería</p>
                <h2 className="mt-2 text-4xl font-display text-brand-brown">Subir Foto</h2>
                <p className="mt-2 text-sm text-stone-500">
                  Las fotos subidas aquí aparecerán en el carrusel de la página principal.
                </p>
              </div>
              <form onSubmit={handlePhotoSubmit} className="grid gap-4">
                <div>
                  <div
                    onClick={() => galleryPhotoInputRef.current?.click()}
                    className={`flex cursor-pointer flex-col items-center justify-center rounded-3xl border-2 border-dashed px-4 py-6 transition ${
                      galleryPreview ? 'border-emerald-300 bg-emerald-50/50' : 'border-stone-300 bg-white hover:border-brand-orange hover:bg-brand-orange/5'
                    }`}
                  >
                    {galleryPreview ? (
                      <img src={galleryPreview} alt="Vista previa" className="mb-3 max-h-40 rounded-2xl object-contain shadow-sm" />
                    ) : (
                      <svg className="mb-3 h-10 w-10 text-stone-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                    )}
                    <p className="text-sm font-semibold text-stone-500">
                      {galleryPreview ? 'Toca para cambiar la imagen' : 'Haz clic para seleccionar una imagen'}
                    </p>
                    <p className="mt-1 text-xs text-stone-400">PNG, JPG o WebP</p>
                  </div>
                  <input
                    ref={galleryPhotoInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleGalleryPhotoSelect}
                    className="hidden"
                  />
                </div>
                <input
                  id="gallery-photo-label"
                  name="gallery-photo-label"
                  value={galleryLabel}
                  onChange={(e) => setGalleryLabel(e.target.value)}
                  placeholder="Descripción o etiqueta (opcional)"
                  className="rounded-3xl border border-stone-200 bg-white px-4 py-3 text-sm outline-none focus:border-brand-orange focus:ring-2 focus:ring-brand-orange/20"
                />
                <button
                  type="submit"
                  disabled={isSavingPhoto}
                  className="rounded-3xl bg-brand-orange px-6 py-4 text-sm font-bold text-white transition hover:bg-brand-orange/90 disabled:bg-stone-300"
                >
                  {isSavingPhoto ? 'Subiendo...' : 'Agregar a galería'}
                </button>
              </form>
            </div>

            <div className="glass-card border border-stone-200 bg-white/90 p-6 shadow-xl">
              <div className="mb-6">
                <p className="text-xs font-bold uppercase tracking-[0.3em] text-brand-orange">Contenido Actual</p>
                <h2 className="mt-2 text-4xl font-display text-brand-brown">Fotos de la Galería</h2>
              </div>
              {galleryPhotos.length > 0 ? (
                <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
                  {galleryPhotos.map((photo) => (
                    <div key={photo.id} className="group relative">
                      <img src={photo.url} alt={photo.label} className="aspect-square w-full rounded-2xl object-cover" />
                      <div className="absolute inset-0 flex items-center justify-center rounded-2xl bg-black/50 opacity-0 transition group-hover:opacity-100">
                        <button onClick={() => handleDeleteGalleryPhoto(photo.id)} className="rounded-full bg-rose-600 px-3 py-1 text-xs font-bold text-white">Eliminar</button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="flex h-48 items-center justify-center rounded-3xl border-2 border-dashed border-stone-300 bg-stone-50/50">
                  <p className="text-center text-sm font-semibold text-stone-400">No hay fotos en la galería.<br/>Sube una para empezar.</p>
                </div>
              )}
            </div>
          </section>
        )}

        {/* TAB: Monitor de Pedidos */}
        {activeTab === 'orders' && (
          <section className="glass-card border border-brand-gold/20 bg-white/90 p-6 shadow-xl">
            <div className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.3em] text-brand-orange">Fulfillment</p>
                <h2 className="mt-2 text-4xl font-display text-brand-brown">
                  Pedidos y compras
                  <span className="ml-2 text-base font-normal text-stone-400">({orders.length})</span>
                </h2>
              </div>
              <div className="flex flex-wrap gap-2">
                {(['all', 'pending', 'paid', 'delivered'] as const).map((status) => (
                  <button
                    key={status}
                    onClick={() => setOrderFilter(status)}
                    className={`rounded-full px-4 py-2 text-xs font-bold transition ${
                      orderFilter === status ? 'bg-brand-orange text-white' : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
                    }`}
                  >
                    {statusLabels[status]}
                  </button>
                ))}
              </div>
            </div>

            {filteredOrders.length === 0 ? (
              <div className="rounded-3xl border border-stone-200 bg-stone-50 p-8 text-center text-sm font-semibold text-stone-500">
                No hay pedidos en este estado.
              </div>
            ) : (
              <div className="grid gap-4">
                {filteredOrders.map((order) => (
                  <article key={order.id} className="rounded-3xl border border-stone-200 bg-white p-5 shadow-sm">
                    <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <h3 className="break-all font-mono text-sm font-black text-brand-brown">{order.id}</h3>
                          <span
                            className={`rounded-full px-3 py-1 text-xs font-bold ${
                              order.status === 'paid'
                                ? 'bg-emerald-100 text-emerald-800'
                                : order.status === 'delivered'
                                ? 'bg-blue-100 text-blue-800'
                                : order.status === 'failed'
                                ? 'bg-rose-100 text-rose-800'
                                : 'bg-amber-100 text-amber-800'
                            }`}
                          >
                            {statusLabels[order.status]}
                          </span>
                        </div>
                        <p className="mt-2 text-sm text-stone-600">
                          {order.shippingAddress.name} · {order.shippingAddress.phone} · {order.shippingAddress.city}
                        </p>
                        <p className="mt-1 text-xs text-stone-400">{new Date(order.createdAt).toLocaleString()}</p>
                        <p className="mt-1 text-xs text-stone-400">Usuario: {order.userId}</p>
                      </div>
                      <div className="text-left lg:text-right">
                        <p className="text-2xl font-black text-brand-orange">${order.total.toFixed(2)}</p>
                        {order.paypalOrderId && (
                          <p className="break-all font-mono text-xs text-stone-400">
                            PayPal: {order.paypalOrderId}
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="mt-4 grid gap-2 border-t border-stone-200 pt-4">
                      <p className="text-xs font-bold uppercase tracking-[0.2em] text-stone-400">
                        Productos solicitados ({order.items.length})
                      </p>
                      {order.items.map((item) => (
                        <div key={item.id} className="flex items-center justify-between gap-4 text-sm">
                          <span className="font-semibold text-stone-700">
                            {item.quantity} x {item.name}
                          </span>
                          <span className="font-bold text-brand-brown">
                            ${(item.price * item.quantity).toFixed(2)}
                          </span>
                        </div>
                      ))}
                      <div className="mt-2 flex items-center justify-between border-t border-dashed border-stone-200 pt-2">
                        <span className="text-sm font-bold text-stone-700">Total</span>
                        <span className="text-lg font-black text-brand-orange">
                          ${order.total.toFixed(2)}
                        </span>
                      </div>
                    </div>

                    <div className="mt-5 flex flex-wrap gap-2">
                      <button
                        onClick={() => handleOrderStatus(order.id, 'paid')}
                        disabled={order.status === 'paid' || order.status === 'delivered'}
                        className={`rounded-full px-4 py-2 text-xs font-bold text-white transition ${
                          order.status === 'paid' || order.status === 'delivered'
                            ? 'cursor-not-allowed bg-stone-300'
                            : 'bg-brand-brown hover:bg-brand-brown/90'
                        }`}
                      >
                        Marcar pagada
                      </button>
                      <button
                        onClick={() => handleOrderStatus(order.id, 'delivered')}
                        disabled={order.status === 'delivered'}
                        className={`rounded-full px-4 py-2 text-xs font-bold text-white transition ${
                          order.status === 'delivered'
                            ? 'cursor-not-allowed bg-stone-300'
                            : 'bg-brand-orange hover:bg-brand-orange/90'
                        }`}
                      >
                        Marcar entregada
                      </button>
                      <button
                        onClick={() => handleOrderStatus(order.id, 'failed')}
                        disabled={order.status === 'failed'}
                        className={`rounded-full px-4 py-2 text-xs font-bold transition ${
                          order.status === 'failed'
                            ? 'cursor-not-allowed bg-stone-200 text-stone-400'
                            : 'border border-rose-300 text-rose-600 hover:bg-rose-50'
                        }`}
                      >
                        Marcar fallida
                      </button>
                    </div>
                  </article>
                ))}
              </div>
            )}
          </section>
        )}
      </div>
    </main>

    {/* Modal de Confirmación de Eliminación */}
    {showDeleteModal && (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
        <div className="glass-card mx-4 max-w-md rounded-3xl border border-stone-200 bg-white p-8 shadow-2xl">
          <div className="mb-6 flex items-center gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-rose-100">
              <svg className="h-6 w-6 text-rose-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
            <div>
              <h3 className="text-2xl font-display text-brand-brown">Confirmar Eliminación</h3>
              <p className="mt-1 text-sm text-stone-600">Esta acción no se puede deshacer</p>
            </div>
          </div>
          <p className="mb-8 text-stone-700">
            ¿Estás seguro de que deseas eliminar este producto permanentemente? Se perderán todos los datos asociados incluyendo imágenes.
          </p>
          <div className="flex gap-3">
            <button
              onClick={handleDeleteProductCancel}
              className="flex-1 rounded-full border border-stone-300 px-6 py-3 text-sm font-bold text-stone-700 transition hover:bg-stone-100"
            >
              Cancelar
            </button>
            <button
              onClick={handleDeleteProductConfirm}
              className="flex-1 rounded-full bg-rose-600 px-6 py-3 text-sm font-bold text-white transition hover:bg-rose-700"
            >
              Eliminar
            </button>
          </div>
        </div>
      </div>
    )}
  );
};

export default AdminDashboard;
