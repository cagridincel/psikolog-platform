const DAILY_API_URL = 'https://api.daily.co/v1'

interface DailyRoom {
  id: string
  name: string
  url: string
}

/**
 * Daily.co'da 75 dakika süreli, sadece davet ile katılınabilir oda oluşturur.
 * Seans sonunda oda otomatik kapanır (exp timestamp ile).
 */
export async function createRoom(appointmentId: string, scheduledAt: Date): Promise<DailyRoom> {
  const expireAt = new Date(scheduledAt)
  expireAt.setMinutes(expireAt.getMinutes() + 75) // 60dk seans + 15dk buffer

  const res = await fetch(`${DAILY_API_URL}/rooms`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${process.env.DAILY_API_KEY}`,
    },
    body: JSON.stringify({
      name: `session-${appointmentId}`,
      privacy: 'private', // Sadece token ile girilebilir
      properties: {
        exp: Math.floor(expireAt.getTime() / 1000),
        max_participants: 2,
        enable_recording: false, // KVKK uyumu
        enable_chat: false,
        enable_screenshare: false,
        start_video_off: false,
        start_audio_off: false,
      },
    }),
  })

  if (!res.ok) {
    const err = await res.json()
    throw new Error(`Daily.co oda oluşturulamadı: ${JSON.stringify(err)}`)
  }

  return res.json()
}

/** Katılımcı için imzalı meeting token üretir. */
export async function createMeetingToken(roomName: string, userId: string, isOwner: boolean) {
  const res = await fetch(`${DAILY_API_URL}/meeting-tokens`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${process.env.DAILY_API_KEY}`,
    },
    body: JSON.stringify({
      properties: {
        room_name: roomName,
        user_id: userId,
        is_owner: isOwner, // Psikolog owner, müşteri değil
        enable_recording: false,
      },
    }),
  })

  if (!res.ok) throw new Error('Meeting token oluşturulamadı')
  const data = await res.json()
  return data.token as string
}

export async function deleteRoom(roomName: string) {
  await fetch(`${DAILY_API_URL}/rooms/${roomName}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${process.env.DAILY_API_KEY}` },
  })
}
