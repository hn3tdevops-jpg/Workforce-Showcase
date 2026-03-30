import { useState, useMemo } from "react";
import { useAssignments } from "@/hooks/use-workforce";
import { fetchUsers, DEMO_MODE } from "@/lib/mock-adapter";
import { useQuery } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Sheet, SheetContent, SheetHeader, SheetTitle,
} from "@/components/ui/sheet";
import {
  Users, Search, Filter, Calendar, Briefcase,
  User, Hash, Clock, CheckCircle2, XCircle, AlertCircle, Loader2,
} from "lucide-react";
import { format, parseISO } from "date-fns";
import type { Assignment } from "@workspace/api-client-react/src/generated/api.schemas";

// ── Status & Role metadata ────────────────────────────────────────────────────

const STATUS_META: Record<string, { label: string; cls: string; icon: React.ElementType }> = {
  active:    { label: "Active",    cls: "bg-blue-500/15 text-blue-400 border-blue-500/30",      icon: Loader2 },
  pending:   { label: "Pending",   cls: "bg-amber-500/15 text-amber-400 border-amber-500/30",   icon: AlertCircle },
  confirmed: { label: "Confirmed", cls: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30", icon: CheckCircle2 },
  completed: { label: "Completed", cls: "bg-emerald-800/20 text-emerald-300 border-emerald-700/30", icon: CheckCircle2 },
  cancelled: { label: "Cancelled", cls: "bg-red-500/15 text-red-400 border-red-500/30",         icon: XCircle },
  draft:     { label: "Draft",     cls: "bg-muted/60 text-muted-foreground border-border/40",   icon: Clock },
};

const ROLE_META: Record<string, { label: string; color: string }> = {
  housekeeping: { label: "Housekeeping", color: "text-blue-400" },
  front_desk:   { label: "Front Desk",   color: "text-purple-400" },
  maintenance:  { label: "Maintenance",  color: "text-amber-400" },
  supervisor:   { label: "Supervisor",   color: "text-emerald-400" },
  concierge:    { label: "Concierge",    color: "text-pink-400" },
};

function roleMeta(role?: string) {
  return role ? (ROLE_META[role] ?? { label: role, color: "text-muted-foreground" }) : { label: "—", color: "text-muted-foreground" };
}

function statusMeta(status?: string) {
  const key = (status ?? "draft").toLowerCase();
  return STATUS_META[key] ?? { label: status ?? "Unknown", cls: "bg-muted/60 text-muted-foreground border-border/40", icon: Clock };
}

// ── Status chip ───────────────────────────────────────────────────────────────

function StatusChip({ status }: { status?: string }) {
  const m = statusMeta(status);
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full border text-[11px] font-medium ${m.cls}`}>
      {status === "active" ? (
        <span className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-pulse" />
      ) : (
        <m.icon className="w-3 h-3" />
      )}
      {m.label}
    </span>
  );
}

// ── Detail Sheet ──────────────────────────────────────────────────────────────

function AssignmentDetailSheet({
  assignment, open, onClose,
}: { assignment: Assignment | null; open: boolean; onClose: () => void }) {
  if (!assignment) return null;
  const rm = roleMeta(assignment.role);
  const sm = statusMeta(assignment.status);

  const rows = [
    { icon: User,      label: "Employee",    val: assignment.employee_name ?? assignment.employee_id },
    { icon: Briefcase, label: "Role",        val: rm.label },
    { icon: Hash,      label: "Shift ID",    val: assignment.shift_id },
    { icon: Hash,      label: "Assignment",  val: assignment.id },
    { icon: Calendar,  label: "Created",     val: assignment.created_at ? format(parseISO(assignment.created_at), "EEE, MMM d yyyy · h:mm a") : "—" },
  ];

  return (
    <Sheet open={open} onOpenChange={v => { if (!v) onClose(); }}>
      <SheetContent className="w-full sm:max-w-md border-border/50 bg-card flex flex-col gap-0 p-0">
        <SheetHeader className="px-5 pt-5 pb-4 border-b border-border/50 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-primary/15 border border-primary/20 flex items-center justify-center">
              <Users className="w-5 h-5 text-primary" />
            </div>
            <div>
              <SheetTitle className="text-base">{assignment.employee_name ?? "Unknown Employee"}</SheetTitle>
              <p className={`text-xs font-medium ${rm.color}`}>{rm.label}</p>
            </div>
            <div className="ml-auto">
              <StatusChip status={assignment.status} />
            </div>
          </div>
        </SheetHeader>

        <div className="flex-1 overflow-y-auto p-5 space-y-5">
          <div className="space-y-3">
            {rows.map(({ icon: Icon, label, val }) => (
              <div key={label} className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-md bg-muted/30 flex items-center justify-center shrink-0">
                  <Icon className="w-3.5 h-3.5 text-muted-foreground" />
                </div>
                <div className="min-w-0">
                  <p className="text-[10px] font-mono text-muted-foreground uppercase tracking-wider">{label}</p>
                  <p className="text-sm text-foreground mt-0.5 break-all">{val}</p>
                </div>
              </div>
            ))}
          </div>

          <Separator className="bg-border/40" />

          <div className="p-3 rounded-lg border border-border/40 bg-muted/10">
            <p className="text-[10px] font-mono text-muted-foreground uppercase tracking-wider mb-2">Shift Reference</p>
            <p className="font-mono text-xs text-primary break-all">{assignment.shift_id}</p>
            <p className="text-[10px] text-muted-foreground mt-1">
              View in Shifts to see full schedule details.
            </p>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}

// ── Skeleton rows ─────────────────────────────────────────────────────────────

function SkeletonRows() {
  return (
    <>
      {Array.from({ length: 6 }).map((_, i) => (
        <TableRow key={i} className="border-border/50">
          <TableCell><Skeleton className="h-4 w-32" /></TableCell>
          <TableCell><Skeleton className="h-4 w-20" /></TableCell>
          <TableCell><Skeleton className="h-4 w-24" /></TableCell>
          <TableCell><Skeleton className="h-4 w-28" /></TableCell>
          <TableCell><Skeleton className="h-5 w-20 rounded-full" /></TableCell>
        </TableRow>
      ))}
    </>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────

const ALL_STATUSES = ["active", "pending", "confirmed", "completed", "cancelled", "draft"];
const ALL_ROLES    = Object.keys(ROLE_META);
const NONE = "__none__";

export default function Assignments() {
  const { data: assignments, isLoading, isError } = useAssignments();

  const [search,   setSearch]   = useState("");
  const [filterStatus, setFilterStatus] = useState(NONE);
  const [filterRole,   setFilterRole]   = useState(NONE);
  const [selected, setSelected] = useState<Assignment | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);

  const filtered = useMemo(() => {
    if (!assignments) return [];
    return assignments.filter(a => {
      const q = search.toLowerCase();
      if (q && !(
        (a.employee_name ?? "").toLowerCase().includes(q) ||
        (a.role ?? "").toLowerCase().includes(q) ||
        a.shift_id.toLowerCase().includes(q) ||
        a.id.toLowerCase().includes(q)
      )) return false;
      if (filterStatus !== NONE && (a.status ?? "").toLowerCase() !== filterStatus) return false;
      if (filterRole   !== NONE && (a.role ?? "").toLowerCase() !== filterRole)     return false;
      return true;
    });
  }, [assignments, search, filterStatus, filterRole]);

  const handleRowClick = (a: Assignment) => {
    setSelected(a);
    setSheetOpen(true);
  };

  const counts = useMemo(() => {
    if (!assignments) return {};
    return assignments.reduce<Record<string, number>>((acc, a) => {
      const s = (a.status ?? "draft").toLowerCase();
      acc[s] = (acc[s] ?? 0) + 1;
      return acc;
    }, {});
  }, [assignments]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Staff Assignments</h1>
          <p className="text-muted-foreground text-sm mt-0.5">
            Track which employees are assigned to which shifts.
          </p>
        </div>

        {/* Stats pills */}
        {assignments && (
          <div className="flex flex-wrap gap-2 text-xs">
            {Object.entries(counts).map(([s, n]) => (
              <span key={s} className={`px-2.5 py-1 rounded-full border font-medium ${statusMeta(s).cls}`}>
                {n} {statusMeta(s).label}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-2">
        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground pointer-events-none" />
          <Input
            placeholder="Search employee, role, shift…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="pl-8 h-8 text-sm"
          />
        </div>

        <Select value={filterStatus} onValueChange={setFilterStatus}>
          <SelectTrigger className="h-8 text-xs w-[150px]">
            <Filter className="w-3 h-3 mr-1.5 text-muted-foreground" />
            <SelectValue placeholder="All statuses" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={NONE} className="text-xs">All statuses</SelectItem>
            {ALL_STATUSES.map(s => (
              <SelectItem key={s} value={s} className="text-xs capitalize">{statusMeta(s).label}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={filterRole} onValueChange={setFilterRole}>
          <SelectTrigger className="h-8 text-xs w-[160px]">
            <Briefcase className="w-3 h-3 mr-1.5 text-muted-foreground" />
            <SelectValue placeholder="All roles" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={NONE} className="text-xs">All roles</SelectItem>
            {ALL_ROLES.map(r => (
              <SelectItem key={r} value={r} className="text-xs">{roleMeta(r).label}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        {(search || filterStatus !== NONE || filterRole !== NONE) && (
          <Button variant="ghost" size="sm" className="h-8 text-xs" onClick={() => { setSearch(""); setFilterStatus(NONE); setFilterRole(NONE); }}>
            Clear
          </Button>
        )}
      </div>

      {/* Table */}
      <Card className="border-border/50 shadow-md overflow-hidden bg-card/50">
        {isLoading ? (
          <Table>
            <TableHeader className="bg-muted/30">
              <TableRow className="hover:bg-transparent border-border/50">
                <TableHead>Employee</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Shift Ref</TableHead>
                <TableHead>Created</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody><SkeletonRows /></TableBody>
          </Table>
        ) : isError ? (
          <div className="p-10 text-center">
            <AlertCircle className="w-8 h-8 text-destructive mx-auto mb-2" />
            <p className="text-destructive font-medium">Failed to load assignments</p>
            <p className="text-xs text-muted-foreground mt-1">Check that the API is reachable and try again.</p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="p-16 text-center flex flex-col items-center justify-center">
            <div className="w-14 h-14 rounded-full bg-accent/50 flex items-center justify-center mb-4">
              <Users className="w-7 h-7 text-muted-foreground" />
            </div>
            <h3 className="text-lg font-medium">
              {assignments?.length === 0 ? "No assignments yet" : "No results found"}
            </h3>
            <p className="text-muted-foreground max-w-sm mt-1 text-sm">
              {assignments?.length === 0
                ? "Staff assignments will appear here once scheduled."
                : "Try adjusting your search or filters."}
            </p>
            {(search || filterStatus !== NONE || filterRole !== NONE) && (
              <Button variant="outline" size="sm" className="mt-4 h-8 text-xs" onClick={() => { setSearch(""); setFilterStatus(NONE); setFilterRole(NONE); }}>
                Clear filters
              </Button>
            )}
          </div>
        ) : (
          <Table>
            <TableHeader className="bg-muted/30">
              <TableRow className="hover:bg-transparent border-border/50">
                <TableHead className="text-xs font-medium text-muted-foreground">Employee</TableHead>
                <TableHead className="text-xs font-medium text-muted-foreground">Role</TableHead>
                <TableHead className="text-xs font-medium text-muted-foreground">Shift Ref</TableHead>
                <TableHead className="text-xs font-medium text-muted-foreground">Created</TableHead>
                <TableHead className="text-xs font-medium text-muted-foreground">Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map(a => {
                const rm = roleMeta(a.role);
                return (
                  <TableRow
                    key={a.id}
                    className="border-border/50 hover:bg-accent/20 transition-colors cursor-pointer"
                    onClick={() => handleRowClick(a)}
                  >
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-full bg-primary/15 border border-primary/20 flex items-center justify-center shrink-0">
                          <span className="text-[10px] font-bold text-primary">
                            {(a.employee_name ?? "?").split(" ").map(n => n[0]).join("").slice(0, 2).toUpperCase()}
                          </span>
                        </div>
                        <span className="font-medium text-sm">{a.employee_name ?? a.employee_id}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <span className={`text-xs font-medium capitalize ${rm.color}`}>{rm.label}</span>
                    </TableCell>
                    <TableCell>
                      <span className="font-mono text-xs text-muted-foreground">
                        {a.shift_id.slice(0, 8)}…
                      </span>
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {a.created_at ? format(parseISO(a.created_at), "MMM d, yyyy") : "—"}
                    </TableCell>
                    <TableCell>
                      <StatusChip status={a.status} />
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}
      </Card>

      {/* Result count */}
      {!isLoading && !isError && filtered.length > 0 && (
        <p className="text-xs text-muted-foreground text-center">
          Showing {filtered.length} of {assignments?.length ?? 0} assignments
        </p>
      )}

      {/* Detail Sheet */}
      <AssignmentDetailSheet
        assignment={selected}
        open={sheetOpen}
        onClose={() => setSheetOpen(false)}
      />
    </div>
  );
}
