import { useState } from 'react';
import { Users, Search, Plus, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useSettingsStore } from '@/store/settingsStore';
import { ConfirmDialog } from '@/components/common/ConfirmDialog';
import { useCustomers, type Customer } from '@/hooks/useCustomers';
import { CustomerCard } from '@/components/customers/CustomerCard';
import { CustomerFormModal } from '@/components/customers/CustomerFormModal';

export default function Customers() {
  const {
    isLoading,
    searchQuery,
    setSearchQuery,
    filteredCustomers,
    addCustomer,
    updateCustomer,
    deleteCustomer,
  } = useCustomers();

  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const { settings } = useSettingsStore();

  const calculatePointsValue = (points: number) => {
    const redemptionValue = settings?.loyalty?.redemptionValue ?? 1;
    return points * redemptionValue;
  };

  const openEditModal = (customer: Customer) => {
    setSelectedCustomer(customer);
    setShowEditModal(true);
  };

  const handleAddCustomer = async (data: { name: string; phone: string; email: string; points: number }) => {
    setIsSaving(true);
    const success = await addCustomer(data);
    setIsSaving(false);
    if (success) {
      setShowAddModal(false);
    }
  };

  const handleEditCustomer = async (data: { name: string; phone: string; email: string; points: number }) => {
    if (!selectedCustomer) return;
    setIsSaving(true);
    const success = await updateCustomer(selectedCustomer.id, data);
    setIsSaving(false);
    if (success) {
      setShowEditModal(false);
      setSelectedCustomer(null);
    }
  };

  const handleDeleteCustomer = async () => {
    if (!selectedCustomer) return;
    await deleteCustomer(selectedCustomer.id);
    setShowDeleteConfirm(false);
    setSelectedCustomer(null);
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

      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search by name or phone..."
          className="pl-10"
        />
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {filteredCustomers.map((customer) => (
          <CustomerCard
            key={customer.id}
            customer={customer}
            currencySymbol={settings?.currency?.symbol ?? '₹'}
            pointsValue={calculatePointsValue(customer.loyalty_points)}
            onEdit={openEditModal}
            onDelete={(customer) => { setSelectedCustomer(customer); setShowDeleteConfirm(true); }}
          />
        ))}
      </div>

      {filteredCustomers.length === 0 && (
        <div className="text-center py-12 text-muted-foreground">
          {searchQuery ? 'No customers found' : 'No customers yet. Add your first customer!'}
        </div>
      )}

      <CustomerFormModal
        open={showAddModal}
        onClose={() => setShowAddModal(false)}
        mode="add"
        onSubmit={handleAddCustomer}
        isSaving={isSaving}
      />

      <CustomerFormModal
        open={showEditModal}
        onClose={() => { setShowEditModal(false); setSelectedCustomer(null); }}
        mode="edit"
        initialData={selectedCustomer ? {
          name: selectedCustomer.name,
          phone: selectedCustomer.phone,
          email: selectedCustomer.email || '',
          points: selectedCustomer.loyalty_points,
        } : undefined}
        onSubmit={handleEditCustomer}
        isSaving={isSaving}
        currencySymbol={settings?.currency?.symbol ?? '₹'}
        calculatePointsValue={calculatePointsValue}
      />

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
