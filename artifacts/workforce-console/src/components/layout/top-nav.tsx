import { Building, LogOut, ChevronDown, User, ShieldCheck, ExternalLink, MapPin, Users } from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { useLocation } from "@/lib/location-context";
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

export function TopNav() {
  const { session, logout, switchBusiness, hasRole } = useAuth();

  const activeBusiness = session?.memberships.find(
    (m) => m.business_id === session.active_business_id
  );
  const canSwitch = (session?.memberships?.length ?? 0) > 1;
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
          <span className="font-semibold">{activeBusiness?.business_name ?? "—"}</span>
        </div>
        <EnvBadge />
      </div>

      <div className="flex items-center gap-1.5">
        {/* Location selector */}
        <LocationSelector />

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
              {session?.memberships.map((membership) => (
                <DropdownMenuItem
                  key={membership.business_id}
                  onClick={() => switchBusiness(membership.business_id)}
                  className={`gap-2 cursor-pointer text-sm ${
                    membership.business_id === session.active_business_id
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

            {hasRole("admin") && (
              <DropdownMenuItem className="gap-2 cursor-pointer text-sm" asChild>
                <a href="/app/admin/settings">
                  <ShieldCheck className="w-3.5 h-3.5 opacity-60" />
                  Admin Settings
                </a>
              </DropdownMenuItem>
            )}

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
