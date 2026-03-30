import {
  Suspense, useState, useMemo, useRef, useEffect, useCallback,
} from "react";
import { Canvas, useThree } from "@react-three/fiber";
import type { ThreeEvent } from "@react-three/fiber";
import { OrbitControls, Text, Billboard, Html, PerspectiveCamera } from "@react-three/drei";
import type { OrbitControls as OrbitControlsImpl } from "three-stdlib";
import * as THREE from "three";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useLocation as useAppLocation } from "@/lib/location-context";
import { fetchRoomsMock, updateRoomStatus, DEMO_MODE } from "@/lib/mock-adapter";
import type { NormalizedRoom } from "@/lib/mock-adapter";
import { StatusChip } from "@/components/ui/status-chip";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import {
  X, Box, RotateCcw, Layers, MapPin, DoorOpen, StickyNote,
  Pencil, Save, MoveUpRight, Trash2,
} from "lucide-react";

// ── Constants ─────────────────────────────────────────────────────────────────

const ROOM_W      = 2.0;
const ROOM_H      = 1.4;
const ROOM_D      = 2.6;
const GAP_X       = 0.4;
const GAP_Z       = 0.4;
const FLOOR_RISE  = 4.0;
const BUILDING_GAP = 6.0;
const ROOMS_PER_ROW = 10;

const STATUS_COLORS: Record<string, string> = {
  clean:               "#22c55e",
  dirty:               "#f59e0b",
  ready_for_inspection:"#a855f7",
  inspect:             "#a855f7",
  inspected:           "#14b8a6",
  stayover:            "#3b82f6",
  assigned:            "#60a5fa",
  cleaning:            "#818cf8",
  dnd:                 "#64748b",
  laundry_only:        "#06b6d4",
  maintenance_hold:    "#ef4444",
  blocked:             "#ef4444",
};

const MARKER_COLORS: Record<string, string> = {
  stairs:  "#6b7280",
  laundry: "#0284c7",
  storage: "#92400e",
};

const ROOM_STATUSES = [
  "clean", "dirty", "ready_for_inspection", "inspect", "inspected",
  "stayover", "assigned", "cleaning", "dnd", "laundry_only",
  "maintenance_hold", "blocked",
];

const STATUS_LEGEND = [
  { key: "clean",               label: "Clean" },
  { key: "dirty",               label: "Dirty" },
  { key: "inspect",             label: "Ready / Inspect" },
  { key: "inspected",           label: "Inspected" },
  { key: "assigned",            label: "Assigned" },
  { key: "cleaning",            label: "Cleaning" },
  { key: "stayover",            label: "Stayover" },
  { key: "dnd",                 label: "DND" },
  { key: "laundry_only",        label: "Laundry Only" },
  { key: "maintenance_hold",    label: "Maint. Hold" },
  { key: "blocked",             label: "Blocked" },
];

// ── Types ─────────────────────────────────────────────────────────────────────

type RoomData = NormalizedRoom;

interface PositionedRoom {
  room: RoomData;
  pos: [number, number, number];
  buildingName: string;
  floorLabel: string;
}

interface BuildingLayout {
  name: string;
  xOffset: number;
  width: number;
  depth: number;
  floors: FloorLayout[];
}

interface FloorLayout {
  label: string;
  floorY: number;
  rooms: PositionedRoom[];
  numCols: number;
  numRows: number;
}

interface Marker {
  id: string;
  type: "stairs" | "laundry" | "storage";
  x: number;
  y: number;
  z: number;
}

// ── LocalStorage ─────────────────────────────────────────────────────────────

const LS_OVERRIDES = "property_map_overrides_v1";
const LS_MARKERS  = "property_map_markers_v1";

function loadOverrides(): Record<string, [number, number, number]> {
  try { return JSON.parse(localStorage.getItem(LS_OVERRIDES) ?? "{}"); } catch { return {}; }
}
function saveOverrides(v: Record<string, [number, number, number]>) {
  localStorage.setItem(LS_OVERRIDES, JSON.stringify(v));
}
function loadMarkers(): Marker[] {
  try { return JSON.parse(localStorage.getItem(LS_MARKERS) ?? "[]"); } catch { return []; }
}
function saveMarkers(v: Marker[]) {
  localStorage.setItem(LS_MARKERS, JSON.stringify(v));
}

// ── Layout computation ─────────────────────────────────────────────────────

function sortKey(label: string) {
  const n = parseInt(label, 10);
  return isNaN(n) ? label : n;
}

function computeLayout(
  rooms: RoomData[],
  overrides: Record<string, [number, number, number]>,
): { buildings: BuildingLayout[]; positioned: PositionedRoom[] } {
  // Group by building → floor
  const byBuilding: Record<string, Record<string, RoomData[]>> = {};
  rooms.forEach((r) => {
    const b = r.building ?? "Main Building";
    const f = r.floor ?? "1";
    if (!byBuilding[b]) byBuilding[b] = {};
    if (!byBuilding[b][f]) byBuilding[b][f] = [];
    byBuilding[b][f].push(r);
  });

  const buildingNames = Object.keys(byBuilding).sort();
  const buildings: BuildingLayout[] = [];
  const positioned: PositionedRoom[] = [];
  let xOffset = 0;

  buildingNames.forEach((bName) => {
    const floorMap = byBuilding[bName];
    const floorLabels = Object.keys(floorMap).sort((a, b) =>
      (sortKey(a) as number) - (sortKey(b) as number)
    );

    const maxRoomsPerFloor = Math.max(...floorLabels.map((f) => floorMap[f].length));
    const cols = Math.min(maxRoomsPerFloor, ROOMS_PER_ROW);
    const bWidth = cols * (ROOM_W + GAP_X);
    const maxRows = Math.max(...floorLabels.map((f) => Math.ceil(floorMap[f].length / ROOMS_PER_ROW)));
    const bDepth = maxRows * (ROOM_D + GAP_Z);

    const floors: FloorLayout[] = [];

    floorLabels.forEach((floorLabel, fi) => {
      const floorY = fi * FLOOR_RISE + ROOM_H / 2;
      const floorRooms = floorMap[floorLabel];
      const numCols = Math.min(floorRooms.length, ROOMS_PER_ROW);
      const numRows = Math.ceil(floorRooms.length / ROOMS_PER_ROW);
      const fp: PositionedRoom[] = [];

      floorRooms.forEach((room, idx) => {
        let pos: [number, number, number];
        if (overrides[room.id]) {
          pos = overrides[room.id];
        } else {
          const col = idx % ROOMS_PER_ROW;
          const row = Math.floor(idx / ROOMS_PER_ROW);
          pos = [xOffset + col * (ROOM_W + GAP_X), floorY, row * (ROOM_D + GAP_Z)];
        }
        const pr = { room, pos, buildingName: bName, floorLabel };
        fp.push(pr);
        positioned.push(pr);
      });

      floors.push({ label: floorLabel, floorY, rooms: fp, numCols, numRows });
    });

    buildings.push({ name: bName, xOffset, width: bWidth, depth: bDepth, floors });
    xOffset += bWidth + BUILDING_GAP;
  });

  return { buildings, positioned };
}

// ── Marker 3D component ───────────────────────────────────────────────────────

function MarkerObject({
  marker, editMode, onDelete,
}: {
  marker: Marker;
  editMode: boolean;
  onDelete: (id: string) => void;
}) {
  const [hovered, setHovered] = useState(false);
  const col = MARKER_COLORS[marker.type] ?? "#6b7280";

  const shape = marker.type === "laundry"
    ? <cylinderGeometry args={[0.5, 0.5, 1.2, 16]} />
    : <boxGeometry args={marker.type === "stairs" ? [1.0, 0.5, 1.6] : [1.2, 1.2, 1.2]} />;

  return (
    <group position={[marker.x, marker.y, marker.z]}>
      <mesh
        castShadow
        onClick={(e) => { e.stopPropagation(); if (editMode) onDelete(marker.id); }}
        onPointerOver={(e) => { e.stopPropagation(); setHovered(true); document.body.style.cursor = editMode ? "pointer" : "auto"; }}
        onPointerOut={() => { setHovered(false); document.body.style.cursor = "auto"; }}
      >
        {shape}
        <meshStandardMaterial
          color={col}
          emissive={col}
          emissiveIntensity={hovered ? 0.5 : 0.2}
          roughness={0.6}
          metalness={0.1}
        />
      </mesh>
      {/* Step risers for stairs */}
      {marker.type === "stairs" && (
        <>
          <mesh position={[0, 0.35, -0.3]}>
            <boxGeometry args={[1.0, 0.3, 1.0]} />
            <meshStandardMaterial color={col} emissive={col} emissiveIntensity={0.15} />
          </mesh>
          <mesh position={[0, 0.65, -0.6]}>
            <boxGeometry args={[1.0, 0.3, 0.4]} />
            <meshStandardMaterial color={col} emissive={col} emissiveIntensity={0.1} />
          </mesh>
        </>
      )}
      <Billboard>
        <Text
          position={[0, (marker.type === "laundry" ? 0.6 : 0.7) + 0.25, 0]}
          fontSize={0.22}
          color={col}
          anchorX="center"
          anchorY="bottom"
          outlineColor="#000"
          outlineWidth={0.02}
        >
          {marker.type.toUpperCase()}
        </Text>
      </Billboard>
      {editMode && hovered && (
        <Html position={[0, 1.2, 0]} center style={{ pointerEvents: "none" }}>
          <div className="bg-red-500/90 text-white text-[10px] px-2 py-1 rounded font-mono whitespace-nowrap">
            Click to remove
          </div>
        </Html>
      )}
    </group>
  );
}

// ── Floor slab ────────────────────────────────────────────────────────────────

function FloorSlab({
  xOffset, floorY, numCols, numRows, floorLabel, buildingName, buildingWidth,
  editMode, markerType, onPlaceMarker,
}: {
  xOffset: number;
  floorY: number;
  numCols: number;
  numRows: number;
  floorLabel: string;
  buildingName: string;
  buildingWidth: number;
  editMode: boolean;
  markerType: string | null;
  onPlaceMarker: (x: number, y: number, z: number) => void;
}) {
  const w = Math.max(buildingWidth, numCols * (ROOM_W + GAP_X));
  const d = Math.max(1, numRows) * (ROOM_D + GAP_Z);
  const cx = xOffset + w / 2 - (ROOM_W + GAP_X) / 2;
  const cz = d / 2 - (ROOM_D + GAP_Z) / 2;
  const slabY = floorY - ROOM_H / 2 - 0.08;

  const handleClick = (e: ThreeEvent<MouseEvent>) => {
    if (!editMode || !markerType) return;
    e.stopPropagation();
    onPlaceMarker(e.point.x, floorY + ROOM_H / 2 + 0.1, e.point.z);
  };

  return (
    <group>
      <mesh
        position={[cx, slabY, cz]}
        receiveShadow
        onClick={handleClick}
        onPointerOver={(e) => {
          if (editMode && markerType) { e.stopPropagation(); document.body.style.cursor = "crosshair"; }
        }}
        onPointerOut={() => { document.body.style.cursor = "auto"; }}
      >
        <boxGeometry args={[w + 1.0, 0.14, d + 1.0]} />
        <meshStandardMaterial
          color={editMode && markerType ? "#1e3a5f" : "#0d1525"}
          roughness={0.9}
          metalness={0.05}
          transparent
          opacity={0.88}
        />
      </mesh>
      {/* Floor label */}
      <Text
        position={[xOffset - (ROOM_W + GAP_X) * 0.6, floorY + 0.1, cz]}
        fontSize={0.28}
        color="#3a4a6b"
        anchorX="right"
        anchorY="middle"
      >
        {`FL ${floorLabel}`}
      </Text>
    </group>
  );
}

// ── Building label ────────────────────────────────────────────────────────────

function BuildingLabel({ name, xOffset, buildingWidth, numFloors }: {
  name: string;
  xOffset: number;
  buildingWidth: number;
  numFloors: number;
}) {
  const cx = xOffset + buildingWidth / 2 - (ROOM_W + GAP_X) / 2;
  const topY = (numFloors - 1) * FLOOR_RISE + ROOM_H + 0.6;
  return (
    <Text
      position={[cx, topY, -1.5]}
      fontSize={0.38}
      color="#4b5675"
      anchorX="center"
      anchorY="bottom"
    >
      {name}
    </Text>
  );
}

// ── Room block ─────────────────────────────────────────────────────────────────

function RoomBlock({
  room, pos, isSelected, editMode, onSelect, onDragEnd, controlsRef,
}: {
  room: RoomData;
  pos: [number, number, number];
  isSelected: boolean;
  editMode: boolean;
  onSelect: (r: RoomData | null) => void;
  onDragEnd: (id: string, newPos: [number, number, number]) => void;
  controlsRef: React.RefObject<OrbitControlsImpl | null>;
}) {
  const { camera, gl } = useThree();
  const [hovered, setHovered] = useState(false);
  const [displayPos, setDisplayPos] = useState<[number, number, number]>(pos);
  const isDragging = useRef(false);
  const dragCurrentPos = useRef<[number, number, number]>(pos);
  const dragPlane = useRef(new THREE.Plane(new THREE.Vector3(0, 1, 0), -pos[1]));

  useEffect(() => {
    setDisplayPos(pos);
    dragCurrentPos.current = pos;
    dragPlane.current.constant = -pos[1];
  }, [pos[0], pos[1], pos[2]]);

  const hex = STATUS_COLORS[room.status ?? ""] ?? "#374151";
  const col  = useMemo(() => new THREE.Color(hex), [hex]);
  const emit = useMemo(() => new THREE.Color(hex), [hex]);
  const emitIntensity = isSelected ? 0.45 : hovered ? 0.28 : 0.07;

  const handlePointerDown = useCallback((e: ThreeEvent<PointerEvent>) => {
    if (!editMode) return;
    e.stopPropagation();
    onSelect(room);
    isDragging.current = true;
    if (controlsRef.current) controlsRef.current.enabled = false;

    const raycaster = new THREE.Raycaster();

    const handleMove = (me: PointerEvent) => {
      if (!isDragging.current) return;
      const rect = gl.domElement.getBoundingClientRect();
      const nx = ((me.clientX - rect.left) / rect.width) * 2 - 1;
      const ny = -((me.clientY - rect.top) / rect.height) * 2 + 1;
      raycaster.setFromCamera(new THREE.Vector2(nx, ny), camera);
      const target = new THREE.Vector3();
      if (raycaster.ray.intersectPlane(dragPlane.current, target)) {
        const snapX = Math.round(target.x / (ROOM_W + GAP_X)) * (ROOM_W + GAP_X);
        const snapZ = Math.round(target.z / (ROOM_D + GAP_Z)) * (ROOM_D + GAP_Z);
        const newPos: [number, number, number] = [snapX, pos[1], Math.max(0, snapZ)];
        dragCurrentPos.current = newPos;
        setDisplayPos(newPos);
      }
    };
    const handleUp = () => {
      if (!isDragging.current) return;
      isDragging.current = false;
      if (controlsRef.current) controlsRef.current.enabled = true;
      onDragEnd(room.id, dragCurrentPos.current);
      gl.domElement.removeEventListener("pointermove", handleMove);
      gl.domElement.removeEventListener("pointerup", handleUp);
    };
    gl.domElement.addEventListener("pointermove", handleMove);
    gl.domElement.addEventListener("pointerup", handleUp);
  }, [editMode, camera, gl, pos, room, onDragEnd, controlsRef, onSelect]);

  return (
    <group position={displayPos}>
      {/* Main block */}
      <mesh
        castShadow
        receiveShadow
        onPointerDown={editMode ? handlePointerDown : undefined}
        onClick={editMode ? undefined : (e) => { e.stopPropagation(); onSelect(room); }}
        onPointerOver={(e) => {
          e.stopPropagation();
          setHovered(true);
          document.body.style.cursor = editMode ? "grab" : "pointer";
        }}
        onPointerOut={() => { setHovered(false); document.body.style.cursor = "auto"; }}
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

      {/* Selection top bar */}
      {isSelected && (
        <mesh position={[0, ROOM_H / 2 + 0.01, 0]}>
          <boxGeometry args={[ROOM_W + 0.06, 0.04, ROOM_D + 0.06]} />
          <meshBasicMaterial color={hex} transparent opacity={0.9} />
        </mesh>
      )}

      {/* Drag indicator when in edit mode */}
      {editMode && hovered && (
        <mesh position={[0, ROOM_H / 2 + 0.12, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[0.6, 0.75, 32]} />
          <meshBasicMaterial color="#ffffff" transparent opacity={0.3} side={THREE.DoubleSide} />
        </mesh>
      )}

      {/* Maintenance warning cone */}
      {(room.status === "maintenance_hold" || room.status === "blocked") && (
        <mesh position={[ROOM_W / 2 - 0.2, ROOM_H / 2 + 0.22, -ROOM_D / 2 + 0.25]}>
          <coneGeometry args={[0.12, 0.38, 6]} />
          <meshStandardMaterial color="#ef4444" emissive="#ef4444" emissiveIntensity={0.7} />
        </mesh>
      )}

      {/* Room number label */}
      <Billboard>
        <Text
          position={[0, ROOM_H / 2 + 0.22, 0]}
          fontSize={0.21}
          color="white"
          anchorX="center"
          anchorY="bottom"
          outlineColor="#000000"
          outlineWidth={0.025}
        >
          {room.room_number ?? room.name}
        </Text>
      </Billboard>

      {/* Hover tooltip */}
      {hovered && !isSelected && (
        <Html
          position={[0, ROOM_H / 2 + 0.6, 0]}
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
            {room.bed_type_summary && (
              <p className="text-muted-foreground/70">{room.bed_type_summary}</p>
            )}
            {editMode && <p className="text-primary/70 mt-0.5">Drag to reposition</p>}
          </div>
        </Html>
      )}
    </group>
  );
}

// ── Scene ─────────────────────────────────────────────────────────────────────

function BuildingScene({
  positioned, buildings, markers, selectedId, editMode,
  markerType, onSelect, onDragEnd, onPlaceMarker, onDeleteMarker, controlsRef,
}: {
  positioned: PositionedRoom[];
  buildings: BuildingLayout[];
  markers: Marker[];
  selectedId: string | null;
  editMode: boolean;
  markerType: string | null;
  onSelect: (r: RoomData | null) => void;
  onDragEnd: (id: string, newPos: [number, number, number]) => void;
  onPlaceMarker: (x: number, y: number, z: number) => void;
  onDeleteMarker: (id: string) => void;
  controlsRef: React.RefObject<OrbitControlsImpl | null>;
}) {
  const totalW = buildings.reduce((acc, b) => Math.max(acc, b.xOffset + b.width), 0) + BUILDING_GAP;
  const totalD = Math.max(...buildings.map((b) => b.depth), 8);
  const numFloors = Math.max(...buildings.map((b) => b.floors.length), 1);
  const cx = totalW / 2;
  const cz = totalD / 2;
  const sceneH = numFloors * FLOOR_RISE;
  const target: [number, number, number] = [cx, sceneH / 3, cz];

  return (
    <>
      <PerspectiveCamera makeDefault position={[totalW + 5, sceneH + 8, totalD + 14]} fov={40} />

      {/* Lighting */}
      <ambientLight intensity={0.45} />
      <directionalLight
        position={[14, 22, 12]}
        intensity={1.3}
        castShadow
        shadow-mapSize={[2048, 2048]}
        shadow-camera-far={100}
        shadow-camera-left={-35}
        shadow-camera-right={35}
        shadow-camera-top={30}
        shadow-camera-bottom={-30}
      />
      <pointLight position={[-8, 12, -6]} intensity={0.25} color="#4466bb" />
      <hemisphereLight args={["#1a2040", "#0a0f1a", 0.4]} />

      {/* Ground */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[cx, -0.22, cz]} receiveShadow>
        <planeGeometry args={[totalW + 20, totalD + 20]} />
        <meshStandardMaterial color="#070c16" roughness={1} />
      </mesh>

      {/* Deselect plane */}
      <mesh
        rotation={[-Math.PI / 2, 0, 0]}
        position={[cx, -0.21, cz]}
        onClick={() => onSelect(null)}
      >
        <planeGeometry args={[300, 300]} />
        <meshBasicMaterial transparent opacity={0} />
      </mesh>

      {/* Buildings */}
      {buildings.map((bld) => (
        <group key={bld.name}>
          <BuildingLabel
            name={bld.name}
            xOffset={bld.xOffset}
            buildingWidth={bld.width}
            numFloors={bld.floors.length}
          />
          {bld.floors.map((fl) => (
            <group key={fl.label}>
              <FloorSlab
                xOffset={bld.xOffset}
                floorY={fl.floorY}
                numCols={fl.numCols}
                numRows={fl.numRows}
                floorLabel={fl.label}
                buildingName={bld.name}
                buildingWidth={bld.width}
                editMode={editMode}
                markerType={markerType}
                onPlaceMarker={onPlaceMarker}
              />
              {fl.rooms.map(({ room, pos }) => (
                <RoomBlock
                  key={room.id}
                  room={room}
                  pos={pos}
                  isSelected={selectedId === room.id}
                  editMode={editMode}
                  onSelect={onSelect}
                  onDragEnd={onDragEnd}
                  controlsRef={controlsRef}
                />
              ))}
            </group>
          ))}
        </group>
      ))}

      {/* Markers */}
      {markers.map((m) => (
        <MarkerObject key={m.id} marker={m} editMode={editMode} onDelete={onDeleteMarker} />
      ))}

      <OrbitControls
        ref={controlsRef}
        enablePan
        enableZoom
        enableRotate={!editMode}
        minDistance={4}
        maxDistance={60}
        minPolarAngle={0.05}
        maxPolarAngle={Math.PI / 2.05}
        target={target}
        makeDefault
      />
    </>
  );
}

// ── Detail panel ──────────────────────────────────────────────────────────────

function DetailPanel({
  room, onClose, onStatusChange,
}: {
  room: RoomData;
  onClose: () => void;
  onStatusChange: (roomId: string, status: string) => void;
}) {
  const [notes, setNotes] = useState(room.notes ?? "");
  const [dirty, setDirty] = useState(false);
  const { toast } = useToast();

  useEffect(() => { setNotes(room.notes ?? ""); setDirty(false); }, [room.id]);

  return (
    <div className="absolute right-0 top-0 h-full w-72 bg-card/97 border-l border-border/60 flex flex-col backdrop-blur z-20 shadow-2xl">
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
        <div className="grid grid-cols-2 gap-2">
          <div className="p-2.5 rounded-lg border border-border/40 bg-muted/20">
            <p className="text-[10px] font-mono text-muted-foreground uppercase tracking-widest">Room</p>
            <p className="text-sm font-bold font-mono">{room.room_number ?? "—"}</p>
          </div>
          <div className="p-2.5 rounded-lg border border-border/40 bg-muted/20">
            <p className="text-[10px] font-mono text-muted-foreground uppercase tracking-widest">Type</p>
            <p className="text-xs font-medium capitalize truncate">{room.room_type ?? "—"}</p>
          </div>
          {room.building && (
            <div className="p-2.5 rounded-lg border border-border/40 bg-muted/20">
              <p className="text-[10px] font-mono text-muted-foreground uppercase tracking-widest">Building</p>
              <p className="text-xs font-medium truncate">{room.building}</p>
            </div>
          )}
          {room.floor && (
            <div className="p-2.5 rounded-lg border border-border/40 bg-muted/20 flex items-center gap-1.5">
              <Layers className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
              <div>
                <p className="text-[10px] font-mono text-muted-foreground uppercase tracking-widest">Floor</p>
                <p className="text-xs font-medium">{room.floor}</p>
              </div>
            </div>
          )}
          {room.bed_type_summary && (
            <div className="col-span-2 p-2.5 rounded-lg border border-border/40 bg-muted/20">
              <p className="text-[10px] font-mono text-muted-foreground uppercase tracking-widest">Beds</p>
              <p className="text-xs font-medium">{room.bed_type_summary}</p>
            </div>
          )}
        </div>

        <div className="space-y-1.5">
          <p className="text-[10px] font-mono text-muted-foreground uppercase tracking-widest">Status</p>
          <StatusChip status={room.status ?? "unknown"} type="room" />
        </div>

        <div className="space-y-1.5">
          <p className="text-[10px] font-mono text-muted-foreground uppercase tracking-widest">Update Status</p>
          <Select value={room.status ?? ""} onValueChange={(val) => onStatusChange(room.id, val)}>
            <SelectTrigger className="h-8 text-xs">
              <SelectValue placeholder="Choose status…" />
            </SelectTrigger>
            <SelectContent>
              {ROOM_STATUSES.map((s) => (
                <SelectItem key={s} value={s} className="text-xs capitalize">{s.replace(/_/g, " ")}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1.5">
          <div className="flex items-center gap-1.5">
            <StickyNote className="w-3.5 h-3.5 text-muted-foreground" />
            <p className="text-[10px] font-mono text-muted-foreground uppercase tracking-widest">Notes</p>
          </div>
          <Textarea
            className="text-xs min-h-[70px] resize-none"
            value={notes}
            onChange={(e) => { setNotes(e.target.value); setDirty(true); }}
            placeholder="Room notes…"
          />
          {dirty && (
            <Button size="sm" className="w-full h-7 text-xs" onClick={() => {
              setDirty(false);
              toast({ title: DEMO_MODE ? "Notes saved (demo)" : "Notes saved" });
            }}>
              Save Notes
            </Button>
          )}
        </div>

        {DEMO_MODE && (
          <div className="p-2.5 rounded-lg border border-amber-500/20 bg-amber-500/5">
            <p className="text-[10px] text-amber-400/80">
              Demo mode — changes reset on refresh.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────

export default function PropertyMap() {
  const { locations, selectedLocationId, selectedLocation, setLocationId } = useAppLocation();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const controlsRef = useRef<OrbitControlsImpl>(null);

  const [selectedRoom,    setSelectedRoom]    = useState<RoomData | null>(null);
  const [editMode,        setEditMode]        = useState(false);
  const [markerType,      setMarkerType]      = useState<"stairs" | "laundry" | "storage" | null>(null);
  const [posOverrides,    setPosOverrides]    = useState<Record<string, [number, number, number]>>(() => loadOverrides());
  const [markers,         setMarkers]         = useState<Marker[]>(() => loadMarkers());

  const { data: rawRooms = [], isLoading } = useQuery({
    queryKey: ["/rooms", selectedLocationId],
    queryFn: () => fetchRoomsMock(selectedLocationId ?? undefined),
  });

  const rooms = rawRooms as RoomData[];
  const liveRoom = rooms.find((r) => r.id === selectedRoom?.id) ?? selectedRoom;

  const { buildings, positioned } = useMemo(
    () => computeLayout(rooms, posOverrides),
    [rooms, posOverrides],
  );

  const mutation = useMutation({
    mutationFn: ({ roomId, status }: { roomId: string; status: string }) =>
      updateRoomStatus(roomId, status),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/rooms"] });
      toast({ title: DEMO_MODE ? "Status updated (demo)" : "Room status updated" });
    },
    onError: () => toast({ title: "Failed to update status", variant: "destructive" }),
  });

  const statusCounts = useMemo(() => {
    const c: Record<string, number> = {};
    rooms.forEach((r) => { c[r.status ?? "unknown"] = (c[r.status ?? "unknown"] ?? 0) + 1; });
    return c;
  }, [rooms]);

  const handleDragEnd = useCallback((id: string, newPos: [number, number, number]) => {
    setPosOverrides((prev) => {
      const next = { ...prev, [id]: newPos };
      saveOverrides(next);
      return next;
    });
  }, []);

  const handlePlaceMarker = useCallback((x: number, y: number, z: number) => {
    if (!markerType) return;
    const m: Marker = { id: `m-${Date.now()}`, type: markerType, x, y, z };
    setMarkers((prev) => { const next = [...prev, m]; saveMarkers(next); return next; });
    toast({ title: `${markerType.charAt(0).toUpperCase() + markerType.slice(1)} marker placed` });
  }, [markerType, toast]);

  const handleDeleteMarker = useCallback((id: string) => {
    setMarkers((prev) => { const next = prev.filter((m) => m.id !== id); saveMarkers(next); return next; });
    toast({ title: "Marker removed" });
  }, [toast]);

  const handleResetLayout = () => {
    setPosOverrides({});
    saveOverrides({});
    toast({ title: "Layout reset" });
  };

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* ── Top bar ── */}
      <div className="shrink-0 flex items-center justify-between gap-3 px-4 py-2 border-b border-border/50 bg-card/80 z-20 flex-wrap">
        <div className="flex items-center gap-3">
          <Box className="w-4 h-4 text-primary" />
          <span className="text-sm font-semibold">Property Map</span>
          {DEMO_MODE && (
            <Badge variant="outline" className="border-amber-500/30 text-amber-400 bg-amber-500/5 text-[10px] font-mono">DEMO</Badge>
          )}
          {editMode && (
            <Badge variant="outline" className="border-primary/50 text-primary bg-primary/10 text-[10px] font-mono animate-pulse">
              EDIT MODE
            </Badge>
          )}
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {/* Location picker */}
          <div className="flex items-center gap-1.5">
            <MapPin className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
            <Select value={selectedLocationId ?? ""} onValueChange={setLocationId}>
              <SelectTrigger className="h-7 text-xs w-40 border-border/50">
                <SelectValue placeholder="Select location…" />
              </SelectTrigger>
              <SelectContent>
                {locations.map((loc) => (
                  <SelectItem key={loc.id} value={loc.id} className="text-xs">{loc.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {rooms.length > 0 && (
            <span className="text-[10px] font-mono text-muted-foreground/50">
              {rooms.length} rooms · {buildings.length} building{buildings.length !== 1 ? "s" : ""}
            </span>
          )}

          {/* Edit mode toggle */}
          {rooms.length > 0 && (
            <Button
              variant={editMode ? "default" : "outline"}
              size="sm"
              className="h-7 text-xs gap-1.5"
              onClick={() => { setEditMode(!editMode); setMarkerType(null); }}
            >
              {editMode ? <><Save className="w-3 h-3" />Done Editing</> : <><Pencil className="w-3 h-3" />Edit Map</>}
            </Button>
          )}

          {/* Reset view */}
          {rooms.length > 0 && (
            <Button variant="ghost" size="sm" className="h-7 text-xs gap-1" onClick={() => controlsRef.current?.reset()}>
              <RotateCcw className="w-3 h-3" /> Reset view
            </Button>
          )}
        </div>
      </div>

      {/* ── Edit toolbar ── */}
      {editMode && rooms.length > 0 && (
        <div className="shrink-0 flex items-center gap-3 px-4 py-2 border-b border-primary/20 bg-primary/5 z-20">
          <MoveUpRight className="w-3.5 h-3.5 text-primary shrink-0" />
          <span className="text-xs text-primary font-medium">Drag rooms to reposition.</span>
          <span className="text-xs text-muted-foreground">Place markers:</span>
          {(["stairs", "laundry", "storage"] as const).map((type) => (
            <button
              key={type}
              onClick={() => setMarkerType(markerType === type ? null : type)}
              className={`text-xs px-2.5 py-1 rounded-md border font-medium capitalize transition-all ${
                markerType === type
                  ? "bg-primary/20 border-primary/50 text-primary"
                  : "bg-muted/30 border-border/50 text-muted-foreground hover:bg-muted/60"
              }`}
            >
              {type === "stairs" ? "🪜" : type === "laundry" ? "🧺" : "📦"} {type}
            </button>
          ))}
          {markerType && (
            <span className="text-xs text-primary/70 italic">Click a floor to place marker. Click a marker to remove it.</span>
          )}
          {Object.keys(posOverrides).length > 0 && (
            <button
              onClick={handleResetLayout}
              className="ml-auto text-xs text-red-400/70 hover:text-red-400 flex items-center gap-1 transition-colors"
            >
              <Trash2 className="w-3 h-3" /> Reset layout
            </button>
          )}
        </div>
      )}

      {/* ── Canvas area ── */}
      <div className="flex-1 relative overflow-hidden">
        {isLoading ? (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-4">
            <Skeleton className="w-72 h-36 rounded-xl" />
            <p className="text-xs text-muted-foreground/60 font-mono">Loading rooms…</p>
          </div>
        ) : rooms.length === 0 ? (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3">
            <DoorOpen className="w-10 h-10 text-muted-foreground/25" />
            <p className="text-sm text-muted-foreground">
              {selectedLocationId ? "No rooms found for this location." : "Select a location to view the property map."}
            </p>
          </div>
        ) : (
          <Canvas
            shadows
            gl={{ antialias: true, alpha: false, toneMapping: THREE.ACESFilmicToneMapping }}
            style={{ position: "absolute", inset: 0, background: "#060b15" }}
            onCreated={({ gl }) => { gl.toneMappingExposure = 1.2; }}
          >
            <Suspense fallback={null}>
              <BuildingScene
                positioned={positioned}
                buildings={buildings}
                markers={markers}
                selectedId={selectedRoom?.id ?? null}
                editMode={editMode}
                markerType={markerType}
                onSelect={setSelectedRoom}
                onDragEnd={handleDragEnd}
                onPlaceMarker={handlePlaceMarker}
                onDeleteMarker={handleDeleteMarker}
                controlsRef={controlsRef}
              />
            </Suspense>
          </Canvas>
        )}

        {/* ── Status legend ── */}
        {rooms.length > 0 && !isLoading && (
          <div className="absolute bottom-4 left-4 z-10 flex flex-col gap-1.5 bg-card/85 border border-border/50 rounded-xl px-3 py-2.5 backdrop-blur-sm">
            <p className="text-[9px] font-mono text-muted-foreground/60 uppercase tracking-widest mb-0.5">Legend</p>
            {STATUS_LEGEND.filter((s) => statusCounts[s.key] != null).map(({ key, label }) => (
              <div key={key} className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-sm shrink-0" style={{ backgroundColor: STATUS_COLORS[key] ?? "#374151" }} />
                <span className="text-[10px] text-muted-foreground">{label}</span>
                <span className="text-[10px] font-mono text-muted-foreground/50 ml-auto pl-3">{statusCounts[key]}</span>
              </div>
            ))}
            {markers.length > 0 && (
              <>
                <div className="h-px bg-border/30 my-0.5" />
                {(["stairs", "laundry", "storage"] as const).filter(t => markers.some(m => m.type === t)).map(t => (
                  <div key={t} className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-sm shrink-0" style={{ backgroundColor: MARKER_COLORS[t] }} />
                    <span className="text-[10px] text-muted-foreground capitalize">{t}</span>
                  </div>
                ))}
              </>
            )}
          </div>
        )}

        {/* ── Controls hint ── */}
        {rooms.length > 0 && !isLoading && (
          <div className="absolute bottom-4 right-4 z-10 text-[10px] font-mono text-muted-foreground/40 text-right space-y-0.5 pointer-events-none">
            {editMode
              ? <><p className="text-primary/50">Drag to move rooms</p><p>Scroll to zoom</p></>
              : <><p>Drag to orbit</p><p>Scroll to zoom</p><p>Click room to inspect</p></>}
          </div>
        )}

        {/* ── Detail panel ── */}
        {liveRoom && !editMode && (
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
