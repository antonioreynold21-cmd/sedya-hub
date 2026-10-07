import { SalesDocument } from "@/components/sales-document";
import { useTenantQuery as useQuery } from "@/hooks/use-tenant-query";
import { createFileRoute, Link } from "@tanstack/react-router";

import { Printer, ArrowLeft } from "lucide-react";

import { tenantClient as supabase } from "@/lib/tenant-client";
import { Button } from "@/components/ui/button";
import {
  BankBlock,
  BrandRibbon,
  ContactBlock,
  DocHeader,
  DocSheet,
} from "@/components/doc-shell";
import { docTotal, formatDocDate, formatDocMoney, itemAmount } from "@/lib/docs";

export const Route = createFileRoute("/_authenticated/orders/$orderId/invoice")({
  head: () => ({
    meta: [
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
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

function InvoicePage() { const {orderId}=Route.useParams(); return <SalesDocument entity="orders" id={orderId}/>; }
