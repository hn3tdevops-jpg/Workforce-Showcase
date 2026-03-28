import { useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  fetchTasksMock, fetchUsers, assignTask, updateTaskStatus,
  createTask, fetchRoomsMock, DEMO_MODE,
} from "@/lib/mock-adapter";
import { useLocation } from "@/lib/location-context";
import { useAuth } from "@/lib/auth-context";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StatusChip } from "@/components/ui/status-chip";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuTrigger, DropdownMenuLabel, DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  CheckSquare, ChevronDown, Clock, User, AlertCircle,
  DoorOpen, Plus, Loader2,
} from "lucide-react";
import { format } from "date-fns";
import { useToast } from "@/hooks/use-toast";

// ── Status grouping ────────────────────────────────────────────────────────────

const STATUS_GROUPS = [
  { key: "open",        label: "Open",        color: "text-slate-400 border-slate-500/30 bg-slate-500/5" },
  { key: "assigned",    label: "Assigned",    color: "text-amber-400 border-amber-500/30 bg-amber-500/5" },
  { key: "in_progress", label: "In Progress", color: "text-blue-400 border-blue-500/30 bg-blue-500/5" },
  { key: "blocked",     label: "Blocked",     color: "text-red-400 border-red-500/30 bg-red-500/5" },
  { key: "completed",   label: "Completed",   color: "text-emerald-400 border-emerald-500/30 bg-emerald-500/5" },
  { key: "cancelled",   label: "Cancelled",   color: "text-muted-foreground border-border bg-muted/20" },
] as const;

const TASK_STATUSES = ["open", "assigned", "in_progress", "blocked", "completed", "cancelled"];

const TASK_TYPES = [
  { value: "clean_checkout",  label: "Checkout Clean" },
  { value: "clean_stayover",  label: "Stayover Clean" },
  { value: "deep_clean",      label: "Deep Clean" },
  { value: "inspection",      label: "Inspection" },
  { value: "maintenance",     label: "Maintenance" },
  { value: "general",         label: "General" },
];

const PRIORITIES = [
  { value: "low",      label: "Low" },
  { value: "normal",   label: "Normal" },
  { value: "high",     label: "High" },
  { value: "critical", label: "Critical" },
];

// ── Shared types ──────────────────────────────────────────────────────────────

interface AnyTask {
  id: string;
  title: string;
  description?: string | null;
  task_type?: string | null;
  priority?: string | null;
  status?: string | null;
  due_at?: string | null;
  due_date?: string | null;
  assigned_user_id?: string | null;
  assigned_to?: string | null;
  location_id?: string | null;
  room_id?: string | null;
  room_number?: string | null;
}

interface SimpleUser {
  id: string;
  first_name: string;
  last_name: string;
  role?: string;
  job_title?: string;
}

interface SimpleRoom {
  id: string;
  name: string;
  room_number: string;
  _hospitable_id?: number;
}

function priorityOrder(p: string | null | undefined) {
  const map: Record<string, number> = { critical: 0, high: 1, medium: 2, normal: 2, low: 3 };
  return map[p ?? ""] ?? 99;
}

function getAssigneeId(task: AnyTask): string | null {
  return task.assigned_user_id ?? task.assigned_to ?? null;
}

function getDueAt(task: AnyTask): string | null {
  return task.due_at ?? task.due_date ?? null;
}

// ── TaskRow ───────────────────────────────────────────────────────────────────

function TaskRow({
  task,
  users,
  onAssign,
  onStatusChange,
}: {
  task: AnyTask;
  users: SimpleUser[];
  onAssign: (userId: string | null) => void;
  onStatusChange: (status: string) => void;
}) {
  const assigneeId = getAssigneeId(task);
  const assignee = users.find((u) => u.id === assigneeId);
  const dueAt = getDueAt(task);
  const roomLabel = task.room_number ? `Room ${task.room_number}` : null;
  const isOverdue =
    dueAt &&
    new Date(dueAt) < new Date() &&
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
            <span className="font-mono uppercase tracking-wide">
              {TASK_TYPES.find(t => t.value === task.task_type)?.label ?? task.task_type}
            </span>
          )}
          {roomLabel && (
            <span className="flex items-center gap-1 text-muted-foreground/80">
              <DoorOpen className="w-3 h-3" />
              {roomLabel}
            </span>
          )}
          {dueAt && (
            <span className={`flex items-center gap-1 ${isOverdue ? "text-red-400" : ""}`}>
              <Clock className="w-3 h-3" />
              {format(new Date(dueAt), "MMM d, h:mm a")}
            </span>
          )}
        </div>
      </div>

      <div className="flex items-center gap-2 shrink-0">
        {/* Assign */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm" className="h-7 text-xs gap-1.5 max-w-[140px]">
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
                {u.job_title && <span className="text-muted-foreground ml-auto">{u.job_title}</span>}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Status */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm" className="h-7 text-xs gap-1 pl-2 pr-1.5">
              <StatusChip status={task.status ?? "open"} type="task" />
              <ChevronDown className="w-3 h-3" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-44 border-border/50">
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

// ── Create Task Dialog ────────────────────────────────────────────────────────

function CreateTaskDialog({
  open,
  onClose,
  locationId,
  users,
  rooms,
  onCreated,
}: {
  open: boolean;
  onClose: () => void;
  locationId: string;
  users: SimpleUser[];
  rooms: SimpleRoom[];
  onCreated: () => void;
}) {
  const { session } = useAuth();
  const { toast } = useToast();
  const NONE = "__none__";
  const [title, setTitle]               = useState("");
  const [description, setDescription]   = useState("");
  const [priority, setPriority]         = useState("normal");
  const [taskType, setTaskType]         = useState("general");
  const [roomId, setRoomId]             = useState<string>(NONE);
  const [assignedTo, setAssignedTo]     = useState<string>(NONE);
  const [dueAt, setDueAt]               = useState("");

  const mutation = useMutation({
    mutationFn: () => {
      const resolvedRoom = roomId !== NONE ? rooms.find(r => r.id === roomId) : null;
      return createTask({
        location_id: locationId,
        title: title.trim(),
        description: description.trim() || null,
        priority,
        task_type: taskType,
        room_id: resolvedRoom ? (resolvedRoom._hospitable_id ?? Number(resolvedRoom.id)) : null,
        assigned_user_id: assignedTo !== NONE ? assignedTo : null,
        due_at: dueAt || null,
        created_by_user_id: session?.id ?? null,
      });
    },
    onSuccess: () => {
      toast({ title: "Task created" });
      onCreated();
      handleClose();
    },
    onError: () => toast({ title: "Failed to create task", variant: "destructive" }),
  });

  function handleClose() {
    setTitle(""); setDescription(""); setPriority("normal"); setTaskType("general");
    setRoomId(NONE); setAssignedTo(NONE); setDueAt("");
    onClose();
  }

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) handleClose(); }}>
      <DialogContent className="sm:max-w-md border-border/50 bg-card">
        <DialogHeader>
          <DialogTitle className="text-base">New Task</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Title */}
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">Title <span className="text-destructive">*</span></Label>
            <Input
              placeholder="e.g. Checkout clean Room 42"
              value={title}
              onChange={e => setTitle(e.target.value)}
              className="h-8 text-sm"
              autoFocus
            />
          </div>

          {/* Description */}
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">Description</Label>
            <Textarea
              placeholder="Optional details…"
              value={description}
              onChange={e => setDescription(e.target.value)}
              className="text-xs min-h-[60px] resize-none"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            {/* Task Type */}
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Type</Label>
              <Select value={taskType} onValueChange={setTaskType}>
                <SelectTrigger className="h-8 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {TASK_TYPES.map(t => (
                    <SelectItem key={t.value} value={t.value} className="text-xs">{t.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Priority */}
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Priority</Label>
              <Select value={priority} onValueChange={setPriority}>
                <SelectTrigger className="h-8 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PRIORITIES.map(p => (
                    <SelectItem key={p.value} value={p.value} className="text-xs">{p.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Room */}
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">Room (optional)</Label>
            <Select value={roomId} onValueChange={setRoomId}>
              <SelectTrigger className="h-8 text-xs">
                <SelectValue placeholder="No room attached" />
              </SelectTrigger>
              <SelectContent className="max-h-52">
                <SelectItem value={NONE} className="text-xs text-muted-foreground">— None —</SelectItem>
                {rooms.map(r => (
                  <SelectItem key={r.id} value={r.id} className="text-xs">{r.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Assign to */}
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">Assign to (optional)</Label>
            <Select value={assignedTo} onValueChange={setAssignedTo}>
              <SelectTrigger className="h-8 text-xs">
                <SelectValue placeholder="Unassigned" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={NONE} className="text-xs text-muted-foreground">— Unassigned —</SelectItem>
                {users.map(u => (
                  <SelectItem key={u.id} value={u.id} className="text-xs">
                    {u.first_name} {u.last_name}
                    {u.job_title ? ` · ${u.job_title}` : ""}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Due date */}
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">Due date / time (optional)</Label>
            <Input
              type="datetime-local"
              value={dueAt}
              onChange={e => setDueAt(e.target.value)}
              className="h-8 text-xs"
            />
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" size="sm" onClick={handleClose} disabled={mutation.isPending}>
            Cancel
          </Button>
          <Button
            size="sm"
            onClick={() => mutation.mutate()}
            disabled={!title.trim() || mutation.isPending}
          >
            {mutation.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />}
            Create Task
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function Tasks() {
  const { selectedLocationId } = useLocation();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [createOpen, setCreateOpen] = useState(false);

  const { data: allTasks = [], isLoading: tasksLoading, isError } = useQuery({
    queryKey: ["/tasks", selectedLocationId],
    queryFn: () => fetchTasksMock(selectedLocationId ?? undefined),
  });

  const { data: rawUsers = [] } = useQuery({
    queryKey: ["/users"],
    queryFn: fetchUsers,
  });
  const users = rawUsers as unknown as SimpleUser[];

  const { data: rooms = [] } = useQuery({
    queryKey: ["/rooms", selectedLocationId],
    queryFn: () => fetchRoomsMock(selectedLocationId ?? undefined),
    enabled: !!selectedLocationId,
  });
  const simpleRooms: SimpleRoom[] = (rooms as { id: string; name: string; room_number: string; _hospitable_id?: number }[]).map(r => ({
    id: r.id,
    name: r.name,
    room_number: r.room_number,
    _hospitable_id: r._hospitable_id,
  }));

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
      const s = t.status ?? "open";
      if (!map[s]) map[s] = [];
      map[s].push(t);
    });
    Object.values(map).forEach((group) =>
      group.sort((a, b) => priorityOrder(a.priority) - priorityOrder(b.priority))
    );
    return map;
  }, [tasks]);

  const activeCount = tasks.filter(
    (t) => t.status !== "completed" && t.status !== "cancelled"
  ).length;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Tasks</h1>
          <p className="text-muted-foreground">
            Operational task queue grouped by status.
            {activeCount > 0 && (
              <span className="ml-2 text-xs font-mono text-amber-400">{activeCount} active</span>
            )}
          </p>
        </div>
        <div className="flex items-center gap-2 self-start sm:self-auto">
          {DEMO_MODE && (
            <Badge variant="outline" className="border-amber-500/30 text-amber-400 bg-amber-500/5 text-[10px] font-mono">
              DEMO MODE
            </Badge>
          )}
          <Button
            size="sm"
            className="h-8 text-xs gap-1.5"
            onClick={() => setCreateOpen(true)}
            disabled={!selectedLocationId}
          >
            <Plus className="w-3.5 h-3.5" />
            New Task
          </Button>
        </div>
      </div>

      {tasksLoading ? (
        <div className="space-y-4">
          {[1, 2, 3].map((i) => <Skeleton key={i} className="h-24 w-full rounded-lg" />)}
        </div>
      ) : isError ? (
        <div className="p-10 text-center text-destructive text-sm">Failed to load tasks.</div>
      ) : !selectedLocationId ? (
        <div className="p-16 text-center flex flex-col items-center">
          <CheckSquare className="w-10 h-10 text-muted-foreground/30 mb-3" />
          <p className="text-muted-foreground text-sm">Select a location to view tasks.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {STATUS_GROUPS.map((group) => {
            const items = grouped[group.key] ?? [];
            if (items.length === 0 && (group.key === "completed" || group.key === "cancelled")) {
              return null;
            }
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

      {selectedLocationId && (
        <CreateTaskDialog
          open={createOpen}
          onClose={() => setCreateOpen(false)}
          locationId={selectedLocationId}
          users={users}
          rooms={simpleRooms}
          onCreated={() => queryClient.invalidateQueries({ queryKey: ["/tasks"] })}
        />
      )}
    </div>
  );
}
