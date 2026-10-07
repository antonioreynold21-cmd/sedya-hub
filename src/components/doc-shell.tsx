import { useTenant } from "@/components/tenant-provider";
import type { ReactNode } from "react";

import logoAsset from "@/assets/sedyain_logo.png.asset.json";
import { BRAND_GREEN, BRAND_LIME, COMPANY } from "@/lib/docs";

/** Repeating comma/swoosh ribbon inspired by the "S" mark in the Sedyain logo. */
export function BrandRibbon() {
  const comma = (color: string, x: number) =>
    `<path transform="translate(${x} 0)" fill="${color}" d="M6 26c0-12 9-21 21-21 9 0 15 5 15 12 0 6-4 10-10 10-3 0-5-1-6-3 3 0 5-2 5-5s-3-5-7-5c-7 0-12 6-12 15 0 3 1 6 3 8l-5 4c-3-4-4-9-4-15z"/>`;
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="96" height="40" viewBox="0 0 96 40">${comma(
    BRAND_GREEN,
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
  const {tenant}=useTenant();
  return (
    <div className="flex items-start justify-between gap-6">
      <div className="min-w-0">
        <h1
          className="text-3xl font-extrabold uppercase tracking-wide"
          style={{ color: "var(--primary)" }}
        >
          {title}
        </h1>
        <p className="mt-2 max-w-md text-[11px] leading-snug text-neutral-700">
          {tenant?.settings.address||`${COMPANY.addressLine1} ${COMPANY.addressLine2}`}
        </p>
      </div>
      <img src={tenant?.settings.logo_url||logoAsset.url} alt="Logo Sedyain" className="h-16 w-auto shrink-0 object-contain" />
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
  const {tenant}=useTenant();
  return (
    <div className="text-[11px] leading-relaxed">
      <p className="font-bold" style={{ color: "var(--primary)" }}>
        Contact Us:
      </p>
      <p>WA : {tenant?.settings.contact?.wa||COMPANY.contact.wa}</p>
      <p>IG : {tenant?.settings.contact?.ig||COMPANY.contact.ig}</p>
      <p>Email : {tenant?.settings.contact?.email||COMPANY.contact.email}</p>
    </div>
  );
}

export function BankBlock() {
  const {tenant}=useTenant();
  return (
    <div className="text-[11px] leading-relaxed">
      <p className="font-bold" style={{ color: "var(--primary)" }}>
        Pembayaran transfer ke:
      </p>
      <p className="font-bold">{tenant?.settings.bank?.name||COMPANY.bank.name}</p>
      <p>{tenant?.settings.bank?.account||COMPANY.bank.account}</p>
      <p>{tenant?.settings.bank?.holder||COMPANY.bank.holder}</p>
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
