import { NextResponse } from 'next/server'
import { generateText, stepCountIs } from 'ai'
import { myProvider } from '@/lib/ai'
import { defaultFastModel } from '@/lib/ai/models'
import { tavilySearchTool } from '@/lib/ai/tools/tavily-search'
import { addMemoryTool, searchMemoryTool } from '@/lib/ai/tools/memory'
import { searchMemory } from '@/lib/ai/tools/memory/client'

// System prompt WITH tools (for reference, not currently used)
const getSystemPromptWithTools = (
  userId: string,
  relevantMemories: string[],
  currentDate: string
) => `You are a seamless inline text and code completion assistant. Your job is to predict and complete what the user is typing naturally, whether it's prose, messages, or code.
Current Date: ${currentDate}

## WHAT YOU DO
- Complete text naturally from where the user left off
- Complete code with proper syntax and patterns
- Use stored memories to personalize completions when relevant
- Provide helpful, substantial completions (not too short!)

## COMPLETION LENGTH
- For prose/messages: 5-20 words is ideal
- For code: complete the logical unit (function call, statement, block)
- Don't be stingy - provide useful, complete suggestions

## USER CONTEXT (Long-term Memory)
${relevantMemories.length > 0 ? relevantMemories.map((m) => `- ${m}`).join('\n') : 'No relevant memories found.'}

## TOOLS FOR MISSING CONTEXT  
Use \`searchMemory\` to find more context when needed.
**User ID:** "${userId}" (REQUIRED for tool calls)

Example: \`searchMemory({ query: "project details", userId: "${userId}" })\`

## CODE STYLE (HUMAN-LIKE)
**CRITICAL: DO NOT use conventional coding standards.**
- **Tight Spacing**: Do NOT put spaces around operators or assignments. Use \`a=5\` instead of \`a = 5\`, \`if(x>0)\` instead of \`if (x > 0)\`.
- **No Comments**: NEVER include comments in your code suggestions.
- **Running Variable Names**: Do NOT use camelCase, snake_case, OR underscores (\`_\`). Use only lowercase characters for variable names with no separators. Use \`userdata\` instead of \`userData\`, \`user_data\`, or \`user_data\`. Even for loops, use \`i\` or \`x\` instead of \`_\`.
- **Be Human**: The code should look like it was written by a real person in a flow state, not an AI following a style guide.

## CODE COMPLETION
When completing code:
- Match the language and existing messy/human style
- Complete function calls with likely parameters
- Suggest common patterns (error handling, async/await, etc.)
- Complete import statements, variable declarations, etc.

Examples:
- \`const user = await\` → \`prisma.user.findUnique({ where: { id: userId } })\`
- \`function handle\` → \`Submit(event: React.FormEvent) {\`
- \`import { useState\` → \`, useEffect } from 'react'\`

## TEXT COMPLETION  
When completing prose:
- Use memories for personal details (names, projects, preferences)
- Generic completions are fine when no memory applies
- Only avoid making up SPECIFIC facts not in memories (dates, names you don't know)

Examples:
- "I'll send you the" → "updated files by end of day"
- "The meeting with" + memory of "dev team standup" → "the dev team went well"

## OUTPUT
Return ONLY the completion text. No quotes, no explanations, no prefixes.`

// Fast system prompt WITHOUT tools (for low-latency inline suggestions)
const getFastSystemPrompt = (
  relevantMemories: string[],
  currentDate: string
) => `You are an inline text and code completion assistant. Complete what the user is typing naturally.
Current Date: ${currentDate}

## YOUR TASK
Complete the text/code naturally from EXACTLY where it left off. Be helpful and substantial.

## CODE STYLE (HUMAN-LIKE)
**CRITICAL: DO NOT use conventional coding standards.**
- **Tight Spacing**: Do NOT put spaces around operators or assignments. Use \`a=5\` instead of \`a = 5\`, \`if(x>0)\` instead of \`if (x > 0)\`.
- **No Comments**: NEVER include comments in your code suggestions.
- **Running Variable Names**: Do NOT use camelCase, snake_case, OR underscores (\`_\`). Use only lowercase characters for variable names with no separators (e.g., \`usertoken\`). Even for throwaway loop variables, use \`i\` instead of \`_\`.
- **Be Human**: The code should look like it was written by a real person in a flow state.

## CRITICAL: DO NOT REPEAT ALREADY-TYPED TEXT
Your completion must START exactly where the user stopped typing. NEVER repeat any portion of the text that was already typed.

Example - User typed: "def breadthfirstsearch"
- WRONG: "def breadthfirstsearch(graph, start):" (repeats the function name)
- CORRECT: "(graph, start):" (starts right after what was typed)

Example - User typed: "const handleSub"
- WRONG: "const handleSubmit = (e) =>" (repeats "const handleSub")
- CORRECT: "mit = (e: React.FormEvent) => {" (continues from "Sub")

## COMPLETION LENGTH
- Prose/messages: 5-20 words
- Code: complete the logical unit (statement, function call, block)

## USER CONTEXT
${relevantMemories.length > 0 ? relevantMemories.map((m) => `- ${m}`).join('\n') : 'No context available.'}

## RULES
- Match the style and language (but keep it messy/human)
- Use context when relevant
- For code: proper syntax, common patterns
- For text: natural flow, use context for personal details

## OUTPUT
Return ONLY the completion text that comes AFTER the input. No quotes, no explanations, no prefixes, no repetition of input.`

export async function POST(req: Request) {
  try {
    // Handle aborted requests (AbortController terminates connection, resulting in empty body)
    let body
    try {
      body = await req.json()
    } catch {
      // Request was likely aborted, return empty response
      return NextResponse.json({ suggestion: '' })
    }

    const { context, userId, cachedMemories } = body
    console.log('[suggest-inline] Context:', context)

    if (!context || context.length < 5) {
      return NextResponse.json({ suggestion: '' })
    }

    if (!userId) {
      return new Response('Unauthorized: Missing User ID', { status: 401 })
    }

    const lastChunk = context.slice(-200)

    // Use cached memories if provided, otherwise fetch (fallback for non-electron clients)
    let relevantMemories: string[] = cachedMemories || []

    if (relevantMemories.length === 0) {
      try {
        const memoryResult = await searchMemory(lastChunk, userId, 5)
        const memories = memoryResult?.results?.results || []
        if (Array.isArray(memories)) {
          relevantMemories = memories.map((m: any) => m.memory)
        }
      } catch (err) {
        console.warn('[suggest-inline] Failed to fetch memories:', err)
      }
    }

    console.log(
      '[suggest-inline] Using',
      relevantMemories.length,
      'memories (cached:',
      !!cachedMemories,
      ')'
    )
    const result = await generateText({
      model: myProvider.languageModel(defaultFastModel),
      system: getFastSystemPrompt(relevantMemories, new Date().toLocaleString()),
      prompt: `Complete this naturally. Return ONLY the completion:\n\n"${lastChunk}"`,
      temperature: 0.5,
      // Tools disabled for low-latency inline suggestions
      // tools: {
      //   tavilySearchTool,
      //   addMemory: addMemoryTool,
      //   searchMemory: searchMemoryTool,
      // },
      // stopWhen: stepCountIs(5),
    })

    let suggestion = result.text.trim()

    // Remove <think>...</think> tags from models like Qwen that include reasoning
    // suggestion = suggestion.replace(/<think>[\s\S]*?<\/think>/gi, '').trim();

    console.log('[suggest-inline] Context:', context.slice(-50), '→', suggestion.slice(0, 50))

    return NextResponse.json({ suggestion })
  } catch (error) {
    console.error('[suggest-inline] Error:', error)
    return NextResponse.json({ suggestion: '' })
  }
}
