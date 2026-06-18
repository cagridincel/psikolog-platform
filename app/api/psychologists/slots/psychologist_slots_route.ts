import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET(req: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Yetkisiz' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const start = searchParams.get('start')
  const end = searchParams.get('end')

  const query = supabase
    .from('slots')
    .select('id, start_time, end_time, status')
    .eq('psychologist_id', user.id)
    .order('start_time')

  if (start) query.gte('start_time', start)
  if (end) query.lt('start_time', end)

  const { data } = await query
  return NextResponse.json(data ?? [])
}

export async function POST(req: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Yetkisiz' }, { status: 401 })

  const { start_time, end_time } = await req.json()

  const { data, error } = await supabase
    .from('slots')
    .insert({
      psychologist_id: user.id,
      start_time,
      end_time,
      status: 'available',
    })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}
