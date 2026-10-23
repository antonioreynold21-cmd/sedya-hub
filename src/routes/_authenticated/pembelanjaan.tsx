import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, Pencil, Power, Search } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";
import { useTenant } from "@/components/tenant-provider";
import { useAccess } from "@/hooks/use-access";
import { useTenantQuery } from "@/hooks/use-tenant-query";
import { PageHeader } from "@/components/page-header";
import { QueryState } from "@/components/query-state";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import { VendorDefaultTab } from "@/components/vendor-default-tab";
import { VendorPicTab } from "@/components/vendor-pic-tab";

export const Route = createFileRoute("/_authenticated/pembelanjaan")({
  head: () => ({ meta: [
    { title: "Pembelanjaan — Sedyain Hub" },
    { name: "description", content: "Data vendor pembelanjaan per bisnis di Sedyain Hub." },
    { property: "og:title", content: "Pembelanjaan — Sedyain Hub" },
    { property: "og:description", content: "Daftar vendor, kontak, dan status pembelanjaan bisnis." },
    { property: "og:type", content: "website" },
    { name: "twitter:card", content: "summary_large_image" },
    { name: "robots", content: "noindex" },
  ] }),
  component: PurchasingPage,
});

type Vendor = Database["public"]["Tables"]["vendors"]["Row"];
const emptyForm = { nama: "", kategori: "", kontak: "", catatan: "" };
const touch = "min-h-11";
function vendorError(error: { code?: string }) {
  if (error.code === "23505") return "Nama vendor sudah digunakan dalam bisnis ini.";
  if (error.code === "42501") return "Tidak berizin. Hanya Master yang dapat mengubah vendor.";
  if (error.code === "23514") return "Nama vendor wajib diisi.";
  return "Perubahan gagal disimpan. Silakan coba lagi.";
}

function PurchasingPage() {
  const { tenantId } = useTenant();
  const { isMaster, can } = useAccess();
  const qc = useQueryClient();
  const [tab, setTab] = useState("vendor");
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("aktif");
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Vendor | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [confirm, setConfirm] = useState<Vendor | null>(null);
  const list = useTenantQuery({
    queryKey: ["pembelanjaan", "vendors"], enabled: can("pembelanjaan"), throwOnError: false,
    queryFn: async () => {
      if (!tenantId) throw new Error("Tidak berizin");
      const { data, error } = await supabase.from("vendors").select("*").eq("tenant_id", tenantId).is("deleted_at", null).order("nama");
      if (error) throw error;
      return data;
    },
  });
  const defaults = useTenantQuery({
    queryKey: ["pembelanjaan", "vendor-default-count", confirm?.id],
    enabled: Boolean(confirm?.aktif) && isMaster, throwOnError: false,
    queryFn: async () => {
      if (!confirm || !tenantId) throw new Error("Tidak berizin");
      const { count, error } = await supabase.from("item_vendor_default").select("id", { count: "exact", head: true })
        .eq("tenant_id", tenantId).or(`vendor_utama_id.eq.${confirm.id},vendor_cadangan_id.eq.${confirm.id}`);
      if (error) throw error;
      return count ?? 0;
    },
  });
  const invalidate = () => qc.invalidateQueries({ queryKey: [tenantId, "pembelanjaan"] });
  const save = useMutation({
    mutationFn: async () => {
      if (!tenantId || !isMaster) throw { code: "42501" };
      const payload = { nama: form.nama.trim(), kategori: form.kategori.trim() || null, kontak: form.kontak.trim() || null, catatan: form.catatan.trim() || null };
      if (!payload.nama) throw { code: "23514" };
      const result = editing
        ? await supabase.from("vendors").update(payload).eq("tenant_id", tenantId).eq("id", editing.id).is("deleted_at", null).select("id").single()
        : await supabase.from("vendors").insert({ ...payload, tenant_id: tenantId }).select("id").single();
      if (result.error) throw result.error;
    },
    onSuccess: () => { setOpen(false); invalidate(); toast.success(editing ? "Vendor diperbarui" : "Vendor ditambahkan"); },
    onError: (error: { code?: string }) => toast.error(vendorError(error)),
  });
  const toggle = useMutation({
    mutationFn: async () => {
      if (!confirm || !tenantId || !isMaster) throw { code: "42501" };
      const { error } = await supabase.from("vendors").update({ aktif: !confirm.aktif }).eq("tenant_id", tenantId).eq("id", confirm.id).is("deleted_at", null).select("id").single();
      if (error) throw error;
    },
    onSuccess: () => { toast.success(confirm?.aktif ? "Vendor dinonaktifkan" : "Vendor diaktifkan"); setConfirm(null); invalidate(); },
    onError: (error: { code?: string }) => toast.error(vendorError(error)),
  });
  const visible = (list.data ?? []).filter(v => v.nama.toLocaleLowerCase("id-ID").includes(search.trim().toLocaleLowerCase("id-ID")) && (filter === "semua" || v.aktif === (filter === "aktif")));
  function edit(vendor: Vendor | null) {
    setEditing(vendor);
    setForm(vendor ? { nama: vendor.nama, kategori: vendor.kategori ?? "", kontak: vendor.kontak ?? "", catatan: vendor.catatan ?? "" } : emptyForm);
    save.reset(); setOpen(true);
  }
  function actions(v: Vendor) {
    if (!isMaster) return null;
    return <div className="flex flex-wrap gap-2">
      <Button className={touch} variant="outline" onClick={() => edit(v)} aria-label={`Ubah ${v.nama}`}><Pencil /> Ubah</Button>
      <Button className={touch} variant="outline" onClick={() => { toggle.reset(); setConfirm(v); }} aria-label={`${v.aktif ? "Nonaktifkan" : "Aktifkan"} ${v.nama}`}><Power />{v.aktif ? "Nonaktifkan" : "Aktifkan"}</Button>
    </div>;
  }
  return <div className="space-y-5">
    <PageHeader title="Pembelanjaan" actions={isMaster && tab === "vendor" && <Button className={touch} onClick={() => edit(null)}><Plus /> Tambah vendor</Button>} />
    <Tabs value={tab} onValueChange={setTab}><TabsList><TabsTrigger value="vendor" className={touch}>Vendor</TabsTrigger><TabsTrigger value="default" className={touch}>Vendor Default</TabsTrigger><TabsTrigger value="pic" className={touch}>PIC</TabsTrigger></TabsList></Tabs>
    {tab === "default" && <VendorDefaultTab />}
    {tab === "pic" && <VendorPicTab />}
    {tab === "vendor" && <>
    <div className="flex flex-col gap-3 sm:flex-row">
      <div className="relative flex-1"><Search className="pointer-events-none absolute left-3 top-3 size-5 text-muted-foreground" /><Input className="min-h-11 pl-10" aria-label="Cari nama vendor" placeholder="Cari nama vendor…" value={search} onChange={e => setSearch(e.target.value)} /></div>
      <Select value={filter} onValueChange={setFilter}><SelectTrigger aria-label="Filter status vendor" className="min-h-11 sm:w-44"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="aktif">Aktif</SelectItem><SelectItem value="nonaktif">Nonaktif</SelectItem><SelectItem value="semua">Semua</SelectItem></SelectContent></Select>
    </div>
    <QueryState loading={list.isPending} error={list.isError} retry={() => list.refetch()} />
    {!list.isPending && !list.isError && (visible.length === 0 ? <p className="py-8 text-center text-sm text-muted-foreground">{(list.data?.length ?? 0) === 0 ? "Belum ada vendor." : "Tidak ada vendor yang sesuai pencarian atau filter."}</p> : <>
      <div className="grid gap-3 md:hidden">{visible.map(v => <article key={v.id} className="space-y-3 rounded-lg border border-border bg-card p-4">
        <div className="flex items-start justify-between gap-3"><h2 className="min-w-0 break-words font-semibold">{v.nama}</h2><Badge variant={v.aktif ? "default" : "secondary"}>{v.aktif ? "Aktif" : "Nonaktif"}</Badge></div>
        <dl className="grid grid-cols-[5rem_minmax(0,1fr)] gap-2 text-sm"><dt className="text-muted-foreground">Kategori</dt><dd className="break-words">{v.kategori || "—"}</dd><dt className="text-muted-foreground">Kontak</dt><dd className="break-words">{v.kontak || "—"}</dd><dt className="text-muted-foreground">Catatan</dt><dd className="whitespace-pre-wrap break-words">{v.catatan || "—"}</dd></dl>
        {actions(v)}
      </article>)}</div>
      <div className="hidden md:block"><Table className="table-fixed"><TableHeader><TableRow><TableHead>Nama vendor</TableHead><TableHead>Kategori</TableHead><TableHead>Kontak</TableHead><TableHead>Catatan</TableHead><TableHead className="w-24">Status</TableHead>{isMaster && <TableHead className="w-56">Aksi</TableHead>}</TableRow></TableHeader>
        <TableBody>{visible.map(v => <TableRow key={v.id}><TableCell className="break-words font-medium">{v.nama}</TableCell><TableCell className="break-words">{v.kategori || "—"}</TableCell><TableCell className="break-words">{v.kontak || "—"}</TableCell><TableCell className="whitespace-pre-wrap break-words">{v.catatan || "—"}</TableCell><TableCell><Badge variant={v.aktif ? "default" : "secondary"}>{v.aktif ? "Aktif" : "Nonaktif"}</Badge></TableCell>{isMaster && <TableCell>{actions(v)}</TableCell>}</TableRow>)}</TableBody>
      </Table></div>
    </>)}
    </>}
    <Dialog open={open} onOpenChange={value => { if (!save.isPending) setOpen(value); }}><DialogContent className="max-h-[90dvh] overflow-y-auto"><DialogHeader><DialogTitle>{editing ? "Ubah vendor" : "Tambah vendor"}</DialogTitle><DialogDescription>Data vendor bisnis Anda.</DialogDescription></DialogHeader>
      <form onSubmit={e => { e.preventDefault(); save.mutate(); }} className="space-y-4">
        {(["nama", "kategori", "kontak"] as const).map(key => <div key={key} className="space-y-1.5"><Label htmlFor={`vendor-${key}`}>{key === "nama" ? "Nama vendor *" : key === "kategori" ? "Kategori" : "Kontak"}</Label><Input className={touch} id={`vendor-${key}`} required={key === "nama"} value={form[key]} onChange={e => setForm({ ...form, [key]: e.target.value })} /></div>)}
        <div className="space-y-1.5"><Label htmlFor="vendor-catatan">Catatan</Label><Textarea id="vendor-catatan" value={form.catatan} onChange={e => setForm({ ...form, catatan: e.target.value })} /></div>
        {save.isError && <p role="alert" className="text-sm text-destructive">{vendorError(save.error)}</p>}
        <DialogFooter><Button className={touch} type="button" variant="outline" disabled={save.isPending} onClick={() => setOpen(false)}>Batal</Button><Button className={touch} type="submit" disabled={save.isPending || !form.nama.trim()}>{save.isPending ? "Menyimpan…" : "Simpan"}</Button></DialogFooter>
      </form>
    </DialogContent></Dialog>
    <Dialog open={Boolean(confirm)} onOpenChange={value => { if (!value && !toggle.isPending) setConfirm(null); }}><DialogContent><DialogHeader><DialogTitle>{confirm?.aktif ? "Nonaktifkan vendor?" : "Aktifkan vendor?"}</DialogTitle><DialogDescription className="break-words">{confirm?.nama}</DialogDescription></DialogHeader>
      {confirm?.aktif && <><QueryState loading={defaults.isPending} error={defaults.isError} retry={() => defaults.refetch()} />{defaults.isSuccess && defaults.data > 0 && <p role="alert" className="text-sm text-destructive">Vendor ini digunakan sebagai vendor default untuk {defaults.data} item. Penugasan tetap tersimpan jika vendor dinonaktifkan.</p>}</>}
      {toggle.isError && <p role="alert" className="text-sm text-destructive">{vendorError(toggle.error)}</p>}
      <DialogFooter><Button className={touch} variant="outline" disabled={toggle.isPending} onClick={() => setConfirm(null)}>Batal</Button><Button className={touch} disabled={toggle.isPending || Boolean(confirm?.aktif && !defaults.isSuccess)} onClick={() => toggle.mutate()}>{toggle.isPending ? "Menyimpan…" : confirm?.aktif ? "Nonaktifkan" : "Aktifkan"}</Button></DialogFooter>
    </DialogContent></Dialog>
  </div>;
}