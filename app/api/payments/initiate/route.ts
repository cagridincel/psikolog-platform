import { NextResponse } from 'next/server'
import { createClient, createServiceRoleClient } from '@/lib/supabase/server'
import { scheduleApprovalNotifications } from '@/lib/notifications'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyClient = { from: (table: string) => any }

// TODO: İyzico hesabı aktif olunca bu flag'i kaldır ve
// aşağıdaki TEST_MODE bloğunu gerçek İyzico entegrasyonuyla değiştir.
const TEST_MODE = true

export async function POST(req: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Yetkisiz' }, { status: 401 })

  const { psychologistId, slotId, packageId, amount, sessionCount } = await req.json()

  if (!psychologistId || !slotId || sessionCount == null || sessionCount < 1) {
    return NextResponse.json({ error: 'Eksik parametre' }, { status: 400 })
  }

  const service = createServiceRoleClient() as unknown as AnyClient

  // Slot hâlâ uygun mu?
  const { data: slot } = await service
    .from('slots')
    .select('id, status, start_time, psychologist_id')
    .eq('id', slotId)
    .eq('psychologist_id', psychologistId)
    .single() as { data: { id: string; status: string; start_time: string; psychologist_id: string } | null }

  if (!slot) return NextResponse.json({ error: 'Slot bulunamadı' }, { status: 404 })
  if (slot.status !== 'available') return NextResponse.json({ error: 'Bu slot artık uygun değil' }, { status: 409 })

  if (TEST_MODE) {
    // ─── TEST MODU ───────────────────────────────────────────────

    // 1. Aynı psikolog için aktif paket var mı kontrol et
    const { data: existingPayment } = await service
      .from('payments')
      .select('id, total_sessions_credited, sessions_used')
      .eq('client_id', user.id)
      .eq('psychologist_id', psychologistId)
      .eq('status', 'paid')
      .order('created_at', { ascending: false })
      .limit(1)
      .single() as { data: { id: string; total_sessions_credited: number; sessions_used: number } | null }

    let paymentId: string

    if (existingPayment) {
      // Mevcut pakete seans ekle — yeni kayıt açma
      await service
        .from('payments')
        .update({
          total_sessions_credited: existingPayment.total_sessions_credited + sessionCount,
          amount_paid: amount, // son ödeme tutarını güncelle (opsiyonel)
        })
        .eq('id', existingPayment.id)
      paymentId = existingPayment.id
    } else {
      // Yeni paket oluştur
      const { data: newPayment, error: paymentError } = await service
        .from('payments')
        .insert({
          client_id: user.id,
          psychologist_id: psychologistId,
          amount_paid: amount,
          total_sessions_credited: sessionCount,
          sessions_used: 0,
          status: 'paid',
          iyzico_payment_id: `TEST-${Date.now()}`,
        })
        .select()
        .single() as { data: { id: string } | null; error: unknown }

      if (paymentError || !newPayment) {
        return NextResponse.json({ error: 'Ödeme kaydı oluşturulamadı' }, { status: 500 })
      }
      paymentId = newPayment.id
    }

    // 2. Appointment oluştur
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
      .single() as { data: { id: string } | null; error: unknown }

    if (aptError || !appointment) {
      return NextResponse.json({ error: 'Randevu oluşturulamadı' }, { status: 500 })
    }

    // 3. Slotu "requested" yap
    await service
      .from('slots')
      .update({ status: 'requested' })
      .eq('id', slotId)

    // 4. Paket sessions_used artır
    const currentUsed = existingPayment?.sessions_used ?? 0
    await service
      .from('payments')
      .update({ sessions_used: currentUsed + 1 })
      .eq('id', paymentId)

    // 5. Psikologu bildirimle
    await scheduleApprovalNotifications(appointment.id, psychologistId, new Date())

    return NextResponse.json({
      success: true,
      testMode: true,
      appointmentId: appointment.id,
      packageMerged: !!existingPayment,
    })
    // ─────────────────────────────────────────────────────────────
  }

  // ─── GERÇEK İYZİCO ENTEGRASYONU (henüz aktif değil) ─────────
  // TODO: Aşağıdaki kodu İyzico hesabı aktif olunca doldurun.
  //
  // const iyzipay = new Iyzipay({ apiKey: process.env.IYZICO_API_KEY, secretKey: process.env.IYZICO_SECRET_KEY, uri: 'https://api.iyzipay.com' })
  // const checkoutForm = await createCheckoutForm(iyzipay, { ... })
  // return NextResponse.json({ checkoutFormContent: checkoutForm.checkoutFormContent })
  // ──────────────────────────────────────────────────────────────

  return NextResponse.json({ error: 'Ödeme sistemi henüz aktif değil' }, { status: 503 })
}
