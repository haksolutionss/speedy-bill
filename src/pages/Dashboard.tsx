import { 
  IndianRupee, 
  ShoppingBag, 
  Clock, 
  TrendingUp, 
  TrendingDown,
  CreditCard,
  Wallet,
  Smartphone,
  UtensilsCrossed,
  Package
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { 
  useGetDashboardStatsQuery, 
  useGetHourlySalesQuery, 
  useGetRecentOrdersQuery 
} from '@/store/redux/api/reportsApi';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
} from 'recharts';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';

function formatCurrency(amount: number): string {
  return `₹${amount.toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
}

function StatCard({ 
  title, 
  value, 
  icon: Icon, 
  trend, 
  trendValue,
  subtitle,
  isLoading 
}: { 
  title: string; 
  value: string; 
  icon: React.ElementType;
  trend?: 'up' | 'down' | 'neutral';
  trendValue?: string;
  subtitle?: string;
  isLoading?: boolean;
}) {
  if (isLoading) {
    return (
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-8 w-8 rounded" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-8 w-32 mb-1" />
          <Skeleton className="h-3 w-20" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">{title}</CardTitle>
        <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center">
          <Icon className="h-4 w-4 text-primary" />
        </div>
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
        <div className="flex items-center gap-2 mt-1">
          {trend && trendValue && (
            <span className={cn(
              "flex items-center text-xs font-medium",
              trend === 'up' ? 'text-green-600' : trend === 'down' ? 'text-red-600' : 'text-muted-foreground'
            )}>
              {trend === 'up' ? <TrendingUp className="h-3 w-3 mr-1" /> : 
               trend === 'down' ? <TrendingDown className="h-3 w-3 mr-1" /> : null}
              {trendValue}
            </span>
          )}
          {subtitle && (
            <span className="text-xs text-muted-foreground">{subtitle}</span>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

function PaymentCard({ 
  method, 
  amount, 
  icon: Icon, 
  color,
  isLoading 
}: { 
  method: string; 
  amount: number; 
  icon: React.ElementType;
  color: string;
  isLoading?: boolean;
}) {
  if (isLoading) {
    return (
      <div className="flex items-center gap-3 p-3 rounded-lg border bg-card">
        <Skeleton className="h-10 w-10 rounded-lg" />
        <div>
          <Skeleton className="h-4 w-16 mb-1" />
          <Skeleton className="h-5 w-20" />
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-3 p-3 rounded-lg border bg-card hover:shadow-sm transition-shadow">
      <div className={cn("h-10 w-10 rounded-lg flex items-center justify-center", color)}>
        <Icon className="h-5 w-5 text-white" />
      </div>
      <div>
        <p className="text-sm text-muted-foreground">{method}</p>
        <p className="text-lg font-semibold">{formatCurrency(amount)}</p>
      </div>
    </div>
  );
}

export default function Dashboard() {
  const { data: stats, isLoading: statsLoading } = useGetDashboardStatsQuery();
  const { data: hourlySales, isLoading: hourlyLoading } = useGetHourlySalesQuery();
  const { data: recentOrders, isLoading: ordersLoading } = useGetRecentOrdersQuery(10);

  const chartData = (hourlySales || []).map((h) => ({
    hour: `${h.hour.toString().padStart(2, '0')}:00`,
    sales: h.sales,
    orders: h.orders,
  }));

  const growthTrend = (stats?.salesGrowth || 0) >= 0 ? 'up' : 'down';
  const growthValue = stats ? `${Math.abs(stats.salesGrowth).toFixed(1)}% vs yesterday` : '';

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Dashboard</h1>
          <p className="text-muted-foreground">
            Today's overview • {format(new Date(), 'EEEE, dd MMMM yyyy')}
          </p>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Today's Sales"
          value={formatCurrency(stats?.todaySales || 0)}
          icon={IndianRupee}
          trend={growthTrend}
          trendValue={growthValue}
          isLoading={statsLoading}
        />
        <StatCard
          title="Orders Completed"
          value={stats?.todayOrders?.toString() || '0'}
          icon={ShoppingBag}
          subtitle="settled bills"
          isLoading={statsLoading}
        />
        <StatCard
          title="Active Orders"
          value={stats?.activeOrders?.toString() || '0'}
          icon={Clock}
          subtitle="pending settlement"
          isLoading={statsLoading}
        />
        <StatCard
          title="Avg Order Value"
          value={formatCurrency(stats?.avgOrderValue || 0)}
          icon={TrendingUp}
          subtitle="per order"
          isLoading={statsLoading}
        />
      </div>

      {/* Order Type & Payment Methods */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Order Types</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-2 gap-4">
            <div className="flex items-center gap-3 p-4 rounded-lg border bg-muted/30">
              <div className="h-12 w-12 rounded-lg bg-blue-500/10 flex items-center justify-center">
                <UtensilsCrossed className="h-6 w-6 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Dine-in</p>
                <p className="text-2xl font-bold">{stats?.todayTables || 0}</p>
              </div>
            </div>
            <div className="flex items-center gap-3 p-4 rounded-lg border bg-muted/30">
              <div className="h-12 w-12 rounded-lg bg-orange-500/10 flex items-center justify-center">
                <Package className="h-6 w-6 text-orange-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Parcel</p>
                <p className="text-2xl font-bold">{stats?.todayParcels || 0}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Payment Methods</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-3 gap-3">
            <PaymentCard
              method="Cash"
              amount={stats?.cashAmount || 0}
              icon={Wallet}
              color="bg-green-600"
              isLoading={statsLoading}
            />
            <PaymentCard
              method="Card"
              amount={stats?.cardAmount || 0}
              icon={CreditCard}
              color="bg-blue-600"
              isLoading={statsLoading}
            />
            <PaymentCard
              method="UPI"
              amount={stats?.upiAmount || 0}
              icon={Smartphone}
              color="bg-purple-600"
              isLoading={statsLoading}
            />
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Hourly Sales</CardTitle>
          </CardHeader>
          <CardContent>
            {hourlyLoading ? (
              <Skeleton className="h-[250px] w-full" />
            ) : (
              <ResponsiveContainer width="100%" height={250}>
                <AreaChart data={chartData}>
                  <defs>
                    <linearGradient id="salesGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis 
                    dataKey="hour" 
                    tick={{ fontSize: 10 }} 
                    tickLine={false}
                    axisLine={false}
                  />
                  <YAxis 
                    tick={{ fontSize: 10 }} 
                    tickLine={false}
                    axisLine={false}
                    tickFormatter={(v) => `₹${v >= 1000 ? `${(v/1000).toFixed(0)}k` : v}`}
                  />
                  <Tooltip 
                    formatter={(value: number) => [formatCurrency(value), 'Sales']}
                    contentStyle={{ 
                      backgroundColor: 'hsl(var(--card))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px',
                    }}
                  />
                  <Area
                    type="monotone"
                    dataKey="sales"
                    stroke="hsl(var(--primary))"
                    strokeWidth={2}
                    fill="url(#salesGradient)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Orders by Hour</CardTitle>
          </CardHeader>
          <CardContent>
            {hourlyLoading ? (
              <Skeleton className="h-[250px] w-full" />
            ) : (
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis 
                    dataKey="hour" 
                    tick={{ fontSize: 10 }} 
                    tickLine={false}
                    axisLine={false}
                  />
                  <YAxis 
                    tick={{ fontSize: 10 }} 
                    tickLine={false}
                    axisLine={false}
                  />
                  <Tooltip 
                    formatter={(value: number) => [value, 'Orders']}
                    contentStyle={{ 
                      backgroundColor: 'hsl(var(--card))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px',
                    }}
                  />
                  <Bar 
                    dataKey="orders" 
                    fill="hsl(var(--primary))"
                    radius={[4, 4, 0, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Recent Orders */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Recent Orders</CardTitle>
        </CardHeader>
        <CardContent>
          {ordersLoading ? (
            <div className="space-y-3">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : (
            <div className="space-y-2">
              {(recentOrders || []).map((order) => (
                <div 
                  key={order.id}
                  className="flex items-center justify-between p-3 rounded-lg border bg-card hover:bg-muted/50 transition-colors"
                >
                  <div className="flex items-center gap-4">
                    <div className="h-10 w-10 rounded-lg bg-muted flex items-center justify-center">
                      {order.type === 'table' ? (
                        <UtensilsCrossed className="h-5 w-5 text-muted-foreground" />
                      ) : (
                        <Package className="h-5 w-5 text-muted-foreground" />
                      )}
                    </div>
                    <div>
                      <p className="font-medium">{order.billNumber}</p>
                      <p className="text-sm text-muted-foreground">
                        {order.type === 'table' ? `Table ${order.tableNumber}` : 'Parcel'} • {format(new Date(order.createdAt), 'hh:mm a')}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <Badge variant={
                      order.status === 'settled' ? 'default' :
                      order.status === 'active' ? 'secondary' : 'destructive'
                    }>
                      {order.status}
                    </Badge>
                    <span className="font-semibold w-24 text-right">
                      {formatCurrency(order.amount)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
