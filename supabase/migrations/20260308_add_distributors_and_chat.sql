-- Migración: Agregar tablas de distribuidores y chat
-- Fecha: 2026-03-08

-- Tabla de leads de distribuidores
CREATE TABLE IF NOT EXISTS distributors_leads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  full_name TEXT NOT NULL,
  phone TEXT NOT NULL,
  email TEXT NOT NULL,
  city_state TEXT NOT NULL,
  business_name TEXT,
  message TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'contacted', 'qualified', 'converted', 'rejected')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ
);

-- Tabla de mensajes de chat
CREATE TABLE IF NOT EXISTS chat_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  message TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'answered', 'closed')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  answered_at TIMESTAMPTZ,
  answer TEXT
);

-- Índices para mejorar el rendimiento de las consultas
CREATE INDEX IF NOT EXISTS idx_distributors_leads_status ON distributors_leads(status);
CREATE INDEX IF NOT EXISTS idx_distributors_leads_created_at ON distributors_leads(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_chat_messages_status ON chat_messages(status);
CREATE INDEX IF NOT EXISTS idx_chat_messages_created_at ON chat_messages(created_at DESC);

-- Habilitar Row Level Security (RLS)
ALTER TABLE distributors_leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_messages ENABLE ROW LEVEL SECURITY;

-- Políticas de seguridad para distributors_leads
-- Los usuarios anónimos pueden insertar leads
CREATE POLICY "Allow public insert on distributors_leads"
  ON distributors_leads
  FOR INSERT
  TO anon
  WITH CHECK (true);

-- Solo usuarios autenticados pueden ver los leads
CREATE POLICY "Allow authenticated read on distributors_leads"
  ON distributors_leads
  FOR SELECT
  TO authenticated
  USING (true);

-- Solo usuarios autenticados pueden actualizar leads
CREATE POLICY "Allow authenticated update on distributors_leads"
  ON distributors_leads
  FOR UPDATE
  TO authenticated
  USING (true);

-- Solo usuarios autenticados pueden eliminar leads
CREATE POLICY "Allow authenticated delete on distributors_leads"
  ON distributors_leads
  FOR DELETE
  TO authenticated
  USING (true);

-- Políticas de seguridad para chat_messages
-- Los usuarios anónimos pueden insertar mensajes
CREATE POLICY "Allow public insert on chat_messages"
  ON chat_messages
  FOR INSERT
  TO anon
  WITH CHECK (true);

-- Solo usuarios autenticados pueden ver los mensajes
CREATE POLICY "Allow authenticated read on chat_messages"
  ON chat_messages
  FOR SELECT
  TO authenticated
  USING (true);

-- Solo usuarios autenticados pueden actualizar mensajes
CREATE POLICY "Allow authenticated update on chat_messages"
  ON chat_messages
  FOR UPDATE
  TO authenticated
  USING (true);

-- Solo usuarios autenticados pueden eliminar mensajes
CREATE POLICY "Allow authenticated delete on chat_messages"
  ON chat_messages
  FOR DELETE
  TO authenticated
  USING (true);

-- Comentarios en las tablas
COMMENT ON TABLE distributors_leads IS 'Leads de potenciales distribuidores de productos Tropicaña';
COMMENT ON TABLE chat_messages IS 'Mensajes de consulta de clientes desde el widget de chat';

-- Función para incrementar el contador de visitas (si no existe)
CREATE OR REPLACE FUNCTION increment_visit_count()
RETURNS INTEGER
LANGUAGE plpgsql
AS $$
DECLARE
  current_count INTEGER;
BEGIN
  -- Intentar actualizar el registro existente
  UPDATE site_config
  SET visit_count = COALESCE(visit_count, 0) + 1
  WHERE id = 1
  RETURNING visit_count INTO current_count;
  
  -- Si no existe el registro, crearlo
  IF current_count IS NULL THEN
    INSERT INTO site_config (id, visit_count)
    VALUES (1, 1)
    RETURNING visit_count INTO current_count;
  END IF;
  
  RETURN current_count;
END;
$$;

-- Trigger para actualizar updated_at en distributors_leads
CREATE OR REPLACE FUNCTION update_distributors_leads_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

CREATE TRIGGER update_distributors_leads_updated_at
  BEFORE UPDATE ON distributors_leads
  FOR EACH ROW
  EXECUTE FUNCTION update_distributors_leads_updated_at();

-- Trigger para actualizar updated_at en chat_messages
CREATE OR REPLACE FUNCTION update_chat_messages_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

CREATE TRIGGER update_chat_messages_updated_at
  BEFORE UPDATE ON chat_messages
  FOR EACH ROW
  EXECUTE FUNCTION update_chat_messages_updated_at();