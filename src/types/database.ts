export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  public: {
    Tables: {
      audit_events: {
        Row: {
          action: string
          actor_user_id: string | null
          created_at: string
          entity_id: string
          entity_type: string
          id: number
          new_values: Json | null
          old_values: Json | null
          source: string
        }
        Insert: {
          action: string
          actor_user_id?: string | null
          created_at?: string
          entity_id: string
          entity_type: string
          id?: never
          new_values?: Json | null
          old_values?: Json | null
          source?: string
        }
        Update: {
          action?: string
          actor_user_id?: string | null
          created_at?: string
          entity_id?: string
          entity_type?: string
          id?: never
          new_values?: Json | null
          old_values?: Json | null
          source?: string
        }
        Relationships: [
          {
            foreignKeyName: "audit_events_actor_user_id_fkey"
            columns: ["actor_user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      companies: {
        Row: {
          active: boolean
          created_at: string
          created_by: string | null
          email: string | null
          id: string
          name: string
          notes: string | null
          phone: string | null
          updated_at: string
          updated_by: string | null
          website: string | null
        }
        Insert: {
          active?: boolean
          created_at?: string
          created_by?: string | null
          email?: string | null
          id?: string
          name: string
          notes?: string | null
          phone?: string | null
          updated_at?: string
          updated_by?: string | null
          website?: string | null
        }
        Update: {
          active?: boolean
          created_at?: string
          created_by?: string | null
          email?: string | null
          id?: string
          name?: string
          notes?: string | null
          phone?: string | null
          updated_at?: string
          updated_by?: string | null
          website?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "companies_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "companies_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      company_contacts: {
        Row: {
          company_id: string
          contact_id: string
          created_at: string
          created_by: string | null
          id: string
          is_primary: boolean
          job_title: string | null
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          company_id: string
          contact_id: string
          created_at?: string
          created_by?: string | null
          id?: string
          is_primary?: boolean
          job_title?: string | null
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          company_id?: string
          contact_id?: string
          created_at?: string
          created_by?: string | null
          id?: string
          is_primary?: boolean
          job_title?: string | null
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "company_contacts_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "company_contacts_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "company_contacts_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "company_contacts_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      contacts: {
        Row: {
          active: boolean
          created_at: string
          created_by: string | null
          email: string | null
          full_name: string
          id: string
          notes: string | null
          phone: string | null
          roles: Database["public"]["Enums"]["contact_role"][]
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          active?: boolean
          created_at?: string
          created_by?: string | null
          email?: string | null
          full_name: string
          id?: string
          notes?: string | null
          phone?: string | null
          roles: Database["public"]["Enums"]["contact_role"][]
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          active?: boolean
          created_at?: string
          created_by?: string | null
          email?: string | null
          full_name?: string
          id?: string
          notes?: string | null
          phone?: string | null
          roles?: Database["public"]["Enums"]["contact_role"][]
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "contacts_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contacts_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      enquiries: {
        Row: {
          broker_company_id: string | null
          broker_contact_id: string | null
          budget_amount: number | null
          charter_end_date: string | null
          charter_start_date: string | null
          created_at: string
          created_by: string | null
          currency: string | null
          customer_contact_id: string | null
          disembarkation_port: string | null
          embarkation_port: string | null
          guest_count: number | null
          id: string
          owner_user_id: string | null
          priority: Database["public"]["Enums"]["enquiry_priority"]
          reference: string
          requested_yacht_id: string | null
          source: Database["public"]["Enums"]["enquiry_source"]
          status: Database["public"]["Enums"]["enquiry_status"]
          summary: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          broker_company_id?: string | null
          broker_contact_id?: string | null
          budget_amount?: number | null
          charter_end_date?: string | null
          charter_start_date?: string | null
          created_at?: string
          created_by?: string | null
          currency?: string | null
          customer_contact_id?: string | null
          disembarkation_port?: string | null
          embarkation_port?: string | null
          guest_count?: number | null
          id?: string
          owner_user_id?: string | null
          priority?: Database["public"]["Enums"]["enquiry_priority"]
          reference?: string
          requested_yacht_id?: string | null
          source?: Database["public"]["Enums"]["enquiry_source"]
          status?: Database["public"]["Enums"]["enquiry_status"]
          summary: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          broker_company_id?: string | null
          broker_contact_id?: string | null
          budget_amount?: number | null
          charter_end_date?: string | null
          charter_start_date?: string | null
          created_at?: string
          created_by?: string | null
          currency?: string | null
          customer_contact_id?: string | null
          disembarkation_port?: string | null
          embarkation_port?: string | null
          guest_count?: number | null
          id?: string
          owner_user_id?: string | null
          priority?: Database["public"]["Enums"]["enquiry_priority"]
          reference?: string
          requested_yacht_id?: string | null
          source?: Database["public"]["Enums"]["enquiry_source"]
          status?: Database["public"]["Enums"]["enquiry_status"]
          summary?: string
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "enquiries_broker_company_id_fkey"
            columns: ["broker_company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "enquiries_broker_contact_id_fkey"
            columns: ["broker_contact_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "enquiries_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "enquiries_customer_contact_id_fkey"
            columns: ["customer_contact_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "enquiries_owner_user_id_fkey"
            columns: ["owner_user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "enquiries_requested_yacht_id_fkey"
            columns: ["requested_yacht_id"]
            isOneToOne: false
            referencedRelation: "yachts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "enquiries_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      enquiry_notes: {
        Row: {
          body: string
          created_at: string
          created_by: string | null
          enquiry_id: string
          id: string
          kind: Database["public"]["Enums"]["enquiry_note_kind"]
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          body: string
          created_at?: string
          created_by?: string | null
          enquiry_id: string
          id?: string
          kind?: Database["public"]["Enums"]["enquiry_note_kind"]
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          body?: string
          created_at?: string
          created_by?: string | null
          enquiry_id?: string
          id?: string
          kind?: Database["public"]["Enums"]["enquiry_note_kind"]
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "enquiry_notes_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "enquiry_notes_enquiry_id_fkey"
            columns: ["enquiry_id"]
            isOneToOne: false
            referencedRelation: "enquiries"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "enquiry_notes_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      enquiry_status_history: {
        Row: {
          changed_by: string | null
          created_at: string
          enquiry_id: string
          from_status: Database["public"]["Enums"]["enquiry_status"] | null
          id: number
          reason: string
          to_status: Database["public"]["Enums"]["enquiry_status"]
        }
        Insert: {
          changed_by?: string | null
          created_at?: string
          enquiry_id: string
          from_status?: Database["public"]["Enums"]["enquiry_status"] | null
          id?: never
          reason: string
          to_status: Database["public"]["Enums"]["enquiry_status"]
        }
        Update: {
          changed_by?: string | null
          created_at?: string
          enquiry_id?: string
          from_status?: Database["public"]["Enums"]["enquiry_status"] | null
          id?: never
          reason?: string
          to_status?: Database["public"]["Enums"]["enquiry_status"]
        }
        Relationships: [
          {
            foreignKeyName: "enquiry_status_history_changed_by_fkey"
            columns: ["changed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "enquiry_status_history_enquiry_id_fkey"
            columns: ["enquiry_id"]
            isOneToOne: false
            referencedRelation: "enquiries"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          active: boolean
          created_at: string
          display_name: string
          email: string
          id: string
          phone: string | null
          role: Database["public"]["Enums"]["user_role"]
          telegram_chat_id: string | null
          updated_at: string
        }
        Insert: {
          active?: boolean
          created_at?: string
          display_name: string
          email: string
          id: string
          phone?: string | null
          role?: Database["public"]["Enums"]["user_role"]
          telegram_chat_id?: string | null
          updated_at?: string
        }
        Update: {
          active?: boolean
          created_at?: string
          display_name?: string
          email?: string
          id?: string
          phone?: string | null
          role?: Database["public"]["Enums"]["user_role"]
          telegram_chat_id?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      workflow_events: {
        Row: {
          actor_user_id: string | null
          aggregate_id: string
          aggregate_type: string
          event_type: string
          event_version: number
          id: string
          occurred_at: string
          payload: Json
        }
        Insert: {
          actor_user_id?: string | null
          aggregate_id: string
          aggregate_type: string
          event_type: string
          event_version?: number
          id?: string
          occurred_at?: string
          payload?: Json
        }
        Update: {
          actor_user_id?: string | null
          aggregate_id?: string
          aggregate_type?: string
          event_type?: string
          event_version?: number
          id?: string
          occurred_at?: string
          payload?: Json
        }
        Relationships: [
          {
            foreignKeyName: "workflow_events_actor_user_id_fkey"
            columns: ["actor_user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      yacht_contacts: {
        Row: {
          contact_id: string
          created_at: string
          created_by: string | null
          id: string
          is_primary: boolean
          notes: string | null
          notifications_enabled: boolean
          responsibility: Database["public"]["Enums"]["yacht_contact_responsibility"]
          updated_at: string
          updated_by: string | null
          yacht_id: string
        }
        Insert: {
          contact_id: string
          created_at?: string
          created_by?: string | null
          id?: string
          is_primary?: boolean
          notes?: string | null
          notifications_enabled?: boolean
          responsibility: Database["public"]["Enums"]["yacht_contact_responsibility"]
          updated_at?: string
          updated_by?: string | null
          yacht_id: string
        }
        Update: {
          contact_id?: string
          created_at?: string
          created_by?: string | null
          id?: string
          is_primary?: boolean
          notes?: string | null
          notifications_enabled?: boolean
          responsibility?: Database["public"]["Enums"]["yacht_contact_responsibility"]
          updated_at?: string
          updated_by?: string | null
          yacht_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "yacht_contacts_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "yacht_contacts_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "yacht_contacts_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "yacht_contacts_yacht_id_fkey"
            columns: ["yacht_id"]
            isOneToOne: false
            referencedRelation: "yachts"
            referencedColumns: ["id"]
          },
        ]
      }
      yachts: {
        Row: {
          beam_metres: number | null
          builder: string | null
          cabin_count: number | null
          created_at: string
          created_by: string | null
          crew_count: number | null
          cruise_speed_knots: number | null
          guest_capacity: number | null
          home_port: string | null
          id: string
          length_metres: number | null
          max_speed_knots: number | null
          name: string
          notes: string | null
          notification_phone: string | null
          preferred_ports: string[]
          status: Database["public"]["Enums"]["yacht_operational_status"]
          updated_at: string
          updated_by: string | null
          year_built: number | null
        }
        Insert: {
          beam_metres?: number | null
          builder?: string | null
          cabin_count?: number | null
          created_at?: string
          created_by?: string | null
          crew_count?: number | null
          cruise_speed_knots?: number | null
          guest_capacity?: number | null
          home_port?: string | null
          id?: string
          length_metres?: number | null
          max_speed_knots?: number | null
          name: string
          notes?: string | null
          notification_phone?: string | null
          preferred_ports?: string[]
          status?: Database["public"]["Enums"]["yacht_operational_status"]
          updated_at?: string
          updated_by?: string | null
          year_built?: number | null
        }
        Update: {
          beam_metres?: number | null
          builder?: string | null
          cabin_count?: number | null
          created_at?: string
          created_by?: string | null
          crew_count?: number | null
          cruise_speed_knots?: number | null
          guest_capacity?: number | null
          home_port?: string | null
          id?: string
          length_metres?: number | null
          max_speed_knots?: number | null
          name?: string
          notes?: string | null
          notification_phone?: string | null
          preferred_ports?: string[]
          status?: Database["public"]["Enums"]["yacht_operational_status"]
          updated_at?: string
          updated_by?: string | null
          year_built?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "yachts_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "yachts_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      is_active_staff: { Args: never; Returns: boolean }
      is_administrator: { Args: never; Returns: boolean }
      is_valid_enquiry_transition: {
        Args: {
          current_status: Database["public"]["Enums"]["enquiry_status"]
          target_status: Database["public"]["Enums"]["enquiry_status"]
        }
        Returns: boolean
      }
      transition_enquiry_status: {
        Args: {
          p_enquiry_id: string
          p_new_status: Database["public"]["Enums"]["enquiry_status"]
          p_reason: string
        }
        Returns: {
          broker_company_id: string | null
          broker_contact_id: string | null
          budget_amount: number | null
          charter_end_date: string | null
          charter_start_date: string | null
          created_at: string
          created_by: string | null
          currency: string | null
          customer_contact_id: string | null
          disembarkation_port: string | null
          embarkation_port: string | null
          guest_count: number | null
          id: string
          owner_user_id: string | null
          priority: Database["public"]["Enums"]["enquiry_priority"]
          reference: string
          requested_yacht_id: string | null
          source: Database["public"]["Enums"]["enquiry_source"]
          status: Database["public"]["Enums"]["enquiry_status"]
          summary: string
          updated_at: string
          updated_by: string | null
        }
        SetofOptions: {
          from: "*"
          to: "enquiries"
          isOneToOne: true
          isSetofReturn: false
        }
      }
    }
    Enums: {
      contact_role:
        | "customer"
        | "charterer"
        | "broker"
        | "captain"
        | "crew"
        | "operations"
        | "supplier"
        | "other"
      enquiry_note_kind: "internal" | "requirement" | "follow_up"
      enquiry_priority: "low" | "normal" | "high" | "urgent"
      enquiry_source: "manual" | "email" | "import"
      enquiry_status:
        | "new"
        | "waiting_for_reply"
        | "offer_sent"
        | "negotiating"
        | "contract_issued"
        | "awaiting_signatures"
        | "booked"
        | "charter_active"
        | "completed"
        | "archived"
        | "cancelled"
      user_role: "administrator" | "staff"
      yacht_contact_responsibility:
        | "captain"
        | "manager"
        | "operations"
        | "notification_recipient"
        | "crew"
        | "other"
      yacht_operational_status: "active" | "inactive" | "maintenance"
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
      contact_role: [
        "customer",
        "charterer",
        "broker",
        "captain",
        "crew",
        "operations",
        "supplier",
        "other",
      ],
      enquiry_note_kind: ["internal", "requirement", "follow_up"],
      enquiry_priority: ["low", "normal", "high", "urgent"],
      enquiry_source: ["manual", "email", "import"],
      enquiry_status: [
        "new",
        "waiting_for_reply",
        "offer_sent",
        "negotiating",
        "contract_issued",
        "awaiting_signatures",
        "booked",
        "charter_active",
        "completed",
        "archived",
        "cancelled",
      ],
      user_role: ["administrator", "staff"],
      yacht_contact_responsibility: [
        "captain",
        "manager",
        "operations",
        "notification_recipient",
        "crew",
        "other",
      ],
      yacht_operational_status: ["active", "inactive", "maintenance"],
    },
  },
} as const
