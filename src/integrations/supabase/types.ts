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
    PostgrestVersion: "13.0.5"
  }
  public: {
    Tables: {
      broadcasts: {
        Row: {
          content: string
          created_at: string
          created_by: string
          expires_at: string | null
          id: string
          is_pinned: boolean | null
          priority: string
          title: string
        }
        Insert: {
          content: string
          created_at?: string
          created_by: string
          expires_at?: string | null
          id?: string
          is_pinned?: boolean | null
          priority?: string
          title: string
        }
        Update: {
          content?: string
          created_at?: string
          created_by?: string
          expires_at?: string | null
          id?: string
          is_pinned?: boolean | null
          priority?: string
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "broadcasts_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      chat_reactions: {
        Row: {
          created_at: string
          emoji: string
          id: string
          message_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          emoji: string
          id?: string
          message_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          emoji?: string
          id?: string
          message_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "chat_reactions_message_id_fkey"
            columns: ["message_id"]
            isOneToOne: false
            referencedRelation: "team_chat_messages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "chat_reactions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      clients: {
        Row: {
          client_code: string | null
          created_at: string
          id: string
          is_archived: boolean
          name: string
          premium_tag: string | null
        }
        Insert: {
          client_code?: string | null
          created_at?: string
          id?: string
          is_archived?: boolean
          name: string
          premium_tag?: string | null
        }
        Update: {
          client_code?: string | null
          created_at?: string
          id?: string
          is_archived?: boolean
          name?: string
          premium_tag?: string | null
        }
        Relationships: []
      }
      collaboration_metrics: {
        Row: {
          collaborated_tasks: number | null
          collaboration_leadership_score: number | null
          collaboration_participation_score: number | null
          id: string
          last_updated: string | null
          successful_collaboration_assists: number | null
          successful_collaborations: number | null
          tasks_with_collaborators: number | null
          user_id: string
        }
        Insert: {
          collaborated_tasks?: number | null
          collaboration_leadership_score?: number | null
          collaboration_participation_score?: number | null
          id?: string
          last_updated?: string | null
          successful_collaboration_assists?: number | null
          successful_collaborations?: number | null
          tasks_with_collaborators?: number | null
          user_id: string
        }
        Update: {
          collaborated_tasks?: number | null
          collaboration_leadership_score?: number | null
          collaboration_participation_score?: number | null
          id?: string
          last_updated?: string | null
          successful_collaboration_assists?: number | null
          successful_collaborations?: number | null
          tasks_with_collaborators?: number | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "collaboration_metrics_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      comment_reactions: {
        Row: {
          comment_id: string
          created_at: string | null
          id: string
          reaction_type: string
          user_id: string
        }
        Insert: {
          comment_id: string
          created_at?: string | null
          id?: string
          reaction_type?: string
          user_id: string
        }
        Update: {
          comment_id?: string
          created_at?: string | null
          id?: string
          reaction_type?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "comment_reactions_comment_id_fkey"
            columns: ["comment_id"]
            isOneToOne: false
            referencedRelation: "task_comments"
            referencedColumns: ["id"]
          },
        ]
      }
      comment_read_receipts: {
        Row: {
          comment_id: string
          id: string
          read_at: string | null
          user_id: string
        }
        Insert: {
          comment_id: string
          id?: string
          read_at?: string | null
          user_id: string
        }
        Update: {
          comment_id?: string
          id?: string
          read_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "comment_read_receipts_comment_id_fkey"
            columns: ["comment_id"]
            isOneToOne: false
            referencedRelation: "task_comments"
            referencedColumns: ["id"]
          },
        ]
      }
      default_avatars: {
        Row: {
          category: string
          created_at: string
          id: string
          image_url: string
          name: string
        }
        Insert: {
          category: string
          created_at?: string
          id?: string
          image_url: string
          name: string
        }
        Update: {
          category?: string
          created_at?: string
          id?: string
          image_url?: string
          name?: string
        }
        Relationships: []
      }
      gamification_stats: {
        Row: {
          collaboration_count: number
          completed_before_deadline: number
          completed_today: number
          created_at: string | null
          current_level: number
          current_streak: number
          id: string
          last_completion_date: string | null
          longest_streak: number
          quality_stars_received: number
          speed_completion_count: number
          total_completed: number
          total_points: number
          updated_at: string | null
          urgent_completed: number
          user_id: string
        }
        Insert: {
          collaboration_count?: number
          completed_before_deadline?: number
          completed_today?: number
          created_at?: string | null
          current_level?: number
          current_streak?: number
          id?: string
          last_completion_date?: string | null
          longest_streak?: number
          quality_stars_received?: number
          speed_completion_count?: number
          total_completed?: number
          total_points?: number
          updated_at?: string | null
          urgent_completed?: number
          user_id: string
        }
        Update: {
          collaboration_count?: number
          completed_before_deadline?: number
          completed_today?: number
          created_at?: string | null
          current_level?: number
          current_streak?: number
          id?: string
          last_completion_date?: string | null
          longest_streak?: number
          quality_stars_received?: number
          speed_completion_count?: number
          total_completed?: number
          total_points?: number
          updated_at?: string | null
          urgent_completed?: number
          user_id?: string
        }
        Relationships: []
      }
      hall_of_fame: {
        Row: {
          achievement_title: string
          created_at: string
          description: string
          id: string
          month_year: string
          nominated_by: string
          user_id: string
        }
        Insert: {
          achievement_title: string
          created_at?: string
          description: string
          id?: string
          month_year: string
          nominated_by: string
          user_id: string
        }
        Update: {
          achievement_title?: string
          created_at?: string
          description?: string
          id?: string
          month_year?: string
          nominated_by?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "hall_of_fame_nominated_by_fkey"
            columns: ["nominated_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "hall_of_fame_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      link_boards: {
        Row: {
          created_at: string
          display_order: number | null
          icon: string | null
          id: string
          name: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          display_order?: number | null
          icon?: string | null
          id?: string
          name: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          display_order?: number | null
          icon?: string | null
          id?: string
          name?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "link_boards_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      link_items: {
        Row: {
          board_id: string
          created_at: string
          description: string | null
          display_order: number | null
          id: string
          thumbnail_url: string | null
          title: string
          updated_at: string
          url: string
        }
        Insert: {
          board_id: string
          created_at?: string
          description?: string | null
          display_order?: number | null
          id?: string
          thumbnail_url?: string | null
          title: string
          updated_at?: string
          url: string
        }
        Update: {
          board_id?: string
          created_at?: string
          description?: string | null
          display_order?: number | null
          id?: string
          thumbnail_url?: string | null
          title?: string
          updated_at?: string
          url?: string
        }
        Relationships: [
          {
            foreignKeyName: "link_items_board_id_fkey"
            columns: ["board_id"]
            isOneToOne: false
            referencedRelation: "link_boards"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          actor_avatar_url: string | null
          actor_id: string | null
          actor_name: string | null
          created_at: string | null
          id: string
          is_read: boolean | null
          message: string
          read_at: string | null
          task_id: string | null
          title: string
          type: string
          user_id: string
        }
        Insert: {
          actor_avatar_url?: string | null
          actor_id?: string | null
          actor_name?: string | null
          created_at?: string | null
          id?: string
          is_read?: boolean | null
          message: string
          read_at?: string | null
          task_id?: string | null
          title: string
          type?: string
          user_id: string
        }
        Update: {
          actor_avatar_url?: string | null
          actor_id?: string | null
          actor_name?: string | null
          created_at?: string | null
          id?: string
          is_read?: boolean | null
          message?: string
          read_at?: string | null
          task_id?: string | null
          title?: string
          type?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notifications_actor_id_fkey"
            columns: ["actor_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notifications_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "taskops_filtered_tasks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notifications_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "tasks"
            referencedColumns: ["id"]
          },
        ]
      }
      performance_metrics: {
        Row: {
          avg_completion_time_hours: number | null
          collaboration_score: number | null
          created_at: string | null
          id: string
          metric_date: string
          quality_score: number | null
          speed_score: number | null
          tasks_completed: number | null
          tasks_delayed: number | null
          tasks_on_time: number | null
          urgency_score: number | null
          user_id: string
        }
        Insert: {
          avg_completion_time_hours?: number | null
          collaboration_score?: number | null
          created_at?: string | null
          id?: string
          metric_date: string
          quality_score?: number | null
          speed_score?: number | null
          tasks_completed?: number | null
          tasks_delayed?: number | null
          tasks_on_time?: number | null
          urgency_score?: number | null
          user_id: string
        }
        Update: {
          avg_completion_time_hours?: number | null
          collaboration_score?: number | null
          created_at?: string | null
          id?: string
          metric_date?: string
          quality_score?: number | null
          speed_score?: number | null
          tasks_completed?: number | null
          tasks_delayed?: number | null
          tasks_on_time?: number | null
          urgency_score?: number | null
          user_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          best_contact_time: string | null
          birth_day: number | null
          birth_month: number | null
          created_at: string
          creative_title: string | null
          full_name: string
          hobbies: string[] | null
          id: string
          kryptonite: string | null
          mission: string | null
          mood: string | null
          skill_set: string[] | null
          status: string | null
          superpower: string | null
          tagline: string | null
          timezone: string | null
          updated_at: string
          user_code: string | null
          weapons: string[] | null
        }
        Insert: {
          avatar_url?: string | null
          best_contact_time?: string | null
          birth_day?: number | null
          birth_month?: number | null
          created_at?: string
          creative_title?: string | null
          full_name: string
          hobbies?: string[] | null
          id: string
          kryptonite?: string | null
          mission?: string | null
          mood?: string | null
          skill_set?: string[] | null
          status?: string | null
          superpower?: string | null
          tagline?: string | null
          timezone?: string | null
          updated_at?: string
          user_code?: string | null
          weapons?: string[] | null
        }
        Update: {
          avatar_url?: string | null
          best_contact_time?: string | null
          birth_day?: number | null
          birth_month?: number | null
          created_at?: string
          creative_title?: string | null
          full_name?: string
          hobbies?: string[] | null
          id?: string
          kryptonite?: string | null
          mission?: string | null
          mood?: string | null
          skill_set?: string[] | null
          status?: string | null
          superpower?: string | null
          tagline?: string | null
          timezone?: string | null
          updated_at?: string
          user_code?: string | null
          weapons?: string[] | null
        }
        Relationships: []
      }
      projects: {
        Row: {
          client_id: string
          created_at: string
          id: string
          is_archived: boolean
          is_default: boolean
          name: string
          updated_at: string
        }
        Insert: {
          client_id: string
          created_at?: string
          id?: string
          is_archived?: boolean
          is_default?: boolean
          name: string
          updated_at?: string
        }
        Update: {
          client_id?: string
          created_at?: string
          id?: string
          is_archived?: boolean
          is_default?: boolean
          name?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "projects_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      showcase_images: {
        Row: {
          caption: string | null
          created_at: string
          display_order: number | null
          id: string
          image_url: string
          updated_at: string
          user_id: string
        }
        Insert: {
          caption?: string | null
          created_at?: string
          display_order?: number | null
          id?: string
          image_url: string
          updated_at?: string
          user_id: string
        }
        Update: {
          caption?: string | null
          created_at?: string
          display_order?: number | null
          id?: string
          image_url?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "showcase_images_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      system_settings: {
        Row: {
          created_at: string | null
          id: number
          setting_key: string
          setting_value: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          id?: number
          setting_key: string
          setting_value: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          id?: number
          setting_key?: string
          setting_value?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      task_appreciations: {
        Row: {
          created_at: string
          given_by_id: string
          id: string
          task_id: string
        }
        Insert: {
          created_at?: string
          given_by_id: string
          id?: string
          task_id: string
        }
        Update: {
          created_at?: string
          given_by_id?: string
          id?: string
          task_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "task_appreciations_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "taskops_filtered_tasks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "task_appreciations_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "tasks"
            referencedColumns: ["id"]
          },
        ]
      }
      task_collaborators: {
        Row: {
          added_at: string
          added_by_id: string
          id: string
          task_id: string
          user_id: string
        }
        Insert: {
          added_at?: string
          added_by_id: string
          id?: string
          task_id: string
          user_id: string
        }
        Update: {
          added_at?: string
          added_by_id?: string
          id?: string
          task_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "task_collaborators_added_by_id_fkey"
            columns: ["added_by_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "task_collaborators_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "taskops_filtered_tasks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "task_collaborators_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "tasks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "task_collaborators_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      task_comments: {
        Row: {
          created_at: string
          id: string
          image_url: string | null
          is_pinned: boolean | null
          message: string
          pinned_at: string | null
          pinned_by_id: string | null
          task_id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          image_url?: string | null
          is_pinned?: boolean | null
          message: string
          pinned_at?: string | null
          pinned_by_id?: string | null
          task_id: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          image_url?: string | null
          is_pinned?: boolean | null
          message?: string
          pinned_at?: string | null
          pinned_by_id?: string | null
          task_id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "task_comments_pinned_by_id_fkey"
            columns: ["pinned_by_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "task_comments_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "taskops_filtered_tasks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "task_comments_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "tasks"
            referencedColumns: ["id"]
          },
        ]
      }
      task_edit_history: {
        Row: {
          change_description: string | null
          edited_at: string
          edited_by_id: string
          field_name: string
          id: string
          new_value: string | null
          old_value: string | null
          task_id: string
          version_snapshot: string | null
        }
        Insert: {
          change_description?: string | null
          edited_at?: string
          edited_by_id: string
          field_name: string
          id?: string
          new_value?: string | null
          old_value?: string | null
          task_id: string
          version_snapshot?: string | null
        }
        Update: {
          change_description?: string | null
          edited_at?: string
          edited_by_id?: string
          field_name?: string
          id?: string
          new_value?: string | null
          old_value?: string | null
          task_id?: string
          version_snapshot?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "task_edit_history_edited_by_id_fkey"
            columns: ["edited_by_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "task_edit_history_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "taskops_filtered_tasks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "task_edit_history_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "tasks"
            referencedColumns: ["id"]
          },
        ]
      }
      tasks: {
        Row: {
          actual_delivery: string | null
          approval_date: string | null
          asset_link: string | null
          assigned_by_id: string
          assignee_id: string
          client_id: string | null
          created_at: string
          date: string
          deadline: string | null
          id: string
          is_posted: boolean | null
          is_revision: boolean
          notes: string | null
          parent_task_id: string | null
          posted_at: string | null
          posted_by: string | null
          project_id: string | null
          reference_image: string | null
          reference_link_1: string | null
          reference_link_2: string | null
          reference_link_3: string | null
          revision_comment: string | null
          revision_count: number
          revision_number: number
          revision_reference_image: string | null
          revision_reference_link: string | null
          revision_requested_at: string | null
          revision_requested_by: string | null
          status: string
          task_name: string
          updated_at: string
          urgency: string
        }
        Insert: {
          actual_delivery?: string | null
          approval_date?: string | null
          asset_link?: string | null
          assigned_by_id: string
          assignee_id: string
          client_id?: string | null
          created_at?: string
          date?: string
          deadline?: string | null
          id?: string
          is_posted?: boolean | null
          is_revision?: boolean
          notes?: string | null
          parent_task_id?: string | null
          posted_at?: string | null
          posted_by?: string | null
          project_id?: string | null
          reference_image?: string | null
          reference_link_1?: string | null
          reference_link_2?: string | null
          reference_link_3?: string | null
          revision_comment?: string | null
          revision_count?: number
          revision_number?: number
          revision_reference_image?: string | null
          revision_reference_link?: string | null
          revision_requested_at?: string | null
          revision_requested_by?: string | null
          status?: string
          task_name: string
          updated_at?: string
          urgency?: string
        }
        Update: {
          actual_delivery?: string | null
          approval_date?: string | null
          asset_link?: string | null
          assigned_by_id?: string
          assignee_id?: string
          client_id?: string | null
          created_at?: string
          date?: string
          deadline?: string | null
          id?: string
          is_posted?: boolean | null
          is_revision?: boolean
          notes?: string | null
          parent_task_id?: string | null
          posted_at?: string | null
          posted_by?: string | null
          project_id?: string | null
          reference_image?: string | null
          reference_link_1?: string | null
          reference_link_2?: string | null
          reference_link_3?: string | null
          revision_comment?: string | null
          revision_count?: number
          revision_number?: number
          revision_reference_image?: string | null
          revision_reference_link?: string | null
          revision_requested_at?: string | null
          revision_requested_by?: string | null
          status?: string
          task_name?: string
          updated_at?: string
          urgency?: string
        }
        Relationships: [
          {
            foreignKeyName: "tasks_assigned_by_id_fkey"
            columns: ["assigned_by_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tasks_assignee_id_fkey"
            columns: ["assignee_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tasks_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tasks_parent_task_id_fkey"
            columns: ["parent_task_id"]
            isOneToOne: false
            referencedRelation: "taskops_filtered_tasks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tasks_parent_task_id_fkey"
            columns: ["parent_task_id"]
            isOneToOne: false
            referencedRelation: "tasks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tasks_posted_by_fkey"
            columns: ["posted_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tasks_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      team_chat_messages: {
        Row: {
          created_at: string
          id: string
          message: string
          message_type: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          message: string
          message_type?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          message?: string
          message_type?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "team_chat_messages_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      team_mappings: {
        Row: {
          assigned_at: string
          assigned_by_id: string
          id: string
          pm_id: string
          team_member_id: string
        }
        Insert: {
          assigned_at?: string
          assigned_by_id: string
          id?: string
          pm_id: string
          team_member_id: string
        }
        Update: {
          assigned_at?: string
          assigned_by_id?: string
          id?: string
          pm_id?: string
          team_member_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "team_mappings_assigned_by_id_fkey"
            columns: ["assigned_by_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "team_mappings_pm_id_fkey"
            columns: ["pm_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "team_mappings_team_member_id_fkey"
            columns: ["team_member_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      user_achievements: {
        Row: {
          achievement_id: string
          id: string
          points_earned: number
          unlocked_at: string | null
          user_id: string
        }
        Insert: {
          achievement_id: string
          id?: string
          points_earned?: number
          unlocked_at?: string | null
          user_id: string
        }
        Update: {
          achievement_id?: string
          id?: string
          points_earned?: number
          unlocked_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      user_preferences: {
        Row: {
          created_at: string | null
          dashboard_view: string | null
          id: string
          notifications_email: boolean | null
          notifications_in_app: boolean | null
          notifications_sound_enabled: boolean | null
          notifications_sound_type: string | null
          notifications_sound_volume: number | null
          notifications_task_approved: boolean | null
          notifications_task_assigned: boolean | null
          notifications_task_completed: boolean | null
          notifications_task_reopened: boolean | null
          notifications_task_updated: boolean | null
          show_filters: boolean | null
          show_metrics: boolean | null
          theme: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          dashboard_view?: string | null
          id?: string
          notifications_email?: boolean | null
          notifications_in_app?: boolean | null
          notifications_sound_enabled?: boolean | null
          notifications_sound_type?: string | null
          notifications_sound_volume?: number | null
          notifications_task_approved?: boolean | null
          notifications_task_assigned?: boolean | null
          notifications_task_completed?: boolean | null
          notifications_task_reopened?: boolean | null
          notifications_task_updated?: boolean | null
          show_filters?: boolean | null
          show_metrics?: boolean | null
          theme?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          dashboard_view?: string | null
          id?: string
          notifications_email?: boolean | null
          notifications_in_app?: boolean | null
          notifications_sound_enabled?: boolean | null
          notifications_sound_type?: string | null
          notifications_sound_volume?: number | null
          notifications_task_approved?: boolean | null
          notifications_task_assigned?: boolean | null
          notifications_task_completed?: boolean | null
          notifications_task_reopened?: boolean | null
          notifications_task_updated?: boolean | null
          show_filters?: boolean | null
          show_metrics?: boolean | null
          theme?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_roles_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      taskops_filtered_tasks: {
        Row: {
          actual_delivery: string | null
          asset_link: string | null
          assigned_by_id: string | null
          assigned_by_name: string | null
          assignee_id: string | null
          assignee_name: string | null
          client_id: string | null
          client_name: string | null
          created_at: string | null
          date: string | null
          deadline: string | null
          delay_days: number | null
          id: string | null
          month: number | null
          notes: string | null
          reference_link_1: string | null
          reference_link_2: string | null
          reference_link_3: string | null
          status: string | null
          task_name: string | null
          updated_at: string | null
          urgency: string | null
          year: number | null
        }
        Relationships: [
          {
            foreignKeyName: "tasks_assigned_by_id_fkey"
            columns: ["assigned_by_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tasks_assignee_id_fkey"
            columns: ["assignee_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tasks_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      taskops_productivity: {
        Row: {
          assignee_id: string | null
          assignee_name: string | null
          productivity_score: number | null
          total_tasks: number | null
        }
        Relationships: [
          {
            foreignKeyName: "tasks_assignee_id_fkey"
            columns: ["assignee_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Functions: {
      cleanup_old_task_history: { Args: never; Returns: undefined }
      delete_old_notifications: { Args: never; Returns: undefined }
      generate_client_code: { Args: never; Returns: string }
      generate_user_code: { Args: never; Returns: string }
      get_collaborator_count: { Args: { _task_id: string }; Returns: number }
      get_revision_count: { Args: { task_id: string }; Returns: number }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_task_collaborator: {
        Args: { _task_id: string; _user_id: string }
        Returns: boolean
      }
      update_collaboration_metrics: {
        Args: { _user_id: string }
        Returns: undefined
      }
      update_setting: {
        Args: { key: string; value: string }
        Returns: undefined
      }
    }
    Enums: {
      app_role: "project_owner" | "project_manager" | "team_member"
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
      app_role: ["project_owner", "project_manager", "team_member"],
    },
  },
} as const
