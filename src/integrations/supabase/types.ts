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
    PostgrestVersion: "13.0.4"
  }
  public: {
    Tables: {
      bot_flows: {
        Row: {
          active: boolean
          company_id: string | null
          created_at: string
          created_by: string
          description: string | null
          edges: Json | null
          id: string
          name: string
          nodes: Json | null
          updated_at: string
        }
        Insert: {
          active?: boolean
          company_id?: string | null
          created_at?: string
          created_by: string
          description?: string | null
          edges?: Json | null
          id?: string
          name: string
          nodes?: Json | null
          updated_at?: string
        }
        Update: {
          active?: boolean
          company_id?: string | null
          created_at?: string
          created_by?: string
          description?: string | null
          edges?: Json | null
          id?: string
          name?: string
          nodes?: Json | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "bot_flows_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      campaign_chips: {
        Row: {
          campaign_id: string
          chip_id: string
          created_at: string
          id: string
        }
        Insert: {
          campaign_id: string
          chip_id: string
          created_at?: string
          id?: string
        }
        Update: {
          campaign_id?: string
          chip_id?: string
          created_at?: string
          id?: string
        }
        Relationships: []
      }
      campaign_contacts: {
        Row: {
          campaign_id: string
          created_at: string
          custom_message: string | null
          id: string
          name: string
          phone_number: string
          sent_at: string | null
          status: string
        }
        Insert: {
          campaign_id: string
          created_at?: string
          custom_message?: string | null
          id?: string
          name: string
          phone_number: string
          sent_at?: string | null
          status?: string
        }
        Update: {
          campaign_id?: string
          created_at?: string
          custom_message?: string | null
          id?: string
          name?: string
          phone_number?: string
          sent_at?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "campaign_contacts_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "campaigns"
            referencedColumns: ["id"]
          },
        ]
      }
      campaigns: {
        Row: {
          company_id: string | null
          created_at: string
          created_by: string
          id: string
          is_scheduled: boolean | null
          message_template: string
          name: string
          scheduled_date: string | null
          scheduled_time: string | null
          sent_count: number | null
          status: string
          success_count: number | null
          total_contacts: number | null
          updated_at: string
        }
        Insert: {
          company_id?: string | null
          created_at?: string
          created_by: string
          id?: string
          is_scheduled?: boolean | null
          message_template: string
          name: string
          scheduled_date?: string | null
          scheduled_time?: string | null
          sent_count?: number | null
          status?: string
          success_count?: number | null
          total_contacts?: number | null
          updated_at?: string
        }
        Update: {
          company_id?: string | null
          created_at?: string
          created_by?: string
          id?: string
          is_scheduled?: boolean | null
          message_template?: string
          name?: string
          scheduled_date?: string | null
          scheduled_time?: string | null
          sent_count?: number | null
          status?: string
          success_count?: number | null
          total_contacts?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "campaigns_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      chips: {
        Row: {
          company_id: string | null
          created_at: string
          created_by: string
          id: string
          name: string
          phone_number: string
          qr_code: string | null
          queue_id: string | null
          status: string
          updated_at: string
        }
        Insert: {
          company_id?: string | null
          created_at?: string
          created_by: string
          id?: string
          name: string
          phone_number: string
          qr_code?: string | null
          queue_id?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          company_id?: string | null
          created_at?: string
          created_by?: string
          id?: string
          name?: string
          phone_number?: string
          qr_code?: string | null
          queue_id?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "chips_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "chips_queue_id_fkey"
            columns: ["queue_id"]
            isOneToOne: false
            referencedRelation: "queues"
            referencedColumns: ["id"]
          },
        ]
      }
      companies: {
        Row: {
          active: boolean | null
          address: string | null
          city: string | null
          country: string | null
          created_at: string
          created_by: string
          domain: string | null
          email: string | null
          id: string
          logo_url: string | null
          max_chips: number | null
          max_queues: number | null
          max_users: number | null
          name: string
          phone: string | null
          slug: string
          state: string | null
          subscription_plan: string | null
          updated_at: string
        }
        Insert: {
          active?: boolean | null
          address?: string | null
          city?: string | null
          country?: string | null
          created_at?: string
          created_by: string
          domain?: string | null
          email?: string | null
          id?: string
          logo_url?: string | null
          max_chips?: number | null
          max_queues?: number | null
          max_users?: number | null
          name: string
          phone?: string | null
          slug: string
          state?: string | null
          subscription_plan?: string | null
          updated_at?: string
        }
        Update: {
          active?: boolean | null
          address?: string | null
          city?: string | null
          country?: string | null
          created_at?: string
          created_by?: string
          domain?: string | null
          email?: string | null
          id?: string
          logo_url?: string | null
          max_chips?: number | null
          max_queues?: number | null
          max_users?: number | null
          name?: string
          phone?: string | null
          slug?: string
          state?: string | null
          subscription_plan?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      conversations: {
        Row: {
          assigned_to: string | null
          chip_id: string | null
          company_id: string | null
          contact_name: string | null
          conversation_type: string | null
          created_at: string
          id: string
          last_message_at: string | null
          phone_number: string
          priority: number | null
          queue_id: string | null
          status: string
          updated_at: string
        }
        Insert: {
          assigned_to?: string | null
          chip_id?: string | null
          company_id?: string | null
          contact_name?: string | null
          conversation_type?: string | null
          created_at?: string
          id?: string
          last_message_at?: string | null
          phone_number: string
          priority?: number | null
          queue_id?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          assigned_to?: string | null
          chip_id?: string | null
          company_id?: string | null
          contact_name?: string | null
          conversation_type?: string | null
          created_at?: string
          id?: string
          last_message_at?: string | null
          phone_number?: string
          priority?: number | null
          queue_id?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "conversations_chip_id_fkey"
            columns: ["chip_id"]
            isOneToOne: false
            referencedRelation: "chips"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "conversations_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "conversations_queue_id_fkey"
            columns: ["queue_id"]
            isOneToOne: false
            referencedRelation: "queues"
            referencedColumns: ["id"]
          },
        ]
      }
      evolution_api_configs: {
        Row: {
          active: boolean
          api_key: string
          api_url: string
          company_id: string | null
          created_at: string
          id: string
          updated_at: string
        }
        Insert: {
          active?: boolean
          api_key: string
          api_url: string
          company_id?: string | null
          created_at?: string
          id?: string
          updated_at?: string
        }
        Update: {
          active?: boolean
          api_key?: string
          api_url?: string
          company_id?: string | null
          created_at?: string
          id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "evolution_api_configs_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      messages: {
        Row: {
          content: string
          conversation_id: string
          created_at: string
          id: string
          message_type: string | null
          sender_id: string | null
          sender_type: string
        }
        Insert: {
          content: string
          conversation_id: string
          created_at?: string
          id?: string
          message_type?: string | null
          sender_id?: string | null
          sender_type: string
        }
        Update: {
          content?: string
          conversation_id?: string
          created_at?: string
          id?: string
          message_type?: string | null
          sender_id?: string | null
          sender_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "messages_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          company_id: string | null
          created_at: string
          email: string
          id: string
          name: string
          role: string
          updated_at: string
          user_id: string
        }
        Insert: {
          avatar_url?: string | null
          company_id?: string | null
          created_at?: string
          email: string
          id?: string
          name: string
          role?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          avatar_url?: string | null
          company_id?: string | null
          created_at?: string
          email?: string
          id?: string
          name?: string
          role?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "profiles_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      queue_managers: {
        Row: {
          created_at: string
          id: string
          queue_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          queue_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          queue_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "queue_managers_queue_id_fkey"
            columns: ["queue_id"]
            isOneToOne: false
            referencedRelation: "queues"
            referencedColumns: ["id"]
          },
        ]
      }
      queues: {
        Row: {
          active: boolean
          color: string | null
          company_id: string | null
          created_at: string
          created_by: string
          description: string | null
          id: string
          name: string
          updated_at: string
        }
        Insert: {
          active?: boolean
          color?: string | null
          company_id?: string | null
          created_at?: string
          created_by: string
          description?: string | null
          id?: string
          name: string
          updated_at?: string
        }
        Update: {
          active?: boolean
          color?: string | null
          company_id?: string | null
          created_at?: string
          created_by?: string
          description?: string | null
          id?: string
          name?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "queues_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      user_permissions: {
        Row: {
          created_at: string
          id: string
          permission_type: string
          resource_id: string
          resource_type: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          permission_type: string
          resource_id: string
          resource_type: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          permission_type?: string
          resource_id?: string
          resource_type?: string
          user_id?: string
        }
        Relationships: []
      }
      webhook_configs: {
        Row: {
          active: boolean
          company_id: string | null
          created_at: string
          created_by: string
          headers: Json | null
          id: string
          method: string
          name: string
          payload_template: string | null
          type: string
          updated_at: string
          url: string
        }
        Insert: {
          active?: boolean
          company_id?: string | null
          created_at?: string
          created_by: string
          headers?: Json | null
          id?: string
          method?: string
          name: string
          payload_template?: string | null
          type: string
          updated_at?: string
          url: string
        }
        Update: {
          active?: boolean
          company_id?: string | null
          created_at?: string
          created_by?: string
          headers?: Json | null
          id?: string
          method?: string
          name?: string
          payload_template?: string | null
          type?: string
          updated_at?: string
          url?: string
        }
        Relationships: [
          {
            foreignKeyName: "webhook_configs_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      get_current_user_company_id: { Args: never; Returns: string }
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
    Enums: {},
  },
} as const
