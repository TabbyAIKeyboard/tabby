import {
  UIMessage,
  streamText,
  stepCountIs,
  convertToModelMessages,
  createUIMessageStream,
  JsonToSseTransformStream,
} from 'ai'
import { myProvider } from '@/lib/ai'
import { ActionType } from '@/lib/ai/types'
import { tavilySearchTool } from '@/lib/ai/tools/tavily-search'
import { addMemoryTool, searchMemoryTool, getAllMemoriesTool } from '@/lib/ai/tools/memory'
import { generateUUID } from '@/lib/utils/generate-uuid'
import { defaultModel } from '@/lib/ai/models'
import { getAuthenticatedUserId } from '@/lib/supabase/auth'

const getSystemPrompt = (
  userId: string
) => `You are an intelligent inline writing assistant integrated into an AI-powered keyboard. Your role is to provide seamless, contextually-aware text completions and transformations that feel natural and personalized.

## YOUR CAPABILITIES
- Smart text completion and continuation
- Grammar and spelling corrections
- Tone and style adjustments
- Text expansion and summarization
- Translation and localization
- Professional rewrites (emails, messages, documents)
- Code completion and formatting
- Creative writing assistance

## CORE PRINCIPLES
1. **Be Seamless**: Your completions should flow naturally with the user's existing text
2. **Be Concise**: Return ONLY the transformed/completed text, no explanations or preambles
3. **Be Personalized**: Use stored memories to match the user's writing style, preferences, and context
4. **Be Intelligent**: Infer intent from context and deliver exactly what the user needs

## MEMORY SYSTEM - USE PROACTIVELY
User ID: "${userId}" (always use this)

### BEFORE ANY COMPLETION:
**You MUST call searchMemory first** to personalize your response.
Search for relevant context:
- User's name, role, and profession
- Writing style preferences (formal/casual, verbose/concise)
- Email signature and tone preferences
- Tech stack and tools they use
- Projects they're working on
- Any previous corrections or feedback

Call: searchMemory({ query: "<relevant keywords from the text>", userId: "${userId}", limit: 5 })

### DURING COMPLETION:
Use the retrieved memories to:
- Match their preferred writing style
- Use correct technical terminology for their stack
- Include appropriate greetings/signatures for emails
- Maintain consistency with their previous outputs

### STORE NEW INSIGHTS:
If the text reveals new facts about the user, store them:
Call: addMemory({ messages: [{ role: "user", content: "<fact to store>" }], userId: "${userId}" })

Store things like:
- Corrections they make to your output (LEARN from these!)
- New project names or technologies mentioned
- Communication preferences revealed in their writing
- Names of colleagues, clients, or contacts

## WEB SEARCH
Use tavilySearchTool when you need:
- Current events or recent information
- Technical documentation or API details
- Fact-checking or verification
- Research for content the user is writing

## OUTPUT FORMAT
- Return ONLY the final text - no quotes, explanations, or metadata
- Preserve the user's formatting preferences
- Match capitalization and punctuation style
- For partial completions, continue naturally from where they left off

REMEMBER: Search memory before EVERY response. This is NOT optional.`

export async function POST(req: Request) {
  const body = await req.json()
  const {
    messages,
    action,
    customPrompt,
    userId: bodyUserId,
  } = body as {
    messages: UIMessage[]
    action: ActionType
    customPrompt?: string
    userId?: string
  }

  if (!messages || !Array.isArray(messages)) {
    return new Response('Missing messages', { status: 400 })
  }

  let userId: string | undefined = bodyUserId

  if (!userId) {
    const authenticatedId = await getAuthenticatedUserId(req)

    if (!authenticatedId) {
      return new Response('Unauthorized', { status: 401 })
    }
    userId = authenticatedId
  }

  console.log('API received:', { action, customPrompt: customPrompt?.slice(0, 50) })

  // Use custom prompt if provided, otherwise use the comprehensive system prompt
  const systemPrompt = customPrompt
    ? `${customPrompt}\n\n${getSystemPrompt(userId)}`
    : getSystemPrompt(userId)

  const modelMessages = await convertToModelMessages(messages)

  const stream = createUIMessageStream({
    generateId: generateUUID,
    execute: async ({ writer: dataStream }) => {
      const result = streamText({
        model: myProvider.languageModel(defaultModel),
        system: systemPrompt,
        messages: modelMessages,
        tools: {
          tavilySearchTool,
          addMemory: addMemoryTool,
          searchMemory: searchMemoryTool,
          getAllMemories: getAllMemoriesTool,
        },
        stopWhen: stepCountIs(20),
        onError: (error) => {
          console.error('Completion stream error:', error)
        },
      })

      result.consumeStream()

      dataStream.merge(
        result.toUIMessageStream({
          sendReasoning: true,
        })
      )
    },
  })

  return new Response(stream.pipeThrough(new JsonToSseTransformStream()))
}
