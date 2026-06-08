// src/pages/Employees.tsx
import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select, SelectContent, SelectItem,
  SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "@/hooks/use-toast";
import {
  Plus, Download, Eye, Trash2, Copy, ExternalLink,
  Users, CreditCard, Link, Search, LayoutTemplate,
} from "lucide-react";

// ── Types ─────────────────────────────────────────────────────────────────────
export interface BackField {
  id: string;
  label: string;
  value: string;
  isCustom: boolean;
}

export interface Employee {
  id: string;
  user_id: string;
  name: string;
  employee_id: string;
  designation: string;
  department: string;
  email: string;
  phone: string;
  blood_group: string;
  date_of_joining: string;
  address: string;
  emergency_contact: string;
  photo_url: string | null;
  template: "classic" | "modern" | "minimal" | "executive" | "simple";
  created_at: string;
  top_color?: string;
  bottom_color?: string;
  accent_color?: string;
  text_color?: string;
  name_color?: string;
  show_top_bar?: boolean;
  show_bottom_bar?: boolean;
  back_fields?: BackField[];
  back_footer_text?: string;
}

type Template = "classic" | "modern" | "minimal" | "executive" | "simple";
type Orientation = "landscape" | "portrait";

const BLOOD_GROUPS = ["A+", "A−", "B+", "B−", "AB+", "AB−", "O+", "O−"];

const TEMPLATES: { key: Template; label: string; desc: string }[] = [
  { key: "simple",    label: "Simple",    desc: "White, custom colors" },
  { key: "classic",   label: "Classic",   desc: "Corporate navy, formal" },
  { key: "modern",    label: "Modern",    desc: "Dark card, bold accent" },
  { key: "minimal",   label: "Minimal",   desc: "Clean white, editorial" },
  { key: "executive", label: "Executive", desc: "Gold & dark, premium" },
];

const BACK_FIELD_OPTIONS: { label: string; empKey: string }[] = [
  { label: "Full Name",         empKey: "name" },
  { label: "Employee ID",       empKey: "employee_id" },
  { label: "Email",             empKey: "email" },
  { label: "Phone",             empKey: "phone" },
  { label: "Address",           empKey: "address" },
  { label: "Emergency Contact", empKey: "emergency_contact" },
  { label: "Blood Group",       empKey: "blood_group" },
  { label: "Date of Joining",   empKey: "date_of_joining" },
  { label: "Designation",       empKey: "designation" },
  { label: "Department",        empKey: "department" },
];

const DEFAULT_BACK_FIELDS: BackField[] = [
  { id: "bf1", label: "Email",           value: "{{email}}",             isCustom: false },
  { id: "bf2", label: "Address",         value: "{{address}}",           isCustom: false },
  { id: "bf3", label: "Emergency",       value: "{{emergency_contact}}", isCustom: false },
  { id: "bf4", label: "Date of Joining", value: "{{date_of_joining}}",   isCustom: false },
  { id: "bf5", label: "Blood Group",     value: "{{blood_group}}",       isCustom: false },
];

const DEFAULT_FOOTER_TEXT =
  "This card is the property of the company. If found, please return immediately. Unauthorized use is prohibited. This card must be worn visibly on company premises at all times.";

const EMPTY_FORM = {
  name: "", employee_id: "", designation: "", department: "",
  email: "", phone: "", blood_group: "O+", date_of_joining: "",
  address: "", emergency_contact: "", photo_url: "",
  template: "simple" as Template,
  orientation: "landscape" as Orientation,
  top_color: "#2563eb",
  bottom_color: "#1e40af",
  accent_color: "#3b82f6",
  text_color: "#444444",
  name_color: "#111111",
  show_top_bar: true,
  show_bottom_bar: true,
  back_fields: DEFAULT_BACK_FIELDS as BackField[],
  back_footer_text: DEFAULT_FOOTER_TEXT,
};

// ── SimpleColors ──────────────────────────────────────────────────────────────
interface SimpleColors {
  topColor: string;
  bottomColor: string;
  accentColor: string;
  textColor: string;
  nameColor: string;
  showTopBar: boolean;
  showBottomBar: boolean;
}

// ── Back field resolver ───────────────────────────────────────────────────────
function resolveField(value: string, emp: Partial<Employee>): string {
  return value.replace(/\{\{(\w+)\}\}/g, (_, key) => {
    return (emp[key as keyof Employee] as string) || "";
  });
}

// ── Back Side Card ─────────────────────────────────────────────────────────────
function BackSideLandscape({ emp, bizName, bizLogo, colors, backFields, footerText }: {
  emp: Partial<Employee>; bizName: string; bizLogo?: string; colors: SimpleColors;
  backFields: BackField[]; footerText: string;
}) {
  const { topColor, bottomColor, accentColor, textColor, nameColor } = colors;
  const resolvedFields = backFields.map(f => ({
    ...f,
    resolved: f.isCustom ? f.value : resolveField(f.value, emp),
  })).filter(f => f.resolved);

  return (
    <div style={{
      width: 340, height: 210, borderRadius: 14, overflow: "hidden",
      fontFamily: "'Trebuchet MS', sans-serif", position: "relative",
      background: "#ffffff",
      boxShadow: "0 4px 24px rgba(0,0,0,0.13), 0 0 0 1px rgba(0,0,0,0.07)",
    }}>
      <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 7, background: topColor }} />
      <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, height: 22, background: bottomColor, display: "flex", alignItems: "center", justifyContent: "center" }}>
        <span style={{ color: "rgba(255,255,255,0.65)", fontSize: 7 }}>If found, please return to the company</span>
      </div>
      <div style={{ padding: "13px 14px 28px", display: "flex", gap: 12 }}>
        {/* Left col: logo + signature */}
        <div style={{ display: "flex", flexDirection: "column", justifyContent: "space-between", width: 70, flexShrink: 0 }}>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 5, marginBottom: 8 }}>
              {bizLogo
                ? <img src={bizLogo} alt="logo" style={{ width: 22, height: 22, borderRadius: 4, objectFit: "cover" }} crossOrigin="anonymous" />
                : <div style={{ width: 22, height: 22, borderRadius: 4, background: accentColor, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 10, fontWeight: 700, color: "#fff" }}>{(bizName || "B")[0]}</div>
              }
            </div>
            <div style={{ color: nameColor, fontSize: 8, fontWeight: 700, lineHeight: 1.3 }}>{bizName || "COMPANY NAME"}</div>
          </div>
          <div style={{ textAlign: "center" }}>
            <div style={{ width: 60, height: 1, background: "#ccc", marginBottom: 2 }} />
            <span style={{ fontSize: 6.5, color: "#aaa" }}>Authorized Signature</span>
          </div>
        </div>
        {/* Right col: fields */}
        <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 5 }}>
          {resolvedFields.map(field => (
            <div key={field.id} style={{ display: "flex", gap: 5 }}>
              <span style={{ color: accentColor, fontSize: 7.5, width: 72, flexShrink: 0, fontWeight: 600 }}>{field.label}</span>
              <span style={{ color: textColor, fontSize: 7.5, wordBreak: "break-word" }}>{field.resolved}</span>
            </div>
          ))}
          {footerText && (
            <div style={{ marginTop: 4, padding: "5px 7px", background: `${accentColor}12`, borderRadius: 5, borderLeft: `2px solid ${accentColor}` }}>
              <p style={{ fontSize: 6, color: textColor, lineHeight: 1.5, margin: 0 }}>{footerText}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function BackSidePortrait({ emp, bizName, bizLogo, colors, backFields, footerText }: {
  emp: Partial<Employee>; bizName: string; bizLogo?: string; colors: SimpleColors;
  backFields: BackField[]; footerText: string;
}) {
  const { topColor, bottomColor, accentColor, textColor, nameColor } = colors;
  const resolvedFields = backFields.map(f => ({
    ...f,
    resolved: f.isCustom ? f.value : resolveField(f.value, emp),
  })).filter(f => f.resolved);

  return (
    <div style={{
      width: 240, height: 380, borderRadius: 16, overflow: "hidden",
      fontFamily: "'Trebuchet MS', sans-serif", position: "relative",
      background: "#ffffff",
      boxShadow: "0 4px 24px rgba(0,0,0,0.13), 0 0 0 1px rgba(0,0,0,0.07)",
    }}>
      <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 60, background: topColor }} />
      <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, height: 28, background: bottomColor, display: "flex", alignItems: "center", justifyContent: "center" }}>
        <span style={{ color: "rgba(255,255,255,0.65)", fontSize: 7 }}>If found, please return</span>
      </div>
      <div style={{ padding: "12px 14px 0px", position: "relative", height: "100%", boxSizing: "border-box", display: "flex", flexDirection: "column" }}>
        {/* Header */}
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
          {bizLogo
            ? <img src={bizLogo} alt="logo" style={{ width: 26, height: 26, borderRadius: 5, objectFit: "cover", border: "1.5px solid rgba(255,255,255,0.4)" }} crossOrigin="anonymous" />
            : <div style={{ width: 26, height: 26, borderRadius: 5, background: "rgba(255,255,255,0.2)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 700, color: "#fff" }}>{(bizName || "B")[0]}</div>
          }
          <div>
            <div style={{ color: "#fff", fontSize: 10, fontWeight: 700 }}>{bizName || "COMPANY NAME"}</div>
            <div style={{ color: "rgba(255,255,255,0.6)", fontSize: 7 }}>Employee Back Card</div>
          </div>
        </div>
        {/* Fields */}
        <div style={{ background: "#f8f8f8", borderRadius: 10, padding: "10px 12px", display: "flex", flexDirection: "column", gap: 7, flex: 1, overflow: "hidden", marginBottom: 36 }}>
          {resolvedFields.map(field => (
            <div key={field.id} style={{ display: "flex", flexDirection: "column", gap: 1 }}>
              <div style={{ color: accentColor, fontSize: 7, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em" }}>{field.label}</div>
              <div style={{ color: nameColor, fontSize: 9 }}>{field.resolved}</div>
            </div>
          ))}
        </div>
        {/* Footer text */}
        {footerText && (
          <div style={{ position: "absolute", bottom: 36, left: 14, right: 14, padding: "6px 8px", background: `${accentColor}10`, borderRadius: 7, borderLeft: `2px solid ${accentColor}` }}>
            <p style={{ fontSize: 6.5, color: textColor, lineHeight: 1.5, margin: 0 }}>{footerText}</p>
          </div>
        )}
      </div>
    </div>
  );
}

// ── SIMPLE TEMPLATE ───────────────────────────────────────────────────────────
function SimpleLandscape({ emp, bizName, bizLogo, colors }: {
  emp: Partial<Employee>; bizName: string; bizLogo?: string; colors: SimpleColors;
}) {
  const { topColor, bottomColor, accentColor, textColor, nameColor, showTopBar, showBottomBar } = colors;
  return (
    <div style={{
      width: 340, height: 210, borderRadius: 14, overflow: "hidden",
      fontFamily: "'Trebuchet MS', sans-serif", position: "relative",
      background: "#ffffff",
      boxShadow: "0 4px 24px rgba(0,0,0,0.13), 0 0 0 1px rgba(0,0,0,0.07)",
    }}>
      {showTopBar && (
        <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 7, background: topColor }} />
      )}
      <div style={{ display: "flex", alignItems: "center", gap: 8, padding: `${showTopBar ? 14 : 10}px 14px 8px` }}>
        {bizLogo
          ? <img src={bizLogo} alt="logo" style={{ width: 28, height: 28, borderRadius: 5, objectFit: "cover" }} crossOrigin="anonymous" />
          : <div style={{ width: 28, height: 28, borderRadius: 5, background: accentColor, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, fontWeight: 700, color: "#fff" }}>{(bizName || "B")[0]}</div>
        }
        <div>
          <div style={{ color: nameColor, fontSize: 11, fontWeight: 700, letterSpacing: "0.04em" }}>{bizName || "COMPANY NAME"}</div>
          <div style={{ color: accentColor, fontSize: 8, letterSpacing: "0.14em", textTransform: "uppercase" }}>Employee Identity Card</div>
        </div>
      </div>
      <div style={{ margin: "0 14px 8px", height: 1, background: "#f0f0f0" }} />
      <div style={{ display: "flex", gap: 12, padding: `0 14px ${showBottomBar ? 30 : 8}px` }}>
        <div style={{ flexShrink: 0 }}>
          {emp.photo_url
            ? <img src={emp.photo_url} alt="photo" style={{ width: 62, height: 74, objectFit: "cover", borderRadius: 8, border: `2px solid ${accentColor}` }} crossOrigin="anonymous" />
            : <div style={{ width: 62, height: 74, borderRadius: 8, background: "#f5f5f5", border: `2px solid ${accentColor}30`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 26, color: "#ccc" }}>👤</div>
          }
          <div style={{ marginTop: 4, background: accentColor, borderRadius: 3, padding: "1px 0", textAlign: "center" }}>
            <span style={{ fontSize: 7, fontWeight: 700, color: "#fff", letterSpacing: "0.05em" }}>{emp.blood_group || "—"}</span>
          </div>
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ color: nameColor, fontSize: 14, fontWeight: 700, lineHeight: 1.2, marginBottom: 2 }}>{emp.name || "Full Name"}</div>
          <div style={{ color: accentColor, fontSize: 9, letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 6 }}>{emp.designation || "Designation"}</div>
          {[["Dept", emp.department], ["ID", emp.employee_id], ["Joined", emp.date_of_joining], ["📞", emp.phone]].map(([label, value]) =>
            value ? (
              <div key={label as string} style={{ display: "flex", gap: 4, marginBottom: 2 }}>
                <span style={{ color: "#aaa", fontSize: 8, width: 30, flexShrink: 0 }}>{label}</span>
                <span style={{ color: textColor, fontSize: 8, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{value as string}</span>
              </div>
            ) : null
          )}
        </div>
      </div>
      {showBottomBar && (
        <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, height: 22, background: bottomColor, display: "flex", justifyContent: "space-between", alignItems: "center", padding: "0 14px" }}>
          <span style={{ color: "rgba(255,255,255,0.7)", fontSize: 7 }}>Emergency: {emp.emergency_contact || "—"}</span>
          <span style={{ color: "rgba(255,255,255,0.5)", fontSize: 7 }}>If found, please return</span>
        </div>
      )}
    </div>
  );
}

function SimplePortrait({ emp, bizName, bizLogo, colors }: {
  emp: Partial<Employee>; bizName: string; bizLogo?: string; colors: SimpleColors;
}) {
  const { topColor, bottomColor, accentColor, textColor, nameColor, showTopBar, showBottomBar } = colors;
  return (
    <div style={{
      width: 240, height: 380, borderRadius: 16, overflow: "hidden",
      fontFamily: "'Trebuchet MS', sans-serif", position: "relative",
      background: "#ffffff",
      boxShadow: "0 4px 24px rgba(0,0,0,0.13), 0 0 0 1px rgba(0,0,0,0.07)",
    }}>
      <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: showTopBar ? 90 : 70, background: topColor }} />
      <div style={{ position: "relative", display: "flex", flexDirection: "column", alignItems: "center", padding: "14px 16px 0" }}>
        {bizLogo
          ? <img src={bizLogo} alt="logo" style={{ width: 32, height: 32, borderRadius: 6, objectFit: "cover", border: "1.5px solid rgba(255,255,255,0.4)", marginBottom: 4 }} crossOrigin="anonymous" />
          : <div style={{ width: 32, height: 32, borderRadius: 6, background: "rgba(255,255,255,0.2)", border: "1.5px solid rgba(255,255,255,0.4)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14, fontWeight: 700, color: "#fff", marginBottom: 4 }}>{(bizName || "B")[0]}</div>
        }
        <div style={{ color: "rgba(255,255,255,0.95)", fontSize: 11, fontWeight: 700, letterSpacing: "0.06em", textAlign: "center" }}>{bizName || "COMPANY NAME"}</div>
        <div style={{ color: "rgba(255,255,255,0.6)", fontSize: 7, letterSpacing: "0.16em", textTransform: "uppercase", marginTop: 1 }}>Employee ID Card</div>
      </div>
      <div style={{ display: "flex", justifyContent: "center", marginTop: showTopBar ? 14 : 8, position: "relative", zIndex: 2 }}>
        <div style={{ width: 80, height: 80, borderRadius: "50%", border: "3px solid #ffffff", overflow: "hidden", background: "#f0f0f0", boxShadow: `0 0 0 3px ${accentColor}` }}>
          {emp.photo_url
            ? <img src={emp.photo_url} alt="photo" style={{ width: "100%", height: "100%", objectFit: "cover" }} crossOrigin="anonymous" />
            : <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 30, color: "#ccc" }}>👤</div>
          }
        </div>
      </div>
      <div style={{ textAlign: "center", padding: "10px 16px 0" }}>
        <div style={{ color: nameColor, fontSize: 16, fontWeight: 700, lineHeight: 1.2 }}>{emp.name || "Full Name"}</div>
        <div style={{ color: accentColor, fontSize: 9, letterSpacing: "0.12em", textTransform: "uppercase", marginTop: 3 }}>{emp.designation || "Designation"}</div>
        {emp.department && <div style={{ color: textColor, fontSize: 9, marginTop: 2 }}>{emp.department}</div>}
      </div>
      <div style={{ position: "absolute", top: 248, left: 20, right: 20, height: 1, background: "#f0f0f0" }} />
      {/* Info rows — absolutely anchored above footer */}
      <div style={{ position: "absolute", top: 254, left: 16, right: 16, bottom: showBottomBar ? 30 : 8, overflow: "hidden" }}>
        {[["Employee ID", emp.employee_id], ["Date of Joining", emp.date_of_joining], ["Blood Group", emp.blood_group], ["Phone", emp.phone]].map(([label, value]) =>
          value ? (
            <div key={label as string} style={{ display: "flex", justifyContent: "space-between", marginBottom: 7, gap: 8 }}>
              <span style={{ fontSize: 8, color: "#bbb", letterSpacing: "0.07em", textTransform: "uppercase", flexShrink: 0 }}>{label}</span>
              <span style={{ fontSize: 9, fontWeight: 700, color: textColor, textAlign: "right", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{value as string}</span>
            </div>
          ) : null
        )}
      </div>
      {showBottomBar && (
        <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, height: 28, background: bottomColor, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <span style={{ color: "rgba(255,255,255,0.65)", fontSize: 7 }}>Emergency: {emp.emergency_contact || "—"}</span>
        </div>
      )}
    </div>
  );
}

// ── OTHER LANDSCAPE CARDS ─────────────────────────────────────────────────────

function ClassicLandscape({ emp, bizName, bizLogo }: { emp: Partial<Employee>; bizName: string; bizLogo?: string }) {
  return (
    <div style={{ width: 340, height: 210, borderRadius: 14, overflow: "hidden", fontFamily: "'Georgia', serif", position: "relative", background: "linear-gradient(135deg, #0f2557 0%, #1a3a8a 60%, #0f2557 100%)", boxShadow: "0 8px 32px rgba(0,0,0,0.35)" }}>
      <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 6, background: "linear-gradient(90deg,#f0c040,#e8a020,#f0c040)" }} />
      <div style={{ position: "absolute", right: -30, top: -30, width: 130, height: 130, borderRadius: "50%", border: "2px solid rgba(255,255,255,0.08)" }} />
      <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "12px 14px 8px" }}>
        {bizLogo ? <img src={bizLogo} alt="logo" style={{ width: 28, height: 28, borderRadius: 4, objectFit: "cover" }} crossOrigin="anonymous" /> : <div style={{ width: 28, height: 28, borderRadius: 4, background: "#f0c040", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, fontWeight: 700, color: "#0f2557" }}>{(bizName || "B")[0]}</div>}
        <div>
          <div style={{ color: "#fff", fontSize: 11, fontWeight: 700, letterSpacing: "0.05em" }}>{bizName || "COMPANY NAME"}</div>
          <div style={{ color: "#f0c040", fontSize: 8, letterSpacing: "0.15em", textTransform: "uppercase" }}>Employee Identity Card</div>
        </div>
      </div>
      <div style={{ display: "flex", gap: 12, padding: "4px 14px 10px" }}>
        <div style={{ flexShrink: 0 }}>
          {emp.photo_url ? <img src={emp.photo_url} alt="photo" style={{ width: 62, height: 74, objectFit: "cover", borderRadius: 6, border: "2px solid #f0c040" }} crossOrigin="anonymous" /> : <div style={{ width: 62, height: 74, borderRadius: 6, background: "rgba(255,255,255,0.12)", border: "2px solid rgba(240,192,64,0.4)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 26, color: "rgba(255,255,255,0.3)" }}>👤</div>}
          <div style={{ marginTop: 4, background: "#f0c040", borderRadius: 3, padding: "1px 0", textAlign: "center" }}><span style={{ fontSize: 7, fontWeight: 700, color: "#0f2557" }}>{emp.blood_group || "—"}</span></div>
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ color: "#fff", fontSize: 14, fontWeight: 700, lineHeight: 1.2, marginBottom: 2 }}>{emp.name || "Full Name"}</div>
          <div style={{ color: "#f0c040", fontSize: 9, letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 6 }}>{emp.designation || "Designation"}</div>
          {[["Dept", emp.department], ["ID", emp.employee_id], ["Joined", emp.date_of_joining], ["📞", emp.phone]].map(([label, value]) => value ? (
            <div key={label as string} style={{ display: "flex", gap: 4, marginBottom: 2 }}>
              <span style={{ color: "rgba(255,255,255,0.45)", fontSize: 8, width: 26, flexShrink: 0 }}>{label}</span>
              <span style={{ color: "rgba(255,255,255,0.85)", fontSize: 8, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{value as string}</span>
            </div>
          ) : null)}
        </div>
      </div>
      <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, height: 26, background: "rgba(0,0,0,0.3)", display: "flex", justifyContent: "space-between", alignItems: "center", padding: "0 14px" }}>
        <span style={{ color: "rgba(255,255,255,0.4)", fontSize: 7 }}>Emergency: {emp.emergency_contact || "—"}</span>
        <span style={{ color: "rgba(255,255,255,0.4)", fontSize: 7 }}>If found, please return</span>
      </div>
    </div>
  );
}

function ModernLandscape({ emp, bizName, bizLogo }: { emp: Partial<Employee>; bizName: string; bizLogo?: string }) {
  return (
    <div style={{ width: 340, height: 210, borderRadius: 14, overflow: "hidden", fontFamily: "'Trebuchet MS', sans-serif", position: "relative", background: "#111118", boxShadow: "0 8px 32px rgba(0,0,0,0.5)" }}>
      <div style={{ position: "absolute", left: 0, top: 0, bottom: 0, width: 4, background: "linear-gradient(180deg,#6c47ff,#00d4ff)" }} />
      <div style={{ position: "absolute", left: 16, top: 20 }}>
        {emp.photo_url ? <img src={emp.photo_url} alt="photo" style={{ width: 70, height: 84, objectFit: "cover", borderRadius: 10, border: "2px solid rgba(108,71,255,0.6)" }} crossOrigin="anonymous" /> : <div style={{ width: 70, height: 84, borderRadius: 10, background: "rgba(108,71,255,0.15)", border: "2px solid rgba(108,71,255,0.3)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 28, color: "rgba(255,255,255,0.2)" }}>👤</div>}
        <div style={{ marginTop: 6, background: "linear-gradient(90deg,#6c47ff,#00d4ff)", borderRadius: 20, padding: "2px 8px", textAlign: "center" }}><span style={{ fontSize: 9, fontWeight: 700, color: "#fff" }}>{emp.blood_group || "—"}</span></div>
      </div>
      <div style={{ marginLeft: 100, padding: "18px 14px 0 0" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 10 }}>
          {bizLogo ? <img src={bizLogo} alt="" style={{ width: 18, height: 18, borderRadius: 3, objectFit: "cover" }} crossOrigin="anonymous" /> : <div style={{ width: 18, height: 18, borderRadius: 3, background: "linear-gradient(135deg,#6c47ff,#00d4ff)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 9, color: "#fff", fontWeight: 800 }}>{(bizName || "B")[0]}</div>}
          <span style={{ color: "rgba(255,255,255,0.5)", fontSize: 8, letterSpacing: "0.15em", textTransform: "uppercase" }}>{bizName || "Company"}</span>
        </div>
        <div style={{ color: "#fff", fontSize: 15, fontWeight: 800, lineHeight: 1.15, marginBottom: 2 }}>{emp.name || "Full Name"}</div>
        <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase", marginBottom: 10, background: "linear-gradient(90deg,#6c47ff,#00d4ff)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>{emp.designation || "Role"}</div>
        {[[emp.department, "📂"], [emp.employee_id, "#"], [emp.phone, "📞"], [emp.email, "✉"]].filter(([v]) => v).map(([value, icon], i) => (
          <div key={i} style={{ display: "flex", gap: 5, marginBottom: 3, alignItems: "center" }}>
            <span style={{ fontSize: 8, width: 12 }}>{icon}</span>
            <span style={{ color: "rgba(255,255,255,0.6)", fontSize: 9, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{value as string}</span>
          </div>
        ))}
      </div>
      <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, height: 26, background: "rgba(255,255,255,0.04)", borderTop: "1px solid rgba(255,255,255,0.07)", display: "flex", justifyContent: "space-between", alignItems: "center", padding: "0 14px" }}>
        <span style={{ color: "rgba(255,255,255,0.25)", fontSize: 7 }}>Joined: {emp.date_of_joining || "—"}</span>
        <span style={{ color: "rgba(255,255,255,0.25)", fontSize: 7 }}>Emergency: {emp.emergency_contact || "—"}</span>
      </div>
    </div>
  );
}

function MinimalLandscape({ emp, bizName, bizLogo }: { emp: Partial<Employee>; bizName: string; bizLogo?: string }) {
  return (
    <div style={{ width: 340, height: 210, borderRadius: 14, overflow: "hidden", fontFamily: "'Georgia', serif", position: "relative", background: "#fafaf8", boxShadow: "0 2px 20px rgba(0,0,0,0.12),0 0 0 1px rgba(0,0,0,0.06)" }}>
      <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 68, background: "#1a1a1a" }} />
      <div style={{ position: "absolute", top: 60, left: 16, width: 60, height: 60, borderRadius: "50%", border: "3px solid #fafaf8", overflow: "hidden", background: "#e5e5e3" }}>
        {emp.photo_url ? <img src={emp.photo_url} alt="photo" style={{ width: "100%", height: "100%", objectFit: "cover" }} crossOrigin="anonymous" /> : <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22, color: "#aaa" }}>👤</div>}
      </div>
      <div style={{ position: "absolute", top: 14, right: 14, display: "flex", alignItems: "center", gap: 6 }}>
        {bizLogo && <img src={bizLogo} alt="" style={{ width: 20, height: 20, borderRadius: 4, objectFit: "cover" }} crossOrigin="anonymous" />}
        <span style={{ color: "rgba(255,255,255,0.7)", fontSize: 9, letterSpacing: "0.15em", textTransform: "uppercase" }}>{bizName || "Company"}</span>
      </div>
      <div style={{ position: "absolute", top: 28, right: 14 }}><span style={{ color: "rgba(255,255,255,0.35)", fontSize: 7 }}>EMPLOYEE ID CARD</span></div>
      <div style={{ position: "absolute", top: 80, left: 88, right: 14 }}>
        <div style={{ fontSize: 14, fontWeight: 700, color: "#1a1a1a" }}>{emp.name || "Full Name"}</div>
        <div style={{ fontSize: 9, color: "#777", letterSpacing: "0.08em", textTransform: "uppercase", marginTop: 1 }}>{emp.designation || "Designation"}</div>
        {emp.department && <div style={{ fontSize: 9, color: "#aaa", marginTop: 1 }}>{emp.department}</div>}
      </div>
      <div style={{ position: "absolute", bottom: 32, left: 14, right: 14, display: "flex", gap: 12 }}>
        {[["ID", emp.employee_id], ["Joined", emp.date_of_joining], ["Blood", emp.blood_group]].map(([label, value]) => value ? (
          <div key={label as string}>
            <div style={{ fontSize: 7, color: "#bbb", letterSpacing: "0.1em", textTransform: "uppercase" }}>{label}</div>
            <div style={{ fontSize: 9, fontWeight: 700, color: "#333" }}>{value as string}</div>
          </div>
        ) : null)}
      </div>
      <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, height: 26, borderTop: "1px solid #eee", background: "#f5f5f3", display: "flex", justifyContent: "space-between", alignItems: "center", padding: "0 14px" }}>
        <span style={{ fontSize: 8, color: "#bbb" }}>{emp.phone || ""}</span>
        <span style={{ fontSize: 8, color: "#bbb" }}>Emergency: {emp.emergency_contact || "—"}</span>
      </div>
    </div>
  );
}

function ExecutiveLandscape({ emp, bizName, bizLogo }: { emp: Partial<Employee>; bizName: string; bizLogo?: string }) {
  return (
    <div style={{ width: 340, height: 210, borderRadius: 14, overflow: "hidden", fontFamily: "'Trebuchet MS', sans-serif", position: "relative", background: "#1a1a2e", boxShadow: "0 8px 32px rgba(0,0,0,0.5)" }}>
      <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 78, background: "linear-gradient(135deg,#b8860b,#d4a017,#8b6914)" }} />
      <div style={{ position: "absolute", top: 10, left: 14, right: 14, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div>
          <div style={{ color: "rgba(255,255,255,0.9)", fontSize: 11, fontWeight: 700, letterSpacing: "0.08em" }}>{(bizName || "COMPANY").toUpperCase()}</div>
          <div style={{ color: "rgba(255,255,255,0.55)", fontSize: 7, letterSpacing: "0.14em", textTransform: "uppercase" }}>Executive Identity Card</div>
        </div>
        {bizLogo ? <img src={bizLogo} alt="" style={{ width: 28, height: 28, borderRadius: 4, objectFit: "cover", border: "1px solid rgba(255,255,255,0.3)" }} crossOrigin="anonymous" /> : <div style={{ width: 28, height: 28, borderRadius: 4, background: "rgba(255,255,255,0.15)", border: "1px solid rgba(255,255,255,0.3)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, color: "rgba(255,255,255,0.9)", fontWeight: 700 }}>{(bizName || "B")[0]}</div>}
      </div>
      <div style={{ position: "absolute", top: 48, left: 14 }}>
        {emp.photo_url ? <img src={emp.photo_url} alt="photo" style={{ width: 62, height: 74, objectFit: "cover", borderRadius: 8, border: "2px solid rgba(212,160,23,0.5)" }} crossOrigin="anonymous" /> : <div style={{ width: 62, height: 74, borderRadius: 8, background: "rgba(255,255,255,0.08)", border: "2px solid rgba(212,160,23,0.3)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 26, color: "rgba(255,255,255,0.2)" }}>👤</div>}
      </div>
      <div style={{ position: "absolute", top: 54, left: 88, right: 12 }}>
        <div style={{ color: "#fff", fontSize: 14, fontWeight: 700, lineHeight: 1.2, marginBottom: 2 }}>{emp.name || "Full Name"}</div>
        <div style={{ color: "#d4a017", fontSize: 8, letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 6 }}>{emp.designation || "Designation"}</div>
        {[["Dept", emp.department], ["ID", emp.employee_id], ["Tel", emp.phone]].map(([label, value]) => value ? (
          <div key={label as string} style={{ display: "flex", gap: 3, marginBottom: 2 }}>
            <span style={{ color: "rgba(255,255,255,0.35)", fontSize: 7, width: 26, flexShrink: 0 }}>{label}</span>
            <span style={{ color: "rgba(255,255,255,0.75)", fontSize: 7 }}>{value as string}</span>
          </div>
        ) : null)}
      </div>
      <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, height: 26, background: "rgba(0,0,0,0.35)", display: "flex", justifyContent: "space-between", alignItems: "center", padding: "0 14px" }}>
        <div style={{ display: "flex", gap: 4, alignItems: "center" }}>
          <div style={{ width: 10, height: 10, borderRadius: 2, background: "#d4a017", opacity: 0.8 }} />
          <span style={{ color: "rgba(255,255,255,0.3)", fontSize: 6, letterSpacing: "0.06em" }}>VALID EMPLOYEE</span>
        </div>
        <span style={{ color: "rgba(255,255,255,0.3)", fontSize: 6 }}>Blood: {emp.blood_group || "—"} · Emergency: {emp.emergency_contact || "—"}</span>
      </div>
    </div>
  );
}

// ── PORTRAIT CARDS ────────────────────────────────────────────────────────────

function ClassicPortrait({ emp, bizName, bizLogo }: { emp: Partial<Employee>; bizName: string; bizLogo?: string }) {
  // logo+name ~76, divider 1, photo 108, blood 20, gap 8, name~44 → info ~257
  const INFO_TOP = 258;
  const FOOTER_H = 26;
  return (
    <div style={{ width: 240, height: 380, borderRadius: 16, overflow: "hidden", fontFamily: "'Georgia', serif", position: "relative", background: "linear-gradient(175deg,#0f2557 0%,#1a3a8a 50%,#0f2557 100%)", boxShadow: "0 8px 32px rgba(0,0,0,0.35)" }}>
      {/* Top gold bar */}
      <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 5, background: "linear-gradient(90deg,#f0c040,#e8a020,#f0c040)" }} />
      {/* Logo + name — fixed top */}
      <div style={{ position: "absolute", top: 5, left: 0, right: 0, display: "flex", flexDirection: "column", alignItems: "center", padding: "14px 16px 0" }}>
        {bizLogo ? <img src={bizLogo} alt="logo" style={{ width: 32, height: 32, borderRadius: 6, objectFit: "cover", marginBottom: 5 }} crossOrigin="anonymous" /> : <div style={{ width: 32, height: 32, borderRadius: 6, background: "#f0c040", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14, fontWeight: 700, color: "#0f2557", marginBottom: 5 }}>{(bizName || "B")[0]}</div>}
        <div style={{ color: "#fff", fontSize: 11, fontWeight: 700, letterSpacing: "0.06em", textAlign: "center" }}>{bizName || "COMPANY NAME"}</div>
        <div style={{ color: "#f0c040", fontSize: 7.5, letterSpacing: "0.18em", textTransform: "uppercase", marginTop: 2 }}>Employee ID Card</div>
      </div>
      {/* Divider */}
      <div style={{ position: "absolute", top: 86, left: 16, right: 16, height: 1, background: "rgba(240,192,64,0.25)" }} />
      {/* Photo */}
      <div style={{ position: "absolute", top: 94, left: 0, right: 0, display: "flex", flexDirection: "column", alignItems: "center" }}>
        {emp.photo_url ? <img src={emp.photo_url} alt="photo" style={{ width: 86, height: 100, objectFit: "cover", borderRadius: 10, border: "3px solid #f0c040" }} crossOrigin="anonymous" /> : <div style={{ width: 86, height: 100, borderRadius: 10, background: "rgba(255,255,255,0.1)", border: "3px solid rgba(240,192,64,0.4)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 36, color: "rgba(255,255,255,0.2)" }}>👤</div>}
        <div style={{ marginTop: 5, background: "#f0c040", borderRadius: 4, padding: "1px 10px" }}><span style={{ fontSize: 7.5, fontWeight: 700, color: "#0f2557" }}>{emp.blood_group || "—"}</span></div>
      </div>
      {/* Name / designation */}
      <div style={{ position: "absolute", top: 210, left: 0, right: 0, textAlign: "center", padding: "0 14px" }}>
        <div style={{ color: "#fff", fontSize: 15, fontWeight: 700, lineHeight: 1.2 }}>{emp.name || "Full Name"}</div>
        <div style={{ color: "#f0c040", fontSize: 8.5, letterSpacing: "0.12em", textTransform: "uppercase", marginTop: 3 }}>{emp.designation || "Designation"}</div>
        {emp.department && <div style={{ color: "rgba(255,255,255,0.5)", fontSize: 8, marginTop: 2 }}>{emp.department}</div>}
      </div>
      {/* Info box — absolutely anchored so it never overflows */}
      <div style={{ position: "absolute", top: INFO_TOP, left: 12, right: 12, bottom: FOOTER_H + 4, background: "rgba(255,255,255,0.07)", borderRadius: 10, padding: "7px 11px", overflow: "hidden" }}>
        {[["ID", emp.employee_id], ["Joined", emp.date_of_joining], ["Phone", emp.phone], ["Email", emp.email]].map(([label, value]) => value ? (
          <div key={label as string} style={{ display: "flex", justifyContent: "space-between", marginBottom: 5, gap: 6 }}>
            <span style={{ color: "rgba(255,255,255,0.45)", fontSize: 7.5, flexShrink: 0, minWidth: 34 }}>{label}</span>
            <span style={{ color: "rgba(255,255,255,0.9)", fontSize: 7.5, textAlign: "right", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{value as string}</span>
          </div>
        ) : null)}
      </div>
      {/* Footer */}
      <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, height: FOOTER_H, background: "rgba(0,0,0,0.3)", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <span style={{ color: "rgba(255,255,255,0.4)", fontSize: 7 }}>Emergency: {emp.emergency_contact || "—"}</span>
      </div>
    </div>
  );
}

function ModernPortrait({ emp, bizName, bizLogo }: { emp: Partial<Employee>; bizName: string; bizLogo?: string }) {
  // Fixed top positions: header=39, photo starts=39, photo h=104, blood=16, gap=8, name area~52 → info starts ~219
  const INFO_TOP = 222;
  const FOOTER_H = 26;
  return (
    <div style={{ width: 240, height: 380, borderRadius: 16, overflow: "hidden", fontFamily: "'Trebuchet MS', sans-serif", position: "relative", background: "#111118", boxShadow: "0 8px 32px rgba(0,0,0,0.5)" }}>
      {/* Top accent */}
      <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 5, background: "linear-gradient(90deg,#6c47ff,#00d4ff)" }} />
      {/* Logo + company — fixed top */}
      <div style={{ position: "absolute", top: 5, left: 0, right: 0, height: 34, display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
        {bizLogo ? <img src={bizLogo} alt="" style={{ width: 18, height: 18, borderRadius: 4, objectFit: "cover" }} crossOrigin="anonymous" /> : <div style={{ width: 18, height: 18, borderRadius: 4, background: "linear-gradient(135deg,#6c47ff,#00d4ff)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 9, color: "#fff", fontWeight: 800 }}>{(bizName || "B")[0]}</div>}
        <span style={{ color: "rgba(255,255,255,0.5)", fontSize: 8, letterSpacing: "0.14em", textTransform: "uppercase" }}>{bizName || "Company"}</span>
      </div>
      {/* Photo — fixed top */}
      <div style={{ position: "absolute", top: 39, left: 0, right: 0, display: "flex", flexDirection: "column", alignItems: "center" }}>
        {emp.photo_url ? <img src={emp.photo_url} alt="photo" style={{ width: 86, height: 100, objectFit: "cover", borderRadius: 12, border: "2px solid rgba(108,71,255,0.6)" }} crossOrigin="anonymous" /> : <div style={{ width: 86, height: 100, borderRadius: 12, background: "rgba(108,71,255,0.15)", border: "2px solid rgba(108,71,255,0.3)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 36, color: "rgba(255,255,255,0.15)" }}>👤</div>}
        <div style={{ marginTop: 6, background: "linear-gradient(90deg,#6c47ff,#00d4ff)", borderRadius: 20, padding: "2px 10px" }}><span style={{ fontSize: 9, fontWeight: 700, color: "#fff" }}>{emp.blood_group || "—"}</span></div>
      </div>
      {/* Name / role — fixed top */}
      <div style={{ position: "absolute", top: 157, left: 0, right: 0, textAlign: "center", padding: "0 14px" }}>
        <div style={{ color: "#fff", fontSize: 15, fontWeight: 800, lineHeight: 1.2 }}>{emp.name || "Full Name"}</div>
        <div style={{ fontSize: 8, fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase", marginTop: 3, background: "linear-gradient(90deg,#6c47ff,#00d4ff)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>{emp.designation || "Role"}</div>
        {emp.department && <div style={{ color: "rgba(255,255,255,0.35)", fontSize: 8, marginTop: 2 }}>{emp.department}</div>}
      </div>
      {/* Info box — absolutely anchored between INFO_TOP and footer */}
      <div style={{ position: "absolute", top: INFO_TOP, left: 12, right: 12, bottom: FOOTER_H + 4, background: "rgba(255,255,255,0.05)", borderRadius: 10, padding: "7px 10px", border: "1px solid rgba(255,255,255,0.07)", overflow: "hidden" }}>
        {[[emp.employee_id, "#", "ID"], [emp.phone, "📞", "Phone"], [emp.email, "✉", "Email"], [emp.date_of_joining, "📅", "Joined"]].filter(([v]) => v).map(([value, icon, label], i) => (
          <div key={i} style={{ display: "flex", gap: 6, marginBottom: 5, alignItems: "center" }}>
            <span style={{ fontSize: 9, width: 13, flexShrink: 0 }}>{icon}</span>
            <span style={{ color: "rgba(255,255,255,0.4)", fontSize: 7.5, width: 32, flexShrink: 0 }}>{label}</span>
            <span style={{ color: "rgba(255,255,255,0.8)", fontSize: 7.5, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{value as string}</span>
          </div>
        ))}
      </div>
      {/* Footer — always at bottom */}
      <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, height: FOOTER_H, background: "rgba(255,255,255,0.04)", borderTop: "1px solid rgba(255,255,255,0.07)", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <span style={{ color: "rgba(255,255,255,0.3)", fontSize: 7 }}>Emergency: {emp.emergency_contact || "—"}</span>
      </div>
    </div>
  );
}

function MinimalPortrait({ emp, bizName, bizLogo }: { emp: Partial<Employee>; bizName: string; bizLogo?: string }) {
  return (
    <div style={{ width: 240, height: 380, borderRadius: 16, overflow: "hidden", fontFamily: "'Georgia', serif", position: "relative", background: "#fafaf8", boxShadow: "0 2px 24px rgba(0,0,0,0.12),0 0 0 1px rgba(0,0,0,0.06)" }}>
      <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 100, background: "#1a1a1a" }} />
      <div style={{ position: "absolute", top: 14, right: 14, textAlign: "right" }}>
        {bizLogo && <img src={bizLogo} alt="" style={{ width: 22, height: 22, borderRadius: 4, objectFit: "cover", marginBottom: 3, display: "block", marginLeft: "auto" }} crossOrigin="anonymous" />}
        <div style={{ color: "rgba(255,255,255,0.65)", fontSize: 8, letterSpacing: "0.14em", textTransform: "uppercase" }}>{bizName || "Company"}</div>
        <div style={{ color: "rgba(255,255,255,0.3)", fontSize: 7 }}>EMPLOYEE ID</div>
      </div>
      <div style={{ position: "absolute", top: 56, left: "50%", transform: "translateX(-50%)", width: 84, height: 84, borderRadius: "50%", border: "3px solid #fafaf8", overflow: "hidden", background: "#e5e5e3" }}>
        {emp.photo_url ? <img src={emp.photo_url} alt="photo" style={{ width: "100%", height: "100%", objectFit: "cover" }} crossOrigin="anonymous" /> : <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 32, color: "#aaa" }}>👤</div>}
      </div>
      <div style={{ textAlign: "center", padding: "0 16px", marginTop: 148 }}>
        <div style={{ fontSize: 16, fontWeight: 700, color: "#1a1a1a" }}>{emp.name || "Full Name"}</div>
        <div style={{ fontSize: 9, color: "#777", letterSpacing: "0.1em", textTransform: "uppercase", marginTop: 3 }}>{emp.designation || "Designation"}</div>
        {emp.department && <div style={{ fontSize: 9, color: "#bbb", marginTop: 2 }}>{emp.department}</div>}
      </div>
      {/* Divider + info — absolutely anchored above footer */}
      <div style={{ position: "absolute", top: 248, left: 20, right: 20, height: 1, background: "#eee" }} />
      <div style={{ position: "absolute", top: 254, left: 16, right: 16, bottom: 30, overflow: "hidden" }}>
        {[["Employee ID", emp.employee_id], ["Date of Joining", emp.date_of_joining], ["Blood Group", emp.blood_group], ["Phone", emp.phone]].map(([label, value]) => value ? (
          <div key={label as string} style={{ display: "flex", justifyContent: "space-between", marginBottom: 6, gap: 8 }}>
            <span style={{ fontSize: 7.5, color: "#bbb", letterSpacing: "0.06em", textTransform: "uppercase", flexShrink: 0 }}>{label}</span>
            <span style={{ fontSize: 8.5, fontWeight: 700, color: "#333", textAlign: "right", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{value as string}</span>
          </div>
        ) : null)}
      </div>
      <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, height: 28, borderTop: "1px solid #eee", background: "#f5f5f3", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <span style={{ fontSize: 7, color: "#bbb" }}>Emergency: {emp.emergency_contact || "—"}</span>
      </div>
    </div>
  );
}

function ExecutivePortrait({ emp, bizName, bizLogo }: { emp: Partial<Employee>; bizName: string; bizLogo?: string }) {
  const INFO_TOP = 252;
  const FOOTER_H = 26;
  return (
    <div style={{ width: 240, height: 380, borderRadius: 16, overflow: "hidden", fontFamily: "'Trebuchet MS', sans-serif", position: "relative", background: "#1a1a2e", boxShadow: "0 8px 32px rgba(0,0,0,0.5)" }}>
      <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 108, background: "linear-gradient(135deg,#b8860b,#d4a017,#8b6914)" }} />
      {/* Logo + company */}
      <div style={{ position: "absolute", top: 16, left: 0, right: 0, textAlign: "center" }}>
        {bizLogo ? <img src={bizLogo} alt="" style={{ width: 28, height: 28, borderRadius: 5, objectFit: "cover", margin: "0 auto 4px", display: "block", border: "1.5px solid rgba(255,255,255,0.3)" }} crossOrigin="anonymous" /> : <div style={{ width: 28, height: 28, borderRadius: 5, background: "rgba(255,255,255,0.15)", border: "1.5px solid rgba(255,255,255,0.3)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, color: "#fff", fontWeight: 700, margin: "0 auto 4px" }}>{(bizName || "B")[0]}</div>}
        <div style={{ color: "rgba(255,255,255,0.9)", fontSize: 10, fontWeight: 700, letterSpacing: "0.08em" }}>{(bizName || "COMPANY").toUpperCase()}</div>
        <div style={{ color: "rgba(255,255,255,0.5)", fontSize: 7, letterSpacing: "0.15em", textTransform: "uppercase", marginTop: 1 }}>Executive Identity Card</div>
      </div>
      {/* Photo */}
      <div style={{ position: "absolute", top: 110, left: 0, right: 0, display: "flex", justifyContent: "center" }}>
        {emp.photo_url ? <img src={emp.photo_url} alt="photo" style={{ width: 84, height: 84, objectFit: "cover", borderRadius: 10, border: "3px solid rgba(212,160,23,0.6)" }} crossOrigin="anonymous" /> : <div style={{ width: 84, height: 84, borderRadius: 10, background: "rgba(255,255,255,0.08)", border: "3px solid rgba(212,160,23,0.3)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 32, color: "rgba(255,255,255,0.15)" }}>👤</div>}
      </div>
      {/* Name / designation */}
      <div style={{ position: "absolute", top: 200, left: 0, right: 0, textAlign: "center", padding: "0 14px" }}>
        <div style={{ color: "#fff", fontSize: 15, fontWeight: 700, lineHeight: 1.2 }}>{emp.name || "Full Name"}</div>
        <div style={{ color: "#d4a017", fontSize: 8.5, letterSpacing: "0.12em", textTransform: "uppercase", marginTop: 3 }}>{emp.designation || "Designation"}</div>
        {emp.department && <div style={{ color: "rgba(255,255,255,0.4)", fontSize: 8, marginTop: 2 }}>{emp.department}</div>}
      </div>
      {/* Gold divider */}
      <div style={{ position: "absolute", top: INFO_TOP - 6, left: 18, right: 18, height: 1, background: "linear-gradient(90deg,transparent,rgba(212,160,23,0.4),transparent)" }} />
      {/* Info — absolutely anchored */}
      <div style={{ position: "absolute", top: INFO_TOP, left: 16, right: 16, bottom: FOOTER_H + 4, overflow: "hidden" }}>
        {[["ID", emp.employee_id], ["Joined", emp.date_of_joining], ["Blood", emp.blood_group], ["Phone", emp.phone]].map(([label, value]) => value ? (
          <div key={label as string} style={{ display: "flex", justifyContent: "space-between", marginBottom: 6, gap: 8 }}>
            <span style={{ color: "rgba(255,255,255,0.4)", fontSize: 7.5, flexShrink: 0, minWidth: 34 }}>{label}</span>
            <span style={{ color: "rgba(255,255,255,0.85)", fontSize: 7.5, textAlign: "right", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{value as string}</span>
          </div>
        ) : null)}
      </div>
      {/* Footer */}
      <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, height: FOOTER_H, background: "rgba(0,0,0,0.35)", display: "flex", justifyContent: "space-between", alignItems: "center", padding: "0 14px" }}>
        <div style={{ display: "flex", gap: 4, alignItems: "center" }}>
          <div style={{ width: 8, height: 8, borderRadius: 2, background: "#d4a017", opacity: 0.8 }} />
          <span style={{ color: "rgba(255,255,255,0.3)", fontSize: 6 }}>VALID EMPLOYEE</span>
        </div>
        <span style={{ color: "rgba(255,255,255,0.25)", fontSize: 6 }}>Emergency: {emp.emergency_contact || "—"}</span>
      </div>
    </div>
  );
}

// ── IDCard dispatcher ─────────────────────────────────────────────────────────
interface IDCardProps {
  emp: Partial<Employee> & { orientation?: Orientation };
  bizName: string;
  bizLogo?: string;
  showBack?: boolean;
}

function IDCard({ emp, bizName, bizLogo, showBack = false }: IDCardProps) {
  const t = emp.template || "simple";
  const portrait = emp.orientation === "portrait";
  const colors: SimpleColors = {
    topColor: emp.top_color || "#2563eb",
    bottomColor: emp.bottom_color || "#1e40af",
    accentColor: emp.accent_color || "#3b82f6",
    textColor: emp.text_color || "#444444",
    nameColor: emp.name_color || "#111111",
    showTopBar: emp.show_top_bar !== false,
    showBottomBar: emp.show_bottom_bar !== false,
  };

  const backFields: BackField[] = (emp as any).back_fields || DEFAULT_BACK_FIELDS;
  const footerText: string = (emp as any).back_footer_text ?? DEFAULT_FOOTER_TEXT;

  if (showBack) {
    return portrait
      ? <BackSidePortrait emp={emp} bizName={bizName} bizLogo={bizLogo} colors={colors} backFields={backFields} footerText={footerText} />
      : <BackSideLandscape emp={emp} bizName={bizName} bizLogo={bizLogo} colors={colors} backFields={backFields} footerText={footerText} />;
  }

  if (t === "simple") {
    return portrait
      ? <SimplePortrait emp={emp} bizName={bizName} bizLogo={bizLogo} colors={colors} />
      : <SimpleLandscape emp={emp} bizName={bizName} bizLogo={bizLogo} colors={colors} />;
  }
  if (portrait) {
    if (t === "modern")    return <ModernPortrait    emp={emp} bizName={bizName} bizLogo={bizLogo} />;
    if (t === "minimal")   return <MinimalPortrait   emp={emp} bizName={bizName} bizLogo={bizLogo} />;
    if (t === "executive") return <ExecutivePortrait emp={emp} bizName={bizName} bizLogo={bizLogo} />;
    return <ClassicPortrait emp={emp} bizName={bizName} bizLogo={bizLogo} />;
  }
  if (t === "modern")    return <ModernLandscape    emp={emp} bizName={bizName} bizLogo={bizLogo} />;
  if (t === "minimal")   return <MinimalLandscape   emp={emp} bizName={bizName} bizLogo={bizLogo} />;
  if (t === "executive") return <ExecutiveLandscape emp={emp} bizName={bizName} bizLogo={bizLogo} />;
  return <ClassicLandscape emp={emp} bizName={bizName} bizLogo={bizLogo} />;
}

// ── Card dimensions helper ────────────────────────────────────────────────────
function getCardDimensions(emp: Partial<Employee> & { orientation?: Orientation }) {
  const portrait = emp.orientation === "portrait";
  return portrait ? { width: 240, height: 380 } : { width: 340, height: 210 };
}

// ── Pixel-perfect download using DOM serialization ────────────────────────────
async function renderCardToCanvas(
  emp: Employee,
  bizName: string,
  bizLogo: string | undefined,
  showBack: boolean,
  scale = 3
): Promise<HTMLCanvasElement> {
  const { width, height } = getCardDimensions(emp);
  const isPortrait = (emp as any).orientation === "portrait";

  // Padded frame for a premium print look
  const PAD = 32;
  const frameW = width + PAD * 2;
  const frameH = height + PAD * 2;

  const wrapper = document.createElement("div");
  wrapper.style.cssText = `
    position: fixed;
    left: -${frameW * scale + 200}px;
    top: 0;
    width: ${frameW}px;
    height: ${frameH}px;
    overflow: hidden;
    z-index: -9999;
    background: transparent;
  `;
  document.body.appendChild(wrapper);

  const { createRoot } = await import("react-dom/client");
  const root = createRoot(wrapper);

  await new Promise<void>((resolve) => {
    root.render(
      <div style={{
        width: frameW,
        height: frameH,
        background: "linear-gradient(135deg, #f0f4ff 0%, #fafafa 50%, #f5f0ff 100%)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        position: "relative",
      }}>
        {/* Dot-grid background */}
        <div style={{
          position: "absolute", inset: 0,
          backgroundImage: "radial-gradient(circle, #c7d2fe 1px, transparent 1px)",
          backgroundSize: "16px 16px",
          opacity: 0.35,
        }} />
        {/* Corner bracket accents */}
        {([
          { top: 10, left: 10, borderTop: "2px solid #6366f1", borderLeft: "2px solid #6366f1" },
          { top: 10, right: 10, borderTop: "2px solid #6366f1", borderRight: "2px solid #6366f1" },
          { bottom: 10, left: 10, borderBottom: "2px solid #6366f1", borderLeft: "2px solid #6366f1" },
          { bottom: 10, right: 10, borderBottom: "2px solid #6366f1", borderRight: "2px solid #6366f1" },
        ] as React.CSSProperties[]).map((s, i) => (
          <div key={i} style={{ position: "absolute", width: 16, height: 16, borderRadius: 2, ...s }} />
        ))}
        {/* FRONT/BACK label */}
        <div style={{
          position: "absolute", bottom: 7, left: 0, right: 0,
          textAlign: "center", fontSize: 7, letterSpacing: "0.18em",
          color: "#a5b4fc", fontFamily: "'Trebuchet MS', sans-serif",
          textTransform: "uppercase",
        }}>
          {showBack ? "· BACK ·" : "· FRONT ·"}
        </div>
        {/* Card with premium drop shadow */}
        <div style={{
          position: "relative",
          filter: "drop-shadow(0 8px 32px rgba(80,60,180,0.18)) drop-shadow(0 2px 8px rgba(0,0,0,0.10))",
        }}>
          <IDCard emp={emp} bizName={bizName} bizLogo={bizLogo} showBack={showBack} />
        </div>
      </div>
    );
    // ── FIX: give portrait cards more time to fully paint all layers ──
    setTimeout(resolve, isPortrait ? 1400 : 900);
  });

  const imgs = Array.from(wrapper.querySelectorAll("img"));
  await Promise.all(
    imgs.map(
      (img) =>
        new Promise<void>((res) => {
          if (img.complete) { res(); return; }
          img.onload = () => res();
          img.onerror = () => res();
        })
    )
  );

  // ── FIX: extra settle tick after images load ──
  await new Promise<void>((res) => setTimeout(res, 100));

  const html2canvas = (await import("html2canvas")).default;
  const cardEl = wrapper.firstElementChild as HTMLElement;
  const canvas = await html2canvas(cardEl, {
    scale,
    useCORS: true,
    allowTaint: true,
    backgroundColor: null,
    logging: false,
    width: frameW,
    height: frameH,
    windowWidth: frameW,
    windowHeight: frameH,
    // ── FIX: ensure absolute-positioned elements inside overflow:hidden are captured ──
    scrollX: 0,
    scrollY: 0,
    onclone: (clonedDoc) => {
      // Force all elements in cloned doc to have explicit computed dimensions
      const allEls = clonedDoc.querySelectorAll("*");
      allEls.forEach((el) => {
        const htmlEl = el as HTMLElement;
        if (htmlEl.style) {
          // Ensure no transitions delay rendering in clone
          htmlEl.style.transition = "none";
          htmlEl.style.animation = "none";
        }
      });
    },
  });

  root.unmount();
  document.body.removeChild(wrapper);
  return canvas;
}

// ── Main Page ─────────────────────────────────────────────────────────────────
const Employees = () => {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [filtered, setFiltered] = useState<Employee[]>([]);
  const [search, setSearch] = useState("");
  const [bizName, setBizName] = useState("My Company");
  const [bizLogo, setBizLogo] = useState<string | undefined>();
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState({ ...EMPTY_FORM });
  const [previewEmp, setPreviewEmp] = useState<Employee | null>(null);
  const [previewShowBack, setPreviewShowBack] = useState(false);
  const [linkCopied, setLinkCopied] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [saving, setSaving] = useState(false);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  const [formPreviewBack, setFormPreviewBack] = useState(false);
  const photoRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!authLoading && user === null) navigate("/auth", { replace: true });
  }, [user, authLoading]);

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const onboardLink = user ? `${window.location.origin}/onboard/${user.id}` : "";

  // eslint-disable-next-line react-hooks/rules-of-hooks
  useEffect(() => { if (user) { fetchBiz(); fetchEmployees(); } }, [user]);
  // eslint-disable-next-line react-hooks/rules-of-hooks
  useEffect(() => {
    const q = search.toLowerCase();
    setFiltered(employees.filter(e =>
      e.name.toLowerCase().includes(q) ||
      e.designation.toLowerCase().includes(q) ||
      e.department.toLowerCase().includes(q) ||
      e.employee_id.toLowerCase().includes(q)
    ));
  }, [employees, search]);

  const fetchBiz = async () => {
    if (!user) return;
    const { data } = await (supabase as any).from("business_settings").select("business_name,seal_url").eq("user_id", user.id).maybeSingle();
    if (data?.business_name) setBizName(data.business_name);
    if (data?.seal_url) setBizLogo(data.seal_url);
  };

  const fetchEmployees = async () => {
    if (!user) return;
    const { data, error } = await (supabase as any).from("employees").select("*").eq("user_id", user.id).order("created_at", { ascending: false });
    if (!error) setEmployees(data || []);
  };

  const handlePhotoUpload = async (file: File) => {
    if (!user || !file.type.startsWith("image/")) return;
    setUploadingPhoto(true);
    const ext = file.name.split(".").pop();
    const path = `${user.id}/employees/${Date.now()}.${ext}`;
    const { error } = await supabase.storage.from("business-docs").upload(path, file, { upsert: true });
    if (!error) {
      const { data: { publicUrl } } = supabase.storage.from("business-docs").getPublicUrl(path);
      setForm(p => ({ ...p, photo_url: publicUrl }));
    } else {
      toast({ title: "Upload failed", variant: "destructive" });
    }
    setUploadingPhoto(false);
  };

  const handleSave = async () => {
    if (!user || !form.name.trim()) return;
    setSaving(true);
    const payload = { ...form, user_id: user.id };
    let error;
    if (editingId) {
      ({ error } = await (supabase as any).from("employees").update(payload).eq("id", editingId));
    } else {
      ({ error } = await (supabase as any).from("employees").insert(payload));
    }
    if (!error) {
      toast({ title: editingId ? "Employee updated ✅" : "Employee added ✅" });
      setShowForm(false);
      setForm({ ...EMPTY_FORM });
      setEditingId(null);
      fetchEmployees();
    } else {
      toast({ title: "Save failed", description: error.message, variant: "destructive" });
    }
    setSaving(false);
  };

  const handleEdit = (emp: Employee) => {
    setForm({
      name: emp.name, employee_id: emp.employee_id, designation: emp.designation,
      department: emp.department, email: emp.email, phone: emp.phone,
      blood_group: emp.blood_group, date_of_joining: emp.date_of_joining,
      address: emp.address, emergency_contact: emp.emergency_contact,
      photo_url: emp.photo_url || "", template: emp.template,
      orientation: (emp as any).orientation || "landscape",
      top_color: emp.top_color || "#2563eb",
      bottom_color: emp.bottom_color || "#1e40af",
      accent_color: emp.accent_color || "#3b82f6",
      text_color: emp.text_color || "#444444",
      name_color: emp.name_color || "#111111",
      show_top_bar: emp.show_top_bar !== false,
      show_bottom_bar: emp.show_bottom_bar !== false,
      back_fields: emp.back_fields || DEFAULT_BACK_FIELDS,
      back_footer_text: emp.back_footer_text || DEFAULT_FOOTER_TEXT,
    });
    setEditingId(emp.id);
    setShowForm(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this employee?")) return;
    await (supabase as any).from("employees").delete().eq("id", id);
    toast({ title: "Deleted" });
    fetchEmployees();
  };

  // ── Download: PNG front, PNG back, PDF (front p1 + back p2) ───────────────
  const downloadCard = async (emp: Employee, side: "front" | "back" | "both" | "pdf" = "both") => {
    setDownloadingId(emp.id);
    try {
      const baseName = emp.name.replace(/\s+/g, "_");

      if (side === "pdf") {
        // Render both sides in parallel
        const [frontCanvas, backCanvas] = await Promise.all([
          renderCardToCanvas(emp, bizName, bizLogo, false),
          renderCardToCanvas(emp, bizName, bizLogo, true),
        ]);

        const { jsPDF } = await import("jspdf");
        const toImg = (c: HTMLCanvasElement) => c.toDataURL("image/png", 1.0);

        // Scale=3, browser 96dpi → physical mm
        const mmW = frontCanvas.width  * 25.4 / (96 * 3);
        const mmH = frontCanvas.height * 25.4 / (96 * 3);
        const bMmW = backCanvas.width  * 25.4 / (96 * 3);
        const bMmH = backCanvas.height * 25.4 / (96 * 3);

        const pdf = new jsPDF({
          orientation: mmW >= mmH ? "landscape" : "portrait",
          unit: "mm",
          format: [Math.max(mmW, bMmW), Math.max(mmH, bMmH)],
        });

        // Page 1 — Front
        pdf.addImage(toImg(frontCanvas), "PNG", 0, 0, mmW, mmH);

        // Page 2 — Back (centred if different size)
        pdf.addPage([Math.max(mmW, bMmW), Math.max(mmH, bMmH)], mmW >= mmH ? "landscape" : "portrait");
        const offX = (Math.max(mmW, bMmW) - bMmW) / 2;
        const offY = (Math.max(mmH, bMmH) - bMmH) / 2;
        pdf.addImage(toImg(backCanvas), "PNG", offX, offY, bMmW, bMmH);

        pdf.save(`${baseName}_ID_Card.pdf`);
        toast({ title: "PDF downloaded ✅  (Front + Back)" });

      } else {
        if (side === "front" || side === "both") {
          const canvas = await renderCardToCanvas(emp, bizName, bizLogo, false);
          const a = document.createElement("a");
          a.href = canvas.toDataURL("image/png");
          a.download = `${baseName}_ID_Front.png`;
          a.click();
        }
        if (side === "back" || side === "both") {
          if (side === "both") await new Promise(r => setTimeout(r, 400));
          const canvas = await renderCardToCanvas(emp, bizName, bizLogo, true);
          const a = document.createElement("a");
          a.href = canvas.toDataURL("image/png");
          a.download = `${baseName}_ID_Back.png`;
          a.click();
        }
        toast({ title: side === "both" ? "Front & Back downloaded ✅" : `${side === "front" ? "Front" : "Back"} downloaded ✅` });
      }
    } catch (err) {
      console.error(err);
      toast({ title: "Download failed", variant: "destructive" });
    }
    setDownloadingId(null);
  };

  const copyOnboardLink = () => {
    navigator.clipboard.writeText(onboardLink).then(() => {
      setLinkCopied(true);
      toast({ title: "Onboarding link copied! 🔗" });
      setTimeout(() => setLinkCopied(false), 2500);
    });
  };

  const f = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setForm(p => ({ ...p, [k]: e.target.value }));

  // ── Back field helpers ────────────────────────────────────────────────────
  const addBackField = () => {
    const newField: BackField = {
      id: `bf_${Date.now()}`,
      label: "Custom Field",
      value: "",
      isCustom: true,
    };
    setForm(p => ({ ...p, back_fields: [...(p.back_fields || DEFAULT_BACK_FIELDS), newField] }));
  };

  const updateBackField = (idx: number, patch: Partial<BackField>) => {
    setForm(p => ({
      ...p,
      back_fields: (p.back_fields || DEFAULT_BACK_FIELDS).map((f, i) => i === idx ? { ...f, ...patch } : f),
    }));
  };

  const removeBackField = (idx: number) => {
    setForm(p => ({
      ...p,
      back_fields: (p.back_fields || DEFAULT_BACK_FIELDS).filter((_, i) => i !== idx),
    }));
  };

  const toggleFieldType = (idx: number) => {
    setForm(p => ({
      ...p,
      back_fields: (p.back_fields || DEFAULT_BACK_FIELDS).map((f, i) =>
        i === idx ? { ...f, isCustom: !f.isCustom, value: "" } : f
      ),
    }));
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-indigo-50">
      <div className="container mx-auto px-4 py-8 max-w-6xl">

        <div className="flex items-center justify-between mb-8 flex-wrap gap-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
              <Users className="w-8 h-8 text-indigo-600" /> Employees
            </h1>
            <p className="text-gray-500 mt-1">Manage staff and generate ID cards</p>
          </div>
          <div className="flex gap-2 flex-wrap">
            <Button variant="outline" onClick={copyOnboardLink} className="border-indigo-300 text-indigo-700 hover:bg-indigo-50" size="sm">
              {linkCopied ? "✅ Copied!" : <><Link className="w-4 h-4 mr-1" />Self-Onboard Link</>}
            </Button>
            <Button onClick={() => { setForm({ ...EMPTY_FORM }); setEditingId(null); setShowForm(true); }} className="bg-indigo-600 hover:bg-indigo-700 text-white">
              <Plus className="w-4 h-4 mr-2" /> Add Employee
            </Button>
          </div>
        </div>

        <div className="mb-6 flex items-center gap-3 bg-indigo-50 border border-indigo-200 rounded-xl px-4 py-3">
          <ExternalLink className="w-4 h-4 text-indigo-600 shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-xs font-semibold text-indigo-800">Employee Self-Onboarding</p>
            <p className="text-xs text-indigo-500 truncate">{onboardLink}</p>
          </div>
          <Button size="sm" variant="outline" className="border-indigo-300 text-indigo-700 shrink-0" onClick={copyOnboardLink}>
            <Copy className="w-3.5 h-3.5 mr-1" /> Copy
          </Button>
          <a href={onboardLink} target="_blank" rel="noreferrer">
            <Button size="sm" className="bg-indigo-600 text-white shrink-0">
              <ExternalLink className="w-3.5 h-3.5 mr-1" /> Open
            </Button>
          </a>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-6 gap-4 mb-6">
          {[
            { label: "Total",     value: employees.length,                                         color: "text-gray-900" },
            { label: "Simple",    value: employees.filter(e => e.template === "simple").length,    color: "text-blue-700" },
            { label: "Classic",   value: employees.filter(e => e.template === "classic").length,   color: "text-sky-700" },
            { label: "Modern",    value: employees.filter(e => e.template === "modern").length,    color: "text-violet-700" },
            { label: "Minimal",   value: employees.filter(e => e.template === "minimal").length,   color: "text-emerald-700" },
            { label: "Executive", value: employees.filter(e => e.template === "executive").length, color: "text-amber-700" },
          ].map(({ label, value, color }) => (
            <div key={label} className="bg-white rounded-xl border border-gray-200 shadow-sm p-4">
              <p className="text-xs text-gray-400">{label}</p>
              <p className={`text-2xl font-bold ${color}`}>{value}</p>
            </div>
          ))}
        </div>

        <div className="relative mb-6 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <Input placeholder="Search name, role, dept…" value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
        </div>

        {filtered.length === 0 ? (
          <div className="text-center py-24 text-gray-400">
            <CreditCard className="w-12 h-12 mx-auto mb-3 opacity-20" />
            <p className="text-lg font-medium">No employees yet</p>
            <p className="text-sm mt-1">Add your first employee or share the onboarding link</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
            {filtered.map(emp => {
              const isPortrait = (emp as any).orientation === "portrait";
              return (
                <div key={emp.id} className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden hover:shadow-md transition-shadow">
                  <div className={`p-4 bg-gray-50 flex justify-center ${isPortrait ? "min-h-[260px]" : "min-h-[160px]"} items-center`}>
                    <IDCard emp={emp} bizName={bizName} bizLogo={bizLogo} />
                  </div>
                  <div className="p-3 flex items-center justify-between border-t border-gray-100 gap-2 flex-wrap">
                    <div className="min-w-0">
                      <p className="font-semibold text-sm text-gray-900">{emp.name}</p>
                      <div className="flex items-center gap-1 mt-0.5 flex-wrap">
                        <p className="text-xs text-gray-400">{emp.designation} · {emp.department}</p>
                        <span className={`text-xs px-1.5 py-0.5 rounded font-medium ml-1 ${isPortrait ? "bg-purple-100 text-purple-700" : "bg-gray-100 text-gray-500"}`}>
                          {isPortrait ? "portrait" : "landscape"}
                        </span>
                      </div>
                    </div>
                    <div className="flex gap-1 flex-wrap">
                      <Button size="sm" variant="outline" onClick={() => { setPreviewEmp(emp); setPreviewShowBack(false); }} title="Preview">
                        <Eye className="w-3.5 h-3.5" />
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => handleEdit(emp)} title="Edit">✏️</Button>

                      {/* Download group */}
                      <div className="flex">
                        <Button
                          size="sm" variant="outline"
                          className="text-indigo-600 border-indigo-200 rounded-r-none border-r-0 px-2"
                          onClick={() => downloadCard(emp, "both")}
                          disabled={downloadingId === emp.id}
                          title="Download Front + Back PNG"
                        >
                          {downloadingId === emp.id
                            ? <div className="w-3.5 h-3.5 border-2 border-indigo-400 border-t-transparent rounded-full animate-spin" />
                            : <Download className="w-3.5 h-3.5" />
                          }
                        </Button>
                        <Button
                          size="sm" variant="outline"
                          className="text-indigo-600 border-indigo-200 rounded-none border-r-0 px-1.5 text-xs"
                          onClick={() => downloadCard(emp, "front")}
                          disabled={downloadingId === emp.id}
                          title="Front PNG only"
                        >F</Button>
                        <Button
                          size="sm" variant="outline"
                          className="text-indigo-600 border-indigo-200 rounded-none border-r-0 px-1.5 text-xs"
                          onClick={() => downloadCard(emp, "back")}
                          disabled={downloadingId === emp.id}
                          title="Back PNG only"
                        >B</Button>
                        <Button
                          size="sm" variant="outline"
                          className="text-violet-600 border-violet-300 rounded-l-none px-1.5 text-xs font-bold hover:bg-violet-50"
                          onClick={() => downloadCard(emp, "pdf")}
                          disabled={downloadingId === emp.id}
                          title="Download PDF (Front + Back)"
                        >PDF</Button>
                      </div>

                      <Button size="sm" variant="ghost" className="text-red-400 hover:text-red-600" onClick={() => handleDelete(emp.id)}>
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* ── Add / Edit Dialog ── */}
        <Dialog open={showForm} onOpenChange={v => { if (!v) { setShowForm(false); setEditingId(null); } }}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{editingId ? "Edit Employee" : "Add New Employee"}</DialogTitle>
            </DialogHeader>

            {/* Template picker */}
            <div className="mb-3">
              <Label className="text-xs text-gray-500 mb-2 block">ID Card Template</Label>
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                {TEMPLATES.map(t => (
                  <button key={t.key} onClick={() => setForm(p => ({ ...p, template: t.key }))}
                    className={`rounded-xl border-2 p-3 text-left transition-all ${form.template === t.key ? "border-indigo-500 bg-indigo-50" : "border-gray-200 hover:border-gray-300"}`}>
                    <p className="font-semibold text-sm text-gray-800">{t.label}</p>
                    <p className="text-xs text-gray-400 mt-0.5">{t.desc}</p>
                  </button>
                ))}
              </div>
            </div>

            {/* Color pickers — Simple template only */}
            {form.template === "simple" && (
              <div className="mb-3 p-3 bg-blue-50 border border-blue-100 rounded-xl">
                <Label className="text-xs text-blue-700 font-semibold mb-3 block">🎨 Customize Colors & Text</Label>
                <div className="grid grid-cols-3 sm:grid-cols-5 gap-3 mb-3">
                  {([
                    { label: "Top Bar",    colorKey: "top_color" as const,    toggleKey: "show_top_bar" as const },
                    { label: "Bottom Bar", colorKey: "bottom_color" as const, toggleKey: "show_bottom_bar" as const },
                    { label: "Accent",     colorKey: "accent_color" as const, toggleKey: null },
                    { label: "Name",       colorKey: "name_color" as const,   toggleKey: null },
                    { label: "Body Text",  colorKey: "text_color" as const,   toggleKey: null },
                  ] as const).map(({ label, colorKey, toggleKey }) => (
                    <div key={colorKey} className="flex flex-col items-center gap-1.5">
                      <div className="w-10 h-10 rounded-lg border-2 border-white shadow-md cursor-pointer relative overflow-hidden"
                        style={{ background: form[colorKey] }}>
                        <input type="color" value={form[colorKey]}
                          onChange={e => setForm(p => ({ ...p, [colorKey]: e.target.value }))}
                          className="absolute inset-0 opacity-0 cursor-pointer w-full h-full" />
                      </div>
                      <span className="text-xs text-gray-600 font-medium text-center">{label}</span>
                      <span className="text-xs font-mono text-gray-400">{form[colorKey]}</span>
                      {toggleKey && (
                        <label className="flex items-center gap-1.5 cursor-pointer mt-0.5">
                          <div
                            onClick={() => setForm(p => ({ ...p, [toggleKey]: !p[toggleKey] }))}
                            className={`w-8 h-4 rounded-full transition-colors relative ${form[toggleKey] ? "bg-indigo-500" : "bg-gray-300"}`}
                          >
                            <div className={`absolute top-0.5 w-3 h-3 bg-white rounded-full shadow transition-transform ${form[toggleKey] ? "translate-x-4" : "translate-x-0.5"}`} />
                          </div>
                          <span className="text-xs text-gray-500">{form[toggleKey] ? "On" : "Off"}</span>
                        </label>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Orientation picker */}
            <div className="mb-3">
              <Label className="text-xs text-gray-500 mb-2 block">
                <LayoutTemplate className="w-3.5 h-3.5 inline mr-1" /> Orientation
              </Label>
              <div className="grid grid-cols-2 gap-2">
                {(["landscape", "portrait"] as Orientation[]).map(o => (
                  <button key={o} onClick={() => setForm(p => ({ ...p, orientation: o }))}
                    className={`rounded-xl border-2 p-3 text-left transition-all flex items-center gap-2 ${form.orientation === o ? "border-indigo-500 bg-indigo-50" : "border-gray-200 hover:border-gray-300"}`}>
                    <div className={`border-2 rounded border-gray-400 bg-gray-100 flex-shrink-0 ${o === "landscape" ? "w-8 h-5" : "w-5 h-8"}`} />
                    <div>
                      <p className="font-semibold text-sm text-gray-800 capitalize">{o}</p>
                      <p className="text-xs text-gray-400">{o === "landscape" ? "340 × 210 px" : "240 × 380 px"}</p>
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* ── Back Card Customizer ── */}
            <div className="mb-3 p-3 bg-slate-50 border border-slate-200 rounded-xl">
              <div className="flex items-center justify-between mb-3">
                <Label className="text-xs text-slate-700 font-semibold">🪪 Back Card Fields</Label>
                <Button
                  size="sm" variant="outline"
                  className="text-xs h-7 border-slate-300 text-slate-600"
                  onClick={addBackField}
                >
                  <Plus className="w-3 h-3 mr-1" /> Add Field
                </Button>
              </div>

              <div className="flex flex-col gap-2 mb-3">
                {(form.back_fields || DEFAULT_BACK_FIELDS).map((field, idx) => (
                  <div key={field.id} className="flex items-center gap-2 bg-white border border-slate-200 rounded-lg p-2">
                    {/* Label input */}
                    <Input
                      className="h-7 text-xs w-24 shrink-0 px-2"
                      value={field.label}
                      placeholder="Label"
                      onChange={e => updateBackField(idx, { label: e.target.value })}
                    />
                    {/* Value: dropdown or free text */}
                    {field.isCustom ? (
                      <Input
                        className="h-7 text-xs flex-1 px-2"
                        value={field.value}
                        placeholder="Enter custom text…"
                        onChange={e => updateBackField(idx, { value: e.target.value })}
                      />
                    ) : (
                      <Select
                        value={field.value}
                        onValueChange={v => updateBackField(idx, { value: v })}
                      >
                        <SelectTrigger className="h-7 text-xs flex-1">
                          <SelectValue placeholder="Pick employee field…" />
                        </SelectTrigger>
                        <SelectContent>
                          {BACK_FIELD_OPTIONS.map(o => (
                            <SelectItem key={o.empKey} value={`{{${o.empKey}}}`}>
                              {o.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                    {/* Toggle employee field ↔ custom text */}
                    <button
                      className="shrink-0 text-slate-400 hover:text-slate-700 text-xs px-1 py-0.5 rounded border border-slate-200 hover:border-slate-400 transition-colors"
                      title={field.isCustom ? "Switch to employee field" : "Switch to free text"}
                      onClick={() => toggleFieldType(idx)}
                    >
                      {field.isCustom ? "🔗" : "✏️"}
                    </button>
                    {/* Remove */}
                    <button
                      className="shrink-0 text-red-400 hover:text-red-600"
                      onClick={() => removeBackField(idx)}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
                {(form.back_fields || DEFAULT_BACK_FIELDS).length === 0 && (
                  <p className="text-xs text-slate-400 text-center py-3">No fields — click "Add Field" to start</p>
                )}
              </div>

              {/* Footer / terms text */}
              <div>
                <Label className="text-xs text-slate-500 mb-1 block">Footer / Terms Text</Label>
                <textarea
                  className="w-full text-xs border border-slate-200 rounded-lg p-2 resize-none bg-white focus:outline-none focus:ring-1 focus:ring-indigo-400"
                  rows={2}
                  value={form.back_footer_text}
                  onChange={e => setForm(p => ({ ...p, back_footer_text: e.target.value }))}
                  placeholder="Footer text shown on back card…"
                />
              </div>
            </div>

            {/* Live preview with front/back toggle */}
            <div className="mb-4">
              <div className="flex items-center justify-between mb-2">
                <Label className="text-xs text-gray-500">Live Preview</Label>
                <div className="flex gap-1">
                  <button
                    onClick={() => setFormPreviewBack(false)}
                    className={`text-xs px-3 py-1 rounded-lg border transition-all ${!formPreviewBack ? "bg-indigo-600 text-white border-indigo-600" : "border-gray-200 text-gray-500 hover:border-gray-300"}`}
                  >Front</button>
                  <button
                    onClick={() => setFormPreviewBack(true)}
                    className={`text-xs px-3 py-1 rounded-lg border transition-all ${formPreviewBack ? "bg-indigo-600 text-white border-indigo-600" : "border-gray-200 text-gray-500 hover:border-gray-300"}`}
                  >Back</button>
                </div>
              </div>
              <div className="flex justify-center bg-gray-50 rounded-xl p-4 border border-dashed border-gray-200 min-h-[120px] items-center">
                <IDCard emp={{ ...form } as Partial<Employee> & { orientation?: Orientation }} bizName={bizName} bizLogo={bizLogo} showBack={formPreviewBack} />
              </div>
            </div>

            {/* Photo upload */}
            <div className="mb-4">
              <Label className="text-xs text-gray-500 mb-2 block">Employee Photo</Label>
              <div className="flex items-center gap-3">
                {form.photo_url
                  ? <img src={form.photo_url} alt="preview" className="w-14 h-14 rounded-xl object-cover border border-gray-200" />
                  : <div className="w-14 h-14 rounded-xl bg-gray-100 border border-dashed border-gray-300 flex items-center justify-center text-2xl">👤</div>
                }
                <div>
                  <Button size="sm" variant="outline" disabled={uploadingPhoto} onClick={() => photoRef.current?.click()}>
                    {uploadingPhoto ? "Uploading…" : "Upload Photo"}
                  </Button>
                  <p className="text-xs text-gray-400 mt-1">JPG/PNG, max 5MB</p>
                </div>
                <input ref={photoRef} type="file" accept="image/*" className="hidden"
                  onChange={e => { if (e.target.files?.[0]) handlePhotoUpload(e.target.files[0]); e.target.value = ""; }} />
              </div>
            </div>

            {/* Employee fields */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {[
                { label: "Full Name *",       key: "name",               placeholder: "John Doe" },
                { label: "Employee ID *",     key: "employee_id",        placeholder: "EMP-001" },
                { label: "Designation",       key: "designation",        placeholder: "Software Engineer" },
                { label: "Department",        key: "department",         placeholder: "Engineering" },
                { label: "Email",             key: "email",              placeholder: "john@company.com" },
                { label: "Phone",             key: "phone",              placeholder: "+91 9876543210" },
                { label: "Date of Joining",   key: "date_of_joining",    placeholder: "2024-01-15", type: "date" },
                { label: "Emergency Contact", key: "emergency_contact",  placeholder: "+91 9876543210" },
                { label: "Address",           key: "address",            placeholder: "City, State", colSpan: true },
              ].map(({ label, key, placeholder, type, colSpan }) => (
                <div key={key} className={colSpan ? "sm:col-span-2" : ""}>
                  <Label className="text-xs text-gray-500 mb-1 block">{label}</Label>
                  <Input type={type || "text"} placeholder={placeholder} value={form[key as keyof typeof form] as string} onChange={f(key as keyof typeof form)} />
                </div>
              ))}
              <div>
                <Label className="text-xs text-gray-500 mb-1 block">Blood Group</Label>
                <Select value={form.blood_group} onValueChange={v => setForm(p => ({ ...p, blood_group: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{BLOOD_GROUPS.map(g => <SelectItem key={g} value={g}>{g}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>

            <div className="flex gap-2 justify-end mt-4">
              <Button variant="outline" onClick={() => { setShowForm(false); setEditingId(null); }}>Cancel</Button>
              <Button onClick={handleSave} disabled={!form.name.trim() || saving} className="bg-indigo-600 hover:bg-indigo-700 text-white">
                {saving ? "Saving…" : editingId ? "Update" : "Add Employee"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        {/* ── Preview dialog ── */}
        <Dialog open={!!previewEmp} onOpenChange={() => { setPreviewEmp(null); setPreviewShowBack(false); }}>
          <DialogContent className="max-w-sm">
            <DialogHeader><DialogTitle>ID Card Preview</DialogTitle></DialogHeader>
            {previewEmp && (
              <div className="flex flex-col items-center gap-4 py-2">
                <div className="flex gap-1 bg-gray-100 rounded-xl p-1">
                  <button
                    onClick={() => setPreviewShowBack(false)}
                    className={`text-sm px-4 py-1.5 rounded-lg transition-all ${!previewShowBack ? "bg-white shadow text-gray-900 font-medium" : "text-gray-500"}`}
                  >Front</button>
                  <button
                    onClick={() => setPreviewShowBack(true)}
                    className={`text-sm px-4 py-1.5 rounded-lg transition-all ${previewShowBack ? "bg-white shadow text-gray-900 font-medium" : "text-gray-500"}`}
                  >Back</button>
                </div>

                <IDCard emp={previewEmp} bizName={bizName} bizLogo={bizLogo} showBack={previewShowBack} />

                <div className="text-center">
                  <p className="font-semibold text-gray-900">{previewEmp.name}</p>
                  <p className="text-sm text-gray-400">{previewEmp.designation} · {previewEmp.department}</p>
                </div>

                <div className="w-full flex gap-2 flex-wrap">
                  <Button
                    onClick={() => downloadCard(previewEmp, "front")}
                    disabled={downloadingId === previewEmp.id}
                    variant="outline"
                    className="flex-1 border-indigo-200 text-indigo-600 min-w-[60px]"
                  >
                    {downloadingId === previewEmp.id
                      ? <div className="w-4 h-4 border-2 border-indigo-400 border-t-transparent rounded-full animate-spin mr-1" />
                      : <Download className="w-4 h-4 mr-1" />
                    }
                    Front
                  </Button>
                  <Button
                    onClick={() => downloadCard(previewEmp, "back")}
                    disabled={downloadingId === previewEmp.id}
                    variant="outline"
                    className="flex-1 border-indigo-200 text-indigo-600 min-w-[60px]"
                  >
                    {downloadingId === previewEmp.id
                      ? <div className="w-4 h-4 border-2 border-indigo-400 border-t-transparent rounded-full animate-spin mr-1" />
                      : <Download className="w-4 h-4 mr-1" />
                    }
                    Back
                  </Button>
                  <Button
                    onClick={() => downloadCard(previewEmp, "both")}
                    disabled={downloadingId === previewEmp.id}
                    className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white min-w-[60px]"
                  >
                    {downloadingId === previewEmp.id
                      ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-1" />
                      : <Download className="w-4 h-4 mr-1" />
                    }
                    Both
                  </Button>
                  <Button
                    onClick={() => downloadCard(previewEmp, "pdf")}
                    disabled={downloadingId === previewEmp.id}
                    variant="outline"
                    className="flex-1 border-violet-300 text-violet-700 hover:bg-violet-50 font-bold min-w-[60px]"
                  >
                    {downloadingId === previewEmp.id
                      ? <div className="w-4 h-4 border-2 border-violet-400 border-t-transparent rounded-full animate-spin mr-1" />
                      : <Download className="w-4 h-4 mr-1" />
                    }
                    PDF
                  </Button>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>

      </div>
    </div>
  );
};

export default Employees;