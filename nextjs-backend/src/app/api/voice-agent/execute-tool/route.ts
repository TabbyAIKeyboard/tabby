import { NextRequest } from 'next/server'
import { getMCPTools } from '@/lib/ai/mcp/mcp-client'
import { tavilySearchTool } from '@/lib/ai/tools/tavily-search'
import { addMemoryTool, searchMemoryTool, getAllMemoriesTool } from '@/lib/ai/tools/memory'

async function getAllTools() {
  const mcpTools = await getMCPTools()

  return {
    ...mcpTools,
    tavilySearchTool,
    addMemory: addMemoryTool,
    searchMemory: searchMemoryTool,
    getAllMemories: getAllMemoriesTool,
  }
}

export async function POST(request: NextRequest) {
  try {
    const { toolName, args } = await request.json()

    if (!toolName) {
      return new Response(JSON.stringify({ error: 'toolName is required' }), { status: 400 })
    }

    const allTools: Record<string, any> = await getAllTools()
    const tool = allTools[toolName]

    if (!tool) {
      console.error(`[VoiceAgent] Tool '${toolName}' not found. Available:`, Object.keys(allTools))
      return new Response(JSON.stringify({ error: `Tool '${toolName}' not found` }), {
        status: 404,
      })
    }

    console.log(`[VoiceAgent] Executing tool: ${toolName}`, args)

    let result
    if (typeof tool.execute === 'function') {
      result = await tool.execute(args)
    } else if (typeof tool === 'function') {
      result = await tool(args)
    } else {
      result = { error: 'Tool is not executable' }
    }

    console.log(
      `[VoiceAgent] Tool result:`,
      typeof result === 'string' ? result.slice(0, 200) : result
    )

    return new Response(JSON.stringify(result), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    })
  } catch (error: any) {
    console.error('[VoiceAgent] Tool execution error:', error)
    return new Response(JSON.stringify({ error: error.message }), { status: 500 })
  }
}
