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
      facilities: {
        Row: {
          id: string
          name: string
          type: 'hospital' | 'care_facility'
          logo_url: string | null
          created_at: string
          reminder_enabled: boolean
          reminder_hour_jst: number
          leave_deadline_day: number | null
          leave_min_wishes: number
        }
        Insert: {
          id?: string
          name: string
          type: 'hospital' | 'care_facility'
          logo_url?: string | null
          created_at?: string
          reminder_enabled?: boolean
          reminder_hour_jst?: number
          leave_deadline_day?: number | null
          leave_min_wishes?: number
        }
        Update: {
          id?: string
          name?: string
          type?: 'hospital' | 'care_facility'
          logo_url?: string | null
          created_at?: string
          reminder_enabled?: boolean
          reminder_hour_jst?: number
          leave_deadline_day?: number | null
          leave_min_wishes?: number
        }
        Relationships: []
      }
      users: {
        Row: {
          id: string
          facility_id: string
          email: string
          display_name: string
          role: 'admin' | 'staff'
          avatar_url: string | null
          is_active: boolean
          created_at: string
        }
        Insert: {
          id: string
          facility_id: string
          email: string
          display_name: string
          role: 'admin' | 'staff'
          avatar_url?: string | null
          is_active?: boolean
          created_at?: string
        }
        Update: {
          id?: string
          facility_id?: string
          email?: string
          display_name?: string
          role?: 'admin' | 'staff'
          avatar_url?: string | null
          is_active?: boolean
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'users_facility_id_fkey'
            columns: ['facility_id']
            isOneToOne: false
            referencedRelation: 'facilities'
            referencedColumns: ['id']
          }
        ]
      }
      staff_profiles: {
        Row: {
          id: string
          user_id: string
          facility_id: string
          employment_type: string | null
          position: string | null
          responsible_role_id: string | null
          skills: string[]
          can_night_shift: boolean
          max_monthly_shifts: number | null
          phone: string | null
          staff_grade: 'full' | 'half' | 'new'
          fixed_night_count: number | null
          allowed_shift_type_ids: string[]
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          facility_id: string
          employment_type?: string | null
          position?: string | null
          responsible_role_id?: string | null
          skills?: string[]
          can_night_shift?: boolean
          max_monthly_shifts?: number | null
          phone?: string | null
          staff_grade?: 'full' | 'half' | 'new'
          fixed_night_count?: number | null
          allowed_shift_type_ids?: string[]
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          facility_id?: string
          employment_type?: string | null
          position?: string | null
          responsible_role_id?: string | null
          skills?: string[]
          can_night_shift?: boolean
          max_monthly_shifts?: number | null
          phone?: string | null
          staff_grade?: 'full' | 'half' | 'new'
          fixed_night_count?: number | null
          allowed_shift_type_ids?: string[]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'staff_profiles_user_id_fkey'
            columns: ['user_id']
            isOneToOne: true
            referencedRelation: 'users'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'staff_profiles_responsible_role_id_fkey'
            columns: ['responsible_role_id']
            isOneToOne: false
            referencedRelation: 'responsible_roles'
            referencedColumns: ['id']
          }
        ]
      }
      shift_types: {
        Row: {
          id: string
          facility_id: string
          name: string
          short_name: string
          color: string
          start_time: string | null
          end_time: string | null
          time_zone: 'day' | 'night'
          required_skills: string[]
          is_active: boolean
          sort_order: number
          created_at: string
        }
        Insert: {
          id?: string
          facility_id: string
          name: string
          short_name: string
          color?: string
          start_time?: string | null
          end_time?: string | null
          time_zone: 'day' | 'night'
          required_skills?: string[]
          is_active?: boolean
          sort_order?: number
          created_at?: string
        }
        Update: {
          id?: string
          facility_id?: string
          name?: string
          short_name?: string
          color?: string
          start_time?: string | null
          end_time?: string | null
          time_zone?: 'day' | 'night'
          required_skills?: string[]
          is_active?: boolean
          sort_order?: number
          created_at?: string
        }
        Relationships: []
      }
      leave_types: {
        Row: {
          id: string
          facility_id: string
          key: string
          name: string
          color: string
          is_default: boolean
          is_active: boolean
          is_wish: boolean
          sort_order: number
          monthly_limit: number | null
          created_at: string
        }
        Insert: {
          id?: string
          facility_id: string
          key: string
          name: string
          color?: string
          is_default?: boolean
          is_active?: boolean
          is_wish?: boolean
          sort_order?: number
          monthly_limit?: number | null
          created_at?: string
        }
        Update: {
          id?: string
          facility_id?: string
          key?: string
          name?: string
          color?: string
          is_default?: boolean
          is_active?: boolean
          is_wish?: boolean
          sort_order?: number
          monthly_limit?: number | null
          created_at?: string
        }
        Relationships: []
      }
      responsible_roles: {
        Row: {
          id: string
          facility_id: string
          name: string
          color: string
          require_day_zone: boolean
          require_day_zone_count: number
          require_night_zone: boolean
          require_night_zone_count: number
          is_active: boolean
          created_at: string
        }
        Insert: {
          id?: string
          facility_id: string
          name: string
          color?: string
          require_day_zone?: boolean
          require_day_zone_count?: number
          require_night_zone?: boolean
          require_night_zone_count?: number
          is_active?: boolean
          created_at?: string
        }
        Update: {
          id?: string
          facility_id?: string
          name?: string
          color?: string
          require_day_zone?: boolean
          require_day_zone_count?: number
          require_night_zone?: boolean
          require_night_zone_count?: number
          is_active?: boolean
          created_at?: string
        }
        Relationships: []
      }
      shifts: {
        Row: {
          id: string
          facility_id: string
          user_id: string
          shift_type_id: string
          date: string
          status: 'draft' | 'published' | 'confirmed'
          note: string | null
          created_by: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          facility_id: string
          user_id: string
          shift_type_id: string
          date: string
          status?: 'draft' | 'published' | 'confirmed'
          note?: string | null
          created_by?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          facility_id?: string
          user_id?: string
          shift_type_id?: string
          date?: string
          status?: 'draft' | 'published' | 'confirmed'
          note?: string | null
          created_by?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'shifts_shift_type_id_fkey'
            columns: ['shift_type_id']
            isOneToOne: false
            referencedRelation: 'shift_types'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'shifts_user_id_fkey'
            columns: ['user_id']
            isOneToOne: false
            referencedRelation: 'users'
            referencedColumns: ['id']
          }
        ]
      }
      leave_requests: {
        Row: {
          id: string
          facility_id: string
          user_id: string
          leave_type_id: string
          date: string
          reason: string | null
          status: 'pending' | 'approved' | 'rejected'
          reviewed_by: string | null
          created_at: string
        }
        Insert: {
          id?: string
          facility_id: string
          user_id: string
          leave_type_id: string
          date: string
          reason?: string | null
          status?: 'pending' | 'approved' | 'rejected'
          reviewed_by?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          facility_id?: string
          user_id?: string
          leave_type_id?: string
          date?: string
          reason?: string | null
          status?: 'pending' | 'approved' | 'rejected'
          reviewed_by?: string | null
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'leave_requests_leave_type_id_fkey'
            columns: ['leave_type_id']
            isOneToOne: false
            referencedRelation: 'leave_types'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'leave_requests_user_id_fkey'
            columns: ['user_id']
            isOneToOne: false
            referencedRelation: 'users'
            referencedColumns: ['id']
          }
        ]
      }
      constraint_settings: {
        Row: {
          id: string
          facility_id: string
          constraint_key: string
          is_enabled: boolean
          value: Json
          updated_at: string
        }
        Insert: {
          id?: string
          facility_id: string
          constraint_key: string
          is_enabled?: boolean
          value?: Json
          updated_at?: string
        }
        Update: {
          id?: string
          facility_id?: string
          constraint_key?: string
          is_enabled?: boolean
          value?: Json
          updated_at?: string
        }
        Relationships: []
      }
      committee_assignments: {
        Row: {
          id: string
          facility_id: string
          user_id: string
          committee_name: string
          meeting_dates: string[]
          created_at: string
        }
        Insert: {
          id?: string
          facility_id: string
          user_id: string
          committee_name: string
          meeting_dates?: string[]
          created_at?: string
        }
        Update: {
          id?: string
          facility_id?: string
          user_id?: string
          committee_name?: string
          meeting_dates?: string[]
          created_at?: string
        }
        Relationships: []
      }
      facility_events: {
        Row: {
          id: string
          facility_id: string
          event_type: 'bathing' | 'linen' | 'custom'
          event_name: string
          date: string
          extra_staff: Json
          note: string | null
          created_at: string
        }
        Insert: {
          id?: string
          facility_id: string
          event_type: 'bathing' | 'linen' | 'custom'
          event_name: string
          date: string
          extra_staff?: Json
          note?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          facility_id?: string
          event_type?: 'bathing' | 'linen' | 'custom'
          event_name?: string
          date?: string
          extra_staff?: Json
          note?: string | null
          created_at?: string
        }
        Relationships: []
      }
      notifications: {
        Row: {
          id: string
          facility_id: string
          user_id: string
          type: string
          message: string
          is_read: boolean
          created_at: string
        }
        Insert: {
          id?: string
          facility_id: string
          user_id: string
          type: string
          message: string
          is_read?: boolean
          created_at?: string
        }
        Update: {
          id?: string
          facility_id?: string
          user_id?: string
          type?: string
          message?: string
          is_read?: boolean
          created_at?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}
