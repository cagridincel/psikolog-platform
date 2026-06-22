import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import PsychologistDashboard from './PsychologistDashboard'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyClient = { from: (table: string) => any }

export default async function Page() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login?next=/psychologist')

  const db = supabase as unknown as AnyClient

  const { data: profile } = await db
    .from('profiles')
    .select('id, full_name, avatar_url, is_approved, specialties, bio, price_per_session')
    .eq('id', user.id)
    .maybeSingle() as { data: { id: string; full_name: string; avatar_url: string | null; is_approved: boolean; specialties: string[]; bio: string | null; price_per_session: number | null } | null }

  if (!profile?.is_approved) {
    return (
      <main className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="bg-white rounded-2xl border p-10 text-center max-w-sm">
          <div className="w-14 h-14 bg-amber-50 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#D97706" strokeWidth="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
          </div>
          <h1 className="text-lg font-semibold text-gray-900 mb-2">Hesabınız inceleniyor</h1>
          <p className="text-gray-500 text-sm">Admin onayından sonra panele erişebilirsiniz.</p>
        </div>
      </main>
    )
  }

  const now = new Date()
  const weekStart = new Date(now)
  weekStart.setDate(now.getDate() - now.getDay() + 1)
  weekStart.setHours(0, 0, 0, 0)
  const weekEnd = new Date(weekStart)
  weekEnd.setDate(weekStart.getDate() + 7)

  const { data: slots } = await db
    .from('slots')
    .select('id, start_time, end_time, status')
    .eq('psychologist_id', user.id)
    .gte('start_time', weekStart.toISOString())
    .lt('start_time', weekEnd.toISOString())
    .order('start_time') as { data: { id: string; start_time: string; end_time: string; status: string }[] | null }

  const { data: rawAppointments } = await db
    .from('appointments')
    .select('id, slot_id, status, client_id')
    .eq('psychologist_id', user.id)
    .in('status', ['pending_approval', 'scheduled']) as { data: { id: string; slot_id: string; status: string; client_id: string }[] | null }

  const clientIds = [...new Set((rawAppointments ?? []).map((a) => a.client_id))]
  const { data: clientProfiles } = clientIds.length > 0
    ? await db.from('profiles').select('id, full_name, avatar_url').in('id', clientIds) as { data: { id: string; full_name: string; avatar_url: string | null }[] | null }
    : { data: [] as { id: string; full_name: string; avatar_url: string | null }[] }

  const profileMap = Object.fromEntries((clientProfiles ?? []).map((p) => [p.id, p]))
  const appointments = (rawAppointments ?? []).map((a) => ({
    ...a,
    profiles: profileMap[a.client_id] ?? null,
  }))

  const { count: totalSessions } = await db
    .from('appointments')
    .select('id', { count: 'exact', head: true })
    .eq('psychologist_id', user.id)
    .eq('status', 'completed') as { count: number | null }

  const { count: pendingCount } = await db
    .from('appointments')
    .select('id', { count: 'exact', head: true })
    .eq('psychologist_id', user.id)
    .eq('status', 'pending_approval') as { count: number | null }

  // Unique danışan sayısı — distinct client_id
  const { data: clientIdRows } = await db
    .from('appointments')
    .select('client_id')
    .eq('psychologist_id', user.id) as { data: { client_id: string }[] | null }

  const totalClients = new Set((clientIdRows ?? []).map(r => r.client_id)).size

  const { data: notifications } = await db
    .from('notifications')
    .select('id, title, description, is_read, created_at')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
    .limit(10) as { data: { id: string; title: string; description: string; is_read: boolean; created_at: string }[] | null }

  return (
    <PsychologistDashboard
      psychologistId={user.id}
      profile={profile}
      slots={slots ?? []}
      appointments={appointments}
      weekStart={weekStart.toISOString()}
      stats={{
        totalSessions: totalSessions ?? 0,
        pendingCount: pendingCount ?? 0,
        totalClients,
        availableSlots: (slots ?? []).filter(s => s.status === 'available').length,
      }}
      notifications={notifications ?? []}
    />
  )
}
