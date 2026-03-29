import { useState } from "react";
import { Settings, Palette, Puzzle, User, Moon, Sun, Monitor, Shield } from "lucide-react";
import SuperadminConsole from "./settings/superadmin-console";
import { useAuth } from "@/lib/auth-context";
import { useBusinessSettings } from "@/lib/business-settings-context";
import { useUserPreferences } from "@/lib/user-preferences-context";
import { useLocation } from "@/lib/location-context";
import { ALL_MODULES, type ModuleId } from "@/lib/modules";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const PRESET_COLORS = [
  { label: "Indigo",    value: "#6366f1" },
  { label: "Violet",    value: "#7c3aed" },
  { label: "Blue",      value: "#2563eb" },
  { label: "Sky",       value: "#0284c7" },
  { label: "Teal",      value: "#0d9488" },
  { label: "Emerald",   value: "#059669" },
  { label: "Amber",     value: "#d97706" },
  { label: "Rose",      value: "#e11d48" },
];

// ── Business Settings Tab ─────────────────────────────────────────────────────

function BusinessSettingsTab() {
  const { settings, updateSettings } = useBusinessSettings();
  const { toast } = useToast();
  const [saving, setSaving] = useState(false);

  const [displayName, setDisplayName] = useState(settings?.display_name ?? "");
  const [logoUrl, setLogoUrl] = useState(settings?.logo_url ?? "");
  const [primaryColor, setPrimaryColor] = useState(settings?.primary_color ?? "#6366f1");
  const [accentColor, setAccentColor] = useState(settings?.accent_color ?? "#14b8a6");
  const [enabledModules, setEnabledModules] = useState<ModuleId[]>(
    settings?.enabled_modules ?? []
  );

  const toggleModule = (id: ModuleId) => {
    if (id === "dashboard") return;
    setEnabledModules((prev) =>
      prev.includes(id) ? prev.filter((m) => m !== id) : [...prev, id]
    );
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await updateSettings({
        display_name: displayName || null,
        logo_url: logoUrl || null,
        primary_color: primaryColor,
        accent_color: accentColor,
        enabled_modules: enabledModules,
      });
      toast({ title: "Business settings saved" });
    } catch {
      toast({ title: "Failed to save settings", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const selectableModules = ALL_MODULES.filter((m) => !m.comingSoon && !m.adminOnly);

  return (
    <div className="space-y-8 max-w-2xl">
      {/* Identity */}
      <section className="space-y-4">
        <div>
          <h3 className="text-sm font-semibold text-foreground">Business Identity</h3>
          <p className="text-xs text-muted-foreground mt-0.5">
            Override how your business name appears in the console
          </p>
        </div>
        <div className="grid gap-3">
          <div className="space-y-1.5">
            <Label className="text-xs">Display Name</Label>
            <Input
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder="e.g. Silver Sands Motel"
              className="bg-card border-border/50 h-9 text-sm"
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Logo URL</Label>
            <Input
              value={logoUrl}
              onChange={(e) => setLogoUrl(e.target.value)}
              placeholder="https://example.com/logo.png"
              className="bg-card border-border/50 h-9 text-sm"
            />
            <p className="text-[10px] text-muted-foreground">
              Displayed in the sidebar header. Use a small square icon (64×64 recommended).
            </p>
          </div>
        </div>
      </section>

      {/* Brand Colors */}
      <section className="space-y-4">
        <div>
          <h3 className="text-sm font-semibold text-foreground">Brand Colors</h3>
          <p className="text-xs text-muted-foreground mt-0.5">
            Applied to buttons, highlights, and active states throughout the console
          </p>
        </div>
        <div className="grid sm:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label className="text-xs">Primary Color</Label>
            <div className="flex gap-2 flex-wrap">
              {PRESET_COLORS.map((c) => (
                <button
                  key={c.value}
                  title={c.label}
                  onClick={() => setPrimaryColor(c.value)}
                  className={`w-7 h-7 rounded-md border-2 transition-all ${
                    primaryColor === c.value
                      ? "border-white scale-110 shadow-lg"
                      : "border-border/40 hover:border-border"
                  }`}
                  style={{ background: c.value }}
                />
              ))}
              <input
                type="color"
                value={primaryColor}
                onChange={(e) => setPrimaryColor(e.target.value)}
                className="w-7 h-7 rounded-md border border-border/40 cursor-pointer bg-transparent"
                title="Custom color"
              />
            </div>
            <p className="text-[10px] text-muted-foreground font-mono">{primaryColor}</p>
          </div>
          <div className="space-y-2">
            <Label className="text-xs">Accent Color</Label>
            <div className="flex gap-2 flex-wrap">
              {PRESET_COLORS.map((c) => (
                <button
                  key={c.value}
                  title={c.label}
                  onClick={() => setAccentColor(c.value)}
                  className={`w-7 h-7 rounded-md border-2 transition-all ${
                    accentColor === c.value
                      ? "border-white scale-110 shadow-lg"
                      : "border-border/40 hover:border-border"
                  }`}
                  style={{ background: c.value }}
                />
              ))}
              <input
                type="color"
                value={accentColor}
                onChange={(e) => setAccentColor(e.target.value)}
                className="w-7 h-7 rounded-md border border-border/40 cursor-pointer bg-transparent"
                title="Custom color"
              />
            </div>
            <p className="text-[10px] text-muted-foreground font-mono">{accentColor}</p>
          </div>
        </div>

        {/* Live preview swatch */}
        <div className="flex items-center gap-3 p-3 rounded-lg bg-card border border-border/50 w-fit">
          <div className="w-8 h-8 rounded-md" style={{ background: primaryColor }} />
          <div className="w-4 h-4 rounded-full" style={{ background: accentColor }} />
          <span className="text-xs text-muted-foreground">Preview</span>
        </div>
      </section>

      {/* Enabled Modules */}
      <section className="space-y-4">
        <div>
          <h3 className="text-sm font-semibold text-foreground">Enabled Modules</h3>
          <p className="text-xs text-muted-foreground mt-0.5">
            Control which modules are visible for all users in this business.
            Superadmin users always see all modules.
          </p>
        </div>
        <div className="grid sm:grid-cols-2 gap-2">
          {selectableModules.map((mod) => {
            const isEnabled = enabledModules.includes(mod.id);
            const isCore = mod.id === "dashboard";
            return (
              <div
                key={mod.id}
                className="flex items-center justify-between px-3 py-2.5 rounded-lg bg-card border border-border/50"
              >
                <div className="flex items-center gap-2.5">
                  <mod.icon className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                  <span className="text-sm">{mod.label}</span>
                  {isCore && (
                    <Badge variant="outline" className="text-[9px] h-4 px-1">core</Badge>
                  )}
                </div>
                <Switch
                  checked={isEnabled}
                  onCheckedChange={() => toggleModule(mod.id)}
                  disabled={isCore}
                  className="data-[state=checked]:bg-primary scale-90"
                />
              </div>
            );
          })}
        </div>
      </section>

      <Button onClick={handleSave} disabled={saving} className="h-9 text-sm">
        {saving ? "Saving…" : "Save Business Settings"}
      </Button>
    </div>
  );
}

// ── My Preferences Tab ────────────────────────────────────────────────────────

function MyPreferencesTab() {
  const { preferences, updatePreferences } = useUserPreferences();
  const { locations } = useLocation();
  const { toast } = useToast();
  const [saving, setSaving] = useState(false);

  const [theme, setTheme] = useState<"dark" | "light" | "system">(preferences?.theme ?? "dark");
  const [defaultLocationId, setDefaultLocationId] = useState<string>(
    preferences?.default_location_id ?? ""
  );
  const [density, setDensity] = useState<"comfortable" | "compact">(
    preferences?.density ?? "comfortable"
  );

  const handleSave = async () => {
    setSaving(true);
    try {
      await updatePreferences({
        theme,
        default_location_id: defaultLocationId || null,
        density,
      });
      toast({ title: "Preferences saved" });
    } catch {
      toast({ title: "Failed to save preferences", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const themeOptions = [
    { value: "dark",   label: "Dark",   icon: Moon },
    { value: "light",  label: "Light",  icon: Sun },
    { value: "system", label: "System", icon: Monitor },
  ] as const;

  return (
    <div className="space-y-8 max-w-2xl">
      {/* Theme */}
      <section className="space-y-4">
        <div>
          <h3 className="text-sm font-semibold text-foreground">Appearance</h3>
          <p className="text-xs text-muted-foreground mt-0.5">
            Choose how the console looks for you
          </p>
        </div>
        <div className="flex gap-2">
          {themeOptions.map((opt) => {
            const Icon = opt.icon;
            return (
              <button
                key={opt.value}
                onClick={() => setTheme(opt.value)}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-lg border text-sm font-medium transition-all ${
                  theme === opt.value
                    ? "border-primary bg-primary/10 text-primary"
                    : "border-border/50 bg-card text-muted-foreground hover:text-foreground hover:border-border"
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                {opt.label}
              </button>
            );
          })}
        </div>
      </section>

      {/* Default Location */}
      {locations.length > 0 && (
        <section className="space-y-4">
          <div>
            <h3 className="text-sm font-semibold text-foreground">Default Location</h3>
            <p className="text-xs text-muted-foreground mt-0.5">
              Pre-select this location when you open the console
            </p>
          </div>
          <Select
            value={defaultLocationId || "_none"}
            onValueChange={(v) => setDefaultLocationId(v === "_none" ? "" : v)}
          >
            <SelectTrigger className="w-64 bg-card border-border/50 h-9 text-sm">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="_none">No preference (All Locations)</SelectItem>
              {locations.map((loc) => (
                <SelectItem key={loc.id} value={loc.id}>
                  {loc.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </section>
      )}

      {/* Density */}
      <section className="space-y-4">
        <div>
          <h3 className="text-sm font-semibold text-foreground">Layout Density</h3>
          <p className="text-xs text-muted-foreground mt-0.5">
            How much information is shown per row in tables and lists
          </p>
        </div>
        <div className="flex gap-2">
          {(["comfortable", "compact"] as const).map((d) => (
            <button
              key={d}
              onClick={() => setDensity(d)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-lg border text-sm font-medium capitalize transition-all ${
                density === d
                  ? "border-primary bg-primary/10 text-primary"
                  : "border-border/50 bg-card text-muted-foreground hover:text-foreground hover:border-border"
              }`}
            >
              {d}
            </button>
          ))}
        </div>
      </section>

      <Button onClick={handleSave} disabled={saving} className="h-9 text-sm">
        {saving ? "Saving…" : "Save Preferences"}
      </Button>
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function SettingsPage() {
  const { isOwner, isSuperAdmin } = useAuth();
  const canManageBusiness = isOwner() || isSuperAdmin();

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="p-2 rounded-lg bg-primary/10 border border-primary/20">
          <Settings className="w-5 h-5 text-primary" />
        </div>
        <div>
          <h1 className="text-xl font-bold tracking-tight">Settings</h1>
          <p className="text-sm text-muted-foreground">
            Business configuration and personal preferences
          </p>
        </div>
        {isSuperAdmin() && (
          <Badge variant="outline" className="ml-auto flex items-center gap-1.5 text-amber-400 border-amber-500/40 bg-amber-500/10">
            <Shield className="w-3 h-3" />
            Superadmin
          </Badge>
        )}
      </div>

      <Tabs defaultValue={canManageBusiness ? "business" : "preferences"}>
        <TabsList className="bg-card border border-border/50">
          {canManageBusiness && (
            <TabsTrigger value="business" className="gap-2 text-sm data-[state=active]:bg-primary/10 data-[state=active]:text-primary">
              <Palette className="w-3.5 h-3.5" />
              Business
            </TabsTrigger>
          )}
          <TabsTrigger value="preferences" className="gap-2 text-sm data-[state=active]:bg-primary/10 data-[state=active]:text-primary">
            <User className="w-3.5 h-3.5" />
            My Preferences
          </TabsTrigger>
          {isSuperAdmin() && (
            <TabsTrigger value="superadmin" className="gap-2 text-sm data-[state=active]:bg-amber-500/10 data-[state=active]:text-amber-400">
              <Shield className="w-3.5 h-3.5" />
              Superadmin
            </TabsTrigger>
          )}
        </TabsList>

        {canManageBusiness && (
          <TabsContent value="business" className="mt-6">
            <BusinessSettingsTab />
          </TabsContent>
        )}

        <TabsContent value="preferences" className="mt-6">
          <MyPreferencesTab />
        </TabsContent>

        {isSuperAdmin() && (
          <TabsContent value="superadmin" className="mt-6">
            <SuperadminConsole />
          </TabsContent>
        )}
      </Tabs>
    </div>
  );
}
