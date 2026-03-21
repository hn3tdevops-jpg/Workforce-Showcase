import React, { createContext, useContext, useEffect, useState } from "react";
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
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<SessionInfo | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();

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
    } catch (error) {
      console.error("Session load failed:", error);
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
      window.location.href = "/login";
    };

    window.addEventListener("auth:unauthorized", handleUnauthorized);
    return () => window.removeEventListener("auth:unauthorized", handleUnauthorized);
  }, []);

  const login = async (credentials: LoginRequest) => {
    const response = await fetchApi<LoginResponse>("/auth/login", {
      method: "POST",
      body: JSON.stringify(credentials),
    });
    localStorage.setItem("workforce_token", response.access_token);
    await loadSession();
  };

  const logout = () => {
    localStorage.removeItem("workforce_token");
    setSession(null);
    window.location.href = "/login";
  };

  const switchBusiness = async (businessId: string) => {
    try {
      const response = await fetchApi<LoginResponse>("/auth/switch-business", {
        method: "POST",
        body: JSON.stringify({ business_id: businessId }),
      });
      localStorage.setItem("workforce_token", response.access_token);
      await loadSession();
      toast({ title: "Business context switched successfully" });
    } catch (error: any) {
      toast({ 
        title: "Failed to switch business", 
        description: error.message,
        variant: "destructive"
      });
      throw error;
    }
  };

  const hasPermission = (permission: string) => {
    return session?.permissions?.includes(permission) ?? false;
  };

  const hasRole = (role: string) => {
    return session?.roles?.includes(role) ?? false;
  };

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
