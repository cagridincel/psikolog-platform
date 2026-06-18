import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyClient = { from: (table: string) => any }

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ user: null })

  const db = supabase as unknown as AnyClient
  const { data: userData } = await db
    .from('users')
    .select('role')
    .eq('id', user.id)
    .single() as { data: { role: string } | null }

  return NextResponse.json({
    user: { id: user.id, email: user.email, role: userData?.role ?? 'client' }
  })
}