import {
  LayoutDashboard, DoorOpen, CheckSquare,
  Users, CalendarDays, ShieldAlert, Activity,
  Building2, Package, Clock, BarChart3, Settings,
  Home, Wrench, Boxes
} from "lucide-react";
import { Link, useLocation } from "wouter";
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
      <SidebarHeader className="h-14 flex items-center px-4 border-b border-border/50 shrink-0">
        <div className="flex items-center gap-3 w-full">
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
        <div className="flex flex-col gap-0.5">
          <p className="text-xs text-muted-foreground">Signed in as</p>
          <p className="text-sm font-medium truncate">{session?.email}</p>
          {session?.memberships && session.memberships.length > 0 && (
            <p className="text-xs text-muted-foreground truncate">
              {session.memberships.find(m => m.business_id === session.active_business_id)?.role}
            </p>
          )}
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}
