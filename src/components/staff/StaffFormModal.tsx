import { useState, useEffect } from 'react';
import { Users, Plus, Loader2, Edit2, Shield } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import type { StaffPermissions } from '@/types/settings';
import { MODULE_OPTIONS, DEFAULT_STAFF_PERMISSIONS } from '@/types/settings';

interface StaffFormModalProps {
  open: boolean;
  onClose: () => void;
  mode: 'add' | 'edit';
  initialData?: {
    mobile: string;
    name: string;
    role: 'manager' | 'staff';
    permissions: StaffPermissions;
  };
  onSubmit: (data: {
    mobile: string;
    pin: string;
    name: string;
    role: 'manager' | 'staff';
    permissions: StaffPermissions;
  }) => Promise<void>;
  isSaving: boolean;
}

export function StaffFormModal({
  open,
  onClose,
  mode,
  initialData,
  onSubmit,
  isSaving,
}: StaffFormModalProps) {
  const [formMobile, setFormMobile] = useState('');
  const [formName, setFormName] = useState('');
  const [formPin, setFormPin] = useState('');
  const [formRole, setFormRole] = useState<'manager' | 'staff'>('staff');
  const [formPermissions, setFormPermissions] = useState<StaffPermissions>(DEFAULT_STAFF_PERMISSIONS);

  useEffect(() => {
    if (initialData) {
      setFormMobile(initialData.mobile);
      setFormName(initialData.name);
      setFormRole(initialData.role);
      setFormPermissions(initialData.permissions);
    } else {
      resetForm();
    }
  }, [initialData, open]);

  const resetForm = () => {
    setFormMobile('');
    setFormName('');
    setFormPin('');
    setFormRole('staff');
    setFormPermissions(DEFAULT_STAFF_PERMISSIONS);
  };

  const handleSubmit = async () => {
    await onSubmit({
      mobile: formMobile,
      pin: formPin,
      name: formName,
      role: formRole,
      permissions: formPermissions,
    });
  };

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) { onClose(); resetForm(); } }}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {mode === 'add' ? <Users className="h-5 w-5" /> : <Edit2 className="h-5 w-5" />}
            {mode === 'add' ? 'Add Staff Member' : 'Edit Staff Member'}
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Mobile Number {mode === 'add' && '*'}</Label>
              <Input
                value={formMobile}
                onChange={(e) => setFormMobile(e.target.value)}
                placeholder="10-digit mobile"
                maxLength={10}
                disabled={mode === 'edit'}
              />
            </div>
            <div className="space-y-2">
              <Label>{mode === 'add' ? 'PIN (4 digits) *' : 'Name'}</Label>
              {mode === 'add' ? (
                <Input
                  type="password"
                  value={formPin}
                  onChange={(e) => setFormPin(e.target.value.replace(/\D/g, ''))}
                  placeholder="****"
                  maxLength={4}
                />
              ) : (
                <Input
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  placeholder="Staff name"
                />
              )}
            </div>
          </div>
          {mode === 'add' && (
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
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="staff">Staff</SelectItem>
                    <SelectItem value="manager">Manager</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}
          {mode === 'edit' && (
            <div className="space-y-2">
              <Label>Role</Label>
              <Select value={formRole} onValueChange={(v) => setFormRole(v as 'manager' | 'staff')}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="staff">Staff</SelectItem>
                  <SelectItem value="manager">Manager</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}
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
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={handleSubmit} disabled={isSaving}>
            {isSaving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : 
              mode === 'add' ? <Plus className="h-4 w-4 mr-2" /> : <Edit2 className="h-4 w-4 mr-2" />}
            {mode === 'add' ? 'Add Staff' : 'Save Changes'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
