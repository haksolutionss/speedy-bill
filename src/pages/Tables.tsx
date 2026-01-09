import { useState } from 'react';
import { Plus, Edit2, Trash2, MapPin } from 'lucide-react';
import { useBillingStore } from '@/store/billingStore';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

export default function Tables() {
  const { tableSections } = useBillingStore();
  
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Tables & Locations</h1>
          <p className="text-muted-foreground">Manage your restaurant layout</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" className="gap-2">
            <Plus className="h-4 w-4" />
            Add Section
          </Button>
          <Button className="gap-2">
            <Plus className="h-4 w-4" />
            Add Table
          </Button>
        </div>
      </div>
      
      {/* Sections */}
      {tableSections.map(section => (
        <div key={section.id} className="border border-border rounded-lg overflow-hidden">
          <div className="bg-muted px-4 py-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <MapPin className="h-4 w-4 text-muted-foreground" />
              <h2 className="font-semibold">{section.name}</h2>
              <Badge variant="outline" className="ml-2">
                {section.tables.length} tables
              </Badge>
            </div>
            <div className="flex items-center gap-1">
              <Button variant="ghost" size="sm">Edit</Button>
              <Button variant="ghost" size="sm" className="text-destructive">Delete</Button>
            </div>
          </div>
          
          <div className="p-4">
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
              {section.tables.map(table => (
                <div
                  key={table.id}
                  className={cn(
                    "relative p-4 rounded-lg border-2 transition-colors",
                    table.status === 'available' && "border-success/30 bg-success/5",
                    table.status === 'occupied' && "border-accent/30 bg-accent/5",
                    table.status === 'reserved' && "border-blue-500/30 bg-blue-500/5"
                  )}
                >
                  <div className="text-center">
                    <p className="text-lg font-bold">{table.number}</p>
                    <p className="text-xs text-muted-foreground">{table.capacity} seats</p>
                    <Badge 
                      variant="outline" 
                      className={cn(
                        "mt-2 text-[10px]",
                        table.status === 'available' && "border-success/50 text-success",
                        table.status === 'occupied' && "border-accent/50 text-accent",
                        table.status === 'reserved' && "border-blue-500/50 text-blue-400"
                      )}
                    >
                      {table.status}
                    </Badge>
                  </div>
                  
                  <div className="absolute top-1 right-1 flex gap-0.5 opacity-0 hover:opacity-100 transition-opacity">
                    <Button variant="ghost" size="icon" className="h-6 w-6">
                      <Edit2 className="h-3 w-3" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-6 w-6 text-destructive">
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      ))}
      
      {/* Legend */}
      <div className="flex items-center gap-6 text-sm text-muted-foreground">
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
  );
}
