import { useEffect, useState } from "react";
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
  can: (section: keyof CustomPermissions) => boolean;
  isLoading: boolean;
}

export const useRole = (): RoleData => {
  const { user } = useAuth();
  const { activeCompany } = useCompany();
  const [role, setRole] = useState<Role>(null);
  const [companyOwnerId, setCompanyOwnerId] = useState<string | null>(null);
  const [customPermissions, setCustomPermissions] = useState<CustomPermissions>({});
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!user) { setIsLoading(false); return; }
    fetchRole();
  }, [user, activeCompany]);

  const fetchRole = async () => {
    if (!user) return;
    setIsLoading(true);

    // If viewing own company, always admin
    if (!activeCompany || activeCompany.isOwn) {
      setRole("admin");
      setCompanyOwnerId(user.id);
      setCustomPermissions({});
      setIsLoading(false);
      return;
    }

    // Viewing another company — fetch the role for that company
    try {
      const { data, error } = await (supabase as any)
        .from("user_roles")
        .select("role, company_owner_id, custom_permissions")
        .eq("user_id", user.id)
        .eq("company_owner_id", activeCompany.companyOwnerId)
        .maybeSingle();

      if (!error && data) {
        setRole(data.role as Role);
        setCompanyOwnerId(data.company_owner_id);
        setCustomPermissions(data.custom_permissions || {});
      } else {
        // No role for this company context — deny
        setRole(null);
        setCompanyOwnerId(null);
        setCustomPermissions({});
      }
    } catch {
      setRole(null);
    }
    setIsLoading(false);
  };

  // isAdmin = viewing own company OR has admin role in active company
  const isAdmin = !activeCompany || activeCompany.isOwn || role === "admin";

  const can = (section: keyof CustomPermissions): boolean => {
    // Always allow if on own company
    if (!activeCompany || activeCompany.isOwn) return true;
    if (role === "admin") return true;
    if (role === "manager") return true;
    if (role === "custom") return !!customPermissions[section];
    return false;
  };

  return { role, companyOwnerId, customPermissions, isAdmin, can, isLoading };
};