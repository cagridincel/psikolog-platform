'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

const C = { navy: '#1D3557', blue: '#1A6BB5', blueTint: '#EBF3FC', muted: '#8FA3BF', border: '#E4EAF2', bg: '#F2F5F9', success: '#1A7A4A', successTint: '#E8F5EE', danger: '#B91C1C', dangerTint: '#FDECEA' }

function PasswordStrength({ password }: { password: string }) {
  const checks = [
    { label: 'En az 8 karakter', ok: password.length >= 8 },
    { label: 'Büyük harf', ok: /[A-Z]/.test(password) },
    { label: 'Küçük harf', ok: /[a-z]/.test(password) },
    { label: 'Rakam', ok: /[0-9]/.test(password) },
  ]
  const score = checks.filter(c => c.ok).length

  const color = score <= 1 ? C.danger : score <= 2 ? '#92600A' : score === 3 ? C.blue : C.success

  if (!password) return null

  return (
    <div className="mt-2">
      <div className="flex gap-1 mb-2">
        {[1, 2, 3, 4].map(i => (
          <div key={i} className="h-1 flex-1 rounded-full transition-all"
            style={{ background: i <= score ? color : C.border }} />
        ))}
      </div>
      <div className="grid grid-cols-2 gap-1">
        {checks.map(c => (
          <div key={c.label} className="flex items-center gap-1.5">
            <svg width="10" height="10" viewBox="0 0 24 24" fill="none"
              stroke={c.ok ? C.success : C.muted} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
              {c.ok ? <polyline points="20 6 9 17 4 12"/> : <line x1="18" y1="6" x2="6" y2="18"/>}
            </svg>
            <span className="text-xs" style={{ color: c.ok ? C.success : C.muted }}>{c.label}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

export default function SifreGuncellePage() {
  const router = useRouter()
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [sessionReady, setSessionReady] = useState(false)

  useEffect(() => {
    // Supabase email linkinden gelen token'ı session'a çevir
    const supabase = createClient()

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event) => {
      if (event === 'PASSWORD_RECOVERY') {
        setSessionReady(true)
      }
    })

    // Token URL'de hash olarak geliyorsa Supabase otomatik işler
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) setSessionReady(true)
    })

    return () => subscription.unsubscribe()
  }, [])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')

    if (password.length < 8) {
      setError('Şifre en az 8 karakter olmalıdır.')
      return
    }

    if (password !== confirmPassword) {
      setError('Şifreler eşleşmiyor.')
      return
    }

    setLoading(true)
    const supabase = createClient()
    const { error: err } = await supabase.auth.updateUser({ password })

    if (err) {
      setError(err.message === 'New password should be different from the old password.'
        ? 'Yeni şifreniz eski şifrenizden farklı olmalıdır.'
        : 'Şifre güncellenemedi. Lütfen tekrar deneyin.')
    } else {
      setSuccess(true)
      setTimeout(() => router.push('/auth/login'), 3000)
    }

    setLoading(false)
  }

  if (!sessionReady) return (
    <main className="min-h-screen flex items-center justify-center" style={{ background: C.bg }}>
      <div className="text-center">
        <div className="w-8 h-8 border-2 border-t-transparent rounded-full animate-spin mx-auto mb-3"
          style={{ borderColor: C.blue, borderTopColor: 'transparent' }} />
        <p className="text-sm" style={{ color: C.muted }}>Doğrulanıyor...</p>
      </div>
    </main>
  )

  return (
    <main className="min-h-screen flex items-center justify-center px-4" style={{ background: C.bg }}>
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <span className="text-2xl font-bold tracking-tight" style={{ color: C.navy }}>
            Psikolog<span style={{ color: C.blue }}>.</span>
          </span>
        </div>

        <div className="bg-white rounded-2xl border p-8" style={{ borderColor: C.border }}>
          {success ? (
            <div className="text-center">
              <div className="w-14 h-14 rounded-full flex items-center justify-center mx-auto mb-4"
                style={{ background: C.successTint }}>
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke={C.success} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="20 6 9 17 4 12"/>
                </svg>
              </div>
              <h1 className="text-lg font-medium mb-2" style={{ color: C.navy }}>Şifren güncellendi</h1>
              <p className="text-sm" style={{ color: C.muted }}>
                Birkaç saniye içinde giriş sayfasına yönlendirileceksiniz.
              </p>
            </div>
          ) : (
            <>
              <h1 className="text-lg font-medium mb-1" style={{ color: C.navy }}>Yeni şifre belirle</h1>
              <p className="text-sm mb-6" style={{ color: C.muted }}>
                Güçlü bir şifre seç.
              </p>

              {error && (
                <div className="flex items-center gap-2 px-3 py-2.5 rounded-xl mb-4" style={{ background: C.dangerTint }}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={C.danger} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="flex-shrink-0">
                    <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
                  </svg>
                  <p className="text-xs" style={{ color: C.danger }}>{error}</p>
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-xs font-medium mb-1.5" style={{ color: C.muted, letterSpacing: '0.06em' }}>
                    YENİ ŞİFRE
                  </label>
                  <div className="relative">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={e => setPassword(e.target.value)}
                      placeholder="En az 8 karakter"
                      required
                      className="w-full rounded-xl px-4 py-3 text-sm outline-none pr-10"
                      style={{ border: `0.5px solid ${C.border}`, color: C.navy, background: '#FAFBFD' }}
                    />
                    <button type="button" onClick={() => setShowPassword(p => !p)}
                      className="absolute right-3 top-1/2 -translate-y-1/2"
                      style={{ color: C.muted, background: 'none', border: 'none', cursor: 'pointer' }}>
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        {showPassword
                          ? <><path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94"/><path d="M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19"/><line x1="1" y1="1" x2="23" y2="23"/></>
                          : <><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></>
                        }
                      </svg>
                    </button>
                  </div>
                  <PasswordStrength password={password} />
                </div>

                <div>
                  <label className="block text-xs font-medium mb-1.5" style={{ color: C.muted, letterSpacing: '0.06em' }}>
                    ŞİFRE TEKRAR
                  </label>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={confirmPassword}
                    onChange={e => setConfirmPassword(e.target.value)}
                    placeholder="Şifreni tekrar gir"
                    required
                    className="w-full rounded-xl px-4 py-3 text-sm outline-none"
                    style={{
                      border: `0.5px solid ${confirmPassword && confirmPassword !== password ? C.danger : C.border}`,
                      color: C.navy,
                      background: '#FAFBFD',
                    }}
                  />
                  {confirmPassword && confirmPassword !== password && (
                    <p className="text-xs mt-1" style={{ color: C.danger }}>Şifreler eşleşmiyor</p>
                  )}
                </div>

                <button
                  type="submit"
                  disabled={loading || !password || !confirmPassword}
                  className="w-full py-3 rounded-xl text-white text-sm font-medium disabled:opacity-50 hover:opacity-90 transition-opacity"
                  style={{ background: C.blue }}>
                  {loading ? 'Güncelleniyor...' : 'Şifreyi Güncelle'}
                </button>
              </form>
            </>
          )}
        </div>
      </div>
    </main>
  )
}
