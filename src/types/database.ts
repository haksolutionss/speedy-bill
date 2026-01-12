// Database types matching Supabase schema
// Note: Using string types for enum columns to match Supabase response

export interface DbTableSection {
  id: string;
  name: string;
  display_order: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface DbTable {
  id: string;
  section_id: string;
  number: string;
  capacity: number;
  status: string;
  current_bill_id: string | null;
  current_amount: number | null;
  display_order: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export type TableStatus = 'available' | 'occupied' | 'reserved' | 'maintenance';

export interface DbCategory {
  id: string;
  name: string;
  display_order: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface DbProduct {
  id: string;
  code: string;
  name: string;
  category_id: string;
  description: string | null;
  gst_rate: number;
  is_active: boolean;
  display_order: number;
  created_at: string;
  updated_at: string;
}

export interface DbProductPortion {
  id: string;
  product_id: string;
  size: string;
  price: number;
  section_prices: Record<string, number>;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export type PortionSize = 'full' | 'half' | 'quarter' | 'single';

export interface DbCustomer {
  id: string;
  name: string;
  phone: string;
  email: string | null;
  loyalty_points: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface DbBill {
  id: string;
  bill_number: string;
  type: string;
  table_id: string | null;
  table_number: string | null;
  token_number: number | null;
  sub_total: number;
  discount_type: string | null;
  discount_value: number | null;
  discount_reason: string | null;
  discount_amount: number;
  cgst_amount: number;
  sgst_amount: number;
  total_amount: number;
  final_amount: number;
  cover_count: number | null;
  customer_id: string | null;
  status: string;
  payment_method: string | null;
  created_at: string;
  updated_at: string;
  settled_at: string | null;
}

export type BillType = 'table' | 'parcel';
export type BillStatus = 'active' | 'settled' | 'unsettled' | 'cancelled';
export type PaymentMethod = 'cash' | 'card' | 'upi' | 'split';

export interface DbBillItem {
  id: string;
  bill_id: string;
  product_id: string;
  product_name: string;
  product_code: string;
  portion: string;
  quantity: number;
  unit_price: number;
  gst_rate: number;
  notes: string | null;
  sent_to_kitchen: boolean;
  kot_printed_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface DbPaymentDetail {
  id: string;
  bill_id: string;
  method: string;
  amount: number;
  created_at: string;
}

export interface DbKotHistory {
  id: string;
  bill_id: string;
  kot_number: string;
  table_number: string | null;
  token_number: number | null;
  printed_at: string;
}

export interface DbSettings {
  id: string;
  key: string;
  value: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

// Aggregated types for frontend use
export interface ProductWithPortions extends DbProduct {
  portions: DbProductPortion[];
  category?: DbCategory;
}

export interface TableWithSection extends DbTable {
  section?: DbTableSection;
}

export interface BillWithItems extends DbBill {
  items: DbBillItem[];
  payment_details?: DbPaymentDetail[];
  table?: DbTable;
  customer?: DbCustomer;
}

export interface TableSectionWithTables extends DbTableSection {
  tables: DbTable[];
}
