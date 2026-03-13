import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import GoalInput from './pages/GoalInput';
import FeasibilityCheck from './pages/FeasibilityCheck';
import KPIDecomposition from './pages/KPIDecomposition';
import WeeklyTodoList from './pages/WeeklyTodoList';

const App: React.FC = () => {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<GoalInput />} />
        <Route path="/feasibility-check" element={<FeasibilityCheck />} />
        <Route path="/kpi-decomposition" element={<KPIDecomposition />} />
        <Route path="/weekly-todo" element={<WeeklyTodoList />} />
      </Routes>
    </BrowserRouter>
  );
};

export default App;
