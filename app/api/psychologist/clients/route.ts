import { NextResponse } from 'next/server'
import { createClient, createServiceRoleClient } from '@/lib/supabase/server'
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyClient = { from: (table: string) => any }

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Yetkisiz' }, { status: 401 })

  const service = createServiceRoleClient() as unknown as AnyClient

  // Bu psikologla daha önce randevusu olan tüm danışanlar
  const { data: appointments } = await service
    .from('appointments')
    .select('client_id')
    .eq('psychologist_id', user.id) as { data: { client_id: string }[] | null }

  const clientIds = [...new Set((appointments ?? []).map(a => a.client_id))]

  if (clientIds.length === 0) return NextResponse.json([])

  const { data: profiles } = await service
    .from('profiles')
    .select('id, full_name, avatar_url')
    .in('id', clientIds) as { data: { id: string; full_name: string; avatar_url: string | null }[] | null }

  return NextResponse.json(profiles ?? [])
}
