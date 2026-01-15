import { useState, useMemo, useEffect } from 'react';
import { ArrowRightLeft } from 'lucide-react';
import ResponsiveModal from '@/components/ui/responsive-modal';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useBillingStore } from '@/store/billingStore';
import { 
  useUpdateTableMutation, 
  useUpdateBillMutation,
  useGetTableSectionsQuery 
} from '@/store/redux/api/billingApi';
import { toast } from 'sonner';

interface TransferTableModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function TransferTableModal({ isOpen, onClose }: TransferTableModalProps) {
  const { selectedTable, selectTable, clearCart } = useBillingStore();
  const [fromTableId, setFromTableId] = useState<string>('');
  const [toTableId, setToTableId] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);
  
  // Use RTK Query directly to get fresh table data
  const { data: tableSections = [] } = useGetTableSectionsQuery();
  
  const [updateTable] = useUpdateTableMutation();
  const [updateBill] = useUpdateBillMutation();

  // Get only occupied tables from RTK Query data
  const occupiedTables = useMemo(() => {
    const tables: { id: string; number: string; sectionId: string; sectionName: string; billId?: string; amount?: number }[] = [];
    tableSections.forEach((section) => {
      section.tables
        .filter((t) => t.status === 'occupied')
        .forEach((table) => {
          tables.push({
            id: table.id,
            number: table.number,
            sectionId: section.id,
            sectionName: section.name,
            billId: table.current_bill_id || undefined,
            amount: table.current_amount || undefined,
          });
        });
    });
    return tables;
  }, [tableSections]);

  // Get available tables for "To" dropdown (exclude selected "From" table)
  const availableTablesToTransfer = useMemo(() => {
    return tableSections.flatMap((section) =>
      section.tables
        .filter((t) => t.status === 'available' && t.id !== fromTableId)
        .map((table) => ({
          id: table.id,
          number: table.number,
          sectionId: section.id,
          sectionName: section.name,
        }))
    );
  }, [tableSections, fromTableId]);

  // Reset form when modal opens
  useEffect(() => {
    if (isOpen) {
      setFromTableId(selectedTable?.id || '');
      setToTableId('');
    }
  }, [isOpen, selectedTable]);

  const handleTransfer = async () => {
    if (!fromTableId || !toTableId) {
      toast.error('Please select both tables');
      return;
    }

    const fromTable = occupiedTables.find((t) => t.id === fromTableId);
    const toTable = availableTablesToTransfer.find((t) => t.id === toTableId);

    if (!fromTable || !toTable) {
      toast.error('Invalid table selection');
      return;
    }

    setIsLoading(true);
    try {
      // Update the bill to new table
      if (fromTable.billId) {
        await updateBill({
          id: fromTable.billId,
          updates: {
            table_id: toTableId,
            table_number: toTable.number,
          },
        }).unwrap();
      }

      // Free up the old table
      await updateTable({
        id: fromTableId,
        updates: {
          status: 'available',
          current_bill_id: null,
          current_amount: null,
        },
      }).unwrap();

      // Occupy the new table
      await updateTable({
        id: toTableId,
        updates: {
          status: 'occupied',
          current_bill_id: fromTable.billId || null,
          current_amount: fromTable.amount || null,
        },
      }).unwrap();

      toast.success(`Transferred from ${fromTable.number} to ${toTable.number}`);
      
      // If the transferred table was currently selected, clear selection
      if (selectedTable?.id === fromTableId) {
        clearCart();
        selectTable(null);
      }

      onClose();
    } catch (error) {
      toast.error('Failed to transfer table');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <ResponsiveModal
      isOpen={isOpen}
      onClose={onClose}
      title="Transfer Table"
    >
      <div className="space-y-6">
        <p className="text-sm text-muted-foreground">Move an order from one table to another</p>
        
        {/* From Table */}
        <div className="space-y-2">
          <Label htmlFor="from-table">From Table (Occupied)</Label>
          <Select value={fromTableId} onValueChange={setFromTableId}>
            <SelectTrigger id="from-table" className="bg-background">
              <SelectValue placeholder="Select source table" />
            </SelectTrigger>
            <SelectContent className="bg-popover z-50">
              {occupiedTables.map((table) => (
                <SelectItem key={table.id} value={table.id}>
                  <span className="flex items-center gap-2">
                    <span className="font-medium">{table.number}</span>
                    <span className="text-muted-foreground text-sm">({table.sectionName})</span>
                    {table.amount && (
                      <span className="text-success text-sm">₹{table.amount}</span>
                    )}
                  </span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Arrow indicator */}
        <div className="flex justify-center">
          <ArrowRightLeft className="h-6 w-6 text-muted-foreground" />
        </div>

        {/* To Table */}
        <div className="space-y-2">
          <Label htmlFor="to-table">To Table (Available)</Label>
          <Select value={toTableId} onValueChange={setToTableId} disabled={!fromTableId}>
            <SelectTrigger id="to-table" className="bg-background">
              <SelectValue placeholder="Select destination table" />
            </SelectTrigger>
            <SelectContent className="bg-popover z-50">
              {availableTablesToTransfer.length === 0 ? (
                <div className="px-2 py-4 text-sm text-muted-foreground text-center">
                  No available tables
                </div>
              ) : (
                availableTablesToTransfer.map((table) => (
                  <SelectItem key={table.id} value={table.id}>
                    <span className="flex items-center gap-2">
                      <span className="font-medium">{table.number}</span>
                      <span className="text-muted-foreground text-sm">({table.sectionName})</span>
                    </span>
                  </SelectItem>
                ))
              )}
            </SelectContent>
          </Select>
        </div>

        {/* Actions */}
        <div className="flex gap-3 pt-4">
          <Button
            variant="outline"
            className="flex-1"
            onClick={onClose}
          >
            Cancel
          </Button>
          <Button
            className="flex-1"
            onClick={handleTransfer}
            disabled={!fromTableId || !toTableId || isLoading}
          >
            {isLoading ? 'Transferring...' : 'Transfer'}
          </Button>
        </div>
      </div>
    </ResponsiveModal>
  );
}
