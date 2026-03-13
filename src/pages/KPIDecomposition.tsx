import React, { useEffect, useState, useCallback } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { GoalFormData } from '../types/goal';
import { KPIDecompositionResult, KPIItem } from '../types/kpi';
import { fetchKPIDecomposition } from '../api/kpiDecomposition';

interface LocationState {
  formData: GoalFormData;
}

type Status = 'loading' | 'success' | 'error';

// ---- KPICard ----------------------------------------------------------------

interface KPICardProps {
  kpi: KPIItem;
  isExpanded: boolean;
  isMain: boolean;
  onToggle: (id: string) => void;
}

const KPICard: React.FC<KPICardProps> = ({ kpi, isExpanded, isMain, onToggle }) => {
  return (
    <div style={{ ...cardStyles.wrapper, ...(isMain ? cardStyles.mainWrapper : {}) }}>
      {/* アコーディオンヘッダー */}
      <button
        style={{ ...cardStyles.header, ...(isMain ? cardStyles.mainHeader : {}) }}
        onClick={() => onToggle(kpi.id)}
        aria-expanded={isExpanded}
      >
        <span style={cardStyles.headerLabel}>
          {isMain && <span style={cardStyles.badge}>メインKPI</span>}
          {kpi.name}
        </span>
        <span style={cardStyles.chevron}>{isExpanded ? '▲' : '▼'}</span>
      </button>

      {/* アコーディオン本体 */}
      {isExpanded && (
        <div style={cardStyles.body}>
          <dl style={cardStyles.dl}>
            <dt style={cardStyles.dt}>説明</dt>
            <dd style={cardStyles.dd}>{kpi.description}</dd>

            <dt style={cardStyles.dt}>測定方法</dt>
            <dd style={cardStyles.dd}>{kpi.measurementMethod}</dd>

            <dt style={cardStyles.dt}>目標値・達成基準</dt>
            <dd style={cardStyles.dd}>{kpi.targetValue}</dd>

            {kpi.relatedSubGoals.length > 0 && (
              <>
                <dt style={cardStyles.dt}>関連するサブゴール</dt>
                <dd style={cardStyles.dd}>
                  <ul style={cardStyles.subGoalList}>
                    {kpi.relatedSubGoals.map((sg, i) => (
                      <li key={i} style={cardStyles.subGoalItem}>
                        {sg}
                      </li>
                    ))}
                  </ul>
                </dd>
              </>
            )}
          </dl>
        </div>
      )}
    </div>
  );
};

const cardStyles: Record<string, React.CSSProperties> = {
  wrapper: {
    border: '1px solid #e2e8f0',
    borderRadius: '6px',
    overflow: 'hidden',
  },
  mainWrapper: {
    border: '2px solid #3182ce',
  },
  header: {
    width: '100%',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '14px 16px',
    background: '#f7fafc',
    border: 'none',
    cursor: 'pointer',
    textAlign: 'left',
    fontSize: '15px',
    fontWeight: 'bold',
    color: '#2d3748',
  },
  mainHeader: {
    background: '#ebf8ff',
    color: '#2b6cb0',
  },
  headerLabel: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  },
  badge: {
    display: 'inline-block',
    padding: '2px 8px',
    fontSize: '11px',
    fontWeight: 'bold',
    background: '#3182ce',
    color: '#fff',
    borderRadius: '12px',
  },
  chevron: {
    fontSize: '12px',
    color: '#718096',
    flexShrink: 0,
  },
  body: {
    padding: '16px',
    background: '#fff',
    borderTop: '1px solid #e2e8f0',
  },
  dl: {
    margin: 0,
    display: 'grid',
    gridTemplateColumns: '120px 1fr',
    gap: '8px 12px',
    alignItems: 'start',
  },
  dt: {
    fontSize: '13px',
    fontWeight: 'bold',
    color: '#4a5568',
    paddingTop: '2px',
  },
  dd: {
    margin: 0,
    fontSize: '14px',
    color: '#2d3748',
    lineHeight: '1.6',
  },
  subGoalList: {
    margin: 0,
    paddingLeft: '18px',
  },
  subGoalItem: {
    fontSize: '14px',
    color: '#2d3748',
    marginBottom: '4px',
  },
};

// ---- KPIDecomposition (メインコンポーネント) --------------------------------

const KPIDecomposition: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const state = location.state as LocationState | null;

  const [status, setStatus] = useState<Status>('loading');
  const [kpiData, setKpiData] = useState<KPIDecompositionResult | null>(null);
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [expandedIds, setExpandedIds] = useState<Set<string>>(
    new Set(['main'])
  );

  const loadKPIs = useCallback(async (formData: GoalFormData): Promise<void> => {
    setStatus('loading');
    setErrorMessage('');
    try {
      const result = await fetchKPIDecomposition(formData);
      setKpiData(result);
      setStatus('success');
    } catch (err) {
      const message = err instanceof Error ? err.message : '予期しないエラーが発生しました。';
      setErrorMessage(message);
      setStatus('error');
    }
  }, []);

  useEffect(() => {
    if (!state?.formData) return;
    loadKPIs(state.formData);
  }, [state, loadKPIs]);

  const toggleExpanded = (id: string): void => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  // ---- データなし ----
  if (!state?.formData) {
    return (
      <div style={pageStyles.container}>
        <p>データがありません。</p>
        <button style={pageStyles.btnSecondary} onClick={() => navigate('/')}>
          最初に戻る
        </button>
      </div>
    );
  }

  const { formData } = state;

  return (
    <div style={pageStyles.container}>
      <h1 style={pageStyles.title}>KPI自動分解</h1>
      <p style={pageStyles.subtitle}>
        ゴール：<strong>{formData.goal}</strong>
      </p>

      {/* ---- ローディング ---- */}
      {status === 'loading' && (
        <div style={pageStyles.loadingBox}>
          <div style={pageStyles.spinner} />
          <p style={pageStyles.loadingText}>AIがKPIを分解中...</p>
        </div>
      )}

      {/* ---- エラー ---- */}
      {status === 'error' && (
        <div style={pageStyles.errorBox}>
          <p style={pageStyles.errorText}>{errorMessage}</p>
          <button
            style={pageStyles.btnPrimary}
            onClick={() => loadKPIs(formData)}
          >
            再試行する
          </button>
        </div>
      )}

      {/* ---- 成功 ---- */}
      {status === 'success' && kpiData && (
        <>
          <div style={pageStyles.kpiList}>
            {/* メインKPI */}
            <KPICard
              kpi={kpiData.mainKPI}
              isExpanded={expandedIds.has(kpiData.mainKPI.id)}
              isMain={true}
              onToggle={toggleExpanded}
            />

            {/* サブKPI群 */}
            {kpiData.subKPIs.map((kpi) => (
              <KPICard
                key={kpi.id}
                kpi={kpi}
                isExpanded={expandedIds.has(kpi.id)}
                isMain={false}
                onToggle={toggleExpanded}
              />
            ))}
          </div>

          {/* ---- アクションボタン ---- */}
          <div style={pageStyles.actions}>
            <button
              style={pageStyles.btnPrimary}
              onClick={() => navigate('/pdca-plan', { state: { formData, kpiData } })}
            >
              次へ進む
            </button>
            <button
              style={pageStyles.btnSecondary}
              onClick={() => navigate('/', { state: { formData } })}
            >
              修正する
            </button>
          </div>
          <div style={pageStyles.backLinkWrapper}>
            <button style={pageStyles.btnLink} onClick={() => navigate('/')}>
              最初に戻る
            </button>
          </div>
        </>
      )}
    </div>
  );
};

const spinnerKeyframes = `
@keyframes spin {
  to { transform: rotate(360deg); }
}
`;
if (typeof document !== 'undefined') {
  const style = document.createElement('style');
  style.textContent = spinnerKeyframes;
  document.head.appendChild(style);
}

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
    padding: '20px',
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
  },
  errorText: {
    color: '#c53030',
    fontSize: '14px',
    margin: 0,
    whiteSpace: 'pre-wrap',
  },
  kpiList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
    marginBottom: '32px',
  },
  actions: {
    display: 'flex',
    gap: '12px',
    marginBottom: '12px',
  },
  backLinkWrapper: {
    textAlign: 'center',
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
  btnLink: {
    background: 'none',
    border: 'none',
    color: '#718096',
    fontSize: '13px',
    cursor: 'pointer',
    textDecoration: 'underline',
  },
};

export default KPIDecomposition;
