import { Suspense, useState, useMemo, useRef, useEffect } from "react";
import { Canvas } from "@react-three/fiber";
import { OrbitControls, Text, Billboard, Html, PerspectiveCamera } from "@react-three/drei";
import type { OrbitControls as OrbitControlsImpl } from "three-stdlib";
import * as THREE from "three";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useLocation as useAppLocation } from "@/lib/location-context";
import { fetchRoomsMock, updateRoomStatus, DEMO_MODE } from "@/lib/mock-adapter";
import { StatusChip } from "@/components/ui/status-chip";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import {
  X, Box, RotateCcw, Layers, MapPin, DoorOpen, StickyNote,
} from "lucide-react";
import { cn } from "@/lib/utils";

// ── Status colour map (matches StatusChip) ───────────────────────────────────

const STATUS_3D_COLORS: Record<string, string> = {
  clean:               "#22c55e",
  dirty:               "#f59e0b",
  ready_for_inspection:"#a855f7",
  inspected:           "#14b8a6",
  stayover:            "#3b82f6",
  dnd:                 "#64748b",
  laundry_only:        "#06b6d4",
  maintenance_hold:    "#ef4444",
};

const ROOM_STATUSES = [
  "clean", "dirty", "ready_for_inspection", "inspected",
  "stayover", "dnd", "laundry_only", "maintenance_hold",
];

const STATUS_LEGEND = [
  { key: "clean",               label: "Clean" },
  { key: "dirty",               label: "Dirty" },
  { key: "ready_for_inspection",label: "Ready / Inspect" },
  { key: "inspected",           label: "Inspected" },
  { key: "stayover",            label: "Stayover" },
  { key: "dnd",                 label: "DND" },
  { key: "laundry_only",        label: "Laundry Only" },
  { key: "maintenance_hold",    label: "Maint. Hold" },
];

// ── Layout constants ──────────────────────────────────────────────────────────

const ROOM_W       = 2.0;   // x
const ROOM_H       = 1.4;   // y (height of each block)
const ROOM_D       = 2.6;   // z (depth)
const GAP_X        = 0.35;
const GAP_Z        = 0.35;
const FLOOR_RISE   = 3.6;   // y spacing between floors
const ROOMS_PER_ROW = 5;

// ── Types ─────────────────────────────────────────────────────────────────────

interface RoomData {
  id: string;
  name: string;
  room_number?: string | null;
  room_type?: string | null;
  status?: string | null;
  floor?: string | null;
  location_id?: string | null;
  notes?: string | null;
}

interface PositionedRoom {
  room: RoomData;
  pos: [number, number, number];
  floorY: number;
  floorKey: string;
}

// ── Layout computation ────────────────────────────────────────────────────────

function floorIndex(f: string): number {
  if (f === "G") return 0;
  const n = parseInt(f, 10);
  return isNaN(n) ? 0 : n;
}

function sortFloors(a: string, b: string) {
  return floorIndex(a) - floorIndex(b);
}

function computeLayout(rooms: RoomData[]): PositionedRoom[] {
  const byFloor: Record<string, RoomData[]> = {};
  rooms.forEach((r) => {
    const f = r.floor ?? "G";
    if (!byFloor[f]) byFloor[f] = [];
    byFloor[f].push(r);
  });

  const floors = Object.keys(byFloor).sort(sortFloors);
  const result: PositionedRoom[] = [];

  floors.forEach((floor, fi) => {
    const floorY = fi * FLOOR_RISE + ROOM_H / 2;
    byFloor[floor].forEach((room, idx) => {
      const col = idx % ROOMS_PER_ROW;
      const row = Math.floor(idx / ROOMS_PER_ROW);
      const x = col * (ROOM_W + GAP_X);
      const z = row * (ROOM_D + GAP_Z);
      result.push({ room, pos: [x, floorY, z], floorY, floorKey: floor });
    });
  });

  return result;
}

// ── RoomBlock ─────────────────────────────────────────────────────────────────

function RoomBlock({
  room,
  pos,
  isSelected,
  onSelect,
}: {
  room: RoomData;
  pos: [number, number, number];
  isSelected: boolean;
  onSelect: (r: RoomData) => void;
}) {
  const [hovered, setHovered] = useState(false);
  const hex = STATUS_3D_COLORS[room.status ?? ""] ?? "#374151";
  const col  = useMemo(() => new THREE.Color(hex), [hex]);
  const emit = useMemo(() => new THREE.Color(hex), [hex]);
  const emitIntensity = isSelected ? 0.45 : hovered ? 0.28 : 0.07;

  return (
    <group position={pos}>
      {/* Main block */}
      <mesh
        onClick={(e) => { e.stopPropagation(); onSelect(room); }}
        onPointerOver={(e) => { e.stopPropagation(); setHovered(true); document.body.style.cursor = "pointer"; }}
        onPointerOut={() => { setHovered(false); document.body.style.cursor = "auto"; }}
        castShadow
        receiveShadow
      >
        <boxGeometry args={[ROOM_W, ROOM_H, ROOM_D]} />
        <meshStandardMaterial
          color={col}
          emissive={emit}
          emissiveIntensity={emitIntensity}
          roughness={0.55}
          metalness={0.12}
          transparent
          opacity={isSelected ? 1 : 0.88}
        />
      </mesh>

      {/* Top edge highlight when selected */}
      {isSelected && (
        <mesh position={[0, ROOM_H / 2 + 0.01, 0]}>
          <boxGeometry args={[ROOM_W + 0.06, 0.04, ROOM_D + 0.06]} />
          <meshBasicMaterial color={hex} transparent opacity={0.9} />
        </mesh>
      )}

      {/* Glowing ring on ground when selected */}
      {isSelected && (
        <mesh position={[0, -ROOM_H / 2 - 0.04, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[0.9, 1.1, 40]} />
          <meshBasicMaterial color={hex} transparent opacity={0.8} side={THREE.DoubleSide} />
        </mesh>
      )}

      {/* Maintenance hold cone marker */}
      {room.status === "maintenance_hold" && (
        <mesh position={[ROOM_W / 2 - 0.2, ROOM_H / 2 + 0.22, -ROOM_D / 2 + 0.25]}>
          <coneGeometry args={[0.12, 0.38, 6]} />
          <meshStandardMaterial color="#ef4444" emissive="#ef4444" emissiveIntensity={0.7} />
        </mesh>
      )}

      {/* Floating room label */}
      <Billboard lockX={false} lockY={false} lockZ={false}>
        <Text
          position={[0, ROOM_H / 2 + 0.22, 0]}
          fontSize={0.22}
          color="white"
          anchorX="center"
          anchorY="bottom"
          outlineColor="#000000"
          outlineWidth={0.025}
        >
          {room.room_number ?? room.name}
        </Text>
      </Billboard>

      {/* Hover tooltip via Html */}
      {hovered && !isSelected && (
        <Html
          position={[0, ROOM_H / 2 + 0.55, 0]}
          center
          distanceFactor={10}
          zIndexRange={[200, 0]}
          style={{ pointerEvents: "none" }}
        >
          <div className="bg-popover/95 border border-border/60 rounded-lg px-3 py-2 shadow-xl text-xs whitespace-nowrap">
            <p className="font-semibold text-foreground">{room.name}</p>
            <p className="text-muted-foreground capitalize mt-0.5">
              {(room.status ?? "unknown").replace(/_/g, " ")}
            </p>
            {room.room_type && (
              <p className="text-muted-foreground/70 capitalize">{room.room_type}</p>
            )}
          </div>
        </Html>
      )}
    </group>
  );
}

// ── Floor slab ────────────────────────────────────────────────────────────────

function FloorSlab({
  floorY, floorLabel, cols, rows,
}: {
  floorY: number;
  floorLabel: string;
  cols: number;
  rows: number;
}) {
  const w = cols * (ROOM_W + GAP_X);
  const d = rows * (ROOM_D + GAP_Z);
  const cx = w / 2 - (ROOM_W + GAP_X) / 2;
  const cz = d / 2 - (ROOM_D + GAP_Z) / 2;

  return (
    <group>
      {/* Concrete slab */}
      <mesh position={[cx, floorY - ROOM_H / 2 - 0.06, cz]} receiveShadow>
        <boxGeometry args={[w + 0.7, 0.14, d + 0.7]} />
        <meshStandardMaterial color="#131c2e" roughness={0.9} metalness={0.05} transparent opacity={0.85} />
      </mesh>

      {/* Floor number text (left side) */}
      <Text
        position={[-(ROOM_W + GAP_X) * 0.7, floorY + 0.1, cz]}
        fontSize={0.32}
        color="#4b5675"
        anchorX="right"
        anchorY="middle"
        font={undefined}
      >
        {`FL ${floorLabel}`}
      </Text>
    </group>
  );
}

// ── 3D scene ──────────────────────────────────────────────────────────────────

function BuildingScene({
  rooms,
  selectedId,
  onSelect,
  controlsRef,
}: {
  rooms: RoomData[];
  selectedId: string | null;
  onSelect: (r: RoomData | null) => void;
  controlsRef: React.RefObject<OrbitControlsImpl | null>;
}) {
  const positioned = useMemo(() => computeLayout(rooms), [rooms]);

  const byFloor = useMemo(() => {
    const map: Record<string, PositionedRoom[]> = {};
    positioned.forEach((p) => {
      if (!map[p.floorKey]) map[p.floorKey] = [];
      map[p.floorKey].push(p);
    });
    return map;
  }, [positioned]);

  const floors = useMemo(() => Object.keys(byFloor).sort(sortFloors), [byFloor]);

  // Overall scene dimensions
  const maxCols = ROOMS_PER_ROW;
  const totalW = maxCols * (ROOM_W + GAP_X);
  const maxRows = Math.ceil(rooms.length / ROOMS_PER_ROW);
  const totalD = maxRows * (ROOM_D + GAP_Z);
  const cx = totalW / 2 - (ROOM_W + GAP_X) / 2;
  const cz = totalD / 2 - (ROOM_D + GAP_Z) / 2;
  const sceneH = floors.length * FLOOR_RISE;
  const target: [number, number, number] = [cx, sceneH / 2, cz];

  return (
    <>
      <PerspectiveCamera makeDefault position={[totalW + 4, sceneH + 6, totalD + 10]} fov={42} />

      {/* Lighting */}
      <ambientLight intensity={0.45} />
      <directionalLight
        position={[12, 20, 10]}
        intensity={1.3}
        castShadow
        shadow-mapSize={[2048, 2048]}
        shadow-camera-near={0.5}
        shadow-camera-far={80}
        shadow-camera-left={-25}
        shadow-camera-right={25}
        shadow-camera-top={25}
        shadow-camera-bottom={-25}
      />
      <pointLight position={[-6, 10, -4]} intensity={0.25} color="#4466bb" />
      <hemisphereLight args={["#1a2040", "#0a0f1a", 0.4]} />

      {/* Ground plane */}
      <mesh
        rotation={[-Math.PI / 2, 0, 0]}
        position={[cx, -0.2, cz]}
        receiveShadow
      >
        <planeGeometry args={[totalW + 14, totalD + 14]} />
        <meshStandardMaterial color="#090e18" roughness={1} />
      </mesh>

      {/* Click-to-deselect invisible plane */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[cx, -0.19, cz]} onClick={() => onSelect(null)}>
        <planeGeometry args={[200, 200]} />
        <meshBasicMaterial transparent opacity={0} />
      </mesh>

      {/* Floors + rooms */}
      {floors.map((floor) => {
        const pr = byFloor[floor];
        const floorY = pr[0]?.floorY ?? 0;
        const numCols = Math.min(pr.length, ROOMS_PER_ROW);
        const numRows = Math.ceil(pr.length / ROOMS_PER_ROW);
        return (
          <group key={floor}>
            <FloorSlab
              floorY={floorY}
              floorLabel={floor}
              cols={numCols}
              rows={numRows}
            />
            {pr.map(({ room, pos }) => (
              <RoomBlock
                key={room.id}
                room={room}
                pos={pos}
                isSelected={selectedId === room.id}
                onSelect={onSelect}
              />
            ))}
          </group>
        );
      })}

      <OrbitControls
        ref={controlsRef}
        enablePan
        enableZoom
        enableRotate
        minDistance={4}
        maxDistance={50}
        minPolarAngle={0.05}
        maxPolarAngle={Math.PI / 2.05}
        target={target}
        makeDefault
      />
    </>
  );
}

// ── Detail panel ─────────────────────────────────────────────────────────────

function DetailPanel({
  room,
  onClose,
  onStatusChange,
}: {
  room: RoomData;
  onClose: () => void;
  onStatusChange: (roomId: string, status: string) => void;
}) {
  const [notes, setNotes] = useState(room.notes ?? "");
  const [dirty, setDirty] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    setNotes(room.notes ?? "");
    setDirty(false);
  }, [room.id]);

  return (
    <div className="absolute right-0 top-0 h-full w-80 bg-card/97 border-l border-border/60 flex flex-col backdrop-blur z-20 shadow-2xl">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border/50 shrink-0">
        <div className="flex items-center gap-2 min-w-0">
          <DoorOpen className="w-4 h-4 text-primary shrink-0" />
          <span className="font-semibold text-sm truncate">{room.name}</span>
        </div>
        <Button size="icon" variant="ghost" className="h-7 w-7 shrink-0" onClick={onClose}>
          <X className="w-3.5 h-3.5" />
        </Button>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {/* Room number + type */}
        <div className="grid grid-cols-2 gap-3">
          <div className="p-3 rounded-lg border border-border/40 bg-muted/20 space-y-1">
            <p className="text-[10px] font-mono text-muted-foreground uppercase tracking-widest">Room No.</p>
            <p className="text-base font-bold font-mono">{room.room_number ?? "—"}</p>
          </div>
          <div className="p-3 rounded-lg border border-border/40 bg-muted/20 space-y-1">
            <p className="text-[10px] font-mono text-muted-foreground uppercase tracking-widest">Type</p>
            <p className="text-sm font-medium capitalize">{room.room_type ?? "—"}</p>
          </div>
        </div>

        {/* Floor */}
        <div className="p-3 rounded-lg border border-border/40 bg-muted/20 flex items-center gap-3">
          <Layers className="w-4 h-4 text-muted-foreground shrink-0" />
          <div>
            <p className="text-[10px] font-mono text-muted-foreground uppercase tracking-widest">Floor</p>
            <p className="text-sm font-medium">{room.floor ?? "—"}</p>
          </div>
        </div>

        {/* Status */}
        <div className="space-y-2">
          <p className="text-[10px] font-mono text-muted-foreground uppercase tracking-widest">Current Status</p>
          <StatusChip status={room.status ?? "unknown"} type="room" />
        </div>

        {/* Status change */}
        <div className="space-y-2">
          <p className="text-[10px] font-mono text-muted-foreground uppercase tracking-widest">Update Status</p>
          <Select
            value={room.status ?? ""}
            onValueChange={(val) => onStatusChange(room.id, val)}
          >
            <SelectTrigger className="h-8 text-xs">
              <SelectValue placeholder="Choose new status…" />
            </SelectTrigger>
            <SelectContent>
              {ROOM_STATUSES.map((s) => (
                <SelectItem key={s} value={s} className="text-xs">
                  <span className="capitalize">{s.replace(/_/g, " ")}</span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Notes */}
        <div className="space-y-2">
          <div className="flex items-center gap-1.5">
            <StickyNote className="w-3.5 h-3.5 text-muted-foreground" />
            <p className="text-[10px] font-mono text-muted-foreground uppercase tracking-widest">Notes</p>
          </div>
          <Textarea
            className="text-xs min-h-[80px] resize-none"
            value={notes}
            onChange={(e) => { setNotes(e.target.value); setDirty(true); }}
            placeholder="Add notes about this room…"
          />
          {dirty && (
            <Button
              size="sm"
              className="w-full h-7 text-xs"
              onClick={() => {
                setDirty(false);
                toast({ title: DEMO_MODE ? "Notes saved (demo — local only)" : "Notes saved" });
              }}
            >
              Save Notes
            </Button>
          )}
        </div>

        {/* ID */}
        <div className="p-3 rounded-lg border border-border/40 bg-muted/20">
          <p className="text-[10px] font-mono text-muted-foreground uppercase tracking-widest mb-1">Room ID</p>
          <p className="text-[10px] font-mono text-muted-foreground break-all">{room.id}</p>
        </div>

        {DEMO_MODE && (
          <div className="p-3 rounded-lg border border-amber-500/20 bg-amber-500/5">
            <p className="text-[10px] text-amber-400/80 leading-relaxed">
              Demo mode — status changes are reflected in the 3D view but reset on page refresh.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function PropertyMap() {
  const { locations, selectedLocationId, selectedLocation, setLocationId } = useAppLocation();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const controlsRef = useRef<OrbitControlsImpl>(null);
  const [selectedRoom, setSelectedRoom] = useState<RoomData | null>(null);

  const { data: rawRooms = [], isLoading } = useQuery({
    queryKey: ["/rooms", selectedLocationId],
    queryFn: () => fetchRoomsMock(selectedLocationId ?? undefined),
  });

  const rooms = rawRooms as RoomData[];

  // Keep panel in sync with latest room data after status mutations
  const liveRoom = rooms.find((r) => r.id === selectedRoom?.id) ?? selectedRoom;

  const mutation = useMutation({
    mutationFn: ({ roomId, status }: { roomId: string; status: string }) =>
      updateRoomStatus(roomId, status),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/rooms"] });
      toast({ title: DEMO_MODE ? "Status updated (demo)" : "Room status updated" });
    },
    onError: () => toast({ title: "Failed to update room status", variant: "destructive" }),
  });

  // Status breakdown counts
  const statusCounts = useMemo(() => {
    const c: Record<string, number> = {};
    rooms.forEach((r) => { c[r.status ?? "unknown"] = (c[r.status ?? "unknown"] ?? 0) + 1; });
    return c;
  }, [rooms]);

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* ── Top bar ── */}
      <div className="shrink-0 flex items-center justify-between gap-4 px-4 py-2.5 border-b border-border/50 bg-card/80 z-20">
        <div className="flex items-center gap-3">
          <Box className="w-4 h-4 text-primary" />
          <span className="text-sm font-semibold">Property Map</span>
          {DEMO_MODE && (
            <Badge variant="outline" className="border-amber-500/30 text-amber-400 bg-amber-500/5 text-[10px] font-mono">
              DEMO
            </Badge>
          )}
        </div>

        <div className="flex items-center gap-3">
          {/* Location picker */}
          <div className="flex items-center gap-1.5">
            <MapPin className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
            <Select value={selectedLocationId ?? ""} onValueChange={setLocationId}>
              <SelectTrigger className="h-7 text-xs w-44 border-border/50">
                <SelectValue placeholder="Select location…" />
              </SelectTrigger>
              <SelectContent>
                {locations.map((loc) => (
                  <SelectItem key={loc.id} value={loc.id} className="text-xs">
                    {loc.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {rooms.length > 0 && (
            <span className="text-[10px] font-mono text-muted-foreground/60">
              {rooms.length} room{rooms.length !== 1 ? "s" : ""}
            </span>
          )}

          {/* Reset camera */}
          {rooms.length > 0 && (
            <Button
              variant="ghost"
              size="sm"
              className="h-7 text-xs gap-1.5"
              onClick={() => controlsRef.current?.reset()}
            >
              <RotateCcw className="w-3 h-3" />
              Reset view
            </Button>
          )}
        </div>
      </div>

      {/* ── Canvas area ── */}
      <div className="flex-1 relative overflow-hidden">
        {isLoading ? (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-4">
            <Skeleton className="w-64 h-32 rounded-xl" />
            <p className="text-xs text-muted-foreground/60 font-mono">Loading rooms…</p>
          </div>
        ) : rooms.length === 0 ? (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3">
            <DoorOpen className="w-10 h-10 text-muted-foreground/25" />
            <p className="text-sm text-muted-foreground">
              {selectedLocationId
                ? "No rooms found for this location."
                : "Select a location to view its property map."}
            </p>
          </div>
        ) : (
          <Canvas
            shadows
            gl={{ antialias: true, alpha: false, toneMapping: THREE.ACESFilmicToneMapping }}
            style={{ position: "absolute", inset: 0, background: "#070c16" }}
            onCreated={({ gl }) => { gl.toneMappingExposure = 1.2; }}
          >
            <Suspense fallback={null}>
              <BuildingScene
                rooms={rooms}
                selectedId={selectedRoom?.id ?? null}
                onSelect={(r) => setSelectedRoom(r)}
                controlsRef={controlsRef}
              />
            </Suspense>
          </Canvas>
        )}

        {/* ── Status legend ── */}
        {rooms.length > 0 && !isLoading && (
          <div className="absolute bottom-4 left-4 z-10 flex flex-col gap-1.5 bg-card/80 border border-border/50 rounded-xl px-3 py-2.5 backdrop-blur-sm">
            <p className="text-[9px] font-mono text-muted-foreground/60 uppercase tracking-widest mb-0.5">Legend</p>
            {STATUS_LEGEND.filter((s) => statusCounts[s.key] != null).map(({ key, label }) => (
              <div key={key} className="flex items-center gap-2">
                <span
                  className="w-2.5 h-2.5 rounded-sm shrink-0"
                  style={{ backgroundColor: STATUS_3D_COLORS[key] ?? "#374151" }}
                />
                <span className="text-[10px] text-muted-foreground">{label}</span>
                <span className="text-[10px] font-mono text-muted-foreground/50 ml-auto pl-3">
                  {statusCounts[key]}
                </span>
              </div>
            ))}
          </div>
        )}

        {/* ── Controls hint ── */}
        {rooms.length > 0 && !isLoading && (
          <div className="absolute bottom-4 right-4 z-10 text-[10px] font-mono text-muted-foreground/40 text-right space-y-0.5 pointer-events-none">
            {selectedRoom && <p className="text-muted-foreground/60 mb-1">Click outside to deselect</p>}
            <p>Drag to orbit</p>
            <p>Scroll to zoom</p>
            <p>Click room to inspect</p>
          </div>
        )}

        {/* ── Detail panel ── */}
        {liveRoom && (
          <DetailPanel
            room={liveRoom}
            onClose={() => setSelectedRoom(null)}
            onStatusChange={(roomId, status) => mutation.mutate({ roomId, status })}
          />
        )}
      </div>
    </div>
  );
}
