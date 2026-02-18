import { hooksAndStateChallenges } from './hooks-and-state';
import { performanceChallenges } from './performance';
import { architectureChallenges } from './architecture';
import type { Challenge } from '@/types/challenge';

export const ALL_CHALLENGES: Challenge[] = [
  ...hooksAndStateChallenges,
  ...performanceChallenges,
  ...architectureChallenges,
];
