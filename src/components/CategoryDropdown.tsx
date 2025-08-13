import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown, ChevronLeft, ChevronRight } from 'lucide-react';

interface CategoryDropdownProps {
  selectedCategory: string;
  onCategorySelect: (category: string) => void;
  isCompact?: boolean;
}

interface CategoryGroup {
  title: string;
  icon: string;
  color: string;
  categories: string[];
}

export default function CategoryDropdown({ selectedCategory, onCategorySelect, isCompact = false }: CategoryDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [scrollPositions, setScrollPositions] = useState<{ [key: string]: number }>({});
  const scrollRefs = useRef<{ [key: string]: HTMLDivElement | null }>({});

  const categoryGroups: CategoryGroup[] = [
    {
      title: "Animals & Nature",
      icon: "🦁",
      color: "from-brand-blue to-blue-600",
      categories: [
        "Animals & Their Habitats",
        "Backyard Animals", 
        "Baby Animals",
        "Sharks, Big Cats, Birds, Snakes, Bugs",
        "Cats, Dogs, Pets, Horses",
        "Dinosaurs, Fish",
        "Plants & Their Environments",
        "Weather, Spring, Winter"
      ]
    },
    {
      title: "Learning & Development",
      icon: "📚",
      color: "from-brand-yellow to-yellow-600",
      categories: [
        "Art, Music, Makerspace",
        "Bodies in Motion, Five Senses",
        "Healthy Habits",
        "Addition & Subtraction, Counting",
        "Measuring, Telling Time",
        "Learning to Read",
        "Shapes, Colors, Letters & Numbers"
      ]
    },
    {
      title: "People & Society",
      icon: "🏛️",
      color: "from-brand-pink to-pink-600",
      categories: [
        "Biography, History",
        "Black History Month, Women's History Month",
        "Native Americans",
        "Our Neighborhood",
        "Jobs Around Town",
        "Economics: Goods & Services",
        "American Symbols"
      ]
    },
    {
      title: "Fun & Fantasy",
      icon: "🦄",
      color: "from-brand-pink to-pink-700",
      categories: [
        "Adventure, Comic Books",
        "Fairy Tales, Princesses",
        "Unicorns, Mythical Creatures",
        "Superheroes",
        "Space",
        "Sports, Soccer"
      ]
    },
    {
      title: "Transportation",
      icon: "🚂",
      color: "from-brand-yellow to-yellow-700",
      categories: [
        "Airplanes",
        "Boats & Ships",
        "Cars & Trucks",
        "Cars, Trucks & Trains",
        "Trains"
      ]
    },
    {
      title: "Social-Emotional",
      icon: "💝",
      color: "from-brand-blue to-blue-700",
      categories: [
        "Bravery, Bullying",
        "Friendship, Kindness",
        "Families",
        "Grief & Loss",
        "Growth Mindset",
        "Identifying Emotions",
        "Mindfulness",
        "Laugh Out Loud"
      ]
    }
  ];

  const scroll = (groupTitle: string, direction: 'left' | 'right') => {
    const container = scrollRefs.current[groupTitle];
    if (!container) return;

    const scrollAmount = 200;
    const newPosition = direction === 'left' 
      ? Math.max(0, (scrollPositions[groupTitle] || 0) - scrollAmount)
      : (scrollPositions[groupTitle] || 0) + scrollAmount;

    container.scrollTo({
      left: newPosition,
      behavior: 'smooth'
    });

    setScrollPositions(prev => ({
      ...prev,
      [groupTitle]: newPosition
    }));
  };

  const handleCategoryClick = (category: string) => {
    onCategorySelect(category);
    setIsOpen(false);
  };

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      if (!target.closest('.category-dropdown')) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className="relative category-dropdown">
      {/* Dropdown Trigger */}
      {isCompact ? (
        <button
          onClick={() => setIsOpen(!isOpen)}
          className={`px-4 py-3 rounded-lg font-medium transition-all duration-300 flex items-center justify-between min-w-[300px] ${
            selectedCategory && selectedCategory !== 'All'
              ? 'bg-brand-pink text-white shadow-lg'
              : 'bg-white border border-blue-300 text-blue-700 hover:border-blue-400 hover:bg-blue-50'
          }`}
        >
          <span>
            {selectedCategory && selectedCategory !== 'All' 
              ? selectedCategory 
              : 'Select a Category'
            }
          </span>
          <ChevronDown 
            className={`w-5 h-5 transition-transform duration-300 ${
              isOpen ? 'rotate-180' : 'rotate-0'
            }`} 
          />
        </button>
      ) : (
        <button
          onClick={() => setIsOpen(!isOpen)}
          className={`px-4 py-2 rounded-lg font-medium transition-all duration-300 flex items-center space-x-2 ${
            selectedCategory === 'All'
              ? 'bg-brand-pink text-white shadow-lg'
              : 'bg-blue-100 text-blue-700 hover:bg-blue-200'
          }`}
        >
          <span>All</span>
          <ChevronDown 
            className={`w-4 h-4 transition-transform duration-300 ${
              isOpen ? 'rotate-180' : 'rotate-0'
            }`} 
          />
        </button>
      )}

      {/* Dropdown Menu */}
      {isOpen && (
        <div className={`absolute top-full left-0 mt-2 bg-white rounded-2xl shadow-2xl border border-blue-200 z-50 overflow-hidden ${
          isCompact ? 'w-[800px] max-w-[90vw]' : 'w-[800px] max-w-[90vw]'
        }`}>
          <div className="p-6 max-h-[70vh] overflow-y-auto">
            <h3 className="text-lg font-bold text-blue-800 mb-6 text-center">
              Choose a Category
            </h3>
            
            <div className="space-y-8">
              {categoryGroups.map((group) => (
                <div key={group.title} className="relative">
                  {/* Group Header */}
                  <div className={`bg-gradient-to-r ${group.color} rounded-xl p-4 mb-4`}>
                    <div className="flex items-center space-x-3">
                      <span className="text-2xl">{group.icon}</span>
                      <h4 className="text-lg font-bold text-white">{group.title}</h4>
                    </div>
                  </div>

                  {/* Scrollable Categories Container */}
                  <div className="relative">
                    {/* Left Arrow */}
                    <button
                      onClick={() => scroll(group.title, 'left')}
                      className="absolute left-0 top-1/2 transform -translate-y-1/2 z-10 w-8 h-8 bg-white rounded-full shadow-lg flex items-center justify-center hover:bg-blue-50 transition-colors border border-blue-200"
                      style={{ marginLeft: '-16px' }}
                    >
                      <ChevronLeft className="w-4 h-4 text-blue-600" />
                    </button>

                    {/* Right Arrow */}
                    <button
                      onClick={() => scroll(group.title, 'right')}
                      className="absolute right-0 top-1/2 transform -translate-y-1/2 z-10 w-8 h-8 bg-white rounded-full shadow-lg flex items-center justify-center hover:bg-blue-50 transition-colors border border-blue-200"
                      style={{ marginRight: '-16px' }}
                    >
                      <ChevronRight className="w-4 h-4 text-blue-600" />
                    </button>

                    {/* Categories Scroll Container */}
                    <div
                      ref={(el) => scrollRefs.current[group.title] = el}
                      className="flex space-x-3 overflow-x-auto scrollbar-hide py-2 px-4"
                      style={{ 
                        scrollbarWidth: 'none',
                        msOverflowStyle: 'none',
                        WebkitScrollbar: { display: 'none' }
                      }}
                      onScroll={(e) => {
                        const target = e.target as HTMLDivElement;
                        setScrollPositions(prev => ({
                          ...prev,
                          [group.title]: target.scrollLeft
                        }));
                      }}
                    >
                      {group.categories.map((category) => (
                        <button
                          key={category}
                          onClick={() => handleCategoryClick(category)}
                          className={`flex-shrink-0 px-4 py-3 rounded-xl font-medium transition-all duration-300 hover:scale-105 hover:shadow-md whitespace-nowrap ${
                            selectedCategory === category
                              ? `bg-gradient-to-r ${group.color} text-white shadow-lg`
                              : 'bg-blue-50 text-blue-700 hover:bg-blue-100 border border-blue-200'
                          }`}
                        >
                          {category}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Show All Categories Button */}
            <div className="mt-8 pt-6 border-t border-gray-200 text-center">
              <button
                onClick={() => handleCategoryClick('All')}
                className="px-8 py-3 bg-gradient-to-r from-brand-pink to-pink-700 text-white rounded-xl font-medium hover:from-pink-700 hover:to-pink-800 transition-all duration-300 hover:scale-105 shadow-lg"
              >
                Show All Categories
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}