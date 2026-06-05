// src/pages/Index.tsx
// Main dashboard — shows business overview, quick stats, recent activity,
// and an employees widget linking to /employees.

import { useEffect, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useCompany } from "@/hooks/useCompany";
import { useRole } from "@/hooks/useRole";
import {
  FileText, Users, Package, BookOpen, ShoppingCart,
  TrendingUp, TrendingDown, ArrowRight, Plus,
  CreditCard, Building2, UserCircle, Layers,
} from "lucide-react";
import { Button } from "@/components/ui/button";

// ── Types ─────────────────────────────────────────────────────────────────────
interface Stats {
  totalInvoices: number;
  totalRevenue: number;
  totalCustomers: number;
  totalInventory: number;
  totalPurchases: number;
  cashbookBalance: number;
  employeeCount: number;
}

interface RecentInvoice {
  id: string;
  invoice_number: string;
  client_name: string;
  total_amount: number;
  created_at: string;
  status?: string;
}

interface RecentEmployee {
  id: string;
  name: string;
  designation: string;
  department: string;
  template: string;
  orientation?: string;
  photo_url: string | null;
}

// ── Helpers ───────────────────────────────────────────────────────────────────
const fmt = (n: number) =>
  new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(n);

const templateColor: Record<string, string> = {
  classic:   "bg-blue-100 text-blue-700",
  modern:    "bg-violet-100 text-violet-700",
  minimal:   "bg-emerald-100 text-emerald-700",
  executive: "bg-amber-100 text-amber-700",
};

// ── Dashboard ─────────────────────────────────────────────────────────────────
const Index = () => {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const { activeCompany } = useCompany();
  const { isAdmin, can } = useRole();

  const [stats, setStats] = useState<Stats>({
    totalInvoices: 0, totalRevenue: 0, totalCustomers: 0,
    totalInventory: 0, totalPurchases: 0, cashbookBalance: 0, employeeCount: 0,
  });
  const [recentInvoices, setRecentInvoices] = useState<RecentInvoice[]>([]);
  const [recentEmployees, setRecentEmployees] = useState<RecentEmployee[]>([]);
  const [loading, setLoading] = useState(true);
  const [bizName, setBizName] = useState("My Company");

  // ── Auth guard ──
  useEffect(() => {
    if (!authLoading && !user) navigate("/auth", { replace: true });
  }, [user, authLoading]);

  const ownerId = activeCompany?.companyOwnerId ?? user?.id ?? null;

  useEffect(() => {
    if (!ownerId) return;
    fetchAll();
  }, [ownerId]);

  const fetchAll = async () => {
    if (!ownerId) return;
    setLoading(true);
    await Promise.all([
      fetchBiz(),
      fetchStats(),
      fetchRecentInvoices(),
      fetchRecentEmployees(),
    ]);
    setLoading(false);
  };

  const fetchBiz = async () => {
    const { data } = await (supabase as any)
      .from("business_settings")
      .select("business_name")
      .eq("user_id", ownerId)
      .maybeSingle();
    if (data?.business_name) setBizName(data.business_name);
  };

  const fetchStats = async () => {
    const [invoices, customers, inventory, purchases, cashbook, employees] = await Promise.all([
      (supabase as any).from("invoices").select("total_amount").eq("user_id", ownerId),
      (supabase as any).from("customers").select("id", { count: "exact" }).eq("user_id", ownerId),
      (supabase as any).from("inventory").select("id", { count: "exact" }).eq("user_id", ownerId),
      (supabase as any).from("purchase_invoices").select("total_amount").eq("user_id", ownerId),
      (supabase as any).from("cashbook_entries").select("amount,type").eq("user_id", ownerId),
      (supabase as any).from("employees").select("id", { count: "exact" }).eq("user_id", ownerId),
    ]);

    const totalRevenue = (invoices.data || []).reduce((s: number, i: any) => s + (Number(i.total_amount) || 0), 0);
    const totalPurchases = (purchases.data || []).reduce((s: number, i: any) => s + (Number(i.total_amount) || 0), 0);
    const cashbookBalance = (cashbook.data || []).reduce((s: number, e: any) => {
      return e.type === "income" ? s + Number(e.amount) : s - Number(e.amount);
    }, 0);

    setStats({
      totalInvoices: invoices.data?.length || 0,
      totalRevenue,
      totalCustomers: customers.count || 0,
      totalInventory: inventory.count || 0,
      totalPurchases,
      cashbookBalance,
      employeeCount: employees.count || 0,
    });
  };

  const fetchRecentInvoices = async () => {
    const { data } = await (supabase as any)
      .from("invoices")
      .select("id,invoice_number,client_name,total_amount,created_at,status")
      .eq("user_id", ownerId)
      .order("created_at", { ascending: false })
      .limit(5);
    setRecentInvoices(data || []);
  };

  const fetchRecentEmployees = async () => {
    const { data } = await (supabase as any)
      .from("employees")
      .select("id,name,designation,department,template,orientation,photo_url")
      .eq("user_id", ownerId)
      .order("created_at", { ascending: false })
      .limit(5);
    setRecentEmployees(data || []);
  };

  if (authLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 via-white to-indigo-50">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-sm text-gray-400">Loading dashboard…</p>
        </div>
      </div>
    );
  }

  // ── Quick nav items (role-gated) ──
  const quickLinks = [
    { label: "New Invoice",      icon: FileText,   href: "/invoices",          show: can("invoices"),  accent: "bg-indigo-600 text-white hover:bg-indigo-700" },
    { label: "Customers",        icon: UserCircle, href: "/customers",         show: can("customers"), accent: "bg-white text-gray-700 border border-gray-200 hover:bg-gray-50" },
    { label: "Inventory",        icon: Package,    href: "/inventory",         show: can("inventory"), accent: "bg-white text-gray-700 border border-gray-200 hover:bg-gray-50" },
    { label: "Cashbook",         icon: BookOpen,   href: "/cashbook",          show: can("cashbook"),  accent: "bg-white text-gray-700 border border-gray-200 hover:bg-gray-50" },
    { label: "Purchases",        icon: ShoppingCart, href: "/purchase-invoices", show: isAdmin,        accent: "bg-white text-gray-700 border border-gray-200 hover:bg-gray-50" },
    { label: "Employees",        icon: Users,      href: "/employees",         show: isAdmin,          accent: "bg-white text-gray-700 border border-gray-200 hover:bg-gray-50" },
    { label: "Business Settings",icon: Building2,  href: "/business-settings", show: isAdmin,          accent: "bg-white text-gray-700 border border-gray-200 hover:bg-gray-50" },
  ].filter(l => l.show);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-indigo-50">
      <div className="container mx-auto px-4 py-8 max-w-6xl">

        {/* ── Welcome header ── */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">
            Welcome back{bizName !== "My Company" ? `, ${bizName}` : ""} 👋
          </h1>
          <p className="text-gray-500 mt-1">Here's what's happening with your business today.</p>
        </div>

        {/* ── Quick links ── */}
        <div className="flex flex-wrap gap-2 mb-8">
          {quickLinks.map(({ label, icon: Icon, href, accent }) => (
            <Link key={href} to={href}>
              <button className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all ${accent}`}>
                <Icon className="w-4 h-4" />
                {label}
              </button>
            </Link>
          ))}
        </div>

        {/* ── Stat cards ── */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 mb-8">
          {[
            {
              label: "Total Revenue",
              value: fmt(stats.totalRevenue),
              icon: TrendingUp,
              iconColor: "text-emerald-600",
              iconBg: "bg-emerald-50",
              show: can("invoices"),
            },
            {
              label: "Invoices",
              value: stats.totalInvoices,
              icon: FileText,
              iconColor: "text-indigo-600",
              iconBg: "bg-indigo-50",
              show: can("invoices"),
            },
            {
              label: "Customers",
              value: stats.totalCustomers,
              icon: UserCircle,
              iconColor: "text-blue-600",
              iconBg: "bg-blue-50",
              show: can("customers"),
            },
            {
              label: "Inventory Items",
              value: stats.totalInventory,
              icon: Package,
              iconColor: "text-violet-600",
              iconBg: "bg-violet-50",
              show: can("inventory"),
            },
            {
              label: "Total Purchases",
              value: fmt(stats.totalPurchases),
              icon: TrendingDown,
              iconColor: "text-rose-600",
              iconBg: "bg-rose-50",
              show: isAdmin,
            },
            {
              label: "Cashbook Balance",
              value: fmt(stats.cashbookBalance),
              icon: BookOpen,
              iconColor: stats.cashbookBalance >= 0 ? "text-emerald-600" : "text-rose-600",
              iconBg: stats.cashbookBalance >= 0 ? "bg-emerald-50" : "bg-rose-50",
              show: can("cashbook"),
            },
            {
              label: "Employees",
              value: stats.employeeCount,
              icon: Users,
              iconColor: "text-amber-600",
              iconBg: "bg-amber-50",
              show: isAdmin,
            },
            {
              label: "Templates",
              value: "4 styles",
              icon: Layers,
              iconColor: "text-gray-600",
              iconBg: "bg-gray-50",
              show: isAdmin,
            },
          ].filter(s => s.show).map(({ label, value, icon: Icon, iconColor, iconBg }) => (
            <div key={label} className="bg-white rounded-2xl border border-gray-200 shadow-sm p-4 hover:shadow-md transition-shadow">
              <div className="flex items-center justify-between mb-3">
                <p className="text-xs text-gray-400 font-medium">{label}</p>
                <div className={`w-8 h-8 rounded-lg ${iconBg} flex items-center justify-center`}>
                  <Icon className={`w-4 h-4 ${iconColor}`} />
                </div>
              </div>
              <p className="text-2xl font-bold text-gray-900">{value}</p>
            </div>
          ))}
        </div>

        {/* ── Bottom two-column section ── */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

          {/* ── Recent Invoices ── */}
          {can("invoices") && (
            <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <FileText className="w-5 h-5 text-indigo-600" />
                  <h2 className="font-semibold text-gray-900">Recent Invoices</h2>
                </div>
                <Link to="/invoices" className="flex items-center gap-1 text-sm text-indigo-600 hover:text-indigo-800 transition-colors">
                  View all <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </div>

              {recentInvoices.length === 0 ? (
                <div className="text-center py-10">
                  <FileText className="w-10 h-10 mx-auto mb-2 text-gray-200" />
                  <p className="text-sm text-gray-400">No invoices yet</p>
                  <Link to="/invoices">
                    <Button size="sm" className="mt-3 bg-indigo-600 hover:bg-indigo-700 text-white">
                      <Plus className="w-3.5 h-3.5 mr-1" /> Create Invoice
                    </Button>
                  </Link>
                </div>
              ) : (
                <div className="space-y-2">
                  {recentInvoices.map(inv => (
                    <div key={inv.id} className="flex items-center justify-between p-2.5 rounded-xl hover:bg-gray-50 transition-colors">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-indigo-50 flex items-center justify-center flex-shrink-0">
                          <FileText className="w-4 h-4 text-indigo-500" />
                        </div>
                        <div>
                          <p className="text-sm font-medium text-gray-800">{inv.client_name || "—"}</p>
                          <p className="text-xs text-gray-400">
                            {inv.invoice_number} · {new Date(inv.created_at).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-semibold text-gray-900">{fmt(inv.total_amount || 0)}</p>
                        {inv.status && (
                          <span className={`text-xs px-1.5 py-0.5 rounded font-medium ${
                            inv.status === "paid"   ? "bg-emerald-100 text-emerald-700" :
                            inv.status === "unpaid" ? "bg-rose-100 text-rose-700" :
                            "bg-gray-100 text-gray-500"
                          }`}>{inv.status}</span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ── Employees widget ── */}
          {isAdmin && (
            <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <Users className="w-5 h-5 text-amber-600" />
                  <h2 className="font-semibold text-gray-900">Employees</h2>
                  {stats.employeeCount > 0 && (
                    <span className="text-xs bg-amber-100 text-amber-700 rounded-full px-2 py-0.5 font-medium">
                      {stats.employeeCount}
                    </span>
                  )}
                </div>
                <Link to="/employees" className="flex items-center gap-1 text-sm text-indigo-600 hover:text-indigo-800 transition-colors">
                  Manage <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </div>

              {recentEmployees.length === 0 ? (
                <div className="text-center py-10">
                  <CreditCard className="w-10 h-10 mx-auto mb-2 text-gray-200" />
                  <p className="text-sm text-gray-400">No employees yet</p>
                  <p className="text-xs text-gray-300 mt-1">Add staff and generate ID cards</p>
                  <Link to="/employees">
                    <Button size="sm" className="mt-3 bg-indigo-600 hover:bg-indigo-700 text-white">
                      <Plus className="w-3.5 h-3.5 mr-1" /> Add Employee
                    </Button>
                  </Link>
                </div>
              ) : (
                <div className="space-y-2">
                  {recentEmployees.map(emp => (
                    <div key={emp.id} className="flex items-center gap-3 p-2.5 rounded-xl hover:bg-gray-50 transition-colors">
                      {/* Avatar */}
                      {emp.photo_url ? (
                        <img
                          src={emp.photo_url}
                          alt={emp.name}
                          className="w-9 h-9 rounded-full object-cover border border-gray-200 flex-shrink-0"
                        />
                      ) : (
                        <div className="w-9 h-9 rounded-full bg-indigo-100 flex items-center justify-center flex-shrink-0 text-indigo-600 font-bold text-sm">
                          {emp.name?.[0]?.toUpperCase() || "?"}
                        </div>
                      )}

                      {/* Info */}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-800 truncate">{emp.name}</p>
                        <p className="text-xs text-gray-400 truncate">
                          {[emp.designation, emp.department].filter(Boolean).join(" · ")}
                        </p>
                      </div>

                      {/* Badges */}
                      <div className="flex items-center gap-1 flex-shrink-0">
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium capitalize ${templateColor[emp.template] || "bg-gray-100 text-gray-500"}`}>
                          {emp.template}
                        </span>
                        {emp.orientation === "portrait" && (
                          <span className="text-xs px-1.5 py-0.5 rounded bg-purple-100 text-purple-600 font-medium">P</span>
                        )}
                      </div>
                    </div>
                  ))}

                  {stats.employeeCount > 5 && (
                    <Link to="/employees" className="block text-center text-xs text-gray-400 pt-2 hover:text-indigo-500 transition-colors">
                      +{stats.employeeCount - 5} more employees →
                    </Link>
                  )}
                </div>
              )}

              {/* ID card type breakdown */}
              {stats.employeeCount > 0 && (
                <div className="mt-4 pt-4 border-t border-gray-100">
                  <p className="text-xs text-gray-400 mb-2 font-medium">Card styles</p>
                  <div className="flex flex-wrap gap-2">
                    {["classic", "modern", "minimal", "executive"].map(t => {
                      const count = recentEmployees.filter(e => e.template === t).length;
                      if (!count) return null;
                      return (
                        <span key={t} className={`text-xs px-2 py-0.5 rounded-full font-medium capitalize ${templateColor[t]}`}>
                          {t} · {count}
                        </span>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ── If only one column shows (non-admin), fill with a settings CTA ── */}
          {!can("invoices") && !isAdmin && (
            <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5 flex flex-col items-center justify-center text-center gap-3 min-h-[200px]">
              <Building2 className="w-10 h-10 text-gray-200" />
              <p className="text-sm font-medium text-gray-600">Limited access</p>
              <p className="text-xs text-gray-400">Contact your admin to get access to more sections.</p>
            </div>
          )}

        </div>

        {/* ── Cashbook snapshot (if access) ── */}
        {can("cashbook") && (
          <div className="mt-6 bg-white rounded-2xl border border-gray-200 shadow-sm p-5">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <BookOpen className="w-5 h-5 text-teal-600" />
                <h2 className="font-semibold text-gray-900">Cashbook Snapshot</h2>
              </div>
              <Link to="/cashbook" className="flex items-center gap-1 text-sm text-indigo-600 hover:text-indigo-800 transition-colors">
                Open cashbook <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>
            <div className="grid grid-cols-3 gap-4">
              {[
                {
                  label: "Revenue",
                  value: fmt(stats.totalRevenue),
                  color: "text-emerald-600",
                  bg: "bg-emerald-50",
                  icon: TrendingUp,
                },
                {
                  label: "Purchases",
                  value: fmt(stats.totalPurchases),
                  color: "text-rose-600",
                  bg: "bg-rose-50",
                  icon: TrendingDown,
                },
                {
                  label: "Net Balance",
                  value: fmt(stats.cashbookBalance),
                  color: stats.cashbookBalance >= 0 ? "text-emerald-600" : "text-rose-600",
                  bg: stats.cashbookBalance >= 0 ? "bg-emerald-50" : "bg-rose-50",
                  icon: stats.cashbookBalance >= 0 ? TrendingUp : TrendingDown,
                },
              ].map(({ label, value, color, bg, icon: Icon }) => (
                <div key={label} className={`rounded-xl ${bg} p-4`}>
                  <div className="flex items-center gap-2 mb-2">
                    <Icon className={`w-4 h-4 ${color}`} />
                    <p className={`text-xs font-medium ${color}`}>{label}</p>
                  </div>
                  <p className={`text-xl font-bold ${color}`}>{value}</p>
                </div>
              ))}
            </div>
          </div>
        )}

      </div>
    </div>
  );
};

export default Index;