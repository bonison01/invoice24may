import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useRole } from "@/hooks/useRole";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
    Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/hooks/use-toast";
import { ArrowLeft, Search, UserPlus, Trash2, Shield } from "lucide-react";
import Navbar from "@/components/Navbar";
import { useCompany } from "@/hooks/useCompany";

type Role = "admin" | "manager" | "custom";

interface CustomPermissions {
    invoices: boolean;
    customers: boolean;
    inventory: boolean;
    cashbook: boolean;
}

interface TeamMember {
    id: string;
    user_id: string;
    role: Role;
    custom_permissions: CustomPermissions;
    email?: string;
}

const SECTIONS: (keyof CustomPermissions)[] = ["invoices", "customers", "inventory", "cashbook"];

const roleBadgeColor: Record<Role, string> = {
    admin: "bg-purple-100 text-purple-700",
    manager: "bg-blue-100 text-blue-700",
    custom: "bg-yellow-100 text-yellow-700",
};

const TeamSettings = () => {
    const navigate = useNavigate();
    const { user } = useAuth();
    const { isAdmin, isLoading: roleLoading } = useRole();

    const [searchEmail, setSearchEmail] = useState("");
    const [searchResult, setSearchResult] = useState<{ id: string; email: string } | null>(null);
    const [searching, setSearching] = useState(false);
    const [selectedRole, setSelectedRole] = useState<Role>("manager");
    const [customPerms, setCustomPerms] = useState<CustomPermissions>({
        invoices: false, customers: false, inventory: false, cashbook: false,
    });
    const [assigning, setAssigning] = useState(false);
    const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
    const [loadingMembers, setLoadingMembers] = useState(true);

    useEffect(() => {
        if (user && isAdmin) fetchTeamMembers();
    }, [user, isAdmin]);

    const fetchTeamMembers = async () => {
        if (!user) return;
        setLoadingMembers(true);
        const { data, error } = await (supabase as any)
            .from("user_roles")
            .select("*")
            .eq("company_owner_id", user.id);

        if (!error && data) {
            // Fetch emails via a lookup (you'll need an admin function or store email on insert)
            setTeamMembers(data.map((d: any) => ({
                id: d.id,
                user_id: d.user_id,
                role: d.role,
                custom_permissions: d.custom_permissions || {},
                email: d.email || d.user_id,
            })));
        }
        setLoadingMembers(false);
    };

    // Search by email using a Supabase Edge Function or RPC
    // This calls an RPC that returns user id for a given email (set up below)
    const handleSearchUser = async () => {
        if (!searchEmail.trim()) return;
        setSearching(true);
        setSearchResult(null);
        try {
            const { data, error } = await (supabase as any)
                .rpc("get_user_id_by_email", { email_input: searchEmail.trim().toLowerCase() });

            if (error || !data) {
                toast({ title: "User not found", description: "No account with that email exists.", variant: "destructive" });
            } else {
                setSearchResult({ id: data as string, email: searchEmail.trim() });
            }
        } catch {
            toast({ title: "Error", description: "Search failed.", variant: "destructive" });
        }
        setSearching(false);
    };

    const handleAssignRole = async () => {
        if (!user || !searchResult) return;
        if (searchResult.id === user.id) {
            toast({ title: "Cannot assign role to yourself.", variant: "destructive" } as any);
            return;
        }
        setAssigning(true);
        try {
            const { error } = await (supabase as any)
                .from("user_roles")
                .upsert({
                    user_id: searchResult.id,
                    role: selectedRole,
                    company_owner_id: user.id,
                    custom_permissions: selectedRole === "custom" ? customPerms : {},
                    assigned_by: user.id,
                    email: searchResult.email,
                    updated_at: new Date().toISOString(),
                }, { onConflict: "user_id,company_owner_id" });

            if (error) throw error;

            toast({ title: "Role assigned!", description: `${searchResult.email} is now a ${selectedRole}.` });
            setSearchResult(null);
            setSearchEmail("");
            fetchTeamMembers();
        } catch (e: any) {
            toast({ title: "Error", description: e.message, variant: "destructive" });
        }
        setAssigning(false);
    };

    const handleRemoveMember = async (memberId: string) => {
        const { error } = await (supabase as any)
            .from("user_roles")
            .delete()
            .eq("id", memberId);
    };

    if (roleLoading) return null;

    const { activeCompany } = useCompany(); // add this import too

if (roleLoading) return null;

if (activeCompany && !activeCompany.isOwn) {
  return (
    <div className="min-h-screen flex items-center justify-center">
      <p className="text-gray-500">Team settings only available for your own company.</p>
    </div>
  );
}

    return (
        <div className="min-h-screen bg-gradient-to-br from-green-50 via-white to-purple-50">
            <Navbar />
            <div className="container mx-auto px-4 py-8 max-w-3xl">
                <div className="flex items-center gap-4 mb-8">
                    <Button onClick={() => navigate("/")} variant="outline" size="sm">
                        <ArrowLeft className="w-4 h-4 mr-2" /> Back
                    </Button>
                    <div>
                        <h1 className="text-3xl font-bold bg-gradient-to-r from-green-600 to-purple-600 bg-clip-text text-transparent">
                            Team & Roles
                        </h1>
                        <p className="text-gray-500 text-sm">Grant team members access to your company data</p>
                    </div>
                </div>

                {/* ADD MEMBER */}
                <Card className="mb-6">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2 text-lg">
                            <UserPlus className="w-5 h-5" /> Add Team Member
                        </CardTitle>
                        <CardDescription>Search by email, choose a role, then assign.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        {/* Search */}
                        <div className="flex gap-2">
                            <Input
                                placeholder="Enter user's email address"
                                value={searchEmail}
                                onChange={(e) => setSearchEmail(e.target.value)}
                                onKeyDown={(e) => e.key === "Enter" && handleSearchUser()}
                            />
                            <Button onClick={handleSearchUser} disabled={searching} variant="outline">
                                <Search className="w-4 h-4 mr-1" />
                                {searching ? "Searching..." : "Search"}
                            </Button>
                        </div>

                        {/* Result */}
                        {searchResult && (
                            <div className="border rounded-lg p-4 space-y-4 bg-green-50">
                                <p className="text-sm font-medium text-green-800">
                                    ✅ Found: <span className="font-bold">{searchResult.email}</span>
                                </p>

                                {/* Role select */}
                                <div>
                                    <Label>Assign Role</Label>
                                    <Select value={selectedRole} onValueChange={(v) => setSelectedRole(v as Role)}>
                                        <SelectTrigger className="mt-1">
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="admin">Admin – Full Access</SelectItem>
                                            <SelectItem value="manager">Manager – View + Edit All</SelectItem>
                                            <SelectItem value="custom">Custom – Choose Sections</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>

                                {/* Custom permissions */}
                                {selectedRole === "custom" && (
                                    <div>
                                        <Label className="mb-2 block">Allow access to:</Label>
                                        <div className="grid grid-cols-2 gap-2">
                                            {SECTIONS.map((s) => (
                                                <div key={s} className="flex items-center gap-2">
                                                    <Checkbox
                                                        id={s}
                                                        checked={customPerms[s]}
                                                        onCheckedChange={(checked) =>
                                                            setCustomPerms((p) => ({ ...p, [s]: !!checked }))
                                                        }
                                                    />
                                                    <Label htmlFor={s} className="capitalize cursor-pointer">{s}</Label>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                <Button
                                    onClick={handleAssignRole}
                                    disabled={assigning}
                                    className="w-full bg-gradient-to-r from-green-600 to-purple-600 hover:from-green-700 hover:to-purple-700"
                                >
                                    <Shield className="w-4 h-4 mr-2" />
                                    {assigning ? "Assigning..." : `Assign ${selectedRole} Role`}
                                </Button>
                            </div>
                        )}
                    </CardContent>
                </Card>

                {/* TEAM MEMBERS LIST */}
                <Card>
                    <CardHeader>
                        <CardTitle className="text-lg">Current Team Members</CardTitle>
                    </CardHeader>
                    <CardContent>
                        {loadingMembers ? (
                            <p className="text-sm text-gray-400">Loading...</p>
                        ) : teamMembers.length === 0 ? (
                            <p className="text-sm text-gray-400 text-center py-4">No team members yet.</p>
                        ) : (
                            <div className="space-y-3">
                                {teamMembers.map((m) => (
                                    <div key={m.id} className="flex items-center justify-between border rounded-lg px-4 py-3">
                                        <div>
                                            <p className="text-sm font-medium">{m.email}</p>
                                            {m.role === "custom" && (
                                                <p className="text-xs text-gray-400 mt-0.5">
                                                    Sections: {SECTIONS.filter((s) => m.custom_permissions[s]).join(", ") || "None"}
                                                </p>
                                            )}
                                        </div>
                                        <div className="flex items-center gap-3">
                                            <span className={`text-xs font-semibold px-2 py-1 rounded-full capitalize ${roleBadgeColor[m.role]}`}>
                                                {m.role}
                                            </span>
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                onClick={() => handleRemoveMember(m.id)}
                                                className="text-red-500 hover:text-red-700"
                                            >
                                                <Trash2 className="w-4 h-4" />
                                            </Button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>
        </div>
    );
};

export default TeamSettings;