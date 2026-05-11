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
import { FileText } from "lucide-react";
import Navbar from "@/components/Navbar";
import { supabase } from "@/integrations/supabase/client";

const Auth = () => {
  const navigate = useNavigate();
  const { signIn } = useAuth();

  const [isLoading, setIsLoading] = useState(false);

  const [loginForm, setLoginForm] = useState({
    email: "",
    password: "",
  });

  const [requestForm, setRequestForm] = useState({
    full_name: "",
    address: "",
    email: "",
    business_name: "",
    business_address: "",
    phone: "",
  });

  // LOGIN
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    const { error } = await signIn(
      loginForm.email,
      loginForm.password
    );

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

  // ACCESS REQUEST
  const handleRequestAccess = async (
    e: React.FormEvent
  ) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const { error } = await (supabase as any)
  .from("signup_requests")
  .insert([requestForm]);

      if (error) {
        throw error;
      }

      toast({
        title: "Request Submitted ✅",
        description:
          "Your account request has been submitted successfully.",
      });

      // RESET FORM
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
        description:
          error.message || "Something went wrong.",
        variant: "destructive",
      });
    }

    setIsLoading(false);
  };

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

          <p className="text-gray-600">
            Professional invoicing made simple
          </p>
        </div>

        {/* CARD */}
        <Card className="shadow-xl">
          <CardHeader>
            <CardTitle>Welcome</CardTitle>

            <CardDescription>
              Sign in or request account access
            </CardDescription>
          </CardHeader>

          <CardContent>
            <Tabs defaultValue="login" className="w-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="login">
                  Login
                </TabsTrigger>

                <TabsTrigger value="register">
                  Request Access
                </TabsTrigger>
              </TabsList>

              {/* LOGIN */}
              <TabsContent value="login">
                <form
                  onSubmit={handleLogin}
                  className="space-y-4"
                >
                  <div className="space-y-2">
                    <Label htmlFor="email">
                      Email
                    </Label>

                    <Input
                      id="email"
                      type="email"
                      placeholder="Enter your email"
                      value={loginForm.email}
                      onChange={(e) =>
                        setLoginForm({
                          ...loginForm,
                          email: e.target.value,
                        })
                      }
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="password">
                      Password
                    </Label>

                    <Input
                      id="password"
                      type="password"
                      placeholder="Enter your password"
                      value={loginForm.password}
                      onChange={(e) =>
                        setLoginForm({
                          ...loginForm,
                          password: e.target.value,
                        })
                      }
                      required
                    />
                  </div>

                  <Button
                    type="submit"
                    className="w-full bg-gradient-to-r from-green-600 to-purple-600 hover:from-green-700 hover:to-purple-700"
                    disabled={isLoading}
                  >
                    {isLoading
                      ? "Signing In..."
                      : "Sign In"}
                  </Button>
                </form>
              </TabsContent>

              {/* REQUEST ACCESS */}
              <TabsContent value="register">
                <form
                  onSubmit={handleRequestAccess}
                  className="space-y-4"
                >
                  <div className="text-center mb-4">
                    <h3 className="text-xl font-semibold">
                      Request Account Access
                    </h3>

                    <p className="text-gray-600 text-sm">
                      Fill in your details for approval.
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="full-name">
                      Full Name
                    </Label>

                    <Input
                      id="full-name"
                      type="text"
                      placeholder="Enter your full name"
                      value={requestForm.full_name}
                      onChange={(e) =>
                        setRequestForm({
                          ...requestForm,
                          full_name: e.target.value,
                        })
                      }
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="address">
                      Address
                    </Label>

                    <Input
                      id="address"
                      type="text"
                      placeholder="Enter your address"
                      value={requestForm.address}
                      onChange={(e) =>
                        setRequestForm({
                          ...requestForm,
                          address: e.target.value,
                        })
                      }
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="request-email">
                      Email
                    </Label>

                    <Input
                      id="request-email"
                      type="email"
                      placeholder="Enter your email"
                      value={requestForm.email}
                      onChange={(e) =>
                        setRequestForm({
                          ...requestForm,
                          email: e.target.value,
                        })
                      }
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="business-name">
                      Business Name
                    </Label>

                    <Input
                      id="business-name"
                      type="text"
                      placeholder="Enter business name"
                      value={requestForm.business_name}
                      onChange={(e) =>
                        setRequestForm({
                          ...requestForm,
                          business_name: e.target.value,
                        })
                      }
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="business-address">
                      Business Address
                    </Label>

                    <Input
                      id="business-address"
                      type="text"
                      placeholder="Enter business address"
                      value={requestForm.business_address}
                      onChange={(e) =>
                        setRequestForm({
                          ...requestForm,
                          business_address: e.target.value,
                        })
                      }
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="phone">
                      Phone Number
                    </Label>

                    <Input
                      id="phone"
                      type="tel"
                      placeholder="Enter phone number"
                      value={requestForm.phone}
                      onChange={(e) =>
                        setRequestForm({
                          ...requestForm,
                          phone: e.target.value,
                        })
                      }
                      required
                    />
                  </div>

                  <Button
                    type="submit"
                    className="w-full bg-gradient-to-r from-green-600 to-purple-600 hover:from-green-700 hover:to-purple-700"
                    disabled={isLoading}
                  >
                    {isLoading
                      ? "Submitting..."
                      : "Submit Request"}
                  </Button>
                </form>
              </TabsContent>
            </Tabs>
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