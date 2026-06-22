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
    .select('id, client_id, psychologist_id, slot_id, status')
    .eq('id', appointmentId)
    .eq('psychologist_id', user.id) // sadece psikolog bitirebilir
    .single() as { data: { id: string; client_id: string; psychologist_id: string; slot_id: string; status: string } | null }

  if (!appointment) return NextResponse.json({ error: 'Randevu bulunamadı' }, { status: 404 })
  if (appointment.status === 'completed') return NextResponse.json({ success: true }) // zaten bitti

  const service = createServiceRoleClient() as unknown as AnyClient

  await service
    .from('appointments')
    .update({ status: 'completed' })
    .eq('id', appointmentId)

  await service
    .from('slots')
    .update({ status: 'completed' })
    .eq('id', appointment.slot_id)

  await sendNotifications([{
    userId: appointment.client_id,
    title: 'Seans tamamlandı',
    description: 'Seansınız başarıyla tamamlandı.',
  }])

  return NextResponse.json({ success: true })
}
