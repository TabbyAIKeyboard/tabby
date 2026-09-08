/**
 * Parses a pasted persona JSON (the shape used by the personas.json seed
 * fixtures) into onboarding form data plus a list of memories to seed. Tasks
 * and study_design are deliberately ignored: they describe the study protocol,
 * not the person.
 */

export interface OnboardingData {
  name: string
  age: string
  organization: string
  organizationType: string
  role: string
  educationLevel: string
  fieldOfStudy: string
  institution: string
  skills: string
  interests: string
  goals: string
  additionalInfo: string
}

export const emptyOnboardingData: OnboardingData = {
  name: '',
  age: '',
  organization: '',
  organizationType: '',
  role: '',
  educationLevel: '',
  fieldOfStudy: '',
  institution: '',
  skills: '',
  interests: '',
  goals: '',
  additionalInfo: '',
}

export type MemoryType = 'LONG_TERM' | 'SHORT_TERM' | 'EPISODIC' | 'SEMANTIC' | 'PROCEDURAL'

const MEMORY_TYPES: MemoryType[] = [
  'LONG_TERM',
  'SHORT_TERM',
  'EPISODIC',
  'SEMANTIC',
  'PROCEDURAL',
]

export interface SeedMemory {
  text: string
  /** Omitted when the JSON gives no valid type, so the backend classifies it. */
  type?: MemoryType
  /** Extra fields carried through to Mem0 metadata (staleness, recency). */
  metadata?: Record<string, unknown>
}

export interface ParsedPersona {
  id?: string
  label: string
  data: OnboardingData
  memories: SeedMemory[]
}

type Json = Record<string, unknown>

const isObject = (value: unknown): value is Json =>
  typeof value === 'object' && value !== null && !Array.isArray(value)

const asString = (value: unknown): string =>
  typeof value === 'string' ? value.trim() : typeof value === 'number' ? String(value) : ''

/** Accepts either a list (["PyTorch", "LaTeX"]) or an already-joined string. */
const asList = (value: unknown, separator = ', '): string => {
  if (Array.isArray(value)) {
    return value.map(asString).filter(Boolean).join(separator)
  }
  return asString(value)
}

/** Best-effort guess so the Education select is not left blank; user can fix it. */
const inferEducationLevel = (profile: Json): string => {
  const haystack = [profile.institution, profile.title, profile.field_of_study, profile.education]
    .map(asString)
    .join(' ')

  if (!haystack) return ''
  if (/ph\.?\s?d|doctoral|doctorate/i.test(haystack)) return 'phd'
  if (/master|\bm\.?a\b|\bm\.?sc\b|\bmeng\b|\bmba\b/i.test(haystack)) return 'masters'
  if (/bachelor|\bb\.?sc\b|\bb\.?a\b|\bbeng\b|\bbcom\b|\bbtech\b/i.test(haystack)) return 'bachelors'
  if (/diploma|certificate|fellowship/i.test(haystack)) return 'diploma'
  if (/self[-\s]?taught/i.test(haystack)) return 'self-taught'
  return ''
}

/** Same idea for the Organization type select. */
const inferOrganizationType = (profile: Json, organization: string): string => {
  const institution = asString(profile.institution)
  const haystack = `${organization} ${asString(profile.industry)}`

  if (/self[-\s]?employed|freelance|independent|trading as|sole trader/i.test(haystack))
    return 'freelance'
  if (/start[-\s]?up/i.test(haystack)) return 'startup'
  if (/non[-\s]?profit|\bngo\b|charity/i.test(haystack)) return 'nonprofit'
  if (/government|ministry|council/i.test(haystack)) return 'government'
  if (/universit|college|school of|academ/i.test(haystack)) return 'university'
  if (organization) return 'company'
  if (/universit|college|institute/i.test(institution)) return 'university'
  if (institution) return 'school'
  return ''
}

const buildAdditionalInfo = (persona: Json, profile: Json): string => {
  const parts: string[] = []
  const industry = asString(profile.industry)
  const graphShape = asString(persona.graph_shape)
  const extra = asString(profile.additional_info) || asString(persona.additional_info)

  if (industry) parts.push(`Industry: ${industry}`)
  if (graphShape) parts.push(`Memory graph shape: ${graphShape}`)
  if (extra) parts.push(extra)

  return parts.join('\n')
}

const parseMemories = (persona: Json): SeedMemory[] => {
  const graphSeed = isObject(persona.graph_seed) ? persona.graph_seed : {}
  const raw = Array.isArray(graphSeed.sample_memories)
    ? graphSeed.sample_memories
    : Array.isArray(persona.memories)
      ? persona.memories
      : []

  const memories: SeedMemory[] = []

  for (const entry of raw) {
    if (typeof entry === 'string') {
      const text = entry.trim()
      if (text) memories.push({ text })
      continue
    }
    if (!isObject(entry)) continue

    const text = asString(entry.text) || asString(entry.memory) || asString(entry.content)
    if (!text) continue

    const declared = asString(entry.type).toUpperCase() as MemoryType
    const type = MEMORY_TYPES.includes(declared) ? declared : undefined

    // Carry the fixture's recency/staleness annotations into metadata so seeded
    // graphs keep the properties the fixture was designed to test.
    const metadata: Record<string, unknown> = {}
    if (typeof entry.stored_days_ago === 'number') metadata.stored_days_ago = entry.stored_days_ago
    if (typeof entry.stale === 'boolean') metadata.stale = entry.stale
    const stalenessNote = asString(entry.staleness_note)
    if (stalenessNote) metadata.staleness_note = stalenessNote

    memories.push({
      text,
      type,
      metadata: Object.keys(metadata).length > 0 ? metadata : undefined,
    })
  }

  return memories
}

const parsePersona = (persona: Json, index: number): ParsedPersona => {
  // A bare profile object is accepted too, not just { name, profile }.
  const profile = isObject(persona.profile) ? persona.profile : persona
  const name = asString(persona.name) || asString(profile.name)
  const id = asString(persona.id) || undefined
  const organization = asString(profile.company) || asString(profile.organization)

  return {
    id,
    label: [id, name].filter(Boolean).join(' · ') || `Persona ${index + 1}`,
    data: {
      name,
      age: asString(profile.age),
      organization,
      organizationType:
        asString(profile.organization_type) || inferOrganizationType(profile, organization),
      role: asString(profile.title) || asString(profile.role),
      educationLevel: asString(profile.education_level) || inferEducationLevel(profile),
      fieldOfStudy: asString(profile.field_of_study),
      institution: asString(profile.institution),
      skills: asList(profile.skills),
      interests: asList(profile.interests),
      goals: asList(profile.goals, '\n'),
      additionalInfo: buildAdditionalInfo(persona, profile),
    },
    memories: parseMemories(persona),
  }
}

const looksLikePersona = (value: unknown): value is Json =>
  isObject(value) &&
  ['name', 'profile', 'graph_seed', 'company', 'institution', 'skills', 'interests'].some(
    (key) => key in value
  )

/**
 * Accepts the whole personas.json file, a single persona, a bare array of
 * personas, or a bare profile object. Throws with a readable message otherwise.
 */
export function parsePersonaJson(input: string): ParsedPersona[] {
  const trimmed = input.trim()
  if (!trimmed) throw new Error('Paste some JSON first.')

  let parsed: unknown
  try {
    parsed = JSON.parse(trimmed)
  } catch (error) {
    throw new Error(
      `That is not valid JSON: ${error instanceof Error ? error.message : 'parse failed'}`
    )
  }

  const candidates: unknown[] = Array.isArray(parsed)
    ? parsed
    : isObject(parsed) && Array.isArray(parsed.personas)
      ? parsed.personas
      : [parsed]

  const personas = candidates.filter(looksLikePersona).map(parsePersona)

  if (personas.length === 0) {
    throw new Error(
      'No persona found. Expected an object with a "profile", or a "personas" array of them.'
    )
  }

  return personas
}
