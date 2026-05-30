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
  Upload, Download, CheckCircle, XCircle, FileText, FileDown,
} from "lucide-react";
import Navbar from "@/components/Navbar";
import { useActiveOwnerId } from "@/hooks/useActiveOwnerId";
import { useCompany } from "@/hooks/useCompany";
import { Building2 } from "lucide-react";

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
}

interface VariantRow {
  id: string;
  size: string;
  color: string;
  brand: string;
  stock_quantity: number;
  unit_price: number;
  cost_price: number;
  hsn_code: string;
  min_stock_level: number;
}

interface CSVPreviewRow {
  rowIndex: number;
  product_name: string;
  description: string;
  category: string;
  unit: string;
  size: string;
  color: string;
  brand: string;
  stock_quantity: number;
  unit_price: number;
  cost_price: number;
  hsn_code: string;
  min_stock_level: number;
  errors: string[];
  valid: boolean;
}

const SIZES = ["XS", "S", "M", "L", "XL", "XXL"];
const COLORS = ["Red", "Green", "Blue", "Black", "White", "Yellow", "Grey", "Brown"];
const BRANDS = ["Unbranded", "Other"];

const CSV_HEADERS = [
  "product_name", "description", "category", "unit",
  "size", "color", "brand", "stock_quantity",
  "unit_price", "cost_price", "hsn_code", "min_stock_level",
];

const CSV_SAMPLES = [
  ["Cotton T-Shirt", "Premium cotton tee", "clothing", "piece", "M", "Black", "Unbranded", "50", "499", "250", "6109", "10"],
  ["Cotton T-Shirt", "Premium cotton tee", "clothing", "piece", "L", "Black", "Unbranded", "30", "499", "250", "6109", "10"],
  ["Cotton T-Shirt", "Premium cotton tee", "clothing", "piece", "S",  "White", "Unbranded", "20", "499", "250", "6109", "5"],
  ["Formal Trousers", "Slim fit trousers",  "clothing", "piece", "M", "Grey",  "Other",      "15", "999", "500", "6203", "5"],
];
const { activeCompany } = useCompany();

function downloadCSV(filename: string, rows: string[][]) {
  const content = rows.map((r) => r.map((c) => `"${c}"`).join(",")).join("\n");
  const blob = new Blob([content], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = filename; a.click();
  URL.revokeObjectURL(url);
}

function parseCSV(text: string): string[][] {
  return text.trim().split(/\r?\n/).map((line) => {
    const row: string[] = [];
    let current = ""; let inQuotes = false;
    for (const ch of line) {
      if (ch === '"') { inQuotes = !inQuotes; }
      else if (ch === "," && !inQuotes) { row.push(current.trim()); current = ""; }
      else { current += ch; }
    }
    row.push(current.trim()); return row;
  });
}

function validateCSVRow(row: CSVPreviewRow): string[] {
  const errors: string[] = [];
  if (!row.product_name) errors.push("Product name required");
  if (!row.size) errors.push("Size required");
  if (!row.color) errors.push("Color required");
  if (isNaN(row.unit_price) || row.unit_price < 0) errors.push("Invalid unit price");
  if (isNaN(row.stock_quantity) || row.stock_quantity < 0) errors.push("Invalid stock qty");
  return errors;
}

const Inventory = () => {
  const { user } = useAuth();
  const [products, setProducts] = useState<InventoryProduct[]>([]);
  const [filteredProducts, setFilteredProducts] = useState<InventoryProduct[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [stockFilter, setStockFilter] = useState<string>("all");
  const [isLoading, setIsLoading] = useState(false);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [editingProduct, setEditingProduct] = useState<InventoryProduct | null>(null);
  const [lowStockProducts, setLowStockProducts] = useState<any[]>([]);
  const [viewProduct, setViewProduct] = useState<InventoryProduct | null>(null);

  const [showCSVDialog, setShowCSVDialog] = useState(false);
  const [csvPreviewRows, setCSVPreviewRows] = useState<CSVPreviewRow[]>([]);
  const [csvImporting, setCSVImporting] = useState(false);
  const [csvFileName, setCSVFileName] = useState("");
  const csvInputRef = useRef<HTMLInputElement>(null);

  const defaultVariant = () => ({
    id: Date.now().toString() + Math.random(),
    size: "M", color: "Black", brand: "Unbranded",
    stock_quantity: 0, unit_price: 0, cost_price: 0, hsn_code: "", min_stock_level: 0,
  });

  const [formData, setFormData] = useState({
    name: "", description: "", sku: "", unit_price: 0, cost_price: 0,
    current_stock: 0, min_stock_level: 0, max_stock_level: 0,
    unit: "piece", category: "", barcode: "", hsn_code: "",
    variants: [defaultVariant()],
  });
const ownerId = useActiveOwnerId();
  // useEffect(() => { if (user) { fetchProducts(); fetchLowStockProducts(); } }, [user]);
  useEffect(() => { if (ownerId) { fetchProducts(); fetchLowStockProducts(); } }, [ownerId]);
  useEffect(() => { filterProducts(); }, [products, searchTerm, categoryFilter, stockFilter]);

  const fetchProducts = async () => {
  if (!ownerId) return;
  setIsLoading(true);
  try {
    const { data, error } = await supabase
      .from("inventory_products")
      .select("*")
      .eq("user_id", ownerId)
      .order("name");
    if (error) throw error;
    setProducts(data || []);
  } catch {
    toast({ title: "Error", description: "Failed to fetch products.", variant: "destructive" });
  }
  setIsLoading(false);
};

  const fetchLowStockProducts = async () => {
    if (!user) return;
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

  const handleSaveProduct = async () => {
    if (!ownerId) return;
    try {
      const data = {
        name: formData.name, description: formData.description, sku: formData.sku,
        unit_price: parseFloat(formData.unit_price.toString()),
        cost_price: formData.cost_price ? parseFloat(formData.cost_price.toString()) : null,
        current_stock: getTotalVariantStock(),
        min_stock_level: parseInt(formData.min_stock_level.toString()),
        max_stock_level: formData.max_stock_level ? parseInt(formData.max_stock_level.toString()) : null,
        unit: formData.unit, category: formData.category, barcode: formData.barcode,
        hsn_code: formData.hsn_code, variants: JSON.stringify(formData.variants), user_id: ownerId,
      };
      if (editingProduct) {
        const { error } = await supabase.from("inventory_products").update(data).eq("id", editingProduct.id);
        if (error) throw error;
        toast({ title: "Success", description: "Product updated." });
      } else {
        const { error } = await supabase.from("inventory_products").insert(data);
        if (error) throw error;
        toast({ title: "Success", description: "Product added." });
      }
      resetForm(); fetchProducts(); fetchLowStockProducts();
    } catch { toast({ title: "Error", description: "Failed to save product.", variant: "destructive" }); }
  };

  const handleDeleteProduct = async (id: string) => {
    if (!confirm("Delete this product?")) return;
    try {
      const { error } = await supabase.from("inventory_products").delete().eq("id", id);
      if (error) throw error;
      toast({ title: "Success", description: "Product deleted." });
      fetchProducts(); fetchLowStockProducts();
    } catch { toast({ title: "Error", description: "Failed to delete.", variant: "destructive" }); }
  };

  const resetForm = () => {
    setFormData({ name: "", description: "", sku: "", unit_price: 0, cost_price: 0, current_stock: 0, min_stock_level: 0, max_stock_level: 0, unit: "piece", category: "", barcode: "", hsn_code: "", variants: [defaultVariant()] });
    setEditingProduct(null); setShowAddDialog(false);
  };

  const handleEdit = (product: InventoryProduct) => {
    setFormData({ name: product.name, description: product.description || "", sku: product.sku || "", unit_price: product.unit_price, cost_price: product.cost_price || 0, current_stock: product.current_stock, min_stock_level: product.min_stock_level, max_stock_level: product.max_stock_level || 0, unit: product.unit, category: product.category || "", barcode: product.barcode || "", hsn_code: (product as any).hsn_code || "", variants: parseVariants(product) });
    setEditingProduct(product); setShowAddDialog(true);
  };

  const addVariant = () => setFormData((p) => ({ ...p, variants: [...p.variants, defaultVariant()] }));
  const updateVariant = (id: string, updates: Partial<VariantRow>) => setFormData((p) => ({ ...p, variants: p.variants.map((v) => (v.id === id ? { ...v, ...updates } : v)) }));
  const removeVariant = (id: string) => setFormData((p) => { if (p.variants.length === 1) return p; return { ...p, variants: p.variants.filter((v) => v.id !== id) }; });

  const getStockStatus = (product: InventoryProduct) => {
    const total = parseVariants(product).reduce((s, v) => s + (v.stock_quantity || 0), 0);
    if (total === 0) return { status: "Out of Stock", variant: "destructive" as const };
    if (total <= product.min_stock_level) return { status: "Low Stock", variant: "secondary" as const };
    return { status: "In Stock", variant: "default" as const };
  };

  // CSV
  const handleDownloadSample = () => {
    downloadCSV("inventory_sample.csv", [CSV_HEADERS, ...CSV_SAMPLES]);
    toast({ title: "Downloaded", description: "inventory_sample.csv saved. Fill it in and import." });
  };

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
        const obj: CSVPreviewRow = { rowIndex: i + 2, product_name: get(row, "product_name"), description: get(row, "description"), category: get(row, "category"), unit: get(row, "unit") || "piece", size: get(row, "size"), color: get(row, "color"), brand: get(row, "brand") || "Unbranded", stock_quantity: parseInt(get(row, "stock_quantity")) || 0, unit_price: parseFloat(get(row, "unit_price")) || 0, cost_price: parseFloat(get(row, "cost_price")) || 0, hsn_code: get(row, "hsn_code"), min_stock_level: parseInt(get(row, "min_stock_level")) || 0, errors: [], valid: true };
        obj.errors = validateCSVRow(obj); obj.valid = obj.errors.length === 0; return obj;
      });
      setCSVPreviewRows(preview); setShowCSVDialog(true);
    };
    reader.readAsText(file); e.target.value = "";
  };

  const handleCSVImport = async () => {
    if (!user) return;
    const valid = csvPreviewRows.filter((r) => r.valid);
    if (!valid.length) { toast({ title: "No valid rows", variant: "destructive" }); return; }
    setCSVImporting(true);
    const map = new Map<string, CSVPreviewRow[]>();
    for (const r of valid) { const k = r.product_name.trim().toLowerCase(); if (!map.has(k)) map.set(k, []); map.get(k)!.push(r); }
    let ok = 0, fail = 0;
    for (const [, rows] of map.entries()) {
      const first = rows[0];
      const variants: VariantRow[] = rows.map((r) => ({ id: Date.now().toString() + Math.random(), size: r.size, color: r.color, brand: r.brand, stock_quantity: r.stock_quantity, unit_price: r.unit_price, cost_price: r.cost_price, hsn_code: r.hsn_code, min_stock_level: r.min_stock_level }));
      const { error } = await supabase.from("inventory_products").insert({ name: first.product_name, description: first.description || null, sku: null, unit_price: variants[0].unit_price, cost_price: variants[0].cost_price || null, current_stock: variants.reduce((s, v) => s + v.stock_quantity, 0), min_stock_level: Math.min(...variants.map((v) => v.min_stock_level)), max_stock_level: null, unit: first.unit, category: first.category || null, barcode: null, hsn_code: first.hsn_code || null, variants: JSON.stringify(variants), user_id: ownerId });
      if (error) { fail++; } else { ok++; }
    }
    toast({ title: "Import complete", description: `${ok} product(s) imported${fail ? `, ${fail} failed` : ""}.`, variant: fail ? "destructive" : "default" });
    setShowCSVDialog(false); setCSVPreviewRows([]); setCSVFileName(""); fetchProducts(); fetchLowStockProducts();
    setCSVImporting(false);
  };

  const validCount = csvPreviewRows.filter((r) => r.valid).length;
  const invalidCount = csvPreviewRows.filter((r) => !r.valid).length;
  const categories = [...new Set(products.map((p) => p.category).filter(Boolean))];

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 via-white to-yellow-50">
      <Navbar />
      <div className="container mx-auto px-4 py-8">

        <div className="flex items-center justify-between mb-8 flex-wrap gap-3">
          <div>
            <h1 className="text-3xl font-bold bg-gradient-to-r from-green-600 to-yellow-600 bg-clip-text text-transparent">Inventory Management</h1>
            <p className="text-muted-foreground">Manage your products and stock levels</p>
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

        {lowStockProducts.length > 0 && (
          <Card className="mb-6 border-yellow-200 bg-yellow-50">
            <CardHeader className="pb-3"><CardTitle className="flex items-center text-yellow-800"><AlertTriangle className="w-5 h-5 mr-2" />Low Stock Alert</CardTitle></CardHeader>
            <CardContent>
              <p className="text-yellow-700 mb-2">{lowStockProducts.length} product(s) running low:</p>
              <div className="flex flex-wrap gap-2">{lowStockProducts.map((p) => <Badge key={p.id} variant="secondary">{p.name} ({p.current_stock}/{p.min_stock_level})</Badge>)}</div>
            </CardContent>
          </Card>
        )}

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
                <Button variant="outline" onClick={() => { setSearchTerm(""); setCategoryFilter("all"); setStockFilter("all"); }}>Clear Filters</Button>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="flex items-center"><Package className="w-5 h-5 mr-2" />Products ({filteredProducts.length})</CardTitle></CardHeader>
          <CardContent>
            {isLoading ? <div className="text-center py-8">Loading…</div> : filteredProducts.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">No products found.</div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead><TableHead>Category</TableHead>
                      <TableHead>Variants & Stock</TableHead><TableHead>Unit Price</TableHead>
                      <TableHead>Status</TableHead><TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredProducts.map((product) => {
                      const ss = getStockStatus(product);
                      const pv = parseVariants(product);
                      return (
                        <TableRow key={product.id}>
                          <TableCell>
                            <div className="font-medium">{product.name}</div>
                            {product.description && <div className="text-sm text-muted-foreground">{product.description}</div>}
                          </TableCell>
                          <TableCell>{product.category || "-"}</TableCell>
                          <TableCell>
                            <div className="text-sm space-y-1">
                              {pv.length > 0 ? pv.map((v) => <Badge key={v.id} variant={v.stock_quantity === 0 ? "destructive" : "default"}>{v.size} {v.color}: {v.stock_quantity}</Badge>) : <div>{product.current_stock} {product.unit}</div>}
                              <div className="text-xs text-muted-foreground">Min: {product.min_stock_level}</div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="text-sm space-y-1">
                              {pv.map((v) => <div key={v.id} className="flex justify-between gap-2"><span>{v.size}/{v.color}</span><span>₹{v.unit_price?.toFixed(2)}</span></div>)}
                            </div>
                          </TableCell>
                          <TableCell><Badge variant={ss.variant}>{ss.status}</Badge></TableCell>
                          <TableCell>
                            <div className="flex gap-2">
                              <Button size="sm" variant="outline" onClick={() => handleEdit(product)}><Edit className="w-4 h-4" /></Button>
                              <Button size="sm" variant="outline" className="text-red-600 hover:text-red-700" onClick={() => handleDeleteProduct(product.id)}><Trash2 className="w-4 h-4" /></Button>
                              <Button size="sm" onClick={() => setViewProduct(product)}>View</Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>

        {/* View dialog */}
        <Dialog open={!!viewProduct} onOpenChange={() => setViewProduct(null)}>
          <DialogContent className="max-w-lg">
            <DialogHeader><DialogTitle>{viewProduct?.name}</DialogTitle></DialogHeader>
            <div className="space-y-3">
              {viewProduct && parseVariants(viewProduct).map((v) => (
                <div key={v.id} className="border p-3 rounded-md flex justify-between">
                  <div><div className="font-medium">{v.size} / {v.color} / {v.brand}</div><div className="text-sm text-muted-foreground">HSN: {v.hsn_code}</div></div>
                  <div className="text-right"><div>₹{v.unit_price}</div><div className="text-xs">Stock: {v.stock_quantity}</div></div>
                </div>
              ))}
            </div>
          </DialogContent>
        </Dialog>

        {/* CSV preview dialog */}
        <Dialog open={showCSVDialog} onOpenChange={(o) => { if (!o) { setShowCSVDialog(false); setCSVPreviewRows([]); setCSVFileName(""); } }}>
          <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2"><FileText className="w-5 h-5" />CSV Import Preview</DialogTitle>
              <DialogDescription>Review rows before importing. Rows with errors will be skipped.</DialogDescription>
            </DialogHeader>
            <div className="flex items-center gap-4 p-3 rounded-lg bg-muted/40 text-sm flex-wrap">
              <span className="text-muted-foreground font-medium">{csvFileName}</span>
              <span className="flex items-center gap-1 text-green-600"><CheckCircle className="w-4 h-4" />{validCount} valid</span>
              {invalidCount > 0 && <span className="flex items-center gap-1 text-red-600"><XCircle className="w-4 h-4" />{invalidCount} errors</span>}
              <Button variant="ghost" size="sm" className="ml-auto text-xs" onClick={handleDownloadSample}><Download className="w-3 h-3 mr-1" />Re-download Sample</Button>
            </div>
            <div className="overflow-x-auto rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>#</TableHead><TableHead>Product</TableHead><TableHead>Category</TableHead>
                    <TableHead>Size</TableHead><TableHead>Color</TableHead><TableHead>Brand</TableHead>
                    <TableHead>Stock</TableHead><TableHead>Unit ₹</TableHead><TableHead>Cost ₹</TableHead>
                    <TableHead>HSN</TableHead><TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {csvPreviewRows.map((row) => (
                    <TableRow key={row.rowIndex} className={!row.valid ? "bg-red-50" : ""}>
                      <TableCell className="text-xs text-muted-foreground">{row.rowIndex}</TableCell>
                      <TableCell><div className="font-medium text-sm">{row.product_name || <span className="text-red-500 italic">missing</span>}</div></TableCell>
                      <TableCell className="text-sm">{row.category || "-"}</TableCell>
                      <TableCell className="text-sm">{row.size || <span className="text-red-500 italic">!</span>}</TableCell>
                      <TableCell className="text-sm">{row.color || <span className="text-red-500 italic">!</span>}</TableCell>
                      <TableCell className="text-sm">{row.brand}</TableCell>
                      <TableCell className="text-sm">{row.stock_quantity}</TableCell>
                      <TableCell className="text-sm">₹{row.unit_price.toFixed(2)}</TableCell>
                      <TableCell className="text-sm">₹{row.cost_price.toFixed(2)}</TableCell>
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
            {invalidCount > 0 && <p className="text-sm text-muted-foreground">⚠️ {invalidCount} row(s) will be skipped. {validCount} will be imported.</p>}
            <DialogFooter className="gap-2 flex-wrap">
              <Button variant="outline" onClick={handleDownloadSample}><Download className="w-4 h-4 mr-2" />Download Sample</Button>
              <Button variant="outline" onClick={() => csvInputRef.current?.click()}><Upload className="w-4 h-4 mr-2" />Choose Another File</Button>
              <Button disabled={csvImporting || validCount === 0} onClick={handleCSVImport} className="bg-gradient-to-r from-green-600 to-yellow-600 hover:from-green-700 hover:to-yellow-700">
                {csvImporting ? "Importing…" : `Import ${validCount} Product(s)`}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Add/Edit dialog */}
        <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{editingProduct ? "Edit Product" : "Add New Product"}</DialogTitle>
              <DialogDescription>{editingProduct ? "Update product information" : "Add a new product to your inventory"}</DialogDescription>
            </DialogHeader>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label>Product Name *</Label>
                <Input value={formData.name} onChange={(e) => setFormData((p) => ({ ...p, name: e.target.value }))} placeholder="Enter product name" />
              </div>
              <div className="md:col-span-2">
                <Label>Description</Label>
                <Textarea value={formData.description} onChange={(e) => setFormData((p) => ({ ...p, description: e.target.value }))} />
              </div>
              <div>
                <Label>Category</Label>
                <Select value={formData.category} onValueChange={(v) => setFormData((p) => ({ ...p, category: v }))}>
                  <SelectTrigger><SelectValue placeholder="Select category" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="electronics">Electronics</SelectItem>
                    <SelectItem value="clothing">Clothing</SelectItem>
                    <SelectItem value="grocery">Grocery</SelectItem>
                    <SelectItem value="medical">Medical</SelectItem>
                    <SelectItem value="stationery">Stationery</SelectItem>
                  </SelectContent>
                </Select>
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
                  </SelectContent>
                </Select>
              </div>
              <div className="md:col-span-2 space-y-3">
                <div className="flex items-center justify-between">
                  <Label className="text-base font-semibold">Variants</Label>
                  <span className="text-xs text-muted-foreground">Size · Color · Brand · Stock</span>
                </div>
                {formData.variants.map((variant, index) => (
                  <div key={variant.id} className="border rounded-md p-3 bg-muted/20 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-medium text-muted-foreground">Variant #{index + 1}</span>
                      <Button variant="ghost" size="sm" className="text-red-500 h-6 px-2 text-xs" onClick={() => removeVariant(variant.id)}>Remove</Button>
                    </div>
                    <div className="grid grid-cols-3 gap-2">
                      <div><Label className="text-xs mb-1 block">Size</Label>
                        <Select value={variant.size} onValueChange={(v) => updateVariant(variant.id, { size: v })}>
                          <SelectTrigger className="h-8 text-sm"><SelectValue /></SelectTrigger>
                          <SelectContent>{SIZES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
                        </Select>
                      </div>
                      <div><Label className="text-xs mb-1 block">Color</Label>
                        <Select value={variant.color} onValueChange={(v) => updateVariant(variant.id, { color: v })}>
                          <SelectTrigger className="h-8 text-sm"><SelectValue /></SelectTrigger>
                          <SelectContent>{COLORS.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
                        </Select>
                      </div>
                      <div><Label className="text-xs">Unit Price (₹) *</Label>
                        <Input type="number" step="0.01" value={variant.unit_price} onChange={(e) => updateVariant(variant.id, { unit_price: parseFloat(e.target.value) || 0 })} />
                      </div>
                      <div><Label className="text-xs">Min Stock</Label>
                        <Input type="number" value={variant.min_stock_level} onChange={(e) => updateVariant(variant.id, { min_stock_level: parseInt(e.target.value) || 0 })} />
                      </div>
                      <div><Label className="text-xs">HSN Code</Label>
                        <Input value={variant.hsn_code} onChange={(e) => updateVariant(variant.id, { hsn_code: e.target.value })} placeholder="HSN" />
                      </div>
                      <div><Label className="text-xs">Cost Price (₹)</Label>
                        <Input type="number" step="0.01" value={variant.cost_price} onChange={(e) => updateVariant(variant.id, { cost_price: parseFloat(e.target.value) || 0 })} />
                      </div>
                      <div><Label className="text-xs mb-1 block">Brand</Label>
                        <Select value={variant.brand} onValueChange={(v) => updateVariant(variant.id, { brand: v })}>
                          <SelectTrigger className="h-8 text-sm"><SelectValue /></SelectTrigger>
                          <SelectContent>{BRANDS.map((b) => <SelectItem key={b} value={b}>{b}</SelectItem>)}</SelectContent>
                        </Select>
                      </div>
                      <div><Label className="text-xs mb-1 block">Stock Quantity</Label>
                        <Input type="number" min={0} className="h-8 text-sm" value={variant.stock_quantity} onChange={(e) => updateVariant(variant.id, { stock_quantity: parseInt(e.target.value) || 0 })} />
                      </div>
                    </div>
                  </div>
                ))}
                <Button variant="outline" type="button" className="w-full" onClick={addVariant}>+ Add Variant</Button>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={resetForm}>Cancel</Button>
              <Button onClick={handleSaveProduct}>{editingProduct ? "Update Product" : "Add Product"}</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
      {activeCompany && !activeCompany.isOwn && (
  <div className="mb-4 flex items-center gap-3 bg-blue-50 border border-blue-200 rounded-lg px-4 py-3">
    <Building2 className="w-5 h-5 text-blue-600 shrink-0" />
    <p className="text-sm font-semibold text-blue-800">
      Viewing: {activeCompany.companyName} — Role: {activeCompany.role}
    </p>
  </div>
)}
    </div>
  );
};

export default Inventory;