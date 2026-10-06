import React, { useState, useEffect } from 'react';
import { loadTheme, saveTheme } from '../utils/storage';
import { soundstage } from '../utils/audio';

export const ThemeToggle: React.FC = () => {
  const [theme, setTheme] = useState<'day' | 'night'>('day');

  useEffect(() => {
    const saved = loadTheme();
    setTheme(saved);
    document.documentElement.setAttribute('data-theme', saved);
  }, []);

  const handleToggle = () => {
    soundstage.playTap();
    const next = theme === 'day' ? 'night' : 'day';
    setTheme(next);
    saveTheme(next);
    document.documentElement.setAttribute('data-theme', next);
  };

  return (
    <button
      onClick={handleToggle}
      className="btn-cel btn-icon-sq btn-theme-toggle"
      title={theme === 'day' ? 'Day Mode (Click for Night Mode)' : 'Night Mode (Click for Day Mode)'}
      aria-label="Toggle theme"
    >
      {theme === 'day' ? (
        // 1930s Cartoon Sun (Day Mode)
        <svg
          width="24"
          height="24"
          viewBox="0 0 24 24"
          fill="none"
          stroke="var(--color-ink-black)"
          strokeWidth="2.4"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="theme-sun-icon"
        >
          <circle cx="12" cy="12" r="4.5" fill="var(--color-golden-buttercup)" stroke="var(--color-ink-black)" strokeWidth="2.4" />
          <path d="M12 2v2.5M12 19.5v2.5M4.93 4.93l1.77 1.77M17.3 17.3l1.77 1.77M2 12h2.5M19.5 12h2.5M4.93 19.07l1.77-1.77M17.3 6.7l1.77-1.77" />
        </svg>
      ) : (
        // 1930s Cartoon Crescent Moon & Star (Night Mode)
        <svg
          width="24"
          height="24"
          viewBox="0 0 24 24"
          fill="none"
          stroke="var(--color-ink-black)"
          strokeWidth="2.2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="theme-moon-icon"
        >
          {/* Crescent Moon */}
          <path
            d="M20 13.2A8.2 8.2 0 1 1 10.8 4 6.8 6.8 0 0 0 20 13.2z"
            fill="var(--color-golden-buttercup)"
            stroke="var(--color-ink-black)"
            strokeWidth="2.2"
          />
          {/* Cartoon 4-point star */}
          <polygon
            points="17,3.5 17.8,5.2 19.5,5.8 17.8,6.5 17,8.2 16.2,6.5 14.5,5.8 16.2,5.2"
            fill="var(--color-golden-buttercup)"
            stroke="var(--color-ink-black)"
            strokeWidth="1.2"
          />
        </svg>
      )}

      <style>{`
        .btn-theme-toggle {
          background-color: var(--color-glove-ivory);
          border: var(--border-ink-standard);
          box-shadow: var(--shadow-cel-sm);
          position: relative;
        }
        .btn-theme-toggle:hover {
          background-color: var(--color-parchment-deep);
        }
        .theme-sun-icon {
          transform: rotate(0deg);
          transition: transform 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
        }
        .btn-theme-toggle:hover .theme-sun-icon {
          transform: rotate(45deg);
        }
        .theme-moon-icon {
          transform: rotate(-6deg);
          transition: transform 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
        }
        .btn-theme-toggle:hover .theme-moon-icon {
          transform: rotate(12deg) scale(1.08);
        }
      `}</style>
    </button>
  );
};
