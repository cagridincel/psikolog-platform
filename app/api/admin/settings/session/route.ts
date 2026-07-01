import { NextResponse } from 'next/server'
import { getSettingNumber } from '@/lib/settings'

// Auth gerektirmeyen public endpoint — sadece seans zaman ayarlarını döner
export async function GET() {
  const [earlyMinutes, durationMinutes] = await Promise.all([
    getSettingNumber('session_early_join_minutes', 20),
    getSettingNumber('session_duration_minutes', 70),
  ])

  return NextResponse.json({ earlyMinutes, durationMinutes })
}
