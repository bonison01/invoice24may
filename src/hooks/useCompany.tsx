import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";

export interface CompanyAccess {
  companyOwnerId: string;
  companyName: string;
  role: string;
  isOwn: boolean;
}

interface CompanyContextType {
  activeCompany: CompanyAccess | null;
  availableCompanies: CompanyAccess[];
  switchCompany: (ownerId: string) => void;
  isLoading: boolean;
}

const CompanyContext = createContext<CompanyContextType>({
  activeCompany: null,
  availableCompanies: [],
  switchCompany: () => {},
  isLoading: true,
});

export const CompanyProvider = ({ children }: { children: ReactNode }) => {
  const { user } = useAuth();
  const [availableCompanies, setAvailableCompanies] = useState<CompanyAccess[]>([]);
  const [activeCompany, setActiveCompany] = useState<CompanyAccess | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (user) loadCompanies();
    else { setAvailableCompanies([]); setActiveCompany(null); setIsLoading(false); }
  }, [user]);

  const loadCompanies = async () => {
    if (!user) return;
    setIsLoading(true);

    // Own company (always available)
    const ownCompany: CompanyAccess = {
      companyOwnerId: user.id,
      companyName: "My Company",
      role: "admin",
      isOwn: true,
    };

    // Fetch own business name
    const { data: bizData } = await (supabase as any)
      .from("business_settings")
      .select("business_name")
      .eq("user_id", user.id)
      .maybeSingle();
    if (bizData?.business_name) ownCompany.companyName = bizData.business_name;

    // Fetch assigned companies
    const { data: roles } = await (supabase as any)
      .from("user_roles")
      .select("company_owner_id, role, email")
      .eq("user_id", user.id);

    const assignedCompanies: CompanyAccess[] = [];

    if (roles && roles.length > 0) {
      for (const r of roles) {
        // Get company name from business_settings of the owner
        const { data: ownerBiz } = await (supabase as any)
          .from("business_settings")
          .select("business_name")
          .eq("user_id", r.company_owner_id)
          .maybeSingle();

        assignedCompanies.push({
          companyOwnerId: r.company_owner_id,
          companyName: ownerBiz?.business_name || `Company (${r.company_owner_id.slice(0, 6)}...)`,
          role: r.role,
          isOwn: false,
        });
      }
    }

    const all = [ownCompany, ...assignedCompanies];
    setAvailableCompanies(all);

    // Restore last active from localStorage
    const saved = localStorage.getItem(`activeCompany_${user.id}`);
    const match = all.find(c => c.companyOwnerId === saved);
    setActiveCompany(match || ownCompany);
    setIsLoading(false);
  };

  const switchCompany = (ownerId: string) => {
    const company = availableCompanies.find(c => c.companyOwnerId === ownerId);
    if (company && user) {
      setActiveCompany(company);
      localStorage.setItem(`activeCompany_${user.id}`, ownerId);
    }
  };

  return (
    <CompanyContext.Provider value={{ activeCompany, availableCompanies, switchCompany, isLoading }}>
      {children}
    </CompanyContext.Provider>
  );
};

export const useCompany = () => useContext(CompanyContext);