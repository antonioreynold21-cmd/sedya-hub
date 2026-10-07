# Tahap 2 — verifikasi (7 Oktober 2026)

## Implementasi
- Penawaran + item, formulir bersama, pricelist tenant, diskon item/dokumen persen atau nominal, PPN opsional.
- Simpan multi-baris, konversi penawaran, penerbitan, nomor per client, pembayaran, void, keputusan approval lewat RPC atomik.
- Counter `document_sequences` memakai kunci tenant + kode client + jenis; tidak direset per bulan. Dokumen lama tidak dinomori ulang.
- `tenant_settings.doc_numbering` override format; `sales_numbering` menyediakan default PO/INV/QUO. Placeholder `{CLIENT}`/`{KODE_CLIENT}`, `{YYYY}`, `{MM}`, `{SEQ}`/`{urut}`.
- Snapshot brand/legal tersimpan pada dokumen final dan dilindungi trigger; perubahan nominal invoice terbit dikunci.
- Pembayaran Finance-only, saldo dari pembayaran aktif, void Master dengan alasan, satu piutang per invoice melalui pencocokan nomor/relasi.
- Persetujuan diskon/pembatalan + notifikasi pemohon; cache tenant diinvalidasi bersama; KPI Done memakai completed_at.

## Pengujian yang dijalankan
`docs/tahap-2-tests.sql` dijalankan melalui koneksi pemeliharaan Cloud dalam BEGIN/ROLLBACK. Pemeriksaan `current_user='authenticated'` memastikan simulasi role benar-benar aktif. SELECT hasil akhir mengembalikan:

| Kelompok | Hasil |
|---|---|
| Master A: konversi, nomor urut, pembayaran 50.000 + 150.000 atas 200.000, saldo, satu piutang, void, diskon 10%, approval eksplisit, cancel | PASS |
| Master A: pembayaran 200.001 ditolak, diskon belum disetujui ditolak, konversi kedua ditolak, tenant palsu/update tenant/hard delete ditolak | PASS |
| Staff A: hak Order tanpa Master; approval dan nomor manual ditolak | PASS |
| Staff Workflow: baca transaksi kosong; simpan, arsip Order, pembayaran ditolak | PASS |
| Master B: baca tenant A kosong; edit, terbitkan, arsip tenant A ditolak | PASS |
| Anon: baca Order dan RPC simpan ditolak | PASS |

Pemeriksaan sesudah rollback: tenant sintetis=0, profil sintetis=0, quotations=0, payments=0; tidak membuat auth user, tenant permanen, atau mengubah password.
Unit test `bun src/lib/sales.test.ts`: PASS (diskon persen/nominal, PPN 11%, qty negatif, diskon >100% dan total negatif).
Kompilasi otomatis: build OK setelah penyesuaian tipe error boundary.
Linter: hanya peringatan fungsi SECURITY DEFINER yang memang memvalidasi tenant/modul atau RPC publik terbatas; grant anon pada helper trigger dicabut.

## Browser Master / anonim
- Order lama 4 baris terbaca; invoice DNA tetap `166/SDY/INV/DNA/082026`, total 13.000.000, diskon/PPN/pembayaran/saldo tampil.
- Invoice hilang menampilkan error + Coba lagi, tanpa tombol cetak; dokumen belum final tidak boleh dicetak.
- Finance → Piutang → Pembayaran membuka detail dengan total/sisa dan form pencatatan; tidak membutuhkan halaman Order.
- Form Penawaran terbuka dan menghitung diskon; dialog ponsel dapat di-scroll, tidak meluber horizontal.
- `/harga` anonim menampilkan 12 item; tracking token lama anonim terbaca; tanpa pageerror.
- Screenshot diperiksa: invoice, mode print, form ponsel, pembayaran Finance, pricelist dan tracking.

## Belum dibuktikan penuh / cek manual
- Pengujian dua sesi pembuatan invoice **bersamaan** belum dijalankan: koneksi shell hanya read-only/tidak dapat SET ROLE; tool Cloud menyediakan satu transaksi per panggilan. Uji SQL membuktikan nomor berbeda secara berurutan, bukan concurrency. Implementasi memakai row-lock dan UPSERT counter atomik + indeks unik tenant.
- Alur browser **penawaran baru → order → terbit → parsial → lunas** serta **diskon → keputusan UI** belum dijalankan dengan penyimpanan browser: akan meninggalkan ledger/audit/arsip uji permanen. Alur lengkap telah diuji di database dengan rollback; UI dibaca/dibuka tanpa menulis. Ini bukan klaim lulus browser end-to-end penuh.
- Pemilik perlu cek cetak A4 fisik/PDF, logo/rekening tenant, masa berlaku, aturan diskon item/dokumen, notifikasi Staff, void + cancel, serta konfigurasi penomoran custom.
- Logo snapshot mengikuti pengaturan tenant saat final; logo tampak hitam/emas pada data saat ini, tidak diganti diam-diam.

## Asumsi
- Kode client = nama kapital, hanya A–Z/0–9; nama berbeda yang menghasilkan kode sama berbagi counter. Counter berlanjut lintas bulan/tahun.
- Penawaran default QUO; konversi membuat Order bertanggal konversi; invoice menggunakan tanggal dokumen pada Order.
- Invoice dengan pembayaran aktif harus di-void sebelum pembatalan disetujui; void hanya Master berakses Finance.
- Piutang lama yang tidak terkait invoice tetap manual; belum merekonstruksi pembayaran historis tanpa catatan.
