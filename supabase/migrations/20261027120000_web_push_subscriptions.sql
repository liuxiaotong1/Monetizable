CREATE TABLE IF NOT EXISTS public.web_push_subscriptions (
  id bigserial PRIMARY KEY,
  endpoint text NOT NULL UNIQUE,
  p256dh text NOT NULL,
  auth text NOT NULL,
  locale text NOT NULL DEFAULT 'en' CHECK (locale IN ('en', 'fr', 'zh')),
  created_at timestamptz NOT NULL DEFAULT now(),
  last_sent_on date,
  last_attempt_on date
);
ALTER TABLE public.web_push_subscriptions ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.web_push_subscriptions FROM anon, authenticated;
REVOKE ALL ON SEQUENCE public.web_push_subscriptions_id_seq FROM anon, authenticated;
CREATE INDEX IF NOT EXISTS web_push_subscriptions_pending_idx
  ON public.web_push_subscriptions(last_sent_on);
