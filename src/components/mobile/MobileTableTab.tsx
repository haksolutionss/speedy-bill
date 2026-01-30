import { useState, useMemo } from 'react';
import { Search, Package, Users } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { useGetTableSectionsQuery } from '@/store/redux/api/billingApi';
import { useUIStore } from '@/store/uiStore';
import { cn } from '@/lib/utils';
import type { DbTable, DbTableSection } from '@/types/database';
import { sortTablesByNumber } from '@/utils/tableSorter';

interface MobileTableTabProps {
  onTableSelect: () => void;
}

export function MobileTableTab({ onTableSelect }: MobileTableTabProps) {
  const [search, setSearch] = useState('');
  const [activeSection, setActiveSection] = useState<string | null>(null);

  const { data: tableSections = [], isLoading } = useGetTableSectionsQuery();
  const { selectedTable, setSelectedTable, setParcelMode, isParcelMode } = useUIStore();

  // Get all tables across sections
  const allTables = useMemo(() => {
    return tableSections.flatMap((section) => 
      section.tables.map((table) => ({ ...table, sectionName: section.name }))
    );
  }, [tableSections]);

  // Filter tables by search and section
  const filteredTables = useMemo(() => {
    let tables = allTables;

    if (activeSection) {
      tables = tables.filter((t) => {
        const section = tableSections.find((s) => s.id === t.section_id);
        return section?.id === activeSection;
      });
    }

    if (search.trim()) {
      const q = search.toLowerCase();
      tables = tables.filter((t) => 
        t.number.toLowerCase().includes(q)
      );
    }

    return tables.sort(sortTablesByNumber);
  }, [allTables, activeSection, search, tableSections]);

  const handleTableSelect = (table: DbTable) => {
    setSelectedTable(table);
    onTableSelect();
  };

  const handleParcelMode = () => {
    setParcelMode(true);
    onTableSelect();
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

      {/* Parcel/Takeaway Button */}
      <div className="p-4 pb-0 shrink-0">
        <Button
          variant={isParcelMode ? "default" : "outline"}
          className={cn(
            "w-full h-14 text-base gap-3",
            isParcelMode && "bg-accent text-accent-foreground"
          )}
          onClick={handleParcelMode}
        >
          <Package className="h-5 w-5" />
          Parcel / Takeaway
        </Button>
      </div>

      {/* Table Grid */}
      <div className="flex-1 overflow-y-auto p-4">
        {filteredTables.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
            <Users className="h-12 w-12 mb-3 opacity-50" />
            <p className="text-sm">No tables found</p>
          </div>
        ) : (
          <div className="grid grid-cols-3 gap-3">
            {filteredTables.map((table) => {
              const isSelected = selectedTable?.id === table.id;
              const isOccupied = table.status === 'occupied';

              return (
                <button
                  key={table.id}
                  onClick={() => handleTableSelect(table)}
                  className={cn(
                    "aspect-square rounded-xl border-2 flex flex-col items-center justify-center gap-1 transition-all active:scale-95",
                    isSelected 
                      ? "border-primary bg-primary/10 text-primary" 
                      : isOccupied
                        ? "border-success/50 bg-success/10 text-success"
                        : "border-border bg-card hover:border-primary/50"
                  )}
                >
                  <span className="text-2xl font-bold">{table.number}</span>
                  <span className="text-xs text-muted-foreground">
                    {table.capacity} seats
                  </span>
                  {isOccupied && table.current_amount && (
                    <span className="text-xs font-medium text-success">
                      ₹{table.current_amount}
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
