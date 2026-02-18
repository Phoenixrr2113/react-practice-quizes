interface ProgressBarProps {
  value: number;
  label?: string;
}

export function ProgressBar({ value, label }: ProgressBarProps) {
  return (
    <div className="flex items-center gap-3">
      <div className="w-28 h-1.5 bg-border rounded-full overflow-hidden">
        <div
          className="h-full bg-gradient-to-r from-accent to-[#0f3460] rounded-full transition-[width] duration-400"
          style={{ width: `${value}%` }}
        />
      </div>
      {label && <span className="text-xs text-muted">{label}</span>}
    </div>
  );
}
