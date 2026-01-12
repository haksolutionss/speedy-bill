import React from 'react';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Plus, Trash2, Loader2 } from 'lucide-react';
import type { DbCategory, ProductWithPortions } from '@/types/database';

const portionSchema = z.object({
  id: z.string().optional(),
  size: z.string().min(1, 'Size is required'),
  price: z.number().min(0.01, 'Price must be greater than 0'),
});

const productSchema = z.object({
  name: z.string().min(1, 'Name is required').max(100, 'Name must be less than 100 characters'),
  code: z.string().min(1, 'Code is required').max(20, 'Code must be less than 20 characters'),
  category_id: z.string().min(1, 'Category is required'),
  description: z.string().max(500, 'Description must be less than 500 characters').optional(),
  gst_rate: z.number().min(0, 'GST rate must be 0 or more').max(100, 'GST rate must be 100 or less'),
  portions: z.array(portionSchema).min(1, 'At least one portion is required'),
});

export type ProductFormData = z.infer<typeof productSchema>;

interface ProductFormProps {
  categories: DbCategory[];
  initialData?: ProductWithPortions | null;
  onSubmit: (data: ProductFormData) => void;
  isLoading?: boolean;
}

const PORTION_SIZES = ['full', 'half', 'quarter', 'single', 'small', 'medium', 'large'];

export function ProductForm({ categories, initialData, onSubmit, isLoading }: ProductFormProps) {
  const {
    register,
    handleSubmit,
    control,
    formState: { errors },
    setValue,
    watch,
  } = useForm<ProductFormData>({
    resolver: zodResolver(productSchema),
    defaultValues: initialData
      ? {
          name: initialData.name,
          code: initialData.code,
          category_id: initialData.category_id,
          description: initialData.description || '',
          gst_rate: Number(initialData.gst_rate),
          portions: initialData.portions.map((p) => ({
            id: p.id,
            size: p.size,
            price: Number(p.price),
          })),
        }
      : {
          name: '',
          code: '',
          category_id: '',
          description: '',
          gst_rate: 5,
          portions: [{ size: 'full', price: 0 }],
        },
  });

  const { fields, append, remove } = useFieldArray({
    control,
    name: 'portions',
  });

  const selectedCategory = watch('category_id');

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Name */}
        <div className="space-y-2">
          <Label htmlFor="name">Product Name *</Label>
          <Input
            id="name"
            {...register('name')}
            placeholder="e.g., Butter Chicken"
            className="border-border"
          />
          {errors.name && (
            <p className="text-sm text-destructive">{errors.name.message}</p>
          )}
        </div>

        {/* Code */}
        <div className="space-y-2">
          <Label htmlFor="code">Product Code *</Label>
          <Input
            id="code"
            {...register('code')}
            placeholder="e.g., BC001"
            className="border-border"
          />
          {errors.code && (
            <p className="text-sm text-destructive">{errors.code.message}</p>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Category */}
        <div className="space-y-2">
          <Label>Category *</Label>
          <Select
            value={selectedCategory}
            onValueChange={(value) => setValue('category_id', value)}
          >
            <SelectTrigger className="border-border">
              <SelectValue placeholder="Select category" />
            </SelectTrigger>
            <SelectContent>
              {categories.map((category) => (
                <SelectItem key={category.id} value={category.id}>
                  {category.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {errors.category_id && (
            <p className="text-sm text-destructive">{errors.category_id.message}</p>
          )}
        </div>

        {/* GST Rate */}
        <div className="space-y-2">
          <Label htmlFor="gst_rate">GST Rate (%) *</Label>
          <Input
            id="gst_rate"
            type="number"
            step="0.1"
            {...register('gst_rate', { valueAsNumber: true })}
            className="border-border"
          />
          {errors.gst_rate && (
            <p className="text-sm text-destructive">{errors.gst_rate.message}</p>
          )}
        </div>
      </div>

      {/* Description */}
      <div className="space-y-2">
        <Label htmlFor="description">Description</Label>
        <Textarea
          id="description"
          {...register('description')}
          placeholder="Optional product description"
          className="border-border"
          rows={2}
        />
        {errors.description && (
          <p className="text-sm text-destructive">{errors.description.message}</p>
        )}
      </div>

      {/* Portions */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <Label>Portions & Prices *</Label>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => append({ size: 'half', price: 0 })}
            className="gap-1"
          >
            <Plus className="h-4 w-4" />
            Add Portion
          </Button>
        </div>

        <div className="space-y-2">
          {fields.map((field, index) => (
            <div key={field.id} className="flex items-start gap-3">
              <div className="flex-1">
                <Select
                  value={watch(`portions.${index}.size`)}
                  onValueChange={(value) => setValue(`portions.${index}.size`, value)}
                >
                  <SelectTrigger className="border-border">
                    <SelectValue placeholder="Select size" />
                  </SelectTrigger>
                  <SelectContent>
                    {PORTION_SIZES.map((size) => (
                      <SelectItem key={size} value={size}>
                        {size.charAt(0).toUpperCase() + size.slice(1)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {errors.portions?.[index]?.size && (
                  <p className="text-sm text-destructive mt-1">
                    {errors.portions[index]?.size?.message}
                  </p>
                )}
              </div>

              <div className="flex-1">
                <Input
                  type="number"
                  step="0.01"
                  placeholder="Price"
                  {...register(`portions.${index}.price`, { valueAsNumber: true })}
                  className="border-border"
                />
                {errors.portions?.[index]?.price && (
                  <p className="text-sm text-destructive mt-1">
                    {errors.portions[index]?.price?.message}
                  </p>
                )}
              </div>

              {fields.length > 1 && (
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={() => remove(index)}
                  className="text-destructive hover:text-destructive/90"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              )}
            </div>
          ))}
        </div>
        {errors.portions && !Array.isArray(errors.portions) && (
          <p className="text-sm text-destructive">{errors.portions.message}</p>
        )}
      </div>

      <div className="flex justify-end gap-3 pt-4 border-t border-border">
        <Button type="submit" disabled={isLoading} className="gap-2">
          {isLoading && <Loader2 className="h-4 w-4 animate-spin" />}
          {initialData ? 'Update Product' : 'Create Product'}
        </Button>
      </div>
    </form>
  );
}
