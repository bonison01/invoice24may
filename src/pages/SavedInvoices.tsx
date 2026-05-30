import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import Navbar from "@/components/Navbar";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { toast } from "@/hooks/use-toast";
// import { ArrowLeft, Download, Eye, Trash2 } from "lucide-react";
import { ArrowLeft, Download, Eye, Trash2, Building2 } from "lucide-react";
import InvoicePreview from "@/components/InvoicePreview";
import InvoiceDownload from "@/components/InvoiceDownload";
import {
  Dialog,
  DialogContent,
  DialogHeader,
} from "@/components/ui/dialog";
import type { Invoice } from "@/pages/Invoices";
import { useCompany } from "@/hooks/useCompany";
import { useActiveOwnerId } from "@/hooks/useActiveOwnerId";

interface SavedInvoice {
  id: string;
  invoice_number: string;
  date: string;
  customer_name: string;
  customer_email: string;
  customer_address: string;
  customer_phone?: string;
  total: number;
  business_name: string;
  items: any;
  subtotal: number;
  tax_rate: number;
  tax_amount: number;
  discount: number;
  payment_instructions: string;
  thank_you_note: string;
  created_at: string;
  business_address?: string;
  business_phone?: string;
  seal_url?: string;
  signature_url?: string;
  number_of_days?: number;
  payment_status?: "Paid" | "Unpaid" | "Partial";
}

const SavedInvoices = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [invoices, setInvoices] = useState<SavedInvoice[]>([]);
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
  const [showPreview, setShowPreview] = useState(false);
  const [shouldDownload, setShouldDownload] = useState(false);

  const [businessName, setBusinessName] = useState("");
  const [businessAddress, setBusinessAddress] = useState("");
  const [businessPhone, setBusinessPhone] = useState("");
  const [sealUrl, setSealUrl] = useState("");
  const [signatureUrl, setSignatureUrl] = useState("");
  const [upiId, setUpiId] = useState("");
  const [bankName, setBankName] = useState("");
  const [accountNumber, setAccountNumber] = useState("");
  const [ifscCode, setIfscCode] = useState("");

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [customerFilter, setCustomerFilter] = useState("All");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [overdueOnly, setOverdueOnly] = useState(false);

  useEffect(() => {
    if (user) {
      fetchBusinessSettings();
      fetchSavedInvoices();
    }
  }, [user]);

  const fetchBusinessSettings = async () => {
  if (!ownerId) return;
  try {
    const { data, error } = await (supabase as any)
      .from("business_settings")
      .select("*")
      .eq("user_id", ownerId)
      .single();
    if (error && error.code !== "PGRST116") throw error;
    if (data) {
      setBusinessName(data.business_name || "");
      setBusinessAddress(data.business_address || "");
      setBusinessPhone(data.business_phone || "");
      setSealUrl(data.seal_url || "");
      setSignatureUrl(data.signature_url || "");
      setUpiId(data.upi_id || "");
      setBankName(data.bank_name || "");
      setAccountNumber(data.account_number || "");
      setIfscCode(data.ifsc_code || "");
    }
  } catch (error) {
    toast({ title: "Error", description: "Failed to load business settings.", variant: "destructive" });
  }
};
const { activeCompany } = useCompany();
const ownerId = useActiveOwnerId();

// Replace the useEffect:
useEffect(() => {
  if (user && ownerId) {
    fetchBusinessSettings();
    fetchSavedInvoices();
  }
}, [user, ownerId]); // re-fetches when company switches

  const fetchSavedInvoices = async () => {
  if (!ownerId) return;
  try {
    const { data, error } = await supabase
      .from("saved_invoices")
      .select("*")
      .eq("user_id", ownerId)   // ← uses active company owner id
      .order("created_at", { ascending: false });
    if (error) throw error;

    const processed = (data || []).map((inv: any) => ({
      ...inv,
      items: Array.isArray(inv.items)
        ? inv.items
        : typeof inv.items === "string"
        ? (() => { try { return JSON.parse(inv.items); } catch { return []; } })()
        : [],
    }));
    setInvoices(processed as SavedInvoice[]);
  } catch (error) {
    toast({ title: "Error", description: "Failed to load saved invoices.", variant: "destructive" });
  }
};

  const updatePaymentStatus = async (invoiceId: string, status: "Paid" | "Unpaid" | "Partial") => {
    try {
      const { error } = await supabase
        .from("saved_invoices")
        .update({ payment_status: status } as any)
        .eq("id", invoiceId);
      if (error) throw error;
      setInvoices((prev) =>
        prev.map((inv) => inv.id === invoiceId ? { ...inv, payment_status: status } : inv)
      );
      toast({ title: "Updated", description: `Status changed to ${status}` });
    } catch {
      toast({ title: "Error", description: "Failed to update status", variant: "destructive" });
    }
  };

  const deleteInvoice = async (invoiceId: string) => {
    if (!user) return;
    const confirmed = window.confirm("Are you sure you want to delete this invoice?");
    if (!confirmed) return;
    try {
      const { error } = await supabase
        .from("saved_invoices")
        .delete()
        .eq("id", invoiceId)
        .eq("user_id", user.id);
      if (error) throw error;
      toast({ title: "Deleted", description: "Invoice deleted successfully." });
      setInvoices((prev) => prev.filter((inv) => inv.id !== invoiceId));
    } catch {
      toast({ title: "Error", description: "Failed to delete invoice.", variant: "destructive" });
    }
  };

  // Convert saved invoice → Invoice type (with all new per-item fields preserved)
  const convertToInvoice = (saved: SavedInvoice): Invoice => ({
    id: saved.id,
    invoiceNumber: saved.invoice_number,
    date: saved.date,
    customer: {
      id: "",
      name: saved.customer_name,
      email: saved.customer_email,
      address: saved.customer_address,
      phone: saved.customer_phone,
    },
    // items already parsed — per-item fields (hsnCode, itemDiscountAmount, etc.) pass through as-is
    items: (saved.items || []).map((item: any) => ({
      id: item.id ?? "",
      date: item.date ?? "",
      orderId: item.orderId ?? "",
      description: item.description ?? "",
      quantity: item.quantity ?? 1,
      unitPrice: item.unitPrice ?? 0,
      amount: item.amount ?? ((item.quantity ?? 0) * (item.unitPrice ?? 0)),
      hsnCode: item.hsnCode ?? "",
      itemTaxRate: item.itemTaxRate ?? 0,
      itemDiscountType: item.itemDiscountType ?? "flat",
      itemDiscountValue: item.itemDiscountValue ?? 0,
      itemDiscountAmount: item.itemDiscountAmount ?? 0,
      itemTaxAmount: item.itemTaxAmount ?? 0,
      variantId: item.variantId,
      variantDetails: item.variantDetails,
    })),
    subtotal: saved.subtotal,
    taxRate: saved.tax_rate,
    taxAmount: saved.tax_amount,
    inclusiveTax: saved.tax_rate === 0,
    discountType: "fixed",
    discountValue: saved.discount,
    discountAmount: saved.discount,
    total: saved.total,
    paymentInstructions: saved.payment_instructions || "",
    thankYouNote: saved.thank_you_note || "",
    numberOfDays: saved.number_of_days || 0,
    paymentStatus: saved.payment_status || "Unpaid",
  });

  const viewInvoice = (invoice: SavedInvoice) => {
    setSelectedInvoice(convertToInvoice(invoice));
    setShowPreview(true);
  };

  const downloadInvoice = (invoice: SavedInvoice) => {
    setSelectedInvoice(convertToInvoice(invoice));
    setShouldDownload(true);
  };

  const filteredInvoices = invoices.filter((invoice) => {
    const matchesSearch =
      invoice.invoice_number.toLowerCase().includes(search.toLowerCase()) ||
      invoice.customer_name.toLowerCase().includes(search.toLowerCase());
    const matchesStatus = statusFilter === "All" || invoice.payment_status === statusFilter;
    const matchesCustomer = customerFilter === "All" || invoice.customer_name === customerFilter;
    const invoiceDate = new Date(invoice.date);
    const matchesFrom = fromDate ? invoiceDate >= new Date(fromDate) : true;
    const matchesTo = toDate ? invoiceDate <= new Date(toDate) : true;
    const isOverdue =
      invoice.number_of_days &&
      new Date(invoice.date).getTime() + invoice.number_of_days * 86400000 < Date.now();
    const matchesOverdue = overdueOnly ? isOverdue : true;
    return matchesSearch && matchesStatus && matchesCustomer && matchesFrom && matchesTo && matchesOverdue;
  });

  const totalSales = filteredInvoices.reduce((s, i) => s + i.total, 0);
  const totalPaid = filteredInvoices.reduce((s, i) => s + (i.payment_status === "Paid" ? i.total : 0), 0);
  const totalPending = filteredInvoices.reduce((s, i) => s + (i.payment_status !== "Paid" ? i.total : 0), 0);
  const totalOverdues = filteredInvoices.filter(
    (i) => i.number_of_days && new Date(i.date).getTime() + i.number_of_days * 86400000 < Date.now()
  ).length;

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 via-white to-purple-50">
      <Navbar />
      <div className="container mx-auto px-4 py-8">

        {/* ── Page Header ── */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Saved Invoices</h1>
            <p className="text-gray-500">Manage and track all your invoices</p>
          </div>
          <Button onClick={() => navigate("/")} variant="outline">
            <ArrowLeft className="w-4 h-4 mr-2" /> Dashboard
          </Button>
        </div>

        {/* ── Summary Cards ── */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-4 mb-6">
          {[
            { label: "Total Sales", value: `₹${totalSales.toFixed(2)}`, color: "text-gray-900" },
            { label: "Paid", value: `₹${totalPaid.toFixed(2)}`, color: "text-green-600" },
            { label: "Pending", value: `₹${totalPending.toFixed(2)}`, color: "text-yellow-600" },
            { label: "Overdues", value: String(totalOverdues), color: "text-red-600" },
            { label: "Invoices", value: String(filteredInvoices.length), color: "text-gray-900" },
          ].map(({ label, value, color }) => (
            <Card key={label} className="shadow-sm hover:shadow-md transition rounded-xl">
              <CardContent className="p-4">
                <p className="text-xs text-gray-500">{label}</p>
                <p className={`text-xl font-bold ${color}`}>{value}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* ── Filters ── */}
        <div className="bg-white border rounded-xl p-4 mb-6 shadow-sm flex flex-wrap gap-4 items-end">
          <div className="flex flex-col">
            <label className="text-xs text-gray-500 mb-1">Search</label>
            <input
              type="text"
              placeholder="Invoice # or customer"
              className="border rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-green-500"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          <div>
            <label className="text-xs text-gray-500 block mb-1">Status</label>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[130px]"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="All">All</SelectItem>
                <SelectItem value="Paid">Paid</SelectItem>
                <SelectItem value="Partial">Partial</SelectItem>
                <SelectItem value="Unpaid">Unpaid</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <label className="text-xs text-gray-500 block mb-1">Customer</label>
            <Select value={customerFilter} onValueChange={setCustomerFilter}>
              <SelectTrigger className="w-[150px]"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="All">All</SelectItem>
                {[...new Set(invoices.map((i) => i.customer_name))].map((name) => (
                  <SelectItem key={name} value={name}>{name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex flex-col">
            <label className="text-xs text-gray-500 mb-1">From</label>
            <input type="date" className="border rounded-md px-3 py-2 text-sm" value={fromDate} onChange={(e) => setFromDate(e.target.value)} />
          </div>

          <div className="flex flex-col">
            <label className="text-xs text-gray-500 mb-1">To</label>
            <input type="date" className="border rounded-md px-3 py-2 text-sm" value={toDate} onChange={(e) => setToDate(e.target.value)} />
          </div>

          <label className="flex items-center gap-2 text-sm cursor-pointer">
            <input type="checkbox" checked={overdueOnly} onChange={(e) => setOverdueOnly(e.target.checked)} />
            Overdue only
          </label>

          <Button variant="ghost" onClick={() => {
            setSearch(""); setStatusFilter("All"); setCustomerFilter("All");
            setFromDate(""); setToDate(""); setOverdueOnly(false);
          }}>
            Reset
          </Button>
        </div>

        {/* ── Table ── */}
        <Card className="shadow-sm rounded-xl">
          <CardHeader>
            <CardTitle>Your Invoices</CardTitle>
            <CardDescription>
              {filteredInvoices.length} invoice{filteredInvoices.length !== 1 ? "s" : ""}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Invoice #</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Customer</TableHead>
                    <TableHead>Due</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Total</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredInvoices.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-12 text-gray-400">
                        No invoices found.
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredInvoices.map((invoice) => {
                      const isOverdue =
                        invoice.number_of_days &&
                        new Date(invoice.date).getTime() + invoice.number_of_days * 86400000 < Date.now() &&
                        invoice.payment_status !== "Paid";

                      return (
                        <TableRow key={invoice.id} className={`hover:bg-gray-50 transition ${isOverdue ? "bg-red-50" : ""}`}>
                          <TableCell className="font-medium">
                            {invoice.invoice_number}
                            {isOverdue && (
                              <span className="ml-2 text-xs bg-red-100 text-red-600 px-1.5 py-0.5 rounded-full">Overdue</span>
                            )}
                          </TableCell>
                          <TableCell>{invoice.date}</TableCell>
                          <TableCell>{invoice.customer_name}</TableCell>
                          <TableCell>
                            {invoice.number_of_days
                              ? `${invoice.number_of_days} days`
                              : <span className="text-gray-400">—</span>}
                          </TableCell>
                          <TableCell>
                            <Select
                              value={invoice.payment_status ?? "Unpaid"}
                              onValueChange={(v) => updatePaymentStatus(invoice.id, v as "Paid" | "Unpaid" | "Partial")}
                            >
                              <SelectTrigger className={`w-[110px] h-8 text-xs rounded-full ${
                                invoice.payment_status === "Paid" ? "border-green-200 text-green-700"
                                : invoice.payment_status === "Partial" ? "border-yellow-200 text-yellow-700"
                                : "border-red-200 text-red-600"
                              }`}>
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="Paid"><span className="text-green-600">Paid</span></SelectItem>
                                <SelectItem value="Partial"><span className="text-yellow-600">Partial</span></SelectItem>
                                <SelectItem value="Unpaid"><span className="text-red-600">Unpaid</span></SelectItem>
                              </SelectContent>
                            </Select>
                          </TableCell>
                          <TableCell className="font-semibold">₹{invoice.total.toFixed(2)}</TableCell>
                          <TableCell className="text-right">
                            <div className="flex justify-end gap-2">
                              <Button size="sm" variant="outline" onClick={() => viewInvoice(invoice)}>
                                <Eye className="w-4 h-4 mr-1" /> View
                              </Button>
                              <Button size="sm" variant="outline" onClick={() => downloadInvoice(invoice)}>
                                <Download className="w-4 h-4 mr-1" /> Download
                              </Button>
                              <Button size="sm" variant="destructive" onClick={() => deleteInvoice(invoice.id)}>
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>

        {/* ── Preview Dialog ── */}
        <Dialog open={showPreview} onOpenChange={setShowPreview}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader />
            {selectedInvoice && (
              <InvoicePreview
                invoice={selectedInvoice}
                businessName={businessName}
                businessAddress={businessAddress}
                businessPhone={businessPhone}
                sealUrl={sealUrl}
                signatureUrl={signatureUrl}
                isPrint={true}
                upiId={upiId}
                bankName={bankName}
                accountNumber={accountNumber}
                ifscCode={ifscCode}
              />
            )}
          </DialogContent>
        </Dialog>
{/* Company context banner */}
{activeCompany && !activeCompany.isOwn && (
  <div className="mb-6 flex items-center gap-3 bg-blue-50 border border-blue-200 rounded-lg px-4 py-3">
    <Building2 className="w-5 h-5 text-blue-600 shrink-0" />
    <div>
      <p className="text-sm font-semibold text-blue-800">
        Viewing: {activeCompany.companyName}
      </p>
      <p className="text-xs text-blue-600 capitalize">
        Your role: {activeCompany.role}
      </p>
    </div>
  </div>
)}
        {/* ── Hidden PDF Generator ── */}
        {selectedInvoice && (
          <InvoiceDownload
            invoice={selectedInvoice}
            businessName={businessName}
            businessAddress={businessAddress}
            businessPhone={businessPhone}
            sealUrl={sealUrl}
            signatureUrl={signatureUrl}
            upiId={upiId}
            bankName={bankName}
            accountNumber={accountNumber}
            ifscCode={ifscCode}
            triggerDownload={shouldDownload}
            onComplete={() => setShouldDownload(false)}
          />
        )}
      </div>
    </div>
  );
};

export default SavedInvoices;