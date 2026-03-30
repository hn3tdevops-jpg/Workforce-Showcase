import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { fetchRoomsMock, DEMO_MODE } from "@/lib/mock-adapter";
import { useLocation } from "@/lib/location-context";
import { RoomDrawer } from "@/components/ui/room-drawer";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StatusChip } from "@/components/ui/status-chip";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { DoorOpen, Search, LayoutGrid, LayoutList } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface AnyRoom {
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

// Room statuses sorted by operational urgency (hospitable + legacy)
const STATUS_ORDER = [
  "blocked",
  "maintenance_hold",
  "dirty",
  "assigned",
  "cleaning",
  "laundry_only",
  "inspect",
  "ready_for_inspection",
  "dnd",
  "stayover",
  "clean",
  "inspected",
];

function statusSort(a: AnyRoom, b: AnyRoom) {
  const ia = STATUS_ORDER.indexOf(a.status ?? "");
  const ib = STATUS_ORDER.indexOf(b.status ?? "");
  return (ia === -1 ? 99 : ia) - (ib === -1 ? 99 : ib);
}

function RoomCard({ room, onClick }: { room: AnyRoom; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="text-left w-full p-4 rounded-xl border border-border/50 bg-card hover:bg-accent/20 hover:border-primary/30 transition-all group space-y-3"
    >
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="font-semibold text-sm group-hover:text-primary transition-colors">{room.name}</p>
          {room.room_type && (
            <p className="text-xs text-muted-foreground capitalize mt-0.5">{room.room_type}</p>
          )}
        </div>
        <StatusChip status={room.status ?? "unknown"} type="room" />
      </div>
      <div className="flex items-center gap-3 text-xs text-muted-foreground">
        {room.building && <span>{room.building}</span>}
        {room.floor && <span>Fl {room.floor}</span>}
      </div>
    </button>
  );
}

export default function Rooms() {
  const [search, setSearch] = useState("");
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [selectedRoom, setSelectedRoom] = useState<AnyRoom | null>(null);
  const { selectedLocationId } = useLocation();

  const { data: allRooms = [], isLoading, isError } = useQuery({
    queryKey: ["/rooms", selectedLocationId],
    queryFn: () => fetchRoomsMock(selectedLocationId ?? undefined),
  });

  const rooms = useMemo(() => {
    let list = allRooms as AnyRoom[];
    if (selectedLocationId) {
      list = list.filter((r) => !r.location_id || r.location_id === selectedLocationId);
    }
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(
        (r) =>
          r.name.toLowerCase().includes(q) ||
          (r.room_number ?? "").toLowerCase().includes(q) ||
          (r.room_type ?? "").toLowerCase().includes(q) ||
          (r.building ?? "").toLowerCase().includes(q)
      );
    }
    return [...list].sort(statusSort);
  }, [allRooms, selectedLocationId, search]);

  // Status summary counts
  const statusCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    rooms.forEach((r) => {
      const s = r.status ?? "unknown";
      counts[s] = (counts[s] ?? 0) + 1;
    });
    return counts;
  }, [rooms]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Rooms</h1>
          <p className="text-muted-foreground">Operational view of room statuses.</p>
        </div>
        {DEMO_MODE && (
          <Badge variant="outline" className="border-amber-500/30 text-amber-400 bg-amber-500/5 text-[10px] font-mono">
            DEMO MODE
          </Badge>
        )}
      </div>

      {/* Status summary strip */}
      {!isLoading && Object.keys(statusCounts).length > 0 && (
        <div className="flex flex-wrap gap-2">
          {Object.entries(statusCounts).map(([status, count]) => (
            <div key={status} className="flex items-center gap-1.5">
              <StatusChip status={status} type="room" />
              <span className="text-xs text-muted-foreground font-mono">{count}</span>
            </div>
          ))}
        </div>
      )}

      <Card className="border-border/50 shadow-md bg-card/50 overflow-hidden">
        <CardHeader className="border-b border-border/50 pb-4 flex flex-row items-center justify-between gap-4">
          <CardTitle className="text-sm font-medium text-muted-foreground">
            {isLoading ? "Loading…" : `${rooms.length} room${rooms.length !== 1 ? "s" : ""}`}
          </CardTitle>
          <div className="flex items-center gap-2">
            <div className="relative flex-1 max-w-xs">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
              <Input
                placeholder="Search rooms…"
                className="pl-8 h-8 text-sm"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <div className="flex items-center border border-border/50 rounded-md overflow-hidden">
              <button
                onClick={() => setViewMode("grid")}
                className={cn(
                  "p-1.5 hover:bg-accent/40 transition-colors",
                  viewMode === "grid" ? "bg-accent/60 text-primary" : "text-muted-foreground"
                )}
              >
                <LayoutGrid className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => setViewMode("list")}
                className={cn(
                  "p-1.5 hover:bg-accent/40 transition-colors",
                  viewMode === "list" ? "bg-accent/60 text-primary" : "text-muted-foreground"
                )}
              >
                <LayoutList className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </CardHeader>

        <CardContent className="p-4">
          {isLoading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <Skeleton key={i} className="h-24 w-full rounded-xl" />
              ))}
            </div>
          ) : isError ? (
            <div className="p-10 text-center text-destructive text-sm">Failed to load rooms.</div>
          ) : rooms.length === 0 ? (
            <div className="p-16 text-center flex flex-col items-center">
              <DoorOpen className="w-10 h-10 text-muted-foreground/30 mb-3" />
              <p className="text-muted-foreground text-sm">No rooms found.</p>
            </div>
          ) : viewMode === "grid" ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
              {rooms.map((room) => (
                <RoomCard key={room.id} room={room} onClick={() => setSelectedRoom(room)} />
              ))}
            </div>
          ) : (
            <div className="divide-y divide-border/40">
              {rooms.map((room) => (
                <button
                  key={room.id}
                  onClick={() => setSelectedRoom(room)}
                  className="w-full flex items-center justify-between gap-4 px-2 py-3 hover:bg-accent/20 transition-colors group text-left"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <DoorOpen className="w-4 h-4 text-muted-foreground shrink-0" />
                    <div className="min-w-0">
                      <p className="text-sm font-medium group-hover:text-primary transition-colors">{room.name}</p>
                      <p className="text-xs text-muted-foreground capitalize">
                        {room.room_type}
                        {room.building ? ` · ${room.building}` : ""}
                        {room.floor ? `, Fl ${room.floor}` : ""}
                      </p>
                    </div>
                  </div>
                  <StatusChip status={room.status ?? "unknown"} type="room" />
                </button>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <RoomDrawer
        room={selectedRoom}
        open={!!selectedRoom}
        onClose={() => setSelectedRoom(null)}
      />
    </div>
  );
}
