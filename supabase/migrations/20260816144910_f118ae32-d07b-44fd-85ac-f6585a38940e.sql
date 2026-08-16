CREATE OR REPLACE FUNCTION public.set_updated_at() RETURNS TRIGGER AS $$ BEGIN NEW.updated_at = now(); RETURN NEW; END; $$ LANGUAGE plpgsql SET search_path = public;

CREATE TABLE public.team_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  email text NOT NULL,
  division text NOT NULL,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.clients (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  contact_person text,
  phone text,
  status text NOT NULL DEFAULT 'Lead Baru',
  pic text,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.payables (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  vendor text NOT NULL,
  invoice_no text,
  amount numeric(14,2) NOT NULL DEFAULT 0,
  invoice_date date,
  due_date date,
  status text NOT NULL DEFAULT 'Belum Bayar',
  pic text,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.receivables (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_name text NOT NULL,
  invoice_no text,
  amount numeric(14,2) NOT NULL DEFAULT 0,
  invoice_date date,
  due_date date,
  status text NOT NULL DEFAULT 'Belum Tertagih',
  pic text,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.cash_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  purpose text NOT NULL,
  request_date date NOT NULL DEFAULT current_date,
  amount numeric(14,2) NOT NULL DEFAULT 0,
  pic text,
  status text NOT NULL DEFAULT 'Pending',
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.expenses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  description text NOT NULL,
  expense_date date NOT NULL DEFAULT current_date,
  category text NOT NULL DEFAULT 'Lain-lain',
  amount numeric(14,2) NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'Draft',
  pic text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.tasks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  division text NOT NULL DEFAULT 'Operasional',
  assignee text,
  priority text NOT NULL DEFAULT 'Medium',
  due_date date,
  status text NOT NULL DEFAULT 'To Do',
  position integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.team_members, public.clients, public.payables, public.receivables, public.cash_requests, public.expenses, public.tasks TO anon, authenticated;
GRANT ALL ON public.team_members, public.clients, public.payables, public.receivables, public.cash_requests, public.expenses, public.tasks TO service_role;

ALTER TABLE public.team_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payables ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.receivables ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cash_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "internal_all_team_members" ON public.team_members FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);
CREATE POLICY "internal_all_clients" ON public.clients FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);
CREATE POLICY "internal_all_payables" ON public.payables FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);
CREATE POLICY "internal_all_receivables" ON public.receivables FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);
CREATE POLICY "internal_all_cash_requests" ON public.cash_requests FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);
CREATE POLICY "internal_all_expenses" ON public.expenses FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);
CREATE POLICY "internal_all_tasks" ON public.tasks FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

CREATE TRIGGER trg_team_members_updated BEFORE UPDATE ON public.team_members FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER trg_clients_updated BEFORE UPDATE ON public.clients FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER trg_payables_updated BEFORE UPDATE ON public.payables FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER trg_receivables_updated BEFORE UPDATE ON public.receivables FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER trg_cash_requests_updated BEFORE UPDATE ON public.cash_requests FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER trg_expenses_updated BEFORE UPDATE ON public.expenses FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER trg_tasks_updated BEFORE UPDATE ON public.tasks FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

INSERT INTO public.team_members (name, email, division, is_active) VALUES
 ('Budi Santoso','budi@sedyain.id','Operasional',true),
 ('Rina Wijaya','rina@sedyain.id','Operasional',true),
 ('Agus Prasetyo','agus@sedyain.id','Operasional',true),
 ('Dewi Lestari','dewi@sedyain.id','Operasional',true),
 ('Siti Nurhaliza','siti@sedyain.id','Finance',true),
 ('Andi Kurniawan','andi@sedyain.id','Finance',true),
 ('Maya Anggraini','maya@sedyain.id','Admin',true),
 ('Rizky Pratama','rizky@sedyain.id','Marketing',true),
 ('Nadia Putri','nadia@sedyain.id','Marketing',true);

INSERT INTO public.clients (name, contact_person, phone, status, pic, notes) VALUES
 ('Hotel Grand Melati','Pak Hendra','081234567890','Deal','Rizky Pratama','Order rutin sayur mingguan'),
 ('Kafe Kopi Senja','Bu Laras','081298765432','Negosiasi','Nadia Putri','Minta harga khusus untuk susu'),
 ('Resto Bumbu Desa','Pak Yanto','082112223334','Follow Up','Rizky Pratama','Menunggu konfirmasi sampel'),
 ('Catering Sejahtera','Bu Ratna','085612345678','Lead Baru','Nadia Putri','Inbound dari Instagram'),
 ('Bakery Manis Jaya','Pak Doni','087788990011','Tidak Lanjut','Rizky Pratama','Sudah punya supplier tetap');

INSERT INTO public.payables (vendor, invoice_no, amount, invoice_date, due_date, status, pic, notes) VALUES
 ('CV Sayur Segar','INV-VS-1042',12500000,current_date - 20,current_date + 1,'Belum Bayar','Siti Nurhaliza','Kiriman sayur bulan ini'),
 ('PT Daging Nusantara','INV-DN-2201',28750000,current_date - 15,current_date + 3,'Belum Bayar','Andi Kurniawan','Termin 30 hari'),
 ('UD Beras Makmur','INV-BM-0098',9800000,current_date - 25,current_date - 2,'Belum Bayar','Siti Nurhaliza','Lewat jatuh tempo, segera bayar'),
 ('PT Susu Prima','INV-SP-3310',6400000,current_date - 10,current_date + 6,'Belum Bayar','Andi Kurniawan',''),
 ('CV Bumbu Rasa','INV-BR-0771',4200000,current_date - 40,current_date - 10,'Sudah Bayar','Siti Nurhaliza','Sudah lunas via transfer');

INSERT INTO public.receivables (client_name, invoice_no, amount, invoice_date, due_date, status, pic, notes) VALUES
 ('Hotel Grand Melati','SI-2026-0101',35400000,current_date - 18,current_date + 2,'Belum Tertagih','Andi Kurniawan','Tagihan mingguan'),
 ('Kafe Kopi Senja','SI-2026-0102',7800000,current_date - 12,current_date + 5,'Belum Tertagih','Siti Nurhaliza',''),
 ('Resto Bumbu Desa','SI-2026-0103',15250000,current_date - 30,current_date - 1,'Belum Tertagih','Andi Kurniawan','Follow up via WA'),
 ('Catering Sejahtera','SI-2026-0104',5100000,current_date - 8,current_date + 12,'Belum Tertagih','Siti Nurhaliza',''),
 ('Bakery Manis Jaya','SI-2026-0099',9900000,current_date - 45,current_date - 15,'Lunas','Andi Kurniawan','Sudah dibayar');

INSERT INTO public.cash_requests (purpose, request_date, amount, pic, status, notes) VALUES
 ('Belanja sayur pasar induk',current_date,3500000,'Budi Santoso','Pending','Butuh pagi ini'),
 ('Belanja ayam & telur',current_date - 1,4200000,'Rina Wijaya','Disetujui',''),
 ('Belanja kemasan & plastik',current_date - 3,1250000,'Agus Prasetyo','Ditransfer',''),
 ('Belanja peralatan dapur',current_date - 5,2750000,'Dewi Lestari','Ditolak','Ditunda bulan depan');

INSERT INTO public.expenses (description, expense_date, category, amount, status, pic) VALUES
 ('Tagihan listrik gudang',current_date - 2,'Listrik & Air',3850000,'Dibayar','Maya Anggraini'),
 ('Langganan internet kantor',current_date - 4,'Internet & Telepon',950000,'Dibayar','Maya Anggraini'),
 ('Bensin mobil pengiriman',current_date - 1,'Transportasi',1500000,'Disetujui','Budi Santoso'),
 ('Iklan Instagram Ads',current_date - 6,'Marketing',2500000,'Draft','Nadia Putri'),
 ('Service kendaraan box',current_date - 9,'Maintenance',3200000,'Disetujui','Agus Prasetyo'),
 ('Gaji tim bulan ini',current_date - 12,'Gaji & THR',68000000,'Dibayar','Siti Nurhaliza');

INSERT INTO public.tasks (title, division, assignee, priority, due_date, status, position) VALUES
 ('Rekap stok gudang harian','Operasional','Budi Santoso','High',current_date,'To Do',1),
 ('Hubungi 10 lead baru HORECA','Marketing','Nadia Putri','Medium',current_date + 3,'To Do',2),
 ('Susun jadwal pengiriman minggu depan','Operasional','Rina Wijaya','High',current_date + 2,'In Progress',1),
 ('Rekonsiliasi bank bulan ini','Finance','Andi Kurniawan','High',current_date + 1,'In Progress',2),
 ('Review invoice vendor sayur','Finance','Siti Nurhaliza','Medium',current_date + 1,'Review',1),
 ('Update konten katalog produk','Marketing','Rizky Pratama','Low',current_date + 7,'Review',2),
 ('Arsip dokumen kontrak client','Admin','Maya Anggraini','Low',current_date - 1,'Done',1),
 ('Audit kualitas sayur masuk','Operasional','Agus Prasetyo','Medium',current_date - 2,'Done',2),
 ('Training SOP packing','Operasional','Dewi Lestari','Medium',current_date - 3,'Done',3);