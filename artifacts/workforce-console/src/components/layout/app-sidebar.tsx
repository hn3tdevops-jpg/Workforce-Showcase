import {
  Building2, ChevronsUpDown, Check, LogOut, Loader2, Shield
} from "lucide-react";
import { Link, useLocation as useWouterLocation } from "wouter";
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
import { useBusinessSettings } from "@/lib/business-settings-context";
import { ALL_MODULES, getModulesByGroup, type ModuleDefinition } from "@/lib/modules";

function NavGroup({
  label,
  items,
  location,
}: {
  label: string;
  items: ModuleDefinition[];
  location: string;
}) {
  if (items.length === 0) return null;
  return (
    <SidebarGroup>
      <SidebarGroupLabel className="text-muted-foreground/60 font-mono text-[10px] uppercase tracking-widest mb-1 px-2">
        {label}
      </SidebarGroupLabel>
      <SidebarGroupContent>
        <SidebarMenu>
          {items.map((item) => (
            <SidebarMenuItem key={item.id}>
              <SidebarMenuButton
                asChild
                isActive={location === item.path}
                className="hover:bg-primary/10 hover:text-primary transition-colors font-medium h-9 text-sm"
              >
                <Link href={item.path} className="flex items-center gap-3">
                  <item.icon className="w-4 h-4 shrink-0" />
                  <span>{item.label}</span>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
          ))}
        </SidebarMenu>
      </SidebarGroupContent>
    </SidebarGroup>
  );
}

function BusinessSelector() {
  const { session, switchBusiness, logout } = useAuth();
  const { settings } = useBusinessSettings();
  const [switching, setSwitching] = useState<string | null>(null);

  const activeMembership = session?.memberships?.find(
    (m: any) => m.business_id === session.active_business_id
  ) ?? session?.memberships?.[0];

  const businessName =
    settings?.display_name ||
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
          {settings?.logo_url ? (
            <img
              src={settings.logo_url}
              alt={businessName}
              className="w-7 h-7 rounded-md object-cover border border-border/30 shrink-0"
            />
          ) : (
            <div className="flex items-center justify-center w-7 h-7 rounded-md bg-primary/15 border border-primary/25 shrink-0">
              <Building2 className="w-3.5 h-3.5 text-primary" />
            </div>
          )}
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

      <DropdownMenuContent side="right" align="start" sideOffset={8} className="w-64">
        <div className="px-2 py-1.5">
          <p className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground">
            Switch Business
          </p>
        </div>
        <DropdownMenuSeparator />

        {(session?.memberships ?? []).map((m: any) => {
          const isActive = m.business_id === session?.active_business_id;
          const isLoadingItem = switching === m.business_id;
          const name = m.business_name || (m.business_id === "local" ? "Local Account" : m.business_id);
          return (
            <DropdownMenuItem
              key={m.business_id}
              onSelect={() => handleSwitch(m.business_id)}
              disabled={isLoadingItem}
              className="flex items-center gap-2.5 cursor-pointer"
            >
              <div className={`w-6 h-6 rounded flex items-center justify-center shrink-0 ${isActive ? "bg-primary/15 border border-primary/30" : "bg-muted border border-border/40"}`}>
                {isLoadingItem ? (
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
  const [location] = useWouterLocation();
  const { session, isSuperAdmin, employmentScope } = useAuth();
  const { settings, isModuleEnabled } = useBusinessSettings();
  const superAdmin = isSuperAdmin();

  const enabledIds = settings?.enabled_modules ?? [];
  const groups = getModulesByGroup(enabledIds, superAdmin);

  const adminItems = ALL_MODULES.filter(
    (m) => m.id === "settings" && (!m.requiredRole || isModuleEnabled(m.id))
  );

  const logoSrc = settings?.logo_url ?? `${import.meta.env.BASE_URL}images/logo-icon.png`;

  return (
    <Sidebar variant="inset" className="border-r border-border/50">
      <SidebarHeader className="px-3 pt-3 pb-2 border-b border-border/50 shrink-0 gap-3">
        <div className="flex items-center gap-3 px-1">
          <div className="bg-primary/20 p-1.5 rounded-lg border border-primary/30 shrink-0">
            <img src={logoSrc} alt="Logo" className="w-5 h-5 object-contain" />
          </div>
          <div className="flex flex-col min-w-0">
            <span className="font-bold tracking-tight text-sm leading-none">Workforce</span>
            <span className="text-[10px] text-muted-foreground font-mono tracking-wider leading-tight mt-0.5">
              Operations Console
            </span>
          </div>
          {superAdmin && (
            <Shield className="w-3.5 h-3.5 text-amber-400 ml-auto shrink-0" aria-label="Superadmin" />
          )}
        </div>

        <BusinessSelector />
      </SidebarHeader>

      <SidebarContent className="py-3 gap-0">
        <NavGroup label="Overview" items={groups.overview} location={location} />

        {groups.overview.length > 0 && (groups.operations.length > 0 || groups.people.length > 0) && (
          <div className="mx-3 my-1.5 h-px bg-border/40" />
        )}

        <NavGroup label="Operations" items={groups.operations} location={location} />

        {groups.operations.length > 0 && groups.people.length > 0 && (
          <div className="mx-3 my-1.5 h-px bg-border/40" />
        )}

        <NavGroup label="People" items={groups.people} location={location} />

        {adminItems.length > 0 && (
          <>
            <div className="mx-3 my-1.5 h-px bg-border/40" />
            <NavGroup label="Admin" items={adminItems} location={location} />
          </>
        )}
      </SidebarContent>

      <SidebarFooter className="border-t border-border/50 px-4 py-3 gap-2">
        {employmentScope && (
          <div className="flex items-center gap-2 px-1 py-1.5 rounded-md bg-emerald-950/40 border border-emerald-800/30">
            <div className="w-5 h-5 rounded-full bg-emerald-700/40 border border-emerald-600/40 flex items-center justify-center shrink-0">
              <Shield className="w-2.5 h-2.5 text-emerald-400" />
            </div>
            <div className="flex flex-col min-w-0 flex-1">
              <p className="text-[10px] font-semibold text-emerald-300 truncate leading-none">
                {employmentScope.employee_name}
              </p>
              <p className="text-[9px] text-emerald-500 truncate leading-none mt-0.5">
                {employmentScope.job_title ?? employmentScope.assignments?.[0]?.role_name ?? "Employee"}
                {employmentScope.employee_code ? ` · ${employmentScope.employee_code}` : ""}
              </p>
            </div>
            <div className="shrink-0 px-1 py-0.5 rounded text-[8px] font-mono bg-emerald-900/60 text-emerald-400 border border-emerald-800/40 uppercase">
              {employmentScope.employment_status}
            </div>
          </div>
        )}
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
