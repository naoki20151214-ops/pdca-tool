import { GoalFormData } from './goal';
import { KPIDecompositionResult } from './kpi';

export type TodoStatus = 'completed' | 'in_progress' | 'failed';

export const TODO_STATUS_LABELS: Record<TodoStatus, string> = {
  completed: '完了した',
  in_progress: '途中',
  failed: 'できなかった',
};

export interface TodoItem {
  kpiId: string;
  kpiName: string;
  status: TodoStatus | null;
  reason: string;
}

export interface WeeklyTodoReport {
  goalFormData: GoalFormData;
  kpiData: KPIDecompositionResult;
  todos: TodoItem[];
  completionRate: number;
  createdAt: string;
}
