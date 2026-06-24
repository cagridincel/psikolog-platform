import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import ClinicalNotesPage from './ClinicalNotesPage'

interface Props {
  params: Promise<{ appointmentId: string }>
}

export default async function Page({ params }: Props) {
  const { appointmentId } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  return <ClinicalNotesPage appointmentId={appointmentId} />
}
