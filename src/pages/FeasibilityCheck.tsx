import React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { GoalFormData } from '../types/goal';

interface LocationState {
  formData: GoalFormData;
}

const FeasibilityCheck: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const state = location.state as LocationState | null;

  if (!state) {
    return (
      <div style={{ padding: '40px', fontFamily: 'sans-serif' }}>
        <p>データがありません。</p>
        <button onClick={() => navigate('/')}>ゴール入力に戻る</button>
      </div>
    );
  }

  const { goal, deadline, currentSituation } = state.formData;

  return (
    <div style={{ maxWidth: '600px', margin: '40px auto', padding: '0 20px', fontFamily: 'sans-serif' }}>
      <h1 style={{ fontSize: '24px', marginBottom: '24px', color: '#333' }}>
        実現可能性チェック
      </h1>
      <dl style={{ lineHeight: '1.8' }}>
        <dt style={{ fontWeight: 'bold' }}>ゴール</dt>
        <dd>{goal}</dd>
        <dt style={{ fontWeight: 'bold' }}>期限</dt>
        <dd>{deadline || '未設定'}</dd>
        <dt style={{ fontWeight: 'bold' }}>現在の状況</dt>
        <dd>{currentSituation || '未入力'}</dd>
      </dl>
      <button
        onClick={() => navigate('/')}
        style={{ marginTop: '24px', padding: '10px 20px', cursor: 'pointer' }}
      >
        ゴール入力に戻る
      </button>
    </div>
  );
};

export default FeasibilityCheck;
