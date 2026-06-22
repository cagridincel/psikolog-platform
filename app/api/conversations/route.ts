import { NextResponse } from 'next/server'
import { createClient, createServiceRoleClient } from '@/lib/supabase/server'
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyClient = { from: (table: string) => any }

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Yetkisiz' }, { status: 401 })

  const db = supabase as unknown as AnyClient

  // Kullanıcının katıldığı konuşmalar
  const { data: participantRows } = await db
    .from('conversation_participants')
    .select('conversation_id')
    .eq('user_id', user.id) as { data: { conversation_id: string }[] | null }

  const convIds = (participantRows ?? []).map(r => r.conversation_id)
  if (convIds.length === 0) return NextResponse.json([])

  const service = createServiceRoleClient() as unknown as AnyClient

  // Konuşma detayları
  const { data: conversations } = await service
    .from('conversations')
    .select('id, last_message_at, created_at')
    .in('id', convIds)
    .order('last_message_at', { ascending: false }) as {
      data: { id: string; last_message_at: string | null; created_at: string }[] | null
    }

  // Katılımcı bilgileri — service role ile RLS bypass
  const { data: allParticipants } = await service
    .from('conversation_participants')
    .select('conversation_id, user_id')
    .in('conversation_id', convIds) as { data: { conversation_id: string; user_id: string }[] | null }

  const otherUserIds = [...new Set(
    (allParticipants ?? [])
      .filter(p => p.user_id !== user.id)
      .map(p => p.user_id)
  )]

  const { data: profiles } = await service
    .from('profiles')
    .select('id, full_name, avatar_url')
    .in('id', otherUserIds) as { data: { id: string; full_name: string; avatar_url: string | null }[] | null }

  const { data: userRoles } = await service
    .from('users')
    .select('id, role, email')
    .in('id', otherUserIds) as { data: { id: string; role: string; email: string }[] | null }

  const profileMap = Object.fromEntries((profiles ?? []).map(p => [p.id, p]))
  const userMap = Object.fromEntries((userRoles ?? []).map(u => [u.id, u]))

  // Son mesaj + okunmamış sayısı
  const { data: lastMessages } = await db
    .from('messages')
    .select('conversation_id, content, file_name, created_at, sender_id, is_read')
    .in('conversation_id', convIds)
    .order('created_at', { ascending: false }) as {
      data: { conversation_id: string; content: string | null; file_name: string | null; created_at: string; sender_id: string; is_read: boolean }[] | null
    }

  // Her konuşmanın son mesajı ve okunmamış sayısı
  const lastMsgMap: Record<string, { content: string | null; file_name: string | null; created_at: string }> = {}
  const unreadMap: Record<string, number> = {}

  for (const msg of (lastMessages ?? [])) {
    if (!lastMsgMap[msg.conversation_id]) {
      lastMsgMap[msg.conversation_id] = { content: msg.content, file_name: msg.file_name, created_at: msg.created_at }
    }
    if (!msg.is_read && msg.sender_id !== user.id) {
      unreadMap[msg.conversation_id] = (unreadMap[msg.conversation_id] ?? 0) + 1
    }
  }

  const participantsByConv: Record<string, typeof allParticipants> = {}
  for (const p of (allParticipants ?? [])) {
    if (!participantsByConv[p.conversation_id]) participantsByConv[p.conversation_id] = []
    participantsByConv[p.conversation_id]!.push(p)
  }

  const result = (conversations ?? []).map(conv => {
    const others = (participantsByConv[conv.id] ?? [])
      .filter(p => p.user_id !== user.id)
      .map(p => ({
        id: p.user_id,
        full_name: profileMap[p.user_id]?.full_name || userMap[p.user_id]?.email || 'Kullanıcı',
        avatar_url: profileMap[p.user_id]?.avatar_url ?? null,
        role: userMap[p.user_id]?.role ?? 'client',
      }))

    return {
      id: conv.id,
      created_at: conv.created_at,
      last_message_at: conv.last_message_at,
      participants: others,
      last_message: lastMsgMap[conv.id] ?? null,
      unread_count: unreadMap[conv.id] ?? 0,
    }
  })

  return NextResponse.json(result)
}

// POST — yeni konuşma başlat veya mevcut olanı bul
export async function POST(req: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Yetkisiz' }, { status: 401 })

  const { recipientId } = await req.json()
  if (!recipientId) return NextResponse.json({ error: 'Alıcı belirtilmedi' }, { status: 400 })
  if (recipientId === user.id) return NextResponse.json({ error: 'Kendinizle konuşamazsınız' }, { status: 400 })

  const service = createServiceRoleClient() as unknown as AnyClient
  const db = supabase as unknown as AnyClient

  // Erişim kontrolü: psikolog ↔ danışan için payment kontrolü
  const { data: userData } = await db.from('users').select('role').eq('id', user.id).single() as { data: { role: string } | null }
  const { data: recipientData } = await db.from('users').select('role').eq('id', recipientId).single() as { data: { role: string } | null }

  const myRole = userData?.role
  const theirRole = recipientData?.role

  // Admin her zaman mesaj atabilir
  const isAdmin = myRole === 'admin' || theirRole === 'admin'

  if (!isAdmin) {
    // Psikolog ↔ danışan: payment olmalı
    const clientId = myRole === 'client' ? user.id : recipientId
    const psychId = myRole === 'psychologist' ? user.id : recipientId

    const { data: payment } = await service
      .from('payments')
      .select('id')
      .eq('client_id', clientId)
      .eq('psychologist_id', psychId)
      .eq('status', 'paid')
      .limit(1)
      .single() as { data: { id: string } | null }

    if (!payment) {
      return NextResponse.json({ error: 'Mesajlaşmak için aktif paket gerekli' }, { status: 403 })
    }
  }

  // Mevcut konuşma var mı?
  const { data: myConvs } = await db
    .from('conversation_participants')
    .select('conversation_id')
    .eq('user_id', user.id) as { data: { conversation_id: string }[] | null }

  const { data: theirConvs } = await db
    .from('conversation_participants')
    .select('conversation_id')
    .eq('user_id', recipientId) as { data: { conversation_id: string }[] | null }

  const myConvIds = new Set((myConvs ?? []).map(c => c.conversation_id))
  const existing = (theirConvs ?? []).find(c => myConvIds.has(c.conversation_id))

  if (existing) {
    return NextResponse.json({ id: existing.conversation_id, existing: true })
  }

  // Yeni konuşma oluştur
  const { data: conv } = await service
    .from('conversations')
    .insert({ last_message_at: new Date().toISOString() })
    .select()
    .single() as { data: { id: string } | null }

  if (!conv) return NextResponse.json({ error: 'Konuşma oluşturulamadı' }, { status: 500 })

  await service.from('conversation_participants').insert([
    { conversation_id: conv.id, user_id: user.id },
    { conversation_id: conv.id, user_id: recipientId },
  ])

  return NextResponse.json({ id: conv.id, existing: false })
}
