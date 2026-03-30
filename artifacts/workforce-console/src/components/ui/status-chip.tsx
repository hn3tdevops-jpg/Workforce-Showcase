import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface StatusChipProps {
  status: string;
  type?: 'room' | 'task' | 'priority' | 'shift' | 'assignment';
}

export function StatusChip({ status, type = 'task' }: StatusChipProps) {
  const s = status?.toLowerCase() || 'unknown';
  
  let colorClass = "bg-muted text-muted-foreground border-muted-border";
  
  if (type === 'priority') {
    if (s === 'critical') colorClass = "bg-red-600/15 text-red-300 border-red-500/30";
    if (s === 'high') colorClass = "bg-red-500/10 text-red-400 border-red-500/20";
    if (s === 'medium') colorClass = "bg-amber-500/10 text-amber-400 border-amber-500/20";
    if (s === 'low') colorClass = "bg-emerald-500/10 text-emerald-400 border-emerald-500/20";
  } else if (type === 'room') {
    // Spec-defined room statuses
    if (s === 'clean') colorClass = "bg-emerald-500/10 text-emerald-400 border-emerald-500/20";
    if (s === 'dirty') colorClass = "bg-amber-500/10 text-amber-400 border-amber-500/20";
    if (s === 'ready_for_inspection') colorClass = "bg-purple-500/10 text-purple-400 border-purple-500/20";
    if (s === 'inspected') colorClass = "bg-teal-500/10 text-teal-400 border-teal-500/20";
    if (s === 'stayover') colorClass = "bg-blue-500/10 text-blue-400 border-blue-500/20";
    if (s === 'dnd') colorClass = "bg-slate-500/10 text-slate-400 border-slate-500/30";
    if (s === 'laundry_only') colorClass = "bg-cyan-500/10 text-cyan-400 border-cyan-500/20";
    if (s === 'maintenance_hold') colorClass = "bg-red-500/10 text-red-400 border-red-500/20";
    // Hospitable API statuses
    if (s === 'assigned') colorClass = "bg-amber-500/10 text-amber-400 border-amber-500/20";
    if (s === 'cleaning') colorClass = "bg-blue-500/10 text-blue-300 border-blue-400/30";
    if (s === 'inspect') colorClass = "bg-purple-500/10 text-purple-400 border-purple-500/20";
    if (s === 'blocked') colorClass = "bg-red-500/10 text-red-400 border-red-500/20";
    // Legacy fallbacks
    if (s === 'occupied') colorClass = "bg-blue-500/10 text-blue-400 border-blue-500/20";
    if (s === 'maintenance') colorClass = "bg-red-500/10 text-red-400 border-red-500/20";
    if (s === 'inspecting') colorClass = "bg-purple-500/10 text-purple-400 border-purple-500/20";
  } else if (type === 'shift' || type === 'assignment') {
    if (s === 'draft') colorClass = "bg-slate-500/10 text-slate-400 border-slate-500/20";
    if (s === 'published' || s === 'scheduled') colorClass = "bg-blue-500/10 text-blue-400 border-blue-500/20";
    if (s === 'active' || s === 'in_progress') colorClass = "bg-emerald-500/10 text-emerald-400 border-emerald-500/20";
    if (s === 'completed') colorClass = "bg-slate-500/10 text-slate-400 border-slate-500/20";
  } else {
    // Spec-defined task statuses
    if (s === 'open') colorClass = "bg-slate-500/10 text-slate-400 border-slate-500/20";
    if (s === 'assigned') colorClass = "bg-amber-500/10 text-amber-400 border-amber-500/20";
    if (s === 'in_progress') colorClass = "bg-blue-500/10 text-blue-400 border-blue-500/20";
    if (s === 'completed') colorClass = "bg-emerald-500/10 text-emerald-400 border-emerald-500/20";
    if (s === 'blocked') colorClass = "bg-red-500/10 text-red-400 border-red-500/20";
    if (s === 'cancelled') colorClass = "bg-muted text-muted-foreground border-border/50";
    // Hospitable API — "done" is the wire format for completed
    if (s === 'done') colorClass = "bg-emerald-500/10 text-emerald-400 border-emerald-500/20";
    // Legacy fallback
    if (s === 'pending') colorClass = "bg-slate-500/10 text-slate-400 border-slate-500/20";
  }

  const label = s.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());

  return (
    <Badge variant="outline" className={cn("px-2 py-0.5 font-medium shadow-none border", colorClass)}>
      {label}
    </Badge>
  );
}
