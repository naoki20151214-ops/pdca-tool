import React, { useState, useMemo } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { collection, addDoc } from 'firebase/firestore';
import { GoalFormData } from '../types/goal';
import { KPIDecompositionResult } from '../types/kpi';
import {
  TodoItem,
  TodoStatus,
  WeeklyTodoReport,
  TODO_STATUS_LABELS,
} from '../types/weeklyTodo';
import { db } from '../lib/firebase';

// ---- 型 --------------------------------------------------------------------

interface LocationState {
  formData: GoalFormData;
  kpiData: KPIDecompositionResult;
}

// ---- ユーティリティ ---------------------------------------------------------

function initializeTodos(kpiData: KPIDecompositionResult): TodoItem[] {
  return [kpiData.mainKPI, ...kpiData.subKPIs].map((kpi) => ({
    kpiId: kpi.id,
    kpiName: kpi.name,
    status: null,
    reason: '',
  }));
}

function calcCompletionRate(todos: TodoItem[]): number {
  if (todos.length === 0) return 0;
  const completed = todos.filter((t) => t.status === 'completed').length;
  return Math.round((completed / todos.length) * 100);
}

// ---- TodoRow ----------------------------------------------------------------

interface TodoRowProps {
  item: TodoItem;
  index: number;
  onStatusChange: (kpiId: string, status: TodoStatus) => void;
  onReasonChange: (kpiId: string, reason: string) => void;
}

const STATUSES: TodoStatus[] = ['completed', 'in_progress', 'failed'];

const TodoRow: React.FC<TodoRowProps> = ({
  item,
  index,
  onStatusChange,
  onReasonChange,
}) => {
  const needsReason = item.status === 'in_progress' || item.status === 'failed';

  return (
    <div style={rowStyles.wrapper}>
      {/* KPI 名 */}
      <div style={rowStyles.kpiName}>
        <span style={rowStyles.index}>{index + 1}</span>
        {item.kpiName}
      </div>

      {/* ラジオボタン */}
      <div style={rowStyles.radioGroup}>
        {STATUSES.map((status) => {
          const labelId = `${item.kpiId}-${status}`;
          return (
            <label key={status} htmlFor={labelId} style={rowStyles.radioLabel}>
              <input
                id={labelId}
                type="radio"
                name={`status-${item.kpiId}`}
                value={status}
                checked={item.status === status}
                onChange={() => onStatusChange(item.kpiId, status)}
                style={rowStyles.radio}
              />
              <span
                style={{
                  ...rowStyles.radioText,
                  ...(item.status === status
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

      {/* 理由入力欄（途中 / できなかった のときだけ） */}
      {needsReason && (
        <div style={rowStyles.reasonWrapper}>
          <label
            htmlFor={`reason-${item.kpiId}`}
            style={rowStyles.reasonLabel}
          >
            理由・コメント
          </label>
          <textarea
            id={`reason-${item.kpiId}`}
            value={item.reason}
            onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) =>
              onReasonChange(item.kpiId, e.target.value)
            }
            placeholder="理由や状況を入力してください"
            rows={3}
            style={rowStyles.reasonTextarea}
          />
        </div>
      )}
    </div>
  );
};

const STATUS_ACTIVE_STYLES: Record<TodoStatus, React.CSSProperties> = {
  completed: { color: '#276749', fontWeight: 'bold' },
  in_progress: { color: '#c05621', fontWeight: 'bold' },
  failed: { color: '#9b2c2c', fontWeight: 'bold' },
};

const rowStyles: Record<string, React.CSSProperties> = {
  wrapper: {
    background: '#fff',
    border: '1px solid #e2e8f0',
    borderRadius: '6px',
    padding: '16px',
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
  },
  kpiName: {
    display: 'flex',
    alignItems: 'flex-start',
    gap: '10px',
    fontSize: '15px',
    fontWeight: 'bold',
    color: '#2d3748',
    lineHeight: '1.5',
  },
  index: {
    flexShrink: 0,
    width: '22px',
    height: '22px',
    background: '#3182ce',
    color: '#fff',
    borderRadius: '50%',
    fontSize: '12px',
    fontWeight: 'bold',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioGroup: {
    display: 'flex',
    gap: '16px',
    flexWrap: 'wrap',
    paddingLeft: '32px',
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
    paddingLeft: '32px',
  },
  reasonLabel: {
    fontSize: '13px',
    fontWeight: 'bold',
    color: '#718096',
  },
  reasonTextarea: {
    padding: '8px 10px',
    fontSize: '14px',
    border: '1px solid #cbd5e0',
    borderRadius: '4px',
    resize: 'vertical',
    outline: 'none',
  },
};

// ---- CompletionBar ----------------------------------------------------------

interface CompletionBarProps {
  rate: number;
  totalCount: number;
  completedCount: number;
}

const CompletionBar: React.FC<CompletionBarProps> = ({
  rate,
  totalCount,
  completedCount,
}) => {
  const barColor =
    rate >= 80 ? '#276749' : rate >= 50 ? '#c05621' : '#9b2c2c';

  return (
    <div style={barStyles.wrapper}>
      <div style={barStyles.header}>
        <span style={barStyles.label}>ToDo実行率</span>
        <span style={{ ...barStyles.rate, color: barColor }}>{rate}%</span>
      </div>
      <div style={barStyles.track}>
        <div
          style={{
            ...barStyles.fill,
            width: `${rate}%`,
            backgroundColor: barColor,
          }}
        />
      </div>
      <p style={barStyles.detail}>
        {totalCount}件中 {completedCount}件完了
      </p>
    </div>
  );
};

const barStyles: Record<string, React.CSSProperties> = {
  wrapper: {
    background: '#f7fafc',
    border: '1px solid #e2e8f0',
    borderRadius: '6px',
    padding: '16px',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'baseline',
    marginBottom: '8px',
  },
  label: {
    fontSize: '14px',
    fontWeight: 'bold',
    color: '#4a5568',
  },
  rate: {
    fontSize: '28px',
    fontWeight: 'bold',
  },
  track: {
    height: '12px',
    background: '#e2e8f0',
    borderRadius: '6px',
    overflow: 'hidden',
    marginBottom: '8px',
  },
  fill: {
    height: '100%',
    borderRadius: '6px',
    transition: 'width 0.3s ease',
  },
  detail: {
    margin: 0,
    fontSize: '13px',
    color: '#718096',
    textAlign: 'right',
  },
};

// ---- WeeklyTodoList (メインコンポーネント) ----------------------------------

const WeeklyTodoList: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const state = location.state as LocationState | null;

  const [todos, setTodos] = useState<TodoItem[]>(() =>
    state ? initializeTodos(state.kpiData) : []
  );
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [submitError, setSubmitError] = useState<string>('');

  const completedCount = useMemo(
    () => todos.filter((t) => t.status === 'completed').length,
    [todos]
  );
  const completionRate = useMemo(
    () => calcCompletionRate(todos),
    [todos]
  );

  // ---- データなし ----
  if (!state) {
    return (
      <div style={pageStyles.container}>
        <p>データがありません。</p>
        <button style={pageStyles.btnSecondary} onClick={() => navigate('/')}>
          最初に戻る
        </button>
      </div>
    );
  }

  const { formData, kpiData } = state;

  // ---- ハンドラ ----

  const handleStatusChange = (kpiId: string, status: TodoStatus): void => {
    setTodos((prev) =>
      prev.map((t) =>
        t.kpiId === kpiId
          ? { ...t, status, reason: status === 'completed' ? '' : t.reason }
          : t
      )
    );
  };

  const handleReasonChange = (kpiId: string, reason: string): void => {
    setTodos((prev) =>
      prev.map((t) => (t.kpiId === kpiId ? { ...t, reason } : t))
    );
  };

  const handleSubmit = async (): Promise<void> => {
    setSubmitError('');
    setIsSubmitting(true);

    const report: WeeklyTodoReport = {
      goalFormData: formData,
      kpiData,
      todos,
      completionRate,
      createdAt: new Date().toISOString(),
    };

    try {
      await addDoc(collection(db, 'weeklyReports'), report);
      navigate('/daily-task', { state: { report } });
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'Firestore への保存に失敗しました。';
      setSubmitError(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div style={pageStyles.container}>
      <h1 style={pageStyles.title}>週間ToDoリスト</h1>
      <p style={pageStyles.subtitle}>
        ゴール：<strong>{formData.goal}</strong>
      </p>

      {/* ToDoリスト */}
      <div style={pageStyles.list}>
        {todos.map((item, index) => (
          <TodoRow
            key={item.kpiId}
            item={item}
            index={index}
            onStatusChange={handleStatusChange}
            onReasonChange={handleReasonChange}
          />
        ))}
      </div>

      {/* 実行率 */}
      <div style={pageStyles.section}>
        <CompletionBar
          rate={completionRate}
          totalCount={todos.length}
          completedCount={completedCount}
        />
      </div>

      {/* エラー表示 */}
      {submitError && (
        <div style={pageStyles.errorBox}>
          <p style={pageStyles.errorText}>{submitError}</p>
        </div>
      )}

      {/* アクションボタン */}
      <div style={pageStyles.actions}>
        <button
          style={{
            ...pageStyles.btnPrimary,
            ...(isSubmitting ? pageStyles.btnDisabled : {}),
          }}
          onClick={handleSubmit}
          disabled={isSubmitting}
        >
          {isSubmitting ? '保存中...' : '今週の報告を完了する'}
        </button>
        <button
          style={pageStyles.btnSecondary}
          onClick={() => navigate(-1)}
          disabled={isSubmitting}
        >
          戻る
        </button>
      </div>
    </div>
  );
};

const pageStyles: Record<string, React.CSSProperties> = {
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
  list: {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
    marginBottom: '24px',
  },
  section: {
    marginBottom: '24px',
  },
  errorBox: {
    background: '#fff5f5',
    border: '1px solid #fed7d7',
    borderRadius: '6px',
    padding: '12px 16px',
    marginBottom: '16px',
  },
  errorText: {
    margin: 0,
    fontSize: '14px',
    color: '#c53030',
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

export default WeeklyTodoList;
