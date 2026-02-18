import type { Category, Difficulty } from '@/types/challenge';

export const CATEGORY_STYLES: Record<Category, { border: string; tag: string }> = {
  'Hooks & State': {
    border: 'border-l-accent-alt',
    tag: 'text-accent-alt bg-accent-alt/10',
  },
  Performance: {
    border: 'border-l-accent',
    tag: 'text-accent bg-accent/10',
  },
  Architecture: {
    border: 'border-l-accent-alt',
    tag: 'text-accent-alt bg-accent-alt/10',
  },
};

export const DIFFICULTY_STYLES: Record<Difficulty, string> = {
  Medium: 'text-warning bg-warning/10',
  Hard: 'text-error bg-error/10',
  Expert: 'text-purple bg-purple/10',
};
