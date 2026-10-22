CREATE OR REPLACE FUNCTION public.admin_set_modules(p_user_id uuid, p_modules text[])
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
BEGIN
 IF NOT public.is_master() OR NOT EXISTS(SELECT 1 FROM public.tenant_memberships WHERE tenant_id=public.active_tenant_id() AND user_id=p_user_id AND status='active') THEN RAISE EXCEPTION 'Tidak berizin'; END IF;
 DELETE FROM public.module_access WHERE tenant_id=public.active_tenant_id() AND user_id=p_user_id;
 INSERT INTO public.module_access(tenant_id,user_id,module) SELECT public.active_tenant_id(),p_user_id,m FROM unnest(COALESCE(p_modules,'{}'::text[])) m WHERE m IN ('dashboard','crm','finance','orders','quotations','shipments','pricelist','workflow','team','pembelanjaan') ON CONFLICT DO NOTHING;
END $$;
REVOKE ALL ON FUNCTION public.admin_set_modules(uuid,text[]) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.admin_set_modules(uuid,text[]) TO authenticated;
ALTER TABLE public.tenant_invitations DROP CONSTRAINT tenant_invitations_modules_check;
ALTER TABLE public.tenant_invitations ADD CONSTRAINT tenant_invitations_modules_check CHECK(modules <@ ARRAY['dashboard','crm','finance','orders','quotations','shipments','pricelist','workflow','team','pembelanjaan']::text[]);

CREATE TABLE public.vendors (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 tenant_id uuid NOT NULL DEFAULT public.active_tenant_id() REFERENCES public.tenants(id),
 nama text NOT NULL CHECK(btrim(nama)<>''), kategori text, kontak text, catatan text,
 aktif boolean NOT NULL DEFAULT true,
 created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(),
 deleted_at timestamptz, deleted_by uuid, delete_reason text,
 UNIQUE(tenant_id,id)
);
GRANT SELECT,INSERT,UPDATE ON public.vendors TO authenticated;
GRANT ALL ON public.vendors TO service_role;
ALTER TABLE public.vendors ENABLE ROW LEVEL SECURITY;
CREATE POLICY vendors_select ON public.vendors FOR SELECT TO authenticated USING(public.can_access_tenant_module(tenant_id,'pembelanjaan'));
CREATE POLICY vendors_insert ON public.vendors FOR INSERT TO authenticated WITH CHECK(tenant_id=public.active_tenant_id() AND public.has_tenant_role(tenant_id,'master'));
CREATE POLICY vendors_update ON public.vendors FOR UPDATE TO authenticated USING(tenant_id=public.active_tenant_id() AND public.has_tenant_role(tenant_id,'master')) WITH CHECK(tenant_id=public.active_tenant_id() AND public.has_tenant_role(tenant_id,'master'));
CREATE POLICY vendors_delete ON public.vendors FOR DELETE TO authenticated USING(false);
CREATE UNIQUE INDEX vendors_nama_live_unique ON public.vendors(tenant_id,lower(btrim(nama))) WHERE deleted_at IS NULL;
CREATE TRIGGER vendors_guard BEFORE INSERT OR UPDATE OR DELETE ON public.vendors FOR EACH ROW EXECUTE FUNCTION public.guard_business_row();
CREATE TRIGGER vendors_updated BEFORE UPDATE ON public.vendors FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER vendors_audit AFTER INSERT OR UPDATE ON public.vendors FOR EACH ROW EXECUTE FUNCTION public.audit_business_change();

CREATE TABLE public.item_vendor_default (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 tenant_id uuid NOT NULL DEFAULT public.active_tenant_id() REFERENCES public.tenants(id),
 item_id uuid NOT NULL, vendor_utama_id uuid NOT NULL, vendor_cadangan_id uuid,
 created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(),
 UNIQUE(tenant_id,item_id),
 CONSTRAINT item_vendor_default_different CHECK(vendor_cadangan_id<>vendor_utama_id),
 FOREIGN KEY(tenant_id,item_id) REFERENCES public.pricelist_items(tenant_id,id),
 FOREIGN KEY(tenant_id,vendor_utama_id) REFERENCES public.vendors(tenant_id,id),
 FOREIGN KEY(tenant_id,vendor_cadangan_id) REFERENCES public.vendors(tenant_id,id)
);
GRANT SELECT,INSERT,UPDATE,DELETE ON public.item_vendor_default TO authenticated;
GRANT ALL ON public.item_vendor_default TO service_role;
ALTER TABLE public.item_vendor_default ENABLE ROW LEVEL SECURITY;
CREATE POLICY item_vendor_default_select ON public.item_vendor_default FOR SELECT TO authenticated USING(public.can_access_tenant_module(tenant_id,'pembelanjaan'));
CREATE POLICY item_vendor_default_insert ON public.item_vendor_default FOR INSERT TO authenticated WITH CHECK(tenant_id=public.active_tenant_id() AND public.has_tenant_role(tenant_id,'master'));
CREATE POLICY item_vendor_default_update ON public.item_vendor_default FOR UPDATE TO authenticated USING(tenant_id=public.active_tenant_id() AND public.has_tenant_role(tenant_id,'master')) WITH CHECK(tenant_id=public.active_tenant_id() AND public.has_tenant_role(tenant_id,'master'));
CREATE POLICY item_vendor_default_delete ON public.item_vendor_default FOR DELETE TO authenticated USING(tenant_id=public.active_tenant_id() AND public.has_tenant_role(tenant_id,'master'));
CREATE INDEX item_vendor_default_utama_idx ON public.item_vendor_default(tenant_id,vendor_utama_id);
CREATE INDEX item_vendor_default_cadangan_idx ON public.item_vendor_default(tenant_id,vendor_cadangan_id);
CREATE TRIGGER item_vendor_default_tenant_guard BEFORE UPDATE ON public.item_vendor_default FOR EACH ROW EXECUTE FUNCTION public.guard_tenant_immutable();
CREATE TRIGGER item_vendor_default_updated BEFORE UPDATE ON public.item_vendor_default FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE public.vendor_pic (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 tenant_id uuid NOT NULL DEFAULT public.active_tenant_id() REFERENCES public.tenants(id),
 vendor_id uuid NOT NULL, user_id uuid NOT NULL,
 pic_utama boolean NOT NULL DEFAULT false, created_at timestamptz NOT NULL DEFAULT now(),
 UNIQUE(vendor_id,user_id),
 FOREIGN KEY(tenant_id,vendor_id) REFERENCES public.vendors(tenant_id,id)
);
GRANT SELECT,INSERT,UPDATE,DELETE ON public.vendor_pic TO authenticated;
GRANT ALL ON public.vendor_pic TO service_role;
ALTER TABLE public.vendor_pic ENABLE ROW LEVEL SECURITY;
CREATE POLICY vendor_pic_select ON public.vendor_pic FOR SELECT TO authenticated USING(public.can_access_tenant_module(tenant_id,'pembelanjaan'));
CREATE POLICY vendor_pic_insert ON public.vendor_pic FOR INSERT TO authenticated WITH CHECK(tenant_id=public.active_tenant_id() AND public.has_tenant_role(tenant_id,'master'));
CREATE POLICY vendor_pic_update ON public.vendor_pic FOR UPDATE TO authenticated USING(tenant_id=public.active_tenant_id() AND public.has_tenant_role(tenant_id,'master')) WITH CHECK(tenant_id=public.active_tenant_id() AND public.has_tenant_role(tenant_id,'master'));
CREATE POLICY vendor_pic_delete ON public.vendor_pic FOR DELETE TO authenticated USING(tenant_id=public.active_tenant_id() AND public.has_tenant_role(tenant_id,'master'));
CREATE UNIQUE INDEX vendor_pic_one_primary ON public.vendor_pic(tenant_id,vendor_id) WHERE pic_utama;
CREATE INDEX vendor_pic_member_idx ON public.vendor_pic(tenant_id,user_id);
CREATE TRIGGER vendor_pic_tenant_guard BEFORE UPDATE ON public.vendor_pic FOR EACH ROW EXECUTE FUNCTION public.guard_tenant_immutable();
CREATE FUNCTION public.validate_vendor_pic_member() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
BEGIN
 PERFORM 1 FROM public.tenant_memberships WHERE tenant_id=NEW.tenant_id AND user_id=NEW.user_id AND status='active' FOR SHARE;
 IF NOT FOUND THEN RAISE EXCEPTION 'PIC harus anggota aktif bisnis yang sama'; END IF;
 RETURN NEW;
END $$;
REVOKE ALL ON FUNCTION public.validate_vendor_pic_member() FROM PUBLIC,anon,authenticated;
CREATE TRIGGER vendor_pic_member_guard BEFORE INSERT OR UPDATE ON public.vendor_pic FOR EACH ROW EXECUTE FUNCTION public.validate_vendor_pic_member();

CREATE FUNCTION public.audit_purchasing_assignment() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE row_data jsonb; changes jsonb;
BEGIN
 IF TG_OP='DELETE' THEN row_data:=to_jsonb(OLD); changes:=jsonb_build_object('before',row_data);
 ELSIF TG_OP='INSERT' THEN row_data:=to_jsonb(NEW); changes:=jsonb_build_object('after',row_data);
 ELSE row_data:=to_jsonb(NEW); SELECT jsonb_object_agg(n.key,jsonb_build_object('before',o.value,'after',n.value)) INTO changes FROM jsonb_each(row_data) n LEFT JOIN jsonb_each(to_jsonb(OLD)) o ON o.key=n.key WHERE n.value IS DISTINCT FROM o.value;
 END IF;
 IF changes IS NOT NULL THEN INSERT INTO public.audit_logs(tenant_id,actor_id,action,entity_type,entity_id,diff) VALUES((row_data->>'tenant_id')::uuid,auth.uid(),lower(TG_OP),TG_TABLE_NAME,(row_data->>'id')::uuid,changes); END IF;
 IF TG_OP='DELETE' THEN RETURN OLD; END IF; RETURN NEW;
END $$;
REVOKE ALL ON FUNCTION public.audit_purchasing_assignment() FROM PUBLIC,anon,authenticated;
CREATE TRIGGER item_vendor_default_audit AFTER INSERT OR UPDATE OR DELETE ON public.item_vendor_default FOR EACH ROW EXECUTE FUNCTION public.audit_purchasing_assignment();
CREATE TRIGGER vendor_pic_audit AFTER INSERT OR UPDATE OR DELETE ON public.vendor_pic FOR EACH ROW EXECUTE FUNCTION public.audit_purchasing_assignment();