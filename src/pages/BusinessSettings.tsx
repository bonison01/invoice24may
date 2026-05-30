
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/hooks/use-toast";
import { ArrowLeft, Save, Upload, X, Users2 } from "lucide-react";
import Navbar from "@/components/Navbar";

interface BusinessSettings {
  business_name: string;
  business_address: string;
  business_phone: string;
  business_email: string;
  payment_instructions: string;
  thank_you_note: string;
  seal_url: string;
  signature_url: string;
  upi_id: string;
  bank_name: string;
  account_number: string;
  ifsc_code: string;
}

const BusinessSettings = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [settings, setSettings] = useState<BusinessSettings>({
    business_name: '',
    business_address: '',
    business_phone: '',
    business_email: '',
    payment_instructions: 'Payment due within 10 days. Thank you for your business!',
    thank_you_note: 'Thank you for choosing our services.',
    seal_url: '',
    signature_url: '',
    // ✅ NEW
    upi_id: '',
    bank_name: '',
    account_number: '',
    ifsc_code: '',
  });
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [uploadingSeal, setUploadingSeal] = useState(false);
  const [uploadingSignature, setUploadingSignature] = useState(false);

  useEffect(() => {
    if (user) {
      fetchBusinessSettings();
    }
  }, [user]);

  const fetchBusinessSettings = async () => {
    if (!user) return;

    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('business_settings')
        .select('*')
        .eq('user_id', user.id)
        .single()

      if (error && error.code !== 'PGRST116') {
        throw error;
      }

      if (data) {
        setSettings({
          business_name: data.business_name || '',
          business_address: data.business_address || '',
          business_phone: data.business_phone || '',
          business_email: data.business_email || '',
          payment_instructions: data.payment_instructions || 'Payment due within 10 days. Thank you for your business!',
          thank_you_note: data.thank_you_note || 'Thank you for choosing our services.',
          seal_url: data.seal_url || '',
          signature_url: data.signature_url || '',
          upi_id: data.upi_id || '',
          bank_name: data.bank_name || '',
          account_number: data.account_number || '',
          ifsc_code: data.ifsc_code || '',
        });
      }
    } catch (error) {
      console.error('Error fetching business settings:', error);
      toast({
        title: "Error",
        description: "Failed to load business settings.",
        variant: "destructive",
      });
    }
    setIsLoading(false);
  };

  const saveSettings = async () => {
    if (!user) return;

    setIsSaving(true);
    try {
      const { error } = await supabase
        .from('business_settings')
        .upsert(
          {
            user_id: user.id,
            business_name: settings.business_name,
            business_address: settings.business_address,
            business_phone: settings.business_phone,
            business_email: settings.business_email,
            payment_instructions: settings.payment_instructions,
            thank_you_note: settings.thank_you_note,
            seal_url: settings.seal_url,
            signature_url: settings.signature_url,
            // ✅ NEW
            upi_id: settings.upi_id,
            bank_name: settings.bank_name,
            account_number: settings.account_number,
            ifsc_code: settings.ifsc_code,
            updated_at: new Date().toISOString()
          },
          { onConflict: 'user_id' } // ✅ ensure updates instead of no-op
        );

      if (error) throw error;

      toast({
        title: "Settings saved!",
        description: "Your business settings have been updated successfully.",
      });
    } catch (error) {
      console.error('Error saving business settings:', error);
      toast({
        title: "Error",
        description: "Failed to save business settings. Please try again.",
        variant: "destructive",
      });
    }
    setIsSaving(false);
  };

  const uploadFile = async (file: File, type: 'seal' | 'signature') => {
    if (!user) return;

    const isValidType = file.type.startsWith('image/');
    if (!isValidType) {
      toast({
        title: "Invalid file type",
        description: "Please upload an image file.",
        variant: "destructive",
      });
      return;
    }

    const maxSize = 5 * 1024 * 1024; // 5MB
    if (file.size > maxSize) {
      toast({
        title: "File too large",
        description: "Please upload an image smaller than 5MB.",
        variant: "destructive",
      });
      return;
    }

    if (type === 'seal') {
      setUploadingSeal(true);
    } else {
      setUploadingSignature(true);
    }

    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${user.id}/${type}.${fileExt}`;

      const { error: uploadError, data } = await supabase.storage
        .from('business-docs')
        .upload(fileName, file, { upsert: true });

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('business-docs')
        .getPublicUrl(fileName);

      setSettings(prev => ({
        ...prev,
        [type === 'seal' ? 'seal_url' : 'signature_url']: publicUrl
      }));

      toast({
        title: "Upload successful!",
        description: `${type === 'seal' ? 'Seal' : 'Signature'} uploaded successfully.`,
      });
    } catch (error) {
      console.error(`Error uploading ${type}:`, error);
      toast({
        title: "Upload failed",
        description: `Failed to upload ${type}. Please try again.`,
        variant: "destructive",
      });
    }

    if (type === 'seal') {
      setUploadingSeal(false);
    } else {
      setUploadingSignature(false);
    }
  };

  const removeFile = (type: 'seal' | 'signature') => {
    setSettings(prev => ({
      ...prev,
      [type === 'seal' ? 'seal_url' : 'signature_url']: ''
    }));
  };

  const handleInputChange = (field: keyof BusinessSettings, value: string) => {
    setSettings(prev => ({
      ...prev,
      [field]: value
    }));
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 via-white to-purple-50 flex items-center justify-center">
        <Navbar />
        <div>Loading business settings...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 via-white to-purple-50">
      <Navbar />
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center gap-4 mb-8">
          <Button onClick={() => navigate('/')} variant="outline" size="sm">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Dashboard
          </Button>
          <div>
            <h1 className="text-3xl font-bold bg-gradient-to-r from-green-600 to-purple-600 bg-clip-text text-transparent">
              Business Settings
            </h1>
            <p className="text-gray-600">Configure your business information for invoices</p>
          </div>
        </div>

        <div className="max-w-2xl mx-auto">
          <Card className="hover:shadow-lg transition-shadow cursor-pointer" onClick={() => navigate('/team-settings')}>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users2 className="w-5 h-5" />
                Team & Roles
              </CardTitle>
              <CardDescription>
                Grant teammates access to your data
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button className="w-full" variant="outline">Manage Team</Button>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Business Information</CardTitle>
              <CardDescription>
                This information will appear on your invoices
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="business_name">Business Name *</Label>
                  <Input
                    id="business_name"
                    value={settings.business_name}
                    onChange={(e) => handleInputChange('business_name', e.target.value)}
                    placeholder="Your Business Name"
                  />
                </div>
                <div>
                  <Label htmlFor="business_email">Business Email</Label>
                  <Input
                    id="business_email"
                    type="email"
                    value={settings.business_email}
                    onChange={(e) => handleInputChange('business_email', e.target.value)}
                    placeholder="business@example.com"
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="business_phone">Business Phone</Label>
                <Input
                  id="business_phone"
                  value={settings.business_phone}
                  onChange={(e) => handleInputChange('business_phone', e.target.value)}
                  placeholder="+1 (555) 123-4567"
                />
              </div>

              <div>
                <Label htmlFor="business_address">Business Address</Label>
                <Textarea
                  id="business_address"
                  value={settings.business_address}
                  onChange={(e) => handleInputChange('business_address', e.target.value)}
                  placeholder="123 Business Street&#10;City, State 12345&#10;Country"
                  rows={3}
                />
              </div>

              <div>
                <Label htmlFor="payment_instructions">Default Payment Instructions</Label>
                <Textarea
                  id="payment_instructions"
                  value={settings.payment_instructions}
                  onChange={(e) => handleInputChange('payment_instructions', e.target.value)}
                  placeholder="Payment terms and instructions..."
                  rows={3}
                />
              </div>
              <div className="border-t pt-6 space-y-4">
                <h3 className="font-semibold text-gray-800">Payment Details</h3>

                {/* UPI */}
                <div>
                  <Label>UPI ID</Label>
                  <Input
                    value={settings.upi_id}
                    onChange={(e) => handleInputChange("upi_id", e.target.value)}
                    placeholder="example@okaxis"
                  />
                </div>

                {/* Bank Name */}
                <div>
                  <Label>Bank Name</Label>
                  <Input
                    value={settings.bank_name}
                    onChange={(e) => handleInputChange("bank_name", e.target.value)}
                    placeholder="State Bank of India"
                  />
                </div>

                {/* Account Number */}
                <div>
                  <Label>Account Number</Label>
                  <Input
                    value={settings.account_number}
                    onChange={(e) => handleInputChange("account_number", e.target.value)}
                    placeholder="XXXXXXXXXXXX"
                  />
                </div>

                {/* IFSC */}
                <div>
                  <Label>IFSC Code</Label>
                  <Input
                    value={settings.ifsc_code}
                    onChange={(e) => handleInputChange("ifsc_code", e.target.value)}
                    placeholder="SBIN000XXXX"
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="thank_you_note">Default Thank You Note</Label>
                <Textarea
                  id="thank_you_note"
                  value={settings.thank_you_note}
                  onChange={(e) => handleInputChange('thank_you_note', e.target.value)}
                  placeholder="Thank you message..."
                  rows={2}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <Label htmlFor="seal_upload">Business Seal</Label>
                  <div className="space-y-2">
                    {settings.seal_url ? (
                      <div className="relative inline-block">
                        <img
                          src={settings.seal_url}
                          alt="Business Seal"
                          className="w-20 h-20 object-contain border rounded"
                        />
                        <Button
                          type="button"
                          variant="destructive"
                          size="sm"
                          className="absolute -top-2 -right-2 h-6 w-6 p-0"
                          onClick={() => removeFile('seal')}
                        >
                          <X className="w-3 h-3" />
                        </Button>
                      </div>
                    ) : (
                      <div className="border-2 border-dashed border-gray-300 rounded-lg p-4 text-center">
                        <Upload className="w-8 h-8 mx-auto mb-2 text-gray-400" />
                        <p className="text-sm text-gray-500">Upload seal image</p>
                      </div>
                    )}
                    <Input
                      id="seal_upload"
                      type="file"
                      accept="image/*"
                      disabled={uploadingSeal}
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) uploadFile(file, 'seal');
                      }}
                    />
                  </div>
                </div>
                <div>
                  <Label htmlFor="signature_upload">Signature</Label>
                  <div className="space-y-2">
                    {settings.signature_url ? (
                      <div className="relative inline-block">
                        <img
                          src={settings.signature_url}
                          alt="Signature"
                          className="w-32 h-16 object-contain border rounded"
                        />
                        <Button
                          type="button"
                          variant="destructive"
                          size="sm"
                          className="absolute -top-2 -right-2 h-6 w-6 p-0"
                          onClick={() => removeFile('signature')}
                        >
                          <X className="w-3 h-3" />
                        </Button>
                      </div>
                    ) : (
                      <div className="border-2 border-dashed border-gray-300 rounded-lg p-4 text-center">
                        <Upload className="w-8 h-8 mx-auto mb-2 text-gray-400" />
                        <p className="text-sm text-gray-500">Upload signature image</p>
                      </div>
                    )}
                    <Input
                      id="signature_upload"
                      type="file"
                      accept="image/*"
                      disabled={uploadingSignature}
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) uploadFile(file, 'signature');
                      }}
                    />
                  </div>
                </div>
              </div>

              <Button
                onClick={saveSettings}
                disabled={isSaving || !settings.business_name.trim() || uploadingSeal || uploadingSignature}
                className="w-full bg-gradient-to-r from-green-600 to-purple-600 hover:from-green-700 hover:to-purple-700"
              >
                <Save className="w-4 h-4 mr-2" />
                {isSaving ? 'Saving...' : uploadingSeal || uploadingSignature ? 'Uploading...' : 'Save Settings'}
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default BusinessSettings;
