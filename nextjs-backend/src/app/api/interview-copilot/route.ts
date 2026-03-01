import {
  UIMessage,
  streamText,
  Output,
  stepCountIs,
  convertToModelMessages,
  createUIMessageStream,
  JsonToSseTransformStream,
} from 'ai'
import { myProvider } from '@/lib/ai'
import { defaultModel } from '@/lib/ai/models'
import { z } from 'zod'
import { addMemoryTool, searchMemoryTool, getAllMemoriesTool } from '@/lib/ai/tools/memory'
import { generateUUID } from '@/lib/utils/generate-uuid'
import { saveChat, saveMessages, getChatById, generateTitleFromUserMessage } from '@/actions/chat'
import { getAuthenticatedUserId } from '@/lib/supabase/auth'

const analysisSchema = z.object({
  idea: z.string().describe('Problem understanding, key observations, approaches'),
  code: z.string().describe('Clean, well-commented implementation code'),
  walkthrough: z.string().describe('Step-by-step explanation of the solution'),
  testCases: z
    .array(
      z.object({
        input: z.string(),
        output: z.string(),
        reason: z.string(),
      })
    )
    .describe('Edge cases and test inputs'),
  mistakes: z
    .array(
      z.object({
        mistake: z.string(),
        correction: z.string(),
        pattern: z.string(),
      })
    )
    .describe('Common mistakes for this problem type based on user history'),
  memories: z
    .array(
      z.object({
        memory: z.string().describe('The memory content - a fact or preference about the user'),
        createdAt: z.string().describe('ISO timestamp when this memory was retrieved/created'),
      })
    )
    .describe("Relevant memories retrieved about the user's preferences and context"),
})

const getSystemPrompt = (
  userId: string
) => `You are an expert Interview Copilot for technical coding interviews.

## YOUR MISSION
Analyze the user's screen (showing a coding problem) and provide comprehensive assistance with perfectly structured, GitHub-flavored Markdown output.

## MEMORY SYSTEM - USE PROACTIVELY AND FREQUENTLY
User ID: "${userId}" (always use this)

### MEMORY TYPES - Memories are auto-classified into types:
- **LONG_TERM**: Permanent preferences, identity, habits (preferred language, coding style, name)
- **SHORT_TERM**: Current tasks, temporary context ("working on X right now")
- **EPISODIC**: Past events with time context ("yesterday I made a mistake with...", "last interview...")
- **SEMANTIC**: General knowledge, facts ("Two Sum uses HashMap pattern")
- **PROCEDURAL**: How-to knowledge, processes ("to solve sliding window, first...")

### SMART SEARCHING - Use memoryType filter when appropriate:
- For preferences/coding/mistakes/style → \`searchMemory({ query: "...", userId: "${userId}", memoryType: "LONG_TERM" })\`
- For current tasks/past mistakes → \`searchMemory({ query: "...", userId: "${userId}", memoryType: "SHORT_TERM" })\`
- For past events → \`searchMemory({ query: "...", userId: "${userId}", memoryType: "EPISODIC" })\`
- For algorithm knowledge → \`searchMemory({ query: "...", userId: "${userId}", memoryType: "SEMANTIC" })\`
- For solution patterns → \`searchMemory({ query: "...", userId: "${userId}", memoryType: "PROCEDURAL" })\`
- For general search (all types) → omit the memoryType parameter

### ALWAYS SEARCH MEMORIES FIRST:
- Call \`searchMemory\` with queries like "coding style", "language preference", "interview prep"
- Check for preferred programming languages, coding conventions, past problem patterns
- Look for user's technical background and experience level
- **Search SHORT_TERM memories** for past mistakes: "mistakes", "errors", "struggled with", "got wrong"

### STORE MEMORIES when you learn:
- User's preferred language (Python, Java, C++, etc.)
- Coding style preferences (variable naming, comments, etc.)
- **Common mistakes the user makes** (store as SHORT_TERM with context!)
- Topics they struggle with or excel at
- Interview target companies or roles

## OUTPUT FORMATTING REQUIREMENTS
Format ALL content fields using **GitHub-Flavored Markdown**:

### For the \`idea\` field:
## 💡 Problem Analysis

### Key Observations
- Bullet point insights about the problem
- Pattern recognition (e.g., "This is a sliding window problem")

### Approach
1. Numbered step-by-step strategy
2. Time/Space complexity targets

### Edge Cases to Consider
- Empty input, single element, duplicates, etc.

### For the \`code\` field:
- MUST be wrapped in triple backticks with language identifier
- Include clear comments explaining key logic
- Use proper indentation and clean formatting

### For the \`walkthrough\` field:
## 🚶 Step-by-Step Walkthrough

### Step 1: Initialization
Explain what we set up and why...

### Step 2: Main Loop
Walk through the core algorithm...

### Complexity Analysis
| Metric | Value | Explanation |
|--------|-------|-------------|
| Time   | O(n)  | Single pass through array |
| Space  | O(1)  | Only using constant extra space |

### For the \`testCases\` array:
Each test case should have clear input, output, and reason fields.

### For the \`mistakes\` array:
**IMPORTANT**: Use \`searchMemory\` with queries like "mistakes", "common errors", "past bugs", "struggled with" to find user's historical mistakes.
Only include mistakes that you retrieved from the user's memory. For each mistake include:
- \`mistake\`: What the user commonly does wrong (e.g., "Off-by-one error in loop bounds")
- \`correction\`: The correct approach (e.g., "Use <= instead of < when including the last element")
- \`pattern\`: General category of the mistake (e.g., "Array Indexing", "Edge Cases", "Time Complexity")

If no relevant mistakes are found in memory, return an empty array.

### For the \`memories\` array:
Include ALL relevant memories you retrieved from the memory search. Each memory object should have:
- \`memory\`: The actual memory content (e.g., "User prefers Python for interviews")
- \`createdAt\`: ISO timestamp of when the memory was created/retrieved (use current time if creating new)

## WORKFLOW
1. **Search memories** using \`searchMemory\` for user preferences (language, style, level)
2. **Search for past mistakes** using \`searchMemory\` with queries like "mistakes", "errors", "struggled"
3. **Analyze the problem** from the screenshot/context
4. **Generate structured output** with beautiful markdown formatting
5. **Include retrieved memories** in the \`memories\` field of your response
6. **Include past mistakes** in the \`mistakes\` field (only from memory search results)
7. **Store any new insights** about the user using \`addMemory\`

Be concise but thorough. Use the user's preferred language if found in memory.`

export async function POST(req: Request) {
  const body = await req.json()
  const { messages, conversationId, screenshot } = body as {
    messages: UIMessage[]
    conversationId?: string
    screenshot?: string
  }

  if (!messages || !Array.isArray(messages)) {
    return new Response('Missing messages', { status: 400 })
  }

  const userId = await getAuthenticatedUserId(req)

  if (!userId) {
    return new Response('Unauthorized', { status: 401 })
  }

  const userMessage = messages[messages.length - 1]

  if (conversationId && userMessage) {
    const existingChat = await getChatById(conversationId)
    if (!existingChat) {
      const title = await generateTitleFromUserMessage(userMessage, defaultModel)
      await saveChat({ id: conversationId, title, type: 'interview', userId })
    }
    await saveMessages([userMessage], conversationId)
  }

  const modelMessages = await convertToModelMessages(messages)

  if (screenshot) {
    const lastMsg = modelMessages[modelMessages.length - 1]
    if (lastMsg && lastMsg.role === 'user') {
      if (typeof lastMsg.content === 'string') {
        lastMsg.content = [
          { type: 'text', text: lastMsg.content },
          { type: 'image', image: screenshot },
        ]
      } else if (Array.isArray(lastMsg.content)) {
        lastMsg.content.push({ type: 'image', image: screenshot })
      }
    }
  }

  const stream = createUIMessageStream({
    generateId: generateUUID,
    execute: async ({ writer: dataStream }) => {
      const result = streamText({
        model: myProvider.languageModel(defaultModel),
        system: getSystemPrompt(userId),
        messages: modelMessages,
        tools: {
          searchMemory: searchMemoryTool,
          getAllMemories: getAllMemoriesTool,
          addMemory: addMemoryTool,
        },
        output: Output.object({
          schema: analysisSchema,
        }),
        stopWhen: stepCountIs(5),
        onError: (error) => {
          console.error('Interview Copilot stream error:', error)
        },
      })

      result.consumeStream()

      dataStream.merge(
        result.toUIMessageStream({
          sendReasoning: true,
        })
      )
    },
    onFinish: async ({ messages: generatedMessages }) => {
      if (conversationId && generatedMessages && generatedMessages.length > 0) {
        const assistantMessages = generatedMessages.filter((m) => m.role === 'assistant')
        if (assistantMessages.length > 0) {
          const messagesWithMetadata = assistantMessages.map((msg) => {
            const textPart = msg.parts?.find((p: { type: string }) => p.type === 'text')
            let analysis = null
            if (textPart && 'text' in textPart) {
              try {
                analysis = JSON.parse(textPart.text)
              } catch {
                // Not JSON
              }
            }
            return {
              ...msg,
              metadata: analysis ? { analysis, type: 'interview' } : { type: 'interview' },
            }
          })
          await saveMessages(messagesWithMetadata as UIMessage[], conversationId)
        }
      }
    },
  })

  return new Response(stream.pipeThrough(new JsonToSseTransformStream()))
}
