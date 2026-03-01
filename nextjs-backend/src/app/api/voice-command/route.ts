import { experimental_transcribe as transcribe, generateText, stepCountIs } from 'ai'
import { createGroq } from '@ai-sdk/groq'
import { getMCPTools } from '@/lib/ai/mcp/mcp-client'
import { myProvider } from '@/lib/ai/provider'
import { defaultModel } from '@/lib/ai/models'

const COMMAND_SYSTEM_PROMPT = `You are a desktop command executor. Parse the user's voice command and execute it using the appropriate MCP tools.

IMPORTANT: Users may give MULTI-STEP commands. Break them down and execute each step sequentially.

MULTI-STEP EXAMPLES:
- "open Edge and go to YouTube" → 1) Powershell-Tool: Start-Process "msedge", 2) Wait-Tool: 2 seconds, 3) State-Tool, 4) Type URL in address bar
- "open Chrome and search for recipes" → 1) Open Chrome, 2) Wait, 3) Navigate to Google, 4) Type search query
- "open Notepad and type hello world" → 1) Open Notepad, 2) Wait for it to load, 3) Type the text
- "switch to VS Code and open terminal" → 1) App-Tool switch, 2) Shortcut-Tool: ctrl+\`

WORKFLOW FOR MULTI-STEP:
1. Parse ALL intents from the command
2. Execute steps in logical order
3. Use Wait-Tool between steps to let apps load (1-2 seconds)
4. Call State-Tool when needed to get current UI state
5. Continue until all steps complete

SINGLE-STEP EXAMPLES:
- "open chrome" → Powershell-Tool: Start-Process "chrome"
- "open google" → Powershell-Tool: Start-Process "https://google.com"
- "search for weather" → Powershell-Tool: Start-Process "https://google.com/search?q=weather"

AVAILABLE ACTIONS:
- Open apps: Powershell-Tool with Start-Process
- Open URLs: Powershell-Tool: Start-Process "https://..."
- Click/type in apps: State-Tool first, then Click-Tool or Type-Tool
- Keyboard shortcuts: Shortcut-Tool
- Wait for UI: Wait-Tool

Execute all steps and respond with a brief confirmation.`

async function parseAudioData(audio: string): Promise<Uint8Array> {
  if (audio.startsWith('data:')) {
    const [, base64Data] = audio.split(',')
    const binaryString = atob(base64Data)
    const audioData = new Uint8Array(binaryString.length)
    for (let i = 0; i < binaryString.length; i++) {
      audioData[i] = binaryString.charCodeAt(i)
    }
    return audioData
  }

  const binaryString = atob(audio)
  const audioData = new Uint8Array(binaryString.length)
  for (let i = 0; i < binaryString.length; i++) {
    audioData[i] = binaryString.charCodeAt(i)
  }
  return audioData
}

export async function POST(req: Request) {
  try {
    const { audio } = await req.json()

    if (!audio) {
      return Response.json({ error: 'No audio data provided' }, { status: 400 })
    }

    const audioData = await parseAudioData(audio)
    console.log('[VoiceCommand] Audio bytes:', audioData.length)

    const groq = createGroq({ apiKey: process.env.GROQ_API_KEY })
    const transcription = await transcribe({
      model: groq.transcription('whisper-large-v3'),
      audio: audioData,
    })

    console.log('[VoiceCommand] Transcription:', transcription.text)

    if (!transcription.text || transcription.text.length === 0) {
      return Response.json({
        transcription: '',
        action: 'No command detected',
        result: '',
      })
    }

    const mcpTools = await getMCPTools()
    console.log('[VoiceCommand] MCP tools loaded:', Object.keys(mcpTools).length)

    const result = await generateText({
      model: myProvider.languageModel(defaultModel),
      system: COMMAND_SYSTEM_PROMPT,
      messages: [{ role: 'user', content: transcription.text }],
      tools: mcpTools,
      stopWhen: stepCountIs(10),
    })

    console.log('[VoiceCommand] Result:', result.text)

    return Response.json({
      transcription: transcription.text,
      action: 'Command executed',
      result: result.text,
    })
  } catch (error) {
    console.error('Voice command error:', error)
    return Response.json(
      { error: error instanceof Error ? error.message : 'Voice command failed' },
      { status: 500 }
    )
  }
}
