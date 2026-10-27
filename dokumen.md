# Sedyain Hub

Aplikasi internal Sedyain Indonesia untuk operasional supplier bahan baku HORECA. Satu bisnis (tenant) memakai aplikasi yang sama: CRM, penjualan, keuangan, pengiriman, pricelist, pembelanjaan, tugas tim, dan pengaturan akses.

Dokumen ini menjelaskan arsitektur yang berjalan di kode dan fungsi yang tersedia bagi pengguna.

## Arsitektur

Aplikasi adalah web full-stack. Antarmuka React berjalan di peramban. Server TanStack Start merender halaman dan menjaga server function. Data bisnis disimpan di PostgreSQL melalui Supabase. Perubahan banyak baris, penomoran, persetujuan, dan saldo pembayaran diputuskan di database, bukan di peramban, supaya tidak ada penulisan setengah jadi saat dua orang menyimpan bersamaan.

```text
Peramban
  React 19 + TanStack Router + TanStack Query
        |
        | Supabase Auth (sesi di localStorage)
        | PostgREST + RPC PostgreSQL
        v
Supabase
  Auth, Row Level Security, fungsi SECURITY DEFINER
        |
        v
PostgreSQL
  data tenant, audit, penomoran, saldo
```

Lapisan kode:

| Lapisan | Lokasi | Peran |
| --- | --- | --- |
| Halaman | `src/routes` | Satu berkas per URL. Halaman internal berada di bawah `/_authenticated`. |
| Komponen bisnis | `src/components` | Editor penjualan, daftar dokumen, pembayaran, arsip, sidebar, gerbang modul. |
| Aturan klien | `src/lib` | Perhitungan penjualan, format rupiah, akses modul, filter tenant. |
| Klien data | `src/integrations/supabase` | Klien Supabase peramban, klien service role server, lampiran token. |
| Skema | `drizzle/` dan `supabase/migrations` | Tabel, pemicu, dan fungsi PostgreSQL. |

### Permintaan halaman

1. Vite menyajikan aplikasi saat pengembangan di port `8080`. Build produksi memakai Nitro dan menghasilkan server Node di `.output`.
2. `src/start.ts` memasang middleware CSRF untuk server function dan middleware yang menempelkan token Supabase.
3. Rute di bawah `/_authenticated` menolak pengunjung tanpa sesi dan mengarahkan ke `/auth`. Halaman internal ini tidak di-render di server (`ssr: false`).
4. `TenantProvider` memanggil `bootstrap_current_user`, lalu menyimpan tenant aktif.
5. `ModuleGate` menutup halaman jika akun Staff tidak punya modul tersebut.
6. `useTenantQuery` menandai setiap cache dengan id tenant. Ganti tenant membatalkan seluruh cache supaya Finance, Client, pengiriman, dan saldo tidak tertukar.

Halaman tanpa sidebar: `/auth`, `/harga`, dan `/t/$token`.

### Multi-tenant dan peran

Setiap baris bisnis punya `tenant_id`. Pengguna bisa menjadi anggota lebih dari satu bisnis. Tenant aktif dipilih lewat `select_active_tenant`.

Dua peran:

- **Master** membuka semua modul, mengundang anggota, mengubah peran, menyetujui arsip, diskon, dan pembatalan, serta memulihkan arsip.
- **Staff** hanya membuka modul yang dicentang Master.

Penghapusan permanen dari antarmuka tidak dipakai. Staff mengajukan arsip; Master mengarsipkan langsung atau menyetujui permintaan. Data arsip tetap ada dan bisa dipulihkan. `tenantClient` otomatis membatasi baca dan ubah ke tenant aktif yang belum diarsip, lalu menolak `delete`.

### Penjualan dan dokumen

Penawaran, order, item, pembayaran, dan saldo ditulis lewat fungsi atomik, terutama `save_sales_document`, `convert_quotation`, `issue_invoice`, `record_payment`, dan `void_payment`. Nomor dokumen diambil dari urutan per tenant dan kode client (`next_sales_number`).

Saat invoice terbit, atau penawaran berstatus terkirim atau disetujui, aplikasi menyimpan snapshot merek dan identitas dokumen. Cetakan memakai snapshot itu, bukan pengaturan tenant yang berlaku hari ini. Pemicu database menolak perubahan snapshot, tanggal, client, diskon, dan pajak pada dokumen yang sudah terkunci.

Diskon di atas ambang `discount_approval_threshold_pct` butuh persetujuan Master sebelum dokumen final. Pembatalan invoice yang sudah terbit juga masuk antrean persetujuan.

### Keamanan data

- Sesi login adalah sesi Supabase di `localStorage`.
- Row Level Security dan fungsi `can_access` / `is_master` memutuskan izin di database. Pemeriksaan di antarmuka hanya menyembunyikan menu.
- Klien service role (`client.server.ts`) hanya untuk operasi server yang dipercaya dan tidak boleh masuk bundel peramban.
- Halaman publik hanya memakai RPC terbatas: pricelist yang memang dipublikasikan, serta lacak dan konfirmasi pengiriman berdasarkan token.
- `audit_logs` mencatat pembayaran, void, dan perubahan penugasan vendor.

### Lingkungan

| Variabel | Dipakai untuk |
| --- | --- |
| `VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY` | Klien peramban. Dibaca saat build. |
| `SUPABASE_URL`, `SUPABASE_PUBLISHABLE_KEY` | Server dan middleware auth. |
| `SUPABASE_SERVICE_ROLE_KEY` | Klien admin server. |
| `DATABASE_URL` | Migrasi Drizzle. |

Pengembangan: `bun install` lalu `bun run dev` di port 8080. Produksi: `bun install --frozen-lockfile`, `bun run build`, lalu `bun run start`. Server produksi memakai `PORT` (default 3000) dan mendengarkan `0.0.0.0`. `GET /api/health` hanya menjawab `{ "status": "ok" }`. Langkah Railway ada di `docs/deploy-railway.md`. Memindahkan hosting web tidak menjalankan migrasi.

## Fungsi aplikasi

### Masuk dan undangan

`/auth`

- Masuk dengan email dan kata sandi.
- Pendaftaran hanya lewat undangan. Tautan berisi `?invite=` menampilkan nama bisnis dan email yang diundang.
- Akun yang sudah masuk otomatis menerima undangan itu.
- Akun tanpa bisnis bisa menempel tautan undangan dari layar "Belum ada akses bisnis".
- Keluar membersihkan cache dan kembali ke `/auth`.

Master membuat undangan dari halaman Team: email, peran Staff atau Master, dan modul awal. Tautan bisa disalin atau dibuka di WhatsApp. Undangan yang masih berlaku bisa dicabut.

### Dashboard

`/`

Ringkasan sesuai modul yang boleh dibuka akun:

- Total utang belum bayar dan total piutang belum tertagih.
- Jumlah lead aktif (Lead Baru, Follow Up, Negosiasi).
- Tugas selesai tujuh hari terakhir dan tugas yang belum Done.
- Lima utang dan lima piutang dengan jatuh tempo paling dekat, beserta warna urgensi.

Piutang invoice yang terhubung ke order memakai saldo dari `finance_invoice_balances`. Piutang lama yang tidak terhubung ke order tetap ditampilkan.

### CRM

`/crm`

Daftar client dan lead. Kolom: nama, kontak, telepon, status, PIC, catatan. Status: Lead Baru, Follow Up, Negosiasi, Deal, Tidak Lanjut. Pengguna bisa memfilter status, menambah, mengubah, dan mengajukan arsip.

### Client

`/client`

Rekap baca-saja per nama client: PIC, nomor invoice terakhir, dan nomor surat jalan terakhir. Nomor invoice hanya terlihat jika akun punya modul Order. Nomor surat jalan hanya terlihat jika akun punya modul Pengiriman.

### Penawaran

`/penawaran` dan `/penawaran/$quotationId`

- Buat dan ubah penawaran draft: client, alamat, tanggal, berlaku sampai, bagian, catatan, item, diskon item, diskon dokumen, dan PPN sesuai tarif tenant.
- Harga item bisa diambil dari pricelist penjualan.
- Status: draft, terkirim, disetujui, ditolak, kedaluwarsa.
- Dokumen cetak menampilkan identitas bisnis dari snapshot setelah status terkirim atau disetujui.
- Penawaran disetujui yang belum dikonversi bisa dijadikan order jika akun punya modul Order.
- Penawaran yang sudah menjadi order, atau yang bukan draft, tidak bisa diedit dari daftar.

### Order dan dokumen

`/orders`, `/orders/$orderId/invoice`, `/orders/$orderId/surat-jalan`

- Buat dan ubah order draft dengan editor yang sama seperti penawaran.
- Status tampilan: draft, menunggu persetujuan, terbit, sebagian dibayar, lunas, jatuh tempo, dibatalkan.
- Terbitkan invoice. Setelah terbit, isi komersial dan snapshot terkunci.
- Cetak invoice dan, setelah pengiriman ada, cetak surat jalan.
- Ubah nomor invoice dengan alasan. Perubahan tercatat.
- Ajukan pembatalan invoice terbit ke Master.
- Buat pengiriman dari order yang invoice-nya sudah terbit.
- Arsip hanya untuk order yang belum terbit.

Perhitungan: subtotal, diskon item, diskon dokumen, PPN, total, pembayaran diterima, dan sisa tagihan.

### Pengiriman

`/shipments` dan `/t/$token`

Dari dalam aplikasi:

- Daftar surat jalan: tujuan, nomor DO, tanggal, petugas simpan, petugas antar, penerima, dan status.
- Status: Menunggu, Dikemas, Dalam Perjalanan, Terkirim.
- Tunjuk petugas dari anggota tim lewat RPC yang tidak membuka seluruh modul Team.
- Salin tautan lacak publik.

Halaman publik `/t/$token` tidak meminta login. Penerima melihat status, item, dan bisa mengonfirmasi nama penerima.

### Pricelist

`/pricelist` dan `/harga`

- Tambah, ubah, aktifkan, dan arsipkan item: nama, kategori, satuan, harga.
- Unduh template CSV, ekspor CSV, dan impor CSV lewat `import_pricelist_rows`.
- Item aktif tampil di halaman publik `/harga`, dikelompokkan per kategori, beserta waktu pembaruan terakhir dan identitas bisnis.

### Finance

`/finance` dan `/finance/invoice/$orderId`

Empat buku:

| Buku | Isi | Status |
| --- | --- | --- |
| Utang | Vendor, nomor invoice, jumlah, tanggal, jatuh tempo, PIC, keterangan | Belum Bayar, Sudah Bayar |
| Piutang | Client dan tagihan, termasuk saldo invoice order | Belum Tertagih, Lunas |
| Request transfer kas | Keperluan, tanggal, jumlah, PIC belanja | Pending, Disetujui, Ditransfer, Ditolak |
| Pengeluaran operasional | Deskripsi, tanggal, kategori, jumlah, PIC | Draft, Disetujui, Dibayar |

Baris yang belum lunas diwarnai menurut jatuh tempo: tujuh hari atau kurang kuning, tiga hari atau kurang oranye, satu hari atau lewat tempo merah, yang sudah lunas hijau.

Halaman pembayaran invoice mencatat pembayaran parsial (tanggal, metode, referensi, catatan) selama nominal tidak melebihi sisa. Pembayaran tidak diubah; koreksi memakai void beserta alasan. Saldo piutang invoice mengikuti catatan pembayaran.

### Pembelanjaan

`/pembelanjaan`

Tiga tab master vendor:

- **Vendor.** Cari dan filter aktif atau nonaktif. Master menambah, mengubah, dan menonaktifkan vendor. Nama unik per bisnis. Staff hanya membaca.
- **Vendor default.** Pasangan item dengan vendor utama dan cadangan. Bisa diubah Master, diekspor, dan diimpor CSV. Cadangan tidak boleh sama dengan utama.
- **PIC.** Master menunjuk anggota aktif sebagai PIC vendor dan menandai PIC utama.

Menonaktifkan vendor yang masih menjadi default menampilkan jumlah item yang memakainya. Penugasan itu tetap tersimpan.

### Workflow tim

`/workflow`

Papan empat kolom: To Do, In Progress, Review, Done. Setiap tugas punya nama, divisi (Operasional, Finance, Admin, Marketing), penanggung jawab dari anggota tim, prioritas Low, Medium, atau High, dan tanggal jatuh tempo. Kartu dipindah dengan tombol arah. Selesai mengisi `completed_at`. Tugas bisa diarsipkan.

### Team

`/team`

Daftar anggota operasional: nama, email, divisi, dan status aktif, plus jumlah per divisi. Master juga melihat panel undangan di halaman ini. Arsip anggota memakai alur persetujuan yang sama dengan data bisnis lain.

Ini berbeda dari akun login. Akun login dikelola di Kelola Akses Tim. Anggota Team adalah data penanggung jawab di tugas dan pengiriman.

### Administrasi Master

Menu ini hanya muncul untuk Master.

- **Arsip** (`/arsip`). Daftar data yang diarsipkan beserta alasan. Master memulihkan dengan alasan.
- **Persetujuan** (`/persetujuan`). Antrean arsip, diskon, dan pembatalan. Master menyetujui atau menolak dengan alasan. Jumlah menunggu tampil di sidebar. Pemohon mendapat notifikasi; notifikasi dibaca dari sidebar.
- **Kelola Akses Tim** (`/akses`). Daftar akun, ganti peran Master atau Staff, dan centang modul Staff.

Jika sebuah akun punya lebih dari satu bisnis, pemilih bisnis ada di kepala sidebar.

## Peta URL

| URL | Siapa | Fungsi |
| --- | --- | --- |
| `/auth` | Publik | Masuk, daftar lewat undangan |
| `/` | Sesuai modul | Dashboard |
| `/crm` | CRM | Pipeline client |
| `/client` | CRM | Rekap invoice dan surat jalan |
| `/penawaran` | Penawaran | Daftar dan editor penawaran |
| `/penawaran/$quotationId` | Penawaran | Cetak penawaran |
| `/orders` | Order | Daftar dan editor order |
| `/orders/$orderId/invoice` | Order | Cetak dan terbitkan invoice |
| `/orders/$orderId/surat-jalan` | Order | Cetak surat jalan |
| `/finance` | Finance | Empat buku keuangan |
| `/finance/invoice/$orderId` | Finance | Pembayaran invoice |
| `/shipments` | Pengiriman | Status dan penugasan |
| `/t/$token` | Publik bertoken | Lacak dan konfirmasi terima |
| `/pricelist` | Pricelist | Kelola harga |
| `/harga` | Publik | Harga yang dipublikasikan |
| `/pembelanjaan` | Pembelanjaan | Vendor, default, PIC |
| `/workflow` | Workflow | Kanban tugas |
| `/team` | Team | Anggota dan undangan |
| `/arsip` | Master | Pulihkan arsip |
| `/persetujuan` | Master | Putusan arsip, diskon, batal |
| `/akses` | Master | Peran dan modul |

## Data utama

| Kelompok | Tabel |
| --- | --- |
| Bisnis dan akun | `tenants`, `tenant_settings`, `tenant_memberships`, `tenant_invitations`, `profiles`, `user_roles`, `module_access`, `platform_admins` |
| Penjualan | `clients`, `quotations`, `quotation_items`, `orders`, `order_items`, `payments`, `document_sequences` |
| Operasi | `shipments`, `pricelist_items`, `tasks`, `team_members` |
| Keuangan | `payables`, `receivables`, `cash_requests`, `expenses` |
| Pembelanjaan | `vendors`, `item_vendor_default`, `vendor_pic` |
| Kendali | `approval_requests`, `notifications`, `audit_logs` |
