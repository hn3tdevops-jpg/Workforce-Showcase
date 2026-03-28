import { useState, useMemo, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  format, addWeeks, startOfWeek, addDays, parseISO, isToday, formatDistanceToNow,
} from "date-fns";
import {
  fetchShifts, createShift, updateShift, deleteShift,
  addAssigneeToShift, removeAssigneeFromShift,
  fetchSwapRequests, createSwapRequest, resolveSwapRequest,
  fetchMarketplaceListings, postToMarketplace,
  claimMarketplaceListing, cancelMarketplaceListing,
  DEMO_MODE,
} from "@/lib/mock-adapter";
import type { MockShift, MockSwapRequest, MockMarketplaceListing, ShiftRole, ShiftStatus, ShiftAssignee } from "@/lib/mock-adapter";
import { MOCK_USERS } from "@/lib/mock-data";
import { useLocation } from "@/lib/location-context";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuTrigger, DropdownMenuSeparator, DropdownMenuLabel,
} from "@/components/ui/dropdown-menu";
import { useToast } from "@/hooks/use-toast";
import {
  CalendarDays, List, Plus, ChevronLeft, ChevronRight, X, Users, Clock, Store,
  Check, Ban, Trash2, MoreHorizontal, ArrowRightLeft, UserPlus, UserMinus,
  Star, Loader2, BriefcaseBusiness,
} from "lucide-react";

// ── Constants ─────────────────────────────────────────────────────────────────

const ROLE_META: Record<ShiftRole, { label: string; color: string; bg: string; border: string }> = {
  housekeeping: { label: "Housekeeping", color: "#3b82f6", bg: "bg-blue-500/15",    border: "border-blue-500/30" },
  front_desk:   { label: "Front Desk",   color: "#a855f7", bg: "bg-purple-500/15",  border: "border-purple-500/30" },
  maintenance:  { label: "Maintenance",  color: "#f59e0b", bg: "bg-amber-500/15",   border: "border-amber-500/30" },
  supervisor:   { label: "Supervisor",   color: "#10b981", bg: "bg-emerald-500/15", border: "border-emerald-500/30" },
  concierge:    { label: "Concierge",    color: "#ec4899", bg: "bg-pink-500/15",    border: "border-pink-500/30" },
};

const STATUS_META: Record<ShiftStatus, { label: string; cls: string }> = {
  open:        { label: "Open",        cls: "bg-orange-500/15 text-orange-400 border-orange-500/30" },
  partial:     { label: "Partial",     cls: "bg-yellow-500/15 text-yellow-400 border-yellow-500/30" },
  filled:      { label: "Filled",      cls: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30" },
  draft:       { label: "Draft",       cls: "bg-muted/60 text-muted-foreground border-border/40" },
  cancelled:   { label: "Cancelled",   cls: "bg-red-500/15 text-red-400 border-red-500/30" },
  in_progress: { label: "In Progress", cls: "bg-blue-500/15 text-blue-400 border-blue-500/30" },
  completed:   { label: "Completed",   cls: "bg-emerald-800/20 text-emerald-300 border-emerald-700/30" },
};

const SHIFT_ROLES: ShiftRole[] = ["housekeeping", "front_desk", "maintenance", "supervisor", "concierge"];
const CAL_START = 6;
const CAL_END   = 24;
const HR_PX     = 56;

// ── Helpers ───────────────────────────────────────────────────────────────────

function toMin(t: string) { const [h, m] = t.split(":").map(Number); return h * 60 + m; }
function durMin(s: MockShift) { const d = toMin(s.end_time) - toMin(s.start_time); return d <= 0 ? d + 1440 : d; }
function fmt12(t: string) {
  const [h, m] = t.split(":").map(Number);
  return `${h % 12 || 12}${m ? `:${String(m).padStart(2, "0")}` : ""} ${h >= 12 ? "PM" : "AM"}`;
}
function uName(id: string) { const u = MOCK_USERS.find(u => u.id === id); return u ? `${u.first_name} ${u.last_name}` : id; }
function uInit(id: string) { const u = MOCK_USERS.find(u => u.id === id); return u ? `${u.first_name[0]}${u.last_name[0]}` : "?"; }

// ── Atoms ─────────────────────────────────────────────────────────────────────

function RoleChip({ role, sm }: { role: ShiftRole; sm?: boolean }) {
  const m = ROLE_META[role] ?? ROLE_META.housekeeping;
  return <span className={`inline-flex items-center rounded-full border font-medium ${m.bg} ${m.border} ${sm ? "text-[10px] px-1.5 leading-tight" : "text-xs px-2 py-0.5"}`} style={{ color: m.color }}>{m.label}</span>;
}
function StatusPill({ status }: { status: ShiftStatus }) {
  const m = STATUS_META[status] ?? STATUS_META.open;
  return <span className={`inline-flex items-center rounded-full border text-[10px] px-1.5 py-0 leading-tight font-medium ${m.cls}`}>{m.label}</span>;
}
function AvatarStack({ ids, limit = 4 }: { ids: string[]; limit?: number }) {
  const vis = ids.slice(0, limit);
  const extra = ids.length - limit;
  return (
    <div className="flex -space-x-1.5 items-center">
      {vis.map(id => (
        <div key={id} title={uName(id)} className="w-6 h-6 rounded-full bg-primary/20 border-2 border-card flex items-center justify-center text-[9px] font-bold text-primary shrink-0">{uInit(id)}</div>
      ))}
      {extra > 0 && <div className="w-6 h-6 rounded-full bg-muted border-2 border-card flex items-center justify-center text-[9px] text-muted-foreground shrink-0">+{extra}</div>}
      {ids.length === 0 && <span className="text-[10px] text-muted-foreground/50 italic">Unassigned</span>}
    </div>
  );
}

// ── Create/Edit Shift Dialog ──────────────────────────────────────────────────

function ShiftFormDialog({ open, onClose, initial, defaultDate, locationId }: {
  open: boolean; onClose: () => void; initial?: Partial<MockShift>; defaultDate?: string; locationId: string;
}) {
  const qc = useQueryClient();
  const { toast } = useToast();
  const isEdit = !!initial?.id;
  const [title, setTitle] = useState(initial?.title ?? "");
  const [role,  setRole]  = useState<ShiftRole>(initial?.role ?? "housekeeping");
  const [date,  setDate]  = useState(initial?.date ?? defaultDate ?? format(new Date(), "yyyy-MM-dd"));
  const [start, setStart] = useState(initial?.start_time ?? "08:00");
  const [end,   setEnd]   = useState(initial?.end_time ?? "16:00");
  const [cap,   setCap]   = useState(String(initial?.capacity ?? 1));
  const [notes, setNotes] = useState(initial?.notes ?? "");

  const mut = useMutation({
    mutationFn: () => isEdit
      ? updateShift(initial!.id!, { title, role, date, start_time: start, end_time: end, capacity: +cap, notes })
      : createShift({ title, role, date, start_time: start, end_time: end, location_id: locationId, assignee_ids: [], capacity: +cap, status: "open", notes }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["shifts"] }); toast({ title: isEdit ? "Shift updated" : "Shift created" }); onClose(); },
    onError: () => toast({ title: "Failed to save shift", variant: "destructive" }),
  });

  return (
    <Dialog open={open} onOpenChange={v => { if (!v) onClose(); }}>
      <DialogContent className="max-w-md border-border/50 bg-card">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-sm">
            <CalendarDays className="w-4 h-4 text-primary" />{isEdit ? "Edit Shift" : "Create Shift"}
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-3 py-2">
          <div><Label className="text-xs mb-1.5 block">Title</Label><Input value={title} onChange={e => setTitle(e.target.value)} placeholder="e.g. Morning Housekeeping" className="h-8 text-sm" /></div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs mb-1.5 block">Role</Label>
              <Select value={role} onValueChange={v => setRole(v as ShiftRole)}>
                <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>{SHIFT_ROLES.map(r => <SelectItem key={r} value={r} className="text-xs">{ROLE_META[r].label}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div><Label className="text-xs mb-1.5 block">Capacity</Label><Input type="number" min={1} max={20} value={cap} onChange={e => setCap(e.target.value)} className="h-8 text-sm" /></div>
          </div>
          <div><Label className="text-xs mb-1.5 block">Date</Label><Input type="date" value={date} onChange={e => setDate(e.target.value)} className="h-8 text-sm" /></div>
          <div className="grid grid-cols-2 gap-3">
            <div><Label className="text-xs mb-1.5 block">Start</Label><Input type="time" value={start} onChange={e => setStart(e.target.value)} className="h-8 text-sm" /></div>
            <div><Label className="text-xs mb-1.5 block">End</Label><Input type="time" value={end} onChange={e => setEnd(e.target.value)} className="h-8 text-sm" /></div>
          </div>
          <div><Label className="text-xs mb-1.5 block">Notes</Label><Textarea value={notes} onChange={e => setNotes(e.target.value)} className="text-xs min-h-[56px] resize-none" placeholder="Optional notes…" /></div>
        </div>
        <DialogFooter>
          <Button variant="ghost" size="sm" onClick={onClose} className="h-8 text-xs">Cancel</Button>
          <Button size="sm" className="h-8 text-xs" onClick={() => mut.mutate()} disabled={mut.isPending || !title.trim()}>
            {mut.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : isEdit ? "Save" : "Create"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ── Swap Request Dialog ───────────────────────────────────────────────────────

function SwapRequestDialog({ open, onClose, shift }: { open: boolean; onClose: () => void; shift: MockShift }) {
  const qc = useQueryClient();
  const { toast } = useToast();
  const [target, setTarget] = useState("__open__");
  const [msg, setMsg] = useState("");

  const mut = useMutation({
    mutationFn: () => createSwapRequest({ shift_id: shift.id, requester_id: "user-001", target_user_id: target === "__open__" ? null : target, status: "pending", message: msg }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["swaps"] }); toast({ title: "Swap request sent" }); onClose(); },
    onError: () => toast({ title: "Failed", variant: "destructive" }),
  });

  return (
    <Dialog open={open} onOpenChange={v => { if (!v) onClose(); }}>
      <DialogContent className="max-w-sm border-border/50 bg-card">
        <DialogHeader><DialogTitle className="text-sm flex items-center gap-2"><ArrowRightLeft className="w-4 h-4 text-primary" />Request Shift Swap</DialogTitle></DialogHeader>
        <div className="space-y-3 py-2">
          <div className="p-3 rounded-lg border border-border/40 bg-muted/20 text-xs">
            <p className="font-medium">{shift.title}</p>
            <p className="text-muted-foreground mt-0.5">{format(parseISO(shift.date), "EEE, MMM d")} · {fmt12(shift.start_time)}–{fmt12(shift.end_time)}</p>
          </div>
          <div>
            <Label className="text-xs mb-1.5 block">Swap with (optional)</Label>
            <Select value={target} onValueChange={setTarget}>
              <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="__open__" className="text-xs">Open swap — anyone can take</SelectItem>
                {MOCK_USERS.filter(u => u.is_active).map(u => <SelectItem key={u.id} value={u.id} className="text-xs">{u.first_name} {u.last_name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div><Label className="text-xs mb-1.5 block">Message</Label><Textarea value={msg} onChange={e => setMsg(e.target.value)} className="text-xs min-h-[56px] resize-none" placeholder="Reason for swap…" /></div>
        </div>
        <DialogFooter>
          <Button variant="ghost" size="sm" onClick={onClose} className="h-8 text-xs">Cancel</Button>
          <Button size="sm" className="h-8 text-xs gap-1" onClick={() => mut.mutate()} disabled={mut.isPending}>
            {mut.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <><ArrowRightLeft className="w-3 h-3" />Send</>}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ── Post to Marketplace Dialog ────────────────────────────────────────────────

function MarketplacePostDialog({ open, onClose, shift }: { open: boolean; onClose: () => void; shift: MockShift }) {
  const qc = useQueryClient();
  const { toast } = useToast();
  const [bonus, setBonus] = useState("");
  const [note,  setNote]  = useState("");

  const mut = useMutation({
    mutationFn: () => postToMarketplace({ shift_id: shift.id, posted_by_user_id: "user-001", status: "open", bonus_usd: bonus ? +bonus : undefined, note }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["marketplace"] }); toast({ title: "Shift posted to marketplace" }); onClose(); },
    onError: () => toast({ title: "Failed", variant: "destructive" }),
  });

  return (
    <Dialog open={open} onOpenChange={v => { if (!v) onClose(); }}>
      <DialogContent className="max-w-sm border-border/50 bg-card">
        <DialogHeader><DialogTitle className="text-sm flex items-center gap-2"><Store className="w-4 h-4 text-primary" />Post to Marketplace</DialogTitle></DialogHeader>
        <div className="space-y-3 py-2">
          <div className="p-3 rounded-lg border border-border/40 bg-muted/20 text-xs">
            <p className="font-medium">{shift.title}</p>
            <p className="text-muted-foreground mt-0.5">{format(parseISO(shift.date), "EEE, MMM d")} · {fmt12(shift.start_time)}–{fmt12(shift.end_time)}</p>
          </div>
          <div><Label className="text-xs mb-1.5 block">Bonus Pay USD (optional)</Label><Input type="number" min={0} value={bonus} onChange={e => setBonus(e.target.value)} placeholder="e.g. 25" className="h-8 text-sm" /></div>
          <div><Label className="text-xs mb-1.5 block">Note for claimers</Label><Textarea value={note} onChange={e => setNote(e.target.value)} className="text-xs min-h-[56px] resize-none" placeholder="Why it's available, any requirements…" /></div>
        </div>
        <DialogFooter>
          <Button variant="ghost" size="sm" onClick={onClose} className="h-8 text-xs">Cancel</Button>
          <Button size="sm" className="h-8 text-xs gap-1" onClick={() => mut.mutate()} disabled={mut.isPending}>
            {mut.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <><Store className="w-3 h-3" />Post</>}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ── Swap Card ─────────────────────────────────────────────────────────────────

function SwapCard({ swap }: { swap: MockSwapRequest }) {
  const qc = useQueryClient();
  const { toast } = useToast();

  const mut = useMutation({
    mutationFn: (action: "approved" | "denied" | "accepted" | "withdrawn") => resolveSwapRequest(swap.id, action),
    onSuccess: (_, a) => { qc.invalidateQueries({ queryKey: ["swaps"] }); qc.invalidateQueries({ queryKey: ["shifts"] }); toast({ title: `Swap ${a}` }); },
  });

  const badgeCls: Record<string, string> = {
    pending:   "border-yellow-500/40 text-yellow-400 bg-yellow-500/10",
    accepted:  "border-blue-500/40 text-blue-400 bg-blue-500/10",
    approved:  "border-emerald-500/40 text-emerald-400 bg-emerald-500/10",
    denied:    "border-red-500/40 text-red-400 bg-red-500/10",
    withdrawn: "border-border/40 text-muted-foreground bg-muted/20",
  };

  return (
    <div className="rounded-lg border border-border/40 bg-muted/10 p-3">
      <div className="flex items-start justify-between gap-2 mb-1.5">
        <div>
          <p className="text-xs font-medium">{uName(swap.requester_id)}</p>
          {swap.target_user_id
            ? <p className="text-[10px] text-muted-foreground">→ {uName(swap.target_user_id)}</p>
            : <p className="text-[10px] text-muted-foreground/50 italic">Open swap</p>}
        </div>
        <span className={`text-[9px] px-1.5 py-0.5 rounded-full border font-medium uppercase tracking-wide shrink-0 ${badgeCls[swap.status] ?? badgeCls.withdrawn}`}>{swap.status}</span>
      </div>
      {swap.message && <p className="text-[10px] text-muted-foreground/70 mb-2 leading-relaxed border-l-2 border-border/30 pl-2">"{swap.message}"</p>}
      {swap.status === "pending" && (
        <div className="flex gap-1.5">
          <Button size="sm" className="h-6 text-[10px] gap-1 bg-emerald-600 hover:bg-emerald-700 px-2" onClick={() => mut.mutate("approved")} disabled={mut.isPending}>
            <Check className="w-2.5 h-2.5" />Approve
          </Button>
          <Button size="sm" variant="outline" className="h-6 text-[10px] gap-1 border-red-500/30 text-red-400 hover:bg-red-500/10 px-2" onClick={() => mut.mutate("denied")} disabled={mut.isPending}>
            <Ban className="w-2.5 h-2.5" />Deny
          </Button>
          <Button size="sm" variant="ghost" className="h-6 text-[10px] text-muted-foreground ml-auto px-2" onClick={() => mut.mutate("accepted")} disabled={mut.isPending}>
            Accept
          </Button>
        </div>
      )}
    </div>
  );
}

// ── Shift Detail Panel ────────────────────────────────────────────────────────

function ShiftDetailPanel({
  shift, onClose, swaps, listings,
}: { shift: MockShift; onClose: () => void; swaps: MockSwapRequest[]; listings: MockMarketplaceListing[] }) {
  const qc = useQueryClient();
  const { toast } = useToast();
  const [showEdit,   setShowEdit]   = useState(false);
  const [showSwap,   setShowSwap]   = useState(false);
  const [showMarket, setShowMarket] = useState(false);

  const shiftSwaps    = swaps.filter(s => s.shift_id === shift.id);
  const activeListing = listings.find(l => l.shift_id === shift.id && l.status === "open");
  const dur           = durMin(shift);
  const unassigned    = MOCK_USERS.filter(u => u.is_active && !shift.assignee_ids.includes(u.id));

  const removeMut = useMutation({ mutationFn: (uid: string) => removeAssigneeFromShift(shift.id, uid), onSuccess: () => { qc.invalidateQueries({ queryKey: ["shifts"] }); toast({ title: "Removed" }); } });
  const addMut    = useMutation({ mutationFn: (uid: string) => addAssigneeToShift(shift.id, uid),    onSuccess: () => { qc.invalidateQueries({ queryKey: ["shifts"] }); toast({ title: "Added" }); } });
  const deleteMut = useMutation({ mutationFn: () => deleteShift(shift.id), onSuccess: () => { qc.invalidateQueries({ queryKey: ["shifts"] }); toast({ title: "Shift cancelled" }); onClose(); } });
  const unlistMut = useMutation({ mutationFn: (lid: string) => cancelMarketplaceListing(lid), onSuccess: () => { qc.invalidateQueries({ queryKey: ["marketplace"] }); toast({ title: "Listing removed" }); } });

  return (
    <>
      <div className="h-full flex flex-col overflow-hidden">
        {/* Header */}
        <div className="shrink-0 px-4 py-3 border-b border-border/50">
          <div className="flex items-center justify-between mb-2">
            <RoleChip role={shift.role} />
            <div className="flex gap-0.5">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-7 w-7"><MoreHorizontal className="w-4 h-4" /></Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="border-border/50 w-44">
                  <DropdownMenuLabel className="text-[10px] font-mono text-muted-foreground uppercase tracking-wider">Actions</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem className="text-xs gap-1.5" onClick={() => setShowEdit(true)}><BriefcaseBusiness className="w-3.5 h-3.5" />Edit Shift</DropdownMenuItem>
                  <DropdownMenuItem className="text-xs gap-1.5" onClick={() => setShowSwap(true)}><ArrowRightLeft className="w-3.5 h-3.5" />Request Swap</DropdownMenuItem>
                  {!activeListing && <DropdownMenuItem className="text-xs gap-1.5" onClick={() => setShowMarket(true)}><Store className="w-3.5 h-3.5" />Post to Marketplace</DropdownMenuItem>}
                  <DropdownMenuSeparator />
                  <DropdownMenuItem className="text-xs text-destructive gap-1.5" onClick={() => { if (confirm("Cancel this shift?")) deleteMut.mutate(); }}>
                    <Trash2 className="w-3.5 h-3.5" />Cancel Shift
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={onClose}><X className="w-4 h-4" /></Button>
            </div>
          </div>
          <h2 className="font-semibold text-sm leading-tight">{shift.title}</h2>
          <p className="text-xs text-muted-foreground mt-0.5">{format(parseISO(shift.date), "EEEE, MMMM d")}</p>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {/* Time & staffing */}
          <div className="grid grid-cols-2 gap-2">
            <div className="p-2.5 rounded-lg border border-border/40 bg-muted/20">
              <div className="flex items-center gap-1 text-[10px] text-muted-foreground mb-1"><Clock className="w-3 h-3" />Time</div>
              <p className="text-xs font-semibold">{fmt12(shift.start_time)} – {fmt12(shift.end_time)}</p>
              <p className="text-[10px] text-muted-foreground">{Math.floor(dur / 60)}h{dur % 60 ? ` ${dur % 60}m` : ""}</p>
            </div>
            <div className="p-2.5 rounded-lg border border-border/40 bg-muted/20">
              <div className="flex items-center gap-1 text-[10px] text-muted-foreground mb-1"><Users className="w-3 h-3" />Staffing</div>
              <p className="text-xs font-semibold">{shift.assignee_ids.length}/{shift.capacity}</p>
              <StatusPill status={shift.status} />
            </div>
          </div>

          {/* Marketplace indicator */}
          {activeListing && (
            <div className="flex items-center justify-between p-2.5 rounded-lg border border-emerald-500/25 bg-emerald-500/5">
              <div className="flex items-center gap-2">
                <Store className="w-3.5 h-3.5 text-emerald-400" />
                <div>
                  <p className="text-xs font-medium text-emerald-400">On Marketplace</p>
                  {activeListing.bonus_usd && <p className="text-[10px] text-emerald-400/70">+${activeListing.bonus_usd} bonus</p>}
                </div>
              </div>
              <Button size="sm" variant="ghost" className="h-6 text-[10px] text-red-400 hover:text-red-300 px-2" onClick={() => unlistMut.mutate(activeListing.id)}>Remove</Button>
            </div>
          )}

          {/* Notes */}
          {shift.notes && <div className="p-2.5 rounded-lg border border-border/40 bg-muted/10 text-xs text-muted-foreground leading-relaxed">{shift.notes}</div>}

          {/* Assignees */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <p className="text-[10px] font-mono text-muted-foreground uppercase tracking-widest">Assignees</p>
              {unassigned.length > 0 && shift.assignee_ids.length < shift.capacity && (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" size="sm" className="h-6 text-[10px] gap-1 border-dashed border-border/50"><UserPlus className="w-3 h-3" />Add</Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="border-border/50 w-44">
                    {unassigned.map(u => (
                      <DropdownMenuItem key={u.id} className="text-xs gap-2" onClick={() => addMut.mutate(u.id)}>
                        <span className="w-5 h-5 rounded-full bg-primary/20 flex items-center justify-center text-[9px] font-bold text-primary shrink-0">{u.first_name[0]}{u.last_name[0]}</span>
                        {u.first_name} {u.last_name}
                      </DropdownMenuItem>
                    ))}
                  </DropdownMenuContent>
                </DropdownMenu>
              )}
            </div>
            <div className="space-y-1.5">
              {shift.assignee_ids.length === 0 && <p className="text-xs text-muted-foreground/50 italic text-center py-2">No assignees yet</p>}
              {shift.assignee_ids.map(uid => {
                const ep = shift.assignees?.find(a => a.user_id === uid);
                const displayName = ep?.ep_name ?? uName(uid);
                const displayRole = ep?.ep_title ?? MOCK_USERS.find(u => u.id === uid)?.job_title ?? "Staff";
                const initials = displayName ? displayName.split(" ").map((w: string) => w[0]).join("").slice(0, 2).toUpperCase() : uInit(uid);
                return (
                  <div key={uid} className="flex items-center justify-between p-2 rounded-lg border border-border/30 bg-muted/10">
                    <div className="flex items-center gap-2">
                      <span className="w-7 h-7 rounded-full bg-primary/20 flex items-center justify-center text-[10px] font-bold text-primary shrink-0">{initials}</span>
                      <div>
                        <p className="text-xs font-medium">{displayName}</p>
                        <div className="flex items-center gap-1.5">
                          <p className="text-[10px] text-muted-foreground">{displayRole}</p>
                          {ep?.employee_code && (
                            <span className="text-[9px] font-mono text-primary/60 border border-primary/20 px-1 rounded">{ep.employee_code}</span>
                          )}
                        </div>
                      </div>
                    </div>
                    <Button variant="ghost" size="icon" className="h-6 w-6 text-muted-foreground/40 hover:text-destructive" onClick={() => removeMut.mutate(uid)}><UserMinus className="w-3.5 h-3.5" /></Button>
                  </div>
                );
              })}
              {Array.from({ length: Math.max(0, shift.capacity - shift.assignee_ids.length) }).map((_, i) => (
                <div key={i} className="flex items-center gap-2 p-2 rounded-lg border border-dashed border-border/25">
                  <span className="w-7 h-7 rounded-full border-2 border-dashed border-border/40 flex items-center justify-center shrink-0"><Plus className="w-3 h-3 text-muted-foreground/30" /></span>
                  <p className="text-[10px] text-muted-foreground/40 italic">Open slot</p>
                </div>
              ))}
            </div>
          </div>

          {/* Swap requests for this shift */}
          {shiftSwaps.length > 0 && (
            <div>
              <p className="text-[10px] font-mono text-muted-foreground uppercase tracking-widest mb-2">Swap Requests</p>
              <div className="space-y-2">{shiftSwaps.map(s => <SwapCard key={s.id} swap={s} />)}</div>
            </div>
          )}
        </div>
      </div>

      {showEdit   && <ShiftFormDialog open onClose={() => setShowEdit(false)} initial={shift} locationId={shift.location_id} />}
      {showSwap   && <SwapRequestDialog open onClose={() => setShowSwap(false)} shift={shift} />}
      {showMarket && <MarketplacePostDialog open onClose={() => setShowMarket(false)} shift={shift} />}
    </>
  );
}

// ── Calendar View ─────────────────────────────────────────────────────────────

function CalendarView({ weekDays, shifts, selectedId, onSelect, onCreateAt }: {
  weekDays: Date[]; shifts: MockShift[]; selectedId: string | null;
  onSelect: (s: MockShift) => void; onCreateAt: (date: string) => void;
}) {
  const hours = Array.from({ length: CAL_END - CAL_START }, (_, i) => CAL_START + i);
  return (
    <div className="flex-1 overflow-auto border border-border/40 rounded-xl min-h-0">
      {/* Day header */}
      <div className="sticky top-0 z-10 flex border-b border-border/50 bg-card/95 backdrop-blur">
        <div className="w-12 shrink-0 border-r border-border/30" />
        {weekDays.map(day => {
          const today = isToday(day);
          return (
            <div key={day.toISOString()} className={`flex-1 px-2 py-2 text-center border-r border-border/30 last:border-r-0 ${today ? "bg-primary/5" : ""}`}>
              <p className={`text-[10px] font-mono uppercase tracking-wider ${today ? "text-primary" : "text-muted-foreground/60"}`}>{format(day, "EEE")}</p>
              <p className={`text-sm font-bold mt-0.5 ${today ? "text-primary" : ""}`}>{format(day, "d")}</p>
            </div>
          );
        })}
      </div>
      {/* Time grid */}
      <div className="flex" style={{ height: (CAL_END - CAL_START) * HR_PX }}>
        {/* Hour labels */}
        <div className="w-12 shrink-0 border-r border-border/30 relative">
          {hours.map(h => (
            <div key={h} className="absolute w-full flex justify-end pr-1.5" style={{ top: (h - CAL_START) * HR_PX - 7 }}>
              <span className="text-[9px] font-mono text-muted-foreground/40">{h === 12 ? "12p" : h > 12 ? `${h - 12}p` : `${h}a`}</span>
            </div>
          ))}
        </div>
        {/* Day columns */}
        {weekDays.map(day => {
          const ds = format(day, "yyyy-MM-dd");
          const dayShifts = shifts.filter(s => s.date === ds);
          return (
            <div key={ds} className={`flex-1 relative border-r border-border/30 last:border-r-0 cursor-pointer ${isToday(day) ? "bg-primary/[0.02]" : ""}`} onClick={() => onCreateAt(ds)}>
              {hours.map(h => (
                <div key={h} className="absolute w-full border-t border-border/20" style={{ top: (h - CAL_START) * HR_PX }} />
              ))}
              {hours.map(h => (
                <div key={`${h}h`} className="absolute w-full border-t border-border/10" style={{ top: (h - CAL_START) * HR_PX + HR_PX / 2 }} />
              ))}
              {dayShifts.map(shift => {
                const topMin   = toMin(shift.start_time) - CAL_START * 60;
                const topPx    = Math.max(0, topMin / 60 * HR_PX);
                const heightPx = Math.max(22, durMin(shift) / 60 * HR_PX - 2);
                const m        = ROLE_META[shift.role] ?? ROLE_META.housekeeping;
                const compact  = heightPx < 40;
                return (
                  <div key={shift.id}
                    className={`absolute left-0.5 right-0.5 rounded-md border px-1.5 py-1 cursor-pointer overflow-hidden transition-all hover:z-20 ${m.bg} ${m.border} ${selectedId === shift.id ? "ring-1 ring-primary/60 z-10" : ""}`}
                    style={{ top: topPx, height: heightPx, borderLeftWidth: 2, borderLeftColor: m.color }}
                    onClick={e => { e.stopPropagation(); onSelect(shift); }}>
                    <p className="text-[9px] font-bold truncate leading-tight" style={{ color: m.color }}>{shift.title}</p>
                    {!compact && <>
                      <p className="text-[8px] text-muted-foreground/70 truncate">{fmt12(shift.start_time)}–{fmt12(shift.end_time)}</p>
                      <p className="text-[8px] text-muted-foreground/60">{shift.assignee_ids.length}/{shift.capacity}</p>
                    </>}
                  </div>
                );
              })}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── List View ─────────────────────────────────────────────────────────────────

function ListView({ weekDays, shifts, selectedId, onSelect, onCreateAt }: {
  weekDays: Date[]; shifts: MockShift[]; selectedId: string | null;
  onSelect: (s: MockShift) => void; onCreateAt: (date: string) => void;
}) {
  return (
    <div className="flex-1 overflow-auto space-y-4 pr-1">
      {weekDays.map(day => {
        const ds        = format(day, "yyyy-MM-dd");
        const dayShifts = shifts.filter(s => s.date === ds).sort((a, b) => a.start_time.localeCompare(b.start_time));
        const today     = isToday(day);
        return (
          <div key={ds}>
            <div className={`flex items-center gap-3 mb-2 ${today ? "text-primary" : "text-muted-foreground"}`}>
              <div className={`flex items-center gap-2 ${today ? "bg-primary/10 border border-primary/20 rounded-lg px-3 py-1" : ""}`}>
                <span className="text-xs font-mono uppercase tracking-wider">{format(day, "EEE")}</span>
                <span className="font-bold text-sm">{format(day, "d MMM")}</span>
                {today && <span className="text-[9px] bg-primary text-primary-foreground rounded px-1 font-bold">TODAY</span>}
              </div>
              <div className="h-px flex-1 bg-border/30" />
              <button onClick={() => onCreateAt(ds)} className="text-[10px] text-muted-foreground/50 hover:text-primary flex items-center gap-1 transition-colors">
                <Plus className="w-3 h-3" />Add
              </button>
            </div>
            {dayShifts.length === 0 ? (
              <div className="ml-2 py-2.5 text-center border border-dashed border-border/25 rounded-lg">
                <p className="text-xs text-muted-foreground/40">No shifts scheduled</p>
              </div>
            ) : (
              <div className="space-y-1.5 ml-2">
                {dayShifts.map(shift => {
                  const m   = ROLE_META[shift.role] ?? ROLE_META.housekeeping;
                  const dur = durMin(shift);
                  const open = shift.capacity - shift.assignee_ids.length;
                  return (
                    <div key={shift.id}
                      className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-all ${selectedId === shift.id ? "border-primary/40 bg-primary/5" : "border-border/40 bg-card/50 hover:bg-card/80 hover:border-border/60"}`}
                      onClick={() => onSelect(shift)}>
                      <div className="w-0.5 self-stretch rounded-full shrink-0" style={{ backgroundColor: m.color }} />
                      <RoleChip role={shift.role} sm />
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-semibold truncate">{shift.title}</p>
                        <p className="text-[10px] text-muted-foreground">{fmt12(shift.start_time)} – {fmt12(shift.end_time)} · {Math.floor(dur / 60)}h</p>
                      </div>
                      <AvatarStack ids={shift.assignee_ids} limit={3} />
                      <div className="text-right shrink-0">
                        <p className="text-xs font-mono font-semibold">
                          <span style={{ color: open === 0 ? "#10b981" : open === shift.capacity ? "#f59e0b" : "#eab308" }}>{shift.assignee_ids.length}</span>
                          <span className="text-muted-foreground/50">/{shift.capacity}</span>
                        </p>
                        <StatusPill status={shift.status} />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

// ── Marketplace Tab ───────────────────────────────────────────────────────────

function MarketplaceTab({ listings, shifts, onOpenPost }: {
  listings: MockMarketplaceListing[]; shifts: MockShift[]; onOpenPost: () => void;
}) {
  const qc = useQueryClient();
  const { toast } = useToast();
  const [filter, setFilter] = useState<"open" | "all">("open");

  const claimMut = useMutation({
    mutationFn: (id: string) => claimMarketplaceListing(id, "user-001"),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["marketplace"] }); qc.invalidateQueries({ queryKey: ["shifts"] }); toast({ title: "Shift claimed!" }); },
    onError: () => toast({ title: "Failed to claim", variant: "destructive" }),
  });

  const shown = listings.filter(l => filter === "all" || l.status === "open");

  return (
    <div className="flex flex-col h-full gap-4">
      <div className="flex items-center justify-between gap-3 shrink-0">
        <div className="flex items-center gap-2">
          <Store className="w-4 h-4 text-primary" />
          <span className="text-sm font-semibold">Shift Marketplace</span>
          <Badge variant="outline" className="text-[10px] font-mono border-border/50 text-muted-foreground">{listings.filter(l => l.status === "open").length} open</Badge>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex rounded-lg border border-border/50 overflow-hidden">
            {(["open", "all"] as const).map(f => (
              <button key={f} onClick={() => setFilter(f)} className={`text-[10px] px-3 py-1.5 font-medium capitalize transition-colors ${filter === f ? "bg-primary/15 text-primary" : "text-muted-foreground hover:text-foreground"}`}>{f}</button>
            ))}
          </div>
          <Button size="sm" className="h-7 text-xs gap-1" onClick={onOpenPost}><Plus className="w-3 h-3" />Post Shift</Button>
        </div>
      </div>

      {shown.length === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center gap-3 border border-dashed border-border/30 rounded-xl">
          <Store className="w-10 h-10 text-muted-foreground/20" />
          <p className="text-sm text-muted-foreground">No listings to show</p>
          <Button size="sm" variant="outline" className="h-7 text-xs" onClick={onOpenPost}>Post a shift</Button>
        </div>
      ) : (
        <div className="flex-1 overflow-auto grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 content-start">
          {shown.map(listing => {
            const shift   = shifts.find(s => s.id === listing.shift_id);
            if (!shift) return null;
            const m       = ROLE_META[shift.role] ?? ROLE_META.housekeeping;
            const poster  = MOCK_USERS.find(u => u.id === listing.posted_by_user_id);
            const claimer = listing.claimed_by_user_id ? MOCK_USERS.find(u => u.id === listing.claimed_by_user_id) : null;
            const isOpen  = listing.status === "open";
            return (
              <div key={listing.id} className={`rounded-xl border overflow-hidden flex flex-col transition-all ${isOpen ? "border-border/50 hover:border-primary/30" : "border-border/25 opacity-60"}`}>
                <div className="px-4 pt-4 pb-3" style={{ background: `color-mix(in srgb, ${m.color} 10%, transparent)`, borderBottom: `1px solid color-mix(in srgb, ${m.color} 20%, transparent)` }}>
                  <div className="flex items-center justify-between">
                    <RoleChip role={shift.role} sm />
                    {listing.bonus_usd && <span className="flex items-center gap-1 text-xs font-bold text-amber-400"><Star className="w-3 h-3 fill-amber-400" />+${listing.bonus_usd}</span>}
                  </div>
                  <p className="font-semibold text-sm mt-1.5">{shift.title}</p>
                </div>
                <div className="p-4 flex-1 space-y-2">
                  <div className="space-y-1 text-xs">
                    <div className="flex items-center gap-1.5"><CalendarDays className="w-3.5 h-3.5 text-muted-foreground" />{format(parseISO(shift.date), "EEEE, MMM d")}</div>
                    <div className="flex items-center gap-1.5 text-muted-foreground"><Clock className="w-3.5 h-3.5" />{fmt12(shift.start_time)} – {fmt12(shift.end_time)}</div>
                    <div className="flex items-center gap-1.5 text-muted-foreground"><Users className="w-3.5 h-3.5" />{shift.capacity - shift.assignee_ids.length} slot{shift.capacity - shift.assignee_ids.length !== 1 ? "s" : ""} available</div>
                  </div>
                  {listing.note && <p className="text-[10px] text-muted-foreground/70 leading-relaxed border-t border-border/30 pt-2">{listing.note}</p>}
                  <p className="text-[10px] text-muted-foreground/50 border-t border-border/20 pt-2">
                    Posted by {poster?.first_name ?? "?"} {poster?.last_name ?? "?"} · {formatDistanceToNow(parseISO(listing.posted_at), { addSuffix: true })}
                  </p>
                  {claimer && <div className="flex items-center gap-1.5 text-xs text-emerald-400"><Check className="w-3.5 h-3.5" />Claimed by {claimer.first_name} {claimer.last_name}</div>}
                </div>
                {isOpen && (
                  <div className="px-4 pb-4">
                    <Button className="w-full h-8 text-xs" onClick={() => claimMut.mutate(listing.id)} disabled={claimMut.isPending}>
                      {claimMut.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : "Claim Shift"}
                    </Button>
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

// ── Swap Requests Tab ─────────────────────────────────────────────────────────

function SwapRequestsTab({ swaps, shifts }: { swaps: MockSwapRequest[]; shifts: MockShift[] }) {
  const [filter, setFilter] = useState<"pending" | "all">("pending");
  const shown = swaps.filter(s => filter === "all" || s.status === "pending");

  return (
    <div className="flex flex-col h-full gap-4">
      <div className="flex items-center justify-between gap-3 shrink-0">
        <div className="flex items-center gap-2">
          <ArrowRightLeft className="w-4 h-4 text-primary" />
          <span className="text-sm font-semibold">Swap Requests</span>
          {swaps.filter(s => s.status === "pending").length > 0 && (
            <Badge variant="outline" className="text-[10px] font-mono border-yellow-500/30 text-yellow-400 bg-yellow-500/5">
              {swaps.filter(s => s.status === "pending").length} pending
            </Badge>
          )}
        </div>
        <div className="flex rounded-lg border border-border/50 overflow-hidden">
          {(["pending", "all"] as const).map(f => (
            <button key={f} onClick={() => setFilter(f)} className={`text-[10px] px-3 py-1.5 font-medium capitalize transition-colors ${filter === f ? "bg-primary/15 text-primary" : "text-muted-foreground hover:text-foreground"}`}>{f}</button>
          ))}
        </div>
      </div>

      {shown.length === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center gap-2 border border-dashed border-border/30 rounded-xl">
          <ArrowRightLeft className="w-8 h-8 text-muted-foreground/20" />
          <p className="text-sm text-muted-foreground">No swap requests</p>
        </div>
      ) : (
        <div className="flex-1 overflow-auto space-y-3 pr-1">
          {shown.map(swap => {
            const shift = shifts.find(s => s.id === swap.shift_id);
            return (
              <div key={swap.id} className="rounded-xl border border-border/40 bg-card/50 overflow-hidden">
                {shift && (
                  <div className="px-4 py-2 border-b border-border/30 flex items-center gap-2 bg-muted/20 flex-wrap">
                    <RoleChip role={shift.role} sm />
                    <span className="text-xs font-medium">{shift.title}</span>
                    <span className="text-[10px] text-muted-foreground ml-auto">{format(parseISO(shift.date), "EEE, MMM d")} · {fmt12(shift.start_time)}–{fmt12(shift.end_time)}</span>
                  </div>
                )}
                <div className="p-4 space-y-2">
                  <SwapCard swap={swap} />
                  <p className="text-[10px] text-muted-foreground/50">
                    Requested {formatDistanceToNow(parseISO(swap.created_at), { addSuffix: true })}
                    {swap.resolved_at && ` · Resolved ${formatDistanceToNow(parseISO(swap.resolved_at), { addSuffix: true })}`}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ── Pick Shift for Marketplace ────────────────────────────────────────────────

function PickShiftDialog({ open, onClose, shifts, listings, onPick }: {
  open: boolean; onClose: () => void; shifts: MockShift[]; listings: MockMarketplaceListing[]; onPick: (s: MockShift) => void;
}) {
  const eligible = shifts.filter(s => s.status === "open" || s.status === "partial");
  return (
    <Dialog open={open} onOpenChange={v => { if (!v) onClose(); }}>
      <DialogContent className="max-w-sm border-border/50 bg-card">
        <DialogHeader><DialogTitle className="text-sm flex items-center gap-2"><Store className="w-4 h-4 text-primary" />Post a Shift</DialogTitle></DialogHeader>
        <div className="py-2">
          <p className="text-xs text-muted-foreground mb-3">Choose a shift to post to the marketplace:</p>
          <div className="space-y-1.5 max-h-64 overflow-y-auto">
            {eligible.length === 0 && <p className="text-xs text-muted-foreground/60 text-center py-4">No eligible shifts this week</p>}
            {eligible.map(shift => {
              const alreadyPosted = listings.some(l => l.shift_id === shift.id && l.status === "open");
              return (
                <button key={shift.id} disabled={alreadyPosted} onClick={() => { onClose(); onPick(shift); }}
                  className={`w-full text-left p-2.5 rounded-lg border text-xs transition-all ${alreadyPosted ? "border-border/20 opacity-40 cursor-not-allowed" : "border-border/40 hover:border-primary/40 hover:bg-primary/5"}`}>
                  <div className="flex items-center gap-2">
                    <RoleChip role={shift.role} sm />
                    <span className="font-medium flex-1 truncate">{shift.title}</span>
                    {alreadyPosted && <span className="text-[9px] text-muted-foreground/50">Posted</span>}
                  </div>
                  <p className="text-muted-foreground mt-0.5">{format(parseISO(shift.date), "EEE d MMM")} · {fmt12(shift.start_time)}–{fmt12(shift.end_time)}</p>
                </button>
              );
            })}
          </div>
        </div>
        <DialogFooter>
          <Button variant="ghost" size="sm" className="h-8 text-xs" onClick={onClose}>Cancel</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────

type Tab  = "schedule" | "marketplace" | "swaps";
type View = "list" | "calendar";

export default function Shifts() {
  const { selectedLocationId: locId } = useLocation();
  const selectedLocationId: string | undefined = locId ?? undefined;

  const { toast } = useToast();
  const [tab,             setTab]             = useState<Tab>("schedule");
  const [view,            setView]            = useState<View>("list");
  const [weekOffset,      setWeekOffset]      = useState(0);
  const [selected,        setSelected]        = useState<MockShift | null>(null);
  const [showCreate,      setShowCreate]      = useState(false);
  const [createDate,      setCreateDate]      = useState<string | null>(null);
  const [showPickShift,   setShowPickShift]   = useState(false);
  const [showMarketPost,  setShowMarketPost]  = useState(false);
  const [postShift,       setPostShift]       = useState<MockShift | null>(null);
  const [roleFilter,      setRoleFilter]      = useState<ShiftRole | "all">("all");
  const [search,          setSearch]          = useState("");

  const weekDays = useMemo(() => {
    const mon = startOfWeek(addWeeks(new Date(), weekOffset), { weekStartsOn: 1 });
    return Array.from({ length: 7 }, (_, i) => addDays(mon, i));
  }, [weekOffset]);

  const weekLabel = useMemo(() => {
    const [f, l] = [weekDays[0], weekDays[6]];
    return f.getMonth() === l.getMonth()
      ? `${format(f, "MMM d")} – ${format(l, "d, yyyy")}`
      : `${format(f, "MMM d")} – ${format(l, "MMM d, yyyy")}`;
  }, [weekDays]);

  const weekStart = format(weekDays[0], "yyyy-MM-dd");

  const { data: allShifts = [], isLoading } = useQuery({
    queryKey: ["shifts", selectedLocationId, weekStart],
    queryFn: () => fetchShifts(selectedLocationId, weekStart),
  });
  const { data: swaps       = [] } = useQuery({ queryKey: ["swaps"],       queryFn: fetchSwapRequests });
  const { data: marketplace = [] } = useQuery({ queryKey: ["marketplace"], queryFn: fetchMarketplaceListings });

  const filteredShifts = useMemo(() => {
    let s = allShifts;
    if (roleFilter !== "all") s = s.filter(sh => sh.role === roleFilter);
    if (search.trim()) { const q = search.toLowerCase(); s = s.filter(sh => sh.title.toLowerCase().includes(q)); }
    return s;
  }, [allShifts, roleFilter, search]);

  const pendingSwaps = useMemo(() => swaps.filter(s => s.status === "pending").length, [swaps]);
  const openListings = useMemo(() => marketplace.filter(l => l.status === "open").length, [marketplace]);

  const liveSelected = useMemo(() =>
    selected ? (allShifts.find(s => s.id === selected.id) ?? selected) : null,
    [selected, allShifts]
  );

  const handleSelect   = useCallback((s: MockShift) => setSelected(p => p?.id === s.id ? null : s), []);
  const handleCreateAt = useCallback((date: string) => { setCreateDate(date); setShowCreate(true); }, []);
  const handlePicked   = useCallback((shift: MockShift) => { setPostShift(shift); setShowMarketPost(true); }, []);

  const hasPanel = tab === "schedule" && !!liveSelected;

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Tab bar */}
      <div className="shrink-0 flex items-center gap-1 px-4 pt-4 pb-0 border-b border-border/50 bg-card/60">
        {([
          { key: "schedule" as Tab,    label: "Schedule",      icon: CalendarDays,   badge: null as number | null },
          { key: "marketplace" as Tab, label: "Marketplace",   icon: Store,          badge: openListings > 0 ? openListings : null },
          { key: "swaps" as Tab,       label: "Swap Requests", icon: ArrowRightLeft, badge: pendingSwaps > 0 ? pendingSwaps : null },
        ]).map(({ key, label, icon: Icon, badge }) => (
          <button key={key} onClick={() => setTab(key)}
            className={`flex items-center gap-1.5 px-3 pb-3 text-xs font-medium border-b-2 transition-all ${tab === key ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"}`}>
            <Icon className="w-3.5 h-3.5" />{label}
            {badge != null && (
              <span className="ml-0.5 min-w-[16px] h-4 rounded-full bg-primary text-primary-foreground text-[9px] font-bold flex items-center justify-center px-1">{badge}</span>
            )}
          </button>
        ))}
        {DEMO_MODE && <Badge variant="outline" className="ml-auto mb-3 border-amber-500/30 text-amber-400 text-[10px] font-mono">DEMO</Badge>}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-hidden flex flex-col p-4 gap-4 min-h-0">
        {/* Schedule toolbar */}
        {tab === "schedule" && (
          <div className="shrink-0 flex items-center gap-2 flex-wrap">
            <div className="flex items-center gap-0 rounded-lg border border-border/50 bg-card/50 overflow-hidden">
              <Button variant="ghost" size="icon" className="h-7 w-7 rounded-none border-r border-border/30" onClick={() => setWeekOffset(w => w - 1)}><ChevronLeft className="w-3.5 h-3.5" /></Button>
              <button className="text-xs font-medium px-3 min-w-44 text-center hover:text-primary transition-colors py-1" onClick={() => setWeekOffset(0)}>{weekLabel}</button>
              <Button variant="ghost" size="icon" className="h-7 w-7 rounded-none border-l border-border/30" onClick={() => setWeekOffset(w => w + 1)}><ChevronRight className="w-3.5 h-3.5" /></Button>
            </div>

            <div className="flex rounded-lg border border-border/50 overflow-hidden">
              {([["list", List], ["calendar", CalendarDays]] as const).map(([m, Icon]) => (
                <button key={m} onClick={() => setView(m as View)}
                  className={`px-3 py-1.5 flex items-center gap-1.5 text-[10px] font-medium capitalize transition-colors ${view === m ? "bg-primary/15 text-primary" : "text-muted-foreground hover:text-foreground"}`}>
                  <Icon className="w-3.5 h-3.5" />{m.charAt(0).toUpperCase() + m.slice(1)}
                </button>
              ))}
            </div>

            <Select value={roleFilter} onValueChange={v => setRoleFilter(v as ShiftRole | "all")}>
              <SelectTrigger className="h-7 text-xs w-36 border-border/50"><SelectValue placeholder="All Roles" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all" className="text-xs">All Roles</SelectItem>
                {SHIFT_ROLES.map(r => <SelectItem key={r} value={r} className="text-xs">{ROLE_META[r].label}</SelectItem>)}
              </SelectContent>
            </Select>

            <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search…" className="h-7 text-xs w-32 border-border/50" />

            {weekOffset !== 0 && (
              <Button variant="ghost" size="sm" className="h-7 text-xs text-muted-foreground" onClick={() => setWeekOffset(0)}>Today</Button>
            )}

            <Button size="sm" className="h-7 text-xs gap-1 ml-auto" onClick={() => { setCreateDate(null); setShowCreate(true); }}>
              <Plus className="w-3 h-3" />Create Shift
            </Button>
          </div>
        )}

        {/* Main + detail panel */}
        <div className="flex-1 overflow-hidden flex gap-4 min-h-0">
          <div className="flex-1 min-w-0 flex flex-col overflow-hidden">
            {tab === "schedule" && (
              isLoading
                ? <div className="space-y-3">{Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="w-full h-14 rounded-xl" />)}</div>
                : view === "list"
                  ? <ListView weekDays={weekDays} shifts={filteredShifts} selectedId={liveSelected?.id ?? null} onSelect={handleSelect} onCreateAt={handleCreateAt} />
                  : <CalendarView weekDays={weekDays} shifts={filteredShifts} selectedId={liveSelected?.id ?? null} onSelect={handleSelect} onCreateAt={handleCreateAt} />
            )}
            {tab === "marketplace" && <MarketplaceTab listings={marketplace} shifts={allShifts} onOpenPost={() => setShowPickShift(true)} />}
            {tab === "swaps"       && <SwapRequestsTab swaps={swaps} shifts={allShifts} />}
          </div>

          {hasPanel && liveSelected && (
            <div className="w-72 shrink-0 rounded-xl border border-border/50 overflow-hidden flex flex-col">
              <ShiftDetailPanel shift={liveSelected} onClose={() => setSelected(null)} swaps={swaps} listings={marketplace} />
            </div>
          )}
        </div>
      </div>

      {/* Dialogs */}
      {showCreate && (
        <ShiftFormDialog open onClose={() => { setShowCreate(false); setCreateDate(null); }}
          defaultDate={createDate ?? format(new Date(), "yyyy-MM-dd")}
          locationId={selectedLocationId ?? "loc-001"} />
      )}
      {showPickShift && (
        <PickShiftDialog open onClose={() => setShowPickShift(false)} shifts={allShifts} listings={marketplace} onPick={handlePicked} />
      )}
      {showMarketPost && postShift && (
        <MarketplacePostDialog open onClose={() => { setShowMarketPost(false); setPostShift(null); }} shift={postShift} />
      )}
    </div>
  );
}
