import { Users, Phone, Edit2, UserX, Shield } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Skeleton } from '@/components/ui/skeleton';
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
        return <Badge className="bg-primary text-primary-foreground">Admin</Badge>;
      case 'manager':
        return <Badge className="bg-blue-500/90 text-white border-0">Manager</Badge>;
      default:
        return <Badge variant="outline" className="border-muted-foreground/30">Staff</Badge>;
    }
  };

  const activeModules = MODULE_OPTIONS.filter(m => member.permissions[m.key as keyof StaffPermissions]);

  return (
    <Card className={cn(
      "transition-all duration-200 hover:shadow-md",
      !member.isActive && "opacity-60"
    )}>
      <CardContent className="p-5">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-4 flex-1 min-w-0">
            <div className={cn(
              "h-12 w-12 rounded-full flex items-center justify-center flex-shrink-0 transition-colors",
              member.isActive
                ? "bg-primary/10 ring-2 ring-primary/20"
                : "bg-muted ring-2 ring-muted-foreground/10"
            )}>
              <Users className={cn(
                "h-6 w-6",
                member.isActive ? "text-primary" : "text-muted-foreground"
              )} />
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap mb-1">
                <span className="font-semibold text-base truncate">
                  {member.name || 'Unnamed Staff'}
                </span>
                {getRoleBadge(member.role)}
                {!member.isActive && (
                  <Badge variant="destructive" className="text-xs">
                    <UserX className="h-3 w-3 mr-1" />
                    Inactive
                  </Badge>
                )}
              </div>

              <div className="flex items-center gap-1.5 text-sm text-muted-foreground mb-3">
                <Phone className="h-3.5 w-3.5 flex-shrink-0" />
                <span className="font-mono">{member.mobile}</span>
              </div>

              {member.role !== 'admin' && activeModules.length > 0 && (
                <div>
                  <div className="flex items-center gap-1.5 mb-2">
                    <Shield className="h-3.5 w-3.5 text-muted-foreground" />
                    <span className="text-xs font-medium text-muted-foreground">
                      Module Access ({activeModules.length}/{MODULE_OPTIONS.length})
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {activeModules.map((module) => (
                      <Badge
                        key={module.key}
                        variant="secondary"
                        className="text-xs font-normal"
                      >
                        {module.label}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              {member.role !== 'admin' && activeModules.length === 0 && (
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <Shield className="h-3.5 w-3.5" />
                  <span>No module access</span>
                </div>
              )}
            </div>
          </div>

          {member.role !== 'admin' && (
            <div className="flex items-center gap-2 flex-shrink-0">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => onEdit(member)}
                className="h-9 w-9"
              >
                <Edit2 className="h-4 w-4" />
              </Button>
              <div className="flex flex-col items-center gap-1">
                <Switch
                  checked={member.isActive}
                  onCheckedChange={() => onToggleActive(member)}
                />
                <span className="text-xs text-muted-foreground">
                  {member.isActive ? 'Active' : 'Inactive'}
                </span>
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

export function StaffCardSkeleton() {
  return (
    <Card>
      <CardContent className="p-5">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-4 flex-1">
            <Skeleton className="h-12 w-12 rounded-full" />
            <div className="flex-1 space-y-3">
              <div className="space-y-2">
                <Skeleton className="h-5 w-32" />
                <Skeleton className="h-4 w-24" />
              </div>
              <div className="flex flex-wrap gap-1.5">
                <Skeleton className="h-5 w-20" />
                <Skeleton className="h-5 w-24" />
                <Skeleton className="h-5 w-16" />
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Skeleton className="h-9 w-9 rounded-md" />
            <Skeleton className="h-6 w-11 rounded-full" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}