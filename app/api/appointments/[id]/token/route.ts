import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createMeetingToken } from '@/lib/daily'
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyClient = { from: (table: string) => any }

export async function GET(
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
    .select('id, client_id, psychologist_id, status, slot_start_time, meeting_room_url')
    .eq('id', appointmentId)
    .single() as {
      data: {
        id: string
        client_id: string
        psychologist_id: string
        status: string
        slot_start_time: string | null
        meeting_room_url: string | null
      } | null
    }

  if (!appointment) return NextResponse.json({ error: 'Randevu bulunamadı' }, { status: 404 })

  // Kullanıcı bu randevuda mı?
  const isClient = appointment.client_id === user.id
  const isPsychologist = appointment.psychologist_id === user.id
  if (!isClient && !isPsychologist) return NextResponse.json({ error: 'Yetkisiz' }, { status: 403 })

  if (appointment.status !== 'scheduled') {
    return NextResponse.json({ error: 'Bu randevu henüz onaylanmadı' }, { status: 409 })
  }

  // 2 dakika kuralı
  const startTime = appointment.slot_start_time ? new Date(appointment.slot_start_time) : null
  const now = new Date()

  if (startTime) {
    const diffMs = startTime.getTime() - now.getTime()
    const diffMins = diffMs / 60000

    if (diffMins > 20) {
      return NextResponse.json({
        early: true,
        secondsUntilStart: Math.floor(diffMs / 1000),
        startTime: startTime.toISOString(),
      })
    }

    const sessionEndMs = startTime.getTime() + (90 + 15) * 60000
    if (now.getTime() > sessionEndMs) {
      return NextResponse.json({ error: 'Seans süresi doldu' }, { status: 410 })
    }
  }

  // Token oluştur
  const roomUrl = appointment.meeting_room_url ?? `https://meet.daily.co/session-${appointmentId}`
  const roomName = roomUrl.split('/').pop() ?? `session-${appointmentId}`

  let token: string | null = null
  if (process.env.DAILY_API_KEY) {
    try {
      token = await createMeetingToken(roomName, user.id, isPsychologist)
    } catch {
      // token olmadan da bağlanılabilir
    }
  }

  return NextResponse.json({
    roomUrl,
    token,
    isPsychologist,
    startTime: startTime?.toISOString() ?? null,
  })
}
