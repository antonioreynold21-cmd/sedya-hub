import { useAccess } from "@/hooks/use-access";
import { useTenantQuery as useQuery } from "@/hooks/use-tenant-query";
import { createFileRoute, Link } from "@tanstack/react-router";

import {
  ArrowDownRight,
  ArrowUpRight,
  CheckCircle2,
  Clock,
  UserPlus,
} from "lucide-react";

import { supabase as rpcClient } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { tenantClient as supabase } from "@/lib/tenant-client";
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
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
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
  const { can } = useAccess();
  const { data, isPending, isError, refetch } = useQuery({
    throwOnError: false,
    queryKey: ["dashboard"],
    queryFn: async () => {
      const [payables, receivables, clients, tasks] = await Promise.all([
        can("finance") ? supabase.from("payables").select("id, vendor, amount, due_date, status, pic") : Promise.resolve({data:[],error:null}),
        can("finance") ? supabase.from("receivables").select("id, client_name, amount, due_date, status, pic") : Promise.resolve({data:[],error:null}),
        can("crm") ? supabase.from("clients").select("id, status") : Promise.resolve({data:[],error:null}),
        can("workflow") ? supabase.from("tasks").select("id, status, completed_at, due_date") : Promise.resolve({data:[],error:null}),
      ]);
      if (payables.error) throw payables.error;
      if (receivables.error) throw receivables.error;
      if (clients.error) throw clients.error;
      if (tasks.error) throw tasks.error;
      const invoiceResult=can('finance')?await rpcClient.rpc('finance_invoice_balances'):{data:[],error:null};if(invoiceResult.error)throw invoiceResult.error;
      const invoices=(invoiceResult.data??[]).filter(i=>i.invoice_state!=='cancelled').map(i=>({id:i.order_id,client_name:i.client_name,amount:Number(i.balance),due_date:i.due_date,status:i.balance<=0?'Lunas':'Belum Tertagih',pic:null,invoice_no:i.invoice_number}));
      const originalReceivables=can('finance')?await supabase.from('receivables').select('id,order_id,invoice_no'): {data:[],error:null};if(originalReceivables.error)throw originalReceivables.error;
      const legacyIds=new Set((originalReceivables.data??[]).filter(r=>!r.order_id&&!invoices.some(i=>i.invoice_no===r.invoice_no)).map(r=>r.id));
      return {
        payables: payables.data ?? [],
        receivables: [...(receivables.data??[]).filter(r=>legacyIds.has(r.id)),...invoices],
        clients: clients.data ?? [],
        tasks: tasks.data ?? [],
      };
    },
  });

  if(isError)return <div role="alert">Ringkasan gagal dimuat. <Button onClick={()=>refetch()}>Coba lagi</Button></div>;
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
    (t) => t.status === "Done" && new Date(t.completed_at as string).getTime() >= weekAgo,
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
      label: "Utang Belum Bayar", allowed:can("finance"),
      value: formatCompactRupiah(totalUnpaid),
      sub: `${unpaid.length} invoice vendor`,
      icon: ArrowUpRight,
    },
    {
      label: "Piutang Belum Tertagih", allowed:can("finance"),
      value: formatCompactRupiah(totalUncollected),
      sub: `${uncollected.length} invoice client`,
      icon: ArrowDownRight,
    },
    {
      label: "Lead Aktif", allowed:can("crm"),
      value: String(activeLeads),
      sub: "Lead Baru / Follow Up / Negosiasi",
      icon: UserPlus,
    },
    {
      label: "Task Selesai (7 hari)", allowed:can("workflow"),
      value: String(doneThisWeek),
      sub: "Kolom Done minggu ini",
      icon: CheckCircle2,
    },
    {
      label: "Task Tertunda", allowed:can("workflow"),
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
            <p className="mt-3 text-2xl font-bold text-primary">{!k.allowed ? "Tidak berizin" : isPending ? "Memuat…" : k.value}</p>
            <p className="mt-1 text-xs text-muted-foreground">{k.allowed ? k.sub : "Akses modul diperlukan"}</p>
          </div>
        ))}
      </div>

      {can('finance') ? <div className="mt-6 grid gap-4 lg:grid-cols-2">
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
      </div> : <p className="mt-6 text-sm text-muted-foreground">Ringkasan jatuh tempo: tidak berizin.</p>}
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
