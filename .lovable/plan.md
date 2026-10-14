# Perbaikan alur undangan akun

## Ringkasan
Tutup pendaftaran bebas dan tambahkan undangan tenant yang aman. Master dapat membuat tautan sekali lihat, calon anggota mendaftar atau masuk dengan email yang sama, lalu akses tenant, peran, dan modul dibuat atomik setelah email terkonfirmasi.

## Implementasi
1. Tambahkan tabel undangan tenant dengan token SHA-256, masa berlaku tujuh hari, status, validasi modul, RLS Master per tenant, dan audit.
2. Tambahkan fungsi aman untuk membuat, mencabut, melihat pratinjau terbatas, dan menerima undangan. Penerimaan bersifat idempoten serta tidak mengubah akses akun lama.
3. Tambahkan dialog dan daftar undangan menunggu di halaman Team khusus Master, termasuk salin tautan dan bagikan WhatsApp.
4. Ubah halaman masuk agar pendaftaran hanya tersedia lewat undangan, mempertahankan token saat konfirmasi email, lalu menerima undangan dan memuat akses tenant.
5. Tambahkan penerimaan tautan undangan pada layar akun yang belum memiliki bisnis.
6. Karena `platform_admins` dan fungsi pembuatan tenant sudah tersedia, tambahkan halaman operator yang membuat bisnis beserta undangan Master pertama tanpa membuat tenant demo.

## Detail teknis
- Migrasi baru saja; tidak mengubah migrasi lama atau data membership, role, dan module access yang ada.
- Token mentah dibuat dari sedikitnya 32 byte acak, hanya dikembalikan saat pembuatan, dan tidak disimpan.
- Fungsi publik pratinjau hanya mengembalikan nama bisnis, email, dan peran; seluruh kegagalan token memakai pesan generik.
- Fungsi penerimaan memverifikasi identitas, email JWT, serta waktu konfirmasi email di server auth sebelum menulis akses.
- Operator diverifikasi melalui tabel operator platform dan tidak memperoleh akses data tenant.

## Verifikasi
- Uji SQL dalam transaksi rollback untuk penolakan Staff, lintas tenant, token invalid/kedaluwarsa/terpakai, email berbeda/belum terkonfirmasi, hasil akses tepat, dan idempotensi.
- Periksa alur browser Master membuat/mencabut tautan dan halaman masuk tanpa menulis akun atau tenant permanen.
- Jalankan pengujian terkait dan pastikan aplikasi berhasil dibangun; catat hasil serta batasan di dokumen verifikasi Tahap 2d.

## Asumsi
- Tautan undangan dibagikan manual; tidak ada pengiriman email otomatis.
- Undangan Master pertama dibuat oleh operator sebelum calon Master mempunyai akun.
- Modul `dashboard` tetap boleh dicantumkan walau akses dashboard juga tersedia bagi anggota aktif.
