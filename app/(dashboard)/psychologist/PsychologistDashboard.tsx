'use client'

import { useState, useCallback } from 'react'
import WeeklyCalendar from '@/components/calendar/WeeklyCalendar'
import SlotModal from '@/components/calendar/SlotModal'

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
  profiles: { full_name: string; avatar_url: string | null } | null
}

interface Props {
  psychologistId: string
  profile: { id: string; full_name: string }
  slots: Slot[]
  appointments: Appointment[]
  weekStart: string
}

export default function PsychologistDashboard({ psychologistId, profile, slots: initialSlots, appointments, weekStart }: Props) {
  const [slots, setSlots] = useState<Slot[]>(initialSlots)
  const [weekOffset, setWeekOffset] = useState(0)
  const [currentWeekStart, setCurrentWeekStart] = useState(new Date(weekStart))
  const [selectedCell, setSelectedCell] = useState<{ date: Date; hour: number } | null>(null)
  const [selectedSlot, setSelectedSlot] = useState<Slot | null>(null)
  const [loading, setLoading] = useState(false)

  const getAppointmentForSlot = useCallback((slotId: string) => {
    console.log('looking for slot:', slotId, 'in appointments:', appointments)
    return appointments.find((a) => a.slot_id === slotId) ?? null
  }, [appointments])

  async function fetchWeekSlots(start: Date) {
    const end = new Date(start)
    end.setDate(start.getDate() + 7)
    const res = await fetch(
      `/api/psychologist/slots?start=${start.toISOString()}&end=${end.toISOString()}`
    )
    if (res.ok) {
      const data = await res.json()
      setSlots(data)
    }
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
    // Bu hücrede slot var mı?
    const existing = slots.find((s) => {
      const slotDate = new Date(s.start_time)
      return (
        slotDate.getFullYear() === date.getFullYear() &&
        slotDate.getMonth() === date.getMonth() &&
        slotDate.getDate() === date.getDate() &&
        slotDate.getHours() === hour
      )
    })

    console.log('clicked hour:', hour, 'existing slot:', existing, 'all slots:', slots)


    if (existing) {
      setSelectedSlot(existing)
      setSelectedCell(null)
    } else {
      // Geçmiş saatlere slot eklenemez
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
      body: JSON.stringify({
        start_time: startTime.toISOString(),
        end_time: endTime.toISOString(),
      }),
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
    if (res.ok) {
      setSlots((prev) => prev.filter((s) => s.id !== slotId))
    }
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
  console.log('selectedAppointment full:', JSON.stringify(selectedAppointment))


  return (
    <main className="min-h-screen bg-[#F8F7F4]">
      {/* Header */}
      <header className="bg-white border-b border-gray-100 px-6 py-4 flex items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold text-gray-900">{profile.full_name}</h1>
          <p className="text-sm text-gray-400">Psikolog Paneli</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-3 text-xs text-gray-400">
            <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-sm bg-[#E8F5E9] border border-[#81C784] inline-block"/>Onaylı</span>
            <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-sm bg-[#FFF8E1] border border-[#FFD54F] inline-block"/>Onay Bekliyor</span>
            <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-sm bg-[#E3F2FD] border border-[#90CAF9] inline-block"/>Uygun</span>
          </div>
        </div>
      </header>

      {/* Takvim */}
      <div className="p-6">
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

      {/* Slot Modal */}
      {(selectedCell || selectedSlot) && (
        <SlotModal
          mode={selectedSlot
            ? (selectedAppointment
              ? selectedSlot.status === 'requested' ? 'approve' : 'detail'
              : 'delete')
            : 'add'}
          slot={selectedSlot}
          appointment={selectedAppointment}
          cell={selectedCell}
          loading={loading}
          onAdd={handleAddSlot}
          onDelete={() => selectedSlot && handleDeleteSlot(selectedSlot.id)}
          onAccept={() => selectedAppointment && handleAccept(selectedAppointment.id)}
          onReject={() => selectedAppointment && handleReject(selectedAppointment.id)}
          onClose={() => { setSelectedCell(null); setSelectedSlot(null) }}
        />
      )}
    </main>
  )
}
