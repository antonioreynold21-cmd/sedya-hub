import { cleanCell, parseBool, parseCsv, parseIdNumber } from "./csv";

export const PRICELIST_HEADER = ["nama", "kategori", "satuan", "harga", "aktif"];
export const PRICELIST_TEMPLATE_ROWS = [
  ["Beras Premium", "Grocery", "sak", 650000, "ya"],
  ["Bawang Merah", "Sayur", "kg", 38000, "ya"],
  ["Dada Ayam Fillet", "Protein", "kg", 52000, "tidak"],
];
export const MAX_IMPORT_ROWS = 500;

export type ParsedRow = { line: number; name: string; category: string; unit: string; price: number | null; is_active: boolean | null; error?: string };

export function parsePricelistCsv(text: string): { rows: ParsedRow[]; error?: string } {
  const table = parseCsv(text);
  if (table.length === 0) return { rows: [], error: "File kosong" };
  const head = table[0].map((h) => cleanCell(h).toLowerCase());
  const idx = (k: string) => head.indexOf(k);
  const missing = ["nama", "satuan", "harga"].filter((k) => idx(k) < 0);
  if (missing.length) return { rows: [], error: `Kolom wajib tidak ada: ${missing.join(", ")}` };
  const body = table.slice(1);
  if (body.length > MAX_IMPORT_ROWS) return { rows: [], error: `Maksimal ${MAX_IMPORT_ROWS} baris per unggahan` };
  const get = (r: string[], k: string) => (idx(k) >= 0 ? cleanCell(r[idx(k)]) : "");
  const rows = body.map((r, i): ParsedRow => {
    const price = parseIdNumber(r[idx("harga")] ?? "");
    const active = parseBool(get(r, "aktif"));
    const row: ParsedRow = { line: i + 2, name: get(r, "nama"), category: get(r, "kategori") || "Umum", unit: get(r, "satuan"), price: Number.isNaN(price) ? null : price, is_active: active };
    if (!row.name) row.error = "Nama wajib diisi";
    else if (!row.unit) row.error = "Satuan wajib diisi";
    else if (row.price === null) row.error = "Harga bukan angka";
    else if (row.price < 0) row.error = "Harga tidak boleh negatif";
    else if (active === null) row.error = "Nilai aktif harus ya/tidak";
    return row;
  });
  return { rows };
}
