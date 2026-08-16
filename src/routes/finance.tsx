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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
import {
  CASH_REQUEST_STATUSES,
  EXPENSE_CATEGORIES,
  EXPENSE_STATUSES,
  PAYABLE_STATUSES,
  RECEIVABLE_STATUSES,
  formatDate,
  formatRupiah,
  urgencyLabel,
  urgencyOf,
  urgencyRowClass,
} from "@/lib/sedyain";

export const Route = createFileRoute("/finance")({
  head: () => ({
    meta: [
      { title: "Finance — Utang, Piutang & Kas Sedyain Indonesia" },
      {
        name: "description",
        content:
          "Pantau utang vendor, piutang client, request transfer kas belanja, dan pengeluaran operasional dengan penanda urgensi jatuh tempo.",
      },
      { property: "og:title", content: "Finance — Utang, Piutang & Kas Sedyain Indonesia" },
      {
        property: "og:description",
        content: "Utang, piutang, kas belanja, dan pengeluaran operasional dalam satu modul.",
      },
    ],
  }),
  component: FinancePage,
});

type Payable = {
  id: string;
  vendor: string;
  invoice_no: string | null;
  amount: number;
  invoice_date: string | null;
  due_date: string | null;
  status: string;
  pic: string | null;
  notes: string | null;
};

type Receivable = Omit<Payable, "vendor"> & { client_name: string };

type CashRequest = {
  id: string;
  purpose: string;
  request_date: string;
  amount: number;
  pic: string | null;
  status: string;
  notes: string | null;
};

type Expense = {
  id: string;
  description: string;
  expense_date: string;
  category: string;
  amount: number;
  status: string;
  pic: string | null;
};

const statusBadge: Record<string, string> = {
  "Belum Bayar": "bg-urgent-late text-foreground",
  "Sudah Bayar": "bg-primary text-primary-foreground",
  "Belum Tertagih": "bg-urgent-soon text-foreground",
  Lunas: "bg-primary text-primary-foreground",
  Pending: "bg-urgent-warn text-foreground",
  Disetujui: "bg-primary-soft text-primary",
  Ditransfer: "bg-primary text-primary-foreground",
  Ditolak: "bg-urgent-late text-foreground",
  Draft: "bg-muted text-muted-foreground",
  Dibayar: "bg-primary text-primary-foreground",
};

function useTeamNames() {
  return useQuery({
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
}

function Legend() {
  return (
    <div className="mb-3 flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
      <span className="font-medium">Penanda jatuh tempo:</span>
      <span className="flex items-center gap-1">
        <span className="size-3 rounded bg-urgent-warn" /> ≤ 7 hari
      </span>
      <span className="flex items-center gap-1">
        <span className="size-3 rounded bg-urgent-soon" /> ≤ 3 hari
      </span>
      <span className="flex items-center gap-1">
        <span className="size-3 rounded bg-urgent-late" /> ≤ 1 hari / lewat tempo
      </span>
      <span className="flex items-center gap-1">
        <span className="size-3 rounded bg-urgent-done" /> lunas
      </span>
    </div>
  );
}

function TotalBar({ label, value }: { label: string; value: number }) {
  return (
    <div className="mb-3 inline-flex items-baseline gap-2 rounded-md border border-border bg-card px-3 py-2 card-soft">
      <span className="text-xs text-muted-foreground">{label}</span>
      <span className="text-base font-bold text-primary">{formatRupiah(value)}</span>
    </div>
  );
}

function FinancePage() {
  return (
    <div>
      <PageHeader
        title="Finance"
        description="Utang, piutang, request kas belanja, dan pengeluaran operasional."
      />
      <Tabs defaultValue="utang">
        <TabsList className="mb-4 flex-wrap">
          <TabsTrigger value="utang">Utang</TabsTrigger>
          <TabsTrigger value="piutang">Piutang</TabsTrigger>
          <TabsTrigger value="kas">Request Transfer Kas</TabsTrigger>
          <TabsTrigger value="pengeluaran">Pengeluaran Operasional</TabsTrigger>
        </TabsList>
        <TabsContent value="utang">
          <PayablesTab />
        </TabsContent>
        <TabsContent value="piutang">
          <ReceivablesTab />
        </TabsContent>
        <TabsContent value="kas">
          <CashRequestsTab />
        </TabsContent>
        <TabsContent value="pengeluaran">
          <ExpensesTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}

const emptyInvoice = {
  party: "",
  invoice_no: "",
  amount: "",
  invoice_date: "",
  due_date: "",
  status: "",
  pic: "",
  notes: "",
};

function PayablesTab() {
  const qc = useQueryClient();
  const { data: team = [] } = useTeamNames();
  const [open, setOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState({ ...emptyInvoice, status: "Belum Bayar" });

  const { data: rows = [] } = useQuery({
    queryKey: ["payables"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("payables")
        .select("*")
        .order("due_date", { ascending: true, nullsFirst: false });
      if (error) throw error;
      return data as Payable[];
    },
  });

  const save = useMutation({
    mutationFn: async () => {
      const payload = {
        vendor: form.party.trim(),
        invoice_no: form.invoice_no || null,
        amount: Number(form.amount || 0),
        invoice_date: form.invoice_date || null,
        due_date: form.due_date || null,
        status: form.status,
        pic: form.pic || null,
        notes: form.notes || null,
      };
      if (editId) {
        const { error } = await supabase.from("payables").update(payload).eq("id", editId);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("payables").insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["payables"] });
      toast.success("Data utang disimpan");
      setOpen(false);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("payables").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["payables"] });
      toast.success("Data utang dihapus");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const outstanding = rows
    .filter((r) => r.status === "Belum Bayar")
    .reduce((s, r) => s + Number(r.amount), 0);

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <TotalBar label="Total utang belum bayar" value={outstanding} />
        <Button
          onClick={() => {
            setEditId(null);
            setForm({ ...emptyInvoice, status: "Belum Bayar" });
            setOpen(true);
          }}
        >
          <Plus className="size-4" /> Tambah Utang
        </Button>
      </div>
      <Legend />
      <div className="overflow-hidden rounded-lg border border-border bg-card card-soft">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Vendor</TableHead>
              <TableHead>No Invoice</TableHead>
              <TableHead className="text-right">Jumlah</TableHead>
              <TableHead>Tgl Invoice</TableHead>
              <TableHead>Jatuh Tempo</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>PIC</TableHead>
              <TableHead>Keterangan</TableHead>
              <TableHead className="text-right">Aksi</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.length === 0 ? (
              <TableRow>
                <TableCell colSpan={9} className="text-center text-muted-foreground">
                  Belum ada data.
                </TableCell>
              </TableRow>
            ) : (
              rows.map((r) => {
                const settled = r.status === "Sudah Bayar";
                const level = urgencyOf(r.due_date, settled);
                return (
                  <TableRow key={r.id} className={urgencyRowClass[level]}>
                    <TableCell className="font-medium">{r.vendor}</TableCell>
                    <TableCell>{r.invoice_no ?? "-"}</TableCell>
                    <TableCell className="text-right font-medium">
                      {formatRupiah(r.amount)}
                    </TableCell>
                    <TableCell>{formatDate(r.invoice_date)}</TableCell>
                    <TableCell>
                      <div>{formatDate(r.due_date)}</div>
                      <div className="text-xs text-muted-foreground">
                        {urgencyLabel(r.due_date, settled)}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge className={statusBadge[r.status] ?? "bg-muted"}>{r.status}</Badge>
                    </TableCell>
                    <TableCell>{r.pic ?? "-"}</TableCell>
                    <TableCell className="max-w-[200px] truncate text-muted-foreground">
                      {r.notes ?? "-"}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => {
                            setEditId(r.id);
                            setForm({
                              party: r.vendor,
                              invoice_no: r.invoice_no ?? "",
                              amount: String(r.amount ?? ""),
                              invoice_date: r.invoice_date ?? "",
                              due_date: r.due_date ?? "",
                              status: r.status,
                              pic: r.pic ?? "",
                              notes: r.notes ?? "",
                            });
                            setOpen(true);
                          }}
                        >
                          <Pencil className="size-4" />
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => {
                            if (confirm(`Hapus utang ${r.vendor}?`)) remove.mutate(r.id);
                          }}
                        >
                          <Trash2 className="size-4 text-destructive" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>

      <InvoiceDialog
        open={open}
        setOpen={setOpen}
        title={editId ? "Edit Utang" : "Tambah Utang"}
        partyLabel="Vendor"
        statuses={[...PAYABLE_STATUSES]}
        team={team}
        form={form}
        setForm={setForm}
        onSave={() => {
          if (!form.party.trim()) {
            toast.error("Vendor wajib diisi");
            return;
          }
          save.mutate();
        }}
        saving={save.isPending}
      />
    </div>
  );
}

function ReceivablesTab() {
  const qc = useQueryClient();
  const { data: team = [] } = useTeamNames();
  const [open, setOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState({ ...emptyInvoice, status: "Belum Tertagih" });

  const { data: rows = [] } = useQuery({
    queryKey: ["receivables"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("receivables")
        .select("*")
        .order("due_date", { ascending: true, nullsFirst: false });
      if (error) throw error;
      return data as Receivable[];
    },
  });

  const save = useMutation({
    mutationFn: async () => {
      const payload = {
        client_name: form.party.trim(),
        invoice_no: form.invoice_no || null,
        amount: Number(form.amount || 0),
        invoice_date: form.invoice_date || null,
        due_date: form.due_date || null,
        status: form.status,
        pic: form.pic || null,
        notes: form.notes || null,
      };
      if (editId) {
        const { error } = await supabase.from("receivables").update(payload).eq("id", editId);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("receivables").insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["receivables"] });
      toast.success("Data piutang disimpan");
      setOpen(false);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("receivables").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["receivables"] });
      toast.success("Data piutang dihapus");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const outstanding = rows
    .filter((r) => r.status === "Belum Tertagih")
    .reduce((s, r) => s + Number(r.amount), 0);

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <TotalBar label="Total piutang belum tertagih" value={outstanding} />
        <Button
          onClick={() => {
            setEditId(null);
            setForm({ ...emptyInvoice, status: "Belum Tertagih" });
            setOpen(true);
          }}
        >
          <Plus className="size-4" /> Tambah Piutang
        </Button>
      </div>
      <Legend />
      <div className="overflow-hidden rounded-lg border border-border bg-card card-soft">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Client</TableHead>
              <TableHead>No Invoice</TableHead>
              <TableHead className="text-right">Jumlah</TableHead>
              <TableHead>Tgl Invoice</TableHead>
              <TableHead>Jatuh Tempo</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>PIC</TableHead>
              <TableHead>Keterangan</TableHead>
              <TableHead className="text-right">Aksi</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.length === 0 ? (
              <TableRow>
                <TableCell colSpan={9} className="text-center text-muted-foreground">
                  Belum ada data.
                </TableCell>
              </TableRow>
            ) : (
              rows.map((r) => {
                const settled = r.status === "Lunas";
                const level = urgencyOf(r.due_date, settled);
                return (
                  <TableRow key={r.id} className={urgencyRowClass[level]}>
                    <TableCell className="font-medium">{r.client_name}</TableCell>
                    <TableCell>{r.invoice_no ?? "-"}</TableCell>
                    <TableCell className="text-right font-medium">
                      {formatRupiah(r.amount)}
                    </TableCell>
                    <TableCell>{formatDate(r.invoice_date)}</TableCell>
                    <TableCell>
                      <div>{formatDate(r.due_date)}</div>
                      <div className="text-xs text-muted-foreground">
                        {urgencyLabel(r.due_date, settled)}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge className={statusBadge[r.status] ?? "bg-muted"}>{r.status}</Badge>
                    </TableCell>
                    <TableCell>{r.pic ?? "-"}</TableCell>
                    <TableCell className="max-w-[200px] truncate text-muted-foreground">
                      {r.notes ?? "-"}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => {
                            setEditId(r.id);
                            setForm({
                              party: r.client_name,
                              invoice_no: r.invoice_no ?? "",
                              amount: String(r.amount ?? ""),
                              invoice_date: r.invoice_date ?? "",
                              due_date: r.due_date ?? "",
                              status: r.status,
                              pic: r.pic ?? "",
                              notes: r.notes ?? "",
                            });
                            setOpen(true);
                          }}
                        >
                          <Pencil className="size-4" />
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => {
                            if (confirm(`Hapus piutang ${r.client_name}?`)) remove.mutate(r.id);
                          }}
                        >
                          <Trash2 className="size-4 text-destructive" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>

      <InvoiceDialog
        open={open}
        setOpen={setOpen}
        title={editId ? "Edit Piutang" : "Tambah Piutang"}
        partyLabel="Client"
        statuses={[...RECEIVABLE_STATUSES]}
        team={team}
        form={form}
        setForm={setForm}
        onSave={() => {
          if (!form.party.trim()) {
            toast.error("Nama client wajib diisi");
            return;
          }
          save.mutate();
        }}
        saving={save.isPending}
      />
    </div>
  );
}

type InvoiceForm = typeof emptyInvoice;

function InvoiceDialog({
  open,
  setOpen,
  title,
  partyLabel,
  statuses,
  team,
  form,
  setForm,
  onSave,
  saving,
}: {
  open: boolean;
  setOpen: (v: boolean) => void;
  title: string;
  partyLabel: string;
  statuses: string[];
  team: string[];
  form: InvoiceForm;
  setForm: (v: InvoiceForm) => void;
  onSave: () => void;
  saving: boolean;
}) {
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>
        <div className="grid gap-3">
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="grid gap-1.5">
              <Label>{partyLabel}</Label>
              <Input
                value={form.party}
                onChange={(e) => setForm({ ...form, party: e.target.value })}
              />
            </div>
            <div className="grid gap-1.5">
              <Label>No Invoice</Label>
              <Input
                value={form.invoice_no}
                onChange={(e) => setForm({ ...form, invoice_no: e.target.value })}
              />
            </div>
          </div>
          <div className="grid gap-1.5">
            <Label>Jumlah (Rp)</Label>
            <Input
              type="number"
              value={form.amount}
              onChange={(e) => setForm({ ...form, amount: e.target.value })}
            />
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="grid gap-1.5">
              <Label>Tanggal Invoice</Label>
              <Input
                type="date"
                value={form.invoice_date}
                onChange={(e) => setForm({ ...form, invoice_date: e.target.value })}
              />
            </div>
            <div className="grid gap-1.5">
              <Label>Jatuh Tempo</Label>
              <Input
                type="date"
                value={form.due_date}
                onChange={(e) => setForm({ ...form, due_date: e.target.value })}
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
                  {statuses.map((s) => (
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
            <Label>Keterangan</Label>
            <Textarea
              rows={2}
              value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            Batal
          </Button>
          <Button onClick={onSave} disabled={saving}>
            Simpan
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function CashRequestsTab() {
  const qc = useQueryClient();
  const { data: team = [] } = useTeamNames();
  const [open, setOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState({
    purpose: "",
    request_date: new Date().toISOString().slice(0, 10),
    amount: "",
    pic: "",
    status: "Pending",
    notes: "",
  });

  const { data: rows = [] } = useQuery({
    queryKey: ["cash_requests"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("cash_requests")
        .select("*")
        .order("request_date", { ascending: false });
      if (error) throw error;
      return data as CashRequest[];
    },
  });

  const save = useMutation({
    mutationFn: async () => {
      const payload = {
        purpose: form.purpose.trim(),
        request_date: form.request_date || new Date().toISOString().slice(0, 10),
        amount: Number(form.amount || 0),
        pic: form.pic || null,
        status: form.status,
        notes: form.notes || null,
      };
      if (editId) {
        const { error } = await supabase.from("cash_requests").update(payload).eq("id", editId);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("cash_requests").insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["cash_requests"] });
      toast.success("Request kas disimpan");
      setOpen(false);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("cash_requests").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["cash_requests"] });
      toast.success("Request kas dihapus");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const pendingTotal = rows
    .filter((r) => r.status === "Pending")
    .reduce((s, r) => s + Number(r.amount), 0);

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <TotalBar label="Total request pending" value={pendingTotal} />
        <Button
          onClick={() => {
            setEditId(null);
            setForm({
              purpose: "",
              request_date: new Date().toISOString().slice(0, 10),
              amount: "",
              pic: "",
              status: "Pending",
              notes: "",
            });
            setOpen(true);
          }}
        >
          <Plus className="size-4" /> Tambah Request
        </Button>
      </div>
      <div className="overflow-hidden rounded-lg border border-border bg-card card-soft">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Keperluan</TableHead>
              <TableHead>Tanggal Request</TableHead>
              <TableHead className="text-right">Jumlah</TableHead>
              <TableHead>PIC Belanja</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Keterangan</TableHead>
              <TableHead className="text-right">Aksi</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center text-muted-foreground">
                  Belum ada data.
                </TableCell>
              </TableRow>
            ) : (
              rows.map((r) => (
                <TableRow key={r.id}>
                  <TableCell className="font-medium">{r.purpose}</TableCell>
                  <TableCell>{formatDate(r.request_date)}</TableCell>
                  <TableCell className="text-right font-medium">{formatRupiah(r.amount)}</TableCell>
                  <TableCell>{r.pic ?? "-"}</TableCell>
                  <TableCell>
                    <Badge className={statusBadge[r.status] ?? "bg-muted"}>{r.status}</Badge>
                  </TableCell>
                  <TableCell className="max-w-[220px] truncate text-muted-foreground">
                    {r.notes ?? "-"}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1">
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => {
                          setEditId(r.id);
                          setForm({
                            purpose: r.purpose,
                            request_date: r.request_date,
                            amount: String(r.amount ?? ""),
                            pic: r.pic ?? "",
                            status: r.status,
                            notes: r.notes ?? "",
                          });
                          setOpen(true);
                        }}
                      >
                        <Pencil className="size-4" />
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => {
                          if (confirm("Hapus request ini?")) remove.mutate(r.id);
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
            <DialogTitle>{editId ? "Edit Request Kas" : "Tambah Request Kas"}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-3">
            <div className="grid gap-1.5">
              <Label>Keperluan</Label>
              <Input
                value={form.purpose}
                onChange={(e) => setForm({ ...form, purpose: e.target.value })}
              />
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="grid gap-1.5">
                <Label>Tanggal Request</Label>
                <Input
                  type="date"
                  value={form.request_date}
                  onChange={(e) => setForm({ ...form, request_date: e.target.value })}
                />
              </div>
              <div className="grid gap-1.5">
                <Label>Jumlah (Rp)</Label>
                <Input
                  type="number"
                  value={form.amount}
                  onChange={(e) => setForm({ ...form, amount: e.target.value })}
                />
              </div>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="grid gap-1.5">
                <Label>PIC Belanja</Label>
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
              <div className="grid gap-1.5">
                <Label>Status</Label>
                <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {CASH_REQUEST_STATUSES.map((s) => (
                      <SelectItem key={s} value={s}>
                        {s}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid gap-1.5">
              <Label>Keterangan</Label>
              <Textarea
                rows={2}
                value={form.notes}
                onChange={(e) => setForm({ ...form, notes: e.target.value })}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>
              Batal
            </Button>
            <Button
              onClick={() => {
                if (!form.purpose.trim()) {
                  toast.error("Keperluan wajib diisi");
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

function ExpensesTab() {
  const qc = useQueryClient();
  const { data: team = [] } = useTeamNames();
  const [open, setOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [categoryFilter, setCategoryFilter] = useState("Semua");
  const [form, setForm] = useState({
    description: "",
    expense_date: new Date().toISOString().slice(0, 10),
    category: "Operasional Kantor",
    amount: "",
    status: "Draft",
    pic: "",
  });

  const { data: rows = [] } = useQuery({
    queryKey: ["expenses"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("expenses")
        .select("*")
        .order("expense_date", { ascending: false });
      if (error) throw error;
      return data as Expense[];
    },
  });

  const save = useMutation({
    mutationFn: async () => {
      const payload = {
        description: form.description.trim(),
        expense_date: form.expense_date || new Date().toISOString().slice(0, 10),
        category: form.category,
        amount: Number(form.amount || 0),
        status: form.status,
        pic: form.pic || null,
      };
      if (editId) {
        const { error } = await supabase.from("expenses").update(payload).eq("id", editId);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("expenses").insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["expenses"] });
      toast.success("Pengeluaran disimpan");
      setOpen(false);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("expenses").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["expenses"] });
      toast.success("Pengeluaran dihapus");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const shown =
    categoryFilter === "Semua" ? rows : rows.filter((r) => r.category === categoryFilter);
  const total = shown.reduce((s, r) => s + Number(r.amount), 0);

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <TotalBar label="Total pengeluaran (tampil)" value={total} />
        <Button
          onClick={() => {
            setEditId(null);
            setForm({
              description: "",
              expense_date: new Date().toISOString().slice(0, 10),
              category: "Operasional Kantor",
              amount: "",
              status: "Draft",
              pic: "",
            });
            setOpen(true);
          }}
        >
          <Plus className="size-4" /> Tambah Pengeluaran
        </Button>
      </div>

      <div className="mb-3 w-full max-w-xs">
        <Select value={categoryFilter} onValueChange={setCategoryFilter}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {["Semua", ...EXPENSE_CATEGORIES].map((c) => (
              <SelectItem key={c} value={c}>
                {c}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="overflow-hidden rounded-lg border border-border bg-card card-soft">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Deskripsi</TableHead>
              <TableHead>Tanggal</TableHead>
              <TableHead>Kategori</TableHead>
              <TableHead className="text-right">Jumlah</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>PIC</TableHead>
              <TableHead className="text-right">Aksi</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {shown.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center text-muted-foreground">
                  Belum ada data.
                </TableCell>
              </TableRow>
            ) : (
              shown.map((r) => (
                <TableRow key={r.id}>
                  <TableCell className="font-medium">{r.description}</TableCell>
                  <TableCell>{formatDate(r.expense_date)}</TableCell>
                  <TableCell>{r.category}</TableCell>
                  <TableCell className="text-right font-medium">{formatRupiah(r.amount)}</TableCell>
                  <TableCell>
                    <Badge className={statusBadge[r.status] ?? "bg-muted"}>{r.status}</Badge>
                  </TableCell>
                  <TableCell>{r.pic ?? "-"}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1">
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => {
                          setEditId(r.id);
                          setForm({
                            description: r.description,
                            expense_date: r.expense_date,
                            category: r.category,
                            amount: String(r.amount ?? ""),
                            status: r.status,
                            pic: r.pic ?? "",
                          });
                          setOpen(true);
                        }}
                      >
                        <Pencil className="size-4" />
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => {
                          if (confirm("Hapus pengeluaran ini?")) remove.mutate(r.id);
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
            <DialogTitle>{editId ? "Edit Pengeluaran" : "Tambah Pengeluaran"}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-3">
            <div className="grid gap-1.5">
              <Label>Deskripsi</Label>
              <Input
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
              />
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="grid gap-1.5">
                <Label>Tanggal</Label>
                <Input
                  type="date"
                  value={form.expense_date}
                  onChange={(e) => setForm({ ...form, expense_date: e.target.value })}
                />
              </div>
              <div className="grid gap-1.5">
                <Label>Jumlah (Rp)</Label>
                <Input
                  type="number"
                  value={form.amount}
                  onChange={(e) => setForm({ ...form, amount: e.target.value })}
                />
              </div>
            </div>
            <div className="grid gap-1.5">
              <Label>Kategori</Label>
              <Select value={form.category} onValueChange={(v) => setForm({ ...form, category: v })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {EXPENSE_CATEGORIES.map((c) => (
                    <SelectItem key={c} value={c}>
                      {c}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="grid gap-1.5">
                <Label>Status</Label>
                <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {EXPENSE_STATUSES.map((s) => (
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
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>
              Batal
            </Button>
            <Button
              onClick={() => {
                if (!form.description.trim()) {
                  toast.error("Deskripsi wajib diisi");
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
