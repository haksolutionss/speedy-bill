import { useState, useEffect } from 'react';
import { Users, Search, Plus, Phone, Mail, User, X, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';

interface Customer {
  id: string;
  name: string;
  phone: string;
  email: string | null;
  loyalty_points: number;
}

interface CustomerModalProps {
  open: boolean;
  onClose: () => void;
  onSelect: (customer: Customer | null) => void;
  currentCustomer: Customer | null;
}

export function CustomerModal({
  open,
  onClose,
  onSelect,
  currentCustomer,
}: CustomerModalProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showNewCustomerForm, setShowNewCustomerForm] = useState(false);

  // New customer form state
  const [newName, setNewName] = useState('');
  const [newPhone, setNewPhone] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  // Search customers
  useEffect(() => {
    if (!open) return;

    const searchCustomers = async () => {
      if (searchQuery.trim().length < 2) {
        setCustomers([]);
        return;
      }

      setIsSearching(true);
      try {
        const { data, error } = await supabase
          .from('customers')
          .select('*')
          .eq('is_active', true)
          .or(`name.ilike.%${searchQuery}%,phone.ilike.%${searchQuery}%`)
          .limit(10);

        if (error) throw error;
        setCustomers(data || []);
      } catch (error) {
        console.error('Error searching customers:', error);
      } finally {
        setIsSearching(false);
      }
    };

    const debounce = setTimeout(searchCustomers, 300);
    return () => clearTimeout(debounce);
  }, [searchQuery, open]);

  const handleSelectCustomer = (customer: Customer) => {
    onSelect(customer);
    onClose();
  };

  const handleRemoveCustomer = () => {
    onSelect(null);
    onClose();
  };

  const handleCreateCustomer = async () => {
    if (!newName.trim() || !newPhone.trim()) {
      toast.error('Name and phone are required');
      return;
    }

    // Validate phone
    if (!/^\d{10}$/.test(newPhone.replace(/\D/g, ''))) {
      toast.error('Please enter a valid 10-digit phone number');
      return;
    }

    setIsSaving(true);
    try {
      const { data, error } = await supabase
        .from('customers')
        .insert([{
          name: newName.trim(),
          phone: newPhone.trim(),
          email: newEmail.trim() || null,
        }])
        .select()
        .single();

      if (error) {
        if (error.code === '23505') {
          toast.error('A customer with this phone number already exists');
        } else {
          throw error;
        }
        return;
      }

      toast.success('Customer created successfully');
      onSelect(data);
      onClose();
    } catch (error) {
      console.error('Error creating customer:', error);
      toast.error('Failed to create customer');
    } finally {
      setIsSaving(false);
    }
  };

  const resetForm = () => {
    setShowNewCustomerForm(false);
    setNewName('');
    setNewPhone('');
    setNewEmail('');
    setSearchQuery('');
    setCustomers([]);
  };

  // Reset when modal closes
  useEffect(() => {
    if (!open) {
      resetForm();
    }
  }, [open]);

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-max">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Users className="h-5 w-5 text-accent" />
            {showNewCustomerForm ? 'Add New Customer' : 'Select Customer'}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Current Customer */}
          {currentCustomer && !showNewCustomerForm && (
            <div className="p-3 bg-accent/10 rounded-lg border border-accent/20">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">{currentCustomer.name}</p>
                  <p className="text-sm text-muted-foreground">{currentCustomer.phone}</p>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="bg-success/10 text-success border-success/30">
                    {currentCustomer.loyalty_points} pts
                  </Badge>
                  <Button variant="ghost" size="icon" onClick={handleRemoveCustomer}>
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>
          )}

          {!showNewCustomerForm ? (
            <>
              {/* Search */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search by name or phone..."
                  className="pl-10"
                />
                {isSearching && (
                  <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-muted-foreground" />
                )}
              </div>

              {/* Search Results */}
              {customers.length > 0 && (
                <div className="max-h-48 overflow-y-auto space-y-1">
                  {customers.map((customer) => (
                    <div
                      key={customer.id}
                      onClick={() => handleSelectCustomer(customer)}
                      className={cn(
                        "p-3 rounded-lg cursor-pointer transition-colors",
                        "hover:bg-accent/10 border border-transparent hover:border-accent/30",
                        currentCustomer?.id === customer.id && "bg-accent/10 border-accent/30"
                      )}
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-medium">{customer.name}</p>
                          <div className="flex items-center gap-3 text-sm text-muted-foreground">
                            <span className="flex items-center gap-1">
                              <Phone className="h-3 w-3" />
                              {customer.phone}
                            </span>
                            {customer.email && (
                              <span className="flex items-center gap-1">
                                <Mail className="h-3 w-3" />
                                {customer.email}
                              </span>
                            )}
                          </div>
                        </div>
                        <Badge variant="outline" className="bg-success/10 text-success border-success/30">
                          {customer.loyalty_points} pts
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* No Results */}
              {searchQuery.length >= 2 && customers.length === 0 && !isSearching && (
                <p className="text-center text-muted-foreground text-sm py-4">
                  No customers found
                </p>
              )}

              {/* Add New Customer Button */}
              <Button
                variant="outline"
                className="w-full"
                onClick={() => setShowNewCustomerForm(true)}
              >
                <Plus className="h-4 w-4 mr-2" />
                Add New Customer
              </Button>
            </>
          ) : (
            <>
              {/* New Customer Form */}
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>Name *</Label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      value={newName}
                      onChange={(e) => setNewName(e.target.value)}
                      placeholder="Customer name"
                      className="pl-10"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Phone *</Label>
                  <div className="relative">
                    <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      value={newPhone}
                      onChange={(e) => setNewPhone(e.target.value)}
                      placeholder="10-digit phone number"
                      className="pl-10"
                      maxLength={10}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Email (Optional)</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      type="email"
                      value={newEmail}
                      onChange={(e) => setNewEmail(e.target.value)}
                      placeholder="email@example.com"
                      className="pl-10"
                    />
                  </div>
                </div>
              </div>

              <div className="flex gap-2 pt-2">
                <Button variant="outline" onClick={resetForm} className="flex-1">
                  Back
                </Button>
                <Button
                  onClick={handleCreateCustomer}
                  className="flex-1 bg-success hover:bg-success/90"
                  disabled={isSaving}
                >
                  {isSaving ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    <>
                      <Plus className="h-4 w-4 mr-2" />
                      Add Customer
                    </>
                  )}
                </Button>
              </div>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
