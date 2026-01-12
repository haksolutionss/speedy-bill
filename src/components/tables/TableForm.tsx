import React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Loader2 } from 'lucide-react';
import type { DbTable, DbTableSection } from '@/types/database';

const tableSchema = z.object({
  number: z.string().min(1, 'Table number is required').max(10, 'Table number must be less than 10 characters'),
  section_id: z.string().min(1, 'Section is required'),
  capacity: z.number().min(1, 'Capacity must be at least 1').max(50, 'Capacity cannot exceed 50'),
  status: z.enum(['available', 'occupied', 'reserved', 'maintenance']),
});

export type TableFormData = z.infer<typeof tableSchema>;

interface TableFormProps {
  sections: DbTableSection[];
  initialData?: DbTable | null;
  onSubmit: (data: TableFormData) => void;
  isLoading?: boolean;
}

const TABLE_STATUSES = [
  { value: 'available', label: 'Available' },
  { value: 'occupied', label: 'Occupied' },
  { value: 'reserved', label: 'Reserved' },
  { value: 'maintenance', label: 'Maintenance' },
];

export function TableForm({ sections, initialData, onSubmit, isLoading }: TableFormProps) {
  const {
    register,
    handleSubmit,
    formState: { errors },
    setValue,
    watch,
  } = useForm<TableFormData>({
    resolver: zodResolver(tableSchema),
    defaultValues: initialData
      ? {
          number: initialData.number,
          section_id: initialData.section_id,
          capacity: initialData.capacity,
          status: initialData.status as 'available' | 'occupied' | 'reserved' | 'maintenance',
        }
      : {
          number: '',
          section_id: '',
          capacity: 4,
          status: 'available',
        },
  });

  const selectedSection = watch('section_id');
  const selectedStatus = watch('status');

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Table Number */}
        <div className="space-y-2">
          <Label htmlFor="number">Table Number *</Label>
          <Input
            id="number"
            {...register('number')}
            placeholder="e.g., T1, A01"
            className="border-border"
          />
          {errors.number && (
            <p className="text-sm text-destructive">{errors.number.message}</p>
          )}
        </div>

        {/* Capacity */}
        <div className="space-y-2">
          <Label htmlFor="capacity">Capacity (seats) *</Label>
          <Input
            id="capacity"
            type="number"
            {...register('capacity', { valueAsNumber: true })}
            className="border-border"
          />
          {errors.capacity && (
            <p className="text-sm text-destructive">{errors.capacity.message}</p>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Section */}
        <div className="space-y-2">
          <Label>Section *</Label>
          <Select
            value={selectedSection}
            onValueChange={(value) => setValue('section_id', value)}
          >
            <SelectTrigger className="border-border">
              <SelectValue placeholder="Select section" />
            </SelectTrigger>
            <SelectContent>
              {sections.map((section) => (
                <SelectItem key={section.id} value={section.id}>
                  {section.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {errors.section_id && (
            <p className="text-sm text-destructive">{errors.section_id.message}</p>
          )}
        </div>

        {/* Status */}
        <div className="space-y-2">
          <Label>Status</Label>
          <Select
            value={selectedStatus}
            onValueChange={(value) => setValue('status', value as TableFormData['status'])}
          >
            <SelectTrigger className="border-border">
              <SelectValue placeholder="Select status" />
            </SelectTrigger>
            <SelectContent>
              {TABLE_STATUSES.map((status) => (
                <SelectItem key={status.value} value={status.value}>
                  {status.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {errors.status && (
            <p className="text-sm text-destructive">{errors.status.message}</p>
          )}
        </div>
      </div>

      <div className="flex justify-end gap-3 pt-4 border-t border-border">
        <Button type="submit" disabled={isLoading} className="gap-2">
          {isLoading && <Loader2 className="h-4 w-4 animate-spin" />}
          {initialData ? 'Update Table' : 'Create Table'}
        </Button>
      </div>
    </form>
  );
}
