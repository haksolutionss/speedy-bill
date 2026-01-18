export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      bill_items: {
        Row: {
          bill_id: string
          created_at: string
          gst_rate: number
          id: string
          kot_printed_at: string | null
          notes: string | null
          portion: string
          product_code: string
          product_id: string
          product_name: string
          quantity: number
          sent_to_kitchen: boolean
          unit_price: number
          updated_at: string
        }
        Insert: {
          bill_id: string
          created_at?: string
          gst_rate: number
          id?: string
          kot_printed_at?: string | null
          notes?: string | null
          portion: string
          product_code: string
          product_id: string
          product_name: string
          quantity?: number
          sent_to_kitchen?: boolean
          unit_price: number
          updated_at?: string
        }
        Update: {
          bill_id?: string
          created_at?: string
          gst_rate?: number
          id?: string
          kot_printed_at?: string | null
          notes?: string | null
          portion?: string
          product_code?: string
          product_id?: string
          product_name?: string
          quantity?: number
          sent_to_kitchen?: boolean
          unit_price?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "bill_items_bill_id_fkey"
            columns: ["bill_id"]
            isOneToOne: false
            referencedRelation: "bills"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bill_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      bills: {
        Row: {
          bill_number: string
          cgst_amount: number
          cover_count: number | null
          created_at: string
          customer_id: string | null
          discount_amount: number
          discount_reason: string | null
          discount_type: string | null
          discount_value: number | null
          final_amount: number
          id: string
          payment_method: string | null
          settled_at: string | null
          sgst_amount: number
          status: string
          sub_total: number
          table_id: string | null
          table_number: string | null
          token_number: number | null
          total_amount: number
          type: string
          updated_at: string
        }
        Insert: {
          bill_number: string
          cgst_amount?: number
          cover_count?: number | null
          created_at?: string
          customer_id?: string | null
          discount_amount?: number
          discount_reason?: string | null
          discount_type?: string | null
          discount_value?: number | null
          final_amount?: number
          id?: string
          payment_method?: string | null
          settled_at?: string | null
          sgst_amount?: number
          status?: string
          sub_total?: number
          table_id?: string | null
          table_number?: string | null
          token_number?: number | null
          total_amount?: number
          type: string
          updated_at?: string
        }
        Update: {
          bill_number?: string
          cgst_amount?: number
          cover_count?: number | null
          created_at?: string
          customer_id?: string | null
          discount_amount?: number
          discount_reason?: string | null
          discount_type?: string | null
          discount_value?: number | null
          final_amount?: number
          id?: string
          payment_method?: string | null
          settled_at?: string | null
          sgst_amount?: number
          status?: string
          sub_total?: number
          table_id?: string | null
          table_number?: string | null
          token_number?: number | null
          total_amount?: number
          type?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "bills_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bills_table_id_fkey"
            columns: ["table_id"]
            isOneToOne: false
            referencedRelation: "tables"
            referencedColumns: ["id"]
          },
        ]
      }
      cart_items: {
        Row: {
          created_at: string
          gst_rate: number
          id: string
          kot_printed_at: string | null
          notes: string | null
          portion: string
          product_code: string
          product_id: string
          product_name: string
          quantity: number
          sent_to_kitchen: boolean
          table_id: string
          unit_price: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          gst_rate?: number
          id?: string
          kot_printed_at?: string | null
          notes?: string | null
          portion: string
          product_code: string
          product_id: string
          product_name: string
          quantity?: number
          sent_to_kitchen?: boolean
          table_id: string
          unit_price: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          gst_rate?: number
          id?: string
          kot_printed_at?: string | null
          notes?: string | null
          portion?: string
          product_code?: string
          product_id?: string
          product_name?: string
          quantity?: number
          sent_to_kitchen?: boolean
          table_id?: string
          unit_price?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "cart_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cart_items_table_id_fkey"
            columns: ["table_id"]
            isOneToOne: false
            referencedRelation: "tables"
            referencedColumns: ["id"]
          },
        ]
      }
      categories: {
        Row: {
          created_at: string
          display_order: number
          id: string
          is_active: boolean
          name: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          display_order?: number
          id?: string
          is_active?: boolean
          name: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          display_order?: number
          id?: string
          is_active?: boolean
          name?: string
          updated_at?: string
        }
        Relationships: []
      }
      customers: {
        Row: {
          created_at: string
          email: string | null
          id: string
          is_active: boolean
          loyalty_points: number
          name: string
          phone: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          email?: string | null
          id?: string
          is_active?: boolean
          loyalty_points?: number
          name: string
          phone: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          email?: string | null
          id?: string
          is_active?: boolean
          loyalty_points?: number
          name?: string
          phone?: string
          updated_at?: string
        }
        Relationships: []
      }
      kot_history: {
        Row: {
          bill_id: string
          id: string
          kot_number: string
          printed_at: string
          table_number: string | null
          token_number: number | null
        }
        Insert: {
          bill_id: string
          id?: string
          kot_number: string
          printed_at?: string
          table_number?: string | null
          token_number?: number | null
        }
        Update: {
          bill_id?: string
          id?: string
          kot_number?: string
          printed_at?: string
          table_number?: string | null
          token_number?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "kot_history_bill_id_fkey"
            columns: ["bill_id"]
            isOneToOne: false
            referencedRelation: "bills"
            referencedColumns: ["id"]
          },
        ]
      }
      payment_details: {
        Row: {
          amount: number
          bill_id: string
          created_at: string
          id: string
          method: string
        }
        Insert: {
          amount: number
          bill_id: string
          created_at?: string
          id?: string
          method: string
        }
        Update: {
          amount?: number
          bill_id?: string
          created_at?: string
          id?: string
          method?: string
        }
        Relationships: [
          {
            foreignKeyName: "payment_details_bill_id_fkey"
            columns: ["bill_id"]
            isOneToOne: false
            referencedRelation: "bills"
            referencedColumns: ["id"]
          },
        ]
      }
      print_jobs: {
        Row: {
          agent_id: string | null
          created_at: string
          error_message: string | null
          id: string
          job_type: string
          payload: Json
          printer_role: string
          processed_at: string | null
          status: string
        }
        Insert: {
          agent_id?: string | null
          created_at?: string
          error_message?: string | null
          id?: string
          job_type: string
          payload: Json
          printer_role?: string
          processed_at?: string | null
          status?: string
        }
        Update: {
          agent_id?: string | null
          created_at?: string
          error_message?: string | null
          id?: string
          job_type?: string
          payload?: Json
          printer_role?: string
          processed_at?: string | null
          status?: string
        }
        Relationships: []
      }
      printers: {
        Row: {
          created_at: string
          format: string
          id: string
          ip_address: string | null
          is_active: boolean
          is_default: boolean
          name: string
          port: number | null
          role: string
          type: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          format?: string
          id?: string
          ip_address?: string | null
          is_active?: boolean
          is_default?: boolean
          name: string
          port?: number | null
          role?: string
          type?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          format?: string
          id?: string
          ip_address?: string | null
          is_active?: boolean
          is_default?: boolean
          name?: string
          port?: number | null
          role?: string
          type?: string
          updated_at?: string
        }
        Relationships: []
      }
      product_portions: {
        Row: {
          created_at: string
          id: string
          is_active: boolean
          price: number
          product_id: string
          section_prices: Json | null
          size: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_active?: boolean
          price: number
          product_id: string
          section_prices?: Json | null
          size: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          is_active?: boolean
          price?: number
          product_id?: string
          section_prices?: Json | null
          size?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "product_portions_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      products: {
        Row: {
          category_id: string
          code: string
          created_at: string
          description: string | null
          display_order: number
          gst_rate: number
          id: string
          is_active: boolean
          name: string
          updated_at: string
        }
        Insert: {
          category_id: string
          code: string
          created_at?: string
          description?: string | null
          display_order?: number
          gst_rate?: number
          id?: string
          is_active?: boolean
          name: string
          updated_at?: string
        }
        Update: {
          category_id?: string
          code?: string
          created_at?: string
          description?: string | null
          display_order?: number
          gst_rate?: number
          id?: string
          is_active?: boolean
          name?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "products_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
        ]
      }
      settings: {
        Row: {
          created_at: string
          id: string
          key: string
          updated_at: string
          value: Json
        }
        Insert: {
          created_at?: string
          id?: string
          key: string
          updated_at?: string
          value?: Json
        }
        Update: {
          created_at?: string
          id?: string
          key?: string
          updated_at?: string
          value?: Json
        }
        Relationships: []
      }
      staff_permissions: {
        Row: {
          can_access_billing: boolean
          can_access_customers: boolean
          can_access_history: boolean
          can_access_products: boolean
          can_access_reports: boolean
          can_access_settings: boolean
          can_access_staff: boolean
          can_access_tables: boolean
          created_at: string
          id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          can_access_billing?: boolean
          can_access_customers?: boolean
          can_access_history?: boolean
          can_access_products?: boolean
          can_access_reports?: boolean
          can_access_settings?: boolean
          can_access_staff?: boolean
          can_access_tables?: boolean
          created_at?: string
          id?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          can_access_billing?: boolean
          can_access_customers?: boolean
          can_access_history?: boolean
          can_access_products?: boolean
          can_access_reports?: boolean
          can_access_settings?: boolean
          can_access_staff?: boolean
          can_access_tables?: boolean
          created_at?: string
          id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "staff_permissions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      table_sections: {
        Row: {
          created_at: string
          display_order: number
          id: string
          is_active: boolean
          name: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          display_order?: number
          id?: string
          is_active?: boolean
          name: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          display_order?: number
          id?: string
          is_active?: boolean
          name?: string
          updated_at?: string
        }
        Relationships: []
      }
      tables: {
        Row: {
          capacity: number
          created_at: string
          current_amount: number | null
          current_bill_id: string | null
          display_order: number
          id: string
          is_active: boolean
          number: string
          section_id: string
          status: string
          updated_at: string
        }
        Insert: {
          capacity?: number
          created_at?: string
          current_amount?: number | null
          current_bill_id?: string | null
          display_order?: number
          id?: string
          is_active?: boolean
          number: string
          section_id: string
          status?: string
          updated_at?: string
        }
        Update: {
          capacity?: number
          created_at?: string
          current_amount?: number | null
          current_bill_id?: string | null
          display_order?: number
          id?: string
          is_active?: boolean
          number?: string
          section_id?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "tables_section_id_fkey"
            columns: ["section_id"]
            isOneToOne: false
            referencedRelation: "table_sections"
            referencedColumns: ["id"]
          },
        ]
      }
      user_preferences: {
        Row: {
          created_at: string
          id: string
          key: string
          updated_at: string
          user_id: string
          value: Json
        }
        Insert: {
          created_at?: string
          id?: string
          key: string
          updated_at?: string
          user_id: string
          value?: Json
        }
        Update: {
          created_at?: string
          id?: string
          key?: string
          updated_at?: string
          user_id?: string
          value?: Json
        }
        Relationships: [
          {
            foreignKeyName: "user_preferences_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_roles_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      users: {
        Row: {
          created_at: string
          id: string
          is_active: boolean
          mobile: string
          name: string | null
          pin_hash: string
          role: string
          session_expires_at: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_active?: boolean
          mobile: string
          name?: string | null
          pin_hash: string
          role?: string
          session_expires_at?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          is_active?: boolean
          mobile?: string
          name?: string | null
          pin_hash?: string
          role?: string
          session_expires_at?: string | null
          updated_at?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      cleanup_old_print_jobs: { Args: never; Returns: undefined }
      generate_bill_number: { Args: never; Returns: string }
      generate_kot_number: { Args: never; Returns: string }
      generate_token_number: { Args: never; Returns: number }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "admin" | "manager" | "staff"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_role: ["admin", "manager", "staff"],
    },
  },
} as const
