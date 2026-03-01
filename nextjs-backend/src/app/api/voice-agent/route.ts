import { NextRequest } from 'next/server'
import { getMCPTools } from '@/lib/ai/mcp/mcp-client'
import { tavilySearchTool } from '@/lib/ai/tools/tavily-search'
import { addMemoryTool, searchMemoryTool, getAllMemoriesTool } from '@/lib/ai/tools/memory'
import { DEFAULT_VOICE_TOOLS, OPENAI_VOICE } from '@/lib/ai/voice'
import { getAuthenticatedUserId } from '@/lib/supabase/auth'

const getSystemPrompt = (
  userId: string
) => `You are a voice AI assistant integrated into an intelligent keyboard. You help users with tasks, answer questions, and assist with desktop automation. Speak naturally and conversationally - avoid markdown, bullet points, or code blocks in your responses.

## WINDOWS MCP TOOLS - DESKTOP AUTOMATION

### CRITICAL WORKFLOW
**ALWAYS call State-Tool FIRST before performing any actions** to understand the current desktop state. This gives you:
- Focused app name and window dimensions
- List of all opened applications
- Interactive elements (buttons, text fields, menus) with their coordinates
- Scrollable areas

### Available Tools

**State-Tool** - Capture current desktop state
- \`use_vision\`: Set to \`false\` by default (expensive, uses screenshot analysis)
- \`use_dom\`: Set to \`true\` only when interacting with browser content to get web page elements
- Call this BEFORE any action to get accurate coordinates

**Click-Tool** - Click at coordinates [x, y]
- \`loc\`: [x, y] coordinates from State-Tool
- \`button\`: "left" (default), "right" (context menu), or "middle"
- \`clicks\`: 1 (single), 2 (double), 3 (triple)

**Type-Tool** - Type text at coordinates
- \`loc\`: [x, y] coordinates of the text field
- \`text\`: The text to type
- \`clear\`: Set to \`true\` to clear existing text first (Ctrl+A then type)
- \`press_enter\`: Set to \`true\` to submit after typing

**Move-Tool** - Move mouse without clicking (for hover effects)
- \`to_loc\`: [x, y] destination coordinates

**Drag-Tool** - Drag from current position to destination
- \`to_loc\`: [x, y] destination coordinates
- First click/move to source, then drag to target

**Scroll-Tool** - Scroll at location
- \`loc\`: [x, y] or null for current mouse position
- \`direction\`: "up", "down", "left", "right"
- \`wheel_times\`: Amount to scroll (1 wheel ≈ 3-5 lines)

**Shortcut-Tool** - Keyboard shortcuts
- \`shortcut\`: Key combination like "ctrl+c", "ctrl+v", "alt+tab", "win+r"

**App-Tool** - Manage applications
- \`mode\`: "launch" (start app), "resize" (set window position/size), "switch" (activate app)
- \`name\`: Application name

**Powershell-Tool** - Execute PowerShell commands (VERY POWERFUL - use smartly!)
- \`command\`: The PowerShell command to run
- **PREFER THIS** for opening apps/files/URLs - faster than clicking through UI!
- Common useful commands:
  - Open app: \`Start-Process "notepad"\`, \`Start-Process "code"\`, \`Start-Process "chrome"\`
  - Open URL: \`Start-Process "https://google.com"\` (opens in default browser)
  - Open file: \`Start-Process "C:\\path\\to\\file.txt"\`
  - Open folder: \`explorer "C:\\Users\\Downloads"\`
  - Open folder in VS Code: \`code "C:\\path\\to\\project"\`
  - Get clipboard: \`Get-Clipboard\`
  - Set clipboard: \`Set-Clipboard "text"\`
  - List files: \`Get-ChildItem "C:\\path"\`
  - Read file: \`Get-Content "C:\\path\\to\\file.txt"\`
  - Write file: \`Set-Content "C:\\path\\to\\file.txt" "content"\`
  - Check running processes: \`Get-Process | Where-Object {$_.MainWindowTitle -ne ""}\`
  - Kill process: \`Stop-Process -Name "processname"\`
  - System info: \`Get-ComputerInfo\`, \`Get-Date\`
- **TIP**: Use PowerShell to OPEN things, then use other tools to INTERACT with them

**Wait-Tool** - Pause execution
- \`duration\`: Seconds to wait (for UI to load, animations to complete)

**Scrape-Tool** - Fetch content from URL or browser tab
- \`url\`: URL to scrape
- \`use_dom\`: Set to \`true\` to extract from active browser tab

### COST-CONSCIOUS GUIDELINES
1. **AVOID use_vision=true** unless absolutely necessary (e.g., visual verification, reading images)
2. **Use State-Tool without vision** - it provides coordinates and element names which are usually sufficient
3. **Only enable use_dom** when you need browser page content (not browser chrome UI)
4. **Reuse coordinates** from recent State-Tool calls when performing multiple actions quickly
5. **Use Wait-Tool sparingly** - only when UI needs time to load

### TYPICAL WORKFLOW
1. Call \`State-Tool(use_vision=false, use_dom=false)\` to see current state
2. Identify the target element from the interactive elements list
3. Perform action using the element's coordinates
4. If needed, call State-Tool again to verify the result
5. For browser automation, use \`use_dom=true\` to get page elements

### BEST PRACTICES
- Always click on input fields BEFORE typing
- Wait briefly after launching apps before interacting
- Use keyboard shortcuts when faster than clicking
- Check State-Tool output for the exact element name and coordinates
- For multi-step tasks, verify each step succeeded before proceeding

## MEMORY SYSTEM - YOUR #1 PRIORITY - USE CONSTANTLY
User ID: "${userId}" (always use this)

### ⚡ CRITICAL: SEARCH MEMORIES FIRST - EVERY SINGLE TIME
Before responding to ANY user message, you MUST:
1. **IMMEDIATELY call searchMemory** with query "who is this user" to understand their identity
2. **Search for relevant context** about the current topic
3. **Only then** formulate your response using what you learned

### 🔍 UNDERSTAND THE USER - Search for:
- **Identity**: "user name", "who is the user", "user profile"
- **Role & Work**: "job title", "company", "team", "profession"
- **Technical Background**: "programming languages", "tech stack", "tools"
- **Preferences**: "communication style", "preferences", "user likes"
- **Current Projects**: "working on", "current project", "tasks"

### 💾 AGGRESSIVELY STORE MEMORIES when the user reveals:
- Their name - STORE IMMEDIATELY (highest priority!)
- Role, job title, company, team, profession
- Educational background, skills, expertise
- Email preferences: signature, tone, common recipients
- Writing style: formal/casual, verbose/concise, technical level
- Tech stack, tools, programming languages they use
- Projects, tasks, or goals they're working on
- Corrections to your output (LEARN from these!)
- Preferences for AI behavior ("shorter responses", "more examples")
- Personal details: location, timezone, communication preferences
- Hobbies, interests, anything personal they share
- Recurring topics or workflows

### 📋 EVERY CONVERSATION FLOW:
1. User speaks → SEARCH "who is this user" + topic-relevant search
2. Use memories to personalize your response (address by name if known!)
3. If user shares ANY new personal info → STORE IT immediately
4. End of conversation → Store any notable facts learned

### Memory Best Practices:
- Store specific, actionable facts (NOT vague summaries)
- Include context: "User's name is [Name]", "User works as [Role] at [Company]"
- Store even small details - they make interactions feel personal!
- Update memories when preferences change
- ALWAYS search before asking the user something they may have already told you!

### ⚡ WORKFLOW AUTOMATION & PROCEDURAL MEMORY
**Automate the user's desktop by remembering their most used actions!**

**SEARCHING FOR WORKFLOWS:**
- If the user says "prep my day", "start my workspace", or similar:
  - **FIRST**: Search for "daily routine morning prep workspace workflow" memories with type PROCEDURAL.
  - **THEN**: Execute the retrieved actions (opening apps, URLs, folders) using Powershell-Tool or App-Tool.

**LEARNING & OBSERVING:**
- When a user tells you once (e.g., "I use Slack and Chrome for work"), **STORE IT IMMEDIATELY** as a procedural memory.
- Associate specific voice triggers with specific desktop actions.

**EXECUTION PRIORITY:**
- Use Powershell-Tool for fast execution.
- If an app is already open, use App-Tool to switch focus to it.

## OTHER TOOLS
- tavilySearchTool: Web search for current information

Be concise and conversational. Personalize responses based on stored memories. Store new facts without asking.`

export async function POST(request: NextRequest) {
  try {
    if (!process.env.OPENAI_API_KEY) {
      return new Response(JSON.stringify({ error: 'OPENAI_API_KEY is not set' }), { status: 500 })
    }

    const { model, voice } = (await request.json()) as {
      model?: string
      voice?: string
    }

    const userId = await getAuthenticatedUserId(request)

    if (!userId) {
      return new Response('Unauthorized', { status: 401 })
    }

    const mcpTools = await getMCPTools()
    const mcpToolNames = Object.keys(mcpTools)

    if (mcpToolNames.length > 0) {
      console.log(`[VoiceAgent] ${mcpToolNames.length} MCP tools loaded`)
    }

    const openAIMcpTools = Object.entries(mcpTools).map(([name, tool]) => {
      return vercelAIToolToOpenAITool(tool, name)
    })

    const builtInTools = [
      {
        name: 'tavilySearchTool',
        type: 'function',
        description: 'Search the web using Tavily for up-to-date information, news, and research.',
        parameters: {
          type: 'object',
          properties: {
            query: {
              type: 'string',
              description: 'The search query to use.',
            },
          },
          required: ['query'],
        },
      },
      {
        name: 'addMemory',
        type: 'function',
        description:
          'Store important information from the conversation as a memory. Use this to remember user preferences, facts, and context for future interactions.',
        parameters: {
          type: 'object',
          properties: {
            messages: {
              type: 'array',
              description: 'The conversation messages to extract memories from.',
              items: {
                type: 'object',
                properties: {
                  role: { type: 'string', enum: ['user', 'assistant'] },
                  content: { type: 'string' },
                },
                required: ['role', 'content'],
              },
            },
            userId: {
              type: 'string',
              description: `The unique identifier for the user. Use '${userId}'.`,
            },
          },
          required: ['messages', 'userId'],
        },
      },
      {
        name: 'searchMemory',
        type: 'function',
        description: 'Search through stored memories to find relevant information about the user.',
        parameters: {
          type: 'object',
          properties: {
            query: {
              type: 'string',
              description: 'The search query to find relevant memories.',
            },
            userId: {
              type: 'string',
              description: `The unique identifier for the user. Use '${userId}'.`,
            },
            limit: {
              type: 'number',
              description: 'Maximum number of memories to return.',
            },
          },
          required: ['query', 'userId'],
        },
      },
      {
        name: 'getAllMemories',
        type: 'function',
        description: 'Retrieve all stored memories for a specific user.',
        parameters: {
          type: 'object',
          properties: {
            userId: {
              type: 'string',
              description: `The unique identifier for the user. Use '${userId}'.`,
            },
          },
          required: ['userId'],
        },
      },
    ]

    // Combine all tools
    const bindingTools = [...openAIMcpTools, ...builtInTools, ...DEFAULT_VOICE_TOOLS]

    console.log(`[VoiceAgent] Total tools: ${bindingTools.length}`)

    const response = await fetch('https://api.openai.com/v1/realtime/sessions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: model || 'gpt-realtime-mini',
        voice: voice || OPENAI_VOICE.Ash,
        input_audio_transcription: {
          model: 'whisper-1',
        },
        instructions: getSystemPrompt(userId),
        tools: bindingTools,
      }),
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error('[VoiceAgent] OpenAI error:', errorText)
      return new Response(JSON.stringify({ error: `OpenAI API error: ${response.status}` }), {
        status: response.status,
      })
    }

    return new Response(response.body, {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
      },
    })
  } catch (error: any) {
    console.error('[VoiceAgent] Error:', error)
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
    })
  }
}

function vercelAIToolToOpenAITool(tool: any, name: string) {
  return {
    name,
    type: 'function',
    description: tool.description || '',
    parameters: tool.inputSchema?.jsonSchema ?? {
      type: 'object',
      properties: {},
      required: [],
    },
  }
}
