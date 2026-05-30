import { useCompany } from "@/hooks/useCompany";
import { useAuth } from "@/hooks/useAuth";
import { Badge } from "@/components/ui/badge";
import { Building2, ChevronDown, Check } from "lucide-react";
import {
  DropdownMenu, DropdownMenuContent,
  DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";

const roleBadge: Record<string, string> = {
  admin: "bg-purple-100 text-purple-700",
  manager: "bg-blue-100 text-blue-700",
  custom: "bg-yellow-100 text-yellow-700",
};

const CompanySwitcher = () => {
  const { activeCompany, availableCompanies, switchCompany } = useCompany();
  const { user } = useAuth();

  // Only show if user has access to more than their own company
  if (!user || availableCompanies.length <= 1) return null;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" className="flex items-center gap-2 max-w-xs border-green-300 bg-green-50 hover:bg-green-100">
          <Building2 className="w-4 h-4 text-green-600 shrink-0" />
          <span className="truncate text-sm font-medium">{activeCompany?.companyName}</span>
          {!activeCompany?.isOwn && (
            <span className={`text-xs px-1.5 py-0.5 rounded-full capitalize ${roleBadge[activeCompany?.role || "custom"]}`}>
              {activeCompany?.role}
            </span>
          )}
          <ChevronDown className="w-3 h-3 shrink-0 text-gray-400" />
        </Button>
      </DropdownMenuTrigger>

      <DropdownMenuContent align="start" className="w-64">
        <p className="text-xs text-gray-400 px-2 pt-2 pb-1">Switch Company View</p>
        <DropdownMenuSeparator />
        {availableCompanies.map((c) => (
          <DropdownMenuItem
            key={c.companyOwnerId}
            onClick={() => switchCompany(c.companyOwnerId)}
            className="flex items-center justify-between gap-2 cursor-pointer"
          >
            <div className="flex items-center gap-2 min-w-0">
              <Building2 className="w-4 h-4 text-gray-400 shrink-0" />
              <div className="min-w-0">
                <p className="text-sm font-medium truncate">{c.companyName}</p>
                <p className="text-xs text-gray-400 capitalize">{c.isOwn ? "Owner" : c.role}</p>
              </div>
            </div>
            {activeCompany?.companyOwnerId === c.companyOwnerId && (
              <Check className="w-4 h-4 text-green-600 shrink-0" />
            )}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

export default CompanySwitcher;