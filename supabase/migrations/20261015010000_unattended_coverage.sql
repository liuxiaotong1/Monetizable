-- One cloud clock covers all hours, including DST transitions and overnight news.
-- HTTP outcomes remain inspectable separately from pg_cron's enqueue result.
SELECT cron.alter_job(jobid, schedule := '*/5 * * * *', active := true)
FROM cron.job WHERE jobname = 'monetizable-market-data';
SELECT cron.alter_job(jobid, active := false)
FROM cron.job WHERE jobname = 'monetizable-sunday-outlook';
