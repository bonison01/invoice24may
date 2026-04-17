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
import { ArrowLeft, Download, Eye } from "lucide-react";
import InvoicePreview from "@/components/InvoicePreview";
import InvoiceDownload from "@/components/InvoiceDownload";
import {
  Dialog,
  DialogContent,
  DialogHeader,
} from "@/components/ui/dialog";
import type { Invoice } from "@/pages/Invoices";

interface SavedInvoice {
  id: string;
  invoice_number: string;
  date: string;
  customer_name: string;
  customer_email: string;
  customer_address: string;
  total: number;
  business_name: string;
  items: any; // string in DB, array after processing
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

  const [businessName, setBusinessName] = useState<string>("");
  const [businessAddress, setBusinessAddress] = useState<string>("");
  const [businessPhone, setBusinessPhone] = useState<string>("");
  const [sealUrl, setSealUrl] = useState<string>("");
  const [signatureUrl, setSignatureUrl] = useState<string>("");
  const [upiId, setUpiId] = useState<string>("");
  const [bankName, setBankName] = useState<string>("");
  const [accountNumber, setAccountNumber] = useState<string>("");
  const [ifscCode, setIfscCode] = useState<string>("");
  const updatePaymentStatus = async (
    invoiceId: string,
    status: "Paid" | "Unpaid" | "Partial"
  ) => {
    try {
      const { error } = await supabase
        .from("saved_invoices")
        .update({ payment_status: status })
        .eq("id", invoiceId);

      if (error) throw error;

      // ✅ update UI instantly
      setInvoices((prev) =>
        prev.map((inv) =>
          inv.id === invoiceId
            ? { ...inv, payment_status: status }
            : inv
        )
      );

      toast({
        title: "Updated",
        description: `Status changed to ${status}`,
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update status",
        variant: "destructive",
      });
    }
  };
  useEffect(() => {
    if (user) {
      fetchBusinessSettings();
      fetchSavedInvoices();
    }
  }, [user]);

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

      toast({
        title: "Success",
        description: "Invoice deleted successfully.",
      });

      setInvoices((prev) => prev.filter((inv) => inv.id !== invoiceId));
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to delete invoice.",
        variant: "destructive",
      });
    }
  };
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [customerFilter, setCustomerFilter] = useState("All");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [overdueOnly, setOverdueOnly] = useState(false);

  const fetchBusinessSettings = async () => {
    if (!user) return;
    try {
      const { data, error } = await supabase
        .from("business_settings")
        .select("*")
        .eq("user_id", user.id)
        .single();
      if (error && error.code !== "PGRST116") throw error;
      if (data) {
        setBusinessName(data.business_name || "");
        setBusinessAddress(data.business_address || "");
        setBusinessPhone(data.business_phone || "");
        setSealUrl(data.seal_url || "");
        setSignatureUrl(data.signature_url || "");

        // ✅ ADD THESE
        setUpiId(data.upi_id || "");
        setBankName(data.bank_name || "");
        setAccountNumber(data.account_number || "");
        setIfscCode(data.ifsc_code || "");
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to load business settings.",
        variant: "destructive",
      });
    }
  };

  const fetchSavedInvoices = async () => {
    if (!user) return;
    try {
      const { data, error } = await supabase
        .from("saved_invoices")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      if (error) throw error;

      const processedData = (data || []).map((invoice: any) => ({
        ...invoice,
        items: Array.isArray(invoice.items)
          ? invoice.items
          : typeof invoice.items === "string"
            ? (() => {
              try {
                return JSON.parse(invoice.items);
              } catch {
                return [];
              }
            })()
            : [],
      }));

      setInvoices(processedData as SavedInvoice[]);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to load saved invoices.",
        variant: "destructive",
      });
    }
  };

  const convertToInvoice = (savedInvoice: SavedInvoice): Invoice => ({
    id: savedInvoice.id,
    invoiceNumber: savedInvoice.invoice_number,
    date: savedInvoice.date,
    customer: {
      id: "",
      name: savedInvoice.customer_name,
      email: savedInvoice.customer_email,
      address: savedInvoice.customer_address,
    },
    items: savedInvoice.items || [],
    subtotal: savedInvoice.subtotal,
    taxRate: savedInvoice.tax_rate,
    taxAmount: savedInvoice.tax_amount,

    // ✅ ADD THIS (IMPORTANT)
    inclusiveTax: savedInvoice.tax_rate === 0,

    discountType: "fixed",
    discountValue: savedInvoice.discount,
    discountAmount: savedInvoice.discount,
    total: savedInvoice.total,
    paymentInstructions: savedInvoice.payment_instructions || "",
    thankYouNote: savedInvoice.thank_you_note || "",
    numberOfDays: savedInvoice.number_of_days || 0,
    paymentStatus: savedInvoice.payment_status || "Unpaid",
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
    // 🔍 Search (invoice # or customer)
    const matchesSearch =
      invoice.invoice_number.toLowerCase().includes(search.toLowerCase()) ||
      invoice.customer_name.toLowerCase().includes(search.toLowerCase());

    // 📊 Status filter
    const matchesStatus =
      statusFilter === "All" ||
      invoice.payment_status === statusFilter;

    // 👤 Customer filter
    const matchesCustomer =
      customerFilter === "All" ||
      invoice.customer_name === customerFilter;

    // 📅 Date range
    const invoiceDate = new Date(invoice.date);
    const matchesFrom = fromDate ? invoiceDate >= new Date(fromDate) : true;
    const matchesTo = toDate ? invoiceDate <= new Date(toDate) : true;

    // ⏰ Overdue logic
    const isOverdue =
      invoice.number_of_days &&
      new Date(invoice.date).getTime() +
      invoice.number_of_days * 86400000 <
      Date.now();

    const matchesOverdue = overdueOnly ? isOverdue : true;

    return (
      matchesSearch &&
      matchesStatus &&
      matchesCustomer &&
      matchesFrom &&
      matchesTo &&
      matchesOverdue
    );
  });
  const totalSales = filteredInvoices.reduce((s, i) => s + i.total, 0);

  const totalPaid = filteredInvoices.reduce(
    (s, i) => s + (i.payment_status === "Paid" ? i.total : 0),
    0
  );

  const totalPending = filteredInvoices.reduce(
    (s, i) => s + (i.payment_status !== "Paid" ? i.total : 0),
    0
  );

  const totalOverdues = filteredInvoices.filter(
    (i) =>
      i.number_of_days &&
      new Date(i.date).getTime() +
      i.number_of_days * 86400000 <
      Date.now()
  ).length;
  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 via-white to-purple-50">
      <Navbar />
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center gap-4 mb-8">
          {/* 🔥 SUMMARY CARDS */}

          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">
                Saved Invoices
              </h1>
              <p className="text-gray-500">
                Manage and track all your invoices
              </p>
            </div>

            <Button onClick={() => navigate("/")} variant="outline">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Dashboard
            </Button>


          </div>
        </div>

        {/* 🔥 SUMMARY CARDS */}
<div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-4 mb-6">

  <Card className="shadow-sm hover:shadow-md transition rounded-xl">
    <CardContent className="p-4">
      <p className="text-xs text-gray-500">Total Sales</p>
      <p className="text-xl font-bold text-gray-900">
        ₹{totalSales.toFixed(2)}
      </p>
    </CardContent>
  </Card>

  <Card className="shadow-sm hover:shadow-md transition rounded-xl">
    <CardContent className="p-4">
      <p className="text-xs text-gray-500">Paid</p>
      <p className="text-xl font-bold text-green-600">
        ₹{totalPaid.toFixed(2)}
      </p>
    </CardContent>
  </Card>

  <Card className="shadow-sm hover:shadow-md transition rounded-xl">
    <CardContent className="p-4">
      <p className="text-xs text-gray-500">Pending</p>
      <p className="text-xl font-bold text-yellow-600">
        ₹{totalPending.toFixed(2)}
      </p>
    </CardContent>
  </Card>

  <Card className="shadow-sm hover:shadow-md transition rounded-xl">
    <CardContent className="p-4">
      <p className="text-xs text-gray-500">Overdues</p>
      <p className="text-xl font-bold text-red-600">
        {totalOverdues}
      </p>
    </CardContent>
  </Card>

  <Card className="shadow-sm hover:shadow-md transition rounded-xl">
    <CardContent className="p-4">
      <p className="text-xs text-gray-500">Invoices</p>
      <p className="text-xl font-bold text-gray-900">
        {filteredInvoices.length}
      </p>
    </CardContent>
  </Card>

</div>

{/* 🔥 FILTERS */}
<div className="bg-white border rounded-xl p-4 mb-6 shadow-sm flex flex-wrap gap-4 items-end">

  {/* Search */}
  <div className="flex flex-col">
    <label className="text-xs text-gray-500 mb-1">Search</label>
    <input
      type="text"
      placeholder="Invoice or customer"
      className="border rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-green-500"
      value={search}
      onChange={(e) => setSearch(e.target.value)}
    />
  </div>

  {/* Status */}
  <div>
    <label className="text-xs text-gray-500">Status</label>
    <Select value={statusFilter} onValueChange={setStatusFilter}>
      <SelectTrigger className="w-[130px] mt-1">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="All">All</SelectItem>
        <SelectItem value="Paid">Paid</SelectItem>
        <SelectItem value="Partial">Partial</SelectItem>
        <SelectItem value="Unpaid">Unpaid</SelectItem>
      </SelectContent>
    </Select>
  </div>

  {/* Customer */}
  <div>
    <label className="text-xs text-gray-500">Customer</label>
    <Select value={customerFilter} onValueChange={setCustomerFilter}>
      <SelectTrigger className="w-[150px] mt-1">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="All">All</SelectItem>
        {[...new Set(invoices.map(i => i.customer_name))].map(name => (
          <SelectItem key={name} value={name}>{name}</SelectItem>
        ))}
      </SelectContent>
    </Select>
  </div>

  {/* Dates */}
  <input
    type="date"
    className="border rounded-md px-3 py-2 text-sm"
    value={fromDate}
    onChange={(e) => setFromDate(e.target.value)}
  />

  <input
    type="date"
    className="border rounded-md px-3 py-2 text-sm"
    value={toDate}
    onChange={(e) => setToDate(e.target.value)}
  />

  {/* Overdue */}
  <label className="flex items-center gap-2 text-sm">
    <input
      type="checkbox"
      checked={overdueOnly}
      onChange={(e) => setOverdueOnly(e.target.checked)}
    />
    Overdue
  </label>

  {/* Reset */}
  <Button variant="ghost" onClick={() => {
    setSearch("");
    setStatusFilter("All");
    setCustomerFilter("All");
    setFromDate("");
    setToDate("");
    setOverdueOnly(false);
  }}>
    Reset
  </Button>
</div>

{/* 🔥 TABLE CARD */}
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
          {filteredInvoices.map((invoice) => (
            <TableRow key={invoice.id} className="hover:bg-gray-50 transition">
              <TableCell className="font-medium">
                {invoice.invoice_number}
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
                  onValueChange={(value) =>
                    updatePaymentStatus(invoice.id, value)
                  }
                >
                  <SelectTrigger className="w-[110px] h-8 text-xs rounded-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Paid">
                      <span className="text-green-600">Paid</span>
                    </SelectItem>
                    <SelectItem value="Partial">
                      <span className="text-yellow-600">Partial</span>
                    </SelectItem>
                    <SelectItem value="Unpaid">
                      <span className="text-red-600">Unpaid</span>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </TableCell>

              <TableCell className="font-semibold">
                ₹{invoice.total.toFixed(2)}
              </TableCell>

              <TableCell className="text-right">
                <div className="flex justify-end gap-2">
                  <Button size="sm" variant="outline">
                    <Eye className="w-4 h-4 mr-1" /> View
                  </Button>

                  <Button size="sm" variant="outline">
                    <Download className="w-4 h-4 mr-1" /> Download
                  </Button>

                  {/* <Button size="sm" variant="destructive">
                    Delete
                  </Button> */}
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  </CardContent>
</Card>

        {/* Invoice Preview Dialog */}
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

        {/* Hidden PDF generator */}
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
