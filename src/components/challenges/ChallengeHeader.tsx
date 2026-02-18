import { CategoryBadge, DifficultyBadge } from '@/components/ui/Badge';
import type { Challenge } from '@/types/challenge';

export function ChallengeHeader({ challenge }: { challenge: Challenge }) {
  return (
    <div className="pt-7">
      <div className="flex gap-2.5 items-center flex-wrap">
        <CategoryBadge category={challenge.category} />
        <DifficultyBadge difficulty={challenge.difficulty} />
        <span className="text-muted text-[13px]">⏱ {challenge.timeEstimate}</span>
      </div>
      <h2 className="mt-3.5 mb-2.5 text-2xl font-bold text-[#f0f0f8] tracking-tight">
        {challenge.title}
      </h2>
      <p className="text-sm text-[#999] leading-relaxed font-ui">
        {challenge.description}
      </p>
      {challenge.realWorld && (
        <div className="bg-accent/[0.06] border border-accent/20 rounded-lg p-3.5 mt-4">
          <h4 className="m-0 mb-2 text-xs font-bold uppercase tracking-widest text-accent">
            ⚡ Real-World Context
          </h4>
          <p className="m-0 text-[13px] text-[#aab] leading-relaxed font-ui">
            {challenge.realWorld}
          </p>
        </div>
      )}
    </div>
  );
}
