import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select, SelectContent, SelectItem,
  SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Table, TableBody, TableCell,
  TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Dialog, DialogContent, DialogHeader,
  DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/hooks/use-toast";
import {
  ArrowLeft, Plus, Save, Trash2,
  Package, ChevronDown, ChevronUp,
  Eye, ShoppingCart,
} from "lucide-react";
import Navbar from "@/components/Navbar";
import type { InventoryProduct } from "@/pages/Inventory";

// ─── Types ────────────────────────────────────────────────────────────────────

interface PurchaseItem {
  id: string;
  productId?: string;       // linked inventory product (if any)
  productName: string;
  description: string;
  hsnCode: string;
  quantity: number;
  unitPrice: number;        // cost / purchase price
  taxRate: number;
  taxAmount: number;
  discountType: "flat" | "percentage";
  discountValue: number;
  discountAmount: number;
  amount: number;           // final line total
  // variant info (if product has variants)
  variantId?: string;
  variantDetails?: string;  // "M / Black / Nike"
  unit: string;
  category: string;
  addToInventory: boolean;  // whether to update stock on save
}

interface Supplier {
  id: string;
  name: string;
  email: string;
  phone: string;
  address: string;
  gstin?: string;
}

interface PurchaseInvoice {
  id: string;
  purchaseNumber: string;
  date: string;
  supplier: Supplier | null;
  items: PurchaseItem[];
  subtotal: number;
  taxRate: number;
  taxAmount: number;
  discountType: "fixed" | "percentage";
  discountValue: number;
  discountAmount: number;
  total: number;
  notes: string;
  status: "Draft" | "Confirmed" | "Received";
  paymentStatus: "Paid" | "Unpaid" | "Partial";
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const defaultItem = (): PurchaseItem => ({
  id: Date.now().toString() + Math.random(),
  productName: "",
  description: "",
  hsnCode: "",
  quantity: 1,
  unitPrice: 0,
  taxRate: 0,
  taxAmount: 0,
  discountType: "flat",
  discountValue: 0,
  discountAmount: 0,
  amount: 0,
  unit: "piece",
  category: "",
  addToInventory: true,
});

const computeItem = (item: PurchaseItem, patch: Partial<PurchaseItem>): PurchaseItem => {
  const merged = { ...item, ...patch };
  const base = merged.quantity * merged.unitPrice;
  const discAmt =
    merged.discountType === "percentage"
      ? (base * merged.discountValue) / 100
      : merged.discountValue;
  const afterDisc = Math.max(0, base - discAmt);
  const taxAmt = (afterDisc * merged.taxRate) / 100;
  return {
    ...merged,
    discountAmount: parseFloat(discAmt.toFixed(2)),
    taxAmount: parseFloat(taxAmt.toFixed(2)),
    amount: parseFloat((afterDisc + taxAmt).toFixed(2)),
  };
};

// ─── Sub-component: PurchaseItemRow ──────────────────────────────────────────
const BillScanner = ({
  onItemsExtracted,
}: {
  onItemsExtracted: (items: Partial<PurchaseItem>[]) => void;
}) => {
  const [scanning, setScanning] = useState(false);
  const [extracted, setExtracted] = useState<Partial<PurchaseItem>[]>([]);
  const [preview, setPreview] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const scanBill = async (file: File) => {
    setScanning(true);
    setError(null);
    setExtracted([]);

    // Convert to base64
    const base64 = await new Promise<string>((res, rej) => {
      const r = new FileReader();
      r.onload = () => res((r.result as string).split(",")[1]);
      r.onerror = () => rej(new Error("Read failed"));
      r.readAsDataURL(file);
    });

    setPreview(URL.createObjectURL(file));

    try {
      const response = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "claude-sonnet-4-20250514",
          max_tokens: 1000,
          messages: [
            {
              role: "user",
              content: [
                {
                  type: "image",
                  source: {
                    type: "base64",
                    media_type: file.type as "image/jpeg" | "image/png" | "image/webp",
                    data: base64,
                  },
                },
                {
                  type: "text",
                  text: `Extract all line items from this bill/receipt/invoice image.
Return ONLY a JSON array, no markdown, no explanation. Each object must have:
- productName (string)
- quantity (number)
- unitPrice (number, cost per unit in INR)
- hsnCode (string or "")
- unit (string, e.g. "pcs", "kg", "box")
- description (string or "")

Example: [{"productName":"Cotton T-Shirt","quantity":12,"unitPrice":240,"hsnCode":"6109","unit":"pcs","description":"White M"}]
If you can't read something, make your best guess. Do NOT include shipping/delivery charges as separate line items — instead skip them.`,
                },
              ],
            },
          ],
        }),
      });

      const data = await response.json();
      const text = data.content
        .map((b: any) => b.text || "")
        .join("")
        .replace(/```json|```/g, "")
        .trim();

      const parsed: any[] = JSON.parse(text);
      const items: Partial<PurchaseItem>[] = parsed.map((p) => ({
        ...defaultItem(),
        productName: p.productName || "",
        quantity: Number(p.quantity) || 1,
        unitPrice: Number(p.unitPrice) || 0,
        hsnCode: p.hsnCode || "",
        unit: p.unit || "pcs",
        description: p.description || "",
        addToInventory: true,
        // recompute amounts
        ...computeItem(
          { ...defaultItem(), productName: p.productName },
          {
            quantity: Number(p.quantity) || 1,
            unitPrice: Number(p.unitPrice) || 0,
          }
        ),
      }));

      setExtracted(items);
    } catch (err) {
      setError("Could not parse bill. Try a clearer photo.");
    }
    setScanning(false);
  };

  return (
    <div className="border border-dashed border-blue-200 rounded-xl p-4 bg-blue-50/40 space-y-3">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-blue-800">Scan a bill or receipt</p>
          <p className="text-xs text-blue-600">Upload a photo — AI extracts items automatically</p>
        </div>
        <span className="text-xs bg-blue-100 text-blue-700 border border-blue-200 rounded-full px-2 py-0.5">
          AI powered
        </span>
      </div>

      {/* Upload zone */}
      {!preview && (
        <div
          onClick={() => fileRef.current?.click()}
          className="border-2 border-dashed border-blue-200 rounded-lg p-6 text-center cursor-pointer hover:border-blue-400 hover:bg-blue-50 transition"
        >
          <div className="text-3xl mb-2">📷</div>
          <p className="text-sm text-gray-500">Click to upload bill photo</p>
          <p className="text-xs text-gray-400 mt-1">JPG, PNG, WEBP · any angle</p>
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) scanBill(f);
            }}
          />
        </div>
      )}

      {/* Preview thumbnail */}
      {preview && (
        <div className="flex items-start gap-3">
          <img
            src={preview}
            alt="Bill preview"
            className="w-20 h-20 object-cover rounded-lg border border-gray-200"
          />
          <div className="flex-1">
            {scanning && (
              <div className="flex items-center gap-2 text-sm text-blue-600">
                <div className="w-4 h-4 border-2 border-blue-300 border-t-blue-600 rounded-full animate-spin" />
                Analyzing bill…
              </div>
            )}
            {error && <p className="text-sm text-red-500">{error}</p>}
            {!scanning && !error && extracted.length > 0 && (
              <p className="text-sm text-green-700 font-medium">
                ✓ Found {extracted.length} item{extracted.length > 1 ? "s" : ""}
              </p>
            )}
            <button
              onClick={() => {
                setPreview(null);
                setExtracted([]);
                setError(null);
                if (fileRef.current) fileRef.current.value = "";
              }}
              className="text-xs text-gray-400 hover:text-gray-600 mt-1 underline"
            >
              Use different photo
            </button>
          </div>
        </div>
      )}

      {/* Extracted items preview */}
      {extracted.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs text-gray-500 font-medium uppercase tracking-wide">Extracted items</p>
          {extracted.map((item, i) => (
            <div key={i} className="flex items-center justify-between bg-white border border-gray-200 rounded-lg px-3 py-2 text-sm">
              <div>
                <p className="font-medium text-gray-800">{item.productName}</p>
                {item.description && (
                  <p className="text-xs text-gray-400">{item.description}</p>
                )}
              </div>
              <div className="text-right text-xs text-gray-500">
                <p>{item.quantity} × ₹{item.unitPrice?.toFixed(2)}</p>
                <p className="font-semibold text-gray-800">₹{item.amount?.toFixed(2)}</p>
              </div>
            </div>
          ))}
          <div className="flex gap-2 pt-1">
            <Button
              size="sm"
              className="bg-blue-600 hover:bg-blue-700 text-white flex-1"
              onClick={() => {
                onItemsExtracted(extracted);
                setExtracted([]);
                setPreview(null);
                if (fileRef.current) fileRef.current.value = "";
              }}
            >
              <Plus className="w-4 h-4 mr-1" />
              Add all {extracted.length} items to PO
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};

const PurchaseItemRow = ({
  item,
  products,
  onUpdate,
  onDelete,
}: {
  item: PurchaseItem;
  products: InventoryProduct[];
  onUpdate: (patch: Partial<PurchaseItem>) => void;
  onDelete: () => void;
}) => {
  const [expanded, setExpanded] = useState(false);

  const update = (patch: Partial<PurchaseItem>) => {
    const next = computeItem(item, patch);
    onUpdate(next);
  };

  const handleProductPick = (productId: string) => {
    const product = products.find((p) => p.id === productId);
    if (!product) return;
    update({
      productId,
      productName: product.name,
      description: product.description || "",
      unit: product.unit,
      category: product.category || "",
      unitPrice: product.cost_price ?? product.unit_price,
    });
  };

  return (
    <div className="border border-gray-200 rounded-xl mb-3 overflow-hidden bg-white shadow-sm">
      {/* Main row */}
      <div className="grid grid-cols-12 gap-2 p-3 items-end">
        {/* Product Name */}
        <div className="col-span-3">
          <Label className="text-xs text-gray-400 mb-1 block">Product Name</Label>
          <Input
            placeholder="Item name"
            value={item.productName}
            onChange={(e) => update({ productName: e.target.value })}
          />
        </div>

        {/* Link to inventory */}
        <div className="col-span-2">
          <Label className="text-xs text-gray-400 mb-1 block">From Inventory</Label>
          <Select value={item.productId ?? ""} onValueChange={handleProductPick}>
            <SelectTrigger className="h-9 text-xs">
              <SelectValue placeholder="Link product" />
            </SelectTrigger>
            <SelectContent>
              // In PurchaseItemRow — "From Inventory" select
<SelectItem value="__none__">— None —</SelectItem>
              {products.map((p) => (
                <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* HSN */}
        <div className="col-span-1">
          <Label className="text-xs text-gray-400 mb-1 block">HSN</Label>
          <Input
            placeholder="6109"
            value={item.hsnCode}
            onChange={(e) => update({ hsnCode: e.target.value })}
          />
        </div>

        {/* Qty */}
        <div className="col-span-1">
          <Label className="text-xs text-gray-400 mb-1 block">Qty</Label>
          <Input
            type="number"
            min={1}
            value={item.quantity}
            onChange={(e) => update({ quantity: parseFloat(e.target.value) || 1 })}
          />
        </div>

        {/* Unit */}
        <div className="col-span-1">
          <Label className="text-xs text-gray-400 mb-1 block">Unit</Label>
          <Input
            placeholder="pcs"
            value={item.unit}
            onChange={(e) => update({ unit: e.target.value })}
          />
        </div>

        {/* Cost Price */}
        <div className="col-span-2">
          <Label className="text-xs text-gray-400 mb-1 block">Cost Price (₹)</Label>
          <Input
            type="number"
            min={0}
            value={item.unitPrice}
            onChange={(e) => update({ unitPrice: parseFloat(e.target.value) || 0 })}
          />
        </div>

        {/* Amount */}
        <div className="col-span-1">
          <Label className="text-xs text-gray-400 mb-1 block">Amount</Label>
          <div className="h-9 flex items-center px-2 rounded-md border bg-gray-50 text-xs font-semibold text-gray-800">
            ₹{item.amount.toFixed(2)}
          </div>
        </div>

        {/* Actions */}
        <div className="col-span-1 flex gap-0.5 justify-end">
          <Button
            variant="ghost" size="icon"
            className="h-9 w-9 text-gray-400 hover:text-gray-700"
            onClick={() => setExpanded((v) => !v)}
          >
            {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </Button>
          <Button
            variant="ghost" size="icon"
            className="h-9 w-9 text-red-400 hover:text-red-600"
            onClick={onDelete}
          >
            <Trash2 className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Inline pills when collapsed */}
      {!expanded && (
        <div className="flex gap-2 px-3 pb-2 flex-wrap">
          {item.addToInventory && (
            <span className="text-xs bg-blue-50 text-blue-600 border border-blue-100 rounded-full px-2 py-0.5">
              + Adds to stock
            </span>
          )}
          {item.discountAmount > 0 && (
            <span className="text-xs bg-red-50 text-red-500 border border-red-100 rounded-full px-2 py-0.5">
              Disc −₹{item.discountAmount.toFixed(2)}
            </span>
          )}
          {item.taxAmount > 0 && (
            <span className="text-xs bg-green-50 text-green-600 border border-green-100 rounded-full px-2 py-0.5">
              Tax +₹{item.taxAmount.toFixed(2)}
            </span>
          )}
        </div>
      )}

      {/* Expanded panel */}
      {expanded && (
        <div className="border-t border-gray-100 bg-gray-50 px-3 py-3 space-y-3">
          {/* Math trace */}
          <div className="flex items-center gap-2 text-xs text-gray-400 flex-wrap">
            <span>Base: {item.quantity} × ₹{item.unitPrice} = ₹{(item.quantity * item.unitPrice).toFixed(2)}</span>
            {item.discountAmount > 0 && <><span>→</span><span className="text-red-500">−₹{item.discountAmount.toFixed(2)} disc.</span></>}
            {item.taxAmount > 0 && <><span>→</span><span className="text-green-600">+₹{item.taxAmount.toFixed(2)} tax</span></>}
            <span>→</span>
            <span className="font-semibold text-gray-700">₹{item.amount.toFixed(2)}</span>
          </div>

          <div className="grid grid-cols-12 gap-2 items-end">
            {/* Discount type */}
            <div className="col-span-2">
              <Label className="text-xs text-gray-400 mb-1 block">Discount Type</Label>
              <Select
                value={item.discountType}
                onValueChange={(v: "flat" | "percentage") =>
                  update({ discountType: v, discountValue: 0 })
                }
              >
                <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="flat">Flat (₹)</SelectItem>
                  <SelectItem value="percentage">Percent (%)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Discount value */}
            <div className="col-span-2">
              <Label className="text-xs text-gray-400 mb-1 block">
                Discount {item.discountType === "percentage" ? "(%)" : "(₹)"}
              </Label>
              <Input
                type="number" min={0}
                value={item.discountValue}
                onChange={(e) => update({ discountValue: parseFloat(e.target.value) || 0 })}
              />
            </div>

            {/* Discount amount read-only */}
            <div className="col-span-2">
              <Label className="text-xs text-gray-400 mb-1 block">Disc. Amount</Label>
              <div className="h-9 flex items-center px-3 rounded-md border bg-white text-sm text-red-500 font-medium">
                −₹{item.discountAmount.toFixed(2)}
              </div>
            </div>

            {/* Spacer */}
            <div className="col-span-1" />

            {/* Tax rate */}
            <div className="col-span-2">
              <Label className="text-xs text-gray-400 mb-1 block">Tax Rate (%)</Label>
              <Input
                type="number" min={0}
                value={item.taxRate}
                onChange={(e) => update({ taxRate: parseFloat(e.target.value) || 0 })}
              />
            </div>

            {/* Tax amount read-only */}
            <div className="col-span-2">
              <Label className="text-xs text-gray-400 mb-1 block">Tax Amount</Label>
              <div className="h-9 flex items-center px-3 rounded-md border bg-white text-sm text-green-600 font-medium">
                +₹{item.taxAmount.toFixed(2)}
              </div>
            </div>

            {/* Category */}
            <div className="col-span-2">
              <Label className="text-xs text-gray-400 mb-1 block">Category</Label>
              <Input
                placeholder="clothing"
                value={item.category}
                onChange={(e) => update({ category: e.target.value })}
              />
            </div>

            {/* Description */}
            <div className="col-span-10">
              <Label className="text-xs text-gray-400 mb-1 block">Description</Label>
              <Input
                placeholder="Optional description"
                value={item.description}
                onChange={(e) => update({ description: e.target.value })}
              />
            </div>

            {/* Add to inventory toggle */}
            {/* In the main row grid, replace the Actions col-span-1 with col-span-2, add the toggle inline */}
<div className="col-span-1 flex items-center gap-1 pb-1">
  <input
    type="checkbox"
    id={`inv-${item.id}`}
    checked={item.addToInventory}
    onChange={(e) => onUpdate({ addToInventory: e.target.checked })}
    className="w-4 h-4 accent-blue-600"
  />
  <Label htmlFor={`inv-${item.id}`} className="text-xs text-gray-500 cursor-pointer whitespace-nowrap">
    → Stock
  </Label>
</div>
          </div>
        </div>
      )}
    </div>
  );
};

// ─── Main Page ────────────────────────────────────────────────────────────────

const PurchaseInvoices = () => {
  const navigate = useNavigate();
  const { user } = useAuth();

  const [products, setProducts] = useState<InventoryProduct[]>([]);
  const [savedPurchases, setSavedPurchases] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState<"new" | "list">("new");
  const [isLoading, setIsLoading] = useState(false);
  const [viewPurchase, setViewPurchase] = useState<any | null>(null);

  // Supplier dialog
  const [showSupplierDialog, setShowSupplierDialog] = useState(false);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [newSupplier, setNewSupplier] = useState<Omit<Supplier, "id">>({
    name: "", email: "", phone: "", address: "", gstin: "",
  });

  const [purchase, setPurchase] = useState<PurchaseInvoice>({
    id: "",
    purchaseNumber: `PO-${Date.now()}`,
    date: new Date().toISOString().split("T")[0],
    supplier: null,
    items: [],
    subtotal: 0,
    taxRate: 0,
    taxAmount: 0,
    discountType: "percentage",
    discountValue: 0,
    discountAmount: 0,
    total: 0,
    notes: "",
    status: "Draft",
    paymentStatus: "Unpaid",
  });

  // ── Effects ──────────────────────────────────────────────────────────────
  useEffect(() => {
    if (user) {
      fetchProducts();
      fetchSavedPurchases();
      fetchSuppliers();
    }
  }, [user]);

  useEffect(() => { recalcTotals(); }, [
    purchase.items, purchase.taxRate,
    purchase.discountType, purchase.discountValue,
  ]);

  // ── Fetch helpers ─────────────────────────────────────────────────────────
  const fetchProducts = async () => {
    if (!user) return;
    const { data } = await supabase
      .from("inventory_products")
      .select("*")
      .eq("user_id", user.id)
      .order("name");
    setProducts(data || []);
  };

  const fetchSavedPurchases = async () => {
    if (!user) return;
    const { data } = await supabase
      .from("purchase_invoices")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });
    setSavedPurchases(data || []);
  };

  const fetchSuppliers = async () => {
  if (!user) return;
  const { data } = await supabase
    .from("suppliers")
    .select("*")
    .eq("user_id", user.id)
    .order("name");
  setSuppliers((data as Supplier[]) || []);  // cast until types regenerate
};

  // ── Totals ────────────────────────────────────────────────────────────────
  const recalcTotals = () => {
    const subtotal = purchase.items.reduce((s, i) => s + i.amount, 0);
    const taxAmount = (subtotal * purchase.taxRate) / 100;
    const discountAmount =
      purchase.discountType === "percentage"
        ? (subtotal * purchase.discountValue) / 100
        : purchase.discountValue;
    const total = Math.max(0, subtotal + taxAmount - discountAmount);
    setPurchase((p) => ({ ...p, subtotal, taxAmount, discountAmount, total }));
  };

  // ── Item CRUD ─────────────────────────────────────────────────────────────
  const addItem = () =>
    setPurchase((p) => ({ ...p, items: [...p.items, defaultItem()] }));

  const updateItem = (id: string, patch: Partial<PurchaseItem>) =>
    setPurchase((p) => ({
      ...p,
      items: p.items.map((item) =>
        item.id === id ? { ...item, ...patch } : item
      ),
    }));

  const deleteItem = (id: string) =>
    setPurchase((p) => ({ ...p, items: p.items.filter((i) => i.id !== id) }));

  // ── Supplier ──────────────────────────────────────────────────────────────
  const saveSupplier = async () => {
    if (!user || !newSupplier.name) return;
    const { data, error } = await supabase
      .from("suppliers")
      .insert({ ...newSupplier, user_id: user.id })
      .select()
      .single();
    if (error) {
      toast({ title: "Error", description: "Failed to save supplier", variant: "destructive" });
      return;
    }
    setSuppliers((s) => [...s, data]);
    setPurchase((p) => ({ ...p, supplier: data }));
    setShowSupplierDialog(false);
    setNewSupplier({ name: "", email: "", phone: "", address: "", gstin: "" });
    toast({ title: "Supplier added!", description: "Supplier saved and selected." });
  };

  // ── Apply inventory updates ───────────────────────────────────────────────
  const applyInventoryUpdates = async (items: PurchaseItem[]) => {
    const toAdd = items.filter((i) => i.addToInventory && i.productName);

    for (const item of toAdd) {
      if (item.productId) {
        // Linked to existing product — increment stock
        const existing = products.find((p) => p.id === item.productId);
        if (!existing) continue;

        // Parse variants
        let variants: any[] = [];
        try { variants = existing.variants ? JSON.parse(existing.variants) : []; } catch { variants = []; }

        if (item.variantId) {
          // Update matching variant stock
          variants = variants.map((v: any) =>
            v.id === item.variantId
              ? { ...v, stock_quantity: (v.stock_quantity || 0) + item.quantity }
              : v
          );
        }

        const newStock = (existing.current_stock || 0) + item.quantity;
        await supabase
          .from("inventory_products")
          .update({
            current_stock: newStock,
            cost_price: item.unitPrice,
            variants: variants.length ? JSON.stringify(variants) : existing.variants,
          })
          .eq("id", item.productId);
      } else {
        // New product — create it
        await supabase.from("inventory_products").insert({
          user_id: user!.id,
          name: item.productName,
          description: item.description || null,
          sku: null,
          unit_price: item.unitPrice,
          cost_price: item.unitPrice,
          current_stock: item.quantity,
          min_stock_level: 0,
          unit: item.unit || "piece",
          category: item.category || null,
          barcode: null,
          hsn_code: item.hsnCode || null,
          variants: JSON.stringify([{
            id: Date.now().toString(),
            size: "—", color: "—", brand: "—",
            stock_quantity: item.quantity,
            unit_price: item.unitPrice,
            cost_price: item.unitPrice,
            hsn_code: item.hsnCode,
            min_stock_level: 0,
          }]),
          is_active: true,
        });
      }
    }
  };

  // ── Save purchase ─────────────────────────────────────────────────────────
  const savePurchase = async (confirm = false) => {
    if (!user) return;
    if (!purchase.supplier) {
      toast({ title: "Supplier required", description: "Please select a supplier.", variant: "destructive" });
      return;
    }
    if (purchase.items.length === 0) {
      toast({ title: "No items", description: "Add at least one item.", variant: "destructive" });
      return;
    }

    setIsLoading(true);
    try {
      const status = confirm ? "Confirmed" : "Draft";
      const { error } = await supabase.from("purchase_invoices").insert({
        user_id: user.id,
        purchase_number: purchase.purchaseNumber,
        date: purchase.date,
        supplier_name: purchase.supplier.name,
        supplier_email: purchase.supplier.email,
        supplier_phone: purchase.supplier.phone,
        supplier_address: purchase.supplier.address,
        supplier_gstin: purchase.supplier.gstin,
        items: JSON.stringify(purchase.items),
        subtotal: purchase.subtotal,
        tax_rate: purchase.taxRate,
        tax_amount: purchase.taxAmount,
        discount: purchase.discountAmount,
        total: purchase.total,
        notes: purchase.notes,
        status,
        payment_status: purchase.paymentStatus,
      });
      if (error) throw error;

      // Apply inventory if confirming
      if (confirm) {
        await applyInventoryUpdates(purchase.items);
        toast({
          title: "Purchase confirmed!",
          description: `Inventory updated for ${purchase.items.filter((i) => i.addToInventory).length} item(s).`,
        });
      } else {
        toast({ title: "Draft saved!", description: "Purchase order saved as draft." });
      }

      // Reset
      setPurchase({
        id: "", purchaseNumber: `PO-${Date.now()}`,
        date: new Date().toISOString().split("T")[0],
        supplier: null, items: [],
        subtotal: 0, taxRate: 0, taxAmount: 0,
        discountType: "percentage", discountValue: 0, discountAmount: 0,
        total: 0, notes: "", status: "Draft", paymentStatus: "Unpaid",
      });
      fetchSavedPurchases();
      fetchProducts();
      setActiveTab("list");
    } catch (err) {
      console.error(err);
      toast({ title: "Error", description: "Failed to save purchase.", variant: "destructive" });
    }
    setIsLoading(false);
  };

  const updatePaymentStatus = async (id: string, status: "Paid" | "Unpaid" | "Partial") => {
    await supabase.from("purchase_invoices").update({ payment_status: status } as any).eq("id", id);
    setSavedPurchases((prev) =>
      prev.map((p) => p.id === id ? { ...p, payment_status: status } : p)
    );
  };

  const deletePurchase = async (id: string) => {
    if (!confirm("Delete this purchase order?")) return;
    await supabase.from("purchase_invoices").delete().eq("id", id);
    setSavedPurchases((prev) => prev.filter((p) => p.id !== id));
    toast({ title: "Deleted" });
  };

  // ── Summaries ─────────────────────────────────────────────────────────────
  const totalSpend = savedPurchases.reduce((s, p) => s + (p.total || 0), 0);
  const totalPaid = savedPurchases.reduce(
    (s, p) => s + (p.payment_status === "Paid" ? p.total : 0), 0
  );
  const totalPending = totalSpend - totalPaid;

  // ─────────────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-green-50">
      <Navbar />
      <div className="container mx-auto px-4 py-8">

        {/* ── Page Header ── */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-green-600 bg-clip-text text-transparent">
              Purchase Orders
            </h1>
            <p className="text-gray-500">Record purchases and auto-update inventory</p>
          </div>
          <div className="flex gap-2">
            <Button onClick={() => navigate("/")} variant="outline">
              <ArrowLeft className="w-4 h-4 mr-2" /> Dashboard
            </Button>
            <Button onClick={() => navigate("/inventory")} variant="outline">
              <Package className="w-4 h-4 mr-2" /> Inventory
            </Button>
          </div>
        </div>

        {/* ── Summary Cards ── */}
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 mb-6">
          {[
            { label: "Total Spend", value: `₹${totalSpend.toFixed(2)}`, color: "text-gray-900" },
            { label: "Paid", value: `₹${totalPaid.toFixed(2)}`, color: "text-green-600" },
            { label: "Pending", value: `₹${totalPending.toFixed(2)}`, color: "text-yellow-600" },
            { label: "Orders", value: String(savedPurchases.length), color: "text-blue-600" },
          ].map(({ label, value, color }) => (
            <Card key={label} className="shadow-sm rounded-xl">
              <CardContent className="p-4">
                <p className="text-xs text-gray-500">{label}</p>
                <p className={`text-xl font-bold ${color}`}>{value}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* ── Tabs ── */}
        <div className="flex gap-1 bg-gray-100 p-1 rounded-lg w-fit mb-6 border border-gray-200">
          {(["new", "list"] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-5 py-2 rounded-md text-sm font-medium transition-all ${
                activeTab === tab
                  ? "bg-white shadow-sm text-gray-900 border border-gray-200"
                  : "text-gray-500 hover:text-gray-700"
              }`}
            >
              {tab === "new" ? (
                <span className="flex items-center gap-1.5">
                  <ShoppingCart className="w-4 h-4" /> New Purchase
                </span>
              ) : (
                <span className="flex items-center gap-1.5">
                  <Package className="w-4 h-4" /> Purchase History
                </span>
              )}
            </button>
          ))}
        </div>

        {/* ════════════ NEW PURCHASE ════════════ */}
        {activeTab === "new" && (
          <div className="space-y-6">

            {/* Row 1 — PO Details + Supplier */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

              {/* PO Details */}
              <Card className="shadow-sm border-0 ring-1 ring-gray-200">
                <CardHeader className="pb-3 pt-5 px-5">
                  <CardTitle className="text-sm font-semibold text-gray-700 uppercase tracking-wide">
                    Purchase Details
                  </CardTitle>
                </CardHeader>
                <CardContent className="px-5 pb-5 space-y-4">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label className="text-xs text-gray-500 mb-1 block">PO Number</Label>
                      <Input
                        value={purchase.purchaseNumber}
                        onChange={(e) => setPurchase((p) => ({ ...p, purchaseNumber: e.target.value }))}
                      />
                    </div>
                    <div>
                      <Label className="text-xs text-gray-500 mb-1 block">Date</Label>
                      <Input
                        type="date" value={purchase.date}
                        onChange={(e) => setPurchase((p) => ({ ...p, date: e.target.value }))}
                      />
                    </div>
                    <div>
                      <Label className="text-xs text-gray-500 mb-1 block">Status</Label>
                      <Select
                        value={purchase.status}
                        onValueChange={(v: "Draft" | "Confirmed" | "Received") =>
                          setPurchase((p) => ({ ...p, status: v }))
                        }
                      >
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Draft">Draft</SelectItem>
                          <SelectItem value="Confirmed">Confirmed</SelectItem>
                          <SelectItem value="Received">Received</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label className="text-xs text-gray-500 mb-1 block">Payment Status</Label>
                      <Select
                        value={purchase.paymentStatus}
                        onValueChange={(v: "Paid" | "Unpaid" | "Partial") =>
                          setPurchase((p) => ({ ...p, paymentStatus: v }))
                        }
                      >
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Paid">Paid</SelectItem>
                          <SelectItem value="Unpaid">Unpaid</SelectItem>
                          <SelectItem value="Partial">Partial</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  {/* Status badge */}
                  <div className="flex gap-2">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${
                      purchase.status === "Confirmed" ? "bg-blue-100 text-blue-700 border-blue-200"
                      : purchase.status === "Received" ? "bg-green-100 text-green-700 border-green-200"
                      : "bg-gray-100 text-gray-600 border-gray-200"
                    }`}>
                      {purchase.status}
                    </span>
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${
                      purchase.paymentStatus === "Paid" ? "bg-green-100 text-green-700 border-green-200"
                      : purchase.paymentStatus === "Partial" ? "bg-yellow-100 text-yellow-700 border-yellow-200"
                      : "bg-red-100 text-red-700 border-red-200"
                    }`}>
                      {purchase.paymentStatus}
                    </span>
                  </div>
                </CardContent>
              </Card>

              {/* Supplier */}
              <Card className="shadow-sm border-0 ring-1 ring-gray-200">
                <CardHeader className="pb-3 pt-5 px-5">
                  <CardTitle className="text-sm font-semibold text-gray-700 uppercase tracking-wide">
                    Supplier
                  </CardTitle>
                </CardHeader>
                <CardContent className="px-5 pb-5 space-y-3">
                  <div>
                    <Label className="text-xs text-gray-500 mb-1 block">Select Supplier</Label>
                    <Select
                      value={purchase.supplier?.id ?? ""}
                      onValueChange={(id) => {
                        const s = suppliers.find((s) => s.id === id);
                        if (s) setPurchase((p) => ({ ...p, supplier: s }));
                      }}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Choose supplier…" />
                      </SelectTrigger>
                      <SelectContent>
                        {suppliers.map((s) => (
                          <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <Button variant="outline" size="sm" onClick={() => setShowSupplierDialog(true)}>
                    <Plus className="w-4 h-4 mr-1" /> Add New Supplier
                  </Button>

                  {purchase.supplier && (
                    <div className="p-3 bg-gray-50 rounded-lg text-sm space-y-0.5">
                      <p className="font-semibold text-gray-800">{purchase.supplier.name}</p>
                      {purchase.supplier.email && <p className="text-gray-500">{purchase.supplier.email}</p>}
                      {purchase.supplier.phone && <p className="text-gray-500">{purchase.supplier.phone}</p>}
                      {purchase.supplier.gstin && (
                        <p className="text-gray-500">GSTIN: {purchase.supplier.gstin}</p>
                      )}
                      {purchase.supplier.address && (
                        <p className="text-gray-500">{purchase.supplier.address}</p>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Items */}
            <Card className="shadow-sm border-0 ring-1 ring-gray-200">
              <CardHeader className="pb-3 pt-5 px-5">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm font-semibold text-gray-700 uppercase tracking-wide">
                    Purchase Items
                  </CardTitle>
                  <Button onClick={addItem} size="sm" className="bg-blue-600 hover:bg-blue-700 text-white">
                    <Plus className="w-4 h-4 mr-1" /> Add Item
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="px-5 pb-5">
                {purchase.items.length === 0 ? (
                  <div className="text-center py-12 text-gray-400 border-2 border-dashed rounded-lg">
                    <ShoppingCart className="w-8 h-8 mx-auto mb-2 opacity-30" />
                    <p className="text-sm">No items yet. Click "Add Item" to start.</p>
                    <p className="text-xs mt-1">Items marked "Add to stock" will update inventory on confirm.</p>
                  </div>
                ) : (
                  purchase.items.map((item) => (
                    <PurchaseItemRow
                      key={item.id}
                      item={item}
                      products={products}
                      onUpdate={(patch) => updateItem(item.id, patch)}
                      onDelete={() => deleteItem(item.id)}
                    />
                  ))
                )}
              </CardContent>
            </Card>

            {/* Notes + Totals */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

              <Card className="shadow-sm border-0 ring-1 ring-gray-200">
                <CardHeader className="pb-3 pt-5 px-5">
                  <CardTitle className="text-sm font-semibold text-gray-700 uppercase tracking-wide">Notes</CardTitle>
                </CardHeader>
                <CardContent className="px-5 pb-5">
                  <Textarea
                    rows={4}
                    placeholder="Purchase notes, delivery terms, etc."
                    value={purchase.notes}
                    onChange={(e) => setPurchase((p) => ({ ...p, notes: e.target.value }))}
                  />
                </CardContent>
              </Card>

              <Card className="shadow-sm border-0 ring-1 ring-gray-200">
                <CardHeader className="pb-3 pt-5 px-5">
                  <CardTitle className="text-sm font-semibold text-gray-700 uppercase tracking-wide">
                    Totals & Tax
                  </CardTitle>
                </CardHeader>
                <CardContent className="px-5 pb-5 space-y-4">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label className="text-xs text-gray-500 mb-1 block">Overall Tax (%)</Label>
                      <Input
                        type="number" min={0}
                        value={purchase.taxRate}
                        onChange={(e) => setPurchase((p) => ({ ...p, taxRate: parseFloat(e.target.value) || 0 }))}
                      />
                    </div>
                    <div>
                      <Label className="text-xs text-gray-500 mb-1 block">Overall Discount</Label>
                      <div className="flex gap-1">
                        <Select
                          value={purchase.discountType}
                          onValueChange={(v: "fixed" | "percentage") =>
                            setPurchase((p) => ({ ...p, discountType: v, discountValue: 0 }))
                          }
                        >
                          <SelectTrigger className="w-20"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="percentage">%</SelectItem>
                            <SelectItem value="fixed">₹</SelectItem>
                          </SelectContent>
                        </Select>
                        <Input
                          type="number" min={0}
                          value={purchase.discountValue}
                          onChange={(e) => setPurchase((p) => ({ ...p, discountValue: parseFloat(e.target.value) || 0 }))}
                        />
                      </div>
                    </div>
                  </div>

                  <div className="border-t pt-4 space-y-2 text-sm">
                    <div className="flex justify-between text-gray-600">
                      <span>Subtotal (per-item totals)</span>
                      <span>₹{purchase.subtotal.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between text-gray-600">
                      <span>Overall Tax ({purchase.taxRate}%)</span>
                      <span>₹{purchase.taxAmount.toFixed(2)}</span>
                    </div>
                    {purchase.discountAmount > 0 && (
                      <div className="flex justify-between text-red-500">
                        <span>Discount</span>
                        <span>−₹{purchase.discountAmount.toFixed(2)}</span>
                      </div>
                    )}
                    <div className="flex justify-between font-bold text-base border-t pt-2">
                      <span>Total</span>
                      <span className="text-blue-600">₹{purchase.total.toFixed(2)}</span>
                    </div>
                  </div>

                  {/* Stock summary */}
                  {purchase.items.length > 0 && (
                    <div className="bg-blue-50 border border-blue-100 rounded-lg px-3 py-2">
                      <p className="text-xs font-medium text-blue-700 mb-1">Inventory impact on confirm:</p>
                      {purchase.items.filter((i) => i.addToInventory).map((i) => (
                        <div key={i.id} className="flex justify-between text-xs text-blue-600">
                          <span className="truncate max-w-[60%]">{i.productName || "Unnamed"}</span>
                          <span>+{i.quantity} {i.unit}</span>
                        </div>
                      ))}
                      {purchase.items.filter((i) => !i.addToInventory).length > 0 && (
                        <p className="text-xs text-gray-400 mt-1">
                          {purchase.items.filter((i) => !i.addToInventory).length} item(s) excluded from stock update.
                        </p>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Action buttons */}
            <div className="flex justify-end gap-3 pb-4">
              <Button variant="outline" onClick={() => savePurchase(false)} disabled={isLoading}>
                <Save className="w-4 h-4 mr-2" />
                Save as Draft
              </Button>
              <Button
                onClick={() => savePurchase(true)}
                disabled={isLoading}
                className="bg-gradient-to-r from-blue-600 to-green-600 hover:from-blue-700 hover:to-green-700 text-white"
              >
                <Package className="w-4 h-4 mr-2" />
                {isLoading ? "Saving…" : "Confirm & Update Inventory"}
              </Button>
            </div>
          </div>
        )}

        {/* ════════════ PURCHASE HISTORY ════════════ */}
        {activeTab === "list" && (
          <Card className="shadow-sm rounded-xl">
            <CardHeader>
              <CardTitle>Purchase History</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>PO #</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead>Supplier</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Payment</TableHead>
                      <TableHead>Total</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {savedPurchases.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={7} className="text-center py-12 text-gray-400">
                          No purchase orders yet.
                        </TableCell>
                      </TableRow>
                    ) : (
                      savedPurchases.map((po) => (
                        <TableRow key={po.id} className="hover:bg-gray-50 transition">
                          <TableCell className="font-medium">{po.purchase_number}</TableCell>
                          <TableCell>{po.date}</TableCell>
                          <TableCell>{po.supplier_name}</TableCell>
                          <TableCell>
                            <Badge className={
                              po.status === "Confirmed" ? "bg-blue-100 text-blue-700 border-blue-200"
                              : po.status === "Received" ? "bg-green-100 text-green-700 border-green-200"
                              : "bg-gray-100 text-gray-600 border-gray-200"
                            }>
                              {po.status}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <Select
                              value={po.payment_status ?? "Unpaid"}
                              onValueChange={(v) => updatePaymentStatus(po.id, v as "Paid" | "Unpaid" | "Partial")}
                            >
                              <SelectTrigger className={`w-[110px] h-8 text-xs rounded-full ${
                                po.payment_status === "Paid" ? "border-green-200 text-green-700"
                                : po.payment_status === "Partial" ? "border-yellow-200 text-yellow-700"
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
                          <TableCell className="font-semibold">₹{po.total?.toFixed(2)}</TableCell>
                          <TableCell className="text-right">
                            <div className="flex justify-end gap-2">
                              <Button size="sm" variant="outline" onClick={() => setViewPurchase(po)}>
                                <Eye className="w-4 h-4 mr-1" /> View
                              </Button>
                              <Button size="sm" variant="destructive" onClick={() => deletePurchase(po.id)}>
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* ── Add Supplier Dialog ── */}
      <Dialog open={showSupplierDialog} onOpenChange={setShowSupplierDialog}>
        <DialogContent>
          <DialogHeader><DialogTitle>Add New Supplier</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Name *</Label>
              <Input value={newSupplier.name} onChange={(e) => setNewSupplier({ ...newSupplier, name: e.target.value })} />
            </div>
            <div>
              <Label>Email</Label>
              <Input type="email" value={newSupplier.email} onChange={(e) => setNewSupplier({ ...newSupplier, email: e.target.value })} />
            </div>
            <div>
              <Label>Phone</Label>
              <Input value={newSupplier.phone} onChange={(e) => setNewSupplier({ ...newSupplier, phone: e.target.value })} />
            </div>
            <div>
              <Label>GSTIN</Label>
              <Input value={newSupplier.gstin} onChange={(e) => setNewSupplier({ ...newSupplier, gstin: e.target.value })} />
            </div>
            <div>
              <Label>Address</Label>
              <Textarea value={newSupplier.address} onChange={(e) => setNewSupplier({ ...newSupplier, address: e.target.value })} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowSupplierDialog(false)}>Cancel</Button>
            <Button onClick={saveSupplier} disabled={!newSupplier.name}>Add Supplier</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── View Purchase Dialog ── */}
      <Dialog open={!!viewPurchase} onOpenChange={() => setViewPurchase(null)}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Purchase Order — {viewPurchase?.purchase_number}</DialogTitle>
          </DialogHeader>
          {viewPurchase && (() => {
            let items: PurchaseItem[] = [];
            try { items = JSON.parse(viewPurchase.items); } catch { items = []; }
            return (
              <div className="space-y-4 text-sm">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-xs text-gray-400 mb-1">Supplier</p>
                    <p className="font-semibold">{viewPurchase.supplier_name}</p>
                    <p className="text-gray-500">{viewPurchase.supplier_email}</p>
                    <p className="text-gray-500">{viewPurchase.supplier_phone}</p>
                    {viewPurchase.supplier_gstin && <p className="text-gray-500">GSTIN: {viewPurchase.supplier_gstin}</p>}
                  </div>
                  <div>
                    <p className="text-xs text-gray-400 mb-1">Details</p>
                    <p>Date: {viewPurchase.date}</p>
                    <p>Status: <Badge className="ml-1">{viewPurchase.status}</Badge></p>
                    <p>Payment: <Badge className="ml-1">{viewPurchase.payment_status}</Badge></p>
                  </div>
                </div>

                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>#</TableHead>
                      <TableHead>Item</TableHead>
                      <TableHead>HSN</TableHead>
                      <TableHead>Qty</TableHead>
                      <TableHead>Cost</TableHead>
                      <TableHead>Disc.</TableHead>
                      <TableHead>Tax</TableHead>
                      <TableHead className="text-right">Amount</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {items.map((item, i) => (
                      <TableRow key={item.id || i}>
                        <TableCell>{i + 1}</TableCell>
                        <TableCell>
                          <p className="font-medium">{item.productName}</p>
                          {item.description && <p className="text-xs text-gray-400">{item.description}</p>}
                          {item.addToInventory && (
                            <span className="text-xs bg-blue-50 text-blue-600 px-1.5 py-0.5 rounded">+ stock</span>
                          )}
                        </TableCell>
                        <TableCell>{item.hsnCode || "—"}</TableCell>
                        <TableCell>{item.quantity} {item.unit}</TableCell>
                        <TableCell>₹{item.unitPrice?.toFixed(2)}</TableCell>
                        <TableCell className="text-red-500">
                          {item.discountAmount > 0 ? `−₹${item.discountAmount.toFixed(2)}` : "—"}
                        </TableCell>
                        <TableCell className="text-green-600">
                          {item.taxAmount > 0 ? `+₹${item.taxAmount.toFixed(2)}` : "—"}
                        </TableCell>
                        <TableCell className="text-right font-medium">₹{item.amount?.toFixed(2)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>

                <div className="flex justify-end">
                  <div className="w-64 space-y-1 text-sm border-t pt-3">
                    <div className="flex justify-between text-gray-500">
                      <span>Subtotal</span><span>₹{viewPurchase.subtotal?.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between text-gray-500">
                      <span>Tax ({viewPurchase.tax_rate}%)</span><span>₹{viewPurchase.tax_amount?.toFixed(2)}</span>
                    </div>
                    {viewPurchase.discount > 0 && (
                      <div className="flex justify-between text-red-500">
                        <span>Discount</span><span>−₹{viewPurchase.discount?.toFixed(2)}</span>
                      </div>
                    )}
                    <div className="flex justify-between font-bold text-base border-t pt-2">
                      <span>Total</span><span className="text-blue-600">₹{viewPurchase.total?.toFixed(2)}</span>
                    </div>
                  </div>
                </div>

                {viewPurchase.notes && (
                  <div>
                    <p className="text-xs text-gray-400 mb-1">Notes</p>
                    <p className="text-gray-600 whitespace-pre-line">{viewPurchase.notes}</p>
                  </div>
                )}
              </div>
            );
          })()}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default PurchaseInvoices;