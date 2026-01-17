import { useState, useEffect } from 'react';
import { Users, Plus, Edit2, Trash2, Shield, Phone, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import type { User, StaffPermissions } from '@/types/settings';
import { MODULE_OPTIONS, DEFAULT_STAFF_PERMISSIONS } from '@/types/settings';

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
  const [staff, setStaff] = useState<StaffMember[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedStaff, setSelectedStaff] = useState<StaffMember | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  // Form state
  const [formMobile, setFormMobile] = useState('');
  const [formName, setFormName] = useState('');
  const [formPin, setFormPin] = useState('');
  const [formRole, setFormRole] = useState<'manager' | 'staff'>('staff');
  const [formPermissions, setFormPermissions] = useState<StaffPermissions>(DEFAULT_STAFF_PERMISSIONS);

  // Load staff
  useEffect(() => {
    loadStaff();
  }, []);

  const loadStaff = async () => {
    setIsLoading(true);
    try {
      const { data: users, error } = await supabase
        .from('users')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Load permissions for each user
      const staffWithPermissions: StaffMember[] = await Promise.all(
        (users || []).map(async (user) => {
          // Get role from user_roles
          const { data: roleData } = await supabase
            .from('user_roles')
            .select('role')
            .eq('user_id', user.id)
            .single();

          // Get permissions
          const { data: permData } = await supabase
            .from('staff_permissions')
            .select('*')
            .eq('user_id', user.id)
            .single();

          const role = (roleData?.role || user.role) as 'admin' | 'manager' | 'staff';

          const permissions: StaffPermissions = role === 'admin' 
            ? {
                canAccessBilling: true,
                canAccessProducts: true,
                canAccessTables: true,
                canAccessReports: true,
                canAccessHistory: true,
                canAccessSettings: true,
                canAccessCustomers: true,
                canAccessStaff: true,
              }
            : permData 
              ? {
                  canAccessBilling: permData.can_access_billing,
                  canAccessProducts: permData.can_access_products,
                  canAccessTables: permData.can_access_tables,
                  canAccessReports: permData.can_access_reports,
                  canAccessHistory: permData.can_access_history,
                  canAccessSettings: permData.can_access_settings,
                  canAccessCustomers: permData.can_access_customers,
                  canAccessStaff: permData.can_access_staff,
                }
              : DEFAULT_STAFF_PERMISSIONS;

          return {
            id: user.id,
            mobile: user.mobile,
            name: user.name,
            role,
            isActive: user.is_active,
            createdAt: user.created_at,
            permissions,
          };
        })
      );

      setStaff(staffWithPermissions);
    } catch (err) {
      console.error('Failed to load staff:', err);
      toast.error('Failed to load staff');
    } finally {
      setIsLoading(false);
    }
  };

  const hashPin = (pin: string): string => {
    let hash = 0;
    for (let i = 0; i < pin.length; i++) {
      const char = pin.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    return hash.toString(16);
  };

  const handleAddStaff = async () => {
    if (!formMobile || !formPin || formPin.length !== 4) {
      toast.error('Mobile and 4-digit PIN are required');
      return;
    }

    setIsSaving(true);
    try {
      // Create user
      const pinHash = hashPin(formPin);
      const { data: newUser, error } = await supabase
        .from('users')
        .insert({
          mobile: formMobile,
          pin_hash: pinHash,
          name: formName || null,
          role: formRole,
        })
        .select()
        .single();

      if (error) {
        if (error.code === '23505') {
          toast.error('Mobile number already registered');
        } else {
          throw error;
        }
        return;
      }

      // Add role
      await supabase
        .from('user_roles')
        .insert({
          user_id: newUser.id,
          role: formRole,
        });

      // Add permissions
      await supabase
        .from('staff_permissions')
        .insert({
          user_id: newUser.id,
          can_access_billing: formPermissions.canAccessBilling,
          can_access_products: formPermissions.canAccessProducts,
          can_access_tables: formPermissions.canAccessTables,
          can_access_reports: formPermissions.canAccessReports,
          can_access_history: formPermissions.canAccessHistory,
          can_access_settings: formPermissions.canAccessSettings,
          can_access_customers: formPermissions.canAccessCustomers,
          can_access_staff: formPermissions.canAccessStaff,
        });

      toast.success('Staff member added');
      setShowAddModal(false);
      resetForm();
      loadStaff();
    } catch (err) {
      console.error('Failed to add staff:', err);
      toast.error('Failed to add staff member');
    } finally {
      setIsSaving(false);
    }
  };

  const handleEditStaff = async () => {
    if (!selectedStaff) return;

    setIsSaving(true);
    try {
      // Update user
      await supabase
        .from('users')
        .update({
          name: formName || null,
          role: formRole,
        })
        .eq('id', selectedStaff.id);

      // Update role
      await supabase
        .from('user_roles')
        .upsert({
          user_id: selectedStaff.id,
          role: formRole,
        });

      // Update permissions
      await supabase
        .from('staff_permissions')
        .upsert({
          user_id: selectedStaff.id,
          can_access_billing: formPermissions.canAccessBilling,
          can_access_products: formPermissions.canAccessProducts,
          can_access_tables: formPermissions.canAccessTables,
          can_access_reports: formPermissions.canAccessReports,
          can_access_history: formPermissions.canAccessHistory,
          can_access_settings: formPermissions.canAccessSettings,
          can_access_customers: formPermissions.canAccessCustomers,
          can_access_staff: formPermissions.canAccessStaff,
        });

      toast.success('Staff member updated');
      setShowEditModal(false);
      resetForm();
      loadStaff();
    } catch (err) {
      console.error('Failed to update staff:', err);
      toast.error('Failed to update staff member');
    } finally {
      setIsSaving(false);
    }
  };

  const handleToggleActive = async (member: StaffMember) => {
    try {
      await supabase
        .from('users')
        .update({ is_active: !member.isActive })
        .eq('id', member.id);

      toast.success(member.isActive ? 'Staff deactivated' : 'Staff activated');
      loadStaff();
    } catch (err) {
      console.error('Failed to toggle staff status:', err);
      toast.error('Failed to update staff status');
    }
  };

  const openEditModal = (member: StaffMember) => {
    setSelectedStaff(member);
    setFormMobile(member.mobile);
    setFormName(member.name || '');
    setFormRole(member.role === 'admin' ? 'manager' : member.role);
    setFormPermissions(member.permissions);
    setShowEditModal(true);
  };

  const resetForm = () => {
    setFormMobile('');
    setFormName('');
    setFormPin('');
    setFormRole('staff');
    setFormPermissions(DEFAULT_STAFF_PERMISSIONS);
    setSelectedStaff(null);
  };

  const getRoleBadge = (role: string) => {
    switch (role) {
      case 'admin':
        return <Badge className="bg-primary/20 text-primary border-primary/30">Admin</Badge>;
      case 'manager':
        return <Badge className="bg-accent/20 text-accent border-accent/30">Manager</Badge>;
      default:
        return <Badge variant="outline">Staff</Badge>;
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
          <Card key={member.id}>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className={cn(
                    "h-10 w-10 rounded-full flex items-center justify-center",
                    member.isActive ? "bg-primary/10" : "bg-muted"
                  )}>
                    <Users className={cn(
                      "h-5 w-5",
                      member.isActive ? "text-primary" : "text-muted-foreground"
                    )} />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{member.name || 'Unnamed'}</span>
                      {getRoleBadge(member.role)}
                      {!member.isActive && (
                        <Badge variant="destructive" className="text-xs">Inactive</Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-1 text-sm text-muted-foreground">
                      <Phone className="h-3 w-3" />
                      {member.mobile}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {member.role !== 'admin' && (
                    <>
                      <Button variant="ghost" size="icon" onClick={() => openEditModal(member)}>
                        <Edit2 className="h-4 w-4" />
                      </Button>
                      <Switch
                        checked={member.isActive}
                        onCheckedChange={() => handleToggleActive(member)}
                      />
                    </>
                  )}
                </div>
              </div>
              {member.role !== 'admin' && (
                <div className="mt-3 flex flex-wrap gap-1">
                  {MODULE_OPTIONS.filter(m => member.permissions[m.key as keyof StaffPermissions]).map((module) => (
                    <Badge key={module.key} variant="secondary" className="text-xs">
                      {module.label}
                    </Badge>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Add Staff Modal */}
      <Dialog open={showAddModal} onOpenChange={(open) => { setShowAddModal(open); if (!open) resetForm(); }}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Add Staff Member
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Mobile Number *</Label>
                <Input
                  value={formMobile}
                  onChange={(e) => setFormMobile(e.target.value)}
                  placeholder="10-digit mobile"
                  maxLength={10}
                />
              </div>
              <div className="space-y-2">
                <Label>PIN (4 digits) *</Label>
                <Input
                  type="password"
                  value={formPin}
                  onChange={(e) => setFormPin(e.target.value.replace(/\D/g, ''))}
                  placeholder="****"
                  maxLength={4}
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Name</Label>
                <Input
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  placeholder="Staff name"
                />
              </div>
              <div className="space-y-2">
                <Label>Role</Label>
                <Select value={formRole} onValueChange={(v) => setFormRole(v as 'manager' | 'staff')}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="staff">Staff</SelectItem>
                    <SelectItem value="manager">Manager</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-3">
              <Label className="flex items-center gap-2">
                <Shield className="h-4 w-4" />
                Module Access
              </Label>
              <div className="grid grid-cols-2 gap-2">
                {MODULE_OPTIONS.map((module) => (
                  <div key={module.key} className="flex items-center justify-between p-2 border rounded-lg">
                    <div>
                      <p className="text-sm font-medium">{module.label}</p>
                      <p className="text-xs text-muted-foreground">{module.description}</p>
                    </div>
                    <Switch
                      checked={formPermissions[module.key as keyof StaffPermissions]}
                      onCheckedChange={(checked) => 
                        setFormPermissions({ ...formPermissions, [module.key]: checked })
                      }
                    />
                  </div>
                ))}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddModal(false)}>
              Cancel
            </Button>
            <Button onClick={handleAddStaff} disabled={isSaving}>
              {isSaving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Plus className="h-4 w-4 mr-2" />}
              Add Staff
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Staff Modal */}
      <Dialog open={showEditModal} onOpenChange={(open) => { setShowEditModal(open); if (!open) resetForm(); }}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Edit2 className="h-5 w-5" />
              Edit Staff Member
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Mobile Number</Label>
                <Input value={formMobile} disabled />
              </div>
              <div className="space-y-2">
                <Label>Name</Label>
                <Input
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  placeholder="Staff name"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Role</Label>
              <Select value={formRole} onValueChange={(v) => setFormRole(v as 'manager' | 'staff')}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="staff">Staff</SelectItem>
                  <SelectItem value="manager">Manager</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-3">
              <Label className="flex items-center gap-2">
                <Shield className="h-4 w-4" />
                Module Access
              </Label>
              <div className="grid grid-cols-2 gap-2">
                {MODULE_OPTIONS.map((module) => (
                  <div key={module.key} className="flex items-center justify-between p-2 border rounded-lg">
                    <div>
                      <p className="text-sm font-medium">{module.label}</p>
                      <p className="text-xs text-muted-foreground">{module.description}</p>
                    </div>
                    <Switch
                      checked={formPermissions[module.key as keyof StaffPermissions]}
                      onCheckedChange={(checked) => 
                        setFormPermissions({ ...formPermissions, [module.key]: checked })
                      }
                    />
                  </div>
                ))}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowEditModal(false)}>
              Cancel
            </Button>
            <Button onClick={handleEditStaff} disabled={isSaving}>
              {isSaving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Edit2 className="h-4 w-4 mr-2" />}
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
