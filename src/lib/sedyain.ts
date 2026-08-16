export const CLIENT_STATUSES = [
  "Lead Baru",
  "Follow Up",
  "Negosiasi",
  "Deal",
  "Tidak Lanjut",
] as const;

export const DIVISIONS = ["Operasional", "Finance", "Admin", "Marketing"] as const;
export const PRIORITIES = ["Low", "Medium", "High"] as const;
export const TASK_STATUSES = ["To Do", "In Progress", "Review", "Done"] as const;

export const PAYABLE_STATUSES = ["Belum Bayar", "Sudah Bayar"] as const;
export const RECEIVABLE_STATUSES = ["Belum Tertagih", "Lunas"] as const;
export const CASH_REQUEST_STATUSES = ["Pending", "Disetujui", "Ditransfer", "Ditolak"] as const;
export const EXPENSE_STATUSES = ["Draft", "Disetujui", "Dibayar"] as const;
export const EXPENSE_CATEGORIES = [
  "Operasional Kantor",
  "Listrik & Air",
  "Internet & Telepon",
  "Gaji & THR",
  "Transportasi",
  "Marketing",
  "Maintenance",
  "Lain-lain",
] as const;

export function formatRupiah(value: number | string | null | undefined): string {
  const n = Number(value ?? 0);
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(n);
}

export function formatCompactRupiah(value: number | string | null | undefined): string {
  const n = Number(value ?? 0);
  if (n >= 1_000_000_000) return `Rp ${(n / 1_000_000_000).toFixed(1)} M`;
  if (n >= 1_000_000) return `Rp ${(n / 1_000_000).toFixed(1)} jt`;
  if (n >= 1_000) return `Rp ${(n / 1_000).toFixed(0)} rb`;
  return formatRupiah(n);
}

export function formatDate(value: string | null | undefined): string {
  if (!value) return "-";
  const d = new Date(`${value}T00:00:00`);
  if (Number.isNaN(d.getTime())) return "-";
  return d.toLocaleDateString("id-ID", { day: "2-digit", month: "short", year: "numeric" });
}

export function daysUntil(due: string | null | undefined): number | null {
  if (!due) return null;
  const d = new Date(`${due}T00:00:00`);
  if (Number.isNaN(d.getTime())) return null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return Math.round((d.getTime() - today.getTime()) / 86_400_000);
}

export type UrgencyLevel = "settled" | "late" | "soon" | "warn" | "normal";

export function urgencyOf(due: string | null | undefined, settled: boolean): UrgencyLevel {
  if (settled) return "settled";
  const days = daysUntil(due);
  if (days === null) return "normal";
  if (days <= 1) return "late";
  if (days <= 3) return "soon";
  if (days <= 7) return "warn";
  return "normal";
}

export const urgencyRowClass: Record<UrgencyLevel, string> = {
  settled: "bg-urgent-done",
  late: "bg-urgent-late",
  soon: "bg-urgent-soon",
  warn: "bg-urgent-warn",
  normal: "",
};

export function urgencyLabel(due: string | null | undefined, settled: boolean): string {
  if (settled) return "Selesai";
  const days = daysUntil(due);
  if (days === null) return "-";
  if (days < 0) return `Lewat ${Math.abs(days)} hari`;
  if (days === 0) return "Jatuh tempo hari ini";
  return `${days} hari lagi`;
}
