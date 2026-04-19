import { useState, useEffect, useCallback } from "react";
import { fetchApi } from "@/lib/api-client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import {
  Shield, Building2, Users, KeyRound, Wand2, LayoutDashboard,
  CheckCircle2, XCircle, AlertTriangle, ChevronRight, Plus,
  Pencil, Trash2, RefreshCw, Eye, UserCheck, UserX, Lock,
  Globe, MapPin, Check, X, Info, Filter, Search, ChevronDown, ChevronUp,
  Activity, Clock, ArrowRight, ToggleLeft,
} from "lucide-react";

// ── Types ──────────────────────────────────────────────────────────────────────
interface PlatformSummary {
  businesses: number; users: number; employees: number;
  assignments: number; locations: number; pending_invites: number;
  recent_audit: AuditRow[];
}
interface AuditRow {
  action: string; entity_type: string; actor_user_id: string;
  actor_name: string | null; details_after: string | null; created_at: string;
}
interface BusinessRow {
  business_id: string; display_name: string | null; primary_color: string | null;
  accent_color: string | null; enabled_modules: string; logo_url: string | null;
  location_count: number; employee_count: number;
}
interface UserRow {
  id: string; email: string; first_name: string; last_name: string;
  job_title: string | null; role: string; phone: string | null;
  is_active: number; has_local_cred: number; link_status: string | null;
  ep_name: string | null; ep_code: string | null; primary_role: string | null;
  all_roles: string | null;
}
interface RoleTemplate {
  id: string; name: string; description: string;
  permissions: string[]; color: string; is_system: boolean;
}
interface PermissionDef { key: string; label: string; group: string; }
interface Assignment {
  id: string; employee_name: string; job_title: string | null;
  department: string | null; employee_code: string | null;
  role_name: string; scope_type: string; location_name: string | null;
  permissions: string; employment_status: string | null; is_active: number;
  business_id: string;
}
interface UserPermView {
  user: UserRow; links: any[]; assignments: Assignment[];
  effective_permissions: string[];
}

// ── Constants ──────────────────────────────────────────────────────────────────
const ROLE_COLOR: Record<string, string> = {
  owner: "text-red-400 bg-red-500/10 border-red-500/30",
  supervisor: "text-amber-400 bg-amber-500/10 border-amber-500/30",
  staff: "text-blue-400 bg-blue-500/10 border-blue-500/30",
  concierge: "text-green-400 bg-green-500/10 border-green-500/30",
  maintenance: "text-orange-400 bg-orange-500/10 border-orange-500/30",
  housekeeping: "text-violet-400 bg-violet-500/10 border-violet-500/30",
};

const ALL_MODULE_IDS = [
  "dashboard","rooms","property-map","tasks","assignments","shifts",
  "timeline","users","employees","studio","promotions","analytics",
  "inventory","inspections","maintenance","communications","session",
];

function relTime(iso: string) {
  const s = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (s < 60) return "just now";
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  return `${Math.floor(s / 86400)}d ago`;
}

function RolePill({ role }: { role: string }) {
  const cls = ROLE_COLOR[role] ?? "text-muted-foreground bg-muted border-border";
  return <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium border ${cls}`}>{role}</span>;
}

// ── Sub-navigation ─────────────────────────────────────────────────────────────
type Section = "overview" | "businesses" | "users" | "permissions" | "wizard";

const NAV_ITEMS: { id: Section; label: string; icon: React.ElementType; desc: string }[] = [
  { id: "overview",     label: "Overview",     icon: LayoutDashboard, desc: "Platform stats & audit log" },
  { id: "businesses",   label: "Businesses",   icon: Building2,       desc: "Manage registered properties" },
  { id: "users",        label: "Users",        icon: Users,           desc: "Accounts & credentials" },
  { id: "permissions",  label: "Permissions",  icon: KeyRound,        desc: "Roles, matrix & assignments" },
  { id: "wizard",       label: "New Property", icon: Wand2,           desc: "Setup wizard" },
];

// ══════════════════════════════════════════════════════════════════════════════
// OVERVIEW
// ══════════════════════════════════════════════════════════════════════════════
function OverviewSection() {
  const [data, setData] = useState<PlatformSummary | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchApi<PlatformSummary>("/admin/summary").then(setData).finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="text-muted-foreground text-sm py-8 text-center">Loading platform summary…</div>;
  if (!data) return null;

  const stats = [
    { label: "Businesses",       value: data.businesses,     icon: Building2,   color: "text-amber-400" },
    { label: "Active Users",     value: data.users,          icon: Users,        color: "text-blue-400" },
    { label: "Employee Profiles",value: data.employees,      icon: UserCheck,    color: "text-green-400" },
    { label: "Role Assignments", value: data.assignments,    icon: KeyRound,     color: "text-violet-400" },
    { label: "Locations",        value: data.locations,      icon: MapPin,       color: "text-cyan-400" },
    { label: "Pending Invites",  value: data.pending_invites,icon: Clock,        color: "text-orange-400" },
  ];

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-3 gap-3">
        {stats.map(s => (
          <div key={s.label} className="bg-card border border-border/50 rounded-lg p-4 flex items-center gap-3">
            <div className={`p-2 rounded-md bg-muted ${s.color}`}>
              <s.icon className="w-4 h-4" />
            </div>
            <div>
              <p className="text-2xl font-bold">{s.value}</p>
              <p className="text-xs text-muted-foreground">{s.label}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="bg-card border border-border/50 rounded-lg overflow-hidden">
        <div className="flex items-center gap-2 px-4 py-3 border-b border-border/50">
          <Activity className="w-4 h-4 text-muted-foreground" />
          <span className="text-sm font-semibold">Recent Audit Events</span>
        </div>
        <div className="divide-y divide-border/30">
          {data.recent_audit.length === 0 && (
            <p className="text-xs text-muted-foreground px-4 py-3">No audit events yet.</p>
          )}
          {data.recent_audit.map((ev, i) => (
            <div key={i} className="flex items-start gap-3 px-4 py-2.5 hover:bg-muted/30 transition-colors">
              <div className="mt-0.5 w-2 h-2 rounded-full bg-primary/60 shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-xs text-foreground">
                  <span className="font-medium text-primary">{ev.action}</span>
                  {" on "}<span className="text-muted-foreground">{ev.entity_type}</span>
                  {ev.actor_name && <> by <span className="font-medium">{ev.actor_name}</span></>}
                </p>
                {ev.details_after && (
                  <p className="text-[10px] text-muted-foreground truncate mt-0.5">
                    {(() => { try { return JSON.stringify(JSON.parse(ev.details_after)).slice(0,100); } catch { return ev.details_after?.slice(0,100); } })()}
                  </p>
                )}
              </div>
              <span className="text-[10px] text-muted-foreground shrink-0">{relTime(ev.created_at)}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// BUSINESSES
// ══════════════════════════════════════════════════════════════════════════════
function BusinessesSection() {
  const [rows, setRows] = useState<BusinessRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<BusinessRow | null>(null);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState<Partial<BusinessRow & { enabled_modules_arr: string[] }>>({});
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();

  const load = useCallback(() => {
    setLoading(true);
    fetchApi<BusinessRow[]>("/admin/businesses").then(setRows).finally(() => setLoading(false));
  }, []);
  useEffect(() => { load(); }, [load]);

  function openEdit(b: BusinessRow) {
    let mods: string[] = [];
    try { mods = JSON.parse(b.enabled_modules); } catch {}
    setForm({ ...b, enabled_modules_arr: mods });
    setEditing(b);
  }

  function openCreate() {
    setForm({ primary_color: "#7c3aed", accent_color: "#d97706", enabled_modules_arr: ALL_MODULE_IDS.slice(0, 10) });
    setCreating(true);
  }

  async function save() {
    setSaving(true);
    try {
      const body: any = { ...form, enabled_modules: form.enabled_modules_arr };
      delete body.enabled_modules_arr;
      if (editing) {
        await fetchApi(`/admin/businesses/${editing.business_id}`, { method: "PATCH", body: JSON.stringify(body) });
        toast({ title: "Business updated" });
      } else {
        await fetchApi("/admin/businesses", { method: "POST", body: JSON.stringify(body) });
        toast({ title: "Business created" });
      }
      setEditing(null); setCreating(false); load();
    } catch { toast({ title: "Save failed", variant: "destructive" }); }
    finally { setSaving(false); }
  }

  const toggleMod = (mod: string) => {
    setForm(f => {
      const arr = f.enabled_modules_arr ?? [];
      return { ...f, enabled_modules_arr: arr.includes(mod) ? arr.filter(m => m !== mod) : [...arr, mod] };
    });
  };

  const isOpen = !!(editing || creating);
  const dialogTitle = editing ? `Edit: ${editing.display_name ?? editing.business_id}` : "Create New Business";

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">All registered business entities on this platform.</p>
        <Button size="sm" onClick={openCreate} className="gap-1.5">
          <Plus className="w-3.5 h-3.5" /> New Business
        </Button>
      </div>

      {loading ? <div className="text-muted-foreground text-sm py-6 text-center">Loading…</div> : (
        <div className="rounded-lg border border-border/50 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-muted/40 border-b border-border/50">
              <tr>
                {["Business ID","Display Name","Locations","Employees","Modules","Color",""].map(h => (
                  <th key={h} className="px-3 py-2 text-left text-xs font-medium text-muted-foreground">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-border/30">
              {rows.map(b => {
                let modCount = 0;
                try { modCount = JSON.parse(b.enabled_modules).length; } catch {}
                return (
                  <tr key={b.business_id} className="hover:bg-muted/20 transition-colors">
                    <td className="px-3 py-2.5 font-mono text-xs text-muted-foreground">{b.business_id}</td>
                    <td className="px-3 py-2.5 font-medium">{b.display_name ?? <span className="italic text-muted-foreground">unnamed</span>}</td>
                    <td className="px-3 py-2.5 text-center"><Badge variant="outline">{b.location_count}</Badge></td>
                    <td className="px-3 py-2.5 text-center"><Badge variant="outline">{b.employee_count}</Badge></td>
                    <td className="px-3 py-2.5 text-center"><Badge variant="secondary">{modCount} active</Badge></td>
                    <td className="px-3 py-2.5">
                      <div className="flex items-center gap-1.5">
                        <div className="w-3 h-3 rounded-full border border-border" style={{ background: b.primary_color ?? "#888" }} />
                        <div className="w-3 h-3 rounded-full border border-border" style={{ background: b.accent_color ?? "#888" }} />
                      </div>
                    </td>
                    <td className="px-3 py-2.5">
                      <Button variant="ghost" size="sm" onClick={() => openEdit(b)}>
                        <Pencil className="w-3.5 h-3.5" />
                      </Button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      <Dialog open={isOpen} onOpenChange={v => { if (!v) { setEditing(null); setCreating(false); } }}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{dialogTitle}</DialogTitle>
            <DialogDescription>Configure business settings and module access.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            {creating && (
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs">Business ID <span className="text-destructive">*</span></Label>
                  <Input placeholder="e.g. biz-ocean-view" className="h-8 text-xs font-mono"
                    value={form.business_id ?? ""} onChange={e => setForm(f => ({ ...f, business_id: e.target.value }))} />
                  <p className="text-[10px] text-muted-foreground">Unique slug, lowercase, hyphens only</p>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Display Name <span className="text-destructive">*</span></Label>
                  <Input placeholder="Ocean View Suites" className="h-8 text-xs"
                    value={form.display_name ?? ""} onChange={e => setForm(f => ({ ...f, display_name: e.target.value }))} />
                </div>
              </div>
            )}
            {editing && (
              <div className="space-y-1.5">
                <Label className="text-xs">Display Name</Label>
                <Input className="h-8 text-xs" value={form.display_name ?? ""}
                  onChange={e => setForm(f => ({ ...f, display_name: e.target.value }))} />
              </div>
            )}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs">Primary Color</Label>
                <div className="flex items-center gap-2">
                  <input type="color" className="w-8 h-8 rounded cursor-pointer border border-border bg-transparent"
                    value={form.primary_color ?? "#7c3aed"} onChange={e => setForm(f => ({ ...f, primary_color: e.target.value }))} />
                  <Input className="h-8 text-xs font-mono flex-1" value={form.primary_color ?? "#7c3aed"}
                    onChange={e => setForm(f => ({ ...f, primary_color: e.target.value }))} />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Accent Color</Label>
                <div className="flex items-center gap-2">
                  <input type="color" className="w-8 h-8 rounded cursor-pointer border border-border bg-transparent"
                    value={form.accent_color ?? "#d97706"} onChange={e => setForm(f => ({ ...f, accent_color: e.target.value }))} />
                  <Input className="h-8 text-xs font-mono flex-1" value={form.accent_color ?? "#d97706"}
                    onChange={e => setForm(f => ({ ...f, accent_color: e.target.value }))} />
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label className="text-xs">Enabled Modules</Label>
                <div className="flex items-center gap-2">
                  <Button variant="ghost" size="sm" className="h-6 text-xs px-2"
                    onClick={() => setForm(f => ({ ...f, enabled_modules_arr: [...ALL_MODULE_IDS] }))}>All</Button>
                  <Button variant="ghost" size="sm" className="h-6 text-xs px-2"
                    onClick={() => setForm(f => ({ ...f, enabled_modules_arr: [] }))}>None</Button>
                </div>
              </div>
              <div className="grid grid-cols-3 gap-1.5 p-3 rounded-md border border-border/50 bg-muted/20">
                {ALL_MODULE_IDS.map(mod => {
                  const active = (form.enabled_modules_arr ?? []).includes(mod);
                  return (
                    <button key={mod} onClick={() => toggleMod(mod)}
                      className={`flex items-center gap-1.5 px-2 py-1.5 rounded text-xs transition-colors text-left ${
                        active ? "bg-primary/15 text-primary border border-primary/30" : "bg-card border border-border/40 text-muted-foreground hover:border-border"
                      }`}>
                      {active ? <Check className="w-3 h-3 shrink-0" /> : <X className="w-3 h-3 shrink-0 opacity-30" />}
                      {mod}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setEditing(null); setCreating(false); }}>Cancel</Button>
            <Button onClick={save} disabled={saving}>{saving ? "Saving…" : "Save"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// USERS
// ══════════════════════════════════════════════════════════════════════════════
function UsersSection() {
  const [rows, setRows]     = useState<UserRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");
  const [editing, setEditing] = useState<UserRow | null>(null);
  const [creating, setCreating] = useState(false);
  const [form, setForm]     = useState<Partial<UserRow & { password: string }>>({});
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();

  const load = useCallback(() => {
    setLoading(true);
    fetchApi<UserRow[]>("/admin/users").then(setRows).finally(() => setLoading(false));
  }, []);
  useEffect(() => { load(); }, [load]);

  const filtered = rows.filter(u => {
    const q = filter.toLowerCase();
    const matchQ = !q || `${u.first_name} ${u.last_name} ${u.email} ${u.job_title ?? ""}`.toLowerCase().includes(q);
    const matchR = roleFilter === "all" || (u.primary_role ?? u.role) === roleFilter || u.role === roleFilter;
    return matchQ && matchR;
  });

  function openEdit(u: UserRow) { setForm({ ...u, password: "" }); setEditing(u); }
  function openCreate() { setForm({ role: "staff", password: "" }); setCreating(true); }

  async function save() {
    setSaving(true);
    try {
      const body: any = { ...form };
      if (!body.password) delete body.password;
      if (editing) {
        await fetchApi(`/admin/users/${editing.id}`, { method: "PATCH", body: JSON.stringify(body) });
        toast({ title: "User updated" });
      } else {
        await fetchApi("/admin/users", { method: "POST", body: JSON.stringify(body) });
        toast({ title: "User created" });
      }
      setEditing(null); setCreating(false); load();
    } catch { toast({ title: "Save failed", variant: "destructive" }); }
    finally { setSaving(false); }
  }

  async function toggleActive(u: UserRow) {
    await fetchApi(`/admin/users/${u.id}`, { method: "PATCH", body: JSON.stringify({ is_active: u.is_active ? 0 : 1 }) });
    toast({ title: u.is_active ? "User deactivated" : "User reactivated" });
    load();
  }

  const isOpen = !!(editing || creating);

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-2.5 top-2 w-3.5 h-3.5 text-muted-foreground" />
          <Input placeholder="Search name, email, title…" className="h-8 pl-8 text-xs"
            value={filter} onChange={e => setFilter(e.target.value)} />
        </div>
        <Select value={roleFilter} onValueChange={setRoleFilter}>
          <SelectTrigger className="h-8 w-32 text-xs"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All roles</SelectItem>
            {["owner","supervisor","staff","concierge","maintenance","housekeeping"].map(r => (
              <SelectItem key={r} value={r}>{r}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button size="sm" onClick={openCreate} className="gap-1.5 h-8">
          <Plus className="w-3.5 h-3.5" /> New User
        </Button>
      </div>

      {loading ? <div className="text-muted-foreground text-sm py-6 text-center">Loading…</div> : (
        <div className="rounded-lg border border-border/50 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-muted/40 border-b border-border/50">
              <tr>
                {["Name","Email","Role","Job Title","EP Link","Cred","Status",""].map(h => (
                  <th key={h} className="px-3 py-2 text-left text-xs font-medium text-muted-foreground">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-border/30">
              {filtered.map(u => (
                <tr key={u.id} className={`hover:bg-muted/20 transition-colors ${!u.is_active ? "opacity-50" : ""}`}>
                  <td className="px-3 py-2.5 font-medium text-sm">{u.first_name} {u.last_name}</td>
                  <td className="px-3 py-2.5 text-xs text-muted-foreground">{u.email}</td>
                  <td className="px-3 py-2.5"><RolePill role={u.primary_role ?? u.role} /></td>
                  <td className="px-3 py-2.5 text-xs text-muted-foreground">{u.job_title ?? "—"}</td>
                  <td className="px-3 py-2.5">
                    {u.link_status === "ACTIVE"
                      ? <span className="flex items-center gap-1 text-xs text-green-400"><CheckCircle2 className="w-3 h-3" />{u.ep_code}</span>
                      : <span className="flex items-center gap-1 text-xs text-muted-foreground"><XCircle className="w-3 h-3" />unlinked</span>}
                  </td>
                  <td className="px-3 py-2.5">
                    {u.has_local_cred
                      ? <span className="flex items-center gap-1 text-xs text-blue-400"><Lock className="w-3 h-3" />local</span>
                      : <span className="text-xs text-muted-foreground">SSO</span>}
                  </td>
                  <td className="px-3 py-2.5">
                    <Badge variant={u.is_active ? "default" : "secondary"} className="text-xs">
                      {u.is_active ? "Active" : "Inactive"}
                    </Badge>
                  </td>
                  <td className="px-3 py-2.5">
                    <div className="flex items-center gap-1">
                      <Button variant="ghost" size="sm" className="h-6 w-6 p-0" onClick={() => openEdit(u)}>
                        <Pencil className="w-3 h-3" />
                      </Button>
                      <Button variant="ghost" size="sm" className="h-6 w-6 p-0" onClick={() => toggleActive(u)}>
                        {u.is_active ? <UserX className="w-3 h-3 text-orange-400" /> : <UserCheck className="w-3 h-3 text-green-400" />}
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="px-3 py-2 bg-muted/20 border-t border-border/30 text-xs text-muted-foreground">
            {filtered.length} of {rows.length} users
          </div>
        </div>
      )}

      <Dialog open={isOpen} onOpenChange={v => { if (!v) { setEditing(null); setCreating(false); } }}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editing ? `Edit: ${editing.first_name} ${editing.last_name}` : "Create New User"}</DialogTitle>
            <DialogDescription>Manage user account details and credentials.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs">First Name <span className="text-destructive">*</span></Label>
                <Input className="h-8 text-xs" value={form.first_name ?? ""}
                  onChange={e => setForm(f => ({ ...f, first_name: e.target.value }))} />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Last Name <span className="text-destructive">*</span></Label>
                <Input className="h-8 text-xs" value={form.last_name ?? ""}
                  onChange={e => setForm(f => ({ ...f, last_name: e.target.value }))} />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Email <span className="text-destructive">*</span></Label>
              <Input type="email" className="h-8 text-xs" value={form.email ?? ""}
                onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                disabled={!!editing} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs">Platform Role</Label>
                <Select value={form.role ?? "staff"} onValueChange={v => setForm(f => ({ ...f, role: v }))}>
                  <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {["owner","supervisor","staff","concierge","maintenance","housekeeping"].map(r => (
                      <SelectItem key={r} value={r}>{r}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Job Title</Label>
                <Input className="h-8 text-xs" value={form.job_title ?? ""}
                  onChange={e => setForm(f => ({ ...f, job_title: e.target.value }))} />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">{editing ? "New Password (leave blank to keep)" : "Password"}</Label>
              <Input type="password" className="h-8 text-xs" placeholder={editing ? "••••••••" : "Set login password"}
                value={form.password ?? ""} onChange={e => setForm(f => ({ ...f, password: e.target.value }))} />
              <p className="text-[10px] text-muted-foreground">Sets a local credential override. Leave blank to use SSO only.</p>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Phone</Label>
              <Input className="h-8 text-xs" value={form.phone ?? ""}
                onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setEditing(null); setCreating(false); }}>Cancel</Button>
            <Button onClick={save} disabled={saving}>{saving ? "Saving…" : "Save"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// PERMISSIONS
// ══════════════════════════════════════════════════════════════════════════════
type PermTab = "matrix" | "assignments" | "user-view";

function PermissionsSection() {
  const [tab, setTab] = useState<PermTab>("matrix");

  return (
    <div className="space-y-4">
      <div className="flex gap-1 p-1 bg-muted/40 rounded-lg w-fit">
        {([
          { id: "matrix" as PermTab,      label: "Role Matrix" },
          { id: "assignments" as PermTab, label: "Assignments" },
          { id: "user-view" as PermTab,   label: "User View" },
        ]).map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            className={`px-3 py-1.5 text-xs rounded-md font-medium transition-colors ${
              tab === t.id ? "bg-card border border-border/60 text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
            }`}>{t.label}</button>
        ))}
      </div>
      {tab === "matrix"      && <RoleMatrix />}
      {tab === "assignments" && <AssignmentsView />}
      {tab === "user-view"   && <UserPermView />}
    </div>
  );
}

// Role × Permission matrix ────────────────────────────────────────────────────
function RoleMatrix() {
  const [data, setData] = useState<{ roles: RoleTemplate[]; permissions: PermissionDef[] } | null>(null);
  const [loading, setLoading] = useState(true);
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());

  useEffect(() => {
    fetchApi<{ roles: RoleTemplate[]; permissions: PermissionDef[] }>("/admin/permissions/matrix").then(d => {
      setData(d);
      const groups = new Set<string>(d.permissions.map((p: PermissionDef) => p.group));
      setExpandedGroups(groups);
    }).finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="text-muted-foreground text-sm py-6 text-center">Loading…</div>;
  if (!data) return null;

  const groups = Array.from(new Set(data.permissions.map(p => p.group)));

  function roleHas(role: RoleTemplate, perm: string) {
    return role.permissions.includes("*") || role.permissions.includes(perm);
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 p-3 rounded-lg bg-amber-500/5 border border-amber-500/20">
        <Info className="w-4 h-4 text-amber-400 shrink-0" />
        <p className="text-xs text-muted-foreground">
          These are the <strong className="text-foreground">default permission sets</strong> for each built-in role.
          Individual employee role assignments may have custom permission lists that override these defaults.
          Edit them in the <strong className="text-foreground">Assignments</strong> tab.
        </p>
      </div>

      <div className="rounded-lg border border-border/50 overflow-x-auto">
        <table className="w-full text-xs">
          <thead className="bg-muted/40 border-b border-border/50">
            <tr>
              <th className="px-3 py-2.5 text-left font-medium text-muted-foreground w-48">Permission</th>
              {data.roles.map(r => (
                <th key={r.id} className="px-2 py-2.5 text-center font-medium min-w-[90px]">
                  <RolePill role={r.id} />
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {groups.map(group => {
              const perms = data.permissions.filter(p => p.group === group);
              const expanded = expandedGroups.has(group);
              return (
                <>
                  <tr key={`g-${group}`}
                    className="bg-muted/20 border-y border-border/30 cursor-pointer hover:bg-muted/40"
                    onClick={() => setExpandedGroups(prev => {
                      const s = new Set(prev);
                      if (s.has(group)) s.delete(group); else s.add(group);
                      return s;
                    })}>
                    <td colSpan={data.roles.length + 1} className="px-3 py-1.5">
                      <div className="flex items-center gap-2 text-xs font-semibold text-foreground">
                        {expanded ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
                        {group}
                        <span className="text-muted-foreground font-normal">({perms.length})</span>
                      </div>
                    </td>
                  </tr>
                  {expanded && perms.map(perm => (
                    <tr key={perm.key} className="hover:bg-muted/10 border-b border-border/20">
                      <td className="px-3 py-2">
                        <div>
                          <p className="font-medium text-foreground">{perm.label}</p>
                          <p className="font-mono text-[10px] text-muted-foreground">{perm.key}</p>
                        </div>
                      </td>
                      {data.roles.map(r => (
                        <td key={r.id} className="px-2 py-2 text-center">
                          {roleHas(r, perm.key)
                            ? <CheckCircle2 className="w-4 h-4 text-green-400 mx-auto" />
                            : <span className="w-4 h-4 block mx-auto rounded-full bg-muted/30" />}
                        </td>
                      ))}
                    </tr>
                  ))}
                </>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// Assignments view ────────────────────────────────────────────────────────────
function AssignmentsView() {
  const [rows, setRows]     = useState<Assignment[]>([]);
  const [loading, setLoading] = useState(true);
  const [roleFilter, setRoleFilter] = useState("all");
  const [deptFilter, setDeptFilter] = useState("all");
  const [scopeFilter, setScopeFilter] = useState("all");
  const [editing, setEditing] = useState<Assignment | null>(null);
  const [editPerms, setEditPerms] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const [allPerms, setAllPerms] = useState<PermissionDef[]>([]);
  const { toast } = useToast();

  const load = useCallback(() => {
    setLoading(true);
    const params: string[] = [];
    if (roleFilter !== "all") params.push(`role=${roleFilter}`);
    if (deptFilter !== "all") params.push(`dept=${deptFilter}`);
    if (scopeFilter !== "all") params.push(`scope=${scopeFilter}`);
    const qs = params.length ? `?${params.join("&")}` : "";
    fetchApi<Assignment[]>(`/admin/permissions/assignments${qs}`).then(setRows).finally(() => setLoading(false));
  }, [roleFilter, deptFilter, scopeFilter]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => {
    fetchApi<PermissionDef[]>("/admin/permissions").then(setAllPerms);
  }, []);

  const depts = Array.from(new Set(rows.map(r => r.department).filter(Boolean))) as string[];

  async function savePerms() {
    if (!editing) return;
    setSaving(true);
    try {
      await fetchApi(`/admin/permissions/assignments/${editing.id}`, {
        method: "PATCH", body: JSON.stringify({ permissions: editPerms }),
      });
      toast({ title: "Permissions updated" });
      setEditing(null); load();
    } catch { toast({ title: "Save failed", variant: "destructive" }); }
    finally { setSaving(false); }
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <Select value={roleFilter} onValueChange={setRoleFilter}>
          <SelectTrigger className="h-8 w-36 text-xs"><SelectValue placeholder="Role" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All roles</SelectItem>
            {["owner","supervisor","staff","concierge","maintenance","housekeeping"].map(r => (
              <SelectItem key={r} value={r}>{r}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={deptFilter} onValueChange={setDeptFilter}>
          <SelectTrigger className="h-8 w-36 text-xs"><SelectValue placeholder="Department" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All depts</SelectItem>
            {depts.map(d => <SelectItem key={d} value={d}>{d}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={scopeFilter} onValueChange={setScopeFilter}>
          <SelectTrigger className="h-8 w-32 text-xs"><SelectValue placeholder="Scope" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All scopes</SelectItem>
            <SelectItem value="BUSINESS">Business</SelectItem>
            <SelectItem value="LOCATION">Location</SelectItem>
          </SelectContent>
        </Select>
        <Button variant="ghost" size="sm" className="h-8 gap-1" onClick={load}>
          <RefreshCw className="w-3.5 h-3.5" />
        </Button>
        <span className="ml-auto text-xs text-muted-foreground">{rows.length} assignments</span>
      </div>

      {loading ? <div className="text-muted-foreground text-sm py-6 text-center">Loading…</div> : (
        <div className="rounded-lg border border-border/50 overflow-hidden">
          <table className="w-full text-xs">
            <thead className="bg-muted/40 border-b border-border/50">
              <tr>
                {["Employee","Code","Dept","Role","Scope","Location","Permissions",""].map(h => (
                  <th key={h} className="px-3 py-2 text-left font-medium text-muted-foreground">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-border/30">
              {rows.map(a => {
                let perms: string[] = [];
                try { perms = JSON.parse(a.permissions); } catch {}
                return (
                  <tr key={a.id} className="hover:bg-muted/20">
                    <td className="px-3 py-2 font-medium">{a.employee_name}</td>
                    <td className="px-3 py-2 font-mono text-muted-foreground">{a.employee_code ?? "—"}</td>
                    <td className="px-3 py-2 text-muted-foreground">{a.department ?? "—"}</td>
                    <td className="px-3 py-2"><RolePill role={a.role_name} /></td>
                    <td className="px-3 py-2">
                      <Badge variant="outline" className="text-[10px]">{a.scope_type}</Badge>
                    </td>
                    <td className="px-3 py-2 text-muted-foreground">{a.location_name ?? "—"}</td>
                    <td className="px-3 py-2">
                      <div className="flex flex-wrap gap-1 max-w-[200px]">
                        {perms.includes("*")
                          ? <span className="text-[10px] text-red-400 font-mono">* (all)</span>
                          : perms.slice(0, 3).map(p => (
                              <span key={p} className="text-[10px] font-mono text-muted-foreground bg-muted px-1 rounded">{p}</span>
                            ))}
                        {!perms.includes("*") && perms.length > 3 && (
                          <span className="text-[10px] text-muted-foreground">+{perms.length - 3}</span>
                        )}
                      </div>
                    </td>
                    <td className="px-3 py-2">
                      <Button variant="ghost" size="sm" className="h-6 w-6 p-0"
                        onClick={() => { setEditing(a); setEditPerms((() => { try { return JSON.parse(a.permissions); } catch { return []; } })()); }}>
                        <Pencil className="w-3 h-3" />
                      </Button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      <Dialog open={!!editing} onOpenChange={v => { if (!v) setEditing(null); }}>
        <DialogContent className="max-w-xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Permissions — {editing?.employee_name}</DialogTitle>
            <DialogDescription>
              Role: <RolePill role={editing?.role_name ?? ""} /> — Changes affect this assignment only, not the role default.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div className="flex items-center gap-2 p-2.5 rounded bg-blue-500/5 border border-blue-500/20">
              <Info className="w-3.5 h-3.5 text-blue-400 shrink-0" />
              <p className="text-[11px] text-muted-foreground">
                Custom permissions override the role defaults for this specific assignment.
              </p>
            </div>
            {Array.from(new Set(allPerms.map(p => p.group))).map(group => {
              const gPerms = allPerms.filter(p => p.group === group);
              return (
                <div key={group}>
                  <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">{group}</p>
                  <div className="grid grid-cols-2 gap-1.5">
                    {gPerms.map(p => {
                      const has = editPerms.includes("*") || editPerms.includes(p.key);
                      return (
                        <label key={p.key} className={`flex items-center gap-2 px-2 py-1.5 rounded border cursor-pointer transition-colors text-xs ${
                          has ? "bg-primary/10 border-primary/30 text-foreground" : "border-border/40 text-muted-foreground hover:border-border"
                        }`}>
                          <input type="checkbox" className="w-3 h-3 accent-primary" checked={has}
                            onChange={e => {
                              setEditPerms(prev => e.target.checked
                                ? [...prev.filter(x => x !== p.key), p.key]
                                : prev.filter(x => x !== p.key)
                              );
                            }} />
                          <span>{p.label}</span>
                          <span className="ml-auto font-mono text-[10px] text-muted-foreground">{p.key}</span>
                        </label>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditing(null)}>Cancel</Button>
            <Button onClick={savePerms} disabled={saving}>{saving ? "Saving…" : "Save Permissions"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// User permission view ─────────────────────────────────────────────────────────
function UserPermView() {
  const [users, setUsers] = useState<UserRow[]>([]);
  const [selectedId, setSelectedId] = useState<string>("");
  const [data, setData] = useState<UserPermView | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchApi<UserRow[]>("/admin/users").then(setUsers);
  }, []);

  useEffect(() => {
    if (!selectedId) return;
    setLoading(true);
    setData(null);
    fetchApi<UserPermView>(`/admin/permissions/user/${selectedId}`).then(setData).finally(() => setLoading(false));
  }, [selectedId]);

  const allPermsKeys = data?.effective_permissions ?? [];
  const hasAll = allPermsKeys.includes("*");

  return (
    <div className="space-y-4">
      <div className="space-y-1.5">
        <Label className="text-xs">Select a user to inspect their effective permissions</Label>
        <Select value={selectedId} onValueChange={setSelectedId}>
          <SelectTrigger className="h-9 text-sm">
            <SelectValue placeholder="Choose a user account…" />
          </SelectTrigger>
          <SelectContent>
            {users.map(u => (
              <SelectItem key={u.id} value={u.id}>
                {u.first_name} {u.last_name} ({u.email})
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {loading && <div className="text-muted-foreground text-sm py-4 text-center">Loading…</div>}

      {data && (
        <div className="space-y-4">
          <div className="grid grid-cols-3 gap-3">
            <div className="bg-card border border-border/50 rounded-lg p-3 space-y-1">
              <p className="text-xs text-muted-foreground">Account</p>
              <p className="text-sm font-semibold">{data.user.first_name} {data.user.last_name}</p>
              <p className="text-xs text-muted-foreground">{data.user.email}</p>
              <Badge variant={data.user.is_active ? "default" : "secondary"} className="text-xs">
                {data.user.is_active ? "Active" : "Inactive"}
              </Badge>
            </div>
            <div className="bg-card border border-border/50 rounded-lg p-3 space-y-1">
              <p className="text-xs text-muted-foreground">Employee Links</p>
              <p className="text-2xl font-bold">{data.links.length}</p>
              {data.links.map(l => (
                <p key={l.id} className="text-xs text-muted-foreground">{l.ep_name} ({l.employee_code})</p>
              ))}
            </div>
            <div className="bg-card border border-border/50 rounded-lg p-3 space-y-1">
              <p className="text-xs text-muted-foreground">Effective Permissions</p>
              {hasAll
                ? <p className="text-sm font-bold text-red-400">Wildcard (*)</p>
                : <p className="text-2xl font-bold">{allPermsKeys.length}</p>}
              <p className="text-xs text-muted-foreground">across {data.assignments.length} role assignment(s)</p>
            </div>
          </div>

          {hasAll && (
            <div className="flex items-center gap-2 p-3 rounded bg-red-500/10 border border-red-500/30">
              <AlertTriangle className="w-4 h-4 text-red-400 shrink-0" />
              <p className="text-xs text-red-300">This user has wildcard (<code>*</code>) access — all permissions are granted.</p>
            </div>
          )}

          <div className="space-y-2">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Role Assignments</p>
            {data.assignments.length === 0
              ? <p className="text-xs text-muted-foreground">No active role assignments found.</p>
              : data.assignments.map(a => {
                  let perms: string[] = [];
                  try { perms = JSON.parse(a.permissions); } catch {}
                  if (Array.isArray(a.permissions)) perms = a.permissions;
                  return (
                    <div key={a.id} className="bg-card border border-border/50 rounded-lg p-3 space-y-2">
                      <div className="flex items-center gap-2">
                        <RolePill role={a.role_name} />
                        <Badge variant="outline" className="text-[10px]">{a.scope_type}</Badge>
                        {a.location_name && <span className="text-xs text-muted-foreground">{a.location_name}</span>}
                      </div>
                      <div className="flex flex-wrap gap-1">
                        {perms.includes("*")
                          ? <span className="text-xs font-mono text-red-400 bg-red-500/10 px-1.5 py-0.5 rounded">* all permissions</span>
                          : perms.map(p => (
                              <span key={p} className="text-[10px] font-mono text-muted-foreground bg-muted px-1.5 py-0.5 rounded">{p}</span>
                            ))}
                      </div>
                    </div>
                  );
                })}
          </div>
        </div>
      )}
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// SETUP WIZARD
// ══════════════════════════════════════════════════════════════════════════════
type WizardStep = 1 | 2 | 3 | 4;

interface WizardData {
  business_id: string; display_name: string;
  address: string; timezone: string;
  primary_color: string; accent_color: string;
  enabled_modules: string[];
  admin_email: string; admin_first_name: string;
  admin_last_name: string; admin_password: string;
  admin_job_title: string;
}

const DEFAULT_MODULES = [
  "dashboard","rooms","property-map","tasks","assignments","shifts",
  "timeline","users","employees","promotions","inspections",
  "session","inventory","maintenance","communications",
];

const MODULE_DESCRIPTIONS: Record<string, string> = {
  "dashboard":    "Main overview and KPIs",
  "rooms":        "Room status and availability",
  "property-map": "Visual floor plan / map",
  "tasks":        "Housekeeping task board",
  "assignments":  "Staff-to-room assignments",
  "shifts":       "Shift scheduling & rota",
  "timeline":     "Event and booking timeline",
  "users":        "Staff user accounts",
  "employees":    "Employee profile management",
  "studio":       "AI workflow studio",
  "promotions":   "Marketing & promotions",
  "analytics":    "Reports and analytics",
  "inventory":    "Supply and par management",
  "inspections":  "Room inspection checklists",
  "maintenance":  "Maintenance request tracking",
  "communications":"Internal messaging & notices",
  "session":      "Active session overview",
};

function SetupWizard() {
  const [step, setStep] = useState<WizardStep>(1);
  const [form, setForm] = useState<WizardData>({
    business_id: "", display_name: "", address: "",
    timezone: "America/New_York", primary_color: "#7c3aed", accent_color: "#d97706",
    enabled_modules: DEFAULT_MODULES,
    admin_email: "", admin_first_name: "", admin_last_name: "",
    admin_password: "", admin_job_title: "General Manager",
  });
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<any>(null);
  const { toast } = useToast();

  function setF<K extends keyof WizardData>(k: K, v: WizardData[K]) {
    setForm(f => ({ ...f, [k]: v }));
  }

  function toggleMod(mod: string) {
    setForm(f => ({
      ...f,
      enabled_modules: f.enabled_modules.includes(mod)
        ? f.enabled_modules.filter(m => m !== mod)
        : [...f.enabled_modules, mod],
    }));
  }

  const step1Valid = form.business_id.trim() && form.display_name.trim();
  const step3Valid = form.admin_email.trim() && form.admin_first_name.trim() && form.admin_last_name.trim();

  async function submit() {
    setSubmitting(true);
    try {
      const data = await fetchApi<any>("/admin/setup/property", {
        method: "POST", body: JSON.stringify(form),
      });
      setResult(data);
      setStep(4);
      toast({ title: "Property created successfully!" });
    } catch (e: any) {
      toast({ title: e.message ?? "Setup failed", variant: "destructive" });
    } finally { setSubmitting(false); }
  }

  const steps = [
    { n: 1, label: "Property Info" },
    { n: 2, label: "Modules" },
    { n: 3, label: "Admin Account" },
    { n: 4, label: "Complete" },
  ];

  return (
    <div className="max-w-2xl space-y-6">
      {/* Step indicator */}
      <div className="flex items-center gap-0">
        {steps.map((s, i) => (
          <div key={s.n} className="flex items-center flex-1">
            <div className={`flex items-center gap-2 ${i < steps.length - 1 ? "flex-1" : ""}`}>
              <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold shrink-0 border-2 transition-colors ${
                step > s.n ? "bg-green-500 border-green-500 text-white" :
                step === s.n ? "border-primary text-primary bg-primary/10" :
                "border-border text-muted-foreground"
              }`}>
                {step > s.n ? <Check className="w-3.5 h-3.5" /> : s.n}
              </div>
              <span className={`text-xs font-medium ${step === s.n ? "text-foreground" : "text-muted-foreground"}`}>{s.label}</span>
            </div>
            {i < steps.length - 1 && (
              <div className={`h-px flex-1 mx-3 ${step > s.n ? "bg-green-500" : "bg-border"}`} />
            )}
          </div>
        ))}
      </div>

      {/* Step 1: Property Info */}
      {step === 1 && (
        <div className="space-y-4">
          <div>
            <h3 className="text-sm font-semibold">Property Information</h3>
            <p className="text-xs text-muted-foreground mt-0.5">Basic details for the new property/business.</p>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs">Business ID <span className="text-destructive">*</span></Label>
              <Input className="h-8 text-xs font-mono" placeholder="biz-ocean-view"
                value={form.business_id} onChange={e => setF("business_id", e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ""))} />
              <p className="text-[10px] text-muted-foreground">Lowercase, hyphens only. Cannot be changed later.</p>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Display Name <span className="text-destructive">*</span></Label>
              <Input className="h-8 text-xs" placeholder="Ocean View Suites"
                value={form.display_name} onChange={e => setF("display_name", e.target.value)} />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Address</Label>
            <Input className="h-8 text-xs" placeholder="123 Beachfront Ave, Miami, FL 33101"
              value={form.address} onChange={e => setF("address", e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Timezone</Label>
            <Select value={form.timezone} onValueChange={v => setF("timezone", v)}>
              <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
              <SelectContent>
                {["America/New_York","America/Chicago","America/Denver","America/Los_Angeles",
                  "America/Anchorage","Pacific/Honolulu","Europe/London","Europe/Paris","Australia/Sydney"].map(tz => (
                  <SelectItem key={tz} value={tz}>{tz}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs">Primary Color</Label>
              <div className="flex items-center gap-2">
                <input type="color" className="w-8 h-8 rounded cursor-pointer border border-border"
                  value={form.primary_color} onChange={e => setF("primary_color", e.target.value)} />
                <Input className="h-8 text-xs font-mono flex-1" value={form.primary_color}
                  onChange={e => setF("primary_color", e.target.value)} />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Accent Color</Label>
              <div className="flex items-center gap-2">
                <input type="color" className="w-8 h-8 rounded cursor-pointer border border-border"
                  value={form.accent_color} onChange={e => setF("accent_color", e.target.value)} />
                <Input className="h-8 text-xs font-mono flex-1" value={form.accent_color}
                  onChange={e => setF("accent_color", e.target.value)} />
              </div>
            </div>
          </div>
          <div className="flex justify-end pt-2">
            <Button onClick={() => setStep(2)} disabled={!step1Valid}>
              Next: Modules <ChevronRight className="w-4 h-4 ml-1" />
            </Button>
          </div>
        </div>
      )}

      {/* Step 2: Modules */}
      {step === 2 && (
        <div className="space-y-4">
          <div>
            <h3 className="text-sm font-semibold">Module Selection</h3>
            <p className="text-xs text-muted-foreground mt-0.5">
              Choose which modules to enable. All default modules are pre-selected — you can customise now or adjust later in Business Settings.
            </p>
          </div>
          <div className="flex items-center gap-2 p-3 rounded-lg bg-blue-500/5 border border-blue-500/20">
            <Info className="w-4 h-4 text-blue-400 shrink-0" />
            <p className="text-xs text-muted-foreground">
              <strong className="text-foreground">{form.enabled_modules.length} modules selected.</strong>
              {" "}Recommended defaults are pre-checked. The Studio and Analytics modules are optional premium features.
            </p>
          </div>
          <div className="grid grid-cols-2 gap-2">
            {ALL_MODULE_IDS.map(mod => {
              const active = form.enabled_modules.includes(mod);
              const isDefault = DEFAULT_MODULES.includes(mod);
              return (
                <button key={mod} onClick={() => toggleMod(mod)}
                  className={`flex items-start gap-2.5 px-3 py-2.5 rounded-lg border text-left transition-colors ${
                    active ? "bg-primary/10 border-primary/30" : "bg-card border-border/40 hover:border-border"
                  }`}>
                  <div className={`mt-0.5 w-4 h-4 rounded border flex items-center justify-center shrink-0 ${
                    active ? "bg-primary border-primary" : "border-border"
                  }`}>
                    {active && <Check className="w-2.5 h-2.5 text-primary-foreground" />}
                  </div>
                  <div>
                    <p className={`text-xs font-medium ${active ? "text-foreground" : "text-muted-foreground"}`}>
                      {mod}
                      {!isDefault && <span className="ml-1.5 text-[10px] text-amber-400 font-normal">optional</span>}
                    </p>
                    <p className="text-[10px] text-muted-foreground mt-0.5">{MODULE_DESCRIPTIONS[mod] ?? ""}</p>
                  </div>
                </button>
              );
            })}
          </div>
          <div className="flex items-center justify-between pt-2">
            <Button variant="outline" onClick={() => setStep(1)}>Back</Button>
            <Button onClick={() => setStep(3)}>
              Next: Admin Account <ChevronRight className="w-4 h-4 ml-1" />
            </Button>
          </div>
        </div>
      )}

      {/* Step 3: Admin Account */}
      {step === 3 && (
        <div className="space-y-4">
          <div>
            <h3 className="text-sm font-semibold">Admin Account</h3>
            <p className="text-xs text-muted-foreground mt-0.5">
              This creates the first owner/manager account for the property. An employee profile and role assignment will be set up automatically.
            </p>
          </div>
          <div className="p-3 rounded-lg bg-green-500/5 border border-green-500/20 space-y-1">
            <p className="text-xs font-semibold text-green-400 flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5" /> Default Role: Owner
            </p>
            <p className="text-xs text-muted-foreground">
              This account will receive the <strong className="text-foreground">Owner</strong> role with wildcard (<code>*</code>) permissions — full platform access. You can adjust role assignments after setup.
            </p>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs">First Name <span className="text-destructive">*</span></Label>
              <Input className="h-8 text-xs" value={form.admin_first_name}
                onChange={e => setF("admin_first_name", e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Last Name <span className="text-destructive">*</span></Label>
              <Input className="h-8 text-xs" value={form.admin_last_name}
                onChange={e => setF("admin_last_name", e.target.value)} />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Email <span className="text-destructive">*</span></Label>
            <Input type="email" className="h-8 text-xs" placeholder="admin@property.com"
              value={form.admin_email} onChange={e => setF("admin_email", e.target.value)} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs">Job Title</Label>
              <Input className="h-8 text-xs" value={form.admin_job_title}
                onChange={e => setF("admin_job_title", e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Login Password</Label>
              <Input type="password" className="h-8 text-xs" placeholder="Set local login credential"
                value={form.admin_password} onChange={e => setF("admin_password", e.target.value)} />
            </div>
          </div>
          <div className="flex items-center justify-between pt-2">
            <Button variant="outline" onClick={() => setStep(2)}>Back</Button>
            <Button onClick={submit} disabled={!step3Valid || submitting}>
              {submitting ? "Creating…" : "Create Property"} {!submitting && <Check className="w-4 h-4 ml-1" />}
            </Button>
          </div>
        </div>
      )}

      {/* Step 4: Complete */}
      {step === 4 && result && (
        <div className="space-y-5">
          <div className="flex flex-col items-center text-center gap-3 py-4">
            <div className="w-14 h-14 rounded-full bg-green-500/15 border border-green-500/30 flex items-center justify-center">
              <CheckCircle2 className="w-8 h-8 text-green-400" />
            </div>
            <div>
              <h3 className="text-base font-bold">Property Created!</h3>
              <p className="text-sm text-muted-foreground mt-1">
                <strong className="text-foreground">{result.display_name}</strong> is ready to use.
              </p>
            </div>
          </div>

          <div className="rounded-lg border border-border/50 overflow-hidden">
            <div className="px-4 py-2.5 bg-muted/40 border-b border-border/50">
              <p className="text-xs font-semibold">Setup Summary</p>
            </div>
            <div className="divide-y divide-border/30">
              {[
                { label: "Business ID",      value: result.business_id,          mono: true },
                { label: "Location ID",      value: result.location_id,          mono: true },
                { label: "Admin Email",      value: result.admin_email,          mono: false },
                { label: "Employee Profile", value: result.employee_profile_id,  mono: true },
                { label: "User ID",          value: result.user_id,             mono: true },
              ].map(r => (
                <div key={r.label} className="flex items-center justify-between px-4 py-2.5">
                  <span className="text-xs text-muted-foreground">{r.label}</span>
                  <span className={`text-xs ${r.mono ? "font-mono text-primary" : "font-medium"}`}>{r.value}</span>
                </div>
              ))}
            </div>
          </div>

          <Button className="w-full" onClick={() => { setStep(1); setForm({ ...form, business_id: "", display_name: "", address: "", admin_email: "", admin_first_name: "", admin_last_name: "", admin_password: "" }); setResult(null); }}>
            <Wand2 className="w-4 h-4 mr-1.5" /> Set Up Another Property
          </Button>
        </div>
      )}
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// MAIN CONSOLE EXPORT
// ══════════════════════════════════════════════════════════════════════════════
export default function SuperadminConsole() {
  const [section, setSection] = useState<Section>("overview");

  return (
    <div className="flex gap-6">
      {/* Side nav */}
      <aside className="w-48 shrink-0 space-y-1">
        <div className="flex items-center gap-2 px-3 py-2 mb-3">
          <Shield className="w-4 h-4 text-amber-400" />
          <span className="text-xs font-bold text-amber-400 uppercase tracking-wider">Platform Admin</span>
        </div>
        {NAV_ITEMS.map(item => {
          const active = section === item.id;
          const Icon = item.icon as any;
          return (
            <button key={item.id} onClick={() => setSection(item.id)} className={`w-full flex items-start gap-2.5 px-3 py-2.5 rounded-lg text-left transition-colors ${
              active ? "bg-amber-500/10 border border-amber-500/20 text-amber-400" : "hover:bg-muted/40 text-muted-foreground hover:text-foreground"
            }`}>
              <Icon className={`w-4 h-4 mt-0.5 shrink-0 ${active ? "text-amber-400" : ""}`} />
              <div>
                <p className="text-xs font-medium leading-tight">{item.label}</p>
                <p className="text-[10px] opacity-70 leading-tight mt-0.5">{item.desc}</p>
              </div>
            </button>
          );
        })}
      </aside>

      {/* Main content */}
      <main className="flex-1 min-w-0">
        {section === "overview"    && <OverviewSection />}
        {section === "businesses"  && <BusinessesSection />}
        {section === "users"       && <UsersSection />}
        {section === "permissions" && <PermissionsSection />}
        {section === "wizard"      && <SetupWizard />}
      </main>
    </div>
  );
}
