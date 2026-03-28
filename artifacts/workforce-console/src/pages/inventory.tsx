import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { fetchApi } from "@/lib/api-client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import {
  Package, Save, TriangleAlert, CheckCircle2, DoorOpen, Boxes,
} from "lucide-react";

// ── Types ─────────────────────────────────────────────────────────────────────

interface Room { id: number; num: string; room_type: string; }
interface SupplyPar {
  id: number; room_id: number; item_code: string; item_name: string;
  expected_qty: number; min_qty: number; unit: string;
}
interface Asset {
  id: number; room_id: number; asset_type: string; asset_name: string;
  quantity_expected: number; quantity_present: number;
  condition_status: "ok" | "damaged" | "missing";
  maintenance_notes: string | null;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

const COND_META: Record<string, { label: string; cls: string }> = {
  ok:      { label: "OK",      cls: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30" },
  damaged: { label: "Damaged", cls: "bg-amber-500/15 text-amber-400 border-amber-500/30" },
  missing: { label: "Missing", cls: "bg-red-500/15 text-red-400 border-red-500/30" },
};

function CondBadge({ status }: { status: string }) {
  const m = COND_META[status] ?? COND_META.ok;
  return <span className={`text-[10px] font-semibold px-2 py-0.5 rounded border ${m.cls}`}>{m.label}</span>;
}

// ── Supply Pars Table ─────────────────────────────────────────────────────────

function SupplyParsTable({ roomId }: { roomId: number }) {
  const qc = useQueryClient();
  const { toast } = useToast();
  const [edits, setEdits] = useState<Record<number, { expected_qty?: number; min_qty?: number }>>({});

  const { data: rows = [], isLoading } = useQuery<SupplyPar[]>({
    queryKey: ["/inventory/supply-pars", roomId],
    queryFn: () => fetchApi(`/inventory/supply-pars?room_id=${roomId}`),
    enabled: !!roomId,
  });

  const save = useMutation({
    mutationFn: ({ id, patch }: { id: number; patch: Record<string, unknown> }) =>
      fetchApi(`/inventory/supply-pars/${id}`, { method: "PATCH", body: JSON.stringify(patch) }),
    onSuccess: (_, { id }) => {
      qc.invalidateQueries({ queryKey: ["/inventory/supply-pars", roomId] });
      setEdits(e => { const n = { ...e }; delete n[id]; return n; });
      toast({ title: "Supply par updated" });
    },
  });

  if (isLoading) return <Skeleton className="h-40" />;
  if (!rows.length) return (
    <p className="text-sm text-muted-foreground py-6 text-center">No supply pars configured for this room.</p>
  );

  return (
    <div className="overflow-x-auto rounded-md border border-border/50">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border/50 bg-muted/40">
            <th className="text-left text-xs font-medium text-muted-foreground px-3 py-2">Item</th>
            <th className="text-center text-xs font-medium text-muted-foreground px-3 py-2 w-28">Expected</th>
            <th className="text-center text-xs font-medium text-muted-foreground px-3 py-2 w-28">Minimum</th>
            <th className="text-left text-xs font-medium text-muted-foreground px-3 py-2 w-20">Unit</th>
            <th className="w-16 px-2 py-2" />
          </tr>
        </thead>
        <tbody>
          {rows.map(row => {
            const e = edits[row.id] ?? {};
            const isDirty = e.expected_qty !== undefined || e.min_qty !== undefined;
            return (
              <tr key={row.id} className="border-b border-border/40 last:border-0 hover:bg-muted/20">
                <td className="px-3 py-2">
                  <div className="font-medium text-foreground">{row.item_name}</div>
                  <div className="text-[10px] text-muted-foreground font-mono">{row.item_code}</div>
                </td>
                <td className="px-3 py-2 text-center">
                  <Input
                    type="number" min={0}
                    className="h-7 w-20 text-sm text-center mx-auto"
                    value={e.expected_qty ?? row.expected_qty}
                    onChange={ev => setEdits(ed => ({
                      ...ed, [row.id]: { ...ed[row.id], expected_qty: +ev.target.value }
                    }))}
                  />
                </td>
                <td className="px-3 py-2 text-center">
                  <Input
                    type="number" min={0}
                    className="h-7 w-20 text-sm text-center mx-auto"
                    value={e.min_qty ?? row.min_qty}
                    onChange={ev => setEdits(ed => ({
                      ...ed, [row.id]: { ...ed[row.id], min_qty: +ev.target.value }
                    }))}
                  />
                </td>
                <td className="px-3 py-2 text-xs text-muted-foreground font-mono">{row.unit}</td>
                <td className="px-2 py-2 text-right">
                  {isDirty && (
                    <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-primary hover:bg-primary/10"
                      onClick={() => save.mutate({ id: row.id, patch: e })}>
                      <Save className="w-3.5 h-3.5" />
                    </Button>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

// ── Assets Table ──────────────────────────────────────────────────────────────

function AssetsTable({ roomId }: { roomId: number }) {
  const qc = useQueryClient();
  const { toast } = useToast();
  const [edits, setEdits] = useState<Record<number, { quantity_present?: number; condition_status?: string }>>({});

  const { data: rows = [], isLoading } = useQuery<Asset[]>({
    queryKey: ["/inventory/assets", roomId],
    queryFn: () => fetchApi(`/inventory/assets?room_id=${roomId}`),
    enabled: !!roomId,
  });

  const save = useMutation({
    mutationFn: ({ id, patch }: { id: number; patch: Record<string, unknown> }) =>
      fetchApi(`/inventory/assets/${id}`, { method: "PATCH", body: JSON.stringify(patch) }),
    onSuccess: (_, { id }) => {
      qc.invalidateQueries({ queryKey: ["/inventory/assets", roomId] });
      setEdits(e => { const n = { ...e }; delete n[id]; return n; });
      toast({ title: "Asset updated" });
    },
  });

  if (isLoading) return <Skeleton className="h-40" />;
  if (!rows.length) return (
    <p className="text-sm text-muted-foreground py-6 text-center">No assets recorded for this room.</p>
  );

  return (
    <div className="overflow-x-auto rounded-md border border-border/50">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border/50 bg-muted/40">
            <th className="text-left text-xs font-medium text-muted-foreground px-3 py-2">Asset</th>
            <th className="text-center text-xs font-medium text-muted-foreground px-3 py-2 w-28">Present / Expected</th>
            <th className="text-left text-xs font-medium text-muted-foreground px-3 py-2 w-36">Condition</th>
            <th className="w-16 px-2 py-2" />
          </tr>
        </thead>
        <tbody>
          {rows.map(row => {
            const e = edits[row.id] ?? {};
            const isDirty = e.quantity_present !== undefined || e.condition_status !== undefined;
            const cond = e.condition_status ?? row.condition_status;
            const present = e.quantity_present ?? row.quantity_present;
            const missing = row.quantity_expected - present;
            return (
              <tr key={row.id} className="border-b border-border/40 last:border-0 hover:bg-muted/20">
                <td className="px-3 py-2">
                  <div className="font-medium text-foreground">{row.asset_name}</div>
                  <div className="text-[10px] text-muted-foreground font-mono">{row.asset_type}</div>
                </td>
                <td className="px-3 py-2 text-center">
                  <div className="flex items-center justify-center gap-1">
                    <Input
                      type="number" min={0}
                      className="h-7 w-16 text-sm text-center"
                      value={present}
                      onChange={ev => setEdits(ed => ({
                        ...ed, [row.id]: { ...ed[row.id], quantity_present: +ev.target.value }
                      }))}
                    />
                    <span className="text-muted-foreground text-xs">/ {row.quantity_expected}</span>
                  </div>
                  {missing > 0 && (
                    <div className="text-[10px] text-red-400 text-center mt-0.5">
                      {missing} missing
                    </div>
                  )}
                </td>
                <td className="px-3 py-2">
                  <Select value={cond}
                    onValueChange={v => setEdits(ed => ({
                      ...ed, [row.id]: { ...ed[row.id], condition_status: v }
                    }))}>
                    <SelectTrigger className="h-7 text-xs w-32">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ok">OK</SelectItem>
                      <SelectItem value="damaged">Damaged</SelectItem>
                      <SelectItem value="missing">Missing</SelectItem>
                    </SelectContent>
                  </Select>
                </td>
                <td className="px-2 py-2 text-right">
                  {isDirty && (
                    <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-primary hover:bg-primary/10"
                      onClick={() => save.mutate({ id: row.id, patch: e })}>
                      <Save className="w-3.5 h-3.5" />
                    </Button>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────

const TABS = ["supply-pars", "assets"] as const;
type TabId = (typeof TABS)[number];

export default function Inventory() {
  const [selectedRoomId, setSelectedRoomId] = useState<string>("");
  const [tab, setTab] = useState<TabId>("supply-pars");

  const { data: rooms = [], isLoading: loadingRooms } = useQuery<Room[]>({
    queryKey: ["/inventory/rooms"],
    queryFn: () => fetchApi("/inventory/rooms"),
  });

  const { data: summary } = useQuery({
    queryKey: ["/inventory/summary"],
    queryFn: () => fetchApi("/inventory/summary"),
  });

  const sum = summary as any;
  const roomId = selectedRoomId ? +selectedRoomId : null;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Package className="w-6 h-6 text-primary" /> Supply Pars & Assets
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Manage room-level supply quantities and asset condition tracking
          </p>
        </div>
      </div>

      {/* KPI strip */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: "Rooms",           val: sum?.totalRooms ?? "—",       icon: <DoorOpen className="w-4 h-4 text-cyan-400" /> },
          { label: "Total Assets",    val: sum?.totalAssets ?? "—",      icon: <Boxes className="w-4 h-4 text-blue-400" /> },
          { label: "Missing Assets",  val: sum?.missingAssets ?? "—",    icon: <TriangleAlert className="w-4 h-4 text-red-400" /> },
          { label: "Condition Issues",val: sum?.conditionIssues ?? "—",  icon: <TriangleAlert className="w-4 h-4 text-amber-400" /> },
        ].map(({ label, val, icon }) => (
          <Card key={label} className="border-border/50 bg-card/60">
            <CardContent className="p-4 flex items-center gap-3">
              {icon}
              <div>
                <div className="text-xl font-bold">{val}</div>
                <div className="text-xs text-muted-foreground">{label}</div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Room selector */}
      <Card className="border-border/50 bg-card/60">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <DoorOpen className="w-4 h-4 text-primary" /> Select Room
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          {loadingRooms ? (
            <Skeleton className="h-9 w-64" />
          ) : (
            <Select value={selectedRoomId} onValueChange={setSelectedRoomId}>
              <SelectTrigger className="w-64 h-9 text-sm">
                <SelectValue placeholder="Choose a room to inspect…" />
              </SelectTrigger>
              <SelectContent>
                {rooms.map(r => (
                  <SelectItem key={r.id} value={String(r.id)}>
                    Room {r.num} — {r.room_type}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </CardContent>
      </Card>

      {/* Tabs + tables */}
      {roomId && (
        <div className="space-y-4">
          <div className="flex items-center gap-1 border-b border-border/50">
            {[
              { id: "supply-pars" as const, label: "Supply Pars" },
              { id: "assets"      as const, label: "Room Assets" },
            ].map(t => (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors ${
                  tab === t.id
                    ? "border-primary text-primary"
                    : "border-transparent text-muted-foreground hover:text-foreground"
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>

          {tab === "supply-pars" ? (
            <div className="space-y-3">
              <p className="text-xs text-muted-foreground">
                Edit expected and minimum quantities. Changes save on click.
              </p>
              <SupplyParsTable roomId={roomId} />
            </div>
          ) : (
            <div className="space-y-3">
              <p className="text-xs text-muted-foreground">
                Track present quantity and condition of room assets. Changes save on click.
              </p>
              <AssetsTable roomId={roomId} />
            </div>
          )}
        </div>
      )}

      {!roomId && !loadingRooms && (
        <Card className="border-border/50 bg-card/60">
          <CardContent className="py-16 text-center">
            <Package className="w-10 h-10 text-primary/40 mx-auto mb-3" />
            <p className="text-sm font-medium">Select a room above to view its inventory</p>
            <p className="text-xs text-muted-foreground mt-1">
              Supply pars and asset details are tracked per room.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
