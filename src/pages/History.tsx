import { useState } from 'react';
import { format } from 'date-fns';
import { Search, Filter, Eye, RotateCcw, Printer, Trash2, Receipt } from 'lucide-react';
import { useBillingStore } from '@/store/billingStore';
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

export default function History() {
  const { bills, revertBill, deleteBill } = useBillingStore();
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'settled' | 'unsettled'>('all');
  const [typeFilter, setTypeFilter] = useState<'all' | 'table' | 'parcel'>('all');

  const filteredBills = bills
    .filter(bill => {
      const matchesSearch =
        bill.billNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
        bill.tableNumber?.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesStatus = statusFilter === 'all' || bill.status === statusFilter;
      const matchesType = typeFilter === 'all' || bill.type === typeFilter;
      return matchesSearch && matchesStatus && matchesType;
    })
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Bill History</h1>
          <p className="text-muted-foreground">View and manage past bills</p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-4 flex-wrap">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by bill number or table..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant={statusFilter === 'all' ? "secondary" : "ghost"}
            size="sm"
            onClick={() => setStatusFilter('all')}
          >
            All
          </Button>
          <Button
            variant={statusFilter === 'settled' ? "secondary" : "ghost"}
            size="sm"
            onClick={() => setStatusFilter('settled')}
          >
            Settled
          </Button>
          <Button
            variant={statusFilter === 'unsettled' ? "secondary" : "ghost"}
            size="sm"
            onClick={() => setStatusFilter('unsettled')}
          >
            Unsettled
          </Button>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant={typeFilter === 'all' ? "secondary" : "ghost"}
            size="sm"
            onClick={() => setTypeFilter('all')}
          >
            All Types
          </Button>
          <Button
            variant={typeFilter === 'table' ? "secondary" : "ghost"}
            size="sm"
            onClick={() => setTypeFilter('table')}
          >
            Table
          </Button>
          <Button
            variant={typeFilter === 'parcel' ? "secondary" : "ghost"}
            size="sm"
            onClick={() => setTypeFilter('parcel')}
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
            {filteredBills.map(bill => (
              <TableRow key={bill.id}>
                <TableCell className=" text-sm">
                  {bill.billNumber}
                </TableCell>
                <TableCell className="text-sm text-muted-foreground">
                  {format(new Date(bill.createdAt), 'dd MMM yyyy')}
                  <br />
                  <span className="text-xs">{format(new Date(bill.createdAt), 'hh:mm a')}</span>
                </TableCell>
                <TableCell>
                  <Badge variant="outline" className="capitalize">
                    {bill.type}
                  </Badge>
                </TableCell>
                <TableCell className="font-medium">
                  {bill.type === 'table' ? bill.tableNumber : `Token #${bill.tokenNumber}`}
                </TableCell>
                <TableCell className="text-center">
                  {bill.items.length}
                </TableCell>
                <TableCell className="text-right  font-semibold text-success">
                  ₹{bill.finalAmount}
                </TableCell>
                <TableCell>
                  {bill.paymentMethod ? (
                    <Badge variant="outline" className="capitalize">
                      {bill.paymentMethod}
                    </Badge>
                  ) : (
                    <span className="text-muted-foreground">-</span>
                  )}
                </TableCell>
                <TableCell>
                  <Badge
                    variant="outline"
                    className={cn(
                      bill.status === 'settled' && "status-settled",
                      bill.status === 'unsettled' && "status-unsettled"
                    )}
                  >
                    {bill.status}
                  </Badge>
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-1">
                    <Button variant="ghost" size="icon" className="h-8 w-8">
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
                        onClick={() => revertBill(bill.id)}
                      >
                        <RotateCcw className="h-4 w-4" />
                      </Button>
                    )}
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-destructive"
                      onClick={() => deleteBill(bill.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {filteredBills.length === 0 && (
        <div className="text-center py-12 text-muted-foreground">
          <Receipt className="h-12 w-12 mx-auto mb-4 opacity-50" />
          <p>No bills found</p>
        </div>
      )}
    </div>
  );
}
