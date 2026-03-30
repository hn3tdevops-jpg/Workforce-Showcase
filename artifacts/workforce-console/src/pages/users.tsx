import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  fetchUsers,
  assignUserRole,
  removeUserRole,
  DEMO_MODE,
} from "@/lib/mock-adapter";
import { fetchApi } from "@/lib/api-client";
import type { MockUser, MockUserMembership } from "@/lib/mock-data";
import {
  Users as UsersIcon, Search, Plus, Pencil, Trash2,
  ShieldCheck, Power, PowerOff, ChevronDown, Check,
  Mail, Phone, Briefcase, Building2, MapPin, X,
  AlertTriangle, Loader2, UserPlus,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Sheet, SheetContent, SheetHeader, SheetTitle,
} from "@/components/ui/sheet";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
  DialogDescription, DialogFooter,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";

// ── Constants ─────────────────────────────────────────────────────────────────

const ROLES = ["owner", "admin", "supervisor", "member"] as const;
type Role = (typeof ROLES)[number];

const ROLE_COLORS: Record<string, string> = {
  owner:      "bg-violet-500/15 text-violet-400 border-violet-500/30",
  admin:      "bg-blue-500/15 text-blue-400 border-blue-500/30",
  supervisor: "bg-cyan-500/15 text-cyan-400 border-cyan-500/30",
  member:     "bg-emerald-500/15 text-emerald-400 border-emerald-500/30",
};

const AVATAR_COLORS: Record<string, string> = {
  owner:      "bg-violet-500/20 border-violet-500/30 text-violet-300",
  admin:      "bg-blue-500/20 border-blue-500/30 text-blue-300",
  supervisor: "bg-cyan-500/20 border-cyan-500/30 text-cyan-300",
  member:     "bg-emerald-500/20 border-emerald-500/30 text-emerald-300",
};

function roleBadgeCls(role: string) {
  return `text-[11px] px-2 py-0.5 rounded border font-medium capitalize ${ROLE_COLORS[role] ?? ROLE_COLORS.member}`;
}

function avatarCls(role: string) {
  return `rounded-full border flex items-center justify-center font-bold text-sm shrink-0 ${AVATAR_COLORS[role] ?? AVATAR_COLORS.member}`;
}

function initials(u: MockUser) {
  return [u.first_name?.[0], u.last_name?.[0]].filter(Boolean).join("").toUpperCase() || "?";
}

function primaryRole(u: MockUser): string {
  return u.memberships?.[0]?.role ?? "member";
}

// ── API helpers (optimistic, falls back gracefully) ────────────────────────────

async function apiUpdateUser(userId: string, patch: Partial<MockUser>): Promise<void> {
  if (DEMO_MODE) return;
  await fetchApi(`/users/${userId}`, { method: "PATCH", body: JSON.stringify(patch) }).catch(() => {});
}

async function apiCreateUser(payload: Partial<MockUser>): Promise<MockUser> {
  if (DEMO_MODE) {
    return {
      id: `user-${Date.now()}`,
      email: payload.email ?? "",
      first_name: payload.first_name ?? "",
      last_name: payload.last_name ?? "",
      is_active: true,
      job_title: payload.job_title,
      phone: payload.phone,
      memberships: [],
    };
  }
  return fetchApi<MockUser>("/users/", { method: "POST", body: JSON.stringify(payload) }).catch(() => ({
    id: `user-${Date.now()}`,
    email: payload.email ?? "",
    first_name: payload.first_name ?? "",
    last_name: payload.last_name ?? "",
    is_active: true,
    memberships: [],
  }));
}

async function apiDeleteUser(userId: string): Promise<void> {
  if (DEMO_MODE) return;
  await fetchApi(`/users/${userId}`, { method: "DELETE" }).catch(() => {});
}

// ── Add Employee Dialog ────────────────────────────────────────────────────────

function AddEmployeeDialog({ open, onClose, onAdd }: {
  open: boolean;
  onClose: () => void;
  onAdd: (u: MockUser) => void;
}) {
  const [firstName, setFirstName] = useState("");
  const [lastName,  setLastName]  = useState("");
  const [email,     setEmail]     = useState("");
  const [phone,     setPhone]     = useState("");
  const [jobTitle,  setJobTitle]  = useState("");
  const [role,      setRole]      = useState<Role>("member");
  const [busy,      setBusy]      = useState(false);
  const { toast } = useToast();

  const reset = () => {
    setFirstName(""); setLastName(""); setEmail("");
    setPhone(""); setJobTitle(""); setRole("member");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!firstName || !email) return;
    setBusy(true);
    try {
      const newUser = await apiCreateUser({
        email, first_name: firstName, last_name: lastName,
        job_title: jobTitle, phone, is_active: true,
      });
      newUser.memberships = [{
        business_id: "biz-silver-sands",
        business_name: "Silver Sands Motel",
        role, scope: "business",
        job_title_label: jobTitle,
      }];
      onAdd(newUser);
      toast({ title: `${firstName} ${lastName} added` });
      reset();
      onClose();
    } catch {
      toast({ title: "Failed to add employee", variant: "destructive" });
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="sm:max-w-md border-border/50 bg-card">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UserPlus className="w-4 h-4 text-primary" />
            Add Employee
          </DialogTitle>
          <DialogDescription>
            Create a new staff member account for Silver Sands Motel.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 pt-1">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="add-fn" className="text-xs text-muted-foreground">First Name *</Label>
              <Input id="add-fn" value={firstName} onChange={e => setFirstName(e.target.value)} required placeholder="Jane" className="h-9" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="add-ln" className="text-xs text-muted-foreground">Last Name</Label>
              <Input id="add-ln" value={lastName} onChange={e => setLastName(e.target.value)} placeholder="Smith" className="h-9" />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="add-email" className="text-xs text-muted-foreground">Email *</Label>
            <Input id="add-email" type="email" value={email} onChange={e => setEmail(e.target.value)} required placeholder="jane@silversands.com" className="h-9" />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="add-phone" className="text-xs text-muted-foreground">Phone</Label>
              <Input id="add-phone" value={phone} onChange={e => setPhone(e.target.value)} placeholder="+1 555 000 0000" className="h-9" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="add-title" className="text-xs text-muted-foreground">Job Title</Label>
              <Input id="add-title" value={jobTitle} onChange={e => setJobTitle(e.target.value)} placeholder="Housekeeper" className="h-9" />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">Role</Label>
            <div className="flex flex-wrap gap-2">
              {ROLES.map(r => (
                <button
                  type="button"
                  key={r}
                  onClick={() => setRole(r)}
                  className={`text-xs px-2.5 py-1 rounded border font-medium capitalize transition-all ${
                    role === r ? roleBadgeCls(r) + " ring-1 ring-current/40" : "bg-muted/40 text-muted-foreground border-border/50 hover:bg-muted"
                  }`}
                >
                  {r}
                </button>
              ))}
            </div>
          </div>

          <DialogFooter className="pt-2 gap-2">
            <Button type="button" variant="outline" onClick={onClose} disabled={busy}>Cancel</Button>
            <Button type="submit" disabled={busy || !firstName || !email}>
              {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Plus className="w-3.5 h-3.5 mr-1" />Add Employee</>}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ── Staff Drawer ───────────────────────────────────────────────────────────────

function StaffDrawer({ user, open, onClose, onUpdate, onDelete }: {
  user: MockUser | null;
  open: boolean;
  onClose: () => void;
  onUpdate: (u: MockUser) => void;
  onDelete: (id: string) => void;
}) {
  const { toast } = useToast();
  const [editing, setEditing] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [saving, setSaving] = useState(false);
  const [toggling, setToggling] = useState(false);
  const [removing, setRemoving] = useState(false);

  const [firstName, setFirstName] = useState("");
  const [lastName,  setLastName]  = useState("");
  const [phone,     setPhone]     = useState("");
  const [jobTitle,  setJobTitle]  = useState("");

  const queryClient = useQueryClient();
  const roleMutation = useMutation({
    mutationFn: ({ userId, payload }: { userId: string; payload: any }) =>
      assignUserRole(userId, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/users"] });
      toast({ title: "Role updated" });
    },
    onError: () => toast({ title: "Failed to update role", variant: "destructive" }),
  });

  if (!user) return null;

  const startEdit = () => {
    setFirstName(user.first_name);
    setLastName(user.last_name);
    setPhone(user.phone ?? "");
    setJobTitle(user.job_title ?? "");
    setEditing(true);
  };

  const cancelEdit = () => setEditing(false);

  const saveEdit = async () => {
    setSaving(true);
    const updated: MockUser = { ...user, first_name: firstName, last_name: lastName, phone, job_title: jobTitle };
    await apiUpdateUser(user.id, { first_name: firstName, last_name: lastName, phone, job_title: jobTitle });
    onUpdate(updated);
    toast({ title: "Profile saved" });
    setSaving(false);
    setEditing(false);
  };

  const toggleActive = async () => {
    setToggling(true);
    const updated: MockUser = { ...user, is_active: !user.is_active };
    await apiUpdateUser(user.id, { is_active: !user.is_active });
    onUpdate(updated);
    toast({ title: user.is_active ? "Account deactivated" : "Account activated" });
    setToggling(false);
  };

  const handleRemove = async () => {
    setRemoving(true);
    await apiDeleteUser(user.id);
    onDelete(user.id);
    toast({ title: `${user.first_name} removed from staff` });
    setRemoving(false);
    setConfirmDelete(false);
    onClose();
  };

  const ini = initials(user);
  const role = primaryRole(user);

  return (
    <>
      <Sheet open={open} onOpenChange={(v) => { if (!v) { onClose(); setEditing(false); setConfirmDelete(false); } }}>
        <SheetContent className="w-full sm:max-w-md border-border/50 bg-card flex flex-col gap-0 p-0 overflow-hidden">
          {/* ── Header ── */}
          <SheetHeader className="px-5 pt-5 pb-4 border-b border-border/50 shrink-0">
            <div className="flex items-center gap-3">
              <div className={`w-14 h-14 text-xl ${avatarCls(role)}`}>{ini}</div>
              <div className="flex-1 min-w-0">
                <SheetTitle className="text-base leading-tight">
                  {user.first_name} {user.last_name}
                </SheetTitle>
                <p className="text-xs text-muted-foreground font-mono mt-0.5 truncate">{user.email}</p>
                {user.job_title && (
                  <p className="text-xs text-muted-foreground/70 italic mt-0.5">{user.job_title}</p>
                )}
              </div>
              <div className="flex flex-col items-end gap-1.5 shrink-0">
                <span className={roleBadgeCls(role)}>{role}</span>
                <span className={`text-[10px] px-1.5 py-0.5 rounded border font-mono ${
                  user.is_active
                    ? "bg-green-500/10 text-green-400 border-green-500/30"
                    : "bg-red-500/10 text-red-400 border-red-500/30"
                }`}>
                  {user.is_active ? "ACTIVE" : "INACTIVE"}
                </span>
              </div>
            </div>
          </SheetHeader>

          {/* ── Body ── */}
          <div className="flex-1 overflow-y-auto py-5 px-5 space-y-6">

            {/* Profile section */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <p className="text-[10px] font-mono text-muted-foreground uppercase tracking-widest">Profile</p>
                {!editing && (
                  <Button variant="ghost" size="sm" className="h-7 text-xs gap-1" onClick={startEdit}>
                    <Pencil className="w-3 h-3" />Edit
                  </Button>
                )}
              </div>

              {editing ? (
                <div className="space-y-3">
                  <div className="grid grid-cols-2 gap-2">
                    <div className="space-y-1">
                      <Label className="text-[10px] text-muted-foreground">First Name</Label>
                      <Input value={firstName} onChange={e => setFirstName(e.target.value)} className="h-8 text-sm" />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-[10px] text-muted-foreground">Last Name</Label>
                      <Input value={lastName} onChange={e => setLastName(e.target.value)} className="h-8 text-sm" />
                    </div>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-[10px] text-muted-foreground">Job Title</Label>
                    <Input value={jobTitle} onChange={e => setJobTitle(e.target.value)} className="h-8 text-sm" placeholder="e.g. Housekeeper" />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-[10px] text-muted-foreground">Phone</Label>
                    <Input value={phone} onChange={e => setPhone(e.target.value)} className="h-8 text-sm" placeholder="+1 555 000 0000" />
                  </div>
                  <div className="flex gap-2 pt-1">
                    <Button variant="outline" size="sm" className="flex-1 h-8" onClick={cancelEdit} disabled={saving}>Cancel</Button>
                    <Button size="sm" className="flex-1 h-8" onClick={saveEdit} disabled={saving}>
                      {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : "Save Changes"}
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="space-y-2">
                  {[
                    { icon: Mail,     val: user.email },
                    { icon: Phone,    val: user.phone },
                    { icon: Briefcase,val: user.job_title },
                  ].map(({ icon: Icon, val }) =>
                    val ? (
                      <div key={val} className="flex items-center gap-2.5 text-sm">
                        <Icon className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                        <span className="text-muted-foreground truncate">{val}</span>
                      </div>
                    ) : null
                  )}
                </div>
              )}
            </div>

            <Separator className="bg-border/40" />

            {/* Roles & Permissions */}
            <div>
              <p className="text-[10px] font-mono text-muted-foreground uppercase tracking-widest mb-3">
                Roles & Permissions
              </p>
              <div className="space-y-2">
                {(user.memberships ?? []).map((m: MockUserMembership, i) => (
                  <div key={i} className="flex items-center gap-2 p-3 rounded-lg border border-border/50 bg-background/40">
                    <div className="shrink-0">
                      {m.scope === "business"
                        ? <Building2 className="w-3.5 h-3.5 text-amber-400" />
                        : <MapPin className="w-3.5 h-3.5 text-teal-400" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <span className={roleBadgeCls(m.role)}>{m.role}</span>
                      <p className="text-[10px] text-muted-foreground mt-0.5">
                        {m.scope === "business" ? "Business-wide" : m.location_name ?? "Location"}
                      </p>
                    </div>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="outline" size="sm" className="h-7 text-xs gap-1 shrink-0">
                          Change <ChevronDown className="w-3 h-3" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-36 border-border/50">
                        <DropdownMenuLabel className="text-[10px] font-mono uppercase text-muted-foreground tracking-wider">
                          Assign Role
                        </DropdownMenuLabel>
                        <DropdownMenuSeparator />
                        {ROLES.map(r => (
                          <DropdownMenuItem
                            key={r}
                            className="text-xs gap-2 cursor-pointer capitalize"
                            onClick={() => roleMutation.mutate({
                              userId: user.id,
                              payload: { role: r, scope: m.scope, location_id: m.location_id },
                            })}
                          >
                            {m.role === r ? <Check className="w-3 h-3 text-primary" /> : <span className="w-3" />}
                            {r}
                          </DropdownMenuItem>
                        ))}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                ))}
                {user.memberships.length === 0 && (
                  <p className="text-xs text-muted-foreground italic px-1">No role assignments yet.</p>
                )}
              </div>
            </div>

            <Separator className="bg-border/40" />

            {/* Account Controls */}
            <div>
              <p className="text-[10px] font-mono text-muted-foreground uppercase tracking-widest mb-3">
                Account
              </p>
              <div className="flex items-center justify-between p-3 rounded-lg border border-border/50 bg-background/40">
                <div>
                  <p className="text-sm font-medium">{user.is_active ? "Account Active" : "Account Inactive"}</p>
                  <p className="text-xs text-muted-foreground">
                    {user.is_active ? "Employee can log in and access the system" : "Employee cannot access the system"}
                  </p>
                </div>
                <Button
                  variant={user.is_active ? "outline" : "default"}
                  size="sm"
                  className={`h-8 gap-1.5 text-xs shrink-0 ml-3 ${user.is_active ? "text-orange-400 border-orange-500/30 hover:bg-orange-500/10" : "bg-green-600 hover:bg-green-700"}`}
                  onClick={toggleActive}
                  disabled={toggling}
                >
                  {toggling
                    ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    : user.is_active
                    ? <><PowerOff className="w-3.5 h-3.5" />Deactivate</>
                    : <><Power className="w-3.5 h-3.5" />Activate</>
                  }
                </Button>
              </div>
            </div>

            <Separator className="bg-border/40" />

            {/* Danger zone */}
            <div>
              <p className="text-[10px] font-mono text-red-400/70 uppercase tracking-widest mb-3">Danger Zone</p>
              <div className="flex items-center justify-between p-3 rounded-lg border border-red-500/20 bg-red-500/5">
                <div>
                  <p className="text-sm font-medium text-red-400">Remove Employee</p>
                  <p className="text-xs text-muted-foreground">Permanently remove this staff member from the system.</p>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-8 gap-1.5 text-xs shrink-0 ml-3 text-red-400 border-red-500/30 hover:bg-red-500/10"
                  onClick={() => setConfirmDelete(true)}
                >
                  <Trash2 className="w-3.5 h-3.5" />Remove
                </Button>
              </div>
            </div>

          </div>
        </SheetContent>
      </Sheet>

      {/* Delete Confirmation Dialog */}
      <Dialog open={confirmDelete} onOpenChange={v => !v && setConfirmDelete(false)}>
        <DialogContent className="sm:max-w-sm border-border/50 bg-card">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-red-400">
              <AlertTriangle className="w-4 h-4" />
              Remove Employee
            </DialogTitle>
            <DialogDescription>
              Are you sure you want to remove <strong>{user.first_name} {user.last_name}</strong>? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setConfirmDelete(false)} disabled={removing}>Cancel</Button>
            <Button
              variant="destructive"
              onClick={handleRemove}
              disabled={removing}
              className="gap-1.5"
            >
              {removing ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Trash2 className="w-4 h-4" />Remove</>}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

// ── Employee Card ─────────────────────────────────────────────────────────────

function EmployeeCard({ user, onClick }: { user: MockUser; onClick: () => void }) {
  const ini = initials(user);
  const role = primaryRole(user);

  return (
    <Card
      onClick={onClick}
      className="border-border/50 bg-card/60 hover:bg-card hover:border-border hover:shadow-lg hover:shadow-black/20 transition-all cursor-pointer group relative overflow-hidden"
    >
      {!user.is_active && (
        <div className="absolute top-0 left-0 right-0 h-0.5 bg-red-500/50" />
      )}
      <CardContent className="p-4">
        <div className="flex items-start gap-3">
          {/* Avatar */}
          <div className={`w-11 h-11 text-base ${avatarCls(role)} shrink-0`}>
            {ini}
          </div>

          {/* Info */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="font-semibold text-sm leading-tight">
                {user.first_name} {user.last_name}
              </span>
              {!user.is_active && (
                <span className="text-[9px] bg-red-500/10 text-red-400 border border-red-500/20 px-1 py-0.5 rounded font-mono leading-none">
                  INACTIVE
                </span>
              )}
            </div>
            {user.job_title && (
              <p className="text-xs text-muted-foreground/80 italic leading-tight mt-0.5 truncate">
                {user.job_title}
              </p>
            )}
            <p className="text-[11px] text-muted-foreground font-mono mt-1 truncate">
              {user.email}
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between mt-3 pt-3 border-t border-border/30">
          <span className={roleBadgeCls(role)}>{role}</span>
          <div className="flex items-center gap-2">
            {user.phone && (
              <span className="text-[10px] text-muted-foreground font-mono flex items-center gap-1">
                <Phone className="w-2.5 h-2.5" />{user.phone}
              </span>
            )}
            <span className={`w-2 h-2 rounded-full shrink-0 ${user.is_active ? "bg-green-400" : "bg-red-400"}`} />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// ── Main Page ──────────────────────────────────────────────────────────────────

export default function Users() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [search,      setSearch]      = useState("");
  const [filter,      setFilter]      = useState<"all" | "active" | "inactive">("all");
  const [selected,    setSelected]    = useState<MockUser | null>(null);
  const [showAdd,     setShowAdd]     = useState(false);
  const [localUsers,  setLocalUsers]  = useState<MockUser[] | null>(null);

  const { data: fetchedUsers = [], isLoading, isError } = useQuery({
    queryKey: ["/users"],
    queryFn: fetchUsers,
  });

  // Merge fetched + local additions/edits
  const allUsers: MockUser[] = localUsers ?? fetchedUsers;

  const filtered = useMemo(() => {
    let list = allUsers;
    if (filter === "active")   list = list.filter(u => u.is_active);
    if (filter === "inactive") list = list.filter(u => !u.is_active);
    if (search) {
      const q = search.toLowerCase();
      list = list.filter(u =>
        u.email.toLowerCase().includes(q) ||
        u.first_name.toLowerCase().includes(q) ||
        u.last_name.toLowerCase().includes(q) ||
        (u.job_title ?? "").toLowerCase().includes(q)
      );
    }
    return list;
  }, [allUsers, search, filter]);

  const handleAdd = (newUser: MockUser) => {
    setLocalUsers([...(localUsers ?? fetchedUsers), newUser]);
  };

  const handleUpdate = (updated: MockUser) => {
    const base = localUsers ?? fetchedUsers;
    setLocalUsers(base.map(u => u.id === updated.id ? updated : u));
    setSelected(updated);
  };

  const handleDelete = (id: string) => {
    const base = localUsers ?? fetchedUsers;
    setLocalUsers(base.filter(u => u.id !== id));
    setSelected(null);
    queryClient.invalidateQueries({ queryKey: ["/users"] });
  };

  const activeCount   = allUsers.filter(u => u.is_active).length;
  const inactiveCount = allUsers.filter(u => !u.is_active).length;

  return (
    <div className="space-y-6">

      {/* ── Header ── */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Staff Management</h1>
          <p className="text-muted-foreground text-sm">
            {isLoading ? "Loading…" : `${allUsers.length} employees · ${activeCount} active`}
          </p>
        </div>
        <Button onClick={() => setShowAdd(true)} className="gap-2 shrink-0">
          <UserPlus className="w-4 h-4" />
          Add Employee
        </Button>
      </div>

      {/* ── Filters ── */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
          <Input
            placeholder="Search by name, email, or job title…"
            className="pl-8 h-9 text-sm"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
          {search && (
            <button onClick={() => setSearch("")} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
        <div className="flex gap-1.5">
          {(["all", "active", "inactive"] as const).map(f => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`text-xs px-3 py-1.5 rounded-md border font-medium capitalize transition-all ${
                filter === f
                  ? "bg-primary/15 text-primary border-primary/30"
                  : "bg-muted/30 text-muted-foreground border-border/50 hover:bg-muted/60"
              }`}
            >
              {f === "all" ? `All (${allUsers.length})` : f === "active" ? `Active (${activeCount})` : `Inactive (${inactiveCount})`}
            </button>
          ))}
        </div>
      </div>

      {/* ── Grid ── */}
      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3, 4, 5, 6].map(i => <Skeleton key={i} className="h-36 w-full" />)}
        </div>
      ) : isError ? (
        <div className="p-10 text-center text-destructive text-sm">Failed to load staff.</div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center py-20 text-center gap-3">
          <UsersIcon className="w-12 h-12 text-muted-foreground/20" />
          <p className="text-muted-foreground text-sm">
            {search ? `No staff matching "${search}"` : "No staff found."}
          </p>
          {!search && (
            <Button variant="outline" size="sm" onClick={() => setShowAdd(true)} className="gap-1.5 mt-1">
              <Plus className="w-3.5 h-3.5" />Add your first employee
            </Button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map(user => (
            <EmployeeCard key={user.id} user={user} onClick={() => setSelected(user)} />
          ))}
        </div>
      )}

      {/* ── Modals ── */}
      <AddEmployeeDialog open={showAdd} onClose={() => setShowAdd(false)} onAdd={handleAdd} />
      <StaffDrawer
        user={selected}
        open={!!selected}
        onClose={() => setSelected(null)}
        onUpdate={handleUpdate}
        onDelete={handleDelete}
      />
    </div>
  );
}
