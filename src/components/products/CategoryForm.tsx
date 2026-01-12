import React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2 } from 'lucide-react';
import type { DbCategory } from '@/types/database';

const categorySchema = z.object({
  name: z.string().min(1, 'Name is required').max(50, 'Name must be less than 50 characters'),
  display_order: z.number().min(0, 'Display order must be 0 or more'),
});

export type CategoryFormData = z.infer<typeof categorySchema>;

interface CategoryFormProps {
  initialData?: DbCategory | null;
  onSubmit: (data: CategoryFormData) => void;
  isLoading?: boolean;
}

export function CategoryForm({ initialData, onSubmit, isLoading }: CategoryFormProps) {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<CategoryFormData>({
    resolver: zodResolver(categorySchema),
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
        <Label htmlFor="name">Category Name *</Label>
        <Input
          id="name"
          {...register('name')}
          placeholder="e.g., Starters, Main Course"
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
          {initialData ? 'Update Category' : 'Create Category'}
        </Button>
      </div>
    </form>
  );
}
