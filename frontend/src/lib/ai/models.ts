export interface Model {
  id: string
  label: string
  provider: string
}

export const models: Model[] = [
  { id: 'gpt-5.1', label: 'GPT-5.1', provider: 'OpenAI' },
  { id: 'gpt-4.1-mini', label: 'GPT-4.1 Mini', provider: 'OpenAI' },
  { id: 'gpt-5-mini', label: 'GPT-5 Mini', provider: 'OpenAI' },
  { id: 'gpt-5-nano', label: 'GPT-5 Nano', provider: 'OpenAI' },
  { id: 'gpt-4o-mini', label: 'GPT-4o Mini', provider: 'OpenAI' },
  { id: 'gpt-4.1-nano', label: 'GPT-4.1 Nano', provider: 'OpenAI' },
  {
    id: 'gemini-2.5-flash',
    label: 'Gemini 2.5 Flash',
    provider: 'Google',
  },
  {
    id: 'gemini-3-flash-preview',
    label: 'Gemini 3 Flash Preview',
    provider: 'Google',
  },
  {
    id: 'openai/gpt-oss-120b',
    label: 'GPT-OSS 120B',
    provider: 'Groq',
  },
  {
    id: 'openai/gpt-oss-20b',
    label: 'GPT-OSS 20B',
    provider: 'Groq',
  },
  {
    id: 'moonshotai/kimi-k2-instruct',
    label: 'Kimi K2 Instruct',
    provider: 'Groq',
  },
  {
    id: 'gpt-oss-120b',
    label: 'GPT OSS 120B',
    provider: 'Cerebras',
  },
  {
    id: 'qwen-3-32b',
    label: 'Qwen 3 32B',
    provider: 'Cerebras',
  },
  {
    id: 'openai/gpt-oss-20b-lmstudio',
    label: 'GPT OSS 20B (LMStudio)',
    provider: 'LMStudio',
  },
  {
    id: 'qwen/qwen3-4b',
    label: 'Qwen3 4B',
    provider: 'LMStudio',
  },
]

export const defaultModel = 'gpt-4.1-mini'
export const defaultFastModel = 'gpt-4.1-mini'

