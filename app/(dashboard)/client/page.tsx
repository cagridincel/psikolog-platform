import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import ClientDashboard from './ClientDashboard'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyClient = { from: (table: string) => any }

export default async function ClientDashboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login?next=/client')

  const db = supabase as unknown as AnyClient

  const { data: userProfile } = await db
    .from('profiles')
    .select('full_name, avatar_url')
    .eq('id', user.id)
    .single() as { data: { full_name: string; avatar_url: string | null } | null }

  const { data: activePayment } = await db
    .from('payments')
    .select('id, total_sessions_credited, sessions_used, psychologist_id')
    .eq('client_id', user.id)
    .eq('status', 'paid')
    .order('created_at', { ascending: false })
    .limit(1)
    .single() as { data: { id: string; total_sessions_credited: number; sessions_used: number; psychologist_id: string } | null }

  let psychologistProfile = null
  if (activePayment?.psychologist_id) {
    const { data } = await db
      .from('profiles')
      .select('id, full_name, avatar_url, bio, specialties')
      .eq('id', activePayment.psychologist_id)
      .single() as { data: { id: string; full_name: string; avatar_url: string | null; bio: string | null; specialties: string[] } | null }
    psychologistProfile = data
  }

  const { data: upcomingAppointments } = await db
    .from('appointments')
    .select('id, status, slot_id, meeting_room_url, slot_start_time')
    .eq('client_id', user.id)
    .in('status', ['pending_approval', 'scheduled'])
    .order('slot_start_time', { ascending: true })
    .limit(5) as { data: { id: string; status: string; slot_id: string; meeting_room_url: string | null; slot_start_time: string | null }[] | null }

  const { data: notifications } = await db
    .from('notifications')
    .select('id, title, description, is_read, created_at')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
    .limit(10) as { data: { id: string; title: string; description: string; is_read: boolean; created_at: string }[] | null }

  // Tüm ödeme geçmişi + psikolog adları
  const { data: allPayments } = await db
    .from('payments')
    .select('id, amount_paid, total_sessions_credited, sessions_used, status, created_at, psychologist_id, iyzico_payment_id')
    .eq('client_id', user.id)
    .order('created_at', { ascending: false }) as {
      data: {
        id: string
        amount_paid: number
        total_sessions_credited: number
        sessions_used: number
        status: string
        created_at: string
        psychologist_id: string
        iyzico_payment_id: string | null
      }[] | null
    }

  // Psikolog isimlerini çek
  const psychIds = [...new Set((allPayments ?? []).map(p => p.psychologist_id))]
  const { data: psychProfiles } = psychIds.length > 0
    ? await db.from('profiles').select('id, full_name, avatar_url').in('id', psychIds) as { data: { id: string; full_name: string; avatar_url: string | null }[] | null }
    : { data: [] as { id: string; full_name: string; avatar_url: string | null }[] }

  const psychMap = Object.fromEntries((psychProfiles ?? []).map(p => [p.id, p]))
  const paymentsWithPsych = (allPayments ?? []).map(p => ({
    ...p,
    psychologist_name: psychMap[p.psychologist_id]?.full_name ?? '',
    psychologist_avatar: psychMap[p.psychologist_id]?.avatar_url ?? null,
  }))

  return (
    <ClientDashboard
      userName={userProfile?.full_name ?? user.email ?? 'Kullanıcı'}
      userAvatar={userProfile?.avatar_url ?? null}
      activePayment={activePayment ?? null}
      psychologist={psychologistProfile}
      upcomingAppointments={upcomingAppointments ?? []}
      notifications={notifications ?? []}
      payments={paymentsWithPsych}
    />
  )
}
