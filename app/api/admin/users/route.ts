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
  const search = searchParams.get('search') ?? ''

  const service = createServiceRoleClient() as unknown as AnyClient

  const { data: users } = await service
    .from('users')
    .select('id, email, created_at')
    .eq('role', 'client')
    .order('created_at', { ascending: false }) as { data: { id: string; email: string; created_at: string }[] | null }

  const userIds = (users ?? []).map(u => u.id)
  if (userIds.length === 0) return NextResponse.json([])

  const { data: profiles } = await service
    .from('profiles')
    .select('id, full_name, avatar_url')
    .in('id', userIds) as { data: { id: string; full_name: string; avatar_url: string | null }[] | null }

  const { data: payments } = await service
    .from('payments')
    .select('client_id, total_sessions_credited, sessions_used, status')
    .in('client_id', userIds)
    .eq('status', 'paid') as { data: { client_id: string; total_sessions_credited: number; sessions_used: number; status: string }[] | null }

  const { data: appointments } = await service
    .from('appointments')
    .select('client_id')
    .in('client_id', userIds)
    .eq('status', 'completed') as { data: { client_id: string }[] | null }

  const profileMap = Object.fromEntries((profiles ?? []).map(p => [p.id, p]))
  const aptCountMap: Record<string, number> = {}
  for (const a of (appointments ?? [])) {
    aptCountMap[a.client_id] = (aptCountMap[a.client_id] ?? 0) + 1
  }
  const activePaymentMap: Record<string, { remaining: number }> = {}
  for (const p of (payments ?? [])) {
    activePaymentMap[p.client_id] = { remaining: p.total_sessions_credited - p.sessions_used }
  }

  let result = (users ?? []).map(u => ({
    id: u.id,
    email: u.email,
    created_at: u.created_at,
    full_name: profileMap[u.id]?.full_name ?? '',
    avatar_url: profileMap[u.id]?.avatar_url ?? null,
    total_sessions: aptCountMap[u.id] ?? 0,
    remaining_sessions: activePaymentMap[u.id]?.remaining ?? 0,
  }))

  if (search) {
    const q = search.toLowerCase()
    result = result.filter(u => u.full_name.toLowerCase().includes(q) || u.email.toLowerCase().includes(q))
  }

  return NextResponse.json(result)
}
