import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { ALL_CHALLENGES } from '@/data/challenges';
import { useProgress } from '@/hooks/useProgress';
import { ChallengeCard } from './ChallengeCard';
import { ProgressBar } from '@/components/ui/ProgressBar';
import { FilterBar } from '@/components/filters/FilterBar';
import { SearchInput } from '@/components/filters/SearchInput';
import type { Challenge, Category, Difficulty } from '@/types/challenge';

export function ChallengeGrid() {
  const navigate = useNavigate();
  const { completedIds, completionTimes, progress, resetProgress } = useProgress(ALL_CHALLENGES.length);
  const [activeCategory, setActiveCategory] = useState<'All' | Category>('All');
  const [activeDifficulty, setActiveDifficulty] = useState<'All' | Difficulty>('All');
  const [query, setQuery] = useState('');

  const filtered = useMemo(() => {
    return ALL_CHALLENGES
      .filter((c) => activeCategory === 'All' || c.category === activeCategory)
      .filter((c) => activeDifficulty === 'All' || c.difficulty === activeDifficulty)
      .filter((c) => {
        if (!query) return true;
        const q = query.toLowerCase();
        return c.title.toLowerCase().includes(q) || c.description.toLowerCase().includes(q);
      });
  }, [activeCategory, activeDifficulty, query]);

  const handleStart = (challenge: Challenge) => {
    navigate(`/challenge/${challenge.id}`);
  };

  return (
    <div className="bg-bg min-h-screen pb-10">
      {/* Header */}
      <div className="bg-gradient-to-br from-surface-2 to-[#1a1a2e] border-b border-border px-6 py-7 mb-7">
        <div className="max-w-[880px] mx-auto flex justify-between items-center flex-wrap gap-4">
          <div>
            <h1 className="m-0 text-[22px] font-bold tracking-tight text-[#f0f0f8]">
              React Interview Lab
            </h1>
            <p className="mt-1 mb-0 text-[13px] text-muted font-normal">
              Expert Level · 8+ Years · {ALL_CHALLENGES.length} Challenges
            </p>
          </div>
          <div className="flex items-center gap-4">
            <ProgressBar
              value={progress}
              label={`${completedIds.size}/${ALL_CHALLENGES.length} completed`}
            />
            {completedIds.size > 0 && (
              <button
                onClick={resetProgress}
                className="text-xs text-muted hover:text-error border border-border hover:border-error/50
                           px-2 py-1 rounded transition-colors cursor-pointer bg-transparent font-[inherit]"
              >
                Reset
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="max-w-[880px] mx-auto px-6">
        <SearchInput value={query} onChange={setQuery} />
        <div className="mt-3">
          <FilterBar
            activeCategory={activeCategory}
            activeDifficulty={activeDifficulty}
            onCategoryChange={setActiveCategory}
            onDifficultyChange={setActiveDifficulty}
          />
        </div>
        <p className="text-xs text-muted mb-4">
          Showing {filtered.length} of {ALL_CHALLENGES.length} challenges
        </p>
      </div>

      {/* Grid */}
      <div className="max-w-[880px] mx-auto px-6 grid grid-cols-[repeat(auto-fill,minmax(380px,1fr))] gap-4">
        {filtered.map((c) => (
          <ChallengeCard
            key={c.id}
            challenge={c}
            isCompleted={completedIds.has(c.id)}
            completionTime={completionTimes[c.id]}
            onStart={handleStart}
          />
        ))}
      </div>

      {filtered.length === 0 && (
        <div className="max-w-[880px] mx-auto px-6 text-center py-16">
          <p className="text-muted text-sm">No challenges match your filters.</p>
        </div>
      )}
    </div>
  );
}
