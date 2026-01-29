import { useState, useMemo, useEffect } from 'react';
import { Merge } from 'lucide-react';
import ResponsiveModal from '@/components/ui/responsive-modal';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
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
  useGetTableSectionsQuery,
} from '@/store/redux/api/billingApi';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';

interface MergeTableModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function MergeTableModal({ isOpen, onClose }: MergeTableModalProps) {
  const { selectedTable, loadCartFromBill, selectTable, clearCart } = useBillingStore();
  const [primaryTableId, setPrimaryTableId] = useState<string>('');
  const [selectedTableIds, setSelectedTableIds] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  // Use RTK Query directly to get fresh table data
  const { data: tableSections = [] } = useGetTableSectionsQuery();

  const [updateTable] = useUpdateTableMutation();
  const [updateBill] = useUpdateBillMutation();

  // Get selected section based on primary table
  const selectedSectionId = useMemo(() => {
    for (const section of tableSections) {
      if (section.tables.find((t) => t.id === primaryTableId)) {
        return section.id;
      }
    }
    return null;
  }, [tableSections, primaryTableId]);

  // Get occupied tables in the same section - use RTK Query data directly
  const occupiedTablesInSection = useMemo(() => {
    if (!selectedSectionId) return [];

    const section = tableSections.find((s) => s.id === selectedSectionId);
    if (!section) return [];

    return section.tables
      .filter((t) => t.status === 'occupied')
      .map((table) => ({
        id: table.id,
        number: table.number,
        sectionId: selectedSectionId,
        sectionName: section.name,
        billId: table.current_bill_id || undefined,
        amount: table.current_amount || undefined,
      }));
  }, [tableSections, selectedSectionId]);

  // Tables available to merge (same section, not the primary table)
  const tablesToMerge = useMemo(() => {
    return occupiedTablesInSection.filter((t) => t.id !== primaryTableId);
  }, [occupiedTablesInSection, primaryTableId]);

  // Get all occupied tables for primary selection dropdown
  const allOccupiedTables = useMemo(() => {
    return tableSections.flatMap((section) =>
      section.tables
        .filter((t) => t.status === 'occupied')
        .map((table) => ({
          id: table.id,
          number: table.number,
          sectionName: section.name,
          currentAmount: table.current_amount,
        }))
    );
  }, [tableSections]);

  // Reset form when modal opens
  useEffect(() => {
    if (isOpen) {
      setPrimaryTableId(selectedTable?.id || '');
      setSelectedTableIds([]);
    }
  }, [isOpen, selectedTable]);

  // Reset selected tables when primary changes
  useEffect(() => {
    setSelectedTableIds([]);
  }, [primaryTableId]);

  const toggleTableSelection = (tableId: string) => {
    setSelectedTableIds((prev) =>
      prev.includes(tableId)
        ? prev.filter((id) => id !== tableId)
        : [...prev, tableId]
    );
  };

  const handleMerge = async () => {
    if (!primaryTableId || selectedTableIds.length === 0) {
      toast.error('Please select tables to merge');
      return;
    }

    const primaryTable = occupiedTablesInSection.find((t) => t.id === primaryTableId);
    if (!primaryTable || !primaryTable.billId) {
      toast.error('Primary table has no active bill');
      return;
    }

    setIsLoading(true);
    try {
      // Get all bills to merge
      const billsToMerge = selectedTableIds
        .map((id) => occupiedTablesInSection.find((t) => t.id === id))
        .filter((t) => t?.billId);

      // Fetch items from all bills
      const allBillIds = [primaryTable.billId, ...billsToMerge.map((t) => t!.billId!)];

      const { data: allItems, error: itemsError } = await supabase
        .from('bill_items')
        .select('*')
        .in('bill_id', allBillIds);

      if (itemsError) throw itemsError;

      // Merge items with KOT-aware logic
      // Key: product_id + portion
      // If both items have KOT printed (sent_to_kitchen = true), keep separate entries
      // If one or none has KOT, merge them
      const mergedItems: typeof allItems = [];
      const processedKeys = new Set<string>();

      allItems?.forEach((item) => {
        const key = `${item.product_id}_${item.portion}`;

        // Find other items with same key
        const sameKeyItems = allItems.filter(
          (i) => `${i.product_id}_${i.portion}` === key
        );

        if (processedKeys.has(key)) return;
        processedKeys.add(key);

        if (sameKeyItems.length === 1) {
          // Only one item, just add it
          mergedItems.push(item);
        } else {
          // Multiple items with same product/portion
          const kotPrintedItems = sameKeyItems.filter((i) => i.sent_to_kitchen);
          const pendingItems = sameKeyItems.filter((i) => !i.sent_to_kitchen);

          if (kotPrintedItems.length > 1) {
            // Multiple KOT-printed items - keep them separate
            kotPrintedItems.forEach((i) => mergedItems.push({ ...i }));
            // Merge pending items if any
            if (pendingItems.length > 0) {
              const totalPendingQty = pendingItems.reduce((sum, i) => sum + i.quantity, 0);
              mergedItems.push({ ...pendingItems[0], quantity: totalPendingQty });
            }
          } else if (kotPrintedItems.length === 1) {
            // One KOT-printed, merge pending into it
            const totalQty = sameKeyItems.reduce((sum, i) => sum + i.quantity, 0);
            mergedItems.push({ ...kotPrintedItems[0], quantity: totalQty });
          } else {
            // No KOT-printed items, merge all
            const totalQty = sameKeyItems.reduce((sum, i) => sum + i.quantity, 0);
            mergedItems.push({ ...pendingItems[0], quantity: totalQty });
          }
        }
      });

      // Calculate new totals
      const subTotal = mergedItems.reduce(
        (sum, item) => sum + Number(item.unit_price) * item.quantity,
        0
      );

      // Delete items from all bills
      await supabase.from('bill_items').delete().in('bill_id', allBillIds);

      // Insert merged items to primary bill
      const newItems = mergedItems.map((item) => ({
        bill_id: primaryTable.billId,
        product_id: item.product_id,
        product_name: item.product_name,
        product_code: item.product_code,
        portion: item.portion,
        quantity: item.quantity,
        unit_price: item.unit_price,
        gst_rate: item.gst_rate,
        notes: item.notes,
        sent_to_kitchen: item.sent_to_kitchen,
        kot_printed_at: item.kot_printed_at,
      }));

      await supabase.from('bill_items').insert(newItems as any);

      // Update primary bill totals
      const cgst = subTotal * 0.025;
      const sgst = subTotal * 0.025;
      const totalAmount = subTotal + cgst + sgst;

      await updateBill({
        id: primaryTable.billId,
        updates: {
          sub_total: subTotal,
          cgst_amount: cgst,
          sgst_amount: sgst,
          total_amount: totalAmount,
          final_amount: Math.round(totalAmount),
        },
      }).unwrap();

      // Delete secondary bills and free up tables
      for (const table of billsToMerge) {
        if (table?.billId) {
          await supabase.from('bills').delete().eq('id', table.billId);
        }

        await updateTable({
          id: table!.id,
          updates: {
            status: 'available',
            current_bill_id: null,
            current_amount: null,
          },
        }).unwrap();
      }

      // Update primary table amount
      await updateTable({
        id: primaryTableId,
        updates: {
          current_amount: Math.round(totalAmount),
        },
      }).unwrap();


      // If the selected table was merged, reload its data
      if (selectedTable?.id === primaryTableId) {
        const { data: updatedBill } = await supabase
          .from('bills')
          .select('*, items:bill_items(*)')
          .eq('id', primaryTable.billId)
          .single();

        if (updatedBill) {
          loadCartFromBill(updatedBill as any);
        }
      } else {
        clearCart();
        selectTable(null);
      }

      onClose();
    } catch (error) {
      console.error('Merge error:', error);
      toast.error('Failed to merge tables');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <ResponsiveModal
      isOpen={isOpen}
      onClose={onClose}
      title="Merge Tables"
    >
      <div className="space-y-6">
        <p className="text-sm text-muted-foreground">Combine orders from multiple tables into one</p>

        {/* Primary Table */}
        <div className="space-y-2">
          <Label htmlFor="primary-table">Primary Table (Keep this bill)</Label>
          <Select value={primaryTableId} onValueChange={setPrimaryTableId}>
            <SelectTrigger id="primary-table" className="bg-background">
              <SelectValue placeholder="Select primary table" />
            </SelectTrigger>
            <SelectContent className="bg-popover z-50">
              {allOccupiedTables.length === 0 ? (
                <div className="px-2 py-4 text-sm text-muted-foreground text-center">
                  No occupied tables
                </div>
              ) : (
                allOccupiedTables.map((table) => (
                  <SelectItem key={table.id} value={table.id}>
                    <span className="flex items-center gap-2">
                      <span className="font-medium">{table.number}</span>
                      <span className="text-muted-foreground text-sm">({table.sectionName})</span>
                      {table.currentAmount && (
                        <span className="text-success text-sm">₹{table.currentAmount}</span>
                      )}
                    </span>
                  </SelectItem>
                ))
              )}
            </SelectContent>
          </Select>
          {primaryTableId && selectedSectionId && (
            <p className="text-xs text-muted-foreground">
              Only tables from the same section can be merged
            </p>
          )}
        </div>

        {/* Tables to merge */}
        {primaryTableId && tablesToMerge.length > 0 && (
          <div className="space-y-3">
            <Label>Select Tables to Merge</Label>
            <div className="grid grid-cols-2 gap-2">
              {tablesToMerge.map((table) => (
                <label
                  key={table.id}
                  className="flex items-center gap-3 p-3 border border-border rounded-lg cursor-pointer hover:bg-muted/50 transition-colors"
                >
                  <Checkbox
                    checked={selectedTableIds.includes(table.id)}
                    onCheckedChange={() => toggleTableSelection(table.id)}
                  />
                  <div className="flex-1">
                    <span className="font-medium">{table.number}</span>
                    {table.amount && (
                      <span className="text-success text-sm ml-2">₹{table.amount}</span>
                    )}
                  </div>
                </label>
              ))}
            </div>
          </div>
        )}

        {primaryTableId && tablesToMerge.length === 0 && (
          <div className="text-center py-4 text-muted-foreground">
            <Merge className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p className="text-sm">No other occupied tables in this section</p>
          </div>
        )}

        {/* Summary */}
        {selectedTableIds.length > 0 && (
          <div className="p-3 bg-muted/50 rounded-lg">
            <p className="text-sm">
              <span className="font-medium">Merging:</span>{' '}
              {[
                occupiedTablesInSection.find((t) => t.id === primaryTableId)?.number,
                ...selectedTableIds.map((id) =>
                  occupiedTablesInSection.find((t) => t.id === id)?.number
                ),
              ].join(' + ')}
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              Duplicate items will have their quantities combined
            </p>
          </div>
        )}

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
            onClick={handleMerge}
            disabled={!primaryTableId || selectedTableIds.length === 0 || isLoading}
          >
            {isLoading ? 'Merging...' : 'Merge Tables'}
          </Button>
        </div>
      </div>
    </ResponsiveModal>
  );
}
