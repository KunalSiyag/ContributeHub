import { UserPreferences } from '@/types';

// Format large numbers (e.g., 12500 -> 12.5k)
export function formatNumber(num: number): string {
  if (num >= 1000000) {
    return (num / 1000000).toFixed(1).replace(/\.0$/, '') + 'M';
  }
  if (num >= 1000) {
    return (num / 1000).toFixed(1).replace(/\.0$/, '') + 'k';
  }
  return num.toString();
}

// Format relative time (e.g., "2 days ago")
export function timeAgo(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const seconds = Math.floor((now.getTime() - date.getTime()) / 1000);

  const intervals = [
    { label: 'year', seconds: 31536000 },
    { label: 'month', seconds: 2592000 },
    { label: 'week', seconds: 604800 },
    { label: 'day', seconds: 86400 },
    { label: 'hour', seconds: 3600 },
    { label: 'minute', seconds: 60 },
  ];

  for (const interval of intervals) {
    const count = Math.floor(seconds / interval.seconds);
    if (count >= 1) {
      return `${count} ${interval.label}${count !== 1 ? 's' : ''} ago`;
    }
  }

  return 'just now';
}

// Format a date string to readable format
export function formatDate(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

// Get language color for badge
export function getLanguageColor(language: string): string {
  const colors: Record<string, string> = {
    JavaScript: '#f1e05a',
    TypeScript: '#3178c6',
    Python: '#3572A5',
    Go: '#00ADD8',
    Rust: '#dea584',
    Java: '#b07219',
    Ruby: '#701516',
    PHP: '#4F5D95',
    'C++': '#f34b7d',
    C: '#555555',
    'C#': '#178600',
    Swift: '#F05138',
    Kotlin: '#A97BFF',
    Vue: '#41b883',
    HTML: '#e34c26',
    CSS: '#563d7c',
    Shell: '#89e051',
    Scala: '#c22d40',
    Dart: '#00B4AB',
    Elixir: '#6e4a7e',
  };

  return colors[language] || '#8b949e';
}

// Get language class name for CSS
export function getLanguageClass(language: string | null): string {
  if (!language) return '';
  return language.toLowerCase().replace(/[^a-z0-9]/g, '');
}

// Local storage helpers
const PREFERENCES_KEY = 'contributehub_preferences';

export function getStoredPreferences(): UserPreferences | null {
  if (typeof window === 'undefined') return null;
  
  try {
    const stored = localStorage.getItem(PREFERENCES_KEY);
    return stored ? JSON.parse(stored) : null;
  } catch {
    return null;
  }
}

export function setStoredPreferences(preferences: UserPreferences): void {
  if (typeof window === 'undefined') return;
  
  try {
    localStorage.setItem(PREFERENCES_KEY, JSON.stringify(preferences));
  } catch {
    console.error('Failed to save preferences to localStorage');
  }
}

export const defaultPreferences: UserPreferences = {
  skills: [],
  interests: [],
  experienceLevel: 'beginner',
  minStars: 0,
  preferredLanguages: [],
  theme: 'system',
};

// Theme management
const THEME_KEY = 'contributehub_theme';

export function getStoredTheme(): 'light' | 'dark' | 'system' {
  if (typeof window === 'undefined') return 'system';
  
  try {
    const stored = localStorage.getItem(THEME_KEY);
    if (stored === 'light' || stored === 'dark' || stored === 'system') {
      return stored;
    }
    return 'system';
  } catch {
    return 'system';
  }
}

export function setStoredTheme(theme: 'light' | 'dark' | 'system'): void {
  if (typeof window === 'undefined') return;
  
  try {
    localStorage.setItem(THEME_KEY, theme);
  } catch {
    console.error('Failed to save theme to localStorage');
  }
}

export function applyTheme(theme: 'light' | 'dark' | 'system'): void {
  if (typeof window === 'undefined') return;

  const root = document.documentElement;
  
  if (theme === 'system') {
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    root.setAttribute('data-theme', prefersDark ? 'dark' : 'light');
  } else {
    root.setAttribute('data-theme', theme);
  }
}

// Debounce function for search input
export function debounce<T extends (...args: string[]) => void>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout | null = null;

  return (...args: Parameters<T>) => {
    if (timeout) clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
}

// Extract repository info from issue URL
export function extractRepoFromIssueUrl(url: string): { owner: string; repo: string } | null {
  const match = url.match(/repos\/([^/]+)\/([^/]+)/);
  if (match) {
    return { owner: match[1], repo: match[2] };
  }
  return null;
}

// Truncate text with ellipsis
export function truncate(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength - 3) + '...';
}

// Get contribution label color
export function getLabelColor(labelName: string): string {
  const name = labelName.toLowerCase();
  
  if (name.includes('good first issue') || name.includes('beginner')) {
    return 'label-good-first-issue';
  }
  if (name.includes('help wanted')) {
    return 'label-help-wanted';
  }
  if (name.includes('bug')) {
    return 'label-bug';
  }
  if (name.includes('enhancement') || name.includes('feature')) {
    return 'label-enhancement';
  }
  if (name.includes('documentation') || name.includes('docs')) {
    return 'label-documentation';
  }
  
  return 'tag';
}
