import { GoalFormData } from './goal';
import { KPIDecompositionResult } from './kpi';
import { TodoStatus } from './weeklyTodo';

export type Priority = 'high' | 'medium' | 'low';

export const PRIORITY_LABELS: Record<Priority, string> = {
  high: '高',
  medium: '中',
  low: '低',
};

export const PRIORITY_ORDER: Record<Priority, number> = {
  high: 0,
  medium: 1,
  low: 2,
};

export interface DailyTask {
  id: string;
  title: string;
  description: string;
  relatedKPI: string;
  priority: Priority;
  estimatedMinutes: number;
  status: TodoStatus | null;
  reason: string;
}

/** Claude API が返す選択結果（status/reason はクライアントで追加） */
export interface DailyTaskClaudeResult {
  tasks: Omit<DailyTask, 'status' | 'reason'>[];
}

export interface DailyReport {
  goalFormData: GoalFormData;
  kpiData: KPIDecompositionResult;
  date: string;
  tasks: DailyTask[];
  completionRate: number;
  createdAt: string;
}
