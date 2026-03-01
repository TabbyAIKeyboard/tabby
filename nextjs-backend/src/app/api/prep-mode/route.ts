import {
  UIMessage,
  streamText,
  Output,
  stepCountIs,
  convertToModelMessages,
  createUIMessageStream,
  JsonToSseTransformStream,
} from 'ai'
import { myProvider, getMCPTools } from '@/lib/ai'
import { defaultModel } from '@/lib/ai/models'
import { z } from 'zod'
import { addMemoryTool, searchMemoryTool, getAllMemoriesTool } from '@/lib/ai/tools/memory'
import { generateUUID } from '@/lib/utils/generate-uuid'
import { saveChat, saveMessages, getChatById, generateTitleFromUserMessage } from '@/actions/chat'
import { getAuthenticatedUserId } from '@/lib/supabase/auth'

const prepSchema = z.object({
  pattern: z
    .string()
    .describe('Algorithm pattern: Sliding Window, Two Pointer, DP, BFS/DFS, Backtracking, etc.'),
  difficulty: z.string().describe('Easy, Medium, or Hard'),
  hints: z
    .array(
      z.object({
        level: z.number().min(1).max(5),
        content: z.string(),
      })
    )
    .describe('5 progressive hints from gentle nudge to near-solution'),
  similar: z
    .array(
      z.object({
        name: z.string(),
        slug: z.string(),
        reason: z.string(),
      })
    )
    .describe('Similar LeetCode problems that use the same pattern'),
  mistakes: z
    .array(
      z.object({
        mistake: z.string(),
        correction: z.string(),
        pattern: z.string(),
      })
    )
    .describe('Common mistakes for this problem type based on user history'),
  solution: z.string().describe("Clean, well-commented solution code in user's preferred language"),
  complexity: z.object({
    time: z.string(),
    space: z.string(),
  }),
  memories: z.array(
    z.object({
      memory: z.string(),
      createdAt: z.string(),
    })
  ),
})

const getSystemPrompt = (
  userId: string
) => `You are an expert LeetCode Practice Coach and Pair Programmer helping users learn and improve their coding skills.

## YOUR MISSION
Analyze the coding problem from the user's screen and provide structured learning assistance. Focus on TEACHING, not just solving. You can also help users write code, open LeetCode problems, and guide them through the coding process.

## WINDOWS MCP TOOLS - PAIR PROGRAMMING IN BROWSER

You have powerful desktop automation tools to help users solve problems directly on LeetCode in their browser.

### COST-CONSCIOUS RULES - FOLLOW STRICTLY
1. **NEVER use use_vision=true** - It is expensive and unnecessary
2. **ALWAYS set use_vision=false** when calling State-Tool
3. **Only use use_dom=true** when you need browser page content (for LeetCode)
4. State-Tool without vision provides coordinates and element names which are sufficient

### CRITICAL WORKFLOW
1. Call State-Tool(use_vision=false, use_dom=true) FIRST to see the LeetCode page
2. State-Tool gives you browser elements like the code editor, Run/Submit buttons
3. Find the code editor textarea coordinates from the DOM elements
4. Use Type-Tool to type code into the LeetCode editor

### Key Tools for LeetCode Pair Programming

**State-Tool** - See browser state:
- ALWAYS set use_vision=false (mandatory - vision is expensive)
- use_dom=true: For browser - gets page elements and code editor location
- Returns coordinates of buttons, text fields, the code editor

**Type-Tool** - Type code into LeetCode editor:
- First click on the code editor to focus it
- text: The code to type
- clear=true: Clear existing code first (select all + type)

**Click-Tool** - Click LeetCode buttons:
- Click the code editor to focus it
- Click Run/Submit buttons using coordinates from State-Tool

**Shortcut-Tool** - LeetCode shortcuts:
- ctrl+enter: Run code on LeetCode
- ctrl+a: Select all (before typing new code)

**Powershell-Tool** - Open problems (ONLY if user asks to open a different problem):
- Start-Process "https://leetcode.com/problems/PROBLEM-SLUG"
- DO NOT open new tabs - user is usually already on the LeetCode page they want help with

**Wait-Tool** - Wait for page to load after navigation

### TYPICAL LEETCODE WORKFLOW
**IMPORTANT: The user is usually ALREADY on the LeetCode problem page. DO NOT open new tabs or navigate away.**

1. User asks for help with a problem they have open - DO NOT open a new tab
2. Call State-Tool(use_vision=false, use_dom=true) to see the current LeetCode page
3. Identify the code editor element and Run/Submit buttons from the DOM
4. Click on code editor to focus it
5. Use Type-Tool(clear=true) to type your solution
6. Use Shortcut-Tool(ctrl+enter) to run the code
7. Wait and check results with State-Tool again

**NEVER open a new LeetCode tab unless the user explicitly asks to open a different problem.**

## MEMORY SYSTEM
User ID: "${userId}" (always use this)

### ALWAYS SEARCH MEMORIES FIRST:
- Call \`searchMemory\` for: "coding mistakes", "weak patterns", "preferred language", "solved problems"
- Look for past mistakes on similar patterns
- Check user's experience level and preferred language

### STORE MEMORIES when you learn:
- Problems the user struggles with
- Patterns they find difficult
- Mistakes they make repeatedly
- Topics they've mastered

## OUTPUT STRUCTURE

### pattern field:
Identify the algorithmic pattern. Examples:
- "Two Pointer" 
- "Sliding Window"
- "HashMap/HashSet"
- "Binary Search"
- "Dynamic Programming"
- "BFS/DFS"
- "Stack/Queue"
- "Heap/Priority Queue"

### difficulty field:
"Easy", "Medium", or "Hard"

### hints array (EXACTLY 5 hints, progressive):
Level 1: Gentle nudge - "What data structure helps with O(1) lookup?"
Level 2: Pattern hint - "This is a HashMap problem"
Level 3: Approach hint - "Try storing complements in a map"
Level 4: Algorithm steps - Pseudocode-level guidance
Level 5: Near-solution - Detailed walkthrough without full code

### similar array:
Find 3-5 similar LeetCode problems. Format:
- name: "3Sum"
- slug: "3sum" (lowercase, hyphenated)
- reason: "Uses same two-pointer pattern after sorting"

### mistakes array:
Check memory for user's past mistakes on this pattern. If found:
- mistake: What they did wrong
- correction: The right approach
- pattern: General learning point

### solution field:
Full solution code in user's preferred language (check memory).
Use markdown code blocks with language identifier.
Include brief inline comments only where logic is non-obvious.

### complexity field:
- time: "O(n)" with brief explanation
- space: "O(1)" with brief explanation

### memories array:
Include relevant memories you retrieved about the user.

## WORKFLOW
1. Search memories for user preferences and past mistakes
2. Use State-Tool if you need to interact with the user's desktop
3. Identify the problem pattern
4. Generate progressive hints (teach, don't spoonfeed)
5. Find similar problems for practice
6. Check for past mistakes on this pattern
7. Provide solution in preferred language
8. Use Windows MCP tools to help the user (open problems, type code, run tests)
9. Store any new insights about the user`

export async function POST(req: Request) {
  const body = await req.json()
  const { messages, conversationId, screenshot, hintLevel } = body as {
    messages: UIMessage[]
    conversationId?: string
    screenshot?: string
    hintLevel?: number
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
      await saveChat({ id: conversationId, title, type: 'prep', userId })
    }
    await saveMessages([userMessage], conversationId)
  }

  const mcpTools = await getMCPTools()
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
          ...mcpTools,
        },
        output: Output.object({
          schema: prepSchema,
        }),
        stopWhen: stepCountIs(5),
        onError: (error) => {
          console.error('Prep Mode stream error:', error)
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
              } catch {}
            }
            return {
              ...msg,
              metadata: analysis ? { analysis, type: 'prep' } : { type: 'prep' },
            }
          })
          await saveMessages(messagesWithMetadata as UIMessage[], conversationId)
        }
      }
    },
  })

  return new Response(stream.pipeThrough(new JsonToSseTransformStream()))
}
