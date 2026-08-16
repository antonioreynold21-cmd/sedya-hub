import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Pencil, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { supabase } from "@/integrations/supabase/client";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { CLIENT_STATUSES } from "@/lib/sedyain";

export const Route = createFileRoute("/crm")({
  head: () => ({
    meta: [
      { title: "CRM Client & Lead — Sedyain Indonesia" },
      {
        name: "description",
        content:
          "Kelola client dan lead HORECA: status pipeline, PIC penanggung jawab, kontak, dan catatan follow up.",
      },
      { property: "og:title", content: "CRM Client & Lead — Sedyain Indonesia" },
      {
        property: "og:description",
        content: "Pipeline lead HORECA dengan status, PIC, dan catatan follow up.",
      },
    ],
  }),
  component: CrmPage,
});

type Client = {
  id: string;
  name: string;
  contact_person: string | null;
  phone: string | null;
  status: string;
  pic: string | null;
  notes: string | null;
};

const emptyForm = {
  name: "",
  contact_person: "",
  phone: "",
  status: "Lead Baru",
  pic: "",
  notes: "",
};

const statusVariant: Record<string, string> = {
  "Lead Baru": "bg-muted text-foreground",
  "Follow Up": "bg-urgent-warn text-foreground",
  Negosiasi: "bg-urgent-soon text-foreground",
  Deal: "bg-primary text-primary-foreground",
  "Tidak Lanjut": "bg-urgent-late text-foreground",
};

function CrmPage() {
  const qc = useQueryClient();
  const [filter, setFilter] = useState<string>("Semua");
  const [open, setOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);

  const { data: clients = [], isLoading } = useQuery({
    queryKey: ["clients"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("clients")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as Client[];
    },
  });

  const { data: team = [] } = useQuery({
    queryKey: ["team-names"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("team_members")
        .select("name")
        .eq("is_active", true)
        .order("name");
      if (error) throw error;
      return (data ?? []).map((t) => t.name);
    },
  });

  const save = useMutation({
    mutationFn: async () => {
      const payload = {
        name: form.name.trim(),
        contact_person: form.contact_person || null,
        phone: form.phone || null,
        status: form.status,
        pic: form.pic || null,
        notes: form.notes || null,
      };
      if (editId) {
        const { error } = await supabase.from("clients").update(payload).eq("id", editId);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("clients").insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["clients"] });
      toast.success(editId ? "Data client diperbarui" : "Client baru ditambahkan");
      setOpen(false);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("clients").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["clients"] });
      toast.success("Client dihapus");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const shown = filter === "Semua" ? clients : clients.filter((c) => c.status === filter);

  function openNew() {
    setEditId(null);
    setForm(emptyForm);
    setOpen(true);
  }

  function openEdit(c: Client) {
    setEditId(c.id);
    setForm({
      name: c.name,
      contact_person: c.contact_person ?? "",
      phone: c.phone ?? "",
      status: c.status,
      pic: c.pic ?? "",
      notes: c.notes ?? "",
    });
    setOpen(true);
  }

  return (
    <div>
      <PageHeader
        title="CRM"
        description="Daftar client dan lead HORECA beserta status pipeline."
        actions={
          <Button onClick={openNew}>
            <Plus className="size-4" /> Tambah Client
          </Button>
        }
      />

      <div className="mb-4 flex flex-wrap items-center gap-2">
        <span className="text-sm text-muted-foreground">Filter status:</span>
        {["Semua", ...CLIENT_STATUSES].map((s) => (
          <Button
            key={s}
            size="sm"
            variant={filter === s ? "default" : "outline"}
            onClick={() => setFilter(s)}
          >
            {s}
          </Button>
        ))}
      </div>

      <div className="overflow-hidden rounded-lg border border-border bg-card card-soft">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nama Client</TableHead>
              <TableHead>Kontak</TableHead>
              <TableHead>No Telepon</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>PIC</TableHead>
              <TableHead>Catatan</TableHead>
              <TableHead className="text-right">Aksi</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center text-muted-foreground">
                  Memuat data...
                </TableCell>
              </TableRow>
            ) : shown.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center text-muted-foreground">
                  Belum ada data.
                </TableCell>
              </TableRow>
            ) : (
              shown.map((c) => (
                <TableRow key={c.id}>
                  <TableCell className="font-medium">{c.name}</TableCell>
                  <TableCell>{c.contact_person ?? "-"}</TableCell>
                  <TableCell>{c.phone ?? "-"}</TableCell>
                  <TableCell>
                    <Badge className={statusVariant[c.status] ?? "bg-muted text-foreground"}>
                      {c.status}
                    </Badge>
                  </TableCell>
                  <TableCell>{c.pic ?? "-"}</TableCell>
                  <TableCell className="max-w-[240px] truncate text-muted-foreground">
                    {c.notes ?? "-"}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1">
                      <Button size="icon" variant="ghost" onClick={() => openEdit(c)}>
                        <Pencil className="size-4" />
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => {
                          if (confirm(`Hapus client ${c.name}?`)) remove.mutate(c.id);
                        }}
                      >
                        <Trash2 className="size-4 text-destructive" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editId ? "Edit Client" : "Tambah Client"}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-3">
            <div className="grid gap-1.5">
              <Label>Nama Client</Label>
              <Input
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="Hotel / Resto / Kafe"
              />
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="grid gap-1.5">
                <Label>Kontak</Label>
                <Input
                  value={form.contact_person}
                  onChange={(e) => setForm({ ...form, contact_person: e.target.value })}
                />
              </div>
              <div className="grid gap-1.5">
                <Label>No Telepon</Label>
                <Input
                  value={form.phone}
                  onChange={(e) => setForm({ ...form, phone: e.target.value })}
                />
              </div>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="grid gap-1.5">
                <Label>Status</Label>
                <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {CLIENT_STATUSES.map((s) => (
                      <SelectItem key={s} value={s}>
                        {s}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-1.5">
                <Label>PIC</Label>
                <Select value={form.pic} onValueChange={(v) => setForm({ ...form, pic: v })}>
                  <SelectTrigger>
                    <SelectValue placeholder="Pilih PIC" />
                  </SelectTrigger>
                  <SelectContent>
                    {team.map((n) => (
                      <SelectItem key={n} value={n}>
                        {n}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid gap-1.5">
              <Label>Catatan</Label>
              <Textarea
                value={form.notes}
                onChange={(e) => setForm({ ...form, notes: e.target.value })}
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>
              Batal
            </Button>
            <Button
              onClick={() => {
                if (!form.name.trim()) {
                  toast.error("Nama client wajib diisi");
                  return;
                }
                save.mutate();
              }}
              disabled={save.isPending}
            >
              Simpan
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
