import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyClient = { from: (table: string) => any }

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const next = searchParams.get('next') // explicit yönlendirme varsa kullan

  if (code) {
    const supabase = await createClient()
    const { data, error } = await supabase.auth.exchangeCodeForSession(code)

    if (!error && data.user) {
      const userId = data.user.id
      const userEmail = data.user.email ?? ''

      const { data: existing } = await supabase
        .from('users')
        .select('id, role')
        .eq('id', userId)
        .maybeSingle() as { data: { id: string; role: string } | null }

      if (!existing) {
        const db = supabase as unknown as AnyClient
        const fullName = (data.user.user_metadata?.full_name as string | undefined) ?? userEmail
        await db.from('users').insert({
          id: userId,
          email: userEmail,
          role: 'client',
        })
        await db.from('profiles').insert({
          id: userId,
          full_name: fullName,
          avatar_url: (data.user.user_metadata?.avatar_url as string | undefined) ?? null,
          bio: null,
          specialties: [],
          price_per_session: null,
          is_approved: false,
          gender: null,
        })
        return NextResponse.redirect(`${origin}${next ?? '/client'}`)
      }

      // Mevcut kullanıcı — explicit next varsa onu kullan, yoksa role'e göre yönlendir
      if (next) {
        return NextResponse.redirect(`${origin}${next}`)
      }

      const role = existing.role
      if (role === 'psychologist') {
        return NextResponse.redirect(`${origin}/psychologist`)
      }
      if (role === 'admin') {
        return NextResponse.redirect(`${origin}/admin`)
      }
      return NextResponse.redirect(`${origin}/client`)
    }
  }

  return NextResponse.redirect(`${origin}/auth/login?error=auth`)
}