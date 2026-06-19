import { NextResponse } from 'next/server'
import { createClient, createServiceRoleClient } from '@/lib/supabase/server'
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyClient = { from: (table: string) => any }

async function checkAdmin(db: AnyClient, userId: string) {
  const { data } = await db.from('users').select('role').eq('id', userId).single() as { data: { role: string } | null }
  return data?.role === 'admin'
}

export async function GET(req: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Yetkisiz' }, { status: 401 })

  const db = supabase as unknown as AnyClient
  if (!await checkAdmin(db, user.id)) return NextResponse.json({ error: 'Yetkisiz' }, { status: 403 })

  const service = createServiceRoleClient() as unknown as AnyClient

  const { data: questions } = await service
    .from('questions')
    .select(`
      id, text, description, type, is_first, is_active, order_index,
      question_options!question_options_question_id_fkey (
        id, text, emoji, next_question_id, order_index,
        option_specialties ( id, specialty, weight )
      )
    `)
    .order('order_index') as { data: any[] | null }

  return NextResponse.json(questions ?? [])
}

export async function POST(req: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Yetkisiz' }, { status: 401 })

  const db = supabase as unknown as AnyClient
  if (!await checkAdmin(db, user.id)) return NextResponse.json({ error: 'Yetkisiz' }, { status: 403 })

  const { text, description, type, is_first, order_index } = await req.json()
  if (!text) return NextResponse.json({ error: 'Soru metni zorunludur' }, { status: 400 })

  const service = createServiceRoleClient() as unknown as AnyClient

  // Eğer is_first true ise diğerlerini false yap
  if (is_first) {
    await service.from('questions').update({ is_first: false }).eq('is_first', true)
  }

  const { data, error } = await service.from('questions').insert({
    text,
    description: description ?? null,
    type: type ?? 'single',
    is_first: is_first ?? false,
    is_active: true,
    order_index: order_index ?? 99,
  }).select().single() as { data: any; error: any }

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json(data)
}
