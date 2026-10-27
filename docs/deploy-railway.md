# Deploy Sedyain Hub ke Railway

Satu service web Railway menjalankan server produksi TanStack Start/Nitro. Data tetap di Supabase yang sudah ada. Tidak ada database Railway, worker, atau service frontend terpisah.

Dokumen ini mengikuti kode di repository ini, bukan template TanStack yang lebih baru. Per 24 Oktober 2026, Config as Code (`railway.toml` / `railway.json`) tidak dipakai untuk service baru. Repository ini tidak menyertakan file itu. Pengaturan service diisi di dashboard Railway.

## Arsitektur

```text
Browser  --HTTPS-->  Railway public domain
                         |
                         | PORT, 0.0.0.0
                         v
                    node .output/server/index.mjs
                    (aset, halaman, server function, GET /api/health)
                         |
                         | publishable key + RLS, atau service role hanya untuk operasi admin server
                         v
                    Supabase Auth + PostgREST + RPC PostgreSQL
```

Area login memakai sesi Supabase di `localStorage` dan `ssr: false`. Server function tetap dilindungi CSRF. Izin Master/Staff tetap diputuskan database.

## Prasyarat

| Item | Nilai di repository |
| --- | --- |
| Package manager | Bun 1.4.2 (`.bun-version`, `packageManager`) |
| Node di Railway | 22 (`.node-version`). Mesin lokal boleh Node 22 atau 23 di bawah 24 |
| Lockfile | `bun.lock` saja. Jangan menambah `package-lock.json` |
| Root directory | root repository |
| Builder | Railpack |
| Install dan build | `bun install --frozen-lockfile && bun run build` |
| Start | `bun run start`, yaitu `node scripts/start-server.mjs`, yang menjalankan `node .output/server/index.mjs` |
| Health check | `GET /api/health`, timeout 60 detik |
| Branch | branch yang memang akan dilayani, biasanya `main` |

Perintah itu sudah dijalankan secara lokal. Deployment Railway sendiri belum dijalankan dari repository ini.

## Variabel

Isi variabel di service **sebelum** build pertama. Jangan menempel nilai asli ke Git, log, atau chat.

| Variabel | Jenis | Kapan dibaca | Wajib | Cara memperoleh |
| --- | --- | --- | --- | --- |
| `VITE_SUPABASE_URL` | Public | Build browser | Ya | Supabase → Project Settings → API → Project URL |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | Public | Build browser | Ya | Kunci publishable/anon di halaman API yang sama. Bukan service role |
| `SUPABASE_URL` | Secret runtime, nilainya sama dengan URL publik | Runtime server | Ya | URL project yang sama dengan `VITE_SUPABASE_URL` |
| `SUPABASE_PUBLISHABLE_KEY` | Secret runtime, nilainya kunci publishable | Runtime server | Ya | Kunci yang sama dengan `VITE_SUPABASE_PUBLISHABLE_KEY` |
| `SUPABASE_SERVICE_ROLE_KEY` | Secret | Runtime, hanya saat kode admin server membuat klien | Ya untuk operasi admin | Supabase → API → service role / secret key. Jangan beri awalan `VITE_` |
| `APP_URL` | Public runtime | CSRF di belakang proxy | Tidak, kecuali domain kustom | Origin https tanpa path dan tanpa password, misalnya `https://hub.example.com` |
| `DATABASE_URL` | Secret | Migrasi Drizzle manual | Tidak untuk service web | Connection string direct atau session pooler. Bukan transaction pooler |
| `PORT` | Runtime | Railway mengisi sendiri | Jangan diatur manual | Dibiarkan. Server memakainya |
| `NODE_ENV` | Runtime | Railway mengisi `production` | Jangan diatur ke `development` | Dibiarkan |

`RAILWAY_PUBLIC_DOMAIN` diisi Railway setelah domain publik dibuat. Jangan membuat variabel itu sendiri. CSRF menerima origin `https://` + domain itu, ditambah `APP_URL` bila diisi. Header `X-Forwarded-Host` dari klien tidak dijadikan daftar origin.

Perubahan `VITE_*` membutuhkan **rebuild**. Restart container tidak mengubah nilai yang sudah masuk bundel browser. `SUPABASE_SERVICE_ROLE_KEY` dan `DATABASE_URL` tidak boleh masuk variabel `VITE_*`.

Build menolak kombinasi URL atau publishable key yang tidak sama, dan menolak publishable key berawalan `sb_secret_`. Pesan error hanya menyebut nama variabel.

## Membuat service

1. Buat project Railway kosong. Jangan menambahkan database.
2. New → GitHub Repo → pilih repository ini. Root directory kosong (root repo).
3. Builder: Railpack. Jangan memilih Dockerfile; repository ini tidak punya Dockerfile.
4. Settings → Build → Custom Build Command:

   ```sh
   bun install --frozen-lockfile && bun run build
   ```

5. Settings → Deploy → Custom Start Command:

   ```sh
   bun run start
   ```

   Jangan memakai `vite dev`, `vite preview`, atau server statis.
6. Settings → Deploy → Healthcheck Path: `/api/health`. Healthcheck Timeout: `60`.
7. Variables: isi tabel di atas. `VITE_*` harus ada sebelum build. Tandai service role dan connection string sebagai secret (Railway tetap menyediakan secret ke proses; yang penting nilainya tidak masuk Git).
8. Deploy. Build sukses belum membuka jaringan publik.
9. Settings → Networking → Generate Domain. Railway mengarahkan domain itu ke `PORT` yang didengar proses. Tidak perlu target port 8080.
10. Buka `https://<domain-railway>/api/health`. Harus `200` dan `{"status":"ok"}` tanpa redirect.

Health check Railway hanya berjalan saat deployment baru, bukan monitoring uptime setelah trafik dipindah. Host pemeriksaan adalah `healthcheck.railway.app`. Endpoint ini tidak memfilter host itu.

## Supabase Auth

Aplikasi memakai email dan kata sandi. Pendaftaran hanya lewat undangan tenant (`/auth?invite=...`), lalu `signUp` mengirim konfirmasi kembali ke origin yang sama. Tidak ada OAuth dan tidak ada callback `/auth/callback`.

Di Supabase → Authentication → URL Configuration untuk project yang dipakai service ini:

- Site URL: `https://<domain-publik>`
- Redirect URLs: `https://<domain-publik>/auth**`

`/auth**` mencakup `/auth` dan query `invite`. Jangan memakai `*` untuk semua origin. Tambahkan domain staging hanya di project staging, atau sebagai baris kedua yang spesifik jika satu project memang dipakai bersama.

Undangan di menu Team adalah undangan tenant aplikasi (`create_tenant_invitation`), bukan undangan email Supabase Auth. Tautan undangan dan tautan lacak pengiriman dibentuk di browser dari `window.location.origin`, jadi keduanya mengikuti domain yang sedang dibuka. Tidak ada domain yang di-hardcode.

Sesi `localStorage` di domain lama tidak ikut pindah. Pengguna masuk lagi di domain baru. Tautan undangan atau tracking yang sudah terkirim dengan domain lama tetap mengarah ke domain lama sampai diterbitkan ulang, atau sampai domain lama di-redirect secara terpisah. Mengganti env tidak menulis ulang tautan yang sudah dibagikan.

## Pemeriksaan setelah domain aktif

- Log deploy menampilkan proses mendengarkan port Railway, tanpa mencetak kunci atau connection string.
- `/api/health` langsung `200`, tidak ke `/auth`.
- `/auth` tampil, CSS dan JS tidak 404.
- `/orders` dan `/finance` tidak 404. Tanpa sesi, aplikasi mengarah ke `/auth` di browser (`ssr: false`, bukan redirect HTTP dari server).
- `/harga` hanya memuat pricelist publik. `/t/<token>` yang tidak valid tidak menampilkan pengiriman lain.
- Login, logout, dan refresh sesi. Ganti tenant tidak meninggalkan data tenant sebelumnya.
- Server function dengan token sah tetap jalan. Permintaan server function lintas origin tetap `403`.

Jangan membuat invoice, pembayaran, atau undangan di data production hanya untuk smoke test. Gunakan project atau tenant staging bila uji tulis diperlukan.

## Domain kustom

Setelah domain Railway lulus uji:

1. Settings → Networking → Custom Domain, lalu pasang record DNS yang ditampilkan Railway.
2. Set `APP_URL=https://<domain-kustom>` dan redeploy agar CSRF menerima origin itu.
3. Tambahkan `https://<domain-kustom>/auth**` di Redirect URLs dan jadikan Site URL bila itu origin utama.
4. Uji lagi `/api/health`, login, dan satu tautan undangan yang baru dibuat di domain kustom.

## Staging dan production

Buat service Railway kedua dari repo yang sama, idealnya dengan Supabase project terpisah. Preview atau branch staging tidak boleh memakai `SUPABASE_URL` production. Variabel `VITE_*` dan `SUPABASE_*` pada satu service harus satu project. Jangan menjalankan migrasi dari service preview ke database production.

## Migrasi

Tidak ada migrasi untuk memindahkan hosting web ini. Startup tidak membaca `DATABASE_URL` dan tidak menjalankan Drizzle atau SQL.

Ada dua pohon migrasi yang sudah ada: `supabase/migrations` dan `drizzle/migrations`. Keduanya berisi fungsi RPC, RLS, dan trigger yang dipakai aplikasi. Jangan menjalankan keduanya untuk perubahan yang sama, dan jangan memakai `drizzle-kit push` atau reset. Bila nanti ada perubahan skema, buat migrasi additive, cadangkan database, jalankan manual di staging dengan koneksi direct atau session pooler, lalu production. Jangan memasang perintah itu sebagai pre-deploy atau start.

## Rollback

Railway → Deployments → deployment sebelumnya → Rollback. Itu mengembalikan artefak aplikasi dan variabel yang menempel pada deployment tersebut.

Rollback aplikasi tidak membalik migrasi database. Perubahan variabel yang dibuat setelah deployment lama juga perlu dicek terpisah. Sesi pengguna di domain yang sama tetap ada; sesi domain lain tidak ikut.

## Troubleshooting

| Gejala | Penyebab yang cocok dengan setup ini |
| --- | --- |
| Railway menganggap situs statis, atau 502 dengan `dist/server/server.js` tidak ada | Start command bukan `bun run start`. Nitro menulis `.output/server/index.mjs`, bukan layout `dist/` tanpa Nitro |
| 502, health check service unavailable | Proses tidak mendengarkan `PORT`, atau hanya IPv6. `bun run start` mengikat `0.0.0.0` dan `PORT`. Jangan set `PORT` ke 8080 |
| Build gagal `Missing browser build environment variable(s)` | `VITE_SUPABASE_URL` atau `VITE_SUPABASE_PUBLISHABLE_KEY` belum ada saat build |
| Browser masih memakai project Supabase lama | `VITE_*` lama masih di dalam bundel. Rebuild, jangan hanya restart |
| Login sukses lalu kembali ke `/auth`, atau konfirmasi email ditolak | Site URL / Redirect URLs belum memuat `https://<domain>/auth**` |
| Server function `403` hanya di domain publik | Origin proxy tidak sama dengan origin browser. Isi `APP_URL` untuk domain kustom. Jangan mematikan CSRF |
| Deep link `/orders` 404 | Start command salah atau domain belum ke service ini. Shell aplikasi harus tetap dilayani server yang sama |
| Health check gagal karena redirect ke `/auth` | Path health check harus `/api/health`, bukan `/` |
| `Missing server runtime environment variable(s): SUPABASE_URL` | Variabel runtime belum diisi. Ini terpisah dari `VITE_*` |
| Migrasi gagal atau data hilang | Jangan menjalankan migrasi dari deploy web. Bila tetap perlu, pakai direct/session pooler dan TLS bawaan, bukan transaction pooler dan bukan `sslmode=disable` |
