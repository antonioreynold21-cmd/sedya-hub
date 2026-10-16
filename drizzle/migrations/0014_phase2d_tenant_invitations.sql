CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA extensions;
CREATE TABLE public.tenant_invitations(
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 tenant_id uuid NOT NULL REFERENCES public.tenants(id),
 email text NOT NULL CHECK (email = lower(btrim(email)) AND email ~ '^[^@\s]+@[^@\s]+\.[^@\s]+$'),
 role public.app_role NOT NULL DEFAULT 'staff',
 modules text[] NOT NULL DEFAULT '{}' CHECK (modules <@ ARRAY['dashboard','crm','finance','orders','quotations','shipments','pricelist','workflow','team']::text[]),
 token_hash text NOT NULL UNIQUE,
 status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','accepted','revoked')),
 expires_at timestamptz NOT NULL DEFAULT now() + interval '7 days',
 created_by uuid,
 accepted_by uuid,
 accepted_at timestamptz,
 revoked_at timestamptz,
 created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX tenant_invitations_tenant_idx ON public.tenant_invitations(tenant_id,status);
GRANT SELECT ON public.tenant_invitations TO authenticated;
GRANT ALL ON public.tenant_invitations TO service_role;
ALTER TABLE public.tenant_invitations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Master melihat undangan tenant" ON public.tenant_invitations FOR SELECT TO authenticated USING (tenant_id = public.active_tenant_id() AND public.has_tenant_role(tenant_id,'master'));

CREATE FUNCTION public.invite_hash(p_token text) RETURNS text LANGUAGE sql IMMUTABLE SET search_path=public,extensions AS $$ SELECT encode(extensions.digest(convert_to(coalesce(p_token,''),'UTF8'),'sha256'),'hex') $$;
REVOKE EXECUTE ON FUNCTION public.invite_hash(text) FROM PUBLIC, anon;

CREATE FUNCTION public.create_tenant_invitation(p_email text,p_role public.app_role,p_modules text[]) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,extensions AS $$
DECLARE tid uuid:=public.active_tenant_id(); tok text; iid uuid; em text:=lower(btrim(coalesce(p_email,'')));
BEGIN
 IF tid IS NULL OR NOT public.has_tenant_role(tid,'master') THEN RAISE EXCEPTION 'Khusus Master'; END IF;
 IF EXISTS(SELECT 1 FROM public.tenant_memberships m JOIN auth.users u ON u.id=m.user_id WHERE m.tenant_id=tid AND m.status='active' AND lower(u.email)=em) THEN RAISE EXCEPTION 'Email sudah menjadi anggota bisnis ini'; END IF;
 UPDATE public.tenant_invitations SET status='revoked',revoked_at=now() WHERE tenant_id=tid AND email=em AND status='pending';
 tok:=encode(extensions.gen_random_bytes(32),'hex');
 INSERT INTO public.tenant_invitations(tenant_id,email,role,modules,token_hash,created_by)
 VALUES(tid,em,p_role,CASE WHEN p_role='master' THEN '{}'::text[] ELSE coalesce(p_modules,'{}') END,public.invite_hash(tok),auth.uid()) RETURNING id INTO iid;
 INSERT INTO public.audit_logs(tenant_id,actor_id,action,entity_type,entity_id,diff) VALUES(tid,auth.uid(),'invite_create','tenant_invitations',iid,jsonb_build_object('email',em,'role',p_role,'modules',p_modules));
 RETURN jsonb_build_object('id',iid,'token',tok);
END $$;

CREATE FUNCTION public.revoke_tenant_invitation(p_id uuid) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE tid uuid:=public.active_tenant_id();
BEGIN
 IF tid IS NULL OR NOT public.has_tenant_role(tid,'master') THEN RAISE EXCEPTION 'Khusus Master'; END IF;
 UPDATE public.tenant_invitations SET status='revoked',revoked_at=now() WHERE id=p_id AND tenant_id=tid AND status='pending';
 IF NOT FOUND THEN RAISE EXCEPTION 'Undangan tidak ditemukan'; END IF;
 INSERT INTO public.audit_logs(tenant_id,actor_id,action,entity_type,entity_id,diff) VALUES(tid,auth.uid(),'invite_revoke','tenant_invitations',p_id,'{}'::jsonb);
END $$;

CREATE FUNCTION public.preview_tenant_invitation(p_token text) RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path=public AS $$
DECLARE r record;
BEGIN
 SELECT i.email,i.role,t.name INTO r FROM public.tenant_invitations i JOIN public.tenants t ON t.id=i.tenant_id
 WHERE i.token_hash=public.invite_hash(p_token) AND i.status='pending' AND i.expires_at>now() AND t.status='active';
 IF NOT FOUND THEN RAISE EXCEPTION 'Undangan tidak valid atau sudah tidak berlaku'; END IF;
 RETURN jsonb_build_object('business',r.name,'email',r.email,'role',r.role);
END $$;

CREATE FUNCTION public.accept_tenant_invitation(p_token text) RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE uid uuid:=auth.uid(); inv public.tenant_invitations; u record;
BEGIN
 IF uid IS NULL THEN RAISE EXCEPTION 'Belum masuk'; END IF;
 SELECT * INTO inv FROM public.tenant_invitations WHERE token_hash=public.invite_hash(p_token) FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'Undangan tidak valid atau sudah tidak berlaku'; END IF;
 IF inv.status='accepted' AND inv.accepted_by=uid THEN RETURN inv.tenant_id; END IF;
 IF inv.status<>'pending' OR inv.expires_at<=now() OR NOT EXISTS(SELECT 1 FROM public.tenants WHERE id=inv.tenant_id AND status='active') THEN RAISE EXCEPTION 'Undangan tidak valid atau sudah tidak berlaku'; END IF;
 SELECT email,email_confirmed_at INTO u FROM auth.users WHERE id=uid;
 IF u.email IS NULL OR lower(u.email)<>inv.email OR lower(coalesce(auth.jwt()->>'email',''))<>inv.email THEN RAISE EXCEPTION 'Undangan ini untuk email lain'; END IF;
 IF u.email_confirmed_at IS NULL THEN RAISE EXCEPTION 'Konfirmasi email terlebih dahulu'; END IF;
 INSERT INTO public.profiles(id,email) VALUES(uid,inv.email) ON CONFLICT(id) DO NOTHING;
 IF EXISTS(SELECT 1 FROM public.tenant_memberships WHERE tenant_id=inv.tenant_id AND user_id=uid AND status='active') THEN
   -- akun lama: akses yang ada tidak diubah
   NULL;
 ELSE
   INSERT INTO public.tenant_memberships(tenant_id,user_id,status) VALUES(inv.tenant_id,uid,'active') ON CONFLICT(tenant_id,user_id) DO UPDATE SET status='active';
   INSERT INTO public.user_roles(tenant_id,user_id,role) VALUES(inv.tenant_id,uid,inv.role) ON CONFLICT DO NOTHING;
   INSERT INTO public.module_access(tenant_id,user_id,module) SELECT inv.tenant_id,uid,m FROM unnest(inv.modules) m ON CONFLICT DO NOTHING;
 END IF;
 UPDATE public.tenant_invitations SET status='accepted',accepted_by=uid,accepted_at=now() WHERE id=inv.id;
 UPDATE public.profiles SET active_tenant_id=inv.tenant_id WHERE id=uid;
 INSERT INTO public.audit_logs(tenant_id,actor_id,action,entity_type,entity_id,diff) VALUES(inv.tenant_id,uid,'invite_accept','tenant_invitations',inv.id,jsonb_build_object('role',inv.role,'modules',inv.modules));
 RETURN inv.tenant_id;
END $$;

CREATE FUNCTION public.operator_create_business(p_slug text,p_name text,p_master_email text) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,extensions AS $$
DECLARE tid uuid; tok text; iid uuid; em text:=lower(btrim(coalesce(p_master_email,'')));
BEGIN
 IF NOT EXISTS(SELECT 1 FROM public.platform_admins WHERE user_id=auth.uid()) THEN RAISE EXCEPTION 'Khusus operator platform'; END IF;
 IF coalesce(btrim(p_name),'')='' OR p_slug !~ '^[a-z0-9][a-z0-9-]{1,40}$' THEN RAISE EXCEPTION 'Nama atau slug tidak valid'; END IF;
 INSERT INTO public.tenants(slug,name,is_demo) VALUES(p_slug,btrim(p_name),false) RETURNING id INTO tid;
 INSERT INTO public.tenant_settings(tenant_id) VALUES(tid);
 tok:=encode(extensions.gen_random_bytes(32),'hex');
 INSERT INTO public.tenant_invitations(tenant_id,email,role,token_hash,created_by) VALUES(tid,em,'master',public.invite_hash(tok),auth.uid()) RETURNING id INTO iid;
 INSERT INTO public.audit_logs(tenant_id,actor_id,action,entity_type,entity_id,diff) VALUES(tid,auth.uid(),'invite_create','tenant_invitations',iid,jsonb_build_object('email',em,'role','master','operator',true));
 RETURN jsonb_build_object('tenant_id',tid,'token',tok);
END $$;

CREATE FUNCTION public.is_platform_operator() RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public AS $$ SELECT EXISTS(SELECT 1 FROM public.platform_admins WHERE user_id=auth.uid()) $$;

REVOKE EXECUTE ON FUNCTION public.create_tenant_invitation(text,public.app_role,text[]), public.revoke_tenant_invitation(uuid), public.accept_tenant_invitation(text), public.operator_create_business(text,text,text), public.is_platform_operator() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.create_tenant_invitation(text,public.app_role,text[]), public.revoke_tenant_invitation(uuid), public.accept_tenant_invitation(text), public.operator_create_business(text,text,text), public.is_platform_operator() TO authenticated;
REVOKE EXECUTE ON FUNCTION public.preview_tenant_invitation(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.preview_tenant_invitation(text) TO anon, authenticated;