import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import AdminDashboard from './AdminDashboard'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyClient = { from: (table: string) => any }

export default async function AdminPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/admin/login')

  const db = supabase as unknown as AnyClient
  const { data: userData } = await db
    .from('users').select('role').eq('id', user.id).single() as { data: { role: string } | null }

  if (userData?.role !== 'admin') redirect('/admin/login?error=unauthorized')

  const { data: profile } = await db
    .from('profiles')
    .select('full_name')
    .eq('id', user.id)
    .single() as { data: { full_name: string } | null }

  return <AdminDashboard adminId={user.id} adminName={profile?.full_name ?? 'Admin'} />
}
