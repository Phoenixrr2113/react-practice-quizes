import { useParams, useNavigate } from 'react-router-dom';
import { ALL_CHALLENGES } from '@/data/challenges';
import { useProgress } from '@/hooks/useProgress';
import { ChallengeView } from './ChallengeView';

export function ChallengeViewRoute() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { completedIds, markComplete } = useProgress(ALL_CHALLENGES.length);

  const challenge = ALL_CHALLENGES.find((c) => c.id === Number(id));

  if (!challenge) {
    return (
      <div className="bg-bg min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-muted text-sm mb-4">Challenge not found.</p>
          <button
            onClick={() => navigate('/')}
            className="text-accent text-sm cursor-pointer bg-transparent border border-accent px-4 py-2 rounded-md font-[inherit]"
          >
            ← Back to challenges
          </button>
        </div>
      </div>
    );
  }

  return (
    <ChallengeView
      challenge={challenge}
      onBack={() => navigate('/')}
      onComplete={() => markComplete(challenge.id)}
      isCompleted={completedIds.has(challenge.id)}
    />
  );
}
