import { useEffect, useRef } from "react";
import html2pdf from "html2pdf.js";
import type { Invoice } from "@/pages/Invoices";
import { useAuth } from "@/hooks/useAuth";

interface InvoiceDownloadProps {
  invoice: Invoice;
  businessName: string;
  businessAddress?: string;
  businessPhone?: string;
  sealUrl?: string;
  signatureUrl?: string;
  upiId?: string;
  bankName?: string;
  accountNumber?: string;
  ifscCode?: string;
  triggerDownload: boolean;
  onComplete: () => void;
}

const InvoiceDownload = ({
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
  triggerDownload,
  onComplete,
}: InvoiceDownloadProps) => {
  const hiddenRef = useRef<HTMLDivElement>(null);
  const { user } = useAuth();
  const isGuest = !user;

  const hasPerItemDiscount = invoice.items.some((i) => (i.itemDiscountAmount ?? 0) > 0);
  const hasPerItemTax = invoice.items.some((i) => (i.itemTaxAmount ?? 0) > 0);
  const hasHsn = invoice.items.some((i) => i.hsnCode);

  useEffect(() => {
    const generatePDF = async () => {
      if (!triggerDownload || !hiddenRef.current) return;
      if (!invoice.customer) {
        console.warn("No customer selected. Skipping PDF generation.");
        onComplete();
        return;
      }
      try {
        const images = hiddenRef.current.querySelectorAll("img");
        await Promise.all(
          Array.from(images).map(
            (img) =>
              new Promise<void>((resolve, reject) => {
                if (img.complete && img.naturalHeight !== 0) resolve();
                else {
                  img.onload = () => resolve();
                  img.onerror = () => reject(new Error("Image failed to load"));
                }
              })
          )
        );
        await html2pdf()
          .set({
            margin: [10, 10, 16, 10],
            filename: `Invoice-${invoice.invoiceNumber}.pdf`,
            image: { type: "jpeg", quality: 0.98 },
            html2canvas: { scale: 2, useCORS: true },
            jsPDF: { unit: "mm", format: "a4", orientation: "portrait" },
          })
          .from(hiddenRef.current)
          .save();
      } catch (err) {
        console.error("PDF generation failed:", err);
      } finally {
        onComplete();
      }
    };
    generatePDF();
  }, [triggerDownload]);

  const perItemDiscTotal = invoice.items.reduce((s, i) => s + (i.itemDiscountAmount ?? 0), 0);
  const perItemTaxTotal = invoice.items.reduce((s, i) => s + (i.itemTaxAmount ?? 0), 0);

  return (
    <div style={{
      position: "absolute", left: "-9999px", top: "-9999px",
      width: "210mm", backgroundColor: "white", padding: "12mm 14mm",
      fontFamily: "Arial, sans-serif", color: "#111",
      fontSize: "12px", lineHeight: 1.6,
    }}>
      <div ref={hiddenRef}>

        {/* ── HEADER ── */}
        <div style={{ borderBottom: "1px solid #ccc", paddingBottom: "16px", marginBottom: "20px" }}>
          <div style={{ display: "flex", justifyContent: "space-between" }}>
            <div>
              <h1 style={{ fontSize: "24px", fontWeight: "bold", margin: 0 }}>INVOICE</h1>
              <p style={{ color: "#555", margin: "4px 0 0" }}>#{invoice.invoiceNumber}</p>
              <div style={{ marginTop: "6px", fontSize: "11px", color: "#555" }}>
                {invoice.numberOfDays !== undefined && (
                  <div>Due in: {invoice.numberOfDays} days</div>
                )}
                {invoice.paymentStatus && (
                  <div style={{ marginTop: "2px" }}>
                    Status:{" "}
                    <span style={{
                      padding: "2px 6px", borderRadius: "4px", fontSize: "10px",
                      backgroundColor: invoice.paymentStatus === "Paid" ? "#d1fae5"
                        : invoice.paymentStatus === "Partial" ? "#fef3c7" : "#fee2e2",
                      color: invoice.paymentStatus === "Paid" ? "#065f46"
                        : invoice.paymentStatus === "Partial" ? "#92400e" : "#991b1b",
                    }}>
                      {invoice.paymentStatus}
                    </span>
                  </div>
                )}
              </div>
            </div>
            <div style={{ textAlign: "right" }}>
              <div style={{ fontWeight: "bold", fontSize: "20px" }}>{businessName || "Business Name"}</div>
              {businessAddress && <div style={{ whiteSpace: "pre-line", fontSize: "11px", marginTop: "4px" }}>{businessAddress}</div>}
              {businessPhone && <div style={{ fontSize: "11px" }}>{businessPhone}</div>}
              <div style={{ marginTop: "4px", fontSize: "11px" }}>Date: {invoice.date}</div>
            </div>
          </div>
        </div>

        {/* ── CUSTOMER ── */}
        <div style={{ marginBottom: "20px" }}>
          <h3 style={{ fontWeight: "bold", marginBottom: "6px", margin: "0 0 6px" }}>Bill To:</h3>
          {invoice.customer ? (
            <>
              <div style={{ fontWeight: 600 }}>{invoice.customer.name}</div>
              {invoice.customer.email && <div>{invoice.customer.email}</div>}
              {(invoice.customer as any).phone && <div>{(invoice.customer as any).phone}</div>}
              {invoice.customer.address && <div style={{ whiteSpace: "pre-line" }}>{invoice.customer.address}</div>}
            </>
          ) : (
            <div style={{ color: "#777" }}>No customer selected</div>
          )}
        </div>

        {/* ── ITEMS TABLE ── */}
        <table width="100%" cellPadding={5} style={{ borderCollapse: "collapse", marginBottom: "24px", fontSize: "11px" }}>
          <thead>
            <tr style={{ borderBottom: "1px solid #ccc", backgroundColor: "#f4f4f4" }}>
              <th align="left" style={{ padding: "6px 4px" }}>#</th>
              <th align="left" style={{ padding: "6px 4px" }}>Description</th>
              {hasHsn && <th align="left" style={{ padding: "6px 4px" }}>HSN</th>}
              <th align="right" style={{ padding: "6px 4px" }}>Qty</th>
              <th align="right" style={{ padding: "6px 4px" }}>Rate (₹)</th>
              {hasPerItemDiscount && <th align="right" style={{ padding: "6px 4px" }}>Disc. (₹)</th>}
              {hasPerItemTax && <th align="right" style={{ padding: "6px 4px" }}>Tax (₹)</th>}
              <th align="right" style={{ padding: "6px 4px" }}>Amount (₹)</th>
            </tr>
          </thead>
          <tbody>
            {invoice.items.map((item, index) => {
              const base = item.quantity * item.unitPrice;
              return (
                <tr key={item.id || index} style={{ borderBottom: "1px solid #eee" }}>
                  <td style={{ padding: "5px 4px" }}>{index + 1}</td>
                  <td style={{ padding: "5px 4px" }}>
                    <div style={{ fontWeight: 500 }}>{item.description || "—"}</div>
                    {item.orderId && <div style={{ fontSize: "10px", color: "#888" }}>ID: {item.orderId}</div>}
                    {item.date && <div style={{ fontSize: "10px", color: "#888" }}>{item.date}</div>}
                  </td>
                  {hasHsn && <td style={{ padding: "5px 4px", color: "#555" }}>{item.hsnCode || "—"}</td>}
                  <td align="right" style={{ padding: "5px 4px" }}>{item.quantity}</td>
                  <td align="right" style={{ padding: "5px 4px" }}>₹{item.unitPrice.toFixed(2)}</td>
                  {hasPerItemDiscount && (
                    <td align="right" style={{ padding: "5px 4px", color: "#dc2626" }}>
                      {(item.itemDiscountAmount ?? 0) > 0
                        ? `−₹${(item.itemDiscountAmount ?? 0).toFixed(2)}${item.itemDiscountType === "percentage" ? ` (${item.itemDiscountValue}%)` : ""}`
                        : "—"}
                    </td>
                  )}
                  {hasPerItemTax && (
                    <td align="right" style={{ padding: "5px 4px", color: "#16a34a" }}>
                      {(item.itemTaxRate ?? 0) > 0
                        ? `+₹${(item.itemTaxAmount ?? 0).toFixed(2)} (${item.itemTaxRate}%)`
                        : "—"}
                    </td>
                  )}
                  <td align="right" style={{ padding: "5px 4px", fontWeight: 500 }}>
                    ₹{(item.amount ?? base).toFixed(2)}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>

        {/* ── TOTALS ── */}
        <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: "28px" }}>
          <div style={{ width: "260px", fontSize: "12px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", borderBottom: "1px solid #eee", paddingBottom: "6px", marginBottom: "6px", fontSize: "11px", color: "#555" }}>
              <span>Items subtotal (after per-item disc. & tax)</span>
              <span>₹{invoice.subtotal.toFixed(2)}</span>
            </div>

            {hasPerItemDiscount && (
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "4px", color: "#dc2626", fontSize: "11px" }}>
                <span>Per-item discounts</span>
                <span>−₹{perItemDiscTotal.toFixed(2)}</span>
              </div>
            )}

            {hasPerItemTax && (
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "4px", color: "#16a34a", fontSize: "11px" }}>
                <span>Per-item tax</span>
                <span>+₹{perItemTaxTotal.toFixed(2)}</span>
              </div>
            )}

            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "4px" }}>
              {invoice.inclusiveTax ? (
                <><span>Overall Tax (Included)</span><span>—</span></>
              ) : (
                <><span>Overall Tax ({invoice.taxRate}%)</span><span>₹{invoice.taxAmount.toFixed(2)}</span></>
              )}
            </div>

            {invoice.discountAmount > 0 && (
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "4px", color: "#dc2626" }}>
                <span>
                  Overall Discount
                  {invoice.discountType === "percentage" ? ` (${invoice.discountValue}%)` : " (fixed)"}
                </span>
                <span>−₹{invoice.discountAmount.toFixed(2)}</span>
              </div>
            )}

            <div style={{ display: "flex", justifyContent: "space-between", fontWeight: "bold", fontSize: "14px", borderTop: "1px solid #ccc", paddingTop: "6px", marginTop: "6px" }}>
              <span>Total</span>
              <span>₹{invoice.total.toFixed(2)}</span>
            </div>
          </div>
        </div>

        {/* ── FOOTER ── */}
        <div style={{ borderTop: "1px solid #ccc", paddingTop: "20px", marginTop: "20px", position: "relative" }}>
          {sealUrl && (
            <div style={{ position: "absolute", top: "-60px", left: "50%", transform: "translateX(-50%)", opacity: 1, zIndex: 0 }}>
              <img src={sealUrl} alt="Seal" style={{ width: "280px", height: "280px", objectFit: "contain" }} />
            </div>
          )}

          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
            <div style={{ flex: 1, marginRight: "40px", zIndex: 1 }}>
              {!isGuest && (
                <>
                  {invoice.paymentInstructions && (
                    <div style={{ marginBottom: "12px" }}>
                      <h4 style={{ fontWeight: "bold", margin: "0 0 4px" }}>Payment Instructions:</h4>
                      <p style={{ whiteSpace: "pre-line", margin: 0 }}>{invoice.paymentInstructions}</p>
                    </div>
                  )}
                  {upiId && (
                    <div style={{ marginBottom: "10px" }}>
                      <h4 style={{ fontWeight: "bold", margin: "0 0 4px" }}>UPI:</h4>
                      <p style={{ margin: 0 }}>{upiId}</p>
                    </div>
                  )}
                  {bankName && (
                    <div>
                      <h4 style={{ fontWeight: "bold", margin: "0 0 4px" }}>Bank Details:</h4>
                      <p style={{ whiteSpace: "pre-line", margin: 0 }}>
                        {bankName}{"\n"}A/C No: {accountNumber}{"\n"}IFSC: {ifscCode}
                      </p>
                    </div>
                  )}
                </>
              )}
            </div>

            {signatureUrl && (
              <div style={{ width: "180px", textAlign: "center", zIndex: 1 }}>
                <img src={signatureUrl} alt="Signature" style={{ width: "200%", maxHeight: "150px", objectFit: "contain" }} />
                <p style={{ fontSize: "10px", color: "#666", marginTop: "4px" }}>Authorized Signature</p>
              </div>
            )}
          </div>

          {invoice.thankYouNote && (
            <div style={{ marginTop: "16px", fontSize: "12px", color: "#555", whiteSpace: "pre-line" }}>
              {invoice.thankYouNote}
            </div>
          )}

          <div style={{ marginTop: "30px", textAlign: "center", fontSize: "10px", color: "#888", borderTop: "1px solid #eee", paddingTop: "10px" }}>
            This is a computer generated invoice and does not require any signature.
          </div>
        </div>
      </div>
    </div>
  );
};

export default InvoiceDownload;