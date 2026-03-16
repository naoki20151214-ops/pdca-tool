import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { collection, addDoc } from 'firebase/firestore';
import { WeeklyTodoReport, TodoStatus, TODO_STATUS_LABELS } from '../types/weeklyTodo';
import {
  DailyTask,
  DailyReport,
  Priority,
  PRIORITY_LABELS,
  PRIORITY_ORDER,
} from '../types/dailyTask';
import { fetchDailyTasks } from '../api/dailyTaskSelection';
import { db } from '../lib/firebase';

// ---- 型 --------------------------------------------------------------------

interface LocationState {
  report: WeeklyTodoReport;
}

type LoadStatus = 'loading' | 'success' | 'error';

// ---- ユーティリティ ---------------------------------------------------------

function getTodayDate(): string {
  return new Date().toISOString().slice(0, 10); // YYYY-MM-DD
}

function formatDate(iso: string): string {
  const [y, m, d] = iso.split('-');
  return `${y}年${m}月${d}日`;
}

function calcCompletionRate(tasks: DailyTask[]): number {
  if (tasks.length === 0) return 0;
  const done = tasks.filter((t) => t.status === 'completed').length;
  return Math.round((done / tasks.length) * 100);
}

function sortByPriority(tasks: DailyTask[]): DailyTask[] {
  return [...tasks].sort(
    (a, b) => PRIORITY_ORDER[a.priority] - PRIORITY_ORDER[b.priority]
  );
}

// ---- PriorityBadge ----------------------------------------------------------

const PRIORITY_BADGE_STYLES: Record<Priority, React.CSSProperties> = {
  high: { background: '#fed7d7', color: '#9b2c2c', border: '1px solid #fc8181' },
  medium: { background: '#feebc8', color: '#7b341e', border: '1px solid #f6ad55' },
  low: { background: '#bee3f8', color: '#2a4365', border: '1px solid #63b3ed' },
};

interface PriorityBadgeProps {
  priority: Priority;
}
const PriorityBadge: React.FC<PriorityBadgeProps> = ({ priority }) => (
  <span
    style={{
      ...badgeStyle.base,
      ...PRIORITY_BADGE_STYLES[priority],
    }}
  >
    優先度：{PRIORITY_LABELS[priority]}
  </span>
);

const badgeStyle: Record<string, React.CSSProperties> = {
  base: {
    display: 'inline-block',
    padding: '2px 10px',
    borderRadius: '12px',
    fontSize: '12px',
    fontWeight: 'bold',
  },
};

// ---- TaskCard ---------------------------------------------------------------

interface TaskCardProps {
  task: DailyTask;
  onStatusChange: (id: string, status: TodoStatus) => void;
  onReasonChange: (id: string, reason: string) => void;
}

const STATUSES: TodoStatus[] = ['completed', 'in_progress', 'failed'];

const STATUS_ACTIVE_STYLES: Record<TodoStatus, React.CSSProperties> = {
  completed: { color: '#276749', fontWeight: 'bold' },
  in_progress: { color: '#c05621', fontWeight: 'bold' },
  failed: { color: '#9b2c2c', fontWeight: 'bold' },
};

const TaskCard: React.FC<TaskCardProps> = ({
  task,
  onStatusChange,
  onReasonChange,
}) => {
  const needsReason =
    task.status === 'in_progress' || task.status === 'failed';

  return (
    <div style={cardStyle.wrapper}>
      {/* ヘッダー行 */}
      <div style={cardStyle.header}>
        <PriorityBadge priority={task.priority} />
        <span style={cardStyle.time}>約{task.estimatedMinutes}分</span>
      </div>

      {/* タイトル */}
      <p style={cardStyle.title}>{task.title}</p>

      {/* 説明 */}
      <p style={cardStyle.description}>{task.description}</p>

      {/* 関連 KPI */}
      <p style={cardStyle.relatedKPI}>
        <span style={cardStyle.relatedKPILabel}>関連KPI：</span>
        {task.relatedKPI}
      </p>

      {/* ステータスラジオボタン */}
      <div style={cardStyle.radioGroup}>
        {STATUSES.map((status) => {
          const inputId = `${task.id}-${status}`;
          return (
            <label key={status} htmlFor={inputId} style={cardStyle.radioLabel}>
              <input
                id={inputId}
                type="radio"
                name={`status-${task.id}`}
                value={status}
                checked={task.status === status}
                onChange={() => onStatusChange(task.id, status)}
                style={cardStyle.radio}
              />
              <span
                style={{
                  ...cardStyle.radioText,
                  ...(task.status === status
                    ? STATUS_ACTIVE_STYLES[status]
                    : {}),
                }}
              >
                {TODO_STATUS_LABELS[status]}
              </span>
            </label>
          );
        })}
      </div>

      {/* 理由入力（途中 / できなかった のみ） */}
      {needsReason && (
        <div style={cardStyle.reasonWrapper}>
          <label
            htmlFor={`reason-${task.id}`}
            style={cardStyle.reasonLabel}
          >
            理由・コメント
          </label>
          <textarea
            id={`reason-${task.id}`}
            value={task.reason}
            onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) =>
              onReasonChange(task.id, e.target.value)
            }
            placeholder="理由や状況を入力してください"
            rows={3}
            style={cardStyle.textarea}
          />
        </div>
      )}
    </div>
  );
};

const cardStyle: Record<string, React.CSSProperties> = {
  wrapper: {
    background: '#fff',
    border: '1px solid #e2e8f0',
    borderRadius: '8px',
    padding: '16px',
    display: 'flex',
    flexDirection: 'column',
    gap: '10px',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  time: {
    fontSize: '12px',
    color: '#718096',
    background: '#edf2f7',
    padding: '2px 8px',
    borderRadius: '10px',
  },
  title: {
    margin: 0,
    fontSize: '16px',
    fontWeight: 'bold',
    color: '#1a202c',
    lineHeight: '1.5',
  },
  description: {
    margin: 0,
    fontSize: '14px',
    color: '#4a5568',
    lineHeight: '1.6',
  },
  relatedKPI: {
    margin: 0,
    fontSize: '13px',
    color: '#718096',
  },
  relatedKPILabel: {
    fontWeight: 'bold',
    color: '#4a5568',
  },
  radioGroup: {
    display: 'flex',
    gap: '16px',
    flexWrap: 'wrap',
    paddingTop: '4px',
  },
  radioLabel: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    cursor: 'pointer',
  },
  radio: {
    cursor: 'pointer',
  },
  radioText: {
    fontSize: '14px',
    color: '#4a5568',
  },
  reasonWrapper: {
    display: 'flex',
    flexDirection: 'column',
    gap: '6px',
  },
  reasonLabel: {
    fontSize: '13px',
    fontWeight: 'bold',
    color: '#718096',
  },
  textarea: {
    padding: '8px 10px',
    fontSize: '14px',
    border: '1px solid #cbd5e0',
    borderRadius: '4px',
    resize: 'vertical',
    outline: 'none',
  },
};

// ---- DailyTaskInstruction (メインコンポーネント) ----------------------------

const DailyTaskInstruction: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const state = location.state as LocationState | null;
  const todayDate = getTodayDate();

  const [loadStatus, setLoadStatus] = useState<LoadStatus>('loading');
  const [tasks, setTasks] = useState<DailyTask[]>([]);
  const [loadError, setLoadError] = useState<string>('');

  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [submitError, setSubmitError] = useState<string>('');

  const completionRate = useMemo(() => calcCompletionRate(tasks), [tasks]);
  const completedCount = useMemo(
    () => tasks.filter((t) => t.status === 'completed').length,
    [tasks]
  );

  const loadTasks = useCallback(
    async (report: WeeklyTodoReport): Promise<void> => {
      setLoadStatus('loading');
      setLoadError('');
      try {
        const fetched = await fetchDailyTasks(report, todayDate);
        const withState: DailyTask[] = sortByPriority(
          fetched.map((t) => ({ ...t, status: null, reason: '' }))
        );
        setTasks(withState);
        setLoadStatus('success');
      } catch (err) {
        setLoadError(
          err instanceof Error ? err.message : '予期しないエラーが発生しました。'
        );
        setLoadStatus('error');
      }
    },
    [todayDate]
  );

  useEffect(() => {
    if (!state?.report) return;
    loadTasks(state.report);
  }, [state, loadTasks]);

  // ---- データなし ----
  if (!state?.report) {
    return (
      <div style={pageStyle.container}>
        <p>データがありません。</p>
        <button style={pageStyle.btnSecondary} onClick={() => navigate('/')}>
          最初に戻る
        </button>
      </div>
    );
  }

  const { report } = state;

  // ---- ハンドラ ----

  const handleStatusChange = (id: string, status: TodoStatus): void => {
    setTasks((prev) =>
      prev.map((t) =>
        t.id === id
          ? { ...t, status, reason: status === 'completed' ? '' : t.reason }
          : t
      )
    );
  };

  const handleReasonChange = (id: string, reason: string): void => {
    setTasks((prev) =>
      prev.map((t) => (t.id === id ? { ...t, reason } : t))
    );
  };

  const handleSubmit = async (): Promise<void> => {
    setSubmitError('');
    setIsSubmitting(true);

    const dailyReport: DailyReport = {
      goalFormData: report.goalFormData,
      kpiData: report.kpiData,
      date: todayDate,
      tasks,
      completionRate,
      createdAt: new Date().toISOString(),
    };

    try {
      await addDoc(collection(db, 'dailyReports'), dailyReport);
      navigate('/', { state: { savedDate: todayDate } });
    } catch (err) {
      setSubmitError(
        err instanceof Error ? err.message : 'Firestore への保存に失敗しました。'
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div style={pageStyle.container}>
      <h1 style={pageStyle.title}>今日のタスク指示</h1>
      <p style={pageStyle.subtitle}>
        {formatDate(todayDate)}　ゴール：<strong>{report.goalFormData.goal}</strong>
      </p>

      {/* ---- ローディング ---- */}
      {loadStatus === 'loading' && (
        <div style={pageStyle.loadingBox}>
          <div style={pageStyle.spinner} />
          <p style={pageStyle.loadingText}>
            AIが今日のタスクを選定中...
          </p>
        </div>
      )}

      {/* ---- エラー（ロード失敗） ---- */}
      {loadStatus === 'error' && (
        <div style={pageStyle.errorBox}>
          <p style={pageStyle.errorText}>{loadError}</p>
          <button
            style={pageStyle.btnPrimary}
            onClick={() => loadTasks(report)}
          >
            再試行する
          </button>
        </div>
      )}

      {/* ---- 成功 ---- */}
      {loadStatus === 'success' && (
        <>
          {/* タスク一覧 */}
          <div style={pageStyle.taskList}>
            {tasks.map((task) => (
              <TaskCard
                key={task.id}
                task={task}
                onStatusChange={handleStatusChange}
                onReasonChange={handleReasonChange}
              />
            ))}
          </div>

          {/* 実行率サマリー */}
          <div style={pageStyle.summaryBox}>
            <div style={pageStyle.summaryRow}>
              <span style={pageStyle.summaryLabel}>今日の実行率</span>
              <span
                style={{
                  ...pageStyle.summaryRate,
                  color:
                    completionRate >= 80
                      ? '#276749'
                      : completionRate >= 50
                      ? '#c05621'
                      : '#9b2c2c',
                }}
              >
                {completionRate}%
              </span>
            </div>
            <div style={pageStyle.progressTrack}>
              <div
                style={{
                  ...pageStyle.progressFill,
                  width: `${completionRate}%`,
                  backgroundColor:
                    completionRate >= 80
                      ? '#276749'
                      : completionRate >= 50
                      ? '#c05621'
                      : '#9b2c2c',
                }}
              />
            </div>
            <p style={pageStyle.summaryDetail}>
              {tasks.length}件中 {completedCount}件完了
            </p>
          </div>

          {/* 保存エラー */}
          {submitError && (
            <div style={pageStyle.errorBox}>
              <p style={pageStyle.errorText}>{submitError}</p>
            </div>
          )}

          {/* アクションボタン */}
          <div style={pageStyle.actions}>
            <button
              style={{
                ...pageStyle.btnPrimary,
                ...(isSubmitting ? pageStyle.btnDisabled : {}),
              }}
              onClick={handleSubmit}
              disabled={isSubmitting}
            >
              {isSubmitting ? '保存中...' : '今日の報告を完了する'}
            </button>
            <button
              style={pageStyle.btnSecondary}
              onClick={() => navigate(-1)}
              disabled={isSubmitting}
            >
              戻る
            </button>
          </div>
        </>
      )}
    </div>
  );
};

const spinnerKeyframes = `@keyframes spin { to { transform: rotate(360deg); } }`;
if (typeof document !== 'undefined') {
  const s = document.createElement('style');
  s.textContent = spinnerKeyframes;
  document.head.appendChild(s);
}

const pageStyle: Record<string, React.CSSProperties> = {
  container: {
    maxWidth: '700px',
    margin: '40px auto',
    padding: '0 20px',
    fontFamily: 'sans-serif',
  },
  title: {
    fontSize: '24px',
    marginBottom: '8px',
    color: '#1a202c',
  },
  subtitle: {
    fontSize: '14px',
    color: '#4a5568',
    marginBottom: '24px',
    lineHeight: '1.6',
  },
  loadingBox: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    padding: '60px 0',
    gap: '16px',
  },
  spinner: {
    width: '40px',
    height: '40px',
    border: '4px solid #e2e8f0',
    borderTopColor: '#3182ce',
    borderRadius: '50%',
    animation: 'spin 0.8s linear infinite',
  },
  loadingText: {
    color: '#4a5568',
    fontSize: '15px',
  },
  errorBox: {
    background: '#fff5f5',
    border: '1px solid #fed7d7',
    borderRadius: '6px',
    padding: '16px',
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
    marginBottom: '16px',
  },
  errorText: {
    margin: 0,
    fontSize: '14px',
    color: '#c53030',
  },
  taskList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
    marginBottom: '24px',
  },
  summaryBox: {
    background: '#f7fafc',
    border: '1px solid #e2e8f0',
    borderRadius: '6px',
    padding: '16px',
    marginBottom: '24px',
  },
  summaryRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'baseline',
    marginBottom: '8px',
  },
  summaryLabel: {
    fontSize: '14px',
    fontWeight: 'bold',
    color: '#4a5568',
  },
  summaryRate: {
    fontSize: '28px',
    fontWeight: 'bold',
  },
  progressTrack: {
    height: '12px',
    background: '#e2e8f0',
    borderRadius: '6px',
    overflow: 'hidden',
    marginBottom: '8px',
  },
  progressFill: {
    height: '100%',
    borderRadius: '6px',
    transition: 'width 0.3s ease',
  },
  summaryDetail: {
    margin: 0,
    fontSize: '13px',
    color: '#718096',
    textAlign: 'right',
  },
  actions: {
    display: 'flex',
    gap: '12px',
    marginBottom: '40px',
  },
  btnPrimary: {
    padding: '12px 24px',
    fontSize: '15px',
    backgroundColor: '#3182ce',
    color: '#fff',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
    fontWeight: 'bold',
  },
  btnSecondary: {
    padding: '12px 24px',
    fontSize: '15px',
    backgroundColor: '#e2e8f0',
    color: '#2d3748',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
  },
  btnDisabled: {
    opacity: 0.6,
    cursor: 'not-allowed',
  },
};

export default DailyTaskInstruction;
