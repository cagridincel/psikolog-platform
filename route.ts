import { NextResponse } from 'next/server'
import { createClient, createServiceRoleClient } from '@/lib/supabase/server'
import { createRoom, createMeetingToken } from '@/lib/daily'
import { sendNotifications } from '@/lib/notifications'

export async function POST(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: appointmentId } = await params

  // 1. Oturum kontrolü — sadece psikolog kabul edebilir
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Yetkisiz' }, { status: 401 })

  // 2. Randevu bilgilerini al
  const { data: appointment, error: fetchError } = await supabase
    .from('appointments')
    .select('*, slots(start_time)')
    .eq('id', appointmentId)
    .eq('psychologist_id', user.id) // Kendi randevusu olduğunu doğrula
    .single()

  if (fetchError || !appointment) {
    return NextResponse.json({ error: 'Randevu bulunamadı' }, { status: 404 })
  }

  if (appointment.status !== 'pending_approval') {
    return NextResponse.json({ error: 'Bu randevu zaten işlenmiş' }, { status: 409 })
  }

  const service = createServiceRoleClient()

  try {
    // 3. Daily.co odası oluştur
    const scheduledAt = new Date((appointment.slots as { start_time: string }).start_time)
    const room = await createRoom(appointmentId, scheduledAt)

    const [clientToken, psychToken] = await Promise.all([
      createMeetingToken(room.name, appointment.client_id, false),
      createMeetingToken(room.name, user.id, true),
    ])

    // 4. Appointment güncelle (service role — meeting_room_url yazıyor)
    await service
      .from('appointments')
      .update({
        status: 'scheduled',
        meeting_room_url: room.url,
      })
      .eq('id', appointmentId)

    // 5. Slot'u booked yap
    await service
      .from('slots')
      .update({ status: 'booked' })
      .eq('id', appointment.slot_id)

    // 6. Her iki tarafa bildirim gönder
    const startStr = scheduledAt.toLocaleString('tr-TR', {
      day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit',
    })

    await sendNotifications([
      {
        userId: appointment.client_id,
        title: 'Randevunuz onaylandı!',
        description: `${startStr} tarihli seansınız psikolog tarafından onaylandı.`,
      },
      {
        userId: user.id,
        title: 'Randevu onaylandı',
        description: `${startStr} tarihli seans takvimde rezerve edildi.`,
      },
    ])

    return NextResponse.json({
      success: true,
      roomUrl: room.url,
      clientToken,
      psychToken,
    })
  } catch (err) {
    console.error('Randevu onaylama hatası:', err)
    return NextResponse.json({ error: 'Sunucu hatası' }, { status: 500 })
  }
}
