import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ShieldCheck } from "lucide-react";
import { toast } from "sonner";

import { supabase } from "@/integrations/supabase/client";
import { PageHeader } from "@/components/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { useAccess } from "@/hooks/use-access";
import { MODULES, type ModuleKey } from "@/lib/access";

export const Route = createFileRoute("/_authenticated/akses")({
  head: () => ({
    meta: [
      { title: "Kelola Akses Tim — Sedyain Hub" },
      {
        name: "description",
        content:
          "Halaman Master untuk mengatur peran akun dan akses tiap modul Sedyain Hub per anggota tim.",
      },
      { property: "og:title", content: "Kelola Akses Tim — Sedyain Hub" },
      {
        property: "og:description",
        content: "Atur peran Master/Staff dan centang akses modul untuk setiap akun tim internal.",
      },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: AccessPage,
});

type Row = {
  user_id: string;
  email: string;
  role: "master" | "staff";
  modules: string[];
};

function AccessPage() {
  const qc = useQueryClient();
  const { isMaster, isLoading: accessLoading, access } = useAccess();

  const { data: users = [], isLoading } = useQuery({
    queryKey: ["admin_users"],
    enabled: isMaster,
    queryFn: async () => {
      const { data, error } = await supabase.rpc("admin_list_users");
      if (error) throw error;
      return (data ?? []) as Row[];
    },
  });

  const setModules = useMutation({
    mutationFn: async ({ userId, modules }: { userId: string; modules: string[] }) => {
      const { error } = await supabase.rpc("admin_set_modules", {
        p_user_id: userId,
        p_modules: modules,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin_users"] });
      qc.invalidateQueries({ queryKey: ["access"] });
      toast.success("Akses modul diperbarui");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const setRole = useMutation({
    mutationFn: async ({ userId, role }: { userId: string; role: "master" | "staff" }) => {
      const { error } = await supabase.rpc("admin_set_role", { p_user_id: userId, p_role: role });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin_users"] });
      qc.invalidateQueries({ queryKey: ["access"] });
      toast.success("Peran akun diperbarui");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  if (accessLoading) {
    return <p className="text-sm text-muted-foreground">Memeriksa akses...</p>;
  }

  if (!isMaster) {
    return (
      <div className="mx-auto max-w-md rounded-lg border border-border bg-card p-6 text-center card-soft">
        <h1 className="text-lg font-semibold text-foreground">Khusus akun Master</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Hanya akun Master yang bisa mengelola akses tim.
        </p>
      </div>
    );
  }

  function toggle(row: Row, key: ModuleKey, checked: boolean) {
    const next = new Set(row.modules);
    if (checked) next.add(key);
    else next.delete(key);
    setModules.mutate({ userId: row.user_id, modules: Array.from(next) });
  }

  return (
    <div>
      <PageHeader
        title="Kelola Akses Tim"
        description="Centang modul yang boleh dibuka tiap akun Staff. Akun Master otomatis punya akses penuh."
      />

      {isLoading ? (
        <p className="text-sm text-muted-foreground">Memuat daftar akun...</p>
      ) : (
        <div className="grid gap-4">
          {users.map((row) => {
            const master = row.role === "master";
            return (
              <div
                key={row.user_id}
                className="rounded-lg border border-border bg-card p-4 card-soft"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <p className="font-medium text-foreground">{row.email}</p>
                    <Badge
                      className={
                        master
                          ? "mt-1 bg-primary text-primary-foreground"
                          : "mt-1 bg-muted text-muted-foreground"
                      }
                    >
                      {master ? "Master" : "Staff"}
                    </Badge>
                  </div>
                  {master ? (
                    row.user_id !== access?.userId && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setRole.mutate({ userId: row.user_id, role: "staff" })}
                      >
                        Jadikan Staff
                      </Button>
                    )
                  ) : (
                    <Button
                      size="sm"
                      onClick={() => setRole.mutate({ userId: row.user_id, role: "master" })}
                    >
                      <ShieldCheck className="size-4" /> Jadikan Master
                    </Button>
                  )}
                </div>

                {master ? (
                  <p className="mt-3 text-xs text-muted-foreground">
                    Akun Master memiliki akses ke semua modul tanpa batasan.
                  </p>
                ) : (
                  <div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
                    {MODULES.map((m) => {
                      const forced = m.key === "dashboard";
                      const checked = forced || row.modules.includes(m.key);
                      return (
                        <div key={m.key} className="flex items-center gap-2">
                          <Checkbox
                            id={`${row.user_id}-${m.key}`}
                            checked={checked}
                            disabled={forced || setModules.isPending}
                            onCheckedChange={(v) => toggle(row, m.key, v === true)}
                          />
                          <Label
                            htmlFor={`${row.user_id}-${m.key}`}
                            className="text-sm font-normal text-foreground"
                          >
                            {m.label}
                            {forced && (
                              <span className="ml-1 text-xs text-muted-foreground">(wajib)</span>
                            )}
                          </Label>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
