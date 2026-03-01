import { NextResponse } from 'next/server'
import { createSupabaseServer } from '@/lib/supabase/server'
import { UIMessage } from 'ai'
import { Message } from '@/lib/ai/types'

interface RouteParams {
  params: Promise<{ id: string }>
}

// GET /api/conversations/[id]/messages - Get all messages for a conversation
export async function GET(request: Request, { params }: RouteParams) {
  const { id } = await params
  const supabase = await createSupabaseServer()

  const { data, error } = await supabase
    .from('messages')
    .select('*')
    .eq('conversation_id', id)
    .order('created_at', { ascending: true })

  if (error) {
    console.error('Error fetching messages:', error)
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }

  const messages = (data || []).map((msg: Message) => ({
    id: msg.id,
    role: msg.role as 'user' | 'assistant',
    parts: msg.parts as UIMessage['parts'],
    createdAt: new Date(msg.created_at),
    metadata: msg.metadata || {},
  }))

  return NextResponse.json({ success: true, messages })
}

// POST /api/conversations/[id]/messages - Save messages to a conversation
export async function POST(request: Request, { params }: RouteParams) {
  const { id } = await params
  const supabase = await createSupabaseServer()
  const body = await request.json()

  const { messages } = body as { messages: UIMessage[] }

  if (!messages || !Array.isArray(messages)) {
    return NextResponse.json({ success: false, error: 'Missing messages' }, { status: 400 })
  }

  const messagesToInsert = messages.map((msg) => ({
    id: msg.id,
    conversation_id: id,
    role: msg.role,
    parts: msg.parts,
    metadata: (msg as any).metadata || null,
  }))

  const { error } = await supabase.from('messages').upsert(messagesToInsert, {
    onConflict: 'id',
  })

  if (error) {
    console.error('Error saving messages:', error)
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }

  // Update conversation timestamp
  await supabase.from('conversations').update({ updated_at: new Date().toISOString() }).eq('id', id)

  return NextResponse.json({ success: true })
}
