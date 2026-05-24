import { Card, CardContent, CardHeader } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Invoice } from "@/pages/Invoices";
import { IndianRupee } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";

interface InvoicePreviewProps {
  invoice: Invoice;
  businessName: string;
  businessAddress?: string;
  businessPhone?: string;
  sealUrl?: string;
  signatureUrl?: string;
  isPrint?: boolean;
  upiId?: string;
  bankName?: string;
  accountNumber?: string;
  ifscCode?: string;
}

const InvoicePreview = ({
  invoice,
  businessName,
  businessAddress,
  businessPhone,
  sealUrl,
  signatureUrl,
  upiId,
  bankName,
  accountNumber,
  ifscCode,
}: InvoicePreviewProps) => {
  const { user } = useAuth();
  const isGuest = !user;

  const hasPerItemDiscount = invoice.items.some((i) => (i.itemDiscountAmount ?? 0) > 0);
  const hasPerItemTax = invoice.items.some((i) => (i.itemTaxAmount ?? 0) > 0);
  const hasHsn = invoice.items.some((i) => i.hsnCode);

  return (
    <Card className="max-h-screen overflow-auto shadow-xl">
      <CardHeader />
      <CardContent>
        <div className="space-y-6 bg-white p-6 border rounded-xl">

          {/* ── HEADER ── */}
          <div className="border-b pb-6">
            <div className="flex justify-between items-start">
              <div className="space-y-2">
                <h1 className="text-3xl font-bold text-gray-900 tracking-wide">INVOICE</h1>
                <p className="text-gray-500">#{invoice.invoiceNumber}</p>
                <div className="text-sm text-gray-500 space-y-1 mt-2">
                  {invoice.numberOfDays !== undefined && (
                    <div>Due in: {invoice.numberOfDays} days</div>
                  )}
                  {invoice.paymentStatus && (
                    <div>
                      Status:{" "}
                      <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                        invoice.paymentStatus === "Paid"
                          ? "bg-green-100 text-green-700"
                          : invoice.paymentStatus === "Partial"
                          ? "bg-yellow-100 text-yellow-700"
                          : "bg-red-100 text-red-600"
                      }`}>
                        {invoice.paymentStatus}
                      </span>
                    </div>
                  )}
                </div>
              </div>

              <div className="text-right">
                <div className="text-lg font-semibold">{businessName || "Business Name"}</div>
                {businessAddress && (
                  <div className="text-sm text-gray-600 mt-1 whitespace-pre-line">{businessAddress}</div>
                )}
                {businessPhone && (
                  <div className="text-sm text-gray-600">{businessPhone}</div>
                )}
                <div className="text-sm text-gray-500 mt-2">Date: {invoice.date}</div>
              </div>
            </div>
          </div>

          {/* ── CUSTOMER ── */}
          {invoice.customer && (
            <div className="border-b pb-6">
              <h3 className="font-semibold mb-2 text-gray-700">Bill To:</h3>
              <div className="text-sm">
                <div className="font-medium">{invoice.customer.name}</div>
                <div>{invoice.customer.email}</div>
                {invoice.customer.phone && <div>{invoice.customer.phone}</div>}
                {invoice.customer.address && (
                  <div className="mt-1 whitespace-pre-line">{invoice.customer.address}</div>
                )}
              </div>
            </div>
          )}

          {/* ── ITEMS TABLE ── */}
          {invoice.items.length > 0 && (
            <div className="rounded-lg border overflow-hidden">
              <Table>
                <TableHeader className="bg-gray-50">
                  <TableRow>
                    <TableHead className="text-xs">#</TableHead>
                    <TableHead className="text-xs">Description</TableHead>
                    {hasHsn && <TableHead className="text-xs">HSN</TableHead>}
                    <TableHead className="text-xs">Qty</TableHead>
                    <TableHead className="text-xs">Rate</TableHead>
                    {hasPerItemDiscount && <TableHead className="text-xs">Disc.</TableHead>}
                    {hasPerItemTax && <TableHead className="text-xs">Tax</TableHead>}
                    <TableHead className="text-xs text-right">Amount</TableHead>
                  </TableRow>
                </TableHeader>

                <TableBody>
                  {invoice.items.map((item, index) => {
                    const base = item.quantity * item.unitPrice;
                    return (
                      <TableRow key={item.id}>
                        <TableCell className="text-xs">{index + 1}</TableCell>

                        <TableCell className="text-xs">
                          <div className="font-medium">{item.description || "—"}</div>
                          {item.orderId && (
                            <div className="text-gray-400 text-[11px]">ID: {item.orderId}</div>
                          )}
                          {item.date && (
                            <div className="text-gray-400 text-[11px]">{item.date}</div>
                          )}
                        </TableCell>

                        {hasHsn && (
                          <TableCell className="text-xs text-gray-500">
                            {item.hsnCode || "—"}
                          </TableCell>
                        )}

                        <TableCell className="text-xs">{item.quantity}</TableCell>

                        <TableCell className="text-xs">
                          <div className="flex items-center">
                            <IndianRupee className="w-3 h-3 mr-0.5" />
                            {item.unitPrice.toFixed(2)}
                          </div>
                        </TableCell>

                        {hasPerItemDiscount && (
                          <TableCell className="text-xs text-red-500">
                            {(item.itemDiscountAmount ?? 0) > 0 ? (
                              <div>
                                −₹{(item.itemDiscountAmount ?? 0).toFixed(2)}
                                {item.itemDiscountType === "percentage" && (
                                  <span className="text-gray-400 ml-1">({item.itemDiscountValue}%)</span>
                                )}
                              </div>
                            ) : "—"}
                          </TableCell>
                        )}

                        {hasPerItemTax && (
                          <TableCell className="text-xs text-green-600">
                            {(item.itemTaxRate ?? 0) > 0 ? (
                              <div>
                                +₹{(item.itemTaxAmount ?? 0).toFixed(2)}
                                <span className="text-gray-400 ml-1">({item.itemTaxRate}%)</span>
                              </div>
                            ) : "—"}
                          </TableCell>
                        )}

                        <TableCell className="text-xs text-right font-medium">
                          <div className="flex items-center justify-end">
                            <IndianRupee className="w-3 h-3 mr-0.5" />
                            {(item.amount ?? base).toFixed(2)}
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}

          {/* ── TOTALS ── */}
          <div className="border-t pt-6">
            <div className="flex justify-end">
              <div className="w-80 space-y-2 bg-gray-50 p-4 rounded-lg border shadow-sm text-sm">

                <div className="flex justify-between text-gray-500 text-xs pb-1 border-b">
                  <span>Items subtotal (after per-item disc. & tax)</span>
                  <span className="flex items-center">
                    <IndianRupee className="w-3 h-3 mr-0.5" />{invoice.subtotal.toFixed(2)}
                  </span>
                </div>

                {hasPerItemDiscount && (
                  <div className="flex justify-between text-xs text-red-500">
                    <span>Per-item discounts total</span>
                    <span>
                      −₹{invoice.items.reduce((s, i) => s + (i.itemDiscountAmount ?? 0), 0).toFixed(2)}
                    </span>
                  </div>
                )}

                {hasPerItemTax && (
                  <div className="flex justify-between text-xs text-green-600">
                    <span>Per-item tax total</span>
                    <span>
                      +₹{invoice.items.reduce((s, i) => s + (i.itemTaxAmount ?? 0), 0).toFixed(2)}
                    </span>
                  </div>
                )}

                <div className="flex justify-between text-gray-600">
                  <span className="flex items-center gap-1">
                    {invoice.inclusiveTax ? "Overall Tax" : `Overall Tax (${invoice.taxRate}%)`}
                    {invoice.inclusiveTax && (
                      <span className="text-xs bg-green-100 text-green-700 px-1.5 py-0.5 rounded">Included</span>
                    )}
                  </span>
                  <div className="flex items-center">
                    {invoice.inclusiveTax ? (
                      <span className="text-gray-400">—</span>
                    ) : (
                      <>
                        <IndianRupee className="w-3 h-3 mr-0.5" />
                        {invoice.taxAmount.toFixed(2)}
                      </>
                    )}
                  </div>
                </div>

                {invoice.discountAmount > 0 && (
                  <div className="flex justify-between text-red-600">
                    <span>
                      Overall Discount
                      {invoice.discountType === "percentage"
                        ? ` (${invoice.discountValue}%)`
                        : " (fixed)"}
                    </span>
                    <div className="flex items-center">
                      −<IndianRupee className="w-3 h-3 mr-0.5" />
                      {invoice.discountAmount.toFixed(2)}
                    </div>
                  </div>
                )}

                <div className="border-t pt-2" />

                <div className="flex justify-between text-lg font-bold">
                  <span>Total:</span>
                  <div className="flex items-center text-green-700">
                    <IndianRupee className="w-5 h-5 mr-1" />
                    {invoice.total.toFixed(2)}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* ── FOOTER ── */}
          <div className="border-t pt-6 relative">
            {sealUrl && (
              <div className="absolute top-0 left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-50">
                <img src={sealUrl} alt="Business Seal" className="w-[260px] h-[260px] object-contain opacity-90" />
              </div>
            )}

            <div className="flex flex-col md:flex-row justify-between items-start md:space-x-8 relative z-10">
              {!isGuest && (
                <div className="flex-1 space-y-5">
                  {invoice.paymentInstructions && (
                    <div>
                      <h4 className="font-semibold text-gray-800 mb-1">Payment Instructions</h4>
                      <p className="text-sm text-gray-600 whitespace-pre-line">{invoice.paymentInstructions}</p>
                    </div>
                  )}
                  {upiId && (
                    <div>
                      <h4 className="font-semibold text-gray-800 mb-1">UPI</h4>
                      <p className="text-sm text-gray-700">{upiId}</p>
                    </div>
                  )}
                  {bankName && (
                    <div>
                      <h4 className="font-semibold text-gray-800 mb-1">Bank Details</h4>
                      <p className="text-sm text-gray-700 whitespace-pre-line">
                        {bankName}{"\n"}A/C No: {accountNumber}{"\n"}IFSC: {ifscCode}
                      </p>
                    </div>
                  )}
                </div>
              )}

              {signatureUrl && (
                <div className="w-64 text-center mt-6 md:mt-0 relative">
                  <div className="relative h-40 flex items-end justify-center">
                    <img
                      src={signatureUrl}
                      alt="Signature"
                      className="absolute top-0 left-1/2 transform -translate-x-1/2 object-contain w-[260px] h-[160px] opacity-90"
                    />
                    <p className="text-xs text-gray-500 z-10">Authorized Signature</p>
                  </div>
                </div>
              )}
            </div>

            {invoice.thankYouNote && (
              <div className="mt-6">
                <p className="text-sm text-gray-600 whitespace-pre-line">{invoice.thankYouNote}</p>
              </div>
            )}
          </div>

        </div>
      </CardContent>
    </Card>
  );
};

export default InvoicePreview;