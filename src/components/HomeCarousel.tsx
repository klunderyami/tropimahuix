import { useState, useEffect, useMemo, useRef } from 'react';
import { getGalleryPhotos } from '../supabase.js';
import type { GalleryPhoto } from '../types.js';

const HomeCarousel = () => {
  const [photos, setPhotos] = useState<GalleryPhoto[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const videoRefs = useRef<Map<number, HTMLVideoElement>>(new Map());

  useEffect(() => {
    getGalleryPhotos()
      .then((photos) => {
        setPhotos(photos);
      })
      .catch(() => {
        // Error silencioso - el componente maneja el estado de loading
      })
      .finally(() => setLoading(false));
  }, []);

  const goToPrevious = () => {
    const isFirstSlide = currentIndex === 0;
    const newIndex = isFirstSlide ? photos.length - 1 : currentIndex - 1;
    setCurrentIndex(newIndex);
  };

  const goToNext = () => {
    const isLastSlide = currentIndex === photos.length - 1;
    const newIndex = isLastSlide ? 0 : currentIndex + 1;
    setCurrentIndex(newIndex);
  };

  // Controlar reproducción de videos: solo el activo se reproduce
  useEffect(() => {
    videoRefs.current.forEach((video, index) => {
      if (index === currentIndex) {
        video.play().catch(() => {});
      } else {
        video.pause();
        video.currentTime = 0;
      }
    });
  }, [currentIndex]);

  // Ordenar: videos primero, luego imágenes (antes de los condicionales de render)
  const sortedPhotos = useMemo(() => {
    return [...photos].sort((a: GalleryPhoto, b: GalleryPhoto) => {
      const aIsVideo = a.url.match(/\.(mp4|webm|mov)$/i);
      const bIsVideo = b.url.match(/\.(mp4|webm|mov)$/i);
      if (aIsVideo && !bIsVideo) return -1;
      if (!aIsVideo && bIsVideo) return 1;
      return 0;
    });
  }, [photos]);

  if (loading) {
    return <div className="aspect-video w-full bg-stone-200 animate-pulse rounded-lg" />;
  }

  if (photos.length === 0) {
    return null; // Don't render anything if there are no photos
  }

  return (
    <section className="relative h-[85vh] w-full">
      <div className="h-full w-full overflow-hidden rounded-xl bg-stone-900">
        {sortedPhotos.map((photo: GalleryPhoto, index: number) => (
          <div
            key={photo.id}
            className={`absolute inset-0 transition-opacity duration-1000 ${index === currentIndex ? 'opacity-100' : 'opacity-0'}`}
          >
            <div className="flex h-full w-full items-center justify-center bg-black">
             {photo.url.match(/\.(mp4|webm|mov)$/i) ? (
               <video
                 ref={(el) => {
                   if (el) {
                     videoRefs.current.set(index, el);
                   } else {
                     videoRefs.current.delete(index);
                   }
                 }}
                 src={photo.url}
                 className="h-full w-full object-contain"
                 playsInline
                 preload="metadata"
               />
             ) : (
              <img
                src={photo.url}
                alt={photo.label || 'Foto de la galería'}
                className="h-full w-full object-contain"
                loading="lazy"
                decoding="async"
              />
            )}
            </div>
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
            {photo.label && (
              <div className="absolute bottom-8 left-1/2 -translate-x-1/2 text-center">
                <p className="text-white text-lg md:text-2xl font-bold drop-shadow-lg">{photo.label}</p>
              </div>
            )}
          </div>
        ))}
      </div>

      <button 
        onClick={goToPrevious} 
        className="absolute left-6 top-1/2 -translate-y-1/2 rounded-full bg-white/80 p-3 text-stone-800 backdrop-blur-sm transition hover:bg-white hover:scale-110"
        aria-label="Imagen anterior"
      >
        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
      </button>
      <button 
        onClick={goToNext} 
        className="absolute right-6 top-1/2 -translate-y-1/2 rounded-full bg-white/80 p-3 text-stone-800 backdrop-blur-sm transition hover:bg-white hover:scale-110"
        aria-label="Siguiente imagen"
      >
        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
      </button>

      <div className="absolute bottom-8 left-1/2 flex -translate-x-1/2 gap-3" role="tablist" aria-label="Diapositivas del carrusel">
        {sortedPhotos.map((_: GalleryPhoto, index: number) => (
          <button 
            key={index} 
            onClick={() => setCurrentIndex(index)} 
            className={`h-3 w-3 rounded-full transition-all ${currentIndex === index ? 'bg-white w-8' : 'bg-white/50 hover:bg-white/75'}`}
            aria-label={`Ir a diapositiva ${index + 1} de ${sortedPhotos.length}`}
            aria-selected={currentIndex === index}
            role="tab"
          />
        ))}
      </div>
    </section>
  );
};

export default HomeCarousel;