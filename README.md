# Sedyain Hub

Buatkan aplikasi web internal untuk perusahaan Sedyain Indonesia (supplier bahan baku HORECA). Aplikasi ini menggabungkan 4 modul: CRM, Finance, Operasional, dan Workflow/Task tracking untuk tim internal (9 orang: 4 Operasional, 2 Finance, 1 Admin, 2 Marketing).

Tema warna: hijau tua (#1B4332 dan #2D6A4F) sebagai warna utama, krem/putih (#FAF7F0) sebagai background, aksen emas/gold (#C9A227). Font bersih dan profesional.

Struktur navigasi: sidebar kiri dengan menu Dashboard, CRM, Finance, Workflow Tim, dan Team.

Modul CRM: daftar client/lead dengan kolom Nama Client, Kontak, No Telepon, Status (Lead Baru, Follow Up, Negosiasi, Deal, Tidak Lanjut), PIC penanggung jawab, Catatan. Bisa tambah/edit/hapus data, filter by status.

Modul Finance, terdiri dari 4 sub-tab:
1. Utang: Vendor, No Invoice, Jumlah, Tanggal Invoice, Jatuh Tempo, Status (Belum Bayar/Sudah Bayar), PIC, Keterangan. Baris dengan jatuh tempo <=7 hari diberi warna kuning, <=3 hari oranye, <=1 hari atau lewat tempo merah, status lunas hijau.
2. Piutang: sama seperti utang tapi untuk Client, Status (Belum Tertagih/Lunas), dengan pewarnaan urgency yang sama.
3. Request Transfer Kas Belanja: Keperluan, Tanggal Request, Jumlah, PIC Belanja, Status (Pending/Disetujui/Ditransfer/Ditolak).
4. Pengeluaran Operasional: Deskripsi, Tanggal, Kategori (Operasional Kantor, Listrik & Air, Internet & Telepon, Gaji & THR, Transportasi, Marketing, Maintenance, Lain-lain), Jumlah, Status (Draft/Disetujui/Dibayar), PIC.

Modul Workflow Tim: papan kanban dengan 4 kolom (To Do, In Progress, Review, Done). Setiap task punya Task Name, Divisi (Operasional/Finance/Admin/Marketing), Assignee (dari daftar 9 anggota tim), Priority (Low/Medium/High), Due Date. Bisa pindahkan task antar kolom (drag and drop atau tombol pindah status).

Modul Team: daftar 9 anggota tim dengan Nama, Email, Divisi, status aktif.

Dashboard utama: ringkasan KPI card (Total Utang belum bayar, Total Piutang belum tertagih, jumlah lead aktif di CRM, jumlah task selesai minggu ini, jumlah task tertunda) plus daftar top 5 utang dan piutang yang segera jatuh tempo.

Gunakan database bawaan (Supabase/Postgres) untuk menyimpan semua data ini secara persisten, bukan data statis, sehingga siap dipakai banyak user sekaligus (multi user, tanpa perlu role permission rumit dulu - semua user internal bisa akses semua modul untuk versi awal ini).

## Development

Butuh Node.js 22+ dan [Bun](https://bun.sh).

```sh
bun install
bun run dev
```

Aplikasi berjalan di http://localhost:8080. Salin `.env.example` menjadi `.env` dan isi URL serta kunci Supabase.

## Deploy

Layanan web produksi adalah server Node hasil Nitro di `.output`. Panduan Railway ada di [docs/deploy-railway.md](docs/deploy-railway.md).

```sh
bun install --frozen-lockfile
bun run build
bun run start
```

`bun run start` mendengarkan `PORT` (default 3000) pada `0.0.0.0`. Variabel `VITE_*` dibaca saat build. `GET /api/health` menjawab `{ "status": "ok" }` tanpa login. Memindahkan hosting web ini tidak menjalankan migrasi database.
