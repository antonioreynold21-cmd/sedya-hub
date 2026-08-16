import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { ChevronLeft, ChevronRight, Pencil, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { supabase } from "@/integrations/supabase/client";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { DIVISIONS, PRIORITIES, TASK_STATUSES, formatDate, daysUntil } from "@/lib/sedyain";

export const Route = createFileRoute("/workflow")({
  head: () => ({
    meta: [
      { title: "Workflow Tim — Papan Kanban Sedyain Indonesia" },
      {
        name: "description",
        content:
          "Papan kanban tugas tim internal: To Do, In Progress, Review, Done dengan divisi, assignee, prioritas, dan due date.",
      },
      { property: "og:title", content: "Workflow Tim — Papan Kanban Sedyain Indonesia" },
      {
        property: "og:description",
        content: "Pantau tugas tim per divisi dari To Do sampai Done.",
      },
    ],
  }),
  component: WorkflowPage,
});

type Task = {
  id: string;
  title: string;
  division: string;
  assignee: string | null;
  priority: string;
  due_date: string | null;
  status: string;
};

const emptyForm = {
  title: "",
  division: "Operasional",
  assignee: "",
  priority: "Medium",
  due_date: "",
  status: "To Do",
};

const priorityClass: Record<string, string> = {
  Low: "bg-muted text-muted-foreground",
  Medium: "bg-accent text-accent-foreground",
  High: "bg-destructive text-destructive-foreground",
};

function WorkflowPage() {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [divisionFilter, setDivisionFilter] = useState("Semua");
  const [dragId, setDragId] = useState<string | null>(null);

  const { data: tasks = [] } = useQuery({
    queryKey: ["tasks"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("tasks")
        .select("*")
        .order("position")
        .order("created_at");
      if (error) throw error;
      return data as Task[];
    },
  });

  const { data: team = [] } = useQuery({
    queryKey: ["team-names"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("team_members")
        .select("name")
        .eq("is_active", true)
        .order("name");
      if (error) throw error;
      return (data ?? []).map((t) => t.name);
    },
  });

  const save = useMutation({
    mutationFn: async () => {
      const payload = {
        title: form.title.trim(),
        division: form.division,
        assignee: form.assignee || null,
        priority: form.priority,
        due_date: form.due_date || null,
        status: form.status,
      };
      if (editId) {
        const { error } = await supabase.from("tasks").update(payload).eq("id", editId);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("tasks").insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["tasks"] });
      toast.success("Task disimpan");
      setOpen(false);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const move = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const { error } = await supabase.from("tasks").update({ status }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["tasks"] }),
    onError: (e: Error) => toast.error(e.message),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("tasks").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["tasks"] });
      toast.success("Task dihapus");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const shown =
    divisionFilter === "Semua" ? tasks : tasks.filter((t) => t.division === divisionFilter);

  function shift(task: Task, dir: -1 | 1) {
    const i = TASK_STATUSES.indexOf(task.status as (typeof TASK_STATUSES)[number]);
    const next = TASK_STATUSES[Math.min(TASK_STATUSES.length - 1, Math.max(0, i + dir))];
    if (next && next !== task.status) move.mutate({ id: task.id, status: next });
  }

  return (
    <div>
      <PageHeader
        title="Workflow Tim"
        description="Papan kanban tugas internal. Geser kartu atau pakai tombol panah untuk pindah kolom."
        actions={
          <Button
            onClick={() => {
              setEditId(null);
              setForm(emptyForm);
              setOpen(true);
            }}
          >
            <Plus className="size-4" /> Tambah Task
          </Button>
        }
      />

      <div className="mb-4 flex flex-wrap items-center gap-2">
        <span className="text-sm text-muted-foreground">Divisi:</span>
        {["Semua", ...DIVISIONS].map((d) => (
          <Button
            key={d}
            size="sm"
            variant={divisionFilter === d ? "default" : "outline"}
            onClick={() => setDivisionFilter(d)}
          >
            {d}
          </Button>
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-4">
        {TASK_STATUSES.map((col) => {
          const colTasks = shown.filter((t) => t.status === col);
          return (
            <div
              key={col}
              onDragOver={(e) => e.preventDefault()}
              onDrop={() => {
                if (dragId) move.mutate({ id: dragId, status: col });
                setDragId(null);
              }}
              className="flex min-h-[200px] flex-col rounded-lg border border-border bg-muted/40 p-3"
            >
              <div className="mb-3 flex items-center justify-between">
                <h2 className="text-sm font-semibold text-primary">{col}</h2>
                <Badge className="bg-primary-soft text-primary">{colTasks.length}</Badge>
              </div>
              <div className="flex flex-col gap-2">
                {colTasks.map((t) => {
                  const d = daysUntil(t.due_date);
                  const overdue = d !== null && d < 0 && t.status !== "Done";
                  return (
                    <div
                      key={t.id}
                      draggable
                      onDragStart={() => setDragId(t.id)}
                      className="cursor-grab rounded-md border border-border bg-card p-3 card-soft active:cursor-grabbing"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <p className="text-sm font-medium leading-snug">{t.title}</p>
                        <Badge className={priorityClass[t.priority] ?? "bg-muted"}>
                          {t.priority}
                        </Badge>
                      </div>
                      <div className="mt-2 space-y-1 text-xs text-muted-foreground">
                        <p>{t.division}</p>
                        <p>{t.assignee ?? "Belum ada assignee"}</p>
                        <p className={overdue ? "font-semibold text-destructive" : ""}>
                          Due: {formatDate(t.due_date)}
                          {overdue ? " (terlambat)" : ""}
                        </p>
                      </div>
                      <div className="mt-2 flex items-center justify-between">
                        <div className="flex gap-1">
                          <Button
                            size="icon"
                            variant="ghost"
                            className="size-7"
                            onClick={() => shift(t, -1)}
                            disabled={t.status === "To Do"}
                          >
                            <ChevronLeft className="size-4" />
                          </Button>
                          <Button
                            size="icon"
                            variant="ghost"
                            className="size-7"
                            onClick={() => shift(t, 1)}
                            disabled={t.status === "Done"}
                          >
                            <ChevronRight className="size-4" />
                          </Button>
                        </div>
                        <div className="flex gap-1">
                          <Button
                            size="icon"
                            variant="ghost"
                            className="size-7"
                            onClick={() => {
                              setEditId(t.id);
                              setForm({
                                title: t.title,
                                division: t.division,
                                assignee: t.assignee ?? "",
                                priority: t.priority,
                                due_date: t.due_date ?? "",
                                status: t.status,
                              });
                              setOpen(true);
                            }}
                          >
                            <Pencil className="size-3.5" />
                          </Button>
                          <Button
                            size="icon"
                            variant="ghost"
                            className="size-7"
                            onClick={() => {
                              if (confirm("Hapus task ini?")) remove.mutate(t.id);
                            }}
                          >
                            <Trash2 className="size-3.5 text-destructive" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  );
                })}
                {colTasks.length === 0 && (
                  <p className="rounded-md border border-dashed border-border p-4 text-center text-xs text-muted-foreground">
                    Kosong
                  </p>
                )}
              </div>
            </div>
          );
        })}
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editId ? "Edit Task" : "Tambah Task"}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-3">
            <div className="grid gap-1.5">
              <Label>Task Name</Label>
              <Input
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
              />
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="grid gap-1.5">
                <Label>Divisi</Label>
                <Select
                  value={form.division}
                  onValueChange={(v) => setForm({ ...form, division: v })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {DIVISIONS.map((d) => (
                      <SelectItem key={d} value={d}>
                        {d}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-1.5">
                <Label>Assignee</Label>
                <Select
                  value={form.assignee}
                  onValueChange={(v) => setForm({ ...form, assignee: v })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Pilih anggota tim" />
                  </SelectTrigger>
                  <SelectContent>
                    {team.map((n) => (
                      <SelectItem key={n} value={n}>
                        {n}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid gap-3 sm:grid-cols-3">
              <div className="grid gap-1.5">
                <Label>Priority</Label>
                <Select
                  value={form.priority}
                  onValueChange={(v) => setForm({ ...form, priority: v })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {PRIORITIES.map((p) => (
                      <SelectItem key={p} value={p}>
                        {p}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-1.5">
                <Label>Due Date</Label>
                <Input
                  type="date"
                  value={form.due_date}
                  onChange={(e) => setForm({ ...form, due_date: e.target.value })}
                />
              </div>
              <div className="grid gap-1.5">
                <Label>Kolom</Label>
                <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {TASK_STATUSES.map((s) => (
                      <SelectItem key={s} value={s}>
                        {s}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>
              Batal
            </Button>
            <Button
              onClick={() => {
                if (!form.title.trim()) {
                  toast.error("Task name wajib diisi");
                  return;
                }
                save.mutate();
              }}
              disabled={save.isPending}
            >
              Simpan
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
