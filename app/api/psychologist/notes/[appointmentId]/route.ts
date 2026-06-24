import { NextResponse } from 'next/server'
import { createClient, createServiceRoleClient } from '@/lib/supabase/server'
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyClient = { from: (table: string) => any }

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ appointmentId: string }> }
) {
  const { appointmentId } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Yetkisiz' }, { status: 401 })

  const db = supabase as unknown as AnyClient

  // Psikolog bu randevuya mı ait?
  const { data: appointment } = await db
    .from('appointments')
    .select('id, client_id, psychologist_id, status, slot_start_time')
    .eq('id', appointmentId)
    .eq('psychologist_id', user.id)
    .single() as {
      data: {
        id: string
        client_id: string
        psychologist_id: string
        status: string
        slot_start_time: string | null
      } | null
    }

  if (!appointment) return NextResponse.json({ error: 'Randevu bulunamadı' }, { status: 404 })

  // Danışan profili
  const { data: clientProfile } = await db
    .from('profiles')
    .select('full_name, avatar_url')
    .eq('id', appointment.client_id)
    .single() as { data: { full_name: string; avatar_url: string | null } | null }

  const service = createServiceRoleClient() as unknown as AnyClient

  // Mevcut not — service role ile RLS bypass
  const { data: session } = await service
    .from('completed_sessions')
    .select('id, clinical_notes, actual_start_time, actual_end_time, duration_minutes, outcome')
    .eq('appointment_id', appointmentId)
    .maybeSingle() as {
      data: {
        id: string
        clinical_notes: string | null
        actual_start_time: string
        actual_end_time: string
        duration_minutes: number
        outcome: string
      } | null
    }

  return NextResponse.json({
    appointment,
    clientProfile,
    session,
  })
}

export async function PUT(
  req: Request,
  { params }: { params: Promise<{ appointmentId: string }> }
) {
  const { appointmentId } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Yetkisiz' }, { status: 401 })

  const db = supabase as unknown as AnyClient

  // Psikolog bu randevuya mı ait?
  const { data: appointment } = await db
    .from('appointments')
    .select('id, psychologist_id')
    .eq('id', appointmentId)
    .eq('psychologist_id', user.id)
    .single() as { data: { id: string; psychologist_id: string } | null }

  if (!appointment) return NextResponse.json({ error: 'Randevu bulunamadı' }, { status: 404 })

  const { clinical_notes, outcome } = await req.json()

  const service = createServiceRoleClient() as unknown as AnyClient

  // Appointment'tan client_id al
  const { data: fullAppointment } = await db
    .from('appointments')
    .select('id, client_id, psychologist_id, slot_start_time')
    .eq('id', appointmentId)
    .single() as { data: { id: string; client_id: string; psychologist_id: string; slot_start_time: string | null } | null }

  // Mevcut session var mı?
  const { data: existing } = await service
    .from('completed_sessions')
    .select('id')
    .eq('appointment_id', appointmentId)
    .maybeSingle() as { data: { id: string } | null }

  if (existing) {
    const { error: updateError } = await service
      .from('completed_sessions')
      .update({ clinical_notes: clinical_notes ?? null, outcome: outcome ?? 'attended' })
      .eq('id', existing.id) as { error: any }

    if (updateError) {
      console.error('completed_sessions update error:', updateError)
      return NextResponse.json({ error: updateError.message }, { status: 500 })
    }
  } else {
    const now = new Date().toISOString()
    const { error: insertError } = await service.from('completed_sessions').insert({
      appointment_id: appointmentId,
      client_id: fullAppointment?.client_id,
      psychologist_id: user.id,
      actual_start_time: fullAppointment?.slot_start_time ?? now,
      actual_end_time: now,
      duration_minutes: 50,
      outcome: outcome ?? 'attended',
      clinical_notes: clinical_notes ?? null,
    }) as { error: any }

    if (insertError) {
      console.error('completed_sessions insert error:', insertError)
      return NextResponse.json({ error: insertError.message }, { status: 500 })
    }
  }

  return NextResponse.json({ success: true })
}
