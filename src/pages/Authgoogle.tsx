import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import { toast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { FileText, ArrowLeft, Mail, KeyRound, Lock } from "lucide-react";
import Navbar from "@/components/Navbar";
import { supabase } from "@/integrations/supabase/client";

type ForgotStep = "email" | "otp" | "newPassword";

const Auth = () => {
  const navigate = useNavigate();
  const { signIn } = useAuth();

  const [isLoading, setIsLoading] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);

  const [showForgot, setShowForgot] = useState(false);
  const [forgotStep, setForgotStep] = useState<ForgotStep>("email");
  const [forgotEmail, setForgotEmail] = useState("");
  const [otpCode, setOtpCode] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [loginForm, setLoginForm] = useState({ email: "", password: "" });

  const [requestForm, setRequestForm] = useState({
    full_name: "",
    address: "",
    email: "",
    business_name: "",
    business_address: "",
    phone: "",
  });

  // ── GOOGLE LOGIN ───────────────────────────────────
  const handleGoogleLogin = async () => {
    setIsGoogleLoading(true);
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/`,
      },
    });
    if (error) {
      toast({
        title: "Google Login Failed ❌",
        description: error.message,
        variant: "destructive",
      });
      setIsGoogleLoading(false);
    }
  };

  // ── LOGIN ──────────────────────────────────────────
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    const { error } = await signIn(loginForm.email, loginForm.password);
    if (error) {
      toast({
        title: "Login Failed ❌",
        description: error.message,
        variant: "destructive",
      });
    } else {
      toast({
        title: "Welcome Back ✅",
        description: "You have logged in successfully.",
      });
      navigate("/");
    }
    setIsLoading(false);
  };

  // ── FORGOT: STEP 1 — Send OTP ──────────────────────
  const handleSendOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    const { data, error } = await supabase.functions.invoke("send-otp", {
      body: { email: forgotEmail },
    });
    if (error || data?.error) {
      toast({
        title: "Failed ❌",
        description:
          data?.error === "No account found with this email."
            ? "No account found with this email. Please check or request access."
            : data?.error || error?.message || "Could not send OTP.",
        variant: "destructive",
      });
    } else {
      toast({
        title: "OTP Sent ✅",
        description: `A 6-digit code was sent to ${forgotEmail}`,
      });
      setForgotStep("otp");
    }
    setIsLoading(false);
  };

  // ── FORGOT: STEP 2 — Verify OTP ───────────────────
  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    const { data, error } = await supabase.functions.invoke("verify-otp", {
      body: { email: forgotEmail, otp: otpCode },
    });
    if (error || data?.error) {
      toast({
        title: "Invalid OTP ❌",
        description: data?.error || "OTP is incorrect or has expired.",
        variant: "destructive",
      });
    } else {
      toast({
        title: "Verified ✅",
        description: "Now set your new password.",
      });
      setForgotStep("newPassword");
    }
    setIsLoading(false);
  };

  // ── FORGOT: STEP 3 — Reset Password ───────────────
  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      toast({
        title: "Mismatch ❌",
        description: "Passwords do not match.",
        variant: "destructive",
      });
      return;
    }
    if (newPassword.length < 6) {
      toast({
        title: "Too Short ❌",
        description: "Password must be at least 6 characters.",
        variant: "destructive",
      });
      return;
    }
    setIsLoading(true);
    const { data, error } = await supabase.functions.invoke("reset-password", {
      body: { email: forgotEmail, newPassword },
    });
    if (error || data?.error) {
      toast({
        title: "Reset Failed ❌",
        description: data?.error || error?.message || "Something went wrong.",
        variant: "destructive",
      });
    } else {
      toast({
        title: "Password Reset ✅",
        description: "You can now log in with your new password.",
      });
      setShowForgot(false);
      setForgotStep("email");
      setForgotEmail("");
      setOtpCode("");
      setNewPassword("");
      setConfirmPassword("");
    }
    setIsLoading(false);
  };

  // ── FORGOT: Back navigation ────────────────────────
  const handleForgotBack = () => {
    if (forgotStep === "otp") {
      setForgotStep("email");
      setOtpCode("");
    } else if (forgotStep === "newPassword") {
      setForgotStep("otp");
    } else {
      setShowForgot(false);
      setForgotStep("email");
      setForgotEmail("");
    }
  };

  // ── ACCESS REQUEST ─────────────────────────────────
  const handleRequestAccess = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      const { error } = await (supabase as any)
        .from("signup_requests")
        .insert([requestForm]);
      if (error) throw error;

      // Notify admin via email
      await supabase.functions.invoke("send-otp", {
        body: { _notify_admin: true, requestForm },
      });

      toast({
        title: "Request Submitted ✅",
        description: "Your account request has been submitted successfully.",
      });
      setRequestForm({
        full_name: "",
        address: "",
        email: "",
        business_name: "",
        business_address: "",
        phone: "",
      });
    } catch (error: any) {
      toast({
        title: "Submission Failed ❌",
        description: error.message || "Something went wrong.",
        variant: "destructive",
      });
    }
    setIsLoading(false);
  };

  // ── FORGOT PASSWORD UI ─────────────────────────────
  const renderForgotPassword = () => (
    <div className="space-y-4">
      {/* Back button */}
      <button
        type="button"
        onClick={handleForgotBack}
        className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-800 transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        Back
      </button>

      {/* Progress indicator */}
      <div className="flex items-center justify-center gap-2 mb-2">
        {(["email", "otp", "newPassword"] as ForgotStep[]).map((step, i) => (
          <div key={step} className="flex items-center gap-2">
            <div
              className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold border-2 transition-all ${
                forgotStep === step
                  ? "bg-gradient-to-r from-green-600 to-purple-600 text-white border-transparent"
                  : ["email", "otp", "newPassword"].indexOf(forgotStep) > i
                  ? "bg-green-100 text-green-700 border-green-400"
                  : "bg-gray-100 text-gray-400 border-gray-200"
              }`}
            >
              {i + 1}
            </div>
            {i < 2 && (
              <div
                className={`w-8 h-0.5 ${
                  ["email", "otp", "newPassword"].indexOf(forgotStep) > i
                    ? "bg-green-400"
                    : "bg-gray-200"
                }`}
              />
            )}
          </div>
        ))}
      </div>

      {/* STEP 1: Email */}
      {forgotStep === "email" && (
        <form onSubmit={handleSendOtp} className="space-y-4">
          <div className="text-center">
            <div className="flex justify-center mb-2">
              <div className="w-12 h-12 rounded-full bg-green-50 flex items-center justify-center">
                <Mail className="w-6 h-6 text-green-600" />
              </div>
            </div>
            <h3 className="text-lg font-semibold">Forgot Password</h3>
            <p className="text-gray-500 text-sm mt-1">
              Enter your registered email to receive an OTP.
            </p>
          </div>
          <div className="space-y-2">
            <Label htmlFor="forgot-email">Email</Label>
            <Input
              id="forgot-email"
              type="email"
              placeholder="Enter your registered email"
              value={forgotEmail}
              onChange={(e) => setForgotEmail(e.target.value)}
              required
            />
          </div>
          <Button
            type="submit"
            className="w-full bg-gradient-to-r from-green-600 to-purple-600 hover:from-green-700 hover:to-purple-700"
            disabled={isLoading}
          >
            {isLoading ? "Sending OTP..." : "Send OTP"}
          </Button>
        </form>
      )}

      {/* STEP 2: OTP */}
      {forgotStep === "otp" && (
        <form onSubmit={handleVerifyOtp} className="space-y-4">
          <div className="text-center">
            <div className="flex justify-center mb-2">
              <div className="w-12 h-12 rounded-full bg-purple-50 flex items-center justify-center">
                <KeyRound className="w-6 h-6 text-purple-600" />
              </div>
            </div>
            <h3 className="text-lg font-semibold">Enter OTP</h3>
            <p className="text-gray-500 text-sm mt-1">
              A 6-digit code was sent to{" "}
              <span className="font-medium text-gray-700">{forgotEmail}</span>
            </p>
          </div>
          <div className="space-y-2">
            <Label htmlFor="otp">OTP Code</Label>
            <Input
              id="otp"
              type="text"
              inputMode="numeric"
              maxLength={6}
              placeholder="Enter 6-digit OTP"
              value={otpCode}
              onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, ""))}
              className="text-center text-2xl tracking-widest font-mono"
              required
            />
          </div>
          <Button
            type="submit"
            className="w-full bg-gradient-to-r from-green-600 to-purple-600 hover:from-green-700 hover:to-purple-700"
            disabled={isLoading || otpCode.length !== 6}
          >
            {isLoading ? "Verifying..." : "Verify OTP"}
          </Button>
          <p className="text-center text-sm text-gray-500">
            Didn't receive it?{" "}
            <button
              type="button"
              onClick={handleSendOtp}
              disabled={isLoading}
              className="text-green-600 hover:underline font-medium disabled:opacity-50"
            >
              Resend OTP
            </button>
          </p>
        </form>
      )}

      {/* STEP 3: New Password */}
      {forgotStep === "newPassword" && (
        <form onSubmit={handleResetPassword} className="space-y-4">
          <div className="text-center">
            <div className="flex justify-center mb-2">
              <div className="w-12 h-12 rounded-full bg-blue-50 flex items-center justify-center">
                <Lock className="w-6 h-6 text-blue-600" />
              </div>
            </div>
            <h3 className="text-lg font-semibold">Set New Password</h3>
            <p className="text-gray-500 text-sm mt-1">
              Choose a strong password for your account.
            </p>
          </div>
          <div className="space-y-2">
            <Label htmlFor="new-password">New Password</Label>
            <Input
              id="new-password"
              type="password"
              placeholder="Enter new password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="confirm-password">Confirm Password</Label>
            <Input
              id="confirm-password"
              type="password"
              placeholder="Confirm new password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
            />
            {confirmPassword && newPassword !== confirmPassword && (
              <p className="text-xs text-red-500">Passwords do not match.</p>
            )}
            {confirmPassword && newPassword === confirmPassword && (
              <p className="text-xs text-green-600">Passwords match ✓</p>
            )}
          </div>
          <Button
            type="submit"
            className="w-full bg-gradient-to-r from-green-600 to-purple-600 hover:from-green-700 hover:to-purple-700"
            disabled={isLoading || newPassword !== confirmPassword}
          >
            {isLoading ? "Resetting..." : "Reset Password"}
          </Button>
        </form>
      )}
    </div>
  );

  // ── MAIN RENDER ────────────────────────────────────
  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 via-white to-purple-50 flex items-center justify-center p-4">
      <Navbar />
      <div className="w-full max-w-md">

        {/* HEADER */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-2 mb-4">
            <FileText className="w-8 h-8 text-green-600" />
            <h1 className="text-4xl font-bold bg-gradient-to-r from-green-600 to-purple-600 bg-clip-text text-transparent">
              Invoice Generator
            </h1>
          </div>
          <p className="text-gray-600">Professional invoicing made simple</p>
        </div>

        {/* CARD */}
        <Card className="shadow-xl">
          <CardHeader>
            <CardTitle>Welcome</CardTitle>
            <CardDescription>
              {showForgot
                ? "Reset your password"
                : "Sign in or request account access"}
            </CardDescription>
          </CardHeader>

          <CardContent>
            {showForgot ? (
              renderForgotPassword()
            ) : (
              <Tabs defaultValue="login" className="w-full">
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="login">Login</TabsTrigger>
                  <TabsTrigger value="register">Request Access</TabsTrigger>
                </TabsList>

                {/* LOGIN TAB */}
                <TabsContent value="login">
                  <div className="space-y-4 pt-2">

                    {/* GOOGLE BUTTON */}
                    <Button
                      type="button"
                      variant="outline"
                      className="w-full flex items-center gap-3 border-gray-300 hover:bg-gray-50"
                      onClick={handleGoogleLogin}
                      disabled={isGoogleLoading}
                    >
                      {isGoogleLoading ? (
                        <div className="w-5 h-5 border-2 border-gray-400 border-t-transparent rounded-full animate-spin" />
                      ) : (
                        <svg className="w-5 h-5" viewBox="0 0 24 24">
                          <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                          <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                          <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"/>
                          <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                        </svg>
                      )}
                      {isGoogleLoading ? "Redirecting..." : "Continue with Google"}
                    </Button>

                    {/* DIVIDER */}
                    <div className="relative">
                      <div className="absolute inset-0 flex items-center">
                        <span className="w-full border-t border-gray-200" />
                      </div>
                      <div className="relative flex justify-center text-xs uppercase">
                        <span className="bg-white px-2 text-gray-400">
                          or sign in with email
                        </span>
                      </div>
                    </div>

                    {/* EMAIL/PASSWORD FORM */}
                    <form onSubmit={handleLogin} className="space-y-4">
                      <div className="space-y-2">
                        <Label htmlFor="email">Email</Label>
                        <Input
                          id="email"
                          type="email"
                          placeholder="Enter your email"
                          value={loginForm.email}
                          onChange={(e) =>
                            setLoginForm({ ...loginForm, email: e.target.value })
                          }
                          required
                        />
                      </div>
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <Label htmlFor="password">Password</Label>
                          <button
                            type="button"
                            onClick={() => {
                              setForgotEmail(loginForm.email);
                              setShowForgot(true);
                            }}
                            className="text-xs text-green-600 hover:text-purple-600 hover:underline transition-colors"
                          >
                            Forgot Password?
                          </button>
                        </div>
                        <Input
                          id="password"
                          type="password"
                          placeholder="Enter your password"
                          value={loginForm.password}
                          onChange={(e) =>
                            setLoginForm({ ...loginForm, password: e.target.value })
                          }
                          required
                        />
                      </div>
                      <Button
                        type="submit"
                        className="w-full bg-gradient-to-r from-green-600 to-purple-600 hover:from-green-700 hover:to-purple-700"
                        disabled={isLoading}
                      >
                        {isLoading ? "Signing In..." : "Sign In"}
                      </Button>
                    </form>
                  </div>
                </TabsContent>

                {/* REQUEST ACCESS TAB */}
                <TabsContent value="register">
                  <form onSubmit={handleRequestAccess} className="space-y-4">
                    <div className="text-center mb-4">
                      <h3 className="text-xl font-semibold">
                        Request Account Access
                      </h3>
                      <p className="text-gray-600 text-sm">
                        Fill in your details for approval.
                      </p>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="full-name">Full Name</Label>
                      <Input
                        id="full-name"
                        type="text"
                        placeholder="Enter your full name"
                        value={requestForm.full_name}
                        onChange={(e) =>
                          setRequestForm({ ...requestForm, full_name: e.target.value })
                        }
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="address">Address</Label>
                      <Input
                        id="address"
                        type="text"
                        placeholder="Enter your address"
                        value={requestForm.address}
                        onChange={(e) =>
                          setRequestForm({ ...requestForm, address: e.target.value })
                        }
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="request-email">Email</Label>
                      <Input
                        id="request-email"
                        type="email"
                        placeholder="Enter your email"
                        value={requestForm.email}
                        onChange={(e) =>
                          setRequestForm({ ...requestForm, email: e.target.value })
                        }
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="business-name">Business Name</Label>
                      <Input
                        id="business-name"
                        type="text"
                        placeholder="Enter business name"
                        value={requestForm.business_name}
                        onChange={(e) =>
                          setRequestForm({ ...requestForm, business_name: e.target.value })
                        }
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="business-address">Business Address</Label>
                      <Input
                        id="business-address"
                        type="text"
                        placeholder="Enter business address"
                        value={requestForm.business_address}
                        onChange={(e) =>
                          setRequestForm({ ...requestForm, business_address: e.target.value })
                        }
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="phone">Phone Number</Label>
                      <Input
                        id="phone"
                        type="tel"
                        placeholder="Enter phone number"
                        value={requestForm.phone}
                        onChange={(e) =>
                          setRequestForm({ ...requestForm, phone: e.target.value })
                        }
                        required
                      />
                    </div>
                    <Button
                      type="submit"
                      className="w-full bg-gradient-to-r from-green-600 to-purple-600 hover:from-green-700 hover:to-purple-700"
                      disabled={isLoading}
                    >
                      {isLoading ? "Submitting..." : "Submit Request"}
                    </Button>
                  </form>
                </TabsContent>
              </Tabs>
            )}
          </CardContent>
        </Card>

        {/* GUEST */}
        <div className="text-center mt-6">
          <Button
            variant="outline"
            onClick={() => navigate("/invoices")}
            className="text-sm"
          >
            Continue as Guest (PDF Export Only)
          </Button>
        </div>
      </div>
    </div>
  );
};

export default Auth;