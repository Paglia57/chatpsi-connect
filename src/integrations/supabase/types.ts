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
      artigos_chat_history: {
        Row: {
          created_at: string
          error_message: string | null
          http_status: number | null
          id: string
          input_text: string
          response_json: Json | null
          thread_sent: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          error_message?: string | null
          http_status?: number | null
          id?: string
          input_text: string
          response_json?: Json | null
          thread_sent?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          error_message?: string | null
          http_status?: number | null
          id?: string
          input_text?: string
          response_json?: Json | null
          thread_sent?: string | null
          user_id?: string
        }
        Relationships: []
      }
      messages: {
        Row: {
          content: string
          created_at: string
          id: string
          is_deleted: boolean | null
          media_url: string | null
          metadata: Json | null
          sender: string | null
          thread_id: string
          type: string
          user_id: string
        }
        Insert: {
          content: string
          created_at?: string
          id?: string
          is_deleted?: boolean | null
          media_url?: string | null
          metadata?: Json | null
          sender?: string | null
          thread_id: string
          type?: string
          user_id: string
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          is_deleted?: boolean | null
          media_url?: string | null
          metadata?: Json | null
          sender?: string | null
          thread_id?: string
          type?: string
          user_id?: string
        }
        Relationships: []
      }
      plano_chat_history: {
        Row: {
          created_at: string
          error_message: string | null
          http_status: number | null
          id: string
          input_text: string
          response_json: Json | null
          thread_sent: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          error_message?: string | null
          http_status?: number | null
          id?: string
          input_text: string
          response_json?: Json | null
          thread_sent?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          error_message?: string | null
          http_status?: number | null
          id?: string
          input_text?: string
          response_json?: Json | null
          thread_sent?: string | null
          user_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          created_at: string
          current_period_end: string | null
          email: string
          full_name: string | null
          id: string
          name: string | null
          nickname: string | null
          openai_thread_id: string | null
          plan: string | null
          subscribed_at: string | null
          subscription_active: boolean
          subscription_end: string | null
          subscription_id: string | null
          subscription_tier: string | null
          threads_artigos: string | null
          threads_plano: string | null
          TokenCount: number | null
          updated_at: string
          user_id: string
          whatsapp: string | null
        }
        Insert: {
          created_at?: string
          current_period_end?: string | null
          email: string
          full_name?: string | null
          id?: string
          name?: string | null
          nickname?: string | null
          openai_thread_id?: string | null
          plan?: string | null
          subscribed_at?: string | null
          subscription_active?: boolean
          subscription_end?: string | null
          subscription_id?: string | null
          subscription_tier?: string | null
          threads_artigos?: string | null
          threads_plano?: string | null
          TokenCount?: number | null
          updated_at?: string
          user_id: string
          whatsapp?: string | null
        }
        Update: {
          created_at?: string
          current_period_end?: string | null
          email?: string
          full_name?: string | null
          id?: string
          name?: string | null
          nickname?: string | null
          openai_thread_id?: string | null
          plan?: string | null
          subscribed_at?: string | null
          subscription_active?: boolean
          subscription_end?: string | null
          subscription_id?: string | null
          subscription_tier?: string | null
          threads_artigos?: string | null
          threads_plano?: string | null
          TokenCount?: number | null
          updated_at?: string
          user_id?: string
          whatsapp?: string | null
        }
        Relationships: []
      }
      userinativos: {
        Row: {
          created_at: string
          nome: string | null
          thread: string | null
          whatsapp: string
        }
        Insert: {
          created_at?: string
          nome?: string | null
          thread?: string | null
          whatsapp: string
        }
        Update: {
          created_at?: string
          nome?: string | null
          thread?: string | null
          whatsapp?: string
        }
        Relationships: []
      }
      webhook_events: {
        Row: {
          created_at: string | null
          direction: string | null
          error: string | null
          id: string
          payload: Json | null
          status_code: number | null
        }
        Insert: {
          created_at?: string | null
          direction?: string | null
          error?: string | null
          id?: string
          payload?: Json | null
          status_code?: number | null
        }
        Update: {
          created_at?: string | null
          direction?: string | null
          error?: string | null
          id?: string
          payload?: Json | null
          status_code?: number | null
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      update_profile_basic_info: {
        Args:
          | { p_full_name: string; p_nickname?: string; p_whatsapp: string }
          | { p_full_name: string; p_whatsapp: string }
        Returns: undefined
      }
      validate_file_type: {
        Args: { filename: string }
        Returns: boolean
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
