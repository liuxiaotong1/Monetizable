-- Dedicated Quest tables; old Monetizable tables remain untouched.
CREATE TABLE IF NOT EXISTS public.quest_profiles(user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,joined_at timestamptz NOT NULL DEFAULT now(),last_seen_at timestamptz NOT NULL DEFAULT now(),record jsonb,revision bigint NOT NULL DEFAULT 0,tutorial_done boolean NOT NULL DEFAULT false);
CREATE TABLE IF NOT EXISTS public.quest_visits(day date NOT NULL DEFAULT (now() AT TIME ZONE 'UTC')::date,visitor uuid NOT NULL,path text NOT NULL CHECK(path IN ('today','events','learn','auth','brand-proposals')),views integer NOT NULL DEFAULT 1,first_at timestamptz NOT NULL DEFAULT now(),last_at timestamptz NOT NULL DEFAULT now(),PRIMARY KEY(day,visitor,path));
CREATE TABLE IF NOT EXISTS public.quest_rate_limits(key text PRIMARY KEY,window_start timestamptz NOT NULL DEFAULT now(),count integer NOT NULL DEFAULT 1);
ALTER TABLE public.quest_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quest_visits ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quest_rate_limits ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.quest_profiles,public.quest_visits,public.quest_rate_limits FROM anon,authenticated;
