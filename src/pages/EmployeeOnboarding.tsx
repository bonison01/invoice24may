// src/pages/EmployeeOnboarding.tsx
// Public route: /onboard/:userId
// Employees fill their own details; data saves to the employer's employees table.

import { useState, useEffect, useRef } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";

interface BizInfo {
  business_name: string;
  seal_url?: string;
}

const BLOOD_GROUPS = ["A+", "A−", "B+", "B−", "AB+", "AB−", "O+", "O−"];

const EMPTY = {
  name: "", employee_id: "", designation: "", department: "",
  email: "", phone: "", blood_group: "O+", date_of_joining: "",
  address: "", emergency_contact: "", photo_url: "",
};

type Step = 0 | 1 | 2;

export default function EmployeeOnboarding() {
  const { userId } = useParams<{ userId: string }>();
  const [biz, setBiz] = useState<BizInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [step, setStep] = useState<Step>(0);
  const [form, setForm] = useState({ ...EMPTY });
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState("");
  const photoRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!userId) { setError("Invalid link."); setLoading(false); return; }
    (async () => {
      const { data } = await (supabase as any)
        .from("business_settings")
        .select("business_name, seal_url")
        .eq("user_id", userId)
        .maybeSingle();
      if (data?.business_name) {
        setBiz({ business_name: data.business_name, seal_url: data.seal_url });
      } else {
        setBiz({ business_name: "Your Company" });
      }
      setLoading(false);
    })();
  }, [userId]);

  const f = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
    setForm(p => ({ ...p, [k]: e.target.value }));

  const handlePhoto = async (file: File) => {
    if (!file.type.startsWith("image/")) return;
    setUploadingPhoto(true);
    const ext = file.name.split(".").pop();
    const path = `${userId}/employees/onboard_${Date.now()}.${ext}`;
    const { error: upErr } = await supabase.storage.from("business-docs").upload(path, file, { upsert: true });
    if (!upErr) {
      const { data: { publicUrl } } = supabase.storage.from("business-docs").getPublicUrl(path);
      setForm(p => ({ ...p, photo_url: publicUrl }));
    }
    setUploadingPhoto(false);
  };

  const handleSubmit = async () => {
    if (!form.name.trim() || !userId) return;
    setSubmitting(true);
    const { error: err } = await (supabase as any).from("employees").insert({
      ...form, user_id: userId, template: "classic",
    });
    if (!err) {
      setDone(true);
    } else {
      setError("Submission failed. Please try again.");
    }
    setSubmitting(false);
  };

  const canProceed = [
    form.name.trim() && form.employee_id.trim(),
    form.email.trim() || form.phone.trim(),
    true,
  ][step];

  if (loading) return (
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "#f8f7f4", fontFamily: "'Georgia', serif" }}>
      <div style={{ textAlign: "center" }}>
        <div style={{ width: 44, height: 44, border: "3px solid #6c47ff", borderTopColor: "transparent", borderRadius: "50%", animation: "spin 0.8s linear infinite", margin: "0 auto 16px" }} />
        <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
        <p style={{ color: "#888", fontSize: 14 }}>Loading…</p>
      </div>
    </div>
  );

  if (error && !biz) return (
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "#f8f7f4", fontFamily: "'Georgia', serif" }}>
      <div style={{ textAlign: "center", padding: 32 }}>
        <div style={{ fontSize: 48, marginBottom: 12 }}>⚠️</div>
        <h2 style={{ fontSize: 18, fontWeight: 700, color: "#333" }}>Invalid Link</h2>
        <p style={{ color: "#888", fontSize: 14, marginTop: 6 }}>{error}</p>
      </div>
    </div>
  );

  if (done) return (
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "linear-gradient(135deg,#0f2557,#1a3a8a)", fontFamily: "'Georgia', serif" }}>
      <div style={{ textAlign: "center", padding: 40, maxWidth: 360 }}>
        <div style={{ width: 72, height: 72, borderRadius: "50%", background: "rgba(255,255,255,0.1)", border: "2px solid rgba(255,255,255,0.2)", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 20px", fontSize: 32 }}>✅</div>
        <h2 style={{ color: "#fff", fontSize: 22, fontWeight: 700, marginBottom: 8 }}>You're all set!</h2>
        <p style={{ color: "rgba(255,255,255,0.6)", fontSize: 14, lineHeight: 1.6 }}>
          Your details have been submitted to <strong style={{ color: "#fff" }}>{biz?.business_name}</strong>. Your ID card will be generated shortly.
        </p>
        <div style={{ marginTop: 28, padding: "16px 20px", background: "rgba(255,255,255,0.08)", borderRadius: 12, border: "1px solid rgba(255,255,255,0.12)" }}>
          <p style={{ color: "rgba(255,255,255,0.4)", fontSize: 11, letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 4 }}>Submitted as</p>
          <p style={{ color: "#fff", fontSize: 16, fontWeight: 700 }}>{form.name}</p>
          <p style={{ color: "rgba(255,255,255,0.5)", fontSize: 12, marginTop: 2 }}>{form.designation} · {form.department}</p>
        </div>
      </div>
    </div>
  );

  const STEPS = ["Personal Info", "Contact Details", "Review & Submit"];

  return (
    <>
      <link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500;600;700&family=Playfair+Display:wght@700;900&display=swap" rel="stylesheet" />
      <style>{`
        * { box-sizing: border-box; }
        input, select, textarea {
          width: 100%; padding: 10px 12px; border: 1.5px solid #e0ddd8; border-radius: 10px;
          font-size: 14px; font-family: 'DM Sans', sans-serif; background: #fff;
          outline: none; transition: border-color 0.15s;
        }
        input:focus, select:focus, textarea:focus { border-color: #6c47ff; }
        textarea { resize: vertical; min-height: 72px; }
        label { display: block; font-size: 12px; font-weight: 600; color: #888; letter-spacing: 0.06em; text-transform: uppercase; margin-bottom: 5px; }
        @keyframes fadeUp { from { opacity:0; transform:translateY(16px); } to { opacity:1; transform:none; } }
        .fade-up { animation: fadeUp 0.35s ease forwards; }
      `}</style>

      <div style={{ minHeight: "100vh", background: "#f8f7f4", fontFamily: "'DM Sans', sans-serif" }}>

        {/* ── Hero header ── */}
        <div style={{ background: "linear-gradient(135deg, #0f2557 0%, #1a3a8a 70%, #0f2557 100%)", padding: "32px 24px 48px", textAlign: "center", position: "relative", overflow: "hidden" }}>
          <div style={{ position: "absolute", top: -40, right: -40, width: 180, height: 180, borderRadius: "50%", border: "2px solid rgba(255,255,255,0.06)" }} />
          <div style={{ position: "absolute", bottom: -60, left: -60, width: 220, height: 220, borderRadius: "50%", border: "2px solid rgba(255,255,255,0.04)" }} />
          {biz?.seal_url && (
            <img src={biz.seal_url} alt="logo" style={{ width: 48, height: 48, borderRadius: 10, objectFit: "cover", margin: "0 auto 14px", border: "2px solid rgba(255,255,255,0.2)", display: "block" }} />
          )}
          <p style={{ color: "rgba(255,255,255,0.5)", fontSize: 11, letterSpacing: "0.25em", textTransform: "uppercase", marginBottom: 6 }}>Employee Onboarding</p>
          <h1 style={{ color: "#fff", fontSize: 26, fontWeight: 900, fontFamily: "'Playfair Display', serif", marginBottom: 6 }}>{biz?.business_name}</h1>
          <p style={{ color: "rgba(255,255,255,0.45)", fontSize: 13 }}>Fill in your details to receive your employee ID card</p>
        </div>

        {/* ── Step indicator ── */}
        <div style={{ maxWidth: 480, margin: "0 auto", padding: "0 20px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 0, marginTop: -20, marginBottom: 24, background: "#fff", borderRadius: 16, padding: "12px 16px", boxShadow: "0 4px 20px rgba(0,0,0,0.08)", border: "1px solid rgba(0,0,0,0.06)" }}>
            {STEPS.map((s, i) => (
              <div key={i} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", position: "relative" }}>
                <div style={{
                  width: 28, height: 28, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: 12, fontWeight: 700, transition: "all 0.2s",
                  background: step > i ? "#6c47ff" : step === i ? "#6c47ff" : "#f0eee8",
                  color: step >= i ? "#fff" : "#bbb",
                  boxShadow: step === i ? "0 0 0 3px rgba(108,71,255,0.2)" : "none",
                }}>
                  {step > i ? "✓" : i + 1}
                </div>
                <p style={{ fontSize: 9, marginTop: 4, color: step === i ? "#6c47ff" : "#bbb", fontWeight: step === i ? 700 : 400, textAlign: "center", letterSpacing: "0.05em" }}>{s}</p>
                {i < STEPS.length - 1 && (
                  <div style={{ position: "absolute", top: 14, left: "calc(50% + 14px)", right: "calc(-50% + 14px)", height: 2, background: step > i ? "#6c47ff" : "#f0eee8", transition: "background 0.3s" }} />
                )}
              </div>
            ))}
          </div>

          {/* ── Form card ── */}
          <div key={step} className="fade-up" style={{ background: "#fff", borderRadius: 20, padding: "24px 20px", boxShadow: "0 4px 24px rgba(0,0,0,0.07)", border: "1px solid rgba(0,0,0,0.06)", marginBottom: 24 }}>

            {step === 0 && (
              <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                <h2 style={{ fontSize: 17, fontWeight: 700, color: "#1a1a1a", marginBottom: 4 }}>Personal Information</h2>

                {/* Photo upload */}
                <div>
                  <label>Profile Photo</label>
                  <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                    <div style={{ width: 64, height: 64, borderRadius: 14, overflow: "hidden", background: "#f0eee8", border: "2px dashed #d0cdc8", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 24, flexShrink: 0 }}>
                      {form.photo_url ? <img src={form.photo_url} alt="preview" style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : "👤"}
                    </div>
                    <div>
                      <button
                        onClick={() => photoRef.current?.click()}
                        disabled={uploadingPhoto}
                        style={{ padding: "8px 16px", borderRadius: 8, border: "1.5px solid #d0cdc8", background: "#fff", fontSize: 13, fontWeight: 600, cursor: "pointer", color: "#555" }}
                      >
                        {uploadingPhoto ? "Uploading…" : form.photo_url ? "Change Photo" : "Upload Photo"}
                      </button>
                      <p style={{ fontSize: 11, color: "#bbb", marginTop: 4 }}>JPG or PNG, max 5MB</p>
                    </div>
                    <input ref={photoRef} type="file" accept="image/*" style={{ display: "none" }}
                      onChange={e => { if (e.target.files?.[0]) handlePhoto(e.target.files[0]); e.target.value = ""; }} />
                  </div>
                </div>

                <div><label>Full Name *</label><input placeholder="John Doe" value={form.name} onChange={f("name")} /></div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                  <div><label>Employee ID</label><input placeholder="EMP-001" value={form.employee_id} onChange={f("employee_id")} /></div>
                  <div>
                    <label>Blood Group</label>
                    <select value={form.blood_group} onChange={f("blood_group")}>
                      {BLOOD_GROUPS.map(g => <option key={g} value={g}>{g}</option>)}
                    </select>
                  </div>
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                  <div><label>Designation</label><input placeholder="Software Engineer" value={form.designation} onChange={f("designation")} /></div>
                  <div><label>Department</label><input placeholder="Engineering" value={form.department} onChange={f("department")} /></div>
                </div>
                <div><label>Date of Joining</label><input type="date" value={form.date_of_joining} onChange={f("date_of_joining")} /></div>
              </div>
            )}

            {step === 1 && (
              <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                <h2 style={{ fontSize: 17, fontWeight: 700, color: "#1a1a1a", marginBottom: 4 }}>Contact Details</h2>
                <div><label>Email Address</label><input type="email" placeholder="john@example.com" value={form.email} onChange={f("email")} /></div>
                <div><label>Phone Number</label><input placeholder="+91 9876543210" value={form.phone} onChange={f("phone")} /></div>
                <div><label>Home Address</label><textarea placeholder="Street, City, State, PIN" value={form.address} onChange={f("address")} /></div>
                <div><label>Emergency Contact</label><input placeholder="+91 9876543210" value={form.emergency_contact} onChange={f("emergency_contact")} /></div>
              </div>
            )}

            {step === 2 && (
              <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                <h2 style={{ fontSize: 17, fontWeight: 700, color: "#1a1a1a", marginBottom: 4 }}>Review Your Details</h2>
                {[
                  ["Name", form.name],
                  ["Employee ID", form.employee_id],
                  ["Designation", form.designation],
                  ["Department", form.department],
                  ["Email", form.email],
                  ["Phone", form.phone],
                  ["Blood Group", form.blood_group],
                  ["Date of Joining", form.date_of_joining],
                  ["Address", form.address],
                  ["Emergency Contact", form.emergency_contact],
                ].filter(([, v]) => v).map(([label, value]) => (
                  <div key={label} style={{ display: "flex", justifyContent: "space-between", gap: 12, padding: "10px 0", borderBottom: "1px solid #f0eee8" }}>
                    <span style={{ fontSize: 12, color: "#aaa", fontWeight: 600, letterSpacing: "0.05em", textTransform: "uppercase", flexShrink: 0 }}>{label}</span>
                    <span style={{ fontSize: 13, color: "#333", textAlign: "right", wordBreak: "break-all" }}>{value}</span>
                  </div>
                ))}
                {form.photo_url && (
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 0", borderBottom: "1px solid #f0eee8" }}>
                    <span style={{ fontSize: 12, color: "#aaa", fontWeight: 600, letterSpacing: "0.05em", textTransform: "uppercase" }}>Photo</span>
                    <img src={form.photo_url} alt="preview" style={{ width: 44, height: 44, borderRadius: 8, objectFit: "cover", border: "1px solid #e0ddd8" }} />
                  </div>
                )}
                {error && <p style={{ color: "#e53e3e", fontSize: 13, marginTop: 4 }}>{error}</p>}
              </div>
            )}
          </div>

          {/* ── Navigation ── */}
          <div style={{ display: "flex", gap: 10, marginBottom: 40 }}>
            {step > 0 && (
              <button
                onClick={() => setStep(s => (s - 1) as Step)}
                style={{ flex: 1, padding: "13px", borderRadius: 12, border: "1.5px solid #e0ddd8", background: "#fff", fontSize: 14, fontWeight: 600, cursor: "pointer", color: "#555" }}
              >
                ← Back
              </button>
            )}
            {step < 2 ? (
              <button
                onClick={() => setStep(s => (s + 1) as Step)}
                disabled={!canProceed}
                style={{
                  flex: 1, padding: "13px", borderRadius: 12, border: "none",
                  background: canProceed ? "linear-gradient(135deg,#6c47ff,#00aaff)" : "#e0ddd8",
                  color: canProceed ? "#fff" : "#aaa", fontSize: 14, fontWeight: 700,
                  cursor: canProceed ? "pointer" : "not-allowed", transition: "all 0.15s",
                }}
              >
                Continue →
              </button>
            ) : (
              <button
                onClick={handleSubmit}
                disabled={submitting}
                style={{
                  flex: 1, padding: "13px", borderRadius: 12, border: "none",
                  background: submitting ? "#e0ddd8" : "linear-gradient(135deg,#0f2557,#1a3a8a)",
                  color: submitting ? "#aaa" : "#fff", fontSize: 14, fontWeight: 700,
                  cursor: submitting ? "not-allowed" : "pointer",
                }}
              >
                {submitting ? "Submitting…" : "✅ Submit Details"}
              </button>
            )}
          </div>

          {/* ── Powered by ── */}
          <p style={{ textAlign: "center", fontSize: 11, color: "#ccc", marginBottom: 32 }}>Powered by Invoicely</p>
        </div>
      </div>
    </>
  );
}