import { useAuthStore } from '@/store/authStore';
import type { StaffPermissions } from '@/types/settings';

interface PermissionGuardProps {
  permission: keyof StaffPermissions;
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

/**
 * Guard component that only renders children if user has the required permission.
 * Admins always have access to all permissions.
 */
export function PermissionGuard({ permission, children, fallback = null }: PermissionGuardProps) {
  const { hasPermission } = useAuthStore();
  
  if (!hasPermission(permission)) {
    return <>{fallback}</>;
  }
  
  return <>{children}</>;
}

/**
 * Hook to check if user has a specific permission
 */
export function useHasPermission(permission: keyof StaffPermissions): boolean {
  const { hasPermission } = useAuthStore();
  return hasPermission(permission);
}
