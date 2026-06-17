import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import BookingPage from './BookingPage'

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
    .select('id, full_name, bio, specialties, price_per_session, avatar_url')
    .eq('id', psychologistId)
    .eq('is_approved', true)
    .single()

  if (!profile) redirect('/')

  const { data: slots } = await supabase
    .from('slots')
    .select('id, start_time, end_time, status')
    .eq('psychologist_id', psychologistId)
    .eq('status', 'available')
    .gte('start_time', new Date().toISOString())
    .order('start_time', { ascending: true })

  // Musterinin aktif paketi var mi kontrol et
  const { data: activePackage } = await supabase
    .from('payments')
    .select('id, total_sessions_credited, sessions_used, psychologist_id')
    .eq('client_id', user.id)
    .eq('psychologist_id', psychologistId)
    .eq('status', 'paid')
    .lt('sessions_used', 3)
    .single()

  return (
    <BookingPage
      profile={profile}
      slots={slots ?? []}
      userId={user.id}
      activePackage={activePackage ?? null}
    />
  )
}
