import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { GoalFormData } from '../types/goal';

const GoalInput: React.FC = () => {
  const navigate = useNavigate();

  const [formData, setFormData] = useState<GoalFormData>({
    goal: '',
    deadline: '',
    currentSituation: '',
  });
  const [goalError, setGoalError] = useState<string>('');

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ): void => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (name === 'goal' && value.trim() !== '') {
      setGoalError('');
    }
  };

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>): void => {
    e.preventDefault();
    if (formData.goal.trim() === '') {
      setGoalError('ゴールを入力してください。');
      return;
    }
    navigate('/feasibility-check', { state: { formData } });
  };

  return (
    <div style={styles.container}>
      <h1 style={styles.title}>ゴール入力</h1>
      <form onSubmit={handleSubmit} style={styles.form} noValidate>
        <div style={styles.field}>
          <label htmlFor="goal" style={styles.label}>
            ゴール <span style={styles.required}>*</span>
          </label>
          <textarea
            id="goal"
            name="goal"
            value={formData.goal}
            onChange={handleChange}
            placeholder="達成したいゴールを入力してください"
            rows={4}
            style={{
              ...styles.textarea,
              ...(goalError ? styles.inputError : {}),
            }}
          />
          {goalError && <p style={styles.errorMessage}>{goalError}</p>}
        </div>

        <div style={styles.field}>
          <label htmlFor="deadline" style={styles.label}>
            期限
          </label>
          <input
            type="date"
            id="deadline"
            name="deadline"
            value={formData.deadline}
            onChange={handleChange}
            style={styles.input}
          />
        </div>

        <div style={styles.field}>
          <label htmlFor="currentSituation" style={styles.label}>
            現在の状況
          </label>
          <textarea
            id="currentSituation"
            name="currentSituation"
            value={formData.currentSituation}
            onChange={handleChange}
            placeholder="現在の状況を入力してください"
            rows={4}
            style={styles.textarea}
          />
        </div>

        <button type="submit" style={styles.button}>
          実現可能性チェックへ進む
        </button>
      </form>
    </div>
  );
};

const styles: Record<string, React.CSSProperties> = {
  container: {
    maxWidth: '600px',
    margin: '40px auto',
    padding: '0 20px',
    fontFamily: 'sans-serif',
  },
  title: {
    fontSize: '24px',
    marginBottom: '24px',
    color: '#333',
  },
  form: {
    display: 'flex',
    flexDirection: 'column',
    gap: '20px',
  },
  field: {
    display: 'flex',
    flexDirection: 'column',
    gap: '6px',
  },
  label: {
    fontSize: '14px',
    fontWeight: 'bold',
    color: '#444',
  },
  required: {
    color: '#e53e3e',
    marginLeft: '4px',
  },
  input: {
    padding: '10px 12px',
    fontSize: '14px',
    border: '1px solid #ccc',
    borderRadius: '4px',
    outline: 'none',
  },
  textarea: {
    padding: '10px 12px',
    fontSize: '14px',
    border: '1px solid #ccc',
    borderRadius: '4px',
    resize: 'vertical',
    outline: 'none',
  },
  inputError: {
    borderColor: '#e53e3e',
  },
  errorMessage: {
    margin: '0',
    fontSize: '13px',
    color: '#e53e3e',
  },
  button: {
    padding: '12px',
    fontSize: '16px',
    backgroundColor: '#3182ce',
    color: '#fff',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
  },
};

export default GoalInput;
