import React from 'react';
import { themes } from '../themes';
import type { Theme } from '../themes';

interface ThemeSwitcherProps {
  theme: Theme;
  setTheme: (theme: Theme) => void;
  variant?: 'light' | 'dark';
}

const ThemeSwitcher: React.FC<ThemeSwitcherProps> = ({ theme, setTheme, variant = 'light' }) => {

  const handleThemeChange = (themeName: string) => {
    const newTheme = themes.find(t => t.name === themeName);
    if (newTheme) {
      setTheme(newTheme);
    }
  };
  
  const selectClasses = variant === 'dark' 
    ? "bg-slate-800 border-slate-600 text-white" 
    : "bg-background border-input";
    
  const iconClasses = variant === 'dark'
    ? "text-slate-400"
    : "text-muted-foreground";

  return (
    <div className="relative">
      <select
        value={theme.name}
        onChange={(e) => handleThemeChange(e.target.value)}
        className={`flex h-10 w-full items-center justify-between rounded-md px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 appearance-none pr-8 ${selectClasses}`}
        aria-label="Select a theme"
      >
        {themes.map((t) => (
          <option key={t.name} value={t.name}>
            {t.label}
          </option>
        ))}
      </select>
       <svg className={`absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none ${iconClasses}`} fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
    </div>
  );
};

export default ThemeSwitcher;