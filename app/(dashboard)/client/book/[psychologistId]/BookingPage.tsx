'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

interface Slot {
  id: string
  start_time: string
  end_time: string
  status: string
}

interface Profile {
  id: string
  full_name: string
  bio: string | null
  specialties: string[]
  price_per_session: number | null
  avatar_url: string | null
}

interface ActivePackage {
  id: string
  total_sessions_credited: number
  sessions_used: number
  psychologist_id: string
}

interface Props {
  profile: Profile
  slots: Slot[]
  userId: string
  activePackage: ActivePackage | null
}

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString('tr-TR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  })
}

function formatTime(dateStr: string) {
  return new Date(dateStr).toLocaleTimeString('tr-TR', {
    hour: '2-digit',
    minute: '2-digit',
  })
}

function groupSlotsByDate(slots: Slot[]) {
  const groups: Record<string, Slot[]> = {}
  for (const slot of slots) {
    const date = new Date(slot.start_time).toDateString()
    if (!groups[date]) groups[date] = []
    groups[date].push(slot)
  }
  return groups
}

export default function BookingPage({ profile, slots, userId, activePackage }: Props) {
  const [selectedSlot, setSelectedSlot] = useState<Slot | null>(null)
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  const remainingSessions = activePackage
    ? activePackage.total_sessions_credited - activePackage.sessions_used
    : 0

  const hasPackage = activePackage && remainingSessions > 0
  const packagePrice = profile.price_per_session ? profile.price_per_session * 3 : 0
  const groupedSlots = groupSlotsByDate(slots)

  async function handleBooking() {
    if (!selectedSlot) return
    setLoading(true)

    if (hasPackage) {
      // Paketten seans kullan — direkt randevu olustur
      const res = await fetch('/api/appointments/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          slotId: selectedSlot.id,
          psychologistId: profile.id,
          paymentId: activePackage!.id,
        }),
      })

      if (res.ok) {
        router.push('/client')
      } else {
        alert('Randevu olusturulamadi, tekrar deneyin.')
      }
    } else {
      // Odeme sayfasina yonlendir
      router.push(
        `/client/checkout?psychologistId=${profile.id}&slotId=${selectedSlot.id}`
      )
    }

    setLoading(false)
  }

  return (
    <main className="min-h-screen bg-gray-50">
      <header className="bg-white border-b px-6 py-4">
        <button onClick={() => router.back()} className="text-sm text-gray-500 hover:text-gray-700">
          ← Geri
        </button>
      </header>

      <div className="max-w-2xl mx-auto px-6 py-8">
        {/* Psikolog profili */}
        <div className="bg-white rounded-2xl border p-6 mb-6">
          <div className="flex items-start gap-4">
            <div className="w-16 h-16 bg-gray-100 rounded-full flex-shrink-0" />
            <div className="flex-1">
              <h1 className="text-xl font-bold text-gray-900">{profile.full_name}</h1>
              <p className="text-sm text-gray-500 mt-1">{profile.bio}</p>
              <div className="flex flex-wrap gap-1 mt-3">
                {profile.specialties?.map((s) => (
                  <span key={s} className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded-full">
                    {s}
                  </span>
                ))}
              </div>
            </div>
            <div className="text-right flex-shrink-0">
              <div className="text-lg font-bold text-gray-900">₺{profile.price_per_session}</div>
              <div className="text-xs text-gray-400">/ seans</div>
            </div>
          </div>

          {hasPackage && (
            <div className="mt-4 bg-[#E8F5EE]50 border border-green-100 rounded-xl px-4 py-3">
              <p className="text-sm text-green-700 font-medium">
                Aktif paketiniz var — {remainingSessions} seans hakkınız kaldı
              </p>
              <p className="text-xs text-[#1A7A4A] mt-0.5">Bu seans ücretiz olarak kullanılacak</p>
            </div>
          )}

          {!hasPackage && (
            <div className="mt-4 bg-gray-50 border border-gray-100 rounded-xl px-4 py-3">
              <p className="text-sm text-gray-700 font-medium">3 Seanslık Paket</p>
              <p className="text-xs text-gray-500 mt-0.5">
                ₺{packagePrice} — Seans basina ₺{profile.price_per_session}
              </p>
            </div>
          )}
        </div>

        {/* Slot secimi */}
        <div className="bg-white rounded-2xl border p-6 mb-6">
          <h2 className="font-semibold text-gray-900 mb-4">Seans saati seçin</h2>

          {slots.length === 0 ? (
            <p className="text-gray-400 text-sm text-center py-8">
              Şu an uygun seans saati bulunmuyor.
            </p>
          ) : (
            <div className="space-y-6">
              {Object.entries(groupedSlots).map(([date, daySlots]) => (
                <div key={date}>
                  <p className="text-xs font-medium text-gray-400 uppercase mb-2">
                    {formatDate(daySlots[0].start_time)}
                  </p>
                  <div className="grid grid-cols-3 gap-2">
                    {daySlots.map((slot) => (
                      <button
                        key={slot.id}
                        onClick={() => setSelectedSlot(slot)}
                        className={`py-2.5 px-3 rounded-xl border-2 text-sm font-medium transition-all ${
                          selectedSlot?.id === slot.id
                            ? 'border-black bg-black text-white'
                            : 'border-gray-100 text-gray-700 hover:border-gray-300'
                        }`}
                      >
                        {formatTime(slot.start_time)}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Devam butonu */}
        <button
          onClick={handleBooking}
          disabled={!selectedSlot || loading}
          className="w-full bg-black text-white py-4 rounded-2xl font-medium text-sm disabled:opacity-40 transition-opacity"
        >
          {loading
            ? 'İşleniyor...'
            : hasPackage
            ? 'Randevu Talebi Gönder'
            : `Paketi Satın Al — ₺${packagePrice}`}
        </button>
      </div>
    </main>
  )
}
