import React from 'react';
import { Languages } from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';

interface LanguageSwitchProps {
  className?: string;
  showText?: boolean;
  size?: 'sm' | 'md' | 'lg';
  layout?: 'horizontal' | 'vertical';
}

export default function LanguageSwitch({ 
  className = '', 
  showText = true, 
  size = 'md',
  layout = 'horizontal'
}: LanguageSwitchProps) {
  const { language, setLanguage, t } = useLanguage();

  const toggleLanguage = () => {
    const newLanguage = language === 'en' ? 'zh' : 'en';
    setLanguage(newLanguage);
  };

  const sizeClasses = {
    sm: layout === 'vertical' ? 'px-1.5 py-1 text-xs' : 'px-2 py-1 text-xs',
    md: layout === 'vertical' ? 'px-2 py-1.5 text-xs' : 'px-3 py-2 text-sm',
    lg: layout === 'vertical' ? 'px-2.5 py-2 text-sm' : 'px-4 py-3 text-base'
  };

  const iconSizes = {
    sm: 'w-3 h-3',
    md: layout === 'vertical' ? 'w-3 h-3' : 'w-4 h-4',
    lg: 'w-5 h-5'
  };

  const currentLanguageText = language === 'en' ? '中文' : 'English';
  const currentLanguageFlag = language === 'en' ? '🇨🇳' : '🇺🇸';

  return (
    <button
      onClick={toggleLanguage}
      className={`
        flex ${layout === 'vertical' ? 'flex-col items-center space-y-0.5' : 'items-center space-x-2'}
        bg-white/90 hover:bg-white 
        border border-gray-200 hover:border-gray-300
        rounded-full transition-all duration-200
        focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500
        shadow-sm hover:shadow-md
        ${sizeClasses[size]}
        ${className}
      `}
      title={t('header.language.switch')}
      aria-label={t('header.language.switch')}
    >
      {/* Language Icon */}
      <Languages className={`${iconSizes[size]} text-gray-600`} />
      
      {/* Current Language Flag and Text */}
      {showText && layout === 'horizontal' && (
        <>
          <span className="text-lg leading-none">{currentLanguageFlag}</span>
          <span className="font-medium text-gray-700">
            {currentLanguageText}
          </span>
        </>
      )}
      
      {/* Vertical layout with stacked elements */}
      {showText && layout === 'vertical' && (
        <>
          <span className="text-sm leading-none">{currentLanguageFlag}</span>
          <span className="font-medium text-gray-700 text-xs leading-tight">
            {language === 'en' ? '中文' : 'EN'}
          </span>
        </>
      )}
      
      {/* Compact mode - just flag */}
      {!showText && (
        <span className="text-lg leading-none">{currentLanguageFlag}</span>
      )}
    </button>
  );
}

// Minimal version for tight spaces
export function LanguageSwitchCompact({ className = '' }: { className?: string }) {
  return (
    <LanguageSwitch 
      className={className}
      showText={false}
      size="sm"
    />
  );
}

// Mobile vertical version for header
export function LanguageSwitchMobile({ className = '' }: { className?: string }) {
  return (
    <LanguageSwitch 
      className={className}
      showText={true}
      size="sm"
      layout="vertical"
    />
  );
}

// Large version for settings pages
export function LanguageSwitchLarge({ className = '' }: { className?: string }) {
  return (
    <LanguageSwitch 
      className={className}
      showText={true}
      size="lg"
    />
  );
}