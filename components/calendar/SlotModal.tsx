'use client'

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

interface Props {
  mode: 'add' | 'delete' | 'approve' | 'detail'
  slot: Slot | null
  appointment: Appointment | null
  cell: { date: Date; hour: number } | null
  loading: boolean
  onAdd: () => void
  onDelete: () => void
  onAccept: () => void
  onReject: () => void
  onClose: () => void
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
  const end = new Date(start)
  end.setHours(hour + 1, 0, 0, 0)
  return `${start.toLocaleDateString('tr-TR', { weekday: 'long', day: 'numeric', month: 'long' })} · ${
    String(hour).padStart(2, '0')}:00 – ${String(hour + 1).padStart(2, '0')}:00`
}

export default function SlotModal({ mode, slot, appointment, cell, loading, onAdd, onDelete, onAccept, onReject, onClose }: Props) {
  const timeLabel = slot ? formatSlotTime(slot.start_time) : cell ? formatCellTime(cell.date, cell.hour) : ''

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div
        className="bg-white rounded-2xl shadow-xl w-full max-w-sm overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-6 py-5 border-b border-gray-100">
          <p className="text-xs font-medium text-gray-400 uppercase tracking-wide mb-1">
            {mode === 'add' ? 'Slot Ekle' :
             mode === 'delete' ? 'Uygun Slot' :
             mode === 'approve' ? 'Randevu Talebi' : 'Onaylı Seans'}
          </p>
          <p className="text-sm font-semibold text-gray-900">{timeLabel}</p>
        </div>

        {/* Content */}
        <div className="px-6 py-5">
          {mode === 'add' && (
            <p className="text-sm text-gray-500">
              Bu saati danışanların görebileceği şekilde takvime eklemek istiyor musunuz?
            </p>
          )}

          {mode === 'delete' && (
            <p className="text-sm text-gray-500">
              Bu slotu kaldırmak istiyor musunuz? Henüz talep gelmedi.
            </p>
          )}

          {mode === 'approve' && appointment?.profiles && (
            <div>
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 bg-gray-100 rounded-full flex-shrink-0" />
                <div>
                  <p className="text-sm font-semibold text-gray-900">{appointment.profiles.full_name}</p>
                  <p className="text-xs text-gray-400">Seans talebi gönderdi</p>
                </div>
              </div>
              <p className="text-sm text-gray-500">
                Talebi onaylarsanız görüşme odası otomatik oluşturulur ve danışana bildirim gider.
              </p>
            </div>
          )}

          {mode === 'detail' && appointment?.profiles && (
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gray-100 rounded-full flex-shrink-0" />
              <div>
                <p className="text-sm font-semibold text-gray-900">{appointment.profiles.full_name}</p>
                <p className="text-xs text-gray-400">Onaylı seans</p>
              </div>
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="px-6 pb-6 flex gap-3">
          {mode === 'add' && (
            <>
              <button onClick={onClose} className="flex-1 py-2.5 rounded-xl border border-gray-200 text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors">
                Vazgeç
              </button>
              <button onClick={onAdd} disabled={loading} className="flex-1 py-2.5 rounded-xl bg-black text-white text-sm font-medium disabled:opacity-40 hover:bg-gray-800 transition-colors">
                {loading ? '...' : 'Ekle'}
              </button>
            </>
          )}

          {mode === 'delete' && (
            <>
              <button onClick={onClose} className="flex-1 py-2.5 rounded-xl border border-gray-200 text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors">
                Kapat
              </button>
              <button onClick={onDelete} disabled={loading} className="flex-1 py-2.5 rounded-xl bg-red-500 text-white text-sm font-medium disabled:opacity-40 hover:bg-red-600 transition-colors">
                {loading ? '...' : 'Kaldır'}
              </button>
            </>
          )}

          {mode === 'approve' && (
            <>
              <button onClick={onReject} disabled={loading} className="flex-1 py-2.5 rounded-xl border border-red-200 text-red-500 text-sm font-medium disabled:opacity-40 hover:bg-red-50 transition-colors">
                {loading ? '...' : 'Reddet'}
              </button>
              <button onClick={onAccept} disabled={loading} className="flex-1 py-2.5 rounded-xl bg-green-500 text-white text-sm font-medium disabled:opacity-40 hover:bg-green-600 transition-colors">
                {loading ? '...' : 'Onayla'}
              </button>
            </>
          )}

          {mode === 'detail' && (
            <button onClick={onClose} className="flex-1 py-2.5 rounded-xl bg-black text-white text-sm font-medium hover:bg-gray-800 transition-colors">
              Kapat
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
