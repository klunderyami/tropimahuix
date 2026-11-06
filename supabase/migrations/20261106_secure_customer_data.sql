-- Hardening de RLS para datos personales. Aplicar tras verificar los roles de administradores.
-- El rol debe asignarse exclusivamente mediante app_metadata (no user_metadata).
BEGIN;
DROP POLICY IF EXISTS "Allow authenticated read on distributors_leads" ON public.distributors_leads;
DROP POLICY IF EXISTS "Allow authenticated update on distributors_leads" ON public.distributors_leads;
DROP POLICY IF EXISTS "Allow authenticated delete on distributors_leads" ON public.distributors_leads;
DROP POLICY IF EXISTS "Allow authenticated read on chat_messages" ON public.chat_messages;
DROP POLICY IF EXISTS "Allow authenticated update on chat_messages" ON public.chat_messages;
DROP POLICY IF EXISTS "Allow authenticated delete on chat_messages" ON public.chat_messages;
CREATE POLICY "admin_select_distributors_leads" ON public.distributors_leads FOR SELECT TO authenticated USING ((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin');
CREATE POLICY "admin_update_distributors_leads" ON public.distributors_leads FOR UPDATE TO authenticated USING ((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin') WITH CHECK ((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin');
CREATE POLICY "admin_delete_distributors_leads" ON public.distributors_leads FOR DELETE TO authenticated USING ((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin');
CREATE POLICY "admin_select_chat_messages" ON public.chat_messages FOR SELECT TO authenticated USING ((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin');
CREATE POLICY "admin_update_chat_messages" ON public.chat_messages FOR UPDATE TO authenticated USING ((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin') WITH CHECK ((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin');
CREATE POLICY "admin_delete_chat_messages" ON public.chat_messages FOR DELETE TO authenticated USING ((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin');
-- El trigger original usa una columna updated_at inexistente en chat_messages.
DROP TRIGGER IF EXISTS update_chat_messages_updated_at ON public.chat_messages;
COMMIT;
