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
      approval_requests: {
        Row: {
          created_at: string
          decided_at: string | null
          decided_by: string | null
          decision_reason: string | null
          entity_id: string
          entity_type: string
          id: string
          payload: Json
          reason: string
          requested_by: string
          status: string
          tenant_id: string
          type: string
        }
        Insert: {
          created_at?: string
          decided_at?: string | null
          decided_by?: string | null
          decision_reason?: string | null
          entity_id: string
          entity_type: string
          id?: string
          payload?: Json
          reason: string
          requested_by: string
          status?: string
          tenant_id: string
          type: string
        }
        Update: {
          created_at?: string
          decided_at?: string | null
          decided_by?: string | null
          decision_reason?: string | null
          entity_id?: string
          entity_type?: string
          id?: string
          payload?: Json
          reason?: string
          requested_by?: string
          status?: string
          tenant_id?: string
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "approval_requests_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      audit_logs: {
        Row: {
          action: string
          actor_id: string | null
          created_at: string
          diff: Json
          entity_id: string
          entity_type: string
          id: string
          tenant_id: string
        }
        Insert: {
          action: string
          actor_id?: string | null
          created_at?: string
          diff: Json
          entity_id: string
          entity_type: string
          id?: string
          tenant_id: string
        }
        Update: {
          action?: string
          actor_id?: string | null
          created_at?: string
          diff?: Json
          entity_id?: string
          entity_type?: string
          id?: string
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "audit_logs_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      cash_requests: {
        Row: {
          amount: number
          created_at: string
          delete_reason: string | null
          deleted_at: string | null
          deleted_by: string | null
          id: string
          notes: string | null
          pic: string | null
          purpose: string
          request_date: string
          status: string
          tenant_id: string
          updated_at: string
        }
        Insert: {
          amount?: number
          created_at?: string
          delete_reason?: string | null
          deleted_at?: string | null
          deleted_by?: string | null
          id?: string
          notes?: string | null
          pic?: string | null
          purpose: string
          request_date?: string
          status?: string
          tenant_id: string
          updated_at?: string
        }
        Update: {
          amount?: number
          created_at?: string
          delete_reason?: string | null
          deleted_at?: string | null
          deleted_by?: string | null
          id?: string
          notes?: string | null
          pic?: string | null
          purpose?: string
          request_date?: string
          status?: string
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "cash_requests_tenant_fk"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      clients: {
        Row: {
          code: string | null
          contact_person: string | null
          created_at: string
          delete_reason: string | null
          deleted_at: string | null
          deleted_by: string | null
          id: string
          name: string
          notes: string | null
          phone: string | null
          pic: string | null
          status: string
          tenant_id: string
          updated_at: string
        }
        Insert: {
          code?: string | null
          contact_person?: string | null
          created_at?: string
          delete_reason?: string | null
          deleted_at?: string | null
          deleted_by?: string | null
          id?: string
          name: string
          notes?: string | null
          phone?: string | null
          pic?: string | null
          status?: string
          tenant_id: string
          updated_at?: string
        }
        Update: {
          code?: string | null
          contact_person?: string | null
          created_at?: string
          delete_reason?: string | null
          deleted_at?: string | null
          deleted_by?: string | null
          id?: string
          name?: string
          notes?: string | null
          phone?: string | null
          pic?: string | null
          status?: string
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "clients_tenant_fk"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      document_counters: {
        Row: {
          client_code: string
          document_type: string
          sequence: number
          tenant_id: string
        }
        Insert: {
          client_code: string
          document_type: string
          sequence?: number
          tenant_id: string
        }
        Update: {
          client_code?: string
          document_type?: string
          sequence?: number
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "document_counters_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      document_sequences: {
        Row: {
          client_code: string
          document_type: string
          sequence: number
          tenant_id: string
        }
        Insert: {
          client_code: string
          document_type: string
          sequence?: number
          tenant_id: string
        }
        Update: {
          client_code?: string
          document_type?: string
          sequence?: number
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "document_sequences_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      expenses: {
        Row: {
          amount: number
          category: string
          created_at: string
          delete_reason: string | null
          deleted_at: string | null
          deleted_by: string | null
          description: string
          expense_date: string
          id: string
          pic: string | null
          status: string
          tenant_id: string
          updated_at: string
        }
        Insert: {
          amount?: number
          category?: string
          created_at?: string
          delete_reason?: string | null
          deleted_at?: string | null
          deleted_by?: string | null
          description: string
          expense_date?: string
          id?: string
          pic?: string | null
          status?: string
          tenant_id: string
          updated_at?: string
        }
        Update: {
          amount?: number
          category?: string
          created_at?: string
          delete_reason?: string | null
          deleted_at?: string | null
          deleted_by?: string | null
          description?: string
          expense_date?: string
          id?: string
          pic?: string | null
          status?: string
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "expenses_tenant_fk"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      module_access: {
        Row: {
          created_at: string
          id: string
          module: string
          tenant_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          module: string
          tenant_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          module?: string
          tenant_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "module_access_tenant_fk"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          created_at: string
          id: string
          message: string
          read_at: string | null
          request_id: string | null
          tenant_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          message: string
          read_at?: string | null
          request_id?: string | null
          tenant_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          message?: string
          read_at?: string | null
          request_id?: string | null
          tenant_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notifications_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "approval_requests"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notifications_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      order_items: {
        Row: {
          created_at: string
          delete_reason: string | null
          deleted_at: string | null
          deleted_by: string | null
          discount_type: string
          discount_value: number
          id: string
          item_name: string
          order_id: string
          position: number
          price: number
          qty: number
          tenant_id: string
          unit: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          delete_reason?: string | null
          deleted_at?: string | null
          deleted_by?: string | null
          discount_type?: string
          discount_value?: number
          id?: string
          item_name: string
          order_id: string
          position?: number
          price?: number
          qty?: number
          tenant_id: string
          unit?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          delete_reason?: string | null
          deleted_at?: string | null
          deleted_by?: string | null
          discount_type?: string
          discount_value?: number
          id?: string
          item_name?: string
          order_id?: string
          position?: number
          price?: number
          qty?: number
          tenant_id?: string
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
          {
            foreignKeyName: "order_items_tenant_fk"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_items_tenant_order_fk"
            columns: ["tenant_id", "order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["tenant_id", "id"]
          },
        ]
      }
      orders: {
        Row: {
          approved_fingerprint: string | null
          brand_snapshot: Json | null
          client_address: string | null
          client_id: string | null
          client_name: string
          created_at: string
          created_by: string | null
          delete_reason: string | null
          deleted_at: string | null
          deleted_by: string | null
          discount_pct: number
          discount_type: string
          discount_value: number
          document_status: string
          due_date: string | null
          id: string
          invoice_date: string | null
          invoice_number: string | null
          invoice_state: string
          issued_at: string | null
          notes: string | null
          order_date: string
          order_number: string | null
          po_number: string | null
          section: string | null
          tax_enabled: boolean
          tax_rate: number
          tenant_id: string
          updated_at: string
        }
        Insert: {
          approved_fingerprint?: string | null
          brand_snapshot?: Json | null
          client_address?: string | null
          client_id?: string | null
          client_name: string
          created_at?: string
          created_by?: string | null
          delete_reason?: string | null
          deleted_at?: string | null
          deleted_by?: string | null
          discount_pct?: number
          discount_type?: string
          discount_value?: number
          document_status?: string
          due_date?: string | null
          id?: string
          invoice_date?: string | null
          invoice_number?: string | null
          invoice_state?: string
          issued_at?: string | null
          notes?: string | null
          order_date?: string
          order_number?: string | null
          po_number?: string | null
          section?: string | null
          tax_enabled?: boolean
          tax_rate?: number
          tenant_id: string
          updated_at?: string
        }
        Update: {
          approved_fingerprint?: string | null
          brand_snapshot?: Json | null
          client_address?: string | null
          client_id?: string | null
          client_name?: string
          created_at?: string
          created_by?: string | null
          delete_reason?: string | null
          deleted_at?: string | null
          deleted_by?: string | null
          discount_pct?: number
          discount_type?: string
          discount_value?: number
          document_status?: string
          due_date?: string | null
          id?: string
          invoice_date?: string | null
          invoice_number?: string | null
          invoice_state?: string
          issued_at?: string | null
          notes?: string | null
          order_date?: string
          order_number?: string | null
          po_number?: string | null
          section?: string | null
          tax_enabled?: boolean
          tax_rate?: number
          tenant_id?: string
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
          {
            foreignKeyName: "orders_tenant_client_fk"
            columns: ["tenant_id", "client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["tenant_id", "id"]
          },
          {
            foreignKeyName: "orders_tenant_fk"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      payables: {
        Row: {
          amount: number
          created_at: string
          delete_reason: string | null
          deleted_at: string | null
          deleted_by: string | null
          due_date: string | null
          id: string
          invoice_date: string | null
          invoice_no: string | null
          notes: string | null
          pic: string | null
          status: string
          tenant_id: string
          updated_at: string
          vendor: string
        }
        Insert: {
          amount?: number
          created_at?: string
          delete_reason?: string | null
          deleted_at?: string | null
          deleted_by?: string | null
          due_date?: string | null
          id?: string
          invoice_date?: string | null
          invoice_no?: string | null
          notes?: string | null
          pic?: string | null
          status?: string
          tenant_id: string
          updated_at?: string
          vendor: string
        }
        Update: {
          amount?: number
          created_at?: string
          delete_reason?: string | null
          deleted_at?: string | null
          deleted_by?: string | null
          due_date?: string | null
          id?: string
          invoice_date?: string | null
          invoice_no?: string | null
          notes?: string | null
          pic?: string | null
          status?: string
          tenant_id?: string
          updated_at?: string
          vendor?: string
        }
        Relationships: [
          {
            foreignKeyName: "payables_tenant_fk"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      payments: {
        Row: {
          amount: number
          created_at: string
          created_by: string
          id: string
          method: string
          notes: string | null
          order_id: string
          payment_date: string
          reference: string | null
          tenant_id: string
          void_reason: string | null
          voided_at: string | null
          voided_by: string | null
        }
        Insert: {
          amount: number
          created_at?: string
          created_by?: string
          id?: string
          method: string
          notes?: string | null
          order_id: string
          payment_date?: string
          reference?: string | null
          tenant_id: string
          void_reason?: string | null
          voided_at?: string | null
          voided_by?: string | null
        }
        Update: {
          amount?: number
          created_at?: string
          created_by?: string
          id?: string
          method?: string
          notes?: string | null
          order_id?: string
          payment_date?: string
          reference?: string | null
          tenant_id?: string
          void_reason?: string | null
          voided_at?: string | null
          voided_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "payments_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payments_tenant_id_order_id_fkey"
            columns: ["tenant_id", "order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["tenant_id", "id"]
          },
        ]
      }
      platform_admins: {
        Row: {
          created_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          user_id?: string
        }
        Relationships: []
      }
      pricelist_items: {
        Row: {
          category: string
          created_at: string
          delete_reason: string | null
          deleted_at: string | null
          deleted_by: string | null
          id: string
          is_active: boolean
          name: string
          price: number
          tenant_id: string
          unit: string
          updated_at: string
        }
        Insert: {
          category?: string
          created_at?: string
          delete_reason?: string | null
          deleted_at?: string | null
          deleted_by?: string | null
          id?: string
          is_active?: boolean
          name: string
          price?: number
          tenant_id: string
          unit?: string
          updated_at?: string
        }
        Update: {
          category?: string
          created_at?: string
          delete_reason?: string | null
          deleted_at?: string | null
          deleted_by?: string | null
          id?: string
          is_active?: boolean
          name?: string
          price?: number
          tenant_id?: string
          unit?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "pricelist_items_tenant_fk"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          active_tenant_id: string | null
          created_at: string
          email: string
          full_name: string | null
          id: string
          updated_at: string
        }
        Insert: {
          active_tenant_id?: string | null
          created_at?: string
          email: string
          full_name?: string | null
          id: string
          updated_at?: string
        }
        Update: {
          active_tenant_id?: string | null
          created_at?: string
          email?: string
          full_name?: string | null
          id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "profiles_active_tenant_id_fkey"
            columns: ["active_tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      quotation_items: {
        Row: {
          created_at: string
          delete_reason: string | null
          deleted_at: string | null
          deleted_by: string | null
          discount_type: string
          discount_value: number
          id: string
          item_name: string
          position: number
          price: number
          qty: number
          quotation_id: string
          tenant_id: string
          unit: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          delete_reason?: string | null
          deleted_at?: string | null
          deleted_by?: string | null
          discount_type?: string
          discount_value?: number
          id?: string
          item_name: string
          position?: number
          price: number
          qty: number
          quotation_id: string
          tenant_id: string
          unit?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          delete_reason?: string | null
          deleted_at?: string | null
          deleted_by?: string | null
          discount_type?: string
          discount_value?: number
          id?: string
          item_name?: string
          position?: number
          price?: number
          qty?: number
          quotation_id?: string
          tenant_id?: string
          unit?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "quotation_items_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quotation_items_tenant_id_quotation_id_fkey"
            columns: ["tenant_id", "quotation_id"]
            isOneToOne: false
            referencedRelation: "quotations"
            referencedColumns: ["tenant_id", "id"]
          },
        ]
      }
      quotations: {
        Row: {
          approved_fingerprint: string | null
          brand_snapshot: Json | null
          client_address: string | null
          client_id: string | null
          client_name: string
          converted_order_id: string | null
          created_at: string
          created_by: string | null
          delete_reason: string | null
          deleted_at: string | null
          deleted_by: string | null
          discount_type: string
          discount_value: number
          document_date: string
          due_date: string | null
          id: string
          notes: string | null
          quotation_number: string
          status: string
          tax_enabled: boolean
          tax_rate: number
          tenant_id: string
          updated_at: string
          valid_until: string | null
        }
        Insert: {
          approved_fingerprint?: string | null
          brand_snapshot?: Json | null
          client_address?: string | null
          client_id?: string | null
          client_name: string
          converted_order_id?: string | null
          created_at?: string
          created_by?: string | null
          delete_reason?: string | null
          deleted_at?: string | null
          deleted_by?: string | null
          discount_type?: string
          discount_value?: number
          document_date?: string
          due_date?: string | null
          id?: string
          notes?: string | null
          quotation_number: string
          status?: string
          tax_enabled?: boolean
          tax_rate?: number
          tenant_id: string
          updated_at?: string
          valid_until?: string | null
        }
        Update: {
          approved_fingerprint?: string | null
          brand_snapshot?: Json | null
          client_address?: string | null
          client_id?: string | null
          client_name?: string
          converted_order_id?: string | null
          created_at?: string
          created_by?: string | null
          delete_reason?: string | null
          deleted_at?: string | null
          deleted_by?: string | null
          discount_type?: string
          discount_value?: number
          document_date?: string
          due_date?: string | null
          id?: string
          notes?: string | null
          quotation_number?: string
          status?: string
          tax_enabled?: boolean
          tax_rate?: number
          tenant_id?: string
          updated_at?: string
          valid_until?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "quotations_tenant_id_client_id_fkey"
            columns: ["tenant_id", "client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["tenant_id", "id"]
          },
          {
            foreignKeyName: "quotations_tenant_id_converted_order_id_fkey"
            columns: ["tenant_id", "converted_order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["tenant_id", "id"]
          },
          {
            foreignKeyName: "quotations_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      receivables: {
        Row: {
          amount: number
          client_name: string
          created_at: string
          delete_reason: string | null
          deleted_at: string | null
          deleted_by: string | null
          due_date: string | null
          id: string
          invoice_date: string | null
          invoice_no: string | null
          invoice_total: number
          notes: string | null
          order_id: string | null
          pic: string | null
          status: string
          tenant_id: string
          updated_at: string
        }
        Insert: {
          amount?: number
          client_name: string
          created_at?: string
          delete_reason?: string | null
          deleted_at?: string | null
          deleted_by?: string | null
          due_date?: string | null
          id?: string
          invoice_date?: string | null
          invoice_no?: string | null
          invoice_total?: number
          notes?: string | null
          order_id?: string | null
          pic?: string | null
          status?: string
          tenant_id: string
          updated_at?: string
        }
        Update: {
          amount?: number
          client_name?: string
          created_at?: string
          delete_reason?: string | null
          deleted_at?: string | null
          deleted_by?: string | null
          due_date?: string | null
          id?: string
          invoice_date?: string | null
          invoice_no?: string | null
          invoice_total?: number
          notes?: string | null
          order_id?: string | null
          pic?: string | null
          status?: string
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "receivables_order_fk"
            columns: ["tenant_id", "order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["tenant_id", "id"]
          },
          {
            foreignKeyName: "receivables_tenant_fk"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      shipments: {
        Row: {
          created_at: string
          delete_reason: string | null
          deleted_at: string | null
          deleted_by: string | null
          delivery_by: string | null
          delivery_by_member_id: string | null
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
          stored_by_member_id: string | null
          tenant_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          delete_reason?: string | null
          deleted_at?: string | null
          deleted_by?: string | null
          delivery_by?: string | null
          delivery_by_member_id?: string | null
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
          stored_by_member_id?: string | null
          tenant_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          delete_reason?: string | null
          deleted_at?: string | null
          deleted_by?: string | null
          delivery_by?: string | null
          delivery_by_member_id?: string | null
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
          stored_by_member_id?: string | null
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "shipments_delivery_member_fk"
            columns: ["tenant_id", "delivery_by_member_id"]
            isOneToOne: false
            referencedRelation: "team_members"
            referencedColumns: ["tenant_id", "id"]
          },
          {
            foreignKeyName: "shipments_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "shipments_stored_member_fk"
            columns: ["tenant_id", "stored_by_member_id"]
            isOneToOne: false
            referencedRelation: "team_members"
            referencedColumns: ["tenant_id", "id"]
          },
          {
            foreignKeyName: "shipments_tenant_fk"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "shipments_tenant_order_fk"
            columns: ["tenant_id", "order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["tenant_id", "id"]
          },
        ]
      }
      tasks: {
        Row: {
          assignee: string | null
          completed_at: string | null
          created_at: string
          delete_reason: string | null
          deleted_at: string | null
          deleted_by: string | null
          division: string
          due_date: string | null
          id: string
          position: number
          priority: string
          status: string
          tenant_id: string
          title: string
          updated_at: string
        }
        Insert: {
          assignee?: string | null
          completed_at?: string | null
          created_at?: string
          delete_reason?: string | null
          deleted_at?: string | null
          deleted_by?: string | null
          division?: string
          due_date?: string | null
          id?: string
          position?: number
          priority?: string
          status?: string
          tenant_id: string
          title: string
          updated_at?: string
        }
        Update: {
          assignee?: string | null
          completed_at?: string | null
          created_at?: string
          delete_reason?: string | null
          deleted_at?: string | null
          deleted_by?: string | null
          division?: string
          due_date?: string | null
          id?: string
          position?: number
          priority?: string
          status?: string
          tenant_id?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "tasks_tenant_fk"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      team_members: {
        Row: {
          created_at: string
          delete_reason: string | null
          deleted_at: string | null
          deleted_by: string | null
          division: string
          email: string
          id: string
          is_active: boolean
          name: string
          tenant_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          delete_reason?: string | null
          deleted_at?: string | null
          deleted_by?: string | null
          division: string
          email: string
          id?: string
          is_active?: boolean
          name: string
          tenant_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          delete_reason?: string | null
          deleted_at?: string | null
          deleted_by?: string | null
          division?: string
          email?: string
          id?: string
          is_active?: boolean
          name?: string
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "team_members_tenant_fk"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      tenant_memberships: {
        Row: {
          created_at: string
          id: string
          status: string
          tenant_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          status?: string
          tenant_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          status?: string
          tenant_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "tenant_memberships_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      tenant_settings: {
        Row: {
          address: string
          bank: Json
          contact: Json
          currency: string
          discount_approval_threshold_pct: number
          doc_numbering: Json
          logo_url: string | null
          numbering_scope: string
          ppn_rate: number
          primary_color: string
          sales_numbering: Json
          tenant_id: string
        }
        Insert: {
          address?: string
          bank?: Json
          contact?: Json
          currency?: string
          discount_approval_threshold_pct?: number
          doc_numbering?: Json
          logo_url?: string | null
          numbering_scope?: string
          ppn_rate?: number
          primary_color?: string
          sales_numbering?: Json
          tenant_id: string
        }
        Update: {
          address?: string
          bank?: Json
          contact?: Json
          currency?: string
          discount_approval_threshold_pct?: number
          doc_numbering?: Json
          logo_url?: string | null
          numbering_scope?: string
          ppn_rate?: number
          primary_color?: string
          sales_numbering?: Json
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "tenant_settings_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: true
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      tenants: {
        Row: {
          created_at: string
          id: string
          is_demo: boolean
          name: string
          slug: string
          status: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_demo?: boolean
          name: string
          slug: string
          status?: string
        }
        Update: {
          created_at?: string
          id?: string
          is_demo?: boolean
          name?: string
          slug?: string
          status?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          tenant_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          tenant_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          tenant_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_roles_tenant_fk"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      active_tenant_id: { Args: never; Returns: string }
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
      archive_entity: {
        Args: { p_entity_id: string; p_entity_type: string; p_reason: string }
        Returns: string
      }
      assign_shipment_team: {
        Args: {
          p_delivery_by: string
          p_shipment_id: string
          p_stored_by: string
        }
        Returns: undefined
      }
      bootstrap_current_user: { Args: never; Returns: Json }
      can_access: { Args: { _module: string }; Returns: boolean }
      can_access_any: { Args: { _modules: string[] }; Returns: boolean }
      can_access_tenant_module: {
        Args: { p_module: string; p_tenant_id: string }
        Returns: boolean
      }
      change_invoice_number: {
        Args: { p_number: string; p_order_id: string; p_reason: string }
        Returns: undefined
      }
      confirm_shipment_receipt: {
        Args: { p_received_by: string; p_token: string }
        Returns: Json
      }
      convert_quotation: { Args: { p_id: string }; Returns: string }
      create_shipment_atomic: { Args: { p_order_id: string }; Returns: string }
      create_tenant_with_master: {
        Args: {
          p_is_demo?: boolean
          p_master_id: string
          p_name: string
          p_slug: string
        }
        Returns: string
      }
      decide_approval: {
        Args: { p_approve: boolean; p_reason: string; p_request_id: string }
        Returns: undefined
      }
      entity_module: { Args: { p_table: string }; Returns: string }
      finance_invoice_balances: {
        Args: never
        Returns: {
          balance: number
          client_name: string
          due_date: string
          invoice_number: string
          invoice_state: string
          order_id: string
          paid: number
          status: string
          total: number
        }[]
      }
      get_public_pricelist: { Args: never; Returns: Json }
      get_shipment_tracking: { Args: { p_token: string }; Returns: Json }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      has_tenant_role: {
        Args: {
          p_role: Database["public"]["Enums"]["app_role"]
          p_tenant_id: string
        }
        Returns: boolean
      }
      is_master: { Args: never; Returns: boolean }
      is_tenant_member: { Args: { p_tenant_id: string }; Returns: boolean }
      issue_invoice: { Args: { p_order_id: string }; Returns: string }
      list_archive: { Args: never; Returns: Json }
      next_sales_number:
        | {
            Args: { p_client: string; p_date: string; p_type: string }
            Returns: string
          }
        | {
            Args: {
              p_client: string
              p_client_id: string
              p_date: string
              p_type: string
            }
            Returns: string
          }
      record_payment: {
        Args: {
          p_amount: number
          p_date: string
          p_method: string
          p_notes?: string
          p_order_id: string
          p_reference?: string
        }
        Returns: string
      }
      request_invoice_cancel: {
        Args: { p_order_id: string; p_reason: string }
        Returns: string
      }
      restore_entity: {
        Args: { p_entity_id: string; p_entity_type: string; p_reason: string }
        Returns: undefined
      }
      sales_client_code: {
        Args: { p_client: string; p_client_id: string; p_tenant: string }
        Returns: string
      }
      sales_pricelist: {
        Args: never
        Returns: {
          id: string
          name: string
          price: number
          unit: string
        }[]
      }
      sales_sequence_value: { Args: { p_number: string }; Returns: number }
      sales_totals: { Args: { p_entity: string; p_id: string }; Returns: Json }
      save_order_atomic: {
        Args: { p_items: Json; p_order: Json; p_order_id: string }
        Returns: string
      }
      save_sales_document: {
        Args: { p_doc: Json; p_entity: string; p_id: string; p_items: Json }
        Returns: string
      }
      select_active_tenant: { Args: { p_tenant_id: string }; Returns: Json }
      set_quotation_status: {
        Args: { p_id: string; p_status: string }
        Returns: undefined
      }
      shipment_team_options: {
        Args: never
        Returns: {
          id: string
          name: string
        }[]
      }
      suggest_invoice_number: {
        Args: { p_client_name: string; p_invoice_date: string }
        Returns: string
      }
      sync_invoice_receivable: { Args: { p_id: string }; Returns: undefined }
      void_payment: {
        Args: { p_payment_id: string; p_reason: string }
        Returns: undefined
      }
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
