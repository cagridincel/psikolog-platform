import { NextResponse } from 'next/server'
import { createClient, createServiceRoleClient } from '@/lib/supabase/server'
import { scheduleApprovalNotifications } from '@/lib/notifications'
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyClient = { from: (table: string) => any }

export async function POST(req: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Yetkisiz' }, { status: 401 })

  const { slotId, psychologistId, paymentId } = await req.json()

  if (!slotId || !psychologistId || !paymentId) {
    return NextResponse.json({ error: 'Eksik parametre' }, { status: 400 })
  }

  const service = createServiceRoleClient() as unknown as AnyClient

  // 1. Slot hâlâ uygun mu?
  const { data: slot, error: slotError } = await service
    .from('slots')
    .select('id, status, start_time, psychologist_id')
    .eq('id', slotId)
    .eq('psychologist_id', psychologistId)
    .single()

  if (slotError || !slot) {
    return NextResponse.json({ error: 'Slot bulunamadı' }, { status: 404 })
  }

  if (slot.status !== 'available') {
    return NextResponse.json({ error: 'Bu slot artık uygun değil' }, { status: 409 })
  }

  // 2. Paketi kontrol et — bu kullanıcıya ait ve bu psikolog için mi?
  const { data: payment, error: paymentError } = await service
    .from('payments')
    .select('id, client_id, psychologist_id, total_sessions_credited, sessions_used, status')
    .eq('id', paymentId)
    .eq('client_id', user.id)
    .eq('psychologist_id', psychologistId)
    .single()

  if (paymentError || !payment) {
    return NextResponse.json({ error: 'Paket bulunamadı' }, { status: 404 })
  }

  if (payment.status !== 'paid') {
    return NextResponse.json({ error: 'Paket aktif değil' }, { status: 409 })
  }

  const remaining = payment.total_sessions_credited - payment.sessions_used
  if (remaining <= 0) {
    return NextResponse.json({ error: 'Paket seans hakkı kalmadı' }, { status: 409 })
  }

  try {
    // 3. Randevu oluştur
    const { data: appointment, error: aptError } = await service
      .from('appointments')
      .insert({
        payment_id: paymentId,
        client_id: user.id,
        psychologist_id: psychologistId,
        slot_id: slotId,
        status: 'pending_approval',
        slot_start_time: slot.start_time,
      })
      .select()
      .single()

    if (aptError || !appointment) {
      return NextResponse.json({ error: 'Randevu oluşturulamadı' }, { status: 500 })
    }

    // 4. Slotu "requested" yap
    await service
      .from('slots')
      .update({ status: 'requested' })
      .eq('id', slotId)

    // 5. Paket sessions_used artır
    await service
      .from('payments')
      .update({ sessions_used: payment.sessions_used + 1 })
      .eq('id', paymentId)

    // 6. Psikologu bildirim zamanlamalarıyla uyar
    await scheduleApprovalNotifications(
      appointment.id,
      psychologistId,
      new Date()
    )

    return NextResponse.json({ success: true, appointmentId: appointment.id })
  } catch (err) {
    console.error('Randevu oluşturma hatası:', err)
    return NextResponse.json({ error: 'Sunucu hatası' }, { status: 500 })
  }
}
