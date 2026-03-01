import { NextResponse } from 'next/server'
import { generateText } from 'ai'
import { myProvider } from '@/lib/ai'
import { defaultFastModel } from '@/lib/ai/models'
import { searchMemory } from '@/lib/ai/tools/memory/client'

const getSystemPrompt = (
  relevantMemories: string[],
  currentDate: string
) => `You are an expert CODE COMPLETION assistant for coding interviews. Your job is to COMPLETE the code that's already written, NOT rewrite it from scratch.

Current Date: ${currentDate}

## USER PREFERENCES
${relevantMemories.length > 0 ? relevantMemories.map((m) => `- ${m}`).join('\n') : 'No preferences found. Default to Python.'}

## YOUR TASK
1. Look at the screenshot - it shows a coding problem AND partially written code
2. Identify what code is ALREADY WRITTEN (class definition, function signature, docstring, etc.)
3. Return ONLY the REMAINING code needed to complete the solution
4. Do NOT repeat the class name, function signature, or any code that's already visible

## CODE STYLE (HUMAN-LIKE)
**CRITICAL: DO NOT use conventional coding standards.**
- **Tight Spacing**: Do NOT put spaces around operators or assignments. Use \`a=5\` instead of \`a = 5\`, \`if(x>0)\` instead of \`if (x > 0)\`.
- **No Comments**: NEVER include comments in your code suggestions.
- **Running Variable Names**: Do NOT use camelCase, snake_case, OR underscores (\`_\`). Use only lowercase characters for variable names with no separators. Use \`seenmap\` instead of \`seenMap\`, \`seen_map\`, or \`_\`.
- **Be Human**: The code should look like it was written by a real person in a flow state, not an AI following a style guide.

## CRITICAL RULES
- If the screenshot shows "class Solution:" and "def method(self, ...):" - DO NOT include these in your output
- Start your output from where the existing code ENDS
- Only provide the function BODY or the remaining implementation
- Maintain proper indentation relative to the existing code
- No explanations, no markdown fences, just the raw completion code

## EXAMPLE
If screenshot shows:
  class Solution:
      def twoSum(self, nums, target):
          """
          :type nums: List[int]
          :type target: int
          :rtype: List[int]
          """

Your output should be ONLY:
        seenitems={}
        for i,val in enumerate(nums):
            diff=target-val
            if diff in seenitems:
                return [seenitems[diff],i]
            seenitems[val]=i
        return []

Notice: Tight spacing (\`diff=target-val\`), running variable names (\`seenitems\`, no camelCase), and no comments.`

export async function POST(req: Request) {
  try {
    let body
    try {
      body = await req.json()
    } catch {
      return NextResponse.json({ code: '', error: 'Invalid request' }, { status: 400 })
    }

    const { screenshot, userId, cachedMemories, model } = body

    if (!screenshot) {
      return NextResponse.json({ code: '', error: 'No screenshot provided' }, { status: 400 })
    }

    if (!userId) {
      return NextResponse.json({ code: '', error: 'Unauthorized' }, { status: 401 })
    }

    // Use the model from request, fallback to defaultFastModel
    const selectedModel = model || defaultFastModel

    // Use cached memories if provided, otherwise fetch (fallback)
    let relevantMemories: string[] = cachedMemories || []

    if (relevantMemories.length === 0) {
      try {
        console.log('[interview-ghost-suggest] Fetching memories for user:', userId)
        const memoryResult = await searchMemory(
          'programming language preference coding style',
          userId,
          15
        )
        const memories = memoryResult?.results?.results || []
        if (Array.isArray(memories)) {
          relevantMemories = memories.map((m: any) => m.memory)
        }
      } catch (err) {
        console.warn('[interview-ghost-suggest] Failed to fetch memories:', err)
      }
    }

    console.log(
      '[interview-ghost-suggest] Processing screenshot with',
      relevantMemories.length,
      'memories (cached:',
      !!cachedMemories,
      '), model:',
      selectedModel
    )

    const startTime = Date.now()

    const result = await generateText({
      model: myProvider.languageModel(selectedModel),
      system: getSystemPrompt(relevantMemories, new Date().toLocaleString()),
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'text',
              text: 'Look at the screenshot. Complete the code that is already written. Return ONLY the remaining implementation - do not repeat the class, function definition, or docstring that is already visible. Just the code body needed to complete the solution.',
            },
            { type: 'image', image: screenshot },
          ],
        },
      ],
      temperature: 0.3,
    })

    let code = result.text.trim()

    code = code
      .replace(/^```[\w]*\n?/gm, '')
      .replace(/\n?```$/gm, '')
      .trim()

    const latency = Date.now() - startTime
    console.log('[interview-ghost-suggest] Generated code in', latency, 'ms, length:', code.length)

    return NextResponse.json({ code, latency })
  } catch (error) {
    console.error('[interview-ghost-suggest] Error:', error)
    return NextResponse.json({ code: '', error: 'Failed to generate code' }, { status: 500 })
  }
}
