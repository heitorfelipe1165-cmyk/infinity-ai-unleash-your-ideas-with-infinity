ALTER TABLE public.subscriptions
  ADD COLUMN IF NOT EXISTS plan text NOT NULL DEFAULT 'pro';

ALTER TABLE public.subscriptions
  DROP CONSTRAINT IF EXISTS subscriptions_plan_valid;

CREATE OR REPLACE FUNCTION public.validate_subscription_plan()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.plan NOT IN ('free', 'pro', 'infinite') THEN
    RAISE EXCEPTION 'Plano inválido: %', NEW.plan;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS subscriptions_validate_plan ON public.subscriptions;
CREATE TRIGGER subscriptions_validate_plan
  BEFORE INSERT OR UPDATE ON public.subscriptions
  FOR EACH ROW EXECUTE FUNCTION public.validate_subscription_plan();

REVOKE ALL ON FUNCTION public.validate_subscription_plan() FROM PUBLIC, anon, authenticated;