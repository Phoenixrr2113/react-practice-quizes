import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { ChallengeGrid } from '@/components/challenges/ChallengeGrid';
import { ChallengeViewRoute } from '@/components/challenges/ChallengeViewRoute';

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<ChallengeGrid />} />
        <Route path="/challenge/:id" element={<ChallengeViewRoute />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
