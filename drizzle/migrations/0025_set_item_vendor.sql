CREATE OR REPLACE FUNCTION public.set_item_vendor(p_item_id uuid, p_vendor_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_tenant uuid := public.active_tenant_id(); v_status text;
BEGIN
  IF v_tenant IS NULL OR NOT public.has_tenant_role(v_tenant, 'master') THEN
    RAISE EXCEPTION 'Hanya Master yang dapat mengatur vendor item.' USING ERRCODE = '42501';
  END IF;
  SELECT d.status INTO v_status FROM public.daftar_belanja_item i
    JOIN public.daftar_belanja d ON d.id = i.daftar_id AND d.tenant_id = i.tenant_id
   WHERE i.id = p_item_id AND i.tenant_id = v_tenant AND i.deleted_at IS NULL AND d.deleted_at IS NULL
   FOR UPDATE OF i;
  IF NOT FOUND THEN RAISE EXCEPTION 'Item daftar belanja tidak ditemukan.' USING ERRCODE = 'P0002'; END IF;
  IF v_status = 'selesai' THEN RAISE EXCEPTION 'Daftar belanja sudah selesai dan tidak dapat diubah.' USING ERRCODE = '22023'; END IF;
  IF p_vendor_id IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM public.vendors v WHERE v.id = p_vendor_id AND v.tenant_id = v_tenant AND v.aktif AND v.deleted_at IS NULL) THEN
    RAISE EXCEPTION 'Vendor tidak ditemukan atau tidak aktif.' USING ERRCODE = '22023';
  END IF;
  UPDATE public.daftar_belanja_item SET vendor_id = p_vendor_id, updated_by = auth.uid(), updated_at = now()
   WHERE id = p_item_id AND tenant_id = v_tenant;
END $$;
REVOKE ALL ON FUNCTION public.set_item_vendor(uuid, uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.set_item_vendor(uuid, uuid) TO authenticated;