import { useEffect, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { ChevronDown, Send } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAccess } from "@/hooks/use-access";
import { useTenantQuery } from "@/hooks/use-tenant-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";

const touch = "min-h-11";
type Settings = { jam_batas: string | null; kurir_chat_id: number | null; bot_username: string | null };
const msg = (e: unknown) => {
  const m = e instanceof Error ? e.message : String((e as { message?: string })?.message ?? "");
  if (/Tidak berizin|Hanya Master|tidak valid/.test(m)) return m;
  return "Aksi gagal. Silakan coba lagi.";
};

export function TelegramPanel() {
  const { isMaster } = useAccess();
  const qc = useQueryClient();
  const [open, setOpen] = useState<boolean | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [form, setForm] = useState({ jam: "15:00", kurir: "", bot: "" });

  const status = useTenantQuery({
    queryKey: ["telegram", "status"], throwOnError: false,
    queryFn: async () => { const { data, error } = await supabase.rpc("get_my_telegram_status"); if (error) throw error; return data as { terhubung: boolean }; },
  });
  const settings = useTenantQuery({
    queryKey: ["telegram", "settings"], throwOnError: false,
    queryFn: async () => { const { data, error } = await supabase.rpc("get_belanja_settings"); if (error) throw error; return (data ?? {}) as Settings; },
  });
  const connected = status.data?.terhubung === true;
  const expanded = open ?? !connected;

  useEffect(() => {
    const s = settings.data; if (!s) return;
    setForm({ jam: (s.jam_batas ?? "15:00").slice(0, 5), kurir: s.kurir_chat_id == null ? "" : String(s.kurir_chat_id), bot: s.bot_username ?? "" });
  }, [settings.data]);

  const link = useMutation({
    mutationFn: async () => { const { data, error } = await supabase.rpc("create_telegram_link_token"); if (error) throw error; return data as string; },
    onSuccess: setToken, onError: (e) => toast.error(msg(e)),
  });
  const disconnect = useMutation({
    mutationFn: async () => { const { error } = await supabase.rpc("disconnect_telegram"); if (error) throw error; },
    onSuccess: () => { setToken(null); toast.success("Telegram diputuskan"); qc.invalidateQueries({ predicate: (q) => q.queryKey.includes("telegram") }); },
    onError: (e) => toast.error(msg(e)),
  });
  const save = useMutation({
    mutationFn: async () => {
      const bot = form.bot.trim().replace(/^@/, "");
      if (bot && !/^[A-Za-z0-9_]{5,32}$/.test(bot)) throw new Error("Username bot tidak valid (5–32 huruf, angka, atau _)");
      const k = form.kurir.trim();
      if (k && !/^-?\d+$/.test(k)) throw new Error("Chat ID grup kurir tidak valid");
      const { error } = await supabase.rpc("set_belanja_settings", { p_jam_batas: form.jam || "15:00", p_kurir_chat_id: k ? Number(k) : (null as unknown as number), p_bot_username: bot || (null as unknown as string) });
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Pengaturan belanja disimpan"); qc.invalidateQueries({ predicate: (q) => q.queryKey.includes("telegram") }); },
    onError: (e) => toast.error(msg(e)),
  });

  const bot = settings.data?.bot_username;
  const url = token && bot ? `https://t.me/${bot}?start=${token}` : null;

  return (
    <div className="mb-4 rounded-lg border bg-card">
      <button type="button" className={`flex w-full items-center justify-between gap-2 px-4 ${touch}`} onClick={() => setOpen(!expanded)} aria-expanded={expanded}>
        <span className="flex items-center gap-2 font-medium"><Send className="size-4" /> Telegram</span>
        <span className="flex items-center gap-2">
          {status.isError ? <Badge variant="outline">Status tidak dapat dimuat</Badge> : status.isLoading ? null : <Badge variant={connected ? "default" : "secondary"}>{connected ? "Terhubung" : "Belum terhubung"}</Badge>}
          <ChevronDown className={`size-4 transition-transform ${expanded ? "rotate-180" : ""}`} />
        </span>
      </button>
      {expanded && <div className="space-y-4 border-t p-4">
        {status.isError && <p className="text-sm text-destructive">Status Telegram gagal dimuat. <Button variant="link" className="h-auto p-0" onClick={() => status.refetch()}>Coba lagi</Button></p>}
        <div className="flex flex-col gap-2 sm:flex-row">
          <Button className={touch} onClick={() => link.mutate()} disabled={link.isPending}>{connected ? "Hubungkan ulang" : "Hubungkan Telegram"}</Button>
          {connected && <Button variant="outline" className={touch} disabled={disconnect.isPending} onClick={() => { if (window.confirm("Putuskan Telegram dari akun ini?")) disconnect.mutate(); }}>Putuskan</Button>}
        </div>
        {token && <div className="space-y-2 rounded-md bg-muted p-3 text-sm">
          {url ? <div className="flex flex-col gap-2 sm:flex-row">
            <Button asChild className={touch}><a href={url} target="_blank" rel="noreferrer">Buka Telegram</a></Button>
            <Button variant="outline" className={touch} onClick={() => navigator.clipboard.writeText(url).then(() => toast.success("Tautan disalin"), () => toast.error("Gagal menyalin"))}>Salin tautan</Button>
          </div> : <>
            <p>Master belum mengisi username bot. Kirim pesan berikut ke bot Telegram bisnis:</p>
            <code className="block break-all rounded bg-background p-2">/start {token}</code>
          </>}
          <p className="text-muted-foreground">Berlaku 15 menit, sekali pakai.</p>
        </div>}
        {isMaster && <form className="space-y-3 border-t pt-4" onSubmit={(e) => { e.preventDefault(); save.mutate(); }}>
          <h3 className="font-medium">Pengaturan Belanja</h3>
          {settings.isError && <p className="text-sm text-destructive">Pengaturan gagal dimuat.</p>}
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <div className="space-y-1"><Label htmlFor="tg-jam">Jam batas pengingat</Label><Input id="tg-jam" type="time" className={touch} value={form.jam} onChange={(e) => setForm({ ...form, jam: e.target.value })} /></div>
            <div className="space-y-1"><Label htmlFor="tg-kurir">Chat ID grup kurir</Label><Input id="tg-kurir" inputMode="numeric" placeholder="Kosong = tanpa grup" className={touch} value={form.kurir} onChange={(e) => setForm({ ...form, kurir: e.target.value })} /></div>
            <div className="space-y-1"><Label htmlFor="tg-bot">Username bot (tanpa @)</Label><Input id="tg-bot" maxLength={33} className={touch} value={form.bot} onChange={(e) => setForm({ ...form, bot: e.target.value })} /></div>
          </div>
          <Button type="submit" className={touch} disabled={save.isPending || settings.isLoading}>Simpan pengaturan</Button>
        </form>}
      </div>}
    </div>
  );
}
