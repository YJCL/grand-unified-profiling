DO $private_data$
DECLARE
  table_name text;
BEGIN
  FOREACH table_name IN ARRAY ARRAY['User','ChatLog','Diagnosis','DailyLog','Event','IchingReading','PasswordReset','TransferCode','PushSubscription','BillingEvent'] LOOP
    IF to_regclass(format('public.%I', table_name)) IS NULL THEN
      RAISE EXCEPTION 'Expected private table is missing';
    END IF;
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', table_name);
    EXECUTE format('REVOKE ALL PRIVILEGES ON TABLE public.%I FROM PUBLIC, anon, authenticated', table_name);
  END LOOP;
END
$private_data$;
NOTIFY pgrst, 'reload schema';
