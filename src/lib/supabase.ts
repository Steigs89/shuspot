import { createClient } from '@supabase/supabase-js'

// Supabase configuration - using your project credentials directly
const supabaseUrl = 'https://xzwdtcczndgglqikmlwj.supabase.co'
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inh6d2R0Y2N6bmRnZ2xxaWttbHdqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTMyOTkyNzUsImV4cCI6MjA2ODg3NTI3NX0.05oCSZ1d3eJHr79B1UvCoQTIL-UBGAKdRBk4CUwe7wE'

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

// Database types (generated from your schema)
export interface Database {
  public: {
    Tables: {
      user_profiles: {
        Row: {
          id: string
          email: string
          full_name: string
          display_name: string | null
          avatar_url: string | null
          date_of_birth: string | null
          grade_level: string | null
          reading_level: string | null
          preferred_language: string
          timezone: string
          parent_email: string | null
          is_child_account: boolean
          account_type: string
          onboarding_completed: boolean
          last_active_at: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          email: string
          full_name: string
          display_name?: string | null
          avatar_url?: string | null
          date_of_birth?: string | null
          grade_level?: string | null
          reading_level?: string | null
          preferred_language?: string
          timezone?: string
          parent_email?: string | null
          is_child_account?: boolean
          account_type?: string
          onboarding_completed?: boolean
          last_active_at?: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          email?: string
          full_name?: string
          display_name?: string | null
          avatar_url?: string | null
          date_of_birth?: string | null
          grade_level?: string | null
          reading_level?: string | null
          preferred_language?: string
          timezone?: string
          parent_email?: string | null
          is_child_account?: boolean
          account_type?: string
          onboarding_completed?: boolean
          last_active_at?: string
          created_at?: string
          updated_at?: string
        }
      }
      books: {
        Row: {
          id: string
          title: string
          subtitle: string | null
          author: string
          illustrator: string | null
          narrator: string | null
          description: string | null
          isbn: string | null
          publisher: string | null
          publication_date: string | null
          language: string
          reading_level: string | null
          grade_levels: string[]
          age_range: string | null
          page_count: number | null
          word_count: number | null
          estimated_reading_time: number | null
          content_type: string
          content_url: string | null
          cover_image_url: string | null
          thumbnail_url: string | null
          preview_url: string | null
          audio_url: string | null
          video_url: string | null
          file_size: number | null
          duration: number | null
          categories: string[]
          tags: string[]
          difficulty_score: number | null
          popularity_score: number
          rating_average: number
          rating_count: number
          is_featured: boolean
          is_new: boolean
          is_premium: boolean
          is_active: boolean
          metadata: any
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          title: string
          subtitle?: string | null
          author: string
          illustrator?: string | null
          narrator?: string | null
          description?: string | null
          isbn?: string | null
          publisher?: string | null
          publication_date?: string | null
          language?: string
          reading_level?: string | null
          grade_levels?: string[]
          age_range?: string | null
          page_count?: number | null
          word_count?: number | null
          estimated_reading_time?: number | null
          content_type: string
          content_url?: string | null
          cover_image_url?: string | null
          thumbnail_url?: string | null
          preview_url?: string | null
          audio_url?: string | null
          video_url?: string | null
          file_size?: number | null
          duration?: number | null
          categories?: string[]
          tags?: string[]
          difficulty_score?: number | null
          popularity_score?: number
          rating_average?: number
          rating_count?: number
          is_featured?: boolean
          is_new?: boolean
          is_premium?: boolean
          is_active?: boolean
          metadata?: any
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          title?: string
          subtitle?: string | null
          author?: string
          illustrator?: string | null
          narrator?: string | null
          description?: string | null
          isbn?: string | null
          publisher?: string | null
          publication_date?: string | null
          language?: string
          reading_level?: string | null
          grade_levels?: string[]
          age_range?: string | null
          page_count?: number | null
          word_count?: number | null
          estimated_reading_time?: number | null
          content_type?: string
          content_url?: string | null
          cover_image_url?: string | null
          thumbnail_url?: string | null
          preview_url?: string | null
          audio_url?: string | null
          video_url?: string | null
          file_size?: number | null
          duration?: number | null
          categories?: string[]
          tags?: string[]
          difficulty_score?: number | null
          popularity_score?: number
          rating_average?: number
          rating_count?: number
          is_featured?: boolean
          is_new?: boolean
          is_premium?: boolean
          is_active?: boolean
          metadata?: any
          created_at?: string
          updated_at?: string
        }
      }
      user_book_progress: {
        Row: {
          id: string
          user_id: string
          book_id: string
          status: string
          progress_percentage: number
          current_page: number
          total_pages_read: number
          total_time_spent: number
          first_started_at: string | null
          last_read_at: string | null
          completed_at: string | null
          favorite: boolean
          rating: number | null
          review_text: string | null
          times_read: number
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          book_id: string
          status?: string
          progress_percentage?: number
          current_page?: number
          total_pages_read?: number
          total_time_spent?: number
          first_started_at?: string | null
          last_read_at?: string | null
          completed_at?: string | null
          favorite?: boolean
          rating?: number | null
          review_text?: string | null
          times_read?: number
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          book_id?: string
          status?: string
          progress_percentage?: number
          current_page?: number
          total_pages_read?: number
          total_time_spent?: number
          first_started_at?: string | null
          last_read_at?: string | null
          completed_at?: string | null
          favorite?: boolean
          rating?: number | null
          review_text?: string | null
          times_read?: number
          created_at?: string
          updated_at?: string
        }
      }
      reading_sessions: {
        Row: {
          id: string
          user_id: string
          book_id: string
          session_type: string
          start_time: string
          end_time: string | null
          duration_seconds: number | null
          pages_read: number
          current_page: number
          progress_percentage: number
          is_completed: boolean
          reading_speed_wpm: number | null
          comprehension_score: number | null
          device_type: string | null
          platform: string | null
          metadata: any
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          book_id: string
          session_type: string
          start_time: string
          end_time?: string | null
          duration_seconds?: number | null
          pages_read?: number
          current_page?: number
          progress_percentage?: number
          is_completed?: boolean
          reading_speed_wpm?: number | null
          comprehension_score?: number | null
          device_type?: string | null
          platform?: string | null
          metadata?: any
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          book_id?: string
          session_type?: string
          start_time?: string
          end_time?: string | null
          duration_seconds?: number | null
          pages_read?: number
          current_page?: number
          progress_percentage?: number
          is_completed?: boolean
          reading_speed_wpm?: number | null
          comprehension_score?: number | null
          device_type?: string | null
          platform?: string | null
          metadata?: any
          created_at?: string
        }
      }
      quiz_attempts: {
        Row: {
          id: string
          user_id: string
          quiz_template_id: string
          book_id: string
          score: number
          max_score: number
          percentage: number
          passed: boolean
          time_taken_seconds: number | null
          answers: any
          started_at: string
          completed_at: string
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          quiz_template_id: string
          book_id: string
          score: number
          max_score: number
          percentage: number
          passed: boolean
          time_taken_seconds?: number | null
          answers: any
          started_at: string
          completed_at: string
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          quiz_template_id?: string
          book_id?: string
          score?: number
          max_score?: number
          percentage?: number
          passed?: boolean
          time_taken_seconds?: number | null
          answers?: any
          started_at?: string
          completed_at?: string
          created_at?: string
        }
      }
      user_achievements: {
        Row: {
          id: string
          user_id: string
          achievement_id: string
          earned_at: string
          progress_data: any
        }
        Insert: {
          id?: string
          user_id: string
          achievement_id: string
          earned_at?: string
          progress_data?: any
        }
        Update: {
          id?: string
          user_id?: string
          achievement_id?: string
          earned_at?: string
          progress_data?: any
        }
      }
      achievements: {
        Row: {
          id: string
          name: string
          description: string
          category: string
          badge_icon: string | null
          badge_color: string
          points_reward: number
          requirements: any
          is_repeatable: boolean
          is_active: boolean
          rarity: string
          created_at: string
        }
        Insert: {
          id?: string
          name: string
          description: string
          category: string
          badge_icon?: string | null
          badge_color?: string
          points_reward?: number
          requirements: any
          is_repeatable?: boolean
          is_active?: boolean
          rarity?: string
          created_at?: string
        }
        Update: {
          id?: string
          name?: string
          description?: string
          category?: string
          badge_icon?: string | null
          badge_color?: string
          points_reward?: number
          requirements?: any
          is_repeatable?: boolean
          is_active?: boolean
          rarity?: string
          created_at?: string
        }
      }
      user_subscriptions: {
        Row: {
          id: string
          user_id: string
          plan_id: string | null
          stripe_subscription_id: string | null
          stripe_customer_id: string | null
          status: string
          current_period_start: string | null
          current_period_end: string | null
          trial_start: string | null
          trial_end: string | null
          cancel_at_period_end: boolean
          canceled_at: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          plan_id?: string | null
          stripe_subscription_id?: string | null
          stripe_customer_id?: string | null
          status: string
          current_period_start?: string | null
          current_period_end?: string | null
          trial_start?: string | null
          trial_end?: string | null
          cancel_at_period_end?: boolean
          canceled_at?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          plan_id?: string | null
          stripe_subscription_id?: string | null
          stripe_customer_id?: string | null
          status?: string
          current_period_start?: string | null
          current_period_end?: string | null
          trial_start?: string | null
          trial_end?: string | null
          cancel_at_period_end?: boolean
          canceled_at?: string | null
          created_at?: string
          updated_at?: string
        }
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      update_reading_streak: {
        Args: {
          user_uuid: string
        }
        Returns: undefined
      }
    }
    Enums: {
      [_ in never]: never
    }
  }
}

// Helper functions for common operations
export const supabaseHelpers = {
  // Get current user profile
  getCurrentUserProfile: async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return null

    const { data, error } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('id', user.id)
      .single()

    if (error) throw error
    return data
  },

  // Create or update user profile
  upsertUserProfile: async (profile: Database['public']['Tables']['user_profiles']['Insert']) => {
    const { data, error } = await supabase
      .from('user_profiles')
      .upsert(profile)
      .select()
      .single()

    if (error) throw error
    return data
  },

  // Get user's reading progress for a book
  getUserBookProgress: async (userId: string, bookId: string) => {
    const { data, error } = await supabase
      .from('user_book_progress')
      .select('*')
      .eq('user_id', userId)
      .eq('book_id', bookId)
      .single()

    if (error && error.code !== 'PGRST116') throw error // PGRST116 = no rows returned
    return data
  },

  // Update reading progress
  updateReadingProgress: async (progress: Database['public']['Tables']['user_book_progress']['Insert']) => {
    const { data, error } = await supabase
      .from('user_book_progress')
      .upsert(progress)
      .select()
      .single()

    if (error) throw error
    return data
  },

  // Add reading session
  addReadingSession: async (session: Database['public']['Tables']['reading_sessions']['Insert']) => {
    const { data, error } = await supabase
      .from('reading_sessions')
      .insert(session)
      .select()
      .single()

    if (error) throw error
    return data
  },

  // Get user achievements
  getUserAchievements: async (userId: string) => {
    const { data, error } = await supabase
      .from('user_achievements')
      .select(`
        *,
        achievements (*)
      `)
      .eq('user_id', userId)
      .order('earned_at', { ascending: false })

    if (error) throw error
    return data
  },

  // Award achievement
  awardAchievement: async (userId: string, achievementId: string, progressData = {}) => {
    const { data, error } = await supabase
      .from('user_achievements')
      .insert({
        user_id: userId,
        achievement_id: achievementId,
        progress_data: progressData
      })
      .select()
      .single()

    if (error) throw error
    return data
  },

  // Get books with filters
  getBooks: async (filters: {
    contentType?: string
    readingLevel?: string
    categories?: string[]
    isActive?: boolean
    limit?: number
    offset?: number
  } = {}) => {
    let query = supabase
      .from('books')
      .select('*')

    if (filters.contentType) {
      query = query.eq('content_type', filters.contentType)
    }

    if (filters.readingLevel) {
      query = query.eq('reading_level', filters.readingLevel)
    }

    if (filters.categories && filters.categories.length > 0) {
      query = query.overlaps('categories', filters.categories)
    }

    if (filters.isActive !== undefined) {
      query = query.eq('is_active', filters.isActive)
    }

    if (filters.limit) {
      query = query.limit(filters.limit)
    }

    if (filters.offset) {
      query = query.range(filters.offset, filters.offset + (filters.limit || 10) - 1)
    }

    query = query.order('popularity_score', { ascending: false })

    const { data, error } = await query

    if (error) throw error
    return data
  },

  // Get user's reading statistics
  getUserReadingStats: async (userId: string, days = 30) => {
    const startDate = new Date()
    startDate.setDate(startDate.getDate() - days)

    const { data, error } = await supabase
      .from('daily_reading_stats')
      .select('*')
      .eq('user_id', userId)
      .gte('date', startDate.toISOString().split('T')[0])
      .order('date', { ascending: true })

    if (error) throw error
    return data
  }
}