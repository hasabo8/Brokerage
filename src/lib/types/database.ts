// ===========================================================================
// Hand-written database types. Regenerate later with:
//   supabase gen types typescript --project-id <id> > src/lib/types/database.ts
// ===========================================================================

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type LocalizedJson = { en?: string; ar?: string };

export interface Database {
  public: {
    Tables: {
      tenants: {
        Row: {
          id: string;
          name: string;
          slug: string | null;
          plan: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          slug?: string | null;
          plan?: string;
        };
        Update: Partial<Database["public"]["Tables"]["tenants"]["Insert"]>;
      };
      profiles: {
        Row: {
          id: string;
          full_name: string | null;
          phone: string | null;
          avatar_url: string | null;
          locale: string;
          created_at: string;
        };
        Insert: {
          id: string;
          full_name?: string | null;
          phone?: string | null;
          avatar_url?: string | null;
          locale?: string;
        };
        Update: Partial<Database["public"]["Tables"]["profiles"]["Insert"]>;
      };
      memberships: {
        Row: {
          tenant_id: string;
          user_id: string;
          role: string;
          created_at: string;
        };
        Insert: { tenant_id: string; user_id: string; role?: string };
        Update: Partial<Database["public"]["Tables"]["memberships"]["Insert"]>;
      };
      properties: {
        Row: {
          id: string;
          tenant_id: string;
          ref_code: string | null;
          title: LocalizedJson;
          description: LocalizedJson;
          type: string | null;
          status: string;
          price: number | null;
          currency: string;
          area_sqm: number | null;
          bedrooms: number | null;
          bathrooms: number | null;
          amenities: string[];
          city: string | null;
          district: string | null;
          address: LocalizedJson;
          metadata: Json;
          source: string | null;
          external_id: string | null;
          external_url: string | null;
          reserved_for: string | null;
          reserved_at: string | null;
          embedding: number[] | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          tenant_id?: string;
          ref_code?: string | null;
          title: LocalizedJson;
          description?: LocalizedJson;
          type?: string | null;
          status?: string;
          price?: number | null;
          currency?: string;
          area_sqm?: number | null;
          bedrooms?: number | null;
          bathrooms?: number | null;
          amenities?: string[];
          city?: string | null;
          district?: string | null;
          address?: LocalizedJson;
          metadata?: Json;
          source?: string | null;
          external_id?: string | null;
          external_url?: string | null;
          reserved_for?: string | null;
          reserved_at?: string | null;
        };
        Update: Partial<Database["public"]["Tables"]["properties"]["Insert"]>;
      };
      property_images: {
        Row: {
          id: string;
          tenant_id: string;
          property_id: string;
          storage_path: string;
          is_cover: boolean;
          sort_order: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          tenant_id?: string;
          property_id: string;
          storage_path: string;
          is_cover?: boolean;
          sort_order?: number;
        };
        Update: Partial<
          Database["public"]["Tables"]["property_images"]["Insert"]
        >;
      };
      events: {
        Row: {
          id: string;
          tenant_id: string;
          actor_type: string | null;
          actor_id: string | null;
          entity_type: string | null;
          entity_id: string | null;
          action: string;
          payload: Json;
          created_at: string;
        };
        Insert: {
          id?: string;
          tenant_id?: string;
          actor_type?: string | null;
          actor_id?: string | null;
          entity_type?: string | null;
          entity_id?: string | null;
          action: string;
          payload?: Json;
        };
        Update: Partial<Database["public"]["Tables"]["events"]["Insert"]>;
      };
      leads: {
        Row: {
          id: string;
          tenant_id: string;
          name: string | null;
          phone: string | null;
          email: string | null;
          source: string | null;
          status: string;
          budget_min: number | null;
          budget_max: number | null;
          preferred_city: string | null;
          preferred_type: string | null;
          bedrooms_min: number | null;
          notes: string | null;
          score: number | null;
          qualification: string | null;
          ai_summary: string | null;
          next_action: string | null;
          qualified_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          tenant_id?: string;
          name?: string | null;
          phone?: string | null;
          email?: string | null;
          source?: string | null;
          status?: string;
          budget_min?: number | null;
          budget_max?: number | null;
          preferred_city?: string | null;
          preferred_type?: string | null;
          bedrooms_min?: number | null;
          notes?: string | null;
          score?: number | null;
          qualification?: string | null;
          ai_summary?: string | null;
          next_action?: string | null;
          qualified_at?: string | null;
        };
        Update: Partial<Database["public"]["Tables"]["leads"]["Insert"]>;
      };
      lead_interactions: {
        Row: {
          id: string;
          tenant_id: string;
          lead_id: string;
          channel: string | null;
          direction: string | null;
          content: string | null;
          metadata: Json;
          created_at: string;
        };
        Insert: {
          id?: string;
          tenant_id?: string;
          lead_id: string;
          channel?: string | null;
          direction?: string | null;
          content?: string | null;
          metadata?: Json;
        };
        Update: Partial<
          Database["public"]["Tables"]["lead_interactions"]["Insert"]
        >;
      };
      whatsapp_accounts: {
        Row: {
          id: string;
          tenant_id: string;
          phone_number_id: string;
          display_phone_number: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          tenant_id?: string;
          phone_number_id: string;
          display_phone_number?: string | null;
        };
        Update: Partial<
          Database["public"]["Tables"]["whatsapp_accounts"]["Insert"]
        >;
      };
      conversations: {
        Row: {
          id: string;
          tenant_id: string;
          lead_id: string | null;
          channel: string;
          external_id: string;
          status: string;
          last_message_at: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          tenant_id?: string;
          lead_id?: string | null;
          channel?: string;
          external_id: string;
          status?: string;
          last_message_at?: string | null;
        };
        Update: Partial<
          Database["public"]["Tables"]["conversations"]["Insert"]
        >;
      };
      messages: {
        Row: {
          id: string;
          tenant_id: string;
          conversation_id: string;
          lead_id: string | null;
          direction: string;
          channel: string;
          external_id: string | null;
          body: string | null;
          status: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          tenant_id?: string;
          conversation_id: string;
          lead_id?: string | null;
          direction: string;
          channel?: string;
          external_id?: string | null;
          body?: string | null;
          status?: string | null;
        };
        Update: Partial<Database["public"]["Tables"]["messages"]["Insert"]>;
      };
      follow_ups: {
        Row: {
          id: string;
          tenant_id: string;
          lead_id: string;
          due_at: string;
          channel: string;
          reason: string | null;
          message: string | null;
          status: string;
          auto: boolean;
          sent_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          tenant_id?: string;
          lead_id: string;
          due_at: string;
          channel?: string;
          reason?: string | null;
          message?: string | null;
          status?: string;
          auto?: boolean;
          sent_at?: string | null;
        };
        Update: Partial<Database["public"]["Tables"]["follow_ups"]["Insert"]>;
      };
      calls: {
        Row: {
          id: string;
          tenant_id: string;
          lead_id: string | null;
          title: string | null;
          transcript: string | null;
          summary: Json;
          sentiment: string | null;
          duration_seconds: number | null;
          source: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          tenant_id?: string;
          lead_id?: string | null;
          title?: string | null;
          transcript?: string | null;
          summary?: Json;
          sentiment?: string | null;
          duration_seconds?: number | null;
          source?: string;
        };
        Update: Partial<Database["public"]["Tables"]["calls"]["Insert"]>;
      };
      import_batches: {
        Row: {
          id: string;
          tenant_id: string;
          source: string;
          total: number;
          inserted: number;
          updated: number;
          skipped: number;
          errors: Json;
          created_at: string;
        };
        Insert: {
          id?: string;
          tenant_id?: string;
          source: string;
          total?: number;
          inserted?: number;
          updated?: number;
          skipped?: number;
          errors?: Json;
        };
        Update: Partial<
          Database["public"]["Tables"]["import_batches"]["Insert"]
        >;
      };
    };
    Functions: {
      search_properties: {
        Args: {
          p_query_embedding?: number[] | null;
          p_keywords?: string | null;
          p_min_price?: number | null;
          p_max_price?: number | null;
          p_bedrooms?: number | null;
          p_type?: string | null;
          p_city?: string | null;
          p_match_count?: number;
        };
        Returns: Array<{
          id: string;
          ref_code: string | null;
          title: LocalizedJson;
          description: LocalizedJson;
          type: string | null;
          status: string;
          price: number | null;
          currency: string;
          area_sqm: number | null;
          bedrooms: number | null;
          bathrooms: number | null;
          amenities: string[];
          city: string | null;
          district: string | null;
          score: number;
        }>;
      };
      search_properties_admin: {
        Args: {
          p_tenant: string;
          p_query_embedding?: number[] | null;
          p_keywords?: string | null;
          p_match_count?: number;
        };
        Returns: Array<{
          id: string;
          ref_code: string | null;
          title: LocalizedJson;
          description: LocalizedJson;
          type: string | null;
          status: string;
          price: number | null;
          currency: string;
          area_sqm: number | null;
          bedrooms: number | null;
          bathrooms: number | null;
          amenities: string[];
          city: string | null;
          district: string | null;
          score: number;
        }>;
      };
    };
  };
}
