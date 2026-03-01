import { NextResponse } from 'next/server'
import { createSupabaseServer } from '@/lib/supabase/server'
import { Conversation } from '@/lib/ai/types'

interface RouteParams {
  params: Promise<{ id: string }>
}

// GET /api/conversations/[id] - Get a specific conversation
export async function GET(request: Request, { params }: RouteParams) {
  const { id } = await params
  const supabase = await createSupabaseServer()

  const { data, error } = await supabase.from('conversations').select('*').eq('id', id).single()

  if (error) {
    if (error.code === 'PGRST116') {
      return NextResponse.json({ success: true, conversation: null })
    }
    console.error('Error fetching conversation:', error)
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }

  return NextResponse.json({ success: true, conversation: data as Conversation })
}

// DELETE /api/conversations/[id] - Delete a conversation
export async function DELETE(request: Request, { params }: RouteParams) {
  const { id } = await params
  const supabase = await createSupabaseServer()

  const { error } = await supabase.from('conversations').delete().eq('id', id)

  if (error) {
    console.error('Error deleting conversation:', error)
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}

// PATCH /api/conversations/[id] - Update a conversation
export async function PATCH(request: Request, { params }: RouteParams) {
  const { id } = await params
  const supabase = await createSupabaseServer()
  const body = await request.json()

  const { error } = await supabase.from('conversations').update(body).eq('id', id)

  if (error) {
    console.error('Error updating conversation:', error)
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}
