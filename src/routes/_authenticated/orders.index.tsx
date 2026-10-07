import { SalesList } from "@/components/sales-list";
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

function OrdersPage() { return <SalesList entity="orders"/>; }
