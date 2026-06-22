'use client'

import { useState, useEffect, useCallback } from 'react'
import dynamic from 'next/dynamic'

const QuestionTreeEditor = dynamic(() => import('@/components/admin/QuestionTreeEditor'), { ssr: false })
const MessagingPanel = dynamic(() => import('@/components/messaging/MessagingPanel'), { ssr: false })
const PlatformControls = dynamic(() => import('@/components/admin/PlatformControls'), { ssr: false })

// ─── Types ────────────────────────────────────────────────────────────────────
interface Stats {
  totalUsers: number
  totalPsychologists: number
  pendingPsychologists: number
  totalSessions: number
  monthlySessions: number
  totalRevenue: number
  monthlyRevenue: number
}

interface Psychologist {
  id: string
  full_name: string
  email: string
  avatar_url: string | null
  bio: string | null
  specialties: string[]
  price_per_session: number | null
  is_approved: boolean
  gender: string | null
  created_at: string
}

interface User {
  id: string
  email: string
  full_name: string
  avatar_url: string | null
  created_at: string
  total_sessions: number
  remaining_sessions: number
}

interface Payment {
  id: string
  client_name: string
  psychologist_name: string
  amount_paid: number
  total_sessions_credited: number
  sessions_used: number
  status: string
  created_at: string
}

interface Appointment {
  id: string
  client_name: string
  psychologist_name: string
  status: string
  slot_start_time: string | null
  created_at: string
}

type Tab = 'overview' | 'psychologists' | 'users' | 'payments' | 'appointments' | 'questions' | 'messages' | 'controls'
type PsychTab = 'pending' | 'approved'

// ─── Helpers ─────────────────────────────────────────────────────────────────
function fmt(n: number) { return new Intl.NumberFormat('tr-TR').format(n) }
function fmtMoney(n: number) { return `₺${new Intl.NumberFormat('tr-TR').format(n)}` }
function fmtDate(s: string) {
  return new Date(s).toLocaleDateString('tr-TR', { day: 'numeric', month: 'short', year: 'numeric' })
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { label: string; bg: string; color: string }> = {
    paid:             { label: 'Ödendi',          bg: '#E8F5EE', color: '#1A7A4A' },
    cancelled:        { label: 'İptal',            bg: '#FDECEA', color: '#B91C1C' },
    scheduled:        { label: 'Onaylı',           bg: '#E8F5EE', color: '#1A7A4A' },
    pending_approval: { label: 'Onay Bekliyor',   bg: '#FEF3E2', color: '#92600A' },
    completed:        { label: 'Tamamlandı',       bg: '#EBF3FC', color: '#1A6BB5' },
    refunded:         { label: 'İade',             bg: '#FEF3E2', color: '#92600A' },
  }
  const s = map[status] ?? { label: status, bg: '#F2F5F9', color: '#8FA3BF' }
  return (
    <span className="text-xs font-medium px-2 py-0.5 rounded-full" style={{ background: s.bg, color: s.color }}>
      {s.label}
    </span>
  )
}

function Avatar({ name, src, size = 32 }: { name: string; src?: string | null; size?: number }) {
  if (src) return <img src={src} className="rounded-full object-cover flex-shrink-0" style={{ width: size, height: size }} alt="" />
  return (
    <div className="rounded-full flex items-center justify-center flex-shrink-0 font-medium text-xs"
      style={{ width: size, height: size, background: '#EBF3FC', color: '#1A6BB5' }}>
      {name?.[0]?.toUpperCase() ?? '?'}
    </div>
  )
}

// ─── Add Psychologist Modal ───────────────────────────────────────────────────
const SPECIALTIES = ['Anksiyete', 'Depresyon', 'Travma', 'İlişki Sorunları', 'Aile Terapisi',
  'Çocuk ve Ergen', 'Stres Yönetimi', 'Yas', 'Bağımlılık', 'OKB', 'Sosyal Kaygı', 'Öz Güven']

function AddPsychologistModal({ onClose, onSuccess }: { onClose: () => void; onSuccess: () => void }) {
  const [form, setForm] = useState({ full_name: '', email: '', password: '', bio: '', price_per_session: '', gender: '', specialties: [] as string[] })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  function toggleSpec(s: string) {
    setForm(f => ({ ...f, specialties: f.specialties.includes(s) ? f.specialties.filter(x => x !== s) : [...f.specialties, s] }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')
    const res = await fetch('/api/admin/psychologists', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...form, price_per_session: Number(form.price_per_session) }),
    })
    const data = await res.json()
    if (data.success) { onSuccess(); onClose() }
    else { setError(data.error ?? 'Bir hata oluştu'); setLoading(false) }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(29,53,87,0.3)' }}>
      <div className="bg-white rounded-xl border w-full max-w-lg max-h-[90vh] overflow-y-auto" style={{ borderColor: '#E4EAF2' }}>
        <div className="flex items-center justify-between px-6 py-4 border-b" style={{ borderColor: '#E4EAF2' }}>
          <h2 className="font-medium text-sm" style={{ color: '#1D3557' }}>Yeni Psikolog Ekle</h2>
          <button onClick={onClose} className="text-sm" style={{ color: '#8FA3BF' }}>✕</button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <Field label="AD SOYAD" value={form.full_name} onChange={v => setForm(f => ({ ...f, full_name: v }))} required />
            <Field label="E-POSTA" type="email" value={form.email} onChange={v => setForm(f => ({ ...f, email: v }))} required />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Field label="GEÇİCİ ŞİFRE" type="password" value={form.password} onChange={v => setForm(f => ({ ...f, password: v }))} required />
            <Field label="SEANS ÜCRETİ (₺)" type="number" value={form.price_per_session} onChange={v => setForm(f => ({ ...f, price_per_session: v }))} />
          </div>
          <div>
            <label className="block text-xs font-medium mb-1.5" style={{ color: '#8FA3BF', letterSpacing: '0.06em' }}>CİNSİYET</label>
            <select value={form.gender} onChange={e => setForm(f => ({ ...f, gender: e.target.value }))}
              className="w-full rounded-lg px-3.5 py-2.5 text-sm outline-none" style={{ border: '0.5px solid #E4EAF2', color: '#1D3557', background: '#FAFBFD' }}>
              <option value="">Belirtilmemiş</option>
              <option value="female">Kadın</option>
              <option value="male">Erkek</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium mb-1.5" style={{ color: '#8FA3BF', letterSpacing: '0.06em' }}>BİYOGRAFİ</label>
            <textarea value={form.bio} onChange={e => setForm(f => ({ ...f, bio: e.target.value }))} rows={3}
              className="w-full rounded-lg px-3.5 py-2.5 text-sm outline-none resize-none" style={{ border: '0.5px solid #E4EAF2', color: '#1D3557', background: '#FAFBFD' }} />
          </div>
          <div>
            <label className="block text-xs font-medium mb-2" style={{ color: '#8FA3BF', letterSpacing: '0.06em' }}>UZMANLIK ALANLARI</label>
            <div className="flex flex-wrap gap-1.5">
              {SPECIALTIES.map(s => (
                <button type="button" key={s} onClick={() => toggleSpec(s)}
                  className="text-xs px-3 py-1 rounded-full border transition-all"
                  style={form.specialties.includes(s)
                    ? { background: '#1A6BB5', borderColor: '#1A6BB5', color: '#fff' }
                    : { background: 'transparent', borderColor: '#E4EAF2', color: '#8FA3BF' }}>
                  {s}
                </button>
              ))}
            </div>
          </div>
          {error && <p className="text-sm rounded-lg px-3.5 py-2.5" style={{ background: '#FDECEA', color: '#B91C1C' }}>{error}</p>}
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="flex-1 py-2.5 rounded-lg text-sm border" style={{ borderColor: '#E4EAF2', color: '#8FA3BF' }}>İptal</button>
            <button type="submit" disabled={loading} className="flex-1 py-2.5 rounded-lg text-sm font-medium text-white disabled:opacity-50" style={{ background: '#1A6BB5' }}>
              {loading ? 'Ekleniyor...' : 'Psikolog Ekle'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

function Field({ label, value, onChange, type = 'text', required = false }: { label: string; value: string; onChange: (v: string) => void; type?: string; required?: boolean }) {
  return (
    <div>
      <label className="block text-xs font-medium mb-1.5" style={{ color: '#8FA3BF', letterSpacing: '0.06em' }}>{label}</label>
      <input type={type} value={value} onChange={e => onChange(e.target.value)} required={required}
        className="w-full rounded-lg px-3.5 py-2.5 text-sm outline-none" style={{ border: '0.5px solid #E4EAF2', color: '#1D3557', background: '#FAFBFD' }} />
    </div>
  )
}

// ─── Main Component ───────────────────────────────────────────────────────────
export default function AdminDashboard({ adminId, adminName }: { adminId: string; adminName: string }) {
  const [activeTab, setActiveTab] = useState<Tab>('overview')
  const [psychTab, setPsychTab] = useState<PsychTab>('pending')
  const [stats, setStats] = useState<Stats | null>(null)
  const [psychologists, setPsychologists] = useState<Psychologist[]>([])
  const [users, setUsers] = useState<User[]>([])
  const [usersPage, setUsersPage] = useState(0)
  const [usersHasMore, setUsersHasMore] = useState(false)
  const [payments, setPayments] = useState<Payment[]>([])
  const [appointments, setAppointments] = useState<Appointment[]>([])
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [showAddModal, setShowAddModal] = useState(false)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    fetch('/api/admin/stats').then(r => r.json()).then(setStats)
  }, [])

  const fetchPsychologists = useCallback(async () => {
    setLoading(true)
    const res = await fetch(`/api/admin/psychologists?status=${psychTab === 'pending' ? 'pending' : 'approved'}`)
    setPsychologists(await res.json())
    setLoading(false)
  }, [psychTab])

  useEffect(() => {
    if (activeTab === 'psychologists') fetchPsychologists()
  }, [activeTab, fetchPsychologists])

  useEffect(() => {
    if (activeTab === 'users') {
      setLoading(true)
      fetch(`/api/admin/users?search=${search}&page=${usersPage}`)
        .then(r => r.json())
        .then(d => {
          setUsers(d.data ?? [])
          setUsersHasMore(d.hasMore ?? false)
          setLoading(false)
        })
    }
  }, [activeTab, search, usersPage])

  useEffect(() => {
    if (activeTab === 'payments') {
      setLoading(true)
      fetch(`/api/admin/payments?status=${statusFilter}`).then(r => r.json()).then(d => { setPayments(d); setLoading(false) })
    }
  }, [activeTab, statusFilter])

  useEffect(() => {
    if (activeTab === 'appointments') {
      setLoading(true)
      fetch(`/api/admin/appointments?status=${statusFilter}`).then(r => r.json()).then(d => { setAppointments(d); setLoading(false) })
    }
  }, [activeTab, statusFilter])

  async function handleApprove(id: string, approved: boolean) {
    await fetch('/api/admin/psychologists', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, is_approved: approved }),
    })
    fetchPsychologists()
    fetch('/api/admin/stats').then(r => r.json()).then(setStats)
  }

  async function handleSignOut() {
    const { createClient } = await import('@/lib/supabase/client')
    await createClient().auth.signOut()
    window.location.href = '/admin/login'
  }

  const navItems: { id: Tab; label: string; badge?: number }[] = [
    { id: 'overview', label: 'Genel Bakış' },
    { id: 'psychologists', label: 'Psikologlar', badge: stats?.pendingPsychologists || undefined },
    { id: 'users', label: 'Kullanıcılar' },
    { id: 'payments', label: 'Ödemeler' },
    { id: 'appointments', label: 'Seanslar' },
    { id: 'questions', label: 'Soru Ağacı' },
    { id: 'messages', label: 'Mesajlar' },
    { id: 'controls', label: 'Kontroller' },
  ]

  return (
    <div className="flex min-h-screen" style={{ background: '#F2F5F9' }}>
      {showAddModal && <AddPsychologistModal onClose={() => setShowAddModal(false)} onSuccess={fetchPsychologists} />}

      {/* Sidebar */}
      <aside className="w-56 bg-white border-r flex flex-col fixed h-full z-20" style={{ borderColor: '#E4EAF2' }}>
        <div className="px-5 py-5 border-b" style={{ borderColor: '#E4EAF2' }}>
          <div className="text-sm font-medium" style={{ color: '#1D3557', letterSpacing: '-0.01em' }}>Menta</div>
          <div className="text-xs mt-0.5" style={{ color: '#8FA3BF', letterSpacing: '0.06em' }}>ADMIN PANELİ</div>
        </div>
        <nav className="flex-1 px-3 py-4 space-y-0.5">
          {navItems.map(({ id, label, badge }) => (
            <button key={id} onClick={() => setActiveTab(id)}
              className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-sm text-left transition-all"
              style={activeTab === id
                ? { background: '#EBF3FC', color: '#1A6BB5', fontWeight: 500 }
                : { color: '#8FA3BF' }}>
              {label}
              {badge ? (
                <span className="ml-auto text-xs font-medium w-5 h-5 rounded-full flex items-center justify-center" style={{ background: '#FEF3E2', color: '#92600A' }}>{badge}</span>
              ) : null}
            </button>
          ))}
        </nav>
        <div className="px-3 py-4 border-t" style={{ borderColor: '#E4EAF2' }}>
          <button onClick={handleSignOut} className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-sm transition-all" style={{ color: '#B91C1C' }}>
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/>
            </svg>
            Çıkış Yap
          </button>
        </div>
      </aside>

      {/* Main */}
      <main className="ml-56 flex-1 p-8">

        {/* GENEL BAKIŞ */}
        {activeTab === 'overview' && (
          <div className="space-y-6">
            <div>
              <h1 className="text-xl font-medium" style={{ color: '#1D3557', letterSpacing: '-0.01em' }}>Genel Bakış</h1>
              <p className="text-sm mt-0.5" style={{ color: '#8FA3BF' }}>Platform istatistikleri</p>
            </div>
            <div className="grid grid-cols-4 gap-4">
              {[
                { label: 'TOPLAM KULLANICI', value: fmt(stats?.totalUsers ?? 0), color: '#1A6BB5' },
                { label: 'AKTİF PSİKOLOG', value: fmt(stats?.totalPsychologists ?? 0), color: '#1D3557' },
                { label: 'BU AY SEANS', value: fmt(stats?.monthlySessions ?? 0), color: '#1A7A4A' },
                { label: 'BU AY GELİR', value: fmtMoney(stats?.monthlyRevenue ?? 0), color: '#1A6BB5' },
              ].map(({ label, value, color }) => (
                <div key={label} className="bg-white rounded-xl border p-5" style={{ borderColor: '#E4EAF2' }}>
                  <p className="text-xs font-medium mb-3" style={{ color: '#8FA3BF', letterSpacing: '0.06em' }}>{label}</p>
                  <p className="text-2xl font-medium" style={{ color, letterSpacing: '-0.02em' }}>{value}</p>
                </div>
              ))}
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-white rounded-xl border p-5" style={{ borderColor: '#E4EAF2' }}>
                <p className="text-xs font-medium mb-4" style={{ color: '#8FA3BF', letterSpacing: '0.06em' }}>ÖZET</p>
                {[
                  { label: 'Toplam seans', value: fmt(stats?.totalSessions ?? 0) },
                  { label: 'Toplam gelir', value: fmtMoney(stats?.totalRevenue ?? 0) },
                  { label: 'Onay bekleyen psikolog', value: fmt(stats?.pendingPsychologists ?? 0) },
                ].map(({ label, value }) => (
                  <div key={label} className="flex items-center justify-between py-3 border-b last:border-0" style={{ borderColor: '#F2F5F9' }}>
                    <span className="text-sm" style={{ color: '#8FA3BF' }}>{label}</span>
                    <span className="text-sm font-medium" style={{ color: '#1D3557' }}>{value}</span>
                  </div>
                ))}
              </div>
              {(stats?.pendingPsychologists ?? 0) > 0 && (
                <div className="bg-white rounded-xl border p-5" style={{ borderColor: '#E4EAF2' }}>
                  <p className="text-xs font-medium mb-3" style={{ color: '#8FA3BF', letterSpacing: '0.06em' }}>BEKLEYEN BAŞVURULAR</p>
                  <p className="text-3xl font-medium mb-3" style={{ color: '#92600A', letterSpacing: '-0.02em' }}>{stats?.pendingPsychologists}</p>
                  <p className="text-sm mb-4" style={{ color: '#8FA3BF' }}>psikolog başvurusu onay bekliyor</p>
                  <button onClick={() => setActiveTab('psychologists')}
                    className="text-sm font-medium px-4 py-2 rounded-lg" style={{ background: '#FEF3E2', color: '#92600A' }}>
                    İncele →
                  </button>
                </div>
              )}
            </div>
          </div>
        )}

        {/* PSİKOLOGLAR */}
        {activeTab === 'psychologists' && (
          <div className="space-y-5">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-xl font-medium" style={{ color: '#1D3557', letterSpacing: '-0.01em' }}>Psikologlar</h1>
                <p className="text-sm mt-0.5" style={{ color: '#8FA3BF' }}>Başvuru ve üye yönetimi</p>
              </div>
              <button onClick={() => setShowAddModal(true)}
                className="flex items-center gap-2 text-sm font-medium px-4 py-2.5 rounded-lg text-white" style={{ background: '#1A6BB5' }}>
                + Psikolog Ekle
              </button>
            </div>

            <div className="flex gap-1 bg-white border rounded-xl p-1 w-fit" style={{ borderColor: '#E4EAF2' }}>
              {(['pending', 'approved'] as PsychTab[]).map(t => (
                <button key={t} onClick={() => setPsychTab(t)}
                  className="text-sm px-4 py-1.5 rounded-lg transition-all"
                  style={psychTab === t ? { background: '#EBF3FC', color: '#1A6BB5', fontWeight: 500 } : { color: '#8FA3BF' }}>
                  {t === 'pending' ? 'Onay Bekliyor' : 'Aktif'}
                  {t === 'pending' && (stats?.pendingPsychologists ?? 0) > 0 && (
                    <span className="ml-1.5 text-xs px-1.5 py-0.5 rounded-full" style={{ background: '#FEF3E2', color: '#92600A' }}>{stats?.pendingPsychologists}</span>
                  )}
                </button>
              ))}
            </div>

            <div className="bg-white rounded-xl border overflow-hidden" style={{ borderColor: '#E4EAF2' }}>
              {loading ? (
                <div className="p-12 text-center text-sm" style={{ color: '#8FA3BF' }}>Yükleniyor...</div>
              ) : psychologists.length === 0 ? (
                <div className="p-12 text-center text-sm" style={{ color: '#8FA3BF' }}>
                  {psychTab === 'pending' ? 'Onay bekleyen başvuru yok.' : 'Aktif psikolog yok.'}
                </div>
              ) : (
                <table className="w-full">
                  <thead>
                    <tr style={{ borderBottom: '0.5px solid #E4EAF2' }}>
                      {['Psikolog', 'Uzmanlıklar', 'Ücret', 'Kayıt', 'İşlem'].map(h => (
                        <th key={h} className="text-left px-5 py-3 text-xs font-medium" style={{ color: '#8FA3BF', letterSpacing: '0.04em' }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {psychologists.map(p => (
                      <tr key={p.id} style={{ borderBottom: '0.5px solid #F2F5F9' }}>
                        <td className="px-5 py-4">
                          <div className="flex items-center gap-3">
                            <Avatar name={p.full_name} src={p.avatar_url} size={36} />
                            <div>
                              <p className="text-sm font-medium" style={{ color: '#1D3557' }}>{p.full_name}</p>
                              <p className="text-xs mt-0.5" style={{ color: '#8FA3BF' }}>{p.email}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-5 py-4">
                          <div className="flex flex-wrap gap-1">
                            {p.specialties.slice(0, 2).map(s => (
                              <span key={s} className="text-xs px-2 py-0.5 rounded-full" style={{ background: '#EBF3FC', color: '#1A6BB5' }}>{s}</span>
                            ))}
                            {p.specialties.length > 2 && <span className="text-xs" style={{ color: '#8FA3BF' }}>+{p.specialties.length - 2}</span>}
                          </div>
                        </td>
                        <td className="px-5 py-4 text-sm" style={{ color: '#1D3557' }}>
                          {p.price_per_session ? fmtMoney(p.price_per_session) : '—'}
                        </td>
                        <td className="px-5 py-4 text-sm" style={{ color: '#8FA3BF' }}>{fmtDate(p.created_at)}</td>
                        <td className="px-5 py-4">
                          <div className="flex gap-2">
                            {!p.is_approved ? (
                              <>
                                <button onClick={() => handleApprove(p.id, true)}
                                  className="text-xs font-medium px-3 py-1.5 rounded-lg" style={{ background: '#E8F5EE', color: '#1A7A4A' }}>
                                  Onayla
                                </button>
                                <button onClick={() => handleApprove(p.id, false)}
                                  className="text-xs font-medium px-3 py-1.5 rounded-lg" style={{ background: '#FDECEA', color: '#B91C1C' }}>
                                  Reddet
                                </button>
                              </>
                            ) : (
                              <button onClick={() => handleApprove(p.id, false)}
                                className="text-xs font-medium px-3 py-1.5 rounded-lg" style={{ background: '#FDECEA', color: '#B91C1C' }}>
                                Askıya Al
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        )}

        {/* KULLANICILAR */}
        {activeTab === 'users' && (
          <div className="space-y-5">
            <div>
              <h1 className="text-xl font-medium" style={{ color: '#1D3557', letterSpacing: '-0.01em' }}>Kullanıcılar</h1>
              <p className="text-sm mt-0.5" style={{ color: '#8FA3BF' }}>Kayıtlı danışanlar</p>
            </div>
            <input
              value={search}
              onChange={e => { setSearch(e.target.value); setUsersPage(0) }}
              placeholder="İsim veya e-posta ara..."
              className="w-full max-w-sm rounded-lg px-3.5 py-2.5 text-sm outline-none bg-white"
              style={{ border: '0.5px solid #E4EAF2', color: '#1D3557' }}
            />
            <div className="bg-white rounded-xl border overflow-hidden" style={{ borderColor: '#E4EAF2' }}>
              {loading ? (
                <div className="p-12 text-center text-sm" style={{ color: '#8FA3BF' }}>Yükleniyor...</div>
              ) : users.length === 0 ? (
                <div className="p-12 text-center text-sm" style={{ color: '#8FA3BF' }}>Kullanıcı bulunamadı.</div>
              ) : (
                <table className="w-full">
                  <thead>
                    <tr style={{ borderBottom: '0.5px solid #E4EAF2' }}>
                      {['Kullanıcı', 'E-posta', 'Kayıt Tarihi', 'Toplam Seans', 'Kalan Seans'].map(h => (
                        <th key={h} className="text-left px-5 py-3 text-xs font-medium" style={{ color: '#8FA3BF', letterSpacing: '0.04em' }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {users.map(u => (
                      <tr key={u.id} style={{ borderBottom: '0.5px solid #F2F5F9' }}>
                        <td className="px-5 py-4">
                          <div className="flex items-center gap-3">
                            <Avatar name={u.full_name || u.email} src={u.avatar_url} size={32} />
                            <span className="text-sm font-medium" style={{ color: '#1D3557' }}>{u.full_name || '—'}</span>
                          </div>
                        </td>
                        <td className="px-5 py-4 text-sm" style={{ color: '#8FA3BF' }}>{u.email}</td>
                        <td className="px-5 py-4 text-sm" style={{ color: '#8FA3BF' }}>{fmtDate(u.created_at)}</td>
                        <td className="px-5 py-4 text-sm font-medium" style={{ color: '#1D3557' }}>{u.total_sessions}</td>
                        <td className="px-5 py-4">
                          <span className="text-sm font-medium px-2.5 py-1 rounded-full" style={{ background: u.remaining_sessions > 0 ? '#EBF3FC' : '#F2F5F9', color: u.remaining_sessions > 0 ? '#1A6BB5' : '#8FA3BF' }}>
                            {u.remaining_sessions}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
            {/* Pagination */}
            <div className="flex items-center justify-between">
              <span className="text-xs" style={{ color: '#8FA3BF' }}>Sayfa {usersPage + 1}</span>
              <div className="flex gap-2">
                <button
                  onClick={() => setUsersPage(p => Math.max(0, p - 1))}
                  disabled={usersPage === 0 || loading}
                  className="text-sm px-4 py-2 rounded-lg border disabled:opacity-40"
                  style={{ borderColor: '#E4EAF2', color: '#1D3557' }}>
                  ← Önceki
                </button>
                <button
                  onClick={() => setUsersPage(p => p + 1)}
                  disabled={!usersHasMore || loading}
                  className="text-sm px-4 py-2 rounded-lg border disabled:opacity-40"
                  style={{ borderColor: '#E4EAF2', color: '#1D3557' }}>
                  Sonraki →
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ÖDEMELER */}
        {activeTab === 'payments' && (
          <div className="space-y-5">
            <div>
              <h1 className="text-xl font-medium" style={{ color: '#1D3557', letterSpacing: '-0.01em' }}>Ödemeler</h1>
              <p className="text-sm mt-0.5" style={{ color: '#8FA3BF' }}>Tüm ödeme geçmişi</p>
            </div>
            <div className="flex gap-2">
              {[['', 'Tümü'], ['paid', 'Ödendi'], ['cancelled', 'İptal']].map(([val, label]) => (
                <button key={val} onClick={() => setStatusFilter(val)}
                  className="text-sm px-4 py-1.5 rounded-lg border transition-all"
                  style={statusFilter === val
                    ? { background: '#EBF3FC', color: '#1A6BB5', borderColor: '#EBF3FC', fontWeight: 500 }
                    : { background: 'white', color: '#8FA3BF', borderColor: '#E4EAF2' }}>
                  {label}
                </button>
              ))}
            </div>
            <div className="bg-white rounded-xl border overflow-hidden" style={{ borderColor: '#E4EAF2' }}>
              {loading ? (
                <div className="p-12 text-center text-sm" style={{ color: '#8FA3BF' }}>Yükleniyor...</div>
              ) : payments.length === 0 ? (
                <div className="p-12 text-center text-sm" style={{ color: '#8FA3BF' }}>Ödeme bulunamadı.</div>
              ) : (
                <table className="w-full">
                  <thead>
                    <tr style={{ borderBottom: '0.5px solid #E4EAF2' }}>
                      {['Danışan', 'Psikolog', 'Tutar', 'Seans', 'Durum', 'Tarih'].map(h => (
                        <th key={h} className="text-left px-5 py-3 text-xs font-medium" style={{ color: '#8FA3BF', letterSpacing: '0.04em' }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {payments.map(p => (
                      <tr key={p.id} style={{ borderBottom: '0.5px solid #F2F5F9' }}>
                        <td className="px-5 py-4 text-sm font-medium" style={{ color: '#1D3557' }}>{p.client_name}</td>
                        <td className="px-5 py-4 text-sm" style={{ color: '#8FA3BF' }}>{p.psychologist_name}</td>
                        <td className="px-5 py-4 text-sm font-medium" style={{ color: '#1A6BB5' }}>{fmtMoney(p.amount_paid)}</td>
                        <td className="px-5 py-4 text-sm" style={{ color: '#8FA3BF' }}>{p.sessions_used}/{p.total_sessions_credited}</td>
                        <td className="px-5 py-4"><StatusBadge status={p.status} /></td>
                        <td className="px-5 py-4 text-sm" style={{ color: '#8FA3BF' }}>{fmtDate(p.created_at)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        )}

        {/* SEANSLAR */}
        {activeTab === 'appointments' && (
          <div className="space-y-5">
            <div>
              <h1 className="text-xl font-medium" style={{ color: '#1D3557', letterSpacing: '-0.01em' }}>Seanslar</h1>
              <p className="text-sm mt-0.5" style={{ color: '#8FA3BF' }}>Tüm randevu geçmişi</p>
            </div>
            <div className="flex gap-2">
              {[['', 'Tümü'], ['scheduled', 'Onaylı'], ['pending_approval', 'Bekliyor'], ['completed', 'Tamamlandı'], ['cancelled', 'İptal']].map(([val, label]) => (
                <button key={val} onClick={() => setStatusFilter(val)}
                  className="text-sm px-4 py-1.5 rounded-lg border transition-all"
                  style={statusFilter === val
                    ? { background: '#EBF3FC', color: '#1A6BB5', borderColor: '#EBF3FC', fontWeight: 500 }
                    : { background: 'white', color: '#8FA3BF', borderColor: '#E4EAF2' }}>
                  {label}
                </button>
              ))}
            </div>
            <div className="bg-white rounded-xl border overflow-hidden" style={{ borderColor: '#E4EAF2' }}>
              {loading ? (
                <div className="p-12 text-center text-sm" style={{ color: '#8FA3BF' }}>Yükleniyor...</div>
              ) : appointments.length === 0 ? (
                <div className="p-12 text-center text-sm" style={{ color: '#8FA3BF' }}>Seans bulunamadı.</div>
              ) : (
                <table className="w-full">
                  <thead>
                    <tr style={{ borderBottom: '0.5px solid #E4EAF2' }}>
                      {['Danışan', 'Psikolog', 'Tarih', 'Durum'].map(h => (
                        <th key={h} className="text-left px-5 py-3 text-xs font-medium" style={{ color: '#8FA3BF', letterSpacing: '0.04em' }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {appointments.map(a => (
                      <tr key={a.id} style={{ borderBottom: '0.5px solid #F2F5F9' }}>
                        <td className="px-5 py-4 text-sm font-medium" style={{ color: '#1D3557' }}>{a.client_name}</td>
                        <td className="px-5 py-4 text-sm" style={{ color: '#8FA3BF' }}>{a.psychologist_name}</td>
                        <td className="px-5 py-4 text-sm" style={{ color: '#8FA3BF' }}>
                          {a.slot_start_time ? fmtDate(a.slot_start_time) : '—'}
                        </td>
                        <td className="px-5 py-4"><StatusBadge status={a.status} /></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        )}

        {/* SORU AĞACI */}
        {activeTab === 'questions' && (
          <div className="space-y-5">
            <div>
              <h1 className="text-xl font-medium" style={{ color: '#1D3557', letterSpacing: '-0.01em' }}>Soru Ağacı</h1>
              <p className="text-sm mt-0.5" style={{ color: '#8FA3BF' }}>Değerlendirme sorularını ve dallanma mantığını yönetin</p>
            </div>
            <QuestionTreeEditor />
          </div>
        )}

        {activeTab === 'messages' && (
          <div className="space-y-5" style={{ height: 'calc(100vh - 140px)' }}>
            <div>
              <h1 className="text-xl font-medium" style={{ color: '#1D3557', letterSpacing: '-0.01em' }}>Mesajlar</h1>
              <p className="text-sm mt-0.5" style={{ color: '#8FA3BF' }}>Kullanıcılarla mesajlaşın</p>
            </div>
            <div className="h-full">
              <MessagingPanel currentUserId={adminId} currentUserName={adminName} role="admin" />
            </div>
          </div>
        )}

        {activeTab === 'controls' && (
          <div className="space-y-5">
            <div>
              <h1 className="text-xl font-medium" style={{ color: '#1D3557', letterSpacing: '-0.01em' }}>Platform Kontrolleri</h1>
              <p className="text-sm mt-0.5" style={{ color: '#8FA3BF' }}>Platformun davranışını etkileyen ayarları buradan yönetin</p>
            </div>
            <PlatformControls />
          </div>
        )}
      </main>
    </div>
  )
}
