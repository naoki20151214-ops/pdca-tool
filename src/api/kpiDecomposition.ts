import Anthropic from '@anthropic-ai/sdk';
import { GoalFormData } from '../types/goal';
import { KPIDecompositionResult } from '../types/kpi';

const SYSTEM_PROMPT = `あなたはPDCAコーチングの専門家です。ユーザーが入力したゴール・期限・現在の状況をもとに、ゴールをKPIに分解してください。

以下のJSON形式のみで回答してください。JSON以外のテキストは一切含めないでください。

{
  "mainKPI": {
    "id": "main",
    "name": "メインKPIの名前",
    "description": "このKPIの説明",
    "measurementMethod": "測定方法",
    "targetValue": "目標値・達成基準",
    "relatedSubGoals": ["関連するサブゴール名1", "関連するサブゴール名2"]
  },
  "subKPIs": [
    {
      "id": "sub_1",
      "name": "サブKPIの名前",
      "description": "このサブKPIの説明",
      "measurementMethod": "測定方法",
      "targetValue": "目標値・達成基準",
      "relatedSubGoals": ["関連するサブゴール名1"]
    }
  ]
}

ルール:
- すべてのテキストは日本語で記述する
- subKPIsは3〜5個生成する
- relatedSubGoalsには各KPIに関連するサブゴールの名称を列挙する
- mainKPIのrelatedSubGoalsには関連するsubKPIの名前を含める
- idはmainKPIが"main"、subKPIsは"sub_1","sub_2"...とする
- JSONのみを返し、コードブロック記法（\`\`\`）は使わない`;

function buildUserMessage(formData: GoalFormData): string {
  const parts = [`ゴール: ${formData.goal}`];
  if (formData.deadline) {
    parts.push(`期限: ${formData.deadline}`);
  }
  if (formData.currentSituation) {
    parts.push(`現在の状況: ${formData.currentSituation}`);
  }
  return parts.join('\n');
}

function parseKPIResult(text: string): KPIDecompositionResult {
  let jsonText = text.trim();
  // コードブロック記法が含まれていた場合は除去する
  if (jsonText.startsWith('```')) {
    jsonText = jsonText.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '');
  }
  const parsed: unknown = JSON.parse(jsonText);
  if (
    typeof parsed !== 'object' ||
    parsed === null ||
    !('mainKPI' in parsed) ||
    !('subKPIs' in parsed)
  ) {
    throw new Error('KPIデータの形式が正しくありません。');
  }
  return parsed as KPIDecompositionResult;
}

export async function fetchKPIDecomposition(
  formData: GoalFormData
): Promise<KPIDecompositionResult> {
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
    messages: [{ role: 'user', content: buildUserMessage(formData) }],
  });

  const finalMessage = await stream.finalMessage();

  const textBlock = finalMessage.content.find(
    (block): block is Anthropic.TextBlock => block.type === 'text'
  );

  if (!textBlock) {
    throw new Error('AIからのレスポンスにテキストが含まれていませんでした。');
  }

  return parseKPIResult(textBlock.text);
}
