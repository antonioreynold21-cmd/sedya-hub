import { useAccess } from "@/hooks/use-access";
import { useTenantQuery as useQuery } from "@/hooks/use-tenant-query";
import { createFileRoute, Link } from "@tanstack/react-router";

import { ArrowLeft, Printer } from "lucide-react";

import { tenantClient as supabase } from "@/lib/tenant-client";
import { Button } from "@/components/ui/button";
import { DocumentBrand, BrandRibbon, ContactBlock, DocHeader, DocSheet } from "@/components/doc-shell";
import { BRAND_GREEN, DELIVERY_TERMS, formatDocDate } from "@/lib/docs";
import { useState, Fragment } from "react";
import { groupOrderItems } from "@/lib/item-groups";
import { ShipmentTeamDialog } from "@/components/shipment-team-dialog";
import { shipmentName } from "@/lib/client-code";

export const Route = createFileRoute("/_authenticated/orders/$orderId/surat-jalan")({
  head: () => ({
    meta: [
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { title: "Surat Jalan — Sedyain Indonesia" },
      {
        name: "description",
        content:
          "Surat jalan resmi PT Sedyain Berhasil Bersama, siap cetak dengan blok tanda tangan dan syarat pengiriman.",
      },
      { property: "og:title", content: "Surat Jalan — Sedyain Indonesia" },
      {
        property: "og:description",
        content: "Surat jalan print-ready sesuai template resmi Sedyain.",
      },
    ],
  }),
  component: SuratJalanPage,
});

function SignatureBox({ label, name }: { label: string; name: string | null | undefined }) {
  return (
    <div className="text-[11px]">
      <p className="font-bold">{label}</p>
      <div className="mt-12 border-b border-neutral-500" />
      <p className="mt-1 break-all text-center">{shipmentName(name)}</p>
    </div>
  );
}

function SuratJalanPage() {
  const { orderId } = Route.useParams();
  const {can}=useAccess();
  const [assignOpen, setAssignOpen] = useState(false);

  const { data, isPending, isError, refetch } = useQuery({
    throwOnError:false,
    queryKey: ["surat-jalan", orderId],
    queryFn: async () => {
      const [order, items, shipment] = await Promise.all([
        supabase.from("orders").select("*").eq("id", orderId).single(),
        supabase.from("order_items").select("*").eq("order_id", orderId).order("position"),
        can('shipments') ? supabase
          .from("shipments")
          .select("*")
          .eq("order_id", orderId)
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle() : Promise.resolve({data:null,error:null}),
      ]);
      if (order.error) throw order.error;
      if (items.error) throw items.error;
      if (shipment.error) throw shipment.error;
      return { order: order.data, items: items.data ?? [], shipment: shipment.data };
    },
  });

  if (!can('shipments')) return <p role="alert" className="p-6">Data Surat Jalan tidak berizin: akses modul Pengiriman diperlukan.</p>;
  const order = data?.order;
  const items = data?.items ?? [];
  const shipment = data?.shipment;

  if(isError)return <div role="alert" className="no-print p-6">Dokumen gagal dimuat. <Button onClick={()=>refetch()}>Coba lagi</Button></div>;
  if(!isPending && (!order || !items.length || !shipment || order.invoice_state!=='issued' || !order.brand_snapshot)) return <p role="alert" className="no-print p-6">Surat jalan belum tersedia: invoice harus terbit, pengiriman dan item wajib ada.</p>;
  if(isPending)return <p className="p-6 text-sm text-muted-foreground">Memuat dokumen…</p>;
  return (
    <div className="min-h-screen bg-neutral-100 py-6 print:bg-white print:py-0">
      <div className="no-print mx-auto mb-4 flex max-w-[820px] items-center justify-between px-4">
        <Button asChild variant="outline" size="sm">
          <Link to="/orders">
            <ArrowLeft className="size-4" /> Kembali
          </Link>
        </Button>
        <div className="flex gap-2"><Button size="sm" variant="outline" onClick={() => setAssignOpen(true)}>Assign tim</Button><Button size="sm" onClick={() => window.print()}>
          <Printer className="size-4" /> Download PDF / Print
        </Button></div>
      </div>

      <DocumentBrand settings={order?.brand_snapshot as import("@/components/tenant-provider").TenantSettings | null}><DocSheet>
        <DocHeader title="Surat Jalan" />

        <div className="mt-8 grid grid-cols-3 gap-6 text-[11px] leading-snug">
          <div>
            <p className="font-bold">Ship To:</p>
            <p className="font-bold">{shipment?.ship_to ?? order?.client_name ?? "-"}</p>
          </div>
          <div>
            <p className="font-bold">PO Number:</p>
            <p>{order?.order_number ?? order?.po_number ?? "-"}</p>
          </div>
          <div>
            <p className="font-bold">Delivery Date:</p>
            <p>{formatDocDate(shipment?.delivery_date ?? order?.invoice_date)}</p>
          </div>
          <div>
            <p>{shipment?.section ?? order?.section ?? "-"}</p>
            <p className="whitespace-pre-line text-neutral-700">{order?.client_address ?? ""}</p>
          </div>
          <div className="min-w-0">
            <p className="font-bold">DO Number:</p>
            <p className="break-all">{shipment?.do_number ?? "—"}</p>
          </div>
          <div />
        </div>

        {(() => { const groups = groupOrderItems(items); if (!groups.legacy) return (
        <table className="doc-grouped mt-8 w-full border-collapse text-[11px]">
          <thead>
            <tr className="border-b-2 border-neutral-800 text-left font-bold">
              <th className="w-10 py-2">No</th>
              <th className="py-2">Item Name &amp; Description</th>
              <th className="w-20 py-2 text-right">Qty</th>
              <th className="w-24 py-2">Unit</th>
            </tr>
          </thead>
          <tbody>
            {groups.outlets.map((g, gi) => (
              <Fragment key={gi}>
                {g.outlet && <tr className="doc-group-head bg-muted"><td colSpan={4} className="py-1.5 font-bold">{g.outlet}</td></tr>}
                {g.sections.map((s) => (
                  <Fragment key={s.name}>
                    <tr className="doc-group-head"><td colSpan={4} className="pt-2 text-[10px] font-semibold italic">{s.name}</td></tr>
                    {s.items.map(({ item: it, no }) => (
                      <tr key={it.id} className="doc-item-row border-b border-neutral-300">
                        <td className="py-2 align-top">{no}</td>
                        <td className="py-2 align-top">{it.item_name}</td>
                        <td className="py-2 text-right align-top">{Number(it.qty)}</td>
                        <td className="py-2 align-top">{it.unit}</td>
                      </tr>
                    ))}
                  </Fragment>
                ))}
              </Fragment>
            ))}
          </tbody>
        </table>); return (
        <table className="mt-8 w-full border-collapse text-[11px]">
          <thead>
            <tr className="border-b-2 border-neutral-800 text-left font-bold">
              <th className="w-10 py-2">No</th>
              <th className="py-2">Item Name &amp; Description</th>
              <th className="w-20 py-2 text-right">Qty</th>
              <th className="w-24 py-2">Unit</th>
            </tr>
          </thead>
          <tbody>
            {items.map((it, idx) => (
              <tr key={it.id} className="border-b border-neutral-300">
                <td className="py-2 align-top">{idx + 1}</td>
                <td className="py-2 align-top">{it.item_name}</td>
                <td className="py-2 text-right align-top">{Number(it.qty)}</td>
                <td className="py-2 align-top">{it.unit}</td>
              </tr>
            ))}
            {items.length === 0 ? (
              <tr className="border-b border-neutral-300">
                <td colSpan={4} className="py-4 text-center text-neutral-500">
                  Belum ada item.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>); })()}

        <div className="mt-6 text-[11px]">
          <p className="font-bold">Notes:</p>
          <div className="mt-2 space-y-4">
            <div className="border-b border-neutral-400" />
            <div className="border-b border-neutral-400" />
          </div>
        </div>

        <div className="mt-8 grid grid-cols-3 gap-8">
          <SignatureBox label="Stored By:" name={shipment?.stored_by} />
          <SignatureBox label="Delivery By:" name={shipment?.delivery_by} />
          <SignatureBox label="Received By:" name={shipment?.received_by} />
        </div>

        <div className="mt-10 grid grid-cols-[1.6fr_1fr] gap-8">
          <div className="text-[11px] leading-relaxed">
            <p className="font-bold" style={{ color: BRAND_GREEN }}>
              Syarat &amp; Ketentuan:
            </p>
            <ol className="mt-1 list-decimal space-y-1 pl-4">
              {DELIVERY_TERMS.map((t) => (
                <li key={t}>{t}</li>
              ))}
            </ol>
          </div>
          <ContactBlock />
        </div>

        <BrandRibbon />
      </DocSheet></DocumentBrand>
      {assignOpen && shipment && <div className="no-print"><ShipmentTeamDialog shipment={shipment} onClose={() => setAssignOpen(false)} /></div>}
    </div>
  );
}
