import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import PsychologistDashboard from './PsychologistDashboard'

export default async function Page() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login?next=/psychologist')

  const { data: profile } = await supabase
    .from('profiles')
    .select('id, full_name, is_approved')
    .eq('id', user.id)
    .single()

  if (!profile?.is_approved) {
    return (
      <main className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-xl font-semibold text-gray-900 mb-2">Hesabınız inceleniyor</h1>
          <p className="text-gray-500">Admin onayından sonra panele erişebilirsiniz.</p>
        </div>
      </main>
    )
  }

  // Bu haftanın slotlarını çek
  const now = new Date()
  const weekStart = new Date(now)
  weekStart.setDate(now.getDate() - now.getDay() + 1)
  weekStart.setHours(0, 0, 0, 0)
  const weekEnd = new Date(weekStart)
  weekEnd.setDate(weekStart.getDate() + 7)

  const { data: slots } = await supabase
    .from('slots')
    .select('id, start_time, end_time, status')
    .eq('psychologist_id', user.id)
    .gte('start_time', weekStart.toISOString())
    .lt('start_time', weekEnd.toISOString())
    .order('start_time')

  const { data: appointments } = await supabase
    .from('appointments')
    .select('id, slot_id, status, client_id, profiles!appointments_client_id_fkey(full_name, avatar_url)')
    .eq('psychologist_id', user.id)
    .in('status', ['pending_approval', 'scheduled'])

  return (
    <PsychologistDashboard
      psychologistId={user.id}
      profile={profile}
      slots={slots ?? []}
      appointments={(appointments ?? []) as any}
      weekStart={weekStart.toISOString()}
    />
  )
}
