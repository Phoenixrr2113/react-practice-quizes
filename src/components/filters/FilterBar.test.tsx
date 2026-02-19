import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { ChallengeGrid } from '@/components/challenges/ChallengeGrid';
import { ALL_CHALLENGES } from '@/data/challenges';

function renderGrid() {
  return render(
    <MemoryRouter>
      <ChallengeGrid />
    </MemoryRouter>,
  );
}

describe('FilterBar + Search integration', () => {
  it('shows all 36 challenges by default', () => {
    renderGrid();
    expect(screen.getByText(`Showing ${ALL_CHALLENGES.length} of ${ALL_CHALLENGES.length} challenges`)).toBeInTheDocument();
  });

  it('category filter reduces visible card count', async () => {
    const user = userEvent.setup();
    renderGrid();

    await user.click(screen.getByRole('button', { name: 'Hooks & State' }));

    const hooksCount = ALL_CHALLENGES.filter((c) => c.category === 'Hooks & State').length;
    expect(screen.getByText(`Showing ${hooksCount} of ${ALL_CHALLENGES.length} challenges`)).toBeInTheDocument();
  });

  it('difficulty filter reduces visible card count', async () => {
    const user = userEvent.setup();
    renderGrid();

    await user.click(screen.getByRole('button', { name: 'Expert' }));

    const expertCount = ALL_CHALLENGES.filter((c) => c.difficulty === 'Expert').length;
    expect(screen.getByText(`Showing ${expertCount} of ${ALL_CHALLENGES.length} challenges`)).toBeInTheDocument();
  });

  it('combined category + difficulty filters stack correctly', async () => {
    const user = userEvent.setup();
    renderGrid();

    await user.click(screen.getByRole('button', { name: 'Performance' }));
    await user.click(screen.getByRole('button', { name: 'Hard' }));

    const count = ALL_CHALLENGES.filter(
      (c) => c.category === 'Performance' && c.difficulty === 'Hard',
    ).length;
    expect(screen.getByText(`Showing ${count} of ${ALL_CHALLENGES.length} challenges`)).toBeInTheDocument();
  });

  it('search by title filters challenges', async () => {
    const user = userEvent.setup();
    renderGrid();

    const firstChallenge = ALL_CHALLENGES[0]!;
    // Type a unique substring from the first challenge's title
    const searchTerm = firstChallenge.title.split(' ').slice(0, 3).join(' ');
    await user.type(screen.getByPlaceholderText('Search challenges...'), searchTerm);

    // Should show at least 1 result (the challenge whose title matches)
    const text = screen.getByText(/^Showing \d+ of/);
    const match = text.textContent!.match(/Showing (\d+) of/);
    expect(Number(match![1])).toBeGreaterThanOrEqual(1);
    expect(Number(match![1])).toBeLessThan(ALL_CHALLENGES.length);
  });

  it('shows no-results state when nothing matches', async () => {
    const user = userEvent.setup();
    renderGrid();

    await user.type(screen.getByPlaceholderText('Search challenges...'), 'xyznonexistent12345');

    expect(screen.getByText('Showing 0 of 36 challenges')).toBeInTheDocument();
    expect(screen.getByText('No challenges match your filters.')).toBeInTheDocument();
  });
});
