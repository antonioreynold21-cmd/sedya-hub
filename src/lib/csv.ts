// Generic CSV helpers (reusable for other data such as clients).
export const MAX_CSV_BYTES = 1_000_000;

export function detectDelimiter(text: string): ";" | "," {
  const first = text.replace(/^\uFEFF/, "").split(/\r?\n/).find((l) => l.trim() !== "") ?? "";
  const count = (ch: string) => {
    let n = 0, q = false;
    for (const c of first) { if (c === '"') q = !q; else if (!q && c === ch) n++; }
    return n;
  };
  return count(",") > count(";") ? "," : ";";
}

/** Parse CSV text into rows of cells. Handles BOM, quotes, CRLF; drops blank lines. */
export function parseCsv(text: string, delimiter?: string): string[][] {
  const src = text.replace(/^\uFEFF/, "");
  const d = delimiter ?? detectDelimiter(src);
  const rows: string[][] = [];
  let row: string[] = [], cell = "", q = false;
  for (let i = 0; i < src.length; i++) {
    const c = src[i];
    if (q) {
      if (c === '"') { if (src[i + 1] === '"') { cell += '"'; i++; } else q = false; }
      else cell += c;
    } else if (c === '"') q = true;
    else if (c === d) { row.push(cell); cell = ""; }
    else if (c === "\n" || c === "\r") {
      if (c === "\r" && src[i + 1] === "\n") i++;
      row.push(cell); rows.push(row); row = []; cell = "";
    } else cell += c;
  }
  row.push(cell); rows.push(row);
  return rows.filter((r) => r.some((x) => x.trim() !== ""));
}

/** Strip leading apostrophe added for formula-injection protection. */
export function cleanCell(v: string | undefined): string {
  const t = (v ?? "").trim();
  return t.startsWith("'") ? t.slice(1).trim() : t;
}

export function escapeCsvCell(v: unknown, delimiter = ";"): string {
  let s = v == null ? "" : String(v);
  if (typeof v === "string" && /^[=+\-@]/.test(s)) s = "'" + s;
  if (s.includes(delimiter) || s.includes('"') || /[\r\n]/.test(s)) s = '"' + s.replace(/"/g, '""') + '"';
  return s;
}

export function toCsv(header: string[], rows: unknown[][], delimiter = ";"): string {
  return "\uFEFF" + [header, ...rows].map((r) => r.map((c) => escapeCsvCell(c, delimiter)).join(delimiter)).join("\r\n") + "\r\n";
}

export function downloadCsv(filename: string, content: string) {
  const url = URL.createObjectURL(new Blob([content], { type: "text/csv;charset=utf-8" }));
  const a = document.createElement("a");
  a.href = url; a.download = filename; a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/** Indonesian/international number parsing per import rules. Returns NaN when invalid. */
export function parseIdNumber(raw: string): number {
  let s = cleanCell(raw).replace(/\s|Rp/gi, "");
  if (s === "" || !/^-?[\d.,]+$/.test(s)) return NaN;
  if (s.includes(",")) s = s.replace(/\./g, "").replace(",", ".");
  else if (/^-?\d{1,3}(\.\d{3})+$/.test(s)) s = s.replace(/\./g, "");
  if ((s.match(/\./g) ?? []).length > 1 || s.includes(",")) return NaN;
  const n = Number(s);
  return Number.isFinite(n) ? n : NaN;
}

export function parseBool(raw: string): boolean | null {
  const s = cleanCell(raw).toLowerCase();
  if (s === "" || ["ya", "true", "1", "y"].includes(s)) return true;
  if (["tidak", "false", "0", "t", "n"].includes(s)) return false;
  return null;
}

export function jakartaDate(d = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Jakarta" }).format(d);
}
