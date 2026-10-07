import { Button } from "@/components/ui/button";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";

import logoAsset from "@/assets/sedyain_logo.png.asset.json";
import { supabase } from "@/integrations/supabase/client";
import { BRAND_GREEN, COMPANY, formatDocMoney } from "@/lib/docs";

export const Route = createFileRoute("/harga")({
  head: () => ({
    meta: [
      {property:"og:type",content:"website"},
      {name:"twitter:card",content:"summary_large_image"},
      { title: "Pricelist Harian Sedyain Indonesia" },
      {
        name: "description",
        content:
          "Daftar harga harian bahan baku HORECA dari Sedyain Indonesia — sayur, protein, dan kebutuhan dapur.",
      },
      { property: "og:title", content: "Pricelist Harian Sedyain Indonesia" },
      {
        property: "og:description",
        content: "Harga bahan baku HORECA terbaru, diperbarui setiap hari.",
      },
    ],
  }),
  component: PublicPricelist,
});

function PublicPricelist() {
  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ["public-pricelist"],
    queryFn: async () => {
      const {data,error}=await supabase.rpc('get_public_pricelist');
      if(error)throw error;
      return data as unknown as { name:string; settings:{logo_url?:string;primary_color?:string;contact?:{wa?:string;ig?:string;email?:string}}; items:{id:string;name:string;category:string;unit:string;price:number;updated_at:string}[] } | null;
    },
  });

  const items = data?.items ?? [];
  const lastUpdate = items.reduce<string | null>(
    (max, i) => (!max || i.updated_at > max ? i.updated_at : max),
    null,
  );
  const groups = Array.from(new Set(items.map((i) => i.category)));

  return (
    <div className="min-h-screen bg-[#FAF7F0] px-4 py-8">
      <div className="mx-auto w-full max-w-lg space-y-6">
        <header className="flex items-center justify-between">
          <div>
            <h1 className="text-lg font-bold" style={{ color: data?.settings.primary_color||BRAND_GREEN }}>
              Pricelist Harian
            </h1>
            <p className="text-xs text-neutral-600">{data?.name||"Sedyain Indonesia"} · Supplier HORECA</p>
          </div>
          <img src={data?.settings.logo_url||logoAsset.url} alt="Logo Sedyain" className="h-10 w-auto object-contain" />
        </header>

        <p className="text-xs text-neutral-500">
          Terakhir diperbarui:{" "}
          <span className="font-medium text-neutral-700">
            {lastUpdate
              ? new Date(lastUpdate).toLocaleString("id-ID", {
                  day: "2-digit",
                  month: "long",
                  year: "numeric",
                  hour: "2-digit",
                  minute: "2-digit",
                })
              : "-"}
          </span>
        </p>

        {isError ? <div role="alert"><p>Harga gagal dimuat.</p><Button variant="outline" onClick={()=>refetch()}>Coba lagi</Button></div> : isLoading ? (
          <p className="text-sm text-neutral-600">Memuat harga…</p>
        ) : items.length === 0 ? (
          <p className="text-sm text-neutral-600">Belum ada harga yang dipublikasikan.</p>
        ) : (
          groups.map((cat) => (
            <section key={cat} className="rounded-xl bg-white p-4 shadow-sm">
              <h2 className="text-sm font-bold" style={{ color: data?.settings.primary_color||BRAND_GREEN }}>
                {cat}
              </h2>
              <ul className="mt-2 divide-y divide-neutral-200">
                {items
                  .filter((i) => i.category === cat)
                  .map((i) => (
                    <li key={i.id} className="flex items-baseline justify-between gap-3 py-2">
                      <span className="text-sm text-neutral-800">{i.name}</span>
                      <span className="whitespace-nowrap text-sm font-semibold text-neutral-900">
                        {formatDocMoney(i.price)}
                        <span className="text-xs font-normal text-neutral-500"> / {i.unit}</span>
                      </span>
                    </li>
                  ))}
              </ul>
            </section>
          ))
        )}

        <p className="pb-4 text-center text-xs text-neutral-500">
          Pesan sekarang: WA {data?.settings.contact?.wa||COMPANY.contact.wa} · {data?.settings.contact?.ig||COMPANY.contact.ig} · {data?.settings.contact?.email||COMPANY.contact.email}
        </p>
      </div>
    </div>
  );
}
