'use client'

import { useMemo } from 'react'

const HOURS = Array.from({ length: 24 }, (_, i) => i) // 00:00 - 23:00
const DAYS = ['Pzt', 'Sal', 'Çar', 'Per', 'Cum', 'Cmt', 'Paz']

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
  profiles: { full_name: string; avatar_url: string | null } | null
}

interface Props {
  weekStart: Date
  slots: Slot[]
  appointments: Appointment[]
  onCellClick: (date: Date, hour: number) => void
  onWeekChange: (direction: 'prev' | 'next') => void
  onThisWeek: () => void
  weekOffset: number
}

function getSlotStyle(status: string) {
  switch (status) {
    case 'available':
      return 'bg-[#E3F2FD] border-[#90CAF9] text-[#1565C0] hover:bg-[#BBDEFB]'
    case 'requested':
      return 'bg-[#FFF8E1] border-[#FFD54F] text-[#E65100] hover:bg-[#FFF3CD]'
    case 'booked':
    case 'scheduled':
      return 'bg-[#E8F5E9] border-[#81C784] text-[#2E7D32] hover:bg-[#C8E6C9]'
    case 'completed':
      return 'bg-gray-100 border-gray-200 text-gray-400'
    default:
      return ''
  }
}

function getSlotLabel(status: string) {
  switch (status) {
    case 'available': return 'Uygun'
    case 'requested': return 'Onay Bekliyor'
    case 'booked':
    case 'scheduled': return 'Onaylı Seans'
    case 'completed': return 'Tamamlandı'
    default: return ''
  }
}

export default function WeeklyCalendar({ weekStart, slots, appointments, onCellClick, onWeekChange, onThisWeek, weekOffset }: Props) {
  const days = useMemo(() => {
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(weekStart)
      d.setDate(d.getDate() + i)
      return d
    })
  }, [weekStart])

  const slotMap = useMemo(() => {
    const map: Record<string, Slot> = {}
    for (const slot of slots) {
      const d = new Date(slot.start_time)
      const key = `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}-${d.getHours()}`
      map[key] = slot
    }
    return map
  }, [slots])

  const appointmentMap = useMemo(() => {
    const map: Record<string, Appointment> = {}
    for (const apt of appointments) {
      map[apt.slot_id] = apt
    }
    return map
  }, [appointments])

  const today = new Date()
  today.setHours(0, 0, 0, 0)

  const monthLabel = weekStart.toLocaleDateString('tr-TR', { month: 'long', year: 'numeric' })

  return (
    <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden shadow-sm">
      {/* Takvim başlığı */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
        <div className="flex items-center gap-3">
          <button
            onClick={() => onWeekChange('prev')}
            className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-gray-100 text-gray-500 transition-colors"
          >
            ‹
          </button>
          <span className="text-sm font-semibold text-gray-900 min-w-[160px] text-center capitalize">
            {monthLabel}
          </span>
          <button
            onClick={() => onWeekChange('next')}
            className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-gray-100 text-gray-500 transition-colors"
          >
            ›
          </button>
        </div>
        {weekOffset !== 0 && (
          <button
            onClick={onThisWeek}
            className="text-xs font-medium px-3 py-1.5 rounded-lg transition-colors"
            style={{ color: '#1A6BB5', background: '#EBF3FC' }}
          >
            Bu Hafta
          </button>
        )}
      </div>

      <div className="overflow-auto max-h-[calc(100vh-220px)]">
        <table className="w-full border-collapse" style={{ minWidth: '700px' }}>
          <thead className="sticky top-0 z-10 bg-white">
            <tr>
              <th className="w-16 border-b border-r border-gray-100 py-3" />
              {days.map((day, i) => {
                const isToday = day.toDateString() === new Date().toDateString()
                return (
                  <th key={i} className="border-b border-gray-100 py-3 px-2">
                    <div className="flex flex-col items-center gap-1">
                      <span className="text-xs font-medium text-gray-400 uppercase tracking-wide">
                        {DAYS[i]}
                      </span>
                      <span className={`text-sm font-semibold w-7 h-7 flex items-center justify-center rounded-full ${
                        isToday ? 'bg-black text-white' : 'text-gray-700'
                      }`}>
                        {day.getDate()}
                      </span>
                    </div>
                  </th>
                )
              })}
            </tr>
          </thead>
          <tbody>
            {HOURS.map((hour) => (
              <tr key={hour} className="group">
                <td className="border-r border-gray-100 py-1 px-2 text-right align-top">
                  <span className="text-xs text-gray-300 font-medium">
                    {String(hour).padStart(2, '0')}:00
                  </span>
                </td>
                {days.map((day, di) => {
                  const key = `${day.getFullYear()}-${day.getMonth()}-${day.getDate()}-${hour}`
                  const slot = slotMap[key]
                  const apt = slot ? appointmentMap[slot.id] : null
                  const isPast = (() => {
                    const cellTime = new Date(day)
                    cellTime.setHours(hour, 0, 0, 0)
                    return cellTime < new Date()
                  })()

                  return (
                    <td
                      key={di}
                      className={`border-b border-gray-50 p-1 align-top h-12 ${
                        !slot && !isPast ? 'cursor-pointer hover:bg-gray-50' : ''
                      }`}
                      onClick={() => onCellClick(day, hour)}
                    >
                      {slot ? (
                        <div className={`h-full rounded-lg border px-2 py-1 cursor-pointer transition-colors ${getSlotStyle(slot.status)}`}>
                          <p className="text-xs font-medium leading-tight">{getSlotLabel(slot.status)}</p>
                          {apt?.profiles && (
                            <p className="text-xs opacity-75 truncate mt-0.5">{apt.profiles.full_name}</p>
                          )}
                        </div>
                      ) : isPast ? (
                        <div className="h-full" />
                      ) : (
                        <div className="h-full rounded-lg border border-dashed border-transparent group-hover:border-gray-200 transition-colors" />
                      )}
                    </td>
                  )
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
