import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const next = searchParams.get('next') ?? '/client'

  if (code) {
    const supabase = await createClient()
    const { data, error } = await supabase.auth.exchangeCodeForSession(code)

    if (!error && data.user) {
      const userId = data.user.id
      const userEmail = data.user.email ?? ''

      const { data: existing } = await supabase
        .from('users')
        .select('id')
        .eq('id', userId)
        .maybeSingle()

      if (!existing) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        await supabase.from('users').upsert({ id: userId, email: userEmail, role: 'client' } as any)
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        await supabase.from('profiles').upsert({
          id: userId,
          full_name: data.user.user_metadata?.full_name ?? userEmail,
          avatar_url: data.user.user_metadata?.avatar_url ?? null,
          specialties: [],
          is_approved: false,
        } as any)
      }

      return NextResponse.redirect(`${origin}${next}`)
    }
  }

  return NextResponse.redirect(`${origin}/login?error=auth`)
}