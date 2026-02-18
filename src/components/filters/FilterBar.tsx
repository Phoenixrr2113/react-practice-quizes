import { cn } from '@/utils/cn';
import type { Category, Difficulty } from '@/types/challenge';

const CATEGORIES: Array<'All' | Category> = ['All', 'Hooks & State', 'Performance', 'Architecture'];
const DIFFICULTIES: Array<'All' | Difficulty> = ['All', 'Medium', 'Hard', 'Expert'];

interface FilterBarProps {
  activeCategory: 'All' | Category;
  activeDifficulty: 'All' | Difficulty;
  onCategoryChange: (category: 'All' | Category) => void;
  onDifficultyChange: (difficulty: 'All' | Difficulty) => void;
}

function Chip({
  label,
  isActive,
  onClick,
}: {
  label: string;
  isActive: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'px-3 py-1 rounded-md text-xs font-semibold transition-all cursor-pointer border',
        isActive
          ? 'bg-accent text-bg border-accent'
          : 'bg-white/[0.04] border-border text-muted hover:border-accent/50',
      )}
    >
      {label}
    </button>
  );
}

export function FilterBar({
  activeCategory,
  activeDifficulty,
  onCategoryChange,
  onDifficultyChange,
}: FilterBarProps) {
  return (
    <div className="flex flex-col gap-3 mb-5">
      <div className="flex flex-wrap gap-2">
        {CATEGORIES.map((cat) => (
          <Chip key={cat} label={cat} isActive={activeCategory === cat} onClick={() => onCategoryChange(cat)} />
        ))}
      </div>
      <div className="flex flex-wrap gap-2">
        {DIFFICULTIES.map((diff) => (
          <Chip key={diff} label={diff} isActive={activeDifficulty === diff} onClick={() => onDifficultyChange(diff)} />
        ))}
      </div>
    </div>
  );
}
