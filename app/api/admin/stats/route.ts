import { NextResponse } from 'next/server'
import { createClient, createServiceRoleClient } from '@/lib/supabase/server'
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyClient = { from: (table: string) => any }

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Yetkisiz' }, { status: 401 })

  const db = supabase as unknown as AnyClient
  const { data: userData } = await db.from('users').select('role').eq('id', user.id).single() as { data: { role: string } | null }
  if (userData?.role !== 'admin') return NextResponse.json({ error: 'Yetkisiz' }, { status: 403 })

  const service = createServiceRoleClient() as unknown as AnyClient
  const now = new Date()
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString()

  const [
    { count: totalUsers },
    { count: totalPsychologists },
    { count: totalSessions },
    { count: monthlySessions },
    { data: payments },
    { data: monthlyPayments },
    { data: psychUsers },
  ] = await Promise.all([
    service.from('users').select('id', { count: 'exact', head: true }).eq('role', 'client') as Promise<{ count: number | null }>,
    service.from('users').select('id', { count: 'exact', head: true }).eq('role', 'psychologist') as Promise<{ count: number | null }>,
    service.from('appointments').select('id', { count: 'exact', head: true }).eq('status', 'completed') as Promise<{ count: number | null }>,
    service.from('appointments').select('id', { count: 'exact', head: true }).eq('status', 'completed').gte('created_at', monthStart) as Promise<{ count: number | null }>,
    service.from('payments').select('amount_paid').eq('status', 'paid') as Promise<{ data: { amount_paid: number }[] | null }>,
    service.from('payments').select('amount_paid').eq('status', 'paid').gte('created_at', monthStart) as Promise<{ data: { amount_paid: number }[] | null }>,
    service.from('users').select('id').eq('role', 'psychologist') as Promise<{ data: { id: string }[] | null }>,
  ])

  // Pending psikolog: role=psychologist AND is_approved=false
  const psychIds = (psychUsers ?? []).map(u => u.id)
  let pendingPsychologists = 0
  if (psychIds.length > 0) {
    const { count } = await service
      .from('profiles')
      .select('id', { count: 'exact', head: true })
      .in('id', psychIds)
      .eq('is_approved', false) as { count: number | null }
    pendingPsychologists = count ?? 0
  }

  const totalRevenue = (payments ?? []).reduce((sum, p) => sum + (p.amount_paid ?? 0), 0)
  const monthlyRevenue = (monthlyPayments ?? []).reduce((sum, p) => sum + (p.amount_paid ?? 0), 0)

  return NextResponse.json({
    totalUsers: totalUsers ?? 0,
    totalPsychologists: totalPsychologists ?? 0,
    pendingPsychologists,
    totalSessions: totalSessions ?? 0,
    monthlySessions: monthlySessions ?? 0,
    totalRevenue,
    monthlyRevenue,
  })
}
