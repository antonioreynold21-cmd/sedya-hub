import { useTenantQuery as useQuery } from "@/hooks/use-tenant-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Copy, ExternalLink, FileText } from "lucide-react";
import { toast } from "sonner";

import { tenantClient as supabase } from "@/lib/tenant-client";
import { PageHeader } from "@/components/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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
import { SHIPMENT_STATUSES } from "@/lib/docs";
import { formatDate } from "@/lib/sedyain";

export const Route = createFileRoute("/_authenticated/shipments")({
  head: () => ({
    meta: [
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { title: "Pengiriman — Sedyain Indonesia" },
      {
        name: "description",
        content:
          "Pantau dan perbarui status pengiriman bahan baku HORECA serta bagikan link tracking publik ke client.",
      },
      { property: "og:title", content: "Pengiriman — Sedyain Indonesia" },
      {
        property: "og:description",
        content: "Update status kurir per surat jalan dan bagikan link tracking tanpa login.",
      },
    ],
  }),
  component: ShipmentsPage,
});

const statusTone: Record<string, string> = {
  Menunggu: "bg-muted text-muted-foreground",
  Dikemas: "bg-accent/20 text-accent-foreground",
  "Dalam Perjalanan": "bg-primary/15 text-primary",
  Terkirim: "bg-primary text-primary-foreground",
};

function ShipmentsPage() {
  const qc = useQueryClient();

  const { data: shipments = [], isLoading } = useQuery({
    queryKey: ["shipments-full"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("shipments")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const updateStatus = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const { error } = await supabase
        .from("shipments")
        .update({
          status,
          ...(status === "Terkirim" ? { received_at: new Date().toISOString() } : {}),
        })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Status pengiriman diperbarui");
      qc.invalidateQueries();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  function trackUrl(token: string) {
    const origin = typeof window === "undefined" ? "" : window.location.origin;
    return `${origin}/t/${token}`;
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Pengiriman"
        description="Update status kurir per surat jalan dan bagikan link tracking publik ke client lewat WhatsApp."
      />

      <div className="rounded-lg border border-border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Ship To</TableHead>
              <TableHead>DO Number</TableHead>
              <TableHead>Tanggal Kirim</TableHead>
              <TableHead>Kurir / Delivery By</TableHead>
              <TableHead>Diterima Oleh</TableHead>
              <TableHead className="w-[190px]">Status</TableHead>
              <TableHead className="text-right">Aksi</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={7} className="py-8 text-center text-muted-foreground">
                  Memuat data pengiriman…
                </TableCell>
              </TableRow>
            ) : shipments.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="py-8 text-center text-muted-foreground">
                  Belum ada pengiriman. Buat dari menu Order &amp; Dokumen.
                </TableCell>
              </TableRow>
            ) : (
              shipments.map((s) => (
                <TableRow key={s.id}>
                  <TableCell className="font-medium">{s.ship_to}</TableCell>
                  <TableCell>{s.do_number ?? "-"}</TableCell>
                  <TableCell>{s.delivery_date ? formatDate(s.delivery_date) : "-"}</TableCell>
                  <TableCell>{s.delivery_by ?? "-"}</TableCell>
                  <TableCell>
                    {s.received_by ? (
                      <span>
                        {s.received_by}
                        <Badge className="ml-2 bg-primary text-primary-foreground">
                          Dikonfirmasi
                        </Badge>
                      </span>
                    ) : (
                      <span className="text-muted-foreground">Belum</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Badge className={statusTone[s.status] ?? "bg-muted"}>{s.status}</Badge>
                      <Select
                        value={s.status}
                        onValueChange={(v) => updateStatus.mutate({ id: s.id, status: v })}
                      >
                        <SelectTrigger className="h-8 w-[110px]">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {SHIPMENT_STATUSES.map((st) => (
                            <SelectItem key={st} value={st}>
                              {st}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex justify-end gap-1">
                      <Button asChild variant="ghost" size="sm">
                        <Link to="/orders/$orderId/surat-jalan" params={{ orderId: s.order_id }}>
                          <FileText className="size-4" /> Surat Jalan
                        </Link>
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          navigator.clipboard.writeText(trackUrl(s.public_token));
                          toast.success("Link tracking dikopi");
                        }}
                      >
                        <Copy className="size-4" /> Link
                      </Button>
                      <Button asChild variant="ghost" size="sm">
                        <Link to="/t/$token" params={{ token: s.public_token }} target="_blank">
                          <ExternalLink className="size-4" />
                        </Link>
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
