-- Additive push preferences and a delivery log. Existing subscription rows stay in place.
ALTER TABLE public.web_push_subscriptions ADD COLUMN IF NOT EXISTS user_id uuid;
ALTER TABLE public.web_push_subscriptions ADD COLUMN IF NOT EXISTS companion text NOT NULL DEFAULT 'supercharlie';
ALTER TABLE public.web_push_subscriptions ADD COLUMN IF NOT EXISTS time_zone text NOT NULL DEFAULT 'Europe/Paris';
ALTER TABLE public.web_push_subscriptions ADD COLUMN IF NOT EXISTS categories jsonb NOT NULL DEFAULT '{"premarket":true,"review":true,"knowledge":true,"event":true}'::jsonb;
ALTER TABLE public.web_push_subscriptions ADD COLUMN IF NOT EXISTS knowledge_time text NOT NULL DEFAULT '12:30';
ALTER TABLE public.web_push_subscriptions ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();
CREATE INDEX IF NOT EXISTS web_push_subscriptions_user_idx ON public.web_push_subscriptions(user_id);

CREATE TABLE IF NOT EXISTS public.web_push_deliveries (
  id bigserial PRIMARY KEY,
  subscription_id bigint NOT NULL REFERENCES public.web_push_subscriptions(id) ON DELETE CASCADE,
  user_id uuid,
  category text NOT NULL,
  slot text NOT NULL,
  sent_on date NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (subscription_id, slot)
);
ALTER TABLE public.web_push_deliveries ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.web_push_deliveries FROM anon, authenticated;
REVOKE ALL ON SEQUENCE public.web_push_deliveries_id_seq FROM anon, authenticated;
CREATE INDEX IF NOT EXISTS web_push_deliveries_user_day_idx ON public.web_push_deliveries(user_id, sent_on);
