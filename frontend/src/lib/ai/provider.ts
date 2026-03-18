import { customProvider } from 'ai'
import { createMistral } from '@ai-sdk/mistral'

// Linux version: Mistral-only provider
const mistral = createMistral({
  apiKey: process.env.MISTRAL_API_KEY,
})

export const titleGenerationModels: Record<string, string> = {
  'mistral-small-latest': 'mistral-small-latest',
  'mistral-large-latest': 'mistral-small-latest',
  'codestral-latest': 'mistral-small-latest',
  'pixtral-large-latest': 'mistral-small-latest',
}

export function getTitleGenerationModel(selectedModel: string): string {
  return titleGenerationModels[selectedModel] || 'mistral-small-latest'
}

export function createMyProvider(
  apiKeys: {
    mistral?: string
  } = {}
) {
  const mistralProvider = apiKeys.mistral
    ? createMistral({ apiKey: apiKeys.mistral })
    : mistral

  return customProvider({
    languageModels: {
      'mistral-large-latest': mistralProvider('mistral-large-latest'),
      'mistral-small-latest': mistralProvider('mistral-small-latest'),
      'codestral-latest': mistralProvider('codestral-latest'),
      'pixtral-large-latest': mistralProvider('pixtral-large-latest'),
    },
    fallbackProvider: mistralProvider,
  })
}

export const myProvider = createMyProvider()
