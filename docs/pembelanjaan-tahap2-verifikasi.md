# Verifikasi Pembelanjaan Tahap 2

Uji: `docs/pembelanjaan-tahap2-tests.sql`, dijalankan lewat alat database sebagai `authenticated` + JWT sintetis (tenant/user uji `zz-*`). Diakhiri `RAISE EXCEPTION 'RESULT…'` sehingga semua data uji batal; tidak ada data tersimpan di Sedyain.

| Uji | Hasil |
|---|---|
| Master: impor dry-run 10 baris (8 valid, 1 item tidak ada, 1 vendor tidak ada) → 8 ok / 2 gagal + alasan, tidak menulis | PASS |
| Commit → tepat 8 baris tersimpan | PASS |
| Cadangan = utama ditolak (impor & constraint tabel) | PASS |
| PIC pertama otomatis utama; 2 PIC | PASS |
| Ganti PIC utama atomik (tanpa melanggar index) | PASS |
| Hapus PIC utama → PIC tertua jadi utama | PASS |
| Master membaca daftar PIC | PASS |
| Staff dengan modul: bisa baca, tidak bisa tulis (impor/set PIC/update ditolak) | PASS |
| Staff tanpa modul: impor, set_vendor_pic, list_pic_candidates ditolak | PASS |
| Tenant lain tidak bisa melihat/menyentuh data | PASS |
| Anon tidak punya EXECUTE | PASS |

Tidak teruji: `list_pic_candidates` mengembalikan nama dari team_members (user uji tidak ada di daftar akun), uji browser/HP, impor CSV dari Excel locale Indonesia.
