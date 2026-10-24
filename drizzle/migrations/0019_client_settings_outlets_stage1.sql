ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS wajib_no_po boolean NOT NULL DEFAULT false;
ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS perlu_tukar_faktur boolean NOT NULL DEFAULT false;
ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS term_jatuh_tempo_hari integer;
DO $$ BEGIN IF NOT EXISTS(SELECT 1 FROM pg_constraint WHERE conrelid='public.clients'::regclass AND conname='clients_term_range') THEN ALTER TABLE public.clients ADD CONSTRAINT clients_term_range CHECK(term_jatuh_tempo_hari BETWEEN 0 AND 365); END IF; END $$;
CREATE TABLE IF NOT EXISTS public.client_outlets (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), tenant_id uuid NOT NULL REFERENCES public.tenants(id), client_id uuid NOT NULL,
 nama text NOT NULL CHECK(nama=btrim(nama) AND nama<>''), alamat text, aktif boolean NOT NULL DEFAULT true,
 created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(),
 deleted_at timestamptz, deleted_by uuid, delete_reason text,
 UNIQUE(tenant_id,id), FOREIGN KEY(tenant_id,client_id) REFERENCES public.clients(tenant_id,id)
);
GRANT SELECT,INSERT,UPDATE ON public.client_outlets TO authenticated;
GRANT ALL ON public.client_outlets TO service_role;
REVOKE ALL ON public.client_outlets FROM anon;
ALTER TABLE public.client_outlets ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS client_outlets_select ON public.client_outlets;
CREATE POLICY client_outlets_select ON public.client_outlets FOR SELECT TO authenticated USING(public.can_access_tenant_module(tenant_id,'crm') OR public.can_access_tenant_module(tenant_id,'orders') OR public.can_access_tenant_module(tenant_id,'shipments'));
DROP POLICY IF EXISTS client_outlets_insert ON public.client_outlets;
CREATE POLICY client_outlets_insert ON public.client_outlets FOR INSERT TO authenticated WITH CHECK(tenant_id=public.active_tenant_id() AND (public.has_tenant_role(tenant_id,'master') OR public.can_access_tenant_module(tenant_id,'crm')));
DROP POLICY IF EXISTS client_outlets_update ON public.client_outlets;
CREATE POLICY client_outlets_update ON public.client_outlets FOR UPDATE TO authenticated USING(tenant_id=public.active_tenant_id() AND (public.has_tenant_role(tenant_id,'master') OR public.can_access_tenant_module(tenant_id,'crm'))) WITH CHECK(tenant_id=public.active_tenant_id() AND (public.has_tenant_role(tenant_id,'master') OR public.can_access_tenant_module(tenant_id,'crm')));
DROP POLICY IF EXISTS client_outlets_delete ON public.client_outlets;
CREATE POLICY client_outlets_delete ON public.client_outlets FOR DELETE TO authenticated USING(false);
CREATE UNIQUE INDEX IF NOT EXISTS client_outlets_live_name ON public.client_outlets(client_id,lower(btrim(nama))) WHERE deleted_at IS NULL;
DROP TRIGGER IF EXISTS client_outlets_guard ON public.client_outlets;
CREATE TRIGGER client_outlets_guard BEFORE INSERT OR UPDATE OR DELETE ON public.client_outlets FOR EACH ROW EXECUTE FUNCTION public.guard_business_row();
DROP TRIGGER IF EXISTS client_outlets_updated ON public.client_outlets;
CREATE TRIGGER client_outlets_updated BEFORE UPDATE ON public.client_outlets FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
DROP TRIGGER IF EXISTS client_outlets_audit ON public.client_outlets;
CREATE TRIGGER client_outlets_audit AFTER INSERT OR UPDATE ON public.client_outlets FOR EACH ROW EXECUTE FUNCTION public.audit_business_change();
ALTER TABLE public.order_items ADD COLUMN IF NOT EXISTS outlet_id uuid;
ALTER TABLE public.order_items ADD COLUMN IF NOT EXISTS outlet_name text;
ALTER TABLE public.order_items ADD COLUMN IF NOT EXISTS section_name text;
ALTER TABLE public.order_items ADD COLUMN IF NOT EXISTS section_rank integer;
DO $$ BEGIN
 IF NOT EXISTS(SELECT 1 FROM pg_constraint WHERE conrelid='public.order_items'::regclass AND conname='order_items_outlet_fk') THEN ALTER TABLE public.order_items ADD CONSTRAINT order_items_outlet_fk FOREIGN KEY(tenant_id,outlet_id) REFERENCES public.client_outlets(tenant_id,id) ON DELETE NO ACTION; END IF;
 IF NOT EXISTS(SELECT 1 FROM pg_constraint WHERE conrelid='public.order_items'::regclass AND conname='order_items_section_valid') THEN ALTER TABLE public.order_items ADD CONSTRAINT order_items_section_valid CHECK((section_rank IS NULL OR section_rank>=1) AND (section_name IS NULL OR (section_name=btrim(section_name) AND length(section_name) BETWEEN 1 AND 40))); END IF;
END $$;
CREATE OR REPLACE FUNCTION public.client_order_po_guard() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
BEGIN
 IF NEW.client_id IS NOT NULL AND EXISTS(SELECT 1 FROM public.clients WHERE id=NEW.client_id AND tenant_id=NEW.tenant_id AND wajib_no_po) AND NULLIF(btrim(NEW.po_number),'') IS NULL THEN RAISE EXCEPTION 'Client ini mewajibkan Customer PO No.'; END IF;
 RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS client_order_po_guard ON public.orders;
CREATE TRIGGER client_order_po_guard BEFORE INSERT OR UPDATE OF client_id,po_number ON public.orders FOR EACH ROW EXECUTE FUNCTION public.client_order_po_guard();
CREATE OR REPLACE FUNCTION public.order_item_outlet_guard() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE outlet public.client_outlets; cid uuid;
BEGIN
 IF NEW.section_name IS NOT NULL THEN NEW.section_name:=btrim(NEW.section_name); IF length(NEW.section_name) NOT BETWEEN 1 AND 40 THEN RAISE EXCEPTION 'Section harus berisi 1–40 karakter'; END IF; END IF;
 IF NEW.section_rank<1 THEN RAISE EXCEPTION 'Urutan section minimal 1'; END IF;
 IF NEW.outlet_id IS NULL THEN NEW.outlet_name:=NULL;
 ELSE
  SELECT client_id INTO cid FROM public.orders WHERE id=NEW.order_id AND tenant_id=NEW.tenant_id;
  SELECT * INTO outlet FROM public.client_outlets WHERE id=NEW.outlet_id AND tenant_id=NEW.tenant_id AND deleted_at IS NULL;
  IF outlet.id IS NULL OR cid IS NULL OR outlet.client_id IS DISTINCT FROM cid THEN RAISE EXCEPTION 'Outlet harus milik client dan bisnis yang sama'; END IF;
  IF TG_OP='INSERT' OR NEW.outlet_id IS DISTINCT FROM OLD.outlet_id THEN
   IF NOT outlet.aktif THEN RAISE EXCEPTION 'Outlet nonaktif tidak dapat dipilih'; END IF;
   NEW.outlet_name:=outlet.nama;
  ELSE NEW.outlet_name:=OLD.outlet_name; END IF;
 END IF;
 RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS aa_order_item_outlet_guard ON public.order_items;
CREATE TRIGGER aa_order_item_outlet_guard BEFORE INSERT OR UPDATE OF outlet_id,outlet_name,section_name,section_rank ON public.order_items FOR EACH ROW EXECUTE FUNCTION public.order_item_outlet_guard();
DO $patch$ DECLARE def text; old text; replacement text; BEGIN
 SELECT pg_get_functiondef('public.save_sales_document(text,uuid,jsonb,jsonb)'::regprocedure) INTO def;
 IF position('outlet_id' IN def)=0 THEN
  old:='invoice_date,due_date,section,notes,created_by'; replacement:='invoice_date,due_date,po_number,section,notes,created_by';
  IF position(old IN def)=0 THEN RAISE EXCEPTION 'Definisi save_sales_document tidak cocok'; END IF;
  def:=replace(def,old,replacement);
  def:=replace(def,'num,d,d,NULLIF(p_doc->>''due_date'','''')::date,p_doc->>''section''','num,d,d,NULLIF(p_doc->>''due_date'','''')::date,p_doc->>''po_number'',p_doc->>''section''');
  def:=replace(def,'invoice_date=d,due_date=NULLIF(p_doc->>''due_date'','''')::date,section=','invoice_date=d,due_date=NULLIF(p_doc->>''due_date'','''')::date,po_number=p_doc->>''po_number'',section=');
  old:='keep:=array_append(keep,iid);';
  IF position(old IN def)=0 THEN RAISE EXCEPTION 'Loop item tidak cocok'; END IF;
  def:=replace(def,old,'IF p_entity=''orders'' THEN UPDATE public.order_items SET outlet_id=NULLIF(item->>''outlet_id'','''')::uuid,outlet_name=NULL,section_name=CASE WHEN item->>''section_name'' IS NULL THEN NULL ELSE btrim(item->>''section_name'') END,section_rank=NULLIF(item->>''section_rank'','''')::integer WHERE id=iid AND tenant_id=tid; END IF; '||old);
  EXECUTE def;
 END IF;
 SELECT pg_get_functiondef('public.sales_totals(text,uuid)'::regprocedure) INTO def;
 IF position('outlet_id' IN def)=0 THEN
  old:='jsonb_build_object(''name'',item_name,''qty'',qty,''price'',price,''discount_type'',discount_type,''discount_value'',discount_value) ORDER BY position';
  replacement:='(jsonb_build_object(''name'',item_name,''qty'',qty,''price'',price,''discount_type'',discount_type,''discount_value'',discount_value) || jsonb_strip_nulls(jsonb_build_object(''outlet_id'',outlet_id,''outlet_name'',outlet_name,''section_name'',section_name,''section_rank'',section_rank))) ORDER BY position';
  IF position(old IN def)=0 THEN RAISE EXCEPTION 'Fingerprint tidak cocok'; END IF;
  -- Patch only the first aggregation (orders); null metadata preserves original fingerprint.
  def:=overlay(def placing replacement from position(old IN def) for length(old)); EXECUTE def;
 END IF;
 SELECT pg_get_functiondef('public.issued_item_guard()'::regprocedure) INTO def;
 IF position('NEW.outlet_id' IN def)=0 THEN
  def:=replace(def,'OR NEW.discount_type IS DISTINCT FROM OLD.discount_type','OR NEW.discount_type IS DISTINCT FROM OLD.discount_type OR NEW.outlet_id IS DISTINCT FROM OLD.outlet_id OR NEW.outlet_name IS DISTINCT FROM OLD.outlet_name OR NEW.section_name IS DISTINCT FROM OLD.section_name OR NEW.section_rank IS DISTINCT FROM OLD.section_rank'); EXECUTE def;
 END IF;
END $patch$;
CREATE OR REPLACE FUNCTION public.save_order_atomic(p_order_id uuid,p_order jsonb,p_items jsonb) RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$ BEGIN RETURN public.save_sales_document('orders',p_order_id,p_order,p_items); END $$;
REVOKE ALL ON FUNCTION public.client_order_po_guard(),public.order_item_outlet_guard() FROM PUBLIC,anon;