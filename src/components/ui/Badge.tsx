import { cn } from '@/utils/cn';
import { CATEGORY_STYLES, DIFFICULTY_STYLES } from '@/constants/theme';
import type { Category, Difficulty } from '@/types/challenge';

export function CategoryBadge({ category }: { category: Category }) {
  return (
    <span
      className={cn(
        'text-[11px] font-semibold uppercase tracking-widest px-2 py-0.5 rounded',
        CATEGORY_STYLES[category].tag,
      )}
    >
      {category}
    </span>
  );
}

export function DifficultyBadge({ difficulty }: { difficulty: Difficulty }) {
  return (
    <span
      className={cn(
        'text-[11px] font-semibold px-2 py-0.5 rounded',
        DIFFICULTY_STYLES[difficulty],
      )}
    >
      {difficulty}
    </span>
  );
}
