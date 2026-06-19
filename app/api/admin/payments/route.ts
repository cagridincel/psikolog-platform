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
  const from = searchParams.get('from')
  const to = searchParams.get('to')

  const service = createServiceRoleClient() as unknown as AnyClient

  let query = service
    .from('payments')
    .select('id, client_id, psychologist_id, amount_paid, total_sessions_credited, sessions_used, status, created_at, iyzico_payment_id')
    .order('created_at', { ascending: false })

  if (status) query = query.eq('status', status)
  if (from) query = query.gte('created_at', from)
  if (to) query = query.lte('created_at', to)

  const { data: payments } = await query as { data: { id: string; client_id: string; psychologist_id: string; amount_paid: number; total_sessions_credited: number; sessions_used: number; status: string; created_at: string; iyzico_payment_id: string | null }[] | null }

  if (!payments?.length) return NextResponse.json([])

  const allIds = [...new Set([
    ...(payments ?? []).map(p => p.client_id),
    ...(payments ?? []).map(p => p.psychologist_id),
  ])]

  const { data: profiles } = await service
    .from('profiles')
    .select('id, full_name')
    .in('id', allIds) as { data: { id: string; full_name: string }[] | null }

  const nameMap = Object.fromEntries((profiles ?? []).map(p => [p.id, p.full_name]))

  const result = (payments ?? []).map(p => ({
    ...p,
    client_name: nameMap[p.client_id] ?? p.client_id,
    psychologist_name: nameMap[p.psychologist_id] ?? p.psychologist_id,
  }))

  return NextResponse.json(result)
}
