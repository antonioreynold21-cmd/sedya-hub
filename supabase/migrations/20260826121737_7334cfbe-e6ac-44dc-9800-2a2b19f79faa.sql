DROP POLICY IF EXISTS internal_all_team_members ON public.team_members;
DROP POLICY IF EXISTS internal_all_clients ON public.clients;
DROP POLICY IF EXISTS internal_all_payables ON public.payables;
DROP POLICY IF EXISTS internal_all_receivables ON public.receivables;
DROP POLICY IF EXISTS internal_all_cash_requests ON public.cash_requests;
DROP POLICY IF EXISTS internal_all_expenses ON public.expenses;
DROP POLICY IF EXISTS internal_all_tasks ON public.tasks;
DROP POLICY IF EXISTS internal_all_orders ON public.orders;
DROP POLICY IF EXISTS internal_all_order_items ON public.order_items;
DROP POLICY IF EXISTS internal_all_shipments ON public.shipments;
DROP POLICY IF EXISTS public_read_shipments ON public.shipments;
DROP POLICY IF EXISTS public_confirm_shipments ON public.shipments;
DROP POLICY IF EXISTS internal_all_pricelist ON public.pricelist_items;

REVOKE ALL ON public.team_members, public.clients, public.payables, public.receivables,
  public.cash_requests, public.expenses, public.tasks, public.orders, public.order_items,
  public.shipments, public.pricelist_items FROM anon;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.team_members, public.clients, public.payables,
  public.receivables, public.cash_requests, public.expenses, public.tasks, public.orders,
  public.order_items, public.shipments, public.pricelist_items TO authenticated;
GRANT SELECT ON public.pricelist_items TO anon;

CREATE POLICY internal_all_team_members ON public.team_members FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY internal_all_clients ON public.clients FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY internal_all_payables ON public.payables FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY internal_all_receivables ON public.receivables FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY internal_all_cash_requests ON public.cash_requests FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY internal_all_expenses ON public.expenses FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY internal_all_tasks ON public.tasks FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY internal_all_orders ON public.orders FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY internal_all_order_items ON public.order_items FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY internal_all_shipments ON public.shipments FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY internal_all_pricelist ON public.pricelist_items FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY public_read_active_pricelist ON public.pricelist_items FOR SELECT TO anon USING (is_active = true);

CREATE OR REPLACE FUNCTION public.get_shipment_tracking(p_token text)
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT jsonb_build_object(
    'ship_to', s.ship_to,
    'status', s.status,
    'delivery_date', s.delivery_date,
    'do_number', s.do_number,
    'received_by', s.received_by,
    'received_at', s.received_at,
    'items', COALESCE((
      SELECT jsonb_agg(jsonb_build_object(
        'id', oi.id, 'item_name', oi.item_name, 'qty', oi.qty, 'unit', oi.unit
      ) ORDER BY oi.position)
      FROM public.order_items oi WHERE oi.order_id = s.order_id
    ), '[]'::jsonb)
  )
  FROM public.shipments s
  WHERE p_token IS NOT NULL AND length(p_token) >= 16 AND s.public_token = p_token;
$$;

CREATE OR REPLACE FUNCTION public.confirm_shipment_receipt(p_token text, p_received_by text)
RETURNS jsonb
LANGUAGE plpgsql
VOLATILE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_name text := btrim(p_received_by);
  v_id uuid;
BEGIN
  IF p_token IS NULL OR length(p_token) < 16 THEN
    RAISE EXCEPTION 'Link pengiriman tidak valid';
  END IF;
  IF v_name IS NULL OR length(v_name) < 2 OR length(v_name) > 100 THEN
    RAISE EXCEPTION 'Nama penerima tidak valid';
  END IF;

  UPDATE public.shipments
     SET received_by = v_name,
         received_at = now(),
         status = 'Terkirim'
   WHERE public_token = p_token
     AND received_by IS NULL
  RETURNING id INTO v_id;

  IF v_id IS NULL THEN
    RAISE EXCEPTION 'Pengiriman tidak ditemukan atau sudah dikonfirmasi';
  END IF;

  RETURN public.get_shipment_tracking(p_token);
END;
$$;

REVOKE ALL ON FUNCTION public.get_shipment_tracking(text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.confirm_shipment_receipt(text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_shipment_tracking(text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.confirm_shipment_receipt(text, text) TO anon, authenticated;