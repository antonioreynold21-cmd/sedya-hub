import { Link } from "@tanstack/react-router";

import { useAccess } from "@/hooks/use-access";
import { moduleForPath } from "@/lib/access";

export function ModuleGate({ pathname, children }: { pathname: string; children: React.ReactNode }) {
  const { can, isLoading, isError } = useAccess();
  const module = moduleForPath(pathname);

  if (!module) return <>{children}</>;

  if (isLoading) {
    return <p className="text-sm text-muted-foreground">Memeriksa akses...</p>;
  }

  if (isError || !can(module)) {
    return (
      <div className="mx-auto max-w-md rounded-lg border border-border bg-card p-6 text-center card-soft">
        <h1 className="text-lg font-semibold text-foreground">Akses ditolak</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Akun Anda belum diberi akses ke modul ini. Hubungi akun Master untuk meminta akses.
        </p>
        <Link
          to="/"
          className="mt-4 inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground"
        >
          Ke Dashboard
        </Link>
      </div>
    );
  }

  return <>{children}</>;
}
