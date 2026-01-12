import React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2 } from 'lucide-react';
import type { DbTableSection } from '@/types/database';

const sectionSchema = z.object({
  name: z.string().min(1, 'Name is required').max(50, 'Name must be less than 50 characters'),
  display_order: z.number().min(0, 'Display order must be 0 or more'),
});

export type SectionFormData = z.infer<typeof sectionSchema>;

interface SectionFormProps {
  initialData?: DbTableSection | null;
  onSubmit: (data: SectionFormData) => void;
  isLoading?: boolean;
}

export function SectionForm({ initialData, onSubmit, isLoading }: SectionFormProps) {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<SectionFormData>({
    resolver: zodResolver(sectionSchema),
    defaultValues: initialData
      ? {
          name: initialData.name,
          display_order: initialData.display_order,
        }
      : {
          name: '',
          display_order: 0,
        },
  });

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="name">Section Name *</Label>
        <Input
          id="name"
          {...register('name')}
          placeholder="e.g., Main Hall, Garden"
          className="border-border"
        />
        {errors.name && (
          <p className="text-sm text-destructive">{errors.name.message}</p>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="display_order">Display Order</Label>
        <Input
          id="display_order"
          type="number"
          {...register('display_order', { valueAsNumber: true })}
          className="border-border"
        />
        {errors.display_order && (
          <p className="text-sm text-destructive">{errors.display_order.message}</p>
        )}
      </div>

      <div className="flex justify-end gap-3 pt-4 border-t border-border">
        <Button type="submit" disabled={isLoading} className="gap-2">
          {isLoading && <Loader2 className="h-4 w-4 animate-spin" />}
          {initialData ? 'Update Section' : 'Create Section'}
        </Button>
      </div>
    </form>
  );
}
