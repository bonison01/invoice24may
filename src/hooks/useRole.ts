import { useEffect, useState, useRef } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useCompany } from "@/hooks/useCompany";

export type Role = "admin" | "manager" | "custom" | null;

export interface CustomPermissions {
  invoices?: boolean;
  customers?: boolean;
  inventory?: boolean;
  cashbook?: boolean;
}

export interface RoleData {
  role: Role;
  companyOwnerId: string | null;
  customPermissions: CustomPermissions;
  isAdmin: boolean;
  canDelete: boolean;         // ← new
  can: (section: keyof CustomPermissions) => boolean;
  isLoading: boolean;
}

// Module-level cache — survives re-renders, cleared on sign-out
const cache: Record<string, { role: Role; companyOwnerId: string | null; customPermissions: CustomPermissions }> = {};

export const useRole = (): RoleData => {
  const { user } = useAuth();
  const { activeCompany } = useCompany();
  const [role, setRole] = useState<Role>(null);
  const [companyOwnerId, setCompanyOwnerId] = useState<string | null>(null);
  const [customPermissions, setCustomPermissions] = useState<CustomPermissions>({});
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      // Clear everything on sign-out
      Object.keys(cache).forEach((k) => delete cache[k]);
      setRole(null);
      setIsLoading(false);
      return;
    }
    fetchRole();
  }, [user?.id, activeCompany?.companyOwnerId, activeCompany?.isOwn]);

  const fetchRole = async () => {
    if (!user) return;

    // Own company — always admin, no fetch needed
    if (!activeCompany || activeCompany.isOwn) {
      setRole("admin");
      setCompanyOwnerId(user.id);
      setCustomPermissions({});
      setIsLoading(false);
      return;
    }

    // Check cache first
    const cacheKey = `${user.id}:${activeCompany.companyOwnerId}`;
    if (cache[cacheKey]) {
      const hit = cache[cacheKey];
      setRole(hit.role);
      setCompanyOwnerId(hit.companyOwnerId);
      setCustomPermissions(hit.customPermissions);
      setIsLoading(false);
      return;
    }

    // Cache miss — fetch once
    setIsLoading(true);
    try {
      const { data, error } = await (supabase as any)
        .from("user_roles")
        .select("role, company_owner_id, custom_permissions")
        .eq("user_id", user.id)
        .eq("company_owner_id", activeCompany.companyOwnerId)
        .maybeSingle();

      if (!error && data) {
        const resolved = {
          role: data.role as Role,
          companyOwnerId: data.company_owner_id,
          customPermissions: data.custom_permissions || {},
        };
        cache[cacheKey] = resolved;           // store in cache
        setRole(resolved.role);
        setCompanyOwnerId(resolved.companyOwnerId);
        setCustomPermissions(resolved.customPermissions);
      } else {
        setRole(null);
        setCompanyOwnerId(null);
        setCustomPermissions({});
      }
    } catch {
      setRole(null);
    }
    setIsLoading(false);
  };

  const isAdmin = !activeCompany || activeCompany.isOwn || role === "admin";

  // Only the owner (own company) or an explicit admin role can delete
  const canDelete = !activeCompany || activeCompany.isOwn || role === "admin";

  const can = (section: keyof CustomPermissions): boolean => {
    if (!activeCompany || activeCompany.isOwn) return true;
    if (role === "admin") return true;
    if (role === "manager") return true;
    if (role === "custom") return !!customPermissions[section];
    return false;
  };

  return { role, companyOwnerId, customPermissions, isAdmin, canDelete, can, isLoading };
};