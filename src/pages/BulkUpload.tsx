
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "@/hooks/use-toast";
import { ArrowLeft, Upload, Download } from "lucide-react";
import Navbar from "@/components/Navbar";
import { useActiveOwnerId } from "@/hooks/useActiveOwnerId";

const BulkUpload = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [file, setFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile && selectedFile.type === 'text/csv') {
      setFile(selectedFile);
    } else {
      toast({
        title: "Invalid file type",
        description: "Please select a CSV file.",
        variant: "destructive",
      });
    }
  };
  // Inside component add:
const ownerId = useActiveOwnerId();



  const parseCSV = (csvText: string) => {
    const lines = csvText.split('\n');
    const headers = lines[0].split(',').map(h => h.trim());
    
    const requiredHeaders = ['date', 'description', 'quantity', 'unit_price'];
    const missingHeaders = requiredHeaders.filter(h => !headers.includes(h));
    
    if (missingHeaders.length > 0) {
      throw new Error(`Missing required columns: ${missingHeaders.join(', ')}`);
    }

    const items = [];
    for (let i = 1; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;

      const values = line.split(',').map(v => v.trim());
      const item: any = {};

      headers.forEach((header, index) => {
        item[header] = values[index] || '';
      });

      // Validate and convert data types
      if (!item.date || !item.description) {
        throw new Error(`Row ${i + 1}: Date and description are required`);
      }

      const quantity = parseInt(item.quantity) || 1;
      const unitPrice = parseFloat(item.unit_price) || 0;

      items.push({
        date: item.date,
        order_id: item.order_id || '',
        description: item.description,
        quantity,
        unit_price: unitPrice,
        amount: quantity * unitPrice,
        customer_name: item.customer_name || '',
      });
    }

    return items;
  };

  
  const handleUpload = async () => {
    if (!file || !user) return;

    setIsUploading(true);
    try {
      const csvText = await file.text();
      const items = parseCSV(csvText);

      const batchId = crypto.randomUUID();
      const bulkItems = items.map(item => ({
        ...item,
        user_id: user.id,
        batch_id: batchId,
      }));

      // Use type assertion to work around the missing table definition
      const { error } = await (supabase as any)
        .from('bulk_invoice_items')
        .insert(bulkItems);

      if (error) throw error;

      toast({
        title: "Upload successful!",
        description: `Successfully uploaded ${items.length} items.`,
      });

      setFile(null);
      
      // Reset file input
      const fileInput = document.getElementById('csv-file') as HTMLInputElement;
      if (fileInput) fileInput.value = '';

    } catch (error) {
      console.error('Error uploading CSV:', error);
      toast({
        title: "Upload failed",
        description: error instanceof Error ? error.message : "Failed to upload CSV file.",
        variant: "destructive",
      });
    }
    setIsUploading(false);
  };

  const downloadTemplate = () => {
    const template = `date,order_id,description,quantity,unit_price,customer_name
2024-01-01,ORD-001,Website Development,1,75000.00,John Doe
2024-01-02,ORD-002,Logo Design,2,12500.00,Jane Smith`;

    const blob = new Blob([template], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'invoice_items_template.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

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
              Bulk Upload
            </h1>
            <p className="text-gray-600">Upload invoice items from CSV file</p>
          </div>
        </div>

        <div className="max-w-2xl mx-auto space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>CSV Template</CardTitle>
              <CardDescription>
                Download the template to see the required format
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button onClick={downloadTemplate} variant="outline">
                <Download className="w-4 h-4 mr-2" />
                Download Template
              </Button>
              <div className="mt-4 p-4 bg-gray-50 rounded-lg">
                <h4 className="font-medium mb-2">Required columns:</h4>
                <ul className="text-sm text-gray-600 space-y-1">
                  <li><strong>date:</strong> Date in YYYY-MM-DD format</li>
                  <li><strong>description:</strong> Item description</li>
                  <li><strong>quantity:</strong> Quantity (number)</li>
                  <li><strong>unit_price:</strong> Price per unit in rupees (number)</li>
                  <li><strong>order_id:</strong> Order ID (optional)</li>
                  <li><strong>customer_name:</strong> Customer name (optional)</li>
                </ul>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Upload CSV File</CardTitle>
              <CardDescription>
                Select a CSV file to upload invoice items
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="csv-file">CSV File</Label>
                <Input
                  id="csv-file"
                  type="file"
                  accept=".csv"
                  onChange={handleFileChange}
                />
              </div>

              {file && (
                <div className="p-4 bg-green-50 rounded-lg">
                  <p className="text-sm text-green-800">
                    <strong>Selected file:</strong> {file.name} ({Math.round(file.size / 1024)} KB)
                  </p>
                </div>
              )}

              <Button 
                onClick={handleUpload} 
                disabled={!file || isUploading}
                className="w-full bg-gradient-to-r from-green-600 to-purple-600 hover:from-green-700 hover:to-purple-700"
              >
                <Upload className="w-4 h-4 mr-2" />
                {isUploading ? 'Uploading...' : 'Upload CSV'}
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default BulkUpload;
