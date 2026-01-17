import { StaffManagement } from '@/components/staff/StaffManagement';

export default function Staff() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Staff</h1>
        <p className="text-muted-foreground">Manage staff members and permissions</p>
      </div>
      <StaffManagement />
    </div>
  );
}
