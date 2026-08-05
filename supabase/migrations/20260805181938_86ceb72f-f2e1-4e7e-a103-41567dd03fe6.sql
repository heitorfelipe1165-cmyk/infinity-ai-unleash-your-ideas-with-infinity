-- Replace has_role() usage in policies with direct, non-recursive checks on user_roles
DROP POLICY IF EXISTS "admin requests all" ON public.payment_requests;
CREATE POLICY "admin requests all" ON public.payment_requests
  FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.user_roles ur WHERE ur.user_id = auth.uid() AND ur.role = 'admin'::app_role))
  WITH CHECK (EXISTS (SELECT 1 FROM public.user_roles ur WHERE ur.user_id = auth.uid() AND ur.role = 'admin'::app_role));

DROP POLICY IF EXISTS "admin profile select" ON public.profiles;
CREATE POLICY "admin profile select" ON public.profiles
  FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.user_roles ur WHERE ur.user_id = auth.uid() AND ur.role = 'admin'::app_role));

DROP POLICY IF EXISTS "admin profile update" ON public.profiles;
CREATE POLICY "admin profile update" ON public.profiles
  FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM public.user_roles ur WHERE ur.user_id = auth.uid() AND ur.role = 'admin'::app_role))
  WITH CHECK (EXISTS (SELECT 1 FROM public.user_roles ur WHERE ur.user_id = auth.uid() AND ur.role = 'admin'::app_role));

-- Admins do not need to read other users' role rows; own-role read remains
DROP POLICY IF EXISTS "admin reads roles" ON public.user_roles;

-- Keep the subscription guard trigger working without has_role() execute rights
CREATE OR REPLACE FUNCTION public.prevent_self_subscription_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  IF NEW.subscription_status IS DISTINCT FROM OLD.subscription_status
     AND auth.uid() = OLD.id
     AND NOT EXISTS (
       SELECT 1 FROM public.user_roles ur
       WHERE ur.user_id = auth.uid() AND ur.role = 'admin'::app_role
     ) THEN
    RAISE EXCEPTION 'Não é permitido alterar o próprio status de assinatura';
  END IF;
  RETURN NEW;
END;
$function$;

-- Revoke direct execution of SECURITY DEFINER functions from API roles
REVOKE ALL ON FUNCTION public.has_role(uuid, app_role) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.has_role(uuid, app_role) FROM anon;
REVOKE ALL ON FUNCTION public.has_role(uuid, app_role) FROM authenticated;
REVOKE ALL ON FUNCTION public.prevent_self_subscription_change() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.prevent_self_subscription_change() FROM anon;
REVOKE ALL ON FUNCTION public.prevent_self_subscription_change() FROM authenticated;