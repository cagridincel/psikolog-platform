import { createServiceRoleClient } from '@/lib/supabase/server'

interface SendNotificationParams {
  userId: string
  title: string
  description: string
}

export async function sendNotification({ userId, title, description }: SendNotificationParams) {
  const supabase = createServiceRoleClient()
  const { error } = await supabase.from('notifications').insert({ user_id: userId, title, description })
  if (error) throw error
}

export async function sendNotifications(notifications: SendNotificationParams[]) {
  const supabase = createServiceRoleClient()
  const { error } = await supabase.from('notifications').insert(
    notifications.map(({ userId, title, description }) => ({ user_id: userId, title, description }))
  )
  if (error) throw error
}

/** Randevu oluşturulduğunda 0/12/20. saat bildirim zamanlamalarını DB'ye yazar */
export async function scheduleApprovalNotifications(
  appointmentId: string,
  psychologistId: string,
  createdAt: Date
) {
  const supabase = createServiceRoleClient()

  const schedules = [
    {
      appointment_id: appointmentId,
      user_id: psychologistId,
      scheduled_at: createdAt.toISOString(),
      notification_type: 'immediate' as const,
    },
    {
      appointment_id: appointmentId,
      user_id: psychologistId,
      scheduled_at: new Date(createdAt.getTime() + 12 * 60 * 60 * 1000).toISOString(),
      notification_type: 'reminder_12h' as const,
    },
    {
      appointment_id: appointmentId,
      user_id: psychologistId,
      scheduled_at: new Date(createdAt.getTime() + 20 * 60 * 60 * 1000).toISOString(),
      notification_type: 'reminder_4h' as const,
    },
  ]

  const { error } = await supabase.from('notification_schedules').insert(schedules)
  if (error) throw error
}

/** Zamanı gelmiş bekleyen bildirimleri gönderir — cron job tarafından çağrılır */
export async function processPendingNotifications() {
  const supabase = createServiceRoleClient()

  const { data: pending, error } = await supabase
    .from('notification_schedules')
    .select('*, appointments(client_id, psychologist_id, status)')
    .eq('is_sent', false)
    .lte('scheduled_at', new Date().toISOString())
    .limit(50)

  if (error || !pending) return

  for (const schedule of pending) {
    const appointment = schedule.appointments as { status: string; psychologist_id: string } | null
    if (!appointment || appointment.status !== 'pending_approval') {
      // Randevu zaten işlendi, bildirimi iptal et
      await supabase
        .from('notification_schedules')
        .update({ is_sent: true, sent_at: new Date().toISOString() })
        .eq('id', schedule.id)
      continue
    }

    const messages: Record<string, { title: string; description: string }> = {
      immediate: {
        title: 'Yeni randevu talebi',
        description: 'Bir danisaniniz randevu talep etti. Lutfen 24 saat icinde onaylayiniz.',
      },
      reminder_12h: {
        title: 'Randevu talebi hatirlatmasi',
        description: 'Bekleyen bir randevu talebiniz var. Onaylamak icin 12 saatiniz kaldi.',
      },
      reminder_4h: {
        title: 'Son 4 saat!',
        description: 'Randevu talebini onaylamak icin yalnizca 4 saatiniz kaldi. Otomatik reddedilecek.',
      },
    }

    const msg = messages[schedule.notification_type]
    if (msg) {
      await sendNotification({ userId: schedule.user_id, ...msg })
    }

    await supabase
      .from('notification_schedules')
      .update({ is_sent: true, sent_at: new Date().toISOString() })
      .eq('id', schedule.id)
  }
}
