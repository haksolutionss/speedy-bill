import { Users, Phone, Mail, Gift, Edit2, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import type { Customer } from '@/hooks/useCustomers';

interface CustomerCardProps {
  customer: Customer;
  currencySymbol: string;
  pointsValue: number;
  onEdit: (customer: Customer) => void;
  onDelete: (customer: Customer) => void;
}

export function CustomerCard({ customer, currencySymbol, pointsValue, onEdit, onDelete }: CustomerCardProps) {
  return (
    <Card className={!customer.is_active ? 'opacity-60' : ''}>
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
            <Button variant="ghost" size="icon" onClick={() => onEdit(customer)}>
              <Edit2 className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => onDelete(customer)}
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
            = {currencySymbol}{pointsValue}
          </span>
        </div>
      </CardContent>
    </Card>
  );
}
