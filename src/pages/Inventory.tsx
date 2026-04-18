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
import { Plus, Edit, Trash2, Search, AlertTriangle, Package } from "lucide-react";
import Navbar from "@/components/Navbar";

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
  variants?: string; // 👈 add this
}

// ✅ Structured variant type — Size, Color, Brand, Stock
interface VariantRow {
  id: string;
  size: string;
  color: string;
  brand: string;   // ✅ Extra field
  stock_quantity: number;

  unit_price: number;
  cost_price: number;
  hsn_code: string;
  min_stock_level: number;
}

const SIZES = ["XS", "S", "M", "L", "XL", "XXL"];
const COLORS = ["Red", "Green", "Blue", "Black", "White", "Yellow", "Grey", "Brown"];
const BRANDS = ["Unbranded", "Other"];

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

  const [formData, setFormData] = useState({
    name: "",
    description: "",
    sku: "",
    unit_price: 0,
    cost_price: 0,
    current_stock: 0,
    min_stock_level: 0,
    max_stock_level: 0,
    unit: "piece",
    category: "",
    barcode: "",
    hsn_code: "",
    // variants: [] as VariantRow[],
    variants: [
      {
        id: Date.now().toString(),
        size: "M",
        color: "Black",
        brand: "Unbranded",
        stock_quantity: 0,
        unit_price: 0,
        cost_price: 0,
        hsn_code: "",
        min_stock_level: 0,
      },
    ],
  });

  useEffect(() => {
    if (user) {
      fetchProducts();
      fetchLowStockProducts();
    }
  }, [user]);

  useEffect(() => {
    filterProducts();
  }, [products, searchTerm, categoryFilter, stockFilter]);

  const fetchProducts = async () => {
    if (!user) return;
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from("inventory_products")
        .select("*")
        .eq("user_id", user.id)
        .order("name");

      if (error) throw error;
      setProducts(data || []);
    } catch (error) {
      console.error("Error fetching products:", error);
      toast({
        title: "Error",
        description: "Failed to fetch inventory products.",
        variant: "destructive",
      });
    }
    setIsLoading(false);
  };
const getTotalVariantStock = () => {
  return formData.variants.reduce(
    (sum, v) => sum + (v.stock_quantity || 0),
    0
  );
};
  const fetchLowStockProducts = async () => {
    if (!user) return;
    try {
      const { data, error } = await supabase.rpc("get_low_stock_products", {
        user_uuid: user.id,
      });
      if (error) throw error;
      setLowStockProducts(data || []);
    } catch (error) {
      console.error("Error fetching low stock products:", error);
    }
  };
  const [viewProduct, setViewProduct] = useState<InventoryProduct | null>(null);
  const filterProducts = () => {
    let filtered = products;

    if (searchTerm) {
      filtered = filtered.filter(
        (product) =>
          product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          product.sku?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          product.description?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    if (categoryFilter !== "all") {
      filtered = filtered.filter((product) => product.category === categoryFilter);
    }

    if (stockFilter === "low") {
      filtered = filtered.filter(
        (product) => product.current_stock <= product.min_stock_level
      );
    } else if (stockFilter === "out") {
      filtered = filtered.filter((product) => product.current_stock === 0);
    }

    setFilteredProducts(filtered);
  };

  const handleSaveProduct = async () => {
    if (!user) return;

    try {
      const productData = {
        name: formData.name,
        description: formData.description,
        sku: formData.sku,
        unit_price: parseFloat(formData.unit_price.toString()),
        cost_price: formData.cost_price ? parseFloat(formData.cost_price.toString()) : null,
        // current_stock: parseInt(formData.current_stock.toString()),
        current_stock: getTotalVariantStock(),
        min_stock_level: parseInt(formData.min_stock_level.toString()),
        max_stock_level: formData.max_stock_level ? parseInt(formData.max_stock_level.toString()) : null,
        unit: formData.unit,
        category: formData.category,
        barcode: formData.barcode,
        hsn_code: formData.hsn_code,
        // ✅ Serialize full variant array (size + color + brand + stock) as JSON
        variants: JSON.stringify(formData.variants),
        user_id: user.id,
      };

      if (editingProduct) {
        const { error } = await supabase
          .from("inventory_products")
          .update(productData)
          .eq("id", editingProduct.id);

        if (error) throw error;
        toast({ title: "Success", description: "Product updated successfully." });
      } else {
        const { error } = await supabase.from("inventory_products").insert(productData);
        if (error) throw error;
        toast({ title: "Success", description: "Product added successfully." });
      }

      resetForm();
      fetchProducts();
      fetchLowStockProducts();
    } catch (error) {
      console.error("Error saving product:", error);
      toast({
        title: "Error",
        description: "Failed to save product.",
        variant: "destructive",
      });
    }
  };

  const handleDeleteProduct = async (productId: string) => {
    if (!confirm("Are you sure you want to delete this product?")) return;

    try {
      const { error } = await supabase
        .from("inventory_products")
        .delete()
        .eq("id", productId);

      if (error) throw error;
      toast({ title: "Success", description: "Product deleted successfully." });
      fetchProducts();
      fetchLowStockProducts();
    } catch (error) {
      console.error("Error deleting product:", error);
      toast({
        title: "Error",
        description: "Failed to delete product.",
        variant: "destructive",
      });
    }
  };

  const resetForm = () => {
    setFormData({
      name: "",
      description: "",
      sku: "",
      unit_price: 0,
      cost_price: 0,
      current_stock: 0,
      min_stock_level: 0,
      max_stock_level: 0,
      unit: "piece",
      category: "",
      barcode: "",
      hsn_code: "",
      // variants: [],
      variants: [
        {
          id: Date.now().toString(),
          size: "M",
          color: "Black",
          brand: "Unbranded",
          stock_quantity: 0,
          unit_price: 0,
          cost_price: 0,
          hsn_code: "",
          min_stock_level: 0,
        },
      ],
    });
    setEditingProduct(null);
    setShowAddDialog(false);
  };

  const parseVariants = (product: any): VariantRow[] => {
    try {
      return product.variants ? JSON.parse(product.variants) : [];
    } catch {
      return [];
    }
  };

  const handleEdit = (product: InventoryProduct) => {
    setFormData({
      name: product.name,
      description: product.description || "",
      sku: product.sku || "",
      unit_price: product.unit_price,
      cost_price: product.cost_price || 0,
      current_stock: product.current_stock,
      min_stock_level: product.min_stock_level,
      max_stock_level: product.max_stock_level || 0,
      unit: product.unit,
      category: product.category || "",
      barcode: product.barcode || "",
      hsn_code: (product as any).hsn_code || "",
      variants: parseVariants(product),
    });
    setEditingProduct(product);
    setShowAddDialog(true);
  };

  // ✅ Variant helpers
  const addVariant = () => {
    setFormData((prev) => ({
      ...prev,
      variants: [
        ...prev.variants,
        {
          id: Date.now().toString(),
          size: "M",
          color: "Black",
          brand: "Unbranded",
          stock_quantity: 0,

          unit_price: 0,
          cost_price: 0,
          hsn_code: "",
          min_stock_level: 0,
        },
      ],
    }));
  };

  const updateVariant = (id: string, updates: Partial<VariantRow>) => {
    setFormData((prev) => ({
      ...prev,
      variants: prev.variants.map((v) => (v.id === id ? { ...v, ...updates } : v)),
    }));
  };

  const removeVariant = (id: string) => {
    setFormData((prev) => ({
      ...prev,
      variants: prev.variants.filter((v) => v.id !== id),
    }));
  };

  const getStockStatus = (product: InventoryProduct) => {
    const variants = parseVariants(product);
    const removeVariant = (id: string) => {
      setFormData((prev) => {
        if (prev.variants.length === 1) return prev; // ❌ don't remove last
        return {
          ...prev,
          variants: prev.variants.filter((v) => v.id !== id),
        };
      });
    };

    const totalStock = variants.reduce(
      (sum, v) => sum + (v.stock_quantity || 0),
      0
    );

    if (totalStock === 0)
      return { status: "Out of Stock", variant: "destructive" as const };

    if (totalStock <= product.min_stock_level)
      return { status: "Low Stock", variant: "secondary" as const };

    return { status: "In Stock", variant: "default" as const };
  };

  const categories = [...new Set(products.map((p) => p.category).filter(Boolean))];

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 via-white to-yellow-50">
      <Navbar />
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold bg-gradient-to-r from-green-600 to-yellow-600 bg-clip-text text-transparent">
              Inventory Management
            </h1>
            <p className="text-muted-foreground">Manage your products and stock levels</p>
          </div>
          <Button
            // onClick={() => setShowAddDialog(true)}
            onClick={() => {
              resetForm(); // ensures fresh default variant
              setShowAddDialog(true);
            }}
            className="bg-gradient-to-r from-green-600 to-yellow-600 hover:from-green-700 hover:to-yellow-700"
          >
            <Plus className="w-4 h-4 mr-2" />
            Add Product
          </Button>
        </div>

        {/* Low Stock Alert */}
        {lowStockProducts.length > 0 && (
          <Card className="mb-6 border-yellow-200 bg-yellow-50">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center text-yellow-800">
                <AlertTriangle className="w-5 h-5 mr-2" />
                Low Stock Alert
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-yellow-700 mb-2">
                {lowStockProducts.length} product(s) are running low on stock:
              </p>
              <div className="flex flex-wrap gap-2">
                {lowStockProducts.map((product) => (
                  <Badge key={product.id} variant="secondary">
                    {product.name} ({product.current_stock}/{product.min_stock_level})
                  </Badge>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Filters */}
        <Card className="mb-6">
          <CardContent className="pt-6">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div>
                <Label htmlFor="search">Search Products</Label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
                  <Input
                    id="search"
                    placeholder="Search by name, SKU, or description..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>
              <div>
                <Label htmlFor="category">Category</Label>
                <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Categories</SelectItem>
                    {categories.map((category) => (
                      <SelectItem key={category} value={category || ""}>
                        {category || "Uncategorized"}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="stock">Stock Status</Label>
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
                <Button
                  variant="outline"
                  onClick={() => {
                    setSearchTerm("");
                    setCategoryFilter("all");
                    setStockFilter("all");
                  }}
                >
                  Clear Filters
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Products Table */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Package className="w-5 h-5 mr-2" />
              Products ({filteredProducts.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="text-center py-8">Loading products...</div>
            ) : filteredProducts.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                No products found. Add your first product to get started.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      {/* <TableHead>SKU</TableHead> */}
                      <TableHead>Category</TableHead>
                      <TableHead>Variants & Stock</TableHead>
                      <TableHead>Unit Price</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredProducts.map((product) => {
                      const stockStatus = getStockStatus(product);
                      const parsedVariants = parseVariants(product);

                      return (
                        <TableRow key={product.id}>
                          <TableCell>
                            <div>
                              <div className="font-medium">{product.name}</div>
                              {product.description && (
                                <div className="text-sm text-muted-foreground">
                                  {product.description}
                                </div>
                              )}
                            </div>
                          </TableCell>
                          {/* <TableCell>{product.sku || "-"}</TableCell> */}
                          <TableCell>{product.category || "-"}</TableCell>
                          <TableCell>
                            <div className="text-sm space-y-1">
                              {parsedVariants.length > 0 ? (
                                <>
                                  {parsedVariants.map((v) => (
                                    <Badge
                                      key={v.id}
                                      variant={v.stock_quantity === 0 ? "destructive" : "default"}
                                    >
                                      {v.size} {v.color}: {v.stock_quantity}
                                    </Badge>
                                  ))}
                                  <div className="text-xs text-muted-foreground mt-1">
                                    Min level: {product.min_stock_level}
                                  </div>
                                </>
                              ) : (
                                <>
                                  <div>{product.current_stock} {product.unit}</div>
                                  <div className="text-muted-foreground text-xs">
                                    Min: {product.min_stock_level}
                                  </div>
                                </>
                              )}
                            </div>
                          </TableCell>
                          {/* <TableCell>₹{product.unit_price.toFixed(2)}</TableCell> */}
                          <TableCell>
                            <div className="text-sm space-y-1">
                              {parsedVariants.map((v) => (
                                <div key={v.id} className="flex justify-between">
                                  <span>
                                    {v.size} / {v.color}
                                  </span>
                                  <span>₹{v.unit_price?.toFixed(2) || 0}</span>
                                </div>
                              ))}
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge variant={stockStatus.variant}>{stockStatus.status}</Badge>
                          </TableCell>
                          <TableCell>
                            <div className="flex gap-2">
                              <Button size="sm" variant="outline" onClick={() => handleEdit(product)}>
                                <Edit className="w-4 h-4" />
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleDeleteProduct(product.id)}
                                className="text-red-600 hover:text-red-700"
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                              <Button size="sm" onClick={() => setViewProduct(product)}>
                                View
                              </Button>
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
        <Dialog open={!!viewProduct} onOpenChange={() => setViewProduct(null)}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>{viewProduct?.name}</DialogTitle>
            </DialogHeader>

            <div className="space-y-3">
              {viewProduct &&
                parseVariants(viewProduct).map((v) => (
                  <div
                    key={v.id}
                    className="border p-3 rounded-md flex justify-between"
                  >
                    <div>
                      <div className="font-medium">
                        {v.size} / {v.color} / {v.brand}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        HSN: {v.hsn_code}
                      </div>
                    </div>

                    <div className="text-right">
                      <div>₹{v.unit_price}</div>
                      <div className="text-xs">Stock: {v.stock_quantity}</div>
                    </div>
                  </div>
                ))}
            </div>
          </DialogContent>
        </Dialog>
        {/* Add/Edit Product Dialog */}
        <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                {editingProduct ? "Edit Product" : "Add New Product"}
              </DialogTitle>
              <DialogDescription>
                {editingProduct ? "Update product information" : "Add a new product to your inventory"}
              </DialogDescription>
            </DialogHeader>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="name">Product Name *</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData((prev) => ({ ...prev, name: e.target.value }))}
                  placeholder="Enter product name"
                />
              </div>
              {/* <div>
                <Label htmlFor="sku">SKU</Label>
                <Input
                  id="sku"
                  value={formData.sku}
                  onChange={(e) => setFormData((prev) => ({ ...prev, sku: e.target.value }))}
                  placeholder="Product SKU"
                />
              </div> */}
              <div className="md:col-span-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData((prev) => ({ ...prev, description: e.target.value }))}
                  placeholder="Product description"
                />
              </div>
              <div>
                <Label htmlFor="category">Category</Label>
                <Select
                  value={formData.category}
                  onValueChange={(value) => setFormData((prev) => ({ ...prev, category: value }))}
                >
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
                <Label htmlFor="unit">Unit</Label>
                <Select
                  value={formData.unit}
                  onValueChange={(value) => setFormData((prev) => ({ ...prev, unit: value }))}
                >
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


              {/* <div>
                <Label htmlFor="current_stock">Current Stock *</Label>
                <Input
                  id="current_stock"
                  type="number"
                  value={formData.current_stock}
                  onChange={(e) => setFormData((prev) => ({ ...prev, current_stock: parseInt(e.target.value) || 0 }))}
                />
              </div> */}


              {/* <div>
                <Label htmlFor="max_stock_level">Max Stock Level</Label>
                <Input
                  id="max_stock_level"
                  type="number"
                  value={formData.max_stock_level}
                  onChange={(e) => setFormData((prev) => ({ ...prev, max_stock_level: parseInt(e.target.value) || 0 }))}
                />
              </div> */}
              {/* <div>
                <Label htmlFor="barcode">Barcode</Label>
                <Input
                  id="barcode"
                  value={formData.barcode}
                  onChange={(e) => setFormData((prev) => ({ ...prev, barcode: e.target.value }))}
                  placeholder="Product barcode"
                />
              </div> */}


              {/* ✅ Variants Section — Size + Color + Brand + Stock */}
              <div className="md:col-span-2 space-y-3">
                <div className="flex items-center justify-between">
                  <Label className="text-base font-semibold">Variants</Label>
                  <span className="text-xs text-muted-foreground">Size · Color · Brand · Stock</span>
                </div>

                {formData.variants.length === 0 && (
                  <p className="text-sm text-muted-foreground">
                    No variants added yet. Click "+ Add Variant" to begin.
                  </p>
                )}

                {formData.variants.map((variant, index) => (
                  <div
                    key={variant.id}
                    className="border rounded-md p-3 bg-muted/20 space-y-2"
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-medium text-muted-foreground">
                        Variant #{index + 1}
                      </span>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-red-500 hover:text-red-700 h-6 px-2 text-xs"
                        onClick={() => removeVariant(variant.id)}
                      >
                        Remove
                      </Button>
                    </div>

                    {/* Row 1: Size, Color, Brand */}
                    <div className="grid grid-cols-3 gap-2">
                      <div>
                        <Label className="text-xs mb-1 block">Size</Label>
                        <Select
                          value={variant.size}
                          onValueChange={(val) => updateVariant(variant.id, { size: val })}
                        >
                          <SelectTrigger className="h-8 text-sm"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            {SIZES.map((s) => (
                              <SelectItem key={s} value={s}>{s}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      <div>
                        <Label className="text-xs mb-1 block">Color</Label>
                        <Select
                          value={variant.color}
                          onValueChange={(val) => updateVariant(variant.id, { color: val })}
                        >
                          <SelectTrigger className="h-8 text-sm"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            {COLORS.map((c) => (
                              <SelectItem key={c} value={c}>{c}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      <div>
                        <Label htmlFor="unit_price">Unit Price (₹) *</Label>
                        <Input
                          id="unit_price"
                          type="number"
                          step="0.01"
                          // value={formData.unit_price}
                          value={variant.unit_price}
                          onChange={(e) =>
                            updateVariant(variant.id, {
                              unit_price: parseFloat(e.target.value) || 0,
                            })
                          }
                        // onChange={(e) => setFormData((prev) => ({ ...prev, unit_price: parseFloat(e.target.value) || 0 }))}
                        />
                      </div>
                      <div>
                        <Label htmlFor="min_stock_level">Min Stock Level</Label>
                        <Input
                          id="min_stock_level"
                          type="number"
                          // value={formData.min_stock_level}
                          // onChange={(e) => setFormData((prev) => ({ ...prev, min_stock_level: parseInt(e.target.value) || 0 }))}
                          value={variant.min_stock_level}
                          onChange={(e) =>
                            updateVariant(variant.id, {
                              min_stock_level: parseFloat(e.target.value) || 0,
                            })
                          }
                        />
                      </div>
                      <div>
                        <Label htmlFor="hsn_code">HSN Code</Label>
                        <Input
                          id="hsn_code"
                          // value={formData.hsn_code}
                          // onChange={(e) => setFormData((prev) => ({ ...prev, hsn_code: e.target.value }))}
                          // value={variant.hsn_code}
                          value={variant.hsn_code}
                          onChange={(e) =>
                            updateVariant(variant.id, {
                              hsn_code: e.target.value,
                            })
                          }
                          placeholder="Enter HSN Code"
                        />
                      </div>
                      <div>
                        <Label htmlFor="cost_price">Cost Price (₹)</Label>
                        <Input
                          id="cost_price"
                          type="number"
                          step="0.01"
                          // value={formData.cost_price}
                          // onChange={(e) => setFormData((prev) => ({ ...prev, cost_price: parseFloat(e.target.value) || 0 }))}
                          value={variant.cost_price}
                          onChange={(e) =>
                            updateVariant(variant.id, {
                              cost_price: parseFloat(e.target.value) || 0,
                            })
                          }
                        />
                      </div>
                      {/* ✅ Brand — new extra field */}
                      <div>
                        <Label className="text-xs mb-1 block">Brand</Label>
                        <Select
                          value={variant.brand}
                          onValueChange={(val) => updateVariant(variant.id, { brand: val })}
                        >
                          <SelectTrigger className="h-8 text-sm"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            {BRANDS.map((b) => (
                              <SelectItem key={b} value={b}>{b}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    {/* Row 2: Stock Quantity */}
                    <div className="grid grid-cols-3 gap-2">
                      <div>
                        <Label className="text-xs mb-1 block">Stock Quantity</Label>
                        <Input
                          type="number"
                          min={0}
                          className="h-8 text-sm"
                          value={variant.stock_quantity}
                          onChange={(e) =>
                            updateVariant(variant.id, {
                              stock_quantity: parseInt(e.target.value) || 0,
                            })
                          }
                        />
                      </div>
                    </div>
                  </div>
                ))}

                <Button variant="outline" type="button" className="w-full" onClick={addVariant}>
                  + Add Variant
                </Button>
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={resetForm}>Cancel</Button>
              <Button onClick={handleSaveProduct}>
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