import { NextResponse } from 'next/server'
import { createSupabaseServer } from '@/lib/supabase/server'
import { Conversation } from '@/lib/ai/types'

// GET /api/conversations - Get all conversations
// Query params: type=interview|prep (optional)
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const type = searchParams.get('type')

  const supabase = await createSupabaseServer()

  let query = supabase.from('conversations').select('*').order('updated_at', { ascending: false })

  if (type) {
    query = query.eq('type', type)
  }

  const { data, error } = await query

  if (error) {
    console.error('Error fetching conversations:', error)
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }

  return NextResponse.json({ success: true, conversations: data as Conversation[] })
}

// POST /api/conversations - Create a new conversation
export async function POST(request: Request) {
  const supabase = await createSupabaseServer()
  const body = await request.json()

  const { id, title, type = 'chat', userId } = body

  const payload: any = { id, title, type }
  if (userId) {
    payload.user_id = userId
  }

  const { data, error } = await supabase.from('conversations').insert(payload).select().single()

  if (error) {
    console.error('Error creating conversation:', error)
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }

  return NextResponse.json({ success: true, conversation: data as Conversation })
}
