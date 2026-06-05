import { useState, useRef, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Trash2, ChevronDown, ChevronUp, Package } from "lucide-react";
import { InvoiceItem as InvoiceItemType } from "@/pages/Invoices";


export interface InventorySearchResult {
  id: string;
  name: string;
  description?: string;
  sku?: string;
  unit_price: number;
  hsn_code?: string;
  current_stock?: number;
}

interface InvoiceItemProps {
  item: InvoiceItemType;
  onUpdate: (updatedItem: Partial<InvoiceItemType>) => void;
  onDelete: () => void;
  onInventorySearch?: (query: string) => Promise<InventorySearchResult[]>;
}

const InvoiceItem = ({ item, onUpdate, onDelete, onInventorySearch }: InvoiceItemProps) => {
  const [expanded, setExpanded] = useState(false);
  const [suggestions, setSuggestions] = useState<InventorySearchResult[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const searchTimeout = useRef<NodeJS.Timeout>();
  const wrapperRef = useRef<HTMLDivElement>(null);
  const [dropdownPos, setDropdownPos] = useState({ top: 0, left: 0, width: 0 });
  const inputRef = useRef<HTMLInputElement>(null);
  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setShowSuggestions(false);
      }
    };
    const handleScroll = () => setShowSuggestions(false); // ← add this

    document.addEventListener("mousedown", handleClickOutside);
    window.addEventListener("scroll", handleScroll, true); // ← add this
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      window.removeEventListener("scroll", handleScroll, true); // ← add this
    };
  }, []);

  const compute = (patch: Partial<InvoiceItemType>) => {
    const merged = { ...item, ...patch };
    const qty = merged.quantity ?? 1;
    const rate = merged.unitPrice ?? 0;
    const base = qty * rate;

    const discType = merged.itemDiscountType ?? "flat";
    const discVal = merged.itemDiscountValue ?? 0;
    const discAmt = discType === "percentage" ? (base * discVal) / 100 : discVal;

    const afterDiscount = Math.max(0, base - discAmt);
    const taxRate = merged.itemTaxRate ?? 0;
    const taxAmt = (afterDiscount * taxRate) / 100;
    const amount = afterDiscount + taxAmt;

    onUpdate({
      ...patch,
      itemDiscountAmount: parseFloat(discAmt.toFixed(2)),
      itemTaxAmount: parseFloat(taxAmt.toFixed(2)),
      amount: parseFloat(amount.toFixed(2)),
    });
  };

  const handleDescriptionChange = async (value: string) => {
    compute({ description: value });

    if (!onInventorySearch) return;
    clearTimeout(searchTimeout.current);

    if (value.length < 2) {
      setSuggestions([]);
      setShowSuggestions(false);
      return;
    }

    // Calculate position from input
    if (inputRef.current) {
      const rect = inputRef.current.getBoundingClientRect();
      setDropdownPos({
        top: rect.bottom + 4,       // ← remove window.scrollY
        left: rect.left,            // ← remove window.scrollX
        width: rect.width,
      });
    }

    setIsSearching(true);
    searchTimeout.current = setTimeout(async () => {
      const results = await onInventorySearch(value);
      setSuggestions(results);
      setShowSuggestions(results.length > 0);
      setIsSearching(false);
    }, 300);
  };

  const handleSelectSuggestion = (product: InventorySearchResult) => {
  if ((product.current_stock ?? 0) <= 0) {
    // Already visually blocked — just close silently
    setSuggestions([]);
    setShowSuggestions(false);
    return;
  }

  compute({
    description: product.name,
    unitPrice: product.unit_price,
    hsnCode: product.hsn_code ?? "",
    orderId: product.sku ?? "",
    inventoryProductId: product.id,  // ← critical: enables deduction + validation
  });
  setSuggestions([]);
  setShowSuggestions(false);
};

  const base = (item.quantity ?? 1) * (item.unitPrice ?? 0);

  return (
    <div className="border border-gray-200 rounded-xl mb-3 overflow-hidden bg-white shadow-sm">

      {/* ── Main Row ── */}
      <div className="grid grid-cols-12 gap-2 p-3 items-end">

        {/* Item Name with autocomplete */}
        {/* Item Name with autocomplete */}
        <div className="col-span-4" ref={wrapperRef}>
          <Label className="text-xs text-gray-400 mb-1 block">Item Name</Label>
          <div className="relative">
            <Input
              ref={inputRef}
              placeholder="Type to search inventory..."
              value={item.description}
              onChange={(e) => handleDescriptionChange(e.target.value)}
              onFocus={() => {
                if (suggestions.length > 0 && inputRef.current) {
                  const rect = inputRef.current.getBoundingClientRect();
                  setDropdownPos({
                    top: rect.bottom + 4,       // ← remove window.scrollY
                    left: rect.left,            // ← remove window.scrollX
                    width: rect.width,
                  });
                  setShowSuggestions(true);
                }

              }}
              autoComplete="off"
            />
            {isSearching && (
              <div className="absolute right-2 top-1/2 -translate-y-1/2">
                <div className="w-3.5 h-3.5 border-2 border-gray-300 border-t-green-500 rounded-full animate-spin" />
              </div>
            )}
          </div>

          {/* Portal dropdown — renders above everything using fixed position */}
          {showSuggestions && suggestions.length > 0 && typeof window !== "undefined" && (
            <div
              style={{
                position: "fixed",
                top: dropdownPos.top,
                left: dropdownPos.left,
                width: Math.max(dropdownPos.width, 360),
                zIndex: 9999,
              }}
              className="bg-white border border-gray-200 rounded-xl shadow-2xl overflow-hidden"
            >
              <div className="px-3 py-1.5 border-b border-gray-100 bg-gray-50">
                <p className="text-[11px] font-medium text-gray-400 uppercase tracking-wide">
                  Inventory results
                </p>
              </div>

              {suggestions.map((product) => (
                <button
  key={product.id}
  type="button"
  disabled={(product.current_stock ?? 0) <= 0}
  onMouseDown={(e) => {
    e.preventDefault();
    handleSelectSuggestion(product);
  }}
  className={`w-full flex items-center gap-3 px-3 py-2.5 transition-colors text-left border-b border-gray-50 last:border-0 ${
    (product.current_stock ?? 0) <= 0
      ? "opacity-50 cursor-not-allowed bg-gray-50"
      : "hover:bg-green-50"
  }`}
>
                  {/* Icon */}
                  <div className="w-8 h-8 rounded-lg bg-green-50 border border-green-100 flex items-center justify-center shrink-0">
                    <Package className="w-4 h-4 text-green-500" />
                  </div>

                  {/* Name + meta */}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-800 truncate">{product.name}</p>
                    <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                      {product.sku && (
                        <span className="text-xs text-gray-400">SKU: {product.sku}</span>
                      )}
                      {product.hsn_code && (
                        <span className="text-xs text-gray-400">HSN: {product.hsn_code}</span>
                      )}
                    </div>
                  </div>

                  {/* Price + Stock — right side */}
                  <div className="flex flex-col items-end gap-1 shrink-0">
                    <span className="text-sm font-semibold text-gray-800">
                      ₹{product.unit_price.toLocaleString("en-IN")}
                    </span>
                    {product.current_stock !== undefined && (
                      <span
                        className={`text-[11px] font-medium px-2 py-0.5 rounded-full ${product.current_stock <= 0
                            ? "bg-red-50 text-red-500 border border-red-100"
                            : product.current_stock <= 5
                              ? "bg-amber-50 text-amber-600 border border-amber-100"
                              : "bg-green-50 text-green-600 border border-green-100"
                          }`}
                      >
                        {product.current_stock <= 0
                          ? "Out of stock"
                          : `${product.current_stock} in stock`}
                      </span>
                    )}
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>




        {/* HSN */}
        <div className="col-span-2">
          <Label className="text-xs text-gray-400 mb-1 block">HSN Code</Label>
          <Input
            placeholder="e.g. 6109"
            value={item.hsnCode ?? ""}
            onChange={(e) => compute({ hsnCode: e.target.value })}
          />
        </div>

        {/* Qty */}
        <div className="col-span-1">
          <Label className="text-xs text-gray-400 mb-1 block">Qty</Label>
          <Input
            type="number"
            min={1}
            value={item.quantity}
            onChange={(e) => compute({ quantity: parseFloat(e.target.value) || 1 })}
          />
        </div>

        {/* Rate */}
        <div className="col-span-2">
          <Label className="text-xs text-gray-400 mb-1 block">Rate (₹)</Label>
          <Input
            type="number"
            min={0}
            value={item.unitPrice}
            onChange={(e) => compute({ unitPrice: parseFloat(e.target.value) || 0 })}
          />
        </div>

        {/* Amount */}
        <div className="col-span-2">
          <Label className="text-xs text-gray-400 mb-1 block">Amount</Label>
          <div className="h-9 flex items-center px-3 rounded-md border bg-gray-50 text-sm font-semibold text-gray-800">
            ₹{(item.amount ?? 0).toFixed(2)}
          </div>
        </div>

        {/* Actions */}
        <div className="col-span-1 flex gap-0.5 justify-end">
          <Button
            variant="ghost" size="icon"
            className="h-9 w-9 text-gray-400 hover:text-gray-700"
            onClick={() => setExpanded((v) => !v)}
            title="Discount & Tax"
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

      {/* ── Inline summary pills ── */}
      {!expanded && ((item.itemDiscountValue ?? 0) > 0 || (item.itemTaxRate ?? 0) > 0) && (
        <div className="flex gap-2 px-3 pb-2">
          {(item.itemDiscountValue ?? 0) > 0 && (
            <span className="text-xs bg-red-50 text-red-600 border border-red-100 rounded-full px-2 py-0.5">
              Disc: {item.itemDiscountType === "percentage" ? `${item.itemDiscountValue}%` : `₹${item.itemDiscountValue}`} = −₹{(item.itemDiscountAmount ?? 0).toFixed(2)}
            </span>
          )}
          {(item.itemTaxRate ?? 0) > 0 && (
            <span className="text-xs bg-green-50 text-green-600 border border-green-100 rounded-full px-2 py-0.5">
              Tax {item.itemTaxRate}% = +₹{(item.itemTaxAmount ?? 0).toFixed(2)}
            </span>
          )}
        </div>
      )}

      {/* ── Expanded panel ── */}
      {expanded && (
        <div className="border-t border-gray-100 bg-gray-50 px-3 py-3">
          <div className="flex items-center gap-2 mb-3">
            <span className="text-xs text-gray-400">Base: {item.quantity} × ₹{item.unitPrice} = ₹{base.toFixed(2)}</span>
            {(item.itemDiscountAmount ?? 0) > 0 && (
              <><span className="text-xs text-gray-300">→</span><span className="text-xs text-red-500">−₹{(item.itemDiscountAmount ?? 0).toFixed(2)} disc.</span></>
            )}
            {(item.itemTaxAmount ?? 0) > 0 && (
              <><span className="text-xs text-gray-300">→</span><span className="text-xs text-green-600">+₹{(item.itemTaxAmount ?? 0).toFixed(2)} tax</span></>
            )}
            <span className="text-xs text-gray-300">→</span>
            <span className="text-xs font-semibold text-gray-700">₹{(item.amount ?? 0).toFixed(2)}</span>
          </div>

          <div className="grid grid-cols-12 gap-2 items-end">
            <div className="col-span-2">
              <Label className="text-xs text-gray-400 mb-1 block">Discount Type</Label>
              <Select
                value={item.itemDiscountType ?? "flat"}
                onValueChange={(v: "flat" | "percentage") => compute({ itemDiscountType: v, itemDiscountValue: 0 })}
              >
                <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="flat">Flat (₹)</SelectItem>
                  <SelectItem value="percentage">Percent (%)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="col-span-2">
              <Label className="text-xs text-gray-400 mb-1 block">
                Discount {item.itemDiscountType === "percentage" ? "(%)" : "(₹)"}
              </Label>
              <Input
                type="number" min={0}
                max={item.itemDiscountType === "percentage" ? 100 : undefined}
                value={item.itemDiscountValue ?? 0}
                onChange={(e) => compute({ itemDiscountValue: parseFloat(e.target.value) || 0 })}
              />
            </div>

            <div className="col-span-2">
              <Label className="text-xs text-gray-400 mb-1 block">Disc. Amount</Label>
              <div className="h-9 flex items-center px-3 rounded-md border bg-white text-sm text-red-500 font-medium">
                −₹{(item.itemDiscountAmount ?? 0).toFixed(2)}
              </div>
            </div>

            <div className="col-span-1" />

            <div className="col-span-2">
              <Label className="text-xs text-gray-400 mb-1 block">Tax Rate (%)</Label>
              <Input
                type="number" min={0} max={100}
                value={item.itemTaxRate ?? 0}
                onChange={(e) => compute({ itemTaxRate: parseFloat(e.target.value) || 0 })}
              />
            </div>

            <div className="col-span-2">
              <Label className="text-xs text-gray-400 mb-1 block">Tax Amount</Label>
              <div className="h-9 flex items-center px-3 rounded-md border bg-white text-sm text-green-600 font-medium">
                +₹{(item.itemTaxAmount ?? 0).toFixed(2)}
              </div>
            </div>

            <div className="col-span-1">
              <Label className="text-xs text-gray-400 mb-1 block">Order ID</Label>
              <Input
                placeholder="SKU"
                value={item.orderId}
                onChange={(e) => compute({ orderId: e.target.value })}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default InvoiceItem;