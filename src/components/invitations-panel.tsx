import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Copy, MessageCircle, Plus, X } from "lucide-react";
import { useTenantQuery as useQuery } from "@/hooks/use-tenant-query";
import { supabase } from "@/integrations/supabase/client";
import { MODULES } from "@/lib/access";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

type Invite = { id: string; email: string; role: string; expires_at: string };
const fmt = (d: string) => new Intl.DateTimeFormat("id-ID", { day: "2-digit", month: "short", year: "numeric", timeZone: "Asia/Jakarta" }).format(new Date(d));

export function InvitationsPanel() {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<"staff" | "master">("staff");
  const [modules, setModules] = useState<string[]>(["dashboard"]);
  const [link, setLink] = useState<string | null>(null);

  const list = useQuery({
    queryKey: ["tenant_invitations"],
    queryFn: async () => {
      const { data, error } = await supabase.from("tenant_invitations").select("id,email,role,expires_at").eq("status", "pending").gt("expires_at", new Date().toISOString()).order("created_at", { ascending: false });
      if (error) throw error;
      return data as Invite[];
    },
    throwOnError: false,
  });

  const create = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.rpc("create_tenant_invitation", { p_email: email.trim(), p_role: role, p_modules: modules });
      if (error) throw error;
      return (data as { token: string }).token;
    },
    onSuccess: (token) => {
      setLink(`${window.location.origin}/auth?invite=${token}`);
      qc.invalidateQueries();
      toast.success("Tautan undangan dibuat");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const revoke = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.rpc("revoke_tenant_invitation", { p_id: id });
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries(); toast.success("Undangan dicabut"); },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div className="mb-6 rounded-lg border border-border bg-card p-4 card-soft">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <h2 className="font-semibold">Undangan menunggu</h2>
        <Button size="sm" onClick={() => { setEmail(""); setRole("staff"); setModules(["dashboard"]); setLink(null); setOpen(true); }}>
          <Plus className="size-4" /> Undang akun
        </Button>
      </div>
      {list.isPending ? <p className="text-sm text-muted-foreground">Memuat undangan…</p>
        : list.isError ? <p role="alert" className="text-sm text-destructive">Gagal memuat undangan. <button className="underline" onClick={() => list.refetch()}>Coba lagi</button></p>
        : (list.data?.length ?? 0) === 0 ? <p className="text-sm text-muted-foreground">Tidak ada undangan menunggu.</p>
        : <ul className="divide-y divide-border">{list.data?.map((i) => (
          <li key={i.id} className="flex flex-wrap items-center justify-between gap-2 py-2 text-sm">
            <span className="min-w-0 break-all">{i.email} · {i.role === "master" ? "Master" : "Staff"} · berlaku s.d. {fmt(i.expires_at)}</span>
            <Button size="sm" variant="ghost" disabled={revoke.isPending} onClick={() => revoke.mutate(i.id)}><X className="size-4" /> Cabut</Button>
          </li>))}</ul>}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Undang akun</DialogTitle></DialogHeader>
          {link ? (
            <div className="grid gap-3">
              <p className="text-sm text-muted-foreground">Tautan hanya ditampilkan sekali dan berlaku 7 hari. Bagikan ke {email}.</p>
              <Input readOnly value={link} onFocus={(e) => e.currentTarget.select()} />
              <div className="flex flex-wrap gap-2">
                <Button onClick={() => navigator.clipboard.writeText(link).then(() => toast.success("Tautan disalin"))}><Copy className="size-4" /> Salin tautan</Button>
                <Button variant="outline" asChild><a href={`https://wa.me/?text=${encodeURIComponent(`Undangan bergabung ke Sedyain Hub: ${link}`)}`} target="_blank" rel="noreferrer"><MessageCircle className="size-4" /> WhatsApp</a></Button>
              </div>
            </div>
          ) : (
            <div className="grid gap-3">
              <div className="grid gap-1.5"><Label htmlFor="inv-email">Email</Label><Input id="inv-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} /></div>
              <div className="grid gap-1.5"><Label>Peran</Label>
                <Select value={role} onValueChange={(v) => setRole(v as "staff" | "master")}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent><SelectItem value="staff">Staff</SelectItem><SelectItem value="master">Master</SelectItem></SelectContent>
                </Select>
              </div>
              {role === "staff" && <div className="grid gap-2 sm:grid-cols-2">{MODULES.map((m) => (
                <label key={m.key} className="flex min-h-10 items-center gap-2 text-sm">
                  <Checkbox checked={modules.includes(m.key)} onCheckedChange={(c) => setModules(c ? [...modules, m.key] : modules.filter((x) => x !== m.key))} /> {m.label}
                </label>))}</div>}
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Tutup</Button>
            {!link && <Button disabled={create.isPending} onClick={() => { if (!/^\S+@\S+\.\S+$/.test(email.trim())) { toast.error("Email tidak valid"); return; } create.mutate(); }}>Buat tautan</Button>}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
