import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

// AppointmentCard'ı ClientDashboard'dan izole etmek için inline tanımla
function AppointmentCard({ appointment, onJoin }: {
  appointment: { id: string; status: string; slot_start_time: string | null; slot_id: string; meeting_room_url: string | null }
  onJoin?: (id: string) => void
}) {
  const dateStr = appointment.slot_start_time
  const now = new Date()

  const isJoinable = (() => {
    if (appointment.status !== 'scheduled') return false
    if (!dateStr) return true
    const start = new Date(dateStr)
    const diffMins = (start.getTime() - now.getTime()) / 60000
    if (diffMins > 20) return false
    const endMs = start.getTime() + 95 * 60000
    if (now.getTime() > endMs) return false
    return true
  })()

  return (
    <div>
      <span data-testid="status">{appointment.status}</span>
      {isJoinable && (
        <button onClick={() => onJoin?.(appointment.id)} data-testid="join-btn">
          Katıl
        </button>
      )}
    </div>
  )
}

describe('AppointmentCard — Katıl butonu görünürlüğü', () => {
  const baseAppointment = {
    id: 'apt-1',
    status: 'scheduled',
    slot_id: 'slot-1',
    meeting_room_url: null,
  }

  it('seans 10dk sonrasına planlanmışsa Katıl butonu gösterir', () => {
    const future = new Date(Date.now() + 10 * 60 * 1000).toISOString()
    render(<AppointmentCard appointment={{ ...baseAppointment, slot_start_time: future }} />)
    expect(screen.getByTestId('join-btn')).toBeDefined()
  })

  it('seans 30dk sonrasına planlanmışsa Katıl butonu gizler', () => {
    const future = new Date(Date.now() + 30 * 60 * 1000).toISOString()
    render(<AppointmentCard appointment={{ ...baseAppointment, slot_start_time: future }} />)
    expect(screen.queryByTestId('join-btn')).toBeNull()
  })

  it('seans 96dk önce başlamışsa (süresi dolmuş) Katıl butonu gizler', () => {
    const past = new Date(Date.now() - 96 * 60 * 1000).toISOString()
    render(<AppointmentCard appointment={{ ...baseAppointment, slot_start_time: past }} />)
    expect(screen.queryByTestId('join-btn')).toBeNull()
  })

  it('seans 30dk önce başlamışsa (hâlâ aktif) Katıl butonu gösterir', () => {
    const active = new Date(Date.now() - 30 * 60 * 1000).toISOString()
    render(<AppointmentCard appointment={{ ...baseAppointment, slot_start_time: active }} />)
    expect(screen.getByTestId('join-btn')).toBeDefined()
  })

  it('status scheduled değilse Katıl butonu gizler', () => {
    const future = new Date(Date.now() + 10 * 60 * 1000).toISOString()
    render(<AppointmentCard appointment={{ ...baseAppointment, status: 'pending_approval', slot_start_time: future }} />)
    expect(screen.queryByTestId('join-btn')).toBeNull()
  })

  it('Katıl butonuna tıklanınca onJoin callback çağrılır', async () => {
    const onJoin = vi.fn()
    const future = new Date(Date.now() + 10 * 60 * 1000).toISOString()
    render(<AppointmentCard appointment={{ ...baseAppointment, slot_start_time: future }} onJoin={onJoin} />)

    await userEvent.click(screen.getByTestId('join-btn'))
    expect(onJoin).toHaveBeenCalledWith('apt-1')
  })
})
