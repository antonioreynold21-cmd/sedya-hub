import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Printer, ArrowLeft } from "lucide-react";

import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import {
  BankBlock,
  BrandRibbon,
  ContactBlock,
  DocHeader,
  DocSheet,
} from "@/components/doc-shell";
import { docTotal, formatDocDate, formatDocMoney, itemAmount } from "@/lib/docs";

export const Route = createFileRoute("/orders/$orderId/invoice")({
  head: () => ({
    meta: [
      { title: "Invoice — Sedyain Indonesia" },
      {
        name: "description",
        content: "Invoice resmi PT Sedyain Berhasil Bersama, siap cetak dan simpan sebagai PDF.",
      },
      { property: "og:title", content: "Invoice — Sedyain Indonesia" },
      { property: "og:description", content: "Invoice print-ready sesuai template resmi Sedyain." },
    ],
  }),
  component: InvoicePage,
});

function InvoicePage() {
  const { orderId } = Route.useParams();

  const { data } = useQuery({
    queryKey: ["order-doc", orderId],
    queryFn: async () => {
      const [order, items] = await Promise.all([
        supabase.from("orders").select("*").eq("id", orderId).single(),
        supabase.from("order_items").select("*").eq("order_id", orderId).order("position"),
      ]);
      if (order.error) throw order.error;
      if (items.error) throw items.error;
      return { order: order.data, items: items.data ?? [] };
    },
  });

  const order = data?.order;
  const items = data?.items ?? [];
  const total = docTotal(items.map((i) => ({ qty: Number(i.qty), price: Number(i.price) })));

  return (
    <div className="min-h-screen bg-neutral-100 py-6 print:bg-white print:py-0">
      <div className="no-print mx-auto mb-4 flex max-w-[820px] items-center justify-between px-4">
        <Button asChild variant="outline" size="sm">
          <Link to="/orders">
            <ArrowLeft className="size-4" /> Kembali
          </Link>
        </Button>
        <Button size="sm" onClick={() => window.print()}>
          <Printer className="size-4" /> Download PDF / Print
        </Button>
      </div>

      <DocSheet>
        <DocHeader title="Invoice" />

        <div className="mt-8 grid grid-cols-3 gap-6 text-[11px] leading-snug">
          <div>
            <p className="font-bold">Bill To:</p>
            <p className="font-bold">{order?.client_name ?? "-"}</p>
          </div>
          <div>
            <p className="font-bold">PO Number:</p>
            <p>{order?.po_number ?? "-"}</p>
          </div>
          <div>
            <p className="font-bold">Invoice Number:</p>
            <p>{order?.invoice_number ?? "-"}</p>
          </div>
          <div>
            <p className="font-bold">Address:</p>
            <p className="whitespace-pre-line">{order?.client_address ?? "-"}</p>
          </div>
          <div>
            <p className="font-bold">Section:</p>
            <p>{order?.section ?? "-"}</p>
          </div>
          <div>
            <p className="font-bold">Due Date:</p>
            <p>{formatDocDate(order?.due_date)}</p>
          </div>
        </div>

        <table className="mt-8 w-full border-collapse text-[11px]">
          <thead>
            <tr className="border-b-2 border-neutral-800 text-left font-bold">
              <th className="w-10 py-2">No</th>
              <th className="py-2">Item Name &amp; Description</th>
              <th className="w-16 py-2 text-right">Qty</th>
              <th className="w-20 py-2">Unit</th>
              <th className="w-28 py-2 text-right">Price</th>
              <th className="w-28 py-2 text-right">Amount</th>
            </tr>
          </thead>
          <tbody>
            {items.map((it, idx) => (
              <tr key={it.id} className="border-b border-neutral-300">
                <td className="py-2 align-top">{idx + 1}</td>
                <td className="py-2 align-top">{it.item_name}</td>
                <td className="py-2 text-right align-top">{Number(it.qty)}</td>
                <td className="py-2 align-top">{it.unit}</td>
                <td className="py-2 text-right align-top">{formatDocMoney(it.price)}</td>
                <td className="py-2 text-right align-top">
                  {formatDocMoney(itemAmount({ qty: Number(it.qty), price: Number(it.price) }))}
                </td>
              </tr>
            ))}
            {items.length === 0 ? (
              <tr className="border-b border-neutral-300">
                <td colSpan={6} className="py-4 text-center text-neutral-500">
                  Belum ada item.
                </td>
              </tr>
            ) : null}
            <tr className="font-bold">
              <td colSpan={5} className="py-3 text-right">
                Total
              </td>
              <td className="py-3 text-right">{formatDocMoney(total)}</td>
            </tr>
          </tbody>
        </table>

        <div className="mt-16 flex items-end justify-between gap-8">
          <BankBlock />
          <ContactBlock />
        </div>

        <BrandRibbon />
      </DocSheet>
    </div>
  );
}
