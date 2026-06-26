'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

const C = { navy: '#1D3557', blue: '#1A6BB5', blueTint: '#EBF3FC', muted: '#8FA3BF', border: '#E4EAF2', bg: '#F2F5F9', success: '#1A7A4A', successTint: '#E8F5EE', warning: '#92600A', warningTint: '#FEF3E2' }

interface Slot { id: string; start_time: string; end_time: string; status: string }
interface Education { school: string; department: string; year: string }
interface Certificate { name: string; institution: string; year: string; url?: string }

interface Profile {
  id: string
  full_name: string
  bio: string | null
  specialties: string[]
  price_per_session: number | null
  avatar_url: string | null
  experience_years: number | null
  languages: string[] | null
  approaches: string[] | null
  age_groups: string[] | null
  session_duration: number | null
  session_types: string[] | null
  education: Education[] | null
  certificates: Certificate[] | null
  gender: string | null
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
  return new Date(dateStr).toLocaleDateString('tr-TR', { weekday: 'long', day: 'numeric', month: 'long' })
}

function formatTime(dateStr: string) {
  return new Date(dateStr).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })
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

function Tag({ label }: { label: string }) {
  return (
    <span className="text-xs px-2.5 py-1 rounded-full" style={{ background: C.blueTint, color: C.blue }}>
      {label}
    </span>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="pt-5 border-t" style={{ borderColor: C.border }}>
      <p className="text-xs font-medium mb-3" style={{ color: C.muted, letterSpacing: '0.06em' }}>{title}</p>
      {children}
    </div>
  )
}

export default function BookingPage({ profile, slots, activePackage }: Props) {
  const [selectedSlot, setSelectedSlot] = useState<Slot | null>(null)
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  const remainingSessions = activePackage
    ? activePackage.total_sessions_credited - activePackage.sessions_used
    : 0
  const hasPackage = activePackage && remainingSessions > 0
  const groupedSlots = groupSlotsByDate(slots)

  async function handleBooking() {
    if (!selectedSlot) return
    setLoading(true)

    if (hasPackage) {
      const res = await fetch('/api/appointments/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ slotId: selectedSlot.id, psychologistId: profile.id, paymentId: activePackage!.id }),
      })
      if (res.ok) router.push('/client')
      else alert('Randevu oluşturulamadı, tekrar deneyin.')
    } else {
      router.push(`/client/checkout?psychologistId=${profile.id}&slotId=${selectedSlot.id}`)
    }
    setLoading(false)
  }

  return (
    <main className="min-h-screen" style={{ background: C.bg }}>
      <header className="bg-white border-b px-4 md:px-8 py-4 sticky top-0 z-10" style={{ borderColor: C.border }}>
        <div className="max-w-5xl mx-auto flex items-center gap-4">
          <button onClick={() => router.back()} className="text-sm" style={{ color: C.muted }}>← Geri</button>
          <span className="text-sm font-medium" style={{ color: C.navy }}>{profile.full_name}</span>
        </div>
      </header>

      <div className="max-w-5xl mx-auto px-4 md:px-6 py-6 md:py-8 grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* Sol: Psikolog profili */}
        <div className="lg:col-span-2 space-y-4">

          {/* Temel bilgiler */}
          <div className="bg-white rounded-2xl border p-6" style={{ borderColor: C.border }}>
            <div className="flex items-start gap-5">
              {/* Avatar */}
              <div className="w-20 h-20 rounded-2xl flex-shrink-0 overflow-hidden flex items-center justify-center text-xl font-medium"
                style={{ background: C.blueTint, color: C.blue }}>
                {profile.avatar_url
                  ? <img src={profile.avatar_url} className="w-full h-full object-cover" alt="" />
                  : profile.full_name[0]}
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <h1 className="text-xl font-medium" style={{ color: C.navy, letterSpacing: '-0.01em' }}>{profile.full_name}</h1>
                    <div className="flex items-center gap-3 mt-1">
                      {profile.experience_years && (
                        <span className="text-sm" style={{ color: C.muted }}>{profile.experience_years} yıl deneyim</span>
                      )}
                      {profile.session_duration && (
                        <span className="text-sm" style={{ color: C.muted }}>· {profile.session_duration} dk seans</span>
                      )}
                    </div>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className="text-xl font-medium" style={{ color: C.navy }}>₺{profile.price_per_session}</p>
                    <p className="text-xs" style={{ color: C.muted }}>/ seans</p>
                  </div>
                </div>

                {/* Seans tipleri */}
                {(profile.session_types?.length ?? 0) > 0 && (
                  <div className="flex gap-2 mt-3">
                    {profile.session_types!.map(t => (
                      <span key={t} className="text-xs px-2.5 py-1 rounded-full border" style={{ borderColor: C.border, color: C.muted }}>
                        {t === 'Online' ? '💻 Online' : t === 'Yüz Yüze' ? '🏢 Yüz Yüze' : '🔄 Hibrit'}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Bio */}
            {profile.bio && (
              <p className="text-sm mt-5 pt-5 border-t leading-relaxed" style={{ color: C.muted, borderColor: C.border }}>
                {profile.bio}
              </p>
            )}

            {/* Uzmanlık alanları */}
            {(profile.specialties?.length ?? 0) > 0 && (
              <Section title="UZMANLIK ALANLARI">
                <div className="flex flex-wrap gap-2">
                  {profile.specialties.map(s => <Tag key={s} label={s} />)}
                </div>
              </Section>
            )}

            {/* Terapötik yaklaşımlar */}
            {(profile.approaches?.length ?? 0) > 0 && (
              <Section title="TERAPÖTİK YAKLAŞIMLAR">
                <div className="flex flex-wrap gap-2">
                  {profile.approaches!.map(a => <Tag key={a} label={a} />)}
                </div>
              </Section>
            )}

            {/* Yaş grupları & Diller */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 pt-5 border-t" style={{ borderColor: C.border }}>
              {(profile.age_groups?.length ?? 0) > 0 && (
                <div>
                  <p className="text-xs font-medium mb-2" style={{ color: C.muted, letterSpacing: '0.06em' }}>YAŞ GRUPLARI</p>
                  <div className="space-y-1">
                    {profile.age_groups!.map(g => (
                      <p key={g} className="text-sm" style={{ color: C.navy }}>• {g}</p>
                    ))}
                  </div>
                </div>
              )}
              {(profile.languages?.length ?? 0) > 0 && (
                <div>
                  <p className="text-xs font-medium mb-2" style={{ color: C.muted, letterSpacing: '0.06em' }}>DİLLER</p>
                  <div className="space-y-1">
                    {profile.languages!.map(l => (
                      <p key={l} className="text-sm" style={{ color: C.navy }}>• {l}</p>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Eğitim */}
          {(profile.education?.length ?? 0) > 0 && (
            <div className="bg-white rounded-2xl border p-6" style={{ borderColor: C.border }}>
              <p className="text-xs font-medium mb-4" style={{ color: C.muted, letterSpacing: '0.06em' }}>EĞİTİM</p>
              <div className="space-y-4">
                {profile.education!.map((edu, i) => (
                  <div key={i} className="flex items-start gap-3">
                    <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: C.blueTint }}>
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={C.blue} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M22 10v6M2 10l10-5 10 5-10 5z"/><path d="M6 12v5c3 3 9 3 12 0v-5"/>
                      </svg>
                    </div>
                    <div>
                      <p className="text-sm font-medium" style={{ color: C.navy }}>{edu.school}</p>
                      <p className="text-xs mt-0.5" style={{ color: C.muted }}>{edu.department} · {edu.year}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Sertifikalar */}
          {(profile.certificates?.length ?? 0) > 0 && (
            <div className="bg-white rounded-2xl border p-6" style={{ borderColor: C.border }}>
              <p className="text-xs font-medium mb-4" style={{ color: C.muted, letterSpacing: '0.06em' }}>SERTİFİKALAR</p>
              <div className="space-y-3">
                {profile.certificates!.map((cert, i) => (
                  <div key={i} className="flex items-center justify-between gap-3">
                    <div className="flex items-start gap-3">
                      <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: C.successTint }}>
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={C.success} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <circle cx="12" cy="8" r="6"/><path d="M15.477 12.89L17 22l-5-3-5 3 1.523-9.11"/>
                        </svg>
                      </div>
                      <div>
                        <p className="text-sm font-medium" style={{ color: C.navy }}>{cert.name}</p>
                        <p className="text-xs mt-0.5" style={{ color: C.muted }}>{cert.institution} · {cert.year}</p>
                      </div>
                    </div>
                    {cert.url && (
                      <a href={cert.url} target="_blank" rel="noopener noreferrer"
                        className="text-xs px-2.5 py-1 rounded-lg flex-shrink-0"
                        style={{ color: C.blue, background: C.blueTint }}>
                        Görüntüle
                      </a>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Sağ: Slot seçimi + booking */}
        <div className="space-y-4">

          {/* Aktif paket */}
          {hasPackage && (
            <div className="rounded-2xl border px-4 py-3.5" style={{ background: C.successTint, borderColor: '#A7D7B8' }}>
              <p className="text-sm font-medium" style={{ color: C.success }}>
                ✓ Aktif paket — {remainingSessions} seans kaldı
              </p>
              <p className="text-xs mt-0.5" style={{ color: C.success, opacity: 0.8 }}>
                Bu seans ücretsiz kullanılacak
              </p>
            </div>
          )}

          {/* Slot seçimi */}
          <div className="bg-white rounded-2xl border p-5" style={{ borderColor: C.border }}>
            <p className="text-sm font-medium mb-4" style={{ color: C.navy }}>Seans saati seçin</p>

            {slots.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-sm" style={{ color: C.muted }}>Şu an uygun slot yok.</p>
              </div>
            ) : (
              <div className="space-y-5">
                {Object.entries(groupedSlots).map(([date, daySlots]) => (
                  <div key={date}>
                    <p className="text-xs font-medium mb-2" style={{ color: C.muted }}>
                      {formatDate(daySlots[0].start_time)}
                    </p>
                    <div className="grid grid-cols-2 gap-2">
                      {daySlots.map(slot => (
                        <button key={slot.id} onClick={() => setSelectedSlot(slot)}
                          className="py-2 px-3 rounded-xl text-sm font-medium border transition-all"
                          style={{
                            borderColor: selectedSlot?.id === slot.id ? C.blue : C.border,
                            background: selectedSlot?.id === slot.id ? C.blueTint : '#fff',
                            color: selectedSlot?.id === slot.id ? C.blue : C.navy,
                          }}>
                          {formatTime(slot.start_time)}
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Booking butonu */}
          <button onClick={handleBooking} disabled={!selectedSlot || loading}
            className="w-full py-3.5 rounded-xl text-white text-sm font-medium disabled:opacity-40 hover:opacity-90 transition-opacity"
            style={{ background: C.blue }}>
            {loading ? 'İşleniyor...' : hasPackage ? 'Randevu Talebi Gönder' : 'Devam Et'}
          </button>

          {!hasPackage && selectedSlot && (
            <p className="text-xs text-center" style={{ color: C.muted }}>
              Ödeme sayfasına yönlendirileceksiniz
            </p>
          )}
        </div>
      </div>
    </main>
  )
}
