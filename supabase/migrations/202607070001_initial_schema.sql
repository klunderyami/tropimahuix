-- ============================================================================
-- Tropicaña - Esquema Inicial de Base de Datos
-- Migración: 202607070001
-- Descripción: Tablas de productos, configuración del sitio, órdenes y fotos
-- con políticas RLS para lectura pública y control via service_role.
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

-- Add columns that may be missing in existing databases to make the migration idempotent.
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS gallery JSONB NOT NULL DEFAULT '[]'::jsonb;

-- Índices para búsqueda eficiente
CREATE INDEX IF NOT EXISTS idx_products_category ON public.products (category);
CREATE INDEX IF NOT EXISTS idx_products_active ON public.products (active);
CREATE INDEX IF NOT EXISTS idx_products_created_at ON public.products (created_at DESC);

-- 2. TABLA: site_config (Configuración global del sitio)
CREATE TABLE IF NOT EXISTS public.site_config (
  id TEXT PRIMARY KEY DEFAULT 'site',
  hero_title TEXT DEFAULT 'Licores y Toritos Artesanales',
  hero_subtitle TEXT DEFAULT 'Tradición y Sabor de Nuestra Tierra',
  logo_url TEXT DEFAULT '',
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

-- Add columns that may be missing in existing databases.
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS user_id TEXT NOT NULL DEFAULT 'guest';

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
-- Arquitectura híbrida: Firebase Auth (frontend) + Supabase Service Role (backend)
-- ============================================================================

-- Habilitar RLS en todas las tablas
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.site_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gallery_photos ENABLE ROW LEVEL SECURITY;

-- === PRODUCTS ===
-- Lectura pública: cualquier persona (anon) puede ver productos activos
DROP POLICY IF EXISTS "products_select_public" ON public.products;
CREATE POLICY "products_select_public" ON public.products
  FOR SELECT
  USING (active = true OR active IS NULL);

-- Lectura total: el service_role (backend Express con service_role key) puede ver todo
DROP POLICY IF EXISTS "products_select_service" ON public.products;
CREATE POLICY "products_select_service" ON public.products
  FOR SELECT
  USING (auth.role() = 'service_role');

-- Inserción/Actualización/Eliminación: solo service_role
DROP POLICY IF EXISTS "products_insert_service" ON public.products;
CREATE POLICY "products_insert_service" ON public.products
  FOR INSERT
  WITH CHECK (auth.role() = 'service_role');

DROP POLICY IF EXISTS "products_update_service" ON public.products;
CREATE POLICY "products_update_service" ON public.products
  FOR UPDATE
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

DROP POLICY IF EXISTS "products_delete_service" ON public.products;
CREATE POLICY "products_delete_service" ON public.products
  FOR DELETE
  USING (auth.role() = 'service_role');

-- === SITE_CONFIG ===
-- Lectura pública
DROP POLICY IF EXISTS "site_config_select_public" ON public.site_config;
CREATE POLICY "site_config_select_public" ON public.site_config
  FOR SELECT
  USING (true);

-- Escritura solo service_role
DROP POLICY IF EXISTS "site_config_insert_service" ON public.site_config;
CREATE POLICY "site_config_insert_service" ON public.site_config
  FOR INSERT
  WITH CHECK (auth.role() = 'service_role');

DROP POLICY IF EXISTS "site_config_update_service" ON public.site_config;
CREATE POLICY "site_config_update_service" ON public.site_config
  FOR UPDATE
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

-- === ORDERS ===
-- Lectura: solo service_role puede ver órdenes
DROP POLICY IF EXISTS "orders_select_service" ON public.orders;
CREATE POLICY "orders_select_service" ON public.orders
  FOR SELECT
  USING (auth.role() = 'service_role');

-- Inserción: service_role (backend Express) crea órdenes
DROP POLICY IF EXISTS "orders_insert_service" ON public.orders;
CREATE POLICY "orders_insert_service" ON public.orders
  FOR INSERT
  WITH CHECK (auth.role() = 'service_role');

-- Actualización solo service_role
DROP POLICY IF EXISTS "orders_update_service" ON public.orders;
CREATE POLICY "orders_update_service" ON public.orders
  FOR UPDATE
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

-- === GALLERY_PHOTOS ===
-- Lectura pública
DROP POLICY IF EXISTS "gallery_photos_select_public" ON public.gallery_photos;
CREATE POLICY "gallery_photos_select_public" ON public.gallery_photos
  FOR SELECT
  USING (true);

-- Escritura solo service_role
DROP POLICY IF EXISTS "gallery_photos_insert_service" ON public.gallery_photos;
CREATE POLICY "gallery_photos_insert_service" ON public.gallery_photos
  FOR INSERT
  WITH CHECK (auth.role() = 'service_role');

DROP POLICY IF EXISTS "gallery_photos_delete_service" ON public.gallery_photos;
CREATE POLICY "gallery_photos_delete_service" ON public.gallery_photos
  FOR DELETE
  USING (auth.role() = 'service_role');

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
DROP TRIGGER IF EXISTS trg_products_updated_at ON public.products;
CREATE TRIGGER trg_products_updated_at
  BEFORE UPDATE ON public.products
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- Triggers para site_config
DROP TRIGGER IF EXISTS trg_site_config_updated_at ON public.site_config;
CREATE TRIGGER trg_site_config_updated_at
  BEFORE UPDATE ON public.site_config
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- Triggers para orders
DROP TRIGGER IF EXISTS trg_orders_updated_at ON public.orders;
CREATE TRIGGER trg_orders_updated_at
  BEFORE UPDATE ON public.orders
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- ============================================================================
-- FUNCIONES RPC (Remote Procedure Call)
-- Lógica de negocio crítica ejecutada atómicamente en la base de datos.
-- ============================================================================

-- Función para crear una orden y decrementar el stock de productos de forma atómica.
-- Previene condiciones de carrera y asegura la consistencia de los datos.
CREATE OR REPLACE FUNCTION public.create_order_and_decrement_stock(
  p_user_id TEXT,
  p_items JSONB,
  p_total NUMERIC,
  p_shipping_address JSONB
)
RETURNS TABLE (id UUID) AS $$
DECLARE
  new_order_id UUID;
  item_record JSONB;
  product_id UUID;
  quantity_to_decrement INT;
BEGIN
  -- 1. Insertar la nueva orden y obtener su ID.
  INSERT INTO public.orders (user_id, items, total, shipping_address, status)
  VALUES (p_user_id, p_items, p_total, p_shipping_address, 'pending')
  RETURNING public.orders.id INTO new_order_id;

  -- 2. Iterar sobre los productos y decrementar el stock.
  FOR item_record IN SELECT * FROM jsonb_array_elements(p_items)
  LOOP
    product_id := (item_record->>'id')::UUID;
    quantity_to_decrement := (item_record->>'quantity')::INT;

    -- Actualizar el stock, asegurando que no baje de cero.
    -- La condición `stock >= quantity_to_decrement` previene stocks negativos en caso de una condición de carrera.
    UPDATE public.products
    SET stock = stock - quantity_to_decrement
    WHERE public.products.id = product_id AND stock >= quantity_to_decrement;
  END LOOP;

  -- 3. Retornar el ID de la nueva orden.
  RETURN QUERY SELECT new_order_id;
END;
$$ LANGUAGE plpgsql;

-- Función para marcar una orden como fallida.
-- Se usa cuando la captura de pago de PayPal falla después de que la orden fue creada.
CREATE OR REPLACE FUNCTION public.fail_order(p_order_id UUID)
RETURNS void AS $$
BEGIN
  UPDATE public.orders
  SET status = 'failed', failed_at = now()
  WHERE id = p_order_id AND status = 'pending';
END;
$$ LANGUAGE plpgsql;