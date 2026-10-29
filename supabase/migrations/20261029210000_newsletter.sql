-- Optional practice newsletter. Account creation does not insert a row.
-- Service role and the server connection bypass RLS. Authenticated users can
-- read and update only their own row, and a trigger blocks status escalation.

CREATE TABLE IF NOT EXISTS public.newsletter_subscribers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  email text NOT NULL,
  status text NOT NULL CHECK (status IN ('pending', 'subscribed', 'unsubscribed', 'bounced', 'complained')),
  locale text NOT NULL CHECK (locale IN ('en', 'fr', 'zh')),
  consent_at timestamptz,
  consent_source text,
  consent_text_version text,
  requested_at timestamptz,
  confirmed_at timestamptz,
  unsubscribed_at timestamptz,
  unsubscribe_token text NOT NULL,
  confirm_token_hash text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT newsletter_subscribers_email_unique UNIQUE (email),
  CONSTRAINT newsletter_subscribers_token_unique UNIQUE (unsubscribe_token)
);

CREATE UNIQUE INDEX IF NOT EXISTS newsletter_subscribers_user_unique
  ON public.newsletter_subscribers (user_id) WHERE user_id IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS newsletter_subscribers_confirm_hash_unique
  ON public.newsletter_subscribers (confirm_token_hash) WHERE confirm_token_hash IS NOT NULL;
CREATE INDEX IF NOT EXISTS newsletter_subscribers_status_locale_idx
  ON public.newsletter_subscribers (status, locale);

ALTER TABLE public.newsletter_subscribers ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.newsletter_subscribers FROM anon, authenticated;
GRANT SELECT (
  id, user_id, email, status, locale, consent_at, consent_source, consent_text_version,
  requested_at, confirmed_at, unsubscribed_at, created_at, updated_at
) ON public.newsletter_subscribers TO authenticated;
GRANT UPDATE (locale, status, unsubscribed_at, updated_at)
  ON public.newsletter_subscribers TO authenticated;
GRANT ALL ON public.newsletter_subscribers TO service_role;

DO $$ BEGIN
  CREATE POLICY newsletter_subscribers_select_own
    ON public.newsletter_subscribers FOR SELECT TO authenticated
    USING (user_id = auth.uid());
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY newsletter_subscribers_update_own
    ON public.newsletter_subscribers FOR UPDATE TO authenticated
    USING (user_id = auth.uid())
    WITH CHECK (user_id = auth.uid());
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE OR REPLACE FUNCTION public.newsletter_guard_subscriber()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF current_user IN ('authenticated', 'anon') THEN
    NEW.email := OLD.email;
    NEW.user_id := OLD.user_id;
    NEW.unsubscribe_token := OLD.unsubscribe_token;
    NEW.confirm_token_hash := OLD.confirm_token_hash;
    NEW.consent_at := OLD.consent_at;
    NEW.consent_source := OLD.consent_source;
    NEW.consent_text_version := OLD.consent_text_version;
    NEW.requested_at := OLD.requested_at;
    NEW.confirmed_at := OLD.confirmed_at;
    NEW.created_at := OLD.created_at;
    IF NEW.status IS DISTINCT FROM OLD.status THEN
      IF OLD.status IN ('subscribed', 'pending') AND NEW.status = 'unsubscribed' THEN
        NEW.unsubscribed_at := COALESCE(NEW.unsubscribed_at, now());
      ELSE
        NEW.status := OLD.status;
        NEW.unsubscribed_at := OLD.unsubscribed_at;
      END IF;
    END IF;
  END IF;
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS newsletter_subscribers_guard ON public.newsletter_subscribers;
CREATE TRIGGER newsletter_subscribers_guard
  BEFORE UPDATE ON public.newsletter_subscribers
  FOR EACH ROW EXECUTE FUNCTION public.newsletter_guard_subscriber();

CREATE TABLE IF NOT EXISTS public.newsletter_campaigns (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text NOT NULL UNIQUE,
  subject jsonb NOT NULL,
  html jsonb NOT NULL,
  text_body jsonb NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  sent_at timestamptz
);

CREATE TABLE IF NOT EXISTS public.newsletter_sends (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id uuid NOT NULL REFERENCES public.newsletter_campaigns(id) ON DELETE CASCADE,
  subscriber_id uuid REFERENCES public.newsletter_subscribers(id) ON DELETE CASCADE,
  locale text NOT NULL CHECK (locale IN ('en', 'fr', 'zh')),
  status text NOT NULL CHECK (status IN ('queued', 'sent', 'failed', 'skipped')),
  resend_message_id text,
  error text,
  test_send boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (campaign_id, subscriber_id)
);

CREATE INDEX IF NOT EXISTS newsletter_sends_message_idx
  ON public.newsletter_sends (resend_message_id) WHERE resend_message_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS newsletter_sends_campaign_idx
  ON public.newsletter_sends (campaign_id, status);

ALTER TABLE public.newsletter_campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.newsletter_sends ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.newsletter_campaigns, public.newsletter_sends FROM anon, authenticated;
GRANT ALL ON public.newsletter_campaigns, public.newsletter_sends TO service_role;
