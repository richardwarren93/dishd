-- ============================================================
-- pg_cron job: trigger extract-recipe edge function every 30s
-- Run this AFTER deploying the extract-recipe edge function.
-- Replace <your-project-ref> and <your-service-role-key> with actual values.
-- ============================================================

-- NOTE: pg_cron runs on a 1-minute minimum schedule natively.
-- For sub-minute polling (30s), we schedule two jobs at :00 and :30.

select cron.schedule(
  'extract-recipes-on-the-minute',
  '* * * * *',
  $$
  select net.http_post(
    url := 'https://<your-project-ref>.supabase.co/functions/v1/extract-recipe',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer <your-service-role-key>'
    ),
    body := '{}'::jsonb
  );
  $$
);

-- Second job at 30s offset uses pg_sleep to approximate sub-minute
select cron.schedule(
  'extract-recipes-half-minute',
  '* * * * *',
  $$
  select pg_sleep(30);
  select net.http_post(
    url := 'https://<your-project-ref>.supabase.co/functions/v1/extract-recipe',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer <your-service-role-key>'
    ),
    body := '{}'::jsonb
  );
  $$
);
