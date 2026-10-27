import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, Star, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useTenant } from "@/components/tenant-provider";
import { useAccess } from "@/hooks/use-access";
import { useTenantQuery } from "@/hooks/use-tenant-query";
import { QueryState } from "@/components/query-state";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const touch = "min-h-11";
function friendly(e: unknown) {
  const err = e as { code?: string; message?: string };
  if (err?.code === "42501") return "Tidak berizin. Hanya Master yang dapat mengubah PIC.";
  if (err?.message?.includes("anggota aktif")) return "PIC harus anggota aktif bisnis ini.";
  return "Gagal menyimpan PIC. Silakan coba lagi.";
}

export function VendorPicTab() {
  const { tenantId } = useTenant();
  const { isMaster } = useAccess();
  const qc = useQueryClient();
  const [pick, setPick] = useState<Record<string, string>>({});
  const vendors = useTenantQuery({
    queryKey: ["pembelanjaan", "vendors"], throwOnError: false,
    queryFn: async () => {
      const { data, error } = await supabase.from("vendors").select("*").eq("tenant_id", tenantId!).is("deleted_at", null).order("nama");
      if (error) throw error; return data;
    },
  });
  const pics = useTenantQuery({
    queryKey: ["pembelanjaan", "pics"], throwOnError: false,
    queryFn: async () => { const { data, error } = await supabase.rpc("list_vendor_pics"); if (error) throw error; return data ?? []; },
  });
  const candidates = useTenantQuery({
    queryKey: ["pembelanjaan", "pic-candidates"], throwOnError: false, enabled: isMaster,
    queryFn: async () => { const { data, error } = await supabase.rpc("list_pic_candidates"); if (error) throw error; return data ?? []; },
  });
  const invalidate = () => qc.invalidateQueries({ queryKey: [tenantId, "pembelanjaan"] });
  const setPic = useMutation({
    mutationFn: async (a: { vendor: string; user: string; utama: boolean }) => {
      const { error } = await supabase.rpc("set_vendor_pic", { p_vendor_id: a.vendor, p_user_id: a.user, p_utama: a.utama });
      if (error) throw error;
    },
    onSuccess: (_d, a) => { toast.success(a.utama ? "PIC utama diperbarui" : "PIC ditambahkan"); setPick((p) => ({ ...p, [a.vendor]: "" })); invalidate(); },
    onError: (e) => toast.error(friendly(e)),
  });
  const removePic = useMutation({
    mutationFn: async (a: { vendor: string; user: string }) => {
      const { error } = await supabase.rpc("remove_vendor_pic", { p_vendor_id: a.vendor, p_user_id: a.user });
      if (error) throw error;
    },
    onSuccess: () => { toast.success("PIC dihapus"); invalidate(); },
    onError: (e) => toast.error(friendly(e)),
  });
  const busy = setPic.isPending || removePic.isPending;
  const active = (vendors.data ?? []).filter((v) => v.aktif);
  const loading = vendors.isPending || pics.isPending;
  const failed = vendors.isError || pics.isError;

  return <div className="space-y-4">
    <QueryState loading={loading} error={failed} retry={() => { vendors.refetch(); pics.refetch(); }} />
    {isMaster && candidates.isError && <p role="alert" className="text-sm text-destructive">Gagal memuat daftar anggota tim. <button className="underline" onClick={() => candidates.refetch()}>Coba lagi</button></p>}
    {!loading && !failed && (active.length === 0 ? <p className="py-8 text-center text-sm text-muted-foreground">Belum ada vendor aktif.</p> :
      <div className="grid gap-3 md:grid-cols-2">{active.map((v) => {
        const list = (pics.data ?? []).filter((p) => p.vendor_id === v.id);
        const options = (candidates.data ?? []).filter((c) => !list.some((p) => p.user_id === c.user_id));
        return <article key={v.id} className="space-y-3 rounded-lg border border-border bg-card p-4">
          <h3 className="break-words font-semibold">{v.nama}</h3>
          {list.length === 0 ? <p className="text-sm text-muted-foreground">Belum ada PIC.</p> : <ul className="space-y-2">{list.map((p) => <li key={p.user_id} className="flex flex-wrap items-center justify-between gap-2 text-sm">
            <span className="min-w-0 break-words">{p.nama}{p.pic_utama && <Badge className="ml-2">Utama</Badge>}</span>
            {isMaster && <span className="flex gap-2">
              {!p.pic_utama && <Button className={touch} size="sm" variant="outline" disabled={busy} onClick={() => setPic.mutate({ vendor: v.id, user: p.user_id, utama: true })} aria-label={`Jadikan ${p.nama} PIC utama`}><Star /> Utama</Button>}
              <Button className={touch} size="sm" variant="outline" disabled={busy} onClick={() => removePic.mutate({ vendor: v.id, user: p.user_id })} aria-label={`Hapus PIC ${p.nama}`}><Trash2 /></Button>
            </span>}
          </li>)}</ul>}
          {isMaster && <div className="flex gap-2">
            <Select value={pick[v.id] ?? ""} onValueChange={(val) => setPick((p) => ({ ...p, [v.id]: val }))}><SelectTrigger className={`${touch} flex-1`} aria-label={`Pilih PIC untuk ${v.nama}`}><SelectValue placeholder="Pilih anggota tim" /></SelectTrigger><SelectContent>{options.map((c) => <SelectItem key={c.user_id} value={c.user_id}>{c.nama}</SelectItem>)}</SelectContent></Select>
            <Button className={touch} disabled={busy || !pick[v.id]} onClick={() => { const sel = pick[v.id]; if (sel) setPic.mutate({ vendor: v.id, user: sel, utama: false }); }}><Plus /> Tambah</Button>
          </div>}
        </article>;
      })}</div>)}
  </div>;
}
