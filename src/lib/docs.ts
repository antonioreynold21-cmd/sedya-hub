export const COMPANY = {
  name: "SEDYAIN BERHASIL BERSAMA PT",
  addressLine1: "Jl. Kebalen V No.32, RT.5/RW.5, Rw. Bar., Kec. Kby. Baru, Kota Jakarta Selatan,",
  addressLine2: "Daerah Khusus Ibukota Jakarta 12180",
  bank: { name: "BCA", account: "2109339339", holder: "SEDYAIN BERHASIL BERSAMA PT" },
  contact: { wa: "0817 001 9339", ig: "@sedyain.id", email: "admin@sedyain.id" },
} as const;

export const BRAND_GREEN = "#00842F";
export const BRAND_LIME = "#C8D95A";

export const SHIPMENT_STATUSES = ["Menunggu", "Dikemas", "Dalam Perjalanan", "Terkirim"] as const;
export type ShipmentStatus = (typeof SHIPMENT_STATUSES)[number];

export const DELIVERY_TERMS = [
  "Harap periksa dengan teliti saat menerima barang",
  "Barang yang sudah diterima tidak dapat dikembalikan, kecuali terjadi kesalahan dari pihak Sedyain maka barang akan dikirim langsung hari itu juga",
  "Surat jalan ini harap disimpan sebagai bukti banding saat melakukan pembayaran",
] as const;

/** "Rp 10,000" — comma thousand separator, no decimals (matches the printed template). */
export function formatDocMoney(value: number | string | null | undefined): string {
  const n = Math.round(Number(value ?? 0));
  return `Rp ${n.toLocaleString("en-US")}`;
}

export function formatQty(value: number | string | null | undefined): string {
  const n = Number(value ?? 0);
  return Number.isInteger(n) ? String(n) : String(n);
}

export function formatDocDate(value: string | null | undefined): string {
  if (!value) return "-";
  const d = new Date(`${value}T00:00:00`);
  if (Number.isNaN(d.getTime())) return "-";
  return d.toLocaleDateString("id-ID", { day: "2-digit", month: "long", year: "numeric" });
}

export type DocItem = {
  id: string;
  item_name: string;
  qty: number;
  unit: string;
  price: number;
};

export function itemAmount(item: { qty: number; price: number }): number {
  return Number(item.qty) * Number(item.price);
}

export function docTotal(items: { qty: number; price: number }[]): number {
  return items.reduce((sum, i) => sum + itemAmount(i), 0);
}
