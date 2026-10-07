import { useAccess } from "@/hooks/use-access";
import { useArchive } from "@/components/archive-dialog";
import { useTenantQuery as useQuery } from "@/hooks/use-tenant-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { FileText, Plus, Trash2, Truck, Pencil } from "lucide-react";
import { toast } from "sonner";

import { tenantClient as supabase } from "@/lib/tenant-client";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatRupiah, formatDate } from "@/lib/sedyain";
import { docTotal } from "@/lib/docs";

export const Route = createFileRoute("/_authenticated/orders/")({
  head: () => ({
    meta: [
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { title: "Order & Dokumen — Sedyain Indonesia" },
      {
        name: "description",
        content:
          "Kelola order client HORECA lalu cetak invoice dan surat jalan siap PDF sesuai template resmi Sedyain.",
      },
      { property: "og:title", content: "Order & Dokumen — Sedyain Indonesia" },
      {
        property: "og:description",
        content: "Buat order, generate invoice dan surat jalan print-ready, lalu kirim pengiriman.",
      },
    ],
  }),
  component: OrdersPage,
});

type Order = {
  id: string;
  client_name: string;
  client_address: string | null;
  po_number: string | null;
  section: string | null;
  invoice_number: string | null;
  invoice_date: string | null;
  due_date: string | null;
  notes: string | null;
  created_by: string | null;
};

type ItemRow = {
  id?: string; item_name: string; qty: string; unit: string; price: string };

const emptyItem: ItemRow = { item_name: "", qty: "1", unit: "kg", price: "0" };
const emptyForm = {
  client_name: "",
  client_address: "",
  po_number: "",
  section: "KITCHEN",
  invoice_number: "",
  invoice_date: new Date().toISOString().slice(0, 10),
  due_date: "",
  notes: "",
  created_by: "",
};

function OrdersPage() {
  const qc = useQueryClient();
  const {can}=useAccess();
  const [open, setOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [items, setItems] = useState<ItemRow[]>([{ ...emptyItem }]);

  const { data: orders = [], isLoading } = useQuery({
    queryKey: ["orders"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("orders")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as Order[];
    },
  });

  const { data: allItems = [] } = useQuery({
    queryKey: ["order-items-all"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("order_items")
        .select("order_id, qty, price");
      if (error) throw error;
      return data ?? [];
    },
  });

  const { data: shipments = [] } = useQuery({
    queryKey: ["shipments"], enabled:can("shipments"),
    queryFn: async () => {
      const { data, error } = await supabase.from("shipments").select("id, order_id");
      if (error) throw error;
      return data ?? [];
    },
  });

  const totalOf = (orderId: string) =>
    docTotal(
      allItems
        .filter((i) => i.order_id === orderId)
        .map((i) => ({ qty: Number(i.qty), price: Number(i.price) })),
    );

  // Auto-suggest nomor invoice untuk order baru (tetap bisa diedit manual)
  const [invoiceTouched, setInvoiceTouched] = useState(false);
  useEffect(() => {
    if (!open || editId || invoiceTouched || !form.client_name.trim() || !form.invoice_date) return;
    let cancelled=false;
    supabase.rpc('suggest_invoice_number',{p_client_name:form.client_name,p_invoice_date:form.invoice_date}).then(({data,error})=>{
      if(!cancelled&&!error&&data) setForm(f=>({...f,invoice_number:data}));
    });
    return ()=>{cancelled=true;};
  }, [open, editId, invoiceTouched, form.client_name, form.invoice_date]);

  const save = useMutation({
    mutationFn: async () => {
      const payload = {
        client_name: form.client_name.trim(),
        client_address: form.client_address || null,
        po_number: form.po_number || null,
        section: form.section || null,
        invoice_number: form.invoice_number || null,
        invoice_date: form.invoice_date || null,
        due_date: form.due_date || null,
        notes: form.notes || null,
        created_by: form.created_by || null,
      };
      const rows = items.map(i=>({id:i.id,item_name:i.item_name.trim(),qty:Number(i.qty),unit:i.unit||'pcs',price:Number(i.price)}));
      if(rows.some(i=>!i.item_name||!Number.isFinite(i.qty)||i.qty<=0||!Number.isFinite(i.price)||i.price<0)) throw new Error('Nama item, qty positif dan harga valid wajib');
      const {error}=await supabase.rpc('save_order_atomic',{p_order_id:editId as string,p_order:{...payload,invoice_number:invoiceTouched?payload.invoice_number:null},p_items:rows});
      if(error)throw error;
    },
    onSuccess: () => {
      toast.success(editId ? "Order diperbarui" : "Order dibuat");
      setOpen(false);
      qc.invalidateQueries();
      qc.invalidateQueries();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const archive = useArchive();
  const remove = useMutation({
    mutationFn: async (id: string) => {
      return archive("orders", id);
    },
    onSuccess: () => {
      qc.invalidateQueries();
      qc.invalidateQueries();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const createShipment = useMutation({
    mutationFn: async (order: Order) => {
      const {data,error}=await supabase.rpc('create_shipment_atomic',{p_order_id:order.id});
      if(error)throw error;
      return data;
    },
    onSuccess: () => {
      toast.success("Pengiriman dibuat — atur status di menu Pengiriman");
      qc.invalidateQueries();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  async function openEdit(order: Order) {
    setEditId(order.id);
    setInvoiceTouched(true);
    setForm({
      client_name: order.client_name,
      client_address: order.client_address ?? "",
      po_number: order.po_number ?? "",
      section: order.section ?? "",
      invoice_number: order.invoice_number ?? "",
      invoice_date: order.invoice_date ?? "",
      due_date: order.due_date ?? "",
      notes: order.notes ?? "",
      created_by: order.created_by ?? "",
    });
    const { data, error } = await supabase
      .from("order_items")
      .select("*")
      .eq("order_id", order.id)
      .order("position");
    if(error){toast.error("Gagal memuat item order");return;}
    setItems(
      (data ?? []).map((i) => ({
        id: i.id,
        item_name: i.item_name,
        qty: String(i.qty),
        unit: i.unit,
        price: String(i.price),
      })),
    );
    setOpen(true);
  }

  return (
    <div>
      <PageHeader
        title="Order & Dokumen"
        description="Sumber data invoice dan surat jalan. Satu order bisa menghasilkan keduanya."
        actions={
          <Button
            onClick={() => {
              setEditId(null);
              setInvoiceTouched(false);
              setForm(emptyForm);
              setItems([{ ...emptyItem }]);
              setOpen(true);
            }}
          >
            <Plus className="size-4" /> Order Baru
          </Button>
        }
      />

      <div className="overflow-x-auto rounded-lg border border-border bg-card card-soft">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Client</TableHead>
              <TableHead>No. Invoice</TableHead>
              <TableHead>PO</TableHead>
              <TableHead>Jatuh Tempo</TableHead>
              <TableHead className="text-right">Total</TableHead>
              <TableHead className="text-right">Dokumen</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center text-sm text-muted-foreground">
                  Memuat...
                </TableCell>
              </TableRow>
            ) : orders.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center text-sm text-muted-foreground">
                  Belum ada order.
                </TableCell>
              </TableRow>
            ) : (
              orders.map((o) => (
                <TableRow key={o.id}>
                  <TableCell className="font-medium">
                    {o.client_name}
                    <span className="block text-xs text-muted-foreground">{o.section}</span>
                  </TableCell>
                  <TableCell className="text-xs">{o.invoice_number ?? "-"}</TableCell>
                  <TableCell className="text-xs">{o.po_number ?? "-"}</TableCell>
                  <TableCell className="text-xs">{formatDate(o.due_date)}</TableCell>
                  <TableCell className="text-right font-semibold">
                    {formatRupiah(totalOf(o.id))}
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-wrap items-center justify-end gap-1">
                      <Button asChild size="sm" variant="outline">
                        <Link to="/orders/$orderId/invoice" params={{ orderId: o.id }}>
                          <FileText className="size-4" /> Invoice
                        </Link>
                      </Button>
                      <Button asChild size="sm" variant="outline">
                        <Link to="/orders/$orderId/surat-jalan" params={{ orderId: o.id }}>
                          <FileText className="size-4" /> Surat Jalan
                        </Link>
                      </Button>
                      <Button
                        size="sm"
                        variant="secondary"
                        disabled={shipments.some((s) => s.order_id === o.id)}
                        onClick={() => createShipment.mutate(o)}
                      >
                        <Truck className="size-4" />
                        {shipments.some((s) => s.order_id === o.id) ? "Ada Pengiriman" : "Kirim"}
                      </Button>
                      <Button size="icon" variant="ghost" onClick={() => openEdit(o)}>
                        <Pencil className="size-4" />
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => remove.mutate(o.id)}
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
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-3xl">
          <DialogHeader>
            <DialogTitle>{editId ? "Edit Order" : "Order Baru"}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <Label>Nama Client</Label>
              <Input
                value={form.client_name}
                onChange={(e) => setForm({ ...form, client_name: e.target.value })}
                placeholder="RUMARASA"
              />
            </div>
            <div className="sm:col-span-2">
              <Label>Alamat Client</Label>
              <Textarea
                value={form.client_address}
                onChange={(e) => setForm({ ...form, client_address: e.target.value })}
              />
            </div>
            <div>
              <Label>PO Number</Label>
              <Input
                value={form.po_number}
                onChange={(e) => setForm({ ...form, po_number: e.target.value })}
              />
            </div>
            <div>
              <Label>Section</Label>
              <Input
                value={form.section}
                onChange={(e) => setForm({ ...form, section: e.target.value })}
                placeholder="KITCHEN"
              />
            </div>
            <div>
              <Label>Invoice Number</Label>
              <Input
                value={form.invoice_number}
                onChange={(e) => {
                  setInvoiceTouched(true);
                  setForm({ ...form, invoice_number: e.target.value });
                }}
                placeholder="164/SDY/INV/RUMARASA/1482026"
              />
            </div>
            <div>
              <Label>PIC / Dibuat oleh</Label>
              <Input
                value={form.created_by}
                onChange={(e) => setForm({ ...form, created_by: e.target.value })}
              />
            </div>
            <div>
              <Label>Tanggal Invoice</Label>
              <Input
                type="date"
                value={form.invoice_date}
                onChange={(e) => setForm({ ...form, invoice_date: e.target.value })}
              />
            </div>
            <div>
              <Label>Due Date</Label>
              <Input
                type="date"
                value={form.due_date}
                onChange={(e) => setForm({ ...form, due_date: e.target.value })}
              />
            </div>
          </div>

          <div className="mt-2">
            <div className="mb-2 flex items-center justify-between">
              <Label>Item Order</Label>
              <Button
                size="sm"
                variant="outline"
                onClick={() => setItems([...items, { ...emptyItem }])}
              >
                <Plus className="size-4" /> Tambah Item
              </Button>
            </div>
            <div className="space-y-2 overflow-x-auto">
              {items.map((it, idx) => (
                <div key={idx} className="grid min-w-[620px] grid-cols-12 gap-2">
                  <Input
                    className="col-span-5"
                    placeholder="Nama & deskripsi item"
                    value={it.item_name}
                    onChange={(e) => {
                      const next = [...items];
                      next[idx] = { ...it, item_name: e.target.value };
                      setItems(next);
                    }}
                  />
                  <Input
                    className="col-span-2"
                    type="number"
                    placeholder="Qty"
                    value={it.qty}
                    onChange={(e) => {
                      const next = [...items];
                      next[idx] = { ...it, qty: e.target.value };
                      setItems(next);
                    }}
                  />
                  <Input
                    className="col-span-2"
                    placeholder="Unit"
                    value={it.unit}
                    onChange={(e) => {
                      const next = [...items];
                      next[idx] = { ...it, unit: e.target.value };
                      setItems(next);
                    }}
                  />
                  <Input
                    className="col-span-2"
                    type="number"
                    placeholder="Harga"
                    value={it.price}
                    onChange={(e) => {
                      const next = [...items];
                      next[idx] = { ...it, price: e.target.value };
                      setItems(next);
                    }}
                  />
                  <Button
                    className="col-span-1"
                    size="icon"
                    variant="ghost"
                    onClick={async () => {
                       if(it.id){const result=await archive('order_items',it.id);if(result!=='archived')return;}
                       setItems(items.filter((_,i)=>i!==idx));
                     }}
                  >
                    <Trash2 className="size-4 text-destructive" />
                  </Button>
                </div>
              ))}
            </div>
            <p className="mt-2 text-right text-sm font-semibold">
              Total:{" "}
              {formatRupiah(
                docTotal(items.map((i) => ({ qty: Number(i.qty), price: Number(i.price) }))),
              )}
            </p>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>
              Batal
            </Button>
            <Button
              disabled={!form.client_name.trim() || save.isPending}
              onClick={() => save.mutate()}
            >
              Simpan
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
