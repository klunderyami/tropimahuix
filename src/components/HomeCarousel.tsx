import { useState, useEffect } from 'react';
import { getGalleryPhotos } from '../supabase.js';
import type { GalleryPhoto } from '../types.js';

const HomeCarousel = () => {
  const [photos, setPhotos] = useState<GalleryPhoto[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getGalleryPhotos()
      .then(setPhotos)
      .catch(console.error)
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

  if (loading) {
    return <div className="aspect-video w-full bg-stone-200 animate-pulse rounded-lg" />;
  }

  if (photos.length === 0) {
    return null; // Don't render anything if there are no photos
  }

  return (
    <section className="relative h-[60vh] w-full">
      <div className="h-full w-full overflow-hidden rounded-lg bg-stone-900">
        {photos.map((photo, index) => (
          <div
            key={photo.id}
            className={`absolute inset-0 transition-opacity duration-1000 ${index === currentIndex ? 'opacity-100' : 'opacity-0'}`}
          >
            <div className="flex h-full w-full items-center justify-center">
              {photo.url.match(/\.(mp4|webm|mov)$/i) ? (
                <video
                  src={photo.url}
                  className="max-h-full max-w-full object-contain"
                  autoPlay loop muted playsInline
                />
              ) : (
                <img
                  src={photo.url}
                  alt={photo.label || 'Foto de la galería'}
                  className="max-h-full max-w-full object-contain"
                />
              )}
            </div>
            <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />
          </div>
        ))}
      </div>

      <button onClick={goToPrevious} className="absolute left-4 top-1/2 -translate-y-1/2 rounded-full bg-white/50 p-2 text-stone-800 backdrop-blur-sm transition hover:bg-white">
        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
      </button>
      <button onClick={goToNext} className="absolute right-4 top-1/2 -translate-y-1/2 rounded-full bg-white/50 p-2 text-stone-800 backdrop-blur-sm transition hover:bg-white">
        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
      </button>

      <div className="absolute bottom-4 left-1/2 flex -translate-x-1/2 gap-2">
        {photos.map((_, index) => (
          <button key={index} onClick={() => setCurrentIndex(index)} className={`h-2 w-2 rounded-full transition ${currentIndex === index ? 'bg-white' : 'bg-white/50'}`} />
        ))}
      </div>
    </section>
  );
};

export default HomeCarousel;