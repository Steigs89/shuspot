import React, { useState } from 'react';
import { Search, Bell, Settings, User, BookOpen, Star, Trophy, Menu, X } from 'lucide-react';

interface HeaderProps {
  userProfile: {
    name: string;
    avatar: string;
    level: number;
    streakDays: number;
  };
}

export default function Header({ userProfile }: HeaderProps) {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  return (
    <header className="bg-white shadow-sm border-b border-gray-100">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo */}
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 bg-gradient-to-r from-brand-pink to-pink-700 rounded-lg flex items-center justify-center">
              <BookOpen className="w-5 h-5 text-white" />
            </div>
            <span className="text-lg sm:text-xl font-bold text-gray-900">ReadQuest</span>
          </div>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex space-x-8">
            <a href="#" className="text-brand-pink font-medium">Dashboard</a>
            <a href="#" className="text-blue-600 hover:text-blue-800 transition-colors">Library</a>
            <a href="#" className="text-blue-600 hover:text-blue-800 transition-colors">Progress</a>
            <a href="#" className="text-blue-600 hover:text-blue-800 transition-colors">Achievements</a>
          </nav>

          {/* Desktop Search and User Actions */}
          <div className="hidden md:flex items-center space-x-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <input
                type="text"
                placeholder="Search books..."
                className="pl-10 pr-4 py-2 bg-blue-50 border border-blue-200 rounded-full focus:outline-none focus:ring-2 focus:ring-brand-pink focus:border-transparent w-48 lg:w-64"
              />
            </div>
            
            <button className="relative p-2 text-gray-400 hover:text-gray-500 transition-colors">
              <Bell className="w-5 h-5" />
              <span className="absolute -top-1 -right-1 w-3 h-3 bg-brand-pink rounded-full"></span>
            </button>
            
            <button className="p-2 text-gray-400 hover:text-gray-500 transition-colors">
              <Settings className="w-5 h-5" />
            </button>
            
            <div className="flex items-center space-x-3 pl-4 border-l border-gray-200">
              <div className="text-right hidden lg:block">
                <p className="text-sm font-medium text-gray-900">{userProfile.name}</p>
                <div className="flex items-center space-x-2 text-xs text-gray-500">
                  <div className="flex items-center space-x-1">
                    <Star className="w-3 h-3 fill-brand-yellow text-brand-yellow" />
                    <span>Level {userProfile.level}</span>
                  </div>
                  <div className="flex items-center space-x-1">
                    <Trophy className="w-3 h-3 text-brand-yellow" />
                    <span>{userProfile.streakDays} day streak</span>
                  </div>
                </div>
              </div>
              <div className="w-10 h-10 bg-gradient-to-r from-brand-pink to-pink-600 rounded-full flex items-center justify-center">
                <User className="w-5 h-5 text-white" />
              </div>
            </div>
          </div>

          {/* Mobile Menu Button and User Avatar */}
          <div className="flex md:hidden items-center space-x-3">
            <div className="w-8 h-8 bg-gradient-to-r from-brand-pink to-pink-600 rounded-full flex items-center justify-center">
              <User className="w-4 h-4 text-white" />
            </div>
            <button
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="p-2 text-gray-400 hover:text-gray-500 transition-colors"
            >
              {isMobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>

        {/* Mobile Menu */}
        {isMobileMenuOpen && (
          <div className="md:hidden border-t border-gray-200 bg-white">
            <div className="px-4 py-4 space-y-4">
              {/* Mobile Search */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <input
                  type="text"
                  placeholder="Search books..."
                  className="w-full pl-10 pr-4 py-3 bg-blue-50 border border-blue-200 rounded-full focus:outline-none focus:ring-2 focus:ring-brand-pink focus:border-transparent text-base"
                />
              </div>

              {/* Mobile Navigation */}
              <nav className="space-y-3">
                <a href="#" className="block text-brand-pink font-medium text-lg py-2">Dashboard</a>
                <a href="#" className="block text-blue-600 hover:text-blue-800 transition-colors text-lg py-2">Library</a>
                <a href="#" className="block text-blue-600 hover:text-blue-800 transition-colors text-lg py-2">Progress</a>
                <a href="#" className="block text-blue-600 hover:text-blue-800 transition-colors text-lg py-2">Achievements</a>
              </nav>

              {/* Mobile User Info */}
              <div className="border-t border-gray-200 pt-4">
                <div className="flex items-center space-x-3">
                  <div className="w-12 h-12 bg-gradient-to-r from-brand-pink to-pink-600 rounded-full flex items-center justify-center">
                    <User className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <p className="text-base font-medium text-gray-900">{userProfile.name}</p>
                    <div className="flex items-center space-x-3 text-sm text-gray-500">
                      <div className="flex items-center space-x-1">
                        <Star className="w-4 h-4 fill-brand-yellow text-brand-yellow" />
                        <span>Level {userProfile.level}</span>
                      </div>
                      <div className="flex items-center space-x-1">
                        <Trophy className="w-4 h-4 text-brand-yellow" />
                        <span>{userProfile.streakDays} day streak</span>
                      </div>
                    </div>
                  </div>
                </div>
                
                {/* Mobile Action Buttons */}
                <div className="flex items-center space-x-4 mt-4">
                  <button className="relative p-3 text-gray-400 hover:text-gray-500 transition-colors bg-gray-50 rounded-full">
                    <Bell className="w-5 h-5" />
                    <span className="absolute -top-1 -right-1 w-3 h-3 bg-brand-pink rounded-full"></span>
                  </button>
                  <button className="p-3 text-gray-400 hover:text-gray-500 transition-colors bg-gray-50 rounded-full">
                    <Settings className="w-5 h-5" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </header>
  );
}