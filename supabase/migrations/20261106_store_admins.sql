-- Migración incremental: mantiene products, orders, gallery, distributors_leads y chat_messages existentes.
-- No se migran contraseñas de Firebase: cada usuario se registra/inicia sesión en Supabase Auth.
CREATE TABLE IF NOT EXISTS public.store_admins (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.store_admins ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.store_admins FROM anon, authenticated;
-- Sin políticas de lectura/escritura para clientes; solo el backend con service role puede consultar.
-- Tras crear/verificar el usuario en Authentication > Users, un operador autorizado debe ejecutar:
-- INSERT INTO public.store_admins(user_id) VALUES ('UUID-DEL-USUARIO') ON CONFLICT DO NOTHING;
-- No insertar por correo ni conceder admin automáticamente.
