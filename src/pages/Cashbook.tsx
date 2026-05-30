import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/hooks/use-toast";
import {
  Plus, Edit, Trash2, Search, TrendingUp, TrendingDown,
  Wallet, Download, Calendar, Filter,
} from "lucide-react";
import Navbar from "@/components/Navbar";
import { useActiveOwnerId } from "@/hooks/useActiveOwnerId";
import { useCompany } from "@/hooks/useCompany";
import { Building2 } from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────

type TransactionType = "income" | "expense";

type PaymentMethod = "cash" | "upi" | "bank_transfer" | "cheque" | "card" | "other";

interface CashbookEntry {
  amount: number
  category: string
  created_at: string
  date: string
  description: string
  id: string
  notes: string | null
  party_name: string | null
  payment_method: string
  reference_number: string | null
  transaction_date: string
  type: string
  updated_at: string
  user_id: string
}

// ─── Constants ────────────────────────────────────────────────────────────────

const INCOME_CATEGORIES = [
  "Sales", "Service Income", "Rent Received", "Interest Received",
  "Commission", "Refund Received", "Other Income",
];

const EXPENSE_CATEGORIES = [
  "Purchase / Stock", "Salary & Wages", "Rent Paid", "Utilities",
  "Transport / Freight", "Marketing", "Repair & Maintenance",
  "Office Supplies", "Bank Charges", "Tax & Government Fees",
  "Miscellaneous", "Other Expense",
];

const PAYMENT_METHODS: { value: PaymentMethod; label: string }[] = [
  { value: "cash", label: "Cash" },
  { value: "upi", label: "UPI" },
  { value: "bank_transfer", label: "Bank Transfer" },
  { value: "cheque", label: "Cheque" },
  { value: "card", label: "Card" },
  { value: "other", label: "Other" },
];


const today = () => new Date().toISOString().split("T")[0];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatCurrency(n: number) {
  return "₹" + n.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
}

function downloadCSV(filename: string, rows: string[][]) {
  const content = rows.map((r) => r.map((c) => `"${c.replace(/"/g, '""')}"`).join(",")).join("\n");
  const blob = new Blob([content], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = filename; a.click();
  URL.revokeObjectURL(url);
}

// ─── Component ────────────────────────────────────────────────────────────────

const Cashbook = () => {
  const { user } = useAuth();
const ownerId = useActiveOwnerId();
const { activeCompany } = useCompany();
  const [entries, setEntries] = useState<CashbookEntry[]>([]);
  const [filtered, setFiltered] = useState<CashbookEntry[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  // filters
  const [searchTerm, setSearchTerm] = useState("");
  const [typeFilter, setTypeFilter] = useState<"all" | TransactionType>("all");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [methodFilter, setMethodFilter] = useState("all");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  // dialog
  const [showDialog, setShowDialog] = useState(false);
  const [editingEntry, setEditingEntry] = useState<CashbookEntry | null>(null);

  const blankForm = {
    type: "income" as TransactionType,
    amount: 0,
    category: "",
    description: "",
    reference_number: "",
    payment_method: "cash" as PaymentMethod,
    party_name: "",
    transaction_date: today(),
    notes: "",
  };
  const [formData, setFormData] = useState(blankForm);

  // useEffect(() => { if (user) fetchEntries(); }, [user]);
  useEffect(() => { if (ownerId) fetchEntries(); }, [ownerId]);
  useEffect(() => { applyFilters(); }, [entries, searchTerm, typeFilter, categoryFilter, methodFilter, dateFrom, dateTo]);

  // ── Data fetching ─────────────────────────────────────────────────────────

  const fetchEntries = async () => {
  if (!ownerId) return;
  setIsLoading(true);
  try {
    const { data, error } = await supabase
      .from("cashbook_entries")
      .select("*")
      .eq("user_id", ownerId)
      .order("transaction_date", { ascending: false });
    if (error) throw error;
    setEntries(data || []);
  } catch {
    toast({ title: "Error", description: "Failed to fetch cashbook entries.", variant: "destructive" });
  }
  setIsLoading(false);
};

  // ── Filtering ─────────────────────────────────────────────────────────────

  const applyFilters = () => {
    let f = entries;
    if (searchTerm) f = f.filter((e) =>
      e.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      e.party_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      e.reference_number?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      e.category.toLowerCase().includes(searchTerm.toLowerCase())
    );
    if (typeFilter !== "all") f = f.filter((e) => e.type === typeFilter);
    if (categoryFilter !== "all") f = f.filter((e) => e.category === categoryFilter);
    if (methodFilter !== "all") f = f.filter((e) => e.payment_method === methodFilter);
    if (dateFrom) f = f.filter((e) => e.transaction_date >= dateFrom);
    if (dateTo) f = f.filter((e) => e.transaction_date <= dateTo);
    setFiltered(f);
  };

  // ── Totals ────────────────────────────────────────────────────────────────

  const totalIncome = filtered.filter((e) => e.type === "income").reduce((s, e) => s + e.amount, 0);
  const totalExpense = filtered.filter((e) => e.type === "expense").reduce((s, e) => s + e.amount, 0);
  const netBalance = totalIncome - totalExpense;

  // ── CRUD ──────────────────────────────────────────────────────────────────

  const handleSave = async () => {
    if (!user) return;
    if (!formData.category) { toast({ title: "Error", description: "Please select a category.", variant: "destructive" }); return; }
    if (!formData.amount || formData.amount <= 0) { toast({ title: "Error", description: "Amount must be greater than zero.", variant: "destructive" }); return; }

    try {
      const payload = {
  user_id: ownerId,

  type: formData.type,

  amount: Number(formData.amount),

  category: formData.category,

  description: formData.description,

  payment_method: formData.payment_method,

  reference_number: formData.reference_number || null,

  party_name: formData.party_name || null,

  transaction_date: formData.transaction_date,

  notes: formData.notes || null,
  date: formData.transaction_date, // for backward compatibility
};

      if (editingEntry) {
        const { error } = await supabase.from("cashbook_entries").update(payload).eq("id", editingEntry.id);
        if (error) throw error;
        toast({ title: "Success", description: "Entry updated." });
      } else {
        const { error } = await supabase.from("cashbook_entries").insert(payload);
        if (error) throw error;
        toast({ title: "Success", description: "Entry recorded." });
      }
      resetForm(); fetchEntries();
    } catch {
      toast({ title: "Error", description: "Failed to save entry.", variant: "destructive" });
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this cashbook entry?")) return;
    try {
      const { error } = await supabase.from("cashbook_entries").delete().eq("id", id);
      if (error) throw error;
      toast({ title: "Deleted", description: "Entry removed." });
      fetchEntries();
    } catch {
      toast({ title: "Error", description: "Failed to delete entry.", variant: "destructive" });
    }
  };

  const handleEdit = (entry: CashbookEntry) => {
    setFormData({
        type: entry.type as TransactionType,
      amount: entry.amount,
      category: entry.category,
      description: entry.description || "",
      reference_number: entry.reference_number || "",
        payment_method: entry.payment_method as PaymentMethod,
      party_name: entry.party_name || "",
      transaction_date: entry.transaction_date,
      notes: entry.notes || "",
    });
    setEditingEntry(entry);
    setShowDialog(true);
  };

  const resetForm = () => {
    setFormData(blankForm);
    setEditingEntry(null);
    setShowDialog(false);
  };

  // ── Export ────────────────────────────────────────────────────────────────

  const handleExportCSV = () => {
    const headers = ["Date", "Type", "Category", "Description", "Party", "Amount", "Payment Method", "Reference"];
    const rows = filtered.map((e) => [
      e.transaction_date, e.type, e.category,
      e.description || "", e.party_name || "",
      e.amount.toFixed(2), e.payment_method, e.reference_number || "",
    ]);
    downloadCSV(`cashbook_${today()}.csv`, [headers, ...rows]);
    toast({ title: "Exported", description: `${filtered.length} entries exported.` });
  };

  // ── Derived ───────────────────────────────────────────────────────────────

  const allCategories = [...new Set(entries.map((e) => e.category))].sort();

  // Categories for current type in form
  const formCategories = formData.type === "income" ? INCOME_CATEGORIES : EXPENSE_CATEGORIES;

  // Running balance rows (oldest first for calculation, then reverse for display)
  const withBalance = (() => {
    const sorted = [...filtered].sort((a, b) => a.transaction_date.localeCompare(b.transaction_date));
    let bal = 0;
    const rows = sorted.map((e) => {
      bal += e.type === "income" ? e.amount : -e.amount;
      return { ...e, runningBalance: bal };
    });
    return rows.reverse();
  })();

  // ─── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 via-white to-yellow-50">
      <Navbar />
      <div className="container mx-auto px-4 py-8">

        {/* Header */}
        <div className="flex items-center justify-between mb-8 flex-wrap gap-3">
          <div>
            <h1 className="text-3xl font-bold bg-gradient-to-r from-green-600 to-yellow-600 bg-clip-text text-transparent">
              Cashbook
            </h1>
            <p className="text-muted-foreground">Record and track all cash inflows and outflows</p>
          </div>
          <div className="flex gap-2 flex-wrap">
            <Button variant="outline" onClick={handleExportCSV} className="border-blue-300 text-blue-700 hover:bg-blue-50">
              <Download className="w-4 h-4 mr-2" />Export CSV
            </Button>
            <Button
              onClick={() => { setFormData(blankForm); setEditingEntry(null); setShowDialog(true); }}
              className="bg-gradient-to-r from-green-600 to-yellow-600 hover:from-green-700 hover:to-yellow-700"
            >
              <Plus className="w-4 h-4 mr-2" />Add Entry
            </Button>
          </div>
        </div>

        {/* Summary cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <Card className="border-green-200 bg-green-50">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-green-700 font-medium">Total Income</p>
                  <p className="text-2xl font-bold text-green-800">{formatCurrency(totalIncome)}</p>
                </div>
                <div className="w-12 h-12 rounded-full bg-green-200 flex items-center justify-center">
                  <TrendingUp className="w-6 h-6 text-green-700" />
                </div>
              </div>
              <p className="text-xs text-green-600 mt-2">{filtered.filter((e) => e.type === "income").length} entries</p>
            </CardContent>
          </Card>

          <Card className="border-red-200 bg-red-50">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-red-700 font-medium">Total Expenses</p>
                  <p className="text-2xl font-bold text-red-800">{formatCurrency(totalExpense)}</p>
                </div>
                <div className="w-12 h-12 rounded-full bg-red-200 flex items-center justify-center">
                  <TrendingDown className="w-6 h-6 text-red-700" />
                </div>
              </div>
              <p className="text-xs text-red-600 mt-2">{filtered.filter((e) => e.type === "expense").length} entries</p>
            </CardContent>
          </Card>

          <Card className={netBalance >= 0 ? "border-blue-200 bg-blue-50" : "border-orange-200 bg-orange-50"}>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className={`text-sm font-medium ${netBalance >= 0 ? "text-blue-700" : "text-orange-700"}`}>Net Balance</p>
                  <p className={`text-2xl font-bold ${netBalance >= 0 ? "text-blue-800" : "text-orange-800"}`}>{formatCurrency(Math.abs(netBalance))}</p>
                </div>
                <div className={`w-12 h-12 rounded-full flex items-center justify-center ${netBalance >= 0 ? "bg-blue-200" : "bg-orange-200"}`}>
                  <Wallet className={`w-6 h-6 ${netBalance >= 0 ? "text-blue-700" : "text-orange-700"}`} />
                </div>
              </div>
              <p className={`text-xs mt-2 ${netBalance >= 0 ? "text-blue-600" : "text-orange-600"}`}>
                {netBalance >= 0 ? "Surplus" : "Deficit"} · {filtered.length} total entries
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <Card className="mb-6">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2"><Filter className="w-4 h-4" />Filters</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-3">
              <div className="lg:col-span-2">
                <Label className="text-xs">Search</Label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground w-3 h-3" />
                  <Input placeholder="Description, party, ref…" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="pl-8 h-8 text-sm" />
                </div>
              </div>
              <div>
                <Label className="text-xs">Type</Label>
                <Select value={typeFilter} onValueChange={(v) => setTypeFilter(v as any)}>
                  <SelectTrigger className="h-8 text-sm"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Types</SelectItem>
                    <SelectItem value="income">Income</SelectItem>
                    <SelectItem value="expense">Expense</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs">Category</Label>
                <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                  <SelectTrigger className="h-8 text-sm"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Categories</SelectItem>
                    {allCategories.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs">Payment Method</Label>
                <Select value={methodFilter} onValueChange={setMethodFilter}>
                  <SelectTrigger className="h-8 text-sm"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Methods</SelectItem>
                    {PAYMENT_METHODS.map((m) => <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="lg:col-span-1 flex flex-col gap-1">
                <Label className="text-xs">Date Range</Label>
                <div className="flex gap-1">
                  <Input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} className="h-8 text-xs" />
                  <Input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} className="h-8 text-xs" />
                </div>
              </div>
            </div>
            <div className="mt-3">
              <Button variant="ghost" size="sm" className="text-xs" onClick={() => { setSearchTerm(""); setTypeFilter("all"); setCategoryFilter("all"); setMethodFilter("all"); setDateFrom(""); setDateTo(""); }}>
                Clear All Filters
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Ledger Table */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="w-5 h-5" />
              Ledger ({filtered.length} entries)
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="text-center py-8">Loading entries…</div>
            ) : withBalance.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <Wallet className="w-12 h-12 mx-auto mb-3 opacity-30" />
                <p>No entries found.</p>
                <p className="text-sm">Add your first cashbook entry to get started.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Category</TableHead>
                      <TableHead>Description / Party</TableHead>
                      <TableHead>Payment</TableHead>
                      <TableHead>Reference</TableHead>
                      <TableHead className="text-right text-green-700">Credit (+)</TableHead>
                      <TableHead className="text-right text-red-700">Debit (−)</TableHead>
                      <TableHead className="text-right">Balance</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {withBalance.map((entry) => (
                      <TableRow key={entry.id} className={entry.type === "income" ? "hover:bg-green-50/50" : "hover:bg-red-50/50"}>
                        <TableCell className="text-sm whitespace-nowrap">{formatDate(entry.transaction_date)}</TableCell>
                        <TableCell>
                          <Badge variant={entry.type === "income" ? "default" : "destructive"} className={entry.type === "income" ? "bg-green-100 text-green-800 border-green-200" : ""}>
                            {entry.type === "income" ? <TrendingUp className="w-3 h-3 mr-1 inline" /> : <TrendingDown className="w-3 h-3 mr-1 inline" />}
                            {entry.type === "income" ? "Income" : "Expense"}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-sm">{entry.category}</TableCell>
                        <TableCell>
                          <div className="text-sm">{entry.description || <span className="text-muted-foreground italic">—</span>}</div>
                          {entry.party_name && <div className="text-xs text-muted-foreground">{entry.party_name}</div>}
                        </TableCell>
                        <TableCell className="text-sm capitalize">{entry.payment_method.replace("_", " ")}</TableCell>
                        <TableCell className="text-xs text-muted-foreground">{entry.reference_number || "—"}</TableCell>
                        <TableCell className="text-right font-medium text-green-700">
                          {entry.type === "income" ? formatCurrency(entry.amount) : ""}
                        </TableCell>
                        <TableCell className="text-right font-medium text-red-700">
                          {entry.type === "expense" ? formatCurrency(entry.amount) : ""}
                        </TableCell>
                        <TableCell className={`text-right font-semibold text-sm ${entry.runningBalance >= 0 ? "text-blue-700" : "text-orange-700"}`}>
                          {formatCurrency(entry.runningBalance)}
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-1">
                            <Button size="sm" variant="outline" onClick={() => handleEdit(entry)}><Edit className="w-3 h-3" /></Button>
                            <Button size="sm" variant="outline" className="text-red-600 hover:text-red-700" onClick={() => handleDelete(entry.id)}><Trash2 className="w-3 h-3" /></Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Add / Edit Dialog */}
        <Dialog open={showDialog} onOpenChange={(o) => { if (!o) resetForm(); }}>
          <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{editingEntry ? "Edit Entry" : "Add Cashbook Entry"}</DialogTitle>
              <DialogDescription>
                {editingEntry ? "Update the details of this transaction." : "Record a new income or expense transaction."}
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4">
              {/* Type toggle */}
              <div>
                <Label>Transaction Type *</Label>
                <div className="grid grid-cols-2 gap-2 mt-1">
                  <button
                    type="button"
                    onClick={() => setFormData((p) => ({ ...p, type: "income", category: "" }))}
                    className={`py-2 rounded-md border text-sm font-medium transition-colors ${formData.type === "income" ? "bg-green-600 text-white border-green-600" : "border-gray-200 hover:bg-green-50 text-gray-700"}`}
                  >
                    <TrendingUp className="w-4 h-4 inline mr-1" />Income
                  </button>
                  <button
                    type="button"
                    onClick={() => setFormData((p) => ({ ...p, type: "expense", category: "" }))}
                    className={`py-2 rounded-md border text-sm font-medium transition-colors ${formData.type === "expense" ? "bg-red-600 text-white border-red-600" : "border-gray-200 hover:bg-red-50 text-gray-700"}`}
                  >
                    <TrendingDown className="w-4 h-4 inline mr-1" />Expense
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                {/* Date */}
                <div>
                  <Label>Date *</Label>
                  <Input type="date" value={formData.transaction_date} onChange={(e) => setFormData((p) => ({ ...p, transaction_date: e.target.value }))} />
                </div>
                {/* Amount */}
                <div>
                  <Label>Amount (₹) *</Label>
                  <Input type="number" step="0.01" min={0} value={formData.amount || ""} onChange={(e) => setFormData((p) => ({ ...p, amount: parseFloat(e.target.value) || 0 }))} placeholder="0.00" />
                </div>
                {/* Category */}
                <div>
                  <Label>Category *</Label>
                  <Select value={formData.category} onValueChange={(v) => setFormData((p) => ({ ...p, category: v }))}>
                    <SelectTrigger><SelectValue placeholder="Select category" /></SelectTrigger>
                    <SelectContent>
                      {formCategories.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                {/* Payment method */}
                <div>
                  <Label>Payment Method *</Label>
                  <Select value={formData.payment_method} onValueChange={(v) => setFormData((p) => ({ ...p, payment_method: v as PaymentMethod }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {PAYMENT_METHODS.map((m) => <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                {/* Party name */}
                <div>
                  <Label>{formData.type === "income" ? "Customer Name" : "Vendor / Party"}</Label>
                  <Input value={formData.party_name} onChange={(e) => setFormData((p) => ({ ...p, party_name: e.target.value }))} placeholder="Optional" />
                </div>
                {/* Reference */}
                <div>
                  <Label>Reference No.</Label>
                  <Input value={formData.reference_number} onChange={(e) => setFormData((p) => ({ ...p, reference_number: e.target.value }))} placeholder="Invoice / cheque no." />
                </div>
              </div>

              {/* Description */}
              <div>
                <Label>Description</Label>
                <Input value={formData.description} onChange={(e) => setFormData((p) => ({ ...p, description: e.target.value }))} placeholder="Short description" />
              </div>

              {/* Notes */}
              <div>
                <Label>Notes</Label>
                <Textarea value={formData.notes} onChange={(e) => setFormData((p) => ({ ...p, notes: e.target.value }))} placeholder="Additional notes (optional)" rows={2} />
              </div>
            </div>

            <DialogFooter className="mt-4">
              <Button variant="outline" onClick={resetForm}>Cancel</Button>
              <Button
                onClick={handleSave}
                className={editingEntry ? "" : formData.type === "income" ? "bg-green-600 hover:bg-green-700" : "bg-red-600 hover:bg-red-700"}
              >
                {editingEntry ? "Update Entry" : formData.type === "income" ? "Record Income" : "Record Expense"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
        {activeCompany && !activeCompany.isOwn && (
  <div className="mb-4 flex items-center gap-3 bg-blue-50 border border-blue-200 rounded-lg px-4 py-3">
    <Building2 className="w-5 h-5 text-blue-600 shrink-0" />
    <p className="text-sm font-semibold text-blue-800">
      Viewing: {activeCompany.companyName} — Role: {activeCompany.role}
    </p>
  </div>
)}
      </div>
    </div>
  );
};

export default Cashbook;