import { useState, useMemo, useEffect } from 'react';
import { Search, Package, Users } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { useGetTableSectionsQuery } from '@/store/redux/api/billingApi';
import { useUIStore } from '@/store/uiStore';
import { useCartSync } from '@/hooks/useCartSync';
import { supabase } from '@/integrations/supabase/client';
import { cn } from '@/lib/utils';
import type { DbTable, DbTableSection } from '@/types/database';
import { sortTablesByNumber } from '@/utils/tableSorter';

interface MobileTableTabProps {
  onTableSelect: () => void;
}

export function MobileTableTab({ onTableSelect }: MobileTableTabProps) {
  const [search, setSearch] = useState('');
  const [activeSection, setActiveSection] = useState<string | null>(null);
  const [tableCartCounts, setTableCartCounts] = useState<Record<string, number>>({});

  const { data: tableSections = [], isLoading, refetch } = useGetTableSectionsQuery();
  const { selectedTable, setSelectedTable, setParcelMode, isParcelMode } = useUIStore();
  const { syncBeforeTableChange } = useCartSync();

  // Fetch cart item counts for all tables to determine active state
  useEffect(() => {
    const fetchCartCounts = async () => {
      const { data, error } = await supabase
        .from('cart_items')
        .select('table_id');

      if (!error && data) {
        const counts: Record<string, number> = {};
        data.forEach((item) => {
          counts[item.table_id] = (counts[item.table_id] || 0) + 1;
        });
        setTableCartCounts(counts);
      }
    };

    fetchCartCounts();

    // Subscribe to cart_items changes for real-time sync
    const channel = supabase
      .channel('cart_items_sync')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'cart_items' },
        () => {
          fetchCartCounts();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);


  const filteredTables = useMemo(() => {
    let sections = tableSections;

    if (activeSection) {
      sections = sections.filter(s => s.id === activeSection);
    }

    return sections.flatMap(section =>
      [...section.tables].sort(sortTablesByNumber)
    );
  }, [tableSections, activeSection, search]);




  const handleTableSelect = async (table: DbTable) => {
    // Sync current cart before switching
    await syncBeforeTableChange();
    setSelectedTable(table);
    onTableSelect();
  };

  const handleParcelMode = async () => {
    await syncBeforeTableChange();
    setParcelMode(true);
    onTableSelect();
  };

  // Determine table status for display
  const getTableStatus = (table: DbTable) => {
    // Check for 'active' status (KOT printed)
    if (table.status === 'active') return 'active';
    // Check for 'occupied' status (items in cart but no KOT)
    if (table.status === 'occupied' ||
        table.current_bill_id !== null ||
        (tableCartCounts[table.id] || 0) > 0) {
      return 'occupied';
    }
    return 'available';
  };

  if (isLoading) {
    return (
      <div className="flex-1 p-4 space-y-4">
        <div className="h-10 bg-muted animate-pulse rounded-lg" />
        <div className="flex gap-2 overflow-x-auto">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-9 w-24 bg-muted animate-pulse rounded-full shrink-0" />
          ))}
        </div>
        <div className="grid grid-cols-3 gap-3">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="aspect-square bg-muted animate-pulse rounded-xl" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col min-h-0">
      {/* Header */}
      <div className="p-4 border-b border-border space-y-3 shrink-0">
        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search tables..."
            className="pl-10 h-11"
          />
        </div>

        {/* Section Tabs */}
        <div className="flex gap-2 overflow-x-auto scrollbar-none pb-1">
          <Button
            variant={activeSection === null ? "default" : "outline"}
            size="sm"
            onClick={() => setActiveSection(null)}
            className="shrink-0 h-9"
          >
            All
          </Button>
          {tableSections.map((section) => (
            <Button
              key={section.id}
              variant={activeSection === section.id ? "default" : "outline"}
              size="sm"
              onClick={() => setActiveSection(section.id)}
              className="shrink-0 h-9"
            >
              {section.name}
            </Button>
          ))}
        </div>
      </div>

      {/* Table Grid */}
      <div className="flex-1 overflow-y-auto p-4 pb-20">
        {filteredTables.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
            <Users className="h-12 w-12 mb-3 opacity-50" />
            <p className="text-sm">No tables found</p>
          </div>
        ) : (
          <div className="grid grid-cols-3 gap-3">
            {filteredTables.map((table) => {
              const isSelected = selectedTable?.id === table.id;
              const tableStatus = getTableStatus(table);
              const cartCount = tableCartCounts[table.id] || 0;

              return (
                <button
                  key={table.id}
                  onClick={() => handleTableSelect(table)}
                  className={cn(
                    "aspect-square rounded-xl border-2 flex flex-col items-center justify-center gap-1 transition-all active:scale-95",
                    isSelected
                      ? "border-primary bg-primary/10 text-primary"
                      : tableStatus === 'active'
                        ? "border-warning/50 bg-warning/10 text-warning"
                        : tableStatus === 'occupied'
                          ? "border-success/50 bg-success/10 text-success"
                          : "border-border bg-card hover:border-primary/50"
                  )}
                >
                  <span className="text-2xl font-bold">{table.number}</span>
                  <span className="text-xs text-muted-foreground">
                    {table.capacity} seats
                  </span>
                  {tableStatus !== 'available' && (
                    <span className={cn(
                      "text-xs font-medium",
                      tableStatus === 'active' ? "text-warning" : "text-success"
                    )}>
                      {table.current_amount
                        ? `₹${table.current_amount}`
                        : tableStatus === 'active'
                          ? 'In Kitchen'
                          : cartCount > 0
                            ? `${cartCount} items`
                            : 'Occupied'}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
