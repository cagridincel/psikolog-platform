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
    .select('*')
    .eq('id', appointmentId)
    .eq('psychologist_id', user.id)
    .single() as { data: any; error: any }

  if (fetchError || !appointment) {
    return NextResponse.json({ error: 'Randevu bulunamadi' }, { status: 404 })
  }

  if (appointment.status !== 'pending_approval') {
    return NextResponse.json({ error: 'Bu randevu zaten islendi' }, { status: 409 })
  }

  const service = createServiceRoleClient() as any

  try {
    const scheduledAt = new Date(
      appointment.slot_start_time ?? appointment.created_at
    )

    // Daily.co key yoksa dummy URL kullan
    let roomUrl = `https://meet.daily.co/session-${appointmentId}`

    if (process.env.DAILY_API_KEY) {
      const room = await createRoom(appointmentId, scheduledAt)
      roomUrl = room.url
    }

    await service
      .from('appointments')
      .update({ status: 'scheduled', meeting_room_url: roomUrl })
      .eq('id', appointmentId)

    await service
      .from('slots')
      .update({ status: 'booked' })
      .eq('id', appointment.slot_id)

    await sendNotifications([
      {
        userId: appointment.client_id,
        title: 'Randevunuz onaylandi!',
        description: 'Psikologunuz randevunuzu onayladi.',
      },
      {
        userId: user.id,
        title: 'Randevu onaylandi',
        description: 'Randevu takvime eklendi.',
      },
    ])

    return NextResponse.json({ success: true, roomUrl })
  } catch (err) {
    console.error('Randevu onaylama hatasi:', err)
    return NextResponse.json({ error: 'Sunucu hatasi' }, { status: 500 })
  }
}