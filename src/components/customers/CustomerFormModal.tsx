import { useState, useEffect } from 'react';
import { Users, Plus, Edit2, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';

interface CustomerFormModalProps {
  open: boolean;
  onClose: () => void;
  mode: 'add' | 'edit';
  initialData?: {
    name: string;
    phone: string;
    email: string;
    points: number;
  };
  onSubmit: (data: { name: string; phone: string; email: string; points: number }) => Promise<void>;
  isSaving: boolean;
  currencySymbol?: string;
  calculatePointsValue?: (points: number) => number;
}

export function CustomerFormModal({
  open,
  onClose,
  mode,
  initialData,
  onSubmit,
  isSaving,
  currencySymbol = '₹',
  calculatePointsValue,
}: CustomerFormModalProps) {
  const [formName, setFormName] = useState('');
  const [formPhone, setFormPhone] = useState('');
  const [formEmail, setFormEmail] = useState('');
  const [formPoints, setFormPoints] = useState(0);

  useEffect(() => {
    if (initialData) {
      setFormName(initialData.name);
      setFormPhone(initialData.phone);
      setFormEmail(initialData.email);
      setFormPoints(initialData.points);
    } else {
      resetForm();
    }
  }, [initialData, open]);

  const resetForm = () => {
    setFormName('');
    setFormPhone('');
    setFormEmail('');
    setFormPoints(0);
  };

  const handleSubmit = async () => {
    await onSubmit({
      name: formName,
      phone: formPhone,
      email: formEmail,
      points: formPoints,
    });
  };

  return (
    <Dialog open={open} onOpenChange={(open) => { if (!open) { onClose(); resetForm(); } }}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {mode === 'add' ? <Users className="h-5 w-5" /> : <Edit2 className="h-5 w-5" />}
            {mode === 'add' ? 'Add Customer' : 'Edit Customer'}
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
            <Label>Phone {mode === 'add' && '*'}</Label>
            <Input
              value={formPhone}
              onChange={(e) => setFormPhone(e.target.value)}
              placeholder="10-digit phone number"
              maxLength={10}
              disabled={mode === 'edit'}
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
            <Label>{mode === 'add' ? 'Initial Loyalty Points' : 'Loyalty Points'}</Label>
            <Input
              type="number"
              value={formPoints}
              onChange={(e) => setFormPoints(parseInt(e.target.value) || 0)}
              min={0}
            />
            {mode === 'edit' && calculatePointsValue && (
              <p className="text-xs text-muted-foreground">
                Value: {currencySymbol}{calculatePointsValue(formPoints)}
              </p>
            )}
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={isSaving}>
            {isSaving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : 
              mode === 'add' ? <Plus className="h-4 w-4 mr-2" /> : <Edit2 className="h-4 w-4 mr-2" />}
            {mode === 'add' ? 'Add Customer' : 'Save Changes'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
