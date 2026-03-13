import Anthropic from '@anthropic-ai/sdk';
import { WeeklyTodoReport } from '../types/weeklyTodo';
import { DailyTask, DailyTaskClaudeResult, Priority } from '../types/dailyTask';

const PRIORITY_VALUES = new Set<Priority>(['high', 'medium', 'low']);

function isPriority(value: unknown): value is Priority {
  return typeof value === 'string' && PRIORITY_VALUES.has(value as Priority);
}

const SYSTEM_PROMPT = `あなたはPDCAコーチングの専門家です。今週のKPIと週間ToDoリストをもとに、今日取り組むべき具体的なタスクを3〜5件選定し、優先度をつけて提案してください。

以下のJSON形式のみで回答してください。JSON以外のテキストは一切含めないでください。

{
  "tasks": [
    {
      "id": "task_1",
      "title": "タスクのタイトル（簡潔に）",
      "description": "今日やること・やり方の具体的な説明",
      "relatedKPI": "このタスクが関連するKPIの名前",
      "priority": "high",
      "estimatedMinutes": 30
    }
  ]
}

ルール:
- tasksは3〜5件生成する
- idは"task_1","task_2"...とする
- priorityは"high"（高）,"medium"（中）,"low"（低）のいずれか
- estimatedMinutesは15〜120の整数（15分単位を推奨）
- 週間ToDoの達成状況（途中・できなかった）があれば優先的に取り上げる
- すべてのテキストは日本語で記述する
- JSONのみを返し、コードブロック記法（\`\`\`）は使わない`;

function buildUserMessage(report: WeeklyTodoReport, todayDate: string): string {
  const { goalFormData, kpiData, todos } = report;

  const kpiSummary = [kpiData.mainKPI, ...kpiData.subKPIs]
    .map((kpi) => {
      const todo = todos.find((t) => t.kpiId === kpi.id);
      const statusText = todo?.status
        ? `（週間ステータス: ${
            todo.status === 'completed'
              ? '完了'
              : todo.status === 'in_progress'
              ? '途中'
              : 'できなかった'
          }${todo.reason ? `・理由: ${todo.reason}` : ''}）`
        : '（未実施）';
      return `- ${kpi.name}: ${kpi.description} ${statusText}`;
    })
    .join('\n');

  return [
    `今日の日付: ${todayDate}`,
    `ゴール: ${goalFormData.goal}`,
    goalFormData.deadline ? `期限: ${goalFormData.deadline}` : null,
    goalFormData.currentSituation
      ? `現在の状況: ${goalFormData.currentSituation}`
      : null,
    '',
    '今週のKPIと進捗:',
    kpiSummary,
  ]
    .filter((line): line is string => line !== null)
    .join('\n');
}

function parseDailyTaskResult(
  text: string
): DailyTaskClaudeResult {
  let jsonText = text.trim();
  if (jsonText.startsWith('```')) {
    jsonText = jsonText.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '');
  }

  const parsed: unknown = JSON.parse(jsonText);
  if (
    typeof parsed !== 'object' ||
    parsed === null ||
    !('tasks' in parsed) ||
    !Array.isArray((parsed as Record<string, unknown>).tasks)
  ) {
    throw new Error('タスクデータの形式が正しくありません。');
  }

  const rawTasks = (parsed as Record<string, unknown>).tasks as unknown[];
  const tasks: Omit<DailyTask, 'status' | 'reason'>[] = rawTasks.map(
    (raw, index) => {
      if (typeof raw !== 'object' || raw === null) {
        throw new Error(`タスク[${index}]の形式が正しくありません。`);
      }
      const t = raw as Record<string, unknown>;
      const priority = isPriority(t.priority) ? t.priority : 'medium';
      return {
        id: typeof t.id === 'string' ? t.id : `task_${index + 1}`,
        title: typeof t.title === 'string' ? t.title : '',
        description: typeof t.description === 'string' ? t.description : '',
        relatedKPI: typeof t.relatedKPI === 'string' ? t.relatedKPI : '',
        priority,
        estimatedMinutes:
          typeof t.estimatedMinutes === 'number' ? t.estimatedMinutes : 30,
      };
    }
  );

  return { tasks };
}

export async function fetchDailyTasks(
  report: WeeklyTodoReport,
  todayDate: string
): Promise<Omit<DailyTask, 'status' | 'reason'>[]> {
  const apiKey = process.env.REACT_APP_ANTHROPIC_API_KEY;
  if (!apiKey) {
    throw new Error(
      'APIキーが設定されていません。.env ファイルに REACT_APP_ANTHROPIC_API_KEY を設定してください。'
    );
  }

  const client = new Anthropic({
    apiKey,
    dangerouslyAllowBrowser: true,
  });

  const stream = client.messages.stream({
    model: 'claude-opus-4-6',
    max_tokens: 4096,
    thinking: { type: 'adaptive' },
    system: SYSTEM_PROMPT,
    messages: [
      { role: 'user', content: buildUserMessage(report, todayDate) },
    ],
  });

  const finalMessage = await stream.finalMessage();

  const textBlock = finalMessage.content.find(
    (block): block is Anthropic.TextBlock => block.type === 'text'
  );
  if (!textBlock) {
    throw new Error('AIからのレスポンスにテキストが含まれていませんでした。');
  }

  return parseDailyTaskResult(textBlock.text).tasks;
}
