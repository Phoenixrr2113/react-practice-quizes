import { useEffect } from 'react';
import { useTimer } from '@/hooks/useTimer';
import { formatTime } from '@/utils/time';
import { TopBar } from './TopBar';
import { ChallengeHeader } from './ChallengeHeader';
import { RequirementsList } from './RequirementsList';
import { HintsPanel } from './HintsPanel';
import { SolutionPanel } from './SolutionPanel';
import { CodeBlock } from '@/components/ui/CodeBlock';
import { SandboxButton } from '@/components/sandbox/SandboxButton';
import { PageContainer } from '@/components/layout/PageContainer';
import type { Challenge } from '@/types/challenge';

interface ChallengeViewProps {
  challenge: Challenge;
  onBack: () => void;
  onComplete: (seconds: number) => void;
  isCompleted: boolean;
}

export function ChallengeView({ challenge, onBack, onComplete, isCompleted }: ChallengeViewProps) {
  const timer = useTimer();

  // Auto-start timer on mount, reset on challenge change
  useEffect(() => {
    timer.reset();
    timer.start();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [challenge.id]);

  return (
    <div className="bg-bg min-h-screen pb-0">
      <TopBar
        onBack={onBack}
        timer={formatTime(timer.seconds)}
        isTimerActive={timer.isActive}
        onToggleTimer={timer.toggle}
        onComplete={() => onComplete(timer.seconds)}
        isCompleted={isCompleted}
      />
      <PageContainer>
        <ChallengeHeader challenge={challenge} />
        <RequirementsList requirements={challenge.requirements} />
        <div className="pt-5">
          <h3 className="m-0 mb-3 text-[13px] font-bold uppercase tracking-widest text-[#555]">
            Starter Code
          </h3>
          <CodeBlock code={challenge.starterCode} />
          <SandboxButton code={challenge.starterCode} testCode={challenge.testCode} />
        </div>
        <HintsPanel keyPoints={challenge.keyPoints} />
        <SolutionPanel solutionCode={challenge.solutionCode} testCode={challenge.testCode} followUp={challenge.followUp} />
      </PageContainer>
    </div>
  );
}
