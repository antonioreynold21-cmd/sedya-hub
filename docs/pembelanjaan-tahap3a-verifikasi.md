# Verifikasi Pembelanjaan Tahap 3a — Daftar Belanja (DB + RPC)

Migrasi: `0021_pembelanjaan_daftar_belanja` (tabel + RPC), `0022`/`0023` (perketat hak: tanpa anon, tanpa tulis langsung), `0024` (item order tidak bisa masuk dua daftar aktif).
Uji: `docs/pembelanjaan-tahap3a-tests.sql` lewat alat database, `authenticated` + JWT sintetis, tenant uji `zz-p3-*`, diakhiri `RAISE EXCEPTION 'RESULT…'` → semua batal. Setelah uji: 0 tenant `zz-*`, 0 baris di ketiga tabel baru.

| Uji | Hasil |
|---|---|
| 1 Generate 2 order: nama+satuan cocok tepat 1 → vendor utama; nama ganda / tidak cocok → NULL; snapshot customer/section | PASS |
| 1 Generate ulang → draft sama, 0 ditambah, 3 dilewati | PASS |
| 1 Item order yang sudah di daftar terkirim tidak masuk lagi ke draft baru | PASS |
| 2 Staff bermodul bukan PIC ditolak; PIC vendor lain ditolak; PIC vendor itu berhasil; staff tanpa modul ditolak (tulis/baca/list) | PASS |
| 2 Item tanpa vendor hanya Master | PASS |
| 3 Sebagian tanpa qty / qty ≥ qty ditolak; sebagian=4; ada=qty; kosong=0; ulang idempoten (audit tetap 2); sumber `telegram` tercatat | PASS |
| 4 Kirim hanya Master & hanya draft; peringatan item tanpa vendor; PIC tidak bisa ubah saat draft; Master bisa | PASS |
| 5 Tutup ditolak bila ada `belum_dibeli`; berhasil setelah semua selesai (`semua_selesai=true`), `ringkasan_terkirim_at` terisi | PASS |
| 6 Tenant lain tidak bisa baca/tulis | PASS |
| 7 Tanpa hard delete (juga sebagai pemilik DB); item & audit tanpa tulis langsung; `belanja_audit` append-only | PASS |
| Anon tanpa SELECT/EXECUTE | PASS |
| 8 Hash order lama tidak berubah oleh fitur ini | PASS* |

\* Hash referensi `75a04fe6…` sudah tidak cocok **sebelum** migrasi ini: 2 order diubah lewat aplikasi pada 27 Okt 2026. Hash saat ini `10cea9ae1aaec4c397e95c5df3c2ea80` tetap sama sebelum/sesudah uji.

Catatan: `outlet_nama` disalin dari `order_items.outlet_name`; guard order yang ada mengosongkan outlet_name tanpa outlet_id, jadi pada uji nilainya NULL. Generate untuk tanggal tanpa draft selalu membuat draft (bisa kosong bila semua item dilewati). `tsgo --noEmit` 0 error. Belum teruji: UI (3b), Telegram.
