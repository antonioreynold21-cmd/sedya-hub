DROP POLICY IF EXISTS internal_all_shipments ON public.shipments;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.shipments TO anon, authenticated;
CREATE POLICY internal_all_shipments ON public.shipments FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);