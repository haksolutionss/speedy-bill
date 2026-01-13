import { useUIStore } from '@/store/uiStore';
import { useGetTableSectionsQuery, useUpdateTableMutation, useUpdateBillMutation } from '@/store/redux/api/billingApi';
import { Package, ArrowRightLeft, Merge, Save, Eye, RotateCcw, Check } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { Input } from '../ui/input';
import { useState, useMemo, useRef } from 'react';
import type { DbTable } from '@/types/database';
import { TransferTableModal } from './TransferTableModal';
import { MergeTableModal } from './MergeTableModal';
import { useBillingOperations } from '@/hooks/useBillingOperations';

interface TableGridProps {
  onTableSelect?: () => void;
  searchInputRef?: React.RefObject<HTMLInputElement>;
}

export function TableGrid({ onTableSelect, searchInputRef }: TableGridProps) {
  const {
    selectedTable,
    setSelectedTable,
    isParcelMode,
    setParcelMode,
    cart,
  } = useUIStore();

  const { data: tableSections = [] } = useGetTableSectionsQuery();
  const { saveAsUnsettled } = useBillingOperations();

  const [searchQuery, setSearchQuery] = useState('');
  const [showTransferModal, setShowTransferModal] = useState(false);
  const [showMergeModal, setShowMergeModal] = useState(false);
  const internalInputRef = useRef<HTMLInputElement>(null);
  const inputRef = searchInputRef || internalInputRef;

  const hasItems = cart.length > 0;
  const hasOccupiedTables = tableSections.some(s => s.tables.some(t => t.status === 'occupied'));

  // Filter tables based on search
  const filteredSections = useMemo(() => {
    if (!searchQuery.trim()) return tableSections;

    const query = searchQuery.toLowerCase();
    return tableSections
      .map(section => ({
        ...section,
        tables: section.tables.filter(table =>
          table.number.toLowerCase().includes(query)
        ),
      }))
      .filter(section => section.tables.length > 0);
  }, [tableSections, searchQuery]);

  // Find section_id for a table
  const findSectionForTable = (tableId: string): string | undefined => {
    for (const section of tableSections) {
      if (section.tables.find(t => t.id === tableId)) {
        return section.id;
      }
    }
    return undefined;
  };

  const handleTableClick = (table: DbTable) => {
    // Check if table has an active bill - set loadFromBill flag
    const hasActiveBill = !!table.current_bill_id;
    setSelectedTable(table, hasActiveBill);
    onTableSelect?.();
  };

  // Handle Enter key to select table by number
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      // Find exact match first, then partial match
      let matchedTable: DbTable | null = null;

      for (const section of tableSections) {
        const exactMatch = section.tables.find(t => t.number.toLowerCase() === query);
        if (exactMatch) {
          matchedTable = exactMatch;
          break;
        }
        if (!matchedTable) {
          const partialMatch = section.tables.find(t => t.number.toLowerCase().includes(query));
          if (partialMatch) matchedTable = partialMatch;
        }
      }

      if (matchedTable) {
        handleTableClick(matchedTable);
        setSearchQuery('');
      } else {
        toast.error(`Table "${searchQuery}" not found`);
      }
    }
  };

  const handleSaveUnsettled = async () => {
    if (!hasItems) {
      toast.error('Add items first');
      return;
    }

    await saveAsUnsettled();
  };

  return (
    <div className="flex flex-col h-full">
      {/* Scrollable content */}
      <div className="flex-1 overflow-y-auto scrollbar-thin space-y-4 pb-4">
        {/* Parcel Mode Toggle */}
        <div className="flex items-center gap-4 sticky top-0 bg-background z-10 pb-2">
          <Input
            ref={inputRef}
            placeholder='Search table... (Press Enter to select)'
            className='w-96 border-border'
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyDown={handleKeyDown}
          />
          <Button
            variant='outline'
            onClick={() => setParcelMode(true)}
            className={cn(
              "flex items-center gap-2 px-4 py-2 rounded-lg border-border transition-all font-medium",
              isParcelMode
                ? "border-accent bg-accent/20 text-accent"
                : "border-border bg-secondary hover:border-muted-foreground text-muted-foreground"
            )}
          >
            <Package className="h-4 w-4" />
            Parcel Order
          </Button>
          {isParcelMode && (
            <button
              onClick={() => setParcelMode(false)}
              className="text-sm text-muted-foreground hover:text-foreground underline"
            >
              Switch to Table
            </button>
          )}
        </div>

        {/* Table Sections */}
        {!isParcelMode && filteredSections.map((section) => (
          <div key={section.id}>
            <div className="section-header">
              <div className="h-[0.1px] flex-1 bg-border border-border" />
              <span>{section.name}</span>
              <div className="h-[0.1px] flex-1 bg-border" />
            </div>

            <div className="grid grid-cols-4 sm:grid-cols-6 lg:grid-cols-8 gap-3">
              {section.tables.map((table) => (
                <button
                  key={table.id}
                  onClick={() => handleTableClick(table)}
                  className={cn(
                    "table-btn min-h-[80px] relative",
                    table.status === 'available' && "table-btn-available",
                    table.status === 'occupied' && "table-btn-occupied",
                    table.status === 'reserved' && "table-btn-reserved",
                  )}
                >
                  {selectedTable?.id === table.id && (
                    <div className='absolute -top-2 -right-2 bg-accent text-accent-foreground p-2 rounded-full'>
                      <Check />
                    </div>
                  )}
                  <span className="text-lg font-bold">{table.number}</span>
                  <span className="text-[10px] opacity-70">{table.capacity} seats</span>
                  {table.current_amount && (
                    <span className="absolute -top-2 -right-2 bg-accent text-accent-foreground text-[10px] font-bold px-1.5 py-0.5 rounded-full">
                      ₹{table.current_amount}
                    </span>
                  )}
                </button>
              ))}
            </div>
          </div>
        ))}

        {/* Empty state when no tables match search */}
        {!isParcelMode && filteredSections.length === 0 && searchQuery && (
          <div className="text-center py-8 text-muted-foreground">
            <p>No tables found matching "{searchQuery}"</p>
          </div>
        )}

        {/* Legend */}
        <div className="flex items-center gap-6 text-xs text-muted-foreground pt-4 border-t border-border">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded bg-success/50" />
            <span>Available</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded bg-accent/50" />
            <span>Occupied</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded bg-blue-500/50" />
            <span>Reserved</span>
          </div>
        </div>
      </div>

      {/* Fixed Action Buttons at Bottom */}
      <div className="flex items-center gap-2 py-3 border-t border-border bg-background">
        <Button
          variant="outline"
          size="sm"
          className="gap-1.5"
          disabled={!hasOccupiedTables}
          onClick={() => setShowTransferModal(true)}
        >
          <ArrowRightLeft className="h-3.5 w-3.5" />
          Transfer
        </Button>
        <Button
          variant="outline"
          size="sm"
          className="gap-1.5"
          disabled={!hasOccupiedTables}
          onClick={() => setShowMergeModal(true)}
        >
          <Merge className="h-3.5 w-3.5" />
          Merge
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={handleSaveUnsettled}
          disabled={!hasItems}
          className="gap-1.5"
        >
          <Save className="h-3.5 w-3.5" />
          Unsettled
        </Button>
        <Button variant="outline" size="sm" disabled className="gap-1.5">
          <Eye className="h-3.5 w-3.5" />
          View
        </Button>
        <Button variant="outline" size="sm" disabled className="gap-1.5">
          <RotateCcw className="h-3.5 w-3.5" />
          Revert
        </Button>
      </div>

      {/* Modals */}
      <TransferTableModal
        isOpen={showTransferModal}
        onClose={() => setShowTransferModal(false)}
      />
      <MergeTableModal
        isOpen={showMergeModal}
        onClose={() => setShowMergeModal(false)}
      />
    </div>
  );
}