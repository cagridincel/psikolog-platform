import { NextResponse } from 'next/server'
import { createClient, createServiceRoleClient } from '@/lib/supabase/server'
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyClient = { from: (table: string) => any }

export async function POST(req: Request) {
  const { full_name } = await req.json()

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Yetkisiz' }, { status: 401 })

  // Zaten kayıtlı mı?
  const { data: existing } = await supabase
    .from('users')
    .select('id')
    .eq('id', user.id)
    .maybeSingle()

  if (existing) return NextResponse.json({ success: true })

  const service = createServiceRoleClient() as unknown as AnyClient

  await service.from('users').insert({
    id: user.id,
    email: user.email ?? '',
    role: 'client',
  })

  await service.from('profiles').insert({
    id: user.id,
    full_name: full_name ?? user.user_metadata?.full_name ?? user.email ?? '',
    avatar_url: user.user_metadata?.avatar_url ?? null,
    bio: null,
    specialties: [],
    price_per_session: null,
    is_approved: false,
    gender: null,
  })

  return NextResponse.json({ success: true })
}
