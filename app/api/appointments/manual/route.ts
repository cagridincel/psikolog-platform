import { NextResponse } from 'next/server'
import { createClient, createServiceRoleClient } from '@/lib/supabase/server'
import { createRoom } from '@/lib/daily'
import { sendNotifications } from '@/lib/notifications'
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyClient = { from: (table: string) => any }

export async function POST(req: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Yetkisiz' }, { status: 401 })

  const { slotId, clientId, forceCreate } = await req.json()
  if (!slotId || !clientId) return NextResponse.json({ error: 'Eksik parametre' }, { status: 400 })

  const service = createServiceRoleClient() as unknown as AnyClient

  // Slot kontrolü
  const { data: slot } = await service
    .from('slots')
    .select('id, status, start_time, psychologist_id')
    .eq('id', slotId)
    .eq('psychologist_id', user.id)
    .single() as { data: { id: string; status: string; start_time: string; psychologist_id: string } | null }

  if (!slot) return NextResponse.json({ error: 'Slot bulunamadı' }, { status: 404 })
  if (slot.status !== 'available') return NextResponse.json({ error: 'Slot müsait değil' }, { status: 409 })

  // Danışanın aktif paketini kontrol et
  const { data: payment } = await service
    .from('payments')
    .select('id, total_sessions_credited, sessions_used')
    .eq('client_id', clientId)
    .eq('psychologist_id', user.id)
    .eq('status', 'paid')
    .order('created_at', { ascending: false })
    .limit(1)
    .single() as { data: { id: string; total_sessions_credited: number; sessions_used: number } | null }

  const remaining = payment ? payment.total_sessions_credited - payment.sessions_used : 0

  // Hak yoksa ve force değilse uyarı döndür
  if (remaining <= 0 && !forceCreate) {
    return NextResponse.json({
      warning: true,
      message: 'Bu danışanın seans hakkı kalmadı. Yine de randevu oluşturmak istiyor musunuz?',
    })
  }

  const appointmentId = crypto.randomUUID()

  // Daily.co odası oluştur
  let roomUrl = `https://meet.daily.co/session-${appointmentId}`
  if (process.env.DAILY_API_KEY) {
    try {
      const room = await createRoom(appointmentId, new Date(slot.start_time))
      roomUrl = room.url
    } catch { /* dummy URL kullan */ }
  }

  // Randevu oluştur — direkt scheduled
  await service.from('appointments').insert({
    id: appointmentId,
    client_id: clientId,
    psychologist_id: user.id,
    slot_id: slotId,
    status: 'scheduled',
    slot_start_time: slot.start_time,
    meeting_room_url: roomUrl,
    payment_id: payment?.id ?? null,
  })

  // Slotu booked yap
  await service.from('slots').update({ status: 'booked' }).eq('id', slotId)

  // Paketten seans düş
  if (payment && remaining > 0) {
    await service
      .from('payments')
      .update({ sessions_used: payment.sessions_used + 1 })
      .eq('id', payment.id)
  }

  // Danışana bildirim
  await sendNotifications([{
    userId: clientId,
    title: 'Yeni randevunuz oluşturuldu',
    description: `${new Date(slot.start_time).toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit' })} için randevunuz oluşturuldu.`,
  }])

  return NextResponse.json({
    success: true,
    appointmentId,
    roomUrl,
    sessionDeducted: payment && remaining > 0,
    remainingAfter: payment ? remaining - 1 : null,
  })
}
