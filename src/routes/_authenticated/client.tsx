import { useTenantQuery as useQuery } from "@/hooks/use-tenant-query";
import { createFileRoute } from "@tanstack/react-router";


import { tenantClient as supabase } from "@/lib/tenant-client";
import { PageHeader } from "@/components/page-header";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export const Route = createFileRoute("/_authenticated/client")({
  head: () => ({
    meta: [
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { title: "Client — Sedyain Indonesia" },
      {
        name: "description",
        content:
          "Ringkasan per client Sedyain: PIC penanggung jawab, nomor invoice terakhir, dan nomor surat jalan terakhir.",
      },
      { property: "og:title", content: "Client — Sedyain Indonesia" },
      {
        property: "og:description",
        content: "Rekap client beserta invoice dan surat jalan terakhirnya.",
      },
    ],
  }),
  component: ClientPage,
});

type Row = {
  name: string;
  pic: string | null;
  lastInvoice: string | null;
  lastDo: string | null;
};

function ClientPage() {
  const { data: rows = [], isLoading } = useQuery({
    queryKey: ["client-summary"],
    queryFn: async (): Promise<Row[]> => {
      const [clientsRes, ordersRes, shipmentsRes] = await Promise.all([
        supabase.from("clients").select("name, pic"),
        supabase
          .from("orders")
          .select("id, client_name, invoice_number, invoice_date, created_by, created_at")
          .order("invoice_date", { ascending: false }),
        supabase
          .from("shipments")
          .select("order_id, do_number, delivery_date, created_at")
          .order("delivery_date", { ascending: false }),
      ]);
      if (clientsRes.error) throw clientsRes.error;
      if (ordersRes.error) throw ordersRes.error;
      if (shipmentsRes.error) throw shipmentsRes.error;

      const clients = clientsRes.data ?? [];
      const orders = ordersRes.data ?? [];
      const shipments = shipmentsRes.data ?? [];

      const key = (n: string) => n.trim().toLowerCase();
      const map = new Map<string, Row>();

      for (const c of clients) {
        map.set(key(c.name), {
          name: c.name.trim(),
          pic: c.pic ?? null,
          lastInvoice: null,
          lastDo: null,
        });
      }

      const orderById = new Map(orders.map((o) => [o.id, o]));

      // orders sudah terurut invoice_date desc — ambil yang pertama per client
      for (const o of orders) {
        const k = key(o.client_name);
        const existing = map.get(k);
        if (!existing) {
          map.set(k, {
            name: o.client_name.trim(),
            pic: o.created_by ?? null,
            lastInvoice: o.invoice_number ?? null,
            lastDo: null,
          });
          continue;
        }
        if (!existing.lastInvoice) existing.lastInvoice = o.invoice_number ?? null;
        if (!existing.pic) existing.pic = o.created_by ?? null;
      }

      // shipments terurut delivery_date desc
      for (const s of shipments) {
        const o = orderById.get(s.order_id);
        if (!o) continue;
        const entry = map.get(key(o.client_name));
        if (entry && !entry.lastDo) entry.lastDo = s.do_number ?? null;
      }

      return [...map.values()].sort((a, b) => a.name.localeCompare(b.name, "id"));
    },
  });

  return (
    <div>
      <PageHeader
        title="Client"
        description="Rekap tiap client: PIC, nomor invoice terakhir, dan nomor surat jalan terakhir."
      />

      <div className="rounded-lg border border-border bg-card card-soft">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="min-w-40">Nama Client</TableHead>
              <TableHead className="min-w-32">PIC</TableHead>
              <TableHead className="min-w-56">No. Invoice Terakhir</TableHead>
              <TableHead className="min-w-56">No. Surat Jalan Terakhir</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={4} className="text-center text-sm text-muted-foreground">
                  Memuat...
                </TableCell>
              </TableRow>
            ) : rows.length === 0 ? (
              <TableRow>
                <TableCell colSpan={4} className="text-center text-sm text-muted-foreground">
                  Belum ada data client.
                </TableCell>
              </TableRow>
            ) : (
              rows.map((r) => (
                <TableRow key={r.name}>
                  <TableCell className="font-medium">{r.name}</TableCell>
                  <TableCell className="text-sm">{r.pic || "-"}</TableCell>
                  <TableCell className="text-xs">{r.lastInvoice || "-"}</TableCell>
                  <TableCell className="text-xs">{r.lastDo || "-"}</TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
