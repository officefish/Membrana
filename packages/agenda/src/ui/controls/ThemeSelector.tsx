import React, { useState } from 'react';
import { useTheme } from '../../core/provider';

// Доступные темы. Должны совпадать со списком в tailwind.config.js клиента
// и с типом DaisyTheme в provider.tsx.
const themes = ['forest', 'sunset', 'emerald', 'business', 'dark'] as const;

// Эмодзи для каждой темы — выводятся в dropdown.
const themeIcons: Record<(typeof themes)[number], string> = {
  forest: '🌲',
  sunset: '🌅',
  emerald: '💎',
  business: '💼',
  dark: '🌙',
};

interface ThemeSelectorProps {
  className?: string;
  showLabel?: boolean;
  /** When false, theme emojis are omitted in the trigger and list (checkmark remains). */
  showIcons?: boolean;
}

export const ThemeSelector: React.FC<ThemeSelectorProps> = ({
  className = '',
  showLabel = true,
  showIcons = true,
}) => {
  const { theme, setTheme } = useTheme();
  const [isOpen, setIsOpen] = useState(false);

  const currentTheme = themes.find(t => t === theme) || 'dark';

  return (
    <div className={`relative ${className}`}>
      {showLabel && (
        <span className="text-sm text-base-content/70 mr-2">
          {showIcons ? '🎨 ' : ''}
          Тема:
        </span>
      )}
      
      <div className="dropdown dropdown-end">
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="btn btn-sm btn-ghost gap-2"
        >
          {showIcons ? <span className="text-lg">{themeIcons[currentTheme]}</span> : null}
          <span className="capitalize">{currentTheme}</span>
        </button>
        
        {isOpen && (
          <ul className="dropdown-content z-50 menu p-2 shadow-lg bg-base-100 rounded-box w-52 mt-2 border border-base-200 max-h-96 overflow-y-auto">
            {themes.map(t => (
              <li key={t}>
                <button
                  onClick={() => {
                    setTheme(t);
                    setIsOpen(false);
                  }}
                  className={`capitalize ${theme === t ? 'active' : ''}`}
                >
                  {showIcons ? <span className="text-lg">{themeIcons[t]}</span> : null}
                  {t}
                  {theme === t && <span className="ml-auto">✓</span>}
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
};