// src/pages/Inventory.tsx
import { useState, useEffect, useRef } from "react";
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
  Plus, Edit, Trash2, Search, AlertTriangle, Package,
  Upload, CheckCircle, XCircle, FileText, FileDown,
  Building2, Settings2, Camera, X, Image,
  Copy, ExternalLink, Store, Link,
} from "lucide-react";
import Navbar from "@/components/Navbar";
import { useActiveOwnerId } from "@/hooks/useActiveOwnerId";
import { useCompany } from "@/hooks/useCompany";
import { useRole } from "@/hooks/useRole";

export interface InventoryProduct {
  id: string;
  name: string;
  description: string | null;
  sku: string | null;
  unit_price: number;
  cost_price: number | null;
  current_stock: number;
  min_stock_level: number;
  max_stock_level: number | null;
  unit: string;
  category: string | null;
  barcode: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  variants?: string;
  photo_url?: string | null;
}

interface VariantRow {
  id: string;
  stock_quantity: number;
  unit_price: number;
  cost_price: number;
  hsn_code: string;
  min_stock_level: number;
  [key: string]: any;
}

interface CSVPreviewRow {
  rowIndex: number;
  product_name: string;
  description: string;
  category: string;
  unit: string;
  stock_quantity: number;
  unit_price: number;
  cost_price: number;
  hsn_code: string;
  min_stock_level: number;
  errors: string[];
  valid: boolean;
  [key: string]: any;
}

type FieldType = "text" | "select" | "number";

interface VariantField {
  key: string;
  label: string;
  type: FieldType;
  options?: string[];
  placeholder?: string;
}

interface BusinessTypeConfig {
  label: string;
  icon: string;
  variantFields: VariantField[];
  defaultVariant: Record<string, any>;
}

const BUSINESS_TYPES: Record<string, BusinessTypeConfig> = {
  clothing: {
    label: "Clothing & Apparel",
    icon: "👕",
    variantFields: [
      { key: "size", label: "Size", type: "select", options: ["XS", "S", "M", "L", "XL", "XXL", "XXXL"] },
      { key: "color", label: "Color", type: "select", options: ["Red", "Green", "Blue", "Black", "White", "Yellow", "Grey", "Brown", "Navy", "Pink"] },
      { key: "brand", label: "Brand", type: "text", placeholder: "Brand name" },
    ],
    defaultVariant: { size: "M", color: "Black", brand: "Unbranded" },
  },
  electronics: {
    label: "Electronics & Computers",
    icon: "💻",
    variantFields: [
      { key: "model", label: "Model", type: "text", placeholder: "e.g. iPhone 15 Pro" },
      { key: "storage", label: "Storage/RAM", type: "select", options: ["4GB", "8GB", "16GB", "32GB", "64GB", "128GB", "256GB", "512GB", "1TB"] },
      { key: "color", label: "Color/Finish", type: "text", placeholder: "e.g. Space Grey" },
      { key: "warranty", label: "Warranty", type: "select", options: ["No Warranty", "3 Months", "6 Months", "1 Year", "2 Years", "3 Years"] },
    ],
    defaultVariant: { model: "", storage: "8GB", color: "", warranty: "1 Year" },
  },
  food: {
    label: "Food & Grocery",
    icon: "🛒",
    variantFields: [
      { key: "weight", label: "Weight/Size", type: "text", placeholder: "e.g. 500g, 1kg" },
      { key: "flavor", label: "Flavor/Variant", type: "text", placeholder: "e.g. Mango, Plain" },
      { key: "pack_size", label: "Pack Size", type: "select", options: ["Single", "Pack of 2", "Pack of 6", "Pack of 12", "Bulk"] },
    ],
    defaultVariant: { weight: "", flavor: "", pack_size: "Single" },
  },
  furniture: {
    label: "Furniture & Home",
    icon: "🪑",
    variantFields: [
      { key: "material", label: "Material", type: "select", options: ["Wood", "Metal", "Plastic", "Fabric", "Leather", "Glass", "Marble"] },
      { key: "color", label: "Color/Finish", type: "text", placeholder: "e.g. Walnut Brown" },
      { key: "dimensions", label: "Dimensions", type: "text", placeholder: "e.g. 120x60x75 cm" },
    ],
    defaultVariant: { material: "Wood", color: "", dimensions: "" },
  },
  medicine: {
    label: "Medicine & Pharma",
    icon: "💊",
    variantFields: [
      { key: "dosage", label: "Dosage", type: "text", placeholder: "e.g. 500mg, 10ml" },
      { key: "form", label: "Form", type: "select", options: ["Tablet", "Capsule", "Syrup", "Injection", "Cream", "Drops", "Powder"] },
      { key: "pack_size", label: "Pack Size", type: "text", placeholder: "e.g. Strip of 10" },
      { key: "expiry_months", label: "Shelf Life (months)", type: "number", placeholder: "12" },
    ],
    defaultVariant: { dosage: "", form: "Tablet", pack_size: "", expiry_months: 12 },
  },
  custom: {
    label: "Custom / Other",
    icon: "⚙️",
    variantFields: [
      { key: "variant_name", label: "Variant Name", type: "text", placeholder: "e.g. Large, Red, 2024 Model" },
      { key: "spec1", label: "Spec 1", type: "text", placeholder: "Custom field" },
      { key: "spec2", label: "Spec 2", type: "text", placeholder: "Custom field" },
    ],
    defaultVariant: { variant_name: "", spec1: "", spec2: "" },
  },
};

function downloadCSV(filename: string, rows: string[][]) {
  const content = rows.map((r) => r.map((c) => `"${c}"`).join(",")).join("\n");
  const blob = new Blob([content], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a"); a.href = url; a.download = filename; a.click();
  URL.revokeObjectURL(url);
}

function parseCSV(text: string): string[][] {
  return text.trim().split(/\r?\n/).map((line) => {
    const row: string[] = []; let current = ""; let inQuotes = false;
    for (const ch of line) {
      if (ch === '"') { inQuotes = !inQuotes; }
      else if (ch === "," && !inQuotes) { row.push(current.trim()); current = ""; }
      else { current += ch; }
    }
    row.push(current.trim()); return row;
  });
}

const MAX_PHOTOS = 5;

const Inventory = () => {
  const { user } = useAuth();
  const { activeCompany } = useCompany();
  const ownerId = useActiveOwnerId();
  const { canDelete } = useRole(); // ← role guard

  // ── Public store link ──────────────────────────────────
  const publicStoreUrl = user && ownerId
    ? `${window.location.origin}/store/${ownerId}`
    : "";
  const [linkCopied, setLinkCopied] = useState(false);

  const handleCopyStoreLink = () => {
    if (!publicStoreUrl) return;
    navigator.clipboard.writeText(publicStoreUrl).then(() => {
      setLinkCopied(true);
      toast({
        title: "Store link copied! 🔗",
        description: "Share this link with your customers to show them your live catalog.",
      });
      setTimeout(() => setLinkCopied(false), 2500);
    });
  };

  const handleOpenStore = () => {
    if (publicStoreUrl) window.open(publicStoreUrl, "_blank");
  };

  // ── Business type & custom fields ─────────────────────
  const [businessType, setBusinessType] = useState("clothing");
  const [showTypeSelector, setShowTypeSelector] = useState(false);
  const [customFields, setCustomFields] = useState<VariantField[]>([]);
  const [showCustomEditor, setShowCustomEditor] = useState(false);
  const [newFieldLabel, setNewFieldLabel] = useState("");
  const [newFieldType, setNewFieldType] = useState<FieldType>("text");
  const [newFieldOptions, setNewFieldOptions] = useState("");

  const config = BUSINESS_TYPES[businessType];

  const effectiveConfig = {
    ...config,
    variantFields: [...config.variantFields, ...customFields],
    defaultVariant: {
      ...config.defaultVariant,
      ...Object.fromEntries(customFields.map((f) => [f.key, f.type === "number" ? 0 : ""])),
    },
  };

  // ── Products state ─────────────────────────────────────
  const [products, setProducts] = useState<InventoryProduct[]>([]);
  const [filteredProducts, setFilteredProducts] = useState<InventoryProduct[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [stockFilter, setStockFilter] = useState("all");
  const [isLoading, setIsLoading] = useState(false);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [editingProduct, setEditingProduct] = useState<InventoryProduct | null>(null);
  const [lowStockProducts, setLowStockProducts] = useState<any[]>([]);
  const [viewProduct, setViewProduct] = useState<InventoryProduct | null>(null);

  // ── CSV ────────────────────────────────────────────────
  const [showCSVDialog, setShowCSVDialog] = useState(false);
  const [csvPreviewRows, setCSVPreviewRows] = useState<CSVPreviewRow[]>([]);
  const [csvImporting, setCSVImporting] = useState(false);
  const [csvFileName, setCSVFileName] = useState("");
  const csvInputRef = useRef<HTMLInputElement>(null);

  // ── Photo ──────────────────────────────────────────────
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const photoInputRef = useRef<HTMLInputElement>(null);

  const makeDefaultVariant = () => ({
    id: Date.now().toString() + Math.random(),
    stock_quantity: 0, unit_price: 0, cost_price: 0, hsn_code: "", min_stock_level: 0,
    ...effectiveConfig.defaultVariant,
  });

  // ── Form state — photo_urls is now an array ────────────
  const [formData, setFormData] = useState({
    name: "", description: "", sku: "", unit_price: 0, cost_price: 0,
    current_stock: 0, min_stock_level: 0, max_stock_level: 0,
    unit: "piece", category: "", barcode: "", hsn_code: "",
    photo_urls: [] as string[],
    variants: [] as VariantRow[],
  });

  // ── Parse photo_url field — handles old single-URL strings + new JSON arrays ──
  const parsePhotoUrls = (product: InventoryProduct): string[] => {
    const raw = product.photo_url;
    if (!raw) return [];
    try {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return parsed;
      return [raw];
    } catch {
      return [raw];
    }
  };

  // ── Load saved settings ────────────────────────────────
  useEffect(() => {
    if (!ownerId) return;
    const savedType = localStorage.getItem(`inventory_business_type_${ownerId}`);
    if (savedType && BUSINESS_TYPES[savedType]) setBusinessType(savedType);
    const savedFields = localStorage.getItem(`inventory_custom_fields_${ownerId}`);
    if (savedFields) { try { setCustomFields(JSON.parse(savedFields)); } catch { } }
  }, [ownerId]);

  useEffect(() => { if (ownerId) { fetchProducts(); fetchLowStockProducts(); } }, [ownerId]);
  useEffect(() => { filterProducts(); }, [products, searchTerm, categoryFilter, stockFilter]);

  const saveCustomFields = (fields: VariantField[]) => {
    setCustomFields(fields);
    localStorage.setItem(`inventory_custom_fields_${ownerId}`, JSON.stringify(fields));
  };

  const fetchProducts = async () => {
    if (!ownerId) return;
    setIsLoading(true);
    try {
      const { data, error } = await supabase.from("inventory_products").select("*").eq("user_id", ownerId).order("name");
      if (error) throw error;
      setProducts(data || []);
    } catch {
      toast({ title: "Error", description: "Failed to fetch products.", variant: "destructive" });
    }
    setIsLoading(false);
  };

  const fetchLowStockProducts = async () => {
    if (!ownerId) return;
    try {
      const { data, error } = await supabase.rpc("get_low_stock_products", { user_uuid: ownerId });
      if (error) throw error;
      setLowStockProducts(data || []);
    } catch (e) { console.error(e); }
  };

  const filterProducts = () => {
    let f = products;
    if (searchTerm) f = f.filter((p) => p.name.toLowerCase().includes(searchTerm.toLowerCase()) || p.sku?.toLowerCase().includes(searchTerm.toLowerCase()));
    if (categoryFilter !== "all") f = f.filter((p) => p.category === categoryFilter);
    if (stockFilter === "low") f = f.filter((p) => p.current_stock <= p.min_stock_level);
    else if (stockFilter === "out") f = f.filter((p) => p.current_stock === 0);
    setFilteredProducts(f);
  };

  const getTotalVariantStock = () => formData.variants.reduce((s, v) => s + (v.stock_quantity || 0), 0);
  const parseVariants = (product: any): VariantRow[] => { try { return product.variants ? JSON.parse(product.variants) : []; } catch { return []; } };

  const getVariantLabel = (variant: VariantRow) =>
    effectiveConfig.variantFields.map((f) => variant[f.key]).filter(Boolean).slice(0, 3).join(" / ") || "Default";

  // ── Multi-photo upload ─────────────────────────────────
  const handlePhotoUpload = async (files: FileList) => {
    if (!user) return;
    const remaining = MAX_PHOTOS - formData.photo_urls.length;
    if (remaining <= 0) {
      toast({ title: "Limit reached", description: `Max ${MAX_PHOTOS} photos per product.`, variant: "destructive" });
      return;
    }
    const toUpload = Array.from(files).slice(0, remaining);
    setUploadingPhoto(true);
    const uploaded: string[] = [];
    for (const file of toUpload) {
      if (!file.type.startsWith("image/")) {
        toast({ title: `${file.name} is not an image`, variant: "destructive" });
        continue;
      }
      if (file.size > 5 * 1024 * 1024) {
        toast({ title: `${file.name} too large`, description: "Max 5MB per photo.", variant: "destructive" });
        continue;
      }
      try {
        const ext = file.name.split(".").pop();
        const fileName = `${ownerId}/products/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
        const { error: uploadError } = await supabase.storage.from("business-docs").upload(fileName, file, { upsert: true });
        if (uploadError) throw uploadError;
        const { data: { publicUrl } } = supabase.storage.from("business-docs").getPublicUrl(fileName);
        uploaded.push(publicUrl);
      } catch {
        toast({ title: `Failed to upload ${file.name}`, variant: "destructive" });
      }
    }
    if (uploaded.length) {
      setFormData((p) => ({ ...p, photo_urls: [...p.photo_urls, ...uploaded] }));
      toast({ title: `${uploaded.length} photo${uploaded.length > 1 ? "s" : ""} uploaded ✅` });
    }
    setUploadingPhoto(false);
  };

  const removePhoto = (index: number) =>
    setFormData((p) => ({ ...p, photo_urls: p.photo_urls.filter((_, i) => i !== index) }));

  // ── Save product ───────────────────────────────────────
  const handleSaveProduct = async () => {
    if (!ownerId || !formData.name.trim()) return;
    try {
      const data = {
        name: formData.name, description: formData.description || null, sku: formData.sku || null,
        unit_price: parseFloat(formData.unit_price.toString()) || 0,
        cost_price: formData.cost_price ? parseFloat(formData.cost_price.toString()) : null,
        current_stock: getTotalVariantStock(),
        min_stock_level: parseInt(formData.min_stock_level.toString()) || 0,
        max_stock_level: formData.max_stock_level ? parseInt(formData.max_stock_level.toString()) : null,
        unit: formData.unit, category: formData.category || null, barcode: formData.barcode || null,
        hsn_code: formData.hsn_code || null, variants: JSON.stringify(formData.variants),
        // Serialize photo_urls array as JSON; null if empty
        photo_url: formData.photo_urls.length > 0 ? JSON.stringify(formData.photo_urls) : null,
        user_id: ownerId,
      };
      if (editingProduct) {
        const { error } = await (supabase as any).from("inventory_products").update(data).eq("id", editingProduct.id);
        if (error) throw error;
        toast({ title: "Product updated ✅" });
      } else {
        const { error } = await (supabase as any).from("inventory_products").insert(data);
        if (error) throw error;
        toast({ title: "Product added ✅" });
      }
      resetForm(); fetchProducts(); fetchLowStockProducts();
    } catch { toast({ title: "Error", description: "Failed to save product.", variant: "destructive" }); }
  };

  // ── Delete: admin-only ─────────────────────────────────
  const handleDeleteProduct = async (id: string) => {
    if (!canDelete) {
      toast({ title: "Access denied", description: "Only admins can delete products.", variant: "destructive" });
      return;
    }
    if (!confirm("Delete this product?")) return;
    try {
      const { error } = await supabase.from("inventory_products").delete().eq("id", id);
      if (error) throw error;
      toast({ title: "Product deleted" });
      fetchProducts(); fetchLowStockProducts();
    } catch { toast({ title: "Error", description: "Failed to delete.", variant: "destructive" }); }
  };

  const resetForm = () => {
    setFormData({
      name: "", description: "", sku: "", unit_price: 0, cost_price: 0,
      current_stock: 0, min_stock_level: 0, max_stock_level: 0,
      unit: "piece", category: "", barcode: "", hsn_code: "",
      photo_urls: [],
      variants: [makeDefaultVariant()],
    });
    setEditingProduct(null); setShowAddDialog(false);
  };

  const handleEdit = (product: InventoryProduct) => {
    const variants = parseVariants(product);
    setFormData({
      name: product.name, description: product.description || "", sku: product.sku || "",
      unit_price: product.unit_price, cost_price: product.cost_price || 0,
      current_stock: product.current_stock, min_stock_level: product.min_stock_level,
      max_stock_level: product.max_stock_level || 0, unit: product.unit,
      category: product.category || "", barcode: product.barcode || "",
      hsn_code: (product as any).hsn_code || "",
      photo_urls: parsePhotoUrls(product),
      variants: variants.length > 0 ? variants : [makeDefaultVariant()],
    });
    setEditingProduct(product); setShowAddDialog(true);
  };

  const addVariant = () => setFormData((p) => ({ ...p, variants: [...p.variants, makeDefaultVariant()] }));
  const updateVariant = (id: string, updates: Partial<VariantRow>) =>
    setFormData((p) => ({ ...p, variants: p.variants.map((v) => v.id === id ? { ...v, ...updates } : v) }));
  const removeVariant = (id: string) =>
    setFormData((p) => p.variants.length === 1 ? p : { ...p, variants: p.variants.filter((v) => v.id !== id) });

  const getStockStatus = (product: InventoryProduct) => {
    const total = parseVariants(product).reduce((s, v) => s + (v.stock_quantity || 0), 0) || product.current_stock;
    if (total === 0) return { status: "Out of Stock", variant: "destructive" as const };
    if (total <= product.min_stock_level) return { status: "Low Stock", variant: "secondary" as const };
    return { status: "In Stock", variant: "default" as const };
  };

  // ── Render variant field ───────────────────────────────
  const renderVariantField = (field: VariantField, variant: VariantRow) => {
    if (field.type === "select" && field.options) {
      return (
        <Select value={variant[field.key] ?? ""} onValueChange={(v) => updateVariant(variant.id, { [field.key]: v })}>
          <SelectTrigger className="h-8 text-sm"><SelectValue placeholder={`Select ${field.label}`} /></SelectTrigger>
          <SelectContent>{field.options.map((o) => <SelectItem key={o} value={o}>{o}</SelectItem>)}</SelectContent>
        </Select>
      );
    }
    return (
      <Input
        type={field.type === "number" ? "number" : "text"}
        className="h-8 text-sm"
        placeholder={field.placeholder}
        value={variant[field.key] ?? ""}
        onChange={(e) => updateVariant(variant.id, { [field.key]: field.type === "number" ? parseFloat(e.target.value) || 0 : e.target.value })}
      />
    );
  };

  // ── CSV: Download sample ───────────────────────────────
  const handleDownloadSample = () => {
    const baseHeaders = ["product_name", "description", "category", "unit"];
    const variantHeaders = effectiveConfig.variantFields.map((f) => f.key);
    const stockHeaders = ["stock_quantity", "unit_price", "cost_price", "hsn_code", "min_stock_level"];
    const headers = [...baseHeaders, ...variantHeaders, ...stockHeaders];
    const sampleDefaults: Record<string, string> = {
      product_name: "Sample Product", description: "Product description",
      category: businessType, unit: "piece", stock_quantity: "10",
      unit_price: "499", cost_price: "250", hsn_code: "6109", min_stock_level: "5",
    };
    effectiveConfig.variantFields.forEach((f) => {
      const defaultVal = effectiveConfig.defaultVariant[f.key];
      sampleDefaults[f.key] = defaultVal !== undefined && defaultVal !== "" ? String(defaultVal) : f.options?.[0] ?? `sample_${f.key}`;
    });
    const sampleRow = headers.map((h) => sampleDefaults[h] ?? "");
    downloadCSV("inventory_sample.csv", [headers, sampleRow]);
    toast({ title: "Downloaded", description: "inventory_sample.csv saved with your variant fields." });
  };

  // ── CSV: Parse file ────────────────────────────────────
  const handleCSVFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]; if (!file) return;
    setCSVFileName(file.name);
    const reader = new FileReader();
    reader.onload = (evt) => {
      const text = evt.target?.result as string;
      const allRows = parseCSV(text);
      if (allRows.length < 2) { toast({ title: "Error", description: "CSV needs header + data rows.", variant: "destructive" }); return; }
      const headers = allRows[0].map((h) => h.toLowerCase().trim());
      const get = (row: string[], name: string) => { const i = headers.indexOf(name); return i >= 0 ? (row[i] || "").trim() : ""; };
      const preview: CSVPreviewRow[] = allRows.slice(1).map((row, i) => {
        const variantData: Record<string, any> = {};
        effectiveConfig.variantFields.forEach((f) => {
          const val = get(row, f.key);
          variantData[f.key] = f.type === "number" ? parseFloat(val) || 0 : val;
        });
        const obj: CSVPreviewRow = {
          rowIndex: i + 2, product_name: get(row, "product_name"), description: get(row, "description"),
          category: get(row, "category"), unit: get(row, "unit") || "piece",
          stock_quantity: parseInt(get(row, "stock_quantity")) || 0,
          unit_price: parseFloat(get(row, "unit_price")) || 0,
          cost_price: parseFloat(get(row, "cost_price")) || 0,
          hsn_code: get(row, "hsn_code"), min_stock_level: parseInt(get(row, "min_stock_level")) || 0,
          ...variantData, errors: [], valid: true,
        };
        const errors: string[] = [];
        if (!obj.product_name) errors.push("Product name required");
        if (isNaN(obj.unit_price) || obj.unit_price < 0) errors.push("Invalid unit price");
        obj.errors = errors; obj.valid = errors.length === 0; return obj;
      });
      setCSVPreviewRows(preview); setShowCSVDialog(true);
    };
    reader.readAsText(file); e.target.value = "";
  };

  // ── CSV: Import ────────────────────────────────────────
  const handleCSVImport = async () => {
    if (!ownerId) return;
    const valid = csvPreviewRows.filter((r) => r.valid);
    if (!valid.length) { toast({ title: "No valid rows", variant: "destructive" }); return; }
    setCSVImporting(true);
    let ok = 0, fail = 0;
    for (const row of valid) {
      const variantFieldValues: Record<string, any> = {};
      effectiveConfig.variantFields.forEach((f) => {
        variantFieldValues[f.key] = row[f.key] ?? effectiveConfig.defaultVariant[f.key] ?? "";
      });
      const variant = {
        id: Date.now().toString() + Math.random(), stock_quantity: row.stock_quantity,
        unit_price: row.unit_price, cost_price: row.cost_price, hsn_code: row.hsn_code,
        min_stock_level: row.min_stock_level, ...variantFieldValues,
      };
      const { error } = await (supabase as any).from("inventory_products").insert({
        name: row.product_name, description: row.description || null, sku: null,
        unit_price: row.unit_price, cost_price: row.cost_price || null,
        current_stock: row.stock_quantity, min_stock_level: row.min_stock_level,
        max_stock_level: null, unit: row.unit, category: row.category || null,
        barcode: null, hsn_code: row.hsn_code || null, variants: JSON.stringify([variant]), user_id: ownerId,
      });
      if (error) { fail++; } else { ok++; }
    }
    toast({ title: "Import complete", description: `${ok} imported${fail ? `, ${fail} failed` : ""}.`, variant: fail ? "destructive" : "default" });
    setShowCSVDialog(false); setCSVPreviewRows([]); setCSVFileName(""); fetchProducts(); fetchLowStockProducts();
    setCSVImporting(false);
  };

  const validCount = csvPreviewRows.filter((r) => r.valid).length;
  const invalidCount = csvPreviewRows.filter((r) => !r.valid).length;
  const categories = [...new Set(products.map((p) => p.category).filter(Boolean))];

  // ── Render ─────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 via-white to-yellow-50">
      <Navbar />
      <div className="container mx-auto px-4 py-8">

        {activeCompany && !activeCompany.isOwn && (
          <div className="mb-4 flex items-center gap-3 bg-blue-50 border border-blue-200 rounded-lg px-4 py-3">
            <Building2 className="w-5 h-5 text-blue-600 shrink-0" />
            <p className="text-sm font-semibold text-blue-800">Viewing: {activeCompany.companyName} — Role: {activeCompany.role}</p>
          </div>
        )}

        {/* ── Public Store Link Banner ── */}
        {user && publicStoreUrl && (
          <div className="mb-6 flex flex-col sm:flex-row items-start sm:items-center gap-3 bg-gradient-to-r from-indigo-50 to-violet-50 border border-indigo-200 rounded-xl px-4 py-3.5 shadow-sm">
            <div className="flex items-center gap-2.5 shrink-0">
              <div className="w-9 h-9 rounded-full bg-indigo-100 border border-indigo-200 flex items-center justify-center">
                <Store className="w-4.5 h-4.5 text-indigo-600" />
              </div>
              <div>
                {/* <p className="text-xs font-bold text-indigo-700 uppercase tracking-wide">Your Public Store</p> */}
                <p className="text-xs font-bold text-indigo-700 uppercase tracking-wide">
                  {activeCompany && !activeCompany.isOwn ? `${activeCompany.companyName}'s Store` : "Your Public Store"}
                </p>
                {/* <p className="text-[11px] text-indigo-400">Customers can browse your live inventory at this link</p> */}
                <p className="text-[11px] text-indigo-400">
                  {activeCompany && !activeCompany.isOwn
                    ? `Sharing ${activeCompany.companyName}'s store`
                    : "Customers can browse your live inventory at this link"}
                </p>
              </div>
            </div>
            <div className="flex-1 flex items-center gap-2 bg-white border border-indigo-200 rounded-lg px-3 py-1.5 min-w-0">
              <Link className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
              <span className="text-xs text-gray-600 font-mono truncate flex-1">{publicStoreUrl}</span>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <Button
                size="sm" variant="outline" onClick={handleCopyStoreLink}
                className={`h-8 text-xs border-indigo-300 transition-all ${linkCopied ? "bg-green-50 border-green-300 text-green-700" : "text-indigo-700 hover:bg-indigo-50"}`}
              >
                {linkCopied ? <><CheckCircle className="w-3.5 h-3.5 mr-1.5" />Copied!</> : <><Copy className="w-3.5 h-3.5 mr-1.5" />Copy Link</>}
              </Button>
              <Button size="sm" onClick={handleOpenStore} className="h-8 text-xs bg-indigo-600 hover:bg-indigo-700 text-white">
                <ExternalLink className="w-3.5 h-3.5 mr-1.5" />Preview Store
              </Button>
            </div>
          </div>
        )}

        {/* Header */}
        <div className="flex items-center justify-between mb-8 flex-wrap gap-3">
          <div>
            <h1 className="text-3xl font-bold bg-gradient-to-r from-green-600 to-yellow-600 bg-clip-text text-transparent">
              Inventory Management
            </h1>
            <div className="flex items-center gap-2 mt-1">
              <span className="text-muted-foreground text-sm">Business type:</span>
              <button
                onClick={() => setShowTypeSelector(true)}
                className="flex items-center gap-1.5 text-sm font-medium text-green-700 hover:text-green-900 bg-green-50 hover:bg-green-100 border border-green-200 rounded-full px-3 py-0.5 transition-colors"
              >
                <span>{config.icon}</span>
                <span>{config.label}</span>
                {customFields.length > 0 && <span className="bg-green-600 text-white text-xs rounded-full px-1.5">+{customFields.length}</span>}
                <Settings2 className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
          <div className="flex gap-2 flex-wrap">
            <Button variant="outline" onClick={handleDownloadSample} className="border-blue-300 text-blue-700 hover:bg-blue-50">
              <FileDown className="w-4 h-4 mr-2" />Download Sample CSV
            </Button>
            <Button variant="outline" onClick={() => csvInputRef.current?.click()} className="border-green-300 text-green-700 hover:bg-green-50">
              <Upload className="w-4 h-4 mr-2" />Import CSV
            </Button>
            <input ref={csvInputRef} type="file" accept=".csv" className="hidden" onChange={handleCSVFile} />
            <Button onClick={() => { resetForm(); setShowAddDialog(true); }} className="bg-gradient-to-r from-green-600 to-yellow-600 hover:from-green-700 hover:to-yellow-700">
              <Plus className="w-4 h-4 mr-2" />Add Product
            </Button>
          </div>
        </div>

        {/* Low stock alert */}
        {lowStockProducts.length > 0 && (
          <Card className="mb-6 border-yellow-200 bg-yellow-50">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center text-yellow-800"><AlertTriangle className="w-5 h-5 mr-2" />Low Stock Alert</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-yellow-700 mb-2">{lowStockProducts.length} product(s) running low:</p>
              <div className="flex flex-wrap gap-2">
                {lowStockProducts.map((p) => <Badge key={p.id} variant="secondary">{p.name} ({p.current_stock}/{p.min_stock_level})</Badge>)}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Filters */}
        <Card className="mb-6">
          <CardContent className="pt-6">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div>
                <Label>Search Products</Label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground w-4 h-4" />
                  <Input placeholder="Name, SKU…" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="pl-10" />
                </div>
              </div>
              <div>
                <Label>Category</Label>
                <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Categories</SelectItem>
                    {categories.map((c) => <SelectItem key={c} value={c || ""}>{c}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Stock Status</Label>
                <Select value={stockFilter} onValueChange={setStockFilter}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Products</SelectItem>
                    <SelectItem value="low">Low Stock</SelectItem>
                    <SelectItem value="out">Out of Stock</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-end">
                <Button variant="outline" onClick={() => { setSearchTerm(""); setCategoryFilter("all"); setStockFilter("all"); }}>
                  Clear Filters
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Products table */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span className="flex items-center"><Package className="w-5 h-5 mr-2" />Products ({filteredProducts.length})</span>
              {user && (
                <button
                  onClick={handleCopyStoreLink}
                  className="flex items-center gap-1.5 text-xs text-indigo-600 hover:text-indigo-800 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 rounded-full px-3 py-1 transition-colors"
                >
                  <Store className="w-3.5 h-3.5" />
                  Share Store Link
                </button>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="text-center py-8">Loading…</div>
            ) : filteredProducts.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">No products found.</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full border-collapse" style={{ tableLayout: "fixed" }}>
                  <colgroup>
                    <col style={{ width: "36px" }} />
                    <col style={{ width: "22%" }} />
                    <col style={{ width: "10%" }} />
                    <col style={{ width: "34%" }} />
                    <col style={{ width: "11%" }} />
                    <col style={{ width: "13%" }} />
                  </colgroup>
                  <thead>
                    <tr style={{ borderBottom: "1px solid var(--border)" }}>
                      {["#", "Product", "Category", "Variants & Stock", "Status", ""].map((h, i) => (
                        <th
                          key={i}
                          className="pb-2 pt-1"
                          style={{
                            fontSize: 11,
                            fontWeight: 500,
                            color: "var(--muted-foreground)",
                            textTransform: "uppercase",
                            letterSpacing: "0.06em",
                            textAlign: i === 5 ? "right" : "left",
                            paddingLeft: i === 0 ? 0 : 12,
                            paddingRight: i === 5 ? 0 : 12,
                          }}
                        >
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {filteredProducts.map((product, idx) => {
                      const ss = getStockStatus(product);
                      const pv = parseVariants(product);
                      const photos = parsePhotoUrls(product);
                      const totalQty = pv.length > 0
                        ? pv.reduce((s, v) => s + (v.stock_quantity || 0), 0)
                        : product.current_stock;

                      const statusDot = ss.status === "In Stock"
                        ? "bg-green-500"
                        : ss.status === "Low Stock"
                          ? "bg-yellow-500"
                          : "bg-red-500";

                      const statusText = ss.status === "In Stock"
                        ? "text-green-800"
                        : ss.status === "Low Stock"
                          ? "text-yellow-800"
                          : "text-red-700";

                      return (
                        <tr
                          key={product.id}
                          className="hover:bg-muted/30 transition-colors"
                          style={{ borderBottom: "0.5px solid hsl(var(--border))" }}
                        >

                          {/* Index */}
                          <td className="py-3 align-top" style={{ paddingLeft: 0, paddingRight: 12 }}>
                            <span style={{ fontSize: 11, color: "var(--muted-foreground)", fontVariantNumeric: "tabular-nums" }}>
                              {String(idx + 1).padStart(2, "0")}
                            </span>
                          </td>

                          {/* Name + description */}
                          <td className="py-3 align-top" style={{ paddingLeft: 12, paddingRight: 12 }}>
                            <div className="flex items-start gap-2.5">
                              {photos.length > 0 && (
                                <div className="relative shrink-0 mt-0.5">
                                  <img
                                    src={photos[0]}
                                    alt={product.name}
                                    className="w-9 h-9 object-cover rounded-md border"
                                    style={{ borderColor: "hsl(var(--border))" }}
                                  />
                                  {photos.length > 1 && (
                                    <span className="absolute -bottom-1 -right-1 bg-gray-700 text-white text-[9px] font-semibold rounded-full w-3.5 h-3.5 flex items-center justify-center">
                                      {photos.length}
                                    </span>
                                  )}
                                </div>
                              )}
                              <div className="min-w-0">
                                <div className="font-medium text-sm leading-snug" style={{ letterSpacing: "-0.1px" }}>
                                  {product.name}
                                </div>
                                {product.description && (
                                  <div
                                    className="mt-0.5 text-muted-foreground"
                                    style={{
                                      fontSize: 12,
                                      lineHeight: 1.5,
                                      display: "-webkit-box",
                                      WebkitLineClamp: 2,
                                      WebkitBoxOrient: "vertical",
                                      overflow: "hidden",
                                    }}
                                  >
                                    {product.description}
                                  </div>
                                )}
                                {product.sku && (
                                  <div className="mt-1 font-mono text-muted-foreground" style={{ fontSize: 10 }}>
                                    {product.sku}
                                  </div>
                                )}
                              </div>
                            </div>
                          </td>

                          {/* Category */}
                          <td className="py-3 align-top" style={{ paddingLeft: 12, paddingRight: 12 }}>
                            {product.category ? (
                              <span
                                className="inline-block text-muted-foreground border rounded-full"
                                style={{ fontSize: 11, padding: "2px 8px", borderColor: "hsl(var(--border))" }}
                              >
                                {product.category}
                              </span>
                            ) : (
                              <span className="text-muted-foreground" style={{ fontSize: 12 }}>—</span>
                            )}
                          </td>

                          {/* Variants & Stock */}
                          <td className="py-3 align-top" style={{ paddingLeft: 12, paddingRight: 12 }}>
                            <div className="flex flex-col gap-1">
                              {pv.length > 0 ? pv.map((v) => {
                                const qty = v.stock_quantity ?? 0;
                                const isOut = qty === 0;
                                const isLow = !isOut && qty <= (v.min_stock_level || 0);
                                const qtyColor = isOut ? "text-red-600" : isLow ? "text-yellow-700" : "text-foreground";
                                return (
                                  <div
                                    key={v.id}
                                    className="grid items-center gap-2 text-xs"
                                    style={{ gridTemplateColumns: "1fr auto auto auto" }}
                                  >
                                    <span
                                      className="text-muted-foreground font-medium truncate"
                                      title={getVariantLabel(v)}
                                    >
                                      {getVariantLabel(v)}
                                    </span>
                                    <span className={`font-semibold tabular-nums ${qtyColor}`}>
                                      {qty} <span className="font-normal text-muted-foreground">u</span>
                                    </span>
                                    <span className="text-muted-foreground tabular-nums">
                                      ₹{(v.unit_price ?? 0).toLocaleString("en-IN")}
                                    </span>
                                    {v.cost_price > 0 && (
                                      <span
                                        className="text-muted-foreground tabular-nums line-through"
                                        style={{ fontSize: 11 }}
                                      >
                                        ₹{(v.cost_price).toLocaleString("en-IN")}
                                      </span>
                                    )}
                                  </div>
                                );
                              }) : (
                                <div className="flex items-center gap-3 text-xs">
                                  <span className="font-semibold tabular-nums">{product.current_stock} {product.unit}</span>
                                  <span className="text-muted-foreground">₹{product.unit_price.toLocaleString("en-IN")}</span>
                                </div>
                              )}
                            </div>
                            <div
                              className="mt-1.5 pt-1.5 text-muted-foreground"
                              style={{ fontSize: 11, borderTop: "0.5px solid hsl(var(--border))" }}
                            >
                              Total <span className="font-medium text-foreground">{totalQty}</span> · min {product.min_stock_level}
                            </div>
                          </td>

                          {/* Status */}
                          <td className="py-3 align-top" style={{ paddingLeft: 12, paddingRight: 12 }}>
                            <span className={`flex items-center gap-1.5 text-xs font-medium ${statusText}`}>
                              <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${statusDot}`} />
                              {ss.status}
                            </span>
                          </td>

                          {/* Actions */}
                          <td className="py-3 align-top" style={{ paddingLeft: 12, paddingRight: 0, textAlign: "right" }}>
                            <div className="flex items-center gap-1.5 justify-end">
                              <Button
                                size="sm" variant="ghost"
                                className="h-7 w-7 p-0 text-muted-foreground hover:text-foreground"
                                onClick={() => handleEdit(product)}
                              >
                                <Edit className="w-3.5 h-3.5" />
                              </Button>
                              {canDelete && (
                                <Button
                                  size="sm" variant="ghost"
                                  className="h-7 w-7 p-0 text-muted-foreground hover:text-red-600"
                                  onClick={() => handleDeleteProduct(product.id)}
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </Button>
                              )}
                              <Button
                                size="sm" variant="outline"
                                className="h-7 px-2.5 text-xs font-medium"
                                onClick={() => setViewProduct(product)}
                              >
                                View
                              </Button>
                            </div>
                          </td>

                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>

        {/* ── Business Type Selector Dialog ── */}
        <Dialog open={showTypeSelector} onOpenChange={(o) => { setShowTypeSelector(o); if (!o) setShowCustomEditor(false); }}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2"><Settings2 className="w-5 h-5" />Inventory Settings</DialogTitle>
              <DialogDescription>Choose your business type and customize variant fields.</DialogDescription>
            </DialogHeader>
            <div className="grid grid-cols-2 gap-3">
              {Object.entries(BUSINESS_TYPES).map(([key, cfg]) => (
                <button
                  key={key}
                  onClick={() => {
                    setBusinessType(key);
                    localStorage.setItem(`inventory_business_type_${ownerId}`, key);
                    setCustomFields([]);
                    localStorage.removeItem(`inventory_custom_fields_${ownerId}`);
                    toast({ title: `Switched to ${cfg.label}` });
                  }}
                  className={`flex items-center gap-3 p-4 rounded-xl border-2 text-left transition-all ${businessType === key
                      ? "border-green-500 bg-green-50 shadow-sm"
                      : "border-gray-200 hover:border-gray-300 hover:bg-gray-50"
                    }`}
                >
                  <span className="text-2xl">{cfg.icon}</span>
                  <div className="min-w-0 flex-1">
                    <p className="font-medium text-sm text-gray-800">{cfg.label}</p>
                    <p className="text-xs text-gray-500 mt-0.5 truncate">{cfg.variantFields.map((f) => f.label).join(", ")}</p>
                  </div>
                  {businessType === key && <CheckCircle className="w-4 h-4 text-green-500 shrink-0" />}
                </button>
              ))}
            </div>
            <div className="flex items-center gap-3 my-1">
              <div className="flex-1 h-px bg-gray-200" />
              <span className="text-xs text-gray-400 uppercase tracking-wide">Customize Fields</span>
              <div className="flex-1 h-px bg-gray-200" />
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium text-gray-700">Fields for {config.icon} {config.label}</p>
                <Button size="sm" variant="outline" onClick={() => setShowCustomEditor(true)} className="text-green-700 border-green-300 hover:bg-green-50">
                  <Plus className="w-3.5 h-3.5 mr-1" /> Add Field
                </Button>
              </div>
              <div className="space-y-1.5">
                {config.variantFields.map((field) => (
                  <div key={field.key} className="flex items-center justify-between bg-gray-50 border border-gray-200 rounded-lg px-3 py-2">
                    <div className="flex items-center gap-2">
                      <span className={`text-xs font-medium px-1.5 py-0.5 rounded ${field.type === "select" ? "bg-blue-100 text-blue-700" : field.type === "number" ? "bg-purple-100 text-purple-700" : "bg-gray-200 text-gray-600"}`}>{field.type}</span>
                      <span className="text-sm font-medium text-gray-800">{field.label}</span>
                      {field.options && <span className="text-xs text-gray-400">({field.options.slice(0, 3).join(", ")}{field.options.length > 3 ? "…" : ""})</span>}
                    </div>
                    <span className="text-xs text-gray-400 italic">built-in</span>
                  </div>
                ))}
                {customFields.map((field, idx) => (
                  <div key={field.key} className="flex items-center justify-between bg-green-50 border border-green-200 rounded-lg px-3 py-2">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className={`text-xs font-medium px-1.5 py-0.5 rounded ${field.type === "select" ? "bg-blue-100 text-blue-700" : field.type === "number" ? "bg-purple-100 text-purple-700" : "bg-gray-200 text-gray-600"}`}>{field.type}</span>
                      <span className="text-sm font-medium text-gray-800">{field.label}</span>
                      {field.options && <span className="text-xs text-gray-400">({field.options.slice(0, 3).join(", ")}{field.options.length > 3 ? "…" : ""})</span>}
                      <span className="text-xs bg-green-200 text-green-700 rounded px-1.5 py-0.5">custom</span>
                    </div>
                    <button
                      onClick={() => { const updated = customFields.filter((_, i) => i !== idx); saveCustomFields(updated); toast({ title: `"${field.label}" removed` }); }}
                      className="text-red-400 hover:text-red-600 transition-colors p-1 ml-2 shrink-0"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ))}
                {customFields.length === 0 && <p className="text-xs text-gray-400 text-center py-2 italic">No custom fields yet. Click "Add Field" to add one.</p>}
              </div>
              {showCustomEditor && (
                <div className="border-2 border-green-200 rounded-xl p-4 bg-green-50 space-y-3 mt-2">
                  <p className="text-sm font-semibold text-green-800">New Custom Field</p>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label className="text-xs mb-1 block">Field Label *</Label>
                      <Input placeholder="e.g. Material, Warranty, SKU" value={newFieldLabel} onChange={(e) => setNewFieldLabel(e.target.value)} className="h-8 text-sm" />
                    </div>
                    <div>
                      <Label className="text-xs mb-1 block">Field Type</Label>
                      <Select value={newFieldType} onValueChange={(v: FieldType) => setNewFieldType(v)}>
                        <SelectTrigger className="h-8 text-sm"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="text">Text (free input)</SelectItem>
                          <SelectItem value="number">Number</SelectItem>
                          <SelectItem value="select">Dropdown (options)</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  {newFieldType === "select" && (
                    <div>
                      <Label className="text-xs mb-1 block">Dropdown Options <span className="text-gray-400">(comma separated)</span></Label>
                      <Input placeholder="e.g. Small, Medium, Large, XL" value={newFieldOptions} onChange={(e) => setNewFieldOptions(e.target.value)} className="h-8 text-sm" />
                    </div>
                  )}
                  <div className="flex gap-2">
                    <Button
                      size="sm" className="bg-green-600 hover:bg-green-700 text-white"
                      onClick={() => {
                        if (!newFieldLabel.trim()) { toast({ title: "Label required", variant: "destructive" }); return; }
                        if (newFieldType === "select" && !newFieldOptions.trim()) { toast({ title: "Add at least one option", variant: "destructive" }); return; }
                        const key = `custom_${newFieldLabel.toLowerCase().replace(/\s+/g, "_").replace(/[^a-z0-9_]/g, "")}_${Date.now()}`;
                        const newField: VariantField = {
                          key, label: newFieldLabel.trim(), type: newFieldType,
                          ...(newFieldType === "select" ? { options: newFieldOptions.split(",").map((o) => o.trim()).filter(Boolean) } : {}),
                          placeholder: `Enter ${newFieldLabel.trim().toLowerCase()}`,
                        };
                        saveCustomFields([...customFields, newField]);
                        setNewFieldLabel(""); setNewFieldOptions(""); setNewFieldType("text");
                        setShowCustomEditor(false);
                        toast({ title: `"${newField.label}" field added ✅` });
                      }}
                    >Add Field</Button>
                    <Button size="sm" variant="outline" onClick={() => { setShowCustomEditor(false); setNewFieldLabel(""); setNewFieldOptions(""); setNewFieldType("text"); }}>Cancel</Button>
                  </div>
                </div>
              )}
            </div>
            <p className="text-xs text-gray-400 text-center">Custom fields are saved per account. Switching business type clears custom fields.</p>
          </DialogContent>
        </Dialog>

        {/* ── View Product Dialog ── */}
        <Dialog open={!!viewProduct} onOpenChange={() => setViewProduct(null)}>
          <DialogContent className="max-w-lg">
            <DialogHeader><DialogTitle>{viewProduct?.name}</DialogTitle></DialogHeader>
            {/* ── Photo gallery ── */}
            {viewProduct && (() => {
              const photos = parsePhotoUrls(viewProduct);
              if (photos.length === 0) return null;
              return (
                <div className={`grid gap-2 ${photos.length === 1 ? "grid-cols-1" : "grid-cols-2"}`}>
                  {photos.map((url, i) => (
                    <div key={i} className="relative">
                      <img
                        src={url}
                        alt={`${viewProduct.name} photo ${i + 1}`}
                        className={`w-full object-cover rounded-lg border border-gray-200 ${photos.length === 1 ? "h-52" : "h-36"}`}
                      />
                      {i === 0 && photos.length > 1 && (
                        <span className="absolute top-1.5 left-1.5 bg-black/60 text-white text-[10px] font-semibold px-1.5 py-0.5 rounded">
                          Main
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              );
            })()}
            <div className="space-y-3">
              {viewProduct && parseVariants(viewProduct).map((v) => (
                <div key={v.id} className="border p-3 rounded-md flex justify-between">
                  <div>
                    <div className="font-medium">{getVariantLabel(v)}</div>
                    {effectiveConfig.variantFields.map((f) => v[f.key] ? (
                      <div key={f.key} className="text-sm text-muted-foreground">{f.label}: {v[f.key]}</div>
                    ) : null)}
                    <div className="text-sm text-muted-foreground">HSN: {v.hsn_code || "—"}</div>
                  </div>
                  <div className="text-right">
                    <div className="font-semibold">₹{v.unit_price}</div>
                    <div className="text-xs text-muted-foreground">Stock: {v.stock_quantity}</div>
                    <div className="text-xs text-muted-foreground">Cost: ₹{v.cost_price}</div>
                  </div>
                </div>
              ))}
            </div>
          </DialogContent>
        </Dialog>

        {/* ── CSV Preview Dialog ── */}
        <Dialog open={showCSVDialog} onOpenChange={(o) => { if (!o) { setShowCSVDialog(false); setCSVPreviewRows([]); setCSVFileName(""); } }}>
          <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2"><FileText className="w-5 h-5" />CSV Import Preview</DialogTitle>
              <DialogDescription>
                Review rows before importing. Variant columns detected for: {config.icon} {config.label}
                {customFields.length > 0 && ` + ${customFields.length} custom field(s)`}
              </DialogDescription>
            </DialogHeader>
            <div className="flex items-center gap-4 p-3 rounded-lg bg-muted/40 text-sm flex-wrap">
              <span className="text-muted-foreground font-medium">{csvFileName}</span>
              <span className="flex items-center gap-1 text-green-600"><CheckCircle className="w-4 h-4" />{validCount} valid</span>
              {invalidCount > 0 && <span className="flex items-center gap-1 text-red-600"><XCircle className="w-4 h-4" />{invalidCount} errors</span>}
            </div>
            <div className="overflow-x-auto rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>#</TableHead>
                    <TableHead>Product</TableHead>
                    <TableHead>Category</TableHead>
                    {effectiveConfig.variantFields.map((f) => <TableHead key={f.key} className="text-xs">{f.label}</TableHead>)}
                    <TableHead>Stock</TableHead>
                    <TableHead>Unit ₹</TableHead>
                    <TableHead>HSN</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {csvPreviewRows.map((row) => (
                    <TableRow key={row.rowIndex} className={!row.valid ? "bg-red-50" : ""}>
                      <TableCell className="text-xs text-muted-foreground">{row.rowIndex}</TableCell>
                      <TableCell><div className="font-medium text-sm">{row.product_name || <span className="text-red-500 italic">missing</span>}</div></TableCell>
                      <TableCell className="text-sm">{row.category || "-"}</TableCell>
                      {effectiveConfig.variantFields.map((f) => <TableCell key={f.key} className="text-sm">{row[f.key] || "-"}</TableCell>)}
                      <TableCell className="text-sm">{row.stock_quantity}</TableCell>
                      <TableCell className="text-sm">₹{row.unit_price.toFixed(2)}</TableCell>
                      <TableCell className="text-sm">{row.hsn_code || "-"}</TableCell>
                      <TableCell>
                        {row.valid
                          ? <Badge className="bg-green-100 text-green-800 border-green-200 text-xs">✓ Valid</Badge>
                          : <div className="space-y-1">{row.errors.map((e, i) => <Badge key={i} variant="destructive" className="text-xs block">{e}</Badge>)}</div>}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
            <DialogFooter className="gap-2 flex-wrap">
              <Button variant="outline" onClick={() => csvInputRef.current?.click()}><Upload className="w-4 h-4 mr-2" />Choose Another File</Button>
              <Button disabled={csvImporting || validCount === 0} onClick={handleCSVImport} className="bg-gradient-to-r from-green-600 to-yellow-600 hover:from-green-700 hover:to-yellow-700">
                {csvImporting ? "Importing…" : `Import ${validCount} Product(s)`}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* ── Add / Edit Dialog ── */}
        <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{editingProduct ? "Edit Product" : "Add New Product"}</DialogTitle>
              <DialogDescription>
                {config.icon} {config.label}
                {customFields.length > 0 && ` + ${customFields.length} custom field${customFields.length > 1 ? "s" : ""}`}
                {" — "}variant fields: {effectiveConfig.variantFields.map((f) => f.label).join(", ")}
              </DialogDescription>
            </DialogHeader>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

              {/* ── Multi-Photo Upload ── */}
              <div className="md:col-span-2">
                <Label className="mb-2 block">
                  Product Photos
                  <span className="ml-2 text-xs text-gray-400 font-normal">
                    {formData.photo_urls.length}/{MAX_PHOTOS} — first photo is shown as the thumbnail
                  </span>
                </Label>
                <div className="space-y-3">
                  {/* Thumbnail grid of existing photos */}
                  {formData.photo_urls.length > 0 && (
                    <div className="flex flex-wrap gap-2">
                      {formData.photo_urls.map((url, i) => (
                        <div key={i} className="relative group">
                          <img
                            src={url}
                            alt={`Product photo ${i + 1}`}
                            className="w-20 h-20 object-cover rounded-xl border border-gray-200 shadow-sm"
                          />
                          {i === 0 && (
                            <span className="absolute bottom-0 left-0 right-0 bg-black/50 text-white text-[10px] text-center rounded-b-xl py-0.5 pointer-events-none">
                              Main
                            </span>
                          )}
                          {/* Remove button — appears on hover */}
                          <button
                            type="button"
                            onClick={() => removePhoto(i)}
                            className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-red-500 rounded-full flex items-center justify-center hover:bg-red-600 opacity-0 group-hover:opacity-100 transition-opacity shadow"
                          >
                            <X className="w-3 h-3 text-white" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                  {/* Upload trigger — only shown when under the limit */}
                  {formData.photo_urls.length < MAX_PHOTOS && (
                    <div className="flex items-center gap-3">
                      <div
                        className="w-20 h-20 border-2 border-dashed border-gray-300 rounded-xl flex flex-col items-center justify-center bg-gray-50 cursor-pointer hover:border-green-400 hover:bg-green-50 transition-colors shrink-0"
                        onClick={() => photoInputRef.current?.click()}
                      >
                        <Camera className="w-6 h-6 text-gray-400" />
                        <span className="text-xs text-gray-400 mt-1">Add</span>
                      </div>
                      <div className="flex flex-col gap-1.5">
                        <Button
                          type="button" variant="outline" size="sm"
                          onClick={() => photoInputRef.current?.click()}
                          disabled={uploadingPhoto}
                        >
                          <Upload className="w-4 h-4 mr-2" />
                          {uploadingPhoto ? "Uploading…" : "Upload Photos"}
                        </Button>
                        <p className="text-xs text-gray-400">
                          JPG, PNG up to 5MB each · Max {MAX_PHOTOS} photos · Select multiple at once
                        </p>
                      </div>
                      <input
                        ref={photoInputRef}
                        type="file"
                        accept="image/*"
                        multiple
                        className="hidden"
                        onChange={(e) => { if (e.target.files?.length) handlePhotoUpload(e.target.files); e.target.value = ""; }}
                      />
                    </div>
                  )}
                </div>
              </div>

              {/* Basic info */}
              <div>
                <Label>Product Name *</Label>
                <Input value={formData.name} onChange={(e) => setFormData((p) => ({ ...p, name: e.target.value }))} placeholder="Enter product name" />
              </div>
              <div>
                <Label>SKU / Code</Label>
                <Input value={formData.sku} onChange={(e) => setFormData((p) => ({ ...p, sku: e.target.value }))} placeholder="Optional" />
              </div>
              <div className="md:col-span-2">
                <Label>Description</Label>
                <Textarea value={formData.description} onChange={(e) => setFormData((p) => ({ ...p, description: e.target.value }))} rows={2} />
              </div>
              <div>
                <Label>Category</Label>
                <Input value={formData.category} onChange={(e) => setFormData((p) => ({ ...p, category: e.target.value }))} placeholder="e.g. Electronics, Clothing" />
              </div>
              <div>
                <Label>Unit</Label>
                <Select value={formData.unit} onValueChange={(v) => setFormData((p) => ({ ...p, unit: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="piece">Piece</SelectItem>
                    <SelectItem value="kg">Kilogram</SelectItem>
                    <SelectItem value="liter">Liter</SelectItem>
                    <SelectItem value="meter">Meter</SelectItem>
                    <SelectItem value="box">Box</SelectItem>
                    <SelectItem value="set">Set</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Variants */}
              <div className="md:col-span-2 space-y-3">
                <div className="flex items-center justify-between">
                  <Label className="text-base font-semibold">Variants</Label>
                  <span className="text-xs text-muted-foreground bg-gray-100 rounded-full px-2 py-0.5">
                    {config.icon} {effectiveConfig.variantFields.map((f) => f.label).join(" · ")}
                  </span>
                </div>
                {formData.variants.map((variant, index) => (
                  <div key={variant.id} className="border rounded-xl p-4 bg-muted/20 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-medium text-muted-foreground">Variant #{index + 1}</span>
                      <Button variant="ghost" size="sm" className="text-red-500 h-6 px-2 text-xs" onClick={() => removeVariant(variant.id)}>Remove</Button>
                    </div>
                    <div className="grid gap-2" style={{ gridTemplateColumns: `repeat(${Math.min(effectiveConfig.variantFields.length, 3)}, 1fr)` }}>
                      {effectiveConfig.variantFields.map((field) => (
                        <div key={field.key}>
                          <Label className="text-xs mb-1 block">
                            {field.label}
                            {customFields.some((cf) => cf.key === field.key) && <span className="ml-1 text-xs text-green-600">(custom)</span>}
                          </Label>
                          {renderVariantField(field, variant)}
                        </div>
                      ))}
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-2 pt-2 border-t border-gray-100">
                      <div>
                        <Label className="text-xs mb-1 block">Unit Price (₹) *</Label>
                        <Input type="number" step="0.01" className="h-8 text-sm" value={variant.unit_price} onChange={(e) => updateVariant(variant.id, { unit_price: parseFloat(e.target.value) || 0 })} />
                      </div>
                      <div>
                        <Label className="text-xs mb-1 block">Cost Price (₹)</Label>
                        <Input type="number" step="0.01" className="h-8 text-sm" value={variant.cost_price} onChange={(e) => updateVariant(variant.id, { cost_price: parseFloat(e.target.value) || 0 })} />
                      </div>
                      <div>
                        <Label className="text-xs mb-1 block">Stock Qty</Label>
                        <Input type="number" min={0} className="h-8 text-sm" value={variant.stock_quantity} onChange={(e) => updateVariant(variant.id, { stock_quantity: parseInt(e.target.value) || 0 })} />
                      </div>
                      <div>
                        <Label className="text-xs mb-1 block">Min Stock</Label>
                        <Input type="number" className="h-8 text-sm" value={variant.min_stock_level} onChange={(e) => updateVariant(variant.id, { min_stock_level: parseInt(e.target.value) || 0 })} />
                      </div>
                      <div className="col-span-2">
                        <Label className="text-xs mb-1 block">HSN Code</Label>
                        <Input className="h-8 text-sm" placeholder="e.g. 6109" value={variant.hsn_code} onChange={(e) => updateVariant(variant.id, { hsn_code: e.target.value })} />
                      </div>
                    </div>
                  </div>
                ))}
                <Button variant="outline" type="button" className="w-full" onClick={addVariant}>
                  <Plus className="w-4 h-4 mr-2" /> Add Variant
                </Button>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={resetForm}>Cancel</Button>
              <Button onClick={handleSaveProduct} disabled={!formData.name.trim() || uploadingPhoto}>
                {editingProduct ? "Update Product" : "Add Product"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

      </div>
    </div>
  );
};

export default Inventory;