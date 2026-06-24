'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'

const C = { navy: '#1D3557', blue: '#1A6BB5', blueTint: '#EBF3FC', muted: '#8FA3BF', border: '#E4EAF2', bg: '#F2F5F9', success: '#1A7A4A', successTint: '#E8F5EE', danger: '#B91C1C', dangerTint: '#FDECEA', warning: '#92600A', warningTint: '#FEF3E2' }

const OUTCOMES = [
  { value: 'attended', label: 'Katıldı', color: C.success, bg: C.successTint },
  { value: 'late', label: 'Geç katıldı', color: C.warning, bg: C.warningTint },
  { value: 'no_show', label: 'Katılmadı', color: C.danger, bg: C.dangerTint },
  { value: 'cancelled', label: 'İptal edildi', color: C.muted, bg: C.bg },
]

interface NoteData {
  appointment: {
    id: string
    status: string
    slot_start_time: string | null
  }
  clientProfile: { full_name: string; avatar_url: string | null } | null
  session: {
    id: string
    clinical_notes: string | null
    actual_start_time: string
    actual_end_time: string
    duration_minutes: number
    outcome: string
  } | null
}

interface Props {
  appointmentId: string
}

export default function ClinicalNotesPage({ appointmentId }: Props) {
  const router = useRouter()
  const [data, setData] = useState<NoteData | null>(null)
  const [loading, setLoading] = useState(true)
  const [notes, setNotes] = useState('')
  const [outcome, setOutcome] = useState('attended')
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [wordCount, setWordCount] = useState(0)

  useEffect(() => {
    fetch(`/api/psychologist/notes/${appointmentId}`)
      .then(r => r.json())
      .then(d => {
        setData(d)
        setNotes(d.session?.clinical_notes ?? '')
        setOutcome(d.session?.outcome ?? 'attended')
        setWordCount((d.session?.clinical_notes ?? '').split(/\s+/).filter(Boolean).length)
        setLoading(false)
      })
  }, [appointmentId])

  function handleNotesChange(v: string) {
    setNotes(v)
    setWordCount(v.split(/\s+/).filter(Boolean).length)
    setSaved(false)
  }

  async function handleSave() {
    setSaving(true)
    const res = await fetch(`/api/psychologist/notes/${appointmentId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ clinical_notes: notes, outcome }),
    })
    if (res.ok) {
      setSaved(true)
      setTimeout(() => router.push('/psychologist'), 800)
    } else {
      const data = await res.json()
      alert('Kayıt hatası: ' + (data.error ?? 'Bilinmeyen hata'))
    }
    setSaving(false)
  }

  function formatDateTime(dateStr: string) {
    return new Date(dateStr).toLocaleDateString('tr-TR', {
      weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
      hour: '2-digit', minute: '2-digit',
    })
  }

  if (loading) return (
    <main className="min-h-screen flex items-center justify-center" style={{ background: C.bg }}>
      <div className="w-7 h-7 border-2 border-t-transparent rounded-full animate-spin" style={{ borderColor: C.blue, borderTopColor: 'transparent' }} />
    </main>
  )

  if (!data) return (
    <main className="min-h-screen flex items-center justify-center" style={{ background: C.bg }}>
      <p className="text-sm" style={{ color: C.muted }}>Randevu bulunamadı.</p>
    </main>
  )

  const { appointment, clientProfile, session } = data

  return (
    <main className="min-h-screen" style={{ background: C.bg }}>
      {/* Header */}
      <header className="bg-white border-b px-8 py-4 sticky top-0 z-10" style={{ borderColor: C.border }}>
        <div className="max-w-3xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button onClick={() => router.push('/psychologist')} className="text-sm" style={{ color: C.muted }}>
              ← Panele Dön
            </button>
            <span className="text-sm font-medium" style={{ color: C.navy }}>Klinik Not</span>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-xs" style={{ color: C.muted }}>{wordCount} kelime</span>
            <button onClick={handleSave} disabled={saving}
              className="text-sm font-medium px-4 py-2 rounded-lg text-white disabled:opacity-50 hover:opacity-90 transition-opacity"
              style={{ background: saved ? C.success : C.blue }}>
              {saved ? '✓ Kaydedildi' : saving ? 'Kaydediliyor...' : 'Kaydet'}
            </button>
          </div>
        </div>
      </header>

      <div className="max-w-3xl mx-auto px-6 py-8 space-y-5">

        {/* Danışan & seans bilgisi */}
        <div className="bg-white rounded-2xl border p-5" style={{ borderColor: C.border }}>
          <div className="flex items-center gap-4 mb-4">
            <div className="w-12 h-12 rounded-full overflow-hidden flex items-center justify-center text-sm font-medium flex-shrink-0"
              style={{ background: C.blueTint, color: C.blue }}>
              {clientProfile?.avatar_url
                ? <img src={clientProfile.avatar_url} className="w-12 h-12 object-cover" alt="" />
                : clientProfile?.full_name?.[0] ?? '?'}
            </div>
            <div>
              <p className="text-sm font-medium" style={{ color: C.navy }}>{clientProfile?.full_name ?? 'Danışan'}</p>
              {appointment.slot_start_time && (
                <p className="text-xs mt-0.5" style={{ color: C.muted }}>{formatDateTime(appointment.slot_start_time)}</p>
              )}
            </div>
            <div className="ml-auto">
              <span className="text-xs px-2.5 py-1 rounded-full font-medium"
                style={{
                  background: appointment.status === 'completed' ? C.successTint : C.blueTint,
                  color: appointment.status === 'completed' ? C.success : C.blue,
                }}>
                {appointment.status === 'completed' ? 'Tamamlandı' : 'Onaylı'}
              </span>
            </div>
          </div>

          {session && (
            <div className="flex gap-4 pt-4 border-t" style={{ borderColor: C.bg }}>
              <div className="text-center">
                <p className="text-xs" style={{ color: C.muted }}>Süre</p>
                <p className="text-sm font-medium mt-0.5" style={{ color: C.navy }}>{session.duration_minutes} dk</p>
              </div>
              <div className="w-px" style={{ background: C.border }} />
              <div className="text-center">
                <p className="text-xs" style={{ color: C.muted }}>Başlangıç</p>
                <p className="text-sm font-medium mt-0.5" style={{ color: C.navy }}>
                  {new Date(session.actual_start_time).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })}
                </p>
              </div>
              <div className="w-px" style={{ background: C.border }} />
              <div className="text-center">
                <p className="text-xs" style={{ color: C.muted }}>Bitiş</p>
                <p className="text-sm font-medium mt-0.5" style={{ color: C.navy }}>
                  {new Date(session.actual_end_time).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })}
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Seans sonucu */}
        <div className="bg-white rounded-2xl border p-5" style={{ borderColor: C.border }}>
          <p className="text-xs font-medium mb-3" style={{ color: C.muted, letterSpacing: '0.06em' }}>SEANS SONUCU</p>
          <div className="grid grid-cols-2 gap-2">
            {OUTCOMES.map(o => (
              <button key={o.value} onClick={() => { setOutcome(o.value); setSaved(false) }}
                className="flex items-center gap-2 px-4 py-3 rounded-xl border text-sm font-medium transition-all text-left"
                style={{
                  borderColor: outcome === o.value ? o.color : C.border,
                  background: outcome === o.value ? o.bg : '#fff',
                  color: outcome === o.value ? o.color : C.muted,
                }}>
                <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: outcome === o.value ? o.color : C.border }} />
                {o.label}
              </button>
            ))}
          </div>
        </div>

        {/* Not editörü */}
        <div className="bg-white rounded-2xl border overflow-hidden" style={{ borderColor: C.border }}>
          <div className="flex items-center justify-between px-5 py-3 border-b" style={{ borderColor: C.border }}>
            <p className="text-xs font-medium" style={{ color: C.muted, letterSpacing: '0.06em' }}>KLİNİK NOTLAR</p>
            <p className="text-xs" style={{ color: C.muted }}>Sadece siz görebilirsiniz</p>
          </div>
          <div className="p-5">
            {/* Şablon kısayolları */}
            <div className="flex gap-2 mb-3">
              {[
                { label: 'Sunum', text: 'Danışan bu seansta şikayetlerini şu şekilde aktardı:\n\n' },
                { label: 'Müdahale', text: 'Uygulanan müdahale:\n\n' },
                { label: 'Plan', text: 'Sonraki seans planı:\n\n' },
              ].map(t => (
                <button key={t.label} onClick={() => handleNotesChange(notes + t.text)}
                  className="text-xs px-2.5 py-1 rounded-lg transition-colors"
                  style={{ background: C.bg, color: C.muted, border: `0.5px solid ${C.border}` }}>
                  + {t.label}
                </button>
              ))}
            </div>

            <textarea
              value={notes}
              onChange={e => handleNotesChange(e.target.value)}
              placeholder="Seans notlarınızı buraya yazın...&#10;&#10;• Danışanın sunduğu şikayetler&#10;• Gözlemler ve değerlendirmeler&#10;• Uygulanan müdahaleler&#10;• Sonraki seans için planlar"
              className="w-full resize-none outline-none text-sm leading-relaxed"
              rows={18}
              style={{
                color: C.navy,
                background: 'transparent',
                border: 'none',
                fontFamily: 'inherit',
              }}
            />
          </div>
        </div>

        {/* Kaydet butonu (alt) */}
        <div className="flex justify-end pb-6">
          <button onClick={handleSave} disabled={saving}
            className="text-sm font-medium px-6 py-2.5 rounded-xl text-white disabled:opacity-50 hover:opacity-90 transition-opacity"
            style={{ background: saved ? C.success : C.blue }}>
            {saved ? '✓ Kaydedildi' : saving ? 'Kaydediliyor...' : 'Kaydet'}
          </button>
        </div>
      </div>
    </main>
  )
}
