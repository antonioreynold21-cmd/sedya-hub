import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Upload } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { MAX_CSV_BYTES } from "@/lib/csv";
import { parsePricelistCsv, type ParsedRow } from "@/lib/pricelist-csv";
import { formatRupiah } from "@/lib/sedyain";

type ResultRow = { line: number; status: string; error: string | null; name: string; unit: string; price: number | null; old_price: number | null };
type Result = { summary: { baru: number; diperbarui: number; tidak_berubah: number; error: number }; rows: ResultRow[] };

export function PricelistImportDialog() {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [fileError, setFileError] = useState<string | null>(null);
  const [payload, setPayload] = useState<ParsedRow[]>([]);
  const [result, setResult] = useState<Result | null>(null);

  function reset() { setFileError(null); setPayload([]); setResult(null); }

  async function onFile(file?: File) {
    reset();
    if (!file) return;
    if (!/\.csv$/i.test(file.name)) return setFileError("Pilih file berformat .csv");
    if (file.size > MAX_CSV_BYTES) return setFileError("Ukuran file maksimal 1 MB");
    const parsed = parsePricelistCsv(await file.text());
    if (parsed.error) return setFileError(parsed.error);
    if (!parsed.rows.length) return setFileError("Tidak ada baris data");
    setBusy(true);
    try {
      const valid = parsed.rows.filter((r) => !r.error);
      let server: Result = { summary: { baru: 0, diperbarui: 0, tidak_berubah: 0, error: 0 }, rows: [] };
      if (valid.length) {
        const { data, error } = await supabase.rpc("import_pricelist_rows", { p_rows: valid as never, p_commit: false });
        if (error) throw error;
        server = data as unknown as Result;
      }
      const local: ResultRow[] = parsed.rows.filter((r) => r.error).map((r) => ({ line: r.line, status: "error", error: r.error!, name: r.name, unit: r.unit, price: r.price, old_price: null }));
      const rows = [...server.rows, ...local].sort((a, b) => a.line - b.line);
      setPayload(valid);
      setResult({ summary: { ...server.summary, error: server.summary.error + local.length }, rows });
    } catch (e) {
      setFileError((e as Error).message);
    } finally { setBusy(false); }
  }

  async function apply() {
    setBusy(true);
    try {
      const { data, error } = await supabase.rpc("import_pricelist_rows", { p_rows: payload as never, p_commit: true });
      if (error) throw error;
      const s = (data as unknown as Result).summary;
      toast.success(`Impor selesai: ${s.baru} baru, ${s.diperbarui} diperbarui`);
      qc.invalidateQueries();
      qc.invalidateQueries({ queryKey: ["public-pricelist"] });
      setOpen(false); reset();
    } catch (e) { toast.error((e as Error).message); } finally { setBusy(false); }
  }

  const s = result?.summary;
  const canApply = !!s && s.error === 0 && s.baru + s.diperbarui > 0 && !busy;

  return (
    <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) reset(); }}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm"><Upload className="size-4" /> Impor CSV</Button>
      </DialogTrigger>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader><DialogTitle>Impor Pricelist dari CSV</DialogTitle></DialogHeader>
        <p className="text-sm text-muted-foreground">Kolom: nama;kategori;satuan;harga;aktif. Maksimal 500 baris. Item yang tidak ada di file tidak diubah.</p>
        <input type="file" accept=".csv,text/csv" aria-label="File CSV" disabled={busy} onChange={(e) => onFile(e.target.files?.[0])} className="text-sm" />
        {busy && <p role="status" className="text-sm text-muted-foreground">Memproses…</p>}
        {fileError && <p role="alert" className="text-sm text-destructive">{fileError}</p>}
        {s && (
          <div className="space-y-3">
            <p className="text-sm font-medium">{s.baru} baru · {s.diperbarui} diperbarui · {s.tidak_berubah} tidak berubah · <span className={s.error ? "text-destructive" : ""}>{s.error} error</span></p>
            <div className="overflow-x-auto rounded-md border border-border">
              <table className="w-full text-sm">
                <thead className="bg-muted text-left"><tr><th className="p-2">Baris</th><th className="p-2">Item</th><th className="p-2">Status</th><th className="p-2">Keterangan</th></tr></thead>
                <tbody>
                  {result!.rows.slice(0, 100).map((r) => (
                    <tr key={r.line} className="border-t border-border">
                      <td className="p-2">{r.line}</td>
                      <td className="p-2 break-words">{r.name || "-"} <span className="text-muted-foreground">/ {r.unit || "-"}</span></td>
                      <td className={`p-2 ${r.status === "error" ? "text-destructive" : ""}`}>{r.status}</td>
                      <td className="p-2">{r.status === "error" ? r.error : r.status === "diperbarui" && r.old_price !== null && r.price !== null && Number(r.old_price) !== Number(r.price) ? `${formatRupiah(Number(r.old_price))} → ${formatRupiah(Number(r.price))}` : r.price !== null ? formatRupiah(Number(r.price)) : ""}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {result!.rows.length > 100 && <p className="text-xs text-muted-foreground">…dan {result!.rows.length - 100} baris lainnya.</p>}
            <div className="flex justify-end"><Button disabled={!canApply} onClick={apply}>Terapkan</Button></div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
