import { useState, useMemo } from 'react';
import { Plus, Edit2, Trash2, MapPin, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import ResponsiveModal from '@/components/ui/responsive-modal';
import { ConfirmDialog } from '@/components/common/ConfirmDialog';
import { SectionForm, SectionFormData } from '@/components/tables/SectionForm';
import { TableForm, TableFormData } from '@/components/tables/TableForm';
import { ErrorBoundary } from '@/components/common/ErrorBoundary';
import { QueryErrorHandler } from '@/components/common/QueryErrorHandler';
import { TableGridSkeleton } from '@/components/common/skeletons';
import { EmptyState } from '@/components/common/EmptyState';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import type { DbTable, DbTableSection, TableSectionWithTables } from '@/types/database';
import {
  useGetTableSectionsQuery,
  useCreateTableSectionMutation,
  useUpdateTableSectionMutation,
  useDeleteTableSectionMutation,
  useCreateTableMutation,
  useUpdateTableMutation,
  useDeleteTableMutation,
} from '@/store/redux/api/billingApi';
import { sortTablesByNumber } from '@/utils/tableSorter';

export default function Tables() {
  const [searchQuery, setSearchQuery] = useState('');

  // Modal states
  const [isSectionModalOpen, setIsSectionModalOpen] = useState(false);
  const [isTableModalOpen, setIsTableModalOpen] = useState(false);
  const [editingSection, setEditingSection] = useState<DbTableSection | null>(null);
  const [editingTable, setEditingTable] = useState<DbTable | null>(null);

  // Delete confirmation states
  const [deleteSectionId, setDeleteSectionId] = useState<string | null>(null);
  const [deleteTableId, setDeleteTableId] = useState<string | null>(null);

  // RTK Query hooks
  const { data: tableSections = [], isLoading, error, refetch } = useGetTableSectionsQuery();

  // Mutations
  const [createSection, { isLoading: isCreatingSection }] = useCreateTableSectionMutation();
  const [updateSection, { isLoading: isUpdatingSection }] = useUpdateTableSectionMutation();
  const [deleteSection, { isLoading: isDeletingSection }] = useDeleteTableSectionMutation();
  const [createTable, { isLoading: isCreatingTable }] = useCreateTableMutation();
  const [updateTable, { isLoading: isUpdatingTable }] = useUpdateTableMutation();
  const [deleteTable, { isLoading: isDeletingTable }] = useDeleteTableMutation();

  // Get flat list of sections for table form
  const flatSections = useMemo(() => {
    return tableSections.map((s) => ({
      id: s.id,
      name: s.name,
      display_order: s.display_order,
      is_active: s.is_active,
      created_at: s.created_at,
      updated_at: s.updated_at,
    }));
  }, [tableSections]);

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
      .filter(
        section =>
          section.tables.length > 0 ||
          section.name.toLowerCase().includes(query)
      );
  }, [tableSections, searchQuery]);

  // Handlers
  const handleSectionSubmit = async (data: SectionFormData) => {
    try {
      if (editingSection) {
        await updateSection({
          id: editingSection.id,
          updates: data,
        }).unwrap();
      } else {
        await createSection({ name: data.name, display_order: data.display_order }).unwrap();
      }
      setIsSectionModalOpen(false);
      setEditingSection(null);
    } catch (error: any) {
      toast.error(error?.message || 'Failed to save section');
    }
  };

  const handleTableSubmit = async (data: TableFormData) => {
    try {
      if (editingTable) {
        await updateTable({
          id: editingTable.id,
          updates: {
            number: data.number,
            section_id: data.section_id,
            capacity: data.capacity,
            status: data.status,
          },
        }).unwrap();
      } else {
        await createTable({
          number: data.number,
          section_id: data.section_id,
          capacity: data.capacity,
          status: data.status,
        }).unwrap();
      }
      setIsTableModalOpen(false);
      setEditingTable(null);
    } catch (error: any) {
      console.log(error)
      toast.error(error?.message || 'Failed to save table');
    }
  };

  const handleDeleteSection = async () => {
    if (!deleteSectionId) return;
    try {
      await deleteSection(deleteSectionId).unwrap();
      setDeleteSectionId(null);
    } catch (error: any) {
      toast.error(error?.message || 'Failed to delete section');
    }
  };

  const handleDeleteTable = async () => {
    if (!deleteTableId) return;
    try {
      await deleteTable(deleteTableId).unwrap();
      setDeleteTableId(null);
    } catch (error: any) {
      toast.error(error?.message || 'Failed to delete table');
    }
  };

  const openEditSection = (section: DbTableSection) => {
    setEditingSection(section);
    setIsSectionModalOpen(true);
  };

  const openEditTable = (table: DbTable) => {
    setEditingTable(table);
    setIsTableModalOpen(true);
  };

  if (error) {
    return <QueryErrorHandler error={error} onRetry={refetch} />;
  }

  return (
    <ErrorBoundary>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col gap-4">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold">Tables & Sections</h1>
              <p className="text-muted-foreground">Manage your restaurant layout</p>
            </div>
            <div className="flex items-center gap-2 w-full sm:w-auto">
              <Button
                variant="outline"
                onClick={() => {
                  setEditingSection(null);
                  setIsSectionModalOpen(true);
                }}
                className="gap-2 flex-1 sm:flex-none"
              >
                <Plus className="h-4 w-4" />
                <span className="hidden sm:inline">Add Section</span>
                <span className="sm:hidden">Section</span>
              </Button>
              <Button
                onClick={() => {
                  setEditingTable(null);
                  setIsTableModalOpen(true);
                }}
                className="gap-2 flex-1 sm:flex-none"
                disabled={flatSections.length === 0}
              >
                <Plus className="h-4 w-4" />
                <span className="hidden sm:inline">Add Table</span>
                <span className="sm:hidden">Table</span>
              </Button>
            </div>
          </div>

          {/* Search */}
          <div className="relative w-full sm:max-w-xs">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search tables..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 border-border"
            />
          </div>
        </div>

        {isLoading ? (
          <TableGridSkeleton />
        ) : filteredSections.length === 0 && !searchQuery ? (
          <EmptyState
            icon={MapPin}
            title="No sections yet"
            description="Create sections to organize your tables"
            action={
              <Button onClick={() => setIsSectionModalOpen(true)} className="gap-2">
                <Plus className="h-4 w-4" />
                Add Section
              </Button>
            }
          />
        ) : filteredSections.length === 0 && searchQuery ? (
          <EmptyState
            icon={Search}
            title="No results found"
            description={`No tables matching "${searchQuery}"`}
          />
        ) : (
          <>
            {/* Sections */}
            {filteredSections.map((section) => (
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
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => openEditSection(section)}
                    >
                      <Edit2 className="h-4 w-4 mr-1" />
                      Edit
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-destructive hover:text-destructive"
                      onClick={() => setDeleteSectionId(section.id)}
                    >
                      <Trash2 className="h-4 w-4 mr-1" />
                      Delete
                    </Button>
                  </div>
                </div>

                <div className="p-4">
                  {section.tables.length === 0 ? (
                    <p className="text-center text-muted-foreground py-4">
                      No tables in this section
                    </p>
                  ) : (
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
                      {section.tables.map((table) => (
                        <div
                          key={table.id}
                          className={cn(
                            'group relative p-4 rounded-lg border-2 transition-colors',
                            table.status === 'available' && 'border-success/30 bg-success/5',
                            (table.status === 'occupied' || table.status === 'active') && 'border-accent/30 bg-accent/5',
                            table.status === 'reserved' && 'border-blue-500/30 bg-blue-500/5',
                            table.status === 'maintenance' && 'border-muted-foreground/30 bg-muted'
                          )}
                        >
                          <div className="text-center">
                            <p className="text-lg font-bold">{table.number}</p>
                            <p className="text-xs text-muted-foreground">{table.capacity} seats</p>
                            <Badge
                              variant="outline"
                              className={cn(
                                'mt-2 text-[10px]',
                                table.status === 'available' && 'border-success/50 text-success',
                                (table.status === 'occupied' || table.status === 'active') && 'border-accent/50 text-accent',
                                table.status === 'reserved' && 'border-blue-500/50 text-blue-400',
                                table.status === 'maintenance' && 'border-muted-foreground/50 text-muted-foreground'
                              )}
                            >
                              {table.status}
                            </Badge>
                          </div>

                          <div className="absolute top-1 right-1 flex gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-6 w-6"
                              onClick={() => openEditTable(table)}
                            >
                              <Edit2 className="h-3 w-3" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-6 w-6 text-destructive hover:text-destructive"
                              onClick={() => setDeleteTableId(table.id)}
                            >
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ))}

            {/* Legend */}
            <div className="flex items-center gap-4 sm:gap-6 text-sm text-muted-foreground flex-wrap">
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
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded bg-muted-foreground/50" />
                <span>Maintenance</span>
              </div>
            </div>
          </>
        )}

        {/* Section Modal */}
        <ResponsiveModal
          isOpen={isSectionModalOpen}
          onClose={() => {
            setIsSectionModalOpen(false);
            setEditingSection(null);
          }}
          title={editingSection ? 'Edit Section' : 'Add Section'}
        >
          <SectionForm
            initialData={editingSection}
            onSubmit={handleSectionSubmit}
            isLoading={isCreatingSection || isUpdatingSection}
          />
        </ResponsiveModal>

        {/* Table Modal */}
        <ResponsiveModal
          isOpen={isTableModalOpen}
          onClose={() => {
            setIsTableModalOpen(false);
            setEditingTable(null);
          }}
          title={editingTable ? 'Edit Table' : 'Add Table'}
        >
          <TableForm
            sections={flatSections}
            initialData={editingTable}
            onSubmit={handleTableSubmit}
            isLoading={isCreatingTable || isUpdatingTable}
          />
        </ResponsiveModal>

        {/* Delete Section Confirmation */}
        <ConfirmDialog
          isOpen={!!deleteSectionId}
          onClose={() => setDeleteSectionId(null)}
          onConfirm={handleDeleteSection}
          title="Delete Section"
          description="Are you sure you want to delete this section? All tables in this section will also be removed."
          confirmText="Delete"
          variant="destructive"
          isLoading={isDeletingSection}
        />

        {/* Delete Table Confirmation */}
        <ConfirmDialog
          isOpen={!!deleteTableId}
          onClose={() => setDeleteTableId(null)}
          onConfirm={handleDeleteTable}
          title="Delete Table"
          description="Are you sure you want to delete this table? This action can be undone by an administrator."
          confirmText="Delete"
          variant="destructive"
          isLoading={isDeletingTable}
        />
      </div>
    </ErrorBoundary>
  );
}
