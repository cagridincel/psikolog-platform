import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import BookingPage from './BookingPage'
import { getSetting } from '@/lib/settings'

interface Props {
  params: Promise<{ psychologistId: string }>
}

export default async function Page({ params }: Props) {
  const { psychologistId } = await params
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect(`/auth/login?next=/client/book/${psychologistId}`)

  const { data: profile } = await supabase
    .from('profiles')
    .select(`
      id, full_name, bio, specialties, price_per_session, avatar_url,
      experience_years, languages, approaches, age_groups,
      session_duration, session_types, education, certificates, gender
    `)
    .eq('id', psychologistId)
    .eq('is_approved', true)
    .single()

  if (!profile) redirect('/')

  // Tek psikolog kısıtlaması açık mı?
  const restrictionEnabled = await getSetting('single_psychologist_restriction')

  if (restrictionEnabled) {
    // Başka bir psikologda GERÇEKTEN kalan seans hakkı var mı?
    const { data: otherPackages } = await supabase
      .from('payments')
      .select('id, total_sessions_credited, sessions_used')
      .eq('client_id', user.id)
      .eq('status', 'paid')
      .neq('psychologist_id', psychologistId) as {
        data: { id: string; total_sessions_credited: number; sessions_used: number }[] | null
      }

    // Client-side'da remaining kontrolü — sessions_used < total_sessions_credited
    const hasOtherActivePackage = (otherPackages ?? []).some(
      p => p.sessions_used < p.total_sessions_credited
    )

    if (hasOtherActivePackage) {
      redirect(`/client?error=active_package_exists`)
    }
  }

  const { data: slots } = await supabase
    .from('slots')
    .select('id, start_time, end_time, status')
    .eq('psychologist_id', psychologistId)
    .eq('status', 'available')
    .gte('start_time', new Date().toISOString())
    .order('start_time', { ascending: true })

  const { data: activePackage } = await supabase
    .from('payments')
    .select('id, total_sessions_credited, sessions_used, psychologist_id')
    .eq('client_id', user.id)
    .eq('psychologist_id', psychologistId)
    .eq('status', 'paid')
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  return (
    <BookingPage
      profile={profile}
      slots={slots ?? []}
      userId={user.id}
      activePackage={activePackage ?? null}
    />
  )
}
