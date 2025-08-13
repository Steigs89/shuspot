import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { supabase, supabaseHelpers } from '../lib/supabase';

export interface QuizResult {
  bookId: string;
  bookTitle: string;
  score: number;
  totalQuestions: number;
  passed: boolean;
  badge?: string;
  completedAt: string;
  timeSpent: number; // in minutes
}

export interface ReadingSession {
  bookId: string;
  bookTitle: string;
  bookType: 'pdf' | 'audiobook' | 'video' | 'readToMe' | 'voiceCoach';
  pagesRead: number;
  totalPages: number;
  timeSpent: number; // in minutes
  completedAt: string;
  isCompleted: boolean;
}

export interface Achievement {
  id: string;
  title: string;
  description: string;
  badge: string;
  earnedAt: string;
  category: 'reading' | 'quiz' | 'time' | 'completion';
}

export interface UserStats {
  // Reading Stats
  totalBooksCompleted: number;
  totalPagesRead: number;
  totalReadingTimeMinutes: number;
  
  // Quiz Stats
  totalQuizzesTaken: number;
  totalQuizScore: number;
  averageQuizScore: number;
  quizPassRate: number;
  
  // Activity Data
  readingSessions: ReadingSession[];
  quizResults: QuizResult[];
  achievements: Achievement[];
  
  // Weekly/Monthly Stats
  weeklyStats: {
    booksCompleted: number;
    pagesRead: number;
    timeSpent: number;
    quizzesCompleted: number;
  };
  monthlyStats: {
    booksCompleted: number;
    pagesRead: number;
    timeSpent: number;
    quizzesCompleted: number;
  };
}

interface UserStatsContextType {
  userStats: UserStats;
  addReadingSession: (session: Omit<ReadingSession, 'completedAt'>) => void;
  addQuizResult: (result: Omit<QuizResult, 'completedAt'>) => void;
  updateReadingProgress: (bookId: string, pagesRead: number, timeSpent: number) => void;
  completeBook: (bookId: string, bookTitle: string, bookType: ReadingSession['bookType'], totalPages: number, totalTimeSpent: number) => Promise<void>;
  addAchievement: (achievement: Omit<Achievement, 'earnedAt'>) => void;
  getBookProgress: (bookId: string) => { pagesRead: number; timeSpent: number } | null;
  getProgressBySection: (section: string, timeframe: 'weekly' | 'monthly') => {
    booksCompleted: number;
    pagesRead: number;
    timeSpent: number;
    quizzesCompleted: number;
  };
  resetStats: () => void;
}

const defaultStats: UserStats = {
  totalBooksCompleted: 0,
  totalPagesRead: 0,
  totalReadingTimeMinutes: 0,
  totalQuizzesTaken: 0,
  totalQuizScore: 0,
  averageQuizScore: 0,
  quizPassRate: 0,
  readingSessions: [],
  quizResults: [],
  achievements: [],
  weeklyStats: {
    booksCompleted: 0,
    pagesRead: 0,
    timeSpent: 0,
    quizzesCompleted: 0,
  },
  monthlyStats: {
    booksCompleted: 0,
    pagesRead: 0,
    timeSpent: 0,
    quizzesCompleted: 0,
  },
};

const UserStatsContext = createContext<UserStatsContextType | undefined>(undefined);

export const useUserStats = () => {
  const context = useContext(UserStatsContext);
  if (!context) {
    throw new Error('useUserStats must be used within a UserStatsProvider');
  }
  return context;
};

interface UserStatsProviderProps {
  children: ReactNode;
}

export const UserStatsProvider: React.FC<UserStatsProviderProps> = ({ children }) => {
  const [userStats, setUserStats] = useState<UserStats>(defaultStats);
  const [isLoading, setIsLoading] = useState(true);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  // Debug: Log when provider initializes
  console.log('🚀 UserStatsProvider - Provider initialized');
  
  // Debug: Check authentication immediately
  useEffect(() => {
    const checkAuth = async () => {
      const { data: { user }, error } = await supabase.auth.getUser();
      console.log('🔐 UserStatsProvider - Immediate auth check:', { 
        user: user?.id, 
        email: user?.email, 
        error: error?.message 
      });
    };
    checkAuth();
  }, []);

  // Load user stats from Supabase on mount and auth changes
  useEffect(() => {
    const loadUserStats = async () => {
      try {
        console.log('🔄 UserStatsContext - Loading user stats from Supabase...');
        const { data: { user }, error: userError } = await supabase.auth.getUser();
        
        if (userError) {
          console.error('❌ UserStatsContext - Error getting user:', userError);
        }
        
        if (!user) {
          console.log('❌ UserStatsContext - No user found, using default stats');
          console.log('🔍 UserStatsContext - Auth data:', { user, userError });
          setUserStats(defaultStats);
          setCurrentUserId(null);
          setIsLoading(false);
          return;
        }

        console.log('✅ UserStatsContext - User found:', user.id);
        console.log('👤 UserStatsContext - User email:', user.email);
        setCurrentUserId(user.id);

        // Load reading sessions
        console.log('📚 UserStatsContext - Loading reading sessions...');
        const { data: sessions, error: sessionsError } = await supabase
          .from('reading_sessions')
          .select('*')
          .eq('user_id', user.id)
          .order('start_time', { ascending: false });

        if (sessionsError) {
          console.error('❌ UserStatsContext - Error loading sessions:', sessionsError);
          throw sessionsError;
        }

        console.log('📊 UserStatsContext - Loaded sessions from Supabase:', sessions?.length || 0);

        // If no sessions from Supabase, try to load from localStorage backup
        let backupSessions: ReadingSession[] = [];
        if (!sessions || sessions.length === 0) {
          try {
            const backupKey = `readingSessions_${user.id}`;
            const backupData = localStorage.getItem(backupKey);
            if (backupData) {
              backupSessions = JSON.parse(backupData);
              console.log('💾 UserStatsContext - Loaded sessions from localStorage backup:', backupSessions.length);
            }
          } catch (error) {
            console.error('❌ UserStatsContext - Error loading from localStorage backup:', error);
          }
        }

        // Load quiz attempts
        const { data: quizAttempts, error: quizError } = await supabase
          .from('quiz_attempts')
          .select('*')
          .eq('user_id', user.id)
          .order('completed_at', { ascending: false });

        if (quizError) throw quizError;

        // Load achievements
        const { data: userAchievements, error: achievementsError } = await supabase
          .from('user_achievements')
          .select(`
            *,
            achievements (
              name,
              description,
              badge_icon,
              category
            )
          `)
          .eq('user_id', user.id)
          .order('earned_at', { ascending: false });

        if (achievementsError) throw achievementsError;

        // Transform Supabase data to our format
        console.log('🔄 UserStatsContext - Transforming Supabase data...');
        let readingSessions: ReadingSession[] = sessions?.map(session => {
          const transformedSession = {
            bookId: session.book_id,
            bookTitle: session.metadata?.bookTitle || 'Unknown Book',
            bookType: session.session_type as ReadingSession['bookType'],
            pagesRead: session.pages_read,
            totalPages: session.metadata?.totalPages || session.pages_read,
            timeSpent: Math.round((session.duration_seconds || 0) / 60), // Convert to minutes
            completedAt: session.start_time,
            isCompleted: session.is_completed
          };
          console.log('📖 UserStatsContext - Transformed session:', transformedSession);
          return transformedSession;
        }) || [];

        // If no Supabase sessions, use backup sessions
        if (readingSessions.length === 0 && backupSessions.length > 0) {
          console.log('💾 UserStatsContext - Using localStorage backup sessions:', backupSessions.length);
          readingSessions = backupSessions;
        }

        const quizResults: QuizResult[] = quizAttempts?.map(attempt => ({
          bookId: attempt.book_id,
          bookTitle: attempt.answers?.bookTitle || 'Unknown Book',
          score: attempt.score,
          totalQuestions: attempt.max_score,
          passed: attempt.passed,
          badge: attempt.answers?.badge,
          completedAt: attempt.completed_at,
          timeSpent: Math.round((attempt.time_taken_seconds || 0) / 60) // Convert to minutes
        })) || [];

        const achievements: Achievement[] = userAchievements?.map(ua => ({
          id: ua.achievement_id,
          title: ua.achievements?.name || 'Achievement',
          description: ua.achievements?.description || '',
          badge: ua.achievements?.badge_icon || '🏆',
          earnedAt: ua.earned_at,
          category: ua.achievements?.category as Achievement['category'] || 'completion'
        })) || [];

        console.log('📊 UserStatsContext - Final reading sessions:', readingSessions.length);
        console.log('🎯 UserStatsContext - Sessions by type:', readingSessions.reduce((acc, session) => {
          acc[session.bookType] = (acc[session.bookType] || 0) + 1;
          return acc;
        }, {} as Record<string, number>));

        // Calculate stats
        const calculatedStats = recalculateStats(readingSessions, quizResults, achievements);
        console.log('✅ UserStatsContext - Stats calculated and set');
        setUserStats(calculatedStats);

      } catch (error) {
        console.error('Error loading user stats from Supabase:', error);
        setUserStats(defaultStats);
      } finally {
        setIsLoading(false);
      }
    };

    // Load stats immediately on mount
    loadUserStats();

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      console.log('🔄 UserStatsContext - Auth state changed:', event, session?.user?.id);
      if (event === 'SIGNED_IN' || event === 'SIGNED_OUT') {
        loadUserStats();
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const calculateWeeklyStats = (sessions: ReadingSession[], quizResults: QuizResult[]) => {
    const oneWeekAgo = new Date();
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);

    const recentSessions = sessions.filter(session => 
      new Date(session.completedAt) >= oneWeekAgo
    );
    const recentQuizzes = quizResults.filter(quiz => 
      new Date(quiz.completedAt) >= oneWeekAgo
    );

    return {
      booksCompleted: recentSessions.filter(s => s.isCompleted).length,
      pagesRead: recentSessions.reduce((sum, s) => sum + s.pagesRead, 0),
      timeSpent: recentSessions.reduce((sum, s) => sum + s.timeSpent, 0),
      quizzesCompleted: recentQuizzes.length,
    };
  };

  const calculateMonthlyStats = (sessions: ReadingSession[], quizResults: QuizResult[]) => {
    const oneMonthAgo = new Date();
    oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1);

    const recentSessions = sessions.filter(session => 
      new Date(session.completedAt) >= oneMonthAgo
    );
    const recentQuizzes = quizResults.filter(quiz => 
      new Date(quiz.completedAt) >= oneMonthAgo
    );

    return {
      booksCompleted: recentSessions.filter(s => s.isCompleted).length,
      pagesRead: recentSessions.reduce((sum, s) => sum + s.pagesRead, 0),
      timeSpent: recentSessions.reduce((sum, s) => sum + s.timeSpent, 0),
      quizzesCompleted: recentQuizzes.length,
    };
  };

  const recalculateStats = (sessions: ReadingSession[], quizResults: QuizResult[], achievements: Achievement[]) => {
    const totalBooksCompleted = sessions.filter(s => s.isCompleted).length;
    const totalPagesRead = sessions.reduce((sum, s) => sum + s.pagesRead, 0);
    const totalReadingTimeMinutes = sessions.reduce((sum, s) => sum + s.timeSpent, 0);
    
    const totalQuizzesTaken = quizResults.length;
    const totalQuizScore = quizResults.reduce((sum, q) => sum + q.score, 0);
    const averageQuizScore = totalQuizzesTaken > 0 ? Math.round((totalQuizScore / (totalQuizzesTaken * quizResults[0]?.totalQuestions || 1)) * 100) : 0;
    const quizPassRate = totalQuizzesTaken > 0 ? Math.round((quizResults.filter(q => q.passed).length / totalQuizzesTaken) * 100) : 0;

    const weeklyStats = calculateWeeklyStats(sessions, quizResults);
    const monthlyStats = calculateMonthlyStats(sessions, quizResults);

    return {
      totalBooksCompleted,
      totalPagesRead,
      totalReadingTimeMinutes,
      totalQuizzesTaken,
      totalQuizScore,
      averageQuizScore,
      quizPassRate,
      readingSessions: sessions,
      quizResults,
      achievements,
      weeklyStats,
      monthlyStats,
    };
  };

  const addReadingSession = async (session: Omit<ReadingSession, 'completedAt'>) => {
    if (!currentUserId) return;

    const newSession: ReadingSession = {
      ...session,
      completedAt: new Date().toISOString(),
    };

    try {
      // Save to Supabase
      await supabase.from('reading_sessions').insert({
        user_id: currentUserId,
        book_id: session.bookId,
        session_type: session.bookType,
        start_time: newSession.completedAt,
        duration_seconds: session.timeSpent * 60, // Convert minutes to seconds
        pages_read: session.pagesRead,
        current_page: session.pagesRead,
        progress_percentage: session.totalPages > 0 ? (session.pagesRead / session.totalPages) * 100 : 0,
        is_completed: session.isCompleted,
        metadata: {
          bookTitle: session.bookTitle,
          totalPages: session.totalPages
        }
      });

      // Update local state
      setUserStats(prevStats => {
        const updatedSessions = [...prevStats.readingSessions, newSession];
        return recalculateStats(updatedSessions, prevStats.quizResults, prevStats.achievements);
      });

      // Check for reading achievements
      checkReadingAchievements(newSession);

    } catch (error) {
      console.error('Error saving reading session:', error);
    }
  };

  const addQuizResult = async (result: Omit<QuizResult, 'completedAt'>) => {
    if (!currentUserId) return;

    const newResult: QuizResult = {
      ...result,
      completedAt: new Date().toISOString(),
    };

    try {
      // Save to Supabase
      await supabase.from('quiz_attempts').insert({
        user_id: currentUserId,
        quiz_template_id: `quiz_${result.bookId}`, // Generate quiz template ID
        book_id: result.bookId,
        score: result.score,
        max_score: result.totalQuestions,
        percentage: (result.score / result.totalQuestions) * 100,
        passed: result.passed,
        time_taken_seconds: result.timeSpent * 60, // Convert minutes to seconds
        answers: {
          bookTitle: result.bookTitle,
          badge: result.badge
        },
        started_at: newResult.completedAt,
        completed_at: newResult.completedAt
      });

      // Update local state
      setUserStats(prevStats => {
        const updatedQuizResults = [...prevStats.quizResults, newResult];
        return recalculateStats(prevStats.readingSessions, updatedQuizResults, prevStats.achievements);
      });

      // Check for quiz achievements
      checkQuizAchievements(newResult);

    } catch (error) {
      console.error('Error saving quiz result:', error);
    }
  };

  const updateReadingProgress = (bookId: string, pagesRead: number, timeSpent: number) => {
    setUserStats(prevStats => {
      const existingSessionIndex = prevStats.readingSessions.findIndex(s => s.bookId === bookId && !s.isCompleted);
      
      if (existingSessionIndex >= 0) {
        // Update existing session
        const updatedSessions = [...prevStats.readingSessions];
        updatedSessions[existingSessionIndex] = {
          ...updatedSessions[existingSessionIndex],
          pagesRead: Math.max(updatedSessions[existingSessionIndex].pagesRead, pagesRead),
          timeSpent: updatedSessions[existingSessionIndex].timeSpent + timeSpent,
          completedAt: new Date().toISOString(),
        };
        return recalculateStats(updatedSessions, prevStats.quizResults, prevStats.achievements);
      }
      
      return prevStats;
    });
  };

  const completeBook = async (bookId: string, bookTitle: string, bookType: ReadingSession['bookType'], totalPages: number, totalTimeSpent: number) => {
    console.log('🎉 BOOK COMPLETION TRIGGERED! 🎉');
    console.log('🔍 UserStatsContext - completeBook called with:', {
      bookId,
      bookTitle,
      bookType,
      totalPages,
      totalTimeSpent,
      currentUserId
    });

    // Create the new session object
    const newSession: ReadingSession = {
      bookId,
      bookTitle,
      bookType,
      pagesRead: totalPages,
      totalPages,
      timeSpent: totalTimeSpent,
      isCompleted: true,
      completedAt: new Date().toISOString(),
    };

    console.log('✨ UserStatsContext - Creating new session:', newSession);

    // Save to Supabase if user is authenticated
    if (currentUserId) {
      try {
        console.log('💾 UserStatsContext - Saving to Supabase with user ID:', currentUserId);
        const sessionData = {
          user_id: currentUserId,
          book_id: bookId,
          session_type: bookType,
          start_time: newSession.completedAt,
          duration_seconds: totalTimeSpent * 60, // Convert minutes to seconds
          pages_read: totalPages,
          current_page: totalPages,
          progress_percentage: 100, // Book is completed
          is_completed: true,
          metadata: {
            bookTitle: bookTitle,
            totalPages: totalPages
          }
        };
        
        console.log('📊 UserStatsContext - Session data to save:', sessionData);
        
        const { data, error } = await supabase.from('reading_sessions').insert(sessionData);

        if (error) {
          console.error('❌ UserStatsContext - Supabase error:', error);
          console.error('❌ UserStatsContext - Error details:', error.message, error.code, error.details);
        } else {
          console.log('✅ UserStatsContext - Successfully saved to Supabase:', data);
        }
      } catch (error) {
        console.error('❌ UserStatsContext - Error saving to Supabase:', error);
      }
    } else {
      console.log('⚠️ UserStatsContext - No user ID, saving locally only');
    }

    // Update local state
    setUserStats(prevStats => {
      const existingSessionIndex = prevStats.readingSessions.findIndex(s => s.bookId === bookId);
      
      let updatedSessions;
      if (existingSessionIndex >= 0) {
        // Update existing session to completed
        updatedSessions = [...prevStats.readingSessions];
        updatedSessions[existingSessionIndex] = {
          ...updatedSessions[existingSessionIndex],
          pagesRead: totalPages,
          timeSpent: totalTimeSpent,
          isCompleted: true,
          completedAt: new Date().toISOString(),
        };
        console.log('📝 UserStatsContext - Updated existing session:', updatedSessions[existingSessionIndex]);
      } else {
        // Create new completed session
        updatedSessions = [...prevStats.readingSessions, newSession];
        console.log('✨ UserStatsContext - Added new session to local state');
      }

      console.log('📊 UserStatsContext - All sessions after update:', updatedSessions.length, 'total sessions');
      
      // Save to localStorage as backup (user-specific key)
      try {
        const backupKey = `readingSessions_${currentUserId}`;
        localStorage.setItem(backupKey, JSON.stringify(updatedSessions));
        console.log('💾 UserStatsContext - Saved reading sessions to localStorage backup');
      } catch (error) {
        console.error('❌ UserStatsContext - Error saving to localStorage backup:', error);
      }
      
      return recalculateStats(updatedSessions, prevStats.quizResults, prevStats.achievements);
    });

    // Check for completion achievements
    checkCompletionAchievements(bookType);
  };

  const addAchievement = (achievement: Omit<Achievement, 'earnedAt'>) => {
    const newAchievement: Achievement = {
      ...achievement,
      earnedAt: new Date().toISOString(),
    };

    setUserStats(prevStats => {
      // Check if achievement already exists
      const exists = prevStats.achievements.some(a => a.id === newAchievement.id);
      if (exists) return prevStats;

      const updatedAchievements = [...prevStats.achievements, newAchievement];
      return recalculateStats(prevStats.readingSessions, prevStats.quizResults, updatedAchievements);
    });
  };

  const getBookProgress = (bookId: string) => {
    const session = userStats.readingSessions.find(s => s.bookId === bookId);
    return session ? { pagesRead: session.pagesRead, timeSpent: session.timeSpent } : null;
  };

  const resetStats = () => {
    setUserStats(defaultStats);
    localStorage.removeItem('userStats');
  };

  // Achievement checking functions
  const checkReadingAchievements = (session: ReadingSession) => {
    // First book completed
    if (session.isCompleted && userStats.totalBooksCompleted === 0) {
      addAchievement({
        id: 'first-book',
        title: 'First Book Complete!',
        description: 'Completed your very first book',
        badge: '📚',
        category: 'completion',
      });
    }

    // Speed reader (completed book in under 30 minutes)
    if (session.isCompleted && session.timeSpent < 30) {
      addAchievement({
        id: 'speed-reader',
        title: 'Speed Reader',
        description: 'Completed a book in under 30 minutes',
        badge: '⚡',
        category: 'time',
      });
    }

    // Page turner (read 100+ pages)
    if (userStats.totalPagesRead + session.pagesRead >= 100 && userStats.totalPagesRead < 100) {
      addAchievement({
        id: 'page-turner',
        title: 'Page Turner',
        description: 'Read 100 pages total',
        badge: '📖',
        category: 'reading',
      });
    }
  };

  const checkQuizAchievements = (result: QuizResult) => {
    // Perfect score
    if (result.score === result.totalQuestions) {
      addAchievement({
        id: 'perfect-score',
        title: 'Perfect Score!',
        description: 'Got 100% on a quiz',
        badge: '🏆',
        category: 'quiz',
      });
    }

    // Quiz master (10 quizzes completed)
    if (userStats.totalQuizzesTaken + 1 >= 10 && userStats.totalQuizzesTaken < 10) {
      addAchievement({
        id: 'quiz-master',
        title: 'Quiz Master',
        description: 'Completed 10 quizzes',
        badge: '🧠',
        category: 'quiz',
      });
    }
  };

  const checkCompletionAchievements = (bookType: ReadingSession['bookType']) => {
    const completedBooks = userStats.totalBooksCompleted + 1;

    // Milestone achievements
    if (completedBooks === 5) {
      addAchievement({
        id: 'bookworm',
        title: 'Bookworm',
        description: 'Completed 5 books',
        badge: '🐛',
        category: 'completion',
      });
    }

    if (completedBooks === 10) {
      addAchievement({
        id: 'reading-champion',
        title: 'Reading Champion',
        description: 'Completed 10 books',
        badge: '🏅',
        category: 'completion',
      });
    }

    // Book type specific achievements
    const typeCount = userStats.readingSessions.filter(s => s.bookType === bookType && s.isCompleted).length + 1;
    if (typeCount === 3) {
      const typeAchievements = {
        pdf: { title: 'PDF Pro', badge: '📄' },
        audiobook: { title: 'Audio Enthusiast', badge: '🎧' },
        video: { title: 'Video Viewer', badge: '📹' },
        readToMe: { title: 'Story Listener', badge: '👂' },
        voiceCoach: { title: 'Voice Master', badge: '🎤' },
      };

      const achievement = typeAchievements[bookType];
      if (achievement) {
        addAchievement({
          id: `${bookType}-specialist`,
          title: achievement.title,
          description: `Completed 3 ${bookType} books`,
          badge: achievement.badge,
          category: 'completion',
        });
      }
    }
  };

  const getProgressBySection = (section: string, timeframe: 'weekly' | 'monthly') => {
    console.log('🔍 DEBUG SESSION - getProgressBySection called with:', { section, timeframe });
    
    const cutoffDate = new Date();
    if (timeframe === 'weekly') {
      cutoffDate.setDate(cutoffDate.getDate() - 7);
    } else {
      cutoffDate.setMonth(cutoffDate.getMonth() - 1);
    }

    console.log('📅 DEBUG SESSION - Cutoff date:', cutoffDate);
    console.log('📚 DEBUG SESSION - Total reading sessions:', userStats.readingSessions.length);

    // Map section names to book types
    const sectionToBookType: { [key: string]: ReadingSession['bookType'][] } = {
      'Voice Coach': ['voiceCoach'],
      'Books': ['pdf'],
      'Video Books': ['video'],
      'Read to Me': ['readToMe'],
      'Audiobooks': ['audiobook'],
      'All': ['pdf', 'audiobook', 'video', 'readToMe', 'voiceCoach']
    };

    const bookTypes = sectionToBookType[section] || sectionToBookType['All'];
    console.log('📖 DEBUG SESSION - Book types for section "' + section + '":', bookTypes);

    // Filter sessions by section and timeframe
    const filteredSessions = userStats.readingSessions.filter(session => {
      const matchesBookType = bookTypes.includes(session.bookType);
      const withinTimeframe = new Date(session.completedAt) >= cutoffDate;
      console.log('📊 DEBUG SESSION - Session: "' + session.bookTitle + '" | Type: ' + session.bookType + ' | Matches: ' + matchesBookType + ' | Within timeframe: ' + withinTimeframe);
      return matchesBookType && withinTimeframe;
    });

    console.log('✅ DEBUG SESSION - Filtered sessions for "' + section + '":', filteredSessions.length);

    const filteredQuizzes = userStats.quizResults.filter(quiz => 
      new Date(quiz.completedAt) >= cutoffDate
    );

    const result = {
      booksCompleted: filteredSessions.filter(s => s.isCompleted).length,
      pagesRead: filteredSessions.reduce((sum, s) => sum + s.pagesRead, 0),
      timeSpent: filteredSessions.reduce((sum, s) => sum + s.timeSpent, 0),
      quizzesCompleted: filteredQuizzes.length,
    };

    console.log('📈 DEBUG SESSION - Final result for "' + section + '":', result);
    return result;
  };

  const contextValue: UserStatsContextType = {
    userStats,
    addReadingSession,
    addQuizResult,
    updateReadingProgress,
    completeBook,
    addAchievement,
    getBookProgress,
    getProgressBySection,
    resetStats,
  };

  return (
    <UserStatsContext.Provider value={contextValue}>
      {children}
    </UserStatsContext.Provider>
  );
};