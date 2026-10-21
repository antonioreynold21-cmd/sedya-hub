CREATE OR REPLACE FUNCTION public.import_pricelist_rows(p_rows jsonb, p_commit boolean)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE
  tid uuid := public.active_tenant_id();
  r jsonb; i int := 0; out jsonb := '[]'::jsonb;
  v_name text; v_cat text; v_unit text; v_price numeric; v_active boolean; v_line int;
  v_status text; v_err text; v_cnt int; keys text[] := '{}'; k text;
  v_ex_id uuid; v_ex_price numeric; v_ex_cat text; v_ex_active boolean;
  n_new int := 0; n_upd int := 0; n_same int := 0; n_err int := 0;
BEGIN
  IF auth.uid() IS NULL OR tid IS NULL OR NOT public.can_access_tenant_module(tid,'pricelist') THEN
    RAISE EXCEPTION 'Tidak berizin mengimpor pricelist';
  END IF;
  IF p_rows IS NULL OR jsonb_typeof(p_rows) <> 'array' THEN RAISE EXCEPTION 'Format data tidak valid'; END IF;
  IF jsonb_array_length(p_rows) = 0 THEN RAISE EXCEPTION 'Tidak ada baris'; END IF;
  IF jsonb_array_length(p_rows) > 500 THEN RAISE EXCEPTION 'Maksimal 500 baris per unggahan'; END IF;

  FOR r IN SELECT * FROM jsonb_array_elements(p_rows) LOOP
    i := i + 1; v_err := NULL; v_status := NULL;
    v_ex_id := NULL; v_ex_price := NULL; v_ex_cat := NULL; v_ex_active := NULL;
    v_line := COALESCE(NULLIF(r->>'line','')::int, i);
    v_name := btrim(COALESCE(r->>'name',''));
    v_unit := btrim(COALESCE(r->>'unit',''));
    v_cat := COALESCE(NULLIF(btrim(COALESCE(r->>'category','')),''),'Umum');
    BEGIN v_active := COALESCE((r->>'is_active')::boolean, true);
    EXCEPTION WHEN others THEN v_active := NULL; END;
    BEGIN v_price := (r->>'price')::numeric; EXCEPTION WHEN others THEN v_price := NULL; END;
    IF v_name = '' THEN v_err := 'Nama wajib diisi';
    ELSIF length(v_name) > 200 THEN v_err := 'Nama terlalu panjang';
    ELSIF v_unit = '' THEN v_err := 'Satuan wajib diisi';
    ELSIF length(v_unit) > 30 THEN v_err := 'Satuan terlalu panjang';
    ELSIF length(v_cat) > 100 THEN v_err := 'Kategori terlalu panjang';
    ELSIF v_price IS NULL OR v_price = 'NaN'::numeric THEN v_err := 'Harga bukan angka';
    ELSIF v_price < 0 THEN v_err := 'Harga tidak boleh negatif';
    ELSIF v_price > 999999999999 THEN v_err := 'Harga terlalu besar';
    ELSIF v_active IS NULL THEN v_err := 'Nilai aktif tidak valid';
    END IF;
    k := lower(v_name) || chr(31) || lower(v_unit);
    IF v_err IS NULL AND k = ANY(keys) THEN v_err := 'Nama + satuan ganda di file'; END IF;
    keys := keys || k;
    IF v_err IS NULL THEN
      SELECT count(*) INTO v_cnt FROM public.pricelist_items p
        WHERE p.tenant_id = tid AND p.deleted_at IS NULL AND lower(btrim(p.name)) = lower(v_name) AND lower(btrim(p.unit)) = lower(v_unit);
      IF v_cnt > 1 THEN v_err := 'Ambigu: lebih dari satu item sama di database';
      ELSIF v_cnt = 1 THEN
        SELECT p.id, p.price, p.category, p.is_active INTO v_ex_id, v_ex_price, v_ex_cat, v_ex_active FROM public.pricelist_items p
          WHERE p.tenant_id = tid AND p.deleted_at IS NULL AND lower(btrim(p.name)) = lower(v_name) AND lower(btrim(p.unit)) = lower(v_unit)
          FOR UPDATE;
        IF v_ex_price = v_price AND v_ex_cat = v_cat AND v_ex_active = v_active THEN v_status := 'tidak berubah'; n_same := n_same + 1;
        ELSE
          v_status := 'diperbarui'; n_upd := n_upd + 1;
          IF p_commit THEN UPDATE public.pricelist_items SET price = v_price, category = v_cat, is_active = v_active, updated_at = now() WHERE id = v_ex_id; END IF;
        END IF;
      ELSE
        v_status := 'baru'; n_new := n_new + 1;
        IF p_commit THEN INSERT INTO public.pricelist_items(tenant_id,name,category,unit,price,is_active) VALUES (tid,v_name,v_cat,v_unit,v_price,v_active); END IF;
      END IF;
    END IF;
    IF v_err IS NOT NULL THEN v_status := 'error'; n_err := n_err + 1; END IF;
    out := out || jsonb_build_object('line',v_line,'status',v_status,'error',v_err,'name',v_name,'unit',v_unit,'category',v_cat,'price',v_price,'is_active',v_active,'old_price',v_ex_price);
  END LOOP;

  IF p_commit THEN
    IF n_err > 0 THEN RAISE EXCEPTION 'Impor dibatalkan: % baris error', n_err; END IF;
    IF n_new + n_upd = 0 THEN RAISE EXCEPTION 'Tidak ada perubahan'; END IF;
    INSERT INTO public.audit_logs(tenant_id,actor_id,action,entity_type,entity_id,diff)
      VALUES (tid, auth.uid(), 'import', 'pricelist_items', tid, jsonb_build_object('baru',n_new,'diperbarui',n_upd,'tidak_berubah',n_same,'total',i));
  END IF;
  RETURN jsonb_build_object('summary', jsonb_build_object('baru',n_new,'diperbarui',n_upd,'tidak_berubah',n_same,'error',n_err), 'rows', out);
END $$;
REVOKE ALL ON FUNCTION public.import_pricelist_rows(jsonb,boolean) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.import_pricelist_rows(jsonb,boolean) TO authenticated;