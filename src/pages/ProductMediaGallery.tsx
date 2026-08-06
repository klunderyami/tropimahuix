import { useEffect, useState } from 'react';
import toast, { Toaster } from 'react-hot-toast';
import { getGalleryPhotos } from '../supabase.js';
import type { GalleryPhoto } from '../types.js';

const ProductMediaGallery = () => {
  const [photos, setPhotos] = useState<GalleryPhoto[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchGallery = async () => {
      try {
        const galleryPhotos = await getGalleryPhotos();
        setPhotos(galleryPhotos);
      } catch (error) {
        console.error('Error fetching gallery:', error);
        toast.error('No se pudo cargar la galería.');
      } finally {
        setLoading(false);
      }
    };

    fetchGallery();
  }, []);

  // Separar fotos y videos
  const images = photos.filter((photo) => !photo.url.match(/\.(mp4|webm)$/i));
  const videos = photos.filter((photo) => photo.url.match(/\.(mp4|webm)$/i));

  return (
    <main className="min-h-screen bg-paper px-4 py-10 font-sans text-stone-900 sm:px-6 lg:px-8">
      <Toaster position="bottom-center" toastOptions={{ duration: 5000, className: 'font-semibold' }} />
      <div className="mx-auto max-w-7xl">
        {/* Header */}
        <header className="mb-12 rounded-[2rem] border border-brand-gold/20 bg-brand-brown px-6 py-10 text-white shadow-2xl">
          <p className="text-xs font-bold uppercase tracking-[0.35em] text-brand-gold">Multimedia</p>
          <h1 className="mt-3 text-5xl font-display">Galería de Productos</h1>
          <p className="mt-3 max-w-2xl text-sm text-stone-200">
            Explora nuestra colección de fotos y videos promocionales de licores y toritos.
          </p>
        </header>

        {loading ? (
          <div className="flex h-64 items-center justify-center">
            <div className="flex items-center gap-4">
              <svg className="animate-spin h-8 w-8 text-brand-orange" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              <span className="text-xl font-semibold text-stone-700">Cargando galería...</span>
            </div>
          </div>
        ) : photos.length === 0 ? (
          <div className="rounded-3xl border-2 border-dashed border-stone-300 bg-stone-50 p-12 text-center">
            <svg className="mx-auto mb-4 h-16 w-16 text-stone-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            <p className="text-lg font-semibold text-stone-600">No hay contenido en la galería</p>
            <p className="mt-2 text-sm text-stone-500">Próximamente agregaremos fotos y videos de nuestros productos.</p>
          </div>
        ) : (
          <>
            {/* Sección de Videos */}
            {videos.length > 0 && (
              <section className="mb-16">
                <div className="mb-8 flex items-center gap-3">
                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-brand-orange/10">
                    <svg className="h-6 w-6 text-brand-orange" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <div>
                    <h2 className="text-3xl font-display text-brand-brown">Videos Promocionales</h2>
                    <p className="text-sm text-stone-500">{videos.length} video{videos.length !== 1 ? 's' : ''} disponible{videos.length !== 1 ? 's' : ''}</p>
                  </div>
                </div>
                <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                  {videos.map((video) => (
                    <div
                      key={video.id}
                      className="glass-card overflow-hidden border border-stone-200 bg-white/90 shadow-xl transition hover:shadow-2xl"
                    >
                      <div className="relative aspect-video bg-black">
                        <video
                          src={video.url}
                          controls
                          className="h-full w-full"
                          preload="metadata"
                          playsInline
                        >
                          Tu navegador no soporta videos HTML5.
                        </video>
                      </div>
                      {video.label && (
                        <div className="p-4">
                          <p className="text-sm font-semibold text-stone-700">{video.label}</p>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </section>
            )}

            {/* Sección de Fotos */}
            {images.length > 0 && (
              <section>
                <div className="mb-8 flex items-center gap-3">
                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-brand-lime/30">
                    <svg className="h-6 w-6 text-brand-brown" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                  </div>
                  <div>
                    <h2 className="text-3xl font-display text-brand-brown">Fotos de Productos</h2>
                    <p className="text-sm text-stone-500">{images.length} foto{images.length !== 1 ? 's' : ''} disponible{images.length !== 1 ? 's' : ''}</p>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
                  {images.map((photo) => (
                    <div
                      key={photo.id}
                      className="glass-card group relative overflow-hidden border border-stone-200 bg-white/90 shadow-lg transition hover:shadow-2xl"
                    >
                      <div className="aspect-square overflow-hidden">
                        <img
                          src={photo.url}
                          alt={photo.label || 'Foto de producto'}
                          className="h-full w-full object-cover transition duration-500 group-hover:scale-110"
                          loading="lazy"
                          decoding="async"
                        />
                      </div>
                      {photo.label && (
                        <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 to-transparent p-3">
                          <p className="text-xs font-semibold text-white line-clamp-2">{photo.label}</p>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </section>
            )}
          </>
        )}
      </div>
    </main>
  );
};

export default ProductMediaGallery;