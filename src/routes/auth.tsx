import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import logoAsset from "@/assets/sedyain_logo.png.asset.json";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { BRAND_GREEN } from "@/lib/docs";

export const Route = createFileRoute("/auth")({
  ssr: false,
  validateSearch: (s: Record<string, unknown>) => ({ invite: typeof s.invite === "string" ? s.invite : undefined }),
  head: () => ({
    meta: [
      {property:"og:type",content:"website"},
      {name:"twitter:card",content:"summary_large_image"},
      { title: "Masuk Tim — Sedyain Hub" },
      {
        name: "description",
        content:
          "Halaman masuk untuk tim internal Sedyain Indonesia: akses CRM, Finance, Operasional, dan Workflow.",
      },
      { property: "og:title", content: "Masuk Tim — Sedyain Hub" },
      {
        property: "og:description",
        content: "Login akun tim internal Sedyain Indonesia untuk mengelola data operasional.",
      },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: AuthPage,
});

function AuthPage() {
  const navigate = useNavigate();
  const { invite } = Route.useSearch();
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [info, setInfo] = useState<{ business: string; email: string; role: string } | null>(null);
  const [inviteError, setInviteError] = useState(false);

  async function finish() {
    if (invite) {
      const { error } = await supabase.rpc("accept_tenant_invitation", { p_token: invite });
      if (error) throw error;
      toast.success("Undangan diterima");
    }
    window.location.href = "/";
  }

  useEffect(() => {
    if (invite) {
      supabase.rpc("preview_tenant_invitation", { p_token: invite }).then(({ data, error }) => {
        if (error || !data) { setInviteError(true); return; }
        const d = data as { business: string; email: string; role: string };
        setInfo(d); setEmail(d.email); setMode("signup");
      });
    }
    supabase.auth.getSession().then(({ data }) => {
      if (!data.session) return;
      if (!invite) { navigate({ to: "/" }); return; }
      finish().catch((err) => toast.error(err instanceof Error ? err.message : "Gagal menerima undangan"));
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [invite]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      if (mode === "signup") {
        if (!invite || !info) throw new Error("Pendaftaran hanya melalui undangan");
        const { error } = await supabase.auth.signUp({
          email: email.trim(),
          password,
          options: { emailRedirectTo: `${window.location.origin}/auth?invite=${encodeURIComponent(invite)}` },
        });
        if (error) throw error;
        toast.success("Akun dibuat. Buka tautan konfirmasi di email Anda, lalu masuk.");
        setMode("signin");
      } else {
        const { error } = await supabase.auth.signInWithPassword({
          email: email.trim(),
          password,
        });
        if (error) throw error;
        await finish();
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Gagal memproses permintaan");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#FAF7F0] px-4 py-10">
      <div className="w-full max-w-sm space-y-6 rounded-xl bg-white p-6 shadow-sm">
        <div className="flex flex-col items-center gap-3 text-center">
          <img src={logoAsset.url} alt="Logo Sedyain" className="h-10 w-auto object-contain" />
          <div>
            <h1 className="text-lg font-bold" style={{ color: BRAND_GREEN }}>
              Sedyain Hub
            </h1>
            <p className="text-xs text-neutral-600">Akses khusus tim internal</p>
          </div>
        </div>

        {inviteError && <p role="alert" className="rounded-md border border-destructive/40 p-3 text-sm text-destructive">Undangan tidak valid atau sudah tidak berlaku. Minta tautan baru ke Master bisnis.</p>}
        {info && <p className="rounded-md border border-border p-3 text-sm">Anda diundang ke <b>{info.business}</b> sebagai {info.role === "master" ? "Master" : "Staff"}. Daftar atau masuk dengan email <b>{info.email}</b>.</p>}
        <form className="space-y-4" onSubmit={submit}>
          <div className="space-y-1.5">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              autoComplete="email"
              required
              readOnly={Boolean(info)}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="nama@sedyain.id"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              type="password"
              autoComplete={mode === "signin" ? "current-password" : "new-password"}
              required
              minLength={8}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
            />
          </div>
          <Button type="submit" className="w-full" disabled={busy}>
            {mode === "signin" ? "Masuk" : "Daftar Akun Tim"}
          </Button>
        </form>

        {info ? <button
          type="button"
          className="w-full text-center text-xs text-neutral-600 underline"
          onClick={() => setMode(mode === "signin" ? "signup" : "signin")}
        >
          {mode === "signin" ? "Belum punya akun? Daftar" : "Sudah punya akun? Masuk"}
        </button> : <p className="text-center text-xs text-neutral-600">Pendaftaran akun hanya melalui tautan undangan dari Master bisnis.</p>}
      </div>
    </div>
  );
}
