CREATE TABLE IF NOT EXISTS public.quest_learning_daily(subject text NOT NULL,day date NOT NULL,card_id text NOT NULL,chosen integer NOT NULL,created_at timestamptz NOT NULL DEFAULT now(),PRIMARY KEY(subject,day,card_id));
CREATE TABLE IF NOT EXISTS public.quest_learning_guests(id uuid PRIMARY KEY,user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL);
ALTER TABLE public.quest_learning_daily ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quest_learning_guests ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.quest_learning_daily,public.quest_learning_guests FROM anon,authenticated;
