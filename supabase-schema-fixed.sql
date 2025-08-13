-- Supabase Database Schema for Read to Me App (Fixed Version)
-- This schema supports user management, reading tracking, achievements, recommendations, and more

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- =============================================
-- USER MANAGEMENT & PROFILES
-- =============================================

-- User profiles (without foreign key constraint to auth.users)
CREATE TABLE user_profiles (
    id UUID PRIMARY KEY,
    email TEXT UNIQUE NOT NULL,
    full_name TEXT NOT NULL,
    display_name TEXT,
    avatar_url TEXT,
    date_of_birth DATE,
    grade_level TEXT,
    reading_level TEXT,
    preferred_language TEXT DEFAULT 'en',
    timezone TEXT DEFAULT 'UTC',
    parent_email TEXT, -- For child accounts
    is_child_account BOOLEAN DEFAULT false,
    account_type TEXT DEFAULT 'individual' CHECK (account_type IN ('individual', 'family', 'school')),
    onboarding_completed BOOLEAN DEFAULT false,
    last_active_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- User preferences and settings
CREATE TABLE user_preferences (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES user_profiles(id) ON DELETE CASCADE,
    auto_play BOOLEAN DEFAULT true,
    reading_speed TEXT DEFAULT 'normal' CHECK (reading_speed IN ('slow', 'normal', 'fast')),
    voice_preference TEXT DEFAULT 'default',
    background_music BOOLEAN DEFAULT true,
    notifications_enabled BOOLEAN DEFAULT true,
    dark_mode BOOLEAN DEFAULT false,
    parental_controls JSONB DEFAULT '{}',
    content_filters JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =============================================
-- SUBSCRIPTION & BILLING
-- =============================================

-- Subscription plans
CREATE TABLE subscription_plans (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT,
    price_monthly DECIMAL(10,2),
    price_yearly DECIMAL(10,2),
    stripe_price_id_monthly TEXT,
    stripe_price_id_yearly TEXT,
    features JSONB NOT NULL DEFAULT '[]',
    max_family_members INTEGER DEFAULT 1,
    trial_days INTEGER DEFAULT 7,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- User subscriptions
CREATE TABLE user_subscriptions (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES user_profiles(id) ON DELETE CASCADE,
    plan_id UUID REFERENCES subscription_plans(id),
    stripe_subscription_id TEXT UNIQUE,
    stripe_customer_id TEXT,
    status TEXT NOT NULL CHECK (status IN ('active', 'trialing', 'past_due', 'canceled', 'incomplete')),
    current_period_start TIMESTAMP WITH TIME ZONE,
    current_period_end TIMESTAMP WITH TIME ZONE,
    trial_start TIMESTAMP WITH TIME ZONE,
    trial_end TIMESTAMP WITH TIME ZONE,
    cancel_at_period_end BOOLEAN DEFAULT false,
    canceled_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =============================================
-- CONTENT MANAGEMENT
-- =============================================

-- Book categories and genres
CREATE TABLE categories (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    name TEXT NOT NULL UNIQUE,
    description TEXT,
    parent_id UUID REFERENCES categories(id),
    sort_order INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Books/Content library
CREATE TABLE books (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    title TEXT NOT NULL,
    subtitle TEXT,
    author TEXT NOT NULL,
    illustrator TEXT,
    narrator TEXT,
    description TEXT,
    isbn TEXT,
    publisher TEXT,
    publication_date DATE,
    language TEXT DEFAULT 'en',
    reading_level TEXT,
    grade_levels TEXT[] DEFAULT '{}',
    age_range TEXT,
    page_count INTEGER,
    word_count INTEGER,
    estimated_reading_time INTEGER, -- in minutes
    content_type TEXT NOT NULL CHECK (content_type IN ('pdf', 'video', 'audio', 'interactive')),
    content_url TEXT,
    cover_image_url TEXT,
    thumbnail_url TEXT,
    preview_url TEXT,
    audio_url TEXT,
    video_url TEXT,
    file_size BIGINT,
    duration INTEGER, -- for audio/video content in seconds
    categories UUID[] DEFAULT '{}',
    tags TEXT[] DEFAULT '{}',
    difficulty_score DECIMAL(3,2), -- 1.00 to 5.00
    popularity_score DECIMAL(5,2) DEFAULT 0,
    rating_average DECIMAL(3,2) DEFAULT 0,
    rating_count INTEGER DEFAULT 0,
    is_featured BOOLEAN DEFAULT false,
    is_new BOOLEAN DEFAULT false,
    is_premium BOOLEAN DEFAULT false,
    is_active BOOLEAN DEFAULT true,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =============================================
-- READING TRACKING & PROGRESS
-- =============================================

-- User reading sessions
CREATE TABLE reading_sessions (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES user_profiles(id) ON DELETE CASCADE,
    book_id UUID REFERENCES books(id) ON DELETE CASCADE,
    session_type TEXT NOT NULL CHECK (session_type IN ('reading', 'listening', 'watching', 'voice_practice')),
    start_time TIMESTAMP WITH TIME ZONE NOT NULL,
    end_time TIMESTAMP WITH TIME ZONE,
    duration_seconds INTEGER,
    pages_read INTEGER DEFAULT 0,
    current_page INTEGER DEFAULT 1,
    progress_percentage DECIMAL(5,2) DEFAULT 0,
    is_completed BOOLEAN DEFAULT false,
    reading_speed_wpm INTEGER, -- words per minute
    comprehension_score DECIMAL(5,2),
    device_type TEXT,
    platform TEXT,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- User book progress (aggregate)
CREATE TABLE user_book_progress (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES user_profiles(id) ON DELETE CASCADE,
    book_id UUID REFERENCES books(id) ON DELETE CASCADE,
    status TEXT NOT NULL DEFAULT 'not_started' CHECK (status IN ('not_started', 'in_progress', 'completed', 'paused')),
    progress_percentage DECIMAL(5,2) DEFAULT 0,
    current_page INTEGER DEFAULT 1,
    total_pages_read INTEGER DEFAULT 0,
    total_time_spent INTEGER DEFAULT 0, -- in seconds
    first_started_at TIMESTAMP WITH TIME ZONE,
    last_read_at TIMESTAMP WITH TIME ZONE,
    completed_at TIMESTAMP WITH TIME ZONE,
    favorite BOOLEAN DEFAULT false,
    rating INTEGER CHECK (rating >= 1 AND rating <= 5),
    review_text TEXT,
    times_read INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id, book_id)
);

-- =============================================
-- QUIZZES & ASSESSMENTS
-- =============================================

-- Quiz templates
CREATE TABLE quiz_templates (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    book_id UUID REFERENCES books(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    description TEXT,
    quiz_type TEXT NOT NULL CHECK (quiz_type IN ('comprehension', 'vocabulary', 'phonics', 'fluency')),
    difficulty_level TEXT CHECK (difficulty_level IN ('easy', 'medium', 'hard')),
    time_limit_seconds INTEGER,
    passing_score INTEGER DEFAULT 70,
    questions JSONB NOT NULL, -- Array of question objects
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- User quiz attempts
CREATE TABLE quiz_attempts (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES user_profiles(id) ON DELETE CASCADE,
    quiz_template_id UUID REFERENCES quiz_templates(id) ON DELETE CASCADE,
    book_id UUID REFERENCES books(id) ON DELETE CASCADE,
    score INTEGER NOT NULL,
    max_score INTEGER NOT NULL,
    percentage DECIMAL(5,2) NOT NULL,
    passed BOOLEAN NOT NULL,
    time_taken_seconds INTEGER,
    answers JSONB NOT NULL, -- User's answers
    started_at TIMESTAMP WITH TIME ZONE NOT NULL,
    completed_at TIMESTAMP WITH TIME ZONE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =============================================
-- ACHIEVEMENTS & REWARDS
-- =============================================

-- Achievement definitions
CREATE TABLE achievements (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    name TEXT NOT NULL UNIQUE,
    description TEXT NOT NULL,
    category TEXT NOT NULL CHECK (category IN ('reading', 'quiz', 'time', 'completion', 'streak', 'social')),
    badge_icon TEXT, -- URL or icon identifier
    badge_color TEXT DEFAULT '#FFD700',
    points_reward INTEGER DEFAULT 0,
    requirements JSONB NOT NULL, -- Conditions to earn achievement
    is_repeatable BOOLEAN DEFAULT false,
    is_active BOOLEAN DEFAULT true,
    rarity TEXT DEFAULT 'common' CHECK (rarity IN ('common', 'rare', 'epic', 'legendary')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- User achievements
CREATE TABLE user_achievements (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES user_profiles(id) ON DELETE CASCADE,
    achievement_id UUID REFERENCES achievements(id) ON DELETE CASCADE,
    earned_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    progress_data JSONB DEFAULT '{}'
);

-- User points and rewards
CREATE TABLE user_points (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES user_profiles(id) ON DELETE CASCADE,
    points_earned INTEGER NOT NULL,
    points_source TEXT NOT NULL CHECK (points_source IN ('reading', 'quiz', 'achievement', 'daily_goal', 'streak', 'bonus')),
    source_id UUID, -- Reference to book, quiz, achievement, etc.
    description TEXT,
    earned_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Reading streaks
CREATE TABLE reading_streaks (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES user_profiles(id) ON DELETE CASCADE,
    current_streak INTEGER DEFAULT 0,
    longest_streak INTEGER DEFAULT 0,
    last_read_date DATE,
    streak_start_date DATE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id)
);

-- =============================================
-- RECOMMENDATIONS & PERSONALIZATION
-- =============================================

-- User reading preferences (for recommendations)
CREATE TABLE user_reading_preferences (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES user_profiles(id) ON DELETE CASCADE,
    preferred_categories UUID[] DEFAULT '{}',
    preferred_authors TEXT[] DEFAULT '{}',
    preferred_reading_levels TEXT[] DEFAULT '{}',
    preferred_content_types TEXT[] DEFAULT '{}',
    disliked_categories UUID[] DEFAULT '{}',
    reading_goals JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id)
);

-- Book recommendations
CREATE TABLE book_recommendations (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES user_profiles(id) ON DELETE CASCADE,
    book_id UUID REFERENCES books(id) ON DELETE CASCADE,
    recommendation_type TEXT NOT NULL CHECK (recommendation_type IN ('personalized', 'trending', 'similar', 'editorial', 'ai_generated')),
    confidence_score DECIMAL(5,2), -- 0.00 to 100.00
    reason TEXT,
    metadata JSONB DEFAULT '{}',
    is_dismissed BOOLEAN DEFAULT false,
    clicked BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id, book_id, recommendation_type)
);

-- =============================================
-- SOCIAL FEATURES
-- =============================================

-- Reading lists/collections
CREATE TABLE reading_lists (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES user_profiles(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    description TEXT,
    is_public BOOLEAN DEFAULT false,
    cover_image_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Reading list items
CREATE TABLE reading_list_items (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    list_id UUID REFERENCES reading_lists(id) ON DELETE CASCADE,
    book_id UUID REFERENCES books(id) ON DELETE CASCADE,
    added_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    sort_order INTEGER DEFAULT 0,
    UNIQUE(list_id, book_id)
);

-- =============================================
-- ANALYTICS & REPORTING
-- =============================================

-- Daily reading stats (aggregated)
CREATE TABLE daily_reading_stats (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES user_profiles(id) ON DELETE CASCADE,
    date DATE NOT NULL,
    books_read INTEGER DEFAULT 0,
    books_completed INTEGER DEFAULT 0,
    total_reading_time INTEGER DEFAULT 0, -- in seconds
    pages_read INTEGER DEFAULT 0,
    quizzes_taken INTEGER DEFAULT 0,
    quizzes_passed INTEGER DEFAULT 0,
    points_earned INTEGER DEFAULT 0,
    achievements_earned INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id, date)
);

-- =============================================
-- INDEXES FOR PERFORMANCE
-- =============================================

-- User profiles indexes
CREATE INDEX idx_user_profiles_email ON user_profiles(email);
CREATE INDEX idx_user_profiles_grade_level ON user_profiles(grade_level);
CREATE INDEX idx_user_profiles_last_active ON user_profiles(last_active_at);

-- Books indexes
CREATE INDEX idx_books_content_type ON books(content_type);
CREATE INDEX idx_books_reading_level ON books(reading_level);
CREATE INDEX idx_books_categories ON books USING GIN(categories);
CREATE INDEX idx_books_tags ON books USING GIN(tags);
CREATE INDEX idx_books_is_featured ON books(is_featured) WHERE is_featured = true;
CREATE INDEX idx_books_popularity ON books(popularity_score DESC);
CREATE INDEX idx_books_rating ON books(rating_average DESC);

-- Reading progress indexes
CREATE INDEX idx_reading_sessions_user_book ON reading_sessions(user_id, book_id);
CREATE INDEX idx_reading_sessions_start_time ON reading_sessions(start_time);
CREATE INDEX idx_user_book_progress_user ON user_book_progress(user_id);
CREATE INDEX idx_user_book_progress_status ON user_book_progress(status);
CREATE INDEX idx_user_book_progress_last_read ON user_book_progress(last_read_at);

-- Quiz indexes
CREATE INDEX idx_quiz_attempts_user ON quiz_attempts(user_id);
CREATE INDEX idx_quiz_attempts_book ON quiz_attempts(book_id);
CREATE INDEX idx_quiz_attempts_completed ON quiz_attempts(completed_at);

-- Achievement indexes
CREATE INDEX idx_user_achievements_user ON user_achievements(user_id);
CREATE INDEX idx_user_achievements_earned ON user_achievements(earned_at);

-- Recommendation indexes
CREATE INDEX idx_book_recommendations_user ON book_recommendations(user_id);
CREATE INDEX idx_book_recommendations_confidence ON book_recommendations(confidence_score DESC);

-- Analytics indexes
CREATE INDEX idx_daily_reading_stats_user_date ON daily_reading_stats(user_id, date);

-- =============================================
-- ROW LEVEL SECURITY (RLS)
-- =============================================

-- Enable RLS on all user-specific tables
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE reading_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_book_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE quiz_attempts ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_achievements ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_points ENABLE ROW LEVEL SECURITY;
ALTER TABLE reading_streaks ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_reading_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE book_recommendations ENABLE ROW LEVEL SECURITY;
ALTER TABLE reading_lists ENABLE ROW LEVEL SECURITY;
ALTER TABLE reading_list_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE daily_reading_stats ENABLE ROW LEVEL SECURITY;

-- RLS Policies (users can only access their own data)
CREATE POLICY "Users can view own profile" ON user_profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can update own profile" ON user_profiles FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Users can insert own profile" ON user_profiles FOR INSERT WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can manage own preferences" ON user_preferences FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users can view own subscription" ON user_subscriptions FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can manage own reading sessions" ON reading_sessions FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users can manage own progress" ON user_book_progress FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users can manage own quiz attempts" ON quiz_attempts FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users can view own achievements" ON user_achievements FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can view own points" ON user_points FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can manage own streaks" ON reading_streaks FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users can manage own reading preferences" ON user_reading_preferences FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users can view own recommendations" ON book_recommendations FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can manage own reading lists" ON reading_lists FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users can view own analytics" ON daily_reading_stats FOR SELECT USING (auth.uid() = user_id);

-- Public read access for content tables
CREATE POLICY "Anyone can view books" ON books FOR SELECT USING (is_active = true);
CREATE POLICY "Anyone can view categories" ON categories FOR SELECT USING (is_active = true);
CREATE POLICY "Anyone can view achievements" ON achievements FOR SELECT USING (is_active = true);
CREATE POLICY "Anyone can view subscription plans" ON subscription_plans FOR SELECT USING (is_active = true);

-- =============================================
-- FUNCTIONS AND TRIGGERS
-- =============================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Add updated_at triggers
CREATE TRIGGER update_user_profiles_updated_at BEFORE UPDATE ON user_profiles FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_user_preferences_updated_at BEFORE UPDATE ON user_preferences FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_user_subscriptions_updated_at BEFORE UPDATE ON user_subscriptions FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_books_updated_at BEFORE UPDATE ON books FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_user_book_progress_updated_at BEFORE UPDATE ON user_book_progress FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_reading_streaks_updated_at BEFORE UPDATE ON reading_streaks FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_user_reading_preferences_updated_at BEFORE UPDATE ON user_reading_preferences FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_reading_lists_updated_at BEFORE UPDATE ON reading_lists FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =============================================
-- SAMPLE DATA
-- =============================================

-- Insert sample subscription plans
INSERT INTO subscription_plans (name, description, price_monthly, price_yearly, features, max_family_members, trial_days) VALUES
('Basic', 'Perfect for individual readers', 9.99, 99.99, '["Access to all books", "Read to Me feature", "Basic progress tracking", "Mobile app access"]', 1, 7),
('Premium', 'Enhanced reading experience', 19.99, 199.99, '["Everything in Basic", "Voice Coach feature", "Advanced analytics", "Offline reading", "Priority support", "Quiz & assessments"]', 1, 7),
('Family', 'Perfect for families', 29.99, 299.99, '["Everything in Premium", "Up to 6 family members", "Parental controls", "Individual progress tracking", "Family reading challenges"]', 6, 7);

-- Insert sample categories
INSERT INTO categories (name, description) VALUES
('Animals & Nature', 'Stories about animals and the natural world'),
('Adventure', 'Exciting adventure stories'),
('Fantasy', 'Magical and fantasy stories'),
('Science Fiction', 'Futuristic and sci-fi stories'),
('Educational', 'Learning and educational content'),
('Fairy Tales', 'Classic and modern fairy tales'),
('Biography', 'Stories about real people'),
('History', 'Historical stories and events');

-- Insert sample achievements
INSERT INTO achievements (name, description, category, badge_icon, points_reward, requirements) VALUES
('First Book', 'Complete your first book', 'completion', '📚', 100, '{"books_completed": 1}'),
('Speed Reader', 'Complete a book in under 30 minutes', 'time', '⚡', 200, '{"max_reading_time": 1800}'),
('Quiz Master', 'Pass 10 quizzes', 'quiz', '🧠', 300, '{"quizzes_passed": 10}'),
('Perfect Score', 'Get 100% on a quiz', 'quiz', '🏆', 150, '{"perfect_quiz_score": true}'),
('Bookworm', 'Read for 7 days in a row', 'streak', '🐛', 250, '{"reading_streak": 7}'),
('Page Turner', 'Read 100 pages total', 'reading', '📖', 200, '{"total_pages_read": 100}'),
('Early Bird', 'Read before 8 AM', 'time', '🌅', 50, '{"read_before_8am": true}'),
('Night Owl', 'Read after 10 PM', 'time', '🦉', 50, '{"read_after_10pm": true}');