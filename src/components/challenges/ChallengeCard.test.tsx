import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ChallengeCard } from './ChallengeCard';
import type { Challenge } from '@/types/challenge';

const mockChallenge: Challenge = {
  id: 1,
  category: 'Hooks & State',
  difficulty: 'Expert',
  title: 'Test Challenge Title',
  timeEstimate: '25 min',
  description: 'A test challenge description that is long enough to be truncated at 120 characters for the card view display.',
  realWorld: 'Real world context',
  requirements: ['Requirement 1'],
  starterCode: 'const x = 1;',
  solutionCode: 'const x = 2;',
  keyPoints: ['Key point 1'],
  followUp: 'Follow up question',
};

describe('ChallengeCard', () => {
  it('renders challenge title', () => {
    render(<ChallengeCard challenge={mockChallenge} isCompleted={false} onStart={() => {}} />);
    expect(screen.getByText('Test Challenge Title')).toBeInTheDocument();
  });

  it('renders category badge', () => {
    render(<ChallengeCard challenge={mockChallenge} isCompleted={false} onStart={() => {}} />);
    expect(screen.getByText('Hooks & State')).toBeInTheDocument();
  });

  it('renders difficulty badge', () => {
    render(<ChallengeCard challenge={mockChallenge} isCompleted={false} onStart={() => {}} />);
    expect(screen.getByText('Expert')).toBeInTheDocument();
  });

  it('shows checkmark when isCompleted', () => {
    render(<ChallengeCard challenge={mockChallenge} isCompleted={true} onStart={() => {}} />);
    expect(screen.getByText('✓')).toBeInTheDocument();
  });

  it('calls onStart when clicked', async () => {
    const user = userEvent.setup();
    const onStart = vi.fn();
    render(<ChallengeCard challenge={mockChallenge} isCompleted={false} onStart={onStart} />);

    await user.click(screen.getByText('Test Challenge Title'));
    expect(onStart).toHaveBeenCalledWith(mockChallenge);
  });

  it('displays time estimate', () => {
    render(<ChallengeCard challenge={mockChallenge} isCompleted={false} onStart={() => {}} />);
    expect(screen.getByText('⏱ 25 min')).toBeInTheDocument();
  });
});
