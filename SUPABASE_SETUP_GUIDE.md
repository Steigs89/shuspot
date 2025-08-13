# Supabase Integration Setup Guide

This guide will help you set up the complete Supabase integration for your Read to Me app with user management, reading tracking, achievements, recommendations, and more.

## 🚀 Quick Start

### 1. Install Dependencies

```bash
npm install @supabase/supabase-js
# or
yarn add @supabase/supabase-js
```

### 2. Create Supabase Project

1. Go to [supabase.com](https://supabase.com)
2. Create a new project
3. Wait for the database to be set up
4. Go to Settings > API to get your keys

### 3. Set Up Environment Variables

Copy `.env.example` to `.env.local` and fill in your values:

```bash
cp .env.example .env.local
```

Update the following variables:
```env
REACT_APP_SUPABASE_URL=https://your-project.supabase.co
REACT_APP_SUPABASE_ANON_KEY=your-anon-key
```

### 4. Run Database Schema

1. Go to your Supabase dashboard
2. Navigate to SQL Editor
3. Copy and paste the contents of `supabase-schema.sql`
4. Run the script

## 📊 Database Schema Overview

### Core Tables

#### User Management
- `user_profiles` - Extended user information
- `user_preferences` - Reading preferences and settings
- `user_subscriptions` - Stripe subscription data

#### Content & Books
- `books` - Main book catalog
- `categories` - Book categories and genres
- `book_series` - Book series management

#### Reading Tracking
- `reading_sessions` - Individual reading sessions
- `user_book_progress` - Aggregate reading progress
- `daily_reading_stats` - Daily statistics

#### Assessments
- `quiz_templates` - Quiz questions and templates
- `quiz_attempts` - User quiz results

#### Gamification
- `achievements` - Achievement definitions
- `user_achievements` - User earned achievements
- `user_points` - Points and rewards system
- `reading_streaks` - Reading streak tracking

#### Social & Recommendations
- `user_follows` - User following system
- `reading_lists` - User-created book lists
- `book_recommendations` - AI/algorithm recommendations
- `user_reading_preferences` - Preference-based recommendations

## 🔧 Key Features Implemented

### 1. User Authentication & Profiles
```typescript
// Sign up with profile creation
const { signUp } = useSubscription();
await signUp(email, password, fullName);

// Update user profile
const profile = await supabaseHelpers.upsertUserProfile({
  id: user.id,
  full_name: 'John Doe',
  grade_level: '3A',
  reading_level: 'Fluent Reader'
});
```

### 2. Reading Progress Tracking
```typescript
// Track reading session
const { addReadingSession } = useUserStats();
await addReadingSession({
  bookId: 'book-123',
  bookTitle: 'Adventure Story',
  bookType: 'pdf',
  pagesRead: 25,
  totalPages: 100,
  timeSpent: 15, // minutes
  isCompleted: false
});

// Update progress
await supabaseHelpers.updateReadingProgress({
  user_id: userId,
  book_id: bookId,
  progress_percentage: 75,
  current_page: 75,
  status: 'in_progress'
});
```

### 3. Quiz & Assessment System
```typescript
// Record quiz attempt
const { addQuizResult } = useUserStats();
await addQuizResult({
  bookId: 'book-123',
  bookTitle: 'Adventure Story',
  score: 8,
  totalQuestions: 10,
  passed: true,
  timeSpent: 5
});
```

### 4. Achievement System
```typescript
// Award achievement
await supabaseHelpers.awardAchievement(
  userId, 
  'first-book-achievement-id',
  { bookTitle: 'First Book Completed' }
);

// Get user achievements
const achievements = await supabaseHelpers.getUserAchievements(userId);
```

### 5. Personalized Recommendations
```typescript
// The RecommendationEngine component automatically:
// - Analyzes user reading history
// - Considers user preferences
// - Provides trending and editorial picks
// - Suggests similar books

<RecommendationEngine 
  userId={currentUser.id}
  limit={12}
  onBookSelect={handleBookSelect}
/>
```

### 6. Subscription Management
```typescript
// Start free trial
const { startFreeTrial } = useSubscription();
await startFreeTrial('premium-monthly');

// Create Stripe checkout
const { createStripeCheckout } = useSubscription();
const result = await createStripeCheckout('premium-monthly');
if (result.success) {
  window.location.href = result.checkoutUrl;
}
```

## 🔐 Security Features

### Row Level Security (RLS)
All user data is protected with RLS policies:
- Users can only access their own data
- Public content (books, categories) is readable by all
- Admin functions require elevated permissions

### Data Validation
- Input validation on all forms
- SQL injection protection via parameterized queries
- File upload restrictions and validation

## 📈 Analytics & Insights

### User Analytics
```sql
-- Daily reading statistics
SELECT 
  date,
  SUM(total_reading_time) as total_time,
  SUM(books_completed) as books_completed,
  AVG(quiz_score) as avg_quiz_score
FROM daily_reading_stats 
WHERE user_id = $1 
GROUP BY date 
ORDER BY date DESC;
```

### Content Performance
```sql
-- Most popular books
SELECT 
  b.title,
  b.author,
  COUNT(rs.id) as reading_sessions,
  AVG(rs.duration_seconds) as avg_session_time
FROM books b
JOIN reading_sessions rs ON b.id = rs.book_id
GROUP BY b.id, b.title, b.author
ORDER BY reading_sessions DESC;
```

## 🎯 Recommendation Algorithm

The recommendation system uses multiple signals:

1. **Collaborative Filtering**: "Users who read X also read Y"
2. **Content-Based**: Similar categories, authors, reading levels
3. **Popularity**: Trending books and high-rated content
4. **Editorial**: Staff picks and featured content
5. **Personalization**: User preferences and reading history

## 🔄 Data Migration

### From localStorage to Supabase
The app automatically migrates existing localStorage data to Supabase when users first sign in.

### Backup & Export
```typescript
// Export user data
const exportUserData = async (userId: string) => {
  const data = {
    profile: await supabase.from('user_profiles').select('*').eq('id', userId),
    progress: await supabase.from('user_book_progress').select('*').eq('user_id', userId),
    achievements: await supabase.from('user_achievements').select('*').eq('user_id', userId),
    // ... other tables
  };
  return data;
};
```

## 🚀 Deployment

### Environment Setup
1. Set up production Supabase project
2. Configure RLS policies
3. Set up Stripe webhooks
4. Configure Alibaba Cloud OSS for file storage

### Performance Optimization
- Database indexes are included in schema
- Query optimization for large datasets
- Caching strategies for frequently accessed data

## 📱 Mobile Considerations

The schema supports mobile apps with:
- Offline reading progress sync
- Device-specific analytics
- Push notification preferences
- Mobile-optimized queries

## 🔧 Maintenance

### Regular Tasks
1. Monitor database performance
2. Update recommendation algorithms
3. Clean up old analytics data
4. Backup user data regularly

### Monitoring Queries
```sql
-- Active users in last 30 days
SELECT COUNT(DISTINCT user_id) 
FROM reading_sessions 
WHERE start_time > NOW() - INTERVAL '30 days';

-- Average session duration
SELECT AVG(duration_seconds) 
FROM reading_sessions 
WHERE start_time > NOW() - INTERVAL '7 days';
```

## 🆘 Troubleshooting

### Common Issues

1. **RLS Policy Errors**: Check user authentication and policy conditions
2. **Migration Issues**: Verify schema matches exactly
3. **Performance**: Add indexes for frequently queried columns
4. **Storage**: Configure proper bucket policies for file uploads

### Debug Queries
```sql
-- Check user permissions
SELECT * FROM user_profiles WHERE id = auth.uid();

-- Verify RLS policies
SELECT * FROM pg_policies WHERE tablename = 'user_book_progress';
```

## 📚 Additional Resources

- [Supabase Documentation](https://supabase.com/docs)
- [Row Level Security Guide](https://supabase.com/docs/guides/auth/row-level-security)
- [Stripe Integration](https://stripe.com/docs)
- [React Query for Data Fetching](https://react-query.tanstack.com/)

This setup provides a robust, scalable foundation for your reading app with comprehensive user tracking, personalization, and analytics capabilities.