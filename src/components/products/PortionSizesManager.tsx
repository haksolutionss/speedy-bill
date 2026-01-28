import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Plus, Edit2, Trash2, Loader2, Ruler } from 'lucide-react';
import { toast } from 'sonner';
import { ConfirmDialog } from '@/components/common/ConfirmDialog';
import { EmptyState } from '@/components/common/EmptyState';
import type { DbPortionSize } from '@/types/database';

interface PortionSizeFormData {
  name: string;
  is_active: boolean;
}

export function PortionSizesManager() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingSize, setEditingSize] = useState<DbPortionSize | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [formData, setFormData] = useState<PortionSizeFormData>({ name: '', is_active: true });
  
  const queryClient = useQueryClient();

  // Fetch portion sizes
  const { data: portionSizes = [], isLoading } = useQuery({
    queryKey: ['portion-sizes'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('portion_sizes')
        .select('*')
        .order('name', { ascending: true });
      if (error) throw error;
      return data as DbPortionSize[];
    },
  });

  // Create mutation
  const createMutation = useMutation({
    mutationFn: async (data: PortionSizeFormData) => {
      const { error } = await supabase
        .from('portion_sizes')
        .insert([{ name: data.name, is_active: data.is_active }]);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['portion-sizes'] });
      toast.success('Size created successfully');
      closeModal();
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to create size');
    },
  });

  // Update mutation
  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: PortionSizeFormData }) => {
      const { error } = await supabase
        .from('portion_sizes')
        .update({ name: data.name, is_active: data.is_active })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['portion-sizes'] });
      toast.success('Size updated successfully');
      closeModal();
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to update size');
    },
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('portion_sizes')
        .delete()
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['portion-sizes'] });
      toast.success('Size deleted successfully');
      setDeleteId(null);
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to delete size');
    },
  });

  const openCreateModal = () => {
    setEditingSize(null);
    setFormData({ name: '', is_active: true });
    setIsModalOpen(true);
  };

  const openEditModal = (size: DbPortionSize) => {
    setEditingSize(size);
    setFormData({ name: size.name, is_active: size.is_active ?? true });
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingSize(null);
    setFormData({ name: '', is_active: true });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      toast.error('Size name is required');
      return;
    }

    if (editingSize) {
      updateMutation.mutate({ id: editingSize.id, data: formData });
    } else {
      createMutation.mutate(formData);
    }
  };

  const isSubmitting = createMutation.isPending || updateMutation.isPending;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-medium">Portion Sizes</h3>
          <p className="text-sm text-muted-foreground">
            Manage sizes that can be assigned to product portions
          </p>
        </div>
        <Button onClick={openCreateModal} className="gap-2">
          <Plus className="h-4 w-4" />
          Add Size
        </Button>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : portionSizes.length === 0 ? (
        <EmptyState
          icon={Ruler}
          title="No sizes yet"
          description="Create portion sizes like 100gm, 250gm, Half, Full etc."
          action={
            <Button onClick={openCreateModal} className="gap-2">
              <Plus className="h-4 w-4" />
              Add Size
            </Button>
          }
        />
      ) : (
        <div className="border border-border rounded-lg">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead className="text-center">Status</TableHead>
                <TableHead className="w-24"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {portionSizes.map((size) => (
                <TableRow key={size.id}>
                  <TableCell className="font-medium">{size.name}</TableCell>
                  <TableCell className="text-center">
                    <Badge
                      variant="outline"
                      className={size.is_active 
                        ? 'border-success/50 text-success' 
                        : 'border-destructive/50 text-destructive'
                      }
                    >
                      {size.is_active ? 'Active' : 'Inactive'}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => openEditModal(size)}
                      >
                        <Edit2 className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-destructive hover:text-destructive"
                        onClick={() => setDeleteId(size.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      {/* Create/Edit Modal */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingSize ? 'Edit Size' : 'Add Size'}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Size Name *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="e.g., 100gm, Half, Full"
                autoFocus
              />
            </div>
            <div className="flex items-center justify-between">
              <Label htmlFor="is_active">Active</Label>
              <Switch
                id="is_active"
                checked={formData.is_active}
                onCheckedChange={(checked) => setFormData({ ...formData, is_active: checked })}
              />
            </div>
            <div className="flex justify-end gap-2 pt-4">
              <Button type="button" variant="outline" onClick={closeModal}>
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                {editingSize ? 'Update' : 'Create'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <ConfirmDialog
        isOpen={!!deleteId}
        onClose={() => setDeleteId(null)}
        title="Delete Size"
        description="Are you sure you want to delete this size? This may affect products using this size."
        onConfirm={() => deleteId && deleteMutation.mutate(deleteId)}
        isLoading={deleteMutation.isPending}
        variant="destructive"
      />
    </div>
  );
}
