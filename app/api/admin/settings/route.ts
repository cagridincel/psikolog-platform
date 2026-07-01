import { NextResponse } from 'next/server'
import { createClient, createServiceRoleClient } from '@/lib/supabase/server'
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyClient = { from: (table: string) => any }

async function checkAdmin(db: AnyClient, userId: string) {
  const { data } = await db.from('users').select('role').eq('id', userId).single() as { data: { role: string } | null }
  return data?.role === 'admin'
}

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Yetkisiz' }, { status: 401 })

  const db = supabase as unknown as AnyClient
  if (!await checkAdmin(db, user.id)) return NextResponse.json({ error: 'Yetkisiz' }, { status: 403 })

  const service = createServiceRoleClient() as unknown as AnyClient
  const { data } = await service
    .from('platform_settings')
    .select('key, value, description, updated_at')
    .order('key') as { data: { key: string; value: boolean | number; description: string; updated_at: string }[] | null }

  return NextResponse.json(data ?? [])
}

export async function PUT(req: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Yetkisiz' }, { status: 401 })

  const db = supabase as unknown as AnyClient
  if (!await checkAdmin(db, user.id)) return NextResponse.json({ error: 'Yetkisiz' }, { status: 403 })

  const { key, value } = await req.json()
  if (!key || value === undefined) return NextResponse.json({ error: 'Eksik parametre' }, { status: 400 })

  const service = createServiceRoleClient() as unknown as AnyClient
  const { error } = await service
    .from('platform_settings')
    .update({ value, updated_at: new Date().toISOString() })
    .eq('key', key) as { error: any }

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}
