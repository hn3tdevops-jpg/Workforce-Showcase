import { useState } from "react";
import { Building, LogOut, ChevronDown, User, ExternalLink, MapPin, Users, Settings, Shield, Bell, BellDot } from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { useLocation } from "@/lib/location-context";
import { useBusinessSettings } from "@/lib/business-settings-context";
import { SidebarTrigger } from "@/components/ui/sidebar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { fetchApi } from "@/lib/api-client";
import { formatDistanceToNow } from "date-fns";

const ENV = import.meta.env.MODE ?? "development";

function EnvBadge() {
  if (ENV === "production") return null;
  return (
    <Badge
      variant="outline"
      className="text-[10px] font-mono px-1.5 py-0 h-5 border-amber-500/40 text-amber-400 bg-amber-500/10 hidden sm:flex"
    >
      {ENV}
    </Badge>
  );
}

function LocationSelector() {
  const { locations, selectedLocationId, selectedLocation, setLocationId, isLoading } = useLocation();

  if (isLoading || locations.length === 0) return null;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className="gap-1.5 h-8 text-xs hover:bg-accent/50 hidden sm:flex"
        >
          <MapPin className="w-3.5 h-3.5 text-teal-400 shrink-0" />
          <span className="truncate max-w-[110px]">
            {selectedLocation?.name ?? "All Locations"}
          </span>
          <ChevronDown className="w-3 h-3 text-muted-foreground shrink-0" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-52 border-border/50 shadow-xl shadow-black/20">
        <DropdownMenuLabel className="font-mono text-[10px] text-muted-foreground uppercase tracking-wider">
          Select Location
        </DropdownMenuLabel>
        <DropdownMenuSeparator className="bg-border/50" />
        <DropdownMenuItem
          className={`text-sm gap-2 cursor-pointer ${!selectedLocationId ? "text-primary bg-primary/10" : ""}`}
          onClick={() => setLocationId(null)}
        >
          <MapPin className="w-3.5 h-3.5 opacity-50 shrink-0" />
          All Locations
        </DropdownMenuItem>
        {locations.map((loc) => (
          <DropdownMenuItem
            key={loc.id}
            onClick={() => setLocationId(loc.id)}
            className={`text-sm gap-2 cursor-pointer ${
              loc.id === selectedLocationId ? "text-primary bg-primary/10" : ""
            }`}
          >
            <MapPin className="w-3.5 h-3.5 opacity-50 shrink-0" />
            <div className="flex flex-col min-w-0">
              <span className="truncate">{loc.name}</span>
              {loc.address && (
                <span className="text-[10px] text-muted-foreground truncate">{loc.address}</span>
              )}
            </div>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

// ── Notifications Bell ────────────────────────────────────────────────────────

interface Notification {
  id: string; type: string; title: string; body: string | null;
  link: string | null; read_at: string | null; created_at: string;
}

function NotificationBell() {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);

  const { data: countData } = useQuery({
    queryKey: ["/notifications/unread-count"],
    queryFn: () => fetchApi<{ count: number }>("/notifications/unread-count"),
    refetchInterval: 30_000,
  });

  const { data: notifications = [] } = useQuery<Notification[]>({
    queryKey: ["/notifications"],
    queryFn: () => fetchApi("/notifications/?limit=15"),
    enabled: open,
  });

  const readAll = useMutation({
    mutationFn: () => fetchApi("/notifications/read-all", { method: "POST" }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/notifications/unread-count"] });
      qc.invalidateQueries({ queryKey: ["/notifications"] });
    },
  });

  const readOne = useMutation({
    mutationFn: (id: string) => fetchApi(`/notifications/${id}/read`, { method: "PATCH" }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/notifications/unread-count"] });
      qc.invalidateQueries({ queryKey: ["/notifications"] });
    },
  });

  const unread = countData?.count ?? 0;

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="sm" className="relative h-8 w-8 p-0 hover:bg-accent/50">
          {unread > 0 ? (
            <BellDot className="w-4 h-4 text-amber-400" />
          ) : (
            <Bell className="w-4 h-4 text-muted-foreground" />
          )}
          {unread > 0 && (
            <span className="absolute -top-0.5 -right-0.5 min-w-[14px] h-[14px] rounded-full bg-red-500 text-[9px] font-bold text-white flex items-center justify-center px-0.5 leading-none">
              {unread > 9 ? "9+" : unread}
            </span>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80 border-border/50 shadow-xl shadow-black/30 max-h-[420px] overflow-hidden flex flex-col">
        <DropdownMenuLabel className="flex items-center justify-between py-2.5 px-3">
          <span className="text-sm font-medium">Notifications</span>
          {unread > 0 && (
            <Button variant="ghost" size="sm" className="h-6 text-[10px] px-2 text-muted-foreground hover:text-foreground"
              onClick={(e) => { e.preventDefault(); readAll.mutate(); }}>
              Mark all read
            </Button>
          )}
        </DropdownMenuLabel>
        <DropdownMenuSeparator className="bg-border/50 my-0" />
        <div className="overflow-y-auto flex-1">
          {notifications.length === 0 ? (
            <div className="py-8 text-center text-xs text-muted-foreground">No notifications yet</div>
          ) : (
            notifications.map(n => (
              <div
                key={n.id}
                onClick={() => { if (!n.read_at) readOne.mutate(n.id); if (n.link) window.location.href = n.link; }}
                className={`px-3 py-3 border-b border-border/30 cursor-pointer hover:bg-muted/30 transition-colors last:border-0 ${!n.read_at ? "bg-primary/5" : ""}`}
              >
                <div className="flex items-start gap-2">
                  {!n.read_at && <div className="w-1.5 h-1.5 rounded-full bg-primary mt-1.5 shrink-0" />}
                  <div className={!n.read_at ? "" : "ml-3.5"}>
                    <p className={`text-xs font-medium leading-snug ${n.read_at ? "text-muted-foreground" : "text-foreground"}`}>{n.title}</p>
                    {n.body && <p className="text-[10px] text-muted-foreground mt-0.5 line-clamp-2">{n.body}</p>}
                    <p className="text-[9px] text-muted-foreground/60 mt-1">
                      {formatDistanceToNow(new Date(n.created_at), { addSuffix: true })}
                    </p>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export function TopNav() {
  const { session, logout, switchBusiness, isOwner, isSuperAdmin } = useAuth();
  const { settings } = useBusinessSettings();

  const activeBusinessId = session?.active_business_id ?? session?.memberships?.[0]?.business_id ?? null;
  const activeBusiness = session?.memberships.find(
    (m: any) => m.business_id === activeBusinessId
  );
  const businessDisplayName =
    settings?.display_name || activeBusiness?.business_name || activeBusiness?.business_id;
  const canSwitch = (session?.memberships?.length ?? 0) > 1;
  const canAccessSettings = isOwner() || isSuperAdmin();
  const initials = [session?.first_name?.[0], session?.last_name?.[0]]
    .filter(Boolean)
    .join("")
    .toUpperCase() || session?.email?.[0]?.toUpperCase() || "U";

  return (
    <header className="h-14 border-b border-border/50 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 flex items-center justify-between px-4 sticky top-0 z-40 shrink-0">
      <div className="flex items-center gap-3">
        <SidebarTrigger className="text-muted-foreground hover:text-foreground transition-colors -ml-1" />
        <div className="h-4 w-px bg-border/50 hidden md:block" />
        <div className="hidden md:flex items-center gap-2 text-sm">
          <Building className="w-3.5 h-3.5 text-primary shrink-0" />
          <span className="font-semibold">{businessDisplayName ?? "—"}</span>
        </div>
        <EnvBadge />
      </div>

      <div className="flex items-center gap-1.5">
        {/* Location selector */}
        <LocationSelector />

        {/* Notification bell */}
        <NotificationBell />

        {/* Business switcher — only shown when user has multiple memberships */}
        {canSwitch && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                className="gap-1.5 h-8 text-xs bg-card border-border/50 hover:bg-accent/50 hidden sm:flex"
              >
                <Building className="w-3.5 h-3.5" />
                <span className="truncate max-w-[90px]">{activeBusiness?.business_name || activeBusiness?.business_id}</span>
                <ChevronDown className="w-3 h-3 text-muted-foreground shrink-0" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56 border-border/50 shadow-xl shadow-black/20">
              <DropdownMenuLabel className="font-mono text-[10px] text-muted-foreground uppercase tracking-wider">
                Switch Business
              </DropdownMenuLabel>
              <DropdownMenuSeparator className="bg-border/50" />
              {session?.memberships.map((membership: any) => (
                <DropdownMenuItem
                  key={membership.business_id}
                  onClick={() => switchBusiness(membership.business_id)}
                  className={`gap-2 cursor-pointer text-sm ${
                    membership.business_id === activeBusinessId
                      ? "bg-primary/10 text-primary focus:bg-primary/20"
                      : ""
                  }`}
                >
                  <Building className="w-3.5 h-3.5 opacity-60 shrink-0" />
                  <div className="flex flex-col min-w-0">
                    <span className="font-medium truncate">{membership.business_name || membership.business_id}</span>
                    <span className="text-[10px] text-muted-foreground font-mono">{membership.role ?? "member"}</span>
                  </div>
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        )}

        {/* User menu */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              className="gap-2 h-8 hover:bg-accent/50 px-2"
            >
              <div className="w-7 h-7 rounded-full bg-primary/20 border border-primary/30 flex items-center justify-center text-[11px] font-bold text-primary shrink-0">
                {initials}
              </div>
              <div className="hidden md:flex flex-col items-start text-left min-w-0">
                <span className="text-xs font-medium leading-none truncate max-w-[110px]">
                  {session?.first_name
                    ? `${session.first_name} ${session.last_name ?? ""}`.trim()
                    : session?.email}
                </span>
                <span className="text-[10px] text-muted-foreground font-mono leading-none mt-0.5">
                  {activeBusiness?.role ?? "member"}
                </span>
              </div>
              <ChevronDown className="w-3 h-3 text-muted-foreground shrink-0 hidden md:block" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56 border-border/50 shadow-xl shadow-black/20">
            <DropdownMenuLabel className="font-normal pb-2">
              <div className="flex flex-col space-y-1">
                <p className="text-sm font-medium leading-none">
                  {session?.first_name
                    ? `${session.first_name} ${session.last_name ?? ""}`.trim()
                    : "User"}
                </p>
                <p className="text-xs leading-none text-muted-foreground font-mono">{session?.email}</p>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator className="bg-border/50" />

            <DropdownMenuItem className="gap-2 cursor-pointer text-sm" asChild>
              <a href="/app/users">
                <Users className="w-3.5 h-3.5 opacity-60" />
                Manage Staff
              </a>
            </DropdownMenuItem>

            <DropdownMenuItem className="gap-2 cursor-pointer text-sm" asChild>
              <a href="/app/session">
                <User className="w-3.5 h-3.5 opacity-60" />
                Session Inspector
              </a>
            </DropdownMenuItem>

            {canAccessSettings && (
              <DropdownMenuItem className="gap-2 cursor-pointer text-sm" asChild>
                <a href="/app/settings">
                  <Settings className="w-3.5 h-3.5 opacity-60" />
                  Settings
                </a>
              </DropdownMenuItem>
            )}
            {isSuperAdmin() && (
              <DropdownMenuItem className="gap-2 cursor-pointer text-sm text-amber-400 focus:text-amber-400 focus:bg-amber-500/10" asChild>
                <a href="/app/settings?tab=superadmin">
                  <Shield className="w-3.5 h-3.5 opacity-60" />
                  Superadmin
                </a>
              </DropdownMenuItem>
            )}

            <DropdownMenuItem className="gap-2 cursor-pointer text-sm" asChild>
              <a
                href="/developer_hub/index.html"
                target="_blank"
                rel="noopener noreferrer"
              >
                <ExternalLink className="w-3.5 h-3.5 opacity-60" />
                Developer Hub
              </a>
            </DropdownMenuItem>

            <DropdownMenuItem className="gap-2 cursor-pointer text-sm" asChild>
              <a
                href="https://hn3t.pythonanywhere.com/docs"
                target="_blank"
                rel="noopener noreferrer"
              >
                <ExternalLink className="w-3.5 h-3.5 opacity-60" />
                API Docs
              </a>
            </DropdownMenuItem>

            <DropdownMenuSeparator className="bg-border/50" />
            <DropdownMenuItem
              onClick={logout}
              className="text-red-400 focus:bg-red-500/10 focus:text-red-400 cursor-pointer gap-2 text-sm"
            >
              <LogOut className="w-3.5 h-3.5" />
              Sign out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
