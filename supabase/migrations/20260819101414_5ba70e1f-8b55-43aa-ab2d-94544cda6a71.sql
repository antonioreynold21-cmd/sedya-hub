CREATE TABLE public.orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid REFERENCES public.clients(id) ON DELETE SET NULL,
  client_name text NOT NULL,
  client_address text,
  po_number text,
  section text,
  invoice_number text,
  invoice_date date DEFAULT CURRENT_DATE,
  due_date date,
  notes text,
  created_by text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.orders TO authenticated, anon;
GRANT ALL ON public.orders TO service_role;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
CREATE POLICY internal_all_orders ON public.orders FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);
CREATE TRIGGER trg_orders_updated BEFORE UPDATE ON public.orders FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE public.order_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  position integer NOT NULL DEFAULT 0,
  item_name text NOT NULL,
  qty numeric NOT NULL DEFAULT 1,
  unit text NOT NULL DEFAULT 'pcs',
  price numeric NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.order_items TO authenticated, anon;
GRANT ALL ON public.order_items TO service_role;
ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY internal_all_order_items ON public.order_items FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);
CREATE TRIGGER trg_order_items_updated BEFORE UPDATE ON public.order_items FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE INDEX idx_order_items_order ON public.order_items(order_id);

CREATE TABLE public.shipments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  public_token text NOT NULL UNIQUE DEFAULT replace(gen_random_uuid()::text, '-', ''),
  ship_to text NOT NULL,
  do_number text,
  section text,
  delivery_date date DEFAULT CURRENT_DATE,
  status text NOT NULL DEFAULT 'Menunggu',
  stored_by text,
  delivery_by text,
  received_by text,
  received_at timestamptz,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.shipments TO authenticated;
GRANT SELECT, UPDATE ON public.shipments TO anon;
GRANT ALL ON public.shipments TO service_role;
ALTER TABLE public.shipments ENABLE ROW LEVEL SECURITY;
CREATE POLICY internal_all_shipments ON public.shipments FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY public_read_shipments ON public.shipments FOR SELECT TO anon USING (true);
CREATE POLICY public_confirm_shipments ON public.shipments FOR UPDATE TO anon USING (true) WITH CHECK (true);
CREATE TRIGGER trg_shipments_updated BEFORE UPDATE ON public.shipments FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE INDEX idx_shipments_token ON public.shipments(public_token);

CREATE TABLE public.pricelist_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  category text NOT NULL DEFAULT 'Umum',
  unit text NOT NULL DEFAULT 'kg',
  price numeric NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.pricelist_items TO authenticated, anon;
GRANT ALL ON public.pricelist_items TO service_role;
ALTER TABLE public.pricelist_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY internal_all_pricelist ON public.pricelist_items FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);
CREATE TRIGGER trg_pricelist_updated BEFORE UPDATE ON public.pricelist_items FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

INSERT INTO public.orders (client_name, client_address, po_number, section, invoice_number, invoice_date, due_date, created_by)
VALUES ('RUMARASA', 'Jl. Wolter Monginsidi No.5, Kebayoran Baru, Jakarta Selatan 12180', 'PO-2026-0148', 'KITCHEN', '164/SDY/INV/RUMARASA/1482026', CURRENT_DATE, CURRENT_DATE + 14, 'Dewi Lestari');

INSERT INTO public.order_items (order_id, position, item_name, qty, unit, price)
SELECT o.id, v.pos, v.nm, v.qty, v.unit, v.price
FROM public.orders o,
(VALUES (1,'Ayam Fillet Dada Premium',10,'kg',52000),(2,'Bawang Bombay Import',5,'kg',24000),(3,'Minyak Goreng Curah 18L',2,'jerigen',285000),(4,'Cabai Merah Keriting',3,'kg',48000))
AS v(pos,nm,qty,unit,price)
WHERE o.client_name = 'RUMARASA';

INSERT INTO public.shipments (order_id, ship_to, do_number, section, delivery_date, status, stored_by, delivery_by)
SELECT id, 'RUMARASA', '164/SDY/DO/RUMARASA/1482026', 'KITCHEN', CURRENT_DATE, 'Dikemas', 'Rizky Pratama', 'Andi Saputra'
FROM public.orders WHERE client_name = 'RUMARASA';

INSERT INTO public.pricelist_items (name, category, unit, price) VALUES
('Ayam Fillet Dada Premium','Protein','kg',52000),
('Ayam Utuh Broiler','Protein','kg',38000),
('Daging Sapi Sengkel','Protein','kg',128000),
('Telur Ayam Negeri','Protein','kg',29000),
('Bawang Bombay Import','Sayur & Bumbu','kg',24000),
('Bawang Merah Brebes','Sayur & Bumbu','kg',36000),
('Cabai Merah Keriting','Sayur & Bumbu','kg',48000),
('Tomat Segar','Sayur & Bumbu','kg',15000),
('Minyak Goreng Curah 18L','Grocery','jerigen',285000),
('Beras Premium 5kg','Grocery','sak',72000),
('Gula Pasir','Grocery','kg',16000),
('Garam Halus','Grocery','kg',9000);