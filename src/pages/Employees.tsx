// src/pages/Employees.tsx
import { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
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
import html2canvas from "html2canvas";

// ── Types ─────────────────────────────────────────────────────────────────────
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
  show_top_bar?: boolean;
  show_bottom_bar?: boolean;
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

const EMPTY_FORM = {
  name: "", employee_id: "", designation: "", department: "",
  email: "", phone: "", blood_group: "O+", date_of_joining: "",
  address: "", emergency_contact: "", photo_url: "",
  template: "simple" as Template,
  orientation: "landscape" as Orientation,
  top_color: "#2563eb",
  bottom_color: "#1e40af",
  accent_color: "#3b82f6",
  show_top_bar: true,
  show_bottom_bar: true,
};

// ── SIMPLE TEMPLATE ───────────────────────────────────────────────────────────
interface SimpleColors {
  topColor: string;
  bottomColor: string;
  accentColor: string;
  showTopBar: boolean;
  showBottomBar: boolean;
}

function SimpleLandscape({ emp, bizName, bizLogo, colors }: {
  emp: Partial<Employee>; bizName: string; bizLogo?: string; colors: SimpleColors;
}) {
  const { topColor, bottomColor, accentColor, showTopBar, showBottomBar } = colors;
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
          <div style={{ color: "#111", fontSize: 11, fontWeight: 700, letterSpacing: "0.04em" }}>{bizName || "COMPANY NAME"}</div>
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
          <div style={{ color: "#111", fontSize: 14, fontWeight: 700, lineHeight: 1.2, marginBottom: 2 }}>{emp.name || "Full Name"}</div>
          <div style={{ color: accentColor, fontSize: 9, letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 6 }}>{emp.designation || "Designation"}</div>
          {[["Dept", emp.department], ["ID", emp.employee_id], ["Joined", emp.date_of_joining], ["📞", emp.phone]].map(([label, value]) =>
            value ? (
              <div key={label as string} style={{ display: "flex", gap: 4, marginBottom: 2 }}>
                <span style={{ color: "#aaa", fontSize: 8, width: 30, flexShrink: 0 }}>{label}</span>
                <span style={{ color: "#444", fontSize: 8, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{value as string}</span>
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
  const { topColor, bottomColor, accentColor, showTopBar, showBottomBar } = colors;
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
        <div style={{ color: "#111", fontSize: 16, fontWeight: 700, lineHeight: 1.2 }}>{emp.name || "Full Name"}</div>
        <div style={{ color: accentColor, fontSize: 9, letterSpacing: "0.12em", textTransform: "uppercase", marginTop: 3 }}>{emp.designation || "Designation"}</div>
        {emp.department && <div style={{ color: "#aaa", fontSize: 9, marginTop: 2 }}>{emp.department}</div>}
      </div>
      <div style={{ margin: "10px 20px", height: 1, background: "#f0f0f0" }} />
      <div style={{ padding: "0 18px" }}>
        {[["Employee ID", emp.employee_id], ["Date of Joining", emp.date_of_joining], ["Blood Group", emp.blood_group], ["Phone", emp.phone]].map(([label, value]) =>
          value ? (
            <div key={label as string} style={{ display: "flex", justifyContent: "space-between", marginBottom: 7, gap: 8 }}>
              <span style={{ fontSize: 8, color: "#bbb", letterSpacing: "0.07em", textTransform: "uppercase", flexShrink: 0 }}>{label}</span>
              <span style={{ fontSize: 9, fontWeight: 700, color: "#333", textAlign: "right" }}>{value as string}</span>
            </div>
          ) : null
        )}
      </div>
      {showBottomBar && (
        <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, height: 26, background: bottomColor, display: "flex", alignItems: "center", justifyContent: "center" }}>
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
      <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, background: "rgba(0,0,0,0.3)", padding: "4px 14px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
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
      <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, background: "rgba(255,255,255,0.04)", borderTop: "1px solid rgba(255,255,255,0.07)", padding: "5px 14px", display: "flex", justifyContent: "space-between" }}>
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
      <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, borderTop: "1px solid #eee", background: "#f5f5f3", padding: "4px 14px", display: "flex", justifyContent: "space-between" }}>
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
      <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, background: "rgba(0,0,0,0.35)", padding: "5px 14px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
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
  return (
    <div style={{ width: 240, height: 380, borderRadius: 16, overflow: "hidden", fontFamily: "'Georgia', serif", position: "relative", background: "linear-gradient(175deg,#0f2557 0%,#1a3a8a 50%,#0f2557 100%)", boxShadow: "0 8px 32px rgba(0,0,0,0.35)" }}>
      <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 5, background: "linear-gradient(90deg,#f0c040,#e8a020,#f0c040)" }} />
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", padding: "20px 16px 14px" }}>
        {bizLogo ? <img src={bizLogo} alt="logo" style={{ width: 36, height: 36, borderRadius: 6, objectFit: "cover", marginBottom: 6 }} crossOrigin="anonymous" /> : <div style={{ width: 36, height: 36, borderRadius: 6, background: "#f0c040", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16, fontWeight: 700, color: "#0f2557", marginBottom: 6 }}>{(bizName || "B")[0]}</div>}
        <div style={{ color: "#fff", fontSize: 12, fontWeight: 700, letterSpacing: "0.06em", textAlign: "center" }}>{bizName || "COMPANY NAME"}</div>
        <div style={{ color: "#f0c040", fontSize: 8, letterSpacing: "0.18em", textTransform: "uppercase", marginTop: 2 }}>Employee ID Card</div>
      </div>
      <div style={{ margin: "0 16px 14px", height: 1, background: "rgba(240,192,64,0.25)" }} />
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", marginBottom: 14 }}>
        {emp.photo_url ? <img src={emp.photo_url} alt="photo" style={{ width: 90, height: 108, objectFit: "cover", borderRadius: 10, border: "3px solid #f0c040" }} crossOrigin="anonymous" /> : <div style={{ width: 90, height: 108, borderRadius: 10, background: "rgba(255,255,255,0.1)", border: "3px solid rgba(240,192,64,0.4)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 40, color: "rgba(255,255,255,0.2)" }}>👤</div>}
        <div style={{ marginTop: 6, background: "#f0c040", borderRadius: 4, padding: "2px 10px" }}><span style={{ fontSize: 8, fontWeight: 700, color: "#0f2557" }}>{emp.blood_group || "—"}</span></div>
      </div>
      <div style={{ textAlign: "center", padding: "0 16px", marginBottom: 14 }}>
        <div style={{ color: "#fff", fontSize: 16, fontWeight: 700 }}>{emp.name || "Full Name"}</div>
        <div style={{ color: "#f0c040", fontSize: 9, letterSpacing: "0.12em", textTransform: "uppercase", marginTop: 3 }}>{emp.designation || "Designation"}</div>
        {emp.department && <div style={{ color: "rgba(255,255,255,0.5)", fontSize: 9, marginTop: 2 }}>{emp.department}</div>}
      </div>
      <div style={{ margin: "0 14px", background: "rgba(255,255,255,0.07)", borderRadius: 10, padding: "10px 12px" }}>
        {[["ID", emp.employee_id], ["Joined", emp.date_of_joining], ["Phone", emp.phone], ["Email", emp.email]].map(([label, value]) => value ? (
          <div key={label as string} style={{ display: "flex", justifyContent: "space-between", marginBottom: 5, gap: 8 }}>
            <span style={{ color: "rgba(255,255,255,0.4)", fontSize: 8, flexShrink: 0 }}>{label}</span>
            <span style={{ color: "rgba(255,255,255,0.85)", fontSize: 8, textAlign: "right", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{value as string}</span>
          </div>
        ) : null)}
      </div>
      <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, background: "rgba(0,0,0,0.3)", padding: "5px 14px", textAlign: "center" }}>
        <span style={{ color: "rgba(255,255,255,0.35)", fontSize: 7 }}>Emergency: {emp.emergency_contact || "—"}</span>
      </div>
    </div>
  );
}

function ModernPortrait({ emp, bizName, bizLogo }: { emp: Partial<Employee>; bizName: string; bizLogo?: string }) {
  return (
    <div style={{ width: 240, height: 380, borderRadius: 16, overflow: "hidden", fontFamily: "'Trebuchet MS', sans-serif", position: "relative", background: "#111118", boxShadow: "0 8px 32px rgba(0,0,0,0.5)" }}>
      <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 5, background: "linear-gradient(90deg,#6c47ff,#00d4ff)" }} />
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8, padding: "20px 16px 14px" }}>
        {bizLogo ? <img src={bizLogo} alt="" style={{ width: 22, height: 22, borderRadius: 4, objectFit: "cover" }} crossOrigin="anonymous" /> : <div style={{ width: 22, height: 22, borderRadius: 4, background: "linear-gradient(135deg,#6c47ff,#00d4ff)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 10, color: "#fff", fontWeight: 800 }}>{(bizName || "B")[0]}</div>}
        <span style={{ color: "rgba(255,255,255,0.5)", fontSize: 9, letterSpacing: "0.14em", textTransform: "uppercase" }}>{bizName || "Company"}</span>
      </div>
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", marginBottom: 14 }}>
        {emp.photo_url ? <img src={emp.photo_url} alt="photo" style={{ width: 88, height: 104, objectFit: "cover", borderRadius: 12, border: "2px solid rgba(108,71,255,0.6)" }} crossOrigin="anonymous" /> : <div style={{ width: 88, height: 104, borderRadius: 12, background: "rgba(108,71,255,0.15)", border: "2px solid rgba(108,71,255,0.3)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 38, color: "rgba(255,255,255,0.15)" }}>👤</div>}
        <div style={{ marginTop: 8, background: "linear-gradient(90deg,#6c47ff,#00d4ff)", borderRadius: 20, padding: "3px 12px" }}><span style={{ fontSize: 9, fontWeight: 700, color: "#fff" }}>{emp.blood_group || "—"}</span></div>
      </div>
      <div style={{ textAlign: "center", padding: "0 14px", marginBottom: 14 }}>
        <div style={{ color: "#fff", fontSize: 16, fontWeight: 800 }}>{emp.name || "Full Name"}</div>
        <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase", marginTop: 4, background: "linear-gradient(90deg,#6c47ff,#00d4ff)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>{emp.designation || "Role"}</div>
        {emp.department && <div style={{ color: "rgba(255,255,255,0.35)", fontSize: 9, marginTop: 2 }}>{emp.department}</div>}
      </div>
      <div style={{ margin: "0 12px", background: "rgba(255,255,255,0.05)", borderRadius: 10, padding: "10px 12px", border: "1px solid rgba(255,255,255,0.07)" }}>
        {[[emp.employee_id, "#", "ID"], [emp.phone, "📞", "Phone"], [emp.email, "✉", "Email"], [emp.date_of_joining, "📅", "Joined"]].filter(([v]) => v).map(([value, icon, label], i) => (
          <div key={i} style={{ display: "flex", gap: 6, marginBottom: 5, alignItems: "center" }}>
            <span style={{ fontSize: 9, width: 14, flexShrink: 0 }}>{icon}</span>
            <span style={{ color: "rgba(255,255,255,0.35)", fontSize: 8, width: 36, flexShrink: 0 }}>{label}</span>
            <span style={{ color: "rgba(255,255,255,0.65)", fontSize: 8, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{value as string}</span>
          </div>
        ))}
      </div>
      <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, background: "rgba(255,255,255,0.04)", borderTop: "1px solid rgba(255,255,255,0.07)", padding: "5px 14px", textAlign: "center" }}>
        <span style={{ color: "rgba(255,255,255,0.2)", fontSize: 7 }}>Emergency: {emp.emergency_contact || "—"}</span>
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
      <div style={{ margin: "12px 20px", height: 1, background: "#eee" }} />
      <div style={{ padding: "0 18px" }}>
        {[["Employee ID", emp.employee_id], ["Date of Joining", emp.date_of_joining], ["Blood Group", emp.blood_group], ["Phone", emp.phone]].map(([label, value]) => value ? (
          <div key={label as string} style={{ display: "flex", justifyContent: "space-between", marginBottom: 7, gap: 8 }}>
            <span style={{ fontSize: 8, color: "#bbb", letterSpacing: "0.08em", textTransform: "uppercase", flexShrink: 0 }}>{label}</span>
            <span style={{ fontSize: 9, fontWeight: 700, color: "#333", textAlign: "right" }}>{value as string}</span>
          </div>
        ) : null)}
      </div>
      <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, borderTop: "1px solid #eee", background: "#f5f5f3", padding: "5px 14px", textAlign: "center" }}>
        <span style={{ fontSize: 7, color: "#bbb" }}>Emergency: {emp.emergency_contact || "—"}</span>
      </div>
    </div>
  );
}

function ExecutivePortrait({ emp, bizName, bizLogo }: { emp: Partial<Employee>; bizName: string; bizLogo?: string }) {
  return (
    <div style={{ width: 240, height: 380, borderRadius: 16, overflow: "hidden", fontFamily: "'Trebuchet MS', sans-serif", position: "relative", background: "#1a1a2e", boxShadow: "0 8px 32px rgba(0,0,0,0.5)" }}>
      <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 108, background: "linear-gradient(135deg,#b8860b,#d4a017,#8b6914)" }} />
      <div style={{ padding: "18px 16px 0", textAlign: "center", position: "relative" }}>
        {bizLogo ? <img src={bizLogo} alt="" style={{ width: 30, height: 30, borderRadius: 5, objectFit: "cover", margin: "0 auto 5px", display: "block", border: "1.5px solid rgba(255,255,255,0.3)" }} crossOrigin="anonymous" /> : <div style={{ width: 30, height: 30, borderRadius: 5, background: "rgba(255,255,255,0.15)", border: "1.5px solid rgba(255,255,255,0.3)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, color: "#fff", fontWeight: 700, margin: "0 auto 5px" }}>{(bizName || "B")[0]}</div>}
        <div style={{ color: "rgba(255,255,255,0.9)", fontSize: 11, fontWeight: 700, letterSpacing: "0.08em" }}>{(bizName || "COMPANY").toUpperCase()}</div>
        <div style={{ color: "rgba(255,255,255,0.5)", fontSize: 7, letterSpacing: "0.15em", textTransform: "uppercase", marginTop: 2 }}>Executive Identity Card</div>
      </div>
      <div style={{ display: "flex", justifyContent: "center", marginTop: 14 }}>
        {emp.photo_url ? <img src={emp.photo_url} alt="photo" style={{ width: 88, height: 88, objectFit: "cover", borderRadius: 10, border: "3px solid rgba(212,160,23,0.6)" }} crossOrigin="anonymous" /> : <div style={{ width: 88, height: 88, borderRadius: 10, background: "rgba(255,255,255,0.08)", border: "3px solid rgba(212,160,23,0.3)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 34, color: "rgba(255,255,255,0.15)" }}>👤</div>}
      </div>
      <div style={{ textAlign: "center", padding: "10px 16px 0" }}>
        <div style={{ color: "#fff", fontSize: 16, fontWeight: 700 }}>{emp.name || "Full Name"}</div>
        <div style={{ color: "#d4a017", fontSize: 9, letterSpacing: "0.12em", textTransform: "uppercase", marginTop: 4 }}>{emp.designation || "Designation"}</div>
        {emp.department && <div style={{ color: "rgba(255,255,255,0.4)", fontSize: 9, marginTop: 2 }}>{emp.department}</div>}
      </div>
      <div style={{ margin: "12px 18px", height: 1, background: "linear-gradient(90deg,transparent,rgba(212,160,23,0.4),transparent)" }} />
      <div style={{ padding: "0 18px" }}>
        {[["ID", emp.employee_id], ["Joined", emp.date_of_joining], ["Blood", emp.blood_group], ["Phone", emp.phone]].map(([label, value]) => value ? (
          <div key={label as string} style={{ display: "flex", justifyContent: "space-between", marginBottom: 6, gap: 8 }}>
            <span style={{ color: "rgba(255,255,255,0.35)", fontSize: 8, flexShrink: 0 }}>{label}</span>
            <span style={{ color: "rgba(255,255,255,0.75)", fontSize: 8, textAlign: "right" }}>{value as string}</span>
          </div>
        ) : null)}
      </div>
      <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, background: "rgba(0,0,0,0.35)", padding: "5px 14px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
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
}

function IDCard({ emp, bizName, bizLogo }: IDCardProps) {
  const t = emp.template || "simple";
  const portrait = emp.orientation === "portrait";
  const colors: SimpleColors = {
    topColor: emp.top_color || "#2563eb",
    bottomColor: emp.bottom_color || "#1e40af",
    accentColor: emp.accent_color || "#3b82f6",
    showTopBar: emp.show_top_bar !== false,
    showBottomBar: emp.show_bottom_bar !== false,
  };

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
  const [linkCopied, setLinkCopied] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [saving, setSaving] = useState(false);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  const photoRef = useRef<HTMLInputElement>(null);
  // hidden off-screen container for html2canvas
  const offscreenRef = useRef<HTMLDivElement | null>(null);

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
      show_top_bar: emp.show_top_bar !== false,
      show_bottom_bar: emp.show_bottom_bar !== false,
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

  // ── Download: render into hidden off-screen div, then capture ──
  const downloadCard = async (emp: Employee) => {
    setDownloadingId(emp.id);
    try {
      // Create a temporary container outside the viewport
      const container = document.createElement("div");
      container.style.cssText = "position:fixed;left:-9999px;top:-9999px;z-index:-1;";
      document.body.appendChild(container);

      // Use ReactDOM to render the card into the container
      const { createRoot } = await import("react-dom/client");
      const root = createRoot(container);

      await new Promise<void>(resolve => {
        root.render(
          <div style={{ display: "inline-block", padding: 0, margin: 0 }}>
            <IDCard emp={emp} bizName={bizName} bizLogo={bizLogo} />
          </div>
        );
        // Wait for images to load
        setTimeout(resolve, 600);
      });

      const cardNode = container.firstChild as HTMLElement;
      const canvas = await html2canvas(cardNode, {
        scale: 3,
        useCORS: true,
        allowTaint: true,
        backgroundColor: null,
        logging: false,
      });

      root.unmount();
      document.body.removeChild(container);

      const a = document.createElement("a");
      a.href = canvas.toDataURL("image/png");
      a.download = `${emp.name.replace(/\s+/g, "_")}_ID.png`;
      a.click();
      toast({ title: "ID Card downloaded ✅" });
    } catch (err) {
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
                  <div className="p-3 flex items-center justify-between border-t border-gray-100">
                    <div>
                      <p className="font-semibold text-sm text-gray-900">{emp.name}</p>
                      <div className="flex items-center gap-1 mt-0.5">
                        <p className="text-xs text-gray-400">{emp.designation} · {emp.department}</p>
                        <span className={`text-xs px-1.5 py-0.5 rounded font-medium ml-1 ${isPortrait ? "bg-purple-100 text-purple-700" : "bg-gray-100 text-gray-500"}`}>
                          {isPortrait ? "portrait" : "landscape"}
                        </span>
                      </div>
                    </div>
                    <div className="flex gap-1.5">
                      <Button size="sm" variant="outline" onClick={() => setPreviewEmp(emp)}><Eye className="w-3.5 h-3.5" /></Button>
                      <Button size="sm" variant="outline" onClick={() => handleEdit(emp)}>✏️</Button>
                      <Button
                        size="sm" variant="outline"
                        className="text-indigo-600 border-indigo-200"
                        onClick={() => downloadCard(emp)}
                        disabled={downloadingId === emp.id}
                      >
                        {downloadingId === emp.id
                          ? <div className="w-3.5 h-3.5 border-2 border-indigo-400 border-t-transparent rounded-full animate-spin" />
                          : <Download className="w-3.5 h-3.5" />
                        }
                      </Button>
                      <Button size="sm" variant="ghost" className="text-red-400 hover:text-red-600" onClick={() => handleDelete(emp.id)}><Trash2 className="w-3.5 h-3.5" /></Button>
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

            {/* Color pickers + toggles — Simple template only */}
            {form.template === "simple" && (
              <div className="mb-3 p-3 bg-blue-50 border border-blue-100 rounded-xl">
                <Label className="text-xs text-blue-700 font-semibold mb-3 block">🎨 Customize Colors & Borders</Label>
                <div className="grid grid-cols-3 gap-3 mb-3">
                  {([
                    { label: "Top Bar", colorKey: "top_color" as const, toggleKey: "show_top_bar" as const },
                    { label: "Bottom Bar", colorKey: "bottom_color" as const, toggleKey: "show_bottom_bar" as const },
                    { label: "Accent", colorKey: "accent_color" as const, toggleKey: null },
                  ] as const).map(({ label, colorKey, toggleKey }) => (
                    <div key={colorKey} className="flex flex-col items-center gap-1.5">
                      {/* Color swatch */}
                      <div className="w-10 h-10 rounded-lg border-2 border-white shadow-md cursor-pointer relative overflow-hidden"
                        style={{ background: form[colorKey] }}>
                        <input type="color" value={form[colorKey]}
                          onChange={e => setForm(p => ({ ...p, [colorKey]: e.target.value }))}
                          className="absolute inset-0 opacity-0 cursor-pointer w-full h-full" />
                      </div>
                      <span className="text-xs text-gray-600 font-medium">{label}</span>
                      <span className="text-xs font-mono text-gray-400">{form[colorKey]}</span>
                      {/* Show/hide toggle */}
                      {toggleKey && (
                        <label className="flex items-center gap-1.5 cursor-pointer mt-0.5">
                          <div
                            onClick={() => setForm(p => ({ ...p, [toggleKey]: !p[toggleKey] }))}
                            className={`w-8 h-4 rounded-full transition-colors relative ${form[toggleKey] ? "bg-indigo-500" : "bg-gray-300"}`}
                          >
                            <div className={`absolute top-0.5 w-3 h-3 bg-white rounded-full shadow transition-transform ${form[toggleKey] ? "translate-x-4" : "translate-x-0.5"}`} />
                          </div>
                          <span className="text-xs text-gray-500">{form[toggleKey] ? "Visible" : "Hidden"}</span>
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

            {/* Live preview */}
            <div className="mb-4 flex justify-center bg-gray-50 rounded-xl p-4 border border-dashed border-gray-200 min-h-[120px] items-center">
              <IDCard emp={{ ...form }} bizName={bizName} bizLogo={bizLogo} />
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

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {[
                { label: "Full Name *", key: "name", placeholder: "John Doe" },
                { label: "Employee ID *", key: "employee_id", placeholder: "EMP-001" },
                { label: "Designation", key: "designation", placeholder: "Software Engineer" },
                { label: "Department", key: "department", placeholder: "Engineering" },
                { label: "Email", key: "email", placeholder: "john@company.com" },
                { label: "Phone", key: "phone", placeholder: "+91 9876543210" },
                { label: "Date of Joining", key: "date_of_joining", placeholder: "2024-01-15", type: "date" },
                { label: "Emergency Contact", key: "emergency_contact", placeholder: "+91 9876543210" },
                { label: "Address", key: "address", placeholder: "City, State", colSpan: true },
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
        <Dialog open={!!previewEmp} onOpenChange={() => setPreviewEmp(null)}>
          <DialogContent className="max-w-sm">
            <DialogHeader><DialogTitle>ID Card Preview</DialogTitle></DialogHeader>
            {previewEmp && (
              <div className="flex flex-col items-center gap-4 py-2">
                <IDCard emp={previewEmp} bizName={bizName} bizLogo={bizLogo} />
                <div className="text-center">
                  <p className="font-semibold text-gray-900">{previewEmp.name}</p>
                  <p className="text-sm text-gray-400">{previewEmp.designation} · {previewEmp.department}</p>
                </div>
                <Button onClick={() => downloadCard(previewEmp)} disabled={downloadingId === previewEmp.id} className="w-full bg-indigo-600 hover:bg-indigo-700 text-white">
                  {downloadingId === previewEmp.id
                    ? <><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />Generating…</>
                    : <><Download className="w-4 h-4 mr-2" />Download ID Card</>
                  }
                </Button>
              </div>
            )}
          </DialogContent>
        </Dialog>

      </div>
    </div>
  );
};

export default Employees;