export interface Model {
  id: string
  label: string
  provider: string
}

// Linux version: Mistral-only models
export const models: Model[] = [
  {
    id: 'mistral-small-latest',
    label: 'Mistral Small',
    provider: 'Mistral',
  },
  {
    id: 'mistral-large-latest',
    label: 'Mistral Large',
    provider: 'Mistral',
  },
  {
    id: 'codestral-latest',
    label: 'Codestral',
    provider: 'Mistral',
  },
  {
    id: 'pixtral-large-latest',
    label: 'Pixtral Large (Vision)',
    provider: 'Mistral',
  },
]

export const defaultModel = 'mistral-small-latest'
export const defaultFastModel = 'mistral-small-latest'
