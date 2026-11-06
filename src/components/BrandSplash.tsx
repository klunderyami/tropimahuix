import { useEffect, useState } from 'react';

/** Intro breve y accesible; nunca bloquea la navegación después de 2.4 segundos. */
export function BrandSplash() {
  const [visible, setVisible] = useState(() => {
    try { return sessionStorage.getItem('tropi-intro-seen') !== '1'; }
    catch { return true; }
  });

  useEffect(() => {
    if (!visible) return;
    const timer = window.setTimeout(() => {
      try { sessionStorage.setItem('tropi-intro-seen', '1'); } catch { /* private mode */ }
      setVisible(false);
    }, 2200);
    return () => window.clearTimeout(timer);
  }, [visible]);

  if (!visible) return null;
  return (
    <div className="tropi-brand-splash" role="status" aria-live="polite" aria-label="Cargando Tropicaña">
      <div className="tropi-brand-splash__content">
        <div className="tropi-brand-splash__palm" aria-hidden="true">🌴</div>
        <div className="tropi-brand-splash__name">Tropicaña</div>
        <div className="tropi-brand-splash__subtitle">Licores &amp; Toritos Artesanales</div>
        <div className="tropi-brand-splash__progress" aria-hidden="true"><span /></div>
      </div>
    </div>
  );
}
