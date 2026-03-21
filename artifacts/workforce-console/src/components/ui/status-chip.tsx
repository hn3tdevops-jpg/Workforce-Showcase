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
    if (s === 'high') colorClass = "bg-red-500/10 text-red-400 border-red-500/20";
    if (s === 'medium') colorClass = "bg-amber-500/10 text-amber-400 border-amber-500/20";
    if (s === 'low') colorClass = "bg-emerald-500/10 text-emerald-400 border-emerald-500/20";
  } else if (type === 'room') {
    if (s === 'clean') colorClass = "bg-emerald-500/10 text-emerald-400 border-emerald-500/20";
    if (s === 'dirty') colorClass = "bg-amber-500/10 text-amber-400 border-amber-500/20";
    if (s === 'occupied') colorClass = "bg-blue-500/10 text-blue-400 border-blue-500/20";
    if (s === 'maintenance') colorClass = "bg-red-500/10 text-red-400 border-red-500/20";
    if (s === 'inspecting') colorClass = "bg-purple-500/10 text-purple-400 border-purple-500/20";
  } else if (type === 'shift' || type === 'assignment') {
    if (s === 'draft') colorClass = "bg-slate-500/10 text-slate-400 border-slate-500/20";
    if (s === 'published' || s === 'scheduled') colorClass = "bg-blue-500/10 text-blue-400 border-blue-500/20";
    if (s === 'active' || s === 'in_progress') colorClass = "bg-emerald-500/10 text-emerald-400 border-emerald-500/20";
    if (s === 'completed') colorClass = "bg-slate-500/10 text-slate-400 border-slate-500/20";
  } else {
    // Task
    if (s === 'pending') colorClass = "bg-slate-500/10 text-slate-400 border-slate-500/20";
    if (s === 'in_progress') colorClass = "bg-blue-500/10 text-blue-400 border-blue-500/20";
    if (s === 'completed') colorClass = "bg-emerald-500/10 text-emerald-400 border-emerald-500/20";
    if (s === 'cancelled') colorClass = "bg-red-500/10 text-red-400 border-red-500/20";
  }

  const label = s.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());

  return (
    <Badge variant="outline" className={cn("px-2 py-0.5 font-medium shadow-none border", colorClass)}>
      {label}
    </Badge>
  );
}
