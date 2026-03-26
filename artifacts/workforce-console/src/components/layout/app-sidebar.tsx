import {
  LayoutDashboard, DoorOpen, CheckSquare,
  Users, CalendarDays, ShieldAlert, Activity,
  Building2, Package, Clock, BarChart3, Settings,
  Home, Wrench, Boxes, ChevronsUpDown, Check, LogOut, Loader2
} from "lucide-react";
import { Link, useLocation } from "wouter";
import { useState } from "react";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarFooter
} from "@/components/ui/sidebar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useAuth } from "@/lib/auth-context";

interface NavItem {
  title: string;
  url: string;
  icon: React.ElementType;
}

function NavGroup({
  label,
  items,
  location,
}: {
  label: string;
  items: NavItem[];
  location: string;
}) {
  return (
    <SidebarGroup>
      <SidebarGroupLabel className="text-muted-foreground/60 font-mono text-[10px] uppercase tracking-widest mb-1 px-2">
        {label}
      </SidebarGroupLabel>
      <SidebarGroupContent>
        <SidebarMenu>
          {items.map((item) => (
            <SidebarMenuItem key={item.title}>
              <SidebarMenuButton
                asChild
                isActive={location === item.url}
                className="hover:bg-primary/10 hover:text-primary transition-colors font-medium h-9 text-sm"
              >
                <Link href={item.url} className="flex items-center gap-3">
                  <item.icon className="w-4 h-4 shrink-0" />
                  <span>{item.title}</span>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
          ))}
        </SidebarMenu>
      </SidebarGroupContent>
    </SidebarGroup>
  );
}

function FutureNavGroup({ label, items }: { label: string; items: { title: string; icon: React.ElementType }[] }) {
  return (
    <SidebarGroup className="opacity-40">
      <SidebarGroupLabel className="text-muted-foreground/60 font-mono text-[10px] uppercase tracking-widest mb-1 px-2 flex items-center justify-between">
        {label}
        <span className="text-[9px] bg-muted/60 px-1.5 py-0.5 rounded font-sans normal-case tracking-normal">
          Soon
        </span>
      </SidebarGroupLabel>
      <SidebarGroupContent>
        <SidebarMenu>
          {items.map((item) => (
            <SidebarMenuItem key={item.title}>
              <SidebarMenuButton disabled className="h-9 text-sm cursor-not-allowed">
                <item.icon className="w-4 h-4 shrink-0" />
                <span>{item.title}</span>
              </SidebarMenuButton>
            </SidebarMenuItem>
          ))}
        </SidebarMenu>
      </SidebarGroupContent>
    </SidebarGroup>
  );
}

function BusinessSelector() {
  const { session, switchBusiness, canSwitchBusiness, logout } = useAuth();
  const [switching, setSwitching] = useState<string | null>(null);

  const activeMembership = session?.memberships?.find(
    (m) => m.business_id === session.active_business_id
  ) ?? session?.memberships?.[0];

  const businessName =
    activeMembership?.business_name ||
    (session?.active_business_id === "local" ? "Local Account" : "Unknown Business");

  const role = activeMembership?.role ?? "member";

  const handleSwitch = async (businessId: string) => {
    if (businessId === session?.active_business_id) return;
    setSwitching(businessId);
    try {
      await switchBusiness(businessId);
    } finally {
      setSwitching(null);
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg bg-muted/40 hover:bg-muted/70 border border-border/40 hover:border-border/70 transition-all group text-left">
          <div className="flex items-center justify-center w-7 h-7 rounded-md bg-primary/15 border border-primary/25 shrink-0">
            <Building2 className="w-3.5 h-3.5 text-primary" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-semibold leading-none truncate text-foreground">
              {businessName}
            </p>
            <p className="text-[10px] text-muted-foreground capitalize leading-none mt-1">
              {role}
            </p>
          </div>
          <ChevronsUpDown className="w-3.5 h-3.5 text-muted-foreground shrink-0 group-hover:text-foreground transition-colors" />
        </button>
      </DropdownMenuTrigger>

      <DropdownMenuContent
        side="right"
        align="start"
        sideOffset={8}
        className="w-64"
      >
        <div className="px-2 py-1.5">
          <p className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground">
            Switch Business
          </p>
        </div>
        <DropdownMenuSeparator />

        {(session?.memberships ?? []).map((m) => {
          const isActive = m.business_id === session?.active_business_id;
          const isLoading = switching === m.business_id;
          const name = m.business_name || (m.business_id === "local" ? "Local Account" : m.business_id);
          return (
            <DropdownMenuItem
              key={m.business_id}
              onSelect={() => handleSwitch(m.business_id)}
              disabled={isLoading}
              className="flex items-center gap-2.5 cursor-pointer"
            >
              <div className={`w-6 h-6 rounded flex items-center justify-center shrink-0 ${isActive ? "bg-primary/15 border border-primary/30" : "bg-muted border border-border/40"}`}>
                {isLoading ? (
                  <Loader2 className="w-3 h-3 animate-spin text-primary" />
                ) : isActive ? (
                  <Check className="w-3 h-3 text-primary" />
                ) : (
                  <Building2 className="w-3 h-3 text-muted-foreground" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className={`text-sm font-medium truncate ${isActive ? "text-primary" : ""}`}>{name}</p>
                <p className="text-xs text-muted-foreground capitalize">{m.role ?? "member"}</p>
              </div>
            </DropdownMenuItem>
          );
        })}

        {(!session?.memberships || session.memberships.length === 0) && (
          <div className="px-3 py-2 text-xs text-muted-foreground">No businesses found</div>
        )}

        <DropdownMenuSeparator />
        <DropdownMenuItem
          onSelect={logout}
          className="flex items-center gap-2 cursor-pointer text-destructive focus:text-destructive"
        >
          <LogOut className="w-3.5 h-3.5" />
          <span className="text-sm">Sign out</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export function AppSidebar() {
  const [location] = useLocation();
  const { hasRole, session } = useAuth();

  const overviewNav: NavItem[] = [
    { title: "Dashboard", url: "/app/dashboard", icon: LayoutDashboard },
    { title: "Session", url: "/app/session", icon: ShieldAlert },
  ];

  const operationsNav: NavItem[] = [
    { title: "Rooms", url: "/app/rooms", icon: DoorOpen },
    { title: "Property Map", url: "/app/property-map", icon: Boxes },
    { title: "Tasks", url: "/app/tasks", icon: CheckSquare },
    { title: "Assignments", url: "/app/assignments", icon: Users },
    { title: "Shifts", url: "/app/shifts", icon: CalendarDays },
    { title: "Event Timeline", url: "/app/timeline", icon: Activity },
  ];

  const peopleNav: NavItem[] = [
    { title: "Users", url: "/app/users", icon: Users },
  ];

  const adminNav: NavItem[] = [
    { title: "Settings", url: "/app/admin/settings", icon: Settings },
  ];

  return (
    <Sidebar variant="inset" className="border-r border-border/50">
      <SidebarHeader className="px-3 pt-3 pb-2 border-b border-border/50 shrink-0 gap-3">
        <div className="flex items-center gap-3 px-1">
          <div className="bg-primary/20 p-1.5 rounded-lg border border-primary/30 shrink-0">
            <img
              src={`${import.meta.env.BASE_URL}images/logo-icon.png`}
              alt="Logo"
              className="w-5 h-5"
            />
          </div>
          <div className="flex flex-col min-w-0">
            <span className="font-bold tracking-tight text-sm leading-none">Workforce</span>
            <span className="text-[10px] text-muted-foreground font-mono tracking-wider leading-tight mt-0.5">
              Operations Console
            </span>
          </div>
        </div>

        <BusinessSelector />
      </SidebarHeader>

      <SidebarContent className="py-3 gap-0">
        <NavGroup label="Overview" items={overviewNav} location={location} />

        <div className="mx-3 my-1.5 h-px bg-border/40" />

        <NavGroup label="Operations" items={operationsNav} location={location} />

        <div className="mx-3 my-1.5 h-px bg-border/40" />

        <NavGroup label="People" items={peopleNav} location={location} />

        <FutureNavGroup
          label="Scheduling"
          items={[
            { title: "Scheduling", icon: Clock },
          ]}
        />

        <FutureNavGroup
          label="Inventory"
          items={[
            { title: "Supply Pars", icon: Package },
            { title: "Room Assets", icon: Home },
          ]}
        />

        <FutureNavGroup
          label="Hospitable"
          items={[
            { title: "Room Board", icon: Building2 },
            { title: "Inspections", icon: CheckSquare },
            { title: "Issues", icon: Wrench },
          ]}
        />

        {hasRole("admin") && (
          <>
            <div className="mx-3 my-1.5 h-px bg-border/40" />
            <NavGroup label="Admin" items={adminNav} location={location} />
          </>
        )}

        <FutureNavGroup
          label="Reports"
          items={[{ title: "Analytics", icon: BarChart3 }]}
        />
      </SidebarContent>

      <SidebarFooter className="border-t border-border/50 px-4 py-3">
        <div className="flex items-center gap-2 min-w-0">
          <div className="w-6 h-6 rounded-full bg-primary/20 border border-primary/30 flex items-center justify-center shrink-0 text-[10px] font-bold text-primary uppercase">
            {session?.first_name?.[0] ?? session?.email?.[0] ?? "?"}
          </div>
          <div className="flex flex-col min-w-0">
            <p className="text-xs font-medium truncate leading-none">
              {session?.first_name
                ? `${session.first_name} ${session.last_name ?? ""}`.trim()
                : session?.email}
            </p>
            <p className="text-[10px] text-muted-foreground leading-none mt-0.5 truncate">
              {session?.email}
            </p>
          </div>
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}
