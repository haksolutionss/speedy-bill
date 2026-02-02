import { Download } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useGetPaymentModeReportQuery } from '@/store/redux/api/reportsApi';
import { exportToPDF, formatCurrency, formatNumber, formatPercentage } from '@/lib/pdfExport';
import { LoadingTable } from './components/LoadingTable';
import { COLORS, type DateRange } from './types';
import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';

interface PaymentModeReportProps {
  dateRange: DateRange;
}

export function PaymentModeReport({ dateRange }: PaymentModeReportProps) {
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
