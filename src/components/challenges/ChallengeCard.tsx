import { cn } from '@/utils/cn';
import { CategoryBadge, DifficultyBadge } from '@/components/ui/Badge';
import { CATEGORY_STYLES } from '@/constants/theme';
import { formatTime } from '@/utils/time';
import type { Challenge } from '@/types/challenge';

interface ChallengeCardProps {
  challenge: Challenge;
  isCompleted: boolean;
  completionTime?: number;
  onStart: (challenge: Challenge) => void;
}

export function ChallengeCard({ challenge, isCompleted, completionTime, onStart }: ChallengeCardProps) {
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      onStart(challenge);
    }
  };

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={() => onStart(challenge)}
      onKeyDown={handleKeyDown}
      className={cn(
        'bg-surface rounded-lg p-5 border border-border border-l-[3px] cursor-pointer',
        'transition-all hover:shadow-lg hover:-translate-y-px',
        'focus:outline-none focus:ring-2 focus:ring-accent/50 focus:ring-offset-2 focus:ring-offset-bg',
        CATEGORY_STYLES[challenge.category].border,
        isCompleted && 'opacity-70',
      )}
    >
      <div className="flex justify-between items-center mb-3">
        <CategoryBadge category={challenge.category} />
        <DifficultyBadge difficulty={challenge.difficulty} />
      </div>
      <h3 className="m-0 mb-2 text-base font-semibold text-[#f0f0f8] leading-snug">
        {isCompleted && <span className="mr-2">✓</span>}
        {challenge.title}
      </h3>
      <p className="m-0 mb-3.5 text-[13px] text-muted leading-normal font-ui">
        {challenge.description.slice(0, 120)}…
      </p>
      <div className="flex justify-between items-center">
        <span className="text-xs text-[#555]">
          {isCompleted && completionTime !== undefined
            ? `✓ Completed in ${formatTime(completionTime)}`
            : `⏱ ${challenge.timeEstimate}`}
        </span>
        <span className="text-[13px] text-accent font-semibold">
          {isCompleted ? 'Review →' : 'Start →'}
        </span>
      </div>
    </div>
  );
}
