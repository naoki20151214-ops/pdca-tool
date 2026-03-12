import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import GoalInput from './pages/GoalInput';
import FeasibilityCheck from './pages/FeasibilityCheck';

const App: React.FC = () => {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<GoalInput />} />
        <Route path="/feasibility-check" element={<FeasibilityCheck />} />
      </Routes>
    </BrowserRouter>
  );
};

export default App;
