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
    PostgrestVersion: "14.18"
  }
  public: {
    Tables: {
      clients: {
        Row: {
          address: string
          city: string
          contact_name: string
          country: string
          created_at: string
          email: string
          id: string
          is_professional: boolean
          name: string
          notes: string
          phone: string
          postal_code: string
          siren: string
          user_id: string
          vat_number: string
        }
        Insert: {
          address?: string
          city?: string
          contact_name?: string
          country?: string
          created_at?: string
          email?: string
          id?: string
          is_professional?: boolean
          name: string
          notes?: string
          phone?: string
          postal_code?: string
          siren?: string
          user_id?: string
          vat_number?: string
        }
        Update: {
          address?: string
          city?: string
          contact_name?: string
          country?: string
          created_at?: string
          email?: string
          id?: string
          is_professional?: boolean
          name?: string
          notes?: string
          phone?: string
          postal_code?: string
          siren?: string
          user_id?: string
          vat_number?: string
        }
        Relationships: []
      }
      company_settings: {
        Row: {
          address: string
          ape_code: string
          bic: string
          city: string
          created_at: string
          email: string
          footer_note: string
          iban: string
          insurance: string
          late_penalty: string
          legal_mention: string
          name: string
          owner_name: string
          payment_terms_days: number
          phone: string
          postal_code: string
          quote_validity_days: number
          rcs_rm: string
          siret: string
          updated_at: string
          user_id: string
          website: string
        }
        Insert: {
          address?: string
          ape_code?: string
          bic?: string
          city?: string
          created_at?: string
          email?: string
          footer_note?: string
          iban?: string
          insurance?: string
          late_penalty?: string
          legal_mention?: string
          name?: string
          owner_name?: string
          payment_terms_days?: number
          phone?: string
          postal_code?: string
          quote_validity_days?: number
          rcs_rm?: string
          siret?: string
          updated_at?: string
          user_id: string
          website?: string
        }
        Update: {
          address?: string
          ape_code?: string
          bic?: string
          city?: string
          created_at?: string
          email?: string
          footer_note?: string
          iban?: string
          insurance?: string
          late_penalty?: string
          legal_mention?: string
          name?: string
          owner_name?: string
          payment_terms_days?: number
          phone?: string
          postal_code?: string
          quote_validity_days?: number
          rcs_rm?: string
          siret?: string
          updated_at?: string
          user_id?: string
          website?: string
        }
        Relationships: []
      }
      documents: {
        Row: {
          client_id: string | null
          client_snapshot: Json | null
          company_snapshot: Json | null
          created_at: string
          due_date: string | null
          finalized_at: string | null
          id: string
          issue_date: string
          items: Json
          notes: string
          number: string | null
          operation_category: string
          paid_at: string | null
          payment_method: string
          service_date: string
          source_id: string | null
          status: string
          total: number
          type: string
          updated_at: string
          user_id: string
          valid_until: string | null
        }
        Insert: {
          client_id?: string | null
          client_snapshot?: Json | null
          company_snapshot?: Json | null
          created_at?: string
          due_date?: string | null
          finalized_at?: string | null
          id?: string
          issue_date?: string
          items?: Json
          notes?: string
          number?: string | null
          operation_category?: string
          paid_at?: string | null
          payment_method?: string
          service_date?: string
          source_id?: string | null
          status?: string
          total?: number
          type: string
          updated_at?: string
          user_id?: string
          valid_until?: string | null
        }
        Update: {
          client_id?: string | null
          client_snapshot?: Json | null
          company_snapshot?: Json | null
          created_at?: string
          due_date?: string | null
          finalized_at?: string | null
          id?: string
          issue_date?: string
          items?: Json
          notes?: string
          number?: string | null
          operation_category?: string
          paid_at?: string | null
          payment_method?: string
          service_date?: string
          source_id?: string | null
          status?: string
          total?: number
          type?: string
          updated_at?: string
          user_id?: string
          valid_until?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "documents_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "documents_source_id_fkey"
            columns: ["source_id"]
            isOneToOne: false
            referencedRelation: "documents"
            referencedColumns: ["id"]
          },
        ]
      }
      products: {
        Row: {
          created_at: string
          description: string
          id: string
          kind: string
          name: string
          unit: string
          unit_price: number
          user_id: string
        }
        Insert: {
          created_at?: string
          description?: string
          id?: string
          kind?: string
          name: string
          unit?: string
          unit_price?: number
          user_id?: string
        }
        Update: {
          created_at?: string
          description?: string
          id?: string
          kind?: string
          name?: string
          unit?: string
          unit_price?: number
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      finalize_document: {
        Args: { _doc_id: string }
        Returns: {
          client_id: string | null
          client_snapshot: Json | null
          company_snapshot: Json | null
          created_at: string
          due_date: string | null
          finalized_at: string | null
          id: string
          issue_date: string
          items: Json
          notes: string
          number: string | null
          operation_category: string
          paid_at: string | null
          payment_method: string
          service_date: string
          source_id: string | null
          status: string
          total: number
          type: string
          updated_at: string
          user_id: string
          valid_until: string | null
        }
        SetofOptions: {
          from: "*"
          to: "documents"
          isOneToOne: true
          isSetofReturn: false
        }
      }
    }
    Enums: {
      [_ in never]: never
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
    Enums: {},
  },
} as const
