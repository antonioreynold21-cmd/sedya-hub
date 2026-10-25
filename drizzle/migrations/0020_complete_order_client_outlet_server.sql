DO $patch$
DECLARE src text; original text;
BEGIN
 original:=pg_get_functiondef('public.save_sales_document(text,uuid,jsonb,jsonb)'::regprocedure);
 src:=replace(original,'itbl text; fk text; BEGIN','itbl text; fk text; v_client_id uuid; v_required_po boolean; v_outlet_id uuid; v_old_outlet_id uuid; v_outlet_name text; v_old_outlet_name text; v_section_name text; v_section_rank integer; BEGIN');
 src:=replace(src,'IF p_entity=''orders'' THEN IF p_id IS NULL THEN', 'IF p_entity=''orders'' THEN
 v_client_id:=NULLIF(btrim(p_doc->>''client_id''),'''')::uuid;
 IF v_client_id IS NOT NULL THEN
  SELECT wajib_no_po INTO v_required_po FROM public.clients WHERE id=v_client_id AND tenant_id=tid AND deleted_at IS NULL FOR SHARE;
  IF NOT FOUND THEN RAISE EXCEPTION ''Client tidak berizin''; END IF;
  IF v_required_po AND NULLIF(btrim(p_doc->>''po_number''),'''') IS NULL THEN RAISE EXCEPTION ''Client ini mewajibkan Customer PO No.''; END IF;
 END IF;
 IF p_id IS NULL THEN');
 src:=replace(src,'IF p_entity=''orders'' THEN UPDATE public.order_items SET outlet_id=NULLIF(item->>''outlet_id'','''')::uuid,outlet_name=NULL,section_name=CASE WHEN item->>''section_name'' IS NULL THEN NULL ELSE btrim(item->>''section_name'') END,section_rank=NULLIF(item->>''section_rank'','''')::integer WHERE id=iid AND tenant_id=tid; END IF;', 'IF p_entity=''orders'' THEN
 v_outlet_id:=NULLIF(btrim(item->>''outlet_id''),'''')::uuid;
 v_outlet_name:=NULL;
 SELECT outlet_id,outlet_name INTO v_old_outlet_id,v_old_outlet_name FROM public.order_items WHERE id=iid AND order_id=oid AND tenant_id=tid FOR UPDATE;
 IF v_outlet_id IS NOT NULL THEN
  SELECT nama INTO v_outlet_name FROM public.client_outlets WHERE id=v_outlet_id AND tenant_id=tid AND deleted_at IS NULL AND client_id=v_client_id AND (aktif OR id=v_old_outlet_id) FOR SHARE;
  IF NOT FOUND THEN RAISE EXCEPTION ''Outlet tidak valid untuk client ini''; END IF;
  IF v_outlet_id=v_old_outlet_id THEN v_outlet_name:=v_old_outlet_name; END IF;
 END IF;
 v_section_name:=NULLIF(btrim(item->>''section_name''),'''');
 IF length(v_section_name)>40 THEN RAISE EXCEPTION ''Nama section maksimal 40 karakter''; END IF;
 v_section_rank:=NULLIF(btrim(item->>''section_rank''),'''')::integer;
 IF v_section_rank<1 THEN RAISE EXCEPTION ''Urutan section minimal 1''; END IF;
 IF v_section_name IS NULL THEN v_section_rank:=NULL;
 ELSIF v_section_rank IS NULL THEN v_section_rank:=CASE lower(v_section_name) WHEN ''kitchen'' THEN 1 WHEN ''bar'' THEN 2 WHEN ''others'' THEN 3 ELSE 4 END;
 END IF;
 UPDATE public.order_items SET outlet_id=v_outlet_id,outlet_name=v_outlet_name,section_name=v_section_name,section_rank=v_section_rank WHERE id=iid AND tenant_id=tid;
 END IF;');
 IF src=original OR position('v_client_id:=NULLIF' in src)=0 OR position('outlet_name=v_outlet_name' in src)=0 OR position('itbl text; fk text; v_client_id' in src)=0 THEN RAISE EXCEPTION 'Definisi save_sales_document tidak sesuai untuk patch terbatas'; END IF;
 EXECUTE src;
END $patch$;

CREATE OR REPLACE FUNCTION public.list_order_clients()
RETURNS TABLE(id uuid, name text, code text, wajib_no_po boolean, perlu_tukar_faktur boolean, outlets jsonb)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path=public
AS $function$
DECLARE tid uuid:=public.active_tenant_id();
BEGIN
 IF tid IS NULL OR NOT (public.can_access_tenant_module(tid,'orders') OR public.can_access_tenant_module(tid,'quotations') OR public.can_access_tenant_module(tid,'crm')) THEN RAISE EXCEPTION 'Tidak berizin'; END IF;
 RETURN QUERY SELECT c.id,c.name,c.code,c.wajib_no_po,c.perlu_tukar_faktur,
 COALESCE((SELECT jsonb_agg(jsonb_build_object('id',o.id,'nama',o.nama,'alamat',o.alamat) ORDER BY o.nama,o.id) FROM public.client_outlets o WHERE o.tenant_id=tid AND o.client_id=c.id AND o.deleted_at IS NULL AND o.aktif),'[]'::jsonb)
 FROM public.clients c WHERE c.tenant_id=tid AND c.deleted_at IS NULL ORDER BY c.name,c.id;
END $function$;
REVOKE ALL ON FUNCTION public.list_order_clients() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.list_order_clients() TO authenticated;