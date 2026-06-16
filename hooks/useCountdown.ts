'use client'

import { useEffect, useState } from 'react'

interface CountdownResult {
  days: number
  hours: number
  minutes: number
  seconds: number
  isReady: boolean   // Seans başladı mı?
  isExpired: boolean // Seans bitti mi? (75dk geçtiyse)
}

/**
 * Seans başlangıcına geri sayım.
 * isReady: true olduğunda "Seansa Katıl" butonu aktif olur.
 * isExpired: true olduğunda oda kapatılmalı.
 */
export function useCountdown(startTime: string | null): CountdownResult {
  const [now, setNow] = useState(() => Date.now())

  useEffect(() => {
    const interval = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(interval)
  }, [])

  if (!startTime) {
    return { days: 0, hours: 0, minutes: 0, seconds: 0, isReady: false, isExpired: false }
  }

  const start = new Date(startTime).getTime()
  const end = start + 75 * 60 * 1000 // 75 dakika
  const diff = start - now

  const isReady = diff <= 0
  const isExpired = now > end

  if (isReady) {
    return { days: 0, hours: 0, minutes: 0, seconds: 0, isReady: true, isExpired }
  }

  const totalSeconds = Math.floor(diff / 1000)
  const days = Math.floor(totalSeconds / 86400)
  const hours = Math.floor((totalSeconds % 86400) / 3600)
  const minutes = Math.floor((totalSeconds % 3600) / 60)
  const seconds = totalSeconds % 60

  return { days, hours, minutes, seconds, isReady: false, isExpired: false }
}
