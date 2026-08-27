export const MODULES = [
  { key: "dashboard", label: "Dashboard", url: "/" },
  { key: "crm", label: "CRM", url: "/crm" },
  { key: "finance", label: "Finance", url: "/finance" },
  { key: "orders", label: "Order & Dokumen", url: "/orders" },
  { key: "shipments", label: "Pengiriman", url: "/shipments" },
  { key: "pricelist", label: "Pricelist", url: "/pricelist" },
  { key: "workflow", label: "Workflow Tim", url: "/workflow" },
  { key: "team", label: "Team", url: "/team" },
] as const;

export type ModuleKey = (typeof MODULES)[number]["key"];

/** Modul yang selalu boleh dibuka semua akun terdaftar. */
export const ALWAYS_ALLOWED: ModuleKey[] = ["dashboard"];

/** Petakan pathname internal ke modul yang mengaturnya. */
export function moduleForPath(pathname: string): ModuleKey | null {
  if (pathname === "/" ) return "dashboard";
  if (pathname.startsWith("/crm")) return "crm";
  if (pathname.startsWith("/finance")) return "finance";
  if (pathname.startsWith("/orders")) return "orders";
  if (pathname.startsWith("/shipments")) return "shipments";
  if (pathname.startsWith("/pricelist")) return "pricelist";
  if (pathname.startsWith("/workflow")) return "workflow";
  if (pathname.startsWith("/team")) return "team";
  return null;
}
