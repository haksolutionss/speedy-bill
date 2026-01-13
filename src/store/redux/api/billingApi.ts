import { createApi, fakeBaseQuery } from '@reduxjs/toolkit/query/react';
import { supabase } from '@/integrations/supabase/client';
import { parseSupabaseError } from '@/lib/errorUtils';
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

// Cache time: 1 hour in seconds
const ONE_HOUR = 60 * 60;

export const billingApi = createApi({
  reducerPath: 'billingApi',
  baseQuery: fakeBaseQuery(),
  tagTypes: ['TableSections', 'Tables', 'Categories', 'Products', 'Bills', 'BillItems', 'Customers'],
  // Keep unused data for 1 hour before refetching
  keepUnusedDataFor: ONE_HOUR,
  // Refetch on mount after 1 hour
  refetchOnMountOrArgChange: ONE_HOUR,
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
          return { error: { message: parseSupabaseError(error, { entityType: 'section', fieldName: 'name' }) } };
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
          return { error: { message: parseSupabaseError(error, { entityType: 'section', fieldName: 'name' }) } };
        }
      },
      invalidatesTags: ['TableSections'],
    }),

    deleteTableSection: builder.mutation<void, string>({
      queryFn: async (id) => {
        try {
          // Soft delete - set is_active to false
          const { error } = await supabase
            .from('table_sections')
            .update({ is_active: false })
            .eq('id', id);
          if (error) throw error;
          return { data: undefined };
        } catch (error) {
          return { error: { message: (error as Error).message } };
        }
      },
      invalidatesTags: ['TableSections', 'Tables'],
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
          return { error: { message: parseSupabaseError(error, { entityType: 'table', fieldName: 'number' }) } };
        }
      },
      invalidatesTags: ['Tables', 'TableSections'],
    }),

    createTable: builder.mutation<DbTable, { section_id: string; number: string; capacity?: number; status?: string }>({
      queryFn: async (table) => {
        try {
          const { data, error } = await supabase
            .from('tables')
            .insert([table])
            .select()
            .single();

          if (error) throw error;
          console.log("error", error)
          return { data: data as DbTable };
        } catch (error) {
          console.log("error", error)
          return { error: { message: parseSupabaseError(error, { entityType: 'table', fieldName: 'number' }) } };
        }
      },
      invalidatesTags: ['Tables', 'TableSections'],
    }),

    deleteTable: builder.mutation<void, string>({
      queryFn: async (id) => {
        try {
          // Soft delete - set is_active to false
          const { error } = await supabase
            .from('tables')
            .update({ is_active: false })
            .eq('id', id);
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
          return { error: { message: parseSupabaseError(error, { entityType: 'category', fieldName: 'name' }) } };
        }
      },
      invalidatesTags: ['Categories', 'Products'],
    }),

    updateCategory: builder.mutation<DbCategory, { id: string; updates: Partial<DbCategory> }>({
      queryFn: async ({ id, updates }) => {
        try {
          const { data, error } = await supabase
            .from('categories')
            .update(updates)
            .eq('id', id)
            .select()
            .single();
          if (error) throw error;
          return { data: data as DbCategory };
        } catch (error) {
          return { error: { message: parseSupabaseError(error, { entityType: 'category', fieldName: 'name' }) } };
        }
      },
      invalidatesTags: ['Categories', 'Products'],
    }),

    deleteCategory: builder.mutation<void, string>({
      queryFn: async (id) => {
        try {
          // Soft delete
          const { error } = await supabase
            .from('categories')
            .update({ is_active: false })
            .eq('id', id);
          if (error) throw error;
          return { data: undefined };
        } catch (error) {
          return { error: { message: (error as Error).message } };
        }
      },
      invalidatesTags: ['Categories', 'Products'],
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

    createProduct: builder.mutation<DbProduct, {
      product: { name: string; code: string; category_id: string; description?: string; gst_rate: number };
      portions: { size: string; price: number; section_prices?: Record<string, number> }[]
    }>({
      queryFn: async ({ product, portions }) => {
        try {
          const { data: newProduct, error: productError } = await supabase
            .from('products')
            .insert([product])
            .select()
            .single();

          if (productError) throw productError;

          if (portions.length > 0) {
            const portionsWithProductId = portions.map((p) => ({
              size: p.size,
              price: p.price,
              section_prices: p.section_prices || {},
              product_id: newProduct.id
            }));
            const { error: portionsError } = await supabase.from('product_portions').insert(portionsWithProductId as any);
            if (portionsError) throw portionsError;
          }

          return { data: newProduct as DbProduct };
        } catch (error) {
          return { error: { message: parseSupabaseError(error, { entityType: 'product' }) } };
        }
      },
      invalidatesTags: ['Products'],
    }),

    updateProduct: builder.mutation<DbProduct, {
      id: string;
      product: Partial<DbProduct>;
      portions?: { id?: string; size: string; price: number; section_prices?: Record<string, number> }[]
    }>({
      queryFn: async ({ id, product, portions }) => {
        try {
          const { data: updatedProduct, error: productError } = await supabase
            .from('products')
            .update(product)
            .eq('id', id)
            .select()
            .single();

          if (productError) throw productError;

          if (portions) {
            // Soft delete existing portions
            await supabase
              .from('product_portions')
              .update({ is_active: false })
              .eq('product_id', id);

            // Insert new portions
            if (portions.length > 0) {
              const portionsWithProductId = portions.map((p) => ({
                size: p.size,
                price: p.price,
                section_prices: p.section_prices || {},
                product_id: id,
                is_active: true
              }));
              const { error: portionsError } = await supabase.from('product_portions').insert(portionsWithProductId as any);
              if (portionsError) throw portionsError;
            }
          }

          return { data: updatedProduct as DbProduct };
        } catch (error) {
          return { error: { message: parseSupabaseError(error, { entityType: 'product' }) } };
        }
      },
      invalidatesTags: ['Products'],
    }),

    deleteProduct: builder.mutation<void, string>({
      queryFn: async (id) => {
        try {
          // Soft delete product
          const { error: productError } = await supabase
            .from('products')
            .update({ is_active: false })
            .eq('id', id);
          if (productError) throw productError;

          // Soft delete portions
          await supabase
            .from('product_portions')
            .update({ is_active: false })
            .eq('product_id', id);

          return { data: undefined };
        } catch (error) {
          return { error: { message: (error as Error).message } };
        }
      },
      invalidatesTags: ['Products'],
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
  useDeleteTableSectionMutation,
  useUpdateTableMutation,
  useCreateTableMutation,
  useDeleteTableMutation,
  useGetCategoriesQuery,
  useCreateCategoryMutation,
  useUpdateCategoryMutation,
  useDeleteCategoryMutation,
  useGetProductsQuery,
  useCreateProductMutation,
  useUpdateProductMutation,
  useDeleteProductMutation,
  useGetBillsQuery,
  useGetActiveBillsQuery,
  useCreateBillMutation,
  useUpdateBillMutation,
  useMarkItemsAsKOTMutation,
  useGetCustomersQuery,
  useAddPaymentDetailsMutation,
} = billingApi;
