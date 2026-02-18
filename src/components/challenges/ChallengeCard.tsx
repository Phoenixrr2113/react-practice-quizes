import { cn } from '@/utils/cn';
import { CategoryBadge, DifficultyBadge } from '@/components/ui/Badge';
import { CATEGORY_STYLES } from '@/constants/theme';
import type { Challenge } from '@/types/challenge';

interface ChallengeCardProps {
  challenge: Challenge;
  isCompleted: boolean;
  onStart: (challenge: Challenge) => void;
}

export function ChallengeCard({ challenge, isCompleted, onStart }: ChallengeCardProps) {
  return (
    <div
      onClick={() => onStart(challenge)}
      className={cn(
        'bg-surface rounded-lg p-5 border border-border border-l-[3px] cursor-pointer',
        'transition-all hover:shadow-lg hover:-translate-y-px',
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
        <span className="text-xs text-[#555]">⏱ {challenge.timeEstimate}</span>
        <span className="text-[13px] text-accent font-semibold">Start →</span>
      </div>
    </div>
  );
}
