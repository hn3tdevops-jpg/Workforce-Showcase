import React, { createContext, useContext, useEffect, useState, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { fetchApi } from "./api-client";
import { useAuth } from "./auth-context";
import type { ModuleId } from "./modules";
import { DEFAULT_ENABLED_MODULES } from "./modules";

const DEMO_MODE = import.meta.env.VITE_DEMO_MODE === "true";

export interface BusinessSettings {
  business_id: string;
  display_name: string | null;
  logo_url: string | null;
  primary_color: string;
  accent_color: string;
  enabled_modules: ModuleId[];
  custom_labels: Record<string, string>;
}

interface BusinessSettingsContextType {
  settings: BusinessSettings | null;
  isLoading: boolean;
  isModuleEnabled: (moduleId: ModuleId) => boolean;
  updateSettings: (updates: Partial<Omit<BusinessSettings, "business_id">>) => Promise<void>;
}

const BusinessSettingsContext = createContext<BusinessSettingsContextType | null>(null);

function hexToHsl(hex: string): string | null {
  const match = hex.replace("#", "").match(/.{2}/g);
  if (!match || match.length < 3) return null;
  const [r, g, b] = match.map((x) => parseInt(x, 16) / 255);
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const l = (max + min) / 2;
  let h = 0;
  let s = 0;
  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r: h = ((g - b) / d + (g < b ? 6 : 0)) / 6; break;
      case g: h = ((b - r) / d + 2) / 6; break;
      case b: h = ((r - g) / d + 4) / 6; break;
    }
  }
  return `${Math.round(h * 360)} ${Math.round(s * 100)}% ${Math.round(l * 100)}%`;
}

function applyBrandColors(primary: string, accent: string) {
  const root = document.documentElement;
  const primaryHsl = hexToHsl(primary);
  const accentHsl = hexToHsl(accent);
  if (primaryHsl) {
    root.style.setProperty("--primary", primaryHsl);
    root.style.setProperty("--ring", primaryHsl);
    root.style.setProperty("--sidebar-primary", primaryHsl);
    root.style.setProperty("--sidebar-ring", primaryHsl);
  }
  if (accentHsl) {
    root.style.setProperty("--brand-accent-hsl", accentHsl);
  }
}

function resetBrandColors() {
  const root = document.documentElement;
  root.style.removeProperty("--primary");
  root.style.removeProperty("--ring");
  root.style.removeProperty("--sidebar-primary");
  root.style.removeProperty("--sidebar-ring");
  root.style.removeProperty("--brand-accent-hsl");
}

const DEMO_SETTINGS: BusinessSettings = {
  business_id: "biz-001",
  display_name: "Silver Sands Motel",
  logo_url: null,
  primary_color: "#6366f1",
  accent_color: "#14b8a6",
  enabled_modules: [...DEFAULT_ENABLED_MODULES],
  custom_labels: {},
};

export function BusinessSettingsProvider({ children }: { children: React.ReactNode }) {
  const { session, isSuperAdmin } = useAuth();
  const queryClient = useQueryClient();
  const businessId = session?.active_business_id ?? null;

  const { data: settings, isLoading } = useQuery<BusinessSettings>({
    queryKey: ["business-settings", businessId],
    enabled: !DEMO_MODE && !!businessId,
    queryFn: async () => {
      const raw = await fetchApi<{
        business_id: string;
        display_name?: string | null;
        logo_url?: string | null;
        primary_color?: string;
        accent_color?: string;
        enabled_modules?: string | ModuleId[];
        custom_labels?: string | Record<string, string>;
      }>(`/business/${businessId}/settings`);

      const enabled_modules: ModuleId[] =
        typeof raw.enabled_modules === "string"
          ? JSON.parse(raw.enabled_modules)
          : (raw.enabled_modules ?? DEFAULT_ENABLED_MODULES);

      const custom_labels: Record<string, string> =
        typeof raw.custom_labels === "string"
          ? JSON.parse(raw.custom_labels)
          : (raw.custom_labels ?? {});

      return {
        business_id: raw.business_id,
        display_name: raw.display_name ?? null,
        logo_url: raw.logo_url ?? null,
        primary_color: raw.primary_color ?? "#6366f1",
        accent_color: raw.accent_color ?? "#14b8a6",
        enabled_modules,
        custom_labels,
      };
    },
    staleTime: 5 * 60 * 1000,
  });

  const effectiveSettings = DEMO_MODE ? DEMO_SETTINGS : (settings ?? null);

  useEffect(() => {
    if (effectiveSettings) {
      applyBrandColors(effectiveSettings.primary_color, effectiveSettings.accent_color);
    } else {
      resetBrandColors();
    }
  }, [effectiveSettings?.primary_color, effectiveSettings?.accent_color]);

  const mutation = useMutation({
    mutationFn: async (updates: Partial<Omit<BusinessSettings, "business_id">>) => {
      const payload = {
        ...updates,
        enabled_modules: updates.enabled_modules
          ? JSON.stringify(updates.enabled_modules)
          : undefined,
        custom_labels: updates.custom_labels
          ? JSON.stringify(updates.custom_labels)
          : undefined,
      };
      await fetchApi(`/business/${businessId}/settings`, {
        method: "PATCH",
        body: JSON.stringify(payload),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["business-settings", businessId] });
    },
  });

  const isModuleEnabled = useCallback(
    (moduleId: ModuleId): boolean => {
      if (isSuperAdmin()) return true;
      if (!effectiveSettings) return DEFAULT_ENABLED_MODULES.includes(moduleId);
      return effectiveSettings.enabled_modules.includes(moduleId);
    },
    [effectiveSettings, isSuperAdmin]
  );

  const updateSettings = useCallback(
    async (updates: Partial<Omit<BusinessSettings, "business_id">>) => {
      await mutation.mutateAsync(updates);
    },
    [mutation]
  );

  return (
    <BusinessSettingsContext.Provider
      value={{ settings: effectiveSettings, isLoading, isModuleEnabled, updateSettings }}
    >
      {children}
    </BusinessSettingsContext.Provider>
  );
}

export function useBusinessSettings() {
  const ctx = useContext(BusinessSettingsContext);
  if (!ctx) throw new Error("useBusinessSettings must be used within BusinessSettingsProvider");
  return ctx;
}
