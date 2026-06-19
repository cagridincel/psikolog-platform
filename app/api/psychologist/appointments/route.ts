import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyClient = { from: (table: string) => any }

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Yetkisiz' }, { status: 401 })

  const db = supabase as unknown as AnyClient

  const { data: rawAppointments } = await db
    .from('appointments')
    .select('id, slot_id, status, client_id')
    .eq('psychologist_id', user.id)
    .in('status', ['pending_approval', 'scheduled']) as {
      data: { id: string; slot_id: string; status: string; client_id: string }[] | null
    }

  const clientIds = [...new Set((rawAppointments ?? []).map(a => a.client_id))]

  const { data: clientProfiles } = clientIds.length > 0
    ? await db
        .from('profiles')
        .select('id, full_name, avatar_url')
        .in('id', clientIds) as { data: { id: string; full_name: string; avatar_url: string | null }[] | null }
    : { data: [] as { id: string; full_name: string; avatar_url: string | null }[] }

  const profileMap = Object.fromEntries((clientProfiles ?? []).map(p => [p.id, p]))

  const appointments = (rawAppointments ?? []).map(a => ({
    ...a,
    profiles: profileMap[a.client_id] ?? null,
  }))

  return NextResponse.json(appointments)
}
