# Klien/outlet — Tahap 1b

25 Okt 2026. Perubahan hanya `save_sales_document` (orders) dan RPC baca `list_order_clients`; tabel, RLS, dialog, penomoran, quotation_items dan sales_totals tidak diubah.

Uji melalui alat database: BEGIN, JWT sintetis, SET LOCAL ROLE authenticated, DO + RAISE EXCEPTION RESULT, rollback. Exception RESULT disengaja agar seluruh fixture dibatalkan. Skrip: `docs/klien-outlet-tahap1b-tests.sql`.

| Pemeriksaan | Hasil |
|---|---|
| PO wajib: kosong/spasi ditolak, PO valid diterima | PASS |
| Tanpa client_id: tanpa PO diterima | PASS |
| Dua outlet: snapshot nama DB, bukan nama palsu; Kitchen/Bar/Others/Bakery rank 1/2/3/4 | PASS |
| Outlet client lain ditolak | PASS |
| Outlet nonaktif: item baru ditolak, item lama boleh; snapshot tetap setelah nama berubah | PASS |
| Section 41 karakter dan rank 0 ditolak | PASS setelah pengulangan dengan ekspresi fixture dikoreksi |
| Section spasi / item tanpa metadata menjadi NULL | PASS |
| Staff orders tanpa CRM: RPC berhasil, clients langsung tidak terbaca, hanya 6 kolom dan 3 atribut outlet aktif | PASS |
| Staff tanpa modul ditolak; tenant B tidak melihat/memakai client A | PASS |
| Anon tidak mempunyai EXECUTE list_order_clients | PASS |
| next_sales_number nama sama dengan/tanpa client_id, counter awal sama | PASS (owner + JWT Master; bukan tes RLS, authenticated tidak punya EXECUTE fungsi internal) |
| Hash JSONB data legacy sebelum/sesudah pengujian | PASS |
| Tidak ada tenant/fixture zz-outlet tersisa | PASS |
| Build otomatis | PASS — 0 error |
| tsgo terpisah | Tidak teruji; pemeriksaan manual tidak dijalankan sesuai aturan lingkungan |

**Hash referensi pengguna:** persamaan dengan `75a04fe6dc0954ddbf709991e1cb0c1a` / `bca4e42f8f3cf4efef66d4d8148cba2f` **belum dapat diverifikasi** karena ekspresi serialisasi pembentuk MD5 tidak diberikan. Dengan ekspresi `md5(jsonb_agg(t ORDER BY id)::text)` pada kolom yang diminta, hasil order=`9f43a81283a13923f478f79ae48e6204`, item aktif=`b96cc43c83015fdc4e5ff0bc7bb0d338`; identik sebelum/sesudah pengujian, tetapi berbeda dari referensi pengguna. Perbedaan ini bukan bukti data berubah. Semua uji dibatalkan; tidak publish, tidak browser/screenshot.