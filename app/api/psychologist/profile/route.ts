import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyClient = { from: (table: string) => any }

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Yetkisiz' }, { status: 401 })

  const db = supabase as unknown as AnyClient
  const { data: profile } = await db
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single() as { data: any | null }

  return NextResponse.json(profile)
}

export async function PUT(req: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Yetkisiz' }, { status: 401 })

  const body = await req.json()
  const {
    full_name, bio, price_per_session, gender, specialties,
    experience_years, languages, approaches, age_groups,
    session_duration, session_types, education, certificates,
  } = body

  const db = supabase as unknown as AnyClient
  const { error } = await db
    .from('profiles')
    .update({
      full_name,
      bio,
      price_per_session: price_per_session ? Number(price_per_session) : null,
      gender: gender || null,
      specialties: specialties ?? [],
      experience_years: experience_years ? Number(experience_years) : null,
      languages: languages ?? [],
      approaches: approaches ?? [],
      age_groups: age_groups ?? [],
      session_duration: session_duration ? Number(session_duration) : 50,
      session_types: session_types ?? [],
      education: education ?? [],
      certificates: certificates ?? [],
    })
    .eq('id', user.id) as { error: any }

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}
