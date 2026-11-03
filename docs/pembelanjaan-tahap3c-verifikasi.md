# Pembelanjaan Tahap 3c-1 — Verifikasi (migrasi 0026_telegram_bridge)
1. Semua 7 fungsi bridge_*: anon/authenticated tidak bisa execute, service_role bisa — PASS.
2. Token: link berhasil; pakai ulang, kedaluwarsa, chat_id milik user lain ditolak — PASS.
3. bridge_set_item_status: PIC berhasil (audit sumber 'telegram'); bukan PIC & chat_id tak dikenal → ok=false — PASS.
4. bridge_list_notifikasi_pic memuat PIC ber-chat_id; setelah mark, daftar hilang — PASS.
5. Ringkasan kurir kosong selama ada item belum_dibeli; muncul setelah selesai; mark → 'selesai'; ulang idempoten — PASS.
6. authenticated tidak punya hak UPDATE profiles; trigger menolak ubah telegram_chat_id oleh anon/authenticated — PASS.
7. Staff tidak bisa set_belanja_settings — PASS.
Semua uji dalam satu transaksi yang di-ROLLBACK; tidak ada data uji tersisa.
Belum teruji: bridge_list_pengingat (isi), get_belanja_settings/get_my_telegram_status/disconnect_telegram, lintas tenant via bridge.
Belum ada: Edge Function, UI, Telegram/n8n nyata (Tahap 3c-2).
