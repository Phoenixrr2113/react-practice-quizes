export type Category = 'Hooks & State' | 'Performance' | 'Architecture';
export type Difficulty = 'Medium' | 'Hard' | 'Expert';

export interface Challenge {
  id: number;
  category: Category;
  difficulty: Difficulty;
  title: string;
  timeEstimate: string;
  description: string;
  realWorld: string;
  requirements: string[];
  starterCode: string;
  solutionCode: string;
  keyPoints: string[];
  followUp: string;
}
