export type DeepSeekRole = 'system' | 'user' | 'assistant';

export interface DeepSeekChatMessage {
  role: DeepSeekRole;
  content: string;
}

interface DeepSeekResponse {
  choices?: Array<{
    message?: { content?: string };
    finish_reason?: string | null;
  }>;
  error?: { message?: string };
}

export interface DeepSeekChatOptions {
  messages: DeepSeekChatMessage[];
  model?: string;
  temperature?: number;
  topP?: number;
  maxTokens?: number;
}

export interface DeepSeekChatResult {
  text: string;
  model: string;
  finishReason?: string | null;
}

const DEFAULT_DEEPSEEK_MODEL = 'deepseek-v4-flash';
const DEFAULT_DEEPSEEK_BASE_URL = 'https://api.deepseek.com/v1';

function uniqueValues(values: string[]): string[] {
  const seen = new Set<string>();
  const output: string[] = [];
  for (const value of values) {
    const normalized = value.trim();
    if (!normalized || seen.has(normalized)) {
      continue;
    }
    seen.add(normalized);
    output.push(normalized);
  }
  return output;
}

export function hasDeepSeekApiKey(): boolean {
  return Boolean(process.env.DEEPSEEK_API_KEY);
}

export function resolveDeepSeekModel(model?: string): string {
  return String(model || process.env.DEEPSEEK_MODEL || DEFAULT_DEEPSEEK_MODEL).trim() || DEFAULT_DEEPSEEK_MODEL;
}

export function resolveDeepSeekModelCandidates(preferredModel?: string): string[] {
  const fromEnv = String(process.env.DEEPSEEK_FALLBACK_MODELS || '')
    .split(',')
    .map((value) => value.trim())
    .filter(Boolean);

  return uniqueValues([preferredModel || '', process.env.DEEPSEEK_MODEL || '', ...fromEnv, DEFAULT_DEEPSEEK_MODEL]);
}

export function stripJsonCodeFences(text: string): string {
  return String(text || '').replace(/```json\s*/gi, '').replace(/```\s*/g, '').trim();
}

export async function requestDeepSeekChat(options: DeepSeekChatOptions): Promise<DeepSeekChatResult> {
  const apiKey = process.env.DEEPSEEK_API_KEY;
  if (!apiKey) {
    throw new Error('DEEPSEEK_API_KEY is not set.');
  }

  const model = resolveDeepSeekModel(options.model);
  const maxTokens = typeof options.maxTokens === 'number' ? Math.max(options.maxTokens, 1024) : undefined;
  const baseUrl = String(process.env.DEEPSEEK_BASE_URL || DEFAULT_DEEPSEEK_BASE_URL).replace(/\/+$/, '');
  const response = await fetch(`${baseUrl}/chat/completions`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model,
      messages: options.messages.filter((message) => message.content.trim()),
      ...(typeof options.temperature === 'number' ? { temperature: options.temperature } : {}),
      ...(typeof options.topP === 'number' ? { top_p: options.topP } : {}),
      ...(typeof maxTokens === 'number' ? { max_tokens: maxTokens } : {}),
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`DeepSeek API error: ${response.status} ${errorText}`);
  }

  const data = (await response.json()) as DeepSeekResponse;
  if (data.error?.message) {
    throw new Error(`DeepSeek API error: ${data.error.message}`);
  }

  const choice = data.choices?.[0];
  const text = choice?.message?.content?.trim() || '';
  if (!text) {
    throw new Error('DeepSeek API returned an empty response.');
  }

  return {
    text,
    model,
    finishReason: choice?.finish_reason,
  };
}
