import { useState, useEffect } from 'react';
import { Users, Plus, Loader2, Edit2, Shield, AlertCircle, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { cn } from '@/lib/utils';
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
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [touched, setTouched] = useState<Record<string, boolean>>({});

  useEffect(() => {
    if (initialData) {
      setFormMobile(initialData.mobile);
      setFormName(initialData.name);
      setFormRole(initialData.role);
      setFormPermissions(initialData.permissions);
    } else {
      resetForm();
    }
    setErrors({});
    setTouched({});
  }, [initialData, open]);

  const resetForm = () => {
    setFormMobile('');
    setFormName('');
    setFormPin('');
    setFormRole('staff');
    setFormPermissions(DEFAULT_STAFF_PERMISSIONS);
    setErrors({});
    setTouched({});
  };

  const validateField = (field: string, value: string): string => {
    switch (field) {
      case 'mobile':
        if (!value) return 'Mobile number is required';
        if (!/^\d{10}$/.test(value)) return 'Must be 10 digits';
        return '';
      case 'pin':
        if (mode === 'add') {
          if (!value) return 'PIN is required';
          if (!/^\d{4}$/.test(value)) return 'Must be 4 digits';
        }
        return '';
      case 'name':
        if (value && value.length < 2) return 'Name must be at least 2 characters';
        return '';
      default:
        return '';
    }
  };

  const handleBlur = (field: string) => {
    setTouched({ ...touched, [field]: true });
    const value = field === 'mobile' ? formMobile : field === 'pin' ? formPin : formName;
    const error = validateField(field, value);
    setErrors({ ...errors, [field]: error });
  };

  const handleMobileChange = (value: string) => {
    const numeric = value.replace(/\D/g, '').slice(0, 10);
    setFormMobile(numeric);
    if (touched.mobile) {
      setErrors({ ...errors, mobile: validateField('mobile', numeric) });
    }
  };

  const handlePinChange = (value: string) => {
    const numeric = value.replace(/\D/g, '').slice(0, 4);
    setFormPin(numeric);
    if (touched.pin) {
      setErrors({ ...errors, pin: validateField('pin', numeric) });
    }
  };

  const handleNameChange = (value: string) => {
    setFormName(value);
    if (touched.name) {
      setErrors({ ...errors, name: validateField('name', value) });
    }
  };

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    newErrors.mobile = validateField('mobile', formMobile);
    if (mode === 'add') {
      newErrors.pin = validateField('pin', formPin);
    }
    newErrors.name = validateField('name', formName);

    setErrors(newErrors);
    setTouched({ mobile: true, pin: true, name: true });

    return !Object.values(newErrors).some(error => error !== '');
  };

  const handleSubmit = async () => {
    if (!validateForm()) return;

    try {
      await onSubmit({
        mobile: formMobile,
        pin: formPin,
        name: formName,
        role: formRole,
        permissions: formPermissions,
      });
      resetForm();
    } catch (error) {
      console.error('Form submission error:', error);
    }
  };

  const toggleAllPermissions = (enabled: boolean) => {
    const newPermissions = { ...formPermissions };
    MODULE_OPTIONS.forEach(module => {
      newPermissions[module.key as keyof StaffPermissions] = enabled;
    });
    setFormPermissions(newPermissions);
  };

  const allEnabled = MODULE_OPTIONS.every(m => formPermissions[m.key as keyof StaffPermissions]);
  const someEnabled = MODULE_OPTIONS.some(m => formPermissions[m.key as keyof StaffPermissions]);

  const isFormValid = mode === 'add'
    ? formMobile.length === 10 && formPin.length === 4
    : formMobile.length === 10;

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o && !isSaving) { onClose(); resetForm(); } }}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl">
            {mode === 'add' ? <Users className="h-5 w-5 text-primary" /> : <Edit2 className="h-5 w-5 text-primary" />}
            {mode === 'add' ? 'Add New Staff Member' : 'Edit Staff Member'}
          </DialogTitle>
          <DialogDescription>
            {mode === 'add'
              ? 'Create a new staff account with custom permissions and access levels.'
              : 'Update staff member details, role, and module access permissions.'}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="mobile" className="text-sm font-medium">
                Mobile Number {mode === 'add' && <span className="text-destructive">*</span>}
              </Label>
              <Input
                id="mobile"
                value={formMobile}
                onChange={(e) => handleMobileChange(e.target.value)}
                onBlur={() => handleBlur('mobile')}
                placeholder="Enter 10-digit mobile"
                maxLength={10}
                disabled={mode === 'edit' || isSaving}
                className={cn(touched.mobile && errors.mobile && "border-destructive focus-visible:ring-destructive")}
              />
              {touched.mobile && errors.mobile && (
                <p className="text-xs text-destructive flex items-center gap-1">
                  <AlertCircle className="h-3 w-3" />
                  {errors.mobile}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor={mode === 'add' ? 'pin' : 'name'} className="text-sm font-medium">
                {mode === 'add' ? (
                  <>PIN (4 digits) <span className="text-destructive">*</span></>
                ) : (
                  'Staff Name'
                )}
              </Label>
              {mode === 'add' ? (
                <>
                  <Input
                    id="pin"
                    type="password"
                    value={formPin}
                    onChange={(e) => handlePinChange(e.target.value)}
                    onBlur={() => handleBlur('pin')}
                    placeholder="Enter 4-digit PIN"
                    maxLength={4}
                    disabled={isSaving}
                    className={cn(touched.pin && errors.pin && "border-destructive focus-visible:ring-destructive")}
                  />
                  {touched.pin && errors.pin && (
                    <p className="text-xs text-destructive flex items-center gap-1">
                      <AlertCircle className="h-3 w-3" />
                      {errors.pin}
                    </p>
                  )}
                </>
              ) : (
                <>
                  <Input
                    id="name"
                    value={formName}
                    onChange={(e) => handleNameChange(e.target.value)}
                    onBlur={() => handleBlur('name')}
                    placeholder="Enter staff name"
                    disabled={isSaving}
                    className={cn(touched.name && errors.name && "border-destructive focus-visible:ring-destructive")}
                  />
                  {touched.name && errors.name && (
                    <p className="text-xs text-destructive flex items-center gap-1">
                      <AlertCircle className="h-3 w-3" />
                      {errors.name}
                    </p>
                  )}
                </>
              )}
            </div>
          </div>

          {mode === 'add' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="add-name" className="text-sm font-medium">Staff Name</Label>
                <Input
                  id="add-name"
                  value={formName}
                  onChange={(e) => handleNameChange(e.target.value)}
                  onBlur={() => handleBlur('name')}
                  placeholder="Enter staff name (optional)"
                  disabled={isSaving}
                  className={cn(touched.name && errors.name && "border-destructive focus-visible:ring-destructive")}
                />
                {touched.name && errors.name && (
                  <p className="text-xs text-destructive flex items-center gap-1">
                    <AlertCircle className="h-3 w-3" />
                    {errors.name}
                  </p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="add-role" className="text-sm font-medium">Role</Label>
                <Select value={formRole} onValueChange={(v) => setFormRole(v as 'manager' | 'staff')} disabled={isSaving}>
                  <SelectTrigger id="add-role">
                    <SelectValue />
                  </SelectTrigger>
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
              <Label htmlFor="edit-role" className="text-sm font-medium">Role</Label>
              <Select value={formRole} onValueChange={(v) => setFormRole(v as 'manager' | 'staff')} disabled={isSaving}>
                <SelectTrigger id="edit-role">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="staff">Staff</SelectItem>
                  <SelectItem value="manager">Manager</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="space-y-4 p-4 border rounded-lg bg-muted/30">
            <div className="flex items-center justify-between">
              <Label className="flex items-center gap-2 text-base font-semibold">
                <Shield className="h-5 w-5 text-primary" />
                Module Access Permissions
              </Label>
              <Button
                variant="outline"
                size="sm"
                onClick={() => toggleAllPermissions(!allEnabled)}
                disabled={isSaving}
                className="text-xs"
              >
                {allEnabled ? 'Deselect All' : 'Select All'}
              </Button>
            </div>

            <p className="text-sm text-muted-foreground">
              Configure which modules this staff member can access in the system.
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {MODULE_OPTIONS.map((module) => (
                <div
                  key={module.key}
                  className={cn(
                    "flex items-start justify-between p-3 border rounded-lg transition-colors",
                    formPermissions[module.key as keyof StaffPermissions]
                      ? "bg-primary/5 border-primary/30"
                      : "bg-background hover:bg-muted/50"
                  )}
                >
                  <div className="flex-1 mr-3">
                    <p className="text-sm font-medium mb-1">{module.label}</p>
                    <p className="text-xs text-muted-foreground leading-relaxed">
                      {module.description}
                    </p>
                  </div>
                  <Switch
                    checked={formPermissions[module.key as keyof StaffPermissions]}
                    onCheckedChange={(checked) =>
                      setFormPermissions({ ...formPermissions, [module.key]: checked })
                    }
                    disabled={isSaving}
                    className="mt-1"
                  />
                </div>
              ))}
            </div>

            {!someEnabled && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  Please enable at least one module permission for this staff member.
                </AlertDescription>
              </Alert>
            )}
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button
            variant="outline"
            onClick={() => { onClose(); resetForm(); }}
            disabled={isSaving}
          >
            <X className="h-4 w-4 mr-2" />
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={isSaving || !isFormValid || !someEnabled}
            className="min-w-[120px]"
          >
            {isSaving ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                {mode === 'add' ? <Plus className="h-4 w-4 mr-2" /> : <Edit2 className="h-4 w-4 mr-2" />}
                {mode === 'add' ? 'Add Staff' : 'Save Changes'}
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}