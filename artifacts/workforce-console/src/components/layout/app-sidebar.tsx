import { 
  Building2, LayoutDashboard, DoorOpen, CheckSquare, 
  Users, CalendarDays, Settings, ShieldAlert,
  HardHat
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

export function AppSidebar() {
  const [location] = useLocation();
  const { hasRole, session } = useAuth();

  const operationsNav = [
    { title: "Dashboard", url: "/app/dashboard", icon: LayoutDashboard },
    { title: "Rooms", url: "/app/rooms", icon: DoorOpen },
    { title: "Tasks", url: "/app/tasks", icon: CheckSquare },
    { title: "Assignments", url: "/app/assignments", icon: Users },
    { title: "Shifts", url: "/app/shifts", icon: CalendarDays },
  ];

  return (
    <Sidebar variant="inset" className="border-r border-border/50">
      <SidebarHeader className="h-16 flex items-center justify-center px-4 border-b border-border/50">
        <div className="flex items-center gap-3 w-full">
          <div className="bg-primary/20 p-1.5 rounded-lg border border-primary/30">
            <img src={`${import.meta.env.BASE_URL}images/logo-icon.png`} alt="Logo" className="w-5 h-5" />
          </div>
          <span className="font-bold tracking-tight text-lg">Workforce</span>
        </div>
      </SidebarHeader>

      <SidebarContent className="py-4">
        <SidebarGroup>
          <SidebarGroupLabel className="text-muted-foreground font-mono text-xs uppercase tracking-wider mb-2">Operations</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {operationsNav.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton 
                    asChild 
                    isActive={location === item.url}
                    className="hover:bg-primary/10 hover:text-primary transition-colors font-medium h-10"
                  >
                    <Link href={item.url} className="flex items-center gap-3">
                      <item.icon className="w-4 h-4" />
                      <span>{item.title}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup className="mt-4 opacity-50">
          <SidebarGroupLabel className="text-muted-foreground font-mono text-xs uppercase tracking-wider mb-2 flex items-center justify-between">
            Modules <span className="text-[10px] bg-muted px-1.5 py-0.5 rounded">Soon</span>
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton disabled className="h-10">
                  <HardHat className="w-4 h-4" />
                  <span>Workforce Core</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton disabled className="h-10">
                  <Building2 className="w-4 h-4" />
                  <span>Hospitable Sync</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {hasRole("admin") && (
          <SidebarGroup className="mt-auto">
            <SidebarGroupLabel className="text-primary font-mono text-xs uppercase tracking-wider mb-2">Administration</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                <SidebarMenuItem>
                  <SidebarMenuButton asChild isActive={location === "/app/session"} className="h-10">
                    <Link href="/app/session" className="flex items-center gap-3">
                      <ShieldAlert className="w-4 h-4 text-amber-500" />
                      <span className="text-amber-500/90">Debug Session</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
                <SidebarMenuItem>
                  <SidebarMenuButton disabled className="h-10">
                    <Settings className="w-4 h-4" />
                    <span>Settings</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}
      </SidebarContent>

      <SidebarFooter className="border-t border-border/50 p-4">
        <div className="flex flex-col gap-1">
          <p className="text-xs text-muted-foreground">Logged in as</p>
          <p className="text-sm font-medium truncate">{session?.email}</p>
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}
