CREATE TABLE public.daftar_belanja(
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 tenant_id uuid NOT NULL REFERENCES public.tenants(id),
 tanggal_kirim date NOT NULL,
 status text NOT NULL DEFAULT 'draft' CHECK(status IN('draft','terkirim','selesai')),
 catatan text, terkirim_at timestamptz, ringkasan_terkirim_at timestamptz,
 created_by uuid, created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(),
 deleted_at timestamptz, deleted_by uuid, delete_reason text,
 UNIQUE(tenant_id,id));
CREATE UNIQUE INDEX daftar_belanja_draft_unique ON public.daftar_belanja(tenant_id,tanggal_kirim) WHERE status='draft' AND deleted_at IS NULL;
GRANT SELECT,INSERT,UPDATE ON public.daftar_belanja TO authenticated;
GRANT ALL ON public.daftar_belanja TO service_role;
ALTER TABLE public.daftar_belanja ENABLE ROW LEVEL SECURITY;
CREATE POLICY daftar_belanja_select ON public.daftar_belanja FOR SELECT TO authenticated USING(public.can_access_tenant_module(tenant_id,'pembelanjaan'));
CREATE POLICY daftar_belanja_insert ON public.daftar_belanja FOR INSERT TO authenticated WITH CHECK(tenant_id=public.active_tenant_id() AND public.has_tenant_role(tenant_id,'master'));
CREATE POLICY daftar_belanja_update ON public.daftar_belanja FOR UPDATE TO authenticated USING(tenant_id=public.active_tenant_id() AND public.has_tenant_role(tenant_id,'master')) WITH CHECK(tenant_id=public.active_tenant_id() AND public.has_tenant_role(tenant_id,'master'));
CREATE POLICY daftar_belanja_delete ON public.daftar_belanja FOR DELETE TO authenticated USING(false);
CREATE TRIGGER daftar_belanja_guard BEFORE INSERT OR UPDATE OR DELETE ON public.daftar_belanja FOR EACH ROW EXECUTE FUNCTION public.guard_business_row();
CREATE TRIGGER daftar_belanja_updated BEFORE UPDATE ON public.daftar_belanja FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER daftar_belanja_audit AFTER INSERT OR UPDATE ON public.daftar_belanja FOR EACH ROW EXECUTE FUNCTION public.audit_business_change();

CREATE TABLE public.daftar_belanja_item(
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 tenant_id uuid NOT NULL REFERENCES public.tenants(id),
 daftar_id uuid NOT NULL, order_id uuid, order_item_id uuid,
 item_name text NOT NULL, qty numeric NOT NULL CHECK(qty>0), unit text, vendor_id uuid,
 customer_nama text, outlet_nama text, section_nama text,
 status_item text NOT NULL DEFAULT 'belum_dibeli' CHECK(status_item IN('belum_dibeli','ada','sebagian','kosong')),
 qty_dibeli numeric CHECK(qty_dibeli IS NULL OR qty_dibeli>=0), catatan text, updated_by uuid,
 created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(),
 deleted_at timestamptz, deleted_by uuid, delete_reason text,
 UNIQUE(tenant_id,id),
 FOREIGN KEY(tenant_id,daftar_id) REFERENCES public.daftar_belanja(tenant_id,id),
 FOREIGN KEY(tenant_id,order_id) REFERENCES public.orders(tenant_id,id),
 FOREIGN KEY(tenant_id,order_item_id) REFERENCES public.order_items(tenant_id,id),
 FOREIGN KEY(tenant_id,vendor_id) REFERENCES public.vendors(tenant_id,id));
CREATE UNIQUE INDEX daftar_belanja_item_oi_unique ON public.daftar_belanja_item(daftar_id,order_item_id) WHERE order_item_id IS NOT NULL AND deleted_at IS NULL;
CREATE INDEX daftar_belanja_item_daftar_idx ON public.daftar_belanja_item(tenant_id,daftar_id);
GRANT SELECT ON public.daftar_belanja_item TO authenticated;
GRANT ALL ON public.daftar_belanja_item TO service_role;
ALTER TABLE public.daftar_belanja_item ENABLE ROW LEVEL SECURITY;
CREATE POLICY daftar_belanja_item_select ON public.daftar_belanja_item FOR SELECT TO authenticated USING(public.can_access_tenant_module(tenant_id,'pembelanjaan'));
CREATE TRIGGER daftar_belanja_item_guard BEFORE INSERT OR UPDATE OR DELETE ON public.daftar_belanja_item FOR EACH ROW EXECUTE FUNCTION public.guard_business_row();
CREATE TRIGGER daftar_belanja_item_updated BEFORE UPDATE ON public.daftar_belanja_item FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE public.belanja_audit(
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 tenant_id uuid NOT NULL REFERENCES public.tenants(id),
 item_id uuid NOT NULL, daftar_id uuid NOT NULL, user_id uuid,
 status_lama text, status_baru text NOT NULL, qty_dibeli numeric,
 sumber text NOT NULL CHECK(sumber IN('app','telegram')),
 waktu timestamptz NOT NULL DEFAULT now(),
 FOREIGN KEY(tenant_id,item_id) REFERENCES public.daftar_belanja_item(tenant_id,id));
CREATE INDEX belanja_audit_item_idx ON public.belanja_audit(tenant_id,item_id);
GRANT SELECT ON public.belanja_audit TO authenticated;
GRANT ALL ON public.belanja_audit TO service_role;
ALTER TABLE public.belanja_audit ENABLE ROW LEVEL SECURITY;
CREATE POLICY belanja_audit_select ON public.belanja_audit FOR SELECT TO authenticated USING(public.can_access_tenant_module(tenant_id,'pembelanjaan'));
CREATE TRIGGER belanja_audit_append_only BEFORE UPDATE OR DELETE ON public.belanja_audit FOR EACH ROW EXECUTE FUNCTION public.prevent_audit_change();

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
  IF EXISTS(SELECT 1 FROM daftar_belanja_item WHERE daftar_id=d AND order_item_id=r.id AND deleted_at IS NULL) THEN n_skip:=n_skip+1; CONTINUE; END IF;
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

CREATE OR REPLACE FUNCTION public.set_item_status(p_item_id uuid, p_status text, p_qty_dibeli numeric DEFAULT NULL, p_sumber text DEFAULT 'app')
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE t uuid:=public.active_tenant_id(); it daftar_belanja_item%ROWTYPE; dst text; m boolean; q numeric; sisa int;
BEGIN
 IF t IS NULL THEN RAISE EXCEPTION 'Tidak berizin'; END IF;
 SELECT * INTO it FROM daftar_belanja_item WHERE id=p_item_id AND tenant_id=t AND deleted_at IS NULL FOR UPDATE;
 IF it.id IS NULL THEN RAISE EXCEPTION 'Item tidak ditemukan'; END IF;
 m:=public.has_tenant_role(t,'master');
 IF NOT m THEN
  IF it.vendor_id IS NULL THEN RAISE EXCEPTION 'Item tanpa vendor hanya dapat diubah Master'; END IF;
  IF NOT public.can_access_tenant_module(t,'pembelanjaan') OR NOT EXISTS(SELECT 1 FROM vendor_pic WHERE tenant_id=t AND vendor_id=it.vendor_id AND user_id=auth.uid()) THEN RAISE EXCEPTION 'Anda bukan PIC vendor item ini'; END IF;
 END IF;
 SELECT status INTO dst FROM daftar_belanja WHERE id=it.daftar_id AND tenant_id=t AND deleted_at IS NULL;
 IF dst IS NULL THEN RAISE EXCEPTION 'Daftar belanja tidak ditemukan'; END IF;
 IF NOT (dst='terkirim' OR (m AND dst='draft')) THEN RAISE EXCEPTION 'Daftar belanja belum dikirim atau sudah ditutup'; END IF;
 IF p_sumber IS NULL OR p_sumber NOT IN('app','telegram') THEN RAISE EXCEPTION 'Sumber tidak valid'; END IF;
 IF p_status='ada' THEN q:=it.qty;
 ELSIF p_status='kosong' THEN q:=0;
 ELSIF p_status='sebagian' THEN
  IF p_qty_dibeli IS NULL OR p_qty_dibeli<=0 OR p_qty_dibeli>=it.qty THEN RAISE EXCEPTION 'Qty dibeli untuk status sebagian harus lebih dari 0 dan kurang dari %',it.qty; END IF; q:=p_qty_dibeli;
 ELSIF p_status='belum_dibeli' THEN q:=NULL;
 ELSE RAISE EXCEPTION 'Status item tidak valid'; END IF;
 IF it.status_item=p_status AND it.qty_dibeli IS NOT DISTINCT FROM q THEN
  SELECT count(*) INTO sisa FROM daftar_belanja_item WHERE daftar_id=it.daftar_id AND tenant_id=t AND deleted_at IS NULL AND status_item='belum_dibeli';
  RETURN jsonb_build_object('ok',true,'message','Tidak ada perubahan','semua_selesai',sisa=0);
 END IF;
 UPDATE daftar_belanja_item SET status_item=p_status, qty_dibeli=q, updated_by=auth.uid() WHERE id=it.id;
 INSERT INTO belanja_audit(tenant_id,item_id,daftar_id,user_id,status_lama,status_baru,qty_dibeli,sumber) VALUES(t,it.id,it.daftar_id,auth.uid(),it.status_item,p_status,q,p_sumber);
 SELECT count(*) INTO sisa FROM daftar_belanja_item WHERE daftar_id=it.daftar_id AND tenant_id=t AND deleted_at IS NULL AND status_item='belum_dibeli';
 RETURN jsonb_build_object('ok',true,'message','Status diperbarui','semua_selesai',sisa=0);
END $$;

CREATE OR REPLACE FUNCTION public.kirim_daftar_belanja(p_daftar_id uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE t uuid:=public.active_tenant_id(); st text; n int; nv int;
BEGIN
 IF t IS NULL OR NOT public.has_tenant_role(t,'master') THEN RAISE EXCEPTION 'Hanya Master yang dapat mengirim daftar belanja'; END IF;
 SELECT status INTO st FROM daftar_belanja WHERE id=p_daftar_id AND tenant_id=t AND deleted_at IS NULL FOR UPDATE;
 IF st IS NULL THEN RAISE EXCEPTION 'Daftar belanja tidak ditemukan'; END IF;
 IF st<>'draft' THEN RAISE EXCEPTION 'Hanya daftar draft yang dapat dikirim'; END IF;
 SELECT count(*), count(*) FILTER(WHERE vendor_id IS NULL) INTO n,nv FROM daftar_belanja_item WHERE daftar_id=p_daftar_id AND tenant_id=t AND deleted_at IS NULL;
 IF n=0 THEN RAISE EXCEPTION 'Daftar belanja belum berisi item'; END IF;
 UPDATE daftar_belanja SET status='terkirim', terkirim_at=now() WHERE id=p_daftar_id;
 RETURN jsonb_build_object('ok',true,'jumlah_item',n,'tanpa_vendor',nv);
END $$;

CREATE OR REPLACE FUNCTION public.tutup_daftar_belanja(p_daftar_id uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE t uuid:=public.active_tenant_id(); st text; sisa int;
BEGIN
 IF t IS NULL OR NOT public.has_tenant_role(t,'master') THEN RAISE EXCEPTION 'Hanya Master yang dapat menutup daftar belanja'; END IF;
 SELECT status INTO st FROM daftar_belanja WHERE id=p_daftar_id AND tenant_id=t AND deleted_at IS NULL FOR UPDATE;
 IF st IS NULL THEN RAISE EXCEPTION 'Daftar belanja tidak ditemukan'; END IF;
 IF st<>'terkirim' THEN RAISE EXCEPTION 'Hanya daftar terkirim yang dapat ditutup'; END IF;
 SELECT count(*) INTO sisa FROM daftar_belanja_item WHERE daftar_id=p_daftar_id AND tenant_id=t AND deleted_at IS NULL AND status_item='belum_dibeli';
 IF sisa>0 THEN RAISE EXCEPTION 'Masih ada % item belum dibeli',sisa; END IF;
 UPDATE daftar_belanja SET status='selesai', ringkasan_terkirim_at=coalesce(ringkasan_terkirim_at,now()) WHERE id=p_daftar_id;
 RETURN jsonb_build_object('ok',true);
END $$;

CREATE OR REPLACE FUNCTION public.list_order_untuk_belanja(p_tanggal date DEFAULT NULL)
RETURNS TABLE(id uuid, order_number text, client_name text, jumlah_item bigint, sudah_ada_di_daftar boolean)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path=public AS $$
DECLARE t uuid:=public.active_tenant_id();
BEGIN
 IF t IS NULL OR NOT public.can_access_tenant_module(t,'pembelanjaan') THEN RAISE EXCEPTION 'Tidak berizin'; END IF;
 RETURN QUERY SELECT o.id,o.order_number,o.client_name,
  (SELECT count(*) FROM order_items oi WHERE oi.order_id=o.id AND oi.tenant_id=t AND oi.deleted_at IS NULL),
  EXISTS(SELECT 1 FROM daftar_belanja_item bi JOIN daftar_belanja db ON db.id=bi.daftar_id AND db.deleted_at IS NULL
    WHERE bi.tenant_id=t AND bi.order_id=o.id AND bi.deleted_at IS NULL AND (p_tanggal IS NULL OR db.tanggal_kirim=p_tanggal))
 FROM orders o WHERE o.tenant_id=t AND o.deleted_at IS NULL AND o.invoice_state<>'cancelled' AND o.order_date>=(now() AT TIME ZONE 'Asia/Jakarta')::date-60
 ORDER BY o.order_date DESC, o.created_at DESC;
END $$;

REVOKE ALL ON FUNCTION public.generate_daftar_belanja(date,uuid[]), public.set_item_status(uuid,text,numeric,text), public.kirim_daftar_belanja(uuid), public.tutup_daftar_belanja(uuid), public.list_order_untuk_belanja(date) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.generate_daftar_belanja(date,uuid[]), public.set_item_status(uuid,text,numeric,text), public.kirim_daftar_belanja(uuid), public.tutup_daftar_belanja(uuid), public.list_order_untuk_belanja(date) TO authenticated, service_role;