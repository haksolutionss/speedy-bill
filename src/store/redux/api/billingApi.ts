import { createApi, fakeBaseQuery } from '@reduxjs/toolkit/query/react';
import { supabase } from '@/integrations/supabase/client';
import type {
  DbTableSection,
  DbTable,
  DbCategory,
  DbProduct,
  DbProductPortion,
  DbBill,
  DbBillItem,
  DbPaymentDetail,
  DbCustomer,
  TableSectionWithTables,
  ProductWithPortions,
  BillWithItems,
} from '@/types/database';

export const billingApi = createApi({
  reducerPath: 'billingApi',
  baseQuery: fakeBaseQuery(),
  tagTypes: ['TableSections', 'Tables', 'Categories', 'Products', 'Bills', 'BillItems', 'Customers'],
  endpoints: (builder) => ({
    // ============ TABLE SECTIONS ============
    getTableSections: builder.query<TableSectionWithTables[], void>({
      queryFn: async () => {
        try {
          const { data: sections, error: sectionsError } = await supabase
            .from('table_sections')
            .select('*')
            .eq('is_active', true)
            .order('display_order');

          if (sectionsError) throw sectionsError;

          const { data: tables, error: tablesError } = await supabase
            .from('tables')
            .select('*')
            .eq('is_active', true)
            .order('display_order');

          if (tablesError) throw tablesError;

          const sectionsWithTables = (sections || []).map((section) => ({
            ...section,
            tables: (tables || []).filter((t) => t.section_id === section.id),
          })) as TableSectionWithTables[];

          return { data: sectionsWithTables };
        } catch (error) {
          return { error: { message: (error as Error).message } };
        }
      },
      providesTags: ['TableSections', 'Tables'],
    }),

    createTableSection: builder.mutation<DbTableSection, { name: string; display_order?: number }>({
      queryFn: async (section) => {
        try {
          const { data, error } = await supabase
            .from('table_sections')
            .insert([section])
            .select()
            .single();

          if (error) throw error;
          return { data: data as DbTableSection };
        } catch (error) {
          return { error: { message: (error as Error).message } };
        }
      },
      invalidatesTags: ['TableSections'],
    }),

    updateTableSection: builder.mutation<DbTableSection, { id: string; updates: Partial<DbTableSection> }>({
      queryFn: async ({ id, updates }) => {
        try {
          const { data, error } = await supabase
            .from('table_sections')
            .update(updates)
            .eq('id', id)
            .select()
            .single();

          if (error) throw error;
          return { data: data as DbTableSection };
        } catch (error) {
          return { error: { message: (error as Error).message } };
        }
      },
      invalidatesTags: ['TableSections'],
    }),

    // ============ TABLES ============
    updateTable: builder.mutation<DbTable, { id: string; updates: Partial<DbTable> }>({
      queryFn: async ({ id, updates }) => {
        try {
          const { data, error } = await supabase
            .from('tables')
            .update(updates)
            .eq('id', id)
            .select()
            .single();

          if (error) throw error;
          return { data: data as DbTable };
        } catch (error) {
          return { error: { message: (error as Error).message } };
        }
      },
      invalidatesTags: ['Tables', 'TableSections'],
    }),

    createTable: builder.mutation<DbTable, { section_id: string; number: string; capacity?: number }>({
      queryFn: async (table) => {
        try {
          const { data, error } = await supabase
            .from('tables')
            .insert([table])
            .select()
            .single();

          if (error) throw error;
          return { data: data as DbTable };
        } catch (error) {
          return { error: { message: (error as Error).message } };
        }
      },
      invalidatesTags: ['Tables', 'TableSections'],
    }),

    deleteTable: builder.mutation<void, string>({
      queryFn: async (id) => {
        try {
          const { error } = await supabase.from('tables').delete().eq('id', id);
          if (error) throw error;
          return { data: undefined };
        } catch (error) {
          return { error: { message: (error as Error).message } };
        }
      },
      invalidatesTags: ['Tables', 'TableSections'],
    }),

    // ============ CATEGORIES ============
    getCategories: builder.query<DbCategory[], void>({
      queryFn: async () => {
        try {
          const { data, error } = await supabase
            .from('categories')
            .select('*')
            .eq('is_active', true)
            .order('display_order');

          if (error) throw error;
          return { data: (data || []) as DbCategory[] };
        } catch (error) {
          return { error: { message: (error as Error).message } };
        }
      },
      providesTags: ['Categories'],
    }),

    createCategory: builder.mutation<DbCategory, { name: string; display_order?: number }>({
      queryFn: async (category) => {
        try {
          const { data, error } = await supabase.from('categories').insert([category]).select().single();
          if (error) throw error;
          return { data: data as DbCategory };
        } catch (error) {
          return { error: { message: (error as Error).message } };
        }
      },
      invalidatesTags: ['Categories'],
    }),

    // ============ PRODUCTS ============
    getProducts: builder.query<ProductWithPortions[], void>({
      queryFn: async () => {
        try {
          const { data: products, error: productsError } = await supabase
            .from('products')
            .select('*')
            .eq('is_active', true)
            .order('display_order');

          if (productsError) throw productsError;

          const { data: portions, error: portionsError } = await supabase
            .from('product_portions')
            .select('*')
            .eq('is_active', true);

          if (portionsError) throw portionsError;

          const { data: categories, error: categoriesError } = await supabase.from('categories').select('*');

          if (categoriesError) throw categoriesError;

          const productsWithPortions = (products || []).map((product) => ({
            ...product,
            portions: (portions || []).filter((p) => p.product_id === product.id),
            category: (categories || []).find((c) => c.id === product.category_id),
          })) as ProductWithPortions[];

          return { data: productsWithPortions };
        } catch (error) {
          return { error: { message: (error as Error).message } };
        }
      },
      providesTags: ['Products', 'Categories'],
    }),

    // ============ BILLS ============
    getBills: builder.query<BillWithItems[], { status?: string; limit?: number }>({
      queryFn: async ({ status, limit = 100 }) => {
        try {
          let query = supabase.from('bills').select('*').order('created_at', { ascending: false }).limit(limit);

          if (status) {
            query = query.eq('status', status);
          }

          const { data: bills, error: billsError } = await query;
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
      providesTags: ['Bills', 'BillItems'],
    }),

    getActiveBills: builder.query<BillWithItems[], void>({
      queryFn: async () => {
        try {
          const { data: bills, error: billsError } = await supabase
            .from('bills')
            .select('*')
            .eq('status', 'active')
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
      providesTags: ['Bills', 'BillItems'],
    }),

    createBill: builder.mutation<DbBill, { bill: Record<string, unknown>; items: Record<string, unknown>[] }>({
      queryFn: async ({ bill, items }) => {
        try {
          const { data: billNumberData, error: billNumberError } = await supabase.rpc('generate_bill_number');
          if (billNumberError) throw billNumberError;

          const billWithNumber = { ...bill, bill_number: billNumberData };
          const { data: newBill, error: billError } = await supabase
            .from('bills')
            .insert([billWithNumber] as any)
            .select()
            .single();

          if (billError) throw billError;

          if (items.length > 0) {
            const itemsWithBillId = items.map((item) => ({ ...item, bill_id: newBill.id }));
            const { error: itemsError } = await supabase.from('bill_items').insert(itemsWithBillId as any);
            if (itemsError) throw itemsError;
          }

          return { data: newBill as DbBill };
        } catch (error) {
          return { error: { message: (error as Error).message } };
        }
      },
      invalidatesTags: ['Bills', 'BillItems', 'Tables', 'TableSections'],
    }),

    updateBill: builder.mutation<DbBill, { id: string; updates: Partial<DbBill> }>({
      queryFn: async ({ id, updates }) => {
        try {
          const { data, error } = await supabase.from('bills').update(updates).eq('id', id).select().single();
          if (error) throw error;
          return { data: data as DbBill };
        } catch (error) {
          return { error: { message: (error as Error).message } };
        }
      },
      invalidatesTags: ['Bills', 'Tables', 'TableSections'],
    }),

    // ============ BILL ITEMS ============
    markItemsAsKOT: builder.mutation<void, { billId: string; itemIds: string[] }>({
      queryFn: async ({ itemIds }) => {
        try {
          const { error } = await supabase
            .from('bill_items')
            .update({ sent_to_kitchen: true, kot_printed_at: new Date().toISOString() })
            .in('id', itemIds);

          if (error) throw error;
          return { data: undefined };
        } catch (error) {
          return { error: { message: (error as Error).message } };
        }
      },
      invalidatesTags: ['BillItems', 'Bills'],
    }),

    // ============ CUSTOMERS ============
    getCustomers: builder.query<DbCustomer[], void>({
      queryFn: async () => {
        try {
          const { data, error } = await supabase
            .from('customers')
            .select('*')
            .eq('is_active', true)
            .order('name');

          if (error) throw error;
          return { data: (data || []) as DbCustomer[] };
        } catch (error) {
          return { error: { message: (error as Error).message } };
        }
      },
      providesTags: ['Customers'],
    }),

    // ============ PAYMENT DETAILS ============
    addPaymentDetails: builder.mutation<void, { billId: string; payments: { method: string; amount: number }[] }>({
      queryFn: async ({ billId, payments }) => {
        try {
          const paymentsWithBillId = payments.map((p) => ({ ...p, bill_id: billId }));
          const { error } = await supabase.from('payment_details').insert(paymentsWithBillId as any);
          if (error) throw error;
          return { data: undefined };
        } catch (error) {
          return { error: { message: (error as Error).message } };
        }
      },
      invalidatesTags: ['Bills'],
    }),
  }),
});

export const {
  useGetTableSectionsQuery,
  useCreateTableSectionMutation,
  useUpdateTableSectionMutation,
  useUpdateTableMutation,
  useCreateTableMutation,
  useDeleteTableMutation,
  useGetCategoriesQuery,
  useCreateCategoryMutation,
  useGetProductsQuery,
  useGetBillsQuery,
  useGetActiveBillsQuery,
  useCreateBillMutation,
  useUpdateBillMutation,
  useMarkItemsAsKOTMutation,
  useGetCustomersQuery,
  useAddPaymentDetailsMutation,
} = billingApi;
