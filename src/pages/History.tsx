import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import { Search, Eye, RotateCcw, Printer, Trash2, Receipt, ChevronLeft, ChevronRight } from 'lucide-react';
import { useGetBillsQuery, useUpdateBillMutation, useUpdateTableMutation } from '@/store/redux/api/billingApi';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { BillHistorySkeleton } from '@/components/common/skeletons/BillHistorySkeleton';
import { QueryErrorHandler } from '@/components/common/QueryErrorHandler';
import { toast } from 'sonner';
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
  PaginationEllipsis,
} from '@/components/ui/pagination';

const ITEMS_PER_PAGE = 20;

export default function History() {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'settled' | 'unsettled' | 'active'>('all');
  const [typeFilter, setTypeFilter] = useState<'all' | 'table' | 'parcel'>('all');
  const [currentPage, setCurrentPage] = useState(1);

  // Use RTK Query to fetch bills from Supabase
  const {
    data: bills = [],
    isLoading,
    error,
    refetch,
    isFetching
  } = useGetBillsQuery({ limit: 500 });

  const [updateBill] = useUpdateBillMutation();
  const [updateTable] = useUpdateTableMutation();

  // Filter bills based on search and filters
  const filteredBills = bills
    .filter(bill => {
      const matchesSearch =
        bill.bill_number?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        bill.table_number?.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesStatus = statusFilter === 'all' || bill.status === statusFilter;
      const matchesType = typeFilter === 'all' || bill.type === typeFilter;
      return matchesSearch && matchesStatus && matchesType;
    })
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

  // Pagination
  const totalPages = Math.ceil(filteredBills.length / ITEMS_PER_PAGE);
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const paginatedBills = filteredBills.slice(startIndex, startIndex + ITEMS_PER_PAGE);

  // Reset to page 1 when filters change
  const handleFilterChange = (type: 'status' | 'type', value: string) => {
    setCurrentPage(1);
    if (type === 'status') {
      setStatusFilter(value as 'all' | 'settled' | 'unsettled' | 'active');
    } else {
      setTypeFilter(value as 'all' | 'table' | 'parcel');
    }
  };

  const handleSearchChange = (value: string) => {
    setCurrentPage(1);
    setSearchQuery(value);
  };

  // Revert bill to unsettled
  const handleRevertBill = async (billId: string, tableId?: string | null) => {
    try {
      await updateBill({
        id: billId,
        updates: {
          status: 'unsettled',
          payment_method: null,
          settled_at: null,
        },
      }).unwrap();

      // If this was a table bill, mark table as occupied
      if (tableId) {
        await updateTable({
          id: tableId,
          updates: {
            status: 'occupied',
            current_bill_id: billId,
          },
        }).unwrap();
      }

      toast.success('Bill reverted to unsettled');
    } catch (error) {
      console.error('Error reverting bill:', error);
      toast.error('Failed to revert bill');
    }
  };

  // Delete bill (soft delete by marking as deleted)
  const handleDeleteBill = async (billId: string) => {
    try {
      // For now, we'll just update status. In future, could add is_deleted flag
      await updateBill({
        id: billId,
        updates: {
          status: 'deleted',
        },
      }).unwrap();

      toast.success('Bill deleted');
    } catch (error) {
      console.error('Error deleting bill:', error);
      toast.error('Failed to delete bill');
    }
  };

  // Generate pagination items
  const getPaginationItems = () => {
    const items = [];
    const maxVisiblePages = 5;

    if (totalPages <= maxVisiblePages) {
      for (let i = 1; i <= totalPages; i++) {
        items.push(i);
      }
    } else {
      if (currentPage <= 3) {
        items.push(1, 2, 3, 4, 'ellipsis', totalPages);
      } else if (currentPage >= totalPages - 2) {
        items.push(1, 'ellipsis', totalPages - 3, totalPages - 2, totalPages - 1, totalPages);
      } else {
        items.push(1, 'ellipsis', currentPage - 1, currentPage, currentPage + 1, 'ellipsis', totalPages);
      }
    }

    return items;
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <BillHistorySkeleton />
      </div>
    );
  }

  if (error) {
    return <QueryErrorHandler error={error} onRetry={refetch} />;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Bill History</h1>
          <p className="text-muted-foreground">
            View and manage past bills
            {filteredBills.length > 0 && (
              <span className="ml-2 text-sm">
                ({filteredBills.length} bill{filteredBills.length !== 1 ? 's' : ''})
              </span>
            )}
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={() => refetch()} disabled={isFetching}>
          {isFetching ? 'Refreshing...' : 'Refresh'}
        </Button>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-4 flex-wrap">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by bill number or table..."
            value={searchQuery}
            onChange={(e) => handleSearchChange(e.target.value)}
            className="pl-10"
          />
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant={statusFilter === 'all' ? "secondary" : "ghost"}
            size="sm"
            onClick={() => handleFilterChange('status', 'all')}
          >
            All
          </Button>
          <Button
            variant={statusFilter === 'active' ? "secondary" : "ghost"}
            size="sm"
            onClick={() => handleFilterChange('status', 'active')}
          >
            Active
          </Button>
          <Button
            variant={statusFilter === 'settled' ? "secondary" : "ghost"}
            size="sm"
            onClick={() => handleFilterChange('status', 'settled')}
          >
            Settled
          </Button>
          <Button
            variant={statusFilter === 'unsettled' ? "secondary" : "ghost"}
            size="sm"
            onClick={() => handleFilterChange('status', 'unsettled')}
          >
            Unsettled
          </Button>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant={typeFilter === 'all' ? "secondary" : "ghost"}
            size="sm"
            onClick={() => handleFilterChange('type', 'all')}
          >
            All Types
          </Button>
          <Button
            variant={typeFilter === 'table' ? "secondary" : "ghost"}
            size="sm"
            onClick={() => handleFilterChange('type', 'table')}
          >
            Table
          </Button>
          <Button
            variant={typeFilter === 'parcel' ? "secondary" : "ghost"}
            size="sm"
            onClick={() => handleFilterChange('type', 'parcel')}
          >
            Parcel
          </Button>
        </div>
      </div>

      {/* Bills Table */}
      <div className="border border-border rounded-lg overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Bill No.</TableHead>
              <TableHead>Date & Time</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Table/Token</TableHead>
              <TableHead className="text-center">Items</TableHead>
              <TableHead className="text-right">Amount</TableHead>
              <TableHead>Payment</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="w-32"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {paginatedBills.length === 0 ? (
              <TableRow>
                <TableCell colSpan={9} className="text-center py-12 text-muted-foreground">
                  <Receipt className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No bills found</p>
                </TableCell>
              </TableRow>
            ) : (
              paginatedBills.map(bill => (
                <TableRow key={bill.id}>
                  <TableCell className="text-sm ">
                    {bill.bill_number}
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {format(new Date(bill.created_at), 'dd MMM yyyy')}
                    <br />
                    <span className="text-xs">{format(new Date(bill.created_at), 'hh:mm a')}</span>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className="capitalize">
                      {bill.type}
                    </Badge>
                  </TableCell>
                  <TableCell className="font-medium">
                    {bill.type === 'table' ? bill.table_number : `Token #${bill.token_number}`}
                  </TableCell>
                  <TableCell className="text-center">
                    {bill.items?.length || 0}
                  </TableCell>
                  <TableCell className="text-right font-semibold text-success">
                    ₹{bill.final_amount}
                  </TableCell>
                  <TableCell>
                    {bill.payment_method ? (
                      <Badge variant="outline" className="capitalize">
                        {bill.payment_method}
                      </Badge>
                    ) : (
                      <span className="text-muted-foreground">-</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant="outline"
                      className={cn(
                        bill.status === 'settled' && "bg-success/10 text-success border-success/30",
                        bill.status === 'unsettled' && "bg-warning/10 text-warning border-warning/30",
                        bill.status === 'active' && "bg-accent/10 text-accent border-accent/30"
                      )}
                    >
                      {bill.status}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => navigate(`/bill/${bill.id}?isEdit=false`)}
                        title="View Bill"
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-8 w-8">
                        <Printer className="h-4 w-4" />
                      </Button>
                      {bill.status === 'settled' && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => handleRevertBill(bill.id, bill.table_id)}
                        >
                          <RotateCcw className="h-4 w-4" />
                        </Button>
                      )}
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-destructive"
                        onClick={() => handleDeleteBill(bill.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            Showing {startIndex + 1} to {Math.min(startIndex + ITEMS_PER_PAGE, filteredBills.length)} of {filteredBills.length} bills
          </p>
          <Pagination>
            <PaginationContent>
              <PaginationItem>
                <PaginationPrevious
                  onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                  className={cn(currentPage === 1 && "pointer-events-none opacity-50")}
                />
              </PaginationItem>

              {getPaginationItems().map((item, index) => (
                <PaginationItem key={index}>
                  {item === 'ellipsis' ? (
                    <PaginationEllipsis />
                  ) : (
                    <PaginationLink
                      onClick={() => setCurrentPage(item as number)}
                      isActive={currentPage === item}
                    >
                      {item}
                    </PaginationLink>
                  )}
                </PaginationItem>
              ))}

              <PaginationItem>
                <PaginationNext
                  onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                  className={cn(currentPage === totalPages && "pointer-events-none opacity-50")}
                />
              </PaginationItem>
            </PaginationContent>
          </Pagination>
        </div>
      )}
    </div>
  );
}
