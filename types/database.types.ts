export type UserRole = 'client' | 'psychologist' | 'admin'
export type AppointmentStatus = 'pending_approval' | 'scheduled' | 'completed' | 'cancelled' | 'auto_cancelled'
export type SlotStatus = 'available' | 'requested' | 'booked'
export type PaymentStatus = 'pending' | 'paid' | 'failed' | 'refunded' | 'cancelled'
export type SessionOutcome =
  | 'attended'
  | 'client_no_show'
  | 'psychologist_no_show'
  | 'technical_issue'
  | 'partial_client'
  | 'partial_psychologist'

export type NotificationType = 'immediate' | 'reminder_12h' | 'reminder_4h'
export type RecommendationStatus = 'pending' | 'accepted' | 'ignored'

// --- Row Types ---

export interface UserRow {
  id: string
  email: string
  role: UserRole
  created_at: string
}

export interface ProfileRow {
  id: string
  full_name: string
  avatar_url: string | null
  bio: string | null
  specialties: string[]
  price_per_session: number | null
  is_approved: boolean
}

export interface SlotRow {
  id: string
  psychologist_id: string
  start_time: string
  end_time: string
  status: SlotStatus
}

export interface PaymentRow {
  id: string
  client_id: string
  psychologist_id: string
  amount_paid: number
  total_sessions_credited: number
  sessions_used: number
  iyzico_payment_id: string | null
  status: PaymentStatus
  cancelled_at: string | null
  cancelled_reason: string | null
  created_at: string
}

export interface AppointmentRow {
  id: string
  payment_id: string
  client_id: string
  psychologist_id: string
  slot_id: string
  status: AppointmentStatus
  meeting_room_url: string | null
  rejection_reason: string | null
  rejected_at: string | null
  approval_deadline: string | null
  slot_start_time: string | null
  created_at: string
}

export interface CompletedSessionRow {
  id: string
  appointment_id: string
  client_id: string
  psychologist_id: string
  actual_start_time: string
  actual_end_time: string
  duration_minutes: number
  actual_duration_minutes: number | null
  outcome: SessionOutcome
  clinical_notes: string | null
  client_joined_at: string | null
  client_left_at: string | null
  psychologist_joined_at: string | null
  psychologist_left_at: string | null
}

export interface NotificationRow {
  id: string
  user_id: string
  title: string
  description: string
  is_read: boolean
  created_at: string
}

export interface NotificationScheduleRow {
  id: string
  appointment_id: string
  user_id: string
  scheduled_at: string
  sent_at: string | null
  notification_type: NotificationType
  is_sent: boolean
}

export interface PsychologistRecommendationRow {
  id: string
  original_payment_id: string
  client_id: string
  recommended_psych_id: string
  suggested_slot_id: string | null
  status: RecommendationStatus
  created_at: string
}

// --- Insert Types ---

export type UserInsert = Omit<UserRow, 'created_at'>
export type ProfileInsert = ProfileRow
export type SlotInsert = Omit<SlotRow, 'status'> & { status?: SlotStatus }
export type PaymentInsert = Omit<PaymentRow, 'total_sessions_credited' | 'sessions_used' | 'cancelled_at' | 'cancelled_reason' | 'created_at'> & {
  total_sessions_credited?: number
  sessions_used?: number
}
export type AppointmentInsert = Omit<AppointmentRow, 'rejection_reason' | 'rejected_at' | 'approval_deadline' | 'slot_start_time' | 'created_at'>
export type NotificationInsert = Omit<NotificationRow, 'is_read' | 'created_at'> & { is_read?: boolean }
export type NotificationScheduleInsert = Omit<NotificationScheduleRow, 'sent_at' | 'is_sent'>
export type PsychologistRecommendationInsert = Omit<PsychologistRecommendationRow, 'id' | 'status' | 'created_at'>

// --- Update Types ---

export type SlotUpdate = Partial<Pick<SlotRow, 'status'>>
export type PaymentUpdate = Partial<Pick<PaymentRow, 'sessions_used' | 'status' | 'iyzico_payment_id' | 'cancelled_at' | 'cancelled_reason'>>
export type AppointmentUpdate = Partial<Pick<AppointmentRow, 'status' | 'meeting_room_url' | 'rejection_reason' | 'rejected_at'>>
export type NotificationUpdate = Partial<Pick<NotificationRow, 'is_read'>>
export type NotificationScheduleUpdate = Partial<Pick<NotificationScheduleRow, 'sent_at' | 'is_sent'>>
export type RecommendationUpdate = Partial<Pick<PsychologistRecommendationRow, 'status'>>

// --- Database Shape ---

export type Database = {
  public: {
    Tables: {
      users: { Row: UserRow; Insert: UserInsert; Update: Partial<UserInsert> }
      profiles: { Row: ProfileRow; Insert: ProfileInsert; Update: Partial<ProfileInsert> }
      slots: { Row: SlotRow; Insert: SlotInsert; Update: SlotUpdate }
      payments: { Row: PaymentRow; Insert: PaymentInsert; Update: PaymentUpdate }
      appointments: { Row: AppointmentRow; Insert: AppointmentInsert; Update: AppointmentUpdate }
      completed_sessions: { Row: CompletedSessionRow; Insert: CompletedSessionRow; Update: Partial<CompletedSessionRow> }
      notifications: { Row: NotificationRow; Insert: NotificationInsert; Update: NotificationUpdate }
      notification_schedules: { Row: NotificationScheduleRow; Insert: NotificationScheduleInsert; Update: NotificationScheduleUpdate }
      psychologist_recommendations: { Row: PsychologistRecommendationRow; Insert: PsychologistRecommendationInsert; Update: RecommendationUpdate }
    }
    Enums: {
      user_role: UserRole
      appointment_status: AppointmentStatus
      slot_status: SlotStatus
      payment_status: PaymentStatus
      session_outcome: SessionOutcome
    }
  }
}

// --- Convenience Types ---

export type AppointmentWithDetails = AppointmentRow & {
  profiles: Pick<ProfileRow, 'full_name' | 'avatar_url' | 'price_per_session'>
  slots: Pick<SlotRow, 'start_time' | 'end_time'>
}

export type SlotWithPsychologist = SlotRow & {
  profiles: Pick<ProfileRow, 'full_name' | 'avatar_url' | 'price_per_session'>
}

export type RecommendationWithProfile = PsychologistRecommendationRow & {
  profiles: Pick<ProfileRow, 'full_name' | 'avatar_url' | 'bio' | 'specialties' | 'price_per_session'>
  slots: Pick<SlotRow, 'start_time' | 'end_time'> | null
}
