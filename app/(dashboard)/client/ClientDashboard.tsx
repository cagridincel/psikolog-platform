'use client'

import { useState } from 'react'
import Link from 'next/link'
import dynamic from 'next/dynamic'

const VideoModal = dynamic(() => import('@/components/video/VideoModal'), { ssr: false })
const MessagingPanel = dynamic(() => import('@/components/messaging/MessagingPanel'), { ssr: false })

interface Payment {
  id: string
  total_sessions_credited: number
  sessions_used: number
  psychologist_id: string
}

interface PaymentRecord {
  id: string
  amount_paid: number
  total_sessions_credited: number
  sessions_used: number
  status: string
  created_at: string
  psychologist_id: string
  psychologist_name: string
  psychologist_avatar: string | null
  iyzico_payment_id: string | null
}

interface Psychologist {
  id: string
  full_name: string
  avatar_url: string | null
  bio: string | null
  specialties: string[]
}

interface Appointment {
  id: string
  status: string
  slot_id: string
  meeting_room_url: string | null
  slot_start_time: string | null
}

interface Notification {
  id: string
  title: string
  description: string
  is_read: boolean
  created_at: string
}

interface Props {
  userId: string
  userName: string
  userAvatar: string | null
  activePayment: Payment | null
  psychologist: Psychologist | null
  psychologistId: string | null
  upcomingAppointments: Appointment[]
  notifications: Notification[]
  payments: PaymentRecord[]
  errorMessage?: string
}

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString('tr-TR', {
    weekday: 'long', day: 'numeric', month: 'long',
  })
}

function formatTime(dateStr: string) {
  return new Date(dateStr).toLocaleTimeString('tr-TR', {
    hour: '2-digit', minute: '2-digit',
  })
}

function formatRelative(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 60) return `${mins}dk önce`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `${hours}sa önce`
  return `${Math.floor(hours / 24)}g önce`
}

function StatusBadge({ status }: { status: string }) {
  if (status === 'scheduled') return (
    <span className="inline-flex items-center gap-1 text-xs font-medium text-green-700 bg-green-50 px-2 py-0.5 rounded-full">
      <span className="w-1.5 h-1.5 bg-green-500 rounded-full" />
      Onaylı
    </span>
  )
  return (
    <span className="inline-flex items-center gap-1 text-xs font-medium text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full">
      <span className="w-1.5 h-1.5 bg-amber-400 rounded-full" />
      Onay Bekliyor
    </span>
  )
}

export default function ClientDashboard({
  userId, userName, userAvatar, activePayment, psychologist, psychologistId,
  upcomingAppointments, notifications, payments, errorMessage,
}: Props) {
  const [activeTab, setActiveTab] = useState<'home' | 'sessions' | 'psychologist' | 'notifications' | 'payments' | 'messages'>('home')
  const [videoAppointmentId, setVideoAppointmentId] = useState<string | null>(null)
  const unreadCount = notifications.filter(n => !n.is_read).length
  const remainingSessions = activePayment
    ? activePayment.total_sessions_credited - activePayment.sessions_used
    : 0
  const firstName = userName.split(' ')[0]

  return (
    <div className="flex min-h-screen bg-[#F2F5F9]">
      {videoAppointmentId && (
        <VideoModal
          appointmentId={videoAppointmentId}
          participantName={userName}
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
            { id: 'home', label: 'Ana Sayfa', icon: HomeIcon },
            { id: 'sessions', label: 'Seanslarım', icon: CalendarIcon },
            { id: 'psychologist', label: 'Psikologum', icon: PersonIcon },
            { id: 'payments', label: 'Ödemelerim', icon: CreditCardIcon },
            { id: 'messages', label: 'Mesajlar', icon: MessageIcon },
            { id: 'notifications', label: 'Bildirimler', icon: BellIcon, badge: unreadCount },
          ].map(({ id, label, icon: Icon, badge }) => (
            <button
              key={id}
              onClick={() => setActiveTab(id as typeof activeTab)}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all text-left ${
                activeTab === id
                  ? 'bg-[#EBF3FC] text-[#1D3557]'
                  : 'text-[#8FA3BF] hover:bg-gray-50 hover:text-[#1D3557]'
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
        </nav>

        <div className="flex items-center gap-3 px-2 pt-4 border-t border-[#E4EAF2]">
          <div className="w-8 h-8 rounded-full bg-[#EBF3FC] flex items-center justify-center text-[#1D3557] text-sm font-semibold flex-shrink-0">
            {userAvatar ? (
              <img src={userAvatar} className="w-8 h-8 rounded-full object-cover" alt="" />
            ) : (
              userName[0]?.toUpperCase()
            )}
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-xs font-semibold text-[#1D3557] truncate">{userName}</p>
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

      {/* Main content */}
      <main className="md:ml-56 flex-1 flex min-w-0">
        <div className="flex-1 p-4 md:p-8 max-w-3xl pb-24 md:pb-8">

          {/* Ana Sayfa */}
          {activeTab === 'home' && (
            <div className="space-y-6">
              {/* Hata mesajı */}
              {errorMessage && (
                <div className="flex items-start gap-3 px-4 py-3.5 rounded-xl border" style={{ background: '#FEF3E2', borderColor: '#F59E0B' }}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#92600A" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="flex-shrink-0 mt-0.5">
                    <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/>
                    <line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>
                  </svg>
                  <p className="text-sm" style={{ color: '#92600A' }}>{errorMessage}</p>
                </div>
              )}
              {/* Karşılama */}
              <div className="bg-gradient-to-r from-[#1D3557] to-[#1A6BB5] rounded-2xl p-7 text-white relative overflow-hidden">
                <div className="absolute right-0 top-0 bottom-0 w-48 opacity-10"
                  style={{ background: 'radial-gradient(circle at 80% 50%, white 0%, transparent 70%)' }} />
                <p className="text-[#EBF3FC] text-sm mb-1">Hoş geldin</p>
                <h1 className="text-3xl font-bold">{firstName} 👋</h1>
                <p className="text-[#EBF3FC] text-sm mt-2">
                  {activePayment ? `${remainingSessions} seans hakkın bulunuyor.` : 'Henüz aktif bir paket yok.'}
                </p>
              </div>

              {/* Psikolog kartı */}
              {psychologist ? (
                <div className="bg-white rounded-2xl border border-[#E4EAF2] p-6">
                  <p className="text-xs font-semibold text-[#8FA3BF] uppercase tracking-wide mb-4">Psikologunuz</p>
                  <div className="flex items-start gap-4">
                    <div className="w-14 h-14 rounded-full bg-[#EBF3FC] flex items-center justify-center text-[#1D3557] text-xl font-bold flex-shrink-0 overflow-hidden">
                      {psychologist.avatar_url
                        ? <img src={psychologist.avatar_url} className="w-14 h-14 object-cover" alt="" />
                        : psychologist.full_name[0]}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h2 className="font-semibold text-[#1D3557]">{psychologist.full_name}</h2>
                      <p className="text-sm text-[#8FA3BF] mt-0.5 line-clamp-2">{psychologist.bio}</p>
                      <div className="flex flex-wrap gap-1.5 mt-2">
                        {psychologist.specialties.slice(0, 3).map(s => (
                          <span key={s} className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">{s}</span>
                        ))}
                      </div>
                    </div>
                    <Link
                      href={`/client/book/${psychologist.id}`}
                      className="flex-shrink-0 bg-[#1A6BB5] text-white text-sm font-medium px-4 py-2 rounded-xl hover:opacity-90 transition-colors"
                    >
                      Seans Al
                    </Link>
                  </div>

                  {/* Kalan seans */}
                  <div className="mt-5 pt-5 border-t border-[#E4EAF2] flex items-center justify-between">
                    <div>
                      <p className="text-3xl font-bold text-[#1D3557]">{remainingSessions}</p>
                      <p className="text-sm text-[#8FA3BF]">kalan seans</p>
                    </div>
                    <div className="flex gap-2">
                      {Array.from({ length: activePayment?.total_sessions_credited ?? 3 }).map((_, i) => (
                        <div key={i} className={`w-8 h-8 rounded-lg border-2 flex items-center justify-center ${
                          i < (activePayment?.sessions_used ?? 0)
                            ? 'bg-gray-100 border-gray-200'
                            : 'bg-[#EBF3FC] border-[#EBF3FC]'
                        }`}>
                          {i < (activePayment?.sessions_used ?? 0)
                            ? <span className="text-gray-300 text-xs">✓</span>
                            : <span className="text-[#5B9BD5] text-xs">●</span>}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="bg-white rounded-2xl border border-[#E4EAF2] p-8 text-center">
                  <div className="w-14 h-14 bg-[#EBF3FC] rounded-full flex items-center justify-center mx-auto mb-4">
                    <PersonIcon active={false} />
                  </div>
                  <p className="font-semibold text-[#1D3557] mb-1">Henüz bir psikolog seçmediniz</p>
                  <p className="text-sm text-[#8FA3BF] mb-5">Size uygun psikologu bulmak için değerlendirmeyi deneyin.</p>
                  <Link href="/" className="bg-[#1A6BB5] text-white text-sm font-medium px-5 py-2.5 rounded-xl hover:opacity-90 transition-colors">
                    Psikolog Bul
                  </Link>
                </div>
              )}

              {/* Yaklaşan randevular */}
              <div className="bg-white rounded-2xl border border-[#E4EAF2] p-6">
                <div className="flex items-center justify-between mb-4">
                  <p className="text-xs font-semibold text-[#8FA3BF] uppercase tracking-wide">Yaklaşan Seanslar</p>
                  {upcomingAppointments.length > 0 && (
                    <button onClick={() => setActiveTab('sessions')} className="text-xs text-[#1A6BB5] font-medium hover:underline">
                      Hepsini Gör
                    </button>
                  )}
                </div>
                {upcomingAppointments.length === 0 ? (
                  <p className="text-sm text-[#8FA3BF] py-4 text-center">Planlanmış seans bulunmuyor.</p>
                ) : (
                  <div className="space-y-3">
                    {upcomingAppointments.slice(0, 2).map(apt => (
                      <AppointmentCard key={apt.id} appointment={apt} onJoin={setVideoAppointmentId} />
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Seanslarım tab */}
          {activeTab === 'sessions' && (
            <div className="space-y-4">
              <h2 className="text-xl font-bold text-[#1D3557]">Seanslarım</h2>
              {upcomingAppointments.length === 0 ? (
                <div className="bg-white rounded-2xl border border-[#E4EAF2] p-12 text-center">
                  <p className="text-[#8FA3BF]">Planlanmış seans bulunmuyor.</p>
                  {psychologist && (
                    <Link href={`/client/book/${psychologist.id}`} className="mt-4 inline-block bg-[#1A6BB5] text-white text-sm font-medium px-5 py-2.5 rounded-xl">
                      Seans Al
                    </Link>
                  )}
                </div>
              ) : (
                upcomingAppointments.map(apt => (
                  <AppointmentCard key={apt.id} appointment={apt} expanded onJoin={setVideoAppointmentId} />
                ))
              )}
            </div>
          )}

          {/* Psikologum tab */}
          {activeTab === 'psychologist' && (
            <div className="space-y-4">
              <h2 className="text-xl font-bold text-[#1D3557]">Psikologum</h2>
              {psychologist ? (
                <div className="bg-white rounded-2xl border border-[#E4EAF2] p-8">
                  <div className="flex items-start gap-5 mb-6">
                    <div className="w-20 h-20 rounded-2xl bg-[#EBF3FC] flex items-center justify-center text-[#1D3557] text-2xl font-bold overflow-hidden flex-shrink-0">
                      {psychologist.avatar_url
                        ? <img src={psychologist.avatar_url} className="w-20 h-20 object-cover" alt="" />
                        : psychologist.full_name[0]}
                    </div>
                    <div>
                      <h3 className="text-xl font-bold text-[#1D3557]">{psychologist.full_name}</h3>
                      <p className="text-[#8FA3BF] mt-1">{psychologist.bio}</p>
                      <div className="flex flex-wrap gap-1.5 mt-3">
                        {psychologist.specialties.map(s => (
                          <span key={s} className="text-xs bg-[#EBF3FC] text-[#1D3557] px-2.5 py-1 rounded-full font-medium">{s}</span>
                        ))}
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-3">
                    <Link href={`/client/book/${psychologist.id}`} className="flex-1 text-center bg-[#1A6BB5] text-white text-sm font-medium py-3 rounded-xl hover:opacity-90 transition-colors">
                      Yeni Seans Al
                    </Link>
                  </div>
                </div>
              ) : (
                <div className="bg-white rounded-2xl border border-[#E4EAF2] p-12 text-center">
                  <p className="text-[#8FA3BF] mb-4">Henüz bir psikolog seçmediniz.</p>
                  <Link href="/" className="bg-[#1A6BB5] text-white text-sm font-medium px-5 py-2.5 rounded-xl">
                    Psikolog Bul
                  </Link>
                </div>
              )}
            </div>
          )}

          {/* Ödemeler tab */}
          {activeTab === 'payments' && (
            <div className="space-y-4">
              <h2 className="text-xl font-medium" style={{ color: '#1D3557', letterSpacing: '-0.01em' }}>Ödemelerim</h2>

              {payments.length === 0 ? (
                <div className="bg-white rounded-2xl border p-12 text-center" style={{ borderColor: '#E4EAF2' }}>
                  <p className="text-sm" style={{ color: '#8FA3BF' }}>Henüz ödeme geçmişi yok.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {payments.map(p => {
                    const remaining = p.total_sessions_credited - p.sessions_used
                    const isActive = p.status === 'paid' && remaining > 0
                    const isCancelled = p.status === 'cancelled'

                    return (
                      <div key={p.id} className="bg-white rounded-2xl border p-5" style={{ borderColor: '#E4EAF2' }}>
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-medium flex-shrink-0 overflow-hidden"
                              style={{ background: '#EBF3FC', color: '#1A6BB5' }}>
                              {p.psychologist_avatar
                                ? <img src={p.psychologist_avatar} className="w-10 h-10 object-cover" alt="" />
                                : p.psychologist_name?.[0] ?? '?'}
                            </div>
                            <div>
                              <p className="text-sm font-medium" style={{ color: '#1D3557' }}>{p.psychologist_name}</p>
                              <p className="text-xs mt-0.5" style={{ color: '#8FA3BF' }}>
                                {new Date(p.created_at).toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric' })}
                              </p>
                            </div>
                          </div>
                          <div className="text-right flex-shrink-0">
                            <p className="text-base font-medium" style={{ color: '#1D3557' }}>
                              ₺{p.amount_paid?.toLocaleString('tr-TR') ?? '—'}
                            </p>
                            <span className="text-xs font-medium px-2 py-0.5 rounded-full mt-1 inline-block" style={{
                              background: isActive ? '#EBF3FC' : isCancelled ? '#FDECEA' : '#E8F5EE',
                              color: isActive ? '#1A6BB5' : isCancelled ? '#B91C1C' : '#1A7A4A',
                            }}>
                              {isActive ? 'Aktif' : isCancelled ? 'İptal' : 'Tamamlandı'}
                            </span>
                          </div>
                        </div>

                        {/* Seans progress */}
                        <div className="mt-4 pt-4 border-t" style={{ borderColor: '#F2F5F9' }}>
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-xs" style={{ color: '#8FA3BF' }}>Seans kullanımı</span>
                            <span className="text-xs font-medium" style={{ color: '#1D3557' }}>
                              {p.sessions_used} / {p.total_sessions_credited} seans
                            </span>
                          </div>
                          <div className="h-1.5 rounded-full overflow-hidden" style={{ background: '#F2F5F9' }}>
                            <div className="h-full rounded-full transition-all" style={{
                              width: `${Math.min((p.sessions_used / p.total_sessions_credited) * 100, 100)}%`,
                              background: isActive ? '#1A6BB5' : isCancelled ? '#B91C1C' : '#1A7A4A',
                            }} />
                          </div>
                          {isActive && remaining > 0 && (
                            <p className="text-xs mt-2" style={{ color: '#1A6BB5' }}>
                              {remaining} seans hakkınız kaldı
                            </p>
                          )}
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          )}

          {/* Mesajlar tab */}
          {activeTab === 'messages' && (
            <div className="space-y-4" style={{ height: 'calc(100vh - 140px)' }}>
              <h2 className="text-xl font-medium" style={{ color: '#1D3557', letterSpacing: '-0.01em' }}>Mesajlar</h2>
              <div className="h-full">
                <MessagingPanel
                  currentUserId={userId}
                  currentUserName={userName}
                  role="client"
                  defaultRecipientId={psychologistId ?? undefined}
                />
              </div>
            </div>
          )}

          {/* Bildirimler tab */}
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
                      <div className={`w-2 h-2 rounded-full mt-2 flex-shrink-0 ${!n.is_read ? 'bg-[#1A6BB5]' : 'bg-transparent'}`} />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-[#1D3557]">{n.title}</p>
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

        {/* Sağ panel — bildirimler özeti */}
        <div className="w-72 p-6 flex-shrink-0 hidden lg:block">
          <div className="bg-white rounded-2xl border border-[#E4EAF2] p-5">
            <p className="text-xs font-semibold text-[#8FA3BF] uppercase tracking-wide mb-4">Son Aktivite</p>
            {notifications.length === 0 ? (
              <p className="text-sm text-[#8FA3BF]">Bildirim yok.</p>
            ) : (
              <div className="space-y-4">
                {notifications.slice(0, 4).map(n => (
                  <div key={n.id} className="flex items-start gap-3">
                    <div className={`w-2 h-2 rounded-full mt-1.5 flex-shrink-0 ${!n.is_read ? 'bg-[#1A6BB5]' : 'bg-gray-200'}`} />
                    <div className="min-w-0">
                      <p className="text-xs font-semibold text-[#1D3557] leading-tight">{n.title}</p>
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
            { id: 'home', label: 'Ana Sayfa', icon: HomeIcon },
            { id: 'sessions', label: 'Seanslar', icon: CalendarIcon },
            { id: 'psychologist', label: 'Psikolog', icon: PersonIcon },
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
    </div>
  )
}

function AppointmentCard({ appointment, expanded = false, onJoin }: { appointment: Appointment; expanded?: boolean; onJoin?: (id: string) => void }) {
  const dateStr = appointment.slot_start_time
  const now = new Date()

  // Seans saatine 20dk kala aktif, seans başlangıcından 95dk sonra devre dışı
  const isJoinable = (() => {
    if (appointment.status !== 'scheduled') return false
    if (!dateStr) return true
    const start = new Date(dateStr)
    const diffMins = (start.getTime() - now.getTime()) / 60000
    if (diffMins > 20) return false // Henüz çok erken
    const endMs = start.getTime() + 95 * 60000
    if (now.getTime() > endMs) return false // Seans süresi doldu
    return true
  })()

  return (
    <div className={`rounded-xl border ${expanded ? 'border-[#E4EAF2] p-5' : 'border-[#E4EAF2] bg-[#F2F5F9] p-4'}`} style={{ background: expanded ? '#fff' : undefined }}>
      <div className="flex items-start justify-between gap-3">
        <div>
          {dateStr && (
            <>
              <p className="text-sm font-medium" style={{ color: '#1D3557' }}>{formatDate(dateStr)}</p>
              <p className="text-sm mt-0.5" style={{ color: '#8FA3BF' }}>{formatTime(dateStr)}</p>
            </>
          )}
          <div className="mt-2">
            <StatusBadge status={appointment.status} />
          </div>
        </div>
        {isJoinable && (
          <button
            onClick={() => onJoin?.(appointment.id)}
            className="flex-shrink-0 text-white text-sm font-medium px-4 py-2 rounded-xl hover:opacity-90 transition-opacity"
            style={{ background: '#1A7A4A' }}
          >
            Katıl
          </button>
        )}
      </div>
    </div>
  )
}

// Icon components
function HomeIcon({ active }: { active: boolean }) {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill={active ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z" />
      <polyline points="9 22 9 12 15 12 15 22" />
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
      <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2" />
      <circle cx="12" cy="7" r="4" />
    </svg>
  )
}

function MessageIcon({ active }: { active: boolean }) {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill={active ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/>
    </svg>
  )
}

function CreditCardIcon({ active }: { active: boolean }) {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill={active ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="1" y="4" width="22" height="16" rx="2" ry="2"/>
      <line x1="1" y1="10" x2="23" y2="10"/>
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
