import { useState } from 'react';
import { Package, Search } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { useUIStore } from '@/store/uiStore';
import { cn } from '@/lib/utils';
import type { TableSectionWithTables, DbTable } from '@/types/database';

interface MobileTablesViewProps {
  tableSections: TableSectionWithTables[];
  isLoading: boolean;
  onTableSelect: () => void;
}

export function MobileTablesView({ tableSections, isLoading, onTableSelect }: MobileTablesViewProps) {
  const [search, setSearch] = useState('');
  const [activeSection, setActiveSection] = useState<string | null>(null);
  const { selectedTable, setSelectedTable, setParcelMode } = useUIStore();

  const handleSelectTable = (table: DbTable) => {
    setSelectedTable(table);
    onTableSelect();
  };

  const handleParcelMode = () => {
    setParcelMode(true);
    onTableSelect();
  };

  // Filter tables by search
  const filteredSections = tableSections.map(section => ({
    ...section,
    tables: section.tables.filter(table => 
      table.number.toLowerCase().includes(search.toLowerCase())
    ),
  })).filter(section => section.tables.length > 0 || !search);

  if (isLoading) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="animate-pulse text-muted-foreground">Loading tables...</div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      {/* Search & Parcel Button */}
      <div className="p-3 border-b border-border space-y-2">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search tables..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10"
          />
        </div>
        <Button
          variant="outline"
          className="w-full gap-2"
          onClick={handleParcelMode}
        >
          <Package className="h-4 w-4" />
          Start Parcel Order
        </Button>
      </div>

      {/* Section Tabs */}
      <div className="shrink-0 border-b border-border overflow-x-auto">
        <div className="flex px-2 py-2 gap-2 min-w-max">
          <button
            onClick={() => setActiveSection(null)}
            className={cn(
              "px-3 py-1.5 rounded-full text-sm font-medium transition-colors whitespace-nowrap",
              activeSection === null
                ? "bg-primary text-primary-foreground"
                : "bg-muted text-muted-foreground hover:bg-muted/80"
            )}
          >
            All
          </button>
          {tableSections.map(section => (
            <button
              key={section.id}
              onClick={() => setActiveSection(section.id)}
              className={cn(
                "px-3 py-1.5 rounded-full text-sm font-medium transition-colors whitespace-nowrap",
                activeSection === section.id
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-muted-foreground hover:bg-muted/80"
              )}
            >
              {section.name}
            </button>
          ))}
        </div>
      </div>

      {/* Tables Grid */}
      <div className="flex-1 overflow-y-auto p-3">
        {filteredSections
          .filter(section => !activeSection || section.id === activeSection)
          .map(section => (
            <div key={section.id} className="mb-4">
              <h3 className="text-xs font-semibold text-muted-foreground uppercase mb-2">
                {section.name}
              </h3>
              <div className="grid grid-cols-4 gap-2">
                {section.tables.map(table => {
                  const isOccupied = table.status === 'occupied';
                  const isSelected = selectedTable?.id === table.id;
                  
                  return (
                    <button
                      key={table.id}
                      onClick={() => handleSelectTable(table)}
                      className={cn(
                        "aspect-square rounded-lg border-2 flex flex-col items-center justify-center transition-all",
                        isSelected && "border-primary ring-2 ring-primary/30",
                        isOccupied && !isSelected && "border-warning bg-warning/10",
                        !isOccupied && !isSelected && "border-border bg-card hover:border-primary/50"
                      )}
                    >
                      <span className={cn(
                        "text-sm font-bold",
                        isSelected && "text-primary",
                        isOccupied && !isSelected && "text-warning"
                      )}>
                        {table.number}
                      </span>
                      {isOccupied && table.current_amount && (
                        <span className="text-[10px] text-muted-foreground">
                          ₹{table.current_amount}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          ))
        }
      </div>
    </div>
  );
}
