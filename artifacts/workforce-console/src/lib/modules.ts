import {
  LayoutDashboard, DoorOpen, CheckSquare, Users, CalendarDays, Activity,
  Boxes, ShieldAlert, ClipboardList, BarChart3, Package, Home,
  Building2, Wrench, Settings, Shield, Sparkles, TrendingUp, IdCard,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

export type ModuleId =
  | "dashboard"
  | "rooms"
  | "property-map"
  | "tasks"
  | "assignments"
  | "shifts"
  | "timeline"
  | "users"
  | "employees"
  | "studio"
  | "promotions"
  | "session"
  | "analytics"
  | "inventory"
  | "inspections"
  | "settings";

export type ModuleGroup = "overview" | "operations" | "people" | "admin";

export interface ModuleDefinition {
  id: ModuleId;
  label: string;
  icon: LucideIcon;
  path: string;
  group: ModuleGroup;
  requiredRole?: string;
  comingSoon?: boolean;
  adminOnly?: boolean;
}

export const ALL_MODULES: ModuleDefinition[] = [
  { id: "dashboard",    label: "Dashboard",      icon: LayoutDashboard, path: "/app/dashboard",    group: "overview" },
  { id: "session",      label: "Session",         icon: ShieldAlert,     path: "/app/session",      group: "overview" },
  { id: "rooms",        label: "Rooms",           icon: DoorOpen,        path: "/app/rooms",        group: "operations" },
  { id: "property-map", label: "Property Map",    icon: Boxes,           path: "/app/property-map", group: "operations" },
  { id: "tasks",        label: "Tasks",           icon: CheckSquare,     path: "/app/tasks",        group: "operations" },
  { id: "assignments",  label: "Assignments",     icon: ClipboardList,   path: "/app/assignments",  group: "operations" },
  { id: "shifts",       label: "Shifts",          icon: CalendarDays,    path: "/app/shifts",       group: "operations" },
  { id: "timeline",     label: "Event Timeline",  icon: Activity,        path: "/app/timeline",     group: "operations" },
  { id: "users",        label: "Users",           icon: Users,           path: "/app/users",        group: "people" },
  { id: "employees",    label: "Employees",       icon: IdCard,          path: "/app/employees",    group: "people" },
  { id: "studio",       label: "Studio",          icon: Sparkles,        path: "/app/studio",       group: "people" },
  { id: "promotions",   label: "Promotions",      icon: TrendingUp,      path: "/app/promotions",   group: "people" },
  { id: "analytics",    label: "Analytics",       icon: BarChart3,       path: "/app/analytics",    group: "admin",   comingSoon: true },
  { id: "inventory",    label: "Supply Pars",     icon: Package,         path: "/app/inventory",    group: "admin",   comingSoon: true },
  { id: "inspections",  label: "Inspections",     icon: Building2,       path: "/app/inspections",  group: "admin",   comingSoon: true },
  { id: "settings",     label: "Settings",        icon: Settings,        path: "/app/settings",     group: "admin",   requiredRole: "owner" },
];

export const DEFAULT_ENABLED_MODULES: ModuleId[] = [
  "dashboard", "rooms", "property-map", "tasks", "assignments",
  "shifts", "timeline", "users", "employees", "studio", "promotions", "session",
];

export function getModulesByGroup(
  enabledIds: ModuleId[],
  isSuperAdmin: boolean
): Record<ModuleGroup, ModuleDefinition[]> {
  const result: Record<ModuleGroup, ModuleDefinition[]> = {
    overview: [],
    operations: [],
    people: [],
    admin: [],
  };

  for (const mod of ALL_MODULES) {
    if (mod.comingSoon) continue;
    if (!isSuperAdmin && !enabledIds.includes(mod.id)) continue;
    result[mod.group].push(mod);
  }

  return result;
}

export { Settings as SettingsIcon, Shield as SuperAdminIcon, Home as HomeIcon, Wrench as WrenchIcon };
