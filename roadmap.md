# Klien/outlet — Tahap 1 (permintaan aktif)
- [ ] Migrasi pengaturan/outlet/item, proteksi dan penomoran tanpa perubahan data lama.
- [ ] Dialog Pengaturan Client pada CRM dengan error lokal.
- [ ] Uji rollback dan dokumentasi ringkas; pemeriksaan build.
# Tahap 2 — Alur transaksi lengkap
# Pembelanjaan — Tahap 1 (permintaan aktif)
- [ ] Modul/izin, tiga tabel master dan pengamanan tenant dalam migrasi baru.
- [ ] Halaman Vendor baca-saja Staff dan pengelolaan Master, ramah HP.
- [ ] Uji rollback keamanan/aturan, browser Master dan dokumentasi singkat.
# Tahap 2d — Undangan akun dan onboarding bisnis
- [ ] Skema undangan aman, RPC buat/cabut/pratinjau/terima, audit, dan akses operator.
- [ ] UI undangan Master, penerimaan di halaman masuk, serta pemulihan akun tanpa bisnis.
- [ ] Uji rollback keamanan/idempotensi, pemeriksaan browser, dan dokumentasi verifikasi.
# Tahap 2c — Perbaikan terbatas (CRM Tahap 2b ditunda)
- [ ] Penomoran global/client, kode client, tanggal terbit invoice, backfill aman.
- [ ] Penugasan tim pengiriman, snapshot nama dan nomor panjang.
- [ ] Uji rollback, pemeriksaan tampilan dan dokumentasi singkat.
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