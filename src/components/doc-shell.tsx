import { useTenant } from "@/components/tenant-provider";
import { createContext, useContext, type ReactNode } from "react";

import logoAsset from "@/assets/sedyain_logo.png.asset.json";
import { BRAND_GREEN, BRAND_LIME, COMPANY } from "@/lib/docs";

import type { TenantSettings } from '@/components/tenant-provider';
const Snapshot = createContext<TenantSettings | null>(null);
export function DocumentBrand({settings,children}:{settings:TenantSettings|null;children:ReactNode}) { return <Snapshot.Provider value={settings}>{children}</Snapshot.Provider>; }
function useDocumentBrand() { const {tenant}=useTenant(); return useContext(Snapshot) ?? tenant?.settings; }
/** Repeating comma/swoosh ribbon inspired by the "S" mark in the Sedyain logo. */
export function BrandRibbon() {
  const brand=useDocumentBrand();
  const comma = (color: string, x: number) =>
    `<path transform="translate(${x} 0)" fill="${color}" d="M6 26c0-12 9-21 21-21 9 0 15 5 15 12 0 6-4 10-10 10-3 0-5-1-6-3 3 0 5-2 5-5s-3-5-7-5c-7 0-12 6-12 15 0 3 1 6 3 8l-5 4c-3-4-4-9-4-15z"/>`;
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="96" height="40" viewBox="0 0 96 40">${comma(
    brand?.primary_color||BRAND_GREEN,
    0,
  )}${comma(BRAND_LIME, 48)}</svg>`;
  return (
    <div
      aria-hidden
      className="mt-4 h-6 w-full"
      style={{
        backgroundImage: `url("data:image/svg+xml;utf8,${encodeURIComponent(svg)}")`,
        backgroundRepeat: "repeat-x",
        backgroundSize: "auto 100%",
      }}
    />
  );
}

export function DocHeader({ title }: { title: string }) {
  const brand=useDocumentBrand();
  return (
    <div className="flex items-start justify-between gap-6">
      <div className="min-w-0">
        <h1
          className="text-3xl font-extrabold uppercase tracking-wide"
          style={{ color: brand?.primary_color ?? "var(--primary)" }}
        >
          {title}
        </h1>
        <p className="mt-2 max-w-md text-[11px] leading-snug text-neutral-700">
          {brand?.address||`${COMPANY.addressLine1} ${COMPANY.addressLine2}`}
        </p>
      </div>
      <img src={brand?.logo_url||logoAsset.url} alt="Logo Sedyain" className="h-16 w-auto shrink-0 object-contain" />
    </div>
  );
}

export function DocField({
  label,
  children,
  bold,
}: {
  label?: string;
  children?: ReactNode;
  bold?: boolean;
}) {
  return (
    <div className="text-[11px] leading-snug">
      {label ? <p className="font-bold text-neutral-900">{label}</p> : null}
      <div className={bold ? "font-bold text-neutral-900" : "text-neutral-700"}>{children}</div>
    </div>
  );
}

export function ContactBlock() {
  const brand=useDocumentBrand();
  return (
    <div className="text-[11px] leading-relaxed">
      <p className="font-bold" style={{ color: brand?.primary_color ?? "var(--primary)" }}>
        Contact Us:
      </p>
      <p>WA : {brand?.contact?.wa||COMPANY.contact.wa}</p>
      <p>IG : {brand?.contact?.ig||COMPANY.contact.ig}</p>
      <p>Email : {brand?.contact?.email||COMPANY.contact.email}</p>
    </div>
  );
}

export function BankBlock() {
  const brand=useDocumentBrand();
  return (
    <div className="text-[11px] leading-relaxed">
      <p className="font-bold" style={{ color: brand?.primary_color ?? "var(--primary)" }}>
        Pembayaran transfer ke:
      </p>
      <p className="font-bold">{brand?.bank?.name||COMPANY.bank.name}</p>
      <p>{brand?.bank?.account||COMPANY.bank.account}</p>
      <p>{brand?.bank?.holder||COMPANY.bank.holder}</p>
    </div>
  );
}

export function DocSheet({ children }: { children: ReactNode }) {
  return (
    <div className="doc-sheet mx-auto w-full max-w-[820px] bg-white p-10 text-neutral-900 shadow-sm print:max-w-none print:p-8 print:shadow-none">
      {children}
    </div>
  );
}
