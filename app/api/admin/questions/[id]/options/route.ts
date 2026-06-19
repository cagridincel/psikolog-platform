import { NextResponse } from 'next/server'
import { createClient, createServiceRoleClient } from '@/lib/supabase/server'
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyClient = { from: (table: string) => any }

async function checkAdmin(db: AnyClient, userId: string) {
  const { data } = await db.from('users').select('role').eq('id', userId).single() as { data: { role: string } | null }
  return data?.role === 'admin'
}

// POST — seçenek ekle
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id: questionId } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Yetkisiz' }, { status: 401 })

  const db = supabase as unknown as AnyClient
  if (!await checkAdmin(db, user.id)) return NextResponse.json({ error: 'Yetkisiz' }, { status: 403 })

  const { text, emoji, next_question_id, order_index, specialties } = await req.json()
  if (!text) return NextResponse.json({ error: 'Seçenek metni zorunludur' }, { status: 400 })

  const service = createServiceRoleClient() as unknown as AnyClient

  const { data: option, error } = await service.from('question_options').insert({
    question_id: questionId,
    text,
    emoji: emoji ?? null,
    next_question_id: next_question_id ?? null,
    order_index: order_index ?? 99,
  }).select().single() as { data: any; error: any }

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Uzmanlık puanları
  if (specialties?.length > 0) {
    await service.from('option_specialties').insert(
      specialties.map((s: { specialty: string; weight: number }) => ({
        option_id: option.id,
        specialty: s.specialty,
        weight: s.weight,
      }))
    )
  }

  return NextResponse.json(option)
}
