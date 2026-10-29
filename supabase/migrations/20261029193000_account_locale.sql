-- Account language for reminders. Null on existing rows until the next signed-in visit or an explicit language change.
ALTER TABLE public.quest_profiles ADD COLUMN IF NOT EXISTS locale text;
