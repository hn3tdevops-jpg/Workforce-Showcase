import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { updateRoomStatus, DEMO_MODE } from "@/lib/mock-adapter";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { StatusChip } from "@/components/ui/status-chip";
import { useToast } from "@/hooks/use-toast";
import { DoorOpen, Building2, Layers, StickyNote, ChevronDown } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";

const ROOM_STATUSES = ["clean", "dirty", "occupied", "inspecting", "maintenance", "out_of_order"];

interface Room {
  id: string;
  name: string;
  room_number?: string | null;
  room_type?: string | null;
  status?: string | null;
  building?: string | null;
  floor?: string | null;
  notes?: string | null;
  location_id?: string | null;
}

interface RoomDrawerProps {
  room: Room | null;
  open: boolean;
  onClose: () => void;
}

export function RoomDrawer({ room, open, onClose }: RoomDrawerProps) {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [optimisticStatus, setOptimisticStatus] = useState<string | null>(null);

  const mutation = useMutation({
    mutationFn: (status: string) => updateRoomStatus(room!.id, status),
    onMutate: (status) => setOptimisticStatus(status),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/rooms"] });
      toast({ title: DEMO_MODE ? "Status updated (demo)" : "Room status updated" });
      setOptimisticStatus(null);
    },
    onError: () => {
      setOptimisticStatus(null);
      toast({ title: "Failed to update status", variant: "destructive" });
    },
  });

  if (!room) return null;

  const currentStatus = optimisticStatus ?? room.status ?? "unknown";

  return (
    <Sheet open={open} onOpenChange={(v) => !v && onClose()}>
      <SheetContent className="w-full sm:max-w-md border-border/50 bg-card">
        <SheetHeader className="pb-4 border-b border-border/50">
          <div className="flex items-center gap-3 mb-1">
            <div className="w-10 h-10 rounded-lg bg-primary/15 border border-primary/20 flex items-center justify-center">
              <DoorOpen className="w-5 h-5 text-primary" />
            </div>
            <div>
              <SheetTitle className="text-base leading-tight">{room.name}</SheetTitle>
              <SheetDescription className="text-xs mt-0.5">
                {room.room_type ? room.room_type.charAt(0).toUpperCase() + room.room_type.slice(1) + " room" : "Room"}
                {room.room_number ? ` · #${room.room_number}` : ""}
              </SheetDescription>
            </div>
          </div>
        </SheetHeader>

        <div className="py-5 space-y-5">
          {/* Status + update */}
          <div className="flex items-center justify-between p-4 rounded-lg border border-border/50 bg-background/40">
            <div className="space-y-1">
              <p className="text-xs font-mono text-muted-foreground uppercase tracking-widest">Status</p>
              <StatusChip status={currentStatus} type="room" />
            </div>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="text-xs h-7 gap-1" disabled={mutation.isPending}>
                  Update <ChevronDown className="w-3 h-3" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-44 border-border/50">
                <DropdownMenuLabel className="text-[10px] font-mono uppercase text-muted-foreground tracking-wider">
                  Set Status
                </DropdownMenuLabel>
                <DropdownMenuSeparator className="bg-border/50" />
                {ROOM_STATUSES.map((s) => (
                  <DropdownMenuItem
                    key={s}
                    className="text-xs cursor-pointer capitalize"
                    onClick={() => mutation.mutate(s)}
                  >
                    {s.replace(/_/g, " ")}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          {/* Details grid */}
          <div className="grid grid-cols-2 gap-3">
            {room.building && (
              <div className="p-3 rounded-lg border border-border/40 bg-muted/20">
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-1">
                  <Building2 className="w-3 h-3" /> Building
                </div>
                <p className="text-sm font-medium">{room.building}</p>
              </div>
            )}
            {room.floor && (
              <div className="p-3 rounded-lg border border-border/40 bg-muted/20">
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-1">
                  <Layers className="w-3 h-3" /> Floor
                </div>
                <p className="text-sm font-medium">{room.floor}</p>
              </div>
            )}
          </div>

          {/* Notes */}
          {room.notes && (
            <div className="p-3 rounded-lg border border-border/40 bg-muted/20">
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-1.5">
                <StickyNote className="w-3 h-3" /> Notes
              </div>
              <p className="text-sm text-muted-foreground leading-relaxed">{room.notes}</p>
            </div>
          )}

          {/* ID */}
          <div className="p-3 rounded-lg border border-border/40 bg-muted/20">
            <p className="text-xs font-mono text-muted-foreground uppercase tracking-widest mb-1">Room ID</p>
            <p className="text-xs font-mono text-muted-foreground break-all">{room.id}</p>
          </div>

          {DEMO_MODE && (
            <div className="p-3 rounded-lg border border-amber-500/20 bg-amber-500/5">
              <p className="text-xs text-amber-400/80">
                Demo mode — status changes are local only and reset on page refresh.
              </p>
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
