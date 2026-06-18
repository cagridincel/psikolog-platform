import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyClient = { from: (table: string) => any }

export async function POST(req: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Yetkisiz' }, { status: 401 })

  const { full_name, bio, specialties, price_per_session, gender } = await req.json()

  if (!full_name || !bio || !specialties?.length || !price_per_session) {
    return NextResponse.json({ error: 'Eksik alanlar' }, { status: 400 })
  }

  const db = supabase as unknown as AnyClient
  const { error } = await db.from('profiles').update({
    full_name,
    bio,
    specialties,
    price_per_session: Number(price_per_session),
    gender: gender || null,
  }).eq('id', user.id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ success: true })
}
