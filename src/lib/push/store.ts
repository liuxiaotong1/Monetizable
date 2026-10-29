import "server-only";
import { database } from "@/lib/account/db";

let schemaReady: Promise<void> | null = null;

const schema = `
      CREATE TABLE IF NOT EXISTS public.web_push_subscriptions (
        id bigserial PRIMARY KEY,
        endpoint text NOT NULL UNIQUE,
        p256dh text NOT NULL,
        auth text NOT NULL,
        locale text NOT NULL DEFAULT 'en' CHECK (locale IN ('en', 'fr', 'zh')),
        created_at timestamptz NOT NULL DEFAULT now(),
        last_sent_on date,
        last_attempt_on date,
        user_id uuid,
        companion text NOT NULL DEFAULT 'supercharlie',
        time_zone text NOT NULL DEFAULT 'Europe/Paris',
        categories jsonb NOT NULL DEFAULT '{"premarket":true,"review":true,"knowledge":true,"event":true}'::jsonb,
        knowledge_time text NOT NULL DEFAULT '12:30',
        updated_at timestamptz NOT NULL DEFAULT now()
      );
      ALTER TABLE public.web_push_subscriptions ADD COLUMN IF NOT EXISTS user_id uuid;
      ALTER TABLE public.web_push_subscriptions ADD COLUMN IF NOT EXISTS companion text NOT NULL DEFAULT 'supercharlie';
      ALTER TABLE public.web_push_subscriptions ADD COLUMN IF NOT EXISTS time_zone text NOT NULL DEFAULT 'Europe/Paris';
      ALTER TABLE public.web_push_subscriptions ADD COLUMN IF NOT EXISTS categories jsonb NOT NULL DEFAULT '{"premarket":true,"review":true,"knowledge":true,"event":true}'::jsonb;
      ALTER TABLE public.web_push_subscriptions ADD COLUMN IF NOT EXISTS knowledge_time text NOT NULL DEFAULT '12:30';
      ALTER TABLE public.web_push_subscriptions ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();
      ALTER TABLE public.web_push_subscriptions ENABLE ROW LEVEL SECURITY;
      REVOKE ALL ON public.web_push_subscriptions FROM anon, authenticated;
      REVOKE ALL ON SEQUENCE public.web_push_subscriptions_id_seq FROM anon, authenticated;
      CREATE INDEX IF NOT EXISTS web_push_subscriptions_pending_idx ON public.web_push_subscriptions(last_sent_on);
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
`;

export function ensureWebPushStore() {
  if (!schemaReady) {
    schemaReady = database().query(schema).then(() => undefined).catch((error) => {
      schemaReady = null;
      throw error;
    });
  }
  return schemaReady;
}
