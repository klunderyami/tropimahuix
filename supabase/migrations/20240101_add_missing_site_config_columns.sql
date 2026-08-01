-- Migración: Agregar columnas faltantes a site_config
-- Ejecutar en Supabase SQL Editor

-- Agregar columnas que pueden faltar
ALTER TABLE site_config ADD COLUMN IF NOT EXISTS "heroTitle" TEXT;
ALTER TABLE site_config ADD COLUMN IF NOT EXISTS "heroSubtitle" TEXT;
ALTER TABLE site_config ADD COLUMN IF NOT EXISTS "welcomeMessage" TEXT;
ALTER TABLE site_config ADD COLUMN IF NOT EXISTS "introTitle" TEXT;
ALTER TABLE site_config ADD COLUMN IF NOT EXISTS "introText" TEXT;
ALTER TABLE site_config ADD COLUMN IF NOT EXISTS "videoTitle" TEXT;
ALTER TABLE site_config ADD COLUMN IF NOT EXISTS "videoSubtitle" TEXT;
ALTER TABLE site_config ADD COLUMN IF NOT EXISTS "videoImage" TEXT;
ALTER TABLE site_config ADD COLUMN IF NOT EXISTS "licoresHeaderImage" TEXT;
ALTER TABLE site_config ADD COLUMN IF NOT EXISTS "toritosHeaderImage" TEXT;
ALTER TABLE site_config ADD COLUMN IF NOT EXISTS "contactPhone" TEXT;
ALTER TABLE site_config ADD COLUMN IF NOT EXISTS "footerText" TEXT;
ALTER TABLE site_config ADD COLUMN IF NOT EXISTS "logoUrl" TEXT;
ALTER TABLE site_config ADD COLUMN IF NOT EXISTS "visit_count" INTEGER DEFAULT 0;

-- Comentario
COMMENT ON TABLE site_config IS 'Configuración global del sitio Tropicaña';