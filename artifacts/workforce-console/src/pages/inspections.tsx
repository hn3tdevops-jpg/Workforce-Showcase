import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { fetchApi } from "@/lib/api-client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  ClipboardCheck, Clock, CheckCircle2, XCircle, AlertCircle,
  RefreshCw, Plus, Play, Send, ThumbsUp, Loader2, ChevronDown, ChevronUp,
  Building2, Star, Download,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";

// ── Types ────────────────────────────────────────────────────────────────────

interface Inspection {
  id: string;
  room_id: number | null;
  location_id: string;
  inspector_ep_id: string | null;
  inspector_name: string | null;
  inspector_title: string | null;
  status: string;
  overall_score: number | null;
  passed: number | null;
  notes: string | null;
  items_json: string;
  scheduled_for: string | null;
  conducted_at: string | null;
  approved_at: string | null;
  created_at: string;
  room_number: string | null;
  room_type_name: string | null;
}

interface Summary {
  total: number;
  by_status: Record<string, number>;
  avg_score: number | null;
  pass_rate: number | null;
}

interface Employee {
  id: string;
  legal_first_name: string;
  legal_last_name: string;
  job_title: string | null;
}

interface Room {
  id: number;
  num: string;
  room_type: string | null;
  housekeeping_status: string;
}

// ── Helpers ──────────────────────────────────────────────────────────────────

const STATUS_META: Record<string, { label: string; color: string; icon: React.ComponentType<{ className?: string }> }> = {
  pending:     { label: "Pending",     color: "bg-yellow-900/40 text-yellow-300 border-yellow-700/40",  icon: Clock },
  in_progress: { label: "In Progress", color: "bg-blue-900/40 text-blue-300 border-blue-700/40",        icon: Play },
  passed:      { label: "Passed",      color: "bg-emerald-900/40 text-emerald-300 border-emerald-700/40", icon: CheckCircle2 },
  failed:      { label: "Failed",      color: "bg-red-900/40 text-red-300 border-red-700/40",           icon: XCircle },
  approved:    { label: "Approved",    color: "bg-purple-900/40 text-purple-300 border-purple-700/40",  icon: ThumbsUp },
  cancelled:   { label: "Cancelled",   color: "bg-zinc-900/40 text-zinc-400 border-zinc-700/40",        icon: XCircle },
};

function StatusBadge({ status }: { status: string }) {
  const meta = STATUS_META[status] ?? { label: status, color: "bg-muted text-muted-foreground border-border", icon: AlertCircle };
  const Icon = meta.icon;
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full border text-[11px] font-medium ${meta.color}`}>
      <Icon className="w-3 h-3" />
      {meta.label}
    </span>
  );
}

function ScorePill({ score }: { score: number | null }) {
  if (score === null) return <span className="text-muted-foreground text-xs">—</span>;
  const color = score >= 90 ? "text-emerald-400" : score >= 70 ? "text-yellow-400" : "text-red-400";
  return <span className={`font-bold text-sm ${color}`}>{score}</span>;
}

// ── Summary Stats ─────────────────────────────────────────────────────────────

function SummaryBar({ summary }: { summary: Summary }) {
  const stats = [
    { label: "Total",     value: summary.total },
    { label: "Pending",   value: summary.by_status.pending ?? 0 },
    { label: "In Progress", value: summary.by_status.in_progress ?? 0 },
    { label: "Passed",    value: summary.by_status.passed ?? 0 },
    { label: "Failed",    value: summary.by_status.failed ?? 0 },
    { label: "Approved",  value: summary.by_status.approved ?? 0 },
    { label: "Avg Score", value: summary.avg_score != null ? summary.avg_score.toFixed(1) : "—" },
    { label: "Pass Rate", value: summary.pass_rate != null ? `${summary.pass_rate}%` : "—" },
  ];
  return (
    <div className="grid grid-cols-4 sm:grid-cols-8 gap-2 mb-6">
      {stats.map(s => (
        <div key={s.label} className="bg-muted/30 border border-border/40 rounded-lg px-3 py-2 text-center">
          <p className="text-lg font-bold">{s.value}</p>
          <p className="text-[10px] text-muted-foreground uppercase tracking-wide">{s.label}</p>
        </div>
      ))}
    </div>
  );
}

// ── Inspection Card ───────────────────────────────────────────────────────────

function InspectionCard({ insp, onAction }: {
  insp: Inspection;
  onAction: (action: string, id: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const items: { label: string; score: number | null; passed: boolean | null }[] =
    (() => { try { return JSON.parse(insp.items_json); } catch { return []; } })();

  return (
    <div className="border border-border/40 rounded-lg bg-card">
      <button
        className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-muted/20 transition-colors rounded-lg"
        onClick={() => setOpen(o => !o)}
      >
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-medium text-sm">
              Room {insp.room_number ?? insp.room_id ?? "—"}
            </span>
            {insp.room_type_name && (
              <span className="text-xs text-muted-foreground">{insp.room_type_name}</span>
            )}
            <StatusBadge status={insp.status} />
          </div>
          <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
            {insp.inspector_name && <span>Inspector: {insp.inspector_name}</span>}
            {insp.scheduled_for && <span>Scheduled: {insp.scheduled_for}</span>}
            {insp.conducted_at && <span>Completed: {new Date(insp.conducted_at).toLocaleDateString()}</span>}
          </div>
        </div>
        <div className="flex items-center gap-3 shrink-0">
          <ScorePill score={insp.overall_score} />
          {open ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
        </div>
      </button>

      {open && (
        <div className="px-4 pb-4 border-t border-border/30 pt-3 space-y-3">
          {insp.notes && (
            <p className="text-xs text-muted-foreground italic">{insp.notes}</p>
          )}

          {items.length > 0 && (
            <div className="space-y-1">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Checklist Items</p>
              {items.map((item, i) => (
                <div key={i} className="flex items-center gap-2 text-xs">
                  {item.passed === true && <CheckCircle2 className="w-3 h-3 text-emerald-400" />}
                  {item.passed === false && <XCircle className="w-3 h-3 text-red-400" />}
                  {item.passed === null && <div className="w-3 h-3 rounded-full border border-border/60" />}
                  <span className={item.passed === false ? "text-red-400" : ""}>{item.label}</span>
                  {item.score != null && <span className="ml-auto text-muted-foreground">{item.score}/10</span>}
                </div>
              ))}
            </div>
          )}

          <div className="flex gap-2 pt-1 flex-wrap">
            {insp.status === "pending" && (
              <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => onAction("start", insp.id)}>
                <Play className="w-3 h-3 mr-1" />Start
              </Button>
            )}
            {["pending", "in_progress"].includes(insp.status) && (
              <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => onAction("submit", insp.id)}>
                <Send className="w-3 h-3 mr-1" />Submit Result
              </Button>
            )}
            {insp.status === "passed" && (
              <Button size="sm" variant="outline" className="h-7 text-xs text-purple-400 border-purple-800/40" onClick={() => onAction("approve", insp.id)}>
                <ThumbsUp className="w-3 h-3 mr-1" />Approve
              </Button>
            )}
            {["pending", "in_progress"].includes(insp.status) && (
              <Button size="sm" variant="ghost" className="h-7 text-xs text-destructive" onClick={() => onAction("cancel", insp.id)}>
                Cancel
              </Button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ── Create Dialog ─────────────────────────────────────────────────────────────

function CreateDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const qc = useQueryClient();
  const { toast } = useToast();
  const [form, setForm] = useState({ room_id: "", scheduled_for: "", notes: "" });

  const { data: rooms = [] } = useQuery<Room[]>({
    queryKey: ["rooms-for-inspection"],
    queryFn: () => fetchApi("/inspections/rooms"),
    enabled: open,
  });

  const { data: employees = [] } = useQuery<Employee[]>({
    queryKey: ["employees-brief"],
    queryFn: () => fetchApi("/workforce/employees"),
    enabled: open,
  });
  const [inspectorEpId, setInspectorEpId] = useState("");

  const mut = useMutation({
    mutationFn: (body: object) => fetchApi("/inspections", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["inspections"] });
      qc.invalidateQueries({ queryKey: ["inspections-summary"] });
      toast({ title: "Inspection scheduled" });
      onClose();
    },
    onError: (e: Error) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.room_id) { toast({ title: "Select a room", variant: "destructive" }); return; }
    mut.mutate({ ...form, room_id: +form.room_id, inspector_ep_id: (inspectorEpId && inspectorEpId !== "__none__") ? inspectorEpId : undefined });
  };

  return (
    <Dialog open={open} onOpenChange={v => !v && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Schedule Inspection</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1">
            <Label>Room</Label>
            <Select value={form.room_id} onValueChange={v => setForm(f => ({ ...f, room_id: v }))}>
              <SelectTrigger><SelectValue placeholder="Select room…" /></SelectTrigger>
              <SelectContent>
                {rooms.map((r: Room) => (
                  <SelectItem key={r.id} value={String(r.id)}>Room {r.num}{r.room_type ? ` — ${r.room_type}` : ""}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label>Inspector (optional)</Label>
            <Select value={inspectorEpId} onValueChange={setInspectorEpId}>
              <SelectTrigger><SelectValue placeholder="Assign inspector…" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="__none__">Unassigned</SelectItem>
                {(employees as Employee[]).map((ep: Employee) => (
                  <SelectItem key={ep.id} value={ep.id}>
                    {ep.legal_first_name} {ep.legal_last_name}{ep.job_title ? ` (${ep.job_title})` : ""}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label>Scheduled Date</Label>
            <Input type="date" value={form.scheduled_for} onChange={e => setForm(f => ({ ...f, scheduled_for: e.target.value }))} />
          </div>
          <div className="space-y-1">
            <Label>Notes</Label>
            <Textarea rows={2} value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} placeholder="Optional notes…" />
          </div>
          <DialogFooter>
            <Button type="button" variant="ghost" onClick={onClose}>Cancel</Button>
            <Button type="submit" disabled={mut.isPending}>
              {mut.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Schedule
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ── Submit Dialog ─────────────────────────────────────────────────────────────

function SubmitDialog({
  inspectionId, open, onClose,
}: { inspectionId: string; open: boolean; onClose: () => void }) {
  const qc = useQueryClient();
  const { toast } = useToast();
  const [score, setScore] = useState("85");
  const [passed, setPassed] = useState("true");
  const [notes, setNotes] = useState("");

  const mut = useMutation({
    mutationFn: () => fetchApi(`/inspections/${inspectionId}/submit`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ overall_score: +score, passed: passed === "true", notes }),
    }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["inspections"] });
      qc.invalidateQueries({ queryKey: ["inspections-summary"] });
      toast({ title: passed === "true" ? "Inspection passed!" : "Inspection marked as failed" });
      onClose();
    },
    onError: (e: Error) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  return (
    <Dialog open={open} onOpenChange={v => !v && onClose()}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Submit Inspection Result</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-1">
            <Label>Overall Score (0–100)</Label>
            <Input type="number" min={0} max={100} value={score} onChange={e => setScore(e.target.value)} />
          </div>
          <div className="space-y-1">
            <Label>Result</Label>
            <Select value={passed} onValueChange={setPassed}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="true">Pass</SelectItem>
                <SelectItem value="false">Fail</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label>Notes</Label>
            <Textarea rows={2} value={notes} onChange={e => setNotes(e.target.value)} placeholder="Optional…" />
          </div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button onClick={() => mut.mutate()} disabled={mut.isPending}>
            {mut.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            Submit
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────

type TabId = "pending" | "completed" | "history";

export default function Inspections() {
  const qc = useQueryClient();
  const { toast } = useToast();
  const [tab, setTab] = useState<TabId>("pending");
  const [createOpen, setCreateOpen] = useState(false);
  const [submitId, setSubmitId] = useState<string | null>(null);

  const { data: allInspections = [], isLoading, refetch } = useQuery<Inspection[]>({
    queryKey: ["inspections"],
    queryFn: () => fetchApi("/inspections"),
  });

  const { data: summary } = useQuery<Summary>({
    queryKey: ["inspections-summary"],
    queryFn: () => fetchApi("/inspections/summary"),
  });

  const actionMut = useMutation({
    mutationFn: ({ action, id }: { action: string; id: string }) =>
      fetchApi(`/inspections/${id}/${action}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["inspections"] });
      qc.invalidateQueries({ queryKey: ["inspections-summary"] });
      toast({ title: "Updated" });
    },
    onError: (e: Error) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const cancelMut = useMutation({
    mutationFn: (id: string) => fetchApi(`/inspections/${id}`, { method: "DELETE" }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["inspections"] });
      qc.invalidateQueries({ queryKey: ["inspections-summary"] });
      toast({ title: "Cancelled" });
    },
  });

  const handleAction = (action: string, id: string) => {
    if (action === "submit") { setSubmitId(id); return; }
    if (action === "cancel") { cancelMut.mutate(id); return; }
    actionMut.mutate({ action, id });
  };

  const TABS: { id: TabId; label: string; statuses: string[] }[] = [
    { id: "pending",   label: "Pending",   statuses: ["pending", "in_progress"] },
    { id: "completed", label: "Completed", statuses: ["passed", "failed", "approved"] },
    { id: "history",   label: "All",       statuses: Object.keys(STATUS_META) },
  ];

  const activeStatuses = TABS.find(t => t.id === tab)!.statuses;
  const filtered = allInspections.filter(i => activeStatuses.includes(i.status));

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <ClipboardCheck className="w-6 h-6 text-primary" />
            Inspections
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Room quality control and inspection management
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <Button size="sm" variant="outline" onClick={() => refetch()}>
            <RefreshCw className="w-4 h-4" />
          </Button>
          <Button size="sm" variant="outline" onClick={() => window.open("/api/v1/inspections/export.csv", "_blank")}>
            <Download className="w-4 h-4 mr-1" />
            <span className="hidden sm:inline">Export CSV</span>
          </Button>
          <Button size="sm" onClick={() => setCreateOpen(true)}>
            <Plus className="w-4 h-4 mr-1" />
            <span className="hidden sm:inline">Schedule</span> Inspection
          </Button>
        </div>
      </div>

      {/* Summary */}
      {summary && <SummaryBar summary={summary} />}

      {/* Seed Button (dev) */}
      <SeedButton onSeeded={() => { qc.invalidateQueries({ queryKey: ["inspections"] }); qc.invalidateQueries({ queryKey: ["inspections-summary"] }); }} />

      {/* Tabs */}
      <div className="border-b border-border/40">
        <nav className="flex gap-1">
          {TABS.map(t => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                tab === t.id
                  ? "border-primary text-foreground"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              }`}
            >
              {t.label}
              <span className="ml-1.5 text-[11px] text-muted-foreground">
                ({tab === "history" ? allInspections.length : allInspections.filter(i => t.statuses.includes(i.status)).length})
              </span>
            </button>
          ))}
        </nav>
      </div>

      {/* List */}
      {isLoading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <Building2 className="w-12 h-12 text-muted-foreground/30 mb-3" />
          <p className="text-muted-foreground">No inspections in this category</p>
          {tab === "pending" && (
            <Button size="sm" variant="outline" className="mt-3" onClick={() => setCreateOpen(true)}>
              Schedule one now
            </Button>
          )}
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map(insp => (
            <InspectionCard key={insp.id} insp={insp} onAction={handleAction} />
          ))}
        </div>
      )}

      <CreateDialog open={createOpen} onClose={() => setCreateOpen(false)} />
      {submitId && (
        <SubmitDialog inspectionId={submitId} open={!!submitId} onClose={() => setSubmitId(null)} />
      )}
    </div>
  );
}

function SeedButton({ onSeeded }: { onSeeded: () => void }) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  const handleSeed = async () => {
    setLoading(true);
    try {
      const result = await fetchApi<{ ok: boolean; seeded: number; message?: string }>("/inspections/seed", { method: "POST" });
      if (result.seeded > 0) {
        toast({ title: `Seeded ${result.seeded} sample inspections` });
        onSeeded();
      } else {
        toast({ title: result.message ?? "Already seeded" });
      }
      setDone(true);
    } catch (e) {
      toast({ title: "Seed failed", description: (e as Error).message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  if (done) return null;

  return (
    <div className="flex items-center gap-2 text-xs text-muted-foreground bg-muted/20 border border-border/30 rounded px-3 py-2">
      <Star className="w-3 h-3" />
      <span>No sample data yet?</span>
      <button
        onClick={handleSeed}
        disabled={loading}
        className="text-primary underline hover:no-underline disabled:opacity-50"
      >
        {loading ? "Seeding…" : "Load sample inspections"}
      </button>
    </div>
  );
}
