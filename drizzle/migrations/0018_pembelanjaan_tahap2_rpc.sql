CREATE OR REPLACE FUNCTION public.import_item_vendor_defaults(p_rows jsonb, p_commit boolean)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_tenant uuid := public.active_tenant_id();
  r jsonb; v_line int; v_item text; v_utama text; v_cad text; v_raw_item text;
  v_item_id uuid; v_item_cnt int; v_u_id uuid; v_u_aktif boolean; v_c_id uuid; v_c_aktif boolean;
  v_err text; v_seen text[] := '{}'; v_rows jsonb := '[]'::jsonb; v_ok int := 0; v_fail int := 0;
BEGIN
  IF v_tenant IS NULL OR NOT public.has_tenant_role(v_tenant, 'master') THEN
    RAISE EXCEPTION 'Tidak berizin' USING ERRCODE = '42501';
  END IF;
  IF p_rows IS NULL OR jsonb_typeof(p_rows) <> 'array' THEN RAISE EXCEPTION 'Data impor tidak valid'; END IF;
  IF jsonb_array_length(p_rows) > 500 THEN RAISE EXCEPTION 'Maksimal 500 baris per impor'; END IF;

  FOR r IN SELECT value FROM jsonb_array_elements(p_rows) LOOP
    v_err := NULL; v_item_id := NULL; v_item_cnt := 0; v_u_id := NULL; v_u_aktif := NULL; v_c_id := NULL; v_c_aktif := NULL;
    v_line := CASE WHEN coalesce(r->>'line','') ~ '^\d{1,6}$' THEN (r->>'line')::int ELSE 0 END;
    v_raw_item := left(btrim(coalesce(r->>'nama_item','')), 200);
    v_item := lower(v_raw_item);
    v_utama := lower(left(btrim(coalesce(r->>'vendor_utama','')), 200));
    v_cad := lower(left(btrim(coalesce(r->>'vendor_cadangan','')), 200));

    IF v_item = '' THEN v_err := 'Nama item kosong';
    ELSIF v_item = ANY(v_seen) THEN v_err := 'Item muncul dua kali di file';
    END IF;
    IF v_item <> '' THEN v_seen := array_append(v_seen, v_item); END IF;

    IF v_err IS NULL THEN
      SELECT count(*), min(id::text)::uuid INTO v_item_cnt, v_item_id FROM public.pricelist_items
       WHERE tenant_id = v_tenant AND deleted_at IS NULL AND is_active AND lower(btrim(name)) = v_item;
      IF v_item_cnt = 0 THEN v_err := 'Item tidak ditemukan';
      ELSIF v_item_cnt > 1 THEN v_err := 'Nama item ganda di Pricelist (beda satuan) — pakai nama persis atau rapikan Pricelist';
      END IF;
    END IF;
    IF v_err IS NULL THEN
      SELECT id, aktif INTO v_u_id, v_u_aktif FROM public.vendors
       WHERE tenant_id = v_tenant AND deleted_at IS NULL AND lower(btrim(nama)) = v_utama LIMIT 1;
      IF v_utama = '' OR v_u_id IS NULL THEN v_err := 'Vendor utama tidak ditemukan';
      ELSIF NOT v_u_aktif THEN v_err := 'Vendor utama nonaktif';
      END IF;
    END IF;
    IF v_err IS NULL AND v_cad <> '' THEN
      SELECT id, aktif INTO v_c_id, v_c_aktif FROM public.vendors
       WHERE tenant_id = v_tenant AND deleted_at IS NULL AND lower(btrim(nama)) = v_cad LIMIT 1;
      IF v_c_id IS NULL OR NOT v_c_aktif THEN v_err := 'Vendor cadangan tidak ditemukan/nonaktif';
      ELSIF v_c_id = v_u_id THEN v_err := 'Vendor cadangan sama dengan utama';
      END IF;
    END IF;

    IF v_err IS NULL THEN
      v_ok := v_ok + 1;
      IF p_commit THEN
        INSERT INTO public.item_vendor_default (tenant_id, item_id, vendor_utama_id, vendor_cadangan_id)
        VALUES (v_tenant, v_item_id, v_u_id, v_c_id)
        ON CONFLICT (tenant_id, item_id) DO UPDATE SET vendor_utama_id = EXCLUDED.vendor_utama_id, vendor_cadangan_id = EXCLUDED.vendor_cadangan_id;
      END IF;
    ELSE
      v_fail := v_fail + 1;
    END IF;
    v_rows := v_rows || jsonb_build_object('line', v_line, 'nama_item', v_raw_item, 'vendor_utama', r->>'vendor_utama', 'vendor_cadangan', r->>'vendor_cadangan', 'status', CASE WHEN v_err IS NULL THEN 'ok' ELSE 'gagal' END, 'alasan', v_err);
  END LOOP;

  IF p_commit AND v_ok > 0 THEN
    INSERT INTO public.audit_logs (tenant_id, actor_id, action, entity_type, entity_id, diff)
    VALUES (v_tenant, auth.uid(), 'import', 'item_vendor_default', v_tenant, jsonb_build_object('ok', v_ok, 'gagal', v_fail));
  END IF;
  RETURN jsonb_build_object('summary', jsonb_build_object('ok', v_ok, 'gagal', v_fail), 'rows', v_rows);
END $$;

CREATE OR REPLACE FUNCTION public.list_pic_candidates()
RETURNS TABLE(user_id uuid, nama text, email text, role text)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE v_tenant uuid := public.active_tenant_id();
BEGIN
  IF v_tenant IS NULL OR NOT public.can_access_tenant_module(v_tenant, 'pembelanjaan') THEN
    RAISE EXCEPTION 'Tidak berizin' USING ERRCODE = '42501';
  END IF;
  RETURN QUERY
  SELECT m.user_id,
    coalesce((SELECT tm.name FROM public.team_members tm WHERE tm.tenant_id = v_tenant AND tm.deleted_at IS NULL AND lower(tm.email) = lower(u.email::text) LIMIT 1), u.email::text),
    u.email::text,
    coalesce((SELECT ur.role::text FROM public.user_roles ur WHERE ur.tenant_id = v_tenant AND ur.user_id = m.user_id ORDER BY ur.role LIMIT 1), 'staff')
  FROM public.tenant_memberships m JOIN auth.users u ON u.id = m.user_id
  WHERE m.tenant_id = v_tenant AND m.status = 'active'
  ORDER BY 2;
END $$;

CREATE OR REPLACE FUNCTION public.list_vendor_pics()
RETURNS TABLE(vendor_id uuid, user_id uuid, nama text, email text, pic_utama boolean, created_at timestamptz)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE v_tenant uuid := public.active_tenant_id();
BEGIN
  IF v_tenant IS NULL OR NOT public.can_access_tenant_module(v_tenant, 'pembelanjaan') THEN
    RAISE EXCEPTION 'Tidak berizin' USING ERRCODE = '42501';
  END IF;
  RETURN QUERY
  SELECT p.vendor_id, p.user_id,
    coalesce((SELECT tm.name FROM public.team_members tm WHERE tm.tenant_id = v_tenant AND tm.deleted_at IS NULL AND lower(tm.email) = lower(u.email::text) LIMIT 1), u.email::text, p.user_id::text),
    u.email::text, p.pic_utama, p.created_at
  FROM public.vendor_pic p LEFT JOIN auth.users u ON u.id = p.user_id
  WHERE p.tenant_id = v_tenant
  ORDER BY p.created_at, p.id;
END $$;

CREATE OR REPLACE FUNCTION public.set_vendor_pic(p_vendor_id uuid, p_user_id uuid, p_utama boolean)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_tenant uuid := public.active_tenant_id(); v_found uuid; v_utama boolean := coalesce(p_utama, false);
BEGIN
  IF v_tenant IS NULL OR NOT public.has_tenant_role(v_tenant, 'master') THEN
    RAISE EXCEPTION 'Tidak berizin' USING ERRCODE = '42501';
  END IF;
  SELECT id INTO v_found FROM public.vendors WHERE id = p_vendor_id AND tenant_id = v_tenant AND deleted_at IS NULL FOR UPDATE;
  IF v_found IS NULL THEN RAISE EXCEPTION 'Vendor tidak ditemukan' USING ERRCODE = 'P0002'; END IF;
  IF NOT EXISTS (SELECT 1 FROM public.vendor_pic WHERE vendor_id = p_vendor_id AND user_id <> p_user_id) THEN v_utama := true; END IF;
  IF v_utama THEN
    UPDATE public.vendor_pic SET pic_utama = false WHERE vendor_id = p_vendor_id AND pic_utama AND user_id <> p_user_id;
  END IF;
  INSERT INTO public.vendor_pic (tenant_id, vendor_id, user_id, pic_utama)
  VALUES (v_tenant, p_vendor_id, p_user_id, v_utama)
  ON CONFLICT (vendor_id, user_id) DO UPDATE SET pic_utama = (vendor_pic.pic_utama OR EXCLUDED.pic_utama);
END $$;

CREATE OR REPLACE FUNCTION public.remove_vendor_pic(p_vendor_id uuid, p_user_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_tenant uuid := public.active_tenant_id(); v_found uuid; v_was boolean;
BEGIN
  IF v_tenant IS NULL OR NOT public.has_tenant_role(v_tenant, 'master') THEN
    RAISE EXCEPTION 'Tidak berizin' USING ERRCODE = '42501';
  END IF;
  SELECT id INTO v_found FROM public.vendors WHERE id = p_vendor_id AND tenant_id = v_tenant AND deleted_at IS NULL FOR UPDATE;
  IF v_found IS NULL THEN RAISE EXCEPTION 'Vendor tidak ditemukan' USING ERRCODE = 'P0002'; END IF;
  DELETE FROM public.vendor_pic WHERE vendor_id = p_vendor_id AND user_id = p_user_id AND tenant_id = v_tenant RETURNING pic_utama INTO v_was;
  IF v_was IS NULL THEN RAISE EXCEPTION 'PIC tidak ditemukan' USING ERRCODE = 'P0002'; END IF;
  IF v_was THEN
    UPDATE public.vendor_pic SET pic_utama = true
     WHERE id = (SELECT id FROM public.vendor_pic WHERE vendor_id = p_vendor_id ORDER BY created_at, id LIMIT 1);
  END IF;
END $$;

REVOKE ALL ON FUNCTION public.import_item_vendor_defaults(jsonb, boolean) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.list_pic_candidates() FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.list_vendor_pics() FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.set_vendor_pic(uuid, uuid, boolean) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.remove_vendor_pic(uuid, uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.import_item_vendor_defaults(jsonb, boolean) TO authenticated;
GRANT EXECUTE ON FUNCTION public.list_pic_candidates() TO authenticated;
GRANT EXECUTE ON FUNCTION public.list_vendor_pics() TO authenticated;
GRANT EXECUTE ON FUNCTION public.set_vendor_pic(uuid, uuid, boolean) TO authenticated;
GRANT EXECUTE ON FUNCTION public.remove_vendor_pic(uuid, uuid) TO authenticated;