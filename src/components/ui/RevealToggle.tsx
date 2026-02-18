import { cn } from '@/utils/cn';

interface RevealToggleProps {
  isOpen: boolean;
  onToggle: () => void;
  label: string;
  variant?: 'default' | 'solution';
}

export function RevealToggle({ isOpen, onToggle, label, variant = 'default' }: RevealToggleProps) {
  return (
    <button
      onClick={onToggle}
      aria-expanded={isOpen}
      className={cn(
        'w-full text-center py-2.5 px-5 rounded-md border text-sm font-semibold transition-all mb-3 cursor-pointer font-[inherit]',
        variant === 'solution' && isOpen && 'bg-error/10 border-error text-error',
        variant === 'solution' && !isOpen && 'bg-accent/10 border-accent text-accent',
        variant === 'default' && 'bg-white/[0.04] border-border text-muted',
      )}
    >
      {label} {isOpen ? '▲' : '▼'}
    </button>
  );
}
