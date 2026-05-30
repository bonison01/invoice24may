import { useRole } from "@/hooks/useRole";
import type { CustomPermissions } from "@/hooks/useRole";

interface RoleGuardProps {
  section: keyof CustomPermissions;
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

const RoleGuard = ({ section, children, fallback }: RoleGuardProps) => {
  const { can, isLoading } = useRole();
  if (isLoading) return <div className="p-8 text-center text-gray-500">Checking permissions...</div>;
  if (!can(section)) return fallback ? <>{fallback}</> : (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center space-y-2">
        <p className="text-2xl font-bold text-gray-700">Access Denied</p>
        <p className="text-gray-500">You don't have permission to view this section.</p>
      </div>
    </div>
  );
  return <>{children}</>;
};

export default RoleGuard;