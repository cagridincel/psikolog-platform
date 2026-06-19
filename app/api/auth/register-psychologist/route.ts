import { NextResponse } from 'next/server'
import { createServiceRoleClient } from '@/lib/supabase/server'
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyClient = { from: (table: string) => any }

export async function POST(req: Request) {
  const { id, email, full_name, bio, specialties, price_per_session, gender } = await req.json()

  if (!id || !email || !full_name) {
    return NextResponse.json({ error: 'Eksik parametre' }, { status: 400 })
  }

  const service = createServiceRoleClient() as unknown as AnyClient

  // Zaten kayıtlı mı?
  const { data: existing } = await service
    .from('users').select('id').eq('id', id).maybeSingle() as { data: { id: string } | null }

  if (existing) return NextResponse.json({ success: true })

  await service.from('users').insert({
    id,
    email,
    role: 'psychologist',
  })

  await service.from('profiles').insert({
    id,
    full_name,
    avatar_url: null,
    bio: bio ?? null,
    specialties: specialties ?? [],
    price_per_session: price_per_session ?? null,
    is_approved: false,
    gender: gender ?? null,
  })

  return NextResponse.json({ success: true })
}
