import { useBillingStore } from '@/store/billingStore';
import { Package, ArrowRightLeft, Merge, Save, Eye, RotateCcw } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { Input } from '../ui/input';

interface TableGridProps {
  onTableSelect?: () => void;
}

export function TableGrid({ onTableSelect }: TableGridProps) {
  const {
    tableSections,
    selectedTable,
    selectTable,
    isParcelMode,
    setParcelMode,
    cart,
    saveAsUnsettled
  } = useBillingStore();

  const hasItems = cart.length > 0;

  const handleTableClick = (table: typeof tableSections[0]['tables'][0]) => {
    selectTable(table);
    onTableSelect?.();
  };

  const handleSaveUnsettled = () => {
    if (!hasItems) {
      toast.error('Add items first');
      return;
    }

    saveAsUnsettled();
    toast.info('Bill saved as unsettled', {
      description: 'You can retrieve it from Bill History',
    });
  };

  return (
    <div className="flex flex-col h-full">
      {/* Scrollable content */}
      <div className="flex-1 overflow-y-auto scrollbar-thin space-y-4 pb-4">
        {/* Parcel Mode Toggle */}
        <div className="flex items-center gap-4 sticky top-0 bg-background z-10 pb-2">
          <Input placeholder='search table...' className='w-96 border-border' />
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
        {!isParcelMode && tableSections.map((section) => (
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
                    "table-btn min-h-[80px]",
                    table.status === 'available' && "table-btn-available",
                    table.status === 'occupied' && "table-btn-occupied",
                    table.status === 'reserved' && "table-btn-reserved",
                    selectedTable?.id === table.id && "ring-2 ring-ring ring-offset-2 ring-offset-background scale-105"
                  )}
                >
                  <span className="text-lg font-bold">{table.number}</span>
                  <span className="text-[10px] opacity-70">{table.capacity} seats</span>
                  {table.currentAmount && (
                    <span className="absolute -top-2 -right-2 bg-accent text-accent-foreground text-[10px]  font-bold px-1.5 py-0.5 rounded-full">
                      ₹{table.currentAmount}
                    </span>
                  )}
                </button>
              ))}
            </div>
          </div>
        ))}

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
      <div className="flex items-center gap-2 py-3 fixed bottom-0">
        <Button variant="outline" size="sm" disabled className="gap-1.5">
          <ArrowRightLeft className="h-3.5 w-3.5" />
          Transfer
        </Button>
        <Button variant="outline" size="sm" disabled className="gap-1.5">
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
    </div>
  );
}
