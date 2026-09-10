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
  graphql_public: {
    Tables: {
      [_ in never]: never
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      graphql: {
        Args: {
          extensions?: Json
          operationName?: string
          query?: string
          variables?: Json
        }
        Returns: Json
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
  public: {
    Tables: {
      audit_logs: {
        Row: {
          action: string
          actor_user_id: string | null
          created_at: string
          entity_id: string | null
          entity_type: string
          id: string
          metadata: Json
          organization_id: string | null
        }
        Insert: {
          action: string
          actor_user_id?: string | null
          created_at?: string
          entity_id?: string | null
          entity_type: string
          id?: string
          metadata?: Json
          organization_id?: string | null
        }
        Update: {
          action?: string
          actor_user_id?: string | null
          created_at?: string
          entity_id?: string | null
          entity_type?: string
          id?: string
          metadata?: Json
          organization_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "audit_logs_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      campaign_messages: {
        Row: {
          body: string
          campaign_id: string
          channel: string
          created_at: string
          id: string
          scheduled_at: string | null
          sent_at: string | null
          status: string
          title: string
        }
        Insert: {
          body: string
          campaign_id: string
          channel: string
          created_at?: string
          id?: string
          scheduled_at?: string | null
          sent_at?: string | null
          status?: string
          title: string
        }
        Update: {
          body?: string
          campaign_id?: string
          channel?: string
          created_at?: string
          id?: string
          scheduled_at?: string | null
          sent_at?: string | null
          status?: string
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "campaign_messages_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "campaigns"
            referencedColumns: ["id"]
          },
        ]
      }
      campaigns: {
        Row: {
          approved_at: string | null
          approved_by: string | null
          content: Json
          created_at: string
          created_by: string | null
          end_at: string | null
          id: string
          name: string
          organization_id: string
          program_id: string | null
          rules: Json
          start_at: string | null
          status: string
          type: string
          updated_at: string
        }
        Insert: {
          approved_at?: string | null
          approved_by?: string | null
          content?: Json
          created_at?: string
          created_by?: string | null
          end_at?: string | null
          id?: string
          name: string
          organization_id: string
          program_id?: string | null
          rules?: Json
          start_at?: string | null
          status?: string
          type: string
          updated_at?: string
        }
        Update: {
          approved_at?: string | null
          approved_by?: string | null
          content?: Json
          created_at?: string
          created_by?: string | null
          end_at?: string | null
          id?: string
          name?: string
          organization_id?: string
          program_id?: string | null
          rules?: Json
          start_at?: string | null
          status?: string
          type?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "campaigns_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "campaigns_program_id_fkey"
            columns: ["program_id"]
            isOneToOne: false
            referencedRelation: "loyalty_programs"
            referencedColumns: ["id"]
          },
        ]
      }
      checkin_events: {
        Row: {
          created_at: string
          device_id: string | null
          id: string
          location_id: string
          membership_id: string | null
          organization_id: string
          qr_token_id: string | null
          resulting_transaction_id: string | null
          risk_score: number | null
          source: string
          status: string
        }
        Insert: {
          created_at?: string
          device_id?: string | null
          id?: string
          location_id: string
          membership_id?: string | null
          organization_id: string
          qr_token_id?: string | null
          resulting_transaction_id?: string | null
          risk_score?: number | null
          source: string
          status?: string
        }
        Update: {
          created_at?: string
          device_id?: string | null
          id?: string
          location_id?: string
          membership_id?: string | null
          organization_id?: string
          qr_token_id?: string | null
          resulting_transaction_id?: string | null
          risk_score?: number | null
          source?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "checkin_events_device_id_fkey"
            columns: ["device_id"]
            isOneToOne: false
            referencedRelation: "nfc_devices"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "checkin_events_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "checkin_events_membership_id_fkey"
            columns: ["membership_id"]
            isOneToOne: false
            referencedRelation: "customer_memberships"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "checkin_events_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "checkin_events_qr_token_id_fkey"
            columns: ["qr_token_id"]
            isOneToOne: false
            referencedRelation: "qr_tokens"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "checkin_events_resulting_transaction_fkey"
            columns: ["resulting_transaction_id"]
            isOneToOne: false
            referencedRelation: "loyalty_transactions"
            referencedColumns: ["id"]
          },
        ]
      }
      customer_cards: {
        Row: {
          created_at: string
          id: string
          membership_id: string
          public_token: string
          status: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          membership_id: string
          public_token?: string
          status?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          membership_id?: string
          public_token?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "customer_cards_membership_id_fkey"
            columns: ["membership_id"]
            isOneToOne: true
            referencedRelation: "customer_memberships"
            referencedColumns: ["id"]
          },
        ]
      }
      customer_consents: {
        Row: {
          consent_type: string
          created_at: string
          customer_id: string
          granted_at: string | null
          id: string
          organization_id: string
          purpose: string | null
          revoked_at: string | null
          source: string | null
          source_ref: string | null
          status: string
          term_version: string | null
        }
        Insert: {
          consent_type: string
          created_at?: string
          customer_id: string
          granted_at?: string | null
          id?: string
          organization_id: string
          purpose?: string | null
          revoked_at?: string | null
          source?: string | null
          source_ref?: string | null
          status?: string
          term_version?: string | null
        }
        Update: {
          consent_type?: string
          created_at?: string
          customer_id?: string
          granted_at?: string | null
          id?: string
          organization_id?: string
          purpose?: string | null
          revoked_at?: string | null
          source?: string | null
          source_ref?: string | null
          status?: string
          term_version?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "customer_consents_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "customer_consents_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      customer_feedback: {
        Row: {
          comment: string | null
          created_at: string
          id: string
          membership_id: string
          organization_id: string
          rating: number
          status: string
          visit_transaction_id: string | null
        }
        Insert: {
          comment?: string | null
          created_at?: string
          id?: string
          membership_id: string
          organization_id: string
          rating: number
          status?: string
          visit_transaction_id?: string | null
        }
        Update: {
          comment?: string | null
          created_at?: string
          id?: string
          membership_id?: string
          organization_id?: string
          rating?: number
          status?: string
          visit_transaction_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "customer_feedback_membership_id_fkey"
            columns: ["membership_id"]
            isOneToOne: false
            referencedRelation: "customer_memberships"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "customer_feedback_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "customer_feedback_visit_transaction_id_fkey"
            columns: ["visit_transaction_id"]
            isOneToOne: false
            referencedRelation: "loyalty_transactions"
            referencedColumns: ["id"]
          },
        ]
      }
      customer_memberships: {
        Row: {
          created_at: string
          current_points: number
          current_stamps: number
          current_visits: number
          customer_id: string
          id: string
          joined_at: string
          last_activity_at: string | null
          organization_id: string
          program_id: string
          status: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          current_points?: number
          current_stamps?: number
          current_visits?: number
          customer_id: string
          id?: string
          joined_at?: string
          last_activity_at?: string | null
          organization_id: string
          program_id: string
          status?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          current_points?: number
          current_stamps?: number
          current_visits?: number
          customer_id?: string
          id?: string
          joined_at?: string
          last_activity_at?: string | null
          organization_id?: string
          program_id?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "customer_memberships_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "customer_memberships_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "customer_memberships_program_id_fkey"
            columns: ["program_id"]
            isOneToOne: false
            referencedRelation: "loyalty_programs"
            referencedColumns: ["id"]
          },
        ]
      }
      customers: {
        Row: {
          birth_date: string | null
          created_at: string
          email: string | null
          id: string
          name: string
          organization_id: string
          phone: string | null
          updated_at: string
        }
        Insert: {
          birth_date?: string | null
          created_at?: string
          email?: string | null
          id?: string
          name: string
          organization_id: string
          phone?: string | null
          updated_at?: string
        }
        Update: {
          birth_date?: string | null
          created_at?: string
          email?: string | null
          id?: string
          name?: string
          organization_id?: string
          phone?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "customers_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      enrollment_events: {
        Row: {
          created_at: string
          id: string
          join_link_id: string | null
          membership_id: string | null
          organization_id: string
          program_id: string
          was_new_customer: boolean
        }
        Insert: {
          created_at?: string
          id?: string
          join_link_id?: string | null
          membership_id?: string | null
          organization_id: string
          program_id: string
          was_new_customer: boolean
        }
        Update: {
          created_at?: string
          id?: string
          join_link_id?: string | null
          membership_id?: string | null
          organization_id?: string
          program_id?: string
          was_new_customer?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "enrollment_events_join_link_id_fkey"
            columns: ["join_link_id"]
            isOneToOne: false
            referencedRelation: "program_join_links"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "enrollment_events_membership_id_fkey"
            columns: ["membership_id"]
            isOneToOne: false
            referencedRelation: "customer_memberships"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "enrollment_events_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "enrollment_events_program_id_fkey"
            columns: ["program_id"]
            isOneToOne: false
            referencedRelation: "loyalty_programs"
            referencedColumns: ["id"]
          },
        ]
      }
      feedback_categories: {
        Row: {
          created_at: string
          id: string
          name: string
          organization_id: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          organization_id?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          organization_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "feedback_categories_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      feedback_category_links: {
        Row: {
          category_id: string
          feedback_id: string
        }
        Insert: {
          category_id: string
          feedback_id: string
        }
        Update: {
          category_id?: string
          feedback_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "feedback_category_links_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "feedback_categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "feedback_category_links_feedback_id_fkey"
            columns: ["feedback_id"]
            isOneToOne: false
            referencedRelation: "customer_feedback"
            referencedColumns: ["id"]
          },
        ]
      }
      locations: {
        Row: {
          address: Json | null
          created_at: string
          id: string
          name: string
          organization_id: string
          slug: string
          status: string
          updated_at: string
        }
        Insert: {
          address?: Json | null
          created_at?: string
          id?: string
          name: string
          organization_id: string
          slug: string
          status?: string
          updated_at?: string
        }
        Update: {
          address?: Json | null
          created_at?: string
          id?: string
          name?: string
          organization_id?: string
          slug?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "locations_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      loyalty_programs: {
        Row: {
          created_at: string
          id: string
          location_id: string | null
          name: string
          organization_id: string
          rules: Json
          status: string
          type: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          location_id?: string | null
          name: string
          organization_id: string
          rules?: Json
          status?: string
          type: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          location_id?: string | null
          name?: string
          organization_id?: string
          rules?: Json
          status?: string
          type?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "loyalty_programs_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "loyalty_programs_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      loyalty_transactions: {
        Row: {
          amount: number
          created_at: string
          created_by: string | null
          id: string
          location_id: string | null
          membership_id: string
          metadata: Json
          organization_id: string
          program_id: string
          reference_id: string | null
          source: string
          type: string
        }
        Insert: {
          amount?: number
          created_at?: string
          created_by?: string | null
          id?: string
          location_id?: string | null
          membership_id: string
          metadata?: Json
          organization_id: string
          program_id: string
          reference_id?: string | null
          source: string
          type: string
        }
        Update: {
          amount?: number
          created_at?: string
          created_by?: string | null
          id?: string
          location_id?: string | null
          membership_id?: string
          metadata?: Json
          organization_id?: string
          program_id?: string
          reference_id?: string | null
          source?: string
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "loyalty_transactions_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "loyalty_transactions_membership_id_fkey"
            columns: ["membership_id"]
            isOneToOne: false
            referencedRelation: "customer_memberships"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "loyalty_transactions_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "loyalty_transactions_program_id_fkey"
            columns: ["program_id"]
            isOneToOne: false
            referencedRelation: "loyalty_programs"
            referencedColumns: ["id"]
          },
        ]
      }
      nfc_devices: {
        Row: {
          created_at: string
          id: string
          location_id: string
          organization_id: string
          public_identifier: string
          secret_hash: string
          secret_version: number
          status: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          location_id: string
          organization_id: string
          public_identifier: string
          secret_hash: string
          secret_version?: number
          status?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          location_id?: string
          organization_id?: string
          public_identifier?: string
          secret_hash?: string
          secret_version?: number
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "nfc_devices_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "nfc_devices_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      organization_feature_flags: {
        Row: {
          apple_wallet_enabled: boolean
          google_wallet_enabled: boolean
          internal_feedback_enabled: boolean
          organization_id: string
          reviews_enabled: boolean
          updated_at: string
          web_card_enabled: boolean
          web_push_enabled: boolean
        }
        Insert: {
          apple_wallet_enabled?: boolean
          google_wallet_enabled?: boolean
          internal_feedback_enabled?: boolean
          organization_id: string
          reviews_enabled?: boolean
          updated_at?: string
          web_card_enabled?: boolean
          web_push_enabled?: boolean
        }
        Update: {
          apple_wallet_enabled?: boolean
          google_wallet_enabled?: boolean
          internal_feedback_enabled?: boolean
          organization_id?: string
          reviews_enabled?: boolean
          updated_at?: string
          web_card_enabled?: boolean
          web_push_enabled?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "organization_feature_flags_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: true
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      organization_members: {
        Row: {
          created_at: string
          id: string
          organization_id: string
          role: string
          status: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          organization_id: string
          role: string
          status?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          organization_id?: string
          role?: string
          status?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "organization_members_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      organizations: {
        Row: {
          created_at: string
          id: string
          name: string
          slug: string
          status: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          slug: string
          status?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          slug?: string
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      platform_admins: {
        Row: {
          created_at: string
          id: string
          role: string
          status: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: string
          status?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: string
          status?: string
          user_id?: string
        }
        Relationships: []
      }
      platform_settings: {
        Row: {
          apple_wallet_enabled: boolean
          created_at: string
          google_wallet_enabled: boolean
          id: boolean
          updated_at: string
          web_push_enabled: boolean
        }
        Insert: {
          apple_wallet_enabled?: boolean
          created_at?: string
          google_wallet_enabled?: boolean
          id?: boolean
          updated_at?: string
          web_push_enabled?: boolean
        }
        Update: {
          apple_wallet_enabled?: boolean
          created_at?: string
          google_wallet_enabled?: boolean
          id?: boolean
          updated_at?: string
          web_push_enabled?: boolean
        }
        Relationships: []
      }
      profiles: {
        Row: {
          created_at: string
          email: string | null
          full_name: string | null
          id: string
          phone: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          email?: string | null
          full_name?: string | null
          id: string
          phone?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          email?: string | null
          full_name?: string | null
          id?: string
          phone?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      program_branding: {
        Row: {
          background_color: string | null
          card_style: string
          description: string | null
          headline: string | null
          logo_url: string | null
          primary_color: string | null
          program_id: string
          secondary_color: string | null
          text_color: string | null
          updated_at: string
        }
        Insert: {
          background_color?: string | null
          card_style?: string
          description?: string | null
          headline?: string | null
          logo_url?: string | null
          primary_color?: string | null
          program_id: string
          secondary_color?: string | null
          text_color?: string | null
          updated_at?: string
        }
        Update: {
          background_color?: string | null
          card_style?: string
          description?: string | null
          headline?: string | null
          logo_url?: string | null
          primary_color?: string | null
          program_id?: string
          secondary_color?: string | null
          text_color?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "program_branding_program_id_fkey"
            columns: ["program_id"]
            isOneToOne: true
            referencedRelation: "loyalty_programs"
            referencedColumns: ["id"]
          },
        ]
      }
      program_join_links: {
        Row: {
          created_at: string
          created_by: string | null
          expires_at: string | null
          id: string
          label: string | null
          location_id: string | null
          organization_id: string
          program_id: string
          status: string
          token: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          expires_at?: string | null
          id?: string
          label?: string | null
          location_id?: string | null
          organization_id: string
          program_id: string
          status?: string
          token?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          expires_at?: string | null
          id?: string
          label?: string | null
          location_id?: string | null
          organization_id?: string
          program_id?: string
          status?: string
          token?: string
        }
        Relationships: [
          {
            foreignKeyName: "program_join_links_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "program_join_links_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "program_join_links_program_id_fkey"
            columns: ["program_id"]
            isOneToOne: false
            referencedRelation: "loyalty_programs"
            referencedColumns: ["id"]
          },
        ]
      }
      qr_tokens: {
        Row: {
          created_at: string
          expires_at: string | null
          id: string
          location_id: string
          organization_id: string
          status: string
          token: string
          type: string
          usage_count: number
          usage_limit: number | null
        }
        Insert: {
          created_at?: string
          expires_at?: string | null
          id?: string
          location_id: string
          organization_id: string
          status?: string
          token: string
          type: string
          usage_count?: number
          usage_limit?: number | null
        }
        Update: {
          created_at?: string
          expires_at?: string | null
          id?: string
          location_id?: string
          organization_id?: string
          status?: string
          token?: string
          type?: string
          usage_count?: number
          usage_limit?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "qr_tokens_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "qr_tokens_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      review_channels: {
        Row: {
          created_at: string
          id: string
          label: string | null
          organization_id: string
          provider: string
          status: string
          updated_at: string
          url: string
        }
        Insert: {
          created_at?: string
          id?: string
          label?: string | null
          organization_id: string
          provider: string
          status?: string
          updated_at?: string
          url: string
        }
        Update: {
          created_at?: string
          id?: string
          label?: string | null
          organization_id?: string
          provider?: string
          status?: string
          updated_at?: string
          url?: string
        }
        Relationships: [
          {
            foreignKeyName: "review_channels_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      review_requests: {
        Row: {
          clicked_at: string | null
          id: string
          membership_id: string
          organization_id: string
          requested_at: string
          review_channel_id: string
          status: string
          visit_transaction_id: string | null
        }
        Insert: {
          clicked_at?: string | null
          id?: string
          membership_id: string
          organization_id: string
          requested_at?: string
          review_channel_id: string
          status?: string
          visit_transaction_id?: string | null
        }
        Update: {
          clicked_at?: string | null
          id?: string
          membership_id?: string
          organization_id?: string
          requested_at?: string
          review_channel_id?: string
          status?: string
          visit_transaction_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "review_requests_membership_id_fkey"
            columns: ["membership_id"]
            isOneToOne: false
            referencedRelation: "customer_memberships"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "review_requests_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "review_requests_review_channel_id_fkey"
            columns: ["review_channel_id"]
            isOneToOne: false
            referencedRelation: "review_channels"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "review_requests_visit_transaction_id_fkey"
            columns: ["visit_transaction_id"]
            isOneToOne: false
            referencedRelation: "loyalty_transactions"
            referencedColumns: ["id"]
          },
        ]
      }
      reward_redemptions: {
        Row: {
          created_at: string
          id: string
          membership_id: string
          organization_id: string
          redeemed_at: string
          redeemed_by: string | null
          reward_id: string
          status: string
          transaction_id: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          membership_id: string
          organization_id: string
          redeemed_at?: string
          redeemed_by?: string | null
          reward_id: string
          status?: string
          transaction_id?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          membership_id?: string
          organization_id?: string
          redeemed_at?: string
          redeemed_by?: string | null
          reward_id?: string
          status?: string
          transaction_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "reward_redemptions_membership_id_fkey"
            columns: ["membership_id"]
            isOneToOne: false
            referencedRelation: "customer_memberships"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reward_redemptions_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reward_redemptions_reward_id_fkey"
            columns: ["reward_id"]
            isOneToOne: false
            referencedRelation: "rewards"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reward_redemptions_transaction_id_fkey"
            columns: ["transaction_id"]
            isOneToOne: false
            referencedRelation: "loyalty_transactions"
            referencedColumns: ["id"]
          },
        ]
      }
      rewards: {
        Row: {
          created_at: string
          description: string | null
          id: string
          name: string
          organization_id: string
          program_id: string
          reward_type: string
          rules: Json
          status: string
          threshold: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          name: string
          organization_id: string
          program_id: string
          reward_type: string
          rules?: Json
          status?: string
          threshold?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          name?: string
          organization_id?: string
          program_id?: string
          reward_type?: string
          rules?: Json
          status?: string
          threshold?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "rewards_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rewards_program_id_fkey"
            columns: ["program_id"]
            isOneToOne: false
            referencedRelation: "loyalty_programs"
            referencedColumns: ["id"]
          },
        ]
      }
      wallet_passes: {
        Row: {
          created_at: string
          external_id: string | null
          id: string
          last_synced_at: string | null
          membership_id: string
          provider: string
          status: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          external_id?: string | null
          id?: string
          last_synced_at?: string | null
          membership_id: string
          provider: string
          status?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          external_id?: string | null
          id?: string
          last_synced_at?: string | null
          membership_id?: string
          provider?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "wallet_passes_membership_id_fkey"
            columns: ["membership_id"]
            isOneToOne: false
            referencedRelation: "customer_memberships"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      enroll_customer: {
        Args: {
          p_email?: string
          p_name: string
          p_opt_in_email?: boolean
          p_opt_in_whatsapp?: boolean
          p_phone: string
          p_token: string
        }
        Returns: Json
      }
      get_program_entry: { Args: { p_token: string }; Returns: Json }
      get_public_card: { Args: { p_token: string }; Returns: Json }
      is_org_member: { Args: { org_id: string }; Returns: boolean }
      is_platform_admin: { Args: never; Returns: boolean }
      normalize_br_phone: { Args: { p_raw: string }; Returns: string }
      org_role: { Args: { org_id: string }; Returns: string }
      submit_card_feedback: {
        Args: { p_comment?: string; p_rating: number; p_token: string }
        Returns: Json
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
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {},
  },
} as const
