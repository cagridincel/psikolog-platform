import { NextResponse } from 'next/server'
import { createClient, createServiceRoleClient } from '@/lib/supabase/server'
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyClient = { from: (table: string) => any }

async function checkAdmin(db: AnyClient, userId: string) {
  const { data } = await db.from('users').select('role').eq('id', userId).single() as { data: { role: string } | null }
  return data?.role === 'admin'
}

export async function PUT(req: Request, { params }: { params: Promise<{ id: string; oid: string }> }) {
  const { oid } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Yetkisiz' }, { status: 401 })

  const db = supabase as unknown as AnyClient
  if (!await checkAdmin(db, user.id)) return NextResponse.json({ error: 'Yetkisiz' }, { status: 403 })

  const { text, emoji, next_question_id, order_index, specialties } = await req.json()
  const service = createServiceRoleClient() as unknown as AnyClient

  await service.from('question_options').update({
    text,
    emoji: emoji ?? null,
    next_question_id: next_question_id ?? null,
    order_index: order_index ?? 99,
  }).eq('id', oid)

  // Uzmanlıkları güncelle — sil + yeniden ekle
  await service.from('option_specialties').delete().eq('option_id', oid)
  if (specialties?.length > 0) {
    await service.from('option_specialties').insert(
      specialties.map((s: { specialty: string; weight: number }) => ({
        option_id: oid,
        specialty: s.specialty,
        weight: s.weight,
      }))
    )
  }

  return NextResponse.json({ success: true })
}

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string; oid: string }> }) {
  const { oid } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Yetkisiz' }, { status: 401 })

  const db = supabase as unknown as AnyClient
  if (!await checkAdmin(db, user.id)) return NextResponse.json({ error: 'Yetkisiz' }, { status: 403 })

  const service = createServiceRoleClient() as unknown as AnyClient
  await service.from('option_specialties').delete().eq('option_id', oid)
  await service.from('question_options').delete().eq('id', oid)

  return NextResponse.json({ success: true })
}
