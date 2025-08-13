import { BookOpen, Zap, Target, Crown, Siren as Fire, Heart, Rocket, Star, Trophy, Gift } from 'lucide-react';

export const userProfile = {
  name: "Emma Johnson",
  avatar: "https://images.pexels.com/photos/1181519/pexels-photo-1181519.jpeg?auto=compress&cs=tinysrgb&w=100&h=100&dpr=1",
  level: 12,
  streakDays: 7,
  totalBooksRead: 45,
  totalMinutesRead: 1240,
  currentGoal: 50,
  weeklyGoal: 5
};

export const featuredBooks = [
  {
    id: '1',
    title: 'The Magic Forest Adventure',
    author: 'Sarah Mitchell',
    cover: 'https://images.pexels.com/photos/1148399/pexels-photo-1148399.jpeg?auto=compress&cs=tinysrgb&w=400&h=600&dpr=1',
    readingTime: 15,
    rating: 4.8,
    category: 'Fantasy',
    isNew: true,
    progress: 65
  },
  {
    id: '2',
    title: 'Space Explorers',
    author: 'Mike Chen',
    cover: 'https://images.pexels.com/photos/1181271/pexels-photo-1181271.jpeg?auto=compress&cs=tinysrgb&w=400&h=600&dpr=1',
    readingTime: 12,
    rating: 4.9,
    category: 'Science Fiction',
    progress: 30
  },
  {
    id: '3',
    title: 'Ocean Mysteries',
    author: 'Lisa Waters',
    cover: 'https://images.pexels.com/photos/1181345/pexels-photo-1181345.jpeg?auto=compress&cs=tinysrgb&w=400&h=600&dpr=1',
    readingTime: 18,
    rating: 4.7,
    category: 'Adventure',
    progress: 85
  }
];

export const recommendedBooks = [
  {
    id: '4',
    title: 'Dinosaur Discovery',
    author: 'Tom Rex',
    cover: 'https://images.pexels.com/photos/1181354/pexels-photo-1181354.jpeg?auto=compress&cs=tinysrgb&w=400&h=600&dpr=1',
    readingTime: 10,
    rating: 4.6,
    category: 'Educational'
  },
  {
    id: '5',
    title: 'Princess Adventures',
    author: 'Emma Royal',
    cover: 'https://images.pexels.com/photos/1181276/pexels-photo-1181276.jpeg?auto=compress&cs=tinysrgb&w=400&h=600&dpr=1',
    readingTime: 14,
    rating: 4.8,
    category: 'Fantasy'
  },
  {
    id: '6',
    title: 'Animal Friends',
    author: 'Jake Wilson',
    cover: 'https://images.pexels.com/photos/1181394/pexels-photo-1181394.jpeg?auto=compress&cs=tinysrgb&w=400&h=600&dpr=1',
    readingTime: 8,
    rating: 4.5,
    category: 'Animals'
  },
  {
    id: '7',
    title: 'Robot Adventures',
    author: 'Alex Tech',
    cover: 'https://images.pexels.com/photos/1181562/pexels-photo-1181562.jpeg?auto=compress&cs=tinysrgb&w=400&h=600&dpr=1',
    readingTime: 16,
    rating: 4.7,
    category: 'Science Fiction'
  },
  {
    id: '8',
    title: 'Magical Creatures',
    author: 'Luna Bright',
    cover: 'https://images.pexels.com/photos/1181304/pexels-photo-1181304.jpeg?auto=compress&cs=tinysrgb&w=400&h=600&dpr=1',
    readingTime: 20,
    rating: 4.9,
    category: 'Fantasy'
  }
];

const categories = [
  {
    id: '1',
    name: 'Fantasy',
    icon: Star,
    bookCount: 156,
    color: 'bg-gradient-to-r from-purple-500 to-pink-500',
    description: 'Magical worlds and adventures'
  },
  {
    id: '2',
    name: 'Science Fiction',
    icon: Rocket,
    bookCount: 89,
    color: 'bg-gradient-to-r from-blue-500 to-cyan-500',
    description: 'Future worlds and technology'
  },
  {
    id: '3',
    name: 'Adventure',
    icon: Target,
    bookCount: 124,
    color: 'bg-gradient-to-r from-green-500 to-teal-500',
    description: 'Exciting journeys and quests'
  },
  {
    id: '4',
    name: 'Educational',
    icon: BookOpen,
    bookCount: 78,
    color: 'bg-gradient-to-r from-orange-500 to-red-500',
    description: 'Learn while you read'
  }
];

const achievements = [
  {
    id: '1',
    name: 'Reading Streak',
    description: 'Read for 7 days in a row',
    icon: Fire,
    earned: true
  },
  {
    id: '2',
    name: 'Book Lover',
    description: 'Read 50 books',
    icon: Heart,
    earned: false,
    progress: 45,
    total: 50
  },
  {
    id: '3',
    name: 'Speed Reader',
    description: 'Read 5 books in a week',
    icon: Zap,
    earned: true
  },
  {
    id: '4',
    name: 'Explorer',
    description: 'Read books from 5 different genres',
    icon: Crown,
    earned: false,
    progress: 3,
    total: 5
  }
];