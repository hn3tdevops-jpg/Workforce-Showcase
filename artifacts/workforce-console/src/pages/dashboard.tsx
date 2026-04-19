import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/lib/auth-context";
import { useLocation } from "@/lib/location-context";
import { fetchRoomsMock, fetchTasksMock, fetchDashboardSummary, DEMO_MODE } from "@/lib/mock-adapter";
import { MOCK_ACTIVITY } from "@/lib/mock-data";
import { fetchApi } from "@/lib/api-client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { StatusChip } from "@/components/ui/status-chip";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Link } from "wouter";
import {
  DoorOpen, CheckSquare, Users, ArrowRight,
  Activity, CheckCircle2, AlertTriangle, Wrench, ClipboardList,
  HardHat, ShieldCheck,
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";

function activityIcon(type: string) {
  if (type.startsWith("task.completed")) return <CheckCircle2 className="w-4 h-4 text-green-400" />;
  if (type.startsWith("task.")) return <ClipboardList className="w-4 h-4 text-blue-400" />;
  if (type.startsWith("room.")) return <DoorOpen className="w-4 h-4 text-cyan-400" />;
  return <Activity className="w-4 h-4 text-muted-foreground" />;
}

export default function Dashboard() {
  const { session } = useAuth();
  const { selectedLocation, selectedLocationId } = useLocation();

  const locationId = selectedLocationId ?? "";

  const { data: summary, isLoading: loadingSummary } = useQuery({
    queryKey: ["/hospitable/dashboard", locationId],
    queryFn: () => fetchDashboardSummary(locationId),
    enabled: !!locationId,
  });

  const { data: rooms = [], isLoading: loadingRooms } = useQuery({
    queryKey: ["/rooms", locationId],
    queryFn: () => fetchRoomsMock(locationId || undefined),
  });

  const { data: tasks = [], isLoading: loadingTasks } = useQuery({
    queryKey: ["/tasks", locationId],
    queryFn: () => fetchTasksMock(locationId || undefined),
  });

  const { data: maintSummary } = useQuery({
    queryKey: ["/maintenance/summary"],
    queryFn: () => fetchApi<{ total: number; by_status: Record<string, number> }>("/maintenance/summary"),
  });

  const { data: inspSummary } = useQuery({
    queryKey: ["/inspections/summary"],
    queryFn: () => fetchApi<{ total: number; pass_rate: number | null; avg_score: number | null; by_status: Record<string, number> }>("/inspections/summary"),
  });

  const activeBusiness = session?.memberships.find(
    (m: any) => m.business_id === session.active_business_id
  );

  // Room status breakdown (from live rooms data)
  const roomStats = useMemo(() => {
    const counts: Record<string, number> = {};
    (rooms as { status?: string | null }[]).forEach((r) => {
      const s = r.status ?? "unknown";
      counts[s] = (counts[s] ?? 0) + 1;
    });
    return counts;
  }, [rooms]);

  // Task status breakdown (from live tasks data)
  const taskStats = useMemo(() => {
    const counts: Record<string, number> = {};
    (tasks as { status?: string | null }[]).forEach((t) => {
      const s = t.status ?? "unknown";
      counts[s] = (counts[s] ?? 0) + 1;
    });
    return counts;
  }, [tasks]);

  // Prefer summary data for top KPIs (faster, single query), fall back to computed
  const totalRooms = summary?.total_rooms ?? rooms.length;
  const openTasks = summary?.open_tasks ?? (tasks as { status?: string | null }[]).filter(
    (t) => t.status !== "completed" && t.status !== "done" && t.status !== "cancelled"
  ).length;
  const dirtyRooms = summary
    ? (summary.dirty + summary.assigned + summary.cleaning)
    : (roomStats["dirty"] ?? 0) + (roomStats["assigned"] ?? 0) + (roomStats["cleaning"] ?? 0);
  const cleanRooms = summary
    ? (summary.clean + summary.inspected)
    : (roomStats["clean"] ?? 0) + (roomStats["inspected"] ?? 0);
  const unresolvedIssues = maintSummary
    ? (maintSummary.by_status["open"] ?? 0) + (maintSummary.by_status["in_progress"] ?? 0)
    : summary?.unresolved_issues ?? 0;
  const inspPassRate = inspSummary?.pass_rate;

  const isLoadingKpis = loadingSummary && loadingRooms;

  const statCards = [
    {
      label: "Total Rooms",
      value: totalRooms,
      icon: DoorOpen,
      color: "text-blue-400",
      bg: "bg-blue-400/10",
      loading: isLoadingKpis,
      link: "/app/rooms",
    },
    {
      label: "Active Tasks",
      value: openTasks,
      icon: CheckSquare,
      color: "text-amber-400",
      bg: "bg-amber-400/10",
      loading: loadingTasks && loadingSummary,
      link: "/app/tasks",
    },
    {
      label: "Rooms Needing Attention",
      value: dirtyRooms,
      icon: AlertTriangle,
      color: "text-red-400",
      bg: "bg-red-400/10",
      loading: isLoadingKpis,
      link: "/app/rooms",
    },
    {
      label: "Rooms Ready",
      value: cleanRooms,
      icon: CheckCircle2,
      color: "text-green-400",
      bg: "bg-green-400/10",
      loading: isLoadingKpis,
      link: "/app/rooms",
    },
  ];

  statCards.push({
    label: "Open Maintenance",
    value: unresolvedIssues,
    icon: HardHat,
    color: "text-amber-400",
    bg: "bg-amber-400/10",
    loading: false,
    link: "/app/maintenance",
  });

  if (inspPassRate !== null && inspPassRate !== undefined) {
    statCards.push({
      label: "Inspection Pass Rate",
      value: inspPassRate as any,
      icon: ShieldCheck,
      color: inspPassRate >= 80 ? "text-emerald-400" : "text-red-400",
      bg: inspPassRate >= 80 ? "bg-emerald-400/10" : "bg-red-400/10",
      loading: false,
      link: "/app/inspections",
    });
  }

  const recentActivity = DEMO_MODE ? MOCK_ACTIVITY : [];

  return (
    <div className="space-y-8 pb-10">
      <header className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight mb-1">
            Welcome back, {session?.first_name || "User"}
          </h1>
          <p className="text-muted-foreground">
            {activeBusiness?.business_name}
            {selectedLocation ? (
              <span className="text-muted-foreground/60"> · {selectedLocation.name}</span>
            ) : null}
          </p>
        </div>
        {DEMO_MODE && (
          <Badge variant="outline" className="border-amber-500/30 text-amber-400 bg-amber-500/5 text-[10px] font-mono self-start sm:self-auto">
            DEMO MODE — mock data active
          </Badge>
        )}
      </header>

      {/* Stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map((stat, i) => (
          <Link href={stat.link} key={i}>
            <Card className="border-border/50 bg-card hover:bg-accent/30 transition-all cursor-pointer group hover:border-primary/30 hover:shadow-lg hover:shadow-primary/5">
              <CardContent className="p-5 flex items-center justify-between">
                <div className="space-y-1">
                  <p className="text-xs font-medium text-muted-foreground">{stat.label}</p>
                  {stat.loading ? (
                    <Skeleton className="h-7 w-12" />
                  ) : (
                    <p className="text-2xl font-bold tracking-tight group-hover:text-primary transition-colors">
                      {stat.value}
                    </p>
                  )}
                </div>
                <div
                  className={`w-10 h-10 rounded-xl ${stat.bg} ${stat.color} flex items-center justify-center border border-current/10`}
                >
                  <span className="w-5 h-5" />
                </div>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>

      {/* Summary bar from hospitable dashboard */}
      {summary && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: "Dirty", value: summary.dirty, status: "dirty" },
            { label: "Cleaning", value: summary.cleaning, status: "cleaning" },
            { label: "Inspect", value: summary.inspect, status: "inspect" },
            { label: "Blocked", value: summary.blocked, status: "blocked" },
          ].map(({ label, value, status }) => (
            <div key={status} className="flex items-center justify-between p-3 rounded-lg border border-border/40 bg-card/40">
              <StatusChip status={status} type="room" />
              <span className="text-lg font-bold font-mono tabular-nums text-foreground">{value}</span>
            </div>
          ))}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Room status breakdown */}
        <Card className="border-border/50 shadow-md">
          <CardHeader className="border-b border-border/50 pb-3">
            <CardTitle className="text-sm flex items-center justify-between">
              Room Status Breakdown
              <Button variant="ghost" size="sm" asChild className="text-xs text-muted-foreground h-7">
                <Link href="/app/rooms">View all <ArrowRight className="w-3 h-3 ml-1" /></Link>
              </Button>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 space-y-2">
            {loadingRooms ? (
              <div className="space-y-2">
                {[1, 2, 3].map((i) => <Skeleton key={i} className="h-7 w-full" />)}
              </div>
            ) : Object.keys(roomStats).length === 0 ? (
              <p className="text-xs text-muted-foreground text-center py-4">No rooms yet</p>
            ) : (
              Object.entries(roomStats).map(([status, count]) => (
                <div key={status} className="flex items-center justify-between py-1">
                  <StatusChip status={status} type="room" />
                  <span className="text-sm font-semibold font-mono tabular-nums">{count}</span>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        {/* Task status breakdown */}
        <Card className="border-border/50 shadow-md">
          <CardHeader className="border-b border-border/50 pb-3">
            <CardTitle className="text-sm flex items-center justify-between">
              Task Status Breakdown
              <Button variant="ghost" size="sm" asChild className="text-xs text-muted-foreground h-7">
                <Link href="/app/tasks">View all <ArrowRight className="w-3 h-3 ml-1" /></Link>
              </Button>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 space-y-2">
            {loadingTasks ? (
              <div className="space-y-2">
                {[1, 2, 3].map((i) => <Skeleton key={i} className="h-7 w-full" />)}
              </div>
            ) : Object.keys(taskStats).length === 0 ? (
              <p className="text-xs text-muted-foreground text-center py-4">No tasks</p>
            ) : (
              Object.entries(taskStats).map(([status, count]) => (
                <div key={status} className="flex items-center justify-between py-1">
                  <StatusChip status={status} type="task" />
                  <span className="text-sm font-semibold font-mono tabular-nums">{count}</span>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        {/* Recent Activity */}
        <Card className="border-border/50 shadow-md">
          <CardHeader className="border-b border-border/50 pb-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <Activity className="w-4 h-4 text-primary" />
              Recent Activity
            </CardTitle>
            {!DEMO_MODE && (
              <CardDescription className="text-xs">Live event stream coming soon.</CardDescription>
            )}
          </CardHeader>
          <CardContent className="p-0">
            {recentActivity.length === 0 ? (
              <div className="p-6 text-center text-xs text-muted-foreground">
                Activity feed requires the event timeline endpoint.
              </div>
            ) : (
              <div className="divide-y divide-border/40">
                {recentActivity.slice(0, 6).map((event) => (
                  <div key={event.id} className="flex items-start gap-3 px-4 py-3">
                    <div className="mt-0.5 shrink-0">{activityIcon(event.type)}</div>
                    <div className="min-w-0 flex-1">
                      <p className="text-xs text-foreground leading-snug">{event.description}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-[10px] text-muted-foreground">{event.actor}</span>
                        <span className="text-[10px] text-muted-foreground/50">·</span>
                        <span className="text-[10px] text-muted-foreground">
                          {formatDistanceToNow(new Date(event.ts), { addSuffix: true })}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Session context for current user */}
      <Card className="border-border/50 shadow-md bg-gradient-to-b from-card to-card/50">
        <CardHeader className="border-b border-border/50 pb-3">
          <CardTitle className="text-sm">Your Session</CardTitle>
          <CardDescription className="text-xs">
            Active roles and permissions for this context.
          </CardDescription>
        </CardHeader>
        <CardContent className="p-5 grid grid-cols-1 sm:grid-cols-2 gap-5">
          <div>
            <p className="text-[10px] uppercase tracking-widest font-mono text-muted-foreground mb-2">Roles</p>
            <div className="flex flex-wrap gap-1.5">
              {session?.roles?.length ? (
                session.roles.map((role) => (
                  <span
                    key={role}
                    className="px-2 py-0.5 rounded-md bg-primary/10 text-primary border border-primary/20 text-xs font-medium"
                  >
                    {role}
                  </span>
                ))
              ) : (
                <span className="text-sm text-muted-foreground">No roles</span>
              )}
            </div>
          </div>
          <div>
            <p className="text-[10px] uppercase tracking-widest font-mono text-muted-foreground mb-2">
              Permissions ({session?.permissions?.length ?? 0})
            </p>
            <div className="flex flex-wrap gap-1.5">
              {session?.permissions?.slice(0, 8).map((perm) => (
                <span
                  key={perm}
                  className="px-1.5 py-0.5 rounded bg-secondary text-secondary-foreground border border-border text-[10px] font-mono"
                >
                  {perm}
                </span>
              ))}
              {(session?.permissions?.length ?? 0) > 8 && (
                <span className="text-[10px] text-muted-foreground self-center">
                  +{(session?.permissions?.length ?? 0) - 8} more
                </span>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
