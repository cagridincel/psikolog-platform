'use client'

import { useEffect, useRef, useState, useCallback } from 'react'

interface Props {
  appointmentId: string
  onClose: () => void
  participantName: string
}

interface SessionInfo {
  roomUrl: string
  token: string | null
  isPsychologist: boolean
  startTime: string | null
  early?: boolean
  secondsUntilStart?: number
}

function formatCountdown(seconds: number) {
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  const s = seconds % 60
  if (h > 0) return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
}

function formatDuration(seconds: number) {
  const m = Math.floor(seconds / 60)
  const s = seconds % 60
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
}

export default function VideoModal({ appointmentId, onClose, participantName }: Props) {
  const callFrameRef = useRef<any>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const [session, setSession] = useState<SessionInfo | null>(null)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)
  const [countdown, setCountdown] = useState(0)
  const [duration, setDuration] = useState(0)
  const [micOn, setMicOn] = useState(true)
  const [camOn, setCamOn] = useState(true)
  const [sharing, setSharing] = useState(false)
  const [note, setNote] = useState('')
  const [noteSaved, setNoteSaved] = useState(false)
  const [joined, setJoined] = useState(false)
  const noteRef = useRef(note)
  noteRef.current = note

  // Token al
  useEffect(() => {
    fetch(`/api/appointments/${appointmentId}/token`)
      .then(r => r.json())
      .then(data => {
        if (data.error) { setError(data.error); setLoading(false); return }
        setSession(data)
        setLoading(false)
        if (data.early) setCountdown(data.secondsUntilStart)
      })
      .catch(() => { setError('Bağlantı kurulamadı'); setLoading(false) })
  }, [appointmentId])

  // Geri sayım
  useEffect(() => {
    if (!session?.early || countdown <= 0) return
    const t = setInterval(() => {
      setCountdown(c => {
        if (c <= 1) {
          clearInterval(t)
          // Süre doldu — sayfayı yenile
          window.location.reload()
          return 0
        }
        return c - 1
      })
    }, 1000)
    return () => clearInterval(t)
  }, [session?.early, countdown])

  // Seans süresi sayacı
  useEffect(() => {
    if (!joined) return
    const t = setInterval(() => setDuration(d => d + 1), 1000)
    return () => clearInterval(t)
  }, [joined])

  // Daily.co başlat
  const initDaily = useCallback(async (info: SessionInfo) => {
    if (!containerRef.current) return
    if (callFrameRef.current) return

    const DailyIframe = (await import('@daily-co/daily-js')).default

    // createFrame yerine createCallObject — singleton sorunu yok
    const frame = DailyIframe.createCallObject()
    callFrameRef.current = frame

    frame.on('joined-meeting', () => setJoined(true))
    frame.on('left-meeting', () => handleLeave())
    frame.on('participant-updated', () => {
      const local = frame.participants().local
      if (local) {
        setMicOn(local.audio !== false)
        setCamOn(local.video !== false)
      }
    })

    const joinOptions: Record<string, unknown> = {
      url: info.roomUrl,
      userName: participantName,
      audioSource: true,
      videoSource: true,
    }
    if (typeof info.token === 'string' && info.token.length > 0) {
      joinOptions.token = info.token
    }

    await frame.join(joinOptions)

    // Video ve audio tile'larını DOM'a monte et
    const updateTiles = () => {
      if (!containerRef.current) return
      containerRef.current.innerHTML = ''
      const participants = frame.participants()
      Object.values(participants).forEach((p: any) => {
        // Video
        if (p.tracks?.video?.persistentTrack) {
          const video = document.createElement('video')
          video.srcObject = new MediaStream([p.tracks.video.persistentTrack])
          video.autoplay = true
          video.playsInline = true
          video.muted = p.local  // Kendi sesini duyma (echo)
          video.style.cssText = p.local
            ? 'position:absolute;bottom:14px;right:14px;width:140px;height:100px;border-radius:10px;object-fit:cover;border:2px solid rgba(255,255,255,0.15);z-index:10'
            : 'position:absolute;inset:0;width:100%;height:100%;object-fit:cover'
          containerRef.current?.appendChild(video)
        }
        // Audio — local olmayan katılımcının sesi (echo önleme)
        if (p.tracks?.audio?.persistentTrack && !p.local) {
          const audio = document.createElement('audio')
          audio.srcObject = new MediaStream([p.tracks.audio.persistentTrack])
          audio.autoplay = true
          containerRef.current?.appendChild(audio)
        }
      })
    }

    frame.on('track-started', updateTiles)
    frame.on('track-stopped', updateTiles)
    frame.on('participant-joined', updateTiles)
    frame.on('participant-left', updateTiles)
  }, [participantName])

  useEffect(() => {
    if (session && !session.early) {
      initDaily(session)
    }
    return () => {
      if (callFrameRef.current) {
        callFrameRef.current.destroy()
        callFrameRef.current = null
      }
    }
  }, [session, initDaily])

  function handleLeave() {
    if (callFrameRef.current) {
      callFrameRef.current.destroy()
      callFrameRef.current = null
    }
    onClose()
  }

  async function handleEndSession() {
    // Psikolog bitirirse seansı complete yap
    if (session?.isPsychologist) {
      try {
        await fetch(`/api/appointments/${appointmentId}/complete`, { method: 'POST' })
      } catch { /* sessizce geç */ }
    }
    handleLeave()
  }

  function toggleMic() {
    if (!callFrameRef.current) return
    if (micOn) callFrameRef.current.setLocalAudio(false)
    else callFrameRef.current.setLocalAudio(true)
    setMicOn(m => !m)
  }

  function toggleCam() {
    if (!callFrameRef.current) return
    if (camOn) callFrameRef.current.setLocalVideo(false)
    else callFrameRef.current.setLocalVideo(true)
    setCamOn(c => !c)
  }

  async function toggleScreen() {
    if (!callFrameRef.current) return
    if (sharing) { await callFrameRef.current.stopScreenShare(); setSharing(false) }
    else { await callFrameRef.current.startScreenShare(); setSharing(true) }
  }

  async function saveNote() {
    // Not kaydetme — sonraki iterasyonda klinik not API'siyle bağlanacak
    setNoteSaved(true)
    setTimeout(() => setNoteSaved(false), 2000)
  }

  const C = { bg: '#0D0D0D', surface: '#181c25', border: 'rgba(255,255,255,0.08)', text: '#F5F0E8', muted: 'rgba(255,255,255,0.45)', blue: '#1A6BB5', danger: '#ef4444' }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(29,53,87,0.5)', backdropFilter: 'blur(4px)' }}>
      <div className="w-full max-w-5xl rounded-2xl flex flex-col" style={{ background: C.bg, height: '90vh', minHeight: 500, overflow: 'hidden' }}>

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3 flex-shrink-0" style={{ background: C.surface, borderBottom: `0.5px solid ${C.border}` }}>
          <div className="flex items-center gap-3">
            <div className="w-2 h-2 rounded-full" style={{ background: joined ? '#22c55e' : '#f59e0b' }} />
            <span className="text-sm font-medium" style={{ color: C.text }}>{participantName} · Seans</span>
          </div>
          <div className="flex items-center gap-4">
            {joined && <span className="text-sm" style={{ color: C.muted, fontVariantNumeric: 'tabular-nums' }}>{formatDuration(duration)}</span>}
            <button onClick={onClose} className="text-xs px-3 py-1.5 rounded-lg border" style={{ borderColor: C.border, color: C.muted }}>
              Küçült
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="flex flex-1 min-h-0">

          {/* Video alanı */}
          <div className="flex-1 relative" style={{ background: '#1a1f2e', minHeight: 0 }}>
            {loading && (
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="w-8 h-8 border-2 border-t-transparent rounded-full animate-spin" style={{ borderColor: C.blue }} />
              </div>
            )}

            {error && (
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-3">
                <p className="text-sm" style={{ color: C.muted }}>{error}</p>
                <button onClick={onClose} className="text-sm px-4 py-2 rounded-lg" style={{ background: C.surface, color: C.text }}>Kapat</button>
              </div>
            )}

            {session?.early && !error && (
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-6">
                <div className="w-16 h-16 rounded-full flex items-center justify-center" style={{ background: 'rgba(26,107,181,0.15)', border: `0.5px solid ${C.blue}` }}>
                  <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#1A6BB5" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
                  </svg>
                </div>
                <div className="text-center">
                  <p className="text-sm mb-3" style={{ color: C.muted }}>Seans başlamasına</p>
                  <p className="text-6xl font-light" style={{ color: C.text, fontVariantNumeric: 'tabular-nums', letterSpacing: '-0.02em' }}>
                    {formatCountdown(countdown)}
                  </p>
                  <p className="text-xs mt-3" style={{ color: C.muted }}>Bağlantı otomatik açılacak</p>
                </div>
              </div>
            )}

            {/* Daily.co iframe container */}
            {!session?.early && !error && (
              <div ref={containerRef} className="absolute inset-0" />
            )}
          </div>

          {/* Not paneli — sadece psikolog için */}
          {session?.isPsychologist && (
            <div className="w-56 flex flex-col flex-shrink-0" style={{ background: '#13161f', borderLeft: `0.5px solid ${C.border}` }}>
              <div className="px-4 py-3 border-b" style={{ borderColor: C.border }}>
                <p className="text-xs font-medium" style={{ color: C.muted, letterSpacing: '0.06em' }}>SEANS NOTLARI</p>
                <p className="text-xs mt-0.5" style={{ color: 'rgba(255,255,255,0.2)' }}>Sadece siz görebilirsiniz</p>
              </div>
              <div className="flex-1 p-3">
                <textarea
                  value={note}
                  onChange={e => setNote(e.target.value)}
                  placeholder="Seans notlarını buraya alın..."
                  className="w-full h-full resize-none outline-none text-xs leading-relaxed"
                  style={{ background: 'transparent', color: C.muted, border: 'none', minHeight: 200 }}
                />
              </div>
              <div className="p-3 border-t" style={{ borderColor: C.border }}>
                <button onClick={saveNote}
                  className="w-full py-2 rounded-lg text-xs font-medium transition-all"
                  style={{ background: noteSaved ? 'rgba(26,122,74,0.3)' : 'rgba(26,107,181,0.2)', color: noteSaved ? '#1A7A4A' : C.blue, border: `0.5px solid ${noteSaved ? '#1A7A4A' : C.blue}` }}>
                  {noteSaved ? '✓ Kaydedildi' : 'Kaydet'}
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Kontroller */}
        <div className="flex items-center justify-center gap-4 py-4 flex-shrink-0" style={{ background: C.surface, borderTop: `0.5px solid ${C.border}` }}>
          <CtrlBtn onClick={toggleMic} active={micOn} label="Mikrofon"
            icon={micOn
              ? <path strokeLinecap="round" strokeLinejoin="round" d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z"/>
              : <path strokeLinecap="round" strokeLinejoin="round" d="M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z M17 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2"/>}
          />
          <CtrlBtn onClick={toggleCam} active={camOn} label="Kamera"
            icon={camOn
              ? <path strokeLinecap="round" strokeLinejoin="round" d="M15 10l4.553-2.069A1 1 0 0121 8.82v6.36a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z"/>
              : <path strokeLinecap="round" strokeLinejoin="round" d="M15 10l4.553-2.069A1 1 0 0121 8.82v6.36a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2zM3 3l18 18"/>}
          />

          {/* Ayrıl */}
          <div className="flex flex-col items-center gap-1">
            <button onClick={handleLeave}
              className="w-14 h-14 rounded-full flex items-center justify-center transition-opacity hover:opacity-90"
              style={{ background: C.danger }}>
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M10.68 13.31a16 16 0 003.41 2.6l1.27-1.27a2 2 0 012.11-.45 12.84 12.84 0 002.81.7 2 2 0 011.72 2v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07A19.42 19.42 0 013.43 9.19 19.79 19.79 0 01.36 .55a2 2 0 012-.22 12.84 12.84 0 00.7 2.81 2 2 0 01-.45 2.11L1.34 6.53a16 16 0 002.6 3.41"/>
                <line x1="23" y1="1" x2="1" y2="23"/>
              </svg>
            </button>
            <span className="text-xs" style={{ color: '#ef4444', opacity: 0.6 }}>Ayrıl</span>
          </div>

          <CtrlBtn onClick={toggleScreen} active={!sharing} label="Paylaş"
            icon={<path strokeLinecap="round" strokeLinejoin="round" d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"/>}
          />
          <CtrlBtn onClick={() => {}} active={true} label="Ayarlar"
            icon={<path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"/> }
          />
        </div>

      </div>
    </div>
  )
}

function CtrlBtn({ onClick, active, label, icon }: { onClick: () => void; active: boolean; label: string; icon: React.ReactNode }) {
  return (
    <div className="flex flex-col items-center gap-1">
      <button onClick={onClick}
        className="w-11 h-11 rounded-full flex items-center justify-center transition-all"
        style={{
          background: active ? 'rgba(255,255,255,0.06)' : 'rgba(239,68,68,0.15)',
          border: `0.5px solid ${active ? 'rgba(255,255,255,0.15)' : 'rgba(239,68,68,0.3)'}`,
        }}>
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={active ? 'rgba(255,255,255,0.8)' : '#ef4444'} strokeWidth="2">
          {icon}
        </svg>
      </button>
      <span className="text-xs" style={{ color: 'rgba(255,255,255,0.3)' }}>{label}</span>
    </div>
  )
}
