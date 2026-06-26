'use client'

import React, { useState, useCallback, useMemo } from 'react'
import WeeklyCalendar from '@/components/calendar/WeeklyCalendar'
import SlotModal from '@/components/calendar/SlotModal'
import dynamic from 'next/dynamic'

const VideoModal = dynamic(() => import('@/components/video/VideoModal'), { ssr: false })
const MessagingPanel = dynamic(() => import('@/components/messaging/MessagingPanel'), { ssr: false })

interface Slot {
  id: string
  start_time: string
  end_time: string
  status: 'available' | 'requested' | 'booked' | 'completed'
}

interface Appointment {
  id: string
  slot_id: string
  status: string
  client_id: string
  slot_start_time: string | null
  hasNote: boolean
  profiles: { full_name: string; avatar_url: string | null } | null
}

interface Stats {
  totalSessions: number
  pendingCount: number
  totalClients: number
  availableSlots: number
}

interface Notification {
  id: string
  title: string
  description: string
  is_read: boolean
  created_at: string
}

interface Profile {
  id: string
  full_name: string
  avatar_url: string | null
  specialties: string[]
  bio: string | null
  price_per_session: number | null
}

interface Props {
  psychologistId: string
  profile: Profile
  slots: Slot[]
  appointments: Appointment[]
  weekStart: string
  stats: Stats
  notifications: Notification[]
}

function formatRelative(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 60) return `${mins}dk önce`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `${hours}sa önce`
  return `${Math.floor(hours / 24)}g önce`
}

export default function PsychologistDashboard({
  psychologistId, profile, slots: initialSlots, appointments: initialAppointments, weekStart, stats, notifications,
}: Props) {
  const [slots, setSlots] = useState<Slot[]>(initialSlots)
  const [appointments, setAppointments] = useState<Appointment[]>(initialAppointments)
  const [weekOffset, setWeekOffset] = useState(0)
  const [currentWeekStart, setCurrentWeekStart] = useState(new Date(weekStart))
  const [selectedCell, setSelectedCell] = useState<{ date: Date; hour: number } | null>(null)
  const [selectedSlot, setSelectedSlot] = useState<Slot | null>(null)
  const [loading, setLoading] = useState(false)
  const [activeTab, setActiveTab] = useState<'calendar' | 'clients' | 'notifications' | 'messages'>('calendar')
  const [videoAppointmentId, setVideoAppointmentId] = useState<string | null>(null)

  const unreadCount = notifications.filter(n => !n.is_read).length
  const pendingAppointments = appointments.filter(a => a.status === 'pending_approval')

  const getAppointmentForSlot = useCallback((slotId: string) => {
    return appointments.find((a) => a.slot_id === slotId) ?? null
  }, [appointments])

  async function fetchWeekSlots(start: Date) {
    const end = new Date(start)
    end.setDate(start.getDate() + 7)
    const res = await fetch(`/api/psychologist/slots?start=${start.toISOString()}&end=${end.toISOString()}`)
    if (res.ok) setSlots(await res.json())
  }

  async function fetchAppointments() {
    const res = await fetch('/api/psychologist/appointments')
    if (res.ok) setAppointments(await res.json())
  }

  async function handleWeekChange(direction: 'prev' | 'next') {
    const newStart = new Date(currentWeekStart)
    newStart.setDate(newStart.getDate() + (direction === 'next' ? 7 : -7))
    setCurrentWeekStart(newStart)
    setWeekOffset((o) => direction === 'next' ? o + 1 : o - 1)
    await fetchWeekSlots(newStart)
  }

  async function handleThisWeek() {
    const now = new Date()
    const start = new Date(now)
    start.setDate(now.getDate() - now.getDay() + 1)
    start.setHours(0, 0, 0, 0)
    setCurrentWeekStart(start)
    setWeekOffset(0)
    await fetchWeekSlots(start)
  }

  async function handleCellClick(date: Date, hour: number) {
    const existing = slots.find((s) => {
      const slotDate = new Date(s.start_time)
      return (
        slotDate.getFullYear() === date.getFullYear() &&
        slotDate.getMonth() === date.getMonth() &&
        slotDate.getDate() === date.getDate() &&
        slotDate.getHours() === hour
      )
    })
    if (existing) {
      setSelectedSlot(existing)
      setSelectedCell(null)
    } else {
      const cellTime = new Date(date)
      cellTime.setHours(hour, 0, 0, 0)
      if (cellTime < new Date()) return
      setSelectedCell({ date, hour })
      setSelectedSlot(null)
    }
  }

  async function handleAddSlot() {
    if (!selectedCell) return
    setLoading(true)
    const startTime = new Date(selectedCell.date)
    startTime.setHours(selectedCell.hour, 0, 0, 0)
    const endTime = new Date(startTime)
    endTime.setHours(startTime.getHours() + 1)
    const res = await fetch('/api/psychologist/slots', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ start_time: startTime.toISOString(), end_time: endTime.toISOString() }),
    })
    if (res.ok) {
      const newSlot = await res.json()
      setSlots((prev) => [...prev, newSlot])
    }
    setSelectedCell(null)
    setLoading(false)
  }

  async function handleDeleteSlot(slotId: string) {
    setLoading(true)
    const res = await fetch(`/api/psychologist/slots/${slotId}`, { method: 'DELETE' })
    if (res.ok) setSlots((prev) => prev.filter((s) => s.id !== slotId))
    setSelectedSlot(null)
    setLoading(false)
  }

  async function handleAccept(appointmentId: string) {
    setLoading(true)
    await fetch(`/api/appointments/${appointmentId}/accept`, { method: 'POST' })
    setSelectedSlot(null)
    setLoading(false)
    await fetchWeekSlots(currentWeekStart)
  }

  async function handleComplete(appointmentId: string) {
    await fetch(`/api/appointments/${appointmentId}/complete`, { method: 'POST' })
    await fetchWeekSlots(currentWeekStart)
    await fetchAppointments()
  }

  async function handleReject(appointmentId: string) {
    setLoading(true)
    await fetch(`/api/appointments/${appointmentId}/reject`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ reason: '' }),
    })
    setSelectedSlot(null)
    setLoading(false)
    await fetchWeekSlots(currentWeekStart)
  }

  const selectedAppointment = selectedSlot ? getAppointmentForSlot(selectedSlot.id) : null

  return (
    <div className="flex min-h-screen bg-[#F2F5F9]">
      {videoAppointmentId && (
        <VideoModal
          appointmentId={videoAppointmentId}
          participantName={profile.full_name}
          onClose={() => setVideoAppointmentId(null)}
        />
      )}

      {/* Sidebar — desktop */}
      <aside className="hidden md:flex w-56 bg-white border-r border-[#E4EAF2] flex-col py-6 px-4 fixed h-full z-20">
        <div className="mb-8 px-2">
          <span className="text-lg font-bold text-[#1D3557] tracking-tight">Psikolog<span className="text-[#1A6BB5]">.</span></span>
        </div>

        <nav className="flex flex-col gap-1 flex-1">
          {[
            { id: 'calendar', label: 'Takvim', icon: CalendarIcon },
            { id: 'clients', label: 'Danışanlarım', icon: PersonIcon },
            { id: 'messages', label: 'Mesajlar', icon: MessageIcon },
            { id: 'notifications', label: 'Bildirimler', icon: BellIcon, badge: unreadCount },
          ].map(({ id, label, icon: Icon, badge }) => (
            <button
              key={id}
              onClick={() => setActiveTab(id as typeof activeTab)}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all text-left ${
                activeTab === id
                  ? 'bg-[#EBF3FC] text-[#1D3557]'
                  : 'text-[#8FA3BF] hover:bg-gray-50 hover:text-gray-800'
              }`}
            >
              <Icon active={activeTab === id} />
              {label}
              {badge ? (
                <span className="ml-auto bg-[#1A6BB5] text-white text-xs font-bold w-5 h-5 rounded-full flex items-center justify-center">
                  {badge}
                </span>
              ) : null}
            </button>
          ))}
          <a href="/psychologist/profile"
            className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all text-[#8FA3BF] hover:bg-[#F2F5F9] hover:text-[#1D3557]">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/>
              <circle cx="12" cy="7" r="4"/>
            </svg>
            Profilim
          </a>
        </nav>

        <div className="flex items-center gap-3 px-2 pt-4 border-t border-[#E4EAF2]">
          <div className="w-8 h-8 rounded-full bg-[#EBF3FC] flex items-center justify-center text-[#1D3557] text-sm font-semibold flex-shrink-0 overflow-hidden">
            {profile.avatar_url
              ? <img src={profile.avatar_url} className="w-8 h-8 object-cover" alt="" />
              : profile.full_name[0]}
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-xs font-semibold text-gray-800 truncate">{profile.full_name}</p>
            <p className="text-xs text-[#8FA3BF]">Psikolog</p>
          </div>
          <button
            onClick={async () => {
              const { createClient } = await import('@/lib/supabase/client')
              await createClient().auth.signOut()
              window.location.href = '/'
            }}
            className="flex-shrink-0 text-[#8FA3BF] hover:text-red-500 transition-colors"
            title="Çıkış Yap"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4"/>
              <polyline points="16 17 21 12 16 7"/>
              <line x1="21" y1="12" x2="9" y2="12"/>
            </svg>
          </button>
        </div>
      </aside>

      {/* Main */}
      <main className="md:ml-56 flex-1 flex min-w-0">
        <div className="flex-1 min-w-0 p-4 md:p-6 pb-24 md:pb-6">

          {/* Takvim tab */}
          {activeTab === 'calendar' && (
            <div className="space-y-5">
              {/* İstatistik kartları */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
                {[
                  { label: 'Tamamlanan Seans', value: stats.totalSessions, color: 'text-[#1A7A4A]', bg: 'bg-[#E8F5EE]' },
                  { label: 'Onay Bekliyor', value: stats.pendingCount, color: 'text-[#92600A]', bg: 'bg-[#FEF3E2]' },
                  { label: 'Toplam Danışan', value: stats.totalClients, color: 'text-[#1A6BB5]', bg: 'bg-[#EBF3FC]' },
                  { label: 'Uygun Slot', value: stats.availableSlots, color: 'text-[#1D3557]', bg: 'bg-[#F2F5F9]' },
                ].map(({ label, value, color, bg }) => (
                  <div key={label} className="bg-white rounded-2xl border border-[#E4EAF2] p-4">
                    <p className="text-xs text-[#8FA3BF] mb-2">{label}</p>
                    <p className={`text-2xl font-bold ${color}`}>{value}</p>
                  </div>
                ))}
              </div>

              {/* Onay bekleyen talep varsa banner */}
              {pendingAppointments.length > 0 && (
                <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 flex items-center gap-4">
                  <div className="w-9 h-9 bg-amber-100 rounded-xl flex items-center justify-center flex-shrink-0">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#D97706" strokeWidth="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-semibold text-amber-800">
                      {pendingAppointments.length} onay bekleyen randevu talebi var
                    </p>
                    <p className="text-xs text-amber-600 mt-0.5">
                      {pendingAppointments.map(a => a.profiles?.full_name ?? 'Danışan').join(', ')} tarafından talep gönderildi.
                    </p>
                  </div>
                </div>
              )}

              {/* Takvim renk göstergesi */}
              <div className="flex items-center gap-1 justify-end">
                <div className="flex items-center gap-4 text-xs text-[#8FA3BF] bg-white border border-[#E4EAF2] rounded-xl px-4 py-2">
                  <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-sm bg-[#E8F5E9] border border-[#81C784] inline-block"/>Onaylı</span>
                  <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-sm bg-[#FFF8E1] border border-[#FFD54F] inline-block"/>Onay Bekliyor</span>
                  <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-sm bg-[#E3F2FD] border border-[#90CAF9] inline-block"/>Uygun</span>
                </div>
              </div>

              {/* Takvim */}
              <WeeklyCalendar
                weekStart={currentWeekStart}
                slots={slots}
                appointments={appointments}
                onCellClick={handleCellClick}
                onWeekChange={handleWeekChange}
                onThisWeek={handleThisWeek}
                weekOffset={weekOffset}
              />
            </div>
          )}

          {/* Danışanlar tab */}
          {activeTab === 'clients' && (
            <ClientsTab appointments={appointments} />
          )}

          {/* Bildirimler tab */}
          {/* Mesajlar */}
          {activeTab === 'messages' && (
            <div className="space-y-4" style={{ height: 'calc(100vh - 140px)' }}>
              <h2 className="text-xl font-medium" style={{ color: '#1D3557', letterSpacing: '-0.01em' }}>Mesajlar</h2>
              <div className="h-full">
                <MessagingPanel currentUserId={psychologistId} currentUserName={profile.full_name} role="psychologist" />
              </div>
            </div>
          )}

          {activeTab === 'notifications' && (
            <div className="space-y-4">
              <h2 className="text-xl font-bold text-[#1D3557]">Bildirimler</h2>
              {notifications.length === 0 ? (
                <div className="bg-white rounded-2xl border border-[#E4EAF2] p-12 text-center">
                  <p className="text-[#8FA3BF]">Henüz bildirim yok.</p>
                </div>
              ) : (
                <div className="bg-white rounded-2xl border border-[#E4EAF2] divide-y divide-gray-50">
                  {notifications.map(n => (
                    <div key={n.id} className={`flex items-start gap-4 px-6 py-4 ${!n.is_read ? 'bg-[#EBF3FC]/50' : ''}`}>
                      <div className={`w-2 h-2 rounded-full mt-2 flex-shrink-0 ${!n.is_read ? 'bg-[#EBF3FC]0' : 'bg-transparent'}`} />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-gray-800">{n.title}</p>
                        <p className="text-sm text-[#8FA3BF] mt-0.5">{n.description}</p>
                      </div>
                      <span className="text-xs text-[#8FA3BF] flex-shrink-0">{formatRelative(n.created_at)}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Sağ panel */}
        <div className="w-64 p-6 flex-shrink-0 hidden xl:block">
          {/* Profil özeti */}
          <div className="bg-white rounded-2xl border border-[#E4EAF2] p-5 mb-4">
            <div className="flex flex-col items-center text-center">
              <div className="w-16 h-16 rounded-2xl bg-[#EBF3FC] flex items-center justify-center text-[#1D3557] text-2xl font-bold mb-3 overflow-hidden">
                {profile.avatar_url
                  ? <img src={profile.avatar_url} className="w-16 h-16 object-cover" alt="" />
                  : profile.full_name[0]}
              </div>
              <p className="font-semibold text-[#1D3557] text-sm">{profile.full_name}</p>
              {profile.price_per_session && (
                <p className="text-xs text-[#8FA3BF] mt-0.5">₺{profile.price_per_session} / seans</p>
              )}
              <div className="flex flex-wrap gap-1 mt-3 justify-center">
                {profile.specialties.slice(0, 2).map(s => (
                  <span key={s} className="text-xs bg-[#EBF3FC] text-[#1A6BB5] px-2 py-0.5 rounded-full">{s}</span>
                ))}
              </div>
            </div>
          </div>

          {/* Son bildirimler */}
          <div className="bg-white rounded-2xl border border-[#E4EAF2] p-5">
            <p className="text-xs font-semibold text-[#8FA3BF] uppercase tracking-wide mb-4">Son Aktivite</p>
            {notifications.length === 0 ? (
              <p className="text-xs text-[#8FA3BF]">Bildirim yok.</p>
            ) : (
              <div className="space-y-4">
                {notifications.slice(0, 4).map(n => (
                  <div key={n.id} className="flex items-start gap-2.5">
                    <div className={`w-2 h-2 rounded-full mt-1 flex-shrink-0 ${!n.is_read ? 'bg-[#EBF3FC]0' : 'bg-gray-200'}`} />
                    <div className="min-w-0">
                      <p className="text-xs font-semibold text-gray-800 leading-tight">{n.title}</p>
                      <p className="text-xs text-[#8FA3BF] mt-0.5">{formatRelative(n.created_at)}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </main>

      {/* Mobil bottom navigation */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-[#E4EAF2] z-30 px-2 py-2">
        <div className="flex items-center justify-around">
          {[
            { id: 'calendar', label: 'Takvim', icon: CalendarIcon },
            { id: 'clients', label: 'Danışanlar', icon: PersonIcon },
            { id: 'messages', label: 'Mesajlar', icon: MessageIcon },
            { id: 'notifications', label: 'Bildirim', icon: BellIcon, badge: unreadCount },
          ].map(({ id, label, icon: Icon, badge }) => (
            <button
              key={id}
              onClick={() => setActiveTab(id as typeof activeTab)}
              className="flex flex-col items-center gap-1 px-3 py-1 relative"
            >
              <div className={activeTab === id ? 'text-[#1A6BB5]' : 'text-[#8FA3BF]'}>
                <Icon active={activeTab === id} />
              </div>
              <span className={`text-[10px] font-medium ${activeTab === id ? 'text-[#1A6BB5]' : 'text-[#8FA3BF]'}`}>
                {label}
              </span>
              {badge ? (
                <span className="absolute -top-0.5 right-1 bg-[#1A6BB5] text-white text-[9px] font-bold w-4 h-4 rounded-full flex items-center justify-center">
                  {badge > 9 ? '9+' : badge}
                </span>
              ) : null}
            </button>
          ))}
        </div>
      </nav>
      {(selectedCell || selectedSlot) && (
        <SlotModal
          mode={selectedSlot
            ? selectedSlot.status === 'requested'
              ? 'approve'
              : selectedSlot.status === 'booked'
              ? 'detail'
              : selectedSlot.status === 'completed'
              ? 'completed'
              : 'delete'
            : 'add'}
          slot={selectedSlot}
          appointment={selectedAppointment}
          cell={selectedCell}
          loading={loading}
          onAdd={handleAddSlot}
          onDelete={() => selectedSlot && handleDeleteSlot(selectedSlot.id)}
          onAccept={() => selectedAppointment && handleAccept(selectedAppointment.id)}
          onReject={() => selectedAppointment && handleReject(selectedAppointment.id)}
          onJoin={(id) => { setVideoAppointmentId(id); setSelectedSlot(null) }}
          onComplete={(id) => handleComplete(id)}
          onManualCreated={async () => { await fetchWeekSlots(currentWeekStart); await fetchAppointments() }}
          onClose={() => { setSelectedCell(null); setSelectedSlot(null) }}
        />
      )}
    </div>
  )
}

function MessageIcon({ active }: { active: boolean }) {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill={active ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/>
    </svg>
  )
}

function CalendarIcon({ active }: { active: boolean }) {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill={active ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
      <line x1="16" y1="2" x2="16" y2="6" />
      <line x1="8" y1="2" x2="8" y2="6" />
      <line x1="3" y1="10" x2="21" y2="10" />
    </svg>
  )
}

function PersonIcon({ active }: { active: boolean }) {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill={active ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M23 21v-2a4 4 0 00-3-3.87" />
      <path d="M16 3.13a4 4 0 010 7.75" />
    </svg>
  )
}

function BellIcon({ active }: { active: boolean }) {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill={active ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9" />
      <path d="M13.73 21a2 2 0 01-3.46 0" />
    </svg>
  )
}

const C = { navy: '#1D3557', blue: '#1A6BB5', blueTint: '#EBF3FC', muted: '#8FA3BF', border: '#E4EAF2', bg: '#F2F5F9', success: '#1A7A4A', successTint: '#E8F5EE', warning: '#92600A', warningTint: '#FEF3E2', danger: '#B91C1C', dangerTint: '#FDECEA' }

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { label: string; bg: string; color: string }> = {
    scheduled:        { label: 'Onaylı',        bg: C.successTint, color: C.success },
    pending_approval: { label: 'Onay Bekliyor', bg: C.warningTint, color: C.warning },
    completed:        { label: 'Tamamlandı',    bg: C.bg,          color: C.muted },
    cancelled:        { label: 'İptal',          bg: C.dangerTint,  color: C.danger },
  }
  const s = map[status] ?? { label: status, bg: C.bg, color: C.muted }
  return (
    <span className="text-xs font-medium px-2.5 py-1 rounded-full"
      style={{ background: s.bg, color: s.color }}>
      {s.label}
    </span>
  )
}

function formatSlotDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString('tr-TR', { day: 'numeric', month: 'short', year: 'numeric' }) +
    ' · ' + new Date(dateStr).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })
}

function ClientsTab({ appointments }: { appointments: Appointment[] }) {
  const [openClients, setOpenClients] = useState<Set<string>>(new Set())

  // Danışana göre grupla
  const grouped = useMemo(() => {
    const map: Record<string, { profile: Appointment['profiles']; appointments: Appointment[] }> = {}
    for (const apt of appointments) {
      if (!map[apt.client_id]) {
        map[apt.client_id] = { profile: apt.profiles, appointments: [] }
      }
      map[apt.client_id].appointments.push(apt)
    }
    return Object.entries(map)
  }, [appointments])

  function toggleClient(clientId: string) {
    setOpenClients(prev => {
      const next = new Set(prev)
      if (next.has(clientId)) next.delete(clientId)
      else next.add(clientId)
      return next
    })
  }

  if (grouped.length === 0) return (
    <div className="space-y-4">
      <h2 className="text-xl font-medium" style={{ color: C.navy }}>Danışanlarım</h2>
      <div className="bg-white rounded-2xl border p-12 text-center" style={{ borderColor: C.border }}>
        <p className="text-sm" style={{ color: C.muted }}>Henüz aktif danışan bulunmuyor.</p>
      </div>
    </div>
  )

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-medium" style={{ color: C.navy, letterSpacing: '-0.01em' }}>
        Danışanlarım <span className="text-base font-normal" style={{ color: C.muted }}>({grouped.length})</span>
      </h2>

      <div className="space-y-3">
        {grouped.map(([clientId, { profile, appointments: apts }]) => {
          const isOpen = openClients.has(clientId)
          const lastApt = apts[0]
          const completedCount = apts.filter(a => a.status === 'completed').length
          const pendingCount = apts.filter(a => a.status === 'pending_approval').length

          return (
            <div key={clientId} className="bg-white rounded-2xl border overflow-hidden" style={{ borderColor: C.border }}>
              {/* Danışan header */}
              <button onClick={() => toggleClient(clientId)}
                className="w-full flex items-center gap-3 px-5 py-4 text-left transition-colors hover:bg-gray-50">
                <div className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-medium flex-shrink-0 overflow-hidden"
                  style={{ background: C.blueTint, color: C.blue }}>
                  {profile?.avatar_url
                    ? <img src={profile.avatar_url} className="w-10 h-10 object-cover" alt="" />
                    : profile?.full_name?.[0] ?? '?'}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium" style={{ color: C.navy }}>{profile?.full_name ?? 'Danışan'}</p>
                  <p className="text-xs mt-0.5" style={{ color: C.muted }}>
                    {apts.length} seans
                    {completedCount > 0 && ` · ${completedCount} tamamlandı`}
                    {pendingCount > 0 && ` · ${pendingCount} bekliyor`}
                    {lastApt?.slot_start_time && ` · Son: ${new Date(lastApt.slot_start_time).toLocaleDateString('tr-TR', { day: 'numeric', month: 'short' })}`}
                  </p>
                </div>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={C.muted} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
                  style={{ transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.2s', flexShrink: 0 }}>
                  <polyline points="6 9 12 15 18 9"/>
                </svg>
              </button>

              {/* Seans listesi */}
              {isOpen && (
                <div style={{ borderTop: `0.5px solid ${C.border}` }}>
                  {apts.map((apt, i) => (
                    <div key={apt.id}
                      className="flex items-center gap-3 px-5 py-3"
                      style={{ borderTop: i > 0 ? `0.5px solid ${C.bg}` : 'none' }}>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs" style={{ color: C.muted }}>
                          {apt.slot_start_time ? formatSlotDate(apt.slot_start_time) : `Seans #${apt.id.slice(0, 6)}`}
                        </p>
                      </div>
                      <StatusBadge status={apt.status} />
                      {apt.status === 'completed' && (
                        <a href={`/psychologist/notes/${apt.id}`}
                          className="text-xs px-2.5 py-1.5 rounded-lg font-medium flex-shrink-0 transition-opacity hover:opacity-80"
                          style={{
                            background: apt.hasNote ? C.blueTint : C.bg,
                            color: apt.hasNote ? C.blue : C.muted,
                            border: `0.5px solid ${apt.hasNote ? C.blue : C.border}`,
                          }}>
                          {apt.hasNote ? '📝 Notu Gör' : 'Not Ekle'}
                        </a>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
