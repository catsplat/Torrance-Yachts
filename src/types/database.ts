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
      ai_runs: {
        Row: {
          analysis_kind: Database["public"]["Enums"]["ai_analysis_kind"]
          completed_at: string | null
          error_code: string | null
          error_message: string | null
          id: string
          input_sha256: string
          input_tokens: number | null
          model: string
          output_tokens: number | null
          prompt_version: string
          provider: string
          provider_request_id: string | null
          request_key: string
          requested_at: string
          requested_by: string
          source_id: string
          source_type: string
          started_at: string | null
          status: Database["public"]["Enums"]["ai_run_status"]
        }
        Insert: {
          analysis_kind: Database["public"]["Enums"]["ai_analysis_kind"]
          completed_at?: string | null
          error_code?: string | null
          error_message?: string | null
          id?: string
          input_sha256: string
          input_tokens?: number | null
          model: string
          output_tokens?: number | null
          prompt_version: string
          provider: string
          provider_request_id?: string | null
          request_key: string
          requested_at?: string
          requested_by: string
          source_id: string
          source_type: string
          started_at?: string | null
          status?: Database["public"]["Enums"]["ai_run_status"]
        }
        Update: {
          analysis_kind?: Database["public"]["Enums"]["ai_analysis_kind"]
          completed_at?: string | null
          error_code?: string | null
          error_message?: string | null
          id?: string
          input_sha256?: string
          input_tokens?: number | null
          model?: string
          output_tokens?: number | null
          prompt_version?: string
          provider?: string
          provider_request_id?: string | null
          request_key?: string
          requested_at?: string
          requested_by?: string
          source_id?: string
          source_type?: string
          started_at?: string | null
          status?: Database["public"]["Enums"]["ai_run_status"]
        }
        Relationships: [
          {
            foreignKeyName: "ai_runs_requested_by_fkey"
            columns: ["requested_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_suggestion_evidence: {
        Row: {
          confidence: number
          created_at: string
          end_offset: number | null
          excerpt: string
          field_path: string
          id: number
          source_id: string
          source_type: string
          start_offset: number | null
          suggestion_id: string
        }
        Insert: {
          confidence: number
          created_at?: string
          end_offset?: number | null
          excerpt: string
          field_path: string
          id?: never
          source_id: string
          source_type: string
          start_offset?: number | null
          suggestion_id: string
        }
        Update: {
          confidence?: number
          created_at?: string
          end_offset?: number | null
          excerpt?: string
          field_path?: string
          id?: never
          source_id?: string
          source_type?: string
          start_offset?: number | null
          suggestion_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ai_suggestion_evidence_suggestion_id_fkey"
            columns: ["suggestion_id"]
            isOneToOne: false
            referencedRelation: "ai_suggestions"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_suggestion_revisions: {
        Row: {
          changed_by: string
          created_at: string
          id: number
          previous_payload: Json
          reason: string
          revised_payload: Json
          suggestion_id: string
        }
        Insert: {
          changed_by: string
          created_at?: string
          id?: never
          previous_payload: Json
          reason: string
          revised_payload: Json
          suggestion_id: string
        }
        Update: {
          changed_by?: string
          created_at?: string
          id?: never
          previous_payload?: Json
          reason?: string
          revised_payload?: Json
          suggestion_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ai_suggestion_revisions_changed_by_fkey"
            columns: ["changed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ai_suggestion_revisions_suggestion_id_fkey"
            columns: ["suggestion_id"]
            isOneToOne: false
            referencedRelation: "ai_suggestions"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_suggestions: {
        Row: {
          analysis_kind: Database["public"]["Enums"]["ai_analysis_kind"]
          confidence: number
          created_at: string
          id: string
          provider_payload: Json
          review_reason: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          reviewed_payload: Json
          run_id: string
          source_id: string
          source_type: string
          status: Database["public"]["Enums"]["ai_suggestion_status"]
          summary: string
          updated_at: string
        }
        Insert: {
          analysis_kind: Database["public"]["Enums"]["ai_analysis_kind"]
          confidence: number
          created_at?: string
          id?: string
          provider_payload: Json
          review_reason?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          reviewed_payload: Json
          run_id: string
          source_id: string
          source_type: string
          status?: Database["public"]["Enums"]["ai_suggestion_status"]
          summary: string
          updated_at?: string
        }
        Update: {
          analysis_kind?: Database["public"]["Enums"]["ai_analysis_kind"]
          confidence?: number
          created_at?: string
          id?: string
          provider_payload?: Json
          review_reason?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          reviewed_payload?: Json
          run_id?: string
          source_id?: string
          source_type?: string
          status?: Database["public"]["Enums"]["ai_suggestion_status"]
          summary?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "ai_suggestions_reviewed_by_fkey"
            columns: ["reviewed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ai_suggestions_run_id_fkey"
            columns: ["run_id"]
            isOneToOne: true
            referencedRelation: "ai_runs"
            referencedColumns: ["id"]
          },
        ]
      }
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
      backup_verifications: {
        Row: {
          artifact_reference: string | null
          checksum_sha256: string | null
          completed_at: string | null
          created_at: string
          environment: string
          id: string
          notes: string
          recorded_by: string
          restore_tested_at: string | null
          scope: string
          started_at: string
          status: Database["public"]["Enums"]["backup_verification_status"]
        }
        Insert: {
          artifact_reference?: string | null
          checksum_sha256?: string | null
          completed_at?: string | null
          created_at?: string
          environment: string
          id?: string
          notes: string
          recorded_by: string
          restore_tested_at?: string | null
          scope: string
          started_at: string
          status: Database["public"]["Enums"]["backup_verification_status"]
        }
        Update: {
          artifact_reference?: string | null
          checksum_sha256?: string | null
          completed_at?: string | null
          created_at?: string
          environment?: string
          id?: string
          notes?: string
          recorded_by?: string
          restore_tested_at?: string | null
          scope?: string
          started_at?: string
          status?: Database["public"]["Enums"]["backup_verification_status"]
        }
        Relationships: [
          {
            foreignKeyName: "backup_verifications_recorded_by_fkey"
            columns: ["recorded_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      booking_document_requirements: {
        Row: {
          booking_id: string
          created_at: string
          document_type: Database["public"]["Enums"]["document_type"]
          id: string
          required: boolean
          status: Database["public"]["Enums"]["document_requirement_status"]
          updated_at: string
          verified_document_id: string | null
          waiver_reason: string | null
        }
        Insert: {
          booking_id: string
          created_at?: string
          document_type: Database["public"]["Enums"]["document_type"]
          id?: string
          required?: boolean
          status?: Database["public"]["Enums"]["document_requirement_status"]
          updated_at?: string
          verified_document_id?: string | null
          waiver_reason?: string | null
        }
        Update: {
          booking_id?: string
          created_at?: string
          document_type?: Database["public"]["Enums"]["document_type"]
          id?: string
          required?: boolean
          status?: Database["public"]["Enums"]["document_requirement_status"]
          updated_at?: string
          verified_document_id?: string | null
          waiver_reason?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "booking_document_requirements_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "bookings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "booking_document_requirements_verified_document_fkey"
            columns: ["verified_document_id"]
            isOneToOne: false
            referencedRelation: "documents"
            referencedColumns: ["id"]
          },
        ]
      }
      booking_reservations: {
        Row: {
          active: boolean
          booking_id: string
          created_at: string
          id: string
          reservation_period: unknown
          reserved_from: string
          reserved_through: string
          updated_at: string
          yacht_id: string
        }
        Insert: {
          active?: boolean
          booking_id: string
          created_at?: string
          id?: string
          reservation_period?: unknown
          reserved_from: string
          reserved_through: string
          updated_at?: string
          yacht_id: string
        }
        Update: {
          active?: boolean
          booking_id?: string
          created_at?: string
          id?: string
          reservation_period?: unknown
          reserved_from?: string
          reserved_through?: string
          updated_at?: string
          yacht_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "booking_reservations_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: true
            referencedRelation: "bookings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "booking_reservations_yacht_id_fkey"
            columns: ["yacht_id"]
            isOneToOne: false
            referencedRelation: "yachts"
            referencedColumns: ["id"]
          },
        ]
      }
      booking_status_history: {
        Row: {
          booking_id: string
          changed_by: string | null
          created_at: string
          from_status: Database["public"]["Enums"]["booking_status"] | null
          id: number
          reason: string
          to_status: Database["public"]["Enums"]["booking_status"]
        }
        Insert: {
          booking_id: string
          changed_by?: string | null
          created_at?: string
          from_status?: Database["public"]["Enums"]["booking_status"] | null
          id?: never
          reason: string
          to_status: Database["public"]["Enums"]["booking_status"]
        }
        Update: {
          booking_id?: string
          changed_by?: string | null
          created_at?: string
          from_status?: Database["public"]["Enums"]["booking_status"] | null
          id?: never
          reason?: string
          to_status?: Database["public"]["Enums"]["booking_status"]
        }
        Relationships: [
          {
            foreignKeyName: "booking_status_history_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "bookings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "booking_status_history_changed_by_fkey"
            columns: ["changed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      bookings: {
        Row: {
          broker_company_id: string | null
          broker_contact_id: string | null
          charter_end_date: string
          charter_fee: number
          charter_start_date: string
          confirmation_reason: string
          created_at: string
          created_by: string | null
          currency: string
          customer_contact_id: string | null
          disembarkation_port: string | null
          embarkation_port: string | null
          enquiry_id: string
          guest_count: number | null
          id: string
          reference: string
          signed_agreement_confirmed_at: string
          signed_agreement_confirmed_by: string
          source_offer_id: string
          status: Database["public"]["Enums"]["booking_status"]
          tax_rate: number
          updated_at: string
          updated_by: string | null
          yacht_id: string
        }
        Insert: {
          broker_company_id?: string | null
          broker_contact_id?: string | null
          charter_end_date: string
          charter_fee: number
          charter_start_date: string
          confirmation_reason: string
          created_at?: string
          created_by?: string | null
          currency: string
          customer_contact_id?: string | null
          disembarkation_port?: string | null
          embarkation_port?: string | null
          enquiry_id: string
          guest_count?: number | null
          id?: string
          reference?: string
          signed_agreement_confirmed_at?: string
          signed_agreement_confirmed_by: string
          source_offer_id: string
          status?: Database["public"]["Enums"]["booking_status"]
          tax_rate: number
          updated_at?: string
          updated_by?: string | null
          yacht_id: string
        }
        Update: {
          broker_company_id?: string | null
          broker_contact_id?: string | null
          charter_end_date?: string
          charter_fee?: number
          charter_start_date?: string
          confirmation_reason?: string
          created_at?: string
          created_by?: string | null
          currency?: string
          customer_contact_id?: string | null
          disembarkation_port?: string | null
          embarkation_port?: string | null
          enquiry_id?: string
          guest_count?: number | null
          id?: string
          reference?: string
          signed_agreement_confirmed_at?: string
          signed_agreement_confirmed_by?: string
          source_offer_id?: string
          status?: Database["public"]["Enums"]["booking_status"]
          tax_rate?: number
          updated_at?: string
          updated_by?: string | null
          yacht_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "bookings_broker_company_id_fkey"
            columns: ["broker_company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bookings_broker_contact_id_fkey"
            columns: ["broker_contact_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bookings_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bookings_customer_contact_id_fkey"
            columns: ["customer_contact_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bookings_enquiry_id_fkey"
            columns: ["enquiry_id"]
            isOneToOne: false
            referencedRelation: "enquiries"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bookings_signed_agreement_confirmed_by_fkey"
            columns: ["signed_agreement_confirmed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bookings_source_offer_id_fkey"
            columns: ["source_offer_id"]
            isOneToOne: false
            referencedRelation: "offers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bookings_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bookings_yacht_id_fkey"
            columns: ["yacht_id"]
            isOneToOne: false
            referencedRelation: "yachts"
            referencedColumns: ["id"]
          },
        ]
      }
      calendar_events: {
        Row: {
          all_day: boolean
          created_at: string
          description: string | null
          end_at: string
          external_event_id: string | null
          external_url: string | null
          id: string
          kind: Database["public"]["Enums"]["calendar_event_kind"]
          last_synced_at: string | null
          revision: number
          source_id: string
          source_type: string
          start_at: string
          status: Database["public"]["Enums"]["calendar_event_status"]
          sync_status: Database["public"]["Enums"]["calendar_sync_status"]
          timezone: string
          title: string
          updated_at: string
        }
        Insert: {
          all_day?: boolean
          created_at?: string
          description?: string | null
          end_at: string
          external_event_id?: string | null
          external_url?: string | null
          id?: string
          kind: Database["public"]["Enums"]["calendar_event_kind"]
          last_synced_at?: string | null
          revision?: number
          source_id: string
          source_type: string
          start_at: string
          status?: Database["public"]["Enums"]["calendar_event_status"]
          sync_status?: Database["public"]["Enums"]["calendar_sync_status"]
          timezone?: string
          title: string
          updated_at?: string
        }
        Update: {
          all_day?: boolean
          created_at?: string
          description?: string | null
          end_at?: string
          external_event_id?: string | null
          external_url?: string | null
          id?: string
          kind?: Database["public"]["Enums"]["calendar_event_kind"]
          last_synced_at?: string | null
          revision?: number
          source_id?: string
          source_type?: string
          start_at?: string
          status?: Database["public"]["Enums"]["calendar_event_status"]
          sync_status?: Database["public"]["Enums"]["calendar_sync_status"]
          timezone?: string
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      commission_calculations: {
        Row: {
          amount: number
          basis_amount: number
          booking_id: string
          calculation_version: string
          contract_review_id: string
          created_at: string
          created_by: string
          currency: string
          id: string
          rate: number
        }
        Insert: {
          amount: number
          basis_amount: number
          booking_id: string
          calculation_version?: string
          contract_review_id: string
          created_at?: string
          created_by: string
          currency: string
          id?: string
          rate: number
        }
        Update: {
          amount?: number
          basis_amount?: number
          booking_id?: string
          calculation_version?: string
          contract_review_id?: string
          created_at?: string
          created_by?: string
          currency?: string
          id?: string
          rate?: number
        }
        Relationships: [
          {
            foreignKeyName: "commission_calculations_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "bookings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "commission_calculations_contract_review_id_fkey"
            columns: ["contract_review_id"]
            isOneToOne: true
            referencedRelation: "contract_reviews"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "commission_calculations_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      communication_templates: {
        Row: {
          approved_at: string | null
          approved_by: string | null
          body_template: string
          created_at: string
          created_by: string | null
          id: string
          kind: Database["public"]["Enums"]["communication_template_kind"]
          name: string
          source_template_id: string | null
          status: Database["public"]["Enums"]["communication_template_status"]
          subject_template: string
          updated_at: string
          updated_by: string | null
          version_number: number
        }
        Insert: {
          approved_at?: string | null
          approved_by?: string | null
          body_template: string
          created_at?: string
          created_by?: string | null
          id?: string
          kind: Database["public"]["Enums"]["communication_template_kind"]
          name: string
          source_template_id?: string | null
          status?: Database["public"]["Enums"]["communication_template_status"]
          subject_template: string
          updated_at?: string
          updated_by?: string | null
          version_number: number
        }
        Update: {
          approved_at?: string | null
          approved_by?: string | null
          body_template?: string
          created_at?: string
          created_by?: string | null
          id?: string
          kind?: Database["public"]["Enums"]["communication_template_kind"]
          name?: string
          source_template_id?: string | null
          status?: Database["public"]["Enums"]["communication_template_status"]
          subject_template?: string
          updated_at?: string
          updated_by?: string | null
          version_number?: number
        }
        Relationships: [
          {
            foreignKeyName: "communication_templates_approved_by_fkey"
            columns: ["approved_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "communication_templates_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "communication_templates_source_template_id_fkey"
            columns: ["source_template_id"]
            isOneToOne: false
            referencedRelation: "communication_templates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "communication_templates_updated_by_fkey"
            columns: ["updated_by"]
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
      contract_reviews: {
        Row: {
          approved_at: string | null
          approved_by: string | null
          booking_id: string
          charter_end_date: string
          charter_fee: number
          charter_start_date: string
          commission_rate: number
          created_at: string
          created_by: string
          currency: string
          disembarkation_port: string | null
          embarkation_port: string | null
          id: string
          review_notes: string
          source_document_id: string
          status: Database["public"]["Enums"]["contract_review_status"]
          tax_rate: number
          updated_at: string
        }
        Insert: {
          approved_at?: string | null
          approved_by?: string | null
          booking_id: string
          charter_end_date: string
          charter_fee: number
          charter_start_date: string
          commission_rate?: number
          created_at?: string
          created_by: string
          currency: string
          disembarkation_port?: string | null
          embarkation_port?: string | null
          id?: string
          review_notes: string
          source_document_id: string
          status?: Database["public"]["Enums"]["contract_review_status"]
          tax_rate: number
          updated_at?: string
        }
        Update: {
          approved_at?: string | null
          approved_by?: string | null
          booking_id?: string
          charter_end_date?: string
          charter_fee?: number
          charter_start_date?: string
          commission_rate?: number
          created_at?: string
          created_by?: string
          currency?: string
          disembarkation_port?: string | null
          embarkation_port?: string | null
          id?: string
          review_notes?: string
          source_document_id?: string
          status?: Database["public"]["Enums"]["contract_review_status"]
          tax_rate?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "contract_reviews_approved_by_fkey"
            columns: ["approved_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contract_reviews_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "bookings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contract_reviews_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contract_reviews_source_document_id_fkey"
            columns: ["source_document_id"]
            isOneToOne: false
            referencedRelation: "documents"
            referencedColumns: ["id"]
          },
        ]
      }
      document_history: {
        Row: {
          action: string
          changed_by: string | null
          created_at: string
          document_id: string
          id: number
          reason: string
        }
        Insert: {
          action: string
          changed_by?: string | null
          created_at?: string
          document_id: string
          id?: never
          reason: string
        }
        Update: {
          action?: string
          changed_by?: string | null
          created_at?: string
          document_id?: string
          id?: never
          reason?: string
        }
        Relationships: [
          {
            foreignKeyName: "document_history_changed_by_fkey"
            columns: ["changed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "document_history_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "documents"
            referencedColumns: ["id"]
          },
        ]
      }
      documents: {
        Row: {
          booking_id: string
          content_sha256: string | null
          created_at: string
          created_by: string
          document_type: Database["public"]["Enums"]["document_type"]
          id: string
          mime_type: string
          original_filename: string
          released_at: string | null
          requirement_id: string | null
          retention_class: string
          retention_review_due_at: string | null
          scan_attempts: number
          scan_completed_at: string | null
          scan_started_at: string | null
          scan_status: Database["public"]["Enums"]["document_scan_status"]
          scanner_detail: string | null
          size_bytes: number
          storage_bucket: string
          storage_path: string
          title: string
          verification_notes: string | null
          verification_status: Database["public"]["Enums"]["document_verification_status"]
          verified_at: string | null
          verified_by: string | null
          version_number: number
        }
        Insert: {
          booking_id: string
          content_sha256?: string | null
          created_at?: string
          created_by: string
          document_type: Database["public"]["Enums"]["document_type"]
          id?: string
          mime_type: string
          original_filename: string
          released_at?: string | null
          requirement_id?: string | null
          retention_class?: string
          retention_review_due_at?: string | null
          scan_attempts?: number
          scan_completed_at?: string | null
          scan_started_at?: string | null
          scan_status?: Database["public"]["Enums"]["document_scan_status"]
          scanner_detail?: string | null
          size_bytes: number
          storage_bucket?: string
          storage_path: string
          title: string
          verification_notes?: string | null
          verification_status?: Database["public"]["Enums"]["document_verification_status"]
          verified_at?: string | null
          verified_by?: string | null
          version_number?: number
        }
        Update: {
          booking_id?: string
          content_sha256?: string | null
          created_at?: string
          created_by?: string
          document_type?: Database["public"]["Enums"]["document_type"]
          id?: string
          mime_type?: string
          original_filename?: string
          released_at?: string | null
          requirement_id?: string | null
          retention_class?: string
          retention_review_due_at?: string | null
          scan_attempts?: number
          scan_completed_at?: string | null
          scan_started_at?: string | null
          scan_status?: Database["public"]["Enums"]["document_scan_status"]
          scanner_detail?: string | null
          size_bytes?: number
          storage_bucket?: string
          storage_path?: string
          title?: string
          verification_notes?: string | null
          verification_status?: Database["public"]["Enums"]["document_verification_status"]
          verified_at?: string | null
          verified_by?: string | null
          version_number?: number
        }
        Relationships: [
          {
            foreignKeyName: "documents_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "bookings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "documents_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "documents_requirement_id_fkey"
            columns: ["requirement_id"]
            isOneToOne: false
            referencedRelation: "booking_document_requirements"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "documents_verified_by_fkey"
            columns: ["verified_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      email_attachments: {
        Row: {
          created_at: string
          filename: string
          id: string
          message_id: string
          mime_type: string
          provider_attachment_id: string
          size_bytes: number
          storage_status: string
        }
        Insert: {
          created_at?: string
          filename: string
          id?: string
          message_id: string
          mime_type: string
          provider_attachment_id: string
          size_bytes: number
          storage_status?: string
        }
        Update: {
          created_at?: string
          filename?: string
          id?: string
          message_id?: string
          mime_type?: string
          provider_attachment_id?: string
          size_bytes?: number
          storage_status?: string
        }
        Relationships: [
          {
            foreignKeyName: "email_attachments_message_id_fkey"
            columns: ["message_id"]
            isOneToOne: false
            referencedRelation: "email_messages"
            referencedColumns: ["id"]
          },
        ]
      }
      email_classification_history: {
        Row: {
          changed_by: string | null
          created_at: string
          from_classification:
            | Database["public"]["Enums"]["email_classification"]
            | null
          id: number
          message_id: string
          reason: string
          to_classification: Database["public"]["Enums"]["email_classification"]
        }
        Insert: {
          changed_by?: string | null
          created_at?: string
          from_classification?:
            | Database["public"]["Enums"]["email_classification"]
            | null
          id?: never
          message_id: string
          reason: string
          to_classification: Database["public"]["Enums"]["email_classification"]
        }
        Update: {
          changed_by?: string | null
          created_at?: string
          from_classification?:
            | Database["public"]["Enums"]["email_classification"]
            | null
          id?: never
          message_id?: string
          reason?: string
          to_classification?: Database["public"]["Enums"]["email_classification"]
        }
        Relationships: [
          {
            foreignKeyName: "email_classification_history_changed_by_fkey"
            columns: ["changed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "email_classification_history_message_id_fkey"
            columns: ["message_id"]
            isOneToOne: false
            referencedRelation: "email_messages"
            referencedColumns: ["id"]
          },
        ]
      }
      email_ingestion_events: {
        Row: {
          completed_at: string | null
          error_code: string | null
          id: string
          message_id: string | null
          provider_event_id: string
          provider_message_id: string
          received_at: string
          status: string
        }
        Insert: {
          completed_at?: string | null
          error_code?: string | null
          id?: string
          message_id?: string | null
          provider_event_id: string
          provider_message_id: string
          received_at?: string
          status: string
        }
        Update: {
          completed_at?: string | null
          error_code?: string | null
          id?: string
          message_id?: string | null
          provider_event_id?: string
          provider_message_id?: string
          received_at?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "email_ingestion_events_message_id_fkey"
            columns: ["message_id"]
            isOneToOne: false
            referencedRelation: "email_messages"
            referencedColumns: ["id"]
          },
        ]
      }
      email_messages: {
        Row: {
          body_text: string
          cc_emails: string[]
          classification: Database["public"]["Enums"]["email_classification"]
          classification_reason: string | null
          classified_at: string | null
          classified_by: string | null
          created_at: string
          deterministic_rule: string | null
          gmail_label_ids: string[]
          has_attachments: boolean
          id: string
          internet_message_id: string | null
          processing_status: Database["public"]["Enums"]["email_processing_status"]
          provider: string
          provider_message_id: string
          received_at: string
          recipient_emails: string[]
          sender_email: string
          sender_name: string | null
          snippet: string
          subject: string
          thread_id: string
        }
        Insert: {
          body_text?: string
          cc_emails?: string[]
          classification?: Database["public"]["Enums"]["email_classification"]
          classification_reason?: string | null
          classified_at?: string | null
          classified_by?: string | null
          created_at?: string
          deterministic_rule?: string | null
          gmail_label_ids?: string[]
          has_attachments?: boolean
          id?: string
          internet_message_id?: string | null
          processing_status?: Database["public"]["Enums"]["email_processing_status"]
          provider?: string
          provider_message_id: string
          received_at: string
          recipient_emails?: string[]
          sender_email: string
          sender_name?: string | null
          snippet?: string
          subject: string
          thread_id: string
        }
        Update: {
          body_text?: string
          cc_emails?: string[]
          classification?: Database["public"]["Enums"]["email_classification"]
          classification_reason?: string | null
          classified_at?: string | null
          classified_by?: string | null
          created_at?: string
          deterministic_rule?: string | null
          gmail_label_ids?: string[]
          has_attachments?: boolean
          id?: string
          internet_message_id?: string | null
          processing_status?: Database["public"]["Enums"]["email_processing_status"]
          provider?: string
          provider_message_id?: string
          received_at?: string
          recipient_emails?: string[]
          sender_email?: string
          sender_name?: string | null
          snippet?: string
          subject?: string
          thread_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "email_messages_classified_by_fkey"
            columns: ["classified_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "email_messages_thread_id_fkey"
            columns: ["thread_id"]
            isOneToOne: false
            referencedRelation: "email_threads"
            referencedColumns: ["id"]
          },
        ]
      }
      email_provider_actions: {
        Row: {
          action_type: Database["public"]["Enums"]["email_provider_action_type"]
          attempt_count: number
          completed_at: string | null
          created_at: string
          id: string
          last_error: string | null
          message_id: string
          status: Database["public"]["Enums"]["email_provider_action_status"]
          updated_at: string
        }
        Insert: {
          action_type: Database["public"]["Enums"]["email_provider_action_type"]
          attempt_count?: number
          completed_at?: string | null
          created_at?: string
          id?: string
          last_error?: string | null
          message_id: string
          status?: Database["public"]["Enums"]["email_provider_action_status"]
          updated_at?: string
        }
        Update: {
          action_type?: Database["public"]["Enums"]["email_provider_action_type"]
          attempt_count?: number
          completed_at?: string | null
          created_at?: string
          id?: string
          last_error?: string | null
          message_id?: string
          status?: Database["public"]["Enums"]["email_provider_action_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "email_provider_actions_message_id_fkey"
            columns: ["message_id"]
            isOneToOne: false
            referencedRelation: "email_messages"
            referencedColumns: ["id"]
          },
        ]
      }
      email_threads: {
        Row: {
          created_at: string
          enquiry_id: string | null
          first_message_at: string
          id: string
          last_message_at: string
          message_count: number
          participants: string[]
          provider: string
          provider_thread_id: string
          subject: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          enquiry_id?: string | null
          first_message_at: string
          id?: string
          last_message_at: string
          message_count?: number
          participants?: string[]
          provider?: string
          provider_thread_id: string
          subject: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          enquiry_id?: string | null
          first_message_at?: string
          id?: string
          last_message_at?: string
          message_count?: number
          participants?: string[]
          provider?: string
          provider_thread_id?: string
          subject?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "email_threads_enquiry_id_fkey"
            columns: ["enquiry_id"]
            isOneToOne: false
            referencedRelation: "enquiries"
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
      generated_invoices: {
        Row: {
          amount: number
          booking_id: string
          commission_calculation_id: string
          currency: string
          document_id: string
          generated_at: string
          generated_by: string | null
          id: string
          invoice_number: string
          invoice_profile_id: string
          issue_date: string
          service_description: string
        }
        Insert: {
          amount: number
          booking_id: string
          commission_calculation_id: string
          currency: string
          document_id: string
          generated_at?: string
          generated_by?: string | null
          id?: string
          invoice_number: string
          invoice_profile_id: string
          issue_date: string
          service_description: string
        }
        Update: {
          amount?: number
          booking_id?: string
          commission_calculation_id?: string
          currency?: string
          document_id?: string
          generated_at?: string
          generated_by?: string | null
          id?: string
          invoice_number?: string
          invoice_profile_id?: string
          issue_date?: string
          service_description?: string
        }
        Relationships: [
          {
            foreignKeyName: "generated_invoices_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "bookings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "generated_invoices_commission_calculation_id_fkey"
            columns: ["commission_calculation_id"]
            isOneToOne: false
            referencedRelation: "commission_calculations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "generated_invoices_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "documents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "generated_invoices_generated_by_fkey"
            columns: ["generated_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "generated_invoices_invoice_profile_id_fkey"
            columns: ["invoice_profile_id"]
            isOneToOne: false
            referencedRelation: "invoice_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      gmail_ingestion_settings: {
        Row: {
          enabled: boolean
          singleton: boolean
          updated_at: string
          updated_by: string | null
          user_id: string | null
        }
        Insert: {
          enabled?: boolean
          singleton?: boolean
          updated_at?: string
          updated_by?: string | null
          user_id?: string | null
        }
        Update: {
          enabled?: boolean
          singleton?: boolean
          updated_at?: string
          updated_by?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "gmail_ingestion_settings_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "gmail_ingestion_settings_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      gmail_reconciliation_states: {
        Row: {
          account_email: string
          last_error: string | null
          last_failure_at: string | null
          last_history_id: string | null
          last_success_at: string | null
          last_sync_at: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          account_email: string
          last_error?: string | null
          last_failure_at?: string | null
          last_history_id?: string | null
          last_success_at?: string | null
          last_sync_at?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          account_email?: string
          last_error?: string | null
          last_failure_at?: string | null
          last_history_id?: string | null
          last_success_at?: string | null
          last_sync_at?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "gmail_reconciliation_states_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      integration_connections: {
        Row: {
          configuration_notes: string | null
          display_name: string
          enabled: boolean
          last_error: string | null
          last_failure_at: string | null
          last_success_at: string | null
          provider: Database["public"]["Enums"]["integration_provider"]
          target_reference: string | null
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          configuration_notes?: string | null
          display_name: string
          enabled?: boolean
          last_error?: string | null
          last_failure_at?: string | null
          last_success_at?: string | null
          provider: Database["public"]["Enums"]["integration_provider"]
          target_reference?: string | null
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          configuration_notes?: string | null
          display_name?: string
          enabled?: boolean
          last_error?: string | null
          last_failure_at?: string | null
          last_success_at?: string | null
          provider?: Database["public"]["Enums"]["integration_provider"]
          target_reference?: string | null
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "integration_connections_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      integration_deliveries: {
        Row: {
          attempt_count: number
          claimed_at: string | null
          claimed_by: string | null
          created_at: string
          credential_user_id: string | null
          delivered_at: string | null
          external_id: string | null
          external_url: string | null
          id: string
          idempotency_key: string
          last_error_code: string | null
          last_error_message: string | null
          lease_expires_at: string | null
          next_attempt_at: string
          operation: Database["public"]["Enums"]["integration_operation"]
          payload: Json
          provider: Database["public"]["Enums"]["integration_provider"]
          source_id: string
          source_type: string
          status: Database["public"]["Enums"]["integration_delivery_status"]
          updated_at: string
        }
        Insert: {
          attempt_count?: number
          claimed_at?: string | null
          claimed_by?: string | null
          created_at?: string
          credential_user_id?: string | null
          delivered_at?: string | null
          external_id?: string | null
          external_url?: string | null
          id?: string
          idempotency_key: string
          last_error_code?: string | null
          last_error_message?: string | null
          lease_expires_at?: string | null
          next_attempt_at?: string
          operation: Database["public"]["Enums"]["integration_operation"]
          payload?: Json
          provider: Database["public"]["Enums"]["integration_provider"]
          source_id: string
          source_type: string
          status?: Database["public"]["Enums"]["integration_delivery_status"]
          updated_at?: string
        }
        Update: {
          attempt_count?: number
          claimed_at?: string | null
          claimed_by?: string | null
          created_at?: string
          credential_user_id?: string | null
          delivered_at?: string | null
          external_id?: string | null
          external_url?: string | null
          id?: string
          idempotency_key?: string
          last_error_code?: string | null
          last_error_message?: string | null
          lease_expires_at?: string | null
          next_attempt_at?: string
          operation?: Database["public"]["Enums"]["integration_operation"]
          payload?: Json
          provider?: Database["public"]["Enums"]["integration_provider"]
          source_id?: string
          source_type?: string
          status?: Database["public"]["Enums"]["integration_delivery_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "integration_deliveries_credential_user_id_fkey"
            columns: ["credential_user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      integration_snapshots: {
        Row: {
          delivered_at: string | null
          id: string
          payload: Json
          payload_sha256: string
          requested_at: string
          requested_by: string | null
          row_count: number
          snapshot_type: string
          status: Database["public"]["Enums"]["integration_snapshot_status"]
        }
        Insert: {
          delivered_at?: string | null
          id?: string
          payload: Json
          payload_sha256: string
          requested_at?: string
          requested_by?: string | null
          row_count: number
          snapshot_type: string
          status?: Database["public"]["Enums"]["integration_snapshot_status"]
        }
        Update: {
          delivered_at?: string | null
          id?: string
          payload?: Json
          payload_sha256?: string
          requested_at?: string
          requested_by?: string | null
          row_count?: number
          snapshot_type?: string
          status?: Database["public"]["Enums"]["integration_snapshot_status"]
        }
        Relationships: [
          {
            foreignKeyName: "integration_snapshots_requested_by_fkey"
            columns: ["requested_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      invoice_profiles: {
        Row: {
          approved_at: string | null
          approved_by: string | null
          created_at: string
          created_by: string | null
          id: string
          issuer_address: string
          issuer_name: string
          payment_instructions: string
          profile_name: string
          recipient_address: string
          recipient_email: string | null
          recipient_name: string
          rehearsal_run_id: string | null
          service_description_template: string
          source_profile_id: string | null
          status: Database["public"]["Enums"]["invoice_profile_status"]
          updated_at: string
          version_number: number
        }
        Insert: {
          approved_at?: string | null
          approved_by?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          issuer_address: string
          issuer_name: string
          payment_instructions: string
          profile_name: string
          recipient_address: string
          recipient_email?: string | null
          recipient_name: string
          rehearsal_run_id?: string | null
          service_description_template: string
          source_profile_id?: string | null
          status?: Database["public"]["Enums"]["invoice_profile_status"]
          updated_at?: string
          version_number: number
        }
        Update: {
          approved_at?: string | null
          approved_by?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          issuer_address?: string
          issuer_name?: string
          payment_instructions?: string
          profile_name?: string
          recipient_address?: string
          recipient_email?: string | null
          recipient_name?: string
          rehearsal_run_id?: string | null
          service_description_template?: string
          source_profile_id?: string | null
          status?: Database["public"]["Enums"]["invoice_profile_status"]
          updated_at?: string
          version_number?: number
        }
        Relationships: [
          {
            foreignKeyName: "invoice_profiles_approved_by_fkey"
            columns: ["approved_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoice_profiles_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoice_profiles_rehearsal_run_id_fkey"
            columns: ["rehearsal_run_id"]
            isOneToOne: false
            referencedRelation: "rehearsal_runs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoice_profiles_source_profile_id_fkey"
            columns: ["source_profile_id"]
            isOneToOne: false
            referencedRelation: "invoice_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      launch_readiness_checks: {
        Row: {
          category: string
          check_key: string
          description: string
          evidence: string | null
          id: string
          required: boolean
          reviewed_at: string | null
          reviewed_by: string | null
          status: Database["public"]["Enums"]["launch_check_status"]
          title: string
          updated_at: string
        }
        Insert: {
          category: string
          check_key: string
          description: string
          evidence?: string | null
          id?: string
          required?: boolean
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: Database["public"]["Enums"]["launch_check_status"]
          title: string
          updated_at?: string
        }
        Update: {
          category?: string
          check_key?: string
          description?: string
          evidence?: string | null
          id?: string
          required?: boolean
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: Database["public"]["Enums"]["launch_check_status"]
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "launch_readiness_checks_reviewed_by_fkey"
            columns: ["reviewed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          action_url: string | null
          approval_reason: string | null
          approved_at: string | null
          approved_by: string | null
          body: string
          channel: Database["public"]["Enums"]["notification_channel"]
          created_at: string
          created_by: string | null
          delivered_at: string | null
          id: string
          idempotency_key: string
          notification_type: string
          priority: Database["public"]["Enums"]["notification_priority"]
          read_at: string | null
          recipient_contact_id: string | null
          recipient_user_id: string | null
          requires_approval: boolean
          source_id: string
          source_type: string
          status: Database["public"]["Enums"]["notification_status"]
          title: string
          updated_at: string
        }
        Insert: {
          action_url?: string | null
          approval_reason?: string | null
          approved_at?: string | null
          approved_by?: string | null
          body: string
          channel: Database["public"]["Enums"]["notification_channel"]
          created_at?: string
          created_by?: string | null
          delivered_at?: string | null
          id?: string
          idempotency_key: string
          notification_type: string
          priority?: Database["public"]["Enums"]["notification_priority"]
          read_at?: string | null
          recipient_contact_id?: string | null
          recipient_user_id?: string | null
          requires_approval?: boolean
          source_id: string
          source_type: string
          status?: Database["public"]["Enums"]["notification_status"]
          title: string
          updated_at?: string
        }
        Update: {
          action_url?: string | null
          approval_reason?: string | null
          approved_at?: string | null
          approved_by?: string | null
          body?: string
          channel?: Database["public"]["Enums"]["notification_channel"]
          created_at?: string
          created_by?: string | null
          delivered_at?: string | null
          id?: string
          idempotency_key?: string
          notification_type?: string
          priority?: Database["public"]["Enums"]["notification_priority"]
          read_at?: string | null
          recipient_contact_id?: string | null
          recipient_user_id?: string | null
          requires_approval?: boolean
          source_id?: string
          source_type?: string
          status?: Database["public"]["Enums"]["notification_status"]
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "notifications_approved_by_fkey"
            columns: ["approved_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notifications_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notifications_recipient_contact_id_fkey"
            columns: ["recipient_contact_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notifications_recipient_user_id_fkey"
            columns: ["recipient_user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      offer_status_history: {
        Row: {
          changed_by: string | null
          created_at: string
          from_status: Database["public"]["Enums"]["offer_status"] | null
          id: number
          offer_id: string
          reason: string
          to_status: Database["public"]["Enums"]["offer_status"]
        }
        Insert: {
          changed_by?: string | null
          created_at?: string
          from_status?: Database["public"]["Enums"]["offer_status"] | null
          id?: never
          offer_id: string
          reason: string
          to_status: Database["public"]["Enums"]["offer_status"]
        }
        Update: {
          changed_by?: string | null
          created_at?: string
          from_status?: Database["public"]["Enums"]["offer_status"] | null
          id?: never
          offer_id?: string
          reason?: string
          to_status?: Database["public"]["Enums"]["offer_status"]
        }
        Relationships: [
          {
            foreignKeyName: "offer_status_history_changed_by_fkey"
            columns: ["changed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "offer_status_history_offer_id_fkey"
            columns: ["offer_id"]
            isOneToOne: false
            referencedRelation: "offers"
            referencedColumns: ["id"]
          },
        ]
      }
      offers: {
        Row: {
          approved_at: string | null
          approved_by: string | null
          body_snapshot: string
          charter_days: number
          charter_end_date: string
          charter_start_date: string
          created_at: string
          created_by: string | null
          currency: string
          enquiry_id: string
          id: string
          pricing_basis: Database["public"]["Enums"]["offer_pricing_basis"]
          proposed_charter_fee: number
          rate_period_id: string | null
          recipient_name: string
          reference: string
          sent_at: string | null
          sent_by: string | null
          short_charter_divisor_snapshot: number
          source_offer_id: string | null
          status: Database["public"]["Enums"]["offer_status"]
          subject_snapshot: string
          tax_rate_snapshot: number
          template_version_id: string
          updated_at: string
          updated_by: string | null
          version_number: number
          weekly_rate_snapshot: number
          yacht_id: string
        }
        Insert: {
          approved_at?: string | null
          approved_by?: string | null
          body_snapshot: string
          charter_days: number
          charter_end_date: string
          charter_start_date: string
          created_at?: string
          created_by?: string | null
          currency: string
          enquiry_id: string
          id?: string
          pricing_basis?: Database["public"]["Enums"]["offer_pricing_basis"]
          proposed_charter_fee: number
          rate_period_id?: string | null
          recipient_name: string
          reference?: string
          sent_at?: string | null
          sent_by?: string | null
          short_charter_divisor_snapshot: number
          source_offer_id?: string | null
          status?: Database["public"]["Enums"]["offer_status"]
          subject_snapshot: string
          tax_rate_snapshot: number
          template_version_id: string
          updated_at?: string
          updated_by?: string | null
          version_number: number
          weekly_rate_snapshot: number
          yacht_id: string
        }
        Update: {
          approved_at?: string | null
          approved_by?: string | null
          body_snapshot?: string
          charter_days?: number
          charter_end_date?: string
          charter_start_date?: string
          created_at?: string
          created_by?: string | null
          currency?: string
          enquiry_id?: string
          id?: string
          pricing_basis?: Database["public"]["Enums"]["offer_pricing_basis"]
          proposed_charter_fee?: number
          rate_period_id?: string | null
          recipient_name?: string
          reference?: string
          sent_at?: string | null
          sent_by?: string | null
          short_charter_divisor_snapshot?: number
          source_offer_id?: string | null
          status?: Database["public"]["Enums"]["offer_status"]
          subject_snapshot?: string
          tax_rate_snapshot?: number
          template_version_id?: string
          updated_at?: string
          updated_by?: string | null
          version_number?: number
          weekly_rate_snapshot?: number
          yacht_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "offers_approved_by_fkey"
            columns: ["approved_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "offers_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "offers_enquiry_id_fkey"
            columns: ["enquiry_id"]
            isOneToOne: false
            referencedRelation: "enquiries"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "offers_rate_period_id_fkey"
            columns: ["rate_period_id"]
            isOneToOne: false
            referencedRelation: "yacht_rate_periods"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "offers_sent_by_fkey"
            columns: ["sent_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "offers_source_offer_id_fkey"
            columns: ["source_offer_id"]
            isOneToOne: false
            referencedRelation: "offers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "offers_template_version_id_fkey"
            columns: ["template_version_id"]
            isOneToOne: false
            referencedRelation: "yacht_offer_templates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "offers_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "offers_yacht_id_fkey"
            columns: ["yacht_id"]
            isOneToOne: false
            referencedRelation: "yachts"
            referencedColumns: ["id"]
          },
        ]
      }
      operational_settings: {
        Row: {
          enquiry_timeout_enabled: boolean
          id: boolean
          internal_email_domains: string[]
          negotiating_timeout_days: number
          new_enquiry_timeout_days: number
          offer_sent_timeout_days: number
          updated_at: string
          updated_by: string | null
          waiting_reply_timeout_days: number
        }
        Insert: {
          enquiry_timeout_enabled?: boolean
          id?: boolean
          internal_email_domains?: string[]
          negotiating_timeout_days?: number
          new_enquiry_timeout_days?: number
          offer_sent_timeout_days?: number
          updated_at?: string
          updated_by?: string | null
          waiting_reply_timeout_days?: number
        }
        Update: {
          enquiry_timeout_enabled?: boolean
          id?: boolean
          internal_email_domains?: string[]
          negotiating_timeout_days?: number
          new_enquiry_timeout_days?: number
          offer_sent_timeout_days?: number
          updated_at?: string
          updated_by?: string | null
          waiting_reply_timeout_days?: number
        }
        Relationships: [
          {
            foreignKeyName: "operational_settings_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      payment_schedules: {
        Row: {
          amount: number
          booking_id: string
          contract_review_id: string
          created_at: string
          created_by: string
          currency: string
          due_date: string
          id: string
          instalment_number: number
          notes: string | null
          paid_at: string | null
          status: Database["public"]["Enums"]["payment_status"]
          updated_at: string
          updated_by: string
        }
        Insert: {
          amount: number
          booking_id: string
          contract_review_id: string
          created_at?: string
          created_by: string
          currency: string
          due_date: string
          id?: string
          instalment_number: number
          notes?: string | null
          paid_at?: string | null
          status?: Database["public"]["Enums"]["payment_status"]
          updated_at?: string
          updated_by: string
        }
        Update: {
          amount?: number
          booking_id?: string
          contract_review_id?: string
          created_at?: string
          created_by?: string
          currency?: string
          due_date?: string
          id?: string
          instalment_number?: number
          notes?: string | null
          paid_at?: string | null
          status?: Database["public"]["Enums"]["payment_status"]
          updated_at?: string
          updated_by?: string
        }
        Relationships: [
          {
            foreignKeyName: "payment_schedules_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "bookings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payment_schedules_contract_review_id_fkey"
            columns: ["contract_review_id"]
            isOneToOne: false
            referencedRelation: "contract_reviews"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payment_schedules_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payment_schedules_updated_by_fkey"
            columns: ["updated_by"]
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
      rehearsal_run_records: {
        Row: {
          created_at: string
          entity_id: string
          entity_type: string
          rehearsal_run_id: string
        }
        Insert: {
          created_at?: string
          entity_id: string
          entity_type: string
          rehearsal_run_id: string
        }
        Update: {
          created_at?: string
          entity_id?: string
          entity_type?: string
          rehearsal_run_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "rehearsal_run_records_rehearsal_run_id_fkey"
            columns: ["rehearsal_run_id"]
            isOneToOne: false
            referencedRelation: "rehearsal_runs"
            referencedColumns: ["id"]
          },
        ]
      }
      rehearsal_runs: {
        Row: {
          created_at: string
          created_by: string
          id: string
          label: string
          record_counts: Json
          reset_at: string | null
          reset_by: string | null
          reset_reason: string | null
          status: string
        }
        Insert: {
          created_at?: string
          created_by: string
          id?: string
          label: string
          record_counts?: Json
          reset_at?: string | null
          reset_by?: string | null
          reset_reason?: string | null
          status?: string
        }
        Update: {
          created_at?: string
          created_by?: string
          id?: string
          label?: string
          record_counts?: Json
          reset_at?: string | null
          reset_by?: string | null
          reset_reason?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "rehearsal_runs_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rehearsal_runs_reset_by_fkey"
            columns: ["reset_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      task_dependencies: {
        Row: {
          created_at: string
          depends_on_task_id: string
          task_id: string
        }
        Insert: {
          created_at?: string
          depends_on_task_id: string
          task_id: string
        }
        Update: {
          created_at?: string
          depends_on_task_id?: string
          task_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "task_dependencies_depends_on_task_id_fkey"
            columns: ["depends_on_task_id"]
            isOneToOne: false
            referencedRelation: "tasks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "task_dependencies_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "tasks"
            referencedColumns: ["id"]
          },
        ]
      }
      task_history: {
        Row: {
          action: string
          changed_by: string | null
          created_at: string
          from_status: Database["public"]["Enums"]["task_status"] | null
          id: number
          metadata: Json
          reason: string
          task_id: string
          to_status: Database["public"]["Enums"]["task_status"] | null
        }
        Insert: {
          action: string
          changed_by?: string | null
          created_at?: string
          from_status?: Database["public"]["Enums"]["task_status"] | null
          id?: never
          metadata?: Json
          reason: string
          task_id: string
          to_status?: Database["public"]["Enums"]["task_status"] | null
        }
        Update: {
          action?: string
          changed_by?: string | null
          created_at?: string
          from_status?: Database["public"]["Enums"]["task_status"] | null
          id?: never
          metadata?: Json
          reason?: string
          task_id?: string
          to_status?: Database["public"]["Enums"]["task_status"] | null
        }
        Relationships: [
          {
            foreignKeyName: "task_history_changed_by_fkey"
            columns: ["changed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "task_history_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "tasks"
            referencedColumns: ["id"]
          },
        ]
      }
      task_notes: {
        Row: {
          body: string
          created_at: string
          created_by: string | null
          id: string
          task_id: string
        }
        Insert: {
          body: string
          created_at?: string
          created_by?: string | null
          id?: string
          task_id: string
        }
        Update: {
          body?: string
          created_at?: string
          created_by?: string | null
          id?: string
          task_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "task_notes_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "task_notes_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "tasks"
            referencedColumns: ["id"]
          },
        ]
      }
      task_template_step_dependencies: {
        Row: {
          created_at: string
          depends_on_step_id: string
          step_id: string
        }
        Insert: {
          created_at?: string
          depends_on_step_id: string
          step_id: string
        }
        Update: {
          created_at?: string
          depends_on_step_id?: string
          step_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "task_template_step_dependencies_depends_on_step_id_fkey"
            columns: ["depends_on_step_id"]
            isOneToOne: false
            referencedRelation: "task_template_steps"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "task_template_step_dependencies_step_id_fkey"
            columns: ["step_id"]
            isOneToOne: false
            referencedRelation: "task_template_steps"
            referencedColumns: ["id"]
          },
        ]
      }
      task_template_steps: {
        Row: {
          auto_complete_on_generation: boolean
          created_at: string
          created_by: string | null
          description: string | null
          due_anchor: Database["public"]["Enums"]["task_due_anchor"]
          due_date_required: boolean
          due_offset_days: number
          escalation_after_days: number | null
          external_action: Database["public"]["Enums"]["task_external_action"]
          id: string
          priority: Database["public"]["Enums"]["task_priority"]
          reminder_lead_days: number | null
          required: boolean
          sort_order: number
          step_code: string
          template_id: string
          title: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          auto_complete_on_generation?: boolean
          created_at?: string
          created_by?: string | null
          description?: string | null
          due_anchor?: Database["public"]["Enums"]["task_due_anchor"]
          due_date_required?: boolean
          due_offset_days?: number
          escalation_after_days?: number | null
          external_action?: Database["public"]["Enums"]["task_external_action"]
          id?: string
          priority?: Database["public"]["Enums"]["task_priority"]
          reminder_lead_days?: number | null
          required?: boolean
          sort_order?: number
          step_code: string
          template_id: string
          title: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          auto_complete_on_generation?: boolean
          created_at?: string
          created_by?: string | null
          description?: string | null
          due_anchor?: Database["public"]["Enums"]["task_due_anchor"]
          due_date_required?: boolean
          due_offset_days?: number
          escalation_after_days?: number | null
          external_action?: Database["public"]["Enums"]["task_external_action"]
          id?: string
          priority?: Database["public"]["Enums"]["task_priority"]
          reminder_lead_days?: number | null
          required?: boolean
          sort_order?: number
          step_code?: string
          template_id?: string
          title?: string
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "task_template_steps_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "task_template_steps_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "task_templates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "task_template_steps_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      task_templates: {
        Row: {
          approved_at: string | null
          approved_by: string | null
          created_at: string
          created_by: string | null
          description: string | null
          id: string
          is_default: boolean
          name: string
          source_template_id: string | null
          status: Database["public"]["Enums"]["task_template_status"]
          updated_at: string
          updated_by: string | null
          version_number: number
        }
        Insert: {
          approved_at?: string | null
          approved_by?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          is_default?: boolean
          name: string
          source_template_id?: string | null
          status?: Database["public"]["Enums"]["task_template_status"]
          updated_at?: string
          updated_by?: string | null
          version_number: number
        }
        Update: {
          approved_at?: string | null
          approved_by?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          is_default?: boolean
          name?: string
          source_template_id?: string | null
          status?: Database["public"]["Enums"]["task_template_status"]
          updated_at?: string
          updated_by?: string | null
          version_number?: number
        }
        Relationships: [
          {
            foreignKeyName: "task_templates_approved_by_fkey"
            columns: ["approved_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "task_templates_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "task_templates_source_template_id_fkey"
            columns: ["source_template_id"]
            isOneToOne: false
            referencedRelation: "task_templates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "task_templates_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      tasks: {
        Row: {
          assigned_user_id: string | null
          blocked_reason: string | null
          booking_id: string
          cancelled_at: string | null
          cancelled_by: string | null
          completed_at: string | null
          completed_by: string | null
          created_at: string
          created_by: string | null
          description: string | null
          due_anchor: Database["public"]["Enums"]["task_due_anchor"]
          due_date: string | null
          due_date_required: boolean
          due_offset_days: number
          escalation_after_days: number | null
          external_action: Database["public"]["Enums"]["task_external_action"]
          id: string
          priority: Database["public"]["Enums"]["task_priority"]
          reference: string
          reminder_lead_days: number | null
          required: boolean
          source: Database["public"]["Enums"]["task_source"]
          status: Database["public"]["Enums"]["task_status"]
          step_code: string | null
          template_id: string | null
          template_step_id: string | null
          title: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          assigned_user_id?: string | null
          blocked_reason?: string | null
          booking_id: string
          cancelled_at?: string | null
          cancelled_by?: string | null
          completed_at?: string | null
          completed_by?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          due_anchor?: Database["public"]["Enums"]["task_due_anchor"]
          due_date?: string | null
          due_date_required?: boolean
          due_offset_days?: number
          escalation_after_days?: number | null
          external_action?: Database["public"]["Enums"]["task_external_action"]
          id?: string
          priority?: Database["public"]["Enums"]["task_priority"]
          reference?: string
          reminder_lead_days?: number | null
          required?: boolean
          source: Database["public"]["Enums"]["task_source"]
          status?: Database["public"]["Enums"]["task_status"]
          step_code?: string | null
          template_id?: string | null
          template_step_id?: string | null
          title: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          assigned_user_id?: string | null
          blocked_reason?: string | null
          booking_id?: string
          cancelled_at?: string | null
          cancelled_by?: string | null
          completed_at?: string | null
          completed_by?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          due_anchor?: Database["public"]["Enums"]["task_due_anchor"]
          due_date?: string | null
          due_date_required?: boolean
          due_offset_days?: number
          escalation_after_days?: number | null
          external_action?: Database["public"]["Enums"]["task_external_action"]
          id?: string
          priority?: Database["public"]["Enums"]["task_priority"]
          reference?: string
          reminder_lead_days?: number | null
          required?: boolean
          source?: Database["public"]["Enums"]["task_source"]
          status?: Database["public"]["Enums"]["task_status"]
          step_code?: string | null
          template_id?: string | null
          template_step_id?: string | null
          title?: string
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "tasks_assigned_user_id_fkey"
            columns: ["assigned_user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tasks_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "bookings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tasks_cancelled_by_fkey"
            columns: ["cancelled_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tasks_completed_by_fkey"
            columns: ["completed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tasks_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tasks_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "task_templates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tasks_template_step_id_fkey"
            columns: ["template_step_id"]
            isOneToOne: false
            referencedRelation: "task_template_steps"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tasks_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      telegram_pairing_requests: {
        Row: {
          consumed_at: string | null
          created_at: string
          expires_at: string
          id: string
          token_hash: string
          user_id: string
        }
        Insert: {
          consumed_at?: string | null
          created_at?: string
          expires_at: string
          id?: string
          token_hash: string
          user_id: string
        }
        Update: {
          consumed_at?: string | null
          created_at?: string
          expires_at?: string
          id?: string
          token_hash?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "telegram_pairing_requests_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      tutorial_history: {
        Row: {
          created_at: string
          details: Json
          event_type: string
          id: string
          practice_stage: Database["public"]["Enums"]["tutorial_practice_stage"]
          step: number
          user_id: string
        }
        Insert: {
          created_at?: string
          details?: Json
          event_type: string
          id?: string
          practice_stage: Database["public"]["Enums"]["tutorial_practice_stage"]
          step: number
          user_id: string
        }
        Update: {
          created_at?: string
          details?: Json
          event_type?: string
          id?: string
          practice_stage?: Database["public"]["Enums"]["tutorial_practice_stage"]
          step?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "tutorial_history_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      tutorial_sessions: {
        Row: {
          completed_at: string | null
          current_step: number
          paused_at: string | null
          practice_stage: Database["public"]["Enums"]["tutorial_practice_stage"]
          reset_count: number
          started_at: string | null
          status: Database["public"]["Enums"]["tutorial_status"]
          updated_at: string
          user_id: string
        }
        Insert: {
          completed_at?: string | null
          current_step?: number
          paused_at?: string | null
          practice_stage?: Database["public"]["Enums"]["tutorial_practice_stage"]
          reset_count?: number
          started_at?: string | null
          status?: Database["public"]["Enums"]["tutorial_status"]
          updated_at?: string
          user_id: string
        }
        Update: {
          completed_at?: string | null
          current_step?: number
          paused_at?: string | null
          practice_stage?: Database["public"]["Enums"]["tutorial_practice_stage"]
          reset_count?: number
          started_at?: string | null
          status?: Database["public"]["Enums"]["tutorial_status"]
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "tutorial_sessions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      user_notification_preferences: {
        Row: {
          ai_summary_enabled: boolean
          charter_enabled: boolean
          created_at: string
          email_enabled: boolean
          follow_up_enabled: boolean
          in_app_enabled: boolean
          integration_failure_enabled: boolean
          internal_email_enabled: boolean
          new_enquiry_enabled: boolean
          notification_email: string | null
          payment_enabled: boolean
          task_enabled: boolean
          telegram_enabled: boolean
          unknown_email_enabled: boolean
          updated_at: string
          updated_by: string | null
          user_id: string
        }
        Insert: {
          ai_summary_enabled?: boolean
          charter_enabled?: boolean
          created_at?: string
          email_enabled?: boolean
          follow_up_enabled?: boolean
          in_app_enabled?: boolean
          integration_failure_enabled?: boolean
          internal_email_enabled?: boolean
          new_enquiry_enabled?: boolean
          notification_email?: string | null
          payment_enabled?: boolean
          task_enabled?: boolean
          telegram_enabled?: boolean
          unknown_email_enabled?: boolean
          updated_at?: string
          updated_by?: string | null
          user_id: string
        }
        Update: {
          ai_summary_enabled?: boolean
          charter_enabled?: boolean
          created_at?: string
          email_enabled?: boolean
          follow_up_enabled?: boolean
          in_app_enabled?: boolean
          integration_failure_enabled?: boolean
          internal_email_enabled?: boolean
          new_enquiry_enabled?: boolean
          notification_email?: string | null
          payment_enabled?: boolean
          task_enabled?: boolean
          telegram_enabled?: boolean
          unknown_email_enabled?: boolean
          updated_at?: string
          updated_by?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_notification_preferences_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_notification_preferences_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      user_oauth_connections: {
        Row: {
          account_email: string
          client_id_secret_id: string
          client_secret_secret_id: string
          connected_at: string
          last_error: string | null
          last_failure_at: string | null
          last_success_at: string | null
          provider: Database["public"]["Enums"]["integration_provider"]
          refresh_token_secret_id: string
          scopes: string[]
          status: Database["public"]["Enums"]["user_oauth_connection_status"]
          updated_at: string
          user_id: string
        }
        Insert: {
          account_email: string
          client_id_secret_id: string
          client_secret_secret_id: string
          connected_at?: string
          last_error?: string | null
          last_failure_at?: string | null
          last_success_at?: string | null
          provider: Database["public"]["Enums"]["integration_provider"]
          refresh_token_secret_id: string
          scopes?: string[]
          status?: Database["public"]["Enums"]["user_oauth_connection_status"]
          updated_at?: string
          user_id: string
        }
        Update: {
          account_email?: string
          client_id_secret_id?: string
          client_secret_secret_id?: string
          connected_at?: string
          last_error?: string | null
          last_failure_at?: string | null
          last_success_at?: string | null
          provider?: Database["public"]["Enums"]["integration_provider"]
          refresh_token_secret_id?: string
          scopes?: string[]
          status?: Database["public"]["Enums"]["user_oauth_connection_status"]
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_oauth_connections_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
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
      yacht_commercial_profiles: {
        Row: {
          created_at: string
          created_by: string | null
          default_currency: string
          default_tax_rate: number
          fuel_consumption_lph: number | null
          fuel_consumption_speed_knots: number | null
          id: string
          key_features: string[]
          overview: string
          port_guidance: string | null
          reference_notes: string | null
          short_charter_divisor: number
          updated_at: string
          updated_by: string | null
          yacht_id: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          default_currency?: string
          default_tax_rate?: number
          fuel_consumption_lph?: number | null
          fuel_consumption_speed_knots?: number | null
          id?: string
          key_features?: string[]
          overview: string
          port_guidance?: string | null
          reference_notes?: string | null
          short_charter_divisor?: number
          updated_at?: string
          updated_by?: string | null
          yacht_id: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          default_currency?: string
          default_tax_rate?: number
          fuel_consumption_lph?: number | null
          fuel_consumption_speed_knots?: number | null
          id?: string
          key_features?: string[]
          overview?: string
          port_guidance?: string | null
          reference_notes?: string | null
          short_charter_divisor?: number
          updated_at?: string
          updated_by?: string | null
          yacht_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "yacht_commercial_profiles_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "yacht_commercial_profiles_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "yacht_commercial_profiles_yacht_id_fkey"
            columns: ["yacht_id"]
            isOneToOne: true
            referencedRelation: "yachts"
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
      yacht_offer_templates: {
        Row: {
          approved_at: string | null
          approved_by: string | null
          body_template: string
          created_at: string
          created_by: string | null
          id: string
          name: string
          status: Database["public"]["Enums"]["offer_template_status"]
          subject_template: string
          updated_at: string
          updated_by: string | null
          version_number: number
          yacht_id: string
        }
        Insert: {
          approved_at?: string | null
          approved_by?: string | null
          body_template: string
          created_at?: string
          created_by?: string | null
          id?: string
          name: string
          status?: Database["public"]["Enums"]["offer_template_status"]
          subject_template: string
          updated_at?: string
          updated_by?: string | null
          version_number: number
          yacht_id: string
        }
        Update: {
          approved_at?: string | null
          approved_by?: string | null
          body_template?: string
          created_at?: string
          created_by?: string | null
          id?: string
          name?: string
          status?: Database["public"]["Enums"]["offer_template_status"]
          subject_template?: string
          updated_at?: string
          updated_by?: string | null
          version_number?: number
          yacht_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "yacht_offer_templates_approved_by_fkey"
            columns: ["approved_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "yacht_offer_templates_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "yacht_offer_templates_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "yacht_offer_templates_yacht_id_fkey"
            columns: ["yacht_id"]
            isOneToOne: false
            referencedRelation: "yachts"
            referencedColumns: ["id"]
          },
        ]
      }
      yacht_rate_periods: {
        Row: {
          active: boolean
          created_at: string
          created_by: string | null
          currency: string
          id: string
          name: string
          tax_rate: number
          updated_at: string
          updated_by: string | null
          valid_from: string
          valid_to: string
          weekly_rate: number
          yacht_id: string
        }
        Insert: {
          active?: boolean
          created_at?: string
          created_by?: string | null
          currency: string
          id?: string
          name: string
          tax_rate: number
          updated_at?: string
          updated_by?: string | null
          valid_from: string
          valid_to: string
          weekly_rate: number
          yacht_id: string
        }
        Update: {
          active?: boolean
          created_at?: string
          created_by?: string | null
          currency?: string
          id?: string
          name?: string
          tax_rate?: number
          updated_at?: string
          updated_by?: string | null
          valid_from?: string
          valid_to?: string
          weekly_rate?: number
          yacht_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "yacht_rate_periods_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "yacht_rate_periods_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "yacht_rate_periods_yacht_id_fkey"
            columns: ["yacht_id"]
            isOneToOne: false
            referencedRelation: "yachts"
            referencedColumns: ["id"]
          },
        ]
      }
      yacht_sales_materials: {
        Row: {
          active: boolean
          approved_for_offers: boolean
          created_at: string
          created_by: string | null
          id: string
          label: string
          material_type: Database["public"]["Enums"]["sales_material_type"]
          public_url: string
          sort_order: number
          updated_at: string
          updated_by: string | null
          yacht_id: string
        }
        Insert: {
          active?: boolean
          approved_for_offers?: boolean
          created_at?: string
          created_by?: string | null
          id?: string
          label: string
          material_type: Database["public"]["Enums"]["sales_material_type"]
          public_url: string
          sort_order?: number
          updated_at?: string
          updated_by?: string | null
          yacht_id: string
        }
        Update: {
          active?: boolean
          approved_for_offers?: boolean
          created_at?: string
          created_by?: string | null
          id?: string
          label?: string
          material_type?: Database["public"]["Enums"]["sales_material_type"]
          public_url?: string
          sort_order?: number
          updated_at?: string
          updated_by?: string | null
          yacht_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "yacht_sales_materials_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "yacht_sales_materials_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "yacht_sales_materials_yacht_id_fkey"
            columns: ["yacht_id"]
            isOneToOne: false
            referencedRelation: "yachts"
            referencedColumns: ["id"]
          },
        ]
      }
      yachtfolio_action_history: {
        Row: {
          action_id: string
          changed_by: string | null
          created_at: string
          from_status:
            | Database["public"]["Enums"]["yachtfolio_action_status"]
            | null
          id: number
          reason: string
          to_status: Database["public"]["Enums"]["yachtfolio_action_status"]
        }
        Insert: {
          action_id: string
          changed_by?: string | null
          created_at?: string
          from_status?:
            | Database["public"]["Enums"]["yachtfolio_action_status"]
            | null
          id?: never
          reason: string
          to_status: Database["public"]["Enums"]["yachtfolio_action_status"]
        }
        Update: {
          action_id?: string
          changed_by?: string | null
          created_at?: string
          from_status?:
            | Database["public"]["Enums"]["yachtfolio_action_status"]
            | null
          id?: never
          reason?: string
          to_status?: Database["public"]["Enums"]["yachtfolio_action_status"]
        }
        Relationships: [
          {
            foreignKeyName: "yachtfolio_action_history_action_id_fkey"
            columns: ["action_id"]
            isOneToOne: false
            referencedRelation: "yachtfolio_booking_actions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "yachtfolio_action_history_changed_by_fkey"
            columns: ["changed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      yachtfolio_booking_actions: {
        Row: {
          booking_id: string
          completed_at: string | null
          completed_by: string | null
          completion_notes: string | null
          created_at: string
          created_by: string | null
          id: string
          status: Database["public"]["Enums"]["yachtfolio_action_status"]
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          booking_id: string
          completed_at?: string | null
          completed_by?: string | null
          completion_notes?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          status?: Database["public"]["Enums"]["yachtfolio_action_status"]
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          booking_id?: string
          completed_at?: string | null
          completed_by?: string | null
          completion_notes?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          status?: Database["public"]["Enums"]["yachtfolio_action_status"]
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "yachtfolio_booking_actions_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: true
            referencedRelation: "bookings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "yachtfolio_booking_actions_completed_by_fkey"
            columns: ["completed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "yachtfolio_booking_actions_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "yachtfolio_booking_actions_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "profiles"
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
      add_ad_hoc_task: {
        Args: {
          p_assigned_user_id: string
          p_booking_id: string
          p_description: string
          p_due_date: string
          p_priority: Database["public"]["Enums"]["task_priority"]
          p_title: string
        }
        Returns: {
          assigned_user_id: string | null
          blocked_reason: string | null
          booking_id: string
          cancelled_at: string | null
          cancelled_by: string | null
          completed_at: string | null
          completed_by: string | null
          created_at: string
          created_by: string | null
          description: string | null
          due_anchor: Database["public"]["Enums"]["task_due_anchor"]
          due_date: string | null
          due_date_required: boolean
          due_offset_days: number
          escalation_after_days: number | null
          external_action: Database["public"]["Enums"]["task_external_action"]
          id: string
          priority: Database["public"]["Enums"]["task_priority"]
          reference: string
          reminder_lead_days: number | null
          required: boolean
          source: Database["public"]["Enums"]["task_source"]
          status: Database["public"]["Enums"]["task_status"]
          step_code: string | null
          template_id: string | null
          template_step_id: string | null
          title: string
          updated_at: string
          updated_by: string | null
        }
        SetofOptions: {
          from: "*"
          to: "tasks"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      add_task_note: {
        Args: { p_body: string; p_task_id: string }
        Returns: {
          body: string
          created_at: string
          created_by: string | null
          id: string
          task_id: string
        }
        SetofOptions: {
          from: "*"
          to: "task_notes"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      add_task_template_step: {
        Args: {
          p_description: string
          p_due_anchor: Database["public"]["Enums"]["task_due_anchor"]
          p_due_date_required: boolean
          p_due_offset_days: number
          p_escalation_after_days: number
          p_priority: Database["public"]["Enums"]["task_priority"]
          p_reminder_lead_days: number
          p_required: boolean
          p_sort_order: number
          p_step_code: string
          p_template_id: string
          p_title: string
        }
        Returns: {
          auto_complete_on_generation: boolean
          created_at: string
          created_by: string | null
          description: string | null
          due_anchor: Database["public"]["Enums"]["task_due_anchor"]
          due_date_required: boolean
          due_offset_days: number
          escalation_after_days: number | null
          external_action: Database["public"]["Enums"]["task_external_action"]
          id: string
          priority: Database["public"]["Enums"]["task_priority"]
          reminder_lead_days: number | null
          required: boolean
          sort_order: number
          step_code: string
          template_id: string
          title: string
          updated_at: string
          updated_by: string | null
        }
        SetofOptions: {
          from: "*"
          to: "task_template_steps"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      advance_tutorial: {
        Args: {
          p_event_type: string
          p_stage: Database["public"]["Enums"]["tutorial_practice_stage"]
          p_step: number
        }
        Returns: {
          completed_at: string | null
          current_step: number
          paused_at: string | null
          practice_stage: Database["public"]["Enums"]["tutorial_practice_stage"]
          reset_count: number
          started_at: string | null
          status: Database["public"]["Enums"]["tutorial_status"]
          updated_at: string
          user_id: string
        }
        SetofOptions: {
          from: "*"
          to: "tutorial_sessions"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      amend_confirmed_booking: {
        Args: {
          p_booking_id: string
          p_charter_end_date: string
          p_charter_fee: number
          p_charter_start_date: string
          p_currency: string
          p_disembarkation_port: string
          p_embarkation_port: string
          p_guest_count: number
          p_reason: string
          p_tax_rate: number
          p_yacht_id: string
        }
        Returns: {
          broker_company_id: string | null
          broker_contact_id: string | null
          charter_end_date: string
          charter_fee: number
          charter_start_date: string
          confirmation_reason: string
          created_at: string
          created_by: string | null
          currency: string
          customer_contact_id: string | null
          disembarkation_port: string | null
          embarkation_port: string | null
          enquiry_id: string
          guest_count: number | null
          id: string
          reference: string
          signed_agreement_confirmed_at: string
          signed_agreement_confirmed_by: string
          source_offer_id: string
          status: Database["public"]["Enums"]["booking_status"]
          tax_rate: number
          updated_at: string
          updated_by: string | null
          yacht_id: string
        }
        SetofOptions: {
          from: "*"
          to: "bookings"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      apply_enquiry_timeouts: { Args: { p_as_of?: string }; Returns: number }
      approve_communication_template: {
        Args: { p_template_id: string }
        Returns: undefined
      }
      approve_contract_review: {
        Args: {
          p_payment_amounts: number[]
          p_payment_dates: string[]
          p_review_id: string
        }
        Returns: undefined
      }
      approve_invoice_profile: {
        Args: { p_profile_id: string; p_reason: string }
        Returns: undefined
      }
      approve_offer: {
        Args: { p_offer_id: string; p_reason: string }
        Returns: {
          approved_at: string | null
          approved_by: string | null
          body_snapshot: string
          charter_days: number
          charter_end_date: string
          charter_start_date: string
          created_at: string
          created_by: string | null
          currency: string
          enquiry_id: string
          id: string
          pricing_basis: Database["public"]["Enums"]["offer_pricing_basis"]
          proposed_charter_fee: number
          rate_period_id: string | null
          recipient_name: string
          reference: string
          sent_at: string | null
          sent_by: string | null
          short_charter_divisor_snapshot: number
          source_offer_id: string | null
          status: Database["public"]["Enums"]["offer_status"]
          subject_snapshot: string
          tax_rate_snapshot: number
          template_version_id: string
          updated_at: string
          updated_by: string | null
          version_number: number
          weekly_rate_snapshot: number
          yacht_id: string
        }
        SetofOptions: {
          from: "*"
          to: "offers"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      approve_task_template: {
        Args: { p_template_id: string }
        Returns: {
          approved_at: string | null
          approved_by: string | null
          created_at: string
          created_by: string | null
          description: string | null
          id: string
          is_default: boolean
          name: string
          source_template_id: string | null
          status: Database["public"]["Enums"]["task_template_status"]
          updated_at: string
          updated_by: string | null
          version_number: number
        }
        SetofOptions: {
          from: "*"
          to: "task_templates"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      approve_yacht_offer_template: {
        Args: { p_template_id: string }
        Returns: {
          approved_at: string | null
          approved_by: string | null
          body_template: string
          created_at: string
          created_by: string | null
          id: string
          name: string
          status: Database["public"]["Enums"]["offer_template_status"]
          subject_template: string
          updated_at: string
          updated_by: string | null
          version_number: number
          yacht_id: string
        }
        SetofOptions: {
          from: "*"
          to: "yacht_offer_templates"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      calculate_charter_fee: {
        Args: {
          p_charter_days: number
          p_short_charter_divisor: number
          p_weekly_rate: number
        }
        Returns: number
      }
      calculate_template_task_due_date: {
        Args: {
          p_anchor: Database["public"]["Enums"]["task_due_anchor"]
          p_booking: Database["public"]["Tables"]["bookings"]["Row"]
          p_offset: number
        }
        Returns: string
      }
      cancel_ad_hoc_task: {
        Args: { p_reason: string; p_task_id: string }
        Returns: {
          assigned_user_id: string | null
          blocked_reason: string | null
          booking_id: string
          cancelled_at: string | null
          cancelled_by: string | null
          completed_at: string | null
          completed_by: string | null
          created_at: string
          created_by: string | null
          description: string | null
          due_anchor: Database["public"]["Enums"]["task_due_anchor"]
          due_date: string | null
          due_date_required: boolean
          due_offset_days: number
          escalation_after_days: number | null
          external_action: Database["public"]["Enums"]["task_external_action"]
          id: string
          priority: Database["public"]["Enums"]["task_priority"]
          reference: string
          reminder_lead_days: number | null
          required: boolean
          source: Database["public"]["Enums"]["task_source"]
          status: Database["public"]["Enums"]["task_status"]
          step_code: string | null
          template_id: string | null
          template_step_id: string | null
          title: string
          updated_at: string
          updated_by: string | null
        }
        SetofOptions: {
          from: "*"
          to: "tasks"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      check_yacht_availability: {
        Args: {
          p_charter_end_date: string
          p_charter_start_date: string
          p_exclude_booking_id?: string
          p_yacht_id: string
        }
        Returns: {
          available: boolean
          conflicting_booking_id: string
          conflicting_reference: string
          reserved_from: string
          reserved_through: string
        }[]
      }
      claim_integration_deliveries: {
        Args: { p_limit?: number; p_worker_id: string }
        Returns: {
          attempt_count: number
          claimed_at: string | null
          claimed_by: string | null
          created_at: string
          credential_user_id: string | null
          delivered_at: string | null
          external_id: string | null
          external_url: string | null
          id: string
          idempotency_key: string
          last_error_code: string | null
          last_error_message: string | null
          lease_expires_at: string | null
          next_attempt_at: string
          operation: Database["public"]["Enums"]["integration_operation"]
          payload: Json
          provider: Database["public"]["Enums"]["integration_provider"]
          source_id: string
          source_type: string
          status: Database["public"]["Enums"]["integration_delivery_status"]
          updated_at: string
        }[]
        SetofOptions: {
          from: "*"
          to: "integration_deliveries"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      claim_integration_deliveries_for_operations: {
        Args: {
          p_limit: number
          p_operations: Database["public"]["Enums"]["integration_operation"][]
          p_worker_id: string
        }
        Returns: {
          attempt_count: number
          claimed_at: string | null
          claimed_by: string | null
          created_at: string
          credential_user_id: string | null
          delivered_at: string | null
          external_id: string | null
          external_url: string | null
          id: string
          idempotency_key: string
          last_error_code: string | null
          last_error_message: string | null
          lease_expires_at: string | null
          next_attempt_at: string
          operation: Database["public"]["Enums"]["integration_operation"]
          payload: Json
          provider: Database["public"]["Enums"]["integration_provider"]
          source_id: string
          source_type: string
          status: Database["public"]["Enums"]["integration_delivery_status"]
          updated_at: string
        }[]
        SetofOptions: {
          from: "*"
          to: "integration_deliveries"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      claim_internal_alert_deliveries: {
        Args: { p_limit?: number; p_worker_id: string }
        Returns: {
          attempt_count: number
          claimed_at: string | null
          claimed_by: string | null
          created_at: string
          credential_user_id: string | null
          delivered_at: string | null
          external_id: string | null
          external_url: string | null
          id: string
          idempotency_key: string
          last_error_code: string | null
          last_error_message: string | null
          lease_expires_at: string | null
          next_attempt_at: string
          operation: Database["public"]["Enums"]["integration_operation"]
          payload: Json
          provider: Database["public"]["Enums"]["integration_provider"]
          source_id: string
          source_type: string
          status: Database["public"]["Enums"]["integration_delivery_status"]
          updated_at: string
        }[]
        SetofOptions: {
          from: "*"
          to: "integration_deliveries"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      classify_email_message: {
        Args: {
          p_classification: Database["public"]["Enums"]["email_classification"]
          p_contact_id?: string
          p_enquiry_id?: string
          p_enquiry_summary?: string
          p_message_id: string
          p_reason: string
        }
        Returns: string
      }
      classify_email_message_with_details: {
        Args: {
          p_budget_amount?: number
          p_charter_end_date?: string
          p_charter_start_date?: string
          p_classification: Database["public"]["Enums"]["email_classification"]
          p_contact_id?: string
          p_currency?: string
          p_disembarkation_port?: string
          p_embarkation_port?: string
          p_enquiry_id?: string
          p_enquiry_summary?: string
          p_guest_count?: number
          p_message_id: string
          p_reason: string
          p_requested_yacht_id?: string
        }
        Returns: string
      }
      clone_communication_template: {
        Args: { p_name: string; p_source_template_id: string }
        Returns: string
      }
      clone_task_template: {
        Args: { p_name: string; p_source_template_id: string }
        Returns: {
          approved_at: string | null
          approved_by: string | null
          created_at: string
          created_by: string | null
          description: string | null
          id: string
          is_default: boolean
          name: string
          source_template_id: string | null
          status: Database["public"]["Enums"]["task_template_status"]
          updated_at: string
          updated_by: string | null
          version_number: number
        }
        SetofOptions: {
          from: "*"
          to: "task_templates"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      complete_ai_analysis: {
        Args: {
          p_confidence: number
          p_evidence: Json
          p_input_tokens?: number
          p_output_tokens?: number
          p_payload: Json
          p_provider_request_id: string
          p_run_id: string
          p_summary: string
        }
        Returns: string
      }
      complete_gmail_reconciliation: {
        Args: { p_history_id: string; p_synced_at: string; p_user_id: string }
        Returns: undefined
      }
      complete_initial_administrator: {
        Args: {
          p_display_name: string
          p_phone: string
          p_telegram_chat_id: string
          p_user_id: string
        }
        Returns: boolean
      }
      complete_integration_delivery: {
        Args: {
          p_delivery_id: string
          p_external_id: string
          p_external_url: string
          p_worker_id: string
        }
        Returns: undefined
      }
      complete_task: {
        Args: { p_reason: string; p_task_id: string }
        Returns: {
          assigned_user_id: string | null
          blocked_reason: string | null
          booking_id: string
          cancelled_at: string | null
          cancelled_by: string | null
          completed_at: string | null
          completed_by: string | null
          created_at: string
          created_by: string | null
          description: string | null
          due_anchor: Database["public"]["Enums"]["task_due_anchor"]
          due_date: string | null
          due_date_required: boolean
          due_offset_days: number
          escalation_after_days: number | null
          external_action: Database["public"]["Enums"]["task_external_action"]
          id: string
          priority: Database["public"]["Enums"]["task_priority"]
          reference: string
          reminder_lead_days: number | null
          required: boolean
          source: Database["public"]["Enums"]["task_source"]
          status: Database["public"]["Enums"]["task_status"]
          step_code: string | null
          template_id: string | null
          template_step_id: string | null
          title: string
          updated_at: string
          updated_by: string | null
        }
        SetofOptions: {
          from: "*"
          to: "tasks"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      complete_telegram_pairing: {
        Args: { p_telegram_chat_id: string; p_token_hash: string }
        Returns: string
      }
      configure_gmail_ingestion: {
        Args: { p_enabled: boolean; p_user_id: string }
        Returns: {
          enabled: boolean
          singleton: boolean
          updated_at: string
          updated_by: string | null
          user_id: string | null
        }
        SetofOptions: {
          from: "*"
          to: "gmail_ingestion_settings"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      configure_rehearsal_fixture_yacht: {
        Args: { p_rehearsal_run_id: string }
        Returns: Json
      }
      configure_rehearsal_invoice_profile: {
        Args: { p_rehearsal_run_id: string }
        Returns: {
          approved_at: string | null
          approved_by: string | null
          created_at: string
          created_by: string | null
          id: string
          issuer_address: string
          issuer_name: string
          payment_instructions: string
          profile_name: string
          recipient_address: string
          recipient_email: string | null
          recipient_name: string
          rehearsal_run_id: string | null
          service_description_template: string
          source_profile_id: string | null
          status: Database["public"]["Enums"]["invoice_profile_status"]
          updated_at: string
          version_number: number
        }
        SetofOptions: {
          from: "*"
          to: "invoice_profiles"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      confirm_booking: {
        Args: {
          p_charter_end_date: string
          p_charter_fee: number
          p_charter_start_date: string
          p_confirmation_reason: string
          p_currency: string
          p_disembarkation_port: string
          p_embarkation_port: string
          p_enquiry_id: string
          p_guest_count: number
          p_signed_agreement_confirmed: boolean
          p_source_offer_id: string
          p_tax_rate: number
          p_yacht_id: string
        }
        Returns: {
          broker_company_id: string | null
          broker_contact_id: string | null
          charter_end_date: string
          charter_fee: number
          charter_start_date: string
          confirmation_reason: string
          created_at: string
          created_by: string | null
          currency: string
          customer_contact_id: string | null
          disembarkation_port: string | null
          embarkation_port: string | null
          enquiry_id: string
          guest_count: number | null
          id: string
          reference: string
          signed_agreement_confirmed_at: string
          signed_agreement_confirmed_by: string
          source_offer_id: string
          status: Database["public"]["Enums"]["booking_status"]
          tax_rate: number
          updated_at: string
          updated_by: string | null
          yacht_id: string
        }
        SetofOptions: {
          from: "*"
          to: "bookings"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      count_booking_register: {
        Args: {
          p_query?: string
          p_status?: Database["public"]["Enums"]["booking_status"]
          p_yacht_id?: string
        }
        Returns: number
      }
      count_company_register: {
        Args: { p_active?: boolean; p_query?: string }
        Returns: number
      }
      count_contact_register: {
        Args: {
          p_active?: boolean
          p_query?: string
          p_role?: Database["public"]["Enums"]["contact_role"]
        }
        Returns: number
      }
      count_document_register: {
        Args: {
          p_document_type?: Database["public"]["Enums"]["document_type"]
          p_query?: string
          p_scan_status?: Database["public"]["Enums"]["document_scan_status"]
          p_verification_status?: Database["public"]["Enums"]["document_verification_status"]
        }
        Returns: number
      }
      count_email_inbox: {
        Args: {
          p_classification?: Database["public"]["Enums"]["email_classification"]
          p_query?: string
        }
        Returns: number
      }
      count_email_inbox_review_required: { Args: never; Returns: number }
      count_enquiry_register: {
        Args: {
          p_open_only?: boolean
          p_priority?: Database["public"]["Enums"]["enquiry_priority"]
          p_query?: string
          p_status?: Database["public"]["Enums"]["enquiry_status"]
          p_yacht_id?: string
        }
        Returns: number
      }
      count_my_notifications: { Args: { p_read?: boolean }; Returns: number }
      count_offer_register: {
        Args: {
          p_query?: string
          p_status?: Database["public"]["Enums"]["offer_status"]
          p_yacht_id?: string
        }
        Returns: number
      }
      count_task_register: {
        Args: {
          p_assignee_id?: string
          p_due_state?: string
          p_priority?: Database["public"]["Enums"]["task_priority"]
          p_query?: string
          p_status?: Database["public"]["Enums"]["task_status"]
          p_unassigned?: boolean
        }
        Returns: number
      }
      create_communication_template_draft: {
        Args: {
          p_body_template: string
          p_kind: Database["public"]["Enums"]["communication_template_kind"]
          p_name: string
          p_subject_template: string
        }
        Returns: string
      }
      create_invoice_profile_draft: {
        Args: {
          p_issuer_address: string
          p_issuer_name: string
          p_payment_instructions: string
          p_profile_name: string
          p_recipient_address: string
          p_recipient_email: string
          p_recipient_name: string
          p_service_description_template: string
        }
        Returns: string
      }
      create_my_telegram_pairing_request: {
        Args: { p_token_hash: string }
        Returns: string
      }
      create_notification: {
        Args: {
          p_action_url: string
          p_body: string
          p_channel: Database["public"]["Enums"]["notification_channel"]
          p_idempotency_key: string
          p_notification_type: string
          p_priority: Database["public"]["Enums"]["notification_priority"]
          p_recipient_contact_id: string
          p_recipient_user_id: string
          p_requires_approval: boolean
          p_source_id: string
          p_source_type: string
          p_title: string
        }
        Returns: string
      }
      create_offer_draft: {
        Args: {
          p_body_snapshot: string
          p_enquiry_id: string
          p_proposed_charter_fee?: number
          p_rate_period_id: string
          p_recipient_name: string
          p_source_offer_id: string
          p_subject_snapshot: string
          p_template_version_id: string
        }
        Returns: {
          approved_at: string | null
          approved_by: string | null
          body_snapshot: string
          charter_days: number
          charter_end_date: string
          charter_start_date: string
          created_at: string
          created_by: string | null
          currency: string
          enquiry_id: string
          id: string
          pricing_basis: Database["public"]["Enums"]["offer_pricing_basis"]
          proposed_charter_fee: number
          rate_period_id: string | null
          recipient_name: string
          reference: string
          sent_at: string | null
          sent_by: string | null
          short_charter_divisor_snapshot: number
          source_offer_id: string | null
          status: Database["public"]["Enums"]["offer_status"]
          subject_snapshot: string
          tax_rate_snapshot: number
          template_version_id: string
          updated_at: string
          updated_by: string | null
          version_number: number
          weekly_rate_snapshot: number
          yacht_id: string
        }
        SetofOptions: {
          from: "*"
          to: "offers"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      create_rehearsal_fixture_yacht: {
        Args: { p_rehearsal_run_id: string }
        Returns: string
      }
      create_rehearsal_run: { Args: { p_label: string }; Returns: string }
      delete_task_template_step: {
        Args: { p_reason: string; p_step_id: string }
        Returns: undefined
      }
      disconnect_my_gmail_oauth: {
        Args: { p_reason: string }
        Returns: undefined
      }
      email_domain: { Args: { value: string }; Returns: string }
      fail_ai_analysis: {
        Args: {
          p_error_code: string
          p_error_message: string
          p_run_id: string
        }
        Returns: undefined
      }
      fail_gmail_reconciliation: {
        Args: { p_error: string; p_failed_at: string; p_user_id: string }
        Returns: undefined
      }
      fail_integration_delivery: {
        Args: {
          p_delivery_id: string
          p_error_code: string
          p_error_message: string
          p_retryable: boolean
          p_worker_id: string
        }
        Returns: undefined
      }
      generate_booking_tasks: {
        Args: { p_booking_id: string; p_template_id?: string }
        Returns: number
      }
      get_activation_readiness_snapshot: { Args: never; Returns: Json }
      get_active_gmail_ingestion_credentials: {
        Args: never
        Returns: {
          account_email: string
          client_id: string
          client_secret: string
          last_history_id: string
          refresh_token: string
          scopes: string[]
          user_id: string
        }[]
      }
      get_delivery_oauth_credentials: {
        Args: { p_delivery_id: string }
        Returns: {
          account_email: string
          client_id: string
          client_secret: string
          refresh_token: string
        }[]
      }
      get_initial_setup_profile_count: { Args: never; Returns: number }
      get_integration_queue_health: {
        Args: never
        Returns: {
          claimed_count: number
          failed_count: number
          oldest_pending_age_seconds: number
          oldest_pending_at: string
          pending_count: number
          permanent_failure_count: number
        }[]
      }
      get_launch_readiness_summary: { Args: never; Returns: Json }
      get_my_oauth_connections: {
        Args: never
        Returns: {
          account_email: string
          connected_at: string
          last_error: string
          last_failure_at: string
          last_success_at: string
          provider: Database["public"]["Enums"]["integration_provider"]
          scopes: string[]
          status: Database["public"]["Enums"]["user_oauth_connection_status"]
          updated_at: string
        }[]
      }
      get_operational_readiness: {
        Args: { p_environment: string }
        Returns: Json
      }
      get_user_google_workspace_credentials: {
        Args: { p_user_id: string }
        Returns: {
          account_email: string
          client_id: string
          client_secret: string
          refresh_token: string
          scopes: string[]
        }[]
      }
      ingest_gmail_message: {
        Args: {
          p_attachments?: Json
          p_body_text: string
          p_cc_emails: string[]
          p_gmail_label_ids: string[]
          p_has_attachments: boolean
          p_has_list_id: boolean
          p_has_list_unsubscribe: boolean
          p_internet_message_id: string
          p_is_bulk: boolean
          p_provider_event_id: string
          p_provider_message_id: string
          p_provider_thread_id: string
          p_received_at: string
          p_recipient_emails: string[]
          p_sender_email: string
          p_sender_name: string
          p_snippet: string
          p_subject: string
        }
        Returns: string
      }
      is_active_staff: { Args: never; Returns: boolean }
      is_administrator: { Args: never; Returns: boolean }
      is_valid_enquiry_transition: {
        Args: {
          current_status: Database["public"]["Enums"]["enquiry_status"]
          target_status: Database["public"]["Enums"]["enquiry_status"]
        }
        Returns: boolean
      }
      list_booking_register_page: {
        Args: {
          p_cursor_charter_start_date?: string
          p_cursor_id?: string
          p_limit?: number
          p_query?: string
          p_status?: Database["public"]["Enums"]["booking_status"]
          p_yacht_id?: string
        }
        Returns: {
          charter_end_date: string
          charter_start_date: string
          enquiry_reference: string
          enquiry_summary: string
          id: string
          reference: string
          reservation_active: boolean
          reserved_from: string
          reserved_through: string
          status: Database["public"]["Enums"]["booking_status"]
          yacht_id: string
          yacht_name: string
          yachtfolio_status: Database["public"]["Enums"]["yachtfolio_action_status"]
        }[]
      }
      list_company_register_page: {
        Args: {
          p_active?: boolean
          p_cursor_id?: string
          p_cursor_name?: string
          p_limit?: number
          p_query?: string
        }
        Returns: {
          active: boolean
          email: string
          id: string
          name: string
          phone: string
          sort_name: string
          updated_at: string
          website: string
        }[]
      }
      list_contact_register_page: {
        Args: {
          p_active?: boolean
          p_cursor_id?: string
          p_cursor_name?: string
          p_limit?: number
          p_query?: string
          p_role?: Database["public"]["Enums"]["contact_role"]
        }
        Returns: {
          active: boolean
          email: string
          full_name: string
          id: string
          phone: string
          roles: Database["public"]["Enums"]["contact_role"][]
          sort_name: string
          updated_at: string
        }[]
      }
      list_document_register_page: {
        Args: {
          p_cursor_created_at?: string
          p_cursor_id?: string
          p_document_type?: Database["public"]["Enums"]["document_type"]
          p_limit?: number
          p_query?: string
          p_scan_status?: Database["public"]["Enums"]["document_scan_status"]
          p_verification_status?: Database["public"]["Enums"]["document_verification_status"]
        }
        Returns: {
          booking_id: string
          booking_reference: string
          created_at: string
          document_type: Database["public"]["Enums"]["document_type"]
          id: string
          mime_type: string
          original_filename: string
          retention_class: string
          scan_status: Database["public"]["Enums"]["document_scan_status"]
          size_bytes: number
          title: string
          verification_status: Database["public"]["Enums"]["document_verification_status"]
          version_number: number
          yacht_name: string
        }[]
      }
      list_email_inbox_page: {
        Args: {
          p_classification?: Database["public"]["Enums"]["email_classification"]
          p_cursor_id?: string
          p_cursor_received_at?: string
          p_limit?: number
          p_query?: string
        }
        Returns: {
          classification: Database["public"]["Enums"]["email_classification"]
          enquiry_id: string
          enquiry_reference: string
          enquiry_summary: string
          has_attachments: boolean
          id: string
          processing_status: Database["public"]["Enums"]["email_processing_status"]
          received_at: string
          sender_email: string
          sender_name: string
          snippet: string
          subject: string
          thread_id: string
        }[]
      }
      list_enquiry_register_page: {
        Args: {
          p_cursor_id?: string
          p_cursor_updated_at?: string
          p_limit?: number
          p_open_only?: boolean
          p_priority?: Database["public"]["Enums"]["enquiry_priority"]
          p_query?: string
          p_status?: Database["public"]["Enums"]["enquiry_status"]
          p_yacht_id?: string
        }
        Returns: {
          broker_company_name: string
          broker_name: string
          charter_end_date: string
          charter_start_date: string
          customer_name: string
          guest_count: number
          id: string
          owner_name: string
          priority: Database["public"]["Enums"]["enquiry_priority"]
          reference: string
          status: Database["public"]["Enums"]["enquiry_status"]
          summary: string
          updated_at: string
          yacht_name: string
        }[]
      }
      list_google_mailbox_candidates: {
        Args: never
        Returns: {
          account_email: string
          display_name: string
          ingestion_enabled: boolean
          last_error: string
          last_failure_at: string
          last_success_at: string
          selected: boolean
          user_id: string
        }[]
      }
      list_my_notification_page: {
        Args: {
          p_cursor_created_at?: string
          p_cursor_id?: string
          p_limit?: number
          p_read?: boolean
        }
        Returns: {
          action_url: string
          body: string
          channel: Database["public"]["Enums"]["notification_channel"]
          created_at: string
          id: string
          priority: Database["public"]["Enums"]["notification_priority"]
          read_at: string
          status: Database["public"]["Enums"]["notification_status"]
          title: string
        }[]
      }
      list_offer_register_page: {
        Args: {
          p_cursor_id?: string
          p_cursor_updated_at?: string
          p_limit?: number
          p_query?: string
          p_status?: Database["public"]["Enums"]["offer_status"]
          p_yacht_id?: string
        }
        Returns: {
          currency: string
          enquiry_reference: string
          id: string
          pricing_basis: Database["public"]["Enums"]["offer_pricing_basis"]
          proposed_charter_fee: number
          recipient_name: string
          reference: string
          status: Database["public"]["Enums"]["offer_status"]
          subject_snapshot: string
          updated_at: string
          version_number: number
          yacht_id: string
          yacht_name: string
        }[]
      }
      list_task_register_page: {
        Args: {
          p_assignee_id?: string
          p_cursor_created_at?: string
          p_cursor_due_sort?: string
          p_cursor_id?: string
          p_due_state?: string
          p_limit?: number
          p_priority?: Database["public"]["Enums"]["task_priority"]
          p_query?: string
          p_status?: Database["public"]["Enums"]["task_status"]
          p_unassigned?: boolean
        }
        Returns: {
          assigned_user_id: string
          assignee_name: string
          blocked_reason: string
          booking_id: string
          booking_reference: string
          created_at: string
          due_date: string
          due_sort: string
          external_action: Database["public"]["Enums"]["task_external_action"]
          id: string
          priority: Database["public"]["Enums"]["task_priority"]
          reference: string
          required: boolean
          source: Database["public"]["Enums"]["task_source"]
          status: Database["public"]["Enums"]["task_status"]
          step_code: string
          title: string
          yacht_name: string
        }[]
      }
      mark_all_notifications_read: { Args: never; Returns: number }
      mark_notification_read: {
        Args: { p_notification_id: string }
        Returns: undefined
      }
      mark_offer_sent: {
        Args: { p_offer_id: string; p_reason: string }
        Returns: {
          approved_at: string | null
          approved_by: string | null
          body_snapshot: string
          charter_days: number
          charter_end_date: string
          charter_start_date: string
          created_at: string
          created_by: string | null
          currency: string
          enquiry_id: string
          id: string
          pricing_basis: Database["public"]["Enums"]["offer_pricing_basis"]
          proposed_charter_fee: number
          rate_period_id: string | null
          recipient_name: string
          reference: string
          sent_at: string | null
          sent_by: string | null
          short_charter_divisor_snapshot: number
          source_offer_id: string | null
          status: Database["public"]["Enums"]["offer_status"]
          subject_snapshot: string
          tax_rate_snapshot: number
          template_version_id: string
          updated_at: string
          updated_by: string | null
          version_number: number
          weekly_rate_snapshot: number
          yacht_id: string
        }
        SetofOptions: {
          from: "*"
          to: "offers"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      mark_payment_paid: {
        Args: { p_payment_id: string; p_reason: string }
        Returns: undefined
      }
      materialise_operational_notifications: {
        Args: { p_as_of?: string }
        Returns: number
      }
      normalise_email_address: { Args: { value: string }; Returns: string }
      pause_tutorial: {
        Args: never
        Returns: {
          completed_at: string | null
          current_step: number
          paused_at: string | null
          practice_stage: Database["public"]["Enums"]["tutorial_practice_stage"]
          reset_count: number
          started_at: string | null
          status: Database["public"]["Enums"]["tutorial_status"]
          updated_at: string
          user_id: string
        }
        SetofOptions: {
          from: "*"
          to: "tutorial_sessions"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      personal_notification_channels: {
        Args: { p_user_id: string }
        Returns: Database["public"]["Enums"]["notification_channel"][]
      }
      queue_document_drive_sync: {
        Args: { p_document_id: string; p_reason: string }
        Returns: string
      }
      queue_email_provider_actions: { Args: never; Returns: number }
      queue_notification_delivery: {
        Args: { p_notification_id: string }
        Returns: string
      }
      queue_operations_sheet_snapshot: { Args: never; Returns: string }
      record_backup_verification: {
        Args: {
          p_artifact_reference: string
          p_checksum_sha256: string
          p_completed_at: string
          p_environment: string
          p_notes: string
          p_restore_tested_at: string
          p_scope: string
          p_started_at: string
          p_status: Database["public"]["Enums"]["backup_verification_status"]
        }
        Returns: {
          artifact_reference: string | null
          checksum_sha256: string | null
          completed_at: string | null
          created_at: string
          environment: string
          id: string
          notes: string
          recorded_by: string
          restore_tested_at: string | null
          scope: string
          started_at: string
          status: Database["public"]["Enums"]["backup_verification_status"]
        }
        SetofOptions: {
          from: "*"
          to: "backup_verifications"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      record_document_scan_result: {
        Args: {
          p_document_id: string
          p_reason: string
          p_status: Database["public"]["Enums"]["document_scan_status"]
        }
        Returns: undefined
      }
      record_tutorial_event: {
        Args: {
          p_details?: Json
          p_event_type: string
          p_stage: Database["public"]["Enums"]["tutorial_practice_stage"]
          p_step: number
          p_user_id: string
        }
        Returns: undefined
      }
      refresh_booking_task_states: {
        Args: { p_booking_id: string }
        Returns: undefined
      }
      refresh_operational_calendar: { Args: never; Returns: number }
      register_booking_document: {
        Args: {
          p_booking_id: string
          p_document_type: Database["public"]["Enums"]["document_type"]
          p_mime_type: string
          p_original_filename: string
          p_retention_class: string
          p_size_bytes: number
          p_storage_path: string
          p_title: string
        }
        Returns: string
      }
      register_generated_invoice: {
        Args: {
          p_booking_id: string
          p_commission_calculation_id: string
          p_document_id: string
          p_invoice_number: string
          p_invoice_profile_id: string
          p_issue_date: string
          p_service_description: string
        }
        Returns: string
      }
      register_quarantined_booking_document: {
        Args: {
          p_booking_id: string
          p_content_sha256: string
          p_document_type: Database["public"]["Enums"]["document_type"]
          p_mime_type: string
          p_original_filename: string
          p_quarantine_path: string
          p_retention_class: string
          p_size_bytes: number
          p_title: string
        }
        Returns: string
      }
      register_rehearsal_generated_invoice: {
        Args: {
          p_booking_id: string
          p_commission_calculation_id: string
          p_document_id: string
          p_invoice_number: string
          p_issue_date: string
          p_rehearsal_run_id: string
          p_service_description: string
        }
        Returns: string
      }
      register_rehearsal_record: {
        Args: {
          p_entity_id: string
          p_entity_type: string
          p_rehearsal_run_id: string
        }
        Returns: undefined
      }
      register_trusted_generated_document:
        | {
            Args: {
              p_booking_id: string
              p_content_sha256: string
              p_document_type: Database["public"]["Enums"]["document_type"]
              p_mime_type: string
              p_original_filename: string
              p_retention_class: string
              p_size_bytes: number
              p_storage_path: string
              p_title: string
            }
            Returns: string
          }
        | {
            Args: {
              p_booking_id: string
              p_content_sha256: string
              p_created_by: string
              p_document_type: Database["public"]["Enums"]["document_type"]
              p_mime_type: string
              p_original_filename: string
              p_retention_class: string
              p_size_bytes: number
              p_storage_path: string
              p_title: string
            }
            Returns: string
          }
      release_clean_booking_document: {
        Args: {
          p_document_id: string
          p_private_path: string
          p_reason: string
        }
        Returns: undefined
      }
      reopen_task: {
        Args: { p_reason: string; p_task_id: string }
        Returns: {
          assigned_user_id: string | null
          blocked_reason: string | null
          booking_id: string
          cancelled_at: string | null
          cancelled_by: string | null
          completed_at: string | null
          completed_by: string | null
          created_at: string
          created_by: string | null
          description: string | null
          due_anchor: Database["public"]["Enums"]["task_due_anchor"]
          due_date: string | null
          due_date_required: boolean
          due_offset_days: number
          escalation_after_days: number | null
          external_action: Database["public"]["Enums"]["task_external_action"]
          id: string
          priority: Database["public"]["Enums"]["task_priority"]
          reference: string
          reminder_lead_days: number | null
          required: boolean
          source: Database["public"]["Enums"]["task_source"]
          status: Database["public"]["Enums"]["task_status"]
          step_code: string | null
          template_id: string | null
          template_step_id: string | null
          title: string
          updated_at: string
          updated_by: string | null
        }
        SetofOptions: {
          from: "*"
          to: "tasks"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      replace_task_template_dependencies: {
        Args: { p_depends_on_step_ids: string[]; p_step_id: string }
        Returns: number
      }
      request_ai_analysis: {
        Args: {
          p_analysis_kind: Database["public"]["Enums"]["ai_analysis_kind"]
          p_input_sha256: string
          p_model: string
          p_prompt_version: string
          p_provider: string
          p_request_key: string
          p_source_id: string
          p_source_type: string
        }
        Returns: string
      }
      reset_rehearsal_run: {
        Args: { p_reason: string; p_rehearsal_run_id: string }
        Returns: Json
      }
      reset_tutorial: {
        Args: { p_reason: string }
        Returns: {
          completed_at: string | null
          current_step: number
          paused_at: string | null
          practice_stage: Database["public"]["Enums"]["tutorial_practice_stage"]
          reset_count: number
          started_at: string | null
          status: Database["public"]["Enums"]["tutorial_status"]
          updated_at: string
          user_id: string
        }
        SetofOptions: {
          from: "*"
          to: "tutorial_sessions"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      retry_integration_delivery: {
        Args: { p_delivery_id: string; p_reason: string }
        Returns: undefined
      }
      review_ai_suggestion: {
        Args: { p_approved: boolean; p_reason: string; p_suggestion_id: string }
        Returns: undefined
      }
      review_booking_document: {
        Args: { p_approved: boolean; p_document_id: string; p_reason: string }
        Returns: undefined
      }
      review_notification: {
        Args: {
          p_approved: boolean
          p_notification_id: string
          p_reason: string
        }
        Returns: undefined
      }
      revise_ai_suggestion: {
        Args: {
          p_reason: string
          p_revised_payload: Json
          p_suggestion_id: string
        }
        Returns: undefined
      }
      run_automation_tick: { Args: { p_as_of?: string }; Returns: Json }
      save_contract_review: {
        Args: {
          p_booking_id: string
          p_charter_end_date: string
          p_charter_fee: number
          p_charter_start_date: string
          p_commission_rate: number
          p_currency: string
          p_disembarkation_port: string
          p_embarkation_port: string
          p_review_notes: string
          p_source_document_id: string
          p_tax_rate: number
        }
        Returns: string
      }
      save_my_gmail_oauth_credentials: {
        Args: {
          p_account_email: string
          p_client_id: string
          p_client_secret: string
          p_reason: string
          p_refresh_token: string
          p_scopes: string[]
        }
        Returns: undefined
      }
      set_yachtfolio_action_status: {
        Args: {
          p_action_id: string
          p_new_status: Database["public"]["Enums"]["yachtfolio_action_status"]
          p_reason: string
        }
        Returns: {
          booking_id: string
          completed_at: string | null
          completed_by: string | null
          completion_notes: string | null
          created_at: string
          created_by: string | null
          id: string
          status: Database["public"]["Enums"]["yachtfolio_action_status"]
          updated_at: string
          updated_by: string | null
        }
        SetofOptions: {
          from: "*"
          to: "yachtfolio_booking_actions"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      start_ai_analysis: { Args: { p_run_id: string }; Returns: undefined }
      start_tutorial: {
        Args: never
        Returns: {
          completed_at: string | null
          current_step: number
          paused_at: string | null
          practice_stage: Database["public"]["Enums"]["tutorial_practice_stage"]
          reset_count: number
          started_at: string | null
          status: Database["public"]["Enums"]["tutorial_status"]
          updated_at: string
          user_id: string
        }
        SetofOptions: {
          from: "*"
          to: "tutorial_sessions"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      sync_booking_anchored_task_dates: {
        Args: { p_booking_id: string; p_reason: string }
        Returns: number
      }
      transition_booking_status: {
        Args: {
          p_booking_id: string
          p_new_status: Database["public"]["Enums"]["booking_status"]
          p_reason: string
        }
        Returns: {
          broker_company_id: string | null
          broker_contact_id: string | null
          charter_end_date: string
          charter_fee: number
          charter_start_date: string
          confirmation_reason: string
          created_at: string
          created_by: string | null
          currency: string
          customer_contact_id: string | null
          disembarkation_port: string | null
          embarkation_port: string | null
          enquiry_id: string
          guest_count: number | null
          id: string
          reference: string
          signed_agreement_confirmed_at: string
          signed_agreement_confirmed_by: string
          source_offer_id: string
          status: Database["public"]["Enums"]["booking_status"]
          tax_rate: number
          updated_at: string
          updated_by: string | null
          yacht_id: string
        }
        SetofOptions: {
          from: "*"
          to: "bookings"
          isOneToOne: true
          isSetofReturn: false
        }
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
      update_communication_template_draft: {
        Args: {
          p_body_template: string
          p_name: string
          p_subject_template: string
          p_template_id: string
        }
        Returns: undefined
      }
      update_integration_connection: {
        Args: {
          p_configuration_notes: string
          p_enabled: boolean
          p_provider: Database["public"]["Enums"]["integration_provider"]
          p_target_reference: string
        }
        Returns: {
          configuration_notes: string | null
          display_name: string
          enabled: boolean
          last_error: string | null
          last_failure_at: string | null
          last_success_at: string | null
          provider: Database["public"]["Enums"]["integration_provider"]
          target_reference: string | null
          updated_at: string
          updated_by: string | null
        }
        SetofOptions: {
          from: "*"
          to: "integration_connections"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      update_internal_user: {
        Args: {
          p_active: boolean
          p_display_name: string
          p_phone: string
          p_reason: string
          p_role: Database["public"]["Enums"]["user_role"]
          p_telegram_chat_id: string
          p_user_id: string
        }
        Returns: {
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
        SetofOptions: {
          from: "*"
          to: "profiles"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      update_launch_readiness_check: {
        Args: {
          p_check_key: string
          p_evidence: string
          p_reason: string
          p_status: Database["public"]["Enums"]["launch_check_status"]
        }
        Returns: {
          category: string
          check_key: string
          description: string
          evidence: string | null
          id: string
          required: boolean
          reviewed_at: string | null
          reviewed_by: string | null
          status: Database["public"]["Enums"]["launch_check_status"]
          title: string
          updated_at: string
        }
        SetofOptions: {
          from: "*"
          to: "launch_readiness_checks"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      update_my_alert_preferences: {
        Args: {
          p_ai_summary_enabled: boolean
          p_charter_enabled: boolean
          p_email_enabled: boolean
          p_follow_up_enabled: boolean
          p_in_app_enabled: boolean
          p_integration_failure_enabled: boolean
          p_internal_email_enabled: boolean
          p_new_enquiry_enabled: boolean
          p_notification_email: string
          p_payment_enabled: boolean
          p_phone: string
          p_reason: string
          p_task_enabled: boolean
          p_telegram_chat_id: string
          p_telegram_enabled: boolean
          p_unknown_email_enabled: boolean
        }
        Returns: {
          ai_summary_enabled: boolean
          charter_enabled: boolean
          created_at: string
          email_enabled: boolean
          follow_up_enabled: boolean
          in_app_enabled: boolean
          integration_failure_enabled: boolean
          internal_email_enabled: boolean
          new_enquiry_enabled: boolean
          notification_email: string | null
          payment_enabled: boolean
          task_enabled: boolean
          telegram_enabled: boolean
          unknown_email_enabled: boolean
          updated_at: string
          updated_by: string | null
          user_id: string
        }
        SetofOptions: {
          from: "*"
          to: "user_notification_preferences"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      update_offer_draft: {
        Args: {
          p_body_snapshot: string
          p_offer_id: string
          p_proposed_charter_fee: number
          p_recipient_name: string
          p_subject_snapshot: string
        }
        Returns: {
          approved_at: string | null
          approved_by: string | null
          body_snapshot: string
          charter_days: number
          charter_end_date: string
          charter_start_date: string
          created_at: string
          created_by: string | null
          currency: string
          enquiry_id: string
          id: string
          pricing_basis: Database["public"]["Enums"]["offer_pricing_basis"]
          proposed_charter_fee: number
          rate_period_id: string | null
          recipient_name: string
          reference: string
          sent_at: string | null
          sent_by: string | null
          short_charter_divisor_snapshot: number
          source_offer_id: string | null
          status: Database["public"]["Enums"]["offer_status"]
          subject_snapshot: string
          tax_rate_snapshot: number
          template_version_id: string
          updated_at: string
          updated_by: string | null
          version_number: number
          weekly_rate_snapshot: number
          yacht_id: string
        }
        SetofOptions: {
          from: "*"
          to: "offers"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      update_operational_settings: {
        Args: {
          p_enquiry_timeout_enabled: boolean
          p_internal_email_domains: string[]
          p_negotiating_timeout_days: number
          p_new_enquiry_timeout_days: number
          p_offer_sent_timeout_days: number
          p_waiting_reply_timeout_days: number
        }
        Returns: {
          enquiry_timeout_enabled: boolean
          id: boolean
          internal_email_domains: string[]
          negotiating_timeout_days: number
          new_enquiry_timeout_days: number
          offer_sent_timeout_days: number
          updated_at: string
          updated_by: string | null
          waiting_reply_timeout_days: number
        }
        SetofOptions: {
          from: "*"
          to: "operational_settings"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      update_task_schedule: {
        Args: {
          p_assigned_user_id: string
          p_due_date: string
          p_priority: Database["public"]["Enums"]["task_priority"]
          p_reason: string
          p_task_id: string
        }
        Returns: {
          assigned_user_id: string | null
          blocked_reason: string | null
          booking_id: string
          cancelled_at: string | null
          cancelled_by: string | null
          completed_at: string | null
          completed_by: string | null
          created_at: string
          created_by: string | null
          description: string | null
          due_anchor: Database["public"]["Enums"]["task_due_anchor"]
          due_date: string | null
          due_date_required: boolean
          due_offset_days: number
          escalation_after_days: number | null
          external_action: Database["public"]["Enums"]["task_external_action"]
          id: string
          priority: Database["public"]["Enums"]["task_priority"]
          reference: string
          reminder_lead_days: number | null
          required: boolean
          source: Database["public"]["Enums"]["task_source"]
          status: Database["public"]["Enums"]["task_status"]
          step_code: string | null
          template_id: string | null
          template_step_id: string | null
          title: string
          updated_at: string
          updated_by: string | null
        }
        SetofOptions: {
          from: "*"
          to: "tasks"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      update_task_template_step: {
        Args: {
          p_description: string
          p_due_anchor: Database["public"]["Enums"]["task_due_anchor"]
          p_due_date_required: boolean
          p_due_offset_days: number
          p_escalation_after_days: number
          p_priority: Database["public"]["Enums"]["task_priority"]
          p_reminder_lead_days: number
          p_required: boolean
          p_step_id: string
          p_title: string
        }
        Returns: {
          auto_complete_on_generation: boolean
          created_at: string
          created_by: string | null
          description: string | null
          due_anchor: Database["public"]["Enums"]["task_due_anchor"]
          due_date_required: boolean
          due_offset_days: number
          escalation_after_days: number | null
          external_action: Database["public"]["Enums"]["task_external_action"]
          id: string
          priority: Database["public"]["Enums"]["task_priority"]
          reminder_lead_days: number | null
          required: boolean
          sort_order: number
          step_code: string
          template_id: string
          title: string
          updated_at: string
          updated_by: string | null
        }
        SetofOptions: {
          from: "*"
          to: "task_template_steps"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      validate_communication_template_placeholders: {
        Args: {
          p_body: string
          p_kind: Database["public"]["Enums"]["communication_template_kind"]
          p_subject: string
        }
        Returns: undefined
      }
      waive_booking_document_requirement: {
        Args: { p_reason: string; p_requirement_id: string }
        Returns: undefined
      }
    }
    Enums: {
      ai_analysis_kind: "email_triage" | "contract_extraction"
      ai_run_status: "queued" | "processing" | "completed" | "failed"
      ai_suggestion_status:
        | "pending_review"
        | "approved"
        | "rejected"
        | "superseded"
      backup_verification_status: "started" | "passed" | "failed"
      booking_status: "confirmed" | "charter_active" | "completed" | "cancelled"
      calendar_event_kind: "charter" | "payment" | "task"
      calendar_event_status: "active" | "cancelled"
      calendar_sync_status: "not_configured" | "pending" | "synced" | "failed"
      communication_template_kind:
        | "kyc_request"
        | "captain_contact"
        | "broker_follow_up"
      communication_template_status: "draft" | "approved" | "retired"
      contact_role:
        | "customer"
        | "charterer"
        | "broker"
        | "captain"
        | "crew"
        | "operations"
        | "supplier"
        | "other"
      contract_review_status: "draft" | "approved" | "superseded"
      document_requirement_status:
        | "missing"
        | "uploaded"
        | "verified"
        | "waived"
      document_scan_status:
        | "pending"
        | "scanning"
        | "clean"
        | "infected"
        | "error"
        | "released"
      document_type:
        | "charter_agreement"
        | "broker_kyc_statement"
        | "client_passport"
        | "cdd_check"
        | "kylian_commission_invoice"
        | "broker_commission_invoice"
        | "other"
      document_verification_status: "pending_review" | "verified" | "rejected"
      email_classification:
        | "unclassified"
        | "new_enquiry"
        | "enquiry_follow_up"
        | "internal"
        | "circular"
        | "other_relevant"
      email_processing_status:
        | "received"
        | "review_required"
        | "classified"
        | "linked"
        | "ignored"
      email_provider_action_status: "pending" | "completed" | "failed"
      email_provider_action_type: "mark_read" | "archive"
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
      integration_delivery_status:
        | "pending"
        | "claimed"
        | "delivered"
        | "failed"
        | "cancelled"
      integration_operation:
        | "telegram_send"
        | "gmail_mark_read"
        | "gmail_archive"
        | "gmail_create_draft"
        | "calendar_upsert"
        | "drive_upload"
        | "sheets_snapshot"
        | "gmail_send_internal"
      integration_provider:
        | "telegram"
        | "gmail"
        | "google_calendar"
        | "google_drive"
        | "google_sheets"
      integration_snapshot_status:
        | "queued"
        | "delivered"
        | "failed"
        | "cancelled"
      invoice_profile_status: "draft" | "approved" | "retired"
      launch_check_status: "pending" | "passed" | "waived"
      notification_channel:
        | "in_app"
        | "telegram"
        | "email_draft"
        | "email_alert"
      notification_priority: "low" | "normal" | "high" | "urgent"
      notification_status:
        | "pending_approval"
        | "approved"
        | "queued"
        | "delivered"
        | "failed"
        | "cancelled"
      offer_pricing_basis: "seasonal_rate" | "manually_adjusted"
      offer_status: "draft" | "approved" | "sent" | "withdrawn" | "superseded"
      offer_template_status: "draft" | "approved" | "retired"
      payment_status: "scheduled" | "paid" | "cancelled"
      sales_material_type:
        | "brochure"
        | "crew_profiles"
        | "sample_menu"
        | "specifications"
        | "deck_plan"
        | "other"
      task_due_anchor:
        | "none"
        | "booking_confirmed"
        | "charter_start"
        | "charter_end"
        | "contract_payment_1"
        | "contract_payment_2"
        | "contract_payment_3"
      task_external_action: "none" | "yachtfolio_booking"
      task_priority: "low" | "normal" | "high" | "urgent"
      task_source: "template" | "ad_hoc"
      task_status: "blocked" | "ready" | "completed" | "cancelled"
      task_template_status: "draft" | "approved" | "retired"
      tutorial_practice_stage:
        | "email_received"
        | "classified"
        | "enquiry_created"
        | "offer_prepared"
        | "contract_reviewed"
        | "booking_confirmed"
        | "compliance_completed"
        | "operations_ready"
        | "charter_active"
        | "charter_completed"
        | "follow_up_completed"
      tutorial_status: "not_started" | "active" | "paused" | "completed"
      user_oauth_connection_status:
        | "connected"
        | "needs_reauthentication"
        | "disconnected"
      user_role: "administrator" | "staff"
      yacht_contact_responsibility:
        | "captain"
        | "manager"
        | "operations"
        | "notification_recipient"
        | "crew"
        | "other"
      yacht_operational_status: "active" | "inactive" | "maintenance"
      yachtfolio_action_status: "pending" | "completed"
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
      ai_analysis_kind: ["email_triage", "contract_extraction"],
      ai_run_status: ["queued", "processing", "completed", "failed"],
      ai_suggestion_status: [
        "pending_review",
        "approved",
        "rejected",
        "superseded",
      ],
      backup_verification_status: ["started", "passed", "failed"],
      booking_status: ["confirmed", "charter_active", "completed", "cancelled"],
      calendar_event_kind: ["charter", "payment", "task"],
      calendar_event_status: ["active", "cancelled"],
      calendar_sync_status: ["not_configured", "pending", "synced", "failed"],
      communication_template_kind: [
        "kyc_request",
        "captain_contact",
        "broker_follow_up",
      ],
      communication_template_status: ["draft", "approved", "retired"],
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
      contract_review_status: ["draft", "approved", "superseded"],
      document_requirement_status: [
        "missing",
        "uploaded",
        "verified",
        "waived",
      ],
      document_scan_status: [
        "pending",
        "scanning",
        "clean",
        "infected",
        "error",
        "released",
      ],
      document_type: [
        "charter_agreement",
        "broker_kyc_statement",
        "client_passport",
        "cdd_check",
        "kylian_commission_invoice",
        "broker_commission_invoice",
        "other",
      ],
      document_verification_status: ["pending_review", "verified", "rejected"],
      email_classification: [
        "unclassified",
        "new_enquiry",
        "enquiry_follow_up",
        "internal",
        "circular",
        "other_relevant",
      ],
      email_processing_status: [
        "received",
        "review_required",
        "classified",
        "linked",
        "ignored",
      ],
      email_provider_action_status: ["pending", "completed", "failed"],
      email_provider_action_type: ["mark_read", "archive"],
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
      integration_delivery_status: [
        "pending",
        "claimed",
        "delivered",
        "failed",
        "cancelled",
      ],
      integration_operation: [
        "telegram_send",
        "gmail_mark_read",
        "gmail_archive",
        "gmail_create_draft",
        "calendar_upsert",
        "drive_upload",
        "sheets_snapshot",
        "gmail_send_internal",
      ],
      integration_provider: [
        "telegram",
        "gmail",
        "google_calendar",
        "google_drive",
        "google_sheets",
      ],
      integration_snapshot_status: [
        "queued",
        "delivered",
        "failed",
        "cancelled",
      ],
      invoice_profile_status: ["draft", "approved", "retired"],
      launch_check_status: ["pending", "passed", "waived"],
      notification_channel: [
        "in_app",
        "telegram",
        "email_draft",
        "email_alert",
      ],
      notification_priority: ["low", "normal", "high", "urgent"],
      notification_status: [
        "pending_approval",
        "approved",
        "queued",
        "delivered",
        "failed",
        "cancelled",
      ],
      offer_pricing_basis: ["seasonal_rate", "manually_adjusted"],
      offer_status: ["draft", "approved", "sent", "withdrawn", "superseded"],
      offer_template_status: ["draft", "approved", "retired"],
      payment_status: ["scheduled", "paid", "cancelled"],
      sales_material_type: [
        "brochure",
        "crew_profiles",
        "sample_menu",
        "specifications",
        "deck_plan",
        "other",
      ],
      task_due_anchor: [
        "none",
        "booking_confirmed",
        "charter_start",
        "charter_end",
        "contract_payment_1",
        "contract_payment_2",
        "contract_payment_3",
      ],
      task_external_action: ["none", "yachtfolio_booking"],
      task_priority: ["low", "normal", "high", "urgent"],
      task_source: ["template", "ad_hoc"],
      task_status: ["blocked", "ready", "completed", "cancelled"],
      task_template_status: ["draft", "approved", "retired"],
      tutorial_practice_stage: [
        "email_received",
        "classified",
        "enquiry_created",
        "offer_prepared",
        "contract_reviewed",
        "booking_confirmed",
        "compliance_completed",
        "operations_ready",
        "charter_active",
        "charter_completed",
        "follow_up_completed",
      ],
      tutorial_status: ["not_started", "active", "paused", "completed"],
      user_oauth_connection_status: [
        "connected",
        "needs_reauthentication",
        "disconnected",
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
      yachtfolio_action_status: ["pending", "completed"],
    },
  },
} as const
