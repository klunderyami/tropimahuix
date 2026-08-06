-- Sistema de Notificaciones Centralizado para Tropicaña
-- Crea la tabla system_notifications para alertas en tiempo real

CREATE TABLE IF NOT EXISTS system_notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source TEXT NOT NULL CHECK (source IN ('reddit', 'lead_web', 'whatsapp', 'system', 'order', 'chat')),
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  action_url TEXT,
  status TEXT NOT NULL DEFAULT 'unread' CHECK (status IN ('unread', 'read')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Índices para optimizar consultas
CREATE INDEX IF NOT EXISTS idx_system_notifications_status ON system_notifications(status);
CREATE INDEX IF NOT EXISTS idx_system_notifications_source ON system_notifications(source);
CREATE INDEX IF NOT EXISTS idx_system_notifications_created_at ON system_notifications(created_at DESC);

-- Trigger para actualizar updated_at automáticamente
CREATE OR REPLACE FUNCTION update_system_notifications_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_system_notifications_updated_at
  BEFORE UPDATE ON system_notifications
  FOR EACH ROW
  EXECUTE FUNCTION update_system_notifications_updated_at();

-- Habilitar Row Level Security (RLS)
ALTER TABLE system_notifications ENABLE ROW LEVEL SECURITY;

-- Política: Admins pueden ver todas las notificaciones
CREATE POLICY "Admins can view all notifications"
  ON system_notifications
  FOR SELECT
  TO authenticated
  USING (true);

-- Política: Admins pueden insertar notificaciones
CREATE POLICY "Admins can insert notifications"
  ON system_notifications
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Política: Admins pueden actualizar notificaciones
CREATE POLICY "Admins can update notifications"
  ON system_notifications
  FOR UPDATE
  TO authenticated
  USING (true);

-- Política: Servicio puede insertar notificaciones (para webhooks)
CREATE POLICY "Service can insert notifications"
  ON system_notifications
  FOR INSERT
  TO service_role
  WITH CHECK (true);

-- Comentarios de documentación
COMMENT ON TABLE system_notifications IS 'Sistema de notificaciones centralizado para alertas en tiempo real del panel de administración';
COMMENT ON COLUMN system_notifications.source IS 'Fuente de la notificación: reddit, lead_web, whatsapp, system, order, chat';
COMMENT ON COLUMN system_notifications.status IS 'Estado de lectura: unread (no leída) o read (leída)';
COMMENT ON COLUMN system_notifications.action_url IS 'URL opcional para redirigir al hacer clic en la notificación';