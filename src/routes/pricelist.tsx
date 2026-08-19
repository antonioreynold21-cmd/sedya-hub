import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { ExternalLink, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { supabase } from "@/integrations/supabase/client";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatRupiah } from "@/lib/sedyain";

export const Route = createFileRoute("/pricelist")({
  head: () => ({
    meta: [
      { title: "Pricelist Harian — Sedyain Indonesia" },
      {
        name: "description",
        content:
          "Update harga harian bahan baku HORECA Sedyain Indonesia dan bagikan pricelist publik ke client.",
      },
      { property: "og:title", content: "Pricelist Harian — Sedyain Indonesia" },
      {
        property: "og:description",
        content: "Kelola harga per item dan kategori, langsung tercermin di link publik.",
      },
    ],
  }),
  component: PricelistPage,
});

type Item = {
  id: string;
  name: string;
  category: string;
  unit: string;
  price: number;
  is_active: boolean;
};

const emptyNew = { name: "", category: "Umum", unit: "kg", price: "0" };

function PricelistPage() {
  const qc = useQueryClient();
  const [draft, setDraft] = useState(emptyNew);

  const { data: items = [], isLoading } = useQuery({
    queryKey: ["pricelist"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("pricelist_items")
        .select("*")
        .order("category")
        .order("name");
      if (error) throw error;
      return data as Item[];
    },
  });

  const invalidate = () => qc.invalidateQueries({ queryKey: ["pricelist"] });

  const addItem = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("pricelist_items").insert({
        name: draft.name.trim(),
        category: draft.category.trim() || "Umum",
        unit: draft.unit.trim() || "kg",
        price: Number(draft.price) || 0,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Item ditambahkan");
      setDraft(emptyNew);
      invalidate();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const updateItem = useMutation({
    mutationFn: async ({ id, patch }: { id: string; patch: Partial<Item> }) => {
      const { error } = await supabase.from("pricelist_items").update(patch).eq("id", id);
      if (error) throw error;
    },
    onSuccess: invalidate,
    onError: (e: Error) => toast.error(e.message),
  });

  const removeItem = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("pricelist_items").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Item dihapus");
      invalidate();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div className="space-y-6">
      <PageHeader
        title="Pricelist Harian"
        description="Perbarui harga setiap hari. Perubahan langsung tampil di link publik untuk client."
        action={
          <Button asChild variant="outline" size="sm">
            <Link to="/harga" target="_blank">
              <ExternalLink className="size-4" /> Lihat Link Publik
            </Link>
          </Button>
        }
      />

      <div className="grid gap-3 rounded-lg border border-border bg-card p-4 md:grid-cols-[2fr_1.2fr_0.8fr_1fr_auto]">
        <Input
          placeholder="Nama item"
          value={draft.name}
          onChange={(e) => setDraft({ ...draft, name: e.target.value })}
        />
        <Input
          placeholder="Kategori"
          value={draft.category}
          onChange={(e) => setDraft({ ...draft, category: e.target.value })}
        />
        <Input
          placeholder="Satuan"
          value={draft.unit}
          onChange={(e) => setDraft({ ...draft, unit: e.target.value })}
        />
        <Input
          type="number"
          placeholder="Harga"
          value={draft.price}
          onChange={(e) => setDraft({ ...draft, price: e.target.value })}
        />
        <Button disabled={!draft.name.trim() || addItem.isPending} onClick={() => addItem.mutate()}>
          <Plus className="size-4" /> Tambah
        </Button>
      </div>

      <div className="rounded-lg border border-border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Item</TableHead>
              <TableHead>Kategori</TableHead>
              <TableHead>Satuan</TableHead>
              <TableHead className="w-[160px]">Harga</TableHead>
              <TableHead className="w-[100px]">Aktif</TableHead>
              <TableHead className="text-right">Aksi</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={6} className="py-8 text-center text-muted-foreground">
                  Memuat pricelist…
                </TableCell>
              </TableRow>
            ) : items.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="py-8 text-center text-muted-foreground">
                  Belum ada item pricelist.
                </TableCell>
              </TableRow>
            ) : (
              items.map((it) => (
                <TableRow key={it.id}>
                  <TableCell className="font-medium">{it.name}</TableCell>
                  <TableCell>{it.category}</TableCell>
                  <TableCell>{it.unit}</TableCell>
                  <TableCell>
                    <Input
                      type="number"
                      defaultValue={String(it.price)}
                      className="h-8 w-32"
                      onBlur={(e) => {
                        const price = Number(e.target.value) || 0;
                        if (price !== Number(it.price)) {
                          updateItem.mutate({ id: it.id, patch: { price } });
                          toast.success(`Harga ${it.name} → ${formatRupiah(price)}`);
                        }
                      }}
                    />
                  </TableCell>
                  <TableCell>
                    <Switch
                      checked={it.is_active}
                      onCheckedChange={(v) =>
                        updateItem.mutate({ id: it.id, patch: { is_active: v } })
                      }
                    />
                  </TableCell>
                  <TableCell className="text-right">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => removeItem.mutate(it.id)}
                      aria-label={`Hapus ${it.name}`}
                    >
                      <Trash2 className="size-4 text-destructive" />
                    </Button>
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
