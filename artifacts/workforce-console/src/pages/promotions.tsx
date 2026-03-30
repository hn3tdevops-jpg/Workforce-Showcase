import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  TrendingUp, ChevronDown, ChevronRight, Plus, Star, Award,
  ThumbsUp, Trophy, Flag, Gift, UserCheck, AlertCircle,
  CheckCircle2, Clock, ArrowRight, Loader2, X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { API_BASE } from "@/lib/api-client";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

// ── Types ─────────────────────────────────────────────────────────────────────

interface PromotionTier {
  id: string;
  track_name: string;
  tier_name: string;
  tier_level: number;
  role_type: string | null;
  description: string | null;
  color: string;
  criteria_count: number;
  promotion_count: number;
}

interface Criterion {
  id: string;
  tier_id: string;
  criterion_type: string;
  target_value: number;
  label: string;
}

interface StaffProgress {
  id: string;
  first_name: string;
  last_name: string;
  job_title: string | null;
  role: string;
  current_tier: PromotionTier | null;
  next_tier: PromotionTier | null;
  last_promoted: string | null;
  promotion_count: number;
}

interface PromotionEvent {
  id: string;
  staff_id: string;
  staff_name: string;
  job_title: string | null;
  from_tier_name: string | null;
  from_track_name: string | null;
  to_tier_name: string;
  to_track_name: string;
  promoted_by: string;
  notes: string | null;
  promoted_at: string;
}

interface RecognitionEvent {
  id: string;
  staff_id: string;
  staff_name: string;
  job_title: string | null;
  event_type: string;
  title: string;
  notes: string | null;
  given_by: string;
  event_date: string;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

const TRACK_COLORS: Record<string, string> = {
  blue:    "bg-blue-100 text-blue-800 border-blue-200",
  emerald: "bg-emerald-100 text-emerald-800 border-emerald-200",
  amber:   "bg-amber-100 text-amber-800 border-amber-200",
  violet:  "bg-violet-100 text-violet-800 border-violet-200",
  rose:    "bg-rose-100 text-rose-800 border-rose-200",
};

const TRACK_BORDER: Record<string, string> = {
  blue:    "border-l-blue-500",
  emerald: "border-l-emerald-500",
  amber:   "border-l-amber-500",
  violet:  "border-l-violet-500",
  rose:    "border-l-rose-500",
};

const EVENT_ICONS: Record<string, React.ReactNode> = {
  EMPLOYEE_OF_MONTH: <Trophy className="w-4 h-4 text-yellow-500" />,
  TOP_PERFORMER:     <Star className="w-4 h-4 text-orange-500" />,
  MILESTONE:         <Flag className="w-4 h-4 text-blue-500" />,
  KUDOS:             <ThumbsUp className="w-4 h-4 text-emerald-500" />,
  AWARD:             <Award className="w-4 h-4 text-violet-500" />,
  GIFT:              <Gift className="w-4 h-4 text-rose-500" />,
};

const EVENT_LABELS: Record<string, string> = {
  EMPLOYEE_OF_MONTH: "Employee of the Month",
  TOP_PERFORMER:     "Top Performer",
  MILESTONE:         "Career Milestone",
  KUDOS:             "Kudos",
  AWARD:             "Special Award",
  GIFT:              "Gift / Incentive",
};

const CRITERION_ICONS: Record<string, React.ReactNode> = {
  TASKS_COMPLETED: <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />,
  DAYS_IN_ROLE:    <Clock className="w-3.5 h-3.5 text-blue-500" />,
  MANAGER_APPROVAL:<UserCheck className="w-3.5 h-3.5 text-violet-500" />,
  TRAINING:        <Star className="w-3.5 h-3.5 text-amber-500" />,
};

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

function groupBy<T>(arr: T[], key: (item: T) => string): Record<string, T[]> {
  return arr.reduce((acc, item) => {
    const k = key(item);
    (acc[k] = acc[k] || []).push(item);
    return acc;
  }, {} as Record<string, T[]>);
}

// ── Data fetching ─────────────────────────────────────────────────────────────

const api = `${API_BASE}/promotions`;

async function fetchJson<T>(path: string): Promise<T> {
  const r = await fetch(`${api}${path}`);
  if (!r.ok) throw new Error(await r.text());
  return r.json();
}

async function postJson<T>(path: string, body: unknown): Promise<T> {
  const r = await fetch(`${api}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!r.ok) throw new Error(await r.text());
  return r.json();
}

async function deleteReq(path: string) {
  const r = await fetch(`${api}${path}`, { method: "DELETE" });
  if (!r.ok) throw new Error(await r.text());
}

// ── Career Ladder Tab ─────────────────────────────────────────────────────────

function TierCard({ tier }: { tier: PromotionTier }) {
  const [expanded, setExpanded] = useState(false);
  const colorClass = TRACK_COLORS[tier.color] ?? TRACK_COLORS.blue;

  const { data: criteria, isLoading } = useQuery<Criterion[]>({
    queryKey: ["criteria", tier.id],
    queryFn: () => fetchJson(`/tiers/${tier.id}/criteria`),
    enabled: expanded,
  });

  return (
    <div
      className={`border-l-4 ${TRACK_BORDER[tier.color] ?? "border-l-blue-500"} bg-white rounded-r-lg shadow-sm overflow-hidden`}
    >
      <button
        className="w-full flex items-center justify-between px-4 py-3 hover:bg-slate-50 transition-colors text-left"
        onClick={() => setExpanded(e => !e)}
      >
        <div className="flex items-center gap-3">
          <Badge variant="outline" className={`text-xs font-semibold ${colorClass}`}>
            L{tier.tier_level}
          </Badge>
          <div>
            <p className="font-medium text-slate-800 text-sm">{tier.tier_name}</p>
            {tier.role_type && (
              <p className="text-xs text-slate-500">{tier.role_type}</p>
            )}
          </div>
        </div>
        <div className="flex items-center gap-3 text-xs text-slate-400">
          <span>{tier.criteria_count} criteria</span>
          <span>{tier.promotion_count} promoted</span>
          {expanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
        </div>
      </button>

      {expanded && (
        <div className="px-4 pb-4 border-t border-slate-100 bg-slate-50">
          {tier.description && (
            <p className="text-xs text-slate-600 mt-3 mb-3 leading-relaxed">{tier.description}</p>
          )}
          {isLoading ? (
            <div className="flex items-center gap-2 py-2 text-slate-400 text-xs">
              <Loader2 className="w-3 h-3 animate-spin" /> Loading criteria…
            </div>
          ) : criteria && criteria.length > 0 ? (
            <div className="space-y-1.5 mt-2">
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Requirements to advance</p>
              {criteria.map(c => (
                <div key={c.id} className="flex items-center gap-2 text-xs text-slate-700 bg-white rounded px-3 py-2 border border-slate-100">
                  {CRITERION_ICONS[c.criterion_type] ?? <AlertCircle className="w-3.5 h-3.5 text-slate-400" />}
                  <span>{c.label}</span>
                  {(c.criterion_type === "TASKS_COMPLETED" || c.criterion_type === "DAYS_IN_ROLE") && (
                    <Badge variant="outline" className="ml-auto text-slate-500 text-[10px]">
                      {c.target_value} {c.criterion_type === "TASKS_COMPLETED" ? "tasks" : "days"}
                    </Badge>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <p className="text-xs text-slate-400 italic mt-2">No requirements set for this entry-level tier</p>
          )}
        </div>
      )}
    </div>
  );
}

function CareerLadderTab({ tiers }: { tiers: PromotionTier[] }) {
  const grouped = groupBy(tiers, t => t.track_name);

  return (
    <div className="space-y-6 mt-2">
      {Object.entries(grouped).map(([track, trackTiers]) => (
        <div key={track}>
          <div className="flex items-center gap-2 mb-3">
            <h3 className="text-sm font-semibold text-slate-700">{track} Track</h3>
            <div className="h-px flex-1 bg-slate-200" />
            <span className="text-xs text-slate-400">{trackTiers.length} tiers</span>
          </div>
          <div className="space-y-2">
            {trackTiers
              .sort((a, b) => a.tier_level - b.tier_level)
              .map((tier, i, arr) => (
                <div key={tier.id} className="flex gap-2 items-stretch">
                  <div className="flex flex-col items-center">
                    <div className={`w-2 h-2 rounded-full mt-4 ${
                      tier.color === "emerald" ? "bg-emerald-400" :
                      tier.color === "amber"   ? "bg-amber-400" :
                      "bg-blue-400"
                    }`} />
                    {i < arr.length - 1 && <div className="w-px flex-1 bg-slate-200 mt-1" />}
                  </div>
                  <div className="flex-1">
                    <TierCard tier={tier} />
                  </div>
                </div>
              ))}
          </div>
        </div>
      ))}
    </div>
  );
}

// ── Staff Progress Tab ────────────────────────────────────────────────────────

function PromoteDialog({
  staff,
  tiers,
  open,
  onClose,
}: {
  staff: StaffProgress;
  tiers: PromotionTier[];
  open: boolean;
  onClose: () => void;
}) {
  const { toast } = useToast();
  const qc = useQueryClient();
  const [toTierId, setToTierId] = useState(staff.next_tier?.id ?? "");
  const [notes, setNotes] = useState("");

  const mutation = useMutation({
    mutationFn: () =>
      postJson("/history", {
        staff_id:     staff.id,
        to_tier_id:   toTierId,
        from_tier_id: staff.current_tier?.id ?? null,
        promoted_by:  "Manager",
        notes:        notes || null,
      }),
    onSuccess: () => {
      toast({ title: "Promotion recorded", description: `${staff.first_name} ${staff.last_name} has been promoted.` });
      qc.invalidateQueries({ queryKey: ["staff-progress"] });
      qc.invalidateQueries({ queryKey: ["promo-history"] });
      onClose();
    },
    onError: (e: Error) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  return (
    <Dialog open={open} onOpenChange={v => !v && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Record Promotion — {staff.first_name} {staff.last_name}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="space-y-1.5">
            <Label>Promote to tier</Label>
            <Select value={toTierId} onValueChange={setToTierId}>
              <SelectTrigger><SelectValue placeholder="Select tier…" /></SelectTrigger>
              <SelectContent>
                {tiers.map(t => (
                  <SelectItem key={t.id} value={t.id}>
                    {t.track_name} — {t.tier_name} (L{t.tier_level})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Notes (optional)</Label>
            <Textarea
              value={notes}
              onChange={e => setNotes(e.target.value)}
              placeholder="Add context for this promotion…"
              rows={3}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button disabled={!toTierId || mutation.isPending} onClick={() => mutation.mutate()}>
            {mutation.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
            Record Promotion
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function StaffProgressTab({ tiers }: { tiers: PromotionTier[] }) {
  const [promotingStaff, setPromotingStaff] = useState<StaffProgress | null>(null);

  const { data: staff = [], isLoading } = useQuery<StaffProgress[]>({
    queryKey: ["staff-progress"],
    queryFn: () => fetchJson("/staff-progress"),
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-16 text-slate-400">
        <Loader2 className="w-5 h-5 animate-spin mr-2" /> Loading staff progress…
      </div>
    );
  }

  const withTier    = staff.filter(s => s.current_tier);
  const withoutTier = staff.filter(s => !s.current_tier);

  return (
    <div className="mt-2 space-y-4">
      {withTier.length === 0 && withoutTier.length === 0 && (
        <div className="text-center py-16 text-slate-400 text-sm">No active staff found.</div>
      )}

      {withTier.map(s => {
        const tier = s.current_tier!;
        const colorCls = TRACK_COLORS[tier.color] ?? TRACK_COLORS.blue;
        return (
          <div key={s.id} className="flex items-center gap-4 bg-white rounded-lg border border-slate-100 shadow-sm px-4 py-3">
            <div className="w-9 h-9 rounded-full bg-slate-100 flex items-center justify-center text-sm font-bold text-slate-500 shrink-0">
              {s.first_name[0]}{s.last_name[0]}
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-medium text-sm text-slate-800">{s.first_name} {s.last_name}</p>
              <p className="text-xs text-slate-500">{s.job_title ?? s.role}</p>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <Badge variant="outline" className={`text-xs ${colorCls}`}>
                {tier.tier_name}
              </Badge>
              {s.next_tier && (
                <>
                  <ArrowRight className="w-3 h-3 text-slate-300" />
                  <span className="text-xs text-slate-400">{s.next_tier.tier_name}</span>
                </>
              )}
            </div>
            {s.last_promoted && (
              <span className="text-xs text-slate-400 shrink-0 hidden md:block">
                {formatDate(s.last_promoted)}
              </span>
            )}
            <Button
              size="sm"
              variant="outline"
              className="shrink-0 text-xs"
              onClick={() => setPromotingStaff(s)}
            >
              <TrendingUp className="w-3.5 h-3.5 mr-1" /> Promote
            </Button>
          </div>
        );
      })}

      {withoutTier.length > 0 && (
        <div>
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-2 mt-4">No tier assigned yet</p>
          <div className="space-y-2">
            {withoutTier.map(s => (
              <div key={s.id} className="flex items-center gap-4 bg-white rounded-lg border border-dashed border-slate-200 px-4 py-3">
                <div className="w-9 h-9 rounded-full bg-slate-50 flex items-center justify-center text-sm font-bold text-slate-400 shrink-0">
                  {s.first_name[0]}{s.last_name[0]}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm text-slate-600">{s.first_name} {s.last_name}</p>
                  <p className="text-xs text-slate-400">{s.job_title ?? s.role}</p>
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  className="shrink-0 text-xs"
                  onClick={() => setPromotingStaff(s)}
                >
                  <Plus className="w-3.5 h-3.5 mr-1" /> Assign Tier
                </Button>
              </div>
            ))}
          </div>
        </div>
      )}

      {promotingStaff && (
        <PromoteDialog
          staff={promotingStaff}
          tiers={tiers}
          open
          onClose={() => setPromotingStaff(null)}
        />
      )}
    </div>
  );
}

// ── Recognition Feed Tab ──────────────────────────────────────────────────────

function RecognitionDialog({
  open,
  onClose,
  staffList,
}: {
  open: boolean;
  onClose: () => void;
  staffList: StaffProgress[];
}) {
  const { toast } = useToast();
  const qc = useQueryClient();
  const [staffId, setStaffId] = useState("");
  const [eventType, setEventType] = useState("KUDOS");
  const [title, setTitle] = useState("");
  const [notes, setNotes] = useState("");
  const [givenBy, setGivenBy] = useState("");

  const mutation = useMutation({
    mutationFn: () =>
      postJson("/recognition", { staff_id: staffId, event_type: eventType, title, notes: notes || null, given_by: givenBy }),
    onSuccess: () => {
      toast({ title: "Recognition recorded" });
      qc.invalidateQueries({ queryKey: ["recognition"] });
      onClose();
    },
    onError: (e: Error) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  return (
    <Dialog open={open} onOpenChange={v => !v && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Give Recognition</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="space-y-1.5">
            <Label>Staff member</Label>
            <Select value={staffId} onValueChange={setStaffId}>
              <SelectTrigger><SelectValue placeholder="Select staff…" /></SelectTrigger>
              <SelectContent>
                {staffList.map(s => (
                  <SelectItem key={s.id} value={s.id}>
                    {s.first_name} {s.last_name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Recognition type</Label>
            <Select value={eventType} onValueChange={setEventType}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {Object.entries(EVENT_LABELS).map(([k, v]) => (
                  <SelectItem key={k} value={k}>{v}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Title / headline</Label>
            <Input
              value={title}
              onChange={e => setTitle(e.target.value)}
              placeholder="e.g. Exceptional guest feedback this week"
            />
          </div>
          <div className="space-y-1.5">
            <Label>Notes (optional)</Label>
            <Textarea
              value={notes}
              onChange={e => setNotes(e.target.value)}
              rows={2}
              placeholder="Additional context…"
            />
          </div>
          <div className="space-y-1.5">
            <Label>Given by</Label>
            <Input
              value={givenBy}
              onChange={e => setGivenBy(e.target.value)}
              placeholder="Your name or role"
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button
            disabled={!staffId || !title || !givenBy || mutation.isPending}
            onClick={() => mutation.mutate()}
          >
            {mutation.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
            Give Recognition
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function RecognitionFeedTab({ staffList }: { staffList: StaffProgress[] }) {
  const { toast } = useToast();
  const qc = useQueryClient();
  const [addOpen, setAddOpen] = useState(false);

  const { data: events = [], isLoading } = useQuery<RecognitionEvent[]>({
    queryKey: ["recognition"],
    queryFn: () => fetchJson("/recognition?limit=100"),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteReq(`/recognition/${id}`),
    onSuccess: () => {
      toast({ title: "Event removed" });
      qc.invalidateQueries({ queryKey: ["recognition"] });
    },
    onError: (e: Error) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-16 text-slate-400">
        <Loader2 className="w-5 h-5 animate-spin mr-2" /> Loading recognition feed…
      </div>
    );
  }

  return (
    <div className="mt-2">
      <div className="flex justify-end mb-4">
        <Button size="sm" onClick={() => setAddOpen(true)}>
          <Plus className="w-4 h-4 mr-1" /> Give Recognition
        </Button>
      </div>

      {events.length === 0 ? (
        <div className="text-center py-16 text-slate-400 text-sm">
          No recognition events yet. Be the first to celebrate a team member!
        </div>
      ) : (
        <div className="space-y-3">
          {events.map(ev => (
            <div key={ev.id} className="flex gap-3 items-start bg-white rounded-lg border border-slate-100 shadow-sm px-4 py-3">
              <div className="w-8 h-8 rounded-full bg-slate-50 border border-slate-200 flex items-center justify-center shrink-0 mt-0.5">
                {EVENT_ICONS[ev.event_type] ?? <Star className="w-4 h-4 text-slate-400" />}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-medium text-sm text-slate-800">{ev.staff_name}</span>
                  <Badge variant="outline" className="text-[10px] text-slate-500">
                    {EVENT_LABELS[ev.event_type] ?? ev.event_type}
                  </Badge>
                </div>
                <p className="text-sm text-slate-700 mt-0.5">{ev.title}</p>
                {ev.notes && <p className="text-xs text-slate-500 mt-0.5">{ev.notes}</p>}
                <p className="text-xs text-slate-400 mt-1">
                  By {ev.given_by} · {formatDate(ev.event_date)}
                </p>
              </div>
              <button
                className="text-slate-300 hover:text-red-400 transition-colors mt-0.5 shrink-0"
                title="Remove"
                onClick={() => deleteMutation.mutate(ev.id)}
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          ))}
        </div>
      )}

      <RecognitionDialog
        open={addOpen}
        onClose={() => setAddOpen(false)}
        staffList={staffList}
      />
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────

export default function Promotions() {
  const { data: tiers = [], isLoading: tiersLoading, isError } = useQuery<PromotionTier[]>({
    queryKey: ["promotion-tiers"],
    queryFn: () => fetchJson("/tiers"),
  });

  const { data: staffList = [] } = useQuery<StaffProgress[]>({
    queryKey: ["staff-progress"],
    queryFn: () => fetchJson("/staff-progress"),
  });

  const tracks = [...new Set(tiers.map(t => t.track_name))];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <TrendingUp className="w-6 h-6 text-blue-500" />
            Promotions
          </h1>
          <p className="text-sm text-slate-500 mt-0.5">
            Career ladder, staff progression, and recognition
          </p>
        </div>
        {!tiersLoading && !isError && (
          <div className="flex gap-4 text-center text-sm">
            <Card className="px-4 py-2 shadow-none border-slate-100">
              <p className="text-lg font-bold text-slate-800">{tracks.length}</p>
              <p className="text-xs text-slate-500">Tracks</p>
            </Card>
            <Card className="px-4 py-2 shadow-none border-slate-100">
              <p className="text-lg font-bold text-slate-800">{tiers.length}</p>
              <p className="text-xs text-slate-500">Tiers</p>
            </Card>
            <Card className="px-4 py-2 shadow-none border-slate-100">
              <p className="text-lg font-bold text-slate-800">
                {tiers.reduce((s, t) => s + t.promotion_count, 0)}
              </p>
              <p className="text-xs text-slate-500">Promotions</p>
            </Card>
          </div>
        )}
      </div>

      {/* Error state */}
      {isError && (
        <Card className="border-red-200 bg-red-50">
          <CardContent className="flex items-center gap-3 py-4">
            <AlertCircle className="w-5 h-5 text-red-500 shrink-0" />
            <p className="text-sm text-red-700">
              Could not load promotions data. Make sure the API server is running.
            </p>
          </CardContent>
        </Card>
      )}

      {/* Loading state */}
      {tiersLoading && (
        <div className="flex items-center justify-center py-20 text-slate-400">
          <Loader2 className="w-5 h-5 animate-spin mr-2" /> Loading promotions…
        </div>
      )}

      {/* Tabs */}
      {!tiersLoading && !isError && (
        <Tabs defaultValue="ladder">
          <TabsList>
            <TabsTrigger value="ladder">Career Ladder</TabsTrigger>
            <TabsTrigger value="progress">Staff Progress</TabsTrigger>
            <TabsTrigger value="recognition">Recognition Feed</TabsTrigger>
          </TabsList>

          <TabsContent value="ladder">
            <CareerLadderTab tiers={tiers} />
          </TabsContent>

          <TabsContent value="progress">
            <StaffProgressTab tiers={tiers} />
          </TabsContent>

          <TabsContent value="recognition">
            <RecognitionFeedTab staffList={staffList} />
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
}
