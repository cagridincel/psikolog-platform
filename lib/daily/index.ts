const DAILY_API_URL = 'https://api.daily.co/v1'

interface DailyRoom {
  id: string
  name: string
  url: string
}

export async function createRoom(appointmentId: string, scheduledAt: Date): Promise<DailyRoom> {
  const expireAt = new Date(scheduledAt)
  expireAt.setMinutes(expireAt.getMinutes() + 75)

  const res = await fetch(`${DAILY_API_URL}/rooms`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${process.env.DAILY_API_KEY}`,
    },
    body: JSON.stringify({
      name: `session-${appointmentId}`,
      privacy: 'private',
      properties: {
        exp: Math.floor(expireAt.getTime() / 1000),
        max_participants: 2,
        enable_recording: false,
        enable_chat: false,
      },
    }),
  })

  if (!res.ok) throw new Error('Daily.co oda olusturulamadi')
  return res.json()
}

export async function createMeetingToken(roomName: string, userId: string, isOwner: boolean) {
  const res = await fetch(`${DAILY_API_URL}/meeting-tokens`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${process.env.DAILY_API_KEY}`,
    },
    body: JSON.stringify({
      properties: { room_name: roomName, user_id: userId, is_owner: isOwner },
    }),
  })

  if (!res.ok) throw new Error('Meeting token olusturulamadi')
  const data = await res.json()
  return data.token as string
}

export async function deleteRoom(roomName: string) {
  await fetch(`${DAILY_API_URL}/rooms/${roomName}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${process.env.DAILY_API_KEY}` },
  })
}