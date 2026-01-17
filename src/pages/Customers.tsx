import { useState, useEffect } from 'react';
import { Users, Search, Plus, Edit2, Phone, Mail, Gift, Loader2, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useSettingsStore } from '@/store/settingsStore';
import { ConfirmDialog } from '@/components/common/ConfirmDialog';

interface Customer {
  id: string;
  name: string;
  phone: string;
  email: string | null;
  loyalty_points: number;
  is_active: boolean;
  created_at: string;
}

export default function Customers() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const { settings } = useSettingsStore();

  // Form state
  const [formName, setFormName] = useState('');
  const [formPhone, setFormPhone] = useState('');
  const [formEmail, setFormEmail] = useState('');
  const [formPoints, setFormPoints] = useState(0);

  // Load customers
  useEffect(() => {
    loadCustomers();
  }, []);

  const loadCustomers = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('customers')
        .select('*')
        .order('name', { ascending: true });

      if (error) throw error;
      setCustomers(data || []);
    } catch (err) {
      console.error('Failed to load customers:', err);
      toast.error('Failed to load customers');
    } finally {
      setIsLoading(false);
    }
  };

  const filteredCustomers = customers.filter(c => 
    c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    c.phone.includes(searchQuery)
  );

  const handleAddCustomer = async () => {
    if (!formName.trim() || !formPhone.trim()) {
      toast.error('Name and phone are required');
      return;
    }

    if (!/^\d{10}$/.test(formPhone.replace(/\D/g, ''))) {
      toast.error('Please enter a valid 10-digit phone number');
      return;
    }

    setIsSaving(true);
    try {
      const { error } = await supabase
        .from('customers')
        .insert({
          name: formName.trim(),
          phone: formPhone.trim(),
          email: formEmail.trim() || null,
          loyalty_points: formPoints,
        });

      if (error) {
        if (error.code === '23505') {
          toast.error('A customer with this phone number already exists');
        } else {
          throw error;
        }
        return;
      }

      toast.success('Customer added');
      setShowAddModal(false);
      resetForm();
      loadCustomers();
    } catch (err) {
      console.error('Failed to add customer:', err);
      toast.error('Failed to add customer');
    } finally {
      setIsSaving(false);
    }
  };

  const handleEditCustomer = async () => {
    if (!selectedCustomer || !formName.trim()) {
      toast.error('Name is required');
      return;
    }

    setIsSaving(true);
    try {
      const { error } = await supabase
        .from('customers')
        .update({
          name: formName.trim(),
          email: formEmail.trim() || null,
          loyalty_points: formPoints,
        })
        .eq('id', selectedCustomer.id);

      if (error) throw error;

      toast.success('Customer updated');
      setShowEditModal(false);
      resetForm();
      loadCustomers();
    } catch (err) {
      console.error('Failed to update customer:', err);
      toast.error('Failed to update customer');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteCustomer = async () => {
    if (!selectedCustomer) return;

    try {
      const { error } = await supabase
        .from('customers')
        .update({ is_active: false })
        .eq('id', selectedCustomer.id);

      if (error) throw error;

      toast.success('Customer deactivated');
      setShowDeleteConfirm(false);
      setSelectedCustomer(null);
      loadCustomers();
    } catch (err) {
      console.error('Failed to delete customer:', err);
      toast.error('Failed to delete customer');
    }
  };

  const openEditModal = (customer: Customer) => {
    setSelectedCustomer(customer);
    setFormName(customer.name);
    setFormPhone(customer.phone);
    setFormEmail(customer.email || '');
    setFormPoints(customer.loyalty_points);
    setShowEditModal(true);
  };

  const resetForm = () => {
    setFormName('');
    setFormPhone('');
    setFormEmail('');
    setFormPoints(0);
    setSelectedCustomer(null);
  };

  const calculatePointsValue = (points: number) => {
    const redemptionValue = settings?.loyalty?.redemptionValue ?? 1;
    return points * redemptionValue;
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Customers</h1>
          <p className="text-muted-foreground">Manage customers and loyalty points</p>
        </div>
        <Button onClick={() => setShowAddModal(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Add Customer
        </Button>
      </div>

      {/* Search */}
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search by name or phone..."
          className="pl-10"
        />
      </div>

      {/* Customer List */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {filteredCustomers.map((customer) => (
          <Card key={customer.id} className={!customer.is_active ? 'opacity-60' : ''}>
            <CardContent className="p-4">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                    <Users className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <p className="font-medium">{customer.name}</p>
                    <div className="flex items-center gap-1 text-sm text-muted-foreground">
                      <Phone className="h-3 w-3" />
                      {customer.phone}
                    </div>
                    {customer.email && (
                      <div className="flex items-center gap-1 text-sm text-muted-foreground">
                        <Mail className="h-3 w-3" />
                        {customer.email}
                      </div>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  <Button variant="ghost" size="icon" onClick={() => openEditModal(customer)}>
                    <Edit2 className="h-4 w-4" />
                  </Button>
                  <Button 
                    variant="ghost" 
                    size="icon"
                    onClick={() => { setSelectedCustomer(customer); setShowDeleteConfirm(true); }}
                  >
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              </div>
              <div className="mt-3 flex items-center gap-2">
                <Badge className="bg-success/10 text-success border-success/30 gap-1">
                  <Gift className="h-3 w-3" />
                  {customer.loyalty_points} pts
                </Badge>
                <span className="text-xs text-muted-foreground">
                  = {settings?.currency?.symbol ?? '₹'}{calculatePointsValue(customer.loyalty_points)}
                </span>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {filteredCustomers.length === 0 && (
        <div className="text-center py-12 text-muted-foreground">
          {searchQuery ? 'No customers found' : 'No customers yet. Add your first customer!'}
        </div>
      )}

      {/* Add Customer Modal */}
      <Dialog open={showAddModal} onOpenChange={(open) => { setShowAddModal(open); if (!open) resetForm(); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Add Customer
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Name *</Label>
              <Input
                value={formName}
                onChange={(e) => setFormName(e.target.value)}
                placeholder="Customer name"
              />
            </div>
            <div className="space-y-2">
              <Label>Phone *</Label>
              <Input
                value={formPhone}
                onChange={(e) => setFormPhone(e.target.value)}
                placeholder="10-digit phone number"
                maxLength={10}
              />
            </div>
            <div className="space-y-2">
              <Label>Email (Optional)</Label>
              <Input
                type="email"
                value={formEmail}
                onChange={(e) => setFormEmail(e.target.value)}
                placeholder="email@example.com"
              />
            </div>
            <div className="space-y-2">
              <Label>Initial Loyalty Points</Label>
              <Input
                type="number"
                value={formPoints}
                onChange={(e) => setFormPoints(parseInt(e.target.value) || 0)}
                min={0}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddModal(false)}>
              Cancel
            </Button>
            <Button onClick={handleAddCustomer} disabled={isSaving}>
              {isSaving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Plus className="h-4 w-4 mr-2" />}
              Add Customer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Customer Modal */}
      <Dialog open={showEditModal} onOpenChange={(open) => { setShowEditModal(open); if (!open) resetForm(); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Edit2 className="h-5 w-5" />
              Edit Customer
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Name *</Label>
              <Input
                value={formName}
                onChange={(e) => setFormName(e.target.value)}
                placeholder="Customer name"
              />
            </div>
            <div className="space-y-2">
              <Label>Phone</Label>
              <Input value={formPhone} disabled />
            </div>
            <div className="space-y-2">
              <Label>Email (Optional)</Label>
              <Input
                type="email"
                value={formEmail}
                onChange={(e) => setFormEmail(e.target.value)}
                placeholder="email@example.com"
              />
            </div>
            <div className="space-y-2">
              <Label>Loyalty Points</Label>
              <Input
                type="number"
                value={formPoints}
                onChange={(e) => setFormPoints(parseInt(e.target.value) || 0)}
                min={0}
              />
              <p className="text-xs text-muted-foreground">
                Value: {settings?.currency?.symbol ?? '₹'}{calculatePointsValue(formPoints)}
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowEditModal(false)}>
              Cancel
            </Button>
            <Button onClick={handleEditCustomer} disabled={isSaving}>
              {isSaving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Edit2 className="h-4 w-4 mr-2" />}
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <ConfirmDialog
        isOpen={showDeleteConfirm}
        onClose={() => setShowDeleteConfirm(false)}
        title="Deactivate Customer"
        description={`Are you sure you want to deactivate ${selectedCustomer?.name}? They will no longer appear in search.`}
        onConfirm={handleDeleteCustomer}
        variant="destructive"
        confirmText="Deactivate"
      />
    </div>
  );
}
