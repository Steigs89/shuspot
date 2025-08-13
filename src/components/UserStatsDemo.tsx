import { useUserStats } from '../contexts/UserStatsContext';

export default function UserStatsDemo() {
  const {
    userStats,
    addReadingSession,
    addQuizResult,
    completeBook,
    addAchievement,
    resetStats
  } = useUserStats();

  const handleAddSampleReadingSession = () => {
    addReadingSession({
      bookId: 'demo-book-1',
      bookTitle: 'Sample Adventure Book',
      bookType: 'pdf',
      pagesRead: 25,
      totalPages: 50,
      timeSpent: 15,
      isCompleted: false
    });
  };

  const handleCompleteBook = () => {
    completeBook('demo-book-1', 'Sample Adventure Book', 'pdf', 50, 30);
  };

  const handleAddQuizResult = () => {
    addQuizResult({
      bookId: 'demo-book-1',
      bookTitle: 'Sample Adventure Book',
      score: 8,
      totalQuestions: 10,
      passed: true,
      badge: 'Reading Champion',
      timeSpent: 5
    });
  };

  const handleAddAchievement = () => {
    addAchievement({
      id: 'demo-achievement',
      title: 'Demo Achievement',
      description: 'This is a demo achievement',
      badge: '🏆',
      category: 'completion'
    });
  };

  return (
    <div className="p-6 bg-white rounded-lg shadow-lg max-w-4xl mx-auto">
      <h2 className="text-2xl font-bold mb-6">User Stats Demo</h2>

      {/* Current Stats Display */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-blue-50 p-4 rounded-lg">
          <div className="text-2xl font-bold text-blue-600">{userStats.totalBooksCompleted}</div>
          <div className="text-sm text-gray-600">Books Completed</div>
        </div>
        <div className="bg-green-50 p-4 rounded-lg">
          <div className="text-2xl font-bold text-green-600">{userStats.totalPagesRead}</div>
          <div className="text-sm text-gray-600">Pages Read</div>
        </div>
        <div className="bg-purple-50 p-4 rounded-lg">
          <div className="text-2xl font-bold text-purple-600">{Math.floor(userStats.totalReadingTimeMinutes / 60)}h {userStats.totalReadingTimeMinutes % 60}m</div>
          <div className="text-sm text-gray-600">Reading Time</div>
        </div>
        <div className="bg-orange-50 p-4 rounded-lg">
          <div className="text-2xl font-bold text-orange-600">{userStats.averageQuizScore}%</div>
          <div className="text-sm text-gray-600">Quiz Average</div>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex flex-wrap gap-3 mb-6">
        <button
          onClick={handleAddSampleReadingSession}
          className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
        >
          Add Reading Session
        </button>
        <button
          onClick={handleCompleteBook}
          className="px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors"
        >
          Complete Book
        </button>
        <button
          onClick={handleAddQuizResult}
          className="px-4 py-2 bg-purple-500 text-white rounded-lg hover:bg-purple-600 transition-colors"
        >
          Add Quiz Result
        </button>
        <button
          onClick={handleAddAchievement}
          className="px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors"
        >
          Add Achievement
        </button>
        <button
          onClick={resetStats}
          className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors"
        >
          Reset Stats
        </button>
      </div>

      {/* Recent Activities */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <h3 className="text-lg font-semibold mb-3">Recent Reading Sessions</h3>
          <div className="space-y-2 max-h-40 overflow-y-auto">
            {userStats.readingSessions.slice(-5).map((session, index) => (
              <div key={index} className="bg-gray-50 p-3 rounded-lg text-sm">
                <div className="font-medium">{session.bookTitle}</div>
                <div className="text-gray-600">
                  {session.pagesRead}/{session.totalPages} pages • {session.timeSpent}min
                  {session.isCompleted && <span className="text-green-600 ml-2">✓ Completed</span>}
                </div>
              </div>
            ))}
          </div>
        </div>

        <div>
          <h3 className="text-lg font-semibold mb-3">Recent Quiz Results</h3>
          <div className="space-y-2 max-h-40 overflow-y-auto">
            {userStats.quizResults.slice(-5).map((quiz, index) => (
              <div key={index} className="bg-gray-50 p-3 rounded-lg text-sm">
                <div className="font-medium">{quiz.bookTitle}</div>
                <div className="text-gray-600">
                  Score: {quiz.score}/{quiz.totalQuestions}
                  <span className={`ml-2 ${quiz.passed ? 'text-green-600' : 'text-red-600'}`}>
                    {quiz.passed ? '✓ Passed' : '✗ Failed'}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Achievements */}
      {userStats.achievements.length > 0 && (
        <div className="mt-6">
          <h3 className="text-lg font-semibold mb-3">Achievements</h3>
          <div className="flex flex-wrap gap-2">
            {userStats.achievements.map((achievement) => (
              <div key={achievement.id} className="bg-yellow-50 border border-yellow-200 rounded-lg p-2 text-sm">
                <span className="text-lg mr-2">{achievement.badge}</span>
                <span className="font-medium">{achievement.title}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}