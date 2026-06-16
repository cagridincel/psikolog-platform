import { NextResponse } from 'next/server'
import { createClient, createServiceRoleClient } from '@/lib/supabase/server'
import { createRoom, createMeetingToken } from '@/lib/daily'
import { sendNotifications } from '@/lib/notifications'

export async function POST(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: appointmentId } = await params

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Yetkisiz' }, { status: 401 })

  const { data: appointment, error: fetchError } = await supabase
    .from('appointments')
    .select('*, slots(start_time)')
    .eq('id', appointmentId)
    .eq('psychologist_id', user.id)
    .single()

  if (fetchError || !appointment) {
    return NextResponse.json({ error: 'Randevu bulunamadi' }, { status: 404 })
  }

  if (appointment.status !== 'pending_approval') {
    return NextResponse.json({ error: 'Bu randevu zaten islendi' }, { status: 409 })
  }

  const service = createServiceRoleClient()

  try {
    const scheduledAt = new Date(
      appointment.slot_start_time ??
      (appointment.slots as { start_time: string }).start_time
    )

    const room = await createRoom(appointmentId, scheduledAt)
    const [clientToken, psychToken] = await Promise.all([
      createMeetingToken(room.name, appointment.client_id, false),
      createMeetingToken(room.name, user.id, true),
    ])

    await service.from('appointments').update({
      status: 'scheduled',
      meeting_room_url: room.url,
    }).eq('id', appointmentId)

    await service.from('slots').update({ status: 'booked' }).eq('id', appointment.slot_id)

    const startStr = scheduledAt.toLocaleString('tr-TR', {
      day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit',
    })

    await sendNotifications([
      {
        userId: appointment.client_id,
        title: 'Randevunuz onaylandi!',
        description: `${startStr} tarihli seansiniz onaylandi.`,
      },
      {
        userId: user.id,
        title: 'Randevu onaylandi',
        description: `${startStr} tarihli seans takvime eklendi.`,
      },
    ])

    return NextResponse.json({ success: true, roomUrl: room.url, clientToken, psychToken })
  } catch (err) {
    console.error('Randevu onaylama hatasi:', err)
    return NextResponse.json({ error: 'Sunucu hatasi' }, { status: 500 })
  }
}
