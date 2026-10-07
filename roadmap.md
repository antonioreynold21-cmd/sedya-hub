# Tahap 2 — Alur transaksi lengkap
# Tahap 2b — CRM
- [ ] Skema, akses baca/penuh, RPC atomik, arsip, audit, opsi dan pengingat.
- [ ] Ringkasan, customer/impor/detail, lead, pipeline, aktivitas, follow-up, pengaturan, tim.
- [ ] Uji unit, SQL rollback keamanan, browser baca-saja dan dokumentasi.

- [x] Skema/RPC penawaran, order, invoice, diskon, pembayaran, void, snapshot, counter per client.
- [x] Halaman Penawaran, formulir transaksi, invoice/pembayaran dan cetak terlindungi.
- [x] Persetujuan discount/cancel, notifikasi pemohon, izin/sidebar, Finance dan invalidasi cache.
- [x] Validasi nominal/status dan completed_at tugas.
- [x] Pengujian rollback RLS/aturan, browser read-only, verifikasi dan dokumentasi.
- [ ] Concurrency dua sesi + browser transaksi tersimpan tanpa residu: keterbatasan koneksi pemeliharaan/tool transaksi; dicatat di docs/tahap-2-verifikasi.md.