'use client'

import { useState, useEffect } from 'react'

const C = { navy: '#1D3557', blue: '#1A6BB5', blueTint: '#EBF3FC', muted: '#8FA3BF', border: '#E4EAF2', danger: '#B91C1C', dangerTint: '#FDECEA', success: '#1A7A4A', successTint: '#E8F5EE', warning: '#92600A', warningTint: '#FEF3E2' }

// Default seans ayarları — API'den güncellenir
const DEFAULT_SETTINGS = { earlyMinutes: 20, durationMinutes: 70 }

interface Slot {
  id: string
  start_time: string
  end_time: string
  status: string
}

interface Appointment {
  id: string
  slot_id: string
  status: string
  profiles: { full_name: string; avatar_url: string | null } | null
}

interface Client {
  id: string
  full_name: string
  avatar_url: string | null
}

interface Props {
  mode: 'add' | 'delete' | 'approve' | 'detail' | 'completed'
  slot: Slot | null
  appointment: Appointment | null
  cell: { date: Date; hour: number } | null
  loading: boolean
  onAdd: () => void
  onDelete: () => void
  onAccept: () => void
  onReject: () => void
  onClose: () => void
  onJoin?: (appointmentId: string) => void
  onManualCreated?: () => void
  onComplete?: (appointmentId: string) => void
}

function formatSlotTime(startTime: string) {
  const start = new Date(startTime)
  const end = new Date(startTime)
  end.setHours(end.getHours() + 1)
  return `${start.toLocaleDateString('tr-TR', { weekday: 'long', day: 'numeric', month: 'long' })} · ${
    start.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })
  } – ${end.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })}`
}

function formatCellTime(date: Date, hour: number) {
  const start = new Date(date)
  start.setHours(hour, 0, 0, 0)
  return `${start.toLocaleDateString('tr-TR', { weekday: 'long', day: 'numeric', month: 'long' })} · ${
    String(hour).padStart(2, '0')}:00 – ${String(hour + 1).padStart(2, '0')}:00`
}

function Avatar({ name, src }: { name: string; src?: string | null }) {
  if (src) return <img src={src} className="w-9 h-9 rounded-full object-cover flex-shrink-0" alt="" />
  return (
    <div className="w-9 h-9 rounded-full flex items-center justify-center text-sm font-medium flex-shrink-0"
      style={{ background: C.blueTint, color: C.blue }}>
      {name[0]?.toUpperCase()}
    </div>
  )
}

export default function SlotModal({
  mode, slot, appointment, cell, loading,
  onAdd, onDelete, onAccept, onReject, onClose, onJoin, onManualCreated, onComplete
}: Props) {
  const [view, setView] = useState<'main' | 'selectClient' | 'warning' | 'success'>('main')
  const [clients, setClients] = useState<Client[]>([])
  const [clientsLoading, setClientsLoading] = useState(false)
  const [selectedClient, setSelectedClient] = useState<Client | null>(null)
  const [manualLoading, setManualLoading] = useState(false)
  const [warningMsg, setWarningMsg] = useState('')
  const [sessionSettings, setSessionSettings] = useState(DEFAULT_SETTINGS)

  useEffect(() => {
    fetch('/api/admin/settings/session')
      .then(r => r.json())
      .then(d => { if (d.earlyMinutes) setSessionSettings(d) })
      .catch(() => {})
  }, [])

  const timeLabel = slot ? formatSlotTime(slot.start_time) : cell ? formatCellTime(cell.date, cell.hour) : ''

  async function loadClients() {
    setClientsLoading(true)
    const res = await fetch('/api/psychologist/clients')
    const data = await res.json()
    setClients(data ?? [])
    setClientsLoading(false)
  }

  async function handleCreateManual(force = false) {
    if (!slot || !selectedClient) return
    setManualLoading(true)

    const res = await fetch('/api/appointments/manual', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ slotId: slot.id, clientId: selectedClient.id, forceCreate: force }),
    })
    const data = await res.json()

    if (data.warning) {
      setWarningMsg(data.message)
      setView('warning')
      setManualLoading(false)
      return
    }

    if (data.success) {
      setView('success')
      onManualCreated?.()
    }
    setManualLoading(false)
  }

  useEffect(() => {
    if (view === 'selectClient') loadClients()
  }, [view])

  return (
    <div className="fixed inset-0 flex items-center justify-center z-50 p-4"
      style={{ background: 'rgba(29,53,87,0.4)', backdropFilter: 'blur(2px)' }}
      onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm overflow-hidden"
        onClick={e => e.stopPropagation()}>

        {/* MAIN VIEW */}
        {view === 'main' && (
          <>
            <div className="px-6 py-5 border-b" style={{ borderColor: C.border }}>
              <p className="text-xs font-medium mb-1" style={{ color: C.muted, letterSpacing: '0.06em' }}>
                {mode === 'add' ? 'SLOT EKLE' :
                 mode === 'delete' ? 'UYGUN SLOT' :
                 mode === 'approve' ? 'RANDEVU TALEBİ' :
                 mode === 'completed' ? 'TAMAMLANAN SEANS' : 'ONAYLI SEANS'}
              </p>
              <p className="text-sm font-medium" style={{ color: C.navy }}>{timeLabel}</p>
            </div>

            <div className="px-6 py-5">
              {mode === 'add' && (
                <p className="text-sm" style={{ color: C.muted }}>
                  Bu saati takvime eklemek istiyor musunuz?
                </p>
              )}

              {mode === 'delete' && (
                <div className="space-y-3">
                  <p className="text-sm" style={{ color: C.muted }}>
                    Bu slot henüz boş. Ne yapmak istersiniz?
                  </p>
                </div>
              )}

              {mode === 'approve' && (
                <div>
                  <div className="flex items-center gap-3 mb-4">
                    <Avatar name={appointment?.profiles?.full_name ?? '?'} src={appointment?.profiles?.avatar_url} />
                    <div>
                      <p className="text-sm font-medium" style={{ color: C.navy }}>
                        {appointment?.profiles?.full_name ?? 'Danışan'}
                      </p>
                      <p className="text-xs" style={{ color: C.muted }}>Seans talebi gönderdi</p>
                    </div>
                  </div>
                  <p className="text-sm" style={{ color: C.muted }}>
                    Talebi onaylarsanız görüşme odası otomatik oluşturulur.
                  </p>
                </div>
              )}

              {mode === 'completed' && (
                <div>
                  {appointment?.profiles && (
                    <div className="flex items-center gap-3 mb-3">
                      <Avatar name={appointment.profiles.full_name} src={appointment.profiles.avatar_url} />
                      <div>
                        <p className="text-sm font-medium" style={{ color: C.navy }}>{appointment.profiles.full_name}</p>
                        <p className="text-xs" style={{ color: C.muted }}>Seans tamamlandı</p>
                      </div>
                    </div>
                  )}
                  <div className="flex items-center gap-2 px-3 py-2 rounded-lg" style={{ background: C.successTint }}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={C.success} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="20 6 9 17 4 12"/>
                    </svg>
                    <span className="text-xs font-medium" style={{ color: C.success }}>Bu seans başarıyla tamamlandı</span>
                  </div>
                </div>
              )}

              {mode === 'detail' && appointment?.profiles && (
                <div className="flex items-center gap-3">
                  <Avatar name={appointment.profiles.full_name} src={appointment.profiles.avatar_url} />
                  <div>
                    <p className="text-sm font-medium" style={{ color: C.navy }}>{appointment.profiles.full_name}</p>
                    <p className="text-xs" style={{ color: C.muted }}>Onaylı seans</p>
                  </div>
                </div>
              )}
            </div>

            <div className="px-6 pb-6 flex flex-col gap-2">
              {mode === 'add' && (
                <div className="flex gap-2">
                  <button onClick={onClose} className="flex-1 py-2.5 rounded-xl text-sm font-medium border" style={{ borderColor: C.border, color: C.muted }}>
                    Vazgeç
                  </button>
                  <button onClick={onAdd} disabled={loading} className="flex-1 py-2.5 rounded-xl text-white text-sm font-medium disabled:opacity-40 hover:opacity-90 transition-opacity" style={{ background: C.blue }}>
                    {loading ? '...' : 'Ekle'}
                  </button>
                </div>
              )}

              {mode === 'delete' && (
                <>
                  <button
                    onClick={() => setView('selectClient')}
                    className="w-full py-2.5 rounded-xl text-sm font-medium text-white hover:opacity-90 transition-opacity"
                    style={{ background: C.blue }}>
                    Randevu Oluştur
                  </button>
                  <div className="flex gap-2">
                    <button onClick={onClose} className="flex-1 py-2.5 rounded-xl text-sm border" style={{ borderColor: C.border, color: C.muted }}>
                      Kapat
                    </button>
                    <button onClick={onDelete} disabled={loading} className="flex-1 py-2.5 rounded-xl text-sm font-medium disabled:opacity-40 hover:opacity-90 transition-opacity" style={{ background: C.danger, color: '#fff' }}>
                      {loading ? '...' : 'Slotu Kaldır'}
                    </button>
                  </div>
                </>
              )}

              {mode === 'approve' && (
                <div className="flex gap-2">
                  <button onClick={onReject} disabled={loading} className="flex-1 py-2.5 rounded-xl text-sm font-medium border disabled:opacity-40" style={{ borderColor: '#fecaca', color: C.danger }}>
                    {loading ? '...' : 'Reddet'}
                  </button>
                  <button onClick={onAccept} disabled={loading} className="flex-1 py-2.5 rounded-xl text-white text-sm font-medium disabled:opacity-40 hover:opacity-90 transition-opacity" style={{ background: C.success }}>
                    {loading ? '...' : 'Onayla'}
                  </button>
                </div>
              )}

              {mode === 'completed' && (
                <div className="flex flex-col gap-2">
                  {appointment && (
                    <a href={`/psychologist/notes/${appointment.id}`}
                      className="w-full py-2.5 rounded-xl text-sm font-medium text-center hover:opacity-90 transition-opacity"
                      style={{ background: C.blue, color: '#fff' }}>
                      {appointment.id ? 'Klinik Not Ekle / Görüntüle' : 'Klinik Not'}
                    </a>
                  )}
                  <button onClick={onClose} className="w-full py-2.5 rounded-xl text-sm font-medium border" style={{ borderColor: C.border, color: C.navy }}>
                    Kapat
                  </button>
                </div>
              )}

              {mode === 'detail' && (
                <div className="flex flex-col gap-2">
                  <div className="flex gap-2">
                    {appointment && onJoin && slot && (() => {
                      const now = new Date()
                      const start = new Date(slot.start_time)
                      const diffMins = (start.getTime() - now.getTime()) / 60000
                      const expired = now.getTime() > start.getTime() + sessionSettings.durationMinutes * 60000
                      const tooEarly = diffMins > sessionSettings.earlyMinutes
                      const canJoin = !tooEarly && !expired
                      return canJoin ? (
                        <button onClick={() => { onJoin(appointment.id); onClose() }}
                          className="flex-1 py-2.5 rounded-xl text-white text-sm font-medium hover:opacity-90 transition-opacity"
                          style={{ background: C.success }}>
                          Seansa Katıl
                        </button>
                      ) : expired ? (
                        <div className="flex-1 py-2.5 rounded-xl text-sm text-center" style={{ color: C.muted, background: '#F2F5F9' }}>
                          Seans sona erdi
                        </div>
                      ) : (
                        <div className="flex-1 py-2.5 rounded-xl text-sm text-center" style={{ color: C.muted, background: '#F2F5F9' }}>
                          {Math.ceil(diffMins - 20)}dk sonra aktif
                        </div>
                      )
                    })()}
                    <button onClick={onClose} className="flex-1 py-2.5 rounded-xl text-sm font-medium border" style={{ borderColor: C.border, color: C.navy }}>
                      Kapat
                    </button>
                  </div>
                  {appointment && onComplete && (
                    <button
                      onClick={() => { onComplete(appointment.id); onClose() }}
                      className="w-full py-2.5 rounded-xl text-sm font-medium border hover:opacity-90 transition-opacity"
                      style={{ borderColor: C.danger, color: C.danger, background: C.dangerTint }}>
                      Seansı Bitir
                    </button>
                  )}
                </div>
              )}
            </div>
          </>
        )}

        {/* SELECT CLIENT VIEW */}
        {view === 'selectClient' && (
          <>
            <div className="px-6 py-5 border-b flex items-center gap-3" style={{ borderColor: C.border }}>
              <button onClick={() => setView('main')} style={{ color: C.muted }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="15 18 9 12 15 6"/>
                </svg>
              </button>
              <div>
                <p className="text-xs font-medium" style={{ color: C.muted, letterSpacing: '0.06em' }}>DANIŞAN SEÇ</p>
                <p className="text-sm font-medium" style={{ color: C.navy }}>{timeLabel}</p>
              </div>
            </div>

            <div className="px-6 py-4" style={{ maxHeight: 300, overflowY: 'auto' }}>
              {clientsLoading ? (
                <p className="text-sm text-center py-6" style={{ color: C.muted }}>Yükleniyor...</p>
              ) : clients.length === 0 ? (
                <p className="text-sm text-center py-6" style={{ color: C.muted }}>Henüz danışanınız yok.</p>
              ) : (
                <div className="space-y-1">
                  {clients.map(c => (
                    <button key={c.id} onClick={() => setSelectedClient(c)}
                      className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all text-left"
                      style={{
                        background: selectedClient?.id === c.id ? C.blueTint : 'transparent',
                        border: `0.5px solid ${selectedClient?.id === c.id ? C.blue : 'transparent'}`,
                      }}>
                      <Avatar name={c.full_name} src={c.avatar_url} />
                      <span className="text-sm font-medium" style={{ color: C.navy }}>{c.full_name}</span>
                      {selectedClient?.id === c.id && (
                        <svg className="ml-auto" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={C.blue} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                          <polyline points="20 6 9 17 4 12"/>
                        </svg>
                      )}
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div className="px-6 pb-6">
              <button
                onClick={() => handleCreateManual(false)}
                disabled={!selectedClient || manualLoading}
                className="w-full py-2.5 rounded-xl text-white text-sm font-medium disabled:opacity-40 hover:opacity-90 transition-opacity"
                style={{ background: C.blue }}>
                {manualLoading ? 'Oluşturuluyor...' : 'Randevu Oluştur'}
              </button>
            </div>
          </>
        )}

        {/* WARNING VIEW — hak yok */}
        {view === 'warning' && (
          <>
            <div className="px-6 py-6 text-center">
              <div className="w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-4" style={{ background: C.warningTint }}>
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={C.warning} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/>
                  <line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>
                </svg>
              </div>
              <p className="text-sm font-medium mb-2" style={{ color: C.navy }}>Seans Hakkı Yok</p>
              <p className="text-sm" style={{ color: C.muted, lineHeight: 1.6 }}>{warningMsg}</p>
            </div>
            <div className="px-6 pb-6 flex gap-2">
              <button onClick={() => setView('selectClient')} className="flex-1 py-2.5 rounded-xl text-sm border" style={{ borderColor: C.border, color: C.muted }}>
                Geri Dön
              </button>
              <button
                onClick={() => handleCreateManual(true)}
                disabled={manualLoading}
                className="flex-1 py-2.5 rounded-xl text-white text-sm font-medium disabled:opacity-40 hover:opacity-90 transition-opacity"
                style={{ background: C.warning }}>
                {manualLoading ? 'Oluşturuluyor...' : 'Yine de Oluştur'}
              </button>
            </div>
          </>
        )}

        {/* SUCCESS VIEW */}
        {view === 'success' && (
          <>
            <div className="px-6 py-8 text-center">
              <div className="w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-4" style={{ background: C.successTint }}>
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={C.success} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="20 6 9 17 4 12"/>
                </svg>
              </div>
              <p className="text-sm font-medium mb-1" style={{ color: C.navy }}>Randevu Oluşturuldu</p>
              <p className="text-sm" style={{ color: C.muted }}>
                {selectedClient?.full_name} ile randevu takvime eklendi.
              </p>
            </div>
            <div className="px-6 pb-6">
              <button onClick={onClose} className="w-full py-2.5 rounded-xl text-white text-sm font-medium" style={{ background: C.blue }}>
                Tamam
              </button>
            </div>
          </>
        )}

      </div>
    </div>
  )
}
