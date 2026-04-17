import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Customer } from "@/pages/Invoices";
import { Plus, Search } from "lucide-react";
import { useNavigate } from "react-router-dom";

interface CustomerSelectorProps {
  selectedCustomer: Customer | null;
  onCustomerSelect: (customer: Customer | null) => void;
}

const CustomerSelector = ({ selectedCustomer, onCustomerSelect }: CustomerSelectorProps) => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [searchTerm, setSearchTerm] = useState(selectedCustomer?.name || "");
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [filteredCustomers, setFilteredCustomers] = useState<Customer[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  // Fields for guest mode
  const [guestDetails, setGuestDetails] = useState({
    name: "",
    email: "",
    phone: "",
    address: "",
  });

  useEffect(() => {
    if (user) {
      loadCustomers();
    }
  }, [user]);

  useEffect(() => {
    if (searchTerm && showSuggestions) {
      const filtered = customers.filter(
        (customer) =>
          customer.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          customer.email.toLowerCase().includes(searchTerm.toLowerCase())
      );
      setFilteredCustomers(filtered);
    } else {
      setFilteredCustomers([]);
    }
  }, [searchTerm, customers, showSuggestions]);

  const loadCustomers = async () => {
    if (!user) return;

    setIsLoading(true);
    const { data, error } = await supabase
      .from("customers")
      .select("*")
      .eq("user_id", user.id)
      .order("name");

    if (error) {
      console.error("Error loading customers:", error);
    } else {
      setCustomers(data || []);
    }
    setIsLoading(false);
  };

  const handleCustomerSelect = (customer: Customer) => {
    setSearchTerm(customer.name);
    onCustomerSelect(customer);
    setShowSuggestions(false);
  };

  const handleSearchChange = (value: string) => {
    setSearchTerm(value);
    setShowSuggestions(true);

    if (!value) {
      onCustomerSelect(null);
    }
  };

  const handleAddCustomer = () => {
    navigate("/customers");
  };

  // Handle guest input updates
  const handleGuestInputChange = (field: string, value: string) => {
    const updated = { ...guestDetails, [field]: value };
    setGuestDetails(updated);
    onCustomerSelect({
      id: "guest",
      name: updated.name,
      email: updated.email,
      address: updated.address,
      phone: updated.phone,
    });
  };

  return (
    <div className="space-y-4">
      {/* If user is logged in → show search dropdown */}
      {user ? (
        <>
          <div className="relative">
            <Label htmlFor="customerSearch">Customer Name</Label>
            <div className="relative">
              <Input
                id="customerSearch"
                placeholder="Start typing customer name or email..."
                value={searchTerm}
                onChange={(e) => handleSearchChange(e.target.value)}
                onFocus={() => setShowSuggestions(true)}
                className="pr-10"
              />
              <Search className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            </div>

            {showSuggestions && filteredCustomers.length > 0 && (
              <div className="absolute z-50 w-full mt-1 bg-white border rounded-md shadow-lg max-h-60 overflow-auto">
                {filteredCustomers.map((customer) => (
                  <div
                    key={customer.id}
                    className="p-3 hover:bg-gray-50 cursor-pointer border-b last:border-b-0"
                    onClick={() => handleCustomerSelect(customer)}
                  >
                    <div className="font-medium">{customer.name}</div>
                    <div className="text-sm text-gray-500">{customer.email}</div>
                    {customer.phone && (
                      <div className="text-sm text-gray-400">{customer.phone}</div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {selectedCustomer && (
            <div className="p-4 bg-gray-50 rounded-lg">
              <h4 className="font-medium mb-2">Selected Customer:</h4>
              <div className="text-sm space-y-1">
                <div>
                  <strong>Name:</strong> {selectedCustomer.name}
                </div>
                <div>
                  <strong>Email:</strong> {selectedCustomer.email}
                </div>
                {selectedCustomer.phone && (
                  <div>
                    <strong>Phone:</strong> {selectedCustomer.phone}
                  </div>
                )}
                {selectedCustomer.address && (
                  <div>
                    <strong>Address:</strong> {selectedCustomer.address}
                  </div>
                )}
              </div>
            </div>
          )}

          <div className="text-center">
            {customers.length === 0 && !isLoading && (
              <p className="text-gray-500 mb-2">
                No customers found for your account.
              </p>
            )}
            {isLoading && (
              <p className="text-gray-500 mb-2">Loading customers...</p>
            )}
            {/* <Button onClick={handleAddCustomer} size="sm" variant="outline">
              <Plus className="w-4 h-4 mr-2" />
              {customers.length === 0
                ? "Add Your First Customer"
                : "Add New Customer"}
            </Button> */}
          </div>
        </>
      ) : (
        <>
          {/* Guest Mode */}
          <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
            <p className="text-sm text-green-700 mb-3">
              <strong>Guest Mode:</strong> You can manually enter customer details.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <Label>Name</Label>
                <Input
                  placeholder="Customer Name"
                  value={guestDetails.name}
                  onChange={(e) => handleGuestInputChange("name", e.target.value)}
                />
              </div>
              <div>
                <Label>Email</Label>
                <Input
                  type="email"
                  placeholder="Customer Email"
                  value={guestDetails.email}
                  onChange={(e) => handleGuestInputChange("email", e.target.value)}
                />
              </div>
              <div>
                <Label>Phone</Label>
                <Input
                  type="tel"
                  placeholder="Phone Number"
                  value={guestDetails.phone}
                  onChange={(e) => handleGuestInputChange("phone", e.target.value)}
                />
              </div>
              <div className="sm:col-span-2">
                <Label>Address</Label>
                <Input
                  placeholder="Customer Address"
                  value={guestDetails.address}
                  onChange={(e) => handleGuestInputChange("address", e.target.value)}
                />
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default CustomerSelector;
