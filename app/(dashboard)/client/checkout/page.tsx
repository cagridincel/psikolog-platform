import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import CheckoutPage from './CheckoutPage'

interface Props {
  searchParams: Promise<{ psychologistId?: string; slotId?: string }>
}

export default async function Page({ searchParams }: Props) {
  const { psychologistId, slotId } = await searchParams

  if (!psychologistId || !slotId) redirect('/')

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect(`/auth/login?next=/client/checkout?psychologistId=${psychologistId}&slotId=${slotId}`)

  const { data: profile } = await supabase
    .from('profiles')
    .select('id, full_name, avatar_url, price_per_session, specialties')
    .eq('id', psychologistId)
    .single()

  if (!profile) redirect('/')

  const { data: slot } = await supabase
    .from('slots')
    .select('id, start_time, end_time')
    .eq('id', slotId)
    .single()

  if (!slot) redirect('/')

  const { data: packages } = await supabase
    .from('packages')
    .select('*')
    .eq('is_active', true)
    .order('order_index')

  return (
    <CheckoutPage
      profile={profile}
      slot={slot}
      packages={packages ?? []}
      userId={user.id}
    />
  )
}
