import { useState } from 'react';
import { RevealToggle } from '@/components/ui/RevealToggle';
import { CodeBlock } from '@/components/ui/CodeBlock';
import { SandboxButton } from '@/components/sandbox/SandboxButton';

interface SolutionPanelProps {
  solutionCode: string;
  testCode?: string;
  followUp: string;
}

export function SolutionPanel({ solutionCode, testCode, followUp }: SolutionPanelProps) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="pt-5 pb-10">
      <RevealToggle
        isOpen={isOpen}
        onToggle={() => setIsOpen(!isOpen)}
        label={isOpen ? 'Hide Solution' : 'Reveal Solution'}
        variant="solution"
      />
      {isOpen && (
        <div>
          <CodeBlock code={solutionCode} />
          <SandboxButton code={solutionCode} testCode={testCode} />
          <div className="bg-purple/15 border border-purple/30 rounded-lg p-4 mt-4">
            <h4 className="m-0 mb-2 text-[13px] font-bold text-purple">
              Follow-Up Question
            </h4>
            <p className="m-0 text-sm text-[#bbb] leading-relaxed font-ui">
              {followUp}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
