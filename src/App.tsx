import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import GoalInput from './pages/GoalInput';
import FeasibilityCheck from './pages/FeasibilityCheck';
import KPIDecomposition from './pages/KPIDecomposition';
import WeeklyTodoList from './pages/WeeklyTodoList';
import DailyTaskInstruction from './pages/DailyTaskInstruction';
import ProgressDashboard from './pages/ProgressDashboard';

const App: React.FC = () => {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<GoalInput />} />
        <Route path="/feasibility-check" element={<FeasibilityCheck />} />
        <Route path="/kpi-decomposition" element={<KPIDecomposition />} />
        <Route path="/weekly-todo" element={<WeeklyTodoList />} />
        <Route path="/daily-task" element={<DailyTaskInstruction />} />
        <Route path="/progress" element={<ProgressDashboard />} />
      </Routes>
    </BrowserRouter>
  );
};

export default App;
