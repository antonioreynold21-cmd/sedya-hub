# Rencana update Sedyain Hub

## Ringkasan
Prioritas: **amankan data dan perbaiki keandalan → laporan keuangan → fondasi tenant → pilot SaaS terbatas**. Jangan membuka pendaftaran perusahaan lain sebelum pemisahan data lulus pengujian. Semua di bawah adalah usulan; belum ada perubahan kode, database, atau pengaturan layanan.

Audit dilakukan dengan membaca kode, skema aktif, RLS, hak akses, fungsi database, dan jumlah data pada 7 Oktober 2026. Catatan build terakhir menunjukkan **build OK**. Temuan UI berasal dari kode, belum pembuktian visual di HP. Pengaturan login/email dan kesiapan domain belum diverifikasi; tidak diasumsikan aktif atau bermasalah.

Estimasi menggunakan **hari kerja pengembangan + pengujian**, satu pengembang, bukan janji tanggal. Usaha: kecil 1–2 hari, sedang 3–5, besar 6–10, sangat besar >10. Tahap dipilih satu per satu setelah persetujuan, bukan otomatis seluruh roadmap.

## 1. Kondisi saat ini yang terverifikasi
- Ada 14 tabel publik, semuanya memakai RLS; belum ada `tenants` atau `tenant_id`.
- Data bisnis: clients 5, orders 4, order_items 13, shipments 4, pricelist_items 12, payables 6, receivables 5, cash_requests 4, expenses 6, tasks 10, team_members 7. Ini baseline awal, dihitung ulang saat migrasi.
- Identitas/akses: profiles 7, user_roles 7 (**2 Master, 5 Staff**), module_access 21. Role dan izin masih global, bukan per perusahaan.
- `bootstrap_current_user()` memberi Master kepada akun tanpa role ketika belum ada Master; ini berdasarkan waktu pemanggilan fungsi, bukan urutan pembuatan akun. `/akses` memakai fungsi admin yang memeriksa Master di database.
- Dashboard selalu diizinkan di UI (`use-access.ts`, `access.ts`, `/akses`); tabel sumber tetap dibatasi berdasarkan modul. `ModuleGate` membantu UI, tetapi bukan batas keamanan. Dokumen tanpa sidebar juga tidak melewati gate tersebut.
- Relasi: item dan pengiriman → order, order → client. Penghapusan order menghapus item dan pengiriman melalui cascade. Nomor invoice belum unik; token tracking sudah unik.
- Akses anonim tabel bisnis ditutup, kecuali SELECT pricelist aktif. Fungsi tracking publik membatasi hasil berdasarkan token dan tidak mengembalikan harga. Hak tabel anonim pada profiles/user_roles/module_access masih luas, **tetapi RLS tidak menyediakan kebijakan anonim**; bukan bukti kebocoran, layak diperketat.

## 2. Urutan kerja dan gerbang persetujuan
| Tahap | Hasil | Usaha | Risiko / syarat lanjut |
|---|---|---|---|
| A — Stabilkan operasional | Perbaikan P0–P1 di bagian 5, uji role dan penyimpanan | Besar, 6–10 hari | Perubahan izin dapat mengubah kebiasaan Staff; matriks baca/tulis/hapus disepakati dahulu |
| B — Modul pertama | Laporan & aging piutang-utang, dengan ekspor terfilter | Sedang–besar, 4–6 hari | Arti saldo/pembayaran dan periode harus jelas; bukan pembukuan lengkap |
| C — Fondasi tenant untuk Sedyain saja | Struktur tambahan, pemetaan data, brand/settings, akses tenant | Sangat besar, 10–15 hari | Migrasi tidak boleh mengunci pengguna lama atau membuka akses lintas perusahaan |
| D — Pilot fase 3 | Tenant kedua, undangan, pemisahan publik, subdomain terverifikasi | Besar, 8–12 hari | Hanya lanjut setelah tes isolasi dan pemulihan lulus; domain/login perlu validasi |
| E — Perluasan SaaS | Pendaftaran mandiri, paket, billing, dukungan, kuota, modul lanjutan | Diestimasi setelah pilot | Biaya layanan, dukungan, privasi, dan model bisnis belum diputuskan |

**Aman direncanakan sekarang; setelah disetujui:** tahap A–B dan fondasi C yang tetap melayani satu perusahaan. **Ditunda ke pilot:** menerima perusahaan lain, perpindahan tenant pengguna, pendaftaran mandiri, domain otomatis, billing, serta akses operator platform ke data pelanggan. Struktur tambahan tetap harus diuji; “aman sekarang” bukan tanpa risiko.

## 3. Desain teknis multi-tenant yang diusulkan

### Model tenant dan kewenangan
- `tenants`: id, slug unik, nama/legal name, status. Satu tenant = satu perusahaan supplier pengguna aplikasi; **client HORECA di CRM bukan tenant secara otomatis**.
- `tenant_memberships`: tenant_id, user_id, status keanggotaan; unik pasangan tenant–user. Satu akun dapat bergabung ke beberapa tenant bila nanti diperlukan.
- Role tetap di tabel terpisah: tambah tenant_id pada `user_roles` dan `module_access`; keunikan menjadi tenant–user–role dan tenant–user–module. Tahap awal: Master/Staff per tenant, tidak menggandakan role di profiles/memberships.
- Lapisan di atasnya: `platform_roles` terpisah untuk operator SaaS. Platform Admin mengelola tenant/onboarding, **tidak otomatis membaca keuangan semua tenant**. Akses bantuan lintas tenant harus eksplisit, sementara, beralasan, dan tercatat. Pendaftar tidak pernah memperoleh role platform.
- `profiles` tetap identitas global minimal; tidak dipaksakan memiliki satu tenant_id karena akun dapat multi-tenant. Master hanya melihat profil anggota tenant-nya melalui fungsi terbatas. `team_members` tetap direktori staf tenant; hubungkan opsional ke akun tanpa menyamakan keduanya.
- Tambah tenant_id pada 11 tabel bisnis: clients, orders, order_items, shipments, pricelist_items, payables, receivables, cash_requests, expenses, tasks, team_members; juga role/izin dan tabel baru yang menyimpan data perusahaan. Relasi tenant mengarah ke `tenants`; tidak menambah foreign key ke skema auth.

### RLS dan akses
- Fungsi `SECURITY DEFINER` dengan search_path tetap: `is_tenant_member(tenant_id)`, `has_tenant_role(tenant_id, role)`, `can_access_tenant_module(tenant_id, module)`. Identitas diambil dari pengguna login, bukan user_id/role kiriman browser. Helper membaca tabel akses tanpa rekursi kebijakan.
- Setiap operasi harus memenuhi **keanggotaan aktif + tenant baris + izin operasi/modul**. Pisahkan SELECT/INSERT/UPDATE/DELETE; Master hanya penuh di tenant sendiri. Tidak ada “Master global bypass”.
- Tenant aktif pada UI adalah pilihan konteks, bukan bukti izin. Server memvalidasi pilihan; RLS memvalidasi tiap baris. Berikan tenant_id eksplisit, tolak tenant kosong/salah, dan cegah perubahan tenant_id saat update.
- Lindungi relasi silang dengan foreign key gabungan `(tenant_id, order_id)` dan `(tenant_id, client_id)` terhadap parent yang memiliki pasangan unik. Item dan pengiriman tidak boleh menunjuk order perusahaan lain.
- Indeks tenant + tanggal/status dan identitas relasi; pembatasan EXECUTE fungsi, GRANT sesuai operasi, lalu RLS. Tidak mempertahankan kebijakan lama permisif bersamaan dengan kebijakan tenant, karena kebijakan permisif dapat digabung dengan OR.
- Semua query/cache menjadi tenant-aware: key memuat tenant_id dan identitas bila diperlukan; bersihkan cache saat logout/pergantian tenant, hentikan request lama. Agregasi dan fungsi admin dibatasi tenant juga. Izin yang dicabut segera menutup data di database, meski sidebar belum diperbarui.

### Migrasi tanpa kehilangan data
1. **Baseline & pemulihan:** salinan aman dan prosedur restore yang diuji di lingkungan terisolasi; bandingkan jumlah baris, total nominal, relasi, invoice, token dan akses. Catat perubahan baru selama rollout.
2. **Expand:** buat tenant Sedyain, memberships/settings, tambah tenant_id nullable dan indeks. Pertahankan tabel/kolom lama, ID, nomor dokumen dan token; tidak drop/rename. Akun lama dipetakan ke Sedyain dengan role/izin yang sama.
3. **Kompatibilitas satu tenant:** kode lama yang belum mengirim tenant_id dapat diberi nilai Sedyain melalui mekanisme transisi terbatas. Backfill bertahap; tangkap baris yang dibuat selama proses. **Belum boleh ada tenant kedua.**
4. **Alihkan aplikasi:** seluruh baca/tulis, admin RPC, dokumen, publik dan cache memakai tenant. Tambahkan validasi parent–child. Verifikasi tidak ada tenant_id kosong dan angka baseline + perubahan baru cocok.
5. **Cutover RLS:** ganti kebijakan/helper global secara atomik, uji Master/Staff dan alur harian. Setelah semua penulis kompatibel, enforce NOT NULL, relasi dan keunikan tenant; hapus fallback Sedyain sebelum tenant kedua.
6. **Pemulihan bertahap:** feature flag untuk perubahan UI; jangan membuka kembali RLS global saat tenant kedua sudah ada. Jika gagal, hentikan onboarding/operasi terdampak dan perbaiki maju atau restore terkontrol, dengan rekonsiliasi transaksi baru. Uji beban/kunci database sebelum menentukan jadwal rollout; target tanpa gangguan, bukan jaminan absolut.

### Publik, branding, subdomain, dan onboarding
- `/harga` saat ini tidak memiliki konteks perusahaan. Pertahankan URL lama sebagai pricelist Sedyain; tambahkan rute publik bertenant berbasis slug untuk pilot. Tenant resolved di server, hanya field harga publik untuk tenant aktif/diizinkan; hindari akses anonim langsung seluruh pricelist aktif lintas tenant. Master tetap bisa membaca draft/inaktif milik tenant-nya.
- `/t/$token` lama tetap berlaku. Tenant diturunkan dari shipment bertoken unik, bukan pilihan browser; parent item dan branding harus tenant yang sama. Pertimbangkan pencabutan/masa berlaku link dan pembatasan percobaan. Link adalah izin pemegang token, bukan bukti identitas penerima.
- `tenant_settings`: logo, warna, alamat legal, bank, kontak, format nomor, ketentuan. Ambil dari tenant untuk auth/halaman/dokumen; simpan snapshot brand/legal pada dokumen terbit agar perubahan rekening tidak mengubah dokumen lama. Metadata publik ikut tenant.
- `tenant_domains`: hostname unik, tenant, status verifikasi. Mulai slug/path; pilot subdomain per tenant setelah DNS, HTTPS, redirect domain utama, dan callback login diuji. Wildcard dan otomatisasi provisioning **belum terkonfirmasi**, jangan dijanjikan. Hostname tidak menjadi otorisasi dan tidak boleh dipercaya tanpa pemetaan terverifikasi.
- Pilot: operator membuat tenant → verifikasi pemilik → undang Master → Master mengundang Staff dan memilih izin. Akun baru tanpa undangan tidak mendapat akses Sedyain. Pembentukan tenant + Master atomik; bukan aturan “Master pertama global”. Pendaftaran mandiri, trial dan billing menunggu keputusan bisnis.

## 4. Lima kandidat modul paling bernilai
Semua tabel baru memakai tenant_id dan izin modul; angka adalah estimasi setelah fondasi keamanan siap.

| Urutan / kandidat | Manfaat | Tabel / halaman usulan | Kesulitan / usaha |
|---|---|---|---|
| **1. Laporan & aging piutang-utang** | Finance melihat tagihan overdue, jatuh tempo, saldo dan rekap periode; prioritas penagihan | Gunakan payables/receivables/expenses/cash_requests; agregasi terlindungi; `/laporan`, filter periode/PIC/status, ekspor CSV sesuai izin. `payment_allocations` hanya bila pembayaran parsial disetujui | Sedang, 4–6 hari untuk status penuh; parsial tambahan 3–5 |
| 2. Penawaran / quotation | Marketing menyiapkan penawaran dari pricelist dan mengubahnya menjadi order tanpa input ulang | quotations, quotation_items; `/penawaran`, cetak, status dan konversi idempoten | Sedang–besar, 5–8 hari |
| 3. Reminder jatuh tempo | Mengurangi tagihan terlewat dan koordinasi manual | notification_preferences, notification_events, delivery_attempts; `/notifikasi`, jadwal/deduplikasi, email; WhatsApp opsional | Sedang, 4–7 hari; WhatsApp menambah biaya/izin penyedia |
| 4. Stok/inventori ringan | Mengetahui barang tersedia, masuk/keluar dan stok minimum | products, stock_locations, stock_movements; `/stok`, penerimaan/pengeluaran dan opname. Lot/expiry/konversi unit ditentukan dahulu | Besar–sangat besar, 10–15 hari; batch/expiry tambahan |
| 5. Pusat ekspor data | Rekonsiliasi dan pekerjaan eksternal memakai data terfilter | `/ekspor`, audit_logs; export_jobs bila volume besar, CSV/XLSX; bukan pengganti backup | Kecil–sedang, 2–4 hari |

**Rekomendasi pertama: laporan & aging piutang-utang.** Data dasarnya tersedia, manfaat langsung untuk arus kas, dan risikonya lebih rendah dibanding inventori. Jangan menganggap status “lunas” sebagai riwayat pembayaran atau laporan kas akuntansi. Ekspor sederhana masuk modul ini; pusat ekspor lintas modul dapat menyusul, bukan pekerjaan duplikat.

## 5. Temuan bug/UI/UX, berdasarkan prioritas
**P0 = risiko data/izin; P1 = ketepatan dan keandalan; P2 = kenyamanan/konsistensi.** Risiko di bawah dibuktikan oleh struktur kode/kebijakan, bukan klaim insiden telah terjadi.

### P0 — sebelum SaaS atau modul besar
1. **DELETE lintas modul:** kebijakan ALL clients/team_members/orders/order_items memakai USING yang mengizinkan modul pembaca lain. DELETE tidak memakai WITH CHECK, sehingga Staff Order berpotensi menghapus client, Staff Pengiriman menghapus order/item, dan beberapa modul menghapus anggota tim. GRANT DELETE aktif; cascade memperbesar dampak. Pisahkan kebijakan per operasi dan uji negatif. **2–3 hari.**
2. **Simpan order tidak atomik:** `orders.index.tsx:151–175` mengupdate order, menghapus item, lalu insert terpisah. Gagal insert dapat menyisakan order tanpa item; `openEdit:240` mengabaikan error baca item. Jadikan simpan satu transaksi database tervalidasi, jangan buka editor kosong setelah kegagalan baca. **2–3 hari.**
3. **Nomor invoice bisa bertabrakan:** `docs.ts:56–80`, `orders.index.tsx:126` menghitung max dari data browser; belum ada keunikan database. Saat ini **tidak ada duplikat**, tetapi dua user bisa mendapat nomor sama. Reservasi/generasi atomik, validasi edit manual, namespace urut per tenant; aturan reset disepakati. **1–2 hari.**

### P1 — hasil tidak menyesatkan dan perubahan terlacak
4. **Dashboard & Client vs izin:** Dashboard mengambil empat modul tanpa memeriksa akses (`index.tsx:54–76`); RLS dapat memberi data kosong dan UI menampilkan nol. `/client:45–58` berizin CRM tetapi membaca order/pengiriman yang mungkin tersembunyi. Tampilkan “tidak berizin” berbeda dari nol; tentukan hak ringkasan Client tanpa membuka harga. **1–2 hari.**
5. **Gagal baca terlihat kosong:** pola useQuery tanpa isError pada Client, Finance, harga publik dan dokumen; tracking menampilkan “tidak ditemukan” setelah error (`t.$token.tsx:52–100`). Dokumen tetap dapat dicetak sebelum data siap (`invoice:34–65`, `surat-jalan:43–80`). Tambah loading/error/retry/not-found; blokir cetak gagal/kosong. **2–3 hari.**
6. **Cache antarlayar tidak sinkron:** perubahan Finance/CRM/Task tidak menginvalidasi dashboard/Client; order baru menginvalidasi `shipments`, bukan `shipments-full`; perubahan harga tidak menginvalidasi `public-pricelist`. Rapikan dependensi, tenant-aware cache dan sinkronisasi perubahan izin. **1–2 hari.**
7. **Status/angka belum tervalidasi di database:** nominal, qty, harga dan status tanpa batas/domain terkait pada constraint aktif. `Number(...) || 0` dapat menyamarkan input tidak valid. Data saat audit tidak negatif/qty invalid. Validasi frontend + database dan aturan pembulatan yang disepakati. **1–2 hari.**
8. **Tracking bukan riwayat kejadian:** hanya status terkini; konfirmasi publik dapat dilakukan sebelum perjalanan, status internal bisa mundur tanpa membersihkan waktu terima (`shipments:70–77`, fungsi confirm). Usulkan shipment_events, aturan transisi, receipt terpisah dan koreksi tercatat; aturan baru perlu persetujuan. **2–4 hari.**
9. **KPI task selesai kurang akurat:** memakai updated_at, bukan completed_at (`index:86–89`); edit task lama yang Done dapat dihitung selesai baru. Tentukan minggu kalender vs 7 hari terakhir, tambah waktu selesai. **1 hari.**
10. **Sukses sebelum hasil:** harga menampilkan toast sebelum update selesai (`pricelist:187–192`), salin tracking tidak menunggu clipboard (`shipments:175–177`). Tampilkan sukses hanya setelah berhasil; fallback salin, draft harga + simpan/batal. **1 hari.**

### P2 — mobile, konsistensi, performa
11. **Target sentuh kecil:** Workflow `size-7` tanpa label aksi; pricelist input `h-8`, pengiriman selector `h-8 w-[110px]`. Panah pemindahan task sudah tersedia, jadi bukan kanban sepenuhnya tidak bisa dipakai HP. Besarkan kontrol/label, gunakan editor item bertumpuk di HP; preview dokumen nyaman tanpa mengubah format cetak. **2–3 hari.**
12. **Muat seluruh daftar:** Orders/Client/Dashboard mengambil seluruh tabel tanpa pagination; Client menggabungkan berdasarkan nama sehingga nama sama berpotensi tersatukan. Gunakan client_id, agregasi database, sort deterministik dan pagination. Tabel bersama sudah `overflow-auto`; jangan menganggap overflow-hidden CRM otomatis memutus scroll. **2–3 hari.**
13. **Auth & konsistensi:** pendaftaran publik tersedia, pesan tidak membedakan verifikasi email; belum ada pemulihan password di halaman. Review hosted settings dahulu. Kurangi warna/brand hardcoded pada auth/publik/dokumen, native confirm, tombol mentah; lengkapi metadata per halaman. **2–3 hari.**

Estimasi temuan tidak dijumlahkan langsung: beberapa berbagi perubahan yang sama. Uji visual Android/iOS dan cetak multi-halaman masih diperlukan; kecocokan template/T&C asli harus dibandingkan lampiran resmi, bukan diasumsikan dari kode.

## 6. Uji penerimaan sebelum lanjut
- Tes konkret per aturan: Master A/Staff A/tenant B/anon, baca-tulis-hapus lintas tenant/modul, pemalsuan tenant_id/relasi, pencabutan izin dan cache; fungsi admin/publik termasuk.
- Dua user membuat invoice bersamaan; kegagalan insert item tidak menghilangkan item lama; kirim berulang tidak menduplikasi pengiriman jika modelnya satu pengiriman/order.
- Rekonsiliasi jumlah/nominal/relasi, token dan dokumen lama sesudah migrasi; uji pemulihan dan operasional harian.
- HP 360–430 px dan desktop: drawer, tabel, dialog dengan keyboard terbuka, sentuhan, nama/email panjang, cetak A4 beberapa halaman, kondisi jaringan gagal.
- Tidak membuka tenant kedua sampai seluruh isolasi, jalur publik, rollback dan onboarding lulus.

## 7. Pertanyaan sebelum eksekusi
1. Setuju memulai **A lalu B**, atau ada urgensi lain?
2. Satu tenant berarti perusahaan supplier independen? Perlu banyak cabang/gudang atau satu akun mengakses banyak perusahaan?
3. Master boleh menghapus transaksi/direktori, atau perlu arsip dan persetujuan? Dashboard wajib tetap untuk semua; KPI apa yang boleh dilihat Staff?
4. Halaman Client bagi Staff CRM boleh menampilkan nomor invoice/DO tanpa akses Order/Pengiriman?
5. Nomor invoice berurut terus atau reset tahunan/bulanan? Format SDY diganti per tenant? Bagaimana duplikat/edit manual dan pembatalan?
6. Ada cicilan/pembayaran parsial, pajak, diskon, retur, multi-mata-uang? Periode laporan dan definisi “task selesai minggu ini”?
7. Satu order boleh beberapa pengiriman? Kapan konfirmasi penerimaan diizinkan, siapa boleh koreksi, berapa lama link publik berlaku?
8. Pilot siapa dan berapa perusahaan? Undangan saja atau pendaftaran mandiri; domain utama, subdomain/custom domain, dan batas branding?
9. Reminder untuk siapa, lewat aplikasi/email/WhatsApp, kapan, zona waktu apa, dan anggaran layanan?
10. Untuk stok: kg/pcs, konversi unit, batch/expiry, multi-gudang, stok negatif, dan prioritas dibanding quotation?
11. Tersedia template invoice/surat-jalan resmi terbaru serta ketentuan verbatim untuk validasi? Siapa menyetujui data legal/rekening?
12. Siapa menyetujui hasil uji, akses bantuan operator platform, masa simpan data, jadwal rollout dan prosedur pemulihan?
