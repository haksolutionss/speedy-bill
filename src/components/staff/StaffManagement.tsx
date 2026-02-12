import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Card, CardContent } from '@/components/ui/card';
import { useStaff } from '@/hooks/useStaff';
import type { StaffPermissions } from '@/types/settings';
import { Plus, Users, AlertCircle, RefreshCw } from 'lucide-react';
import { useState } from 'react';
import { StaffCard, StaffCardSkeleton } from './StaffCard';
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
  const { staff, isLoading, error, refetch, addStaff, updateStaff, toggleActive } = useStaff();
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedStaff, setSelectedStaff] = useState<StaffMember | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [submitError, setSubmitError] = useState<string>('');

  const openEditModal = (member: StaffMember) => {
    setSelectedStaff(member);
    setShowEditModal(true);
    setSubmitError('');
  };

  const handleAddStaff = async (data: {
    mobile: string;
    pin: string;
    name: string;
    role: 'manager' | 'staff';
    permissions: StaffPermissions;
  }) => {
    if (!data.mobile || !data.pin || data.pin.length !== 4) {
      setSubmitError('Please fill in all required fields correctly.');
      return;
    }

    setIsSaving(true);
    setSubmitError('');

    try {
      const success = await addStaff(data.mobile, data.pin, data.name, data.role, data.permissions);
      if (success) {
        setShowAddModal(false);
        setSubmitError('');
      } else {
        setSubmitError('Failed to add staff member. Please try again.');
      }
    } catch (err) {
      setSubmitError('An error occurred while adding staff member.');
    } finally {
      setIsSaving(false);
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
    setSubmitError('');

    try {
      const success = await updateStaff(selectedStaff.id, data.name, data.role, data.permissions);
      if (success) {
        setShowEditModal(false);
        setSelectedStaff(null);
        setSubmitError('');
      } else {
        setSubmitError('Failed to update staff member. Please try again.');
      }
    } catch (err) {
      setSubmitError('An error occurred while updating staff member.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleToggleActive = async (member: StaffMember) => {
    await toggleActive(member);
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <div className="h-7 w-48 bg-muted animate-pulse rounded" />
            <div className="h-5 w-64 bg-muted animate-pulse rounded" />
          </div>
          <div className="h-10 w-32 bg-muted animate-pulse rounded" />
        </div>
        <div className="grid gap-4">
          {[1, 2, 3].map((i) => (
            <StaffCardSkeleton key={i} />
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-semibold tracking-tight">Staff Management</h2>
            <p className="text-muted-foreground mt-1">Manage staff members and their permissions</p>
          </div>
        </div>
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription className="flex items-center justify-between">
            <span>Failed to load staff members. {error}</span>
            <Button
              variant="outline"
              size="sm"
              onClick={refetch}
              className="ml-4"
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              Retry
            </Button>
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  const activeStaff = staff?.filter(m => m.isActive) || [];
  const inactiveStaff = staff?.filter(m => !m.isActive) || [];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-semibold tracking-tight">Staff Management</h2>
          <p className="text-muted-foreground mt-1">
            Manage staff members and their permissions
            {staff && staff.length > 0 && (
              <span className="ml-2 text-sm">
                • {activeStaff.length} active, {inactiveStaff.length} inactive
              </span>
            )}
          </p>
        </div>
        <Button onClick={() => { setShowAddModal(true); setSubmitError(''); }} size="lg">
          <Plus className="h-4 w-4 mr-2" />
          Add Staff
        </Button>
      </div>

      {submitError && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{submitError}</AlertDescription>
        </Alert>
      )}

      {staff && staff.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-16 text-center">
            <div className="h-20 w-20 rounded-full bg-muted flex items-center justify-center mb-4">
              <Users className="h-10 w-10 text-muted-foreground" />
            </div>
            <h3 className="text-lg font-semibold mb-2">No Staff Members Yet</h3>
            <p className="text-muted-foreground mb-6 max-w-sm">
              Get started by adding your first staff member. You can assign roles and customize their module access permissions.
            </p>
            <Button onClick={() => { setShowAddModal(true); setSubmitError(''); }} size="lg">
              <Plus className="h-4 w-4 mr-2" />
              Add First Staff Member
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6">
          {activeStaff.length > 0 && (
            <div className="space-y-3">
              <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
                Active Members ({activeStaff.length})
              </h3>
              <div className="grid gap-4">
                {activeStaff.map((member) => (
                  <StaffCard
                    key={member.id}
                    member={member}
                    onEdit={openEditModal}
                    onToggleActive={handleToggleActive}
                  />
                ))}
              </div>
            </div>
          )}

          {inactiveStaff.length > 0 && (
            <div className="space-y-3">
              <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
                Inactive Members ({inactiveStaff.length})
              </h3>
              <div className="grid gap-4">
                {inactiveStaff.map((member) => (
                  <StaffCard
                    key={member.id}
                    member={member}
                    onEdit={openEditModal}
                    onToggleActive={handleToggleActive}
                  />
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      <StaffFormModal
        open={showAddModal}
        onClose={() => { setShowAddModal(false); setSubmitError(''); }}
        mode="add"
        onSubmit={handleAddStaff}
        isSaving={isSaving}
      />

      <StaffFormModal
        open={showEditModal}
        onClose={() => { setShowEditModal(false); setSelectedStaff(null); setSubmitError(''); }}
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