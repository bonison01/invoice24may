import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "@/hooks/use-toast";
import { ArrowLeft, Plus, Save, Download, Upload, Package, Eye, EyeOff, LayoutPanelLeft, Rows } from "lucide-react";
import InvoiceItem from "@/components/InvoiceItem";
import CustomerSelector from "@/components/CustomerSelector";
import InvoicePreview from "@/components/InvoicePreview";
import BulkUploadDialog from "@/components/BulkUploadDialog";
import ProductSelector from "@/components/ProductSelector";
import Navbar from "@/components/Navbar";
import InvoiceDownload from "@/components/InvoiceDownload";
import { InventoryProduct } from "@/pages/Inventory";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useActiveOwnerId } from "@/hooks/useActiveOwnerId";
import { useCompany } from "@/hooks/useCompany";
import { Building2 } from "lucide-react";

export interface InvoiceItem {
  id: string;
  date: string;
  orderId: string;
  description: string;
  quantity: number;
  unitPrice: number;
  amount: number;
  hsnCode?: string;
  itemTaxRate?: number;
  itemDiscountType?: "flat" | "percentage";
  itemDiscountValue?: number;
  itemDiscountAmount?: number;
  itemTaxAmount?: number;
  variantId?: string;
  variantDetails?: string;
}

export interface Customer {
  id: string;
  name: string;
  email: string;
  address: string;
  phone?: string;
}

export interface Invoice {
  id: string;
  invoiceNumber: string;
  date: string;
  customer: Customer | null;
  items: InvoiceItem[];
  subtotal: number;
  taxRate: number;
  taxAmount: number;
  discountType: "fixed" | "percentage";
  discountValue: number;
  discountAmount: number;
  total: number;
  numberOfDays?: number;
  paymentStatus?: "Paid" | "Unpaid" | "Partial";
  paymentInstructions: string;
  thankYouNote: string;
  inclusiveTax: boolean;
}

const Invoices = () => {
  const navigate = useNavigate();
  const { user } = useAuth();

  const [layoutMode, setLayoutMode] = useState<"original" | "new">("original");

  const [invoice, setInvoice] = useState<Invoice>({
    id: "",
    invoiceNumber: `INV-${Date.now()}`,
    date: new Date().toISOString().split("T")[0],
    customer: null,
    items: [],
    subtotal: 0,
    taxRate: 18,
    taxAmount: 0,
    discountType: "percentage",
    discountValue: 0,
    discountAmount: 0,
    total: 0,
    numberOfDays: 0,
    paymentStatus: "Unpaid",
    paymentInstructions: "Payment due within 10 days. Thank you for your business!",
    thankYouNote: "Thank you for choosing our services.",
    inclusiveTax: false,
  });

  const [showPreview, setShowPreview] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [triggerDownload, setTriggerDownload] = useState(false);
  const [businessSettings, setBusinessSettings] = useState<any>(null);
  const [businessName, setBusinessName] = useState<string>("Your Business Name");
  const [showBulkUpload, setShowBulkUpload] = useState(false);
  const [showProductSelector, setShowProductSelector] = useState(false);
  const [showAddCustomer, setShowAddCustomer] = useState(false);
  const [newCustomer, setNewCustomer] = useState({ name: "", email: "", address: "", phone: "" });
  const [isSavingCustomer, setIsSavingCustomer] = useState(false);

  const ownerId = useActiveOwnerId();
const { activeCompany } = useCompany();

  useEffect(() => { calculateTotals(); }, [invoice.items, invoice.taxRate, invoice.discountType, invoice.discountValue, invoice.inclusiveTax]);
  // useEffect(() => { if (user) { fetchBusinessSettings(); fetchBusinessName(); } }, [user]);
  useEffect(() => { if (ownerId) { fetchBusinessSettings(); fetchBusinessName(); } }, [ownerId]);


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
      setBusinessSettings(data);
      setInvoice((prev) => ({
        ...prev,
        paymentInstructions: data.payment_instructions || prev.paymentInstructions,
        thankYouNote: data.thank_you_note || prev.thankYouNote,
      }));
    }
  } catch { console.error("Error fetching business settings"); }
};

  const fetchBusinessName = async () => {
  if (!ownerId) return;
  try {
    const { data, error } = await supabase
      .from("business_settings")
      .select("business_name")
      .eq("user_id", ownerId)
      .single();
    if (data && !error) setBusinessName(data.business_name);
  } catch { console.error("Error fetching business name"); }
};

  const handleAddCustomer = async () => {
    if (!user) return;
    if (!newCustomer.name || !newCustomer.email) {
      toast({ title: "Error", description: "Name and email are required", variant: "destructive" });
      return;
    }
    setIsSavingCustomer(true);
    try {
      const { data, error } = await supabase.from("customers").insert({ user_id: ownerId, ...newCustomer }).select().single();
      if (error) throw error;
      setInvoice((prev) => ({ ...prev, customer: data }));
      toast({ title: "Customer added!", description: "Customer added and selected." });
      setShowAddCustomer(false);
      setNewCustomer({ name: "", email: "", address: "", phone: "" });
    } catch (err) {
      console.error(err);
      toast({ title: "Error", description: "Failed to add customer", variant: "destructive" });
    }
    setIsSavingCustomer(false);
  };

  const calculateTotals = () => {
  // item.amount already includes per-item discount + per-item tax
  const subtotal = invoice.items.reduce((sum, item) => sum + item.amount, 0);

  let taxAmount = 0;
  let total = subtotal;

  if (!invoice.inclusiveTax) {
    taxAmount = (subtotal * invoice.taxRate) / 100;
    total = subtotal + taxAmount;
  }

  // Invoice-level discount applied on top
  const discountAmount =
    invoice.discountType === "percentage"
      ? (subtotal * invoice.discountValue) / 100
      : invoice.discountValue;

  total = Math.max(0, total - discountAmount);

  setInvoice((prev) => ({ ...prev, subtotal, taxAmount, discountAmount, total }));
};

  const addItem = () => {
    const newItem: InvoiceItem = {
      id: Date.now().toString(),
      date: new Date().toISOString().split("T")[0],
      orderId: "",
      description: "",
      quantity: 1,
      unitPrice: 0,
      amount: 0,
      hsnCode: "",
      itemTaxRate: 0,
      itemDiscountType: "flat",
      itemDiscountValue: 0,
      itemDiscountAmount: 0,
      itemTaxAmount: 0,
    };
    setInvoice((prev) => ({ ...prev, items: [...prev.items, newItem] }));
  };

  const handleBulkItemsAdd = (items: InvoiceItem[]) => {
    setInvoice((prev) => ({ ...prev, items: [...prev.items, ...items] }));
    setShowBulkUpload(false);
    toast({ title: "Items added!", description: `Successfully added ${items.length} items.` });
  };

  const handleProductSelect = (product: InventoryProduct, quantity: number, variant?: any) => {
    let description = product.name;
    if (product.description) description += `\n${product.description}`;
    if (variant) {
      description += `\nVariant: ${variant.size} / ${variant.color} / ${variant.brand}`;
      description += `\nHSN: ${variant.hsn_code}`;
    }
    const unitPrice = variant?.unit_price ?? product.unit_price;
    const newItem: InvoiceItem = {
      id: Date.now().toString(),
      date: new Date().toISOString().split("T")[0],
      orderId: product.sku || "",
      description,
      quantity,
      unitPrice,
      amount: quantity * unitPrice,
      hsnCode: variant?.hsn_code ?? "",
      itemTaxRate: 0,
      itemDiscountType: "flat",
      itemDiscountValue: 0,
      itemDiscountAmount: 0,
      itemTaxAmount: 0,
      variantId: variant?.id,
      variantDetails: variant ? `${variant.size} / ${variant.color} / ${variant.brand}` : undefined,
    };
    setInvoice((prev) => ({ ...prev, items: [...prev.items, newItem] }));
  };

  const updateItem = (id: string, updatedItem: Partial<InvoiceItem>) => {
    setInvoice((prev) => ({
      ...prev,
      items: prev.items.map((item) => item.id === id ? { ...item, ...updatedItem } : item),
    }));
  };

  const deleteItem = (id: string) => {
    setInvoice((prev) => ({ ...prev, items: prev.items.filter((item) => item.id !== id) }));
  };

  const saveInvoice = async () => {
    if (!user) { toast({ title: "Authentication required", description: "Please sign in to save invoices.", variant: "destructive" }); return; }
    if (!invoice.customer) { toast({ title: "Customer required", description: "Please select a customer before saving.", variant: "destructive" }); return; }
    setIsLoading(true);
    try {
      const invoiceData = {
        user_id: ownerId,
        invoice_number: invoice.invoiceNumber,
        date: invoice.date,
        customer_name: invoice.customer?.name || "",
        customer_email: invoice.customer?.email || "",
        customer_address: invoice.customer?.address || "",
        items: JSON.stringify(invoice.items),
        subtotal: invoice.subtotal,
        tax_rate: invoice.taxRate,
        tax_amount: invoice.taxAmount,
        discount: invoice.discountAmount,
        total: invoice.total,
        payment_instructions: invoice.paymentInstructions,
        thank_you_note: invoice.thankYouNote,
        business_name: businessSettings?.business_name || businessName,
        business_address: businessSettings?.business_address || "",
        business_phone: businessSettings?.business_phone || "",
        seal_url: businessSettings?.seal_url || "",
        signature_url: businessSettings?.signature_url || "",
        number_of_days: invoice.numberOfDays,
        payment_status: invoice.paymentStatus,
      };
      const { error } = await supabase.from("saved_invoices").insert(invoiceData);
      if (error) throw error;
      toast({ title: "Invoice saved!", description: "Successfully saved." });
      navigate("/saved-invoices");
    } catch (err) {
      console.error(err);
      toast({ title: "Error", description: "Failed to save invoice.", variant: "destructive" });
    }
    setIsLoading(false);
  };

  const exportToPDF = () => {
    if (!invoice.customer) { toast({ title: "Missing Customer", description: "Please select a customer before exporting.", variant: "destructive" }); return; }
    toast({ title: "Preparing Download", description: "Generating your invoice PDF..." });
    setTriggerDownload(true);
  };

  // ── Shared sub-components (same cards used in both layouts) ──

  const invoiceDetailsCard = (
    <Card className="shadow-sm border-0 ring-1 ring-gray-200">
      <CardHeader className="pb-3 pt-5 px-5">
        <CardTitle className="text-sm font-semibold text-gray-700 uppercase tracking-wide">Invoice Details</CardTitle>
      </CardHeader>
      <CardContent className="px-5 pb-5 space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label className="text-xs text-gray-500 mb-1 block">Invoice Number</Label>
            <Input value={invoice.invoiceNumber} onChange={(e) => setInvoice((p) => ({ ...p, invoiceNumber: e.target.value }))} />
          </div>
          <div>
            <Label className="text-xs text-gray-500 mb-1 block">Invoice Date</Label>
            <Input type="date" value={invoice.date} onChange={(e) => setInvoice((p) => ({ ...p, date: e.target.value }))} />
          </div>
          <div>
            <Label className="text-xs text-gray-500 mb-1 block">Due in (days)</Label>
            <Input type="number" value={invoice.numberOfDays} onChange={(e) => setInvoice((p) => ({ ...p, numberOfDays: parseInt(e.target.value) || 0 }))} />
          </div>
          <div>
            <Label className="text-xs text-gray-500 mb-1 block">Payment Status</Label>
            <Select value={invoice.paymentStatus} onValueChange={(v: "Paid" | "Unpaid" | "Partial") => setInvoice((p) => ({ ...p, paymentStatus: v }))}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="Paid">Paid</SelectItem>
                <SelectItem value="Unpaid">Unpaid</SelectItem>
                <SelectItem value="Partial">Partial</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        {invoice.paymentStatus && (
          <div className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${
            invoice.paymentStatus === "Paid" ? "bg-green-100 text-green-700 border-green-200"
            : invoice.paymentStatus === "Unpaid" ? "bg-red-100 text-red-700 border-red-200"
            : "bg-yellow-100 text-yellow-700 border-yellow-200"
          }`}>
            {invoice.paymentStatus}
          </div>
        )}
        {!user && (
          <div>
            <Label className="text-xs text-gray-500 mb-1 block">Business Name</Label>
            <Input placeholder="Enter your business name" value={businessName} onChange={(e) => setBusinessName(e.target.value)} />
          </div>
        )}
      </CardContent>
    </Card>
  );

  const customerCard = (
    <Card className="shadow-sm border-0 ring-1 ring-gray-200">
      <CardHeader className="pb-3 pt-5 px-5">
        <CardTitle className="text-sm font-semibold text-gray-700 uppercase tracking-wide">Customer</CardTitle>
      </CardHeader>
      <CardContent className="px-5 pb-5 space-y-3">
        <CustomerSelector
          selectedCustomer={invoice.customer}
          onCustomerSelect={(customer) => setInvoice((p) => ({ ...p, customer }))}
        />
        <Button variant="outline" size="sm" onClick={() => setShowAddCustomer(true)}>
          <Plus className="w-4 h-4 mr-1" /> Add New Customer
        </Button>
        {invoice.customer && (
          <div className="mt-2 p-3 bg-gray-50 rounded-lg text-sm space-y-0.5">
            <p className="font-semibold text-gray-800">{invoice.customer.name}</p>
            <p className="text-gray-500">{invoice.customer.email}</p>
            {invoice.customer.phone && <p className="text-gray-500">{invoice.customer.phone}</p>}
            {invoice.customer.address && <p className="text-gray-500">{invoice.customer.address}</p>}
          </div>
        )}
      </CardContent>
    </Card>
  );

  const itemsCard = (
    <Card className="shadow-sm border-0 ring-1 ring-gray-200">
      <CardHeader className="pb-3 pt-5 px-5">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-semibold text-gray-700 uppercase tracking-wide">Line Items</CardTitle>
          <div className="flex gap-2">
            <Button onClick={() => setShowProductSelector(true)} size="sm" variant="outline">
              <Package className="w-4 h-4 mr-1" /> From Inventory
            </Button>
            <Button onClick={() => setShowBulkUpload(true)} size="sm" variant="outline">
              <Upload className="w-4 h-4 mr-1" /> Bulk Upload
            </Button>
            <Button onClick={addItem} size="sm" className="bg-green-600 hover:bg-green-700 text-white">
              <Plus className="w-4 h-4 mr-1" /> Add Item
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="px-5 pb-5">
        {invoice.items.length === 0 ? (
          <div className="text-center py-12 text-gray-400 border-2 border-dashed rounded-lg">
            <Package className="w-8 h-8 mx-auto mb-2 opacity-30" />
            <p className="text-sm">No items yet. Add items or upload in bulk.</p>
          </div>
        ) : (
          invoice.items.map((item) => (
            <InvoiceItem
              key={item.id}
              item={item}
              onUpdate={(updated) => updateItem(item.id, updated)}
              onDelete={() => deleteItem(item.id)}
            />
          ))
        )}
      </CardContent>
    </Card>
  );

  const totalsCard = (
  <Card className="shadow-sm border-0 ring-1 ring-gray-200">
    <CardHeader className="pb-3 pt-5 px-5">
      <CardTitle className="text-sm font-semibold text-gray-700 uppercase tracking-wide">Totals & Tax</CardTitle>
    </CardHeader>
    <CardContent className="px-5 pb-5 space-y-4">

      {/* GST toggle */}
      <label className="flex items-center gap-2 cursor-pointer">
        <input
          type="checkbox"
          checked={invoice.inclusiveTax}
          onChange={(e) =>
            setInvoice((p) => ({
              ...p,
              inclusiveTax: e.target.checked,
              taxRate: e.target.checked ? 0 : 18,
            }))
          }
          className="w-4 h-4 accent-green-600"
        />
        <span className="text-sm text-gray-700 font-medium">
          Prices include GST (inclusive tax)
        </span>
      </label>

      <div className="grid grid-cols-2 gap-3">
        {/* Overall tax rate */}
        <div>
          <Label className="text-xs text-gray-500 mb-1 block">Overall Tax Rate (%)</Label>
          <Input
            type="number"
            min={0}
            disabled={invoice.inclusiveTax}
            value={invoice.taxRate}
            onChange={(e) =>
              setInvoice((p) => ({ ...p, taxRate: parseFloat(e.target.value) || 0 }))
            }
          />
          {invoice.inclusiveTax && (
            <p className="text-xs text-gray-400 mt-1">Disabled — tax included in item prices</p>
          )}
        </div>

        {/* Overall discount */}
        <div>
          <Label className="text-xs text-gray-500 mb-1 block">Overall Discount</Label>
          <div className="flex gap-1">
            <Select
              value={invoice.discountType}
              onValueChange={(v: "fixed" | "percentage") =>
                setInvoice((p) => ({ ...p, discountType: v, discountValue: 0 }))
              }
            >
              <SelectTrigger className="w-20">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="percentage">%</SelectItem>
                <SelectItem value="fixed">₹</SelectItem>
              </SelectContent>
            </Select>
            <Input
              type="number"
              min={0}
              value={invoice.discountValue}
              onChange={(e) =>
                setInvoice((p) => ({
                  ...p,
                  discountValue: parseFloat(e.target.value) || 0,
                }))
              }
            />
          </div>
        </div>
      </div>

      {/* Per-item discount summary (if any items have discounts) */}
      {invoice.items.some((i) => (i.itemDiscountAmount ?? 0) > 0) && (
        <div className="bg-red-50 border border-red-100 rounded-lg px-3 py-2 space-y-1">
          <p className="text-xs font-medium text-red-600 mb-1">Per-item discounts applied:</p>
          {invoice.items
            .filter((i) => (i.itemDiscountAmount ?? 0) > 0)
            .map((i) => (
              <div key={i.id} className="flex justify-between text-xs text-red-500">
                <span className="truncate max-w-[60%]">{i.description || "Unnamed item"}</span>
                <span>
                  −₹{(i.itemDiscountAmount ?? 0).toFixed(2)}
                  {i.itemDiscountType === "percentage" ? ` (${i.itemDiscountValue}%)` : ""}
                </span>
              </div>
            ))}
        </div>
      )}

      {/* Breakdown */}
      <div className="border-t pt-4 space-y-2 text-sm">
        {/* Per-item subtotals */}
        <div className="flex justify-between text-gray-500 text-xs">
          <span>Items subtotal (after per-item disc. & tax)</span>
          <span>₹{invoice.subtotal.toFixed(2)}</span>
        </div>

        {/* Overall tax */}
        <div className="flex justify-between text-gray-600">
          <span className="flex items-center gap-1">
            {invoice.inclusiveTax ? "Overall Tax" : `Overall Tax (${invoice.taxRate}%)`}
            {invoice.inclusiveTax && (
              <span className="text-xs bg-green-100 text-green-700 px-1.5 py-0.5 rounded">
                Included
              </span>
            )}
          </span>
          <span>
            {invoice.inclusiveTax ? "—" : `₹${invoice.taxAmount.toFixed(2)}`}
          </span>
        </div>

        {/* Overall discount */}
        {invoice.discountAmount > 0 && (
          <div className="flex justify-between text-red-500">
            <span>
              Overall Discount{" "}
              {invoice.discountType === "percentage"
                ? `(${invoice.discountValue}%)`
                : "(fixed)"}
            </span>
            <span>−₹{invoice.discountAmount.toFixed(2)}</span>
          </div>
        )}

        {/* Total */}
        <div className="flex justify-between font-bold text-base border-t pt-3 text-gray-900">
          <span>Total</span>
          <span className="text-green-600 text-lg">₹{invoice.total.toFixed(2)}</span>
        </div>
      </div>
    </CardContent>
  </Card>
);

  const notesCard = (
    <Card className="shadow-sm border-0 ring-1 ring-gray-200">
      <CardHeader className="pb-3 pt-5 px-5">
        <CardTitle className="text-sm font-semibold text-gray-700 uppercase tracking-wide">Notes</CardTitle>
      </CardHeader>
      <CardContent className="px-5 pb-5 space-y-4">
        <div>
          <Label className="text-xs text-gray-500 mb-1 block">Payment Instructions</Label>
          <Textarea rows={3} value={invoice.paymentInstructions} onChange={(e) => setInvoice((p) => ({ ...p, paymentInstructions: e.target.value }))} />
        </div>
        <div>
          <Label className="text-xs text-gray-500 mb-1 block">Thank You Note</Label>
          <Textarea rows={2} value={invoice.thankYouNote} onChange={(e) => setInvoice((p) => ({ ...p, thankYouNote: e.target.value }))} />
        </div>
      </CardContent>
    </Card>
  );

  const previewPanel = (
    <InvoicePreview
      invoice={invoice}
      businessName={businessName || businessSettings?.business_name || ""}
      businessAddress={businessSettings?.business_address || ""}
      businessPhone={businessSettings?.business_phone || ""}
      sealUrl={businessSettings?.seal_url || ""}
      signatureUrl={businessSettings?.signature_url || ""}
      upiId={businessSettings?.upi_id}
      bankName={businessSettings?.bank_name}
      accountNumber={businessSettings?.account_number}
      ifscCode={businessSettings?.ifsc_code}
    />
  );

  // ── Shared top action bar ──
  const topBar = (
    <div className={`flex items-center justify-between mb-8 ${layoutMode === "new" ? "bg-white border-b sticky top-0 z-10 shadow-sm px-6 py-3 -mx-6" : ""}`}>
      <div className="flex items-center gap-4">
        <Button onClick={() => navigate("/")} variant={layoutMode === "new" ? "ghost" : "outline"} size="sm" className={layoutMode === "new" ? "text-gray-500" : ""}>
          <ArrowLeft className="w-4 h-4 mr-2" /> {layoutMode === "new" ? "Back" : "Back to Dashboard"}
        </Button>
        <div>
          <h1 className={`font-bold bg-gradient-to-r from-green-600 to-yellow-600 bg-clip-text text-transparent ${layoutMode === "new" ? "text-lg" : "text-3xl"}`}>
            Create Invoice
          </h1>
          <p className={`text-gray-600 ${layoutMode === "new" ? "text-xs" : ""}`}>
            {businessName} — Invoice #{invoice.invoiceNumber}
          </p>
        </div>
      </div>

      <div className="flex items-center gap-3">
        {/* Layout switcher */}
        <div className="flex items-center bg-gray-100 rounded-lg p-1 border border-gray-200 gap-1">
          <button
            onClick={() => setLayoutMode("original")}
            title="Side-by-side preview"
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
              layoutMode === "original"
                ? "bg-white shadow-sm text-gray-900 border border-gray-200"
                : "text-gray-500 hover:text-gray-700"
            }`}
          >
            <LayoutPanelLeft className="w-3.5 h-3.5" /> Side
          </button>
          <button
            onClick={() => setLayoutMode("new")}
            title="Stacked preview below"
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
              layoutMode === "new"
                ? "bg-white shadow-sm text-gray-900 border border-gray-200"
                : "text-gray-500 hover:text-gray-700"
            }`}
          >
            <Rows className="w-3.5 h-3.5" /> Stacked
          </button>
        </div>

        {/* Preview toggle */}
        <Button onClick={() => setShowPreview((v) => !v)} variant="outline" size={layoutMode === "new" ? "sm" : "default"}>
          {showPreview ? <EyeOff className="w-4 h-4 mr-1" /> : <Eye className="w-4 h-4 mr-1" />}
          {showPreview ? "Hide Preview" : "Show Preview"}
        </Button>

        {user && (
          <Button onClick={saveInvoice} variant="outline" size={layoutMode === "new" ? "sm" : "default"} disabled={isLoading}>
            <Save className="w-4 h-4 mr-2" />
            {isLoading ? "Saving..." : "Save"}
          </Button>
        )}
        <Button
          onClick={exportToPDF}
          size={layoutMode === "new" ? "sm" : "default"}
          className="bg-gradient-to-r from-green-600 to-yellow-600 hover:from-green-700 hover:to-yellow-700 text-white"
        >
          <Download className="w-4 h-4 mr-2" /> Download Invoice
        </Button>
      </div>
    </div>
  );

  return (
    <div className={`min-h-screen ${layoutMode === "original" ? "bg-gradient-to-br from-green-50 via-white to-yellow-50" : "bg-gray-50"}`}>
      <Navbar />

      <div className={`${layoutMode === "new" ? "max-w-5xl mx-auto px-6 py-6" : "container mx-auto px-4 py-8"}`}>

        {topBar}

        {/* ══════════ LAYOUT: ORIGINAL (side-by-side) ══════════ */}
        {layoutMode === "original" && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Left column — form */}
            <div className="space-y-6">
              {/* Invoice Details — original style */}
              <Card>
                <CardHeader><CardTitle>Invoice Details</CardTitle></CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="invoiceNumber">Invoice Number</Label>
                      <Input id="invoiceNumber" value={invoice.invoiceNumber} onChange={(e) => setInvoice((p) => ({ ...p, invoiceNumber: e.target.value }))} />
                    </div>
                    <div>
                      <Label htmlFor="date">Invoice Date</Label>
                      <Input id="date" type="date" value={invoice.date} onChange={(e) => setInvoice((p) => ({ ...p, date: e.target.value }))} />
                    </div>
                    <div>
                      <Label>Number of Days (optional)</Label>
                      <Input type="number" value={invoice.numberOfDays} onChange={(e) => setInvoice((p) => ({ ...p, numberOfDays: parseInt(e.target.value) || 0 }))} />
                    </div>
                    <div>
                      <Label>Payment Status</Label>
                      <Select value={invoice.paymentStatus} onValueChange={(v: "Paid" | "Unpaid" | "Partial") => setInvoice((p) => ({ ...p, paymentStatus: v }))}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Paid">Paid</SelectItem>
                          <SelectItem value="Unpaid">Unpaid</SelectItem>
                          <SelectItem value="Partial">Partial</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    {!user && (
                      <div className="col-span-2">
                        <Label htmlFor="businessName">Business Name (optional)</Label>
                        <Input id="businessName" placeholder="Enter your business name" value={businessName} onChange={(e) => setBusinessName(e.target.value)} />
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* Customer — original style */}
              <Card>
                <CardHeader><CardTitle>Customer Information</CardTitle></CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <CustomerSelector
                      selectedCustomer={invoice.customer}
                      onCustomerSelect={(customer) => setInvoice((p) => ({ ...p, customer }))}
                    />
                    <Button variant="outline" size="sm" onClick={() => setShowAddCustomer(true)}>
                      <Plus className="w-4 h-4 mr-2" /> Add New Customer
                    </Button>
                  </div>
                </CardContent>
              </Card>

              {/* Items — original style */}
              <Card>
                <CardHeader>
                  <div className="flex justify-between items-center">
                    <CardTitle>Invoice Items</CardTitle>
                    <div className="flex gap-2">
                      <Button onClick={() => setShowProductSelector(true)} size="sm" variant="outline">
                        <Package className="w-4 h-4 mr-2" /> From Inventory
                      </Button>
                      <Button onClick={() => setShowBulkUpload(true)} size="sm" variant="outline">
                        <Upload className="w-4 h-4 mr-2" /> Bulk Upload
                      </Button>
                      <Button onClick={addItem} size="sm">
                        <Plus className="w-4 h-4 mr-2" /> Add Item
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  {invoice.items.length === 0 ? (
                    <div className="text-center py-8 text-gray-500">
                      No items added yet. Click "Add Item" or "Bulk Upload" to get started.
                    </div>
                  ) : (
                    invoice.items.map((item) => (
                      <InvoiceItem
                        key={item.id}
                        item={item}
                        onUpdate={(updated) => updateItem(item.id, updated)}
                        onDelete={() => deleteItem(item.id)}
                      />
                    ))
                  )}
                </CardContent>
              </Card>

              {/* Totals — original style */}
              <Card>
                <div className="flex items-center gap-3 mt-2 p-2 rounded-md hover:bg-gray-50 transition">
                  <input
                    type="checkbox"
                    checked={invoice.inclusiveTax}
                    onChange={(e) => setInvoice((p) => ({ ...p, inclusiveTax: e.target.checked, taxRate: e.target.checked ? 0 : 18 }))}
                    className="w-4 h-4 accent-green-600 cursor-pointer"
                  />
                  <Label className="cursor-pointer text-sm font-medium">Prices include GST</Label>
                </div>
                <CardHeader><CardTitle>Totals & Discounts</CardTitle></CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label>Tax Rate (%)</Label>
                      <Input
                        type="number"
                        value={invoice.taxRate}
                        disabled={invoice.inclusiveTax}
                        onChange={(e) => setInvoice((p) => ({ ...p, taxRate: parseFloat(e.target.value) || 0 }))}
                      />
                      {invoice.inclusiveTax && <p className="text-xs text-gray-500">Tax is already included in prices.</p>}
                    </div>
                    <div>
                      <Label>Discount Type</Label>
                      <Select value={invoice.discountType} onValueChange={(v: "fixed" | "percentage") => setInvoice((p) => ({ ...p, discountType: v }))}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="percentage">Percentage (%)</SelectItem>
                          <SelectItem value="fixed">Fixed (₹)</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="mt-4">
                    <Label>Discount {invoice.discountType === "percentage" ? "(%)" : "(₹)"}</Label>
                    <Input
                      type="number"
                      value={invoice.discountValue}
                      onChange={(e) => setInvoice((p) => ({ ...p, discountValue: parseFloat(e.target.value) || 0 }))}
                    />
                  </div>
                  <div className="border-t mt-4 pt-4 space-y-2 text-sm">
                    <div className="flex justify-between"><span>Subtotal:</span><span>₹{invoice.subtotal.toFixed(2)}</span></div>
                    <div className="flex justify-between">
                      <span className="flex items-center gap-2">
                        {invoice.inclusiveTax ? "Tax" : `Tax (${invoice.taxRate}%)`}
                        {invoice.inclusiveTax && <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded">Included</span>}
                      </span>
                      <span>
                        {invoice.inclusiveTax ? (
                          <span className="text-gray-400">—</span>
                        ) : (
                          <>₹{invoice.taxAmount.toFixed(2)}</>
                        )}
                      </span>
                    </div>
                    {invoice.discountAmount > 0 && (
                      <div className="flex justify-between text-red-600">
                        <span>Discount:</span><span>-₹{invoice.discountAmount.toFixed(2)}</span>
                      </div>
                    )}
                    <div className="flex justify-between font-bold text-lg border-t pt-2">
                      <span>Total:</span><span>₹{invoice.total.toFixed(2)}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Notes — original style */}
              <Card>
                <CardHeader><CardTitle>Notes</CardTitle></CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label>Payment Instructions</Label>
                    <Textarea value={invoice.paymentInstructions} onChange={(e) => setInvoice((p) => ({ ...p, paymentInstructions: e.target.value }))} />
                  </div>
                  <div>
                    <Label>Thank You Note</Label>
                    <Textarea value={invoice.thankYouNote} onChange={(e) => setInvoice((p) => ({ ...p, thankYouNote: e.target.value }))} />
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Right column — sticky preview */}
            {showPreview && (
              <div className="lg:sticky lg:top-8">
                {previewPanel}
              </div>
            )}
          </div>
        )}

        {/* ══════════ LAYOUT: NEW (stacked) ══════════ */}
        {layoutMode === "new" && (
          <div className="space-y-6">
            {/* Row 1 — Details + Customer */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {invoiceDetailsCard}
              {customerCard}
            </div>

            {/* Items — full width */}
            {itemsCard}

            {/* Row 2 — Notes + Totals */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {notesCard}
              {totalsCard}
            </div>

            {/* Preview — full width below */}
            {showPreview && (
              <div>
                <div className="flex items-center gap-3 mb-4">
                  <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">Invoice Preview</h2>
                  <div className="flex-1 h-px bg-gray-200" />
                </div>
                {previewPanel}
              </div>
            )}
          </div>
        )}
      </div>
{activeCompany && !activeCompany.isOwn && (
  <div className="flex items-center gap-2 text-xs bg-blue-50 border border-blue-200 rounded-full px-3 py-1">
    <Building2 className="w-3.5 h-3.5 text-blue-600" />
    <span className="text-blue-700 font-medium">{activeCompany.companyName}</span>
    <span className="text-blue-500 capitalize">({activeCompany.role})</span>
  </div>
)}

      {/* ── Dialogs ── */}
      <BulkUploadDialog open={showBulkUpload} onOpenChange={setShowBulkUpload} onItemsAdd={handleBulkItemsAdd} />
      <ProductSelector
        open={showProductSelector}
        onOpenChange={setShowProductSelector}
        onSelectProduct={(product, quantity, variant) => handleProductSelect(product, quantity, variant)}
      />
      <InvoiceDownload
        invoice={invoice}
        businessName={businessName || businessSettings?.business_name || ""}
        businessAddress={businessSettings?.business_address || ""}
        businessPhone={businessSettings?.business_phone || ""}
        sealUrl={businessSettings?.seal_url || ""}
        signatureUrl={businessSettings?.signature_url || ""}
        triggerDownload={triggerDownload}
        onComplete={() => {
          setTriggerDownload(false);
          toast({ title: "Download Complete", description: `Invoice ${invoice.invoiceNumber} downloaded successfully.` });
        }}
      />

      <Dialog open={showAddCustomer} onOpenChange={setShowAddCustomer}>
        <DialogContent>
          <DialogHeader><DialogTitle>Add New Customer</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Name *</Label>
              <Input value={newCustomer.name} onChange={(e) => setNewCustomer({ ...newCustomer, name: e.target.value })} />
            </div>
            <div>
              <Label>Email *</Label>
              <Input type="email" value={newCustomer.email} onChange={(e) => setNewCustomer({ ...newCustomer, email: e.target.value })} />
            </div>
            <div>
              <Label>Phone</Label>
              <Input value={newCustomer.phone} onChange={(e) => setNewCustomer({ ...newCustomer, phone: e.target.value })} />
            </div>
            <div>
              <Label>Address</Label>
              <Textarea value={newCustomer.address} onChange={(e) => setNewCustomer({ ...newCustomer, address: e.target.value })} />
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setShowAddCustomer(false)}>Cancel</Button>
              <Button onClick={handleAddCustomer} disabled={isSavingCustomer}>
                {isSavingCustomer ? "Saving..." : "Add Customer"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
    
  );
};

export default Invoices;