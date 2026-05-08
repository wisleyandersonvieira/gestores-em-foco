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
    PostgrestVersion: "14.4"
  }
  public: {
    Tables: {
      diagnostic_answers: {
        Row: {
          answer_json: Json | null
          answer_text: string | null
          answer_value: string | null
          created_at: string
          id: string
          question_id: string
          score: number | null
          session_id: string
          updated_at: string
        }
        Insert: {
          answer_json?: Json | null
          answer_text?: string | null
          answer_value?: string | null
          created_at?: string
          id?: string
          question_id: string
          score?: number | null
          session_id: string
          updated_at?: string
        }
        Update: {
          answer_json?: Json | null
          answer_text?: string | null
          answer_value?: string | null
          created_at?: string
          id?: string
          question_id?: string
          score?: number | null
          session_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "diagnostic_answers_question_id_fkey"
            columns: ["question_id"]
            isOneToOne: false
            referencedRelation: "diagnostic_questions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "diagnostic_answers_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "diagnostic_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      diagnostic_categories: {
        Row: {
          created_at: string
          description: string | null
          id: string
          name: string
          sort_order: number
          template_id: string
          updated_at: string
          weight: number | null
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          name: string
          sort_order?: number
          template_id: string
          updated_at?: string
          weight?: number | null
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          name?: string
          sort_order?: number
          template_id?: string
          updated_at?: string
          weight?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "diagnostic_categories_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "admin_stats_sessions"
            referencedColumns: ["template_id"]
          },
          {
            foreignKeyName: "diagnostic_categories_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "diagnostic_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      diagnostic_links: {
        Row: {
          assigned_user_id: string | null
          created_at: string
          created_by: string
          expires_at: string | null
          id: string
          max_uses: number | null
          notes: string | null
          status: Database["public"]["Enums"]["link_status"]
          template_id: string
          title: string | null
          token: string
          updated_at: string
          uses_count: number
        }
        Insert: {
          assigned_user_id?: string | null
          created_at?: string
          created_by: string
          expires_at?: string | null
          id?: string
          max_uses?: number | null
          notes?: string | null
          status?: Database["public"]["Enums"]["link_status"]
          template_id: string
          title?: string | null
          token: string
          updated_at?: string
          uses_count?: number
        }
        Update: {
          assigned_user_id?: string | null
          created_at?: string
          created_by?: string
          expires_at?: string | null
          id?: string
          max_uses?: number | null
          notes?: string | null
          status?: Database["public"]["Enums"]["link_status"]
          template_id?: string
          title?: string | null
          token?: string
          updated_at?: string
          uses_count?: number
        }
        Relationships: [
          {
            foreignKeyName: "diagnostic_links_assigned_user_id_fkey"
            columns: ["assigned_user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "diagnostic_links_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "diagnostic_links_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "admin_stats_sessions"
            referencedColumns: ["template_id"]
          },
          {
            foreignKeyName: "diagnostic_links_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "diagnostic_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      diagnostic_question_options: {
        Row: {
          created_at: string
          id: string
          label: string
          question_id: string
          score: number | null
          sort_order: number
          value: string
        }
        Insert: {
          created_at?: string
          id?: string
          label: string
          question_id: string
          score?: number | null
          sort_order?: number
          value: string
        }
        Update: {
          created_at?: string
          id?: string
          label?: string
          question_id?: string
          score?: number | null
          sort_order?: number
          value?: string
        }
        Relationships: [
          {
            foreignKeyName: "diagnostic_question_options_question_id_fkey"
            columns: ["question_id"]
            isOneToOne: false
            referencedRelation: "diagnostic_questions"
            referencedColumns: ["id"]
          },
        ]
      }
      diagnostic_questions: {
        Row: {
          category_id: string
          created_at: string
          description: string | null
          id: string
          is_required: boolean
          question_type: Database["public"]["Enums"]["question_type"]
          settings: Json | null
          sort_order: number
          template_id: string
          title: string
          updated_at: string
          weight: number | null
        }
        Insert: {
          category_id: string
          created_at?: string
          description?: string | null
          id?: string
          is_required?: boolean
          question_type: Database["public"]["Enums"]["question_type"]
          settings?: Json | null
          sort_order?: number
          template_id: string
          title: string
          updated_at?: string
          weight?: number | null
        }
        Update: {
          category_id?: string
          created_at?: string
          description?: string | null
          id?: string
          is_required?: boolean
          question_type?: Database["public"]["Enums"]["question_type"]
          settings?: Json | null
          sort_order?: number
          template_id?: string
          title?: string
          updated_at?: string
          weight?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "diagnostic_questions_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "diagnostic_categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "diagnostic_questions_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "admin_stats_sessions"
            referencedColumns: ["template_id"]
          },
          {
            foreignKeyName: "diagnostic_questions_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "diagnostic_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      diagnostic_reports: {
        Row: {
          category_scores: Json | null
          created_at: string
          generated_at: string | null
          id: string
          overall_score: number | null
          session_id: string
          strengths: Json | null
          summary: string | null
          updated_at: string
          weaknesses: Json | null
        }
        Insert: {
          category_scores?: Json | null
          created_at?: string
          generated_at?: string | null
          id?: string
          overall_score?: number | null
          session_id: string
          strengths?: Json | null
          summary?: string | null
          updated_at?: string
          weaknesses?: Json | null
        }
        Update: {
          category_scores?: Json | null
          created_at?: string
          generated_at?: string | null
          id?: string
          overall_score?: number | null
          session_id?: string
          strengths?: Json | null
          summary?: string | null
          updated_at?: string
          weaknesses?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "diagnostic_reports_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: true
            referencedRelation: "diagnostic_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      diagnostic_sessions: {
        Row: {
          completed_at: string | null
          created_at: string
          id: string
          last_answered_at: string | null
          link_id: string
          progress_percent: number
          started_at: string | null
          status: Database["public"]["Enums"]["session_status"]
          template_id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          completed_at?: string | null
          created_at?: string
          id?: string
          last_answered_at?: string | null
          link_id: string
          progress_percent?: number
          started_at?: string | null
          status?: Database["public"]["Enums"]["session_status"]
          template_id: string
          updated_at?: string
          user_id: string
        }
        Update: {
          completed_at?: string | null
          created_at?: string
          id?: string
          last_answered_at?: string | null
          link_id?: string
          progress_percent?: number
          started_at?: string | null
          status?: Database["public"]["Enums"]["session_status"]
          template_id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "diagnostic_sessions_link_id_fkey"
            columns: ["link_id"]
            isOneToOne: false
            referencedRelation: "diagnostic_links"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "diagnostic_sessions_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "admin_stats_sessions"
            referencedColumns: ["template_id"]
          },
          {
            foreignKeyName: "diagnostic_sessions_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "diagnostic_templates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "diagnostic_sessions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      diagnostic_templates: {
        Row: {
          created_at: string
          created_by: string | null
          description: string | null
          id: string
          is_active: boolean
          name: string
          slug: string | null
          status: Database["public"]["Enums"]["template_status"]
          updated_at: string
          version: number
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          is_active?: boolean
          name: string
          slug?: string | null
          status?: Database["public"]["Enums"]["template_status"]
          updated_at?: string
          version?: number
        }
        Update: {
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          is_active?: boolean
          name?: string
          slug?: string | null
          status?: Database["public"]["Enums"]["template_status"]
          updated_at?: string
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "diagnostic_templates_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      user_products: {
        Row: {
          access_url: string | null
          expires_at: string | null
          id: string
          metadata: Json | null
          product_name: string
          product_type: Database["public"]["Enums"]["product_type"]
          purchased_at: string
          status: Database["public"]["Enums"]["user_product_status"]
          user_id: string
        }
        Insert: {
          access_url?: string | null
          expires_at?: string | null
          id?: string
          metadata?: Json | null
          product_name: string
          product_type: Database["public"]["Enums"]["product_type"]
          purchased_at?: string
          status?: Database["public"]["Enums"]["user_product_status"]
          user_id: string
        }
        Update: {
          access_url?: string | null
          expires_at?: string | null
          id?: string
          metadata?: Json | null
          product_name?: string
          product_type?: Database["public"]["Enums"]["product_type"]
          purchased_at?: string
          status?: Database["public"]["Enums"]["user_product_status"]
          user_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          company_name: string | null
          created_at: string
          email: string | null
          employees_count: number | null
          full_name: string | null
          id: string
          is_active: boolean
          role: Database["public"]["Enums"]["app_role"]
          segment: string | null
          updated_at: string
        }
        Insert: {
          company_name?: string | null
          created_at?: string
          email?: string | null
          employees_count?: number | null
          full_name?: string | null
          id: string
          is_active?: boolean
          role?: Database["public"]["Enums"]["app_role"]
          segment?: string | null
          updated_at?: string
        }
        Update: {
          company_name?: string | null
          created_at?: string
          email?: string | null
          employees_count?: number | null
          full_name?: string | null
          id?: string
          is_active?: boolean
          role?: Database["public"]["Enums"]["app_role"]
          segment?: string | null
          updated_at?: string
        }
        Relationships: []
      }
    }
    Views: {
      admin_stats_links: {
        Row: {
          active_links: number | null
          recent_links: number | null
          total_links: number | null
        }
        Relationships: []
      }
      admin_stats_sessions: {
        Row: {
          completed_sessions: number | null
          completion_rate: number | null
          template_id: string | null
          template_name: string | null
          total_sessions: number | null
        }
        Relationships: []
      }
      admin_stats_templates: {
        Row: {
          archived: number | null
          drafts: number | null
          published_active: number | null
          total_templates: number | null
        }
        Relationships: []
      }
      admin_stats_users: {
        Row: {
          active_users: number | null
          total_admins: number | null
          total_users: number | null
        }
        Relationships: []
      }
    }
    Functions: {
      is_admin: { Args: never; Returns: boolean }
      user_can_access_template: {
        Args: { p_template_id: string }
        Returns: boolean
      }
    }
      Enums: {
        app_role: "admin" | "client"
        link_status: "active" | "expired" | "cancelled"
        product_type:
          | "curso_presencial"
          | "curso_online"
          | "palestra"
          | "workshop"
          | "imersao"
          | "diagnostico"
          | "mentoria"
          | "consultoria"
        question_type:
          | "scale"
          | "single_choice"
          | "multiple_choice"
          | "text"
          | "yes_no"
        session_status: "not_started" | "in_progress" | "completed"
        template_status: "draft" | "published" | "archived"
        user_product_status: "ativo" | "concluido" | "expirado" | "pendente"
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
      app_role: ["admin", "client"],
      link_status: ["active", "expired", "cancelled"],
      product_type: [
        "curso_presencial",
        "curso_online",
        "palestra",
        "workshop",
        "imersao",
        "diagnostico",
        "mentoria",
        "consultoria",
      ],
      question_type: [
        "scale",
        "single_choice",
        "multiple_choice",
        "text",
        "yes_no",
      ],
      session_status: ["not_started", "in_progress", "completed"],
      template_status: ["draft", "published", "archived"],
      user_product_status: ["ativo", "concluido", "expirado", "pendente"],
    },
  },
} as const
