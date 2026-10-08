import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Check, PackageCheck, Truck, Boxes, Clock } from "lucide-react";
import { toast } from "sonner";

import logoAsset from "@/assets/sedyain_logo.png.asset.json";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { BRAND_GREEN, COMPANY, SHIPMENT_STATUSES, formatDocDate } from "@/lib/docs";

export const Route = createFileRoute("/t/$token")({
  head: () => ({
    meta: [
      {property:"og:type",content:"website"},
      {name:"twitter:card",content:"summary_large_image"},
      { title: "Lacak Pengiriman — Sedyain Indonesia" },
      {
        name: "description",
        content:
          "Lacak status pengiriman bahan baku Sedyain Indonesia dan konfirmasi penerimaan barang secara online.",
      },
      { property: "og:title", content: "Lacak Pengiriman — Sedyain Indonesia" },
      {
        property: "og:description",
        content: "Cek status pengiriman Anda dan konfirmasi barang diterima.",
      },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: TrackPage,
});

const stepIcons = [Clock, Boxes, Truck, PackageCheck];

type TrackingItem = { id: string; item_name: string; qty: number; unit: string };
type Tracking = {
  tenant_name?: string;
  brand?: {logo_url?:string;primary_color?:string;contact?:{wa?:string;ig?:string;email?:string}};
  ship_to: string;
  status: string;
  delivery_date: string | null;
  do_number: string | null;
  received_by: string | null;
  received_at: string | null;
  items: TrackingItem[];
};

function TrackPage() {
  const { token } = Route.useParams();
  const qc = useQueryClient();
  const [name, setName] = useState("");

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ["track", token],
    queryFn: async () => {
      const { data, error } = await supabase.rpc(
        "get_shipment_tracking" as never,
        { p_token: token } as never,
      );
      if (error) throw error;
      return (data as Tracking | null) ?? null;
    },
  });

  const confirm = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.rpc(
        "confirm_shipment_receipt" as never,
        { p_token: token, p_received_by: name.trim() } as never,
      );
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Terima kasih, penerimaan barang sudah dikonfirmasi");
      qc.invalidateQueries({ queryKey: ["track", token] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const shipment = data;
  const items = data?.items ?? [];
  const activeIndex = shipment ? SHIPMENT_STATUSES.indexOf(shipment.status as never) : -1;

  return (
    <div className="min-h-screen bg-[#FAF7F0] px-4 py-8">
      <div className="mx-auto w-full max-w-md space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-lg font-bold" style={{ color: shipment?.brand?.primary_color||BRAND_GREEN }}>
              Lacak Pengiriman
            </h1>
            <p className="text-xs text-neutral-600">{shipment?.tenant_name||"Sedyain Indonesia"}</p>
          </div>
          <img src={shipment?.brand?.logo_url||logoAsset.url} alt="Logo Sedyain" className="h-10 w-auto object-contain" />
        </div>

        {isError ? <div role="alert"><p>Pengiriman gagal dimuat.</p><Button variant="outline" onClick={()=>refetch()}>Coba lagi</Button></div> : isLoading ? (
          <p className="text-sm text-neutral-600">Memuat data pengiriman…</p>
        ) : !shipment ? (
          <div className="rounded-xl bg-white p-6 text-center shadow-sm">
            <p className="text-sm font-semibold text-neutral-900">Pengiriman tidak ditemukan</p>
            <p className="mt-1 text-xs text-neutral-600">
              Link mungkin salah atau sudah tidak berlaku. Hubungi kami di {COMPANY.contact.wa}.
            </p>
          </div>
        ) : (
          <>
            <div className="rounded-xl bg-white p-5 shadow-sm">
              <p className="text-xs text-neutral-500">Status terkini</p>
              <p className="text-xl font-bold" style={{ color: shipment?.brand?.primary_color||BRAND_GREEN }}>
                {shipment.status}
              </p>

              <ol className="mt-5 space-y-4">
                {SHIPMENT_STATUSES.map((st, i) => {
                  const Icon = stepIcons[i] ?? Clock;
                  const done = i <= activeIndex;
                  return (
                    <li key={st} className="flex items-center gap-3">
                      <span
                        className="flex size-8 shrink-0 items-center justify-center rounded-full text-white"
                        style={{ backgroundColor: done ? BRAND_GREEN : "#D6D3CC" }}
                      >
                        {done && i < activeIndex ? (
                          <Check className="size-4" />
                        ) : (
                          <Icon className="size-4" />
                        )}
                      </span>
                      <span
                        className={
                          done ? "text-sm font-semibold text-neutral-900" : "text-sm text-neutral-500"
                        }
                      >
                        {st}
                      </span>
                    </li>
                  );
                })}
              </ol>
            </div>

            <div className="rounded-xl bg-white p-5 text-sm shadow-sm">
              <p className="text-xs text-neutral-500">Ship To</p>
              <p className="break-all font-semibold text-neutral-900">{shipment.ship_to}</p>
              <div className="mt-3 grid grid-cols-2 gap-3 text-xs">
                <div>
                  <p className="text-neutral-500">Tanggal Kirim</p>
                  <p className="font-medium">{formatDocDate(shipment.delivery_date)}</p>
                </div>
                <div className="min-w-0">
                  <p className="text-neutral-500">DO Number</p>
                  <p className="break-all font-medium">{shipment.do_number ?? "-"}</p>
                </div>
              </div>

              <p className="mt-4 text-xs font-semibold text-neutral-500">Daftar Barang</p>
              <ul className="mt-1 divide-y divide-neutral-200">
                {items.map((it) => (
                  <li key={it.id} className="flex justify-between py-2 text-xs">
                    <span>{it.item_name}</span>
                    <span className="font-medium">
                      {Number(it.qty)} {it.unit}
                    </span>
                  </li>
                ))}
                {items.length === 0 ? (
                  <li className="py-2 text-xs text-neutral-500">Belum ada item.</li>
                ) : null}
              </ul>
            </div>

            <div className="rounded-xl bg-white p-5 shadow-sm">
              {shipment.received_by ? (
                <p className="text-sm text-neutral-700">
                  Barang sudah dikonfirmasi diterima oleh{" "}
                  <span className="break-all font-semibold">{shipment.received_by}</span>.
                </p>
              ) : (
                <div className="space-y-3">
                  <Label htmlFor="received_by" className="text-sm">
                    Konfirmasi terima barang
                  </Label>
                  <Input
                    id="received_by"
                    placeholder="Nama penerima"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                  />
                  <Button
                    className="w-full"
                    style={{ backgroundColor: BRAND_GREEN }}
                    disabled={!name.trim() || confirm.isPending}
                    onClick={() => confirm.mutate()}
                  >
                    Barang Diterima
                  </Button>
                </div>
              )}
            </div>
          </>
        )}

        <p className="pb-4 text-center text-xs text-neutral-500">
          Butuh bantuan? WA {COMPANY.contact.wa} · {COMPANY.contact.ig}
        </p>
      </div>
    </div>
  );
}
