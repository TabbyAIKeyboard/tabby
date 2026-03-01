import { customProvider, wrapLanguageModel } from 'ai'
import type { LanguageModelV3 } from '@ai-sdk/provider'
import { devToolsMiddleware } from '@ai-sdk/devtools'
import { createOpenAI } from '@ai-sdk/openai'
import { createGoogleGenerativeAI } from '@ai-sdk/google'
import { createGroq } from '@ai-sdk/groq'
import { createCerebras } from '@ai-sdk/cerebras'
import { createOpenAICompatible } from '@ai-sdk/openai-compatible';


// const isDevToolsEnabled = process.env.ENABLE_AI_DEVTOOLS === 'true'

// function wrapWithDevTools(model: LanguageModelV3): LanguageModelV3 {
//   if (!isDevToolsEnabled) {
//     return model
//   }
//   return wrapLanguageModel({
//     model,
//     middleware: devToolsMiddleware(),
//   })
// }

export const titleGenerationModels: Record<string, string> = {
  'gpt-4o-mini': 'gpt-4o-mini',
  'gpt-4.1-mini': 'gpt-4o-mini',
  'gpt-5-mini': 'gpt-4o-mini',
  'gpt-5.1-codex-mini': 'gpt-4o-mini',
  'gpt-5.1': 'gpt-4o-mini',
  'gpt-5-nano': 'gpt-4o-mini',
  'gpt-4.1-nano': 'gpt-4.1-nano',

  'gemini-2.5-flash': 'gemini-2.5-flash',
  'gemini-3-flash-preview': 'gemini-2.5-flash',

  'llama-3.3-70b-versatile': 'llama-3.3-70b-versatile',
  'openai/gpt-oss-120b': 'openai/gpt-oss-20b',
  'openai/gpt-oss-20b': 'openai/gpt-oss-20b',
  'moonshotai/kimi-k2-instruct': 'moonshotai/kimi-k2-instruct',

  'llama3.1-8b': 'llama3.1-8b',
  'gpt-oss-120b': 'llama3.1-8b',

  'qwen/qwen3-coder:free': 'qwen/qwen3-coder:free',
  'minimax/minimax-m2.1': 'minimax/minimax-m2.1',
  'z-ai/glm-4.7': 'z-ai/glm-4.7',
  'moonshotai/kimi-k2-thinking': 'moonshotai/kimi-k2-thinking',
  'anthropic/claude-sonnet-4.5': 'openai/gpt-oss-120b',

  'openai/gpt-oss-20b-lmstudio': 'openai/gpt-oss-20b-lmstudio',
  'qwen/qwen3-4b-thinking-2507-lmstudio': 'qwen/qwen3-4b-thinking-2507-lmstudio',
  'qwen/qwen3-4b': 'qwen/qwen3-4b',
}

export function getTitleGenerationModel(selectedModel: string): string {
  return titleGenerationModels[selectedModel] || selectedModel
}

export function createMyProvider(
  apiKeys: {
    openai?: string
    google?: string
    xai?: string
    groq?: string
    cerebras?: string
    openrouter?: string
  } = {}
) {
  const openai = createOpenAI({
    apiKey: apiKeys.openai || process.env.OPENAI_API_KEY,
  })

  const google = createGoogleGenerativeAI({
    apiKey: apiKeys.google || process.env.GOOGLE_GENERATIVE_AI_API_KEY,
  })


  const groq = createGroq({
    apiKey: apiKeys.groq || process.env.GROQ_API_KEY,
  })

  const cerebrasProvider = createCerebras({
    apiKey: apiKeys.cerebras || process.env.CEREBRAS_API_KEY,
  })

  const lmstudio = createOpenAICompatible({
    name: 'lmstudio',
    baseURL: 'http://localhost:1234/v1',
  });


  return customProvider({
    // languageModels: {
    //   'gpt-4o-mini': wrapWithDevTools(openai('gpt-4o-mini')),
    //   'gpt-4.1-mini': wrapWithDevTools(openai('gpt-4.1-mini')),
    //   'gpt-5-mini': wrapWithDevTools(openai('gpt-5-mini')),
    //   'gemini-2.5-flash': wrapWithDevTools(google('gemini-2.5-flash')),
    //   'gemini-3-flash-preview': wrapWithDevTools(google('gemini-3-flash-preview')),
    //   'llama-3.3-70b-versatile': wrapWithDevTools(groq('llama-3.3-70b-versatile')),
    //   'openai/gpt-oss-120b': wrapWithDevTools(groq('openai/gpt-oss-120b')),
    //   'openai/gpt-oss-20b': wrapWithDevTools(groq('openai/gpt-oss-20b')),
    //   'moonshotai/kimi-k2-instruct': wrapWithDevTools(groq('moonshotai/kimi-k2-instruct-0905')),
    //   'llama3.1-8b': wrapWithDevTools(cerebrasProvider('llama3.1-8b')),
    //   'gpt-oss-120b': wrapWithDevTools(cerebrasProvider('gpt-oss-120b')),
    //   'qwen/qwen3-coder:free': wrapWithDevTools(openrouter('qwen/qwen3-coder:free')),
    //   'minimax/minimax-m2.1': wrapWithDevTools(openrouter('minimax/minimax-m2.1')),
    //   'z-ai/glm-4.7': wrapWithDevTools(openrouter('z-ai/glm-4.7')),
    //   'moonshotai/kimi-k2-thinking': wrapWithDevTools(openrouter('moonshotai/kimi-k2-thinking')),
    //   'anthropic/claude-sonnet-4.5': wrapWithDevTools(openrouter('anthropic/claude-sonnet-4.5')),
    // },
    languageModels: {
      'gpt-4o-mini': openai('gpt-4o-mini'),
      'gpt-4.1-mini': openai('gpt-4.1-mini'),
      'gpt-4.1-nano': openai('gpt-4.1-nano'),
      'gpt-5-mini': openai('gpt-5-mini'),
      'gpt-5.1-codex-mini': openai('gpt-5.1-codex-mini'),
      'gpt-5.1': openai('gpt-5.1'),
      'gpt-5-nano': openai('gpt-5-nano'),

      'gemini-2.5-flash': google('gemini-2.5-flash'),
      'gemini-3-flash-preview': google('gemini-3-flash-preview'),

      'llama-3.3-70b-versatile': groq('llama-3.3-70b-versatile'),
      'openai/gpt-oss-120b': groq('openai/gpt-oss-120b'),
      'openai/gpt-oss-20b': groq('openai/gpt-oss-20b'),
      'moonshotai/kimi-k2-instruct': groq('moonshotai/kimi-k2-instruct-0905'),

      'llama3.1-8b': cerebrasProvider('llama3.1-8b'),
      'gpt-oss-120b': cerebrasProvider('gpt-oss-120b'),
      'qwen-3-32b': cerebrasProvider('qwen-3-32b'),

      'openai/gpt-oss-20b-lmstudio': lmstudio('openai/gpt-oss-20b'),
      'qwen/qwen3-4b-thinking-2507-lmstudio': lmstudio('qwen/qwen3-4b-thinking-2507'),
      'qwen/qwen3-4b': lmstudio('qwen/qwen3-4b'),
    },
    fallbackProvider: openai,
  })
}

export const myProvider = createMyProvider()
