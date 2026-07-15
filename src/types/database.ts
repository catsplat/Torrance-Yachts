// Generated from the local Supabase schema. Regenerate after every migration.
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
    Views: { [_ in never]: never }
    Functions: {
      is_active_staff: { Args: never; Returns: boolean }
      is_administrator: { Args: never; Returns: boolean }
    }
    Enums: {
      user_role: "administrator" | "staff"
      yacht_operational_status: "active" | "inactive" | "maintenance"
    }
    CompositeTypes: { [_ in never]: never }
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

export const Constants = {
  public: {
    Enums: {
      user_role: ["administrator", "staff"],
      yacht_operational_status: ["active", "inactive", "maintenance"],
    },
  },
} as const
