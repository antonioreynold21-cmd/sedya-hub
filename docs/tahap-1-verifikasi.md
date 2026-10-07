# Tahap 1 — hasil implementasi dan verifikasi

## Ringkasan
- Tenant Sedyain dengan 7 keanggotaan, 2 Master, 5 Staff, dan 21 izin modul dipetakan melalui expand → backfill → enforce.
- Semua 11 tabel bisnis serta user_roles/module_access memiliki tenant_id NOT NULL; relasi order/item/shipment/client dilindungi FK gabungan.
- ID, token tracking, dan nomor dokumen lama tidak diubah; format invoice baru tetap konfigurasi Sedyain dan saran berikutnya 167.
- RLS per operasi dan modul; anon tidak mendapat akses tabel bisnis; platform operator tidak otomatis menjadi anggota bisnis.
- Arsip, alasan wajib, permintaan Staff, keputusan Master, pemulihan, dan audit append-only tersedia.
- Provider tenant, pemilih multi-keanggotaan, branding, tenant query keys, reset cache, serta error/retry terpasang.
- Dashboard dan Client membedakan data tidak berizin dari nol/kosong. Lookup lintas modul tidak mengambil data tanpa izin.
- Akun tanpa membership tidak otomatis mendapat bisnis atau Master; pembuatan tenant+Master hanya RPC platform operator.

## Teruji
- Build otomatis terakhir: build OK (2026-10-07T11:51:17Z).
- Sesi resmi pemilik (Master A): bootstrap, insert milik sendiri, archive, archived row hidden, restore, alasan wajib.
- Tenant palsu saat insert/update/select_active_tenant ditolak; hard delete 403; modifikasi audit 403.
- Order invalid ditolak secara atomik tanpa order parsial; final discount 1% tanpa persetujuan ditolak.
- Master biasa ditolak membuat tenant; audit actor sesuai sesi pemilik.
- Anon: 13 tabel internal yang diuji mengembalikan 401; RPC harga 200 dengan 12 item; token tracking valid 200 tanpa harga.
- Browser: Dashboard, Arsip, Persetujuan, Akses, Orders, Shipments Master tanpa pageerror; harga dan tracking selesai tampil.
- Anon membuka /orders dialihkan ke /auth.
- Linter: 28 peringatan EXECUTE SECURITY DEFINER (3 publik yang disengaja, 25 fungsi authenticated dengan validasi). Tidak berarti seluruh pengujian keamanan selesai.

## Belum teruji / cek manual wajib
- Matriks Master A, Staff A, tenant B untuk seluruh operasi lintas tenant/modul belum lengkap: tidak ada tenant B, sesi akun lain membutuhkan persetujuan platform.
- Staff mengajukan arsip → badge pending → Master setujui/tolak → restore pada semua jenis data.
- Pemilih tenant dan reset cache saat akun dengan dua membership berpindah tenant.
- Signup tanpa undangan menggunakan akun baru; platform operator membuat tenant+Master secara atomik.
- Konfirmasi received-by sekali saja pada shipment uji (pengujian tidak mengubah penerima shipment lama).
- Dokumen print/PDF, logo resmi, alamat, kontak, informasi bank dan warna tenant sesuai data pemilik.
- Izin Team terpisah diperlukan untuk mengambil daftar anggota; Order dan Pengiriman juga terpisah untuk Surat Jalan.

## Asumsi / batas tahap
- /harga tetap khusus tenant slug sedyain; branding/domain tenant lain tahap pilot.
- Operator platform belum diberikan kepada akun mana pun; perlu penunjukan operator secara administratif.
- Discount approval threshold dan guard final tersedia; UI persetujuan diskon/cancel serta cicilan belum dibuat (Tahap 2).
- Soft archive hanya; tidak ada jalur purge permanen. Satu client uji __TEST_ARCHIVE__ tersimpan di Arsip beserta audit.
- Data uji lama tetap dipertahankan; akun/tenant B tidak dibuat atau kata sandi diubah demi pengujian.
