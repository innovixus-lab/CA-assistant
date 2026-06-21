/**
 * Reusable theme toggle button.
 * Can be used as a floating button (variant="float") or inline (variant="inline").
 */
import React from 'react';
import { Sun, Moon } from 'lucide-react';
import { useTheme } from '../lib/theme';
import { cn } from '../lib/utils';

interface ThemeToggleProps {
  variant?: 'float' | 'inline';
  className?: string;
}

export default function ThemeToggle({ variant = 'inline', className }: ThemeToggleProps) {
  const { theme, toggle } = useTheme();

  if (variant === 'float') {
    return (
      <button
        onClick={toggle}
        title={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
        className={cn(
          'fixed bottom-5 left-5 z-50 w-10 h-10 rounded-full shadow-lg flex items-center justify-center transition-all duration-300',
          theme === 'dark'
            ? 'bg-zinc-800 border border-zinc-700 text-indigo-300 hover:bg-zinc-700'
            : 'bg-white border border-zinc-200 text-amber-500 hover:bg-zinc-50 shadow-md',
          className
        )}
      >
        {theme === 'dark' ? <Moon size={16} /> : <Sun size={16} />}
      </button>
    );
  }

  // inline — the sliding pill used in the CA dashboard header
  return (
    <button
      onClick={toggle}
      title={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
      className={cn(
        'relative w-14 h-7 rounded-full border transition-all duration-300 flex items-center px-1',
        theme === 'dark'
          ? 'bg-zinc-800 border-zinc-700'
          : 'bg-indigo-100 border-indigo-200',
        className
      )}
    >
      <Moon size={11} className={cn(
        'absolute left-1.5 transition-opacity duration-200',
        theme === 'dark' ? 'opacity-60 text-indigo-300' : 'opacity-0'
      )} />
      <Sun size={11} className={cn(
        'absolute right-1.5 transition-opacity duration-200',
        theme === 'light' ? 'opacity-60 text-amber-500' : 'opacity-0'
      )} />
      <span className={cn(
        'w-5 h-5 rounded-full shadow-sm transition-all duration-300 flex items-center justify-center',
        theme === 'dark'
          ? 'translate-x-0 bg-zinc-600'
          : 'translate-x-7 bg-white shadow-md'
      )}>
        {theme === 'dark'
          ? <Moon size={10} className="text-indigo-300" />
          : <Sun  size={10} className="text-amber-500" />
        }
      </span>
    </button>
  );
}
