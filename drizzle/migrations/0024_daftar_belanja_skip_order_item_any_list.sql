CREATE OR REPLACE FUNCTION public.generate_daftar_belanja(p_tanggal_kirim date, p_order_ids uuid[])
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE t uuid:=public.active_tenant_id(); d uuid; st text; n_add int:=0; n_skip int:=0; n_nov int:=0; r record; v uuid; bad int;
BEGIN
 IF t IS NULL OR NOT public.has_tenant_role(t,'master') THEN RAISE EXCEPTION 'Hanya Master yang dapat membuat daftar belanja'; END IF;
 IF p_tanggal_kirim IS NULL THEN RAISE EXCEPTION 'Tanggal kirim wajib diisi'; END IF;
 IF p_order_ids IS NULL OR cardinality(p_order_ids)=0 THEN RAISE EXCEPTION 'Pilih minimal satu order'; END IF;
 SELECT count(*) INTO bad FROM unnest(p_order_ids) x(id) WHERE NOT EXISTS(SELECT 1 FROM orders o WHERE o.id=x.id AND o.tenant_id=t AND o.deleted_at IS NULL AND o.invoice_state<>'cancelled');
 IF bad>0 THEN RAISE EXCEPTION 'Ada order yang tidak ditemukan, diarsipkan, atau dibatalkan'; END IF;
 SELECT id,status INTO d,st FROM daftar_belanja WHERE tenant_id=t AND tanggal_kirim=p_tanggal_kirim AND status='draft' AND deleted_at IS NULL FOR UPDATE;
 IF d IS NULL THEN INSERT INTO daftar_belanja(tenant_id,tanggal_kirim,created_by) VALUES(t,p_tanggal_kirim,auth.uid()) RETURNING id INTO d; END IF;
 FOR r IN SELECT oi.*, o.client_name FROM order_items oi JOIN orders o ON o.id=oi.order_id AND o.tenant_id=t
   WHERE oi.tenant_id=t AND oi.deleted_at IS NULL AND oi.order_id=ANY(p_order_ids) AND oi.qty>0 ORDER BY o.id, oi.position LOOP
  IF EXISTS(SELECT 1 FROM daftar_belanja_item bi JOIN daftar_belanja db ON db.id=bi.daftar_id AND db.tenant_id=t AND db.deleted_at IS NULL WHERE bi.tenant_id=t AND bi.order_item_id=r.id AND bi.deleted_at IS NULL) THEN n_skip:=n_skip+1; CONTINUE; END IF;
  v:=NULL;
  IF (SELECT count(*) FROM pricelist_items p WHERE p.tenant_id=t AND p.deleted_at IS NULL AND p.is_active AND lower(btrim(p.name))=lower(btrim(r.item_name)) AND lower(btrim(p.unit))=lower(btrim(r.unit)))=1 THEN
   SELECT ivd.vendor_utama_id INTO v FROM pricelist_items p JOIN item_vendor_default ivd ON ivd.item_id=p.id AND ivd.tenant_id=t
    JOIN vendors vd ON vd.id=ivd.vendor_utama_id AND vd.tenant_id=t AND vd.aktif AND vd.deleted_at IS NULL
    WHERE p.tenant_id=t AND p.deleted_at IS NULL AND p.is_active AND lower(btrim(p.name))=lower(btrim(r.item_name)) AND lower(btrim(p.unit))=lower(btrim(r.unit));
  END IF;
  INSERT INTO daftar_belanja_item(tenant_id,daftar_id,order_id,order_item_id,item_name,qty,unit,vendor_id,customer_nama,outlet_nama,section_nama,updated_by)
  VALUES(t,d,r.order_id,r.id,r.item_name,r.qty,r.unit,v,r.client_name,r.outlet_name,r.section_name,auth.uid());
  n_add:=n_add+1; IF v IS NULL THEN n_nov:=n_nov+1; END IF;
 END LOOP;
 RETURN jsonb_build_object('daftar_id',d,'ditambah',n_add,'dilewati',n_skip,'tanpa_vendor',n_nov);
END $$;
REVOKE ALL ON FUNCTION public.generate_daftar_belanja(date,uuid[]) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.generate_daftar_belanja(date,uuid[]) TO authenticated, service_role;