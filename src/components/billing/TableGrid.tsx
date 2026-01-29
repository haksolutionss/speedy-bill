import { useUIStore } from '@/store/uiStore';
import { useGetTableSectionsQuery, useUpdateTableMutation, useUpdateBillMutation } from '@/store/redux/api/billingApi';
import { Package, ArrowRightLeft, Merge, Save, Eye, RotateCcw, Check } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { Input } from '../ui/input';
import { useState, useMemo, useRef, useCallback, useEffect } from 'react';
import type { DbTable } from '@/types/database';
import { TransferTableModal } from './TransferTableModal';
import { MergeTableModal } from './MergeTableModal';
import { useBillingOperations } from '@/hooks/useBillingOperations';
import { useCartSync } from '@/hooks/useCartSync';
import { sortTablesByNumber } from '@/utils/tableSorter';

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
  const { syncBeforeTableChange } = useCartSync();

  const [searchQuery, setSearchQuery] = useState('');
  const [showTransferModal, setShowTransferModal] = useState(false);
  const [showMergeModal, setShowMergeModal] = useState(false);
  const [focusedTableId, setFocusedTableId] = useState<string | null>(null);

  const internalInputRef = useRef<HTMLInputElement>(null);
  const inputRef = searchInputRef || internalInputRef;
  const tableButtonRefs = useRef<Map<string, HTMLButtonElement>>(new Map());
  const gridContainerRef = useRef<HTMLDivElement>(null);

  const hasItems = cart.length > 0;
  const hasOccupiedTables = tableSections.some(s => s.tables.some(t => t.status === 'occupied'));

  const filteredSections = useMemo(() => {
    if (!searchQuery.trim()) {
      return tableSections.map(section => ({
        ...section,
        tables: [...section.tables].sort(sortTablesByNumber),
      }));
    }

    const query = searchQuery.toLowerCase();

    return tableSections
      .map(section => ({
        ...section,
        tables: section.tables
          .filter(table => table.number.toLowerCase().includes(query))
          .sort(sortTablesByNumber),
      }))
      .filter(section => section.tables.length > 0);
  }, [tableSections, searchQuery]);


  const allTables = useMemo(() => {
    return filteredSections.flatMap(section => section.tables);
  }, [filteredSections]);

  // Get grid dimensions for navigation
  const getGridColumns = useCallback(() => {
    // Match the grid: grid-cols-4 sm:grid-cols-6 lg:grid-cols-8
    if (typeof window !== 'undefined') {
      if (window.innerWidth >= 1024) return 8;
      if (window.innerWidth >= 640) return 6;
    }
    return 4;
  }, []);

  const handleTableClick = async (table: DbTable) => {
    // Sync current cart before switching tables
    await syncBeforeTableChange();

    setSelectedTable(table);
    setFocusedTableId(table.id);
    onTableSelect?.();
  };

  // Keyboard navigation for table grid
  const handleGridKeyDown = useCallback((e: KeyboardEvent) => {
    // Only handle if not in an input and not in parcel mode
    if (
      e.target instanceof HTMLInputElement ||
      e.target instanceof HTMLTextAreaElement ||
      isParcelMode
    ) {
      return;
    }

    const cols = getGridColumns();
    const currentIndex = focusedTableId
      ? allTables.findIndex(t => t.id === focusedTableId)
      : -1;

    let newIndex = currentIndex;

    switch (e.key) {
      case 'ArrowRight':
        e.preventDefault();
        newIndex = currentIndex < allTables.length - 1 ? currentIndex + 1 : currentIndex;
        break;
      case 'ArrowLeft':
        e.preventDefault();
        newIndex = currentIndex > 0 ? currentIndex - 1 : currentIndex;
        break;
      case 'ArrowDown':
        e.preventDefault();
        newIndex = currentIndex + cols < allTables.length ? currentIndex + cols : currentIndex;
        break;
      case 'ArrowUp':
        e.preventDefault();
        newIndex = currentIndex - cols >= 0 ? currentIndex - cols : currentIndex;
        break;
      case 'Enter':
        e.preventDefault();
        if (focusedTableId) {
          const table = allTables.find(t => t.id === focusedTableId);
          if (table) handleTableClick(table);
        }
        return;
      case 'Escape':
        e.preventDefault();
        setFocusedTableId(null);
        inputRef.current?.focus();
        return;
      default:
        return;
    }

    if (newIndex !== currentIndex && newIndex >= 0 && newIndex < allTables.length) {
      const newTable = allTables[newIndex];
      setFocusedTableId(newTable.id);
      tableButtonRefs.current.get(newTable.id)?.focus();
    }
  }, [focusedTableId, allTables, getGridColumns, isParcelMode, inputRef]);

  // Attach keyboard listener
  useEffect(() => {
    window.addEventListener('keydown', handleGridKeyDown);
    return () => window.removeEventListener('keydown', handleGridKeyDown);
  }, [handleGridKeyDown]);

  // Focus first table when arrow key is pressed and no table is focused
  useEffect(() => {
    if (!focusedTableId && allTables.length > 0) {
      // Will be set on first arrow key press via handleGridKeyDown
    }
  }, [focusedTableId, allTables]);

  // Handle Enter key to select table by number from search
  const handleInputKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
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
    } else if (e.key === 'ArrowDown' && allTables.length > 0) {
      e.preventDefault();
      const firstTable = allTables[0];
      setFocusedTableId(firstTable.id);
      tableButtonRefs.current.get(firstTable.id)?.focus();
    }
  };

  const handleSaveUnsettled = async () => {
    if (!hasItems) {
      toast.error('Add items first');
      return;
    }

    await saveAsUnsettled();
  };

  // Store ref for each table button
  const setTableRef = useCallback((id: string, el: HTMLButtonElement | null) => {
    if (el) {
      tableButtonRefs.current.set(id, el);
    } else {
      tableButtonRefs.current.delete(id);
    }
  }, []);

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Scrollable content */}
      <div className="flex-1 overflow-y-auto scrollbar-thin px-4" ref={gridContainerRef}>
        <div className="space-y-4 pb-4">
          <div className="flex items-center gap-4 sticky top-0 bg-background z-10 py-2">
            <Input
              ref={inputRef}
              placeholder='Search table... (Press Enter to select)'
              className='w-96 border-border'
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={handleInputKeyDown}
            />
          </div>

          {/* Table Sections */}
          {!isParcelMode && filteredSections.map((section) => (
            <div key={section.id}>
              <div className="section-header">
                <div className="h-[0.1px] flex-1 bg-border border-border" />
                <span>{section.name}</span>
                <div className="h-[0.1px] flex-1 bg-border" />
              </div>

              <div className="grid grid-cols-[repeat(auto-fill,minmax(90px,1fr))] sm:grid-cols-[repeat(auto-fill,minmax(100px,1fr))] lg:grid-cols-[repeat(auto-fill,minmax(110px,1fr))] gap-3 m-2">
                {section.tables.map((table) => (
                  <button
                    key={table.id}
                    ref={(el) => setTableRef(table.id, el)}
                    onClick={() => handleTableClick(table)}
                    onFocus={() => setFocusedTableId(table.id)}
                    className={cn(
                      "table-btn min-h-[80px] w-full relative",
                      table.status === 'available' && "table-btn-available",
                      table.status === 'occupied' && "table-btn-occupied",
                      table.status === 'reserved' && "table-btn-reserved",
                      focusedTableId === table.id && "table-btn-focused",
                    )}
                  >
                    {selectedTable?.id === table.id && (
                      <div className="absolute -top-2 -right-2 bg-background border-2 border-accent text-accent p-1.5 rounded-full shadow-md">
                        <Check className="h-4 w-4" />
                      </div>
                    )}

                    <span className="text-lg font-bold">{table.number}</span>
                    <span className="text-[10px] opacity-70">{table.capacity} seats</span>

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
        </div>
      </div>

      {/* Fixed Action Buttons at Bottom */}
      <div className="flex-shrink-0 flex items-center gap-2 px-4 py-3 border-t border-border bg-background action-buttons-row">
        <Button
          variant="outline"
          size="sm"
          className="gap-1.5 focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2"
          disabled={!hasOccupiedTables}
          onClick={() => setShowTransferModal(true)}
        >
          <ArrowRightLeft className="h-3.5 w-3.5" />
          Transfer
        </Button>
        <Button
          variant="outline"
          size="sm"
          className="gap-1.5 focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2"
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
          className="gap-1.5 focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2"
        >
          <Save className="h-3.5 w-3.5" />
          Unsettled
        </Button>
        <Button
          variant="outline"
          size="sm"
          disabled
          className="gap-1.5 focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2"
        >
          <Eye className="h-3.5 w-3.5" />
          View
        </Button>
        <Button
          variant="outline"
          size="sm"
          disabled
          className="gap-1.5 focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2"
        >
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