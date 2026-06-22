import { createServiceRoleClient } from '@/lib/supabase/server'
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyClient = { from: (table: string) => any }

interface SendNotificationParams {
  userId: string
  title: string
  description: string
}

export async function sendNotification({ userId, title, description }: SendNotificationParams) {
  const supabase = createServiceRoleClient() as unknown as AnyClient
  const { error } = await supabase.from('notifications').insert({ user_id: userId, title, description })
  if (error) throw error
}

export async function sendNotifications(notifications: SendNotificationParams[]) {
  const supabase = createServiceRoleClient() as unknown as AnyClient
  const { error } = await supabase.from('notifications').insert(
    notifications.map(({ userId, title, description }) => ({ user_id: userId, title, description }))
  )
  if (error) throw error
}

export async function scheduleApprovalNotifications(
  appointmentId: string,
  psychologistId: string,
  createdAt: Date
) {
  const supabase = createServiceRoleClient() as unknown as AnyClient

  const schedules = [
    { appointment_id: appointmentId, user_id: psychologistId, scheduled_at: createdAt.toISOString(), notification_type: 'immediate' as const },
    { appointment_id: appointmentId, user_id: psychologistId, scheduled_at: new Date(createdAt.getTime() + 12 * 60 * 60 * 1000).toISOString(), notification_type: 'reminder_12h' as const },
    { appointment_id: appointmentId, user_id: psychologistId, scheduled_at: new Date(createdAt.getTime() + 20 * 60 * 60 * 1000).toISOString(), notification_type: 'reminder_4h' as const },
  ]

  const { error } = await supabase.from('notification_schedules').insert(schedules)
  if (error) throw error
}

export async function processPendingNotifications() {
  const supabase = createServiceRoleClient() as unknown as AnyClient

  const { data: pending, error } = await supabase
    .from('notification_schedules')
    .select('*, appointments(client_id, psychologist_id, status)')
    .eq('is_sent', false)
    .lte('scheduled_at', new Date().toISOString())
    .limit(50)

  if (error || !pending) return

  const messages: Record<string, { title: string; description: string }> = {
    immediate:    { title: 'Yeni randevu talebi',          description: 'Bir danisaniniz randevu talep etti. Lutfen 24 saat icinde onaylayiniz.' },
    reminder_12h: { title: 'Randevu talebi hatirlatmasi',   description: 'Bekleyen bir randevu talebiniz var. Onaylamak icin 12 saatiniz kaldi.' },
    reminder_4h:  { title: 'Son 4 saat!',                   description: 'Randevu talebini onaylamak icin yalnizca 4 saatiniz kaldi. Otomatik reddedilecek.' },
  }

  await Promise.all(pending.map(async (schedule) => {
    const appointment = schedule.appointments as { status: string } | null
    const done = !appointment || appointment.status !== 'pending_approval'

    if (!done) {
      const msg = messages[schedule.notification_type]
      if (msg) await sendNotification({ userId: schedule.user_id, ...msg })
    }

    await supabase
      .from('notification_schedules')
      .update({ is_sent: true, sent_at: new Date().toISOString() })
      .eq('id', schedule.id)
  }))
}
