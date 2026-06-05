import { useState, useRef, useEffect } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Menu } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";

const Navbar = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef(null);
  const { user, signOut } = useAuth();
  const navigate = useNavigate();

  const toggleMenu = () => setIsOpen(!isOpen);
  const toggleDropdown = () => setDropdownOpen((prev) => !prev);

  const handleSignOut = async () => {
    await signOut();
    navigate("/auth");
  };

  // Close dropdown if clicked outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <nav className="bg-white shadow fixed top-0 left-0 right-0 z-50">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <div className="flex items-center">
            <NavLink to="/" className="flex items-center">
              <img
                src="https://lhzwholxmjolpinyxxsz.supabase.co/storage/v1/object/public/competition_documents/aadhaar/Mateng%20Visiting%20Card.png"
                alt="Mateng Logo"
                className="w-28 h-12 object-contain"
              />
            </NavLink>
          </div>

          {/* Desktop Menu */}
          <div className="hidden md:block">
            <div className="ml-10 flex items-center space-x-6 relative">
              <NavLink
                to="/"
                className={({ isActive }) =>
                  isActive
                    ? "text-[#065303] font-medium"
                    : "text-gray-600 hover:text-[#065303] transition-colors"
                }
              >
                Home
              </NavLink>

              {/* Dropdown Trigger + Menu */}
              <div className="relative" ref={dropdownRef}>
                <button
                  onClick={toggleDropdown}
                  className="text-gray-600 hover:text-[#065303] transition-colors focus:outline-none"
                >
                  Manage
                </button>

                {dropdownOpen && (
                  <div className="absolute bg-white shadow-lg rounded-md mt-2 w-48 z-50">
                    <NavLink
                      to="/saved-invoices"
                      className="block px-4 py-2 hover:bg-gray-100 text-sm text-gray-700"
                      onClick={() => setDropdownOpen(false)}
                    >
                      Save Invoices
                    </NavLink>
                    <NavLink
                      to="/customers"
                      className="block px-4 py-2 hover:bg-gray-100 text-sm text-gray-700"
                      onClick={() => setDropdownOpen(false)}
                    >
                      Customer
                    </NavLink>
                    <NavLink
                      to="/inventory"
                      className="block px-4 py-2 hover:bg-gray-100 text-sm text-gray-700"
                      onClick={() => setDropdownOpen(false)}
                    >
                      Inventory
                    </NavLink>
                    <NavLink
                      to="/business-settings"
                      className="block px-4 py-2 hover:bg-gray-100 text-sm text-gray-700"
                      onClick={() => setDropdownOpen(false)}
                    >
                      Setting
                    </NavLink>
                  </div>
                )}
              </div>

              <NavLink
                to="/invoices"
                className={({ isActive }) =>
                  isActive
                    ? "text-[#065303] font-medium"
                    : "text-gray-600 hover:text-[#065303] transition-colors"
                }
              >
                Quick Invoice
              </NavLink>

              <NavLink to="https://justmateng.com/" target="_blank">
                <Button className="bg-[#065303] text-white hover:bg-[#054802]">
                  Go to main Website
                </Button>
              </NavLink>

              {/* Sign Out — only when logged in */}
              {user && (
                <Button
                  onClick={handleSignOut}
                  variant="outline"
                  className="border-[#065303] text-[#065303] hover:bg-[#065303] hover:text-white"
                >
                  Sign Out
                </Button>
              )}
            </div>
          </div>

          {/* Mobile Menu Button */}
          <div className="md:hidden">
            <button
              onClick={toggleMenu}
              className="inline-flex items-center justify-center p-2 rounded-md text-gray-400 hover:text-primary hover:bg-gray-100 focus:outline-none"
            >
              <Menu />
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Dropdown */}
      {isOpen && (
        <div className="md:hidden bg-white border-t animate-fade-in z-40">
          <div className="px-4 pt-4 pb-4 space-y-2">
            <NavLink
              to="/"
              className="block px-3 py-2 rounded-md text-base font-medium text-gray-600 hover:bg-gray-50"
              onClick={() => setIsOpen(false)}
            >
              Home
            </NavLink>

            {/* Manage section on mobile */}
            <div className="border-t border-gray-200 pt-2">
              <p className="px-3 text-sm font-medium text-gray-500">Manage</p>
              <NavLink
                to="/saved-invoices"
                className="block px-3 py-2 text-gray-600 hover:bg-gray-50"
                onClick={() => setIsOpen(false)}
              >
                Save Invoices
              </NavLink>
              <NavLink
                to="/customers"
                className="block px-3 py-2 text-gray-600 hover:bg-gray-50"
                onClick={() => setIsOpen(false)}
              >
                Customer
              </NavLink>
              <NavLink
                to="/inventory"
                className="block px-3 py-2 text-gray-600 hover:bg-gray-50"
                onClick={() => setIsOpen(false)}
              >
                Inventory
              </NavLink>
              <NavLink
                to="/business-settings"
                className="block px-3 py-2 text-gray-600 hover:bg-gray-50"
                onClick={() => setIsOpen(false)}
              >
                Setting
              </NavLink>
            </div>

            <NavLink
              to="/invoices"
              className="block px-3 py-2 text-gray-600 hover:bg-gray-50"
              onClick={() => setIsOpen(false)}
            >
              Quick Invoice
            </NavLink>

            <div className="px-3 py-2 space-y-2">
              <Button className="w-full bg-[#065303] text-white hover:bg-[#054802]">
                Get Started
              </Button>

              {/* Sign Out on mobile — only when logged in */}
              {user && (
                <Button
                  onClick={() => {
                    setIsOpen(false);
                    handleSignOut();
                  }}
                  variant="outline"
                  className="w-full border-[#065303] text-[#065303] hover:bg-[#065303] hover:text-white"
                >
                  Sign Out
                </Button>
              )}
            </div>
          </div>
        </div>
      )}
    </nav>
  );
};

export default Navbar;