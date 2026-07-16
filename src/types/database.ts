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
          created_at: string
          created_by: string
          document_type: Database["public"]["Enums"]["document_type"]
          id: string
          mime_type: string
          original_filename: string
          requirement_id: string | null
          retention_class: string
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
          created_at?: string
          created_by: string
          document_type: Database["public"]["Enums"]["document_type"]
          id?: string
          mime_type: string
          original_filename: string
          requirement_id?: string | null
          retention_class?: string
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
          created_at?: string
          created_by?: string
          document_type?: Database["public"]["Enums"]["document_type"]
          id?: string
          mime_type?: string
          original_filename?: string
          requirement_id?: string | null
          retention_class?: string
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
      approve_contract_review: {
        Args: {
          p_payment_amounts: number[]
          p_payment_dates: string[]
          p_review_id: string
        }
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
      delete_task_template_step: {
        Args: { p_reason: string; p_step_id: string }
        Returns: undefined
      }
      generate_booking_tasks: {
        Args: { p_booking_id: string; p_template_id?: string }
        Returns: number
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
      refresh_booking_task_states: {
        Args: { p_booking_id: string }
        Returns: undefined
      }
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
      review_booking_document: {
        Args: { p_approved: boolean; p_document_id: string; p_reason: string }
        Returns: undefined
      }
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
      waive_booking_document_requirement: {
        Args: { p_reason: string; p_requirement_id: string }
        Returns: undefined
      }
    }
    Enums: {
      booking_status: "confirmed" | "charter_active" | "completed" | "cancelled"
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
      document_type:
        | "charter_agreement"
        | "broker_kyc_statement"
        | "client_passport"
        | "cdd_check"
        | "kylian_commission_invoice"
        | "broker_commission_invoice"
        | "other"
      document_verification_status: "pending_review" | "verified" | "rejected"
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
      booking_status: ["confirmed", "charter_active", "completed", "cancelled"],
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
