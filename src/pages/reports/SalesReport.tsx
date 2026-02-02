import { format } from 'date-fns';
import { Download } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { useGetSalesReportQuery } from '@/store/redux/api/reportsApi';
import { exportToPDF, formatCurrency } from '@/lib/pdfExport';
import { LoadingTable } from './components/LoadingTable';
import type { DateRange } from './types';

interface SalesReportProps {
  dateRange: DateRange;
}

export function SalesReport({ dateRange }: SalesReportProps) {
  const { data: bills, isLoading } = useGetSalesReportQuery({
    startDate: dateRange.from.toISOString(),
    endDate: dateRange.to.toISOString(),
  });

  const settledBills = (bills || []).filter(b => b.status === 'settled');
  const totalSales = settledBills.reduce((sum, b) => sum + b.final_amount, 0);
  const totalOrders = settledBills.length;
  const avgOrder = totalOrders > 0 ? totalSales / totalOrders : 0;
  const tableSales = settledBills.filter(b => b.type === 'table').reduce((sum, b) => sum + b.final_amount, 0);
  const parcelSales = settledBills.filter(b => b.type === 'parcel').reduce((sum, b) => sum + b.final_amount, 0);

  const handleExport = () => {
    const data = settledBills.map(bill => [
      bill.bill_number,
      format(new Date(bill.created_at), 'dd/MM/yyyy HH:mm'),
      bill.type.toUpperCase(),
      bill.table_number || '-',
      formatCurrency(bill.sub_total),
      formatCurrency(bill.discount_amount),
      formatCurrency(bill.cgst_amount + bill.sgst_amount),
      formatCurrency(bill.final_amount),
    ]);

    exportToPDF({
      title: 'Sales Report',
      subtitle: 'HotelAqsa',
      dateRange: { start: dateRange.from.toISOString(), end: dateRange.to.toISOString() },
      headers: ['Bill No', 'Date/Time', 'Type', 'Table', 'Subtotal', 'Discount', 'GST', 'Total'],
      data,
      summary: [
        { label: 'Total Sales', value: formatCurrency(totalSales) },
        { label: 'Total Orders', value: totalOrders },
        { label: 'Avg Order Value', value: formatCurrency(avgOrder) },
        { label: 'Dine-in Sales', value: formatCurrency(tableSales) },
        { label: 'Parcel Sales', value: formatCurrency(parcelSales) },
      ],
      orientation: 'landscape',
    });
  };

  if (isLoading) return <LoadingTable columns={8} />;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 md:gap-4">
        <Card>
          <CardContent className="pt-3 md:pt-4">
            <p className="text-xs sm:text-sm text-muted-foreground">Total Sales</p>
            <p className="text-lg sm:text-xl md:text-2xl font-bold truncate">{formatCurrency(totalSales)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-3 md:pt-4">
            <p className="text-xs sm:text-sm text-muted-foreground">Orders</p>
            <p className="text-lg sm:text-xl md:text-2xl font-bold">{totalOrders}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-3 md:pt-4">
            <p className="text-xs sm:text-sm text-muted-foreground">Avg Order</p>
            <p className="text-lg sm:text-xl md:text-2xl font-bold truncate">{formatCurrency(avgOrder)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-3 md:pt-4">
            <p className="text-xs sm:text-sm text-muted-foreground">Dine-in</p>
            <p className="text-lg sm:text-xl md:text-2xl font-bold truncate">{formatCurrency(tableSales)}</p>
          </CardContent>
        </Card>
        <Card className="col-span-2 sm:col-span-3 lg:col-span-1">
          <CardContent className="pt-3 md:pt-4">
            <p className="text-xs sm:text-sm text-muted-foreground">Parcel</p>
            <p className="text-lg sm:text-xl md:text-2xl font-bold truncate">{formatCurrency(parcelSales)}</p>
          </CardContent>
        </Card>
      </div>

      <div className="flex justify-end">
        <Button onClick={handleExport} size="sm" className="w-full sm:w-auto">
          <Download className="h-4 w-4 mr-2" />
          Export PDF
        </Button>
      </div>

      <div className="border rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="whitespace-nowrap">Bill No</TableHead>
                <TableHead className="whitespace-nowrap">Date/Time</TableHead>
                <TableHead className="whitespace-nowrap">Type</TableHead>
                <TableHead className="whitespace-nowrap">Table</TableHead>
                <TableHead className="text-right whitespace-nowrap">Subtotal</TableHead>
                <TableHead className="text-right whitespace-nowrap">Discount</TableHead>
                <TableHead className="text-right whitespace-nowrap">GST</TableHead>
                <TableHead className="text-right whitespace-nowrap">Total</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {settledBills.slice(0, 50).map((bill) => (
                <TableRow key={bill.id}>
                  <TableCell className="font-medium whitespace-nowrap text-xs sm:text-sm">{bill.bill_number}</TableCell>
                  <TableCell className="whitespace-nowrap text-xs sm:text-sm">{format(new Date(bill.created_at), 'dd/MM/yyyy HH:mm')}</TableCell>
                  <TableCell>
                    <Badge variant={bill.type === 'table' ? 'default' : 'secondary'} className="text-xs">
                      {bill.type}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-xs sm:text-sm">{bill.table_number || '-'}</TableCell>
                  <TableCell className="text-right whitespace-nowrap text-xs sm:text-sm">{formatCurrency(bill.sub_total)}</TableCell>
                  <TableCell className="text-right whitespace-nowrap text-xs sm:text-sm">{formatCurrency(bill.discount_amount)}</TableCell>
                  <TableCell className="text-right whitespace-nowrap text-xs sm:text-sm">{formatCurrency(bill.cgst_amount + bill.sgst_amount)}</TableCell>
                  <TableCell className="text-right font-medium whitespace-nowrap text-xs sm:text-sm">{formatCurrency(bill.final_amount)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>
    </div>
  );
}
