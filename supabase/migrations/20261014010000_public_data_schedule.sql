-- The scheduler calls the existing public refresh endpoint. No credentials are put
-- into pg_net's transient queue (managed pg_net tables may be readable by PUBLIC).
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;
CREATE TABLE IF NOT EXISTS public.quest_update_requests (
 id bigint PRIMARY KEY,
 created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.quest_update_requests ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.quest_update_requests FROM anon, authenticated;
SELECT cron.schedule('monetizable-market-data','*/5 11-22 * * 1-5',$job$
 INSERT INTO public.quest_update_requests(id)
 SELECT net.http_get(url := 'https://getmonetizable.com/api/refresh', timeout_milliseconds := 60000);
$job$);
SELECT cron.schedule('monetizable-sunday-outlook','*/5 17-18 * * 0',$job$
 INSERT INTO public.quest_update_requests(id)
 SELECT net.http_get(url := 'https://getmonetizable.com/api/refresh', timeout_milliseconds := 60000);
$job$);
