import { useEffect, useState } from 'react';

/**
 * Quita solamente el fondo casi blanco conectado a los bordes de la fotografía.
 * No borra el blanco interior de la botella ni modifica el archivo original.
 * Si la imagen remota bloquea Canvas (CORS), muestra la foto original.
 */
export function HeroBottle({ src, alt, index }: { src: string; alt: string; index: number }) {
  const [cutout, setCutout] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setCutout(null);
    const image = new Image();
    image.crossOrigin = 'anonymous';
    image.onload = () => {
      try {
        const scale = Math.min(1, 900 / Math.max(image.naturalWidth, image.naturalHeight));
        const width = Math.max(1, Math.round(image.naturalWidth * scale));
        const height = Math.max(1, Math.round(image.naturalHeight * scale));
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d', { willReadFrequently: true });
        if (!ctx) return;
        ctx.drawImage(image, 0, 0, width, height);
        const pixels = ctx.getImageData(0, 0, width, height);
        const data = pixels.data;
        const seen = new Uint8Array(width * height);
        const queue = new Int32Array(width * height);
        let head = 0, tail = 0;
        const isBackdrop = (pos: number) => {
          const k = pos * 4;
          const r = data[k], g = data[k + 1], b = data[k + 2];
          return Math.min(r, g, b) > 220 && Math.max(r, g, b) - Math.min(r, g, b) < 34;
        };
        const push = (pos: number) => {
          if (seen[pos] || !isBackdrop(pos)) return;
          seen[pos] = 1;
          queue[tail++] = pos;
        };
        for (let x = 0; x < width; x++) { push(x); push((height - 1) * width + x); }
        for (let y = 0; y < height; y++) { push(y * width); push(y * width + width - 1); }
        while (head < tail) {
          const pos = queue[head++];
          const x = pos % width, y = Math.floor(pos / width);
          data[pos * 4 + 3] = 0;
          if (x > 0) push(pos - 1);
          if (x + 1 < width) push(pos + 1);
          if (y > 0) push(pos - width);
          if (y + 1 < height) push(pos + width);
        }
        ctx.putImageData(pixels, 0, 0);
        if (!cancelled) setCutout(canvas.toDataURL('image/png'));
      } catch {
        // Mantener fotografía original si el servidor no permite procesarla.
      }
    };
    image.src = src;
    return () => { cancelled = true; };
  }, [src]);

  return (
    <div className="tropi-hero-bottle-stage" style={{ animationDelay: `${index * 0.13}s` }}>
      <img src={cutout ?? src} alt={alt} className={`tropi-hero-bottle ${cutout ? 'tropi-hero-bottle--cutout' : 'tropi-hero-bottle--original'}`}
        loading="eager" decoding="async" />
    </div>
  );
}
