// src/components/ProductViewDialog.tsx

import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Image, Tag, Hash, Barcode, Layers, TrendingUp,
  AlertTriangle, CheckCircle, XCircle, CalendarDays, Package,
} from "lucide-react";

// ── Types (mirror what Inventory.tsx uses) ────────────────────────────────────
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

export interface VariantRow {
  id: string;
  stock_quantity: number;
  unit_price: number;
  cost_price: number;
  hsn_code: string;
  min_stock_level: number;
  [key: string]: any;
}

export interface VariantField {
  key: string;
  label: string;
  type: "text" | "select" | "number";
  options?: string[];
  placeholder?: string;
}

export interface BusinessTypeConfig {
  label: string;
  icon: string;
  variantFields: VariantField[];
  defaultVariant: Record<string, any>;
}

interface ProductViewDialogProps {
  product: InventoryProduct | null;
  onClose: () => void;
  effectiveConfig: BusinessTypeConfig;
  onEdit?: (product: InventoryProduct) => void;
}

// ── Per-business-type color themes ───────────────────────────────────────────
const THEMES: Record<string, {
  gradient: string; accent: string; accentText: string;
  chipBg: string; chipText: string; border: string;
}> = {
  clothing:    { gradient: "from-rose-100 via-pink-50 to-white",    accent: "bg-rose-500",    accentText: "text-rose-600",    chipBg: "bg-rose-100",    chipText: "text-rose-700",    border: "border-rose-200" },
  electronics: { gradient: "from-blue-100 via-indigo-50 to-white",  accent: "bg-blue-600",    accentText: "text-blue-600",    chipBg: "bg-blue-100",    chipText: "text-blue-700",    border: "border-blue-200" },
  food:        { gradient: "from-orange-100 via-amber-50 to-white", accent: "bg-orange-500",  accentText: "text-orange-600",  chipBg: "bg-orange-100",  chipText: "text-orange-700",  border: "border-orange-200" },
  furniture:   { gradient: "from-amber-100 via-yellow-50 to-white", accent: "bg-amber-600",   accentText: "text-amber-700",   chipBg: "bg-amber-100",   chipText: "text-amber-700",   border: "border-amber-200" },
  medicine:    { gradient: "from-teal-100 via-cyan-50 to-white",    accent: "bg-teal-600",    accentText: "text-teal-600",    chipBg: "bg-teal-100",    chipText: "text-teal-700",    border: "border-teal-200" },
  custom:      { gradient: "from-violet-100 via-purple-50 to-white",accent: "bg-violet-600",  accentText: "text-violet-600",  chipBg: "bg-violet-100",  chipText: "text-violet-700",  border: "border-violet-200" },
};

const getTheme = (category: string | null) => {
  const key = (category || "").toLowerCase();
  return THEMES[key] ?? THEMES.custom;
};

// ── Helpers ───────────────────────────────────────────────────────────────────
const parseVariants = (product: InventoryProduct): VariantRow[] => {
  try { return product.variants ? JSON.parse(product.variants) : []; }
  catch { return []; }
};

const fmt = (n: number) => n.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const fmtDate = (iso: string) =>
  new Date(iso).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });

// ── Component ─────────────────────────────────────────────────────────────────
export function ProductViewDialog({ product, onClose, effectiveConfig, onEdit }: ProductViewDialogProps) {
  if (!product) return null;

  const variants = parseVariants(product);
  const theme = getTheme(product.category);
  const totalStock = variants.length
    ? variants.reduce((s, v) => s + (v.stock_quantity || 0), 0)
    : product.current_stock;

  const stockStatus =
    totalStock === 0          ? { label: "Out of Stock", cls: "bg-red-100 text-red-700 border-red-200",       Icon: XCircle }
    : totalStock <= product.min_stock_level ? { label: "Low Stock",     cls: "bg-yellow-100 text-yellow-700 border-yellow-200", Icon: AlertTriangle }
    :                           { label: "In Stock",     cls: "bg-green-100 text-green-700 border-green-200",  Icon: CheckCircle };

  const getVariantLabel = (v: VariantRow) =>
    effectiveConfig.variantFields.map((f) => v[f.key]).filter(Boolean).slice(0, 3).join(" / ") || "Default";

  const totalStockValue = variants.reduce((s, v) => s + (v.unit_price || 0) * (v.stock_quantity || 0), 0);
  const totalCostValue  = variants.reduce((s, v) => s + (v.cost_price  || 0) * (v.stock_quantity || 0), 0);
  const potentialProfit = totalStockValue - totalCostValue;

  return (
    <Dialog open={!!product} onOpenChange={() => onClose()}>
      <DialogContent className="max-w-2xl max-h-[92vh] overflow-y-auto p-0 gap-0 rounded-2xl">

        {/* ── Hero ── */}
        <div className={`bg-gradient-to-br ${theme.gradient} rounded-t-2xl`}>
          <div className="flex gap-5 p-6">
            {/* Photo */}
            <div className="shrink-0">
              {product.photo_url ? (
                <img src={product.photo_url} alt={product.name} className="w-36 h-36 object-cover rounded-2xl border-2 border-white shadow-lg" />
              ) : (
                <div className="w-36 h-36 rounded-2xl border-2 border-dashed border-gray-300 bg-white/60 flex flex-col items-center justify-center">
                  <Image className="w-9 h-9 text-gray-300" />
                  <span className="text-[10px] text-gray-400 mt-1.5">No Photo</span>
                </div>
              )}
            </div>
            {/* Meta */}
            <div className="flex-1 min-w-0 py-1">
              <p className={`text-[11px] font-bold uppercase tracking-widest mb-1.5 ${theme.accentText}`}>
                {effectiveConfig.icon} {effectiveConfig.label}
              </p>
              <h2 className="text-2xl font-bold text-gray-900 leading-snug">{product.name}</h2>
              {product.description && (
                <p className="text-sm text-gray-500 mt-1.5 leading-relaxed line-clamp-2">{product.description}</p>
              )}
              <div className="flex flex-wrap gap-1.5 mt-3">
                <Badge className={`${stockStatus.cls} border flex items-center gap-1 text-xs`}>
                  <stockStatus.Icon className="w-3 h-3" />{stockStatus.label}
                </Badge>
                {product.sku && (
                  <span className={`inline-flex items-center gap-1 text-xs border rounded-full px-2.5 py-0.5 bg-white/70 ${theme.border} text-gray-600`}>
                    <Hash className="w-3 h-3" />{product.sku}
                  </span>
                )}
                {product.category && (
                  <span className={`inline-flex items-center gap-1 text-xs border rounded-full px-2.5 py-0.5 ${theme.chipBg} ${theme.chipText} ${theme.border}`}>
                    <Tag className="w-3 h-3" />{product.category}
                  </span>
                )}
                {product.barcode && (
                  <span className="inline-flex items-center gap-1 text-xs border border-gray-200 rounded-full px-2.5 py-0.5 bg-white/70 text-gray-500">
                    <Barcode className="w-3 h-3" />{product.barcode}
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Summary stats bar */}
          <div className="grid grid-cols-4 border-t border-white/50 bg-white/30 backdrop-blur-sm divide-x divide-white/50">
            {[
              { label: "Total Stock",  value: `${totalStock}`, sub: product.unit },
              { label: "Variants",     value: `${variants.length || 1}` },
              { label: "Min Stock",    value: `${product.min_stock_level}`, sub: product.unit },
              { label: "Stock Value",  value: `₹${fmt(totalStockValue)}` },
            ].map(({ label, value, sub }) => (
              <div key={label} className="px-4 py-3 text-center">
                <p className="text-[10px] text-gray-500 uppercase tracking-wide mb-0.5">{label}</p>
                <p className="text-base font-bold text-gray-900">
                  {value} {sub && <span className="text-xs font-normal text-gray-400">{sub}</span>}
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* ── Variants ── */}
        <div className="p-6 space-y-4">
          <div className="flex items-center gap-2 mb-1">
            <Layers className="w-4 h-4 text-gray-400" />
            <h3 className="text-sm font-semibold text-gray-700">
              Variants & Details
              <span className="ml-2 text-xs font-normal text-gray-400">
                ({effectiveConfig.variantFields.map((f) => f.label).join(", ")})
              </span>
            </h3>
          </div>

          {variants.length === 0 ? (
            <div className="rounded-xl border border-dashed border-gray-200 py-10 text-center text-gray-400">
              <Package className="w-8 h-8 mx-auto mb-2 opacity-30" />
              <p className="text-sm">No variants — single product</p>
            </div>
          ) : (
            <div className="space-y-3">
              {variants.map((variant, idx) => {
                const vStock = variant.stock_quantity || 0;
                const vMin   = variant.min_stock_level || 0;
                const borderCls =
                  vStock === 0     ? "border-red-200 bg-red-50/60"
                  : vStock <= vMin ? "border-yellow-200 bg-yellow-50/60"
                  :                  "border-gray-200 bg-gray-50/60";

                const profit = (variant.unit_price || 0) - (variant.cost_price || 0);
                const margin = variant.unit_price > 0 && variant.cost_price > 0
                  ? ((profit / variant.unit_price) * 100).toFixed(1) : null;

                return (
                  <div key={variant.id} className={`rounded-xl border ${borderCls} p-4`}>
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <span className={`w-6 h-6 rounded-full ${theme.accent} text-white text-[11px] font-bold flex items-center justify-center shrink-0`}>{idx + 1}</span>
                        <span className="font-semibold text-sm text-gray-900">{getVariantLabel(variant)}</span>
                      </div>
                      <Badge className={
                        vStock === 0     ? "bg-red-100 text-red-700 border-red-200 text-xs border"
                        : vStock <= vMin ? "bg-yellow-100 text-yellow-700 border-yellow-200 text-xs border"
                        :                  "bg-green-100 text-green-700 border-green-200 text-xs border"
                      }>
                        {vStock === 0 ? "Out of Stock" : vStock <= vMin ? "Low Stock" : "In Stock"}
                      </Badge>
                    </div>
                    {effectiveConfig.variantFields.length > 0 && (
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-x-4 gap-y-2 mb-3 pb-3 border-b border-gray-200/70">
                        {effectiveConfig.variantFields.map((field) => {
                          const val = variant[field.key];
                          if (val === undefined || val === null || val === "") return null;
                          return (
                            <div key={field.key}>
                              <p className="text-[10px] uppercase tracking-wide text-gray-400 mb-0.5">{field.label}</p>
                              <p className="text-sm font-semibold text-gray-800">{val}</p>
                            </div>
                          );
                        })}
                      </div>
                    )}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                      <div>
                        <p className="text-[10px] uppercase tracking-wide text-gray-400 mb-0.5">💰 Sell Price</p>
                        <p className="text-sm font-bold text-gray-900">₹{fmt(variant.unit_price || 0)}</p>
                      </div>
                      <div>
                        <p className="text-[10px] uppercase tracking-wide text-gray-400 mb-0.5">🏷️ Cost Price</p>
                        <p className="text-sm font-medium text-gray-700">₹{fmt(variant.cost_price || 0)}</p>
                      </div>
                      <div>
                        <p className="text-[10px] uppercase tracking-wide text-gray-400 mb-0.5">📦 Stock</p>
                        <p className="text-sm font-bold text-gray-900">{vStock}</p>
                      </div>
                      <div>
                        <p className="text-[10px] uppercase tracking-wide text-gray-400 mb-0.5">⚠️ Min Stock</p>
                        <p className="text-sm font-medium text-gray-700">{vMin}</p>
                      </div>
                      {variant.hsn_code && (
                        <div className="col-span-2">
                          <p className="text-[10px] uppercase tracking-wide text-gray-400 mb-0.5">🔢 HSN Code</p>
                          <p className="text-sm font-mono text-gray-700">{variant.hsn_code}</p>
                        </div>
                      )}
                    </div>
                    {margin !== null && (
                      <div className="mt-3 pt-2 border-t border-gray-200/60 flex flex-wrap items-center gap-4 text-xs text-gray-500">
                        <span className="flex items-center gap-1">
                          <TrendingUp className="w-3 h-3 text-green-500" />
                          Profit/unit: <strong className="text-green-600 ml-1">₹{fmt(profit)}</strong>
                        </span>
                        <span>Margin: <strong className="text-green-600">{margin}%</strong></span>
                        <span>Stock value: <strong className="text-blue-600">₹{fmt((variant.unit_price || 0) * vStock)}</strong></span>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {variants.length > 1 && totalCostValue > 0 && (
            <div className="rounded-xl bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200 p-4">
              <p className="text-xs font-bold uppercase tracking-wide text-green-700 mb-2">📊 Overall Financials</p>
              <div className="grid grid-cols-3 gap-3 text-sm">
                <div>
                  <p className="text-[10px] text-gray-500 mb-0.5">Total Stock Value</p>
                  <p className="font-bold text-gray-900">₹{fmt(totalStockValue)}</p>
                </div>
                <div>
                  <p className="text-[10px] text-gray-500 mb-0.5">Total Cost Value</p>
                  <p className="font-bold text-gray-900">₹{fmt(totalCostValue)}</p>
                </div>
                <div>
                  <p className="text-[10px] text-gray-500 mb-0.5">Potential Profit</p>
                  <p className={`font-bold ${potentialProfit >= 0 ? "text-green-700" : "text-red-600"}`}>₹{fmt(potentialProfit)}</p>
                </div>
              </div>
            </div>
          )}

          <div className="pt-3 border-t border-gray-100 flex items-center justify-between flex-wrap gap-2">
            <div className="flex gap-4 text-xs text-gray-400">
              <span className="flex items-center gap-1"><CalendarDays className="w-3 h-3" />Added: {fmtDate(product.created_at)}</span>
              <span className="flex items-center gap-1"><CalendarDays className="w-3 h-3" />Updated: {fmtDate(product.updated_at)}</span>
            </div>
            {onEdit && (
              <Button size="sm" variant="outline" onClick={() => { onClose(); onEdit(product); }}>Edit Product</Button>
            )}
          </div>
        </div>

      </DialogContent>
    </Dialog>
  );
}

export default ProductViewDialog;