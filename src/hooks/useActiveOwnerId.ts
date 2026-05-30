import { useAuth } from "@/hooks/useAuth";
import { useCompany } from "@/hooks/useCompany";

export const useActiveOwnerId = (): string | null => {
  const { user } = useAuth();
  const { activeCompany } = useCompany();
  return activeCompany?.companyOwnerId ?? user?.id ?? null;
};