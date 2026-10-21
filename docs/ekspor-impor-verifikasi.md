# Verifikasi Ekspor & Impor CSV Pricelist

Tanggal: 21 Okt 2026. Migrasi: perbaikan fungsi impor (variabel skalar pengganti `ex record`, cast `is_active` aman).

## Uji parser (luring)
`bun src/lib/csv.test.ts` → PASS: BOM, pemisah `;`/`,`, format angka Indonesia, proteksi formula, kolom wajib, baris error.

## Uji SQL (BEGIN/ROLLBACK, JWT sintetis, semua dibatalkan — tidak ada data berubah)

| Uji | Hasil |
|---|---|
| T1 anon tidak punya hak execute fungsi | LULUS (true) |
| T2 dry-run melaporkan 1 baris baru tanpa menulis | LULUS (baru=1, 0 baris tertulis) |
| T3 commit dengan 1 baris invalid dibatalkan penuh | LULUS ("Impor dibatalkan: 1 baris error", 0 baris 'ZZ Atomik' tersisa) |
| T4 pencocokan nama+satuan tidak peka huruf (`zz case test`/`KG` memperbarui `ZZ Case Test`/`kg`) | LULUS (diperbarui=1, harga 5000→6000) |
| T4 item di luar file tidak berubah | LULUS (`ZZ Untouched` tetap 777) |
| T5 nama+satuan ganda di file → error per baris | LULUS ("Nama + satuan ganda di file") |
| T6 `is_active` bukan true/false → error per baris, tidak melempar | LULUS ("Nilai aktif tidak valid") |
| T7 staff tanpa modul pricelist ditolak | LULUS ("Tidak berizin mengimpor pricelist") |

Catatan: `SET LOCAL ROLE authenticated` tidak bisa dipakai dari psql sandbox, jadi uji memakai JWT sintetis via `set_config('request.jwt.claims', …)`; seluruh blok diakhiri exception sehingga otomatis rollback.

## Build & tipe
`tsgo --noEmit` bersih; perbaikan minimal di `src/lib/csv.test.ts` (ganti `bun:test` dengan `node:assert` mengikuti pola `sales.test.ts`) dan `src/lib/pricelist-csv.ts` (penjagaan undefined).

## Belum teruji (perlu cek manual)
- Membuka hasil ekspor di Excel locale Indonesia (pemisah `;`, BOM).
- Uji browser/HP: dialog impor, tombol ekspor, tampilan ringkasan di layar kecil.
