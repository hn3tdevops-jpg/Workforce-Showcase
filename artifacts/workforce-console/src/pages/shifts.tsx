import { useShifts } from "@/hooks/use-workforce";
import { Card, CardContent } from "@/components/ui/card";
import { StatusChip } from "@/components/ui/status-chip";
import { CalendarDays, Loader2, MapPin, Users2, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { format } from "date-fns";

export default function Shifts() {
  const { data: shifts, isLoading, isError } = useShifts();

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Shifts Schedule</h1>
          <p className="text-muted-foreground">Manage and track workforce shifts.</p>
        </div>
        <Button onClick={() => alert("Mutation to be implemented")} className="bg-primary hover:bg-primary/90 text-white font-medium">
          Schedule Shift
        </Button>
      </div>

      {isLoading ? (
        <div className="p-20 flex justify-center w-full">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      ) : isError ? (
        <Card className="p-10 text-center border-destructive/20 bg-destructive/5 text-destructive">
          Failed to load shift schedule.
        </Card>
      ) : !shifts || shifts.length === 0 ? (
        <Card className="p-16 text-center border-border/50 border-dashed bg-transparent flex flex-col items-center justify-center">
          <div className="w-16 h-16 rounded-full bg-accent/50 flex items-center justify-center mb-4">
             <CalendarDays className="w-8 h-8 text-muted-foreground" />
          </div>
          <h3 className="text-lg font-medium text-foreground">Schedule is clear</h3>
          <p className="text-muted-foreground max-w-sm mt-1">No shifts have been scheduled for this timeframe.</p>
          <Button variant="outline" className="mt-4" onClick={() => alert('Action')}>Create First Shift</Button>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {shifts.map((shift) => {
            const fillRatio = (shift.filled || 0) / (shift.capacity || 1);
            let fillClass = "text-emerald-400";
            if (fillRatio < 0.5) fillClass = "text-red-400";
            else if (fillRatio < 1) fillClass = "text-amber-400";

            return (
              <Card key={shift.id} className="border-border/50 bg-card hover:border-primary/30 transition-all shadow-md group overflow-hidden">
                <CardContent className="p-0">
                  <div className="p-5 border-b border-border/50 space-y-3 relative">
                    <div className="flex justify-between items-start">
                      <StatusChip status={shift.status || 'draft'} type="shift" />
                      <span className="font-mono text-[10px] text-muted-foreground/50">{shift.id.substring(0,8)}</span>
                    </div>
                    <div>
                      <h3 className="font-semibold text-lg line-clamp-1">{shift.title || shift.role || 'Unnamed Shift'}</h3>
                      {shift.role && <p className="text-sm text-primary uppercase font-mono tracking-wider mt-1">{shift.role}</p>}
                    </div>
                  </div>
                  
                  <div className="p-5 space-y-4 bg-muted/10">
                    <div className="flex items-start gap-3">
                      <Clock className="w-4 h-4 text-muted-foreground mt-0.5 shrink-0" />
                      <div className="text-sm space-y-1">
                        <p className="font-medium">{format(new Date(shift.start_time), 'MMM d, yyyy')}</p>
                        <p className="text-muted-foreground">
                          {format(new Date(shift.start_time), 'h:mm a')} - {format(new Date(shift.end_time), 'h:mm a')}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      <MapPin className="w-4 h-4 text-muted-foreground shrink-0" />
                      <p className="text-sm text-muted-foreground truncate">{shift.location_id || 'Multiple locations'}</p>
                    </div>

                    <div className="flex items-center gap-3">
                      <Users2 className="w-4 h-4 text-muted-foreground shrink-0" />
                      <div className="flex items-center gap-2 text-sm w-full">
                        <span className="text-muted-foreground">Capacity:</span>
                        <span className={`font-bold ${fillClass}`}>
                          {shift.filled || 0} / {shift.capacity || 0}
                        </span>
                        <div className="flex-1 ml-2 h-1.5 bg-accent rounded-full overflow-hidden">
                          <div 
                            className="h-full bg-primary rounded-full transition-all" 
                            style={{ width: `${Math.min(fillRatio * 100, 100)}%` }}
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
