import { createApi, fakeBaseQuery } from '@reduxjs/toolkit/query/react';
import { supabase } from '@/integrations/supabase/client';
import type { BillWithItems } from '@/types/database';

export interface DashboardStats {
  todaySales: number;
  todayOrders: number;
  activeOrders: number;
  avgOrderValue: number;
  todayTables: number;
  todayParcels: number;
  cashAmount: number;
  cardAmount: number;
  upiAmount: number;
  previousDaySales: number;
  salesGrowth: number;
}

export interface HourlySales {
  hour: number;
  sales: number;
  orders: number;
}

export interface RecentOrder {
  id: string;
  billNumber: string;
  tableNumber: string | null;
  amount: number;
  status: string;
  paymentMethod: string | null;
  createdAt: string;
  type: string;
}

export interface CategorySales {
  category: string;
  sales: number;
  quantity: number;
}

export interface ItemSales {
  productName: string;
  productCode: string;
  portion: string;
  quantity: number;
  revenue: number;
  avgPrice: number;
}

export interface TableSales {
  tableNumber: string;
  orders: number;
  revenue: number;
  avgOrderValue: number;
}

export interface PaymentModeSummary {
  method: string;
  count: number;
  amount: number;
  percentage: number;
}

export interface GSTReport {
  billNumber: string;
  date: string;
  subTotal: number;
  cgst: number;
  sgst: number;
  totalGst: number;
  finalAmount: number;
}

export interface KOTReport {
  kotNumber: string;
  billNumber: string;
  tableNumber: string | null;
  tokenNumber: number | null;
  items: { name: string; quantity: number; notes: string | null }[];
  printedAt: string;
}

export interface PeakHoursData {
  hour: number;
  orderCount: number;
  revenue: number;
  avgOrderValue: number;
}

export interface DateRangeParams {
  startDate: string;
  endDate: string;
}

export const reportsApi = createApi({
  reducerPath: 'reportsApi',
  baseQuery: fakeBaseQuery(),
  tagTypes: ['Dashboard', 'Reports'],
  endpoints: (builder) => ({
    // Dashboard Stats
    getDashboardStats: builder.query<DashboardStats, void>({
      queryFn: async () => {
        try {
          const today = new Date();
          const startOfToday = new Date(today.getFullYear(), today.getMonth(), today.getDate()).toISOString();
          const endOfToday = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 23, 59, 59).toISOString();
          
          const yesterday = new Date(today);
          yesterday.setDate(yesterday.getDate() - 1);
          const startOfYesterday = new Date(yesterday.getFullYear(), yesterday.getMonth(), yesterday.getDate()).toISOString();
          const endOfYesterday = new Date(yesterday.getFullYear(), yesterday.getMonth(), yesterday.getDate(), 23, 59, 59).toISOString();

          // Today's bills
          const { data: todayBills, error: todayError } = await supabase
            .from('bills')
            .select('*')
            .gte('created_at', startOfToday)
            .lte('created_at', endOfToday);

          if (todayError) throw todayError;

          // Yesterday's bills for comparison
          const { data: yesterdayBills, error: yesterdayError } = await supabase
            .from('bills')
            .select('final_amount')
            .eq('status', 'settled')
            .gte('created_at', startOfYesterday)
            .lte('created_at', endOfYesterday);

          if (yesterdayError) throw yesterdayError;

          // Payment details for today (from payment_details table)
          const { data: payments, error: paymentsError } = await supabase
            .from('payment_details')
            .select('method, amount')
            .gte('created_at', startOfToday)
            .lte('created_at', endOfToday);

          if (paymentsError) throw paymentsError;

          const settledBills = (todayBills || []).filter(b => b.status === 'settled');
          const todaySales = settledBills.reduce((sum, b) => sum + (b.final_amount || 0), 0);
          const previousDaySales = (yesterdayBills || []).reduce((sum, b) => sum + (b.final_amount || 0), 0);
          const salesGrowth = previousDaySales > 0 ? ((todaySales - previousDaySales) / previousDaySales) * 100 : 0;

          // Calculate payment amounts - first try payment_details table
          let cashAmount = (payments || []).filter(p => p.method === 'cash').reduce((sum, p) => sum + p.amount, 0);
          let cardAmount = (payments || []).filter(p => p.method === 'card').reduce((sum, p) => sum + p.amount, 0);
          let upiAmount = (payments || []).filter(p => p.method === 'upi').reduce((sum, p) => sum + p.amount, 0);

          // If payment_details is empty, fall back to aggregating from bills.payment_method
          if (!payments || payments.length === 0) {
            settledBills.forEach(bill => {
              if (bill.payment_method === 'cash') {
                cashAmount += bill.final_amount || 0;
              } else if (bill.payment_method === 'card') {
                cardAmount += bill.final_amount || 0;
              } else if (bill.payment_method === 'upi') {
                upiAmount += bill.final_amount || 0;
              }
            });
          }

          const stats: DashboardStats = {
            todaySales,
            todayOrders: settledBills.length,
            activeOrders: (todayBills || []).filter(b => b.status === 'active').length,
            avgOrderValue: settledBills.length > 0 ? todaySales / settledBills.length : 0,
            todayTables: (todayBills || []).filter(b => b.type === 'table').length,
            todayParcels: (todayBills || []).filter(b => b.type === 'parcel').length,
            cashAmount,
            cardAmount,
            upiAmount,
            previousDaySales,
            salesGrowth,
          };

          return { data: stats };
        } catch (error) {
          return { error: { message: (error as Error).message } };
        }
      },
      providesTags: ['Dashboard'],
    }),

    // Hourly sales for today
    getHourlySales: builder.query<HourlySales[], void>({
      queryFn: async () => {
        try {
          const today = new Date();
          const startOfToday = new Date(today.getFullYear(), today.getMonth(), today.getDate()).toISOString();
          const endOfToday = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 23, 59, 59).toISOString();

          const { data: bills, error } = await supabase
            .from('bills')
            .select('created_at, final_amount')
            .eq('status', 'settled')
            .gte('created_at', startOfToday)
            .lte('created_at', endOfToday);

          if (error) throw error;

          const hourlyData: HourlySales[] = Array.from({ length: 24 }, (_, i) => ({
            hour: i,
            sales: 0,
            orders: 0,
          }));

          (bills || []).forEach((bill) => {
            const hour = new Date(bill.created_at).getHours();
            hourlyData[hour].sales += bill.final_amount || 0;
            hourlyData[hour].orders += 1;
          });

          return { data: hourlyData };
        } catch (error) {
          return { error: { message: (error as Error).message } };
        }
      },
      providesTags: ['Dashboard'],
    }),

    // Recent orders
    getRecentOrders: builder.query<RecentOrder[], number>({
      queryFn: async (limit = 10) => {
        try {
          const { data: bills, error } = await supabase
            .from('bills')
            .select('*')
            .order('created_at', { ascending: false })
            .limit(limit);

          if (error) throw error;

          const recentOrders: RecentOrder[] = (bills || []).map((bill) => ({
            id: bill.id,
            billNumber: bill.bill_number,
            tableNumber: bill.table_number,
            amount: bill.final_amount,
            status: bill.status,
            paymentMethod: bill.payment_method,
            createdAt: bill.created_at,
            type: bill.type,
          }));

          return { data: recentOrders };
        } catch (error) {
          return { error: { message: (error as Error).message } };
        }
      },
      providesTags: ['Dashboard'],
    }),

    // Sales Report with date range
    getSalesReport: builder.query<BillWithItems[], DateRangeParams>({
      queryFn: async ({ startDate, endDate }) => {
        try {
          const { data: bills, error: billsError } = await supabase
            .from('bills')
            .select('*')
            .gte('created_at', startDate)
            .lte('created_at', endDate)
            .order('created_at', { ascending: false });

          if (billsError) throw billsError;

          const billIds = (bills || []).map((b) => b.id);
          if (billIds.length === 0) return { data: [] };

          const { data: items, error: itemsError } = await supabase
            .from('bill_items')
            .select('*')
            .in('bill_id', billIds);

          if (itemsError) throw itemsError;

          const billsWithItems = (bills || []).map((bill) => ({
            ...bill,
            items: (items || []).filter((i) => i.bill_id === bill.id),
          })) as BillWithItems[];

          return { data: billsWithItems };
        } catch (error) {
          return { error: { message: (error as Error).message } };
        }
      },
      providesTags: ['Reports'],
    }),

    // Item-wise Sales Report
    getItemSalesReport: builder.query<ItemSales[], DateRangeParams>({
      queryFn: async ({ startDate, endDate }) => {
        try {
          const { data: bills, error: billsError } = await supabase
            .from('bills')
            .select('id')
            .eq('status', 'settled')
            .gte('created_at', startDate)
            .lte('created_at', endDate);

          if (billsError) throw billsError;

          const billIds = (bills || []).map((b) => b.id);
          if (billIds.length === 0) return { data: [] };

          const { data: items, error: itemsError } = await supabase
            .from('bill_items')
            .select('product_name, product_code, portion, quantity, unit_price')
            .in('bill_id', billIds);

          if (itemsError) throw itemsError;

          // Aggregate by product + portion
          const itemMap = new Map<string, ItemSales>();
          (items || []).forEach((item) => {
            const key = `${item.product_code}-${item.portion}`;
            if (itemMap.has(key)) {
              const existing = itemMap.get(key)!;
              existing.quantity += item.quantity;
              existing.revenue += item.quantity * item.unit_price;
            } else {
              itemMap.set(key, {
                productName: item.product_name,
                productCode: item.product_code,
                portion: item.portion,
                quantity: item.quantity,
                revenue: item.quantity * item.unit_price,
                avgPrice: item.unit_price,
              });
            }
          });

          const result = Array.from(itemMap.values()).sort((a, b) => b.revenue - a.revenue);
          return { data: result };
        } catch (error) {
          return { error: { message: (error as Error).message } };
        }
      },
      providesTags: ['Reports'],
    }),

    // Category-wise Sales Report
    getCategorySalesReport: builder.query<CategorySales[], DateRangeParams>({
      queryFn: async ({ startDate, endDate }) => {
        try {
          const { data: bills, error: billsError } = await supabase
            .from('bills')
            .select('id')
            .eq('status', 'settled')
            .gte('created_at', startDate)
            .lte('created_at', endDate);

          if (billsError) throw billsError;

          const billIds = (bills || []).map((b) => b.id);
          if (billIds.length === 0) return { data: [] };

          const { data: items, error: itemsError } = await supabase
            .from('bill_items')
            .select('product_id, quantity, unit_price')
            .in('bill_id', billIds);

          if (itemsError) throw itemsError;

          // Get products with categories
          const productIds = [...new Set((items || []).map((i) => i.product_id))];
          const { data: products, error: productsError } = await supabase
            .from('products')
            .select('id, category_id')
            .in('id', productIds);

          if (productsError) throw productsError;

          const { data: categories, error: categoriesError } = await supabase
            .from('categories')
            .select('id, name');

          if (categoriesError) throw categoriesError;

          // Build product to category map
          const productCategoryMap = new Map<string, string>();
          (products || []).forEach((p) => {
            const cat = (categories || []).find((c) => c.id === p.category_id);
            productCategoryMap.set(p.id, cat?.name || 'Uncategorized');
          });

          // Aggregate by category
          const categoryMap = new Map<string, CategorySales>();
          (items || []).forEach((item) => {
            const category = productCategoryMap.get(item.product_id) || 'Uncategorized';
            if (categoryMap.has(category)) {
              const existing = categoryMap.get(category)!;
              existing.quantity += item.quantity;
              existing.sales += item.quantity * item.unit_price;
            } else {
              categoryMap.set(category, {
                category,
                quantity: item.quantity,
                sales: item.quantity * item.unit_price,
              });
            }
          });

          const result = Array.from(categoryMap.values()).sort((a, b) => b.sales - a.sales);
          return { data: result };
        } catch (error) {
          return { error: { message: (error as Error).message } };
        }
      },
      providesTags: ['Reports'],
    }),

    // Table-wise Sales Report
    getTableSalesReport: builder.query<TableSales[], DateRangeParams>({
      queryFn: async ({ startDate, endDate }) => {
        try {
          const { data: bills, error } = await supabase
            .from('bills')
            .select('table_number, final_amount')
            .eq('type', 'table')
            .eq('status', 'settled')
            .not('table_number', 'is', null)
            .gte('created_at', startDate)
            .lte('created_at', endDate);

          if (error) throw error;

          // Aggregate by table
          const tableMap = new Map<string, { orders: number; revenue: number }>();
          (bills || []).forEach((bill) => {
            const tableNum = bill.table_number || 'Unknown';
            if (tableMap.has(tableNum)) {
              const existing = tableMap.get(tableNum)!;
              existing.orders += 1;
              existing.revenue += bill.final_amount || 0;
            } else {
              tableMap.set(tableNum, { orders: 1, revenue: bill.final_amount || 0 });
            }
          });

          const result: TableSales[] = Array.from(tableMap.entries())
            .map(([tableNumber, data]) => ({
              tableNumber,
              orders: data.orders,
              revenue: data.revenue,
              avgOrderValue: data.orders > 0 ? data.revenue / data.orders : 0,
            }))
            .sort((a, b) => b.revenue - a.revenue);

          return { data: result };
        } catch (error) {
          return { error: { message: (error as Error).message } };
        }
      },
      providesTags: ['Reports'],
    }),

    // Payment Mode Report
    getPaymentModeReport: builder.query<PaymentModeSummary[], DateRangeParams>({
      queryFn: async ({ startDate, endDate }) => {
        try {
          const { data: payments, error } = await supabase
            .from('payment_details')
            .select('method, amount')
            .gte('created_at', startDate)
            .lte('created_at', endDate);

          if (error) throw error;

          // Aggregate by method
          const methodMap = new Map<string, { count: number; amount: number }>();
          (payments || []).forEach((p) => {
            if (methodMap.has(p.method)) {
              const existing = methodMap.get(p.method)!;
              existing.count += 1;
              existing.amount += p.amount;
            } else {
              methodMap.set(p.method, { count: 1, amount: p.amount });
            }
          });

          const totalAmount = (payments || []).reduce((sum, p) => sum + p.amount, 0);
          const result: PaymentModeSummary[] = Array.from(methodMap.entries())
            .map(([method, data]) => ({
              method: method.toUpperCase(),
              count: data.count,
              amount: data.amount,
              percentage: totalAmount > 0 ? (data.amount / totalAmount) * 100 : 0,
            }))
            .sort((a, b) => b.amount - a.amount);

          return { data: result };
        } catch (error) {
          return { error: { message: (error as Error).message } };
        }
      },
      providesTags: ['Reports'],
    }),

    // GST Report
    getGSTReport: builder.query<GSTReport[], DateRangeParams>({
      queryFn: async ({ startDate, endDate }) => {
        try {
          const { data: bills, error } = await supabase
            .from('bills')
            .select('bill_number, created_at, sub_total, cgst_amount, sgst_amount, final_amount')
            .eq('status', 'settled')
            .gte('created_at', startDate)
            .lte('created_at', endDate)
            .order('created_at', { ascending: false });

          if (error) throw error;

          const result: GSTReport[] = (bills || []).map((bill) => ({
            billNumber: bill.bill_number,
            date: bill.created_at,
            subTotal: bill.sub_total,
            cgst: bill.cgst_amount,
            sgst: bill.sgst_amount,
            totalGst: bill.cgst_amount + bill.sgst_amount,
            finalAmount: bill.final_amount,
          }));

          return { data: result };
        } catch (error) {
          return { error: { message: (error as Error).message } };
        }
      },
      providesTags: ['Reports'],
    }),

    // KOT Report
    getKOTReport: builder.query<KOTReport[], DateRangeParams>({
      queryFn: async ({ startDate, endDate }) => {
        try {
          const { data: kotHistory, error: kotError } = await supabase
            .from('kot_history')
            .select('*')
            .gte('printed_at', startDate)
            .lte('printed_at', endDate)
            .order('printed_at', { ascending: false });

          if (kotError) throw kotError;

          const billIds = [...new Set((kotHistory || []).map((k) => k.bill_id))];
          if (billIds.length === 0) return { data: [] };

          const { data: bills, error: billsError } = await supabase
            .from('bills')
            .select('id, bill_number')
            .in('id', billIds);

          if (billsError) throw billsError;

          const { data: items, error: itemsError } = await supabase
            .from('bill_items')
            .select('bill_id, product_name, quantity, notes, kot_printed_at')
            .in('bill_id', billIds)
            .eq('sent_to_kitchen', true);

          if (itemsError) throw itemsError;

          const billNumberMap = new Map((bills || []).map((b) => [b.id, b.bill_number]));

          const result: KOTReport[] = (kotHistory || []).map((kot) => ({
            kotNumber: kot.kot_number,
            billNumber: billNumberMap.get(kot.bill_id) || 'Unknown',
            tableNumber: kot.table_number,
            tokenNumber: kot.token_number,
            items: (items || [])
              .filter((i) => i.bill_id === kot.bill_id)
              .map((i) => ({
                name: i.product_name,
                quantity: i.quantity,
                notes: i.notes,
              })),
            printedAt: kot.printed_at,
          }));

          return { data: result };
        } catch (error) {
          return { error: { message: (error as Error).message } };
        }
      },
      providesTags: ['Reports'],
    }),

    // Peak Hours Report
    getPeakHoursReport: builder.query<PeakHoursData[], DateRangeParams>({
      queryFn: async ({ startDate, endDate }) => {
        try {
          const { data: bills, error } = await supabase
            .from('bills')
            .select('created_at, final_amount')
            .eq('status', 'settled')
            .gte('created_at', startDate)
            .lte('created_at', endDate);

          if (error) throw error;

          const hourlyData: PeakHoursData[] = Array.from({ length: 24 }, (_, i) => ({
            hour: i,
            orderCount: 0,
            revenue: 0,
            avgOrderValue: 0,
          }));

          (bills || []).forEach((bill) => {
            const hour = new Date(bill.created_at).getHours();
            hourlyData[hour].orderCount += 1;
            hourlyData[hour].revenue += bill.final_amount || 0;
          });

          hourlyData.forEach((h) => {
            h.avgOrderValue = h.orderCount > 0 ? h.revenue / h.orderCount : 0;
          });

          return { data: hourlyData };
        } catch (error) {
          return { error: { message: (error as Error).message } };
        }
      },
      providesTags: ['Reports'],
    }),
  }),
});

export const {
  useGetDashboardStatsQuery,
  useGetHourlySalesQuery,
  useGetRecentOrdersQuery,
  useGetSalesReportQuery,
  useGetItemSalesReportQuery,
  useGetCategorySalesReportQuery,
  useGetTableSalesReportQuery,
  useGetPaymentModeReportQuery,
  useGetGSTReportQuery,
  useGetKOTReportQuery,
  useGetPeakHoursReportQuery,
} = reportsApi;
