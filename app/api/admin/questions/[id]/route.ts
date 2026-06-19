import { NextResponse } from 'next/server'
import { createClient, createServiceRoleClient } from '@/lib/supabase/server'
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyClient = { from: (table: string) => any }

async function checkAdmin(db: AnyClient, userId: string) {
  const { data } = await db.from('users').select('role').eq('id', userId).single() as { data: { role: string } | null }
  return data?.role === 'admin'
}

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Yetkisiz' }, { status: 401 })

  const db = supabase as unknown as AnyClient
  if (!await checkAdmin(db, user.id)) return NextResponse.json({ error: 'Yetkisiz' }, { status: 403 })

  const { text, description, type, is_first, is_active, order_index } = await req.json()
  const service = createServiceRoleClient() as unknown as AnyClient

  if (is_first) {
    await service.from('questions').update({ is_first: false }).neq('id', id)
  }

  const { error } = await service.from('questions').update({
    text,
    description: description ?? null,
    type,
    is_first: is_first ?? false,
    is_active: is_active ?? true,
    order_index: order_index ?? 99,
  }).eq('id', id) as { error: any }

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ success: true })
}

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Yetkisiz' }, { status: 401 })

  const db = supabase as unknown as AnyClient
  if (!await checkAdmin(db, user.id)) return NextResponse.json({ error: 'Yetkisiz' }, { status: 403 })

  const service = createServiceRoleClient() as unknown as AnyClient
  await service.from('questions').delete().eq('id', id)

  return NextResponse.json({ success: true })
}
