import { createClient, createServiceRoleClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyClient = { from: (table: string) => any }

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')

  if (!code) return NextResponse.redirect(`${origin}/psikolog-ol?error=auth`)

  const supabase = await createClient()
  const { data, error } = await supabase.auth.exchangeCodeForSession(code)

  if (error || !data.user) {
    return NextResponse.redirect(`${origin}/psikolog-ol?error=auth`)
  }

  const userId = data.user.id
  const userEmail = data.user.email ?? ''
  const service = createServiceRoleClient() as unknown as AnyClient

  const { data: existing } = await supabase
    .from('users')
    .select('id, role')
    .eq('id', userId)
    .maybeSingle()

  if (existing) {
    const role = (existing as { role: string }).role
    if (role === 'psychologist') return NextResponse.redirect(`${origin}/psychologist`)
    return NextResponse.redirect(`${origin}/client`)
  }

  // Yeni psikolog — temel kaydı oluştur
  await service.from('users').insert({
    id: userId,
    email: userEmail,
    role: 'psychologist',
  })

  await service.from('profiles').insert({
    id: userId,
    full_name: (data.user.user_metadata?.full_name as string | undefined) ?? userEmail,
    avatar_url: (data.user.user_metadata?.avatar_url as string | undefined) ?? null,
    bio: null,
    specialties: [],
    price_per_session: null,
    is_approved: false,
    gender: null,
  })

  // Finalize sayfasına yönlendir — form verisi orada sessionStorage'dan alınır
  return NextResponse.redirect(`${origin}/auth/psikolog-tamamla`)
}
