-- Dedicated QUEST_DATA_CRON_SECRET must be saved as monetizable_cron_secret in Supabase Vault.
-- No service key or secret value is embedded in this migration or cron command.
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;
SELECT cron.schedule('monetizable-market-data','*/5 11-22 * * 1-5',$job$
 SELECT net.http_get(
  url := 'https://getmonetizable.com/api/internal/update',
  headers := jsonb_build_object('Authorization','Bearer '||(SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name='monetizable_cron_secret')),
  timeout_milliseconds := 60000
 );
$job$);
SELECT cron.schedule('monetizable-sunday-outlook','*/5 17-18 * * 0',$job$
 SELECT net.http_get(
  url := 'https://getmonetizable.com/api/internal/update',
  headers := jsonb_build_object('Authorization','Bearer '||(SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name='monetizable_cron_secret')),
  timeout_milliseconds := 60000
 );
$job$);
-- pg_net's transient request queue contains Authorization headers. Keep it private.
REVOKE SELECT ON TABLE net.http_request_queue FROM PUBLIC, anon, authenticated;
REVOKE SELECT ON TABLE net._http_response FROM PUBLIC, anon, authenticated;
