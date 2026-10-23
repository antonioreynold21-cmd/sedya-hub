import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Download, Pencil, Search, Upload } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useTenant } from "@/components/tenant-provider";
import { useAccess } from "@/hooks/use-access";
import { useTenantQuery } from "@/hooks/use-tenant-query";
import { QueryState } from "@/components/query-state";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { MAX_CSV_BYTES, cleanCell, downloadCsv, parseCsv, toCsv } from "@/lib/csv";

const touch = "min-h-11";
const NONE = "__none__";
type ImportRow = { line: number; nama_item: string; vendor_utama: string | null; vendor_cadangan: string | null; status: "ok" | "gagal"; alasan: string | null };
type ImportResult = { summary: { ok: number; gagal: number }; rows: ImportRow[] };

function friendly(e: unknown) {
  const err = e as { code?: string; message?: string };
  if (err?.code === "42501") return "Tidak berizin. Hanya Master yang dapat mengubah.";
  if (err?.code === "23514") return "Vendor cadangan tidak boleh sama dengan vendor utama.";
  return err?.message && /[a-z]/i.test(err.message) && !/violates|relation|column/i.test(err.message) ? err.message : "Gagal menyimpan. Silakan coba lagi.";
}

export function VendorDefaultTab() {
  const { tenantId } = useTenant();
  const { isMaster } = useAccess();
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [onlyEmpty, setOnlyEmpty] = useState(false);
  const [editing, setEditing] = useState<{ id: string; name: string } | null>(null);
  const [utama, setUtama] = useState("");
  const [cadangan, setCadangan] = useState(NONE);

  const items = useTenantQuery({
    queryKey: ["pembelanjaan", "items"], throwOnError: false,
    queryFn: async () => {
      const { data, error } = await supabase.from("pricelist_items").select("id,name,unit,category").eq("tenant_id", tenantId!).is("deleted_at", null).eq("is_active", true).order("name");
      if (error) throw error; return data;
    },
  });
  const vendors = useTenantQuery({
    queryKey: ["pembelanjaan", "vendors"], throwOnError: false,
    queryFn: async () => {
      const { data, error } = await supabase.from("vendors").select("*").eq("tenant_id", tenantId!).is("deleted_at", null).order("nama");
      if (error) throw error; return data;
    },
  });
  const defaults = useTenantQuery({
    queryKey: ["pembelanjaan", "defaults"], throwOnError: false,
    queryFn: async () => {
      const { data, error } = await supabase.from("item_vendor_default").select("id,item_id,vendor_utama_id,vendor_cadangan_id").eq("tenant_id", tenantId!);
      if (error) throw error; return data;
    },
  });
  const invalidate = () => qc.invalidateQueries({ queryKey: [tenantId, "pembelanjaan"] });
  const vendorName = (id: string | null) => (id ? vendors.data?.find((v) => v.id === id)?.nama ?? "—" : null);
  const byItem = new Map((defaults.data ?? []).map((d) => [d.item_id, d]));
  const activeVendors = (vendors.data ?? []).filter((v) => v.aktif);
  const q = search.trim().toLocaleLowerCase("id-ID");
  const visible = (items.data ?? []).filter((i) => i.name.toLocaleLowerCase("id-ID").includes(q) && (!onlyEmpty || !byItem.has(i.id)));

  const save = useMutation({
    mutationFn: async () => {
      if (!editing || !tenantId || !utama) throw new Error("Vendor utama wajib dipilih");
      const cad = cadangan === NONE ? null : cadangan;
      if (cad === utama) throw { code: "23514" };
      const { error } = await supabase.from("item_vendor_default").upsert({ tenant_id: tenantId, item_id: editing.id, vendor_utama_id: utama, vendor_cadangan_id: cad }, { onConflict: "tenant_id,item_id" });
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Vendor default disimpan"); setEditing(null); invalidate(); },
    onError: (e) => toast.error(friendly(e)),
  });
  const remove = useMutation({
    mutationFn: async () => {
      if (!editing || !tenantId) return;
      const { error } = await supabase.from("item_vendor_default").delete().eq("tenant_id", tenantId).eq("item_id", editing.id);
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Pengaturan dihapus"); setEditing(null); invalidate(); },
    onError: (e) => toast.error(friendly(e)),
  });

  function open(item: { id: string; name: string }) {
    const d = byItem.get(item.id);
    setUtama(d?.vendor_utama_id ?? ""); setCadangan(d?.vendor_cadangan_id ?? NONE); setEditing(item);
  }
  const loading = items.isPending || vendors.isPending || defaults.isPending;
  const failed = items.isError || vendors.isError || defaults.isError;
  const cell = (id: string | null | undefined) => vendorName(id ?? null) ?? <span className="text-muted-foreground">Belum diatur</span>;

  return <div className="space-y-4">
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
      <div className="relative flex-1"><Search className="pointer-events-none absolute left-3 top-3 size-5 text-muted-foreground" /><Input className="min-h-11 pl-10" aria-label="Cari item" placeholder="Cari item…" value={search} onChange={(e) => setSearch(e.target.value)} /></div>
      <label className="flex min-h-11 items-center gap-2 text-sm"><Checkbox checked={onlyEmpty} onCheckedChange={(v) => setOnlyEmpty(v === true)} /> Belum ada vendor</label>
      {isMaster && <div className="flex flex-wrap gap-2">
        <Button className={touch} variant="outline" onClick={() => downloadCsv("template-vendor-default.csv", toCsv(["nama_item", "vendor_utama", "vendor_cadangan"], [["Beras Premium", "Vendor A", "Vendor B"], ["Gula Pasir", "Vendor A", ""]]))}><Download /> Unduh template</Button>
        <ImportDialog onDone={invalidate} />
      </div>}
    </div>
    <QueryState loading={loading} error={failed} retry={() => { items.refetch(); vendors.refetch(); defaults.refetch(); }} />
    {!loading && !failed && (visible.length === 0 ? <p className="py-8 text-center text-sm text-muted-foreground">{(items.data?.length ?? 0) === 0 ? "Belum ada item aktif di Pricelist." : "Tidak ada item yang sesuai."}</p> : <>
      <div className="grid gap-3 md:hidden">{visible.map((i) => { const d = byItem.get(i.id); return <article key={i.id} className="space-y-2 rounded-lg border border-border bg-card p-4">
        <h3 className="break-words font-semibold">{i.name} <span className="font-normal text-muted-foreground">/ {i.unit}</span></h3>
        <dl className="grid grid-cols-[6.5rem_minmax(0,1fr)] gap-1 text-sm"><dt className="text-muted-foreground">Kategori</dt><dd>{i.category}</dd><dt className="text-muted-foreground">Vendor utama</dt><dd className="break-words">{cell(d?.vendor_utama_id)}</dd><dt className="text-muted-foreground">Cadangan</dt><dd className="break-words">{cell(d?.vendor_cadangan_id)}</dd></dl>
        {isMaster && <Button className={touch} variant="outline" onClick={() => open(i)}><Pencil /> Atur</Button>}
      </article>; })}</div>
      <div className="hidden md:block"><Table className="table-fixed"><TableHeader><TableRow><TableHead>Item</TableHead><TableHead className="w-24">Satuan</TableHead><TableHead>Kategori</TableHead><TableHead>Vendor utama</TableHead><TableHead>Vendor cadangan</TableHead>{isMaster && <TableHead className="w-28">Aksi</TableHead>}</TableRow></TableHeader>
        <TableBody>{visible.map((i) => { const d = byItem.get(i.id); return <TableRow key={i.id}><TableCell className="break-words font-medium">{i.name}</TableCell><TableCell>{i.unit}</TableCell><TableCell className="break-words">{i.category}</TableCell><TableCell className="break-words">{cell(d?.vendor_utama_id)}</TableCell><TableCell className="break-words">{cell(d?.vendor_cadangan_id)}</TableCell>{isMaster && <TableCell><Button className={touch} variant="outline" onClick={() => open(i)}><Pencil /> Atur</Button></TableCell>}</TableRow>; })}</TableBody>
      </Table></div>
    </>)}
    <Dialog open={Boolean(editing)} onOpenChange={(v) => { if (!v && !save.isPending && !remove.isPending) setEditing(null); }}><DialogContent><DialogHeader><DialogTitle>Atur vendor default</DialogTitle><DialogDescription className="break-words">{editing?.name}</DialogDescription></DialogHeader>
      <div className="space-y-4">
        <div className="space-y-1.5"><Label>Vendor utama *</Label><Select value={utama} onValueChange={(v) => { setUtama(v); if (v === cadangan) setCadangan(NONE); }}><SelectTrigger className={touch} aria-label="Vendor utama"><SelectValue placeholder="Pilih vendor" /></SelectTrigger><SelectContent>{activeVendors.map((v) => <SelectItem key={v.id} value={v.id}>{v.nama}</SelectItem>)}</SelectContent></Select></div>
        <div className="space-y-1.5"><Label>Vendor cadangan</Label><Select value={cadangan} onValueChange={setCadangan}><SelectTrigger className={touch} aria-label="Vendor cadangan"><SelectValue /></SelectTrigger><SelectContent><SelectItem value={NONE}>Tidak ada</SelectItem>{activeVendors.filter((v) => v.id !== utama).map((v) => <SelectItem key={v.id} value={v.id}>{v.nama}</SelectItem>)}</SelectContent></Select></div>
        {activeVendors.length === 0 && <p className="text-sm text-destructive">Belum ada vendor aktif. Tambahkan di tab Vendor.</p>}
      </div>
      <DialogFooter className="gap-2">
        {editing && byItem.has(editing.id) && <Button className={touch} variant="outline" disabled={remove.isPending || save.isPending} onClick={() => remove.mutate()}>Hapus pengaturan</Button>}
        <Button className={touch} disabled={!utama || save.isPending || remove.isPending} onClick={() => save.mutate()}>{save.isPending ? "Menyimpan…" : "Simpan"}</Button>
      </DialogFooter>
    </DialogContent></Dialog>
  </div>;
}

function ImportDialog({ onDone }: { onDone: () => void }) {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [payload, setPayload] = useState<{ line: number; nama_item: string; vendor_utama: string; vendor_cadangan: string }[]>([]);
  const [result, setResult] = useState<ImportResult | null>(null);
  const reset = () => { setErr(null); setPayload([]); setResult(null); };

  async function onFile(file?: File) {
    reset(); if (!file) return;
    if (!/\.csv$/i.test(file.name)) return setErr("Pilih file berformat .csv");
    if (file.size > MAX_CSV_BYTES) return setErr("Ukuran file maksimal 1 MB");
    const rows = parseCsv(await file.text());
    const head = (rows[0] ?? []).map((h) => cleanCell(h).toLowerCase());
    const ix = { n: head.indexOf("nama_item"), u: head.indexOf("vendor_utama"), c: head.indexOf("vendor_cadangan") };
    if (ix.n < 0 || ix.u < 0) return setErr("Kolom nama_item dan vendor_utama wajib ada");
    const data = rows.slice(1);
    if (!data.length) return setErr("Tidak ada baris data");
    if (data.length > 500) return setErr("Maksimal 500 baris per impor");
    const p = data.map((r, i) => ({ line: i + 2, nama_item: cleanCell(r[ix.n]), vendor_utama: cleanCell(r[ix.u]), vendor_cadangan: ix.c >= 0 ? cleanCell(r[ix.c]) : "" }));
    setBusy(true);
    try {
      const { data: res, error } = await supabase.rpc("import_item_vendor_defaults", { p_rows: p as never, p_commit: false });
      if (error) throw error;
      setPayload(p); setResult(res as unknown as ImportResult);
    } catch (e) { setErr(friendly(e)); } finally { setBusy(false); }
  }
  async function apply() {
    setBusy(true);
    try {
      const { data, error } = await supabase.rpc("import_item_vendor_defaults", { p_rows: payload as never, p_commit: true });
      if (error) throw error;
      const s = (data as unknown as ImportResult).summary;
      toast.success(`Impor selesai: ${s.ok} diterapkan, ${s.gagal} dilewati`);
      onDone(); setOpen(false); reset();
    } catch (e) { toast.error(friendly(e)); } finally { setBusy(false); }
  }
  const failed = result?.rows.filter((r) => r.status === "gagal") ?? [];
  return <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) reset(); }}>
    <Button className={touch} variant="outline" onClick={() => setOpen(true)}><Upload /> Impor CSV</Button>
    <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-2xl"><DialogHeader><DialogTitle>Impor vendor default</DialogTitle><DialogDescription>Kolom: nama_item;vendor_utama;vendor_cadangan. Maksimal 500 baris. Baris gagal dilewati.</DialogDescription></DialogHeader>
      <input type="file" accept=".csv,text/csv" aria-label="File CSV" disabled={busy} onChange={(e) => onFile(e.target.files?.[0])} className="text-sm" />
      {busy && <p role="status" className="text-sm text-muted-foreground">Memproses…</p>}
      {err && <p role="alert" className="text-sm text-destructive">{err}</p>}
      {result && <div className="space-y-3">
        <p className="text-sm font-medium">{result.summary.ok} siap · <span className={result.summary.gagal ? "text-destructive" : ""}>{result.summary.gagal} gagal</span></p>
        {failed.length > 0 && <>
          <div className="overflow-x-auto rounded-md border border-border"><table className="w-full text-sm"><thead className="bg-muted text-left"><tr><th className="p-2">Baris</th><th className="p-2">Item</th><th className="p-2">Alasan</th></tr></thead>
            <tbody>{failed.slice(0, 100).map((r) => <tr key={r.line} className="border-t border-border"><td className="p-2">{r.line}</td><td className="break-words p-2">{r.nama_item || "-"}</td><td className="p-2 text-destructive">{r.alasan}</td></tr>)}</tbody></table></div>
          {failed.length > 100 && <p className="text-xs text-muted-foreground">…dan {failed.length - 100} baris gagal lainnya.</p>}
          <Button className={touch} variant="outline" onClick={() => downloadCsv("laporan-gagal-vendor-default.csv", toCsv(["baris", "nama_item", "vendor_utama", "vendor_cadangan", "alasan"], failed.map((r) => [r.line, r.nama_item, r.vendor_utama ?? "", r.vendor_cadangan ?? "", r.alasan ?? ""])))}><Download /> Unduh laporan gagal (CSV)</Button>
        </>}
        <div className="flex justify-end"><Button className={touch} disabled={busy || result.summary.ok === 0} onClick={apply}>Terapkan {result.summary.ok} baris</Button></div>
      </div>}
    </DialogContent>
  </Dialog>;
}
