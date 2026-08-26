import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import {
  ArrowDownRight,
  ArrowUpRight,
  CheckCircle2,
  Clock,
  UserPlus,
} from "lucide-react";

import { supabase } from "@/integrations/supabase/client";
import { PageHeader } from "@/components/page-header";
import { Badge } from "@/components/ui/badge";
import {
  formatCompactRupiah,
  formatDate,
  formatRupiah,
  urgencyLabel,
  urgencyOf,
  urgencyRowClass,
} from "@/lib/sedyain";

export const Route = createFileRoute("/_authenticated/")({
  head: () => ({
    meta: [
      { title: "Dashboard Internal — Sedyain Indonesia" },
      {
        name: "description",
        content:
          "Ringkasan KPI internal Sedyain Indonesia: utang, piutang, lead aktif, dan progres task tim dalam satu dashboard.",
      },
      { property: "og:title", content: "Dashboard Internal — Sedyain Indonesia" },
      {
        property: "og:description",
        content: "KPI utang, piutang, lead aktif, dan task tim Sedyain Indonesia.",
      },
    ],
  }),
  component: Dashboard,
});

type DueRow = {
  id: string;
  name: string;
  amount: number;
  due_date: string | null;
  pic: string | null;
};

function Dashboard() {
  const { data } = useQuery({
    queryKey: ["dashboard"],
    queryFn: async () => {
      const [payables, receivables, clients, tasks] = await Promise.all([
        supabase.from("payables").select("id, vendor, amount, due_date, status, pic"),
        supabase.from("receivables").select("id, client_name, amount, due_date, status, pic"),
        supabase.from("clients").select("id, status"),
        supabase.from("tasks").select("id, status, updated_at, due_date"),
      ]);
      if (payables.error) throw payables.error;
      if (receivables.error) throw receivables.error;
      if (clients.error) throw clients.error;
      if (tasks.error) throw tasks.error;
      return {
        payables: payables.data ?? [],
        receivables: receivables.data ?? [],
        clients: clients.data ?? [],
        tasks: tasks.data ?? [],
      };
    },
  });

  const payables = data?.payables ?? [];
  const receivables = data?.receivables ?? [];
  const clients = data?.clients ?? [];
  const tasks = data?.tasks ?? [];

  const unpaid = payables.filter((p) => p.status === "Belum Bayar");
  const uncollected = receivables.filter((r) => r.status === "Belum Tertagih");
  const totalUnpaid = unpaid.reduce((s, p) => s + Number(p.amount), 0);
  const totalUncollected = uncollected.reduce((s, r) => s + Number(r.amount), 0);
  const activeLeads = clients.filter((c) =>
    ["Lead Baru", "Follow Up", "Negosiasi"].includes(c.status),
  ).length;

  const weekAgo = Date.now() - 7 * 86_400_000;
  const doneThisWeek = tasks.filter(
    (t) => t.status === "Done" && new Date(t.updated_at as string).getTime() >= weekAgo,
  ).length;
  const pendingTasks = tasks.filter((t) => t.status !== "Done").length;

  const topPayables: DueRow[] = [...unpaid]
    .map((p) => ({
      id: p.id,
      name: p.vendor,
      amount: Number(p.amount),
      due_date: p.due_date,
      pic: p.pic,
    }))
    .sort((a, b) => (a.due_date ?? "9999").localeCompare(b.due_date ?? "9999"))
    .slice(0, 5);

  const topReceivables: DueRow[] = [...uncollected]
    .map((r) => ({
      id: r.id,
      name: r.client_name,
      amount: Number(r.amount),
      due_date: r.due_date,
      pic: r.pic,
    }))
    .sort((a, b) => (a.due_date ?? "9999").localeCompare(b.due_date ?? "9999"))
    .slice(0, 5);

  const kpis = [
    {
      label: "Utang Belum Bayar",
      value: formatCompactRupiah(totalUnpaid),
      sub: `${unpaid.length} invoice vendor`,
      icon: ArrowUpRight,
    },
    {
      label: "Piutang Belum Tertagih",
      value: formatCompactRupiah(totalUncollected),
      sub: `${uncollected.length} invoice client`,
      icon: ArrowDownRight,
    },
    {
      label: "Lead Aktif",
      value: String(activeLeads),
      sub: "Lead Baru / Follow Up / Negosiasi",
      icon: UserPlus,
    },
    {
      label: "Task Selesai (7 hari)",
      value: String(doneThisWeek),
      sub: "Kolom Done minggu ini",
      icon: CheckCircle2,
    },
    {
      label: "Task Tertunda",
      value: String(pendingTasks),
      sub: "Belum masuk kolom Done",
      icon: Clock,
    },
  ];

  return (
    <div>
      <PageHeader
        title="Dashboard"
        description="Ringkasan operasional, keuangan, dan progres tim Sedyain Indonesia."
      />

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
        {kpis.map((k) => (
          <div key={k.label} className="rounded-lg border border-border bg-card p-4 card-soft">
            <div className="flex items-center justify-between">
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                {k.label}
              </p>
              <span className="flex size-8 items-center justify-center rounded-md bg-primary-soft text-primary">
                <k.icon className="size-4" />
              </span>
            </div>
            <p className="mt-3 text-2xl font-bold text-primary">{k.value}</p>
            <p className="mt-1 text-xs text-muted-foreground">{k.sub}</p>
          </div>
        ))}
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        <DueList
          title="Top 5 Utang Segera Jatuh Tempo"
          rows={topPayables}
          partyLabel="Vendor"
          to="/finance"
        />
        <DueList
          title="Top 5 Piutang Segera Jatuh Tempo"
          rows={topReceivables}
          partyLabel="Client"
          to="/finance"
        />
      </div>
    </div>
  );
}

function DueList({
  title,
  rows,
  partyLabel,
  to,
}: {
  title: string;
  rows: DueRow[];
  partyLabel: string;
  to: "/finance";
}) {
  return (
    <section className="rounded-lg border border-border bg-card card-soft">
      <div className="flex items-center justify-between border-b border-border px-4 py-3">
        <h2 className="text-sm font-semibold text-primary">{title}</h2>
        <Link to={to} className="text-xs font-medium text-secondary hover:underline">
          Lihat semua
        </Link>
      </div>
      <ul className="divide-y divide-border">
        {rows.length === 0 && (
          <li className="px-4 py-6 text-center text-sm text-muted-foreground">
            Tidak ada tagihan aktif.
          </li>
        )}
        {rows.map((r) => {
          const level = urgencyOf(r.due_date, false);
          return (
            <li
              key={r.id}
              className={`flex flex-wrap items-center justify-between gap-2 px-4 py-3 ${urgencyRowClass[level]}`}
            >
              <div className="min-w-0">
                <p className="truncate text-sm font-medium">{r.name}</p>
                <p className="text-xs text-muted-foreground">
                  {partyLabel} · PIC {r.pic ?? "-"} · {formatDate(r.due_date)}
                </p>
              </div>
              <div className="text-right">
                <p className="text-sm font-semibold">{formatRupiah(r.amount)}</p>
                <Badge className="bg-card text-foreground">{urgencyLabel(r.due_date, false)}</Badge>
              </div>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
