import { useMemo, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { AlertTriangle, ArrowLeft, Plus } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useTenant } from "@/components/tenant-provider";
import { useAccess } from "@/hooks/use-access";
import { useTenantQuery } from "@/hooks/use-tenant-query";
import { QueryState } from "@/components/query-state";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";

const touch = "min-h-11";
const STATUS: Record<string, string> = { draft: "Draft", terkirim: "Terkirim", selesai: "Selesai" };
const fmtDate = (d: string) => new Intl.DateTimeFormat("id-ID", { day: "2-digit", month: "short", year: "numeric", timeZone: "Asia/Jakarta" }).format(new Date(`${d}T00:00:00+07:00`));
function tomorrow() {
  const now = new Date(Date.now() + 7 * 3600_000 + 86400_000);
  return now.toISOString().slice(0, 10);
}
function friendly(e: unknown) {
  const err = e as { code?: string; message?: string };
  const m = err?.message ?? "";
  if (err?.code === "42501") return m && /[a-z]/.test(m) && !m.includes("permission") ? m : "Tidak berizin melakukan aksi ini.";
  if (m && !/violates|syntax|column|relation|function/.test(m)) return m;
  return "Aksi gagal. Silakan coba lagi.";
}

type Item = { id: string; item_name: string; qty: number; unit: string | null; vendor_id: string | null; customer_nama: string | null; outlet_nama: string | null; section_nama: string | null; status_item: string; qty_dibeli: number | null };

export function DaftarBelanjaTab() {
  const { tenantId } = useTenant();
  const { isMaster } = useAccess();
  const [openId, setOpenId] = useState<string | null>(null);
  const [create, setCreate] = useState(false);
  const lists = useTenantQuery({
    queryKey: ["pembelanjaan", "daftar"], throwOnError: false,
    queryFn: async () => {
      const { data, error } = await supabase.from("daftar_belanja").select("id,tanggal_kirim,status, daftar_belanja_item(status_item,deleted_at)")
        .eq("tenant_id", tenantId!).is("deleted_at", null).order("tanggal_kirim", { ascending: false });
      if (error) throw error; return data;
    },
  });
  if (openId) return <Detail id={openId} back={() => setOpenId(null)} />;
  return <div className="space-y-3">
    {isMaster && <Button className={touch} onClick={() => setCreate(true)}><Plus /> Buat daftar</Button>}
    <QueryState loading={lists.isLoading} error={lists.isError} retry={() => lists.refetch()} />
    {lists.data && lists.data.length === 0 && <p className="py-6 text-sm text-muted-foreground">Belum ada daftar belanja.{isMaster ? " Buat daftar dari order yang akan dikirim." : ""}</p>}
    <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
      {lists.data?.map((d) => {
        const items = (d.daftar_belanja_item ?? []).filter((i) => !i.deleted_at);
        const done = items.filter((i) => i.status_item !== "belum_dibeli").length;
        return <button key={d.id} onClick={() => setOpenId(d.id)} className="min-h-11 rounded-lg border bg-card p-3 text-left hover:bg-muted">
          <div className="flex items-center justify-between gap-2"><span className="font-medium">{fmtDate(d.tanggal_kirim)}</span><Badge variant={d.status === "draft" ? "outline" : d.status === "selesai" ? "secondary" : "default"}>{STATUS[d.status] ?? d.status}</Badge></div>
          <p className="mt-1 text-sm text-muted-foreground">{done} dari {items.length} item selesai</p>
        </button>;
      })}
    </div>
    {create && <CreateDialog onClose={() => setCreate(false)} onCreated={(id) => { setCreate(false); setOpenId(id); }} />}
  </div>;
}

function CreateDialog({ onClose, onCreated }: { onClose: () => void; onCreated: (id: string) => void }) {
  const qc = useQueryClient();
  const { tenantId } = useTenant();
  const [tanggal, setTanggal] = useState(tomorrow());
  const [sel, setSel] = useState<string[]>([]);
  const orders = useTenantQuery({
    queryKey: ["pembelanjaan", "order-belanja", tanggal], throwOnError: false,
    queryFn: async () => { const { data, error } = await supabase.rpc("list_order_untuk_belanja", { p_tanggal: tanggal }); if (error) throw error; return data ?? []; },
  });
  const gen = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.rpc("generate_daftar_belanja", { p_tanggal_kirim: tanggal, p_order_ids: sel });
      if (error) throw error; return data as { daftar_id: string; ditambah: number; dilewati: number; tanpa_vendor: number };
    },
    onSuccess: (r) => {
      toast.success(`${r.ditambah} item ditambah, ${r.dilewati} dilewati, ${r.tanpa_vendor} tanpa vendor`);
      qc.invalidateQueries({ queryKey: [tenantId, "pembelanjaan"] });
      onCreated(r.daftar_id);
    },
    onError: (e) => toast.error(friendly(e)),
  });
  return <Dialog open onOpenChange={(o) => !o && onClose()}>
    <DialogContent className="max-h-[90vh] overflow-y-auto">
      <DialogHeader><DialogTitle>Buat daftar belanja</DialogTitle><DialogDescription>Pilih order yang akan dibelanjakan.</DialogDescription></DialogHeader>
      <div className="space-y-2"><Label htmlFor="tgl">Tanggal kirim</Label><Input id="tgl" type="date" className={touch} value={tanggal} onChange={(e) => { setTanggal(e.target.value); setSel([]); }} /></div>
      <QueryState loading={orders.isLoading} error={orders.isError} retry={() => orders.refetch()} />
      {orders.data?.length === 0 && <p className="text-sm text-muted-foreground">Tidak ada order untuk tanggal ini.</p>}
      <div className="space-y-1">
        {orders.data?.map((o) => <label key={o.id} className={`flex min-h-11 items-center gap-3 rounded border px-3 py-2 ${o.sudah_ada_di_daftar ? "opacity-50" : "cursor-pointer"}`}>
          <Checkbox disabled={o.sudah_ada_di_daftar} checked={sel.includes(o.id)} onCheckedChange={(c) => setSel((s) => c ? [...s, o.id] : s.filter((x) => x !== o.id))} />
          <span className="min-w-0 flex-1 text-sm"><span className="block break-words font-medium">{o.order_number ?? "Tanpa nomor"} · {o.client_name}</span>
            <span className="text-muted-foreground">{o.jumlah_item} item{o.sudah_ada_di_daftar ? " · sudah masuk daftar" : ""}</span></span>
        </label>)}
      </div>
      <DialogFooter><Button variant="outline" className={touch} onClick={onClose}>Batal</Button><Button className={touch} disabled={!sel.length || gen.isPending} onClick={() => gen.mutate()}>Buat</Button></DialogFooter>
    </DialogContent>
  </Dialog>;
}

function chip(i: Item) {
  const map: Record<string, [string, string]> = {
    belum_dibeli: ["Belum dibeli", "bg-muted text-muted-foreground"], ada: ["Ada", "bg-primary/15 text-primary"],
    sebagian: [`Sebagian ${i.qty_dibeli ?? 0}/${i.qty}`, "bg-accent/30 text-accent-foreground"], kosong: ["Kosong", "bg-destructive/15 text-destructive"],
  };
  const [t, c] = map[i.status_item] ?? [i.status_item, "bg-muted"];
  return <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${c}`}>{t}</span>;
}

function Detail({ id, back }: { id: string; back: () => void }) {
  const { tenantId } = useTenant();
  const { isMaster } = useAccess();
  const qc = useQueryClient();
  const [partial, setPartial] = useState<Item | null>(null);
  const [qtyText, setQtyText] = useState("");
  const [confirmKirim, setConfirmKirim] = useState(false);
  const me = useTenantQuery({ queryKey: ["me"], throwOnError: false, queryFn: async () => (await supabase.auth.getUser()).data.user?.id ?? null });
  const head = useTenantQuery({
    queryKey: ["pembelanjaan", "daftar", id], throwOnError: false,
    queryFn: async () => { const { data, error } = await supabase.from("daftar_belanja").select("id,tanggal_kirim,status").eq("tenant_id", tenantId!).eq("id", id).is("deleted_at", null).single(); if (error) throw error; return data; },
  });
  const items = useTenantQuery({
    queryKey: ["pembelanjaan", "daftar-item", id], throwOnError: false,
    queryFn: async () => { const { data, error } = await supabase.from("daftar_belanja_item").select("id,item_name,qty,unit,vendor_id,customer_nama,outlet_nama,section_nama,status_item,qty_dibeli").eq("tenant_id", tenantId!).eq("daftar_id", id).is("deleted_at", null).order("item_name"); if (error) throw error; return data as Item[]; },
  });
  const vendors = useTenantQuery({
    queryKey: ["pembelanjaan", "vendors"], throwOnError: false,
    queryFn: async () => { const { data, error } = await supabase.from("vendors").select("*").eq("tenant_id", tenantId!).is("deleted_at", null).order("nama"); if (error) throw error; return data; },
  });
  const pics = useTenantQuery({
    queryKey: ["pembelanjaan", "pics"], throwOnError: false,
    queryFn: async () => { const { data, error } = await supabase.rpc("list_vendor_pics"); if (error) throw error; return data ?? []; },
  });
  const refresh = () => qc.invalidateQueries({ queryKey: [tenantId, "pembelanjaan"] });
  const run = useMutation({
    mutationFn: async (fn: () => PromiseLike<{ data: unknown; error: unknown }>) => {
      const { data, error } = await fn(); if (error) throw error;
      const r = data as { ok?: boolean; message?: string } | null;
      if (r && r.ok === false) throw new Error(r.message ?? "Aksi ditolak.");
      return r;
    },
    onSuccess: (r) => { if (r?.message) toast.success(r.message); refresh(); },
    onError: (e) => { toast.error(friendly(e)); refresh(); },
  });
  const groups = useMemo(() => {
    const m = new Map<string, Item[]>();
    for (const i of items.data ?? []) { const k = i.vendor_id ?? ""; m.set(k, [...(m.get(k) ?? []), i]); }
    const name = (k: string) => vendors.data?.find((v) => v.id === k)?.nama ?? "Vendor";
    return [...m.entries()].sort(([a], [b]) => (a === "" ? -1 : b === "" ? 1 : name(a).localeCompare(name(b)))).map(([k, list]) => ({ k, name: k ? name(k) : "Tanpa vendor", list }));
  }, [items.data, vendors.data]);
  if (head.isLoading || items.isLoading || head.isError || items.isError || !head.data) return <div><Button variant="ghost" className={touch} onClick={back}><ArrowLeft /> Kembali</Button><QueryState loading={head.isLoading || items.isLoading} error={head.isError || items.isError || (!head.isLoading && !head.data)} retry={() => { head.refetch(); items.refetch(); }} /></div>;
  const d = head.data;
  const all = items.data ?? [];
  const done = all.filter((i) => i.status_item !== "belum_dibeli").length;
  const tanpaVendor = all.filter((i) => !i.vendor_id).length;
  const belum = all.length - done;
  const canAct = (i: Item) => d.status !== "selesai" && (isMaster || (d.status === "terkirim" && !!i.vendor_id && (pics.data ?? []).some((p) => p.vendor_id === i.vendor_id && p.user_id === me.data)));
  const status = (i: Item, s: string, q: number | null = null) => run.mutate(() => supabase.rpc("set_item_status", q === null ? { p_item_id: i.id, p_status: s, p_sumber: "app" } : { p_item_id: i.id, p_status: s, p_qty_dibeli: q, p_sumber: "app" }));
  const qtyNum = Number(qtyText.replace(",", "."));
  const qtyValid = partial && Number.isFinite(qtyNum) && qtyNum > 0 && qtyNum < Number(partial.qty);
  return <div className="space-y-4">
    <Button variant="ghost" className={touch} onClick={back}><ArrowLeft /> Kembali</Button>
    <div className="flex flex-wrap items-center gap-2"><h2 className="text-lg font-semibold">{fmtDate(d.tanggal_kirim)}</h2><Badge>{STATUS[d.status] ?? d.status}</Badge><span className="text-sm text-muted-foreground">{done} dari {all.length} item selesai</span></div>
    {isMaster && <div className="flex flex-wrap gap-2">
      {d.status === "draft" && <Button className={touch} disabled={run.isPending || !all.length} onClick={() => setConfirmKirim(true)}>Kirim daftar</Button>}
      {d.status === "terkirim" && <Button className={touch} disabled={run.isPending || belum > 0} onClick={() => run.mutate(() => supabase.rpc("tutup_daftar_belanja", { p_daftar_id: id }))}>Tutup daftar</Button>}
      {d.status === "terkirim" && belum > 0 && <p className="self-center text-xs text-muted-foreground">Masih ada {belum} item belum dibeli.</p>}
    </div>}
    {all.length === 0 && <p className="text-sm text-muted-foreground">Daftar ini belum berisi item.</p>}
    {groups.map((g) => <section key={g.k || "none"} className={`space-y-2 rounded-lg border p-3 ${g.k ? "" : "border-accent bg-accent/10"}`}>
      <div><h3 className="flex items-center gap-2 font-semibold">{!g.k && <AlertTriangle className="size-4 text-accent-foreground" />}{g.name}</h3>
        {g.k ? <p className="text-xs text-muted-foreground">PIC: {(pics.data ?? []).filter((p) => p.vendor_id === g.k).map((p) => `${p.nama}${p.pic_utama ? " (utama)" : ""}`).join(", ") || "belum ada"}</p>
          : <p className="text-xs">Item ini belum punya vendor{isMaster ? "; pilih vendor sebelum dikirim." : "."}</p>}</div>
      {g.list.map((i) => <div key={i.id} className="space-y-2 rounded border bg-card p-3">
        <div className="flex flex-wrap items-start justify-between gap-2"><div className="min-w-0"><p className="break-words font-medium">{i.item_name}</p><p className="text-sm">{i.qty} {i.unit ?? ""}</p>
          <p className="break-words text-xs text-muted-foreground">{[i.customer_nama, i.outlet_nama, i.section_nama].filter(Boolean).join(" · ")}</p></div>{chip(i)}</div>
        {isMaster && !g.k && d.status !== "selesai" && <Select onValueChange={(v) => run.mutate(() => supabase.rpc("set_item_vendor", { p_item_id: i.id, p_vendor_id: v }))}>
          <SelectTrigger className={touch}><SelectValue placeholder="Pilih vendor" /></SelectTrigger>
          <SelectContent>{(vendors.data ?? []).filter((v) => v.aktif).map((v) => <SelectItem key={v.id} value={v.id}>{v.nama}</SelectItem>)}</SelectContent></Select>}
        {canAct(i) && <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          <Button size="sm" className={touch} disabled={run.isPending} onClick={() => status(i, "ada")}>Ada</Button>
          <Button size="sm" variant="outline" className={touch} disabled={run.isPending} onClick={() => { setPartial(i); setQtyText(""); }}>Sebagian</Button>
          <Button size="sm" variant="outline" className={touch} disabled={run.isPending} onClick={() => status(i, "kosong")}>Kosong</Button>
          <Button size="sm" variant="ghost" className={touch} disabled={run.isPending || i.status_item === "belum_dibeli"} onClick={() => status(i, "belum_dibeli")}>Belum</Button>
        </div>}
      </div>)}
    </section>)}
    <Dialog open={!!partial} onOpenChange={(o) => !o && setPartial(null)}><DialogContent>
      <DialogHeader><DialogTitle>Dibeli sebagian</DialogTitle><DialogDescription>{partial?.item_name} — dipesan {partial?.qty} {partial?.unit ?? ""}</DialogDescription></DialogHeader>
      <Input inputMode="decimal" className={touch} value={qtyText} onChange={(e) => setQtyText(e.target.value)} placeholder="Jumlah dibeli" />
      {qtyText && !qtyValid && <p className="text-sm text-destructive">Jumlah harus lebih dari 0 dan kurang dari {partial?.qty}.</p>}
      <DialogFooter><Button variant="outline" className={touch} onClick={() => setPartial(null)}>Batal</Button><Button className={touch} disabled={!qtyValid} onClick={() => { if (partial) status(partial, "sebagian", qtyNum); setPartial(null); }}>Simpan</Button></DialogFooter>
    </DialogContent></Dialog>
    <Dialog open={confirmKirim} onOpenChange={setConfirmKirim}><DialogContent>
      <DialogHeader><DialogTitle>Kirim daftar belanja?</DialogTitle><DialogDescription>{tanpaVendor ? `Masih ada ${tanpaVendor} item tanpa vendor.` : `Semua ${all.length} item sudah punya vendor.`}</DialogDescription></DialogHeader>
      <DialogFooter><Button variant="outline" className={touch} onClick={() => setConfirmKirim(false)}>Batal</Button><Button className={touch} onClick={() => { setConfirmKirim(false); run.mutate(() => supabase.rpc("kirim_daftar_belanja", { p_daftar_id: id })); }}>Kirim</Button></DialogFooter>
    </DialogContent></Dialog>
  </div>;
}
