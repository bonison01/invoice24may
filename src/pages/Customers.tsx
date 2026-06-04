import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useActiveOwnerId } from "@/hooks/useActiveOwnerId";
import { useCompany } from "@/hooks/useCompany";
import { useRole } from "@/hooks/useRole"; // ← add
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { toast } from "@/hooks/use-toast";
import { ArrowLeft, Plus, Edit, Trash2, Users, Building2 } from "lucide-react";
import Navbar from "@/components/Navbar";

interface Customer {
  id: string;
  name: string;
  email: string;
  address: string;
  phone?: string;
}

const Customers = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const ownerId = useActiveOwnerId();
  const { activeCompany } = useCompany();
  const { canDelete } = useRole(); // ← add
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
  const [formData, setFormData] = useState({ name: "", email: "", address: "", phone: "" });
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (ownerId) loadCustomers();
  }, [ownerId]);

  const loadCustomers = async () => {
    if (!ownerId) return;
    const { data, error } = await supabase
      .from("customers")
      .select("*")
      .eq("user_id", ownerId)
      .order("created_at", { ascending: false });
    if (error) {
      toast({ title: "Error", description: "Failed to load customers", variant: "destructive" });
    } else {
      setCustomers(data || []);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.email) {
      toast({ title: "Error", description: "Name and email are required", variant: "destructive" });
      return;
    }
    if (!user || !ownerId) return;
    setIsLoading(true);
    try {
      if (editingCustomer) {
        const { error } = await supabase
          .from("customers")
          .update({ name: formData.name, email: formData.email, address: formData.address, phone: formData.phone })
          .eq("id", editingCustomer.id);
        if (error) throw error;
        toast({ title: "Customer updated!" });
      } else {
        const { error } = await supabase
          .from("customers")
          .insert({ user_id: ownerId, ...formData });
        if (error) throw error;
        toast({ title: "Customer added!" });
      }
      loadCustomers();
      resetForm();
    } catch {
      toast({ title: "Error", description: "Failed to save customer", variant: "destructive" });
    }
    setIsLoading(false);
  };

  const handleEdit = (customer: Customer) => {
    setEditingCustomer(customer);
    setFormData({ name: customer.name, email: customer.email, address: customer.address, phone: customer.phone || "" });
    setIsDialogOpen(true);
  };

  const handleDelete = async (customerId: string) => {
    if (!canDelete) { // ← guard
      toast({ title: "Access denied", description: "Only admins can delete customers.", variant: "destructive" });
      return;
    }
    if (!ownerId) return;
    const { error } = await supabase.from("customers").delete().eq("id", customerId).eq("user_id", ownerId);
    if (error) {
      toast({ title: "Error", description: "Failed to delete customer", variant: "destructive" });
    } else {
      toast({ title: "Customer deleted!" });
      loadCustomers();
    }
  };

  const resetForm = () => {
    setFormData({ name: "", email: "", address: "", phone: "" });
    setEditingCustomer(null);
    setIsDialogOpen(false);
  };

  const isViewing = activeCompany && !activeCompany.isOwn;

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 via-white to-purple-50">
      <Navbar />
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <Button onClick={() => navigate("/")} variant="outline" size="sm">
              <ArrowLeft className="w-4 h-4 mr-2" /> Back to Dashboard
            </Button>
            <div>
              <h1 className="text-3xl font-bold bg-gradient-to-r from-green-600 to-purple-600 bg-clip-text text-transparent">
                Customer Management
              </h1>
              <p className="text-gray-600">
                {isViewing ? `Viewing ${activeCompany.companyName}'s customers` : "Manage your customer database"}
              </p>
            </div>
          </div>

          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button
                onClick={resetForm}
                className="bg-gradient-to-r from-green-600 to-purple-600 hover:from-green-700 hover:to-purple-700"
              >
                <Plus className="w-4 h-4 mr-2" /> Add Customer
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>{editingCustomer ? "Edit Customer" : "Add New Customer"}</DialogTitle>
                <DialogDescription>
                  {editingCustomer ? "Update customer information." : "Enter customer details."}
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <Label>Customer Name *</Label>
                  <Input value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} required />
                </div>
                <div>
                  <Label>Email Address *</Label>
                  <Input type="email" value={formData.email} onChange={(e) => setFormData({ ...formData, email: e.target.value })} required />
                </div>
                <div>
                  <Label>Phone Number</Label>
                  <Input value={formData.phone} onChange={(e) => setFormData({ ...formData, phone: e.target.value })} />
                </div>
                <div>
                  <Label>Address</Label>
                  <Textarea value={formData.address} onChange={(e) => setFormData({ ...formData, address: e.target.value })} rows={3} />
                </div>
                <div className="flex justify-end gap-2">
                  <Button type="button" variant="outline" onClick={resetForm}>Cancel</Button>
                  <Button type="submit" className="bg-gradient-to-r from-green-600 to-purple-600" disabled={isLoading}>
                    {isLoading ? "Saving..." : editingCustomer ? "Update" : "Add Customer"}
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        {/* ── Company context banner ── */}
        {isViewing && (
          <div className="mb-6 flex items-center gap-3 bg-blue-50 border border-blue-200 rounded-lg px-4 py-3">
            <Building2 className="w-5 h-5 text-blue-600 shrink-0" />
            <p className="text-sm font-semibold text-blue-800">
              Viewing: {activeCompany.companyName} — Role: {activeCompany.role}
            </p>
          </div>
        )}

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><Users className="w-5 h-5" /> Customer List</CardTitle>
            <CardDescription>{customers.length} customer{customers.length !== 1 ? "s" : ""}</CardDescription>
          </CardHeader>
          <CardContent>
            {customers.length === 0 ? (
              <div className="text-center py-12">
                <Users className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-500">No customers yet.</p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Phone</TableHead>
                    <TableHead>Address</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {customers.map((customer) => (
                    <TableRow key={customer.id}>
                      <TableCell className="font-medium">{customer.name}</TableCell>
                      <TableCell>{customer.email}</TableCell>
                      <TableCell>{customer.phone || "—"}</TableCell>
                      <TableCell className="max-w-xs truncate">{customer.address || "—"}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button size="sm" variant="outline" onClick={() => handleEdit(customer)}>
                            <Edit className="w-4 h-4" />
                          </Button>
                          {/* ── Delete: admins only ── */}
                          {canDelete && (
                            <Button size="sm" variant="outline" onClick={() => handleDelete(customer.id)} className="text-red-600 hover:text-red-700">
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Customers;