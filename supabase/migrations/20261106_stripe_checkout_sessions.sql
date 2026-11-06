-- Stripe Checkout session mapping. Run in the existing Supabase project's SQL editor before enabling checkout.
-- Never expose this table to anonymous or authenticated browser clients.
CREATE TABLE IF NOT EXISTS public.stripe_checkout_sessions (
  order_id uuid PRIMARY KEY REFERENCES public.orders(id) ON DELETE CASCADE,
  session_id text NOT NULL UNIQUE,
  checkout_url text NOT NULL,
  amount_cents bigint NOT NULL CHECK (amount_cents > 0),
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'paid')),
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.stripe_checkout_sessions ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.stripe_checkout_sessions FROM anon, authenticated;
CREATE INDEX IF NOT EXISTS stripe_checkout_sessions_status_idx ON public.stripe_checkout_sessions(status);
