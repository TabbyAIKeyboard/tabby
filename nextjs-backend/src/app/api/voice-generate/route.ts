import { experimental_transcribe as transcribe, generateText, stepCountIs } from 'ai'
import { createGroq } from '@ai-sdk/groq'
import { myProvider } from '@/lib/ai/provider'
import { defaultModel } from '@/lib/ai/models'
import { addMemoryTool, searchMemoryTool } from '@/lib/ai/tools/memory'

function getSystemPrompt(userId: string, memories: string[]): string {
  const memoryContext =
    memories.length > 0 ? memories.map((m) => `- ${m}`).join('\n') : 'No user context available.'

  return `You are a content writing assistant. Generate the requested content based on the user's voice command.

## USER CONTEXT (From Memory)
${memoryContext}

## RULES
1. Output ONLY the generated content - no explanations, no meta-commentary
2. The content should be ready to paste/use immediately
3. Use the context above to personalize (name, signature, preferences)
4. Use searchMemory tool if you need more specific context
5. Match the appropriate tone for the content type

User ID for memory tools: ${userId}

## CONTENT TYPES
- Emails: Professional, use user's name in signature from context
- Messages: Casual, appropriate for the context
- Social media: Engaging, platform-appropriate length
- Code: Clean, functional
- Commit messages: Concise, conventional format

## WORKFLOW
1. Check the user context above first
2. Use searchMemory only if you need more specific info not in context
3. Generate personalized content
4. Output only the final content`
}

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
    const { audio, userId, cachedMemories } = await req.json()

    if (!audio) {
      return Response.json({ error: 'No audio data provided' }, { status: 400 })
    }

    const audioData = await parseAudioData(audio)
    console.log('[VoiceGenerate] Audio bytes:', audioData.length)

    const groq = createGroq({ apiKey: process.env.GROQ_API_KEY })
    const transcription = await transcribe({
      model: groq.transcription('whisper-large-v3'),
      audio: audioData,
    })

    console.log('[VoiceGenerate] Transcription:', transcription.text)

    if (!transcription.text || transcription.text.length === 0) {
      return Response.json({
        transcription: '',
        generated: '',
      })
    }

    const effectiveUserId = userId || 'anonymous'
    const memories: string[] = cachedMemories || []
    console.log('[VoiceGenerate] UserId:', effectiveUserId, 'Memories:', memories.length)

    const result = await generateText({
      model: myProvider.languageModel(defaultModel),
      system: getSystemPrompt(effectiveUserId, memories),
      messages: [{ role: 'user', content: transcription.text }],
      tools: {
        addMemory: addMemoryTool,
        searchMemory: searchMemoryTool,
      },
      stopWhen: stepCountIs(8),
    })

    console.log('[VoiceGenerate] Generated:', result.text?.slice(0, 100))

    return Response.json({
      transcription: transcription.text,
      generated: result.text,
    })
  } catch (error) {
    console.error('Voice generate error:', error)
    return Response.json(
      { error: error instanceof Error ? error.message : 'Voice generate failed' },
      { status: 500 }
    )
  }
}
