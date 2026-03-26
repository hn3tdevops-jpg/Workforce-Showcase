import { useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { fetchTasksMock, fetchUsers, assignTask, updateTaskStatus, DEMO_MODE } from "@/lib/mock-adapter";
import { useLocation } from "@/lib/location-context";
import type { MockUser } from "@/lib/mock-data";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StatusChip } from "@/components/ui/status-chip";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { CheckSquare, ChevronDown, Clock, User, AlertCircle } from "lucide-react";
import { format, formatDistanceToNow } from "date-fns";
import { useToast } from "@/hooks/use-toast";

const STATUS_GROUPS = [
  { key: "pending", label: "Pending", color: "text-amber-400 border-amber-500/30 bg-amber-500/5" },
  { key: "in_progress", label: "In Progress", color: "text-blue-400 border-blue-500/30 bg-blue-500/5" },
  { key: "completed", label: "Completed", color: "text-green-400 border-green-500/30 bg-green-500/5" },
  { key: "cancelled", label: "Cancelled", color: "text-muted-foreground border-border bg-muted/20" },
] as const;

const TASK_STATUSES = ["pending", "in_progress", "completed", "cancelled"];

interface AnyTask {
  id: string;
  title: string;
  description?: string | null;
  task_type?: string | null;
  priority?: string | null;
  status?: string | null;
  due_date?: string | null;
  assigned_to?: string | null;
  location_id?: string | null;
  room_id?: string | null;
}

function priorityOrder(p: string | null | undefined) {
  const map: Record<string, number> = { critical: 0, high: 1, medium: 2, low: 3 };
  return map[p ?? ""] ?? 99;
}

function TaskRow({
  task,
  users,
  onAssign,
  onStatusChange,
}: {
  task: AnyTask;
  users: MockUser[];
  onAssign: (userId: string | null) => void;
  onStatusChange: (status: string) => void;
}) {
  const assignee = users.find((u) => u.id === task.assigned_to);
  const isOverdue =
    task.due_date &&
    new Date(task.due_date) < new Date() &&
    task.status !== "completed" &&
    task.status !== "cancelled";

  return (
    <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 p-4 hover:bg-accent/10 transition-colors border-b border-border/40 last:border-0">
      <div className="flex-1 min-w-0 space-y-1">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="font-medium text-sm">{task.title}</span>
          {task.priority && <StatusChip status={task.priority} type="priority" />}
          {isOverdue && (
            <span className="inline-flex items-center gap-1 text-[10px] text-red-400 font-mono">
              <AlertCircle className="w-3 h-3" /> OVERDUE
            </span>
          )}
        </div>
        {task.description && (
          <p className="text-xs text-muted-foreground truncate max-w-lg">{task.description}</p>
        )}
        <div className="flex items-center gap-3 text-xs text-muted-foreground flex-wrap">
          {task.task_type && (
            <span className="font-mono uppercase tracking-wide">{task.task_type}</span>
          )}
          {task.due_date && (
            <span className={`flex items-center gap-1 ${isOverdue ? "text-red-400" : ""}`}>
              <Clock className="w-3 h-3" />
              {format(new Date(task.due_date), "MMM d, h:mm a")}
            </span>
          )}
        </div>
      </div>

      <div className="flex items-center gap-2 shrink-0">
        {/* Assign */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm" className="h-7 text-xs gap-1.5 max-w-[130px]">
              <User className="w-3 h-3 shrink-0" />
              <span className="truncate">
                {assignee ? `${assignee.first_name} ${assignee.last_name}` : "Unassigned"}
              </span>
              <ChevronDown className="w-3 h-3 shrink-0" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-52 border-border/50">
            <DropdownMenuLabel className="text-[10px] font-mono uppercase text-muted-foreground tracking-wider">
              Assign To
            </DropdownMenuLabel>
            <DropdownMenuSeparator className="bg-border/50" />
            <DropdownMenuItem className="text-xs cursor-pointer text-muted-foreground" onClick={() => onAssign(null)}>
              — Unassigned
            </DropdownMenuItem>
            {users.map((u) => (
              <DropdownMenuItem
                key={u.id}
                className="text-xs cursor-pointer gap-2"
                onClick={() => onAssign(u.id)}
              >
                <div className="w-5 h-5 rounded-full bg-primary/15 border border-primary/20 flex items-center justify-center text-[10px] font-bold text-primary shrink-0">
                  {u.first_name[0]}{u.last_name[0]}
                </div>
                {u.first_name} {u.last_name}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Status */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm" className="h-7 text-xs gap-1">
              <StatusChip status={task.status ?? "pending"} type="task" />
              <ChevronDown className="w-3 h-3" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-40 border-border/50">
            <DropdownMenuLabel className="text-[10px] font-mono uppercase text-muted-foreground tracking-wider">
              Set Status
            </DropdownMenuLabel>
            <DropdownMenuSeparator className="bg-border/50" />
            {TASK_STATUSES.map((s) => (
              <DropdownMenuItem
                key={s}
                className="text-xs cursor-pointer"
                onClick={() => onStatusChange(s)}
              >
                <StatusChip status={s} type="task" />
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
}

export default function Tasks() {
  const { selectedLocationId } = useLocation();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { data: allTasks = [], isLoading: tasksLoading, isError } = useQuery({
    queryKey: ["/tasks", selectedLocationId],
    queryFn: fetchTasksMock,
  });

  const { data: users = [] } = useQuery({
    queryKey: ["/users"],
    queryFn: fetchUsers,
  });

  const tasks = useMemo(() => {
    let list = allTasks as AnyTask[];
    if (selectedLocationId) {
      list = list.filter((t) => !t.location_id || t.location_id === selectedLocationId);
    }
    return list;
  }, [allTasks, selectedLocationId]);

  const assignMutation = useMutation({
    mutationFn: ({ taskId, userId }: { taskId: string; userId: string | null }) =>
      assignTask(taskId, userId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/tasks"] });
      toast({ title: DEMO_MODE ? "Assigned (demo)" : "Task assigned" });
    },
    onError: () => toast({ title: "Failed to assign task", variant: "destructive" }),
  });

  const statusMutation = useMutation({
    mutationFn: ({ taskId, status }: { taskId: string; status: string }) =>
      updateTaskStatus(taskId, status),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/tasks"] });
      toast({ title: DEMO_MODE ? "Status updated (demo)" : "Status updated" });
    },
    onError: () => toast({ title: "Failed to update status", variant: "destructive" }),
  });

  const grouped = useMemo(() => {
    const map: Record<string, AnyTask[]> = {};
    STATUS_GROUPS.forEach((g) => { map[g.key] = []; });
    tasks.forEach((t) => {
      const s = t.status ?? "pending";
      if (!map[s]) map[s] = [];
      map[s].push(t);
    });
    // Sort each group by priority
    Object.values(map).forEach((group) =>
      group.sort((a, b) => priorityOrder(a.priority) - priorityOrder(b.priority))
    );
    return map;
  }, [tasks]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Tasks</h1>
          <p className="text-muted-foreground">Queue of operational tasks grouped by status.</p>
        </div>
        {DEMO_MODE && (
          <Badge variant="outline" className="border-amber-500/30 text-amber-400 bg-amber-500/5 text-[10px] font-mono">
            DEMO MODE
          </Badge>
        )}
      </div>

      {tasksLoading ? (
        <div className="space-y-4">
          {[1, 2, 3].map((i) => <Skeleton key={i} className="h-24 w-full rounded-lg" />)}
        </div>
      ) : isError ? (
        <div className="p-10 text-center text-destructive text-sm">Failed to load tasks.</div>
      ) : (
        <div className="space-y-4">
          {STATUS_GROUPS.map((group) => {
            const items = grouped[group.key] ?? [];
            return (
              <Card key={group.key} className="border-border/50 shadow-md bg-card/50 overflow-hidden">
                <CardHeader className={`border-b border-border/50 pb-3 pt-3 px-4 flex flex-row items-center gap-3 ${group.color} rounded-t-lg`}>
                  <CardTitle className="text-xs font-mono uppercase tracking-widest">
                    {group.label}
                  </CardTitle>
                  <span className="text-xs font-mono opacity-70">{items.length}</span>
                </CardHeader>
                <CardContent className="p-0">
                  {items.length === 0 ? (
                    <div className="px-4 py-5 flex items-center gap-2 text-xs text-muted-foreground/50">
                      <CheckSquare className="w-3.5 h-3.5" />
                      No {group.label.toLowerCase()} tasks
                    </div>
                  ) : (
                    items.map((task) => (
                      <TaskRow
                        key={task.id}
                        task={task}
                        users={users}
                        onAssign={(userId) => assignMutation.mutate({ taskId: task.id, userId })}
                        onStatusChange={(status) => statusMutation.mutate({ taskId: task.id, status })}
                      />
                    ))
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
