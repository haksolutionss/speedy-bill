import { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import { Search, Eye, RotateCcw, Printer, Trash2, Receipt, Filter, ArrowUpDown } from 'lucide-react';
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
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
import { usePrint } from '@/hooks/usePrint';
import { useSettingsStore } from '@/store/settingsStore';
import type { BillData } from '@/lib/escpos/templates';
import { ClearHistoryButton } from '@/components/history/ClearHistoryButton';

const ITEMS_PER_PAGE = 20;

export default function History() {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'settled' | 'unsettled' | 'active'>('settled');
  const [typeFilter, setTypeFilter] = useState<'all' | 'table' | 'parcel'>('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [printingBillId, setPrintingBillId] = useState<string | null>(null);
  const [sortField, setSortField] = useState<'date' | 'bill_number' | 'amount'>('date');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');

  // Print hook
  const { printBill, getBusinessInfo, currencySymbol, gstMode } = usePrint();
  const { settings } = useSettingsStore();

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
      const isNotDeleted = bill.status !== 'deleted';
      return matchesSearch && matchesStatus && matchesType && isNotDeleted;
    })
    .sort((a, b) => {
      let cmp = 0;
      switch (sortField) {
        case 'date': cmp = new Date(a.created_at).getTime() - new Date(b.created_at).getTime(); break;
        case 'bill_number': cmp = (a.bill_number || '').localeCompare(b.bill_number || ''); break;
        case 'amount': cmp = a.final_amount - b.final_amount; break;
      }
      return sortDir === 'asc' ? cmp : -cmp;
    });

  const toggleHistorySort = (field: typeof sortField) => {
    if (sortField === field) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortField(field);
      setSortDir(field === 'date' ? 'desc' : 'asc');
    }
    setCurrentPage(1);
  };
  const totalPages = Math.ceil(filteredBills.length / ITEMS_PER_PAGE);
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const paginatedBills = filteredBills.slice(startIndex, startIndex + ITEMS_PER_PAGE);

  // Reset to page 1 when filters change
  const handleStatusFilterChange = (value: string) => {
    setCurrentPage(1);
    setStatusFilter(value as 'all' | 'settled' | 'unsettled' | 'active');
  };

  const handleTypeFilterChange = (value: string) => {
    setCurrentPage(1);
    setTypeFilter(value as 'all' | 'table' | 'parcel');
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

      // If this was a table bill, mark table as active (bill already has KOT)
      if (tableId) {
        await updateTable({
          id: tableId,
          updates: {
            status: 'active',
            current_bill_id: billId,
          },
        }).unwrap();
      }

      toast.success('Bill reverted successfully');
      refetch();
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

      toast.success('Bill deleted successfully');
      refetch();
    } catch (error) {
      console.error('Error deleting bill:', error);
      toast.error('Failed to delete bill');
    }
  };

  // Print bill from history
  const handlePrintBill = async (bill: typeof bills[0]) => {
    setPrintingBillId(bill.id);

    try {
      const businessInfo = getBusinessInfo();
      const taxType = settings.tax.type;

      // Calculate totals from bill items
      const items = (bill.items || []).map(item => ({
        id: item.id,
        productId: item.product_id,
        productName: item.product_name,
        productCode: item.product_code,
        portion: item.portion,
        quantity: item.quantity,
        unitPrice: item.unit_price,
        gstRate: item.gst_rate,
        notes: item.notes || undefined,
        sentToKitchen: item.sent_to_kitchen,
        printedQuantity: item.quantity,
      }));

      const billData: BillData = {
        billId: bill.id,
        billNumber: bill.bill_number,
        tableNumber: bill.table_number || undefined,
        tokenNumber: bill.token_number || undefined,
        items,
        subTotal: bill.sub_total,
        discountAmount: bill.discount_amount,
        discountType: (bill.discount_type as 'percentage' | 'fixed') || undefined,
        discountValue: bill.discount_value || undefined,
        discountReason: bill.discount_reason || undefined,
        cgstAmount: taxType === 'gst' ? bill.cgst_amount : 0,
        sgstAmount: taxType === 'gst' ? bill.sgst_amount : 0,
        totalAmount: bill.total_amount,
        finalAmount: bill.final_amount,
        isParcel: bill.table_number.startsWith("P"),
        restaurantName: businessInfo.name,
        address: businessInfo.address,
        fssaiNumber: businessInfo.fssaiNumber,
        phone: businessInfo.phone,
        gstin: taxType === 'gst' ? businessInfo.gstNumber : undefined,
        currencySymbol,
        gstMode,
        showGST: taxType === 'gst',
        paymentMethod: bill.payment_method || undefined,
        isReprint: true,
      };

      const result = await printBill(billData);

      if (result.success) {
        toast.success('Bill sent to printer');
      } else if (result.error) {
        toast.error(`Print failed: ${result.error}`);
      }
    } catch (error) {
      console.error('Error printing bill:', error);
      toast.error('Failed to print bill');
    } finally {
      setPrintingBillId(null);
    }
  };
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
      <div className="space-y-6 ">
        <BillHistorySkeleton />
      </div>
    );
  }

  if (error) {
    return (
      <div className="">
        <QueryErrorHandler error={error} onRetry={refetch} />
      </div>
    );
  }

  return (
    <div className="space-y-4 md:space-y-6 ">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl md:text-2xl font-bold">Bill History</h1>
          <p className="text-sm text-muted-foreground mt-1">
            View and manage past bills
            {filteredBills.length > 0 && (
              <span className="ml-2">
                ({filteredBills.length} bill{filteredBills.length !== 1 ? 's' : ''})
              </span>
            )}
          </p>
        </div>
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <ClearHistoryButton onSuccess={() => refetch()} />
          <Button
            variant="outline"
            size="sm"
            onClick={() => refetch()}
            disabled={isFetching}
            className="w-full sm:w-auto"
          >
            {isFetching ? 'Refreshing...' : 'Refresh'}
          </Button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
        {/* Search */}
        <div className="relative flex-1 min-w-0">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
          <Input
            placeholder="Search by bill number or table..."
            value={searchQuery}
            onChange={(e) => handleSearchChange(e.target.value)}
            className="pl-10 w-full"
          />
        </div>

        {/* Status Filter */}
        <Select value={statusFilter} onValueChange={handleStatusFilterChange}>
          <SelectTrigger className="w-full sm:w-[160px]">
            <div className="flex items-center gap-2">
              <Filter className="h-4 w-4" />
              <SelectValue placeholder="Status" />
            </div>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="active">Active</SelectItem>
            <SelectItem value="settled">Settled</SelectItem>
            <SelectItem value="unsettled">Unsettled</SelectItem>
          </SelectContent>
        </Select>

        {/* Type Filter */}
        <Select value={typeFilter} onValueChange={handleTypeFilterChange}>
          <SelectTrigger className="w-full sm:w-[160px]">
            <div className="flex items-center gap-2">
              <Filter className="h-4 w-4" />
              <SelectValue placeholder="Type" />
            </div>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Types</SelectItem>
            <SelectItem value="table">Table</SelectItem>
            <SelectItem value="parcel">Parcel</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Bills Table - Desktop */}
      <div className="hidden lg:block border border-border rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="whitespace-nowrap cursor-pointer" onClick={() => toggleHistorySort('bill_number')}>
                  <span className="flex items-center gap-1">Bill No. <ArrowUpDown className="h-3 w-3" /></span>
                </TableHead>
                <TableHead className="whitespace-nowrap cursor-pointer" onClick={() => toggleHistorySort('date')}>
                  <span className="flex items-center gap-1">Date & Time <ArrowUpDown className="h-3 w-3" /></span>
                </TableHead>
                <TableHead className="whitespace-nowrap">Type</TableHead>
                <TableHead className="whitespace-nowrap">Table/Token</TableHead>
                <TableHead className="text-center whitespace-nowrap">Items</TableHead>
                <TableHead className="text-right whitespace-nowrap cursor-pointer" onClick={() => toggleHistorySort('amount')}>
                  <span className="flex items-center gap-1 justify-end">Amount <ArrowUpDown className="h-3 w-3" /></span>
                </TableHead>
                <TableHead className="whitespace-nowrap">Payment</TableHead>
                <TableHead className="whitespace-nowrap">Status</TableHead>
                <TableHead className="whitespace-nowrap">Status</TableHead>
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
                    <TableCell className="text-sm font-medium whitespace-nowrap">
                      {bill.bill_number}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground whitespace-nowrap">
                      {format(new Date(bill.created_at), 'dd MMM yyyy')}
                      <br />
                      <span className="text-xs">{format(new Date(bill.created_at), 'hh:mm a')}</span>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="capitalize whitespace-nowrap">
                        {bill.type}
                      </Badge>
                    </TableCell>
                    <TableCell className="font-medium whitespace-nowrap">
                      {bill.type === 'table' ? bill.table_number : `Token #${bill.token_number}`}
                    </TableCell>
                    <TableCell className="text-center">
                      {bill.items?.length || 0}
                    </TableCell>
                    <TableCell className="text-right font-semibold text-success whitespace-nowrap">
                      ₹{bill.final_amount}
                    </TableCell>
                    <TableCell>
                      {bill.payment_method ? (
                        <Badge variant="outline" className="capitalize whitespace-nowrap">
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
                          "whitespace-nowrap",
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
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => handlePrintBill(bill)}
                          disabled={printingBillId === bill.id}
                          title="Print Bill"
                        >
                          <Printer className={cn("h-4 w-4", printingBillId === bill.id && "animate-spin")} />
                        </Button>
                        {bill.status === 'settled' && (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => handleRevertBill(bill.id, bill.table_id)}
                            title="Revert Bill"
                          >
                            <RotateCcw className="h-4 w-4" />
                          </Button>
                        )}
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-destructive hover:text-destructive"
                          onClick={() => handleDeleteBill(bill.id)}
                          title="Delete Bill"
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
      </div>

      {/* Bills Cards - Mobile/Tablet */}
      <div className="lg:hidden space-y-3">
        {paginatedBills.length === 0 ? (
          <div className="border border-border rounded-lg p-12 text-center text-muted-foreground">
            <Receipt className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>No bills found</p>
          </div>
        ) : (
          paginatedBills.map(bill => (
            <div
              key={bill.id}
              className="border border-border rounded-lg p-4 space-y-3 bg-card hover:bg-accent/5 transition-colors"
            >
              {/* Header Row */}
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <div className="font-semibold text-sm mb-1">{bill.bill_number}</div>
                  <div className="text-xs text-muted-foreground">
                    {format(new Date(bill.created_at), 'dd MMM yyyy, hh:mm a')}
                  </div>
                </div>
                <Badge
                  variant="outline"
                  className={cn(
                    "whitespace-nowrap",
                    bill.status === 'settled' && "bg-success/10 text-success border-success/30",
                    bill.status === 'unsettled' && "bg-warning/10 text-warning border-warning/30",
                    bill.status === 'active' && "bg-accent/10 text-accent border-accent/30"
                  )}
                >
                  {bill.status}
                </Badge>
              </div>

              {/* Details Grid */}
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <div className="text-xs text-muted-foreground mb-1">Type</div>
                  <Badge variant="outline" className="capitalize">
                    {bill.type}
                  </Badge>
                </div>
                <div>
                  <div className="text-xs text-muted-foreground mb-1">Table/Token</div>
                  <div className="font-medium">
                    {bill.type === 'table' ? bill.table_number : `Token #${bill.token_number}`}
                  </div>
                </div>
                <div>
                  <div className="text-xs text-muted-foreground mb-1">Items</div>
                  <div className="font-medium">{bill.items?.length || 0}</div>
                </div>
                <div>
                  <div className="text-xs text-muted-foreground mb-1">Payment</div>
                  {bill.payment_method ? (
                    <Badge variant="outline" className="capitalize">
                      {bill.payment_method}
                    </Badge>
                  ) : (
                    <span className="text-muted-foreground text-xs">-</span>
                  )}
                </div>
              </div>

              {/* Amount and Actions */}
              <div className="flex items-center justify-between pt-2 border-t border-border">
                <div className="text-lg font-bold text-success">
                  ₹{bill.final_amount}
                </div>
                <div className="flex items-center gap-1">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-9 w-9"
                    onClick={() => navigate(`/bill/${bill.id}?isEdit=false`)}
                    title="View Bill"
                  >
                    <Eye className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-9 w-9"
                    onClick={() => handlePrintBill(bill)}
                    disabled={printingBillId === bill.id}
                    title="Print Bill"
                  >
                    <Printer className={cn("h-4 w-4", printingBillId === bill.id && "animate-spin")} />
                  </Button>
                  {bill.status === 'settled' && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-9 w-9"
                      onClick={() => handleRevertBill(bill.id, bill.table_id)}
                      title="Revert Bill"
                    >
                      <RotateCcw className="h-4 w-4" />
                    </Button>
                  )}
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-9 w-9 text-destructive hover:text-destructive"
                    onClick={() => handleDeleteBill(bill.id)}
                    title="Delete Bill"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-2">
          {/* <p className="text-xs sm:text-sm text-muted-foreground order-2 sm:order-1">
            Showing {startIndex + 1} to {Math.min(startIndex + ITEMS_PER_PAGE, filteredBills.length)} of {filteredBills.length} bills
          </p> */}
          <Pagination className="order-1 sm:order-2">
            <PaginationContent className="flex-wrap justify-center">
              <PaginationItem>
                <PaginationPrevious
                  onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                  className={cn(
                    "cursor-pointer",
                    currentPage === 1 && "pointer-events-none opacity-50"
                  )}
                />
              </PaginationItem>

              {getPaginationItems().map((item, index) => (
                <PaginationItem key={index} className="hidden sm:inline-flex">
                  {item === 'ellipsis' ? (
                    <PaginationEllipsis />
                  ) : (
                    <PaginationLink
                      onClick={() => setCurrentPage(item as number)}
                      isActive={currentPage === item}
                      className="cursor-pointer"
                    >
                      {item}
                    </PaginationLink>
                  )}
                </PaginationItem>
              ))}

              {/* Mobile: Show only current page */}
              <PaginationItem className="sm:hidden">
                <div className="px-3 py-2 text-sm">
                  Page {currentPage} of {totalPages}
                </div>
              </PaginationItem>

              <PaginationItem>
                <PaginationNext
                  onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                  className={cn(
                    "cursor-pointer",
                    currentPage === totalPages && "pointer-events-none opacity-50"
                  )}
                />
              </PaginationItem>
            </PaginationContent>
          </Pagination>
        </div>
      )}
    </div>
  );
}