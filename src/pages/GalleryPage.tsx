import { useState, useEffect } from 'react';
import { Navbar } from '../components/Navbar';
import { Footer } from '../components/Footer';
import GalleryView from '../components/GalleryView';

const GalleryPage = () => {
  return (
    <div className="min-h-screen bg-paper">
      <Navbar />
      <main className="px-4 py-12 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <div className="mb-8 text-center">
            <h1 className="text-4xl font-display text-brand-brown">Galería</h1>
            <p className="mt-2 text-sm text-stone-600">
              Explora nuestra colección de fotos y videos
            </p>
          </div>
          <GalleryView />
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default GalleryPage;