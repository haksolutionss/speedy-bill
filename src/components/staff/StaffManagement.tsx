import { useState } from 'react';
import { Plus, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useStaff } from '@/hooks/useStaff';
import { StaffCard } from './StaffCard';
import type { StaffPermissions } from '@/types/settings';
import { DEFAULT_STAFF_PERMISSIONS } from '@/types/settings';
import { StaffFormModal } from './StaffFormModal';

interface StaffMember {
  id: string;
  mobile: string;
  name: string | null;
  role: 'admin' | 'manager' | 'staff';
  isActive: boolean;
  createdAt: string;
  permissions: StaffPermissions;
}

export function StaffManagement() {
  const { staff, isLoading, addStaff, updateStaff, toggleActive } = useStaff();
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedStaff, setSelectedStaff] = useState<StaffMember | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const openEditModal = (member: StaffMember) => {
    setSelectedStaff(member);
    setShowEditModal(true);
  };

  const handleAddStaff = async (data: {
    mobile: string;
    pin: string;
    name: string;
    role: 'manager' | 'staff';
    permissions: StaffPermissions;
  }) => {
    if (!data.mobile || !data.pin || data.pin.length !== 4) {
      return;
    }
    setIsSaving(true);
    const success = await addStaff(data.mobile, data.pin, data.name, data.role, data.permissions);
    setIsSaving(false);
    if (success) {
      setShowAddModal(false);
    }
  };

  const handleEditStaff = async (data: {
    mobile: string;
    pin: string;
    name: string;
    role: 'manager' | 'staff';
    permissions: StaffPermissions;
  }) => {
    if (!selectedStaff) return;
    setIsSaving(true);
    const success = await updateStaff(selectedStaff.id, data.name, data.role, data.permissions);
    setIsSaving(false);
    if (success) {
      setShowEditModal(false);
      setSelectedStaff(null);
    }
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
          <h2 className="text-xl font-semibold">Staff Management</h2>
          <p className="text-muted-foreground">Manage staff members and their permissions</p>
        </div>
        <Button onClick={() => setShowAddModal(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Add Staff
        </Button>
      </div>

      <div className="grid gap-4">
        {staff.map((member) => (
          <StaffCard
            key={member.id}
            member={member}
            onEdit={openEditModal}
            onToggleActive={toggleActive}
          />
        ))}
      </div>

      <StaffFormModal
        open={showAddModal}
        onClose={() => setShowAddModal(false)}
        mode="add"
        onSubmit={handleAddStaff}
        isSaving={isSaving}
      />

      <StaffFormModal
        open={showEditModal}
        onClose={() => { setShowEditModal(false); setSelectedStaff(null); }}
        mode="edit"
        initialData={selectedStaff ? {
          mobile: selectedStaff.mobile,
          name: selectedStaff.name || '',
          role: selectedStaff.role === 'admin' ? 'manager' : selectedStaff.role,
          permissions: selectedStaff.permissions,
        } : undefined}
        onSubmit={handleEditStaff}
        isSaving={isSaving}
      />
    </div>
  );
}
