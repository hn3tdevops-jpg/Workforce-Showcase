import { useState, useEffect } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { updateRoomStatus, updateRoom, DEMO_MODE } from "@/lib/mock-adapter";
import type { NormalizedRoom } from "@/lib/mock-adapter";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { StatusChip } from "@/components/ui/status-chip";
import { useToast } from "@/hooks/use-toast";
import {
  DoorOpen, Building2, Layers, StickyNote, ChevronDown, BedDouble, Clock,
  Pencil, X, Check, Loader2, PawPrint, Wind,
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuTrigger, DropdownMenuLabel, DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";

const ROOM_STATUSES = [
  "dirty", "assigned", "cleaning", "inspect", "inspected", "clean", "blocked",
  "ready_for_inspection", "stayover", "dnd", "laundry_only", "maintenance_hold",
];

const ROOM_TYPES = ["standard", "suite", "deluxe", "single", "double", "king", "queen", "twin", "accessible"];
const BED_TYPES  = ["King", "Queen", "Double Queen", "Triple Queen", "Twin", "Single", "King + Sofa"];
const PET_POLICIES = ["pets_ok", "no_pets", "standard"];
const SMOKING   = ["non_smoking", "smoking_ok"];

interface Room {
  id: string;
  name: string;
  room_number?: string | null;
  room_label?: string | null;
  room_type?: string | null;
  status?: string | null;
  building?: string | null;
  floor?: string | null;
  notes?: string | null;
  location_id?: string | null;
  occupancy_status?: string | null;
  inspection_status?: string | null;
  maintenance_status?: string | null;
  bed_type_summary?: string | null;
  bed_count?: number | null;
  pet_policy?: string | null;
  smoking_status?: string | null;
  last_cleaned_at?: string | null;
  last_inspected_at?: string | null;
}

interface RoomDrawerProps {
  room: Room | null;
  open: boolean;
  onClose: () => void;
  onRoomUpdated?: (updated: Partial<Room>) => void;
}

function InfoCell({ label, value, icon: Icon }: { label: string; value?: string | null; icon?: React.FC<any> }) {
  if (!value) return null;
  return (
    <div className="p-3 rounded-lg border border-border/40 bg-muted/20">
      <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-1">
        {Icon && <Icon className="w-3 h-3" />}
        {label}
      </div>
      <p className="text-sm font-medium">{value}</p>
    </div>
  );
}

export function RoomDrawer({ room, open, onClose, onRoomUpdated }: RoomDrawerProps) {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [optimisticStatus, setOptimisticStatus] = useState<string | null>(null);
  const [editMode, setEditMode] = useState(false);

  // Edit state
  const [roomNumber,    setRoomNumber]    = useState("");
  const [roomLabel,     setRoomLabel]     = useState("");
  const [roomType,      setRoomType]      = useState("");
  const [bedType,       setBedType]       = useState("");
  const [bedCount,      setBedCount]      = useState("");
  const [petPolicy,     setPetPolicy]     = useState("");
  const [smokingStatus, setSmokingStatus] = useState("");
  const [notes,         setNotes]         = useState("");

  useEffect(() => {
    if (room) {
      setRoomNumber(room.room_number ?? "");
      setRoomLabel(room.room_label ?? "");
      setRoomType(room.room_type ?? "");
      setBedType(room.bed_type_summary ?? "");
      setBedCount(room.bed_count != null ? String(room.bed_count) : "");
      setPetPolicy(room.pet_policy ?? "");
      setSmokingStatus(room.smoking_status ?? "");
      setNotes(room.notes ?? "");
    }
    setEditMode(false);
    setOptimisticStatus(null);
  }, [room?.id]);

  const statusMutation = useMutation({
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

  const editMutation = useMutation({
    mutationFn: (patch: Parameters<typeof updateRoom>[1]) => updateRoom(room!.id, patch),
    onSuccess: (_, patch) => {
      queryClient.invalidateQueries({ queryKey: ["/rooms"] });
      toast({ title: DEMO_MODE ? "Room saved (demo)" : "Room updated" });
      onRoomUpdated?.(patch as Partial<Room>);
      setEditMode(false);
    },
    onError: () => toast({ title: "Failed to save room", variant: "destructive" }),
  });

  const saveEdit = () => {
    editMutation.mutate({
      room_number:     roomNumber || undefined,
      room_label:      roomLabel  || undefined,
      room_type:       roomType   || undefined,
      bed_type_summary:bedType    || undefined,
      bed_count:       bedCount   ? Number(bedCount) : undefined,
      pet_policy:      petPolicy  || undefined,
      smoking_status:  smokingStatus || undefined,
      notes:           notes,
    });
  };

  if (!room) return null;

  const currentStatus = optimisticStatus ?? room.status ?? "unknown";

  return (
    <Sheet open={open} onOpenChange={(v) => { if (!v) { onClose(); setEditMode(false); } }}>
      <SheetContent className="w-full sm:max-w-md border-border/50 bg-card flex flex-col p-0 overflow-hidden">

        {/* ── Header ── */}
        <SheetHeader className="px-5 pt-5 pb-4 border-b border-border/50 shrink-0">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-lg bg-primary/15 border border-primary/20 flex items-center justify-center shrink-0">
              <DoorOpen className="w-5 h-5 text-primary" />
            </div>
            <div className="flex-1 min-w-0">
              <SheetTitle className="text-base leading-tight">{room.name}</SheetTitle>
              <SheetDescription className="text-xs mt-0.5">
                {room.room_type ? room.room_type.charAt(0).toUpperCase() + room.room_type.slice(1) : "Room"}
                {room.room_number ? ` · #${room.room_number}` : ""}
                {room.building ? ` · ${room.building}` : ""}
                {room.floor ? `, Fl ${room.floor}` : ""}
              </SheetDescription>
            </div>
            <Button
              size="sm"
              variant={editMode ? "default" : "outline"}
              className="h-7 text-xs gap-1 shrink-0"
              onClick={() => setEditMode(!editMode)}
            >
              {editMode ? <><X className="w-3 h-3" />Cancel</> : <><Pencil className="w-3 h-3" />Edit</>}
            </Button>
          </div>
        </SheetHeader>

        <div className="flex-1 overflow-y-auto py-5 px-5 space-y-5">
          {/* ── Status ── */}
          <div className="flex items-center justify-between p-4 rounded-lg border border-border/50 bg-background/40">
            <div className="space-y-1">
              <p className="text-xs font-mono text-muted-foreground uppercase tracking-widest">Status</p>
              <StatusChip status={currentStatus} type="room" />
            </div>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="text-xs h-7 gap-1" disabled={statusMutation.isPending}>
                  Update <ChevronDown className="w-3 h-3" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-44 border-border/50">
                <DropdownMenuLabel className="text-[10px] font-mono uppercase text-muted-foreground tracking-wider">
                  Set Status
                </DropdownMenuLabel>
                <DropdownMenuSeparator className="bg-border/50" />
                {ROOM_STATUSES.map((s) => (
                  <DropdownMenuItem key={s} className="text-xs cursor-pointer" onClick={() => statusMutation.mutate(s)}>
                    <StatusChip status={s} type="room" />
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          {/* ── Edit form ── */}
          {editMode ? (
            <div className="space-y-4 p-4 rounded-lg border border-primary/20 bg-primary/5">
              <p className="text-[10px] font-mono text-primary uppercase tracking-widest">Edit Room Data</p>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-[10px] text-muted-foreground">Room Number</Label>
                  <Input value={roomNumber} onChange={e => setRoomNumber(e.target.value)} className="h-8 text-sm" />
                </div>
                <div className="space-y-1">
                  <Label className="text-[10px] text-muted-foreground">Room Label</Label>
                  <Input value={roomLabel} onChange={e => setRoomLabel(e.target.value)} className="h-8 text-sm" placeholder="e.g. Suite 201" />
                </div>
              </div>

              <div className="space-y-1">
                <Label className="text-[10px] text-muted-foreground">Room Type</Label>
                <Select value={roomType} onValueChange={setRoomType}>
                  <SelectTrigger className="h-8 text-sm">
                    <SelectValue placeholder="Select type…" />
                  </SelectTrigger>
                  <SelectContent>
                    {ROOM_TYPES.map(t => <SelectItem key={t} value={t} className="text-xs capitalize">{t}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-[10px] text-muted-foreground">Bed Type</Label>
                  <Select value={bedType} onValueChange={setBedType}>
                    <SelectTrigger className="h-8 text-sm">
                      <SelectValue placeholder="Select…" />
                    </SelectTrigger>
                    <SelectContent>
                      {BED_TYPES.map(t => <SelectItem key={t} value={t} className="text-xs">{t}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <Label className="text-[10px] text-muted-foreground">Bed Count</Label>
                  <Input type="number" min={1} max={6} value={bedCount} onChange={e => setBedCount(e.target.value)} className="h-8 text-sm" />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-[10px] text-muted-foreground">Pet Policy</Label>
                  <Select value={petPolicy} onValueChange={setPetPolicy}>
                    <SelectTrigger className="h-8 text-sm">
                      <SelectValue placeholder="Select…" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="pets_ok" className="text-xs">Pets OK</SelectItem>
                      <SelectItem value="no_pets" className="text-xs">No Pets</SelectItem>
                      <SelectItem value="standard" className="text-xs">Standard</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <Label className="text-[10px] text-muted-foreground">Smoking</Label>
                  <Select value={smokingStatus} onValueChange={setSmokingStatus}>
                    <SelectTrigger className="h-8 text-sm">
                      <SelectValue placeholder="Select…" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="non_smoking" className="text-xs">Non-Smoking</SelectItem>
                      <SelectItem value="smoking_ok" className="text-xs">Smoking OK</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-1">
                <Label className="text-[10px] text-muted-foreground">Notes</Label>
                <Textarea
                  value={notes}
                  onChange={e => setNotes(e.target.value)}
                  className="text-xs min-h-[60px] resize-none"
                  placeholder="Internal notes…"
                />
              </div>

              <Button
                className="w-full h-8 text-xs gap-1.5"
                onClick={saveEdit}
                disabled={editMutation.isPending}
              >
                {editMutation.isPending
                  ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  : <><Check className="w-3.5 h-3.5" />Save Changes</>}
              </Button>
            </div>
          ) : (
            /* ── Read-only details ── */
            <div className="grid grid-cols-2 gap-3">
              <InfoCell label="Building"   value={room.building}  icon={Building2} />
              <InfoCell label="Floor"      value={room.floor}     icon={Layers} />
              <InfoCell label="Occupancy"  value={room.occupancy_status?.replace(/_/g, " ")} icon={DoorOpen} />
              <InfoCell label="Beds"       value={room.bed_type_summary} icon={BedDouble} />
              {room.pet_policy && (
                <InfoCell label="Pets"
                  value={room.pet_policy === "pets_ok" ? "Pets Welcome" : room.pet_policy === "no_pets" ? "No Pets" : "Standard"}
                  icon={PawPrint}
                />
              )}
              {room.smoking_status && (
                <InfoCell label="Smoking"
                  value={room.smoking_status === "non_smoking" ? "Non-Smoking" : "Smoking OK"}
                  icon={Wind}
                />
              )}
              {room.last_cleaned_at && (
                <InfoCell label="Last Cleaned"
                  value={formatDistanceToNow(new Date(room.last_cleaned_at), { addSuffix: true })}
                  icon={Clock}
                />
              )}
              {room.last_inspected_at && (
                <InfoCell label="Last Inspected"
                  value={formatDistanceToNow(new Date(room.last_inspected_at), { addSuffix: true })}
                  icon={Clock}
                />
              )}
            </div>
          )}

          {/* Notes (read-only) */}
          {!editMode && room.notes && (
            <div className="p-3 rounded-lg border border-border/40 bg-muted/20">
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-1.5">
                <StickyNote className="w-3 h-3" /> Notes
              </div>
              <p className="text-sm text-muted-foreground leading-relaxed">{room.notes}</p>
            </div>
          )}

          {/* Room ID */}
          <div className="p-3 rounded-lg border border-border/40 bg-muted/20">
            <p className="text-xs font-mono text-muted-foreground uppercase tracking-widest mb-1">Room ID</p>
            <p className="text-xs font-mono text-muted-foreground break-all">{room.id}</p>
          </div>

          {DEMO_MODE && (
            <div className="p-3 rounded-lg border border-amber-500/20 bg-amber-500/5">
              <p className="text-xs text-amber-400/80">
                Demo mode — changes are local only and reset on page refresh.
              </p>
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
