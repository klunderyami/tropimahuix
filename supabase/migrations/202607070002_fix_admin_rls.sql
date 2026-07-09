-- ============================================================================
-- Tropicaña - Corrección de políticas RLS para arquitectura híbrida
-- Firebase Auth + Supabase (Service Role Key para admin)
-- ============================================================================

-- Eliminar políticas existentes que usan ::uuid incorrectamente
DROP POLICY IF EXISTS "products_select_admin" ON public.products;
DROP POLICY IF EXISTS "products_insert_admin" ON public.products;
DROP POLICY IF EXISTS "products_update_admin" ON public.products;
DROP POLICY IF EXISTS "products_delete_admin" ON public.products;

DROP POLICY IF EXISTS "site_config_insert_admin" ON public.site_config;
DROP POLICY IF EXISTS "site_config_update_admin" ON public.site_config;

DROP POLICY IF EXISTS "orders_select_own" ON public.orders;
DROP POLICY IF EXISTS "orders_insert_authenticated" ON public.orders;
DROP POLICY IF EXISTS "orders_update_admin" ON public.orders;

DROP POLICY IF EXISTS "gallery_photos_insert_admin" ON public.gallery_photos;
DROP POLICY IF EXISTS "gallery_photos_delete_admin" ON public.gallery_photos;

-- === PRODUCTS ===
-- Lectura pública: cualquier persona puede ver productos activos (SIN auth requerida)
-- Esta política permite lectura pública para el frontend con anon key
DROP POLICY IF EXISTS "products_select_public" ON public.products;
CREATE POLICY "products_select_public" ON public.products
  FOR SELECT
  USING (active = true OR active IS NULL);

-- Lectura total: el service_role (backend Express) puede leer todo
CREATE POLICY "products_select_service" ON public.products
  FOR SELECT
  USING (auth.role() = 'service_role');

-- Inserción/Actualización/Eliminación: solo service_role (backend Express con clave service_role)
CREATE POLICY "products_insert_service" ON public.products
  FOR INSERT
  WITH CHECK (auth.role() = 'service_role');

CREATE POLICY "products_update_service" ON public.products
  FOR UPDATE
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

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
CREATE POLICY "site_config_insert_service" ON public.site_config
  FOR INSERT
  WITH CHECK (auth.role() = 'service_role');

CREATE POLICY "site_config_update_service" ON public.site_config
  FOR UPDATE
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

-- === ORDERS ===
-- Lectura: service_role puede ver todas; usuarios anon no ven nada
CREATE POLICY "orders_select_service" ON public.orders
  FOR SELECT
  USING (auth.role() = 'service_role');

-- Inserción: service_role (backend Express) puede crear órdenes
CREATE POLICY "orders_insert_service" ON public.orders
  FOR INSERT
  WITH CHECK (auth.role() = 'service_role');

-- Actualización solo service_role
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
CREATE POLICY "gallery_photos_insert_service" ON public.gallery_photos
  FOR INSERT
  WITH CHECK (auth.role() = 'service_role');

CREATE POLICY "gallery_photos_delete_service" ON public.gallery_photos
  FOR DELETE
  USING (auth.role() = 'service_role');