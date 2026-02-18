import { useState } from 'react';
import { RevealToggle } from '@/components/ui/RevealToggle';

interface HintsPanelProps {
  keyPoints: string[];
}

export function HintsPanel({ keyPoints }: HintsPanelProps) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="pt-5">
      <RevealToggle
        isOpen={isOpen}
        onToggle={() => setIsOpen(!isOpen)}
        label={isOpen ? 'Hide Hints' : 'Show Hints'}
      />
      {isOpen && (
        <div className="bg-surface-2 border border-border rounded-lg p-4 flex flex-col gap-3">
          {keyPoints.map((point, i) => (
            <div key={i} className="flex gap-3 text-[13px] text-[#bbb] leading-normal font-ui">
              <span className="text-warning font-bold text-xs shrink-0 w-[18px] h-[18px] flex items-center justify-center bg-warning/10 rounded mt-0.5">
                {i + 1}
              </span>
              <span>{point}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
