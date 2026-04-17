import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Search, Package } from "lucide-react";
import { InventoryProduct } from "@/pages/Inventory";

// ✅ Variant type matching what Inventory.tsx stores
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

interface ProductSelectorProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  // ✅ Fixed: 3-argument signature with optional variant
  onSelectProduct: (product: InventoryProduct, quantity: number, variant?: VariantRow) => void;
}

const ProductSelector = ({ open, onOpenChange, onSelectProduct }: ProductSelectorProps) => {
  const { user } = useAuth();
  const [products, setProducts] = useState<InventoryProduct[]>([]);
  const [filteredProducts, setFilteredProducts] = useState<InventoryProduct[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedProduct, setSelectedProduct] = useState<InventoryProduct | null>(null);
  const [selectedVariant, setSelectedVariant] = useState<VariantRow | null>(null);
  const [quantity, setQuantity] = useState(1);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (open && user) {
      fetchProducts();
    }
  }, [open, user]);

  useEffect(() => {
    filterProducts();
  }, [products, searchTerm]);

  // Reset selection state when dialog closes
  useEffect(() => {
    if (!open) {
      setSelectedProduct(null);
      setSelectedVariant(null);
      setQuantity(1);
      setSearchTerm("");
    }
  }, [open]);

  const fetchProducts = async () => {
    if (!user) return;
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from("inventory_products")
        .select("*")
        .eq("user_id", user.id)
        .eq("is_active", true)
        .order("name");

      if (error) throw error;
      setProducts(data || []);
    } catch (error) {
      console.error("Error fetching products:", error);
    }
    setIsLoading(false);
  };

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
    setFilteredProducts(filtered);
  };

  const parseVariants = (product: InventoryProduct): VariantRow[] => {
    try {
      return (product as any).variants ? JSON.parse((product as any).variants) : [];
    } catch {
      return [];
    }
  };

  const handleSelectProduct = (product: InventoryProduct) => {
    setSelectedProduct(product);
    setSelectedVariant(null); // reset variant when switching product
    setQuantity(1);
  };

  const handleSelectVariant = (variant: VariantRow) => {
    setSelectedVariant(variant);
    setQuantity(1);
  };

  // ✅ Stock deduction: update the specific variant's stock_quantity in Supabase
  const deductVariantStock = async (
    product: InventoryProduct,
    variant: VariantRow,
    qty: number
  ) => {
    const allVariants = parseVariants(product);
    const updated = allVariants.map((v) =>
      v.id === variant.id
        ? { ...v, stock_quantity: Math.max(0, v.stock_quantity - qty) }
        : v
    );

    const { error } = await supabase
      .from("inventory_products")
      .update({ variants: JSON.stringify(updated) })
      .eq("id", product.id);

    if (error) {
      console.error("Failed to deduct stock:", error);
    }
  };

  const handleAddToInvoice = async () => {
    if (!selectedProduct || quantity <= 0) return;

    const variants = parseVariants(selectedProduct);

    if (variants.length > 0 && !selectedVariant) {
      // Has variants but none selected — don't proceed
      return;
    }

    // ✅ Deduct stock from the selected variant (or base stock if no variants)
    if (selectedVariant) {
      await deductVariantStock(selectedProduct, selectedVariant, quantity);
    } else {
      // No variants — deduct from base current_stock
      const newStock = Math.max(0, selectedProduct.current_stock - quantity);
      await supabase
        .from("inventory_products")
        .update({ current_stock: newStock })
        .eq("id", selectedProduct.id);
    }

    onSelectProduct(selectedProduct, quantity, selectedVariant ?? undefined);
    onOpenChange(false);
  };

  const getStockStatus = (product: InventoryProduct) => {
    const variants = parseVariants(product);
    if (variants.length > 0) {
      const totalStock = variants.reduce((sum, v) => sum + v.stock_quantity, 0);
      if (totalStock === 0) return { status: "Out of Stock", variant: "destructive" as const, available: false };
      if (totalStock <= product.min_stock_level) return { status: "Low Stock", variant: "secondary" as const, available: true };
      return { status: "In Stock", variant: "default" as const, available: true };
    }
    if (product.current_stock === 0) return { status: "Out of Stock", variant: "destructive" as const, available: false };
    if (product.current_stock <= product.min_stock_level) return { status: "Low Stock", variant: "secondary" as const, available: true };
    return { status: "In Stock", variant: "default" as const, available: true };
  };

  const variants = selectedProduct ? parseVariants(selectedProduct) : [];
  const maxQty = selectedVariant
    ? selectedVariant.stock_quantity
    : selectedProduct?.current_stock ?? 0;
  const unitPrice = selectedVariant
    ? selectedVariant.unit_price
    : selectedProduct?.unit_price ?? 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center">
            <Package className="w-5 h-5 mr-2" />
            Select Product from Inventory
          </DialogTitle>
          <DialogDescription>
            Choose a product from your inventory to add to the invoice
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-hidden flex flex-col space-y-4">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
            <Input
              placeholder="Search products by name, SKU, or description..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>

          {/* Products Table */}
          <div className="flex-1 overflow-auto border rounded-lg">
            {isLoading ? (
              <div className="flex items-center justify-center py-8">Loading products...</div>
            ) : filteredProducts.length === 0 ? (
              <div className="flex items-center justify-center py-8 text-muted-foreground">
                No products found
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Product</TableHead>
                    <TableHead>SKU</TableHead>
                    <TableHead>Stock</TableHead>
                    <TableHead>Unit Price</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredProducts.map((product) => {
                    const stockStatus = getStockStatus(product);
                    const productVariants = parseVariants(product);
                    return (
                      <TableRow
                        key={product.id}
                        className={selectedProduct?.id === product.id ? "bg-muted" : ""}
                      >
                        <TableCell>
                          <div>
                            <div className="font-medium">{product.name}</div>
                            {product.description && (
                              <div className="text-sm text-muted-foreground">{product.description}</div>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>{product.sku || "-"}</TableCell>
                        <TableCell>
                          <div className="text-sm">
                            {productVariants.length > 0 ? (
                              <span>{productVariants.reduce((s, v) => s + v.stock_quantity, 0)} {product.unit} (variants)</span>
                            ) : (
                              <span>{product.current_stock} {product.unit}</span>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          {productVariants.length > 0 ? (
                            <span className="text-xs text-muted-foreground">See variants</span>
                          ) : (
                            <span>₹{product.unit_price.toFixed(2)}</span>
                          )}
                        </TableCell>
                        <TableCell>
                          <Badge variant={stockStatus.variant}>{stockStatus.status}</Badge>
                        </TableCell>
                        <TableCell>
                          <Button
                            size="sm"
                            variant={selectedProduct?.id === product.id ? "default" : "outline"}
                            onClick={() => handleSelectProduct(product)}
                            disabled={!stockStatus.available}
                          >
                            {selectedProduct?.id === product.id ? "Selected" : "Select"}
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            )}
          </div>

          {/* Selected Product Details */}
          {selectedProduct && (
            <div className="border rounded-lg p-4 bg-muted/50 space-y-3">
              <h4 className="font-medium">{selectedProduct.name}</h4>

              {/* ✅ Variant Selection */}
              {variants.length > 0 ? (
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">Select a Variant</Label>
                  <div className="flex flex-wrap gap-2">
                    {variants.map((v) => (
                      <button
                        key={v.id}
                        onClick={() => handleSelectVariant(v)}
                        disabled={v.stock_quantity === 0}
                        className={`px-3 py-1.5 rounded border text-sm transition-colors
                          ${selectedVariant?.id === v.id
                            ? "bg-primary text-primary-foreground border-primary"
                            : v.stock_quantity === 0
                            ? "opacity-40 cursor-not-allowed border-muted"
                            : "hover:bg-muted border-border"
                          }`}
                      >
                        {v.size} / {v.color} / {v.brand}
                        <span className="ml-1 text-xs opacity-70">
                          (₹{v.unit_price} · {v.stock_quantity} left)
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              ) : null}

              {/* Quantity + Total — show when variant selected (or no variants) */}
              {(variants.length === 0 || selectedVariant) && (
                <div className="grid grid-cols-2 gap-4 items-end">
                  <div>
                    <Label>Quantity</Label>
                    <Input
                      type="number"
                      min={1}
                      max={maxQty}
                      value={quantity}
                      onChange={(e) => setQuantity(Math.min(parseInt(e.target.value) || 1, maxQty))}
                    />
                    <div className="text-xs text-muted-foreground mt-1">
                      Available: {maxQty}
                    </div>
                  </div>
                  <div>
                    <Label>Total</Label>
                    <div className="font-bold text-lg">
                      ₹{(unitPrice * quantity).toFixed(2)}
                    </div>
                  </div>
                </div>
              )}

              <Button
                onClick={handleAddToInvoice}
                disabled={variants.length > 0 && !selectedVariant}
                className="w-full"
              >
                {variants.length > 0 && !selectedVariant
                  ? "Select a variant first"
                  : "Add to Invoice"}
              </Button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ProductSelector;