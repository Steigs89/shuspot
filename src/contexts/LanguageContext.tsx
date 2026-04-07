import { createContext, useContext, useState, useEffect, ReactNode } from 'react';

export type Language = 'en' | 'zh';

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: string, fallback?: string) => string;
  translateGenre: (genreName: string) => string;
  translateReadingLevel: (level: string) => string;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

// Translation dictionary for common UI elements
const translations: Record<string, Record<Language, string>> = {
  // Header and Navigation
  'header.search.placeholder': {
    en: 'Search books, authors, genres...',
    zh: '搜索书籍、作者、类型...'
  },
  'header.search.mobile.placeholder': {
    en: 'Search books...',
    zh: '搜索书籍...'
  },
  'header.hello': {
    en: 'Hello',
    zh: '你好'
  },
  'header.user.profile': {
    en: 'User profile',
    zh: '用户资料'
  },
  'header.language.switch': {
    en: 'Switch to Chinese',
    zh: '切换到英文'
  },
  'header.language.current.en': {
    en: 'English',
    zh: '英文'
  },
  'header.language.current.zh': {
    en: 'Chinese',
    zh: '中文'
  },

  // Common Actions
  'common.back': {
    en: 'Back',
    zh: '返回'
  },
  'common.close': {
    en: 'Close',
    zh: '关闭'
  },
  'common.save': {
    en: 'Save',
    zh: '保存'
  },
  'common.cancel': {
    en: 'Cancel',
    zh: '取消'
  },
  'common.continue': {
    en: 'Continue',
    zh: '继续'
  },
  'common.loading': {
    en: 'Loading...',
    zh: '加载中...'
  },
  'common.error': {
    en: 'Error',
    zh: '错误'
  },
  'common.retry': {
    en: 'Retry',
    zh: '重试'
  },
  'common.try.again': {
    en: 'Try Again',
    zh: '重试'
  },
  'common.new': {
    en: 'New',
    zh: '新'
  },
  'common.all': {
    en: 'All',
    zh: '全部'
  },

  // Library and Books
  'library.title': {
    en: 'Library',
    zh: '图书馆'
  },
  'library.books': {
    en: 'Books',
    zh: '书籍'
  },
  'library.videos': {
    en: 'Videos',
    zh: '视频'
  },
  'library.stories': {
    en: 'Stories',
    zh: '故事'
  },
  'library.favorites': {
    en: 'Favorites',
    zh: '收藏'
  },
  'library.recent': {
    en: 'Recent',
    zh: '最近'
  },
  'library.continue.reading': {
    en: 'Continue Reading',
    zh: '继续阅读'
  },
  'library.reading.level': {
    en: 'Reading Level',
    zh: '阅读水平'
  },
  'library.loading.books': {
    en: 'Loading books...',
    zh: '加载书籍中...'
  },
  'library.failed.load.books': {
    en: 'Failed to load books',
    zh: '加载书籍失败'
  },
  'library.no.books.found': {
    en: 'No books found',
    zh: '未找到书籍'
  },
  'library.adjust.filters': {
    en: 'Try adjusting your filters or check back later for new books.',
    zh: '尝试调整筛选条件或稍后查看新书籍。'
  },
  'library.view.all.genres': {
    en: 'View all genres',
    zh: '查看所有类型'
  },
  'library.scroll.more': {
    en: 'Scroll for more...',
    zh: '滚动查看更多...'
  },
  'library.end.of.list': {
    en: "You've reached the end of the list",
    zh: '已到达列表末尾'
  },

  // Navigation Tiers
  'navigation.grade.level': {
    en: 'Select Grade Level',
    zh: '选择年级水平'
  },
  'navigation.media.type': {
    en: 'Media Type',
    zh: '媒体类型'
  },
  'navigation.genre': {
    en: 'Genre',
    zh: '类型'
  },
  'navigation.select.genre': {
    en: 'Select Genre',
    zh: '选择类型'
  },
  'navigation.all.genres': {
    en: 'All Genres',
    zh: '所有类型'
  },
  'navigation.change.reading.system': {
    en: 'Change Reading System',
    zh: '更改阅读系统'
  },

  // Media Types
  'media.all.books': {
    en: 'All Books',
    zh: '所有书籍'
  },
  'media.video.books': {
    en: 'Video Books',
    zh: '视频书籍'
  },
  'media.voice.coach': {
    en: 'Voice Coach',
    zh: '语音教练'
  },
  'media.audiobooks': {
    en: 'Audiobooks',
    zh: '有声书'
  },
  'media.books': {
    en: 'Books',
    zh: '书籍'
  },
  'media.read.to.me': {
    en: 'Read to Me',
    zh: '为我朗读'
  },
  'media.videos': {
    en: 'Videos',
    zh: '视频'
  },
  'media.comics': {
    en: 'Comics',
    zh: '漫画'
  },
  'media.ai.voice': {
    en: 'AI Voice',
    zh: 'AI语音'
  },
  'media.coach': {
    en: 'Coach',
    zh: '教练'
  },
  'media.downloads': {
    en: 'Downloads',
    zh: '下载'
  },

  // Continue Reading Section
  'continue.reading.title': {
    en: 'Continue Reading',
    zh: '继续阅读'
  },
  'continue.reading.book': {
    en: 'book',
    zh: '本书'
  },
  'continue.reading.books': {
    en: 'books',
    zh: '本书'
  },
  'continue.reading.ago.minutes': {
    en: 'm ago',
    zh: '分钟前'
  },
  'continue.reading.ago.hours': {
    en: 'h ago',
    zh: '小时前'
  },
  'continue.reading.ago.days': {
    en: 'd ago',
    zh: '天前'
  },
  'continue.reading.yesterday': {
    en: 'Yesterday',
    zh: '昨天'
  },
  'continue.reading.min.read': {
    en: 'min read',
    zh: '分钟阅读'
  },

  // Reading Interface
  'reading.page': {
    en: 'Page',
    zh: '页'
  },
  'reading.of': {
    en: 'of',
    zh: '共'
  },
  'reading.progress': {
    en: 'Progress',
    zh: '进度'
  },
  'reading.goal.timer': {
    en: 'Reading Goal',
    zh: '阅读目标'
  },
  'reading.goal.completed': {
    en: 'Goal Completed!',
    zh: '目标完成！'
  },
  'reading.goal.earned.star': {
    en: 'You earned a ⭐ for reading today!',
    zh: '你今天阅读获得了一颗⭐！'
  },
  'reading.minutes.today': {
    en: 'minutes today!',
    zh: '今日分钟！'
  },
  'reading.streak': {
    en: 'day streak!',
    zh: '天连续！'
  },

  // OCR and Translation
  'ocr.scanning': {
    en: 'Scanning page text...',
    zh: '扫描页面文字...'
  },
  'ocr.no.text': {
    en: 'No readable text found',
    zh: '未找到可读文字'
  },
  'ocr.retry': {
    en: 'Click here to retry scan',
    zh: '点击重新扫描'
  },
  'ocr.words': {
    en: 'words',
    zh: '个词'
  },
  'ocr.click.translate': {
    en: 'Click to translate',
    zh: '点击翻译'
  },
  'ocr.loading.definition': {
    en: 'Loading definition...',
    zh: '加载释义中...'
  },
  'ocr.no.definition': {
    en: 'No definition available',
    zh: '无可用释义'
  },
  'ocr.chinese.translation': {
    en: 'Chinese Translation:',
    zh: '中文翻译：'
  },
  'ocr.recognition.confidence': {
    en: 'Recognition confidence',
    zh: '识别置信度'
  },

  // User Profile
  'profile.progress': {
    en: 'Progress',
    zh: '进度'
  },
  'profile.activity': {
    en: 'Activity',
    zh: '活动'
  },
  'profile.favourites': {
    en: 'Favourites',
    zh: '收藏'
  },
  'profile.account': {
    en: 'My Account',
    zh: '我的账户'
  },
  'profile.weekly': {
    en: 'Weekly',
    zh: '每周'
  },
  'profile.monthly': {
    en: 'Monthly',
    zh: '每月'
  },
  'profile.library': {
    en: 'Library',
    zh: '图书馆'
  },
  'profile.school': {
    en: 'School',
    zh: '学校'
  },
  'profile.select.section': {
    en: 'Select Section to View Progress',
    zh: '选择要查看进度的部分'
  },
  'profile.currently.viewing': {
    en: 'Currently viewing:',
    zh: '当前查看：'
  },
  'profile.progress.text': {
    en: 'progress',
    zh: '进度'
  },
  'profile.completed.books': {
    en: 'Completed Books',
    zh: '已完成书籍'
  },
  'profile.hours.spent': {
    en: 'Hours Spent',
    zh: '花费时间'
  },
  'profile.pages.read': {
    en: 'Pages Read',
    zh: '已读页数'
  },
  'profile.quiz.results': {
    en: 'Quiz Results',
    zh: '测验结果'
  },
  'profile.time.spent': {
    en: 'Time Spent',
    zh: '花费时间'
  },
  'profile.watch.time': {
    en: 'Watch time',
    zh: '观看时间'
  },
  'profile.correct': {
    en: 'Correct',
    zh: '正确'
  },
  'profile.yes': {
    en: 'Yes',
    zh: '是'
  },
  'profile.no': {
    en: 'No',
    zh: '否'
  },

  // Settings and Admin
  'admin.panel': {
    en: 'Admin Panel',
    zh: '管理面板'
  },
  'admin.upload': {
    en: 'Upload',
    zh: '上传'
  },
  'admin.manage': {
    en: 'Manage',
    zh: '管理'
  },
  'settings.title': {
    en: 'Settings',
    zh: '设置'
  },
  'settings.language': {
    en: 'Language',
    zh: '语言'
  },
  'settings.notifications': {
    en: 'Notifications',
    zh: '通知'
  },

  // Time and Dates
  'time.today': {
    en: 'Today',
    zh: '今天'
  },
  'time.yesterday': {
    en: 'Yesterday',
    zh: '昨天'
  },
  'time.this.week': {
    en: 'This Week',
    zh: '本周'
  },
  'time.this.month': {
    en: 'This Month',
    zh: '本月'
  },

  // Grades and Levels
  'grade.label': {
    en: 'Grade',
    zh: '年级'
  },
  'grade.K': {
    en: 'Kindergarten',
    zh: '幼儿园'
  },
  'grade.k': {
    en: 'Kindergarten',
    zh: '幼儿园'
  },
  'grade.kindergarten': {
    en: 'Kindergarten',
    zh: '幼儿园'
  },
  'grade.1': {
    en: 'Grade 1',
    zh: '一年级'
  },
  'grade.2': {
    en: 'Grade 2',
    zh: '二年级'
  },
  'grade.3': {
    en: 'Grade 3',
    zh: '三年级'
  },
  'grade.4': {
    en: 'Grade 4',
    zh: '四年级'
  },
  'grade.5': {
    en: 'Grade 5',
    zh: '五年级'
  },
  'grade.6': {
    en: 'Grade 6',
    zh: '六年级'
  },

  // Content Types and Genres
  'content.fiction': {
    en: 'Fiction',
    zh: '小说'
  },
  'content.non.fiction': {
    en: 'Non-Fiction',
    zh: '非小说'
  },
  'content.science': {
    en: 'Science',
    zh: '科学'
  },
  'content.math': {
    en: 'Math',
    zh: '数学'
  },
  'content.history': {
    en: 'History',
    zh: '历史'
  },
  'content.adventure': {
    en: 'Adventure',
    zh: '冒险'
  },
  'content.fantasy': {
    en: 'Fantasy',
    zh: '奇幻'
  },
  'content.mystery': {
    en: 'Mystery',
    zh: '悬疑'
  },
  'content.animals': {
    en: 'Animals',
    zh: '动物'
  },
  'content.nature': {
    en: 'Nature',
    zh: '自然'
  },
  'content.friendship': {
    en: 'Friendship',
    zh: '友谊'
  },
  'content.family': {
    en: 'Family',
    zh: '家庭'
  },

  // Reading Modes
  'mode.read.to.me': {
    en: 'Read to Me',
    zh: '为我朗读'
  },
  'mode.read.myself': {
    en: 'Read Myself',
    zh: '自己阅读'
  },
  'mode.interactive': {
    en: 'Interactive',
    zh: '互动'
  },
  'mode.practice': {
    en: 'Practice',
    zh: '练习'
  },

  // Status Messages
  'status.completed': {
    en: 'Completed',
    zh: '已完成'
  },
  'status.in.progress': {
    en: 'In Progress',
    zh: '进行中'
  },
  'status.not.started': {
    en: 'Not Started',
    zh: '未开始'
  },
  'status.offline': {
    en: 'Offline',
    zh: '离线'
  },
  'status.online': {
    en: 'Online',
    zh: '在线'
  },

  // Buttons and Actions
  'button.read.now': {
    en: 'Read Now',
    zh: '立即阅读'
  },
  'button.continue.reading': {
    en: 'Continue Reading',
    zh: '继续阅读'
  },
  'button.start.reading': {
    en: 'Start Reading',
    zh: '开始阅读'
  },
  'button.add.to.favorites': {
    en: 'Add to Favorites',
    zh: '添加到收藏'
  },
  'button.remove.from.favorites': {
    en: 'Remove from Favorites',
    zh: '从收藏中移除'
  },
  'button.share': {
    en: 'Share',
    zh: '分享'
  },
  'button.download': {
    en: 'Download',
    zh: '下载'
  },
  'button.watch': {
    en: 'Watch',
    zh: '观看'
  },

  // Content Status
  'content.featured': {
    en: 'FEATURED',
    zh: '精选'
  },
  'content.by': {
    en: 'by',
    zh: '作者：'
  },

  // Accessibility
  'aria.scroll.left': {
    en: 'Scroll left',
    zh: '向左滚动'
  },
  'aria.scroll.right': {
    en: 'Scroll right',
    zh: '向右滚动'
  },
  'aria.previous.book': {
    en: 'Previous book',
    zh: '上一本书'
  },
  'aria.next.book': {
    en: 'Next book',
    zh: '下一本书'
  },
  'aria.go.to.homepage': {
    en: 'Go to homepage',
    zh: '回到首页'
  },
  'aria.open.menu': {
    en: 'Open menu',
    zh: '打开菜单'
  },
  'aria.close.menu': {
    en: 'Close menu',
    zh: '关闭菜单'
  },
  'aria.go.to.slide': {
    en: 'Go to slide',
    zh: '转到幻灯片'
  },
  'content.all.ages': {
    en: 'All Ages',
    zh: '所有年龄'
  },

  // Modal Content
  'modal.reading.system.description': {
    en: 'Choose how you want books to be leveled:',
    zh: '选择您希望如何对书籍进行分级：'
  },
  'modal.fiction.type': {
    en: 'Fiction Type',
    zh: '小说类型'
  },
  'modal.welcome.title': {
    en: 'Welcome to ShuSpot!',
    zh: '欢迎来到ShuSpot！'
  },
  'modal.welcome.subtitle': {
    en: "Let's personalize your reading experience to help you find the perfect books.",
    zh: '让我们个性化您的阅读体验，帮助您找到完美的书籍。'
  },
  'modal.welcome.personalized.title': {
    en: 'Personalized Books',
    zh: '个性化书籍'
  },
  'modal.welcome.personalized.description': {
    en: 'Books matched to your reading level',
    zh: '匹配您阅读水平的书籍'
  },
  'modal.welcome.progress.title': {
    en: 'Track Progress',
    zh: '跟踪进度'
  },
  'modal.welcome.progress.description': {
    en: "See how much you've read and learned",
    zh: '查看您已阅读和学习的内容'
  },
  'modal.welcome.discover.title': {
    en: 'Discover New Stories',
    zh: '发现新故事'
  },
  'modal.welcome.discover.description': {
    en: 'Explore thousands of amazing books',
    zh: '探索数千本精彩书籍'
  },
  'modal.welcome.get.started': {
    en: "Let's Get Started!",
    zh: '让我们开始吧！'
  },
  'modal.reading.system.title': {
    en: 'Choose Your Reading System',
    zh: '选择您的阅读系统'
  },
  'modal.reading.system.subtitle': {
    en: "This helps us show you books at the right level. Don't worry, you can change this later!",
    zh: '这有助于我们为您显示合适水平的书籍。别担心，您稍后可以更改！'
  },
  'modal.reading.system.grade.description': {
    en: 'Perfect for: Students following standard grade levels (K-6)',
    zh: '适合：遵循标准年级水平的学生（K-6）'
  },
  'modal.reading.system.raz.description': {
    en: 'Perfect for: Guided reading programs and detailed leveling',
    zh: '适合：指导阅读计划和详细分级'
  },
  'modal.reading.system.lexile.description': {
    en: 'Perfect for: Precise reading ability measurement',
    zh: '适合：精确的阅读能力测量'
  },
  'modal.reading.system.start.reading': {
    en: 'Start Reading!',
    zh: '开始阅读！'
  },

  // Parental Controls Modal
  'modal.parental.title': {
    en: 'Parental Controls',
    zh: '家长控制'
  },
  'modal.parental.pin.subtitle': {
    en: 'Enter PIN to access settings',
    zh: '输入PIN码访问设置'
  },
  'modal.parental.pin.label': {
    en: 'Enter PIN',
    zh: '输入PIN码'
  },
  'modal.parental.pin.error': {
    en: 'Incorrect PIN. Try again.',
    zh: 'PIN码错误。请重试。'
  },
  'modal.parental.access.settings': {
    en: 'Access Settings',
    zh: '访问设置'
  },

  // Library Content
  'library.filtered.books': {
    en: 'Filtered Books',
    zh: '筛选书籍'
  },
  'library.featured.books': {
    en: 'Featured Books',
    zh: '精选书籍'
  },

  // Book Metadata
  'book.author': {
    en: 'Author',
    zh: '作者'
  },
  'book.by': {
    en: 'by',
    zh: '作者：'
  },
  'book.unknown.author': {
    en: 'Unknown Author',
    zh: '未知作者'
  },
  'book.imported.from': {
    en: 'Imported from',
    zh: '导入自'
  },
  'book.elementary': {
    en: 'Elementary',
    zh: '小学'
  },
  'book.loading': {
    en: 'Loading book...',
    zh: '加载书籍中...'
  },
  'book.not.found': {
    en: 'Book not found',
    zh: '未找到书籍'
  },

  // Genre Names - Animals & Nature
  'genre.animals.habitats': {
    en: 'Animals & Their Habitats',
    zh: '动物及其栖息地'
  },
  'genre.backyard.animals': {
    en: 'Backyard Animals',
    zh: '后院动物'
  },
  'genre.baby.animals': {
    en: 'Baby Animals',
    zh: '幼崽动物'
  },
  'genre.sharks.big.cats': {
    en: 'Sharks, Big Cats, Birds, Snakes, Bugs',
    zh: '鲨鱼、大型猫科动物、鸟类、蛇类、昆虫'
  },
  'genre.cats.dogs.pets': {
    en: 'Cats, Dogs, Pets',
    zh: '猫、狗、宠物'
  },
  'genre.dinosaurs.fish': {
    en: 'Dinosaurs, Fish',
    zh: '恐龙、鱼类'
  },
  'genre.plants.environments': {
    en: 'Plants & Their Environments',
    zh: '植物及其环境'
  },

  // More Genre Names
  'genre.adventure': {
    en: 'Adventure',
    zh: '冒险'
  },
  'genre.fantasy': {
    en: 'Fantasy',
    zh: '奇幻'
  },
  'genre.mystery': {
    en: 'Mystery',
    zh: '悬疑'
  },
  'genre.science': {
    en: 'Science',
    zh: '科学'
  },
  'genre.friendship': {
    en: 'Friendship',
    zh: '友谊'
  },
  'genre.family': {
    en: 'Family',
    zh: '家庭'
  },
  'genre.nature': {
    en: 'Nature',
    zh: '自然'
  },
  'genre.animals': {
    en: 'Animals',
    zh: '动物'
  },

  // Common Genre Categories
  'genre.all.types': {
    en: 'All Types',
    zh: '所有类型'
  },
  'genre.new.releases': {
    en: 'New Releases',
    zh: '新发布'
  },
  'genre.popular': {
    en: 'Popular',
    zh: '热门'
  },

  // Book Info Labels
  'book.info.title': {
    en: 'BOOK INFO',
    zh: '书籍信息'
  },
  'book.info.reading.level': {
    en: 'Reading Level:',
    zh: '阅读水平：'
  },
  'book.info.genre': {
    en: 'Genre:',
    zh: '类型：'
  },
  'book.info.pages': {
    en: 'Pages:',
    zh: '页数：'
  },
  'level.beginner': {
    en: 'Beginner',
    zh: '初学者'
  },
  'level.intermediate': {
    en: 'Intermediate',
    zh: '中级'
  },
  'level.advanced': {
    en: 'Advanced',
    zh: '高级'
  }
};

interface LanguageProviderProps {
  children: ReactNode;
}

export function LanguageProvider({ children }: LanguageProviderProps) {
  // Initialize language from localStorage or default to English
  const [language, setLanguageState] = useState<Language>(() => {
    const saved = localStorage.getItem('shuspot-language');
    return (saved === 'zh' || saved === 'en') ? saved : 'en';
  });

  // Save language preference to localStorage
  useEffect(() => {
    localStorage.setItem('shuspot-language', language);
    console.log('🌐 Language changed to:', language);
  }, [language]);

  const setLanguage = (lang: Language) => {
    setLanguageState(lang);
  };

  // Translation function
  const t = (key: string, fallback?: string): string => {
    const translation = translations[key];
    if (translation && translation[language]) {
      return translation[language];
    }
    
    // If no translation found, return fallback or key
    if (fallback) {
      return fallback;
    }
    
    // For development, show missing translation keys
    console.warn(`🌐 Missing translation for key: ${key} (language: ${language})`);
    return key;
  };

  // Helper function to translate genre names
  const translateGenre = (genreName: string): string => {
    // Convert genre name to translation key
    const key = `genre.${genreName.toLowerCase()
      .replace(/[&,]/g, '')
      .replace(/\s+/g, '.')
      .replace(/[^a-z.]/g, '')}`;
    
    return t(key, genreName);
  };

  // Helper function to translate reading levels
  const translateReadingLevel = (level: string): string => {
    // Convert reading level to translation key
    const key = `level.${level.toLowerCase().replace(/\s+/g, '.')}`;
    return t(key, level);
  };

  const value: LanguageContextType = {
    language,
    setLanguage,
    t,
    translateGenre,
    translateReadingLevel
  };

  return (
    <LanguageContext.Provider value={value}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage(): LanguageContextType {
  const context = useContext(LanguageContext);
  if (context === undefined) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
}

// Helper hook for just the translation function
export function useTranslation() {
  const { t, translateGenre, translateReadingLevel } = useLanguage();
  return { t, translateGenre, translateReadingLevel };
}