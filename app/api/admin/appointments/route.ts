import { NextResponse } from 'next/server'
import { createClient, createServiceRoleClient } from '@/lib/supabase/server'
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyClient = { from: (table: string) => any }

export async function GET(req: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Yetkisiz' }, { status: 401 })

  const db = supabase as unknown as AnyClient
  const { data: userData } = await db.from('users').select('role').eq('id', user.id).single() as { data: { role: string } | null }
  if (userData?.role !== 'admin') return NextResponse.json({ error: 'Yetkisiz' }, { status: 403 })

  const { searchParams } = new URL(req.url)
  const status = searchParams.get('status')

  const service = createServiceRoleClient() as unknown as AnyClient

  let query = service
    .from('appointments')
    .select('id, client_id, psychologist_id, status, slot_start_time, meeting_room_url, created_at')
    .order('slot_start_time', { ascending: false })
    .limit(100)

  if (status) query = query.eq('status', status)

  const { data: appointments } = await query as { data: { id: string; client_id: string; psychologist_id: string; status: string; slot_start_time: string | null; meeting_room_url: string | null; created_at: string }[] | null }

  if (!appointments?.length) return NextResponse.json([])

  const allIds = [...new Set([
    ...(appointments ?? []).map(a => a.client_id),
    ...(appointments ?? []).map(a => a.psychologist_id),
  ])]

  const { data: profiles } = await service
    .from('profiles')
    .select('id, full_name')
    .in('id', allIds) as { data: { id: string; full_name: string }[] | null }

  const nameMap = Object.fromEntries((profiles ?? []).map(p => [p.id, p.full_name]))

  const result = (appointments ?? []).map(a => ({
    ...a,
    client_name: nameMap[a.client_id] ?? a.client_id,
    psychologist_name: nameMap[a.psychologist_id] ?? a.psychologist_id,
  }))

  return NextResponse.json(result)
}
