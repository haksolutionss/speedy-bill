import { useState } from 'react';
import { Trash2, Loader2, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Input } from '@/components/ui/input';
import { useAuthStore } from '@/store/authStore';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface ClearHistoryButtonProps {
  onSuccess: () => void;
}

export function ClearHistoryButton({ onSuccess }: ClearHistoryButtonProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [confirmText, setConfirmText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { user } = useAuthStore();

  const isAdmin = user?.role === 'admin';

  if (!isAdmin) return null;

  const handlePurge = async () => {
    if (confirmText !== 'DELETE ALL') return;
    if (!user?.id) return;

    setIsLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('clear-history', {
        body: { userId: user.id },
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      toast.success(
        `History cleared: ${data.result.deleted_bills} bills, ${data.result.deleted_items} items removed. Sequences reset.`
      );
      setIsOpen(false);
      setConfirmText('');
      onSuccess();
    } catch (err: any) {
      toast.error(err?.message || 'Failed to clear history');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      <Button
        variant="destructive"
        size="sm"
        onClick={() => setIsOpen(true)}
        className="gap-2"
      >
        <Trash2 className="h-4 w-4" />
        <span className="hidden sm:inline">Clear All History</span>
        <span className="sm:hidden">Clear All</span>
      </Button>

      <AlertDialog open={isOpen} onOpenChange={(open) => { if (!open) { setIsOpen(false); setConfirmText(''); } }}>
        <AlertDialogContent className="bg-background border-border">
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 text-destructive">
              <AlertTriangle className="h-5 w-5" />
              Clear All Billing History
            </AlertDialogTitle>
            <AlertDialogDescription className="space-y-3">
              <p>
                This will <strong>permanently delete</strong> all bills, bill items, payment records,
                print jobs, and cart items. Bill number sequences will be reset to 1.
              </p>
              <p className="text-destructive font-medium">
                This action is irreversible and cannot be undone.
              </p>
              <div className="pt-2">
                <label className="text-sm text-foreground font-medium mb-1 block">
                  Type <strong>DELETE ALL</strong> to confirm:
                </label>
                <Input
                  value={confirmText}
                  onChange={(e) => setConfirmText(e.target.value)}
                  placeholder="DELETE ALL"
                  className="mt-1"
                  disabled={isLoading}
                />
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isLoading}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault();
                handlePurge();
              }}
              disabled={confirmText !== 'DELETE ALL' || isLoading}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Delete Everything
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
