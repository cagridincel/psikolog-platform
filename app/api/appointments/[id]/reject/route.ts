import { NextResponse } from 'next/server'
import { createClient, createServiceRoleClient } from '@/lib/supabase/server'
import { sendNotification } from '@/lib/notifications'
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyClient = { from: (table: string) => any }

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: appointmentId } = await params
  const { reason } = await req.json().catch(() => ({ reason: '' }))

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Yetkisiz' }, { status: 401 })

  const { data: appointment, error: fetchError } = await supabase
    .from('appointments')
    .select('*')
    .eq('id', appointmentId)
    .eq('psychologist_id', user.id)
    .single()

  if (fetchError || !appointment) {
    return NextResponse.json({ error: 'Randevu bulunamadi' }, { status: 404 })
  }

  if (appointment.status !== 'pending_approval') {
    return NextResponse.json({ error: 'Bu randevu zaten islendi' }, { status: 409 })
  }

  const service = createServiceRoleClient() as unknown as AnyClient

  try {
    // 1. Randevuyu iptal et
    await service.from('appointments').update({
      status: 'cancelled' as const,
      rejection_reason: reason || 'Psikolog tarafindan reddedildi',
      rejected_at: new Date().toISOString(),
    }).eq('id', appointmentId)

    // 2. Slotu serbest birak
    await service.from('slots').update({ status: 'available' as const }).eq('id', appointment.slot_id)

    // 3. Paketi iptal et
    await service.from('payments').update({
      status: 'cancelled' as const,
      cancelled_at: new Date().toISOString(),
      cancelled_reason: 'Psikolog randevu talebini reddetti',
    }).eq('id', appointment.payment_id)

    // 4. Alternatif psikolog onerilerini bul
    const { data: alternatives } = await service
      .from('slots')
      .select('id, psychologist_id, start_time, end_time, profiles(full_name, avatar_url, price_per_session, specialties)')
      .eq('status', 'available')
      .neq('psychologist_id', user.id)
      .gte('start_time', new Date().toISOString())
      .order('start_time', { ascending: true })
      .limit(10)

    // En az 2 farkli psikologdan oneri sec
    const seen = new Set<string>()
    const recommended: typeof alternatives = []
    for (const slot of alternatives ?? []) {
      if (!seen.has(slot.psychologist_id) && seen.size < 2) {
        seen.add(slot.psychologist_id)
        recommended.push(slot)
      }
    }

    // 5. Onerileri DB'ye kaydet
    if (recommended.length > 0) {
      await service.from('psychologist_recommendations').insert(
        recommended.map((r) => ({
          original_payment_id: appointment.payment_id,
          client_id: appointment.client_id,
          recommended_psych_id: r.psychologist_id,
          suggested_slot_id: r.id,
        }))
      )
    }

    // 6. Musteriye bildirim
    const altText = recommended.length > 0
      ? ' Size alternatif psikologlar onerildi.'
      : ''

    await sendNotification({
      userId: appointment.client_id,
      title: 'Randevu talebiniz reddedildi',
      description: `Sectiginiz psikolog randevu talebinizi reddetti.${altText}`,
    })

    return NextResponse.json({ success: true, recommendations: recommended })
  } catch (err) {
    console.error('Randevu red hatasi:', err)
    return NextResponse.json({ error: 'Sunucu hatasi' }, { status: 500 })
  }
}
