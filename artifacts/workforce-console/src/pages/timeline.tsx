import { useState } from "react";
import { format, formatDistanceToNow } from "date-fns";
import {
  Activity, Search, Filter, ChevronLeft, ChevronRight,
  AlertCircle, Clock, User, Tag, Link2, RefreshCw,
  CheckSquare, Calendar, Building2, DoorOpen, Users,
  TrendingUp, ArrowRightLeft, UserPlus, Briefcase,
  Zap, BookOpen
} from "lucide-react";
import { useTimeline, TimelineEvent, TimelineParams } from "@/hooks/use-workforce";
import { ApiError } from "@/lib/api-client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";

const ENTITY_TYPES = ["room", "guest", "deal", "contact", "task", "booking"] as const;
type EntityType = typeof ENTITY_TYPES[number];

const EVENT_TYPE_OPTIONS = [
  "task.created",
  "task.updated",
  "task.completed",
  "booking.created",
  "deal.created",
  "deal.stage_changed",
  "contact.created",
];

const EVENT_ICONS: Record<string, React.ElementType> = {
  "task.created": CheckSquare,
  "task.updated": RefreshCw,
  "task.completed": CheckSquare,
  "booking.created": Calendar,
  "deal.created": Briefcase,
  "deal.stage_changed": ArrowRightLeft,
  "contact.created": UserPlus,
};

const EVENT_COLORS: Record<string, string> = {
  "task.created": "text-blue-400 bg-blue-400/10 border-blue-400/30",
  "task.updated": "text-amber-400 bg-amber-400/10 border-amber-400/30",
  "task.completed": "text-green-400 bg-green-400/10 border-green-400/30",
  "booking.created": "text-purple-400 bg-purple-400/10 border-purple-400/30",
  "deal.created": "text-emerald-400 bg-emerald-400/10 border-emerald-400/30",
  "deal.stage_changed": "text-orange-400 bg-orange-400/10 border-orange-400/30",
  "contact.created": "text-cyan-400 bg-cyan-400/10 border-cyan-400/30",
};

const ENTITY_ICONS: Record<string, React.ElementType> = {
  room: DoorOpen,
  guest: Users,
  deal: TrendingUp,
  contact: User,
  task: CheckSquare,
  booking: Calendar,
};

function eventLabel(type: string): string {
  return type.split(".").map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(" ");
}

function payloadSummary(event: TimelineEvent): string {
  const p = event.payload;
  switch (event.event_type) {
    case "task.created":
      return `Task "${p.description || p.task_id}" (${p.task_type || "unknown type"}) created with ${p.priority || "default"} priority`;
    case "task.updated":
      if (Array.isArray(p.changes)) {
        return (p.changes as Array<{field: string; old_value: unknown; new_value: unknown}>)
          .map(c => `${c.field}: ${c.old_value} → ${c.new_value}`)
          .join(", ");
      }
      return "Task updated";
    case "task.completed":
      return `Task completed${p.duration ? ` in ${p.duration}` : ""}${p.notes ? ` · ${p.notes}` : ""}`;
    case "booking.created":
      return `Booking for room ${p.room_id || "?"} · Check-in ${p.check_in_date || "?"} → ${p.check_out_date || "?"}`;
    case "deal.created":
      return `Deal "${p.deal_name}" created · $${p.amount || 0} · Stage: ${p.stage || "?"}`;
    case "deal.stage_changed":
      return `Stage changed: ${p.old_stage} → ${p.new_stage}`;
    case "contact.created":
      return `${p.first_name || ""} ${p.last_name || ""} added (${p.email || "no email"})`;
    default:
      return JSON.stringify(p).slice(0, 120);
  }
}

function EventCard({ event }: { event: TimelineEvent }) {
  const Icon = (EVENT_ICONS[event.event_type] ?? Zap) as any;
  const colorClass = EVENT_COLORS[event.event_type] ?? "text-gray-400 bg-gray-400/10 border-gray-400/30";
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="flex gap-4 group">
      <div className="flex flex-col items-center">
        <div className={`w-8 h-8 rounded-full border flex items-center justify-center flex-shrink-0 ${colorClass}`}>
          <Icon className="w-3.5 h-3.5" />
        </div>
        <div className="w-px flex-1 bg-border/50 mt-2 group-last:hidden" />
      </div>

      <div className="pb-6 flex-1 min-w-0">
        <div className="flex flex-wrap items-start gap-2 mb-1">
          <Badge variant="outline" className={`text-xs font-mono px-2 py-0.5 border ${colorClass}`}>
            {eventLabel(event.event_type)}
          </Badge>
          <span className="text-xs text-muted-foreground flex items-center gap-1">
            <Clock className="w-3 h-3" />
            {formatDistanceToNow(new Date(event.timestamp), { addSuffix: true })}
            <span className="text-muted-foreground/50">·</span>
            {format(new Date(event.timestamp), "MMM d, yyyy HH:mm")}
          </span>
        </div>

        <p className="text-sm text-foreground/90 mb-2 leading-relaxed">{payloadSummary(event)}</p>

        <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
          <span className="flex items-center gap-1">
            <User className="w-3 h-3" />
            <span className="font-mono">{event.actor_id}</span>
          </span>
          <span className="flex items-center gap-1">
            <Tag className="w-3 h-3" />
            <span className="font-mono">{event.event_id}</span>
          </span>
          {event.related_entities.length > 0 && (
            <span className="flex items-center gap-1">
              <Link2 className="w-3 h-3" />
              {event.related_entities.map(e => (
                <span key={e.entity_id} className="px-1.5 py-0.5 rounded bg-muted text-muted-foreground font-mono">
                  {e.entity_type}:{e.entity_id}
                  {e.role && <span className="text-muted-foreground/60 ml-1">({e.role})</span>}
                </span>
              ))}
            </span>
          )}
        </div>

        <button
          className="text-xs text-primary/60 hover:text-primary mt-2 flex items-center gap-1"
          onClick={() => setExpanded(v => !v)}
        >
          <BookOpen className="w-3 h-3" />
          {expanded ? "Hide" : "View"} raw payload
        </button>

        {expanded && (
          <pre className="mt-2 text-xs font-mono bg-muted/40 border border-border/50 rounded p-3 overflow-auto max-h-48 text-muted-foreground">
            {JSON.stringify(event.payload, null, 2)}
          </pre>
        )}
      </div>
    </div>
  );
}

function SkeletonEvent() {
  return (
    <div className="flex gap-4">
      <div className="flex flex-col items-center">
        <Skeleton className="w-8 h-8 rounded-full" />
        <div className="w-px flex-1 bg-border/30 mt-2" />
      </div>
      <div className="pb-6 flex-1">
        <Skeleton className="h-5 w-32 mb-2" />
        <Skeleton className="h-4 w-3/4 mb-1" />
        <Skeleton className="h-3 w-1/2" />
      </div>
    </div>
  );
}

export default function Timeline() {
  const [entityId, setEntityId] = useState("");
  const [entityType, setEntityType] = useState<EntityType>("room");
  const [selectedEventTypes, setSelectedEventTypes] = useState<string[]>([]);
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [offset, setOffset] = useState(0);
  const [submittedParams, setSubmittedParams] = useState<TimelineParams | null>(null);

  const limit = 20;

  const { data, isLoading, error, isFetching, refetch } = useTimeline(
    submittedParams ?? { entity_id: "", entity_type: "room" },
    !!submittedParams
  );

  function handleSearch() {
    if (!entityId.trim()) return;
    setOffset(0);
    setSubmittedParams({
      entity_id: entityId.trim(),
      entity_type: entityType,
      ...(startDate && { start_date: startDate }),
      ...(endDate && { end_date: endDate }),
      ...(selectedEventTypes.length > 0 && { event_types: selectedEventTypes.join(",") }),
      limit,
      offset: 0,
    });
  }

  function handlePageChange(newOffset: number) {
    setOffset(newOffset);
    setSubmittedParams(prev => prev ? { ...prev, offset: newOffset } : prev);
  }

  function toggleEventType(type: string) {
    setSelectedEventTypes(prev =>
      prev.includes(type) ? prev.filter(t => t !== type) : [...prev, type]
    );
  }

  const totalPages = data ? Math.ceil(data.total_events / limit) : 0;
  const currentPage = Math.floor(offset / limit) + 1;
  const apiErr = error as ApiError | null;
  const isNotFound = apiErr?.status === 404;
  const isNotReady = apiErr?.status === 404 || apiErr?.message?.toLowerCase().includes("not found");

  return (
    <div className="flex flex-col h-full">
      <div className="flex-shrink-0 border-b border-border/50 bg-background/80 backdrop-blur px-6 py-4">
        <div className="flex items-center gap-3 mb-1">
          <Activity className="w-5 h-5 text-primary" />
          <h1 className="text-xl font-bold tracking-tight">Event Timeline</h1>
        </div>
        <p className="text-sm text-muted-foreground">
          Immutable audit stream — query any entity to see its full history across workforce and CRM modules.
        </p>
      </div>

      <div className="flex-1 overflow-auto">
        <div className="max-w-4xl mx-auto p-6 space-y-6">

          {/* Query Panel */}
          <Card className="border-border/50 bg-card/60">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <Search className="w-4 h-4 text-primary" /> Query Parameters
              </CardTitle>
              <CardDescription className="text-xs">
                Select an entity and type to load its event stream. Filters are optional.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label className="text-xs font-medium text-muted-foreground">Entity Type</Label>
                  <Select value={entityType} onValueChange={v => setEntityType(v as EntityType)}>
                    <SelectTrigger className="h-9 text-sm">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {ENTITY_TYPES.map(t => {
                        const Icon = (ENTITY_ICONS[t] ?? Tag) as any;
                        return (
                          <SelectItem key={t} value={t}>
                            <span className="flex items-center gap-2">
                              <Icon className="w-3.5 h-3.5" /> {t}
                            </span>
                          </SelectItem>
                        );
                      })}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-medium text-muted-foreground">Entity ID</Label>
                  <Input
                    className="h-9 text-sm font-mono"
                    placeholder={`e.g. room_101`}
                    value={entityId}
                    onChange={e => setEntityId(e.target.value)}
                    onKeyDown={e => e.key === "Enter" && handleSearch()}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label className="text-xs font-medium text-muted-foreground">Start Date (optional)</Label>
                  <Input
                    type="date"
                    className="h-9 text-sm"
                    value={startDate}
                    onChange={e => setStartDate(e.target.value)}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-medium text-muted-foreground">End Date (optional)</Label>
                  <Input
                    type="date"
                    className="h-9 text-sm"
                    value={endDate}
                    onChange={e => setEndDate(e.target.value)}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label className="text-xs font-medium text-muted-foreground flex items-center gap-1">
                  <Filter className="w-3 h-3" /> Filter Event Types (optional)
                </Label>
                <div className="flex flex-wrap gap-2">
                  {EVENT_TYPE_OPTIONS.map(type => {
                    const active = selectedEventTypes.includes(type);
                    const colorClass = EVENT_COLORS[type] ?? "";
                    return (
                      <button
                        key={type}
                        onClick={() => toggleEventType(type)}
                        className={`text-xs px-2.5 py-1 rounded-full border font-mono transition-all ${
                          active ? colorClass : "border-border/50 text-muted-foreground hover:border-primary/40"
                        }`}
                      >
                        {type}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="flex items-center gap-2 pt-1">
                <Button size="sm" onClick={handleSearch} disabled={!entityId.trim() || isLoading}>
                  <Search className="w-3.5 h-3.5 mr-1.5" />
                  Query Timeline
                </Button>
                {submittedParams && (
                  <Button size="sm" variant="ghost" onClick={() => refetch()} disabled={isFetching}>
                    <RefreshCw className={`w-3.5 h-3.5 mr-1.5 ${isFetching ? "animate-spin" : ""}`} />
                    Refresh
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Results */}
          {!submittedParams && (
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <div className="w-16 h-16 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center mb-4">
                <Activity className="w-7 h-7 text-primary/60" />
              </div>
              <h3 className="text-base font-semibold mb-1">No entity selected</h3>
              <p className="text-sm text-muted-foreground max-w-sm">
                Enter an entity ID and type above to load its event stream. Every room, guest, deal, and contact has a full audit trail.
              </p>
            </div>
          )}

          {isLoading && submittedParams && (
            <Card className="border-border/50 bg-card/60">
              <CardContent className="pt-6">
                {[...Array(5)].map((_, i) => <SkeletonEvent key={i} />)}
              </CardContent>
            </Card>
          )}

          {error && !isLoading && (
            <Card className="border-border/50 bg-card/60">
              <CardContent className="pt-6">
                {isNotReady ? (
                  <div className="flex flex-col items-center py-12 text-center">
                    <div className="w-14 h-14 rounded-full bg-amber-400/10 border border-amber-400/30 flex items-center justify-center mb-4">
                      <Zap className="w-6 h-6 text-amber-400" />
                    </div>
                    <h3 className="text-base font-semibold mb-1">Timeline endpoint not yet available</h3>
                    <p className="text-sm text-muted-foreground max-w-sm mb-4">
                      The <code className="font-mono text-xs bg-muted px-1 py-0.5 rounded">/api/v1/timeline</code> endpoint
                      hasn't been deployed to the API yet. Once it's live, event streams will appear here automatically.
                    </p>
                    <div className="text-xs font-mono bg-muted/50 border border-border/50 rounded px-3 py-2 text-muted-foreground text-left max-w-sm w-full">
                      <div className="text-muted-foreground/60 mb-1"># Planned endpoint</div>
                      <div>GET /api/v1/timeline</div>
                      <div className="text-muted-foreground/60">?entity_id=&entity_type=</div>
                      <div className="text-muted-foreground/60">&amp;event_types=task.created,...</div>
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-col items-center py-12 text-center">
                    <div className="w-14 h-14 rounded-full bg-destructive/10 border border-destructive/30 flex items-center justify-center mb-4">
                      <AlertCircle className="w-6 h-6 text-destructive" />
                    </div>
                    <h3 className="text-base font-semibold mb-1">
                      {(error as ApiError)?.status === 401 ? "Session expired" : "Failed to load timeline"}
                    </h3>
                    <p className="text-sm text-muted-foreground max-w-sm">
                      {(error as ApiError)?.message ?? "An unexpected error occurred. Please try again."}
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {data && !isLoading && (
            <>
              <div className="flex items-center justify-between">
                <div className="text-sm text-muted-foreground">
                  <span className="font-medium text-foreground">{data.total_events}</span> events
                  {submittedParams?.entity_type && (
                    <span> for <span className="font-mono text-xs bg-muted px-1.5 py-0.5 rounded">{submittedParams.entity_type}:{submittedParams.entity_id}</span></span>
                  )}
                </div>
                {totalPages > 1 && (
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    Page {currentPage} of {totalPages}
                  </div>
                )}
              </div>

              <Card className="border-border/50 bg-card/60">
                <CardContent className="pt-6">
                  {data.events.length === 0 ? (
                    <div className="flex flex-col items-center py-12 text-center">
                      <div className="w-12 h-12 rounded-full bg-muted border border-border/50 flex items-center justify-center mb-3">
                        <Activity className="w-5 h-5 text-muted-foreground" />
                      </div>
                      <h3 className="text-sm font-semibold mb-1">No events found</h3>
                      <p className="text-xs text-muted-foreground max-w-xs">
                        No events match your query. Try adjusting the date range or event type filters.
                      </p>
                    </div>
                  ) : (
                    <div>
                      {data.events.map((event, i) => (
                        <div key={event.event_id}>
                          <EventCard event={event} />
                          {i < data.events.length - 1 && <Separator className="mb-4 opacity-0" />}
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>

              {totalPages > 1 && (
                <div className="flex items-center justify-between">
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={offset === 0}
                    onClick={() => handlePageChange(Math.max(0, offset - limit))}
                  >
                    <ChevronLeft className="w-4 h-4 mr-1" /> Previous
                  </Button>
                  <span className="text-xs text-muted-foreground">
                    Showing {offset + 1}–{Math.min(offset + limit, data.total_events)} of {data.total_events}
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={offset + limit >= data.total_events}
                    onClick={() => handlePageChange(offset + limit)}
                  >
                    Next <ChevronRight className="w-4 h-4 ml-1" />
                  </Button>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
