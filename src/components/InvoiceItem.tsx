import { useState } from "react";
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
import { Trash2, ChevronDown, ChevronUp } from "lucide-react";
import { InvoiceItem as InvoiceItemType } from "@/pages/Invoices";

interface InvoiceItemProps {
  item: InvoiceItemType;
  onUpdate: (updatedItem: Partial<InvoiceItemType>) => void;
  onDelete: () => void;
}

const InvoiceItem = ({ item, onUpdate, onDelete }: InvoiceItemProps) => {
  const [expanded, setExpanded] = useState(false);

  const compute = (patch: Partial<InvoiceItemType>) => {
    const merged = { ...item, ...patch };
    const qty = merged.quantity ?? 1;
    const rate = merged.unitPrice ?? 0;
    const base = qty * rate;

    const discType = merged.itemDiscountType ?? "flat";
    const discVal = merged.itemDiscountValue ?? 0;
    const discAmt =
      discType === "percentage"
        ? (base * discVal) / 100
        : discVal;

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

  const base = (item.quantity ?? 1) * (item.unitPrice ?? 0);

  return (
    <div className="border border-gray-200 rounded-xl mb-3 overflow-hidden bg-white shadow-sm">

      {/* ── Main Row ── */}
      <div className="grid grid-cols-12 gap-2 p-3 items-end">

        {/* Item Name */}
        <div className="col-span-4">
          <Label className="text-xs text-gray-400 mb-1 block">Item Name</Label>
          <Input
            placeholder="Description"
            value={item.description}
            onChange={(e) => compute({ description: e.target.value })}
          />
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
            onChange={(e) =>
              compute({ quantity: parseFloat(e.target.value) || 1 })
            }
          />
        </div>

        {/* Rate */}
        <div className="col-span-2">
          <Label className="text-xs text-gray-400 mb-1 block">Rate (₹)</Label>
          <Input
            type="number"
            min={0}
            value={item.unitPrice}
            onChange={(e) =>
              compute({ unitPrice: parseFloat(e.target.value) || 0 })
            }
          />
        </div>

        {/* Final Amount */}
        <div className="col-span-2">
          <Label className="text-xs text-gray-400 mb-1 block">Amount</Label>
          <div className="h-9 flex items-center px-3 rounded-md border bg-gray-50 text-sm font-semibold text-gray-800">
            ₹{(item.amount ?? 0).toFixed(2)}
          </div>
        </div>

        {/* Actions */}
        <div className="col-span-1 flex gap-0.5 justify-end">
          <Button
            variant="ghost"
            size="icon"
            className="h-9 w-9 text-gray-400 hover:text-gray-700"
            onClick={() => setExpanded((v) => !v)}
            title="Discount & Tax"
          >
            {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-9 w-9 text-red-400 hover:text-red-600"
            onClick={onDelete}
          >
            <Trash2 className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* ── Inline summary pills (only when collapsed and values exist) ── */}
      {!expanded && ((item.itemDiscountValue ?? 0) > 0 || (item.itemTaxRate ?? 0) > 0) && (
        <div className="flex gap-2 px-3 pb-2">
          {(item.itemDiscountValue ?? 0) > 0 && (
            <span className="text-xs bg-red-50 text-red-600 border border-red-100 rounded-full px-2 py-0.5">
              Disc: {item.itemDiscountType === "percentage"
                ? `${item.itemDiscountValue}%`
                : `₹${item.itemDiscountValue}`} = −₹{(item.itemDiscountAmount ?? 0).toFixed(2)}
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

          {/* Base amount info */}
          <div className="flex items-center gap-2 mb-3">
            <span className="text-xs text-gray-400">
              Base: {item.quantity} × ₹{item.unitPrice} = ₹{base.toFixed(2)}
            </span>
            {(item.itemDiscountAmount ?? 0) > 0 && (
              <>
                <span className="text-xs text-gray-300">→</span>
                <span className="text-xs text-red-500">−₹{(item.itemDiscountAmount ?? 0).toFixed(2)} disc.</span>
              </>
            )}
            {(item.itemTaxAmount ?? 0) > 0 && (
              <>
                <span className="text-xs text-gray-300">→</span>
                <span className="text-xs text-green-600">+₹{(item.itemTaxAmount ?? 0).toFixed(2)} tax</span>
              </>
            )}
            <span className="text-xs text-gray-300">→</span>
            <span className="text-xs font-semibold text-gray-700">₹{(item.amount ?? 0).toFixed(2)}</span>
          </div>

          <div className="grid grid-cols-12 gap-2 items-end">

            {/* Discount Type */}
            <div className="col-span-2">
              <Label className="text-xs text-gray-400 mb-1 block">Discount Type</Label>
              <Select
                value={item.itemDiscountType ?? "flat"}
                onValueChange={(v: "flat" | "percentage") =>
                  compute({ itemDiscountType: v, itemDiscountValue: 0 })
                }
              >
                <SelectTrigger className="h-9">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="flat">Flat (₹)</SelectItem>
                  <SelectItem value="percentage">Percent (%)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Discount Value */}
            <div className="col-span-2">
              <Label className="text-xs text-gray-400 mb-1 block">
                Discount {item.itemDiscountType === "percentage" ? "(%)" : "(₹)"}
              </Label>
              <Input
                type="number"
                min={0}
                max={item.itemDiscountType === "percentage" ? 100 : undefined}
                value={item.itemDiscountValue ?? 0}
                onChange={(e) =>
                  compute({ itemDiscountValue: parseFloat(e.target.value) || 0 })
                }
              />
            </div>

            {/* Discount Amount — read only */}
            <div className="col-span-2">
              <Label className="text-xs text-gray-400 mb-1 block">Disc. Amount</Label>
              <div className="h-9 flex items-center px-3 rounded-md border bg-white text-sm text-red-500 font-medium">
                −₹{(item.itemDiscountAmount ?? 0).toFixed(2)}
              </div>
            </div>

            {/* Spacer */}
            <div className="col-span-1" />

            {/* Tax Rate */}
            <div className="col-span-2">
              <Label className="text-xs text-gray-400 mb-1 block">Tax Rate (%)</Label>
              <Input
                type="number"
                min={0}
                max={100}
                value={item.itemTaxRate ?? 0}
                onChange={(e) =>
                  compute({ itemTaxRate: parseFloat(e.target.value) || 0 })
                }
              />
            </div>

            {/* Tax Amount — read only */}
            <div className="col-span-2">
              <Label className="text-xs text-gray-400 mb-1 block">Tax Amount</Label>
              <div className="h-9 flex items-center px-3 rounded-md border bg-white text-sm text-green-600 font-medium">
                +₹{(item.itemTaxAmount ?? 0).toFixed(2)}
              </div>
            </div>

            {/* Order ID */}
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