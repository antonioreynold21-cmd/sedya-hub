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
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      cash_requests: {
        Row: {
          amount: number
          created_at: string
          id: string
          notes: string | null
          pic: string | null
          purpose: string
          request_date: string
          status: string
          updated_at: string
        }
        Insert: {
          amount?: number
          created_at?: string
          id?: string
          notes?: string | null
          pic?: string | null
          purpose: string
          request_date?: string
          status?: string
          updated_at?: string
        }
        Update: {
          amount?: number
          created_at?: string
          id?: string
          notes?: string | null
          pic?: string | null
          purpose?: string
          request_date?: string
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      clients: {
        Row: {
          contact_person: string | null
          created_at: string
          id: string
          name: string
          notes: string | null
          phone: string | null
          pic: string | null
          status: string
          updated_at: string
        }
        Insert: {
          contact_person?: string | null
          created_at?: string
          id?: string
          name: string
          notes?: string | null
          phone?: string | null
          pic?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          contact_person?: string | null
          created_at?: string
          id?: string
          name?: string
          notes?: string | null
          phone?: string | null
          pic?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      expenses: {
        Row: {
          amount: number
          category: string
          created_at: string
          description: string
          expense_date: string
          id: string
          pic: string | null
          status: string
          updated_at: string
        }
        Insert: {
          amount?: number
          category?: string
          created_at?: string
          description: string
          expense_date?: string
          id?: string
          pic?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          amount?: number
          category?: string
          created_at?: string
          description?: string
          expense_date?: string
          id?: string
          pic?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      module_access: {
        Row: {
          created_at: string
          id: string
          module: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          module: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          module?: string
          user_id?: string
        }
        Relationships: []
      }
      order_items: {
        Row: {
          created_at: string
          id: string
          item_name: string
          order_id: string
          position: number
          price: number
          qty: number
          unit: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          item_name: string
          order_id: string
          position?: number
          price?: number
          qty?: number
          unit?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          item_name?: string
          order_id?: string
          position?: number
          price?: number
          qty?: number
          unit?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "order_items_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      orders: {
        Row: {
          client_address: string | null
          client_id: string | null
          client_name: string
          created_at: string
          created_by: string | null
          due_date: string | null
          id: string
          invoice_date: string | null
          invoice_number: string | null
          notes: string | null
          po_number: string | null
          section: string | null
          updated_at: string
        }
        Insert: {
          client_address?: string | null
          client_id?: string | null
          client_name: string
          created_at?: string
          created_by?: string | null
          due_date?: string | null
          id?: string
          invoice_date?: string | null
          invoice_number?: string | null
          notes?: string | null
          po_number?: string | null
          section?: string | null
          updated_at?: string
        }
        Update: {
          client_address?: string | null
          client_id?: string | null
          client_name?: string
          created_at?: string
          created_by?: string | null
          due_date?: string | null
          id?: string
          invoice_date?: string | null
          invoice_number?: string | null
          notes?: string | null
          po_number?: string | null
          section?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "orders_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      payables: {
        Row: {
          amount: number
          created_at: string
          due_date: string | null
          id: string
          invoice_date: string | null
          invoice_no: string | null
          notes: string | null
          pic: string | null
          status: string
          updated_at: string
          vendor: string
        }
        Insert: {
          amount?: number
          created_at?: string
          due_date?: string | null
          id?: string
          invoice_date?: string | null
          invoice_no?: string | null
          notes?: string | null
          pic?: string | null
          status?: string
          updated_at?: string
          vendor: string
        }
        Update: {
          amount?: number
          created_at?: string
          due_date?: string | null
          id?: string
          invoice_date?: string | null
          invoice_no?: string | null
          notes?: string | null
          pic?: string | null
          status?: string
          updated_at?: string
          vendor?: string
        }
        Relationships: []
      }
      pricelist_items: {
        Row: {
          category: string
          created_at: string
          id: string
          is_active: boolean
          name: string
          price: number
          unit: string
          updated_at: string
        }
        Insert: {
          category?: string
          created_at?: string
          id?: string
          is_active?: boolean
          name: string
          price?: number
          unit?: string
          updated_at?: string
        }
        Update: {
          category?: string
          created_at?: string
          id?: string
          is_active?: boolean
          name?: string
          price?: number
          unit?: string
          updated_at?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          created_at: string
          email: string
          full_name: string | null
          id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          email: string
          full_name?: string | null
          id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          email?: string
          full_name?: string | null
          id?: string
          updated_at?: string
        }
        Relationships: []
      }
      receivables: {
        Row: {
          amount: number
          client_name: string
          created_at: string
          due_date: string | null
          id: string
          invoice_date: string | null
          invoice_no: string | null
          notes: string | null
          pic: string | null
          status: string
          updated_at: string
        }
        Insert: {
          amount?: number
          client_name: string
          created_at?: string
          due_date?: string | null
          id?: string
          invoice_date?: string | null
          invoice_no?: string | null
          notes?: string | null
          pic?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          amount?: number
          client_name?: string
          created_at?: string
          due_date?: string | null
          id?: string
          invoice_date?: string | null
          invoice_no?: string | null
          notes?: string | null
          pic?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      shipments: {
        Row: {
          created_at: string
          delivery_by: string | null
          delivery_date: string | null
          do_number: string | null
          id: string
          notes: string | null
          order_id: string
          public_token: string
          received_at: string | null
          received_by: string | null
          section: string | null
          ship_to: string
          status: string
          stored_by: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          delivery_by?: string | null
          delivery_date?: string | null
          do_number?: string | null
          id?: string
          notes?: string | null
          order_id: string
          public_token?: string
          received_at?: string | null
          received_by?: string | null
          section?: string | null
          ship_to: string
          status?: string
          stored_by?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          delivery_by?: string | null
          delivery_date?: string | null
          do_number?: string | null
          id?: string
          notes?: string | null
          order_id?: string
          public_token?: string
          received_at?: string | null
          received_by?: string | null
          section?: string | null
          ship_to?: string
          status?: string
          stored_by?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "shipments_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      tasks: {
        Row: {
          assignee: string | null
          created_at: string
          division: string
          due_date: string | null
          id: string
          position: number
          priority: string
          status: string
          title: string
          updated_at: string
        }
        Insert: {
          assignee?: string | null
          created_at?: string
          division?: string
          due_date?: string | null
          id?: string
          position?: number
          priority?: string
          status?: string
          title: string
          updated_at?: string
        }
        Update: {
          assignee?: string | null
          created_at?: string
          division?: string
          due_date?: string | null
          id?: string
          position?: number
          priority?: string
          status?: string
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      team_members: {
        Row: {
          created_at: string
          division: string
          email: string
          id: string
          is_active: boolean
          name: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          division: string
          email: string
          id?: string
          is_active?: boolean
          name: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          division?: string
          email?: string
          id?: string
          is_active?: boolean
          name?: string
          updated_at?: string
        }
        Relationships: []
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
          role?: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      admin_list_users: {
        Args: never
        Returns: {
          email: string
          modules: string[]
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }[]
      }
      admin_set_modules: {
        Args: { p_modules: string[]; p_user_id: string }
        Returns: undefined
      }
      admin_set_role: {
        Args: {
          p_role: Database["public"]["Enums"]["app_role"]
          p_user_id: string
        }
        Returns: undefined
      }
      bootstrap_current_user: { Args: never; Returns: Json }
      can_access: { Args: { _module: string }; Returns: boolean }
      can_access_any: { Args: { _modules: string[] }; Returns: boolean }
      confirm_shipment_receipt: {
        Args: { p_received_by: string; p_token: string }
        Returns: Json
      }
      get_shipment_tracking: { Args: { p_token: string }; Returns: Json }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_master: { Args: never; Returns: boolean }
    }
    Enums: {
      app_role: "master" | "staff"
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
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
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
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
      app_role: ["master", "staff"],
    },
  },
} as const
