import { Users, Phone, Edit2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { cn } from '@/lib/utils';
import type { StaffPermissions } from '@/types/settings';
import { MODULE_OPTIONS } from '@/types/settings';

interface StaffMember {
  id: string;
  mobile: string;
  name: string | null;
  role: 'admin' | 'manager' | 'staff';
  isActive: boolean;
  permissions: StaffPermissions;
}

interface StaffCardProps {
  member: StaffMember;
  onEdit: (member: StaffMember) => void;
  onToggleActive: (member: StaffMember) => void;
}

export function StaffCard({ member, onEdit, onToggleActive }: StaffCardProps) {
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

  return (
    <Card>
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
                <Button variant="ghost" size="icon" onClick={() => onEdit(member)}>
                  <Edit2 className="h-4 w-4" />
                </Button>
                <Switch
                  checked={member.isActive}
                  onCheckedChange={() => onToggleActive(member)}
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
  );
}
