import { NextResponse } from 'next/server'
import { createClient, createServiceRoleClient } from '@/lib/supabase/server'
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyClient = { from: (table: string) => any }

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: conversationId } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Yetkisiz' }, { status: 401 })

  const db = supabase as unknown as AnyClient

  // Katılımcı mı kontrol et
  const { data: participant } = await db
    .from('conversation_participants')
    .select('conversation_id')
    .eq('conversation_id', conversationId)
    .eq('user_id', user.id)
    .single() as { data: { conversation_id: string } | null }

  if (!participant) return NextResponse.json({ error: 'Yetkisiz' }, { status: 403 })

  const { searchParams } = new URL(req.url)
  const before = searchParams.get('before') // cursor pagination
  const limit = 50

  let query = db
    .from('messages')
    .select('id, sender_id, content, file_url, file_name, file_type, is_read, read_at, created_at')
    .eq('conversation_id', conversationId)
    .order('created_at', { ascending: false })
    .limit(limit)

  if (before) query = query.lt('created_at', before)

  const { data: messages } = await query as {
    data: {
      id: string
      sender_id: string
      content: string | null
      file_url: string | null
      file_name: string | null
      file_type: string | null
      is_read: boolean
      read_at: string | null
      created_at: string
    }[] | null
  }

  // Okunmamış mesajları okundu yap
  const service = createServiceRoleClient() as unknown as AnyClient
  const unreadIds = (messages ?? [])
    .filter(m => !m.is_read && m.sender_id !== user.id)
    .map(m => m.id)

  if (unreadIds.length > 0) {
    await service
      .from('messages')
      .update({ is_read: true, read_at: new Date().toISOString() })
      .in('id', unreadIds)
  }

  return NextResponse.json((messages ?? []).reverse())
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: conversationId } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Yetkisiz' }, { status: 401 })

  const db = supabase as unknown as AnyClient

  // Katılımcı mı kontrol et
  const { data: participant } = await db
    .from('conversation_participants')
    .select('conversation_id')
    .eq('conversation_id', conversationId)
    .eq('user_id', user.id)
    .single() as { data: { conversation_id: string } | null }

  if (!participant) return NextResponse.json({ error: 'Yetkisiz' }, { status: 403 })

  const { content, file_url, file_name, file_type } = await req.json()

  if (!content?.trim() && !file_url) {
    return NextResponse.json({ error: 'Mesaj boş olamaz' }, { status: 400 })
  }

  const service = createServiceRoleClient() as unknown as AnyClient

  const { data: message } = await service
    .from('messages')
    .insert({
      conversation_id: conversationId,
      sender_id: user.id,
      content: content?.trim() || null,
      file_url: file_url || null,
      file_name: file_name || null,
      file_type: file_type || null,
    })
    .select()
    .single() as { data: { id: string; created_at: string } | null }

  // Konuşmanın last_message_at güncelle
  await service
    .from('conversations')
    .update({ last_message_at: new Date().toISOString() })
    .eq('id', conversationId)

  return NextResponse.json(message)
}
