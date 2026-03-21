import { useAuth } from "@/lib/auth-context";
import { useRooms, useTasks, useShifts, useAssignments } from "@/hooks/use-workforce";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { DoorOpen, CheckSquare, CalendarDays, Users, ArrowRight } from "lucide-react";
import { StatusChip } from "@/components/ui/status-chip";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Link } from "wouter";

export default function Dashboard() {
  const { session } = useAuth();
  
  const { data: rooms, isLoading: loadingRooms } = useRooms(0, 100);
  const { data: tasks, isLoading: loadingTasks } = useTasks(0, 100);
  const { data: shifts, isLoading: loadingShifts } = useShifts(0, 100);
  const { data: assignments, isLoading: loadingAssignments } = useAssignments(0, 100);

  const activeBusiness = session?.memberships.find(m => m.business_id === session.active_business_id);

  const stats = [
    { label: "Total Rooms", value: rooms?.length || 0, icon: DoorOpen, color: "text-blue-400", bg: "bg-blue-400/10", loading: loadingRooms, link: "/app/rooms" },
    { label: "Active Tasks", value: tasks?.filter(t => t.status !== 'completed' && t.status !== 'cancelled').length || 0, icon: CheckSquare, color: "text-amber-400", bg: "bg-amber-400/10", loading: loadingTasks, link: "/app/tasks" },
    { label: "Current Shifts", value: shifts?.filter(s => s.status === 'active' || s.status === 'published').length || 0, icon: CalendarDays, color: "text-emerald-400", bg: "bg-emerald-400/10", loading: loadingShifts, link: "/app/shifts" },
    { label: "Staff Assignments", value: assignments?.length || 0, icon: Users, color: "text-purple-400", bg: "bg-purple-400/10", loading: loadingAssignments, link: "/app/assignments" },
  ];

  const recentTasks = tasks?.slice(0, 5) || [];

  return (
    <div className="space-y-8 pb-10">
      <header>
        <h1 className="text-3xl font-bold tracking-tight mb-2">Welcome back, {session?.first_name || 'User'}</h1>
        <p className="text-muted-foreground text-lg">
          Here's what's happening at <span className="font-medium text-foreground">{activeBusiness?.business_name}</span> today.
        </p>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat, i) => (
          <Link href={stat.link} key={i}>
            <Card className="border-border/50 bg-card hover:bg-accent/30 transition-all cursor-pointer group hover:border-primary/30 hover:shadow-lg hover:shadow-primary/5">
              <CardContent className="p-6 flex items-center justify-between">
                <div className="space-y-2">
                  <p className="text-sm font-medium text-muted-foreground">{stat.label}</p>
                  {stat.loading ? (
                    <Skeleton className="h-8 w-16" />
                  ) : (
                    <p className="text-3xl font-bold tracking-tight group-hover:text-primary transition-colors">{stat.value}</p>
                  )}
                </div>
                <div className={`w-12 h-12 rounded-xl ${stat.bg} ${stat.color} flex items-center justify-center border border-current/10`}>
                  <stat.icon className="w-6 h-6" />
                </div>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <Card className="lg:col-span-2 border-border/50 shadow-md">
          <CardHeader className="flex flex-row items-center justify-between border-b border-border/50 pb-4">
            <div>
              <CardTitle>Recent Tasks</CardTitle>
              <CardDescription>Latest tasks needing attention</CardDescription>
            </div>
            <Button variant="ghost" size="sm" asChild className="text-muted-foreground">
              <Link href="/app/tasks">View all <ArrowRight className="w-4 h-4 ml-1" /></Link>
            </Button>
          </CardHeader>
          <CardContent className="p-0">
            {loadingTasks ? (
              <div className="p-6 space-y-4">
                {[1,2,3].map(i => <Skeleton key={i} className="h-12 w-full" />)}
              </div>
            ) : recentTasks.length > 0 ? (
              <div className="divide-y divide-border/50">
                {recentTasks.map(task => (
                  <div key={task.id} className="p-4 hover:bg-accent/20 transition-colors flex items-center justify-between">
                    <div className="space-y-1">
                      <p className="font-medium text-sm">{task.title}</p>
                      <p className="text-xs text-muted-foreground font-mono">{task.task_type}</p>
                    </div>
                    <div className="flex items-center gap-3">
                      <StatusChip status={task.priority || 'low'} type="priority" />
                      <StatusChip status={task.status || 'pending'} type="task" />
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-10 text-center text-muted-foreground flex flex-col items-center">
                <CheckSquare className="w-10 h-10 mb-3 opacity-20" />
                <p>No tasks found for this business.</p>
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="border-border/50 shadow-md bg-gradient-to-b from-card to-card/50">
          <CardHeader className="border-b border-border/50 pb-4">
            <CardTitle>Current Session</CardTitle>
            <CardDescription>Your active permissions</CardDescription>
          </CardHeader>
          <CardContent className="p-6 space-y-6">
            <div>
              <p className="text-xs uppercase tracking-wider font-mono text-muted-foreground mb-3">Roles</p>
              <div className="flex flex-wrap gap-2">
                {session?.roles?.length ? session.roles.map(role => (
                  <span key={role} className="px-2.5 py-1 rounded-md bg-primary/10 text-primary border border-primary/20 text-xs font-medium">
                    {role}
                  </span>
                )) : <span className="text-sm text-muted-foreground">No roles assigned</span>}
              </div>
            </div>
            <div>
              <p className="text-xs uppercase tracking-wider font-mono text-muted-foreground mb-3">Permissions</p>
              <div className="flex flex-wrap gap-2">
                {session?.permissions?.length ? session.permissions.map(perm => (
                  <span key={perm} className="px-2.5 py-1 rounded-md bg-secondary text-secondary-foreground border border-border text-xs font-mono">
                    {perm}
                  </span>
                )) : <span className="text-sm text-muted-foreground">No permissions</span>}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
