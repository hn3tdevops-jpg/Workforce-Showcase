import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { fetchApi } from "@/lib/api-client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { StatusChip } from "@/components/ui/status-chip";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import {
  Wrench, Plus, AlertTriangle, CheckCircle2, Clock, Play, XCircle,
  HardHat, Download, Filter, Search,
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";

// ── Types ─────────────────────────────────────────────────────────────────────

interface MaintIssue {
  id: number;
  location_id: string;
  room_id: number | null;
  room_number: string | null;
  issue_type: string;
  title: string;
  description: string | null;
  severity: "low" | "normal" | "high" | "critical";
  status: "open" | "in_progress" | "resolved" | "closed";
  assignee_ep_id: string | null;
  assignee_ep_name: string | null;
  assignee_ep_title: string | null;
  reported_at: string;
  resolved_at: string | null;
}

interface Room { id: number; num: string; room_type: string; }

// ── Helpers ───────────────────────────────────────────────────────────────────

const SEVERITY_META: Record<string, { label: string; cls: string }> = {
  low:      { label: "Low",      cls: "bg-slate-500/15 text-slate-400 border-slate-500/30" },
  normal:   { label: "Normal",   cls: "bg-blue-500/15 text-blue-400 border-blue-500/30" },
  high:     { label: "High",     cls: "bg-amber-500/15 text-amber-400 border-amber-500/30" },
  critical: { label: "Critical", cls: "bg-red-500/15 text-red-400 border-red-500/30" },
};

const STATUS_META: Record<string, { label: string; icon: React.ReactNode; cls: string }> = {
  open:        { label: "Open",        icon: <Clock className="w-3 h-3" />,         cls: "bg-orange-500/15 text-orange-400 border-orange-500/30" },
  in_progress: { label: "In Progress", icon: <Play className="w-3 h-3" />,          cls: "bg-blue-500/15 text-blue-400 border-blue-500/30" },
  resolved:    { label: "Resolved",    icon: <CheckCircle2 className="w-3 h-3" />,  cls: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30" },
  closed:      { label: "Closed",      icon: <XCircle className="w-3 h-3" />,       cls: "bg-muted/60 text-muted-foreground border-border/40" },
};

const ISSUE_TYPES = ["general","plumbing","electrical","hvac","structural","amenity","safety","cleanliness"];

function SeverityBadge({ severity }: { severity: string }) {
  const m = SEVERITY_META[severity] ?? SEVERITY_META.normal;
  return <span className={`text-[10px] font-semibold px-2 py-0.5 rounded border ${m.cls}`}>{m.label}</span>;
}

function StatusBadge({ status }: { status: string }) {
  const m = STATUS_META[status] ?? STATUS_META.open;
  return (
    <span className={`inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded border ${m.cls}`}>
      {m.icon} {m.label}
    </span>
  );
}

// ── Sub-components ────────────────────────────────────────────────────────────

function IssueCard({
  issue, onStart, onResolve, onClose, isActing,
}: {
  issue: MaintIssue;
  onStart: (id: number) => void;
  onResolve: (id: number) => void;
  onClose: (id: number) => void;
  isActing: boolean;
}) {
  return (
    <Card className="border-border/50 bg-card/60 hover:bg-card/80 transition-colors">
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <div className="flex flex-wrap items-center gap-2 mb-1.5">
              <StatusBadge status={issue.status} />
              <SeverityBadge severity={issue.severity} />
              <span className="text-[10px] font-mono text-muted-foreground border border-border/40 px-1.5 rounded bg-muted/30">
                {issue.issue_type.replace(/_/g, " ")}
              </span>
              {issue.room_number && (
                <span className="text-[10px] text-cyan-400 font-mono border border-cyan-500/20 bg-cyan-500/10 px-1.5 rounded">
                  Room {issue.room_number}
                </span>
              )}
            </div>
            <p className="text-sm font-medium text-foreground leading-snug">{issue.title}</p>
            {issue.description && (
              <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{issue.description}</p>
            )}
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-2">
              <span className="text-[10px] text-muted-foreground">
                Reported {formatDistanceToNow(new Date(issue.reported_at), { addSuffix: true })}
              </span>
              {issue.assignee_ep_name && (
                <span className="text-[10px] text-muted-foreground">
                  Assigned: <span className="text-foreground/70">{issue.assignee_ep_name}</span>
                </span>
              )}
              {issue.resolved_at && (
                <span className="text-[10px] text-emerald-400">
                  Resolved {formatDistanceToNow(new Date(issue.resolved_at), { addSuffix: true })}
                </span>
              )}
            </div>
          </div>

          <div className="flex flex-col gap-1.5 shrink-0">
            {issue.status === "open" && (
              <Button size="sm" variant="outline" className="h-7 text-xs gap-1 border-blue-500/40 text-blue-400 hover:bg-blue-500/10"
                onClick={() => onStart(issue.id)} disabled={isActing}>
                <Play className="w-3 h-3" /> Start
              </Button>
            )}
            {(issue.status === "open" || issue.status === "in_progress") && (
              <Button size="sm" variant="outline" className="h-7 text-xs gap-1 border-emerald-500/40 text-emerald-400 hover:bg-emerald-500/10"
                onClick={() => onResolve(issue.id)} disabled={isActing}>
                <CheckCircle2 className="w-3 h-3" /> Resolve
              </Button>
            )}
            {issue.status === "resolved" && (
              <Button size="sm" variant="outline" className="h-7 text-xs gap-1 border-border/40 hover:bg-muted/30"
                onClick={() => onClose(issue.id)} disabled={isActing}>
                <XCircle className="w-3 h-3" /> Close
              </Button>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// ── Create Dialog ─────────────────────────────────────────────────────────────

function CreateIssueDialog({
  open, onOpenChange, rooms,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  rooms: Room[];
}) {
  const qc = useQueryClient();
  const { toast } = useToast();
  const [form, setForm] = useState({
    title: "", description: "", issue_type: "general",
    severity: "normal", room_id: "",
  });

  const create = useMutation({
    mutationFn: (body: Record<string, unknown>) =>
      fetchApi("/maintenance/", { method: "POST", body: JSON.stringify(body) }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/maintenance"] });
      toast({ title: "Issue created" });
      onOpenChange(false);
      setForm({ title: "", description: "", issue_type: "general", severity: "normal", room_id: "" });
    },
    onError: () => toast({ title: "Failed to create issue", variant: "destructive" }),
  });

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.title.trim()) return;
    create.mutate({
      ...form,
      room_id: form.room_id ? +form.room_id : undefined,
    });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md border-border/50">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-base">
            <HardHat className="w-4 h-4 text-amber-400" /> Report Maintenance Issue
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={submit} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2 space-y-1.5">
              <Label className="text-xs">Title *</Label>
              <Input placeholder="Brief description of the issue" className="h-8 text-sm"
                value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs">Issue Type</Label>
              <Select value={form.issue_type} onValueChange={v => setForm(f => ({ ...f, issue_type: v }))}>
                <SelectTrigger className="h-8 text-sm"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {ISSUE_TYPES.map(t => <SelectItem key={t} value={t}>{t.replace(/_/g, " ")}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs">Severity</Label>
              <Select value={form.severity} onValueChange={v => setForm(f => ({ ...f, severity: v }))}>
                <SelectTrigger className="h-8 text-sm"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">Low</SelectItem>
                  <SelectItem value="normal">Normal</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                  <SelectItem value="critical">Critical</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="col-span-2 space-y-1.5">
              <Label className="text-xs">Room (optional)</Label>
              <Select value={form.room_id} onValueChange={v => setForm(f => ({ ...f, room_id: v }))}>
                <SelectTrigger className="h-8 text-sm"><SelectValue placeholder="No specific room" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No specific room</SelectItem>
                  {rooms.map(r => (
                    <SelectItem key={r.id} value={String(r.id)}>Room {r.num} — {r.room_type}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="col-span-2 space-y-1.5">
              <Label className="text-xs">Description</Label>
              <Textarea placeholder="Additional details…" className="text-sm resize-none" rows={3}
                value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} />
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="ghost" size="sm" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit" size="sm" disabled={create.isPending || !form.title.trim()}
              className="bg-amber-500 hover:bg-amber-600 text-black">
              {create.isPending ? "Saving…" : "Report Issue"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────

const TABS = [
  { id: "open",        label: "Open",        statuses: ["open"] },
  { id: "in_progress", label: "In Progress",  statuses: ["in_progress"] },
  { id: "resolved",    label: "Resolved",     statuses: ["resolved", "closed"] },
] as const;

type TabId = (typeof TABS)[number]["id"];

export default function Maintenance() {
  const qc = useQueryClient();
  const { toast } = useToast();
  const [tab, setTab] = useState<TabId>("open");
  const [search, setSearch] = useState("");
  const [severityFilter, setSeverityFilter] = useState("all");
  const [showCreate, setShowCreate] = useState(false);

  // seed on first load
  const { data: _seed } = useQuery({
    queryKey: ["/maintenance/seed"],
    queryFn: () => fetchApi("/maintenance/seed", { method: "POST" }),
    retry: false,
    staleTime: Infinity,
  });

  const { data: summary } = useQuery({
    queryKey: ["/maintenance/summary"],
    queryFn: () => fetchApi("/maintenance/summary"),
  });

  const { data: rooms = [] } = useQuery<Room[]>({
    queryKey: ["/inventory/rooms"],
    queryFn: () => fetchApi("/inventory/rooms"),
  });

  const currentTab = TABS.find(t => t.id === tab)!;

  const { data: issues = [], isLoading } = useQuery<MaintIssue[]>({
    queryKey: ["/maintenance", tab],
    queryFn: async () => {
      const results = await Promise.all(
        currentTab.statuses.map(s => fetchApi<MaintIssue[]>(`/maintenance/?status=${s}`))
      );
      return results.flat();
    },
  });

  const filtered = issues.filter(i => {
    const q = search.toLowerCase();
    const matchSearch = !q || i.title.toLowerCase().includes(q) || (i.room_number ?? "").includes(q);
    const matchSev = severityFilter === "all" || i.severity === severityFilter;
    return matchSearch && matchSev;
  });

  const mutate = (path: string, method = "POST") => useMutation({
    mutationFn: (id: number) => fetchApi(`/maintenance/${id}/${path}`, { method }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["/maintenance"] }),
    onError: () => toast({ title: "Action failed", variant: "destructive" }),
  });

  const startM  = useMutation({
    mutationFn: (id: number) => fetchApi(`/maintenance/${id}/start`, { method: "POST" }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["/maintenance"] }); qc.invalidateQueries({ queryKey: ["/maintenance/summary"] }); },
    onError: () => toast({ title: "Action failed", variant: "destructive" }),
  });
  const resolveM = useMutation({
    mutationFn: (id: number) => fetchApi(`/maintenance/${id}/resolve`, { method: "POST" }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["/maintenance"] }); qc.invalidateQueries({ queryKey: ["/maintenance/summary"] }); },
    onError: () => toast({ title: "Action failed", variant: "destructive" }),
  });
  const closeM = useMutation({
    mutationFn: (id: number) => fetchApi(`/maintenance/${id}/close`, { method: "POST" }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["/maintenance"] }); qc.invalidateQueries({ queryKey: ["/maintenance/summary"] }); },
    onError: () => toast({ title: "Action failed", variant: "destructive" }),
  });

  const isActing = startM.isPending || resolveM.isPending || closeM.isPending;

  const byStatus = (summary as any)?.by_status ?? {};

  function downloadCsv() {
    window.open("/api/v1/maintenance/export.csv", "_blank");
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <HardHat className="w-6 h-6 text-amber-400" /> Maintenance
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Track and resolve property maintenance issues
          </p>
        </div>
        <div className="flex gap-2">
          <Button size="sm" variant="outline" className="h-8 text-xs gap-1.5" onClick={downloadCsv}>
            <Download className="w-3.5 h-3.5" /> Export CSV
          </Button>
          <Button size="sm" className="h-8 text-xs gap-1.5 bg-amber-500 hover:bg-amber-600 text-black"
            onClick={() => setShowCreate(true)}>
            <Plus className="w-3.5 h-3.5" /> Report Issue
          </Button>
        </div>
      </div>

      {/* KPI strip */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: "Open",        val: byStatus.open ?? 0,        icon: <AlertTriangle className="w-4 h-4 text-orange-400" />, cls: "border-orange-500/20" },
          { label: "In Progress", val: byStatus.in_progress ?? 0, icon: <Play className="w-4 h-4 text-blue-400" />,          cls: "border-blue-500/20" },
          { label: "Resolved",    val: byStatus.resolved ?? 0,    icon: <CheckCircle2 className="w-4 h-4 text-emerald-400" />, cls: "border-emerald-500/20" },
          { label: "Closed",      val: byStatus.closed ?? 0,      icon: <XCircle className="w-4 h-4 text-muted-foreground" />, cls: "border-border/40" },
        ].map(({ label, val, icon, cls }) => (
          <Card key={label} className={`border ${cls} bg-card/60`}>
            <CardContent className="p-4 flex items-center gap-3">
              {icon}
              <div>
                <div className="text-xl font-bold">{val}</div>
                <div className="text-xs text-muted-foreground">{label}</div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-1 border-b border-border/50 pb-0">
        {TABS.map(t => {
          const count = t.statuses.reduce((s, st) => s + (byStatus[st] ?? 0), 0);
          return (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors ${
                tab === t.id
                  ? "border-primary text-primary"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              }`}
            >
              {t.label}
              {count > 0 && (
                <span className="ml-1.5 text-[10px] bg-muted px-1.5 py-0.5 rounded font-mono">{count}</span>
              )}
            </button>
          );
        })}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-2">
        <div className="relative flex-1 min-w-[180px] max-w-xs">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
          <Input placeholder="Search issues…" className="pl-8 h-8 text-sm"
            value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <Select value={severityFilter} onValueChange={setSeverityFilter}>
          <SelectTrigger className="w-32 h-8 text-sm">
            <Filter className="w-3 h-3 mr-1" />
            <SelectValue placeholder="Severity" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Severity</SelectItem>
            <SelectItem value="low">Low</SelectItem>
            <SelectItem value="normal">Normal</SelectItem>
            <SelectItem value="high">High</SelectItem>
            <SelectItem value="critical">Critical</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Issue list */}
      {isLoading ? (
        <div className="space-y-3">
          {[1,2,3].map(i => <Skeleton key={i} className="h-28" />)}
        </div>
      ) : filtered.length === 0 ? (
        <Card className="border-border/50 bg-card/60">
          <CardContent className="py-16 text-center">
            <CheckCircle2 className="w-10 h-10 text-emerald-400/60 mx-auto mb-3" />
            <p className="text-sm font-medium">No {tab.replace("_"," ")} issues</p>
            <p className="text-xs text-muted-foreground mt-1">
              {tab === "open" ? "All clear — no open issues to display." : "Nothing here yet."}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {filtered.map(issue => (
            <IssueCard
              key={issue.id}
              issue={issue}
              onStart={id => startM.mutate(id)}
              onResolve={id => resolveM.mutate(id)}
              onClose={id => closeM.mutate(id)}
              isActing={isActing}
            />
          ))}
        </div>
      )}

      <CreateIssueDialog
        open={showCreate}
        onOpenChange={setShowCreate}
        rooms={rooms}
      />
    </div>
  );
}
