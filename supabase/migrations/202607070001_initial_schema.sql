-- ============================================================================
-- Tropicaña - Esquema Inicial de Base de Datos
-- Migración: 202607070001
-- Descripción: Tablas de productos, configuración del sitio, órdenes y fotos
-- con políticas RLS para lectura pública y control exclusivo del admin.
-- ============================================================================

-- 1. TABLA: products (Catálogo de productos - licores y toritos)
CREATE TABLE IF NOT EXISTS public.products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL CHECK (char_length(name) >= 1 AND char_length(name) <= 200),
  description TEXT NOT NULL DEFAULT '',
  price NUMERIC(10, 2) NOT NULL CHECK (price > 0),
  volume TEXT NOT NULL DEFAULT '750ml',
  image TEXT NOT NULL DEFAULT '',
  category TEXT NOT NULL CHECK (category IN ('licor', 'torito')),
  stock INTEGER NOT NULL DEFAULT 0 CHECK (stock >= 0),
  active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Índices para búsqueda eficiente
CREATE INDEX IF NOT EXISTS idx_products_category ON public.products (category);
CREATE INDEX IF NOT EXISTS idx_products_active ON public.products (active);
CREATE INDEX IF NOT EXISTS idx_products_created_at ON public.products (created_at DESC);

-- 2. TABLA: site_config (Configuración global del sitio)
CREATE TABLE IF NOT EXISTS public.site_config (
  id TEXT PRIMARY KEY DEFAULT 'site',
  hero_title TEXT DEFAULT 'Licores y Toritos Artesanales',
  hero_subtitle TEXT DEFAULT 'Tradición y Sabor de Nuestra Tierra',
  intro_title TEXT DEFAULT 'Nuestra Historia',
  intro_text TEXT DEFAULT '',
  video_title TEXT DEFAULT '',
  video_subtitle TEXT DEFAULT '',
  video_image TEXT DEFAULT '',
  licores_header_image TEXT DEFAULT '',
  toritos_header_image TEXT DEFAULT '',
  contact_phone TEXT DEFAULT '',
  footer_text TEXT DEFAULT 'Tropicaña — Licores y Toritos 100% Artesanales.',
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 3. TABLA: orders (Órdenes de compra)
CREATE TABLE IF NOT EXISTS public.orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL DEFAULT 'guest',
  items JSONB NOT NULL DEFAULT '[]'::jsonb,
  total NUMERIC(10, 2) NOT NULL CHECK (total > 0),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'paid', 'failed', 'delivered')),
  shipping_address JSONB NOT NULL DEFAULT '{}'::jsonb,
  paypal_order_id TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  paid_at TIMESTAMPTZ,
  failed_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_orders_status ON public.orders (status);
CREATE INDEX IF NOT EXISTS idx_orders_created_at ON public.orders (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_orders_user_id ON public.orders (user_id);

-- 4. TABLA: gallery_photos (Galería de fotos)
CREATE TABLE IF NOT EXISTS public.gallery_photos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  url TEXT NOT NULL,
  label TEXT DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_gallery_photos_created_at ON public.gallery_photos (created_at DESC);

-- ============================================================================
-- POLÍTICAS DE SEGURIDAD (RLS)
-- ============================================================================

-- Habilitar RLS en todas las tablas
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.site_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gallery_photos ENABLE ROW LEVEL SECURITY;

-- === PRODUCTS ===
-- Lectura pública: cualquier persona puede ver productos activos
CREATE POLICY "products_select_public" ON public.products
  FOR SELECT
  USING (active = true OR active IS NULL);

-- Lectura admin: puede ver todos los productos (incluyendo inactivos)
CREATE POLICY "products_select_admin" ON public.products
  FOR SELECT
  USING (auth.uid() = 'OsVU7qU5NOParGXVqejx0SacMLl2'::uuid);

-- Inserción solo admin
CREATE POLICY "products_insert_admin" ON public.products
  FOR INSERT
  WITH CHECK (auth.uid() = 'OsVU7qU5NOParGXVqejx0SacMLl2'::uuid);

-- Actualización solo admin
CREATE POLICY "products_update_admin" ON public.products
  FOR UPDATE
  USING (auth.uid() = 'OsVU7qU5NOParGXVqejx0SacMLl2'::uuid)
  WITH CHECK (auth.uid() = 'OsVU7qU5NOParGXVqejx0SacMLl2'::uuid);

-- Eliminación solo admin
CREATE POLICY "products_delete_admin" ON public.products
  FOR DELETE
  USING (auth.uid() = 'OsVU7qU5NOParGXVqejx0SacMLl2'::uuid);

-- === SITE_CONFIG ===
-- Lectura pública
CREATE POLICY "site_config_select_public" ON public.site_config
  FOR SELECT
  USING (true);

-- Escritura solo admin
CREATE POLICY "site_config_insert_admin" ON public.site_config
  FOR INSERT
  WITH CHECK (auth.uid() = 'OsVU7qU5NOParGXVqejx0SacMLl2'::uuid);

CREATE POLICY "site_config_update_admin" ON public.site_config
  FOR UPDATE
  USING (auth.uid() = 'OsVU7qU5NOParGXVqejx0SacMLl2'::uuid)
  WITH CHECK (auth.uid() = 'OsVU7qU5NOParGXVqejx0SacMLl2'::uuid);

-- === ORDERS ===
-- El usuario puede ver sus propias órdenes; el admin puede ver todas
CREATE POLICY "orders_select_own" ON public.orders
  FOR SELECT
  USING (
    auth.uid() = user_id::uuid
    OR auth.uid() = 'OsVU7qU5NOParGXVqejx0SacMLl2'::uuid
  );

-- Inserción: cualquier usuario autenticado puede crear una orden
CREATE POLICY "orders_insert_authenticated" ON public.orders
  FOR INSERT
  WITH CHECK (auth.role() = 'authenticated' OR auth.role() = 'service_role');

-- Actualización solo admin
CREATE POLICY "orders_update_admin" ON public.orders
  FOR UPDATE
  USING (auth.uid() = 'OsVU7qU5NOParGXVqejx0SacMLl2'::uuid)
  WITH CHECK (auth.uid() = 'OsVU7qU5NOParGXVqejx0SacMLl2'::uuid);

-- === GALLERY_PHOTOS ===
-- Lectura pública
CREATE POLICY "gallery_photos_select_public" ON public.gallery_photos
  FOR SELECT
  USING (true);

-- Escritura solo admin
CREATE POLICY "gallery_photos_insert_admin" ON public.gallery_photos
  FOR INSERT
  WITH CHECK (auth.uid() = 'OsVU7qU5NOParGXVqejx0SacMLl2'::uuid);

CREATE POLICY "gallery_photos_delete_admin" ON public.gallery_photos
  FOR DELETE
  USING (auth.uid() = 'OsVU7qU5NOParGXVqejx0SacMLl2'::uuid);

-- ============================================================================
-- FUNCIÓN PARA ACTUALIZAR updated_at AUTOMÁTICAMENTE
-- ============================================================================
CREATE OR REPLACE FUNCTION public.update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers para productos
CREATE TRIGGER trg_products_updated_at
  BEFORE UPDATE ON public.products
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- Triggers para site_config
CREATE TRIGGER trg_site_config_updated_at
  BEFORE UPDATE ON public.site_config
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- Triggers para orders
CREATE TRIGGER trg_orders_updated_at
  BEFORE UPDATE ON public.orders
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();