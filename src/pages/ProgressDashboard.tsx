import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  collection,
  query,
  orderBy,
  limit,
  getDocs,
  QueryDocumentSnapshot,
  DocumentData,
} from 'firebase/firestore';
import { db } from '../lib/firebase';
import { GoalFormData } from '../types/goal';
import { KPIDecompositionResult, KPIItem } from '../types/kpi';
import { TodoItem, TodoStatus, TODO_STATUS_LABELS, WeeklyTodoReport } from '../types/weeklyTodo';

// ---- Firestore 型ガード -----------------------------------------------------

interface WeeklyReportDocument extends WeeklyTodoReport {
  id: string;
}

function isGoalFormData(v: unknown): v is GoalFormData {
  return typeof v === 'object' && v !== null && 'goal' in v;
}

function isKPIDecompositionResult(v: unknown): v is KPIDecompositionResult {
  return (
    typeof v === 'object' &&
    v !== null &&
    'mainKPI' in v &&
    'subKPIs' in v &&
    Array.isArray((v as Record<string, unknown>).subKPIs)
  );
}

function isTodoItemArray(v: unknown): v is TodoItem[] {
  return Array.isArray(v);
}

function parseWeeklyReportDoc(
  doc: QueryDocumentSnapshot<DocumentData>
): WeeklyReportDocument {
  const raw = doc.data() as unknown;
  if (typeof raw !== 'object' || raw === null) {
    throw new Error('Firestoreドキュメントの形式が不正です。');
  }
  const d = raw as Record<string, unknown>;

  if (!isGoalFormData(d.goalFormData)) {
    throw new Error('goalFormData の形式が不正です。');
  }
  if (!isKPIDecompositionResult(d.kpiData)) {
    throw new Error('kpiData の形式が不正です。');
  }
  if (!isTodoItemArray(d.todos)) {
    throw new Error('todos の形式が不正です。');
  }

  return {
    id: doc.id,
    goalFormData: d.goalFormData,
    kpiData: d.kpiData,
    todos: d.todos,
    completionRate:
      typeof d.completionRate === 'number' ? d.completionRate : 0,
    createdAt: typeof d.createdAt === 'string' ? d.createdAt : '',
  };
}

// ---- ユーティリティ ---------------------------------------------------------

function formatDate(isoString: string): string {
  if (!isoString) return '';
  const d = new Date(isoString);
  return `${d.getFullYear()}年${d.getMonth() + 1}月${d.getDate()}日`;
}

function findTodoStatus(
  todos: TodoItem[],
  kpiId: string
): TodoStatus | null {
  return todos.find((t) => t.kpiId === kpiId)?.status ?? null;
}

// ---- KPI 達成度バッジ -------------------------------------------------------

const STATUS_BADGE: Record<
  TodoStatus,
  { label: string; bg: string; color: string; border: string }
> = {
  completed: {
    label: TODO_STATUS_LABELS.completed,
    bg: '#f0fff4',
    color: '#276749',
    border: '#9ae6b4',
  },
  in_progress: {
    label: TODO_STATUS_LABELS.in_progress,
    bg: '#fffaf0',
    color: '#c05621',
    border: '#fbd38d',
  },
  failed: {
    label: TODO_STATUS_LABELS.failed,
    bg: '#fff5f5',
    color: '#9b2c2c',
    border: '#feb2b2',
  },
};

const UNSET_BADGE = {
  label: '未実施',
  bg: '#f7fafc',
  color: '#718096',
  border: '#cbd5e0',
};

interface StatusBadgeProps {
  status: TodoStatus | null;
}
const StatusBadge: React.FC<StatusBadgeProps> = ({ status }) => {
  const s = status ? STATUS_BADGE[status] : UNSET_BADGE;
  return (
    <span
      style={{
        display: 'inline-block',
        padding: '3px 10px',
        borderRadius: '12px',
        fontSize: '12px',
        fontWeight: 'bold',
        background: s.bg,
        color: s.color,
        border: `1px solid ${s.border}`,
        whiteSpace: 'nowrap',
      }}
    >
      {s.label}
    </span>
  );
};

// ---- 完了率バー -------------------------------------------------------------

interface CompletionBarProps {
  rate: number;
  completedCount: number;
  totalCount: number;
}

const CompletionBar: React.FC<CompletionBarProps> = ({
  rate,
  completedCount,
  totalCount,
}) => {
  const color =
    rate >= 80 ? '#276749' : rate >= 50 ? '#c05621' : '#9b2c2c';

  return (
    <div style={barStyle.wrapper}>
      <div style={barStyle.header}>
        <span style={barStyle.label}>今週のTo Do実行率</span>
        <span style={{ ...barStyle.rate, color }}>{rate}%</span>
      </div>
      <div style={barStyle.track}>
        <div
          style={{
            ...barStyle.fill,
            width: `${rate}%`,
            backgroundColor: color,
          }}
        />
      </div>
      <p style={barStyle.detail}>
        {totalCount}件中 {completedCount}件完了
      </p>
    </div>
  );
};

const barStyle: Record<string, React.CSSProperties> = {
  wrapper: {
    background: '#fff',
    border: '1px solid #e2e8f0',
    borderRadius: '8px',
    padding: '16px 20px',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'baseline',
    marginBottom: '10px',
  },
  label: {
    fontSize: '14px',
    fontWeight: 'bold',
    color: '#4a5568',
  },
  rate: {
    fontSize: '32px',
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
    transition: 'width 0.4s ease',
  },
  detail: {
    margin: 0,
    fontSize: '13px',
    color: '#718096',
    textAlign: 'right',
  },
};

// ---- KPI 達成度リスト -------------------------------------------------------

interface KPIAchievementListProps {
  kpiData: KPIDecompositionResult;
  todos: TodoItem[];
}

const KPIAchievementList: React.FC<KPIAchievementListProps> = ({
  kpiData,
  todos,
}) => {
  const allKPIs: KPIItem[] = [kpiData.mainKPI, ...kpiData.subKPIs];

  return (
    <div style={listStyle.wrapper}>
      <h2 style={listStyle.heading}>KPIごとの達成度</h2>
      <div style={listStyle.list}>
        {allKPIs.map((kpi, index) => {
          const status = findTodoStatus(todos, kpi.id);
          const isMain = kpi.id === 'main';
          return (
            <div
              key={kpi.id}
              style={{
                ...listStyle.row,
                ...(isMain ? listStyle.mainRow : {}),
              }}
            >
              <div style={listStyle.kpiInfo}>
                {isMain && <span style={listStyle.mainBadge}>メイン</span>}
                <span style={listStyle.kpiIndex}>{index + 1}.</span>
                <span style={listStyle.kpiName}>{kpi.name}</span>
              </div>
              <StatusBadge status={status} />
            </div>
          );
        })}
      </div>
    </div>
  );
};

const listStyle: Record<string, React.CSSProperties> = {
  wrapper: {
    background: '#fff',
    border: '1px solid #e2e8f0',
    borderRadius: '8px',
    overflow: 'hidden',
  },
  heading: {
    margin: 0,
    padding: '12px 20px',
    fontSize: '14px',
    fontWeight: 'bold',
    color: '#4a5568',
    background: '#f7fafc',
    borderBottom: '1px solid #e2e8f0',
  },
  list: {
    display: 'flex',
    flexDirection: 'column',
  },
  row: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '12px 20px',
    borderBottom: '1px solid #edf2f7',
    gap: '12px',
  },
  mainRow: {
    background: '#ebf8ff',
  },
  kpiInfo: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    minWidth: 0,
  },
  mainBadge: {
    flexShrink: 0,
    display: 'inline-block',
    padding: '1px 6px',
    fontSize: '10px',
    fontWeight: 'bold',
    background: '#3182ce',
    color: '#fff',
    borderRadius: '4px',
  },
  kpiIndex: {
    flexShrink: 0,
    fontSize: '13px',
    color: '#a0aec0',
  },
  kpiName: {
    fontSize: '14px',
    color: '#2d3748',
    lineHeight: '1.4',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },
};

// ---- ProgressDashboard (メインコンポーネント) --------------------------------

type LoadStatus = 'loading' | 'success' | 'empty' | 'error';

const ProgressDashboard: React.FC = () => {
  const navigate = useNavigate();

  const [loadStatus, setLoadStatus] = useState<LoadStatus>('loading');
  const [report, setReport] = useState<WeeklyReportDocument | null>(null);
  const [errorMessage, setErrorMessage] = useState<string>('');

  const fetchLatestReport = async (): Promise<void> => {
    setLoadStatus('loading');
    setErrorMessage('');
    try {
      const q = query(
        collection(db, 'weeklyReports'),
        orderBy('createdAt', 'desc'),
        limit(1)
      );
      const snap = await getDocs(q);

      if (snap.empty) {
        setLoadStatus('empty');
        return;
      }

      const doc: QueryDocumentSnapshot<DocumentData> = snap.docs[0];
      const parsed = parseWeeklyReportDoc(doc);
      setReport(parsed);
      setLoadStatus('success');
    } catch (err) {
      setErrorMessage(
        err instanceof Error ? err.message : '予期しないエラーが発生しました。'
      );
      setLoadStatus('error');
    }
  };

  useEffect(() => {
    fetchLatestReport();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const completedCount =
    report?.todos.filter((t) => t.status === 'completed').length ?? 0;
  const totalCount = report?.todos.length ?? 0;

  return (
    <div style={pageStyle.container}>
      <h1 style={pageStyle.title}>進捗ダッシュボード</h1>

      {/* ---- ローディング ---- */}
      {loadStatus === 'loading' && (
        <div style={pageStyle.centerBox}>
          <div style={pageStyle.spinner} />
          <p style={pageStyle.mutedText}>データを読み込み中...</p>
        </div>
      )}

      {/* ---- エラー ---- */}
      {loadStatus === 'error' && (
        <div style={pageStyle.errorBox}>
          <p style={pageStyle.errorText}>{errorMessage}</p>
          <button style={pageStyle.btnSecondary} onClick={fetchLatestReport}>
            再試行する
          </button>
        </div>
      )}

      {/* ---- データなし ---- */}
      {loadStatus === 'empty' && (
        <div style={pageStyle.emptyBox}>
          <p style={pageStyle.mutedText}>
            まだ週間レポートがありません。
            <br />
            ゴールを入力してPDCAサイクルを開始しましょう。
          </p>
          <button style={pageStyle.btnPrimary} onClick={() => navigate('/')}>
            ゴール入力へ
          </button>
        </div>
      )}

      {/* ---- 成功 ---- */}
      {loadStatus === 'success' && report && (
        <>
          {/* サマリーヘッダー */}
          <div style={pageStyle.summaryHeader}>
            <p style={pageStyle.goalText}>
              <span style={pageStyle.goalLabel}>ゴール</span>
              {report.goalFormData.goal}
            </p>
            <p style={pageStyle.dateText}>
              最終更新：{formatDate(report.createdAt)}
            </p>
          </div>

          {/* 実行率バー */}
          <div style={pageStyle.section}>
            <CompletionBar
              rate={report.completionRate}
              completedCount={completedCount}
              totalCount={totalCount}
            />
          </div>

          {/* KPI達成度リスト */}
          <div style={pageStyle.section}>
            <KPIAchievementList
              kpiData={report.kpiData}
              todos={report.todos}
            />
          </div>

          {/* アクションボタン */}
          <div style={pageStyle.actions}>
            <button
              style={pageStyle.btnPrimary}
              onClick={() =>
                navigate('/weekly-retrospective', { state: { report } })
              }
            >
              週間振り返りへ進む
            </button>
            <button
              style={pageStyle.btnSecondary}
              onClick={() => navigate('/')}
            >
              最初に戻る
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
    maxWidth: '680px',
    margin: '40px auto',
    padding: '0 20px',
    fontFamily: 'sans-serif',
  },
  title: {
    fontSize: '24px',
    marginBottom: '20px',
    color: '#1a202c',
  },
  centerBox: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    padding: '60px 0',
    gap: '16px',
  },
  spinner: {
    width: '36px',
    height: '36px',
    border: '4px solid #e2e8f0',
    borderTopColor: '#3182ce',
    borderRadius: '50%',
    animation: 'spin 0.8s linear infinite',
  },
  errorBox: {
    background: '#fff5f5',
    border: '1px solid #fed7d7',
    borderRadius: '8px',
    padding: '20px',
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
  },
  errorText: {
    margin: 0,
    fontSize: '14px',
    color: '#c53030',
  },
  emptyBox: {
    background: '#f7fafc',
    border: '1px solid #e2e8f0',
    borderRadius: '8px',
    padding: '40px 20px',
    textAlign: 'center',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '20px',
  },
  mutedText: {
    margin: 0,
    fontSize: '14px',
    color: '#718096',
    lineHeight: '1.8',
    textAlign: 'center',
  },
  summaryHeader: {
    marginBottom: '20px',
    padding: '16px 20px',
    background: '#f7fafc',
    border: '1px solid #e2e8f0',
    borderRadius: '8px',
    display: 'flex',
    flexDirection: 'column',
    gap: '6px',
  },
  goalLabel: {
    display: 'inline-block',
    marginRight: '8px',
    padding: '1px 8px',
    fontSize: '11px',
    fontWeight: 'bold',
    background: '#3182ce',
    color: '#fff',
    borderRadius: '4px',
  },
  goalText: {
    margin: 0,
    fontSize: '15px',
    color: '#2d3748',
    lineHeight: '1.6',
  },
  dateText: {
    margin: 0,
    fontSize: '12px',
    color: '#a0aec0',
  },
  section: {
    marginBottom: '16px',
  },
  actions: {
    display: 'flex',
    gap: '12px',
    marginTop: '24px',
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
};

export default ProgressDashboard;
