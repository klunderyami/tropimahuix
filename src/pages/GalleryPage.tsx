import { useEffect, useState } from 'react';
import { getGalleryPhotos } from '../supabase';
import type { GalleryPhoto } from '../types';

const GalleryPage = () => {
  const [photos, setPhotos] = useState<GalleryPhoto[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchPhotos = async () => {
      try {
        setLoading(true);
        const galleryPhotos = await getGalleryPhotos();
        setPhotos(galleryPhotos);
      } catch (error) {
        console.error("Error fetching gallery photos:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchPhotos();
  }, []);

  const isVideo = (url: string) => /\.(mp4|webm|ogg)$/i.test(url);

  return (
    <main className="bg-paper min-h-screen">
      <div className="container mx-auto px-4 py-12 sm:px-6 lg:px-8">
        <header className="text-center mb-12">
          <h1 className="text-5xl md:text-7xl font-display text-brand-brown">Galería de Momentos</h1>
          <p className="mt-4 max-w-2xl mx-auto text-lg text-stone-600">
            Un vistazo a la tradición y el sabor artesanal de Tropicaña.
          </p>
        </header>

        {loading ? (
          <div className="flex justify-center items-center h-64">
            <svg className="animate-spin h-10 w-10 text-brand-orange" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
          </div>
        ) : photos.length === 0 ? (
          <div className="text-center py-16">
            <p className="text-xl text-stone-500">Nuestra galería está vacía por ahora. ¡Vuelve pronto!</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {photos.map((item) => (
              <div key={item.id} className="group relative aspect-square overflow-hidden rounded-2xl shadow-lg bg-white/30 backdrop-blur-lg border border-white/20">
                {isVideo(item.url) ? (
                  <video
                    src={item.url}
                    controls
                    className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                  >
                    Tu navegador no soporta el tag de video.
                  </video>
                ) : (
                  <img
                    src={item.url}
                    alt={item.label}
                    className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                  />
                )}
                {item.label && <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent p-4">
                  <p className="text-white font-semibold text-sm truncate">{item.label}</p>
                </div>}
              </div>
            ))}
          </div>
        )}
      </div>
    </main>
  );
};

export default GalleryPage;