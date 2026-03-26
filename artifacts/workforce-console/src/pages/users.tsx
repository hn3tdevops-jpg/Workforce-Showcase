import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  fetchUsers,
  assignUserRole,
  DEMO_MODE,
} from "@/lib/mock-adapter";
import type { MockUser, MockUserMembership } from "@/lib/mock-data";
import {
  Users as UsersIcon,
  Search,
  ShieldCheck,
  MapPin,
  Building2,
  ChevronDown,
  Check,
  CircleDot,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { useToast } from "@/hooks/use-toast";

const ROLES = ["owner", "admin", "supervisor", "member"] as const;

function roleBadgeVariant(role: string): string {
  const map: Record<string, string> = {
    owner: "bg-violet-500/15 text-violet-400 border-violet-500/30",
    admin: "bg-blue-500/15 text-blue-400 border-blue-500/30",
    supervisor: "bg-cyan-500/15 text-cyan-400 border-cyan-500/30",
    member: "bg-muted text-muted-foreground border-border",
  };
  return map[role] ?? map["member"];
}

function ScopeBadge({ scope, location }: { scope: "business" | "location"; location?: string }) {
  if (scope === "business") {
    return (
      <span className="inline-flex items-center gap-1 text-xs text-amber-400 font-medium">
        <Building2 className="w-3 h-3" />
        Business
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 text-xs text-teal-400 font-medium">
      <MapPin className="w-3 h-3" />
      {location ?? "Location"}
    </span>
  );
}

function UserDrawer({
  user,
  open,
  onClose,
}: {
  user: MockUser | null;
  open: boolean;
  onClose: () => void;
}) {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const mutation = useMutation({
    mutationFn: ({
      userId,
      payload,
    }: {
      userId: string;
      payload: { role: string; scope: "business" | "location" };
    }) => assignUserRole(userId, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/users"] });
      toast({ title: DEMO_MODE ? "Role updated (demo)" : "Role updated" });
    },
    onError: () => {
      toast({ title: "Failed to update role", variant: "destructive" });
    },
  });

  if (!user) return null;

  const initials = [user.first_name?.[0], user.last_name?.[0]]
    .filter(Boolean)
    .join("")
    .toUpperCase();

  return (
    <Sheet open={open} onOpenChange={(v) => !v && onClose()}>
      <SheetContent className="w-full sm:max-w-md border-border/50 bg-card">
        <SheetHeader className="pb-4 border-b border-border/50">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-12 h-12 rounded-full bg-primary/20 border border-primary/30 flex items-center justify-center text-lg font-bold text-primary">
              {initials}
            </div>
            <div>
              <SheetTitle className="text-base leading-tight">
                {user.first_name} {user.last_name}
              </SheetTitle>
              <SheetDescription className="font-mono text-xs mt-0.5">
                {user.email}
              </SheetDescription>
            </div>
          </div>
          <div className="flex items-center gap-2 text-sm">
            {user.job_title && (
              <span className="text-muted-foreground italic text-xs bg-muted/40 px-2 py-0.5 rounded">
                {user.job_title}
                <span className="ml-1.5 text-[10px] text-muted-foreground/60 not-italic">(display only)</span>
              </span>
            )}
            <span
              className={`text-xs px-2 py-0.5 rounded border font-medium ${
                user.is_active
                  ? "bg-green-500/10 text-green-400 border-green-500/30"
                  : "bg-red-500/10 text-red-400 border-red-500/30"
              }`}
            >
              {user.is_active ? "Active" : "Inactive"}
            </span>
          </div>
        </SheetHeader>

        <div className="py-5 space-y-5">
          <div>
            <p className="text-xs font-mono text-muted-foreground uppercase tracking-widest mb-3">
              Role Assignments
            </p>
            <div className="space-y-3">
              {user.memberships.map((m: MockUserMembership, i) => (
                <div
                  key={i}
                  className="flex items-start justify-between gap-3 p-3 rounded-lg border border-border/50 bg-background/40"
                >
                  <div className="space-y-1 min-w-0">
                    <ScopeBadge scope={m.scope} location={m.location_name} />
                    <span className={`inline-block text-xs px-2 py-0.5 rounded border font-medium ${roleBadgeVariant(m.role)}`}>
                      {m.role}
                    </span>
                  </div>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="outline" size="sm" className="text-xs h-7 gap-1 shrink-0">
                        Change <ChevronDown className="w-3 h-3" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-36 border-border/50">
                      <DropdownMenuLabel className="text-[10px] font-mono uppercase text-muted-foreground tracking-wider">
                        Assign Role
                      </DropdownMenuLabel>
                      <DropdownMenuSeparator className="bg-border/50" />
                      {ROLES.map((role) => (
                        <DropdownMenuItem
                          key={role}
                          className="text-xs gap-2 cursor-pointer"
                          onClick={() =>
                            mutation.mutate({
                              userId: user.id,
                              payload: { role, scope: m.scope, location_id: m.location_id },
                            })
                          }
                        >
                          {m.role === role ? (
                            <Check className="w-3 h-3 text-primary" />
                          ) : (
                            <span className="w-3" />
                          )}
                          {role}
                        </DropdownMenuItem>
                      ))}
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              ))}
            </div>
          </div>

          <div className="p-3 rounded-lg border border-border/40 bg-muted/20">
            <p className="text-xs font-mono text-muted-foreground uppercase tracking-widest mb-2">
              User ID
            </p>
            <p className="text-xs font-mono text-muted-foreground break-all">{user.id}</p>
          </div>

          {DEMO_MODE && (
            <div className="p-3 rounded-lg border border-amber-500/20 bg-amber-500/5">
              <p className="text-xs text-amber-400/80">
                Demo mode — role changes are local only and reset on page refresh.
              </p>
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}

export default function Users() {
  const [search, setSearch] = useState("");
  const [selectedUser, setSelectedUser] = useState<MockUser | null>(null);

  const { data: users = [], isLoading, isError } = useQuery({
    queryKey: ["/users"],
    queryFn: fetchUsers,
  });

  const filtered = useMemo(
    () =>
      users.filter(
        (u) =>
          u.email.toLowerCase().includes(search.toLowerCase()) ||
          u.first_name.toLowerCase().includes(search.toLowerCase()) ||
          u.last_name.toLowerCase().includes(search.toLowerCase()) ||
          (u.job_title ?? "").toLowerCase().includes(search.toLowerCase())
      ),
    [users, search]
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Users</h1>
          <p className="text-muted-foreground">
            Manage team members, roles, and access scope.
          </p>
        </div>
        <div className="flex items-center gap-2">
          {DEMO_MODE && (
            <Badge variant="outline" className="border-amber-500/30 text-amber-400 bg-amber-500/5 text-[10px] font-mono">
              DEMO MODE
            </Badge>
          )}
        </div>
      </div>

      <Card className="border-border/50 shadow-md bg-card/50 overflow-hidden">
        <CardHeader className="border-b border-border/50 pb-4 flex flex-row items-center justify-between gap-4">
          <CardTitle className="text-sm font-medium text-muted-foreground">
            {isLoading ? "Loading…" : `${filtered.length} user${filtered.length !== 1 ? "s" : ""}`}
          </CardTitle>
          <div className="relative flex-1 max-w-xs">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
            <Input
              placeholder="Search users…"
              className="pl-8 h-8 text-sm"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-6 space-y-3">
              {[1, 2, 3, 4].map((i) => (
                <Skeleton key={i} className="h-14 w-full" />
              ))}
            </div>
          ) : isError ? (
            <div className="p-10 text-center text-destructive text-sm">
              Failed to load users.
            </div>
          ) : filtered.length === 0 ? (
            <div className="p-16 text-center flex flex-col items-center">
              <UsersIcon className="w-10 h-10 text-muted-foreground/30 mb-3" />
              <p className="text-muted-foreground text-sm">No users found.</p>
            </div>
          ) : (
            <div className="divide-y divide-border/40">
              {filtered.map((user) => {
                const initials = [user.first_name?.[0], user.last_name?.[0]]
                  .filter(Boolean)
                  .join("")
                  .toUpperCase();
                const primaryMembership = user.memberships[0];

                return (
                  <div
                    key={user.id}
                    className="flex items-center gap-4 px-6 py-4 hover:bg-accent/20 transition-colors cursor-pointer group"
                    onClick={() => setSelectedUser(user)}
                  >
                    {/* Avatar */}
                    <div className="w-9 h-9 rounded-full bg-primary/15 border border-primary/20 flex items-center justify-center text-sm font-bold text-primary shrink-0">
                      {initials}
                    </div>

                    {/* Identity */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-medium text-sm">
                          {user.first_name} {user.last_name}
                        </span>
                        {!user.is_active && (
                          <span className="text-[10px] bg-red-500/10 text-red-400 border border-red-500/20 px-1.5 py-0.5 rounded font-mono">
                            INACTIVE
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground font-mono truncate">
                        {user.email}
                      </p>
                      {user.job_title && (
                        <p className="text-xs text-muted-foreground/60 italic mt-0.5">
                          {user.job_title}
                        </p>
                      )}
                    </div>

                    {/* Roles / scope */}
                    <div className="hidden sm:flex flex-col items-end gap-1 shrink-0">
                      {primaryMembership && (
                        <>
                          <span
                            className={`text-[11px] px-2 py-0.5 rounded border font-medium ${roleBadgeVariant(
                              primaryMembership.role
                            )}`}
                          >
                            {primaryMembership.role}
                          </span>
                          <ScopeBadge
                            scope={primaryMembership.scope}
                            location={primaryMembership.location_name}
                          />
                        </>
                      )}
                      {user.memberships.length > 1 && (
                        <span className="text-[10px] text-muted-foreground">
                          +{user.memberships.length - 1} more
                        </span>
                      )}
                    </div>

                    {/* Indicator */}
                    <CircleDot className="w-4 h-4 text-muted-foreground/30 group-hover:text-primary/60 transition-colors shrink-0" />
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      <UserDrawer
        user={selectedUser}
        open={!!selectedUser}
        onClose={() => setSelectedUser(null)}
      />
    </div>
  );
}
