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
      admin_users: {
        Row: {
          created_at: string
          id: string
          role: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: string
          user_id?: string
        }
        Relationships: []
      }
      audit_logs: {
        Row: {
          action: string
          actor_user_id: string | null
          created_at: string
          entity_id: string | null
          entity_type: string | null
          id: string
          metadata: Json | null
        }
        Insert: {
          action: string
          actor_user_id?: string | null
          created_at?: string
          entity_id?: string | null
          entity_type?: string | null
          id?: string
          metadata?: Json | null
        }
        Update: {
          action?: string
          actor_user_id?: string | null
          created_at?: string
          entity_id?: string | null
          entity_type?: string | null
          id?: string
          metadata?: Json | null
        }
        Relationships: []
      }
      billing_customers: {
        Row: {
          created_at: string
          email: string | null
          id: string
          stripe_customer_id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          email?: string | null
          id?: string
          stripe_customer_id: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          email?: string | null
          id?: string
          stripe_customer_id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      course_lesson_materials: {
        Row: {
          course_id: string
          created_at: string
          description: string | null
          display_order: number | null
          external_url: string | null
          file_name: string | null
          file_path: string | null
          file_size: number | null
          file_url: string | null
          id: string
          lesson_id: string | null
          material_type: string
          mime_type: string | null
          module_id: string | null
          title: string
          updated_at: string
        }
        Insert: {
          course_id: string
          created_at?: string
          description?: string | null
          display_order?: number | null
          external_url?: string | null
          file_name?: string | null
          file_path?: string | null
          file_size?: number | null
          file_url?: string | null
          id?: string
          lesson_id?: string | null
          material_type?: string
          mime_type?: string | null
          module_id?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          course_id?: string
          created_at?: string
          description?: string | null
          display_order?: number | null
          external_url?: string | null
          file_name?: string | null
          file_path?: string | null
          file_size?: number | null
          file_url?: string | null
          id?: string
          lesson_id?: string | null
          material_type?: string
          mime_type?: string | null
          module_id?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "course_lesson_materials_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "course_lesson_materials_lesson_id_fkey"
            columns: ["lesson_id"]
            isOneToOne: false
            referencedRelation: "course_lessons"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "course_lesson_materials_module_id_fkey"
            columns: ["module_id"]
            isOneToOne: false
            referencedRelation: "course_modules"
            referencedColumns: ["id"]
          },
        ]
      }
      course_lessons: {
        Row: {
          course_id: string
          created_at: string
          description: string | null
          display_order: number
          duration_seconds: number | null
          id: string
          is_preview: boolean
          lesson_type: string
          module_id: string
          status: string
          thumbnail_url: string | null
          title: string
          updated_at: string
          video_embed_url: string | null
          video_provider: string | null
          video_url: string | null
        }
        Insert: {
          course_id: string
          created_at?: string
          description?: string | null
          display_order?: number
          duration_seconds?: number | null
          id?: string
          is_preview?: boolean
          lesson_type?: string
          module_id: string
          status?: string
          thumbnail_url?: string | null
          title: string
          updated_at?: string
          video_embed_url?: string | null
          video_provider?: string | null
          video_url?: string | null
        }
        Update: {
          course_id?: string
          created_at?: string
          description?: string | null
          display_order?: number
          duration_seconds?: number | null
          id?: string
          is_preview?: boolean
          lesson_type?: string
          module_id?: string
          status?: string
          thumbnail_url?: string | null
          title?: string
          updated_at?: string
          video_embed_url?: string | null
          video_provider?: string | null
          video_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "course_lessons_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "course_lessons_module_id_fkey"
            columns: ["module_id"]
            isOneToOne: false
            referencedRelation: "course_modules"
            referencedColumns: ["id"]
          },
        ]
      }
      course_modules: {
        Row: {
          course_id: string
          created_at: string
          description: string | null
          display_order: number
          id: string
          status: string
          title: string
          updated_at: string
        }
        Insert: {
          course_id: string
          created_at?: string
          description?: string | null
          display_order?: number
          id?: string
          status?: string
          title: string
          updated_at?: string
        }
        Update: {
          course_id?: string
          created_at?: string
          description?: string | null
          display_order?: number
          id?: string
          status?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "course_modules_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
        ]
      }
      courses: {
        Row: {
          category: string | null
          checkout_url: string | null
          cover_url: string | null
          created_at: string
          created_by: string | null
          currency: string | null
          description: string | null
          display_order: number | null
          estimated_duration_minutes: number | null
          id: string
          instructor_name: string | null
          level: string | null
          price: number | null
          published_at: string | null
          short_description: string | null
          slug: string
          status: string
          thumbnail_url: string | null
          title: string
          updated_at: string
        }
        Insert: {
          category?: string | null
          checkout_url?: string | null
          cover_url?: string | null
          created_at?: string
          created_by?: string | null
          currency?: string | null
          description?: string | null
          display_order?: number | null
          estimated_duration_minutes?: number | null
          id?: string
          instructor_name?: string | null
          level?: string | null
          price?: number | null
          published_at?: string | null
          short_description?: string | null
          slug: string
          status?: string
          thumbnail_url?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          category?: string | null
          checkout_url?: string | null
          cover_url?: string | null
          created_at?: string
          created_by?: string | null
          currency?: string | null
          description?: string | null
          display_order?: number | null
          estimated_duration_minutes?: number | null
          id?: string
          instructor_name?: string | null
          level?: string | null
          price?: number | null
          published_at?: string | null
          short_description?: string | null
          slug?: string
          status?: string
          thumbnail_url?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
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
      dre_categories: {
        Row: {
          created_at: string
          display_order: number
          id: string
          name: string
          status: Database["public"]["Enums"]["dre_record_status"]
          type: Database["public"]["Enums"]["dre_category_type"]
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          display_order?: number
          id?: string
          name: string
          status?: Database["public"]["Enums"]["dre_record_status"]
          type: Database["public"]["Enums"]["dre_category_type"]
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          display_order?: number
          id?: string
          name?: string
          status?: Database["public"]["Enums"]["dre_record_status"]
          type?: Database["public"]["Enums"]["dre_category_type"]
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      dre_entries: {
        Row: {
          competence: string
          created_at: string
          id: string
          margin_percentage: number
          model_id: string
          result: number
          status: Database["public"]["Enums"]["dre_entry_status"]
          total_credit: number
          total_debit: number
          updated_at: string
          user_id: string
        }
        Insert: {
          competence: string
          created_at?: string
          id?: string
          margin_percentage?: number
          model_id: string
          result?: number
          status?: Database["public"]["Enums"]["dre_entry_status"]
          total_credit?: number
          total_debit?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          competence?: string
          created_at?: string
          id?: string
          margin_percentage?: number
          model_id?: string
          result?: number
          status?: Database["public"]["Enums"]["dre_entry_status"]
          total_credit?: number
          total_debit?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "dre_entries_model_id_fkey"
            columns: ["model_id"]
            isOneToOne: false
            referencedRelation: "dre_models"
            referencedColumns: ["id"]
          },
        ]
      }
      dre_entry_items: {
        Row: {
          category_id: string | null
          category_name_snapshot: string
          category_type_snapshot: Database["public"]["Enums"]["dre_category_type"]
          created_at: string
          display_order: number
          dre_entry_id: string
          id: string
          line_type: Database["public"]["Enums"]["dre_model_line_type"]
          subcategory_id: string | null
          subcategory_name_snapshot: string | null
          updated_at: string
          user_id: string
          value: number
        }
        Insert: {
          category_id?: string | null
          category_name_snapshot: string
          category_type_snapshot: Database["public"]["Enums"]["dre_category_type"]
          created_at?: string
          display_order?: number
          dre_entry_id: string
          id?: string
          line_type: Database["public"]["Enums"]["dre_model_line_type"]
          subcategory_id?: string | null
          subcategory_name_snapshot?: string | null
          updated_at?: string
          user_id: string
          value?: number
        }
        Update: {
          category_id?: string | null
          category_name_snapshot?: string
          category_type_snapshot?: Database["public"]["Enums"]["dre_category_type"]
          created_at?: string
          display_order?: number
          dre_entry_id?: string
          id?: string
          line_type?: Database["public"]["Enums"]["dre_model_line_type"]
          subcategory_id?: string | null
          subcategory_name_snapshot?: string | null
          updated_at?: string
          user_id?: string
          value?: number
        }
        Relationships: [
          {
            foreignKeyName: "dre_entry_items_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "dre_categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "dre_entry_items_dre_entry_id_fkey"
            columns: ["dre_entry_id"]
            isOneToOne: false
            referencedRelation: "dre_entries"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "dre_entry_items_subcategory_id_fkey"
            columns: ["subcategory_id"]
            isOneToOne: false
            referencedRelation: "dre_subcategories"
            referencedColumns: ["id"]
          },
        ]
      }
      dre_model_lines: {
        Row: {
          category_id: string | null
          created_at: string
          display_order: number
          id: string
          line_type: Database["public"]["Enums"]["dre_model_line_type"]
          model_id: string
          parent_category_id: string | null
          subcategory_id: string | null
          sum_label: string | null
          user_id: string
        }
        Insert: {
          category_id?: string | null
          created_at?: string
          display_order?: number
          id?: string
          line_type: Database["public"]["Enums"]["dre_model_line_type"]
          model_id: string
          parent_category_id?: string | null
          subcategory_id?: string | null
          sum_label?: string | null
          user_id: string
        }
        Update: {
          category_id?: string | null
          created_at?: string
          display_order?: number
          id?: string
          line_type?: Database["public"]["Enums"]["dre_model_line_type"]
          model_id?: string
          parent_category_id?: string | null
          subcategory_id?: string | null
          sum_label?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "dre_model_lines_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "dre_categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "dre_model_lines_model_id_fkey"
            columns: ["model_id"]
            isOneToOne: false
            referencedRelation: "dre_models"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "dre_model_lines_parent_category_id_fkey"
            columns: ["parent_category_id"]
            isOneToOne: false
            referencedRelation: "dre_categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "dre_model_lines_subcategory_id_fkey"
            columns: ["subcategory_id"]
            isOneToOne: false
            referencedRelation: "dre_subcategories"
            referencedColumns: ["id"]
          },
        ]
      }
      dre_models: {
        Row: {
          created_at: string
          description: string | null
          id: string
          name: string
          status: Database["public"]["Enums"]["dre_record_status"]
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          name: string
          status?: Database["public"]["Enums"]["dre_record_status"]
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          name?: string
          status?: Database["public"]["Enums"]["dre_record_status"]
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      dre_subcategories: {
        Row: {
          category_id: string
          created_at: string
          display_order: number
          id: string
          name: string
          status: Database["public"]["Enums"]["dre_record_status"]
          updated_at: string
          user_id: string
        }
        Insert: {
          category_id: string
          created_at?: string
          display_order?: number
          id?: string
          name: string
          status?: Database["public"]["Enums"]["dre_record_status"]
          updated_at?: string
          user_id: string
        }
        Update: {
          category_id?: string
          created_at?: string
          display_order?: number
          id?: string
          name?: string
          status?: Database["public"]["Enums"]["dre_record_status"]
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "dre_subcategories_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "dre_categories"
            referencedColumns: ["id"]
          },
        ]
      }
      privacy_requests: {
        Row: {
          created_at: string
          export_format: string | null
          file_url: string | null
          id: string
          notes: string | null
          processed_at: string | null
          request_type: string
          requested_at: string
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          export_format?: string | null
          file_url?: string | null
          id?: string
          notes?: string | null
          processed_at?: string | null
          request_type: string
          requested_at?: string
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          export_format?: string | null
          file_url?: string | null
          id?: string
          notes?: string | null
          processed_at?: string | null
          request_type?: string
          requested_at?: string
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      product_subscriptions: {
        Row: {
          created_at: string
          current_period_end: string | null
          current_period_start: string | null
          id: string
          plan_name: string | null
          product_id: string
          product_name: string
          status: string
          stripe_customer_id: string | null
          stripe_subscription_id: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          current_period_end?: string | null
          current_period_start?: string | null
          id?: string
          plan_name?: string | null
          product_id: string
          product_name: string
          status?: string
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          current_period_end?: string | null
          current_period_start?: string | null
          id?: string
          plan_name?: string | null
          product_id?: string
          product_name?: string
          status?: string
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      products: {
        Row: {
          billing_interval: string | null
          created_at: string
          currency: string | null
          display_order: number
          full_description: string | null
          highlight_color: string | null
          icon: string | null
          id: string
          name: string
          product_type: string
          route_path: string | null
          short_description: string | null
          slug: string
          status: string
          price_cents: number | null
          stripe_price_id: string | null
          stripe_product_id: string | null
          updated_at: string
        }
        Insert: {
          billing_interval?: string | null
          created_at?: string
          currency?: string | null
          display_order?: number
          full_description?: string | null
          highlight_color?: string | null
          icon?: string | null
          id?: string
          name: string
          product_type?: string
          route_path?: string | null
          short_description?: string | null
          slug: string
          status?: string
          price_cents?: number | null
          stripe_price_id?: string | null
          stripe_product_id?: string | null
          updated_at?: string
        }
        Update: {
          billing_interval?: string | null
          created_at?: string
          currency?: string | null
          display_order?: number
          full_description?: string | null
          highlight_color?: string | null
          icon?: string | null
          id?: string
          name?: string
          product_type?: string
          route_path?: string | null
          short_description?: string | null
          slug?: string
          status?: string
          price_cents?: number | null
          stripe_price_id?: string | null
          stripe_product_id?: string | null
          updated_at?: string
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
      site_access_logs: {
        Row: {
          access_type: string
          created_at: string
          id: string
          ip_hash: string | null
          page_title: string | null
          path: string | null
          product_slug: string | null
          referrer: string | null
          session_id: string | null
          user_agent: string | null
          user_id: string | null
        }
        Insert: {
          access_type?: string
          created_at?: string
          id?: string
          ip_hash?: string | null
          page_title?: string | null
          path?: string | null
          product_slug?: string | null
          referrer?: string | null
          session_id?: string | null
          user_agent?: string | null
          user_id?: string | null
        }
        Update: {
          access_type?: string
          created_at?: string
          id?: string
          ip_hash?: string | null
          page_title?: string | null
          path?: string | null
          product_slug?: string | null
          referrer?: string | null
          session_id?: string | null
          user_agent?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      support_requests: {
        Row: {
          admin_notes: string | null
          created_at: string
          id: string
          message: string
          priority: string
          product_slug: string | null
          solved_at: string | null
          solved_by: string | null
          status: string
          subject: string
          type: string
          updated_at: string
          user_id: string
        }
        Insert: {
          admin_notes?: string | null
          created_at?: string
          id?: string
          message: string
          priority?: string
          product_slug?: string | null
          solved_at?: string | null
          solved_by?: string | null
          status?: string
          subject: string
          type: string
          updated_at?: string
          user_id: string
        }
        Update: {
          admin_notes?: string | null
          created_at?: string
          id?: string
          message?: string
          priority?: string
          product_slug?: string | null
          solved_at?: string | null
          solved_by?: string | null
          status?: string
          subject?: string
          type?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      user_course_enrollments: {
        Row: {
          access_type: string
          canceled_at: string | null
          course_id: string
          created_at: string
          expires_at: string | null
          id: string
          source: string | null
          started_at: string
          status: string
          stripe_customer_id: string | null
          stripe_payment_intent_id: string | null
          stripe_subscription_id: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          access_type?: string
          canceled_at?: string | null
          course_id: string
          created_at?: string
          expires_at?: string | null
          id?: string
          source?: string | null
          started_at?: string
          status?: string
          stripe_customer_id?: string | null
          stripe_payment_intent_id?: string | null
          stripe_subscription_id?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          access_type?: string
          canceled_at?: string | null
          course_id?: string
          created_at?: string
          expires_at?: string | null
          id?: string
          source?: string | null
          started_at?: string
          status?: string
          stripe_customer_id?: string | null
          stripe_payment_intent_id?: string | null
          stripe_subscription_id?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_course_enrollments_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
        ]
      }
      user_lesson_progress: {
        Row: {
          completed_at: string | null
          course_id: string
          created_at: string
          id: string
          last_watched_at: string | null
          lesson_id: string
          progress_seconds: number | null
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          completed_at?: string | null
          course_id: string
          created_at?: string
          id?: string
          last_watched_at?: string | null
          lesson_id: string
          progress_seconds?: number | null
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          completed_at?: string | null
          course_id?: string
          created_at?: string
          id?: string
          last_watched_at?: string | null
          lesson_id?: string
          progress_seconds?: number | null
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_lesson_progress_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_lesson_progress_lesson_id_fkey"
            columns: ["lesson_id"]
            isOneToOne: false
            referencedRelation: "course_lessons"
            referencedColumns: ["id"]
          },
        ]
      }
      user_notification_preferences: {
        Row: {
          billing_emails: boolean
          created_at: string
          id: string
          in_app_notifications: boolean
          platform_emails: boolean
          product_news: boolean
          security_alerts: boolean
          updated_at: string
          user_id: string
        }
        Insert: {
          billing_emails?: boolean
          created_at?: string
          id?: string
          in_app_notifications?: boolean
          platform_emails?: boolean
          product_news?: boolean
          security_alerts?: boolean
          updated_at?: string
          user_id: string
        }
        Update: {
          billing_emails?: boolean
          created_at?: string
          id?: string
          in_app_notifications?: boolean
          platform_emails?: boolean
          product_news?: boolean
          security_alerts?: boolean
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      user_preferences: {
        Row: {
          created_at: string
          currency: string
          date_format: string
          density: string
          id: string
          language: string
          theme: string
          timezone: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          currency?: string
          date_format?: string
          density?: string
          id?: string
          language?: string
          theme?: string
          timezone?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          currency?: string
          date_format?: string
          density?: string
          id?: string
          language?: string
          theme?: string
          timezone?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      user_product_subscriptions: {
        Row: {
          access_type: string
          cancel_at_period_end: boolean
          canceled_at: string | null
          created_at: string
          current_period_end: string | null
          current_period_start: string | null
          id: string
          plan_name: string | null
          product_id: string
          product_slug: string
          status: string
          stripe_customer_id: string | null
          stripe_price_id: string | null
          stripe_subscription_id: string | null
          trial_ends_at: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          access_type?: string
          cancel_at_period_end?: boolean
          canceled_at?: string | null
          created_at?: string
          current_period_end?: string | null
          current_period_start?: string | null
          id?: string
          plan_name?: string | null
          product_id: string
          product_slug: string
          status?: string
          stripe_customer_id?: string | null
          stripe_price_id?: string | null
          stripe_subscription_id?: string | null
          trial_ends_at?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          access_type?: string
          cancel_at_period_end?: boolean
          canceled_at?: string | null
          created_at?: string
          current_period_end?: string | null
          current_period_start?: string | null
          id?: string
          plan_name?: string | null
          product_id?: string
          product_slug?: string
          status?: string
          stripe_customer_id?: string | null
          stripe_price_id?: string | null
          stripe_subscription_id?: string | null
          trial_ends_at?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_product_subscriptions_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      stripe_webhook_events: {
        Row: {
          id: string
          payload: Json
          processed_at: string
          type: string
        }
        Insert: {
          id: string
          payload: Json
          processed_at?: string
          type: string
        }
        Update: {
          id?: string
          payload?: Json
          processed_at?: string
          type?: string
        }
        Relationships: []
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
      user_profiles: {
        Row: {
          avatar_path: string | null
          avatar_url: string | null
          company_name: string | null
          created_at: string
          full_name: string | null
          id: string
          phone: string | null
          role: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          avatar_path?: string | null
          avatar_url?: string | null
          company_name?: string | null
          created_at?: string
          full_name?: string | null
          id?: string
          phone?: string | null
          role?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          avatar_path?: string | null
          avatar_url?: string | null
          company_name?: string | null
          created_at?: string
          full_name?: string | null
          id?: string
          phone?: string | null
          role?: string | null
          updated_at?: string
          user_id?: string
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
      activate_product_subscription_for_test: {
        Args: { p_product_slug: string }
        Returns: {
          access_type: string
          canceled_at: string | null
          created_at: string
          current_period_end: string | null
          current_period_start: string | null
          id: string
          plan_name: string | null
          product_id: string
          product_slug: string
          status: string
          stripe_customer_id: string | null
          stripe_price_id: string | null
          stripe_subscription_id: string | null
          trial_ends_at: string | null
          updated_at: string
          user_id: string
        }
        SetofOptions: {
          from: "*"
          to: "user_product_subscriptions"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      check_product_access: {
        Args: { p_product_key: string; p_user_id: string }
        Returns: boolean
      }
      check_product_access_v2: {
        Args: { p_product_slug: string; p_user_id: string }
        Returns: boolean
      }
      create_default_dre_categories: {
        Args: { p_user_id: string }
        Returns: undefined
      }
      create_default_dre_structure: {
        Args: never
        Returns: {
          created: boolean
          model_id: string
        }[]
      }
      default_dre_subcategory_id: {
        Args: { p_category_id: string; p_name: string; p_user_id: string }
        Returns: string
      }
      get_diagnostic_link_by_token: {
        Args: { p_token: string }
        Returns: {
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
        }[]
        SetofOptions: {
          from: "*"
          to: "diagnostic_links"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      has_course_access: { Args: { p_course_id: string }; Returns: boolean }
      is_admin: { Args: never; Returns: boolean }
      mark_diagnostic_link_used: {
        Args: { p_link_id: string; p_user_id: string }
        Returns: undefined
      }
      register_completed_diagnostic_product: {
        Args: { p_session_id: string }
        Returns: undefined
      }
      user_can_access_template: {
        Args: { p_template_id: string }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "admin" | "client"
      dre_category_type: "credit" | "debit"
      dre_entry_status: "draft" | "finalized"
      dre_model_line_type: "category" | "subcategory" | "sum"
      dre_record_status: "active" | "inactive"
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
        | "dre_facil"
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
      dre_category_type: ["credit", "debit"],
      dre_entry_status: ["draft", "finalized"],
      dre_model_line_type: ["category", "subcategory", "sum"],
      dre_record_status: ["active", "inactive"],
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
        "dre_facil",
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
