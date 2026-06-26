'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import AssessmentWizard from '@/components/assessment/AssessmentWizard'

interface Profile {
  id: string
  full_name: string
  bio: string | null
  specialties: string[]
  price_per_session: number | null
}

export default function HomePage() {
  const [psychologists, setPsychologists] = useState<Profile[]>([])
  const [showWizard, setShowWizard] = useState(false)
  const [user, setUser] = useState<{ id: string; role?: string } | null>(null)
  const router = useRouter()

  useEffect(() => {
    fetch('/api/psychologists').then(r => r.json()).then(d => setPsychologists(d ?? []))
    fetch('/api/me').then(r => r.json()).then(d => setUser(d?.user ?? null)).catch(() => setUser(null))
  }, [])

  function handleBooking(psychologistId: string) {
    if (user) router.push(`/client/book/${psychologistId}`)
    else router.push(`/auth/login?next=/client/book/${psychologistId}`)
  }

  return (
    <main className="min-h-screen" style={{ background: '#F2F5F9' }}>
      {/* Header */}
      <header className="bg-white border-b px-4 md:px-8 py-4 flex items-center justify-between sticky top-0 z-10" style={{ borderColor: '#E4EAF2' }}>
        <div>
          <span className="text-base font-medium" style={{ color: '#1D3557', letterSpacing: '-0.01em' }}>Menta</span>
          <span style={{ color: '#1A6BB5' }}>.</span>
        </div>
        <nav className="flex items-center gap-6">
          <a href="#list" className="text-sm" style={{ color: '#8FA3BF' }}>Uzmanlar</a>
          <a href="/psikolog-ol" className="text-sm" style={{ color: '#8FA3BF' }}>Psikolog olarak katılın</a>
        </nav>
        <div className="flex items-center gap-3">
          {user ? (
            <a href={user.role === 'psychologist' ? '/psychologist' : '/client'}
              className="text-sm font-medium px-4 py-2 rounded-lg text-white transition-opacity hover:opacity-90"
              style={{ background: '#1A6BB5' }}>
              Hesabım
            </a>
          ) : (
            <>
              <a href="/auth/login" className="text-sm font-medium" style={{ color: '#1D3557' }}>Giriş Yap</a>
              <a href="/auth/kaydol"
                className="text-sm font-medium px-4 py-2 rounded-lg text-white"
                style={{ background: '#1A6BB5' }}>
                Kayıt Ol
              </a>
            </>
          )}
        </div>
      </header>

      {/* Hero */}
      <section className="max-w-5xl mx-auto px-4 md:px-8 pt-12 md:pt-16 pb-12">
        <p className="text-xs font-medium mb-4" style={{ color: '#1A6BB5', letterSpacing: '0.1em' }}>SEÇİLMİŞ UZMANLAR · ONLINE SEANS</p>
        <h1 className="text-4xl font-medium mb-4" style={{ color: '#1D3557', letterSpacing: '-0.02em', lineHeight: 1.2 }}>
          Zihinsel sağlığınız için<br />en iyi uzmanlara erişin
        </h1>
        <p className="text-base mb-8" style={{ color: '#8FA3BF', maxWidth: 480 }}>
          Titizlikle seçilmiş, alanında uzman psikologlarla güvenli ve profesyonel online seans alın.
        </p>
        <div className="flex gap-3">
          <button onClick={() => setShowWizard(true)}
            className="text-sm font-medium px-5 py-3 rounded-lg text-white transition-opacity hover:opacity-90"
            style={{ background: '#1A6BB5' }}>
            Size uygun psikologu bulalım
          </button>
          <a href="#list"
            className="text-sm font-medium px-5 py-3 rounded-lg border"
            style={{ borderColor: '#E4EAF2', color: '#1D3557', background: '#fff' }}>
            Tüm uzmanlar
          </a>
        </div>
      </section>

      {/* Psikolog listesi */}
      <section id="list" className="max-w-5xl mx-auto px-4 md:px-8 pb-16">
        <div className="flex items-center justify-between mb-6">
          <p className="text-xs font-medium" style={{ color: '#8FA3BF', letterSpacing: '0.08em' }}>
            {psychologists.length} UZMAN
          </p>
        </div>

        {psychologists.length === 0 ? (
          <div className="text-center py-20">
            <p className="text-sm" style={{ color: '#8FA3BF' }}>Uzmanlar yükleniyor...</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {psychologists.map(p => (
              <div key={p.id} className="bg-white rounded-xl border p-6 flex flex-col" style={{ borderColor: '#E4EAF2' }}>
                <div className="w-12 h-12 rounded-full mb-4 flex items-center justify-center text-sm font-medium"
                  style={{ background: '#EBF3FC', color: '#1A6BB5' }}>
                  {p.full_name[0]}
                </div>
                <h3 className="text-sm font-medium mb-1" style={{ color: '#1D3557' }}>{p.full_name}</h3>
                <p className="text-xs mb-3 line-clamp-2 flex-1" style={{ color: '#8FA3BF', lineHeight: 1.6 }}>{p.bio}</p>
                <div className="flex flex-wrap gap-1 mb-4">
                  {p.specialties?.slice(0, 3).map(s => (
                    <span key={s} className="text-xs px-2 py-0.5 rounded-full" style={{ background: '#EBF3FC', color: '#1A6BB5' }}>{s}</span>
                  ))}
                </div>
                <div className="flex items-center justify-between pt-4 border-t" style={{ borderColor: '#F2F5F9' }}>
                  <span className="text-sm font-medium" style={{ color: '#1D3557' }}>
                    {p.price_per_session ? `₺${p.price_per_session}` : '—'}<span className="text-xs font-normal" style={{ color: '#8FA3BF' }}> / seans</span>
                  </span>
                  <button onClick={() => handleBooking(p.id)}
                    className="text-xs font-medium px-3 py-1.5 rounded-lg text-white"
                    style={{ background: '#1A6BB5' }}>
                    Seans Al
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {showWizard && <AssessmentWizard onClose={() => setShowWizard(false)} onBook={handleBooking} />}
    </main>
  )
}
