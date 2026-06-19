import { NextResponse } from 'next/server'
import { createClient, createServiceRoleClient } from '@/lib/supabase/server'
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyClient = { from: (table: string) => any }

async function checkAdmin(supabase: AnyClient, userId: string) {
  const { data } = await supabase.from('users').select('role').eq('id', userId).single() as { data: { role: string } | null }
  return data?.role === 'admin'
}

// GET — tüm psikologları listele
export async function GET(req: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Yetkisiz' }, { status: 401 })

  const db = supabase as unknown as AnyClient
  if (!await checkAdmin(db, user.id)) return NextResponse.json({ error: 'Yetkisiz' }, { status: 403 })

  const { searchParams } = new URL(req.url)
  const status = searchParams.get('status') // 'pending' | 'approved' | 'suspended'

  const service = createServiceRoleClient() as unknown as AnyClient

  let query = service
    .from('profiles')
    .select('id, full_name, avatar_url, bio, specialties, price_per_session, is_approved, gender')

  const { data: psychUsers } = await service
    .from('users')
    .select('id, email, created_at')
    .eq('role', 'psychologist') as { data: { id: string; email: string; created_at: string }[] | null }

  const psychIds = (psychUsers ?? []).map(u => u.id)
  if (psychIds.length === 0) return NextResponse.json([])

  query = query.in('id', psychIds)
  if (status === 'pending') query = query.eq('is_approved', false)
  if (status === 'approved') query = query.eq('is_approved', true)

  const { data: profiles } = await query as { data: { id: string; full_name: string; avatar_url: string | null; bio: string | null; specialties: string[]; price_per_session: number | null; is_approved: boolean; gender: string | null }[] | null }

  const userMap = Object.fromEntries((psychUsers ?? []).map(u => [u.id, u]))
  const result = (profiles ?? []).map(p => ({ ...p, created_at: userMap[p.id]?.created_at ?? '', email: userMap[p.id]?.email ?? '' }))

  return NextResponse.json(result)
}

// POST — yeni psikolog ekle (admin tarafından)
export async function POST(req: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Yetkisiz' }, { status: 401 })

  const db = supabase as unknown as AnyClient
  if (!await checkAdmin(db, user.id)) return NextResponse.json({ error: 'Yetkisiz' }, { status: 403 })

  const { full_name, email, password, bio, specialties, price_per_session, gender } = await req.json()

  if (!full_name || !email || !password) {
    return NextResponse.json({ error: 'Ad, email ve şifre zorunludur' }, { status: 400 })
  }

  const service = createServiceRoleClient() as unknown as AnyClient

  // Supabase Auth'da kullanıcı oluştur
  const { data: newUser, error: createError } = await (createServiceRoleClient() as any).auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  })

  if (createError || !newUser.user) {
    return NextResponse.json({ error: createError?.message ?? 'Kullanıcı oluşturulamadı' }, { status: 500 })
  }

  const newId = newUser.user.id

  await service.from('users').insert({ id: newId, email, role: 'psychologist' })
  await service.from('profiles').insert({
    id: newId,
    full_name,
    avatar_url: null,
    bio: bio ?? null,
    specialties: specialties ?? [],
    price_per_session: price_per_session ? Number(price_per_session) : null,
    is_approved: true,
    gender: gender ?? null,
  })

  return NextResponse.json({ success: true, id: newId })
}

// PATCH — onayla / askıya al
export async function PATCH(req: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Yetkisiz' }, { status: 401 })

  const db = supabase as unknown as AnyClient
  if (!await checkAdmin(db, user.id)) return NextResponse.json({ error: 'Yetkisiz' }, { status: 403 })

  const { id, is_approved } = await req.json()
  if (!id || is_approved === undefined) return NextResponse.json({ error: 'Eksik parametre' }, { status: 400 })

  const service = createServiceRoleClient() as unknown as AnyClient
  await service.from('profiles').update({ is_approved }).eq('id', id)

  return NextResponse.json({ success: true })
}
