import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'

export default async function ClientDashboard() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  return (
    <main className="min-h-screen bg-gray-50 p-8">
      <h1 className="text-2xl font-bold text-gray-900">Hosgeldiniz</h1>
      <p className="text-gray-500 mt-2">{user.email}</p>
    </main>
  )
}