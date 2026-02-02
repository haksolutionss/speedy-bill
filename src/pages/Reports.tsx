import { useState } from 'react';
import { format, subDays, startOfMonth, endOfMonth, startOfDay, endOfDay } from 'date-fns';
import {
  FileText,
  Download,
  Calendar as CalendarIcon,
  Receipt,
  CreditCard,
  BarChart3,
  ShoppingBag,
  Layers,
  MapPin,
  ChefHat,
  Clock,
  TrendingUp
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  useGetSalesReportQuery,
  useGetItemSalesReportQuery,
  useGetCategorySalesReportQuery,
  useGetTableSalesReportQuery,
  useGetPaymentModeReportQuery,
  useGetGSTReportQuery,
  useGetKOTReportQuery,
  useGetPeakHoursReportQuery,
} from '@/store/redux/api/reportsApi';
import { useGetBillsQuery } from '@/store/redux/api/billingApi';
import { exportToPDF, formatCurrency, formatNumber, formatPercentage } from '@/lib/pdfExport';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
} from 'recharts';
import { cn } from '@/lib/utils';

type DateRange = { from: Date; to: Date };

const REPORT_TYPES = [
  { id: 'sales', label: 'Sales Report', shortLabel: 'Sales', icon: Receipt, description: 'Daily sales summary' },
  { id: 'bills', label: 'Bill History', shortLabel: 'Bills', icon: FileText, description: 'All past bills' },
  { id: 'payment', label: 'Payment Mode', shortLabel: 'Payment', icon: CreditCard, description: 'Cash/Card/UPI split' },
  { id: 'gst', label: 'GST Report', shortLabel: 'GST', icon: BarChart3, description: 'Tax compliance' },
  { id: 'items', label: 'Item-wise Sales', shortLabel: 'Items', icon: ShoppingBag, description: 'Best selling items' },
  { id: 'categories', label: 'Category-wise', shortLabel: 'Categories', icon: Layers, description: 'Sales by category' },
  { id: 'tables', label: 'Table-wise', shortLabel: 'Tables', icon: MapPin, description: 'Revenue per table' },
  { id: 'kot', label: 'KOT Report', shortLabel: 'KOT', icon: ChefHat, description: 'Kitchen orders' },
  { id: 'peak', label: 'Peak Hours', shortLabel: 'Peak', icon: Clock, description: 'Busiest hours' },
  { id: 'trends', label: 'Sales Trends', shortLabel: 'Trends', icon: TrendingUp, description: 'Daily comparison' },
];

const COLORS = ['#2563eb', '#16a34a', '#dc2626', '#ca8a04', '#9333ea', '#0891b2'];

function DateRangePicker({
  dateRange,
  onDateRangeChange
}: {
  dateRange: DateRange;
  onDateRangeChange: (range: DateRange) => void;
}) {
  const [open, setOpen] = useState(false);

  const presets = [
    { label: 'Today', from: startOfDay(new Date()), to: endOfDay(new Date()) },
    { label: 'Yesterday', from: startOfDay(subDays(new Date(), 1)), to: endOfDay(subDays(new Date(), 1)) },
    { label: 'Last 7 days', from: startOfDay(subDays(new Date(), 6)), to: endOfDay(new Date()) },
    { label: 'Last 30 days', from: startOfDay(subDays(new Date(), 29)), to: endOfDay(new Date()) },
    { label: 'This Month', from: startOfMonth(new Date()), to: endOfMonth(new Date()) },
  ];

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="outline" className="w-full sm:w-[280px] justify-start text-left font-normal text-xs sm:text-sm">
          <CalendarIcon className="mr-2 h-3 w-3 sm:h-4 sm:w-4 flex-shrink-0" />
          <span className="truncate">
            {format(dateRange.from, 'dd MMM yyyy')} - {format(dateRange.to, 'dd MMM yyyy')}
          </span>
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="end">
        <div className="flex flex-col sm:flex-row">
          <div className="border-b sm:border-b-0 sm:border-r p-3 space-y-1">
            {presets.map((preset) => (
              <Button
                key={preset.label}
                variant="ghost"
                size="sm"
                className="w-full justify-start text-xs sm:text-sm"
                onClick={() => {
                  onDateRangeChange({ from: preset.from, to: preset.to });
                  setOpen(false);
                }}
              >
                {preset.label}
              </Button>
            ))}
          </div>
          <Calendar
            mode="range"
            selected={{ from: dateRange.from, to: dateRange.to }}
            onSelect={(range) => {
              if (range?.from && range?.to) {
                onDateRangeChange({ from: range.from, to: range.to });
              }
            }}
            numberOfMonths={1}
            className="sm:hidden"
          />
          <Calendar
            mode="range"
            selected={{ from: dateRange.from, to: dateRange.to }}
            onSelect={(range) => {
              if (range?.from && range?.to) {
                onDateRangeChange({ from: range.from, to: range.to });
              }
            }}
            numberOfMonths={2}
            className="hidden sm:block"
          />
        </div>
      </PopoverContent>
    </Popover>
  );
}

function LoadingTable({ columns }: { columns: number }) {
  return (
    <div className="space-y-2">
      <Skeleton className="h-10 w-full" />
      {Array.from({ length: 5 }).map((_, i) => (
        <Skeleton key={i} className="h-12 w-full" />
      ))}
    </div>
  );
}

// Individual Report Components
function SalesReport({ dateRange }: { dateRange: DateRange }) {
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
      {/* Summary Cards */}
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

      {/* Export Button */}
      <div className="flex justify-end">
        <Button onClick={handleExport} size="sm" className="w-full sm:w-auto">
          <Download className="h-4 w-4 mr-2" />
          Export PDF
        </Button>
      </div>

      {/* Table */}
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

function BillHistoryReport({ dateRange }: { dateRange: DateRange }) {
  const { data: bills, isLoading } = useGetBillsQuery({ limit: 500 });

  const filteredBills = (bills || []).filter(bill => {
    const billDate = new Date(bill.created_at);
    return billDate >= dateRange.from && billDate <= dateRange.to;
  });

  const handleExport = () => {
    const data = filteredBills.map(bill => [
      bill.bill_number,
      format(new Date(bill.created_at), 'dd/MM/yyyy HH:mm'),
      bill.type.toUpperCase(),
      bill.status.toUpperCase(),
      bill.payment_method || '-',
      formatCurrency(bill.final_amount),
    ]);

    exportToPDF({
      title: 'Bill History Report',
      subtitle: 'HotelAqsa',
      dateRange: { start: dateRange.from.toISOString(), end: dateRange.to.toISOString() },
      headers: ['Bill No', 'Date/Time', 'Type', 'Status', 'Payment', 'Amount'],
      data,
    });
  };

  if (isLoading) return <LoadingTable columns={6} />;

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3">
        <p className="text-sm text-muted-foreground">{filteredBills.length} bills found</p>
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
                <TableHead className="whitespace-nowrap">Status</TableHead>
                <TableHead className="whitespace-nowrap">Payment</TableHead>
                <TableHead className="text-right whitespace-nowrap">Amount</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredBills.slice(0, 100).map((bill) => (
                <TableRow key={bill.id}>
                  <TableCell className="font-medium whitespace-nowrap text-xs sm:text-sm">{bill.bill_number}</TableCell>
                  <TableCell className="whitespace-nowrap text-xs sm:text-sm">{format(new Date(bill.created_at), 'dd/MM/yyyy HH:mm')}</TableCell>
                  <TableCell>
                    <Badge variant={bill.type === 'table' ? 'default' : 'secondary'} className="text-xs">
                      {bill.type}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Badge variant={
                      bill.status === 'settled' ? 'default' :
                        bill.status === 'active' ? 'secondary' : 'destructive'
                    } className="text-xs">
                      {bill.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-xs sm:text-sm">{bill.payment_method?.toUpperCase() || '-'}</TableCell>
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

function PaymentModeReport({ dateRange }: { dateRange: DateRange }) {
  const { data: payments, isLoading } = useGetPaymentModeReportQuery({
    startDate: dateRange.from.toISOString(),
    endDate: dateRange.to.toISOString(),
  });

  const chartData = (payments || []).map((p, i) => ({
    name: p.method,
    value: p.amount,
    fill: COLORS[i % COLORS.length],
  }));

  const handleExport = () => {
    const data = (payments || []).map(p => [
      p.method,
      formatNumber(p.count),
      formatCurrency(p.amount),
      formatPercentage(p.percentage),
    ]);

    exportToPDF({
      title: 'Payment Mode Report',
      subtitle: 'HotelAqsa',
      dateRange: { start: dateRange.from.toISOString(), end: dateRange.to.toISOString() },
      headers: ['Payment Method', 'Transactions', 'Amount', 'Percentage'],
      data,
    });
  };

  if (isLoading) return <LoadingTable columns={4} />;

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button onClick={handleExport} size="sm" className="w-full sm:w-auto">
          <Download className="h-4 w-4 mr-2" />
          Export PDF
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-base sm:text-lg">Payment Distribution</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <PieChart>
                <Pie
                  data={chartData}
                  cx="50%"
                  cy="50%"
                  innerRadius={50}
                  outerRadius={80}
                  paddingAngle={5}
                  dataKey="value"
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                >
                  {chartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.fill} />
                  ))}
                </Pie>
                <Tooltip formatter={(value: number) => formatCurrency(value)} />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base sm:text-lg">Payment Summary</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {(payments || []).map((p, i) => (
                <div key={p.method} className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex items-center gap-2 sm:gap-3 min-w-0">
                    <div
                      className="h-3 w-3 sm:h-4 sm:w-4 rounded flex-shrink-0"
                      style={{ backgroundColor: COLORS[i % COLORS.length] }}
                    />
                    <div className="min-w-0">
                      <p className="font-medium text-sm sm:text-base truncate">{p.method}</p>
                      <p className="text-xs sm:text-sm text-muted-foreground">{p.count} transactions</p>
                    </div>
                  </div>
                  <div className="text-right flex-shrink-0 ml-2">
                    <p className="font-bold text-sm sm:text-base">{formatCurrency(p.amount)}</p>
                    <p className="text-xs sm:text-sm text-muted-foreground">{formatPercentage(p.percentage)}</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function GSTReport({ dateRange }: { dateRange: DateRange }) {
  const { data: gstData, isLoading } = useGetGSTReportQuery({
    startDate: dateRange.from.toISOString(),
    endDate: dateRange.to.toISOString(),
  });

  const totalSubTotal = (gstData || []).reduce((sum, g) => sum + g.subTotal, 0);
  const totalCGST = (gstData || []).reduce((sum, g) => sum + g.cgst, 0);
  const totalSGST = (gstData || []).reduce((sum, g) => sum + g.sgst, 0);
  const totalGST = totalCGST + totalSGST;
  const totalFinal = (gstData || []).reduce((sum, g) => sum + g.finalAmount, 0);

  const handleExport = () => {
    const data = (gstData || []).map(g => [
      g.billNumber,
      format(new Date(g.date), 'dd/MM/yyyy'),
      formatCurrency(g.subTotal),
      formatCurrency(g.cgst),
      formatCurrency(g.sgst),
      formatCurrency(g.totalGst),
      formatCurrency(g.finalAmount),
    ]);

    exportToPDF({
      title: 'GST Report',
      subtitle: 'HotelAqsa - Tax Compliance Report',
      dateRange: { start: dateRange.from.toISOString(), end: dateRange.to.toISOString() },
      headers: ['Bill No', 'Date', 'Taxable Value', 'CGST', 'SGST', 'Total GST', 'Invoice Value'],
      data,
      summary: [
        { label: 'Total Taxable Value', value: formatCurrency(totalSubTotal) },
        { label: 'Total CGST', value: formatCurrency(totalCGST) },
        { label: 'Total SGST', value: formatCurrency(totalSGST) },
        { label: 'Total GST Collected', value: formatCurrency(totalGST) },
        { label: 'Total Invoice Value', value: formatCurrency(totalFinal) },
      ],
      orientation: 'landscape',
    });
  };

  if (isLoading) return <LoadingTable columns={7} />;

  return (
    <div className="space-y-4">
      {/* Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 md:gap-4">
        <Card>
          <CardContent className="pt-3 md:pt-4">
            <p className="text-xs sm:text-sm text-muted-foreground">Taxable Value</p>
            <p className="text-base sm:text-lg md:text-xl font-bold truncate">{formatCurrency(totalSubTotal)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-3 md:pt-4">
            <p className="text-xs sm:text-sm text-muted-foreground">CGST</p>
            <p className="text-base sm:text-lg md:text-xl font-bold truncate">{formatCurrency(totalCGST)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-3 md:pt-4">
            <p className="text-xs sm:text-sm text-muted-foreground">SGST</p>
            <p className="text-base sm:text-lg md:text-xl font-bold truncate">{formatCurrency(totalSGST)}</p>
          </CardContent>
        </Card>
        <Card className="bg-primary/5">
          <CardContent className="pt-3 md:pt-4">
            <p className="text-xs sm:text-sm text-muted-foreground">Total GST</p>
            <p className="text-base sm:text-lg md:text-xl font-bold text-primary truncate">{formatCurrency(totalGST)}</p>
          </CardContent>
        </Card>
        <Card className="col-span-2 sm:col-span-3 lg:col-span-1">
          <CardContent className="pt-3 md:pt-4">
            <p className="text-xs sm:text-sm text-muted-foreground">Invoice Value</p>
            <p className="text-base sm:text-lg md:text-xl font-bold truncate">{formatCurrency(totalFinal)}</p>
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
                <TableHead className="whitespace-nowrap">Date</TableHead>
                <TableHead className="text-right whitespace-nowrap">Taxable Value</TableHead>
                <TableHead className="text-right whitespace-nowrap">CGST</TableHead>
                <TableHead className="text-right whitespace-nowrap">SGST</TableHead>
                <TableHead className="text-right whitespace-nowrap">Total GST</TableHead>
                <TableHead className="text-right whitespace-nowrap">Invoice Value</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {(gstData || []).slice(0, 50).map((g) => (
                <TableRow key={g.billNumber}>
                  <TableCell className="font-medium whitespace-nowrap text-xs sm:text-sm">{g.billNumber}</TableCell>
                  <TableCell className="whitespace-nowrap text-xs sm:text-sm">{format(new Date(g.date), 'dd/MM/yyyy')}</TableCell>
                  <TableCell className="text-right whitespace-nowrap text-xs sm:text-sm">{formatCurrency(g.subTotal)}</TableCell>
                  <TableCell className="text-right whitespace-nowrap text-xs sm:text-sm">{formatCurrency(g.cgst)}</TableCell>
                  <TableCell className="text-right whitespace-nowrap text-xs sm:text-sm">{formatCurrency(g.sgst)}</TableCell>
                  <TableCell className="text-right whitespace-nowrap text-xs sm:text-sm">{formatCurrency(g.totalGst)}</TableCell>
                  <TableCell className="text-right font-medium whitespace-nowrap text-xs sm:text-sm">{formatCurrency(g.finalAmount)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>
    </div>
  );
}

function ItemSalesReport({ dateRange }: { dateRange: DateRange }) {
  const { data: items, isLoading } = useGetItemSalesReportQuery({
    startDate: dateRange.from.toISOString(),
    endDate: dateRange.to.toISOString(),
  });

  const chartData = (items || []).slice(0, 10).map(i => ({
    name: i.productName.length > 15 ? i.productName.slice(0, 15) + '...' : i.productName,
    revenue: i.revenue,
    quantity: i.quantity,
  }));

  const handleExport = () => {
    const data = (items || []).map(i => [
      i.productCode,
      i.productName,
      i.portion,
      formatNumber(i.quantity),
      formatCurrency(i.avgPrice),
      formatCurrency(i.revenue),
    ]);

    exportToPDF({
      title: 'Item-wise Sales Report',
      subtitle: 'HotelAqsa',
      dateRange: { start: dateRange.from.toISOString(), end: dateRange.to.toISOString() },
      headers: ['Code', 'Item Name', 'Portion', 'Qty Sold', 'Avg Price', 'Revenue'],
      data,
    });
  };

  if (isLoading) return <LoadingTable columns={6} />;

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button onClick={handleExport} size="sm" className="w-full sm:w-auto">
          <Download className="h-4 w-4 mr-2" />
          Export PDF
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-base sm:text-lg">Top 10 Items by Revenue</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={chartData} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis type="number" tickFormatter={(v) => `₹${v >= 1000 ? `${(v / 1000).toFixed(0)}k` : v}`} tick={{ fontSize: 10 }} />
                <YAxis type="category" dataKey="name" width={80} tick={{ fontSize: 9 }} />
                <Tooltip formatter={(value: number) => formatCurrency(value)} />
                <Bar dataKey="revenue" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <div className="border rounded-lg max-h-[350px] overflow-auto">
          <Table>
            <TableHeader className="sticky top-0 bg-background">
              <TableRow>
                <TableHead className="whitespace-nowrap">Item</TableHead>
                <TableHead className="whitespace-nowrap">Portion</TableHead>
                <TableHead className="text-right whitespace-nowrap">Qty</TableHead>
                <TableHead className="text-right whitespace-nowrap">Revenue</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {(items || []).map((item, i) => (
                <TableRow key={`${item.productCode}-${item.portion}`}>
                  <TableCell className="font-medium text-xs sm:text-sm">{item.productName}</TableCell>
                  <TableCell className="text-xs sm:text-sm">{item.portion}</TableCell>
                  <TableCell className="text-right text-xs sm:text-sm">{item.quantity}</TableCell>
                  <TableCell className="text-right text-xs sm:text-sm">{formatCurrency(item.revenue)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>
    </div>
  );
}

function CategorySalesReport({ dateRange }: { dateRange: DateRange }) {
  const { data: categories, isLoading } = useGetCategorySalesReportQuery({
    startDate: dateRange.from.toISOString(),
    endDate: dateRange.to.toISOString(),
  });

  const chartData = (categories || []).map((c, i) => ({
    name: c.category,
    value: c.sales,
    fill: COLORS[i % COLORS.length],
  }));

  const handleExport = () => {
    const data = (categories || []).map(c => [
      c.category,
      formatNumber(c.quantity),
      formatCurrency(c.sales),
    ]);

    exportToPDF({
      title: 'Category-wise Sales Report',
      subtitle: 'HotelAqsa',
      dateRange: { start: dateRange.from.toISOString(), end: dateRange.to.toISOString() },
      headers: ['Category', 'Items Sold', 'Revenue'],
      data,
    });
  };

  if (isLoading) return <LoadingTable columns={3} />;

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button onClick={handleExport} size="sm" className="w-full sm:w-auto">
          <Download className="h-4 w-4 mr-2" />
          Export PDF
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-base sm:text-lg">Sales by Category</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <PieChart>
                <Pie
                  data={chartData}
                  cx="50%"
                  cy="50%"
                  outerRadius={80}
                  dataKey="value"
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                >
                  {chartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.fill} />
                  ))}
                </Pie>
                <Tooltip formatter={(value: number) => formatCurrency(value)} />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base sm:text-lg">Category Breakdown</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {(categories || []).map((c, i) => (
                <div key={c.category} className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex items-center gap-2 sm:gap-3 min-w-0">
                    <div
                      className="h-3 w-3 sm:h-4 sm:w-4 rounded flex-shrink-0"
                      style={{ backgroundColor: COLORS[i % COLORS.length] }}
                    />
                    <div className="min-w-0">
                      <p className="font-medium text-sm sm:text-base truncate">{c.category}</p>
                      <p className="text-xs sm:text-sm text-muted-foreground">{c.quantity} items sold</p>
                    </div>
                  </div>
                  <p className="font-bold text-sm sm:text-base flex-shrink-0 ml-2">{formatCurrency(c.sales)}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function TableSalesReport({ dateRange }: { dateRange: DateRange }) {
  const { data: tables, isLoading } = useGetTableSalesReportQuery({
    startDate: dateRange.from.toISOString(),
    endDate: dateRange.to.toISOString(),
  });

  const handleExport = () => {
    const data = (tables || []).map(t => [
      t.tableNumber,
      formatNumber(t.orders),
      formatCurrency(t.revenue),
      formatCurrency(t.avgOrderValue),
    ]);

    exportToPDF({
      title: 'Table-wise Sales Report',
      subtitle: 'HotelAqsa',
      dateRange: { start: dateRange.from.toISOString(), end: dateRange.to.toISOString() },
      headers: ['Table', 'Orders', 'Revenue', 'Avg Order Value'],
      data,
    });
  };

  if (isLoading) return <LoadingTable columns={4} />;

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button onClick={handleExport} size="sm" className="w-full sm:w-auto">
          <Download className="h-4 w-4 mr-2" />
          Export PDF
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-base sm:text-lg">Revenue by Table</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={(tables || []).slice(0, 10)}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="tableNumber" tick={{ fontSize: 10 }} />
                <YAxis tickFormatter={(v) => `₹${v >= 1000 ? `${(v / 1000).toFixed(0)}k` : v}`} tick={{ fontSize: 10 }} />
                <Tooltip formatter={(value: number) => formatCurrency(value)} />
                <Bar dataKey="revenue" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <div className="border rounded-lg max-h-[350px] overflow-auto">
          <Table>
            <TableHeader className="sticky top-0 bg-background">
              <TableRow>
                <TableHead className="whitespace-nowrap">Table</TableHead>
                <TableHead className="text-right whitespace-nowrap">Orders</TableHead>
                <TableHead className="text-right whitespace-nowrap">Revenue</TableHead>
                <TableHead className="text-right whitespace-nowrap">Avg Order</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {(tables || []).map((t) => (
                <TableRow key={t.tableNumber}>
                  <TableCell className="font-medium text-xs sm:text-sm">Table {t.tableNumber}</TableCell>
                  <TableCell className="text-right text-xs sm:text-sm">{t.orders}</TableCell>
                  <TableCell className="text-right text-xs sm:text-sm">{formatCurrency(t.revenue)}</TableCell>
                  <TableCell className="text-right text-xs sm:text-sm">{formatCurrency(t.avgOrderValue)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>
    </div>
  );
}

function KOTReport({ dateRange }: { dateRange: DateRange }) {
  const { data: kots, isLoading } = useGetKOTReportQuery({
    startDate: dateRange.from.toISOString(),
    endDate: dateRange.to.toISOString(),
  });

  const handleExport = () => {
    const data = (kots || []).map(k => [
      k.kotNumber,
      k.billNumber,
      k.tableNumber || (k.tokenNumber ? `Token ${k.tokenNumber}` : '-'),
      k.items.map(i => `${i.name} x${i.quantity}`).join(', '),
      format(new Date(k.printedAt), 'dd/MM/yyyy HH:mm'),
    ]);

    exportToPDF({
      title: 'KOT Report',
      subtitle: 'HotelAqsa - Kitchen Order Tickets',
      dateRange: { start: dateRange.from.toISOString(), end: dateRange.to.toISOString() },
      headers: ['KOT No', 'Bill No', 'Table/Token', 'Items', 'Printed At'],
      data,
      orientation: 'landscape',
    });
  };

  if (isLoading) return <LoadingTable columns={5} />;

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3">
        <p className="text-sm text-muted-foreground">{(kots || []).length} KOTs found</p>
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
                <TableHead className="whitespace-nowrap">KOT No</TableHead>
                <TableHead className="whitespace-nowrap">Bill No</TableHead>
                <TableHead className="whitespace-nowrap">Table/Token</TableHead>
                <TableHead className="whitespace-nowrap">Items</TableHead>
                <TableHead className="whitespace-nowrap">Printed At</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {(kots || []).slice(0, 50).map((k) => (
                <TableRow key={k.kotNumber}>
                  <TableCell className="font-medium whitespace-nowrap text-xs sm:text-sm">{k.kotNumber}</TableCell>
                  <TableCell className="whitespace-nowrap text-xs sm:text-sm">{k.billNumber}</TableCell>
                  <TableCell className="whitespace-nowrap text-xs sm:text-sm">
                    {k.tableNumber ? `Table ${k.tableNumber}` :
                      k.tokenNumber ? `Token ${k.tokenNumber}` : '-'}
                  </TableCell>
                  <TableCell>
                    <div className="max-w-xs">
                      {k.items.map((item, i) => (
                        <div key={i} className="text-xs sm:text-sm">
                          {item.name} x{item.quantity}
                          {item.notes && (
                            <span className="text-muted-foreground ml-1">({item.notes})</span>
                          )}
                        </div>
                      ))}
                    </div>
                  </TableCell>
                  <TableCell className="whitespace-nowrap text-xs sm:text-sm">{format(new Date(k.printedAt), 'dd/MM/yyyy HH:mm')}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>
    </div>
  );
}

function PeakHoursReport({ dateRange }: { dateRange: DateRange }) {
  const { data: peakData, isLoading } = useGetPeakHoursReportQuery({
    startDate: dateRange.from.toISOString(),
    endDate: dateRange.to.toISOString(),
  });

  const chartData = (peakData || []).map(h => ({
    hour: `${h.hour.toString().padStart(2, '0')}:00`,
    orders: h.orderCount,
    revenue: h.revenue,
  }));

  const peakHour = (peakData || []).reduce((max, h) =>
    h.orderCount > (max?.orderCount || 0) ? h : max, peakData?.[0]);

  const handleExport = () => {
    const data = (peakData || []).map(h => [
      `${h.hour.toString().padStart(2, '0')}:00 - ${(h.hour + 1).toString().padStart(2, '0')}:00`,
      formatNumber(h.orderCount),
      formatCurrency(h.revenue),
      formatCurrency(h.avgOrderValue),
    ]);

    exportToPDF({
      title: 'Peak Hours Report',
      subtitle: 'HotelAqsa - Order Volume Analysis',
      dateRange: { start: dateRange.from.toISOString(), end: dateRange.to.toISOString() },
      headers: ['Time Slot', 'Orders', 'Revenue', 'Avg Order Value'],
      data,
      summary: peakHour ? [
        { label: 'Peak Hour', value: `${peakHour.hour}:00 - ${peakHour.hour + 1}:00` },
        { label: 'Peak Orders', value: peakHour.orderCount },
        { label: 'Peak Revenue', value: formatCurrency(peakHour.revenue) },
      ] : undefined,
    });
  };

  if (isLoading) return <LoadingTable columns={4} />;

  return (
    <div className="space-y-4">
      {peakHour && (
        <Card className="bg-primary/5">
          <CardContent className="pt-3 md:pt-4 flex items-center gap-3 md:gap-4">
            <Clock className="h-6 w-6 sm:h-8 sm:w-8 text-primary flex-shrink-0" />
            <div className="min-w-0">
              <p className="text-xs sm:text-sm text-muted-foreground">Peak Hour</p>
              <p className="text-base sm:text-lg md:text-xl font-bold truncate">{peakHour.hour}:00 - {peakHour.hour + 1}:00</p>
              <p className="text-xs sm:text-sm text-muted-foreground truncate">
                {peakHour.orderCount} orders • {formatCurrency(peakHour.revenue)} revenue
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="flex justify-end">
        <Button onClick={handleExport} size="sm" className="w-full sm:w-auto">
          <Download className="h-4 w-4 mr-2" />
          Export PDF
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base sm:text-lg">Orders by Hour</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={250}>
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="hour" tick={{ fontSize: 9 }} />
              <YAxis yAxisId="left" tick={{ fontSize: 10 }} />
              <YAxis yAxisId="right" orientation="right" tickFormatter={(v) => `₹${v >= 1000 ? `${(v / 1000).toFixed(0)}k` : v}`} tick={{ fontSize: 10 }} />
              <Tooltip />
              <Line yAxisId="left" type="monotone" dataKey="orders" stroke="hsl(var(--primary))" strokeWidth={2} name="Orders" />
              <Line yAxisId="right" type="monotone" dataKey="revenue" stroke="#16a34a" strokeWidth={2} name="Revenue" />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </div>
  );
}

function SalesTrendsReport({ dateRange }: { dateRange: DateRange }) {
  const { data: bills, isLoading } = useGetSalesReportQuery({
    startDate: dateRange.from.toISOString(),
    endDate: dateRange.to.toISOString(),
  });

  // Aggregate by date
  const dailyData = new Map<string, { date: string; sales: number; orders: number }>();
  (bills || []).filter(b => b.status === 'settled').forEach((bill) => {
    const date = format(new Date(bill.created_at), 'yyyy-MM-dd');
    if (dailyData.has(date)) {
      const existing = dailyData.get(date)!;
      existing.sales += bill.final_amount;
      existing.orders += 1;
    } else {
      dailyData.set(date, { date, sales: bill.final_amount, orders: 1 });
    }
  });

  const chartData = Array.from(dailyData.values())
    .sort((a, b) => a.date.localeCompare(b.date))
    .map(d => ({
      ...d,
      displayDate: format(new Date(d.date), 'dd MMM'),
    }));

  const handleExport = () => {
    const data = chartData.map(d => [
      format(new Date(d.date), 'dd/MM/yyyy'),
      formatNumber(d.orders),
      formatCurrency(d.sales),
      formatCurrency(d.orders > 0 ? d.sales / d.orders : 0),
    ]);

    exportToPDF({
      title: 'Sales Trends Report',
      subtitle: 'HotelAqsa - Daily Sales Analysis',
      dateRange: { start: dateRange.from.toISOString(), end: dateRange.to.toISOString() },
      headers: ['Date', 'Orders', 'Revenue', 'Avg Order Value'],
      data,
    });
  };

  if (isLoading) return <LoadingTable columns={4} />;

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button onClick={handleExport} size="sm" className="w-full sm:w-auto">
          <Download className="h-4 w-4 mr-2" />
          Export PDF
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base sm:text-lg">Daily Sales Trend</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="displayDate" tick={{ fontSize: 9 }} />
              <YAxis tickFormatter={(v) => `₹${v >= 1000 ? `${(v / 1000).toFixed(0)}k` : v}`} tick={{ fontSize: 10 }} />
              <Tooltip formatter={(value: number, name) =>
                name === 'sales' ? formatCurrency(value) : value
              } />
              <Bar dataKey="sales" fill="hsl(var(--primary))" name="Revenue" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <div className="border rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="whitespace-nowrap">Date</TableHead>
                <TableHead className="text-right whitespace-nowrap">Orders</TableHead>
                <TableHead className="text-right whitespace-nowrap">Revenue</TableHead>
                <TableHead className="text-right whitespace-nowrap">Avg Order</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {chartData.map((d) => (
                <TableRow key={d.date}>
                  <TableCell className="font-medium whitespace-nowrap text-xs sm:text-sm">{format(new Date(d.date), 'dd MMM yyyy')}</TableCell>
                  <TableCell className="text-right text-xs sm:text-sm">{d.orders}</TableCell>
                  <TableCell className="text-right text-xs sm:text-sm">{formatCurrency(d.sales)}</TableCell>
                  <TableCell className="text-right text-xs sm:text-sm">{formatCurrency(d.orders > 0 ? d.sales / d.orders : 0)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>
    </div>
  );
}

export default function Reports() {
  const [activeReport, setActiveReport] = useState('sales');
  const [dateRange, setDateRange] = useState<DateRange>({
    from: startOfDay(new Date()),
    to: endOfDay(new Date()),
  });

  const renderReport = () => {
    switch (activeReport) {
      case 'sales': return <SalesReport dateRange={dateRange} />;
      case 'bills': return <BillHistoryReport dateRange={dateRange} />;
      case 'payment': return <PaymentModeReport dateRange={dateRange} />;
      case 'gst': return <GSTReport dateRange={dateRange} />;
      case 'items': return <ItemSalesReport dateRange={dateRange} />;
      case 'categories': return <CategorySalesReport dateRange={dateRange} />;
      case 'tables': return <TableSalesReport dateRange={dateRange} />;
      case 'kot': return <KOTReport dateRange={dateRange} />;
      case 'peak': return <PeakHoursReport dateRange={dateRange} />;
      case 'trends': return <SalesTrendsReport dateRange={dateRange} />;
      default: return <SalesReport dateRange={dateRange} />;
    }
  };

  return (
    <div className="space-y-4 md:space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl md:text-2xl font-bold tracking-tight">Reports & Analytics</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Generate and export detailed business reports
          </p>
        </div>
        <DateRangePicker dateRange={dateRange} onDateRangeChange={setDateRange} />
      </div>

      {/* Report Type Selector - Desktop Grid */}
      <div className="hidden lg:grid lg:grid-cols-5 gap-3">
        {REPORT_TYPES.map((report) => (
          <button
            key={report.id}
            onClick={() => setActiveReport(report.id)}
            className={cn(
              "p-4 rounded-lg border text-left transition-all hover:shadow-md",
              activeReport === report.id
                ? "border-primary bg-primary/5 ring-1 ring-primary"
                : "bg-card hover:border-primary/50"
            )}
          >
            <report.icon className={cn(
              "h-5 w-5 mb-2",
              activeReport === report.id ? "text-primary" : "text-muted-foreground"
            )} />
            <p className="font-medium text-sm">{report.label}</p>
            <p className="text-xs text-muted-foreground">{report.description}</p>
          </button>
        ))}
      </div>

      {/* Report Type Selector - Mobile/Tablet Scrollable */}
      <div className="lg:hidden -mx-4 md:mx-0">
        <div className="overflow-x-auto scrollbar-hide px-4 md:px-0">
          <div className="flex gap-2 pb-2 min-w-max">
            {REPORT_TYPES.map((report) => (
              <button
                key={report.id}
                onClick={() => setActiveReport(report.id)}
                className={cn(
                  "flex-shrink-0 px-4 py-3 rounded-lg border text-left transition-all",
                  activeReport === report.id
                    ? "border-primary bg-primary/5 ring-1 ring-primary"
                    : "bg-card hover:border-primary/50"
                )}
              >
                <div className="flex items-center gap-2">
                  <report.icon className={cn(
                    "h-4 w-4",
                    activeReport === report.id ? "text-primary" : "text-muted-foreground"
                  )} />
                  <p className="font-medium text-sm whitespace-nowrap">
                    {window.innerWidth < 640 ? report.shortLabel : report.label}
                  </p>
                </div>
              </button>
            ))}
          </div>
        </div>
        {/* Fade indicators */}
        <div className="absolute left-0 top-0 bottom-0 w-8 bg-gradient-to-r from-background to-transparent pointer-events-none md:hidden" />
        <div className="absolute right-0 top-0 bottom-0 w-8 bg-gradient-to-l from-background to-transparent pointer-events-none md:hidden" />
      </div>

      {/* Report Content */}
      <Card>
        <CardHeader className="pb-3 md:pb-6 p-3">
          <CardTitle className="text-base sm:text-lg">{REPORT_TYPES.find(r => r.id === activeReport)?.label}</CardTitle>
          <CardDescription className="text-xs sm:text-sm">
            {format(dateRange.from, 'dd MMM yyyy')} - {format(dateRange.to, 'dd MMM yyyy')}
          </CardDescription>
        </CardHeader>
        <CardContent className="pt-0">
          {renderReport()}
        </CardContent>
      </Card>
    </div>
  );
}