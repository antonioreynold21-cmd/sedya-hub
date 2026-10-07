import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  Outlet,
  Link,
  createRootRouteWithContext,
  useRouter,
  useRouterState,

  HeadContent,
  Scripts,
} from "@tanstack/react-router";
import { useEffect, type ReactNode } from "react";

import appCss from "../styles.css?url";
import { reportLovableError } from "../lib/lovable-error-reporting";
import { AppSidebar } from "@/components/app-sidebar";
import { TenantProvider, useTenant } from "@/components/tenant-provider";
import { ArchiveProvider } from "@/components/archive-dialog";
import { ModuleGate } from "@/components/module-gate";

import { supabase } from "@/integrations/supabase/client";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { Toaster } from "@/components/ui/sonner";

function NotFoundComponent() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-7xl font-bold text-foreground">404</h1>
        <h2 className="mt-4 text-xl font-semibold text-foreground">Halaman tidak ditemukan</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          Halaman yang Anda cari tidak ada atau sudah dipindahkan.
        </p>
        <div className="mt-6">
          <Link
            to="/"
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Ke Dashboard
          </Link>
        </div>
      </div>
    </div>
  );
}

function ErrorComponent({ error, reset }: { error: Error; reset: () => void }) {
  console.error(error);
  const router = useRouter();
  useEffect(() => {
    reportLovableError(error, { boundary: "tanstack_root_error_component" });
  }, [error]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-xl font-semibold tracking-tight text-foreground">
          Halaman gagal dimuat
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Terjadi kesalahan. Coba muat ulang atau kembali ke dashboard.
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          <button
            onClick={() => {
              router.options.context.queryClient.resetQueries();
              router.invalidate();
              reset();
            }}
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Coba lagi
          </button>
          <a
            href="/"
            className="inline-flex items-center justify-center rounded-md border border-input bg-background px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-accent"
          >
            Ke Dashboard
          </a>
        </div>
      </div>
    </div>
  );
}

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: "Sedyain Indonesia — Internal Ops" },
      {
        name: "description",
        content:
          "Aplikasi internal Sedyain Indonesia: CRM, Finance, Operasional, dan Workflow tim dalam satu tempat.",
      },
      { name: "author", content: "Sedyain Indonesia" },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
    links: [
      { rel: "stylesheet", href: appCss },
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "anonymous" },
      {
        rel: "stylesheet",
        href: "https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap",
      },
      { rel: "icon", href: "/favicon.ico", type: "image/x-icon" },
    ],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
  errorComponent: ErrorComponent,
});

function RootShell({ children }: { children: ReactNode }) {
  return (
    <html lang="id">
      <head>
        <HeadContent />
      </head>
      <body className="font-sans antialiased">
        {children}
        <Scripts />
      </body>
    </html>
  );
}

const BARE_PREFIXES = ["/t/", "/harga", "/auth"];

function RootComponent() {
  const { queryClient } = Route.useRouteContext();
  const pathname = useRouterState({ select: (r) => r.location.pathname });
  const isPublic = BARE_PREFIXES.some((p) => pathname === p || pathname.startsWith(p));
  const isBare =
    BARE_PREFIXES.some((p) => pathname === p || pathname.startsWith(p)) ||
    pathname.endsWith("/invoice") ||
    pathname.endsWith("/surat-jalan");

  if (isBare) {
    return (
      <QueryClientProvider client={queryClient}>
        {isPublic ? <Outlet /> : <TenantProvider><ArchiveProvider><ModuleGate pathname={pathname}><Outlet /></ModuleGate></ArchiveProvider></TenantProvider>}
        <Toaster position="top-right" richColors />
      </QueryClientProvider>
    );
  }

  return (
    <QueryClientProvider client={queryClient}>
      <TenantProvider><ArchiveProvider><SidebarProvider>
        <div className="flex min-h-screen w-full bg-background">
          <AppSidebar />
          <div className="flex min-w-0 flex-1 flex-col">
            <header className="sticky top-0 z-20 flex h-14 items-center gap-3 border-b border-border bg-card/90 px-4 backdrop-blur">
              <SidebarTrigger />
              <TenantName />
              <span className="hidden text-xs text-muted-foreground sm:inline">
                Supplier Bahan Baku HORECA
              </span>
              <button
                type="button"
                className="ml-auto inline-flex items-center rounded-md border border-input px-3 py-1.5 text-xs font-medium text-foreground transition-colors hover:bg-accent"
                onClick={async () => {
                  await supabase.auth.signOut();
                  queryClient.clear();
                  window.location.href = "/auth";
                }}
              >
                Keluar
              </button>
            </header>
            <main className="min-w-0 flex-1 p-4 md:p-6">
              {/* Required: nested routes render here. */}
              <ModuleGate pathname={pathname}>
                <Outlet />
              </ModuleGate>
            </main>

          </div>
        </div>
      </SidebarProvider></ArchiveProvider></TenantProvider>
      <Toaster position="top-right" richColors />
    </QueryClientProvider>
  );
}


function TenantName() {const {tenant}=useTenant();return <span className="text-sm font-semibold text-primary">{tenant?.name}</span>;}
