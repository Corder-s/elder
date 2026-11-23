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
  }) => Promise<boolean>;
  submitRoleRequest: (role: RoleType, orgName: string) => void;
  logout: () => Promise<void>;
  refreshSession: () => Promise<void>;
}

const DEV_INITIAL_USER: User = {
  id: "usr-admin-01",
  email: "admin@sriseva-ashram.org",
  displayName: "Admin (Super)",
  role: "super_admin",
  organizationId: "org-01",
  branchId: "branch-01",
  status: "active",
  avatarUrl: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80",
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(DEV_INITIAL_USER);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [permissions, setPermissions] = useState<string[]>([]);
  const [activeOrgId, setActiveOrgId] = useState<string | null>("org-01");
  const [activeOrgSlug, setActiveOrgSlug] = useState<string | null>("sriseva");
  const [activeOrgName, setActiveOrgName] = useState<string | null>("Sri Seva Old Age Home");
  const [memberships, setMemberships] = useState<WorkspaceMembership[]>([]);
  const [pendingRequest, setPendingRequest] = useState<RoleRequest | null>(null);

  const availableRoles: RoleType[] = [
    "super_admin",
    "ngo_admin",
    "doctor",
    "nurse",
    "accountant",
    "volunteer",
    "family_guardian",
    "staff",
  ];

  const mapRoleSlugToRoleType = (slug: string | null): RoleType => {
    switch (slug) {
      case "platform_super_admin":
      case "super_admin":
        return "super_admin";
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
      case "staff":
        return "staff";
      default:
        return "ngo_admin";
    }
  };

  const refreshSession = useCallback(async () => {
    try {
      const res = await fetch("/api/auth/me");
      if (res.ok) {
        const data = await res.json();
        if (data.authenticated && data.session) {
          const s = data.session;
          const mappedRole = mapRoleSlugToRoleType(s.roleSlug);
          setUser({
            id: s.userId,
            email: s.email,
            displayName: s.fullName,
            role: mappedRole,
            organizationId: s.activeOrgId || "platform",
            branchId: s.branchId || undefined,
            status: "active",
          });
          setPermissions(s.permissions || []);
          setActiveOrgId(s.activeOrgId);
          setActiveOrgSlug(s.activeOrgSlug);
          setActiveOrgName(s.activeOrgName);
          setMemberships(data.memberships || []);
        }
      }
    } catch (err) {
      // In local dev without backend, keep fallback user
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    refreshSession();
  }, [refreshSession]);

  const hasPermission = (permissionCode: string): boolean => {
    if (user?.role === "super_admin") return true;
    return permissions.includes(permissionCode);
  };

  const switchRole = (newRole: RoleType) => {
    if (!user) return;
    setUser({
      ...user,
      role: newRole,
      displayName: getRoleDisplayName(newRole),
    });
  };

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

  const login = async (email: string, password?: string, role: RoleType = "ngo_admin"): Promise<boolean> => {
    setPendingRequest(null);
    if (password) {
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
      } catch (e) {
        // Fall back to simulated login
      }
    }

    // Simulated login for local dev evaluation
    setUser({
      ...DEV_INITIAL_USER,
      email,
      role,
      displayName: getRoleDisplayName(role),
    });
    return true;
  };

  const register = async (data: {
    fullName: string;
    email: string;
    phone: string;
    orgName: string;
    password?: string;
  }): Promise<boolean> => {
    if (data.password) {
      try {
        const res = await fetch("/api/auth/register", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            email: data.email,
            password: data.password,
            fullName: data.fullName,
            phone: data.phone,
          }),
        });
        if (res.ok) {
          await refreshSession();
          return true;
        }
      } catch (e) {}
    }

    const newUser: User = {
      id: `usr-${Date.now()}`,
      email: data.email,
      displayName: data.fullName,
      phone: data.phone,
      role: "staff",
      organizationId: "org-01",
      status: "pending",
    };
    setUser(newUser);
    return true;
  };

  const submitRoleRequest = (role: RoleType, orgName: string) => {
    const request: RoleRequest = {
      id: `req-${Date.now()}`,
      userId: user?.id || "usr-anon",
      requestedRole: role,
      organizationName: orgName || "Sri Seva Old Age Home",
      status: "pending_approval",
      submittedAt: new Date().toISOString(),
    };
    setPendingRequest(request);
  };

  const logout = async () => {
    try {
      await fetch("/api/auth/logout", { method: "POST" });
    } catch (e) {}
    setUser(null);
    setPermissions([]);
    setActiveOrgId(null);
    setActiveOrgSlug(null);
    setActiveOrgName(null);
    setMemberships([]);
    setPendingRequest(null);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: !!user && user.status === "active",
        isLoading,
        currentRole: user?.role || "super_admin",
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

function getRoleDisplayName(role: RoleType): string {
  switch (role) {
    case "super_admin":
      return "Super Admin (System Control)";
    case "ngo_admin":
      return "Administrator (Sri Seva Old Age Home)";
    case "doctor":
      return "Dr. A. K. Sengupta (Doctor)";
    case "nurse":
      return "Sunita Rao (Caretaker / Nurse)";
    case "accountant":
      return "Ramesh Gupta (Accountant)";
    case "volunteer":
      return "Ananya Verma (Volunteer)";
    case "family_guardian":
      return "Suresh Verma (Family of Ram Prasad)";
    case "staff":
      return "Vikram Singh (Staff)";
    default:
      return "Authorized User";
  }
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
