import { cn } from '@/utils/cn';

interface TopBarProps {
  onBack: () => void;
  timer: string;
  isTimerActive: boolean;
  onToggleTimer: () => void;
  onComplete: () => void;
  isCompleted: boolean;
}

export function TopBar({
  onBack,
  timer,
  isTimerActive,
  onToggleTimer,
  onComplete,
  isCompleted,
}: TopBarProps) {
  return (
    <div className="sticky top-0 z-10 flex justify-between items-center px-6 py-3.5 bg-surface-2 border-b border-border">
      <button
        onClick={onBack}
        className="bg-transparent border border-[#333] text-muted px-3.5 py-1.5 rounded-md cursor-pointer text-[13px] font-[inherit]"
      >
        ← Back
      </button>

      <div className="flex items-center gap-2">
        <span className="text-lg font-bold text-[#f0f0f8] tabular-nums">{timer}</span>
        <button
          onClick={onToggleTimer}
          className="bg-transparent border-none text-muted cursor-pointer text-sm px-1.5 py-0.5"
        >
          {isTimerActive ? '⏸' : '▶'}
        </button>
      </div>

      <button
        onClick={onComplete}
        className={cn(
          'border border-accent px-4 py-1.5 rounded-md cursor-pointer text-[13px] font-semibold font-[inherit] transition-all',
          isCompleted ? 'bg-accent text-bg' : 'bg-transparent text-accent',
        )}
      >
        {isCompleted ? '✓ Done' : 'Mark Complete'}
      </button>
    </div>
  );
}
