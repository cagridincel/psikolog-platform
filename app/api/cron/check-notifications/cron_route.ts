import { NextResponse } from 'next/server'
import { processPendingNotifications } from '@/lib/notifications'

// Vercel Cron ile her 5 dakikada bir calisir
// vercel.json dosyasina su satiri ekle:
// { "crons": [{ "path": "/api/cron/check-notifications", "schedule": "*/5 * * * *" }] }

export async function GET(req: Request) {
  const authHeader = req.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Yetkisiz' }, { status: 401 })
  }

  try {
    await processPendingNotifications()
    return NextResponse.json({ success: true, timestamp: new Date().toISOString() })
  } catch (err) {
    console.error('Cron hatasi:', err)
    return NextResponse.json({ error: 'Sunucu hatasi' }, { status: 500 })
  }
}
