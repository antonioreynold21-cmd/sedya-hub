-- 1. Enum & tables
CREATE TYPE public.app_role AS ENUM ('master', 'staff');

CREATE TABLE public.profiles (
  id uuid PRIMARY KEY,
  email text NOT NULL,
  full_name text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  role public.app_role NOT NULL DEFAULT 'staff',
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);
GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.module_access (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  module text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, module)
);
GRANT SELECT ON public.module_access TO authenticated;
GRANT ALL ON public.module_access TO service_role;
ALTER TABLE public.module_access ENABLE ROW LEVEL SECURITY;

-- 2. Helper functions (security definer, bypass RLS)
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role);
$$;

CREATE OR REPLACE FUNCTION public.is_master()
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT public.has_role(auth.uid(), 'master');
$$;

CREATE OR REPLACE FUNCTION public.can_access(_module text)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT auth.uid() IS NOT NULL AND (
    public.has_role(auth.uid(), 'master')
    OR EXISTS (SELECT 1 FROM public.module_access WHERE user_id = auth.uid() AND module = _module)
  );
$$;

CREATE OR REPLACE FUNCTION public.can_access_any(_modules text[])
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT auth.uid() IS NOT NULL AND (
    public.has_role(auth.uid(), 'master')
    OR EXISTS (SELECT 1 FROM public.module_access WHERE user_id = auth.uid() AND module = ANY(_modules))
  );
$$;

-- 3. Bootstrap: create profile + role for the signed-in user (first ever user = master)
CREATE OR REPLACE FUNCTION public.bootstrap_current_user()
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_email text;
  v_role public.app_role;
  v_has_master boolean;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  SELECT email INTO v_email FROM auth.users WHERE id = v_uid;

  INSERT INTO public.profiles (id, email)
  VALUES (v_uid, COALESCE(v_email, 'unknown'))
  ON CONFLICT (id) DO UPDATE SET email = EXCLUDED.email, updated_at = now();

  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE role = 'master') INTO v_has_master;

  IF NOT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = v_uid) THEN
    v_role := CASE WHEN v_has_master THEN 'staff'::public.app_role ELSE 'master'::public.app_role END;
    INSERT INTO public.user_roles (user_id, role) VALUES (v_uid, v_role)
    ON CONFLICT (user_id, role) DO NOTHING;
  END IF;

  SELECT role INTO v_role FROM public.user_roles WHERE user_id = v_uid ORDER BY role LIMIT 1;

  RETURN jsonb_build_object(
    'user_id', v_uid,
    'role', v_role,
    'modules', COALESCE((SELECT jsonb_agg(module) FROM public.module_access WHERE user_id = v_uid), '[]'::jsonb)
  );
END;
$$;
REVOKE ALL ON FUNCTION public.bootstrap_current_user() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.bootstrap_current_user() TO authenticated;

-- 4. Master-only admin functions
CREATE OR REPLACE FUNCTION public.admin_list_users()
RETURNS TABLE (user_id uuid, email text, role public.app_role, modules text[])
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT public.is_master() THEN
    RAISE EXCEPTION 'Forbidden: master only';
  END IF;
  RETURN QUERY
  SELECT p.id,
         p.email,
         COALESCE((SELECT r.role FROM public.user_roles r WHERE r.user_id = p.id ORDER BY r.role LIMIT 1), 'staff'::public.app_role),
         COALESCE((SELECT array_agg(m.module ORDER BY m.module) FROM public.module_access m WHERE m.user_id = p.id), '{}'::text[])
  FROM public.profiles p
  ORDER BY p.email;
END;
$$;
REVOKE ALL ON FUNCTION public.admin_list_users() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_list_users() TO authenticated;

CREATE OR REPLACE FUNCTION public.admin_set_modules(p_user_id uuid, p_modules text[])
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT public.is_master() THEN
    RAISE EXCEPTION 'Forbidden: master only';
  END IF;
  DELETE FROM public.module_access WHERE user_id = p_user_id;
  INSERT INTO public.module_access (user_id, module)
  SELECT p_user_id, m
  FROM unnest(COALESCE(p_modules, '{}'::text[])) AS m
  WHERE m IN ('dashboard','crm','finance','orders','shipments','pricelist','workflow','team')
  ON CONFLICT (user_id, module) DO NOTHING;
END;
$$;
REVOKE ALL ON FUNCTION public.admin_set_modules(uuid, text[]) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_set_modules(uuid, text[]) TO authenticated;

CREATE OR REPLACE FUNCTION public.admin_set_role(p_user_id uuid, p_role public.app_role)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT public.is_master() THEN
    RAISE EXCEPTION 'Forbidden: master only';
  END IF;
  IF p_user_id = auth.uid() AND p_role <> 'master' THEN
    RAISE EXCEPTION 'Tidak bisa menurunkan peran akun sendiri';
  END IF;
  DELETE FROM public.user_roles WHERE user_id = p_user_id;
  INSERT INTO public.user_roles (user_id, role) VALUES (p_user_id, p_role)
  ON CONFLICT (user_id, role) DO NOTHING;
END;
$$;
REVOKE ALL ON FUNCTION public.admin_set_role(uuid, public.app_role) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_set_role(uuid, public.app_role) TO authenticated;

-- 5. RLS on new tables
CREATE POLICY profiles_select_own_or_master ON public.profiles
  FOR SELECT TO authenticated USING (id = auth.uid() OR public.is_master());
CREATE POLICY profiles_update_own ON public.profiles
  FOR UPDATE TO authenticated USING (id = auth.uid()) WITH CHECK (id = auth.uid());
CREATE POLICY profiles_insert_own ON public.profiles
  FOR INSERT TO authenticated WITH CHECK (id = auth.uid());

CREATE POLICY user_roles_select_own_or_master ON public.user_roles
  FOR SELECT TO authenticated USING (user_id = auth.uid() OR public.is_master());

CREATE POLICY module_access_select_own_or_master ON public.module_access
  FOR SELECT TO authenticated USING (user_id = auth.uid() OR public.is_master());

CREATE TRIGGER profiles_set_updated_at BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- 6. Replace blanket internal policies with module-scoped ones
DROP POLICY IF EXISTS internal_all_clients ON public.clients;
CREATE POLICY clients_module ON public.clients FOR ALL TO authenticated
  USING (public.can_access_any(ARRAY['crm','orders'])) WITH CHECK (public.can_access('crm'));

DROP POLICY IF EXISTS internal_all_payables ON public.payables;
CREATE POLICY payables_module ON public.payables FOR ALL TO authenticated
  USING (public.can_access('finance')) WITH CHECK (public.can_access('finance'));

DROP POLICY IF EXISTS internal_all_receivables ON public.receivables;
CREATE POLICY receivables_module ON public.receivables FOR ALL TO authenticated
  USING (public.can_access('finance')) WITH CHECK (public.can_access('finance'));

DROP POLICY IF EXISTS internal_all_cash_requests ON public.cash_requests;
CREATE POLICY cash_requests_module ON public.cash_requests FOR ALL TO authenticated
  USING (public.can_access('finance')) WITH CHECK (public.can_access('finance'));

DROP POLICY IF EXISTS internal_all_expenses ON public.expenses;
CREATE POLICY expenses_module ON public.expenses FOR ALL TO authenticated
  USING (public.can_access('finance')) WITH CHECK (public.can_access('finance'));

DROP POLICY IF EXISTS internal_all_orders ON public.orders;
CREATE POLICY orders_module ON public.orders FOR ALL TO authenticated
  USING (public.can_access_any(ARRAY['orders','shipments'])) WITH CHECK (public.can_access('orders'));

DROP POLICY IF EXISTS internal_all_order_items ON public.order_items;
CREATE POLICY order_items_module ON public.order_items FOR ALL TO authenticated
  USING (public.can_access_any(ARRAY['orders','shipments'])) WITH CHECK (public.can_access('orders'));

DROP POLICY IF EXISTS internal_all_shipments ON public.shipments;
CREATE POLICY shipments_module ON public.shipments FOR ALL TO authenticated
  USING (public.can_access_any(ARRAY['shipments','orders'])) WITH CHECK (public.can_access_any(ARRAY['shipments','orders']));

DROP POLICY IF EXISTS internal_all_pricelist ON public.pricelist_items;
CREATE POLICY pricelist_module ON public.pricelist_items FOR ALL TO authenticated
  USING (public.can_access('pricelist')) WITH CHECK (public.can_access('pricelist'));

DROP POLICY IF EXISTS internal_all_tasks ON public.tasks;
CREATE POLICY tasks_module ON public.tasks FOR ALL TO authenticated
  USING (public.can_access('workflow')) WITH CHECK (public.can_access('workflow'));

DROP POLICY IF EXISTS internal_all_team_members ON public.team_members;
CREATE POLICY team_members_module ON public.team_members FOR ALL TO authenticated
  USING (public.can_access_any(ARRAY['team','crm','workflow','orders','shipments','finance']))
  WITH CHECK (public.can_access('team'));

-- 7. Seed: existing signed-up users get profiles; oldest becomes master
INSERT INTO public.profiles (id, email)
SELECT u.id, COALESCE(u.email, 'unknown') FROM auth.users u
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.user_roles (user_id, role)
SELECT u.id, 'master'::public.app_role
FROM auth.users u
ORDER BY u.created_at
LIMIT 1
ON CONFLICT (user_id, role) DO NOTHING;

INSERT INTO public.user_roles (user_id, role)
SELECT u.id, 'staff'::public.app_role
FROM auth.users u
WHERE NOT EXISTS (SELECT 1 FROM public.user_roles r WHERE r.user_id = u.id)
ON CONFLICT (user_id, role) DO NOTHING;