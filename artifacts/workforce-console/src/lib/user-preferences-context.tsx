import React, { createContext, useContext, useEffect, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { fetchApi } from "./api-client";
import { useAuth } from "./auth-context";

const DEMO_MODE = import.meta.env.VITE_DEMO_MODE === "true";

export type Theme = "dark" | "light" | "system";
export type Density = "comfortable" | "compact";

export interface UserPreferences {
  user_id: string;
  theme: Theme;
  default_location_id: string | null;
  sidebar_compact: boolean;
  density: Density;
}

interface UserPreferencesContextType {
  preferences: UserPreferences | null;
  isLoading: boolean;
  updatePreferences: (updates: Partial<Omit<UserPreferences, "user_id">>) => Promise<void>;
}

const UserPreferencesContext = createContext<UserPreferencesContextType | null>(null);

function applyTheme(theme: Theme) {
  const root = document.documentElement;
  if (theme === "light") {
    root.classList.remove("dark");
    root.classList.add("light");
  } else {
    root.classList.remove("light");
    root.classList.add("dark");
  }
}

const DEMO_PREFERENCES: UserPreferences = {
  user_id: "user-001",
  theme: "dark",
  default_location_id: null,
  sidebar_compact: false,
  density: "comfortable",
};

export function UserPreferencesProvider({ children }: { children: React.ReactNode }) {
  const { session } = useAuth();
  const queryClient = useQueryClient();
  const userId = session?.id ?? null;

  const { data: preferences, isLoading } = useQuery<UserPreferences>({
    queryKey: ["user-preferences", userId],
    enabled: !DEMO_MODE && !!userId,
    queryFn: async () => {
      const raw = await fetchApi<{
        user_id: string;
        theme?: string;
        default_location_id?: string | null;
        sidebar_compact?: number | boolean;
        density?: string;
      }>(`/users/${userId}/preferences`);

      return {
        user_id: raw.user_id,
        theme: (raw.theme as Theme) ?? "dark",
        default_location_id: raw.default_location_id ?? null,
        sidebar_compact: raw.sidebar_compact === 1 || raw.sidebar_compact === true,
        density: (raw.density as Density) ?? "comfortable",
      };
    },
    staleTime: 10 * 60 * 1000,
  });

  const effectivePreferences = DEMO_MODE ? DEMO_PREFERENCES : (preferences ?? null);

  useEffect(() => {
    if (effectivePreferences) {
      applyTheme(effectivePreferences.theme);
    }
  }, [effectivePreferences?.theme]);

  const mutation = useMutation({
    mutationFn: async (updates: Partial<Omit<UserPreferences, "user_id">>) => {
      await fetchApi(`/users/${userId}/preferences`, {
        method: "PATCH",
        body: JSON.stringify(updates),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["user-preferences", userId] });
    },
  });

  const updatePreferences = useCallback(
    async (updates: Partial<Omit<UserPreferences, "user_id">>) => {
      if (updates.theme) applyTheme(updates.theme);
      await mutation.mutateAsync(updates);
    },
    [mutation]
  );

  return (
    <UserPreferencesContext.Provider
      value={{ preferences: effectivePreferences, isLoading, updatePreferences }}
    >
      {children}
    </UserPreferencesContext.Provider>
  );
}

export function useUserPreferences() {
  const ctx = useContext(UserPreferencesContext);
  if (!ctx) throw new Error("useUserPreferences must be used within UserPreferencesProvider");
  return ctx;
}
