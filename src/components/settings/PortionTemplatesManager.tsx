import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Trash2, GripVertical, Loader2, Edit2, Check, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import type { PortionTemplate } from '@/types/portionTemplates';

export function PortionTemplatesManager() {
  const [newName, setNewName] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState('');
  const queryClient = useQueryClient();

  // Fetch portion templates
  const { data: templates = [], isLoading } = useQuery({
    queryKey: ['portion-templates'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('portion_templates')
        .select('*')
        .order('display_order', { ascending: true });
      
      if (error) throw error;
      return data as PortionTemplate[];
    },
  });

  // Add template mutation
  const addMutation = useMutation({
    mutationFn: async (name: string) => {
      const maxOrder = templates.length > 0 
        ? Math.max(...templates.map(t => t.display_order)) + 1 
        : 0;
      
      const { data, error } = await supabase
        .from('portion_templates')
        .insert({ name, display_order: maxOrder })
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['portion-templates'] });
      setNewName('');
      toast.success('Portion template added');
    },
    onError: (error) => {
      toast.error('Failed to add template: ' + error.message);
    },
  });

  // Update template mutation
  const updateMutation = useMutation({
    mutationFn: async ({ id, name }: { id: string; name: string }) => {
      const { error } = await supabase
        .from('portion_templates')
        .update({ name })
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['portion-templates'] });
      setEditingId(null);
      toast.success('Template updated');
    },
    onError: (error) => {
      toast.error('Failed to update: ' + error.message);
    },
  });

  // Delete template mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('portion_templates')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['portion-templates'] });
      toast.success('Template deleted');
    },
    onError: (error) => {
      toast.error('Failed to delete: ' + error.message);
    },
  });

  // Toggle active mutation
  const toggleActiveMutation = useMutation({
    mutationFn: async ({ id, is_active }: { id: string; is_active: boolean }) => {
      const { error } = await supabase
        .from('portion_templates')
        .update({ is_active })
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['portion-templates'] });
    },
  });

  const handleAdd = () => {
    if (newName.trim()) {
      addMutation.mutate(newName.trim());
    }
  };

  const handleStartEdit = (template: PortionTemplate) => {
    setEditingId(template.id);
    setEditingName(template.name);
  };

  const handleSaveEdit = () => {
    if (editingId && editingName.trim()) {
      updateMutation.mutate({ id: editingId, name: editingName.trim() });
    }
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setEditingName('');
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Portion Templates</CardTitle>
        <CardDescription>
          Define reusable portion sizes (e.g., 100gm, 250gm, Half, Full) that can be assigned to products.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Add new template */}
        <div className="flex gap-2">
          <Input
            placeholder="New portion name (e.g., 500gm)"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
            className="flex-1"
          />
          <Button
            onClick={handleAdd}
            disabled={!newName.trim() || addMutation.isPending}
            size="sm"
          >
            {addMutation.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Plus className="h-4 w-4" />
            )}
            Add
          </Button>
        </div>

        {/* Template list */}
        <div className="space-y-2">
          {templates.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">
              No portion templates yet. Add your first one above.
            </p>
          ) : (
            templates.map((template) => (
              <div
                key={template.id}
                className={`flex items-center gap-3 p-3 rounded-lg border ${
                  template.is_active 
                    ? 'bg-card border-border' 
                    : 'bg-muted/30 border-border/50 opacity-60'
                }`}
              >
                <GripVertical className="h-4 w-4 text-muted-foreground cursor-grab" />
                
                {editingId === template.id ? (
                  <>
                    <Input
                      value={editingName}
                      onChange={(e) => setEditingName(e.target.value)}
                      className="flex-1 h-8"
                      autoFocus
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') handleSaveEdit();
                        if (e.key === 'Escape') handleCancelEdit();
                      }}
                    />
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-8 w-8 text-success"
                      onClick={handleSaveEdit}
                      disabled={updateMutation.isPending}
                    >
                      <Check className="h-4 w-4" />
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-8 w-8"
                      onClick={handleCancelEdit}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </>
                ) : (
                  <>
                    <span className="flex-1 font-medium">{template.name}</span>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-8 w-8"
                      onClick={() => handleStartEdit(template)}
                    >
                      <Edit2 className="h-4 w-4" />
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-8 w-8"
                      onClick={() => toggleActiveMutation.mutate({ 
                        id: template.id, 
                        is_active: !template.is_active 
                      })}
                    >
                      {template.is_active ? (
                        <span className="text-xs text-success">Active</span>
                      ) : (
                        <span className="text-xs text-muted-foreground">Inactive</span>
                      )}
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-8 w-8 text-destructive hover:text-destructive"
                      onClick={() => deleteMutation.mutate(template.id)}
                      disabled={deleteMutation.isPending}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </>
                )}
              </div>
            ))
          )}
        </div>

        <p className="text-xs text-muted-foreground">
          These templates will be available when adding portions to products.
          Each product can have different prices per portion and per section.
        </p>
      </CardContent>
    </Card>
  );
}
