import { NextResponse } from 'next/server'
import { createClient, createServiceRoleClient } from '@/lib/supabase/server'
import { sendNotifications } from '@/lib/notifications'
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyClient = { from: (table: string) => any }

export async function POST(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: appointmentId } = await params

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Yetkisiz' }, { status: 401 })

  const db = supabase as unknown as AnyClient
  const { data: appointment } = await db
    .from('appointments')
    .select('id, client_id, psychologist_id, slot_id, status, slot_start_time')
    .eq('id', appointmentId)
    .eq('psychologist_id', user.id)
    .single() as {
      data: {
        id: string
        client_id: string
        psychologist_id: string
        slot_id: string
        status: string
        slot_start_time: string | null
      } | null
    }

  if (!appointment) return NextResponse.json({ error: 'Randevu bulunamadı' }, { status: 404 })
  if (appointment.status === 'completed') return NextResponse.json({ success: true })

  const service = createServiceRoleClient() as unknown as AnyClient
  const now = new Date().toISOString()

  await service.from('appointments').update({ status: 'completed' }).eq('id', appointmentId)
  await service.from('slots').update({ status: 'completed' }).eq('id', appointment.slot_id)

  // completed_sessions tablosuna kaydet
  await service.from('completed_sessions').insert({
    appointment_id: appointmentId,
    client_id: appointment.client_id,
    psychologist_id: appointment.psychologist_id,
    actual_start_time: appointment.slot_start_time ?? now,
    actual_end_time: now,
    duration_minutes: 50,
    outcome: 'attended',
  })

  await sendNotifications([{
    userId: appointment.client_id,
    title: 'Seans tamamlandı',
    description: 'Seansınız başarıyla tamamlandı.',
  }])

  return NextResponse.json({ success: true })
}
