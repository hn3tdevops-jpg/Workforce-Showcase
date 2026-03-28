import React, { createContext, useContext, useEffect, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { fetchApi } from "./api-client";
import { SessionInfo, LoginRequest } from "@workspace/api-client-react/src/generated/api.schemas";
import { useToast } from "@/hooks/use-toast";

const DEMO_MODE = import.meta.env.VITE_DEMO_MODE === "true";

const DEMO_SESSION: SessionInfo = {
  id: "user-001",
  email: "manager@silversands.com",
  first_name: "Sarah",
  last_name: "Okonkwo",
  is_active: true,
  active_business_id: "biz-001",
  roles: ["owner"],
  permissions: ["owner:*"],
  memberships: [
    {
      business_id: "biz-001",
      business_name: "Silver Sands Motel",
      role: "owner",
    },
  ],
};

interface ApiUserSummary {
  id: string;
  email: string;
  is_active?: boolean;
  first_name?: string;
  last_name?: string;
  is_superadmin?: boolean;
}

interface ApiMembershipSummary {
  business_id: string;
  status?: string;
  is_owner?: boolean;
  business_name?: string;
  role?: string;
}

interface ApiMeResponse {
  user?: ApiUserSummary;
  id?: string;
  email?: string;
  first_name?: string;
  last_name?: string;
  business_id?: string;
  active_business_id?: string;
  memberships?: ApiMembershipSummary[];
  roles?: string[];
  permissions?: string[];
}

interface ApiLoginResponse {
  access_token: string;
  token_type?: string;
  business_id?: string;
  user?: ApiUserSummary;
}

function mapToSessionInfo(data: ApiMeResponse): SessionInfo {
  const id = data.user?.id ?? data.id ?? "";
  const email = data.user?.email ?? data.email ?? "";
  const first_name = data.user?.first_name ?? data.first_name;
  const last_name = data.user?.last_name ?? data.last_name;
  const is_active = data.user?.is_active ?? true;
  const active_business_id = data.business_id ?? data.active_business_id;

  const memberships = (data.memberships ?? []).map((m) => ({
    business_id: m.business_id,
    business_name: m.business_name ?? "",
    role: m.is_owner ? "owner" : (m.role ?? "member"),
  }));

  return {
    id,
    email,
    first_name,
    last_name,
    is_active,
    active_business_id,
    memberships,
    roles: data.roles ?? [],
    permissions: data.permissions ?? [],
  };
}

interface AuthContextType {
  isAuthenticated: boolean;
  isLoading: boolean;
  session: SessionInfo | null;
  login: (credentials: LoginRequest) => Promise<void>;
  logout: () => void;
  switchBusiness: (businessId: string) => Promise<void>;
  hasPermission: (permission: string) => boolean;
  hasRole: (role: string) => boolean;
  isOwner: () => boolean;
  isSuperAdmin: () => boolean;
  canSwitchBusiness: boolean;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<SessionInfo | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const loadSession = async () => {
    if (DEMO_MODE) {
      setSession(DEMO_SESSION);
      setIsLoading(false);
      return;
    }

    const token = localStorage.getItem("workforce_token");
    if (!token) {
      setSession(null);
      setIsLoading(false);
      return;
    }

    try {
      const data = await fetchApi<ApiMeResponse>("/auth/me");
      setSession(mapToSessionInfo(data));
    } catch {
      localStorage.removeItem("workforce_token");
      setSession(null);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadSession();

    const handleUnauthorized = () => {
      localStorage.removeItem("workforce_token");
      setSession(null);
      queryClient.clear();
      window.location.href = "/login";
    };

    window.addEventListener("auth:unauthorized", handleUnauthorized);
    return () => window.removeEventListener("auth:unauthorized", handleUnauthorized);
  }, []);

  const login = async (credentials: LoginRequest) => {
    if (DEMO_MODE) {
      setSession(DEMO_SESSION);
      return;
    }
    const response = await fetchApi<ApiLoginResponse>("/auth/login", {
      method: "POST",
      body: JSON.stringify({ ...credentials, business_id: null }),
    });
    localStorage.setItem("workforce_token", response.access_token);
    await loadSession();
  };

  const logout = () => {
    localStorage.removeItem("workforce_token");
    setSession(null);
    queryClient.clear();
    window.location.href = "/login";
  };

  const switchBusiness = async (businessId: string) => {
    try {
      const response = await fetchApi<ApiLoginResponse>("/auth/switch-business", {
        method: "POST",
        body: JSON.stringify({ business_id: businessId }),
      });
      localStorage.setItem("workforce_token", response.access_token);
      await queryClient.invalidateQueries();
      await loadSession();
      toast({ title: "Switched business context" });
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : "Unknown error";
      toast({
        title: "Failed to switch business",
        description: msg,
        variant: "destructive",
      });
      throw error;
    }
  };

  const hasPermission = (permission: string) =>
    session?.permissions?.some(
      (p) => p === permission || p === "owner:*" || p === "business:owner"
    ) ?? false;

  const hasRole = (role: string) =>
    session?.roles?.some((r) => r.toLowerCase() === role.toLowerCase()) ?? false;

  const isOwner = () =>
    hasRole("owner") ||
    hasPermission("owner:*") ||
    hasPermission("business:owner") ||
    (session?.memberships?.some((m) => m.role?.toLowerCase() === "owner") ?? false);

  const isSuperAdmin = () =>
    hasRole("superadmin") ||
    hasPermission("superadmin:*") ||
    (session as (SessionInfo & { is_superadmin?: boolean }) | null)?.is_superadmin === true;

  const canSwitchBusiness = (session?.memberships?.length ?? 0) > 1;

  return (
    <AuthContext.Provider
      value={{
        isAuthenticated: !!session,
        isLoading,
        session,
        login,
        logout,
        switchBusiness,
        hasPermission,
        hasRole,
        isOwner,
        isSuperAdmin,
        canSwitchBusiness,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
