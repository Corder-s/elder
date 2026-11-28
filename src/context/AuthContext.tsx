"use client";

import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import { User, RoleType } from "@/types";

export interface RoleRequest {
  id: string;
  userId: string;
  requestedRole: RoleType;
  organizationName: string;
  status: "pending_approval" | "approved" | "rejected";
  submittedAt: string;
}

export interface WorkspaceMembership {
  organizationId: string;
  organizationName: string;
  organizationSlug: string;
  roleSlug: string;
  roleName: string;
  title: string | null;
  status: string;
}

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isPlatformAdmin: boolean;
  isLoading: boolean;
  currentRole: RoleType;
  permissions: string[];
  activeOrgId: string | null;
  activeOrgSlug: string | null;
  activeOrgName: string | null;
  memberships: WorkspaceMembership[];
  pendingRequest: RoleRequest | null;
  availableRoles: RoleType[];
  hasPermission: (permissionCode: string) => boolean;
  switchRole: (role: RoleType) => void;
  switchWorkspace: (organizationId: string) => Promise<boolean>;
  login: (email: string, password?: string, role?: RoleType) => Promise<boolean>;
  register: (data: {
    fullName: string;
    email: string;
    phone: string;
    orgName: string;
    password?: string;
    requestedAccountType?: string;
  }) => Promise<boolean>;
  submitRoleRequest: (role: RoleType, orgName: string) => void;
  logout: () => Promise<void>;
  refreshSession: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isPlatformAdmin, setIsPlatformAdmin] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [permissions, setPermissions] = useState<string[]>([]);
  const [activeOrgId, setActiveOrgId] = useState<string | null>(null);
  const [activeOrgSlug, setActiveOrgSlug] = useState<string | null>(null);
  const [activeOrgName, setActiveOrgName] = useState<string | null>(null);
  const [memberships, setMemberships] = useState<WorkspaceMembership[]>([]);
  const [pendingRequest, setPendingRequest] = useState<RoleRequest | null>(null);

  const mapRoleSlugToRoleType = (slug: string | null, platformAdmin = false): RoleType => {
    if (platformAdmin) return "super_admin";
    switch (slug) {
      case "admin":
      case "ngo_admin":
        return "ngo_admin";
      case "doctor":
        return "doctor";
      case "nurse":
        return "nurse";
      case "accountant":
        return "accountant";
      case "volunteer":
        return "volunteer";
      case "family_member":
      case "family_guardian":
        return "family_guardian";
      case "auditor":
        return "auditor";
      case "staff":
      default:
        return "staff";
    }
  };

  const clearClientState = useCallback(() => {
    setUser(null);
    setIsPlatformAdmin(false);
    setPermissions([]);
    setActiveOrgId(null);
    setActiveOrgSlug(null);
    setActiveOrgName(null);
    setMemberships([]);
    setPendingRequest(null);
  }, []);

  const refreshSession = useCallback(async () => {
    try {
      const res = await fetch("/api/auth/me", { cache: "no-store" });
      if (res.ok) {
        const data = await res.json();
        if (data.authenticated && data.session) {
          const s = data.session;
          const platAdmin = Boolean(s.isPlatformAdmin);
          const mappedRole = mapRoleSlugToRoleType(s.roleSlug, platAdmin);
          const hasWorkspace = platAdmin || Boolean(s.activeOrgId);
          setIsPlatformAdmin(platAdmin);
          setUser({
            id: s.userId,
            email: s.email,
            displayName: s.fullName,
            role: mappedRole,
            organizationId: s.activeOrgId || (platAdmin ? "platform" : ""),
            branchId: s.branchId || undefined,
            status: hasWorkspace ? "active" : "pending",
          });
          setPermissions(s.permissions || []);
          setActiveOrgId(s.activeOrgId || null);
          setActiveOrgSlug(s.activeOrgSlug || null);
          setActiveOrgName(s.activeOrgName || null);
          setMemberships(data.memberships || []);
          return;
        }
      }
      clearClientState();
    } catch {
      clearClientState();
    } finally {
      setIsLoading(false);
    }
  }, [clearClientState]);

  useEffect(() => {
    refreshSession();
  }, [refreshSession]);

  const hasPermission = (permissionCode: string): boolean => {
    if (isPlatformAdmin) return true;
    return permissions.includes(permissionCode);
  };

  // Client-side arbitrary role spoofing is disabled; role changes occur only via server workspace switch.
  const switchRole = () => {};

  const switchWorkspace = async (targetOrgId: string): Promise<boolean> => {
    try {
      const res = await fetch("/api/auth/switch-workspace", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ organizationId: targetOrgId }),
      });
      if (res.ok) {
        await refreshSession();
        return true;
      }
      return false;
    } catch {
      return false;
    }
  };

  const login = async (email: string, password?: string): Promise<boolean> => {
    if (!password) return false;
    setPendingRequest(null);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      if (res.ok) {
        await refreshSession();
        return true;
      }
      return false;
    } catch {
      return false;
    }
  };

  const register = async (data: {
    fullName: string;
    email: string;
    phone: string;
    orgName: string;
    password?: string;
    requestedAccountType?: string;
  }): Promise<boolean> => {
    if (!data.password) return false;
    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: data.email,
          password: data.password,
          fullName: data.fullName,
          phone: data.phone,
          organizationSlug: data.orgName,
          requestedAccountType: data.requestedAccountType || "staff",
        }),
      });
      return res.ok;
    } catch {
      return false;
    }
  };

  const submitRoleRequest = (role: RoleType, orgName: string) => {
    setPendingRequest({
      id: `req-${Date.now()}`,
      userId: user?.id || "pending",
      requestedRole: role,
      organizationName: orgName,
      status: "pending_approval",
      submittedAt: new Date().toISOString(),
    });
  };

  const logout = async () => {
    try {
      await fetch("/api/auth/logout", { method: "POST", cache: "no-store" });
    } catch {
      // ignore network error; still clear local state
    }
    clearClientState();
    if (typeof window !== "undefined") {
      try {
        window.localStorage.clear();
        window.sessionStorage.clear();
      } catch {
        // ignore storage restrictions
      }
      window.location.replace("/login");
    }
  };

  const availableRoles: RoleType[] = user ? [user.role] : [];

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: !!user,
        isPlatformAdmin,
        isLoading,
        currentRole: user?.role || "staff",
        permissions,
        activeOrgId,
        activeOrgSlug,
        activeOrgName,
        memberships,
        pendingRequest,
        availableRoles,
        hasPermission,
        switchRole,
        switchWorkspace,
        login,
        register,
        submitRoleRequest,
        logout,
        refreshSession,
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
