import React, { createContext, useContext, useEffect, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { fetchApi } from "./api-client";
import { SessionInfo, LoginResponse, LoginRequest } from "@workspace/api-client-react/src/generated/api.schemas";
import { useToast } from "@/hooks/use-toast";

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
  canSwitchBusiness: boolean;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<SessionInfo | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const loadSession = async () => {
    const token = localStorage.getItem("workforce_token");
    if (!token) {
      setSession(null);
      setIsLoading(false);
      return;
    }

    try {
      const data = await fetchApi<SessionInfo>("/auth/me");
      setSession(data);
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
    const response = await fetchApi<LoginResponse>("/auth/login", {
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
      const response = await fetchApi<LoginResponse>("/auth/switch-business", {
        method: "POST",
        body: JSON.stringify({ business_id: businessId }),
      });
      localStorage.setItem("workforce_token", response.access_token);
      // Invalidate all business-scoped queries before reloading session
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
    session?.permissions?.includes(permission) ?? false;

  const hasRole = (role: string) =>
    session?.roles?.includes(role) ?? false;

  // isOwner: user has the "owner" role or an ownership permission
  const isOwner = () =>
    hasRole("owner") || hasPermission("owner:*") || hasPermission("business:owner");

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
