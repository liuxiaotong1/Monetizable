CREATE TABLE IF NOT EXISTS public.quest_shared_data(key text PRIMARY KEY,body jsonb NOT NULL,updated_at timestamptz NOT NULL DEFAULT now());
CREATE TABLE IF NOT EXISTS public.quest_subscriptions(user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,customer_id text UNIQUE,subscription_id text UNIQUE,status text NOT NULL DEFAULT 'none',trial_used boolean NOT NULL DEFAULT false,trial_end timestamptz,access_until timestamptz,cancel_at_period_end boolean NOT NULL DEFAULT false,updated_at timestamptz NOT NULL DEFAULT now());
CREATE TABLE IF NOT EXISTS public.quest_stripe_events(id text PRIMARY KEY,created_at timestamptz NOT NULL DEFAULT now());
CREATE TABLE IF NOT EXISTS public.quest_learning_allowance(user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,week date NOT NULL,card_id text NOT NULL,chosen integer NOT NULL,created_at timestamptz NOT NULL DEFAULT now(),PRIMARY KEY(user_id,week));
ALTER TABLE public.quest_shared_data ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quest_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quest_stripe_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quest_learning_allowance ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.quest_shared_data,public.quest_subscriptions,public.quest_stripe_events,public.quest_learning_allowance FROM anon,authenticated;
