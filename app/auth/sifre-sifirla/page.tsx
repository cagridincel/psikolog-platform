'use client'

import { useState } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'

const C = { navy: '#1D3557', blue: '#1A6BB5', blueTint: '#EBF3FC', muted: '#8FA3BF', border: '#E4EAF2', bg: '#F2F5F9', success: '#1A7A4A', successTint: '#E8F5EE', danger: '#B91C1C', dangerTint: '#FDECEA' }

export default function SifreSifirlaPage() {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [sent, setSent] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!email.trim()) return

    setLoading(true)
    setError('')

    const supabase = createClient()
    const { error: err } = await supabase.auth.resetPasswordForEmail(email.trim(), {
      redirectTo: `${window.location.origin}/auth/sifre-guncelle`,
    })

    if (err) {
      setError('Bir hata oluştu. Lütfen e-posta adresinizi kontrol edin.')
    } else {
      setSent(true)
    }

    setLoading(false)
  }

  return (
    <main className="min-h-screen flex items-center justify-center px-4" style={{ background: C.bg }}>
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="text-center mb-8">
          <span className="text-2xl font-bold tracking-tight" style={{ color: C.navy }}>
            Psikolog<span style={{ color: C.blue }}>.</span>
          </span>
        </div>

        <div className="bg-white rounded-2xl border p-8" style={{ borderColor: C.border }}>
          {sent ? (
            /* Başarı ekranı */
            <div className="text-center">
              <div className="w-14 h-14 rounded-full flex items-center justify-center mx-auto mb-4"
                style={{ background: C.successTint }}>
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke={C.success} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/>
                  <polyline points="22,6 12,13 2,6"/>
                </svg>
              </div>
              <h1 className="text-lg font-medium mb-2" style={{ color: C.navy }}>E-posta gönderildi</h1>
              <p className="text-sm mb-6" style={{ color: C.muted, lineHeight: 1.6 }}>
                <strong style={{ color: C.navy }}>{email}</strong> adresine şifre sıfırlama bağlantısı gönderdik. Gelen kutunuzu kontrol edin.
              </p>
              <p className="text-xs mb-6" style={{ color: C.muted }}>
                E-posta gelmediyse spam klasörünü kontrol edin veya birkaç dakika bekleyin.
              </p>
              <button
                onClick={() => { setSent(false); setEmail('') }}
                className="text-sm font-medium"
                style={{ color: C.blue, background: 'none', border: 'none', cursor: 'pointer' }}>
                Farklı bir e-posta dene
              </button>
            </div>
          ) : (
            /* Form */
            <>
              <h1 className="text-lg font-medium mb-1" style={{ color: C.navy }}>Şifreni sıfırla</h1>
              <p className="text-sm mb-6" style={{ color: C.muted }}>
                Kayıtlı e-posta adresini gir, sıfırlama bağlantısı gönderelim.
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
                    E-POSTA
                  </label>
                  <input
                    type="email"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    placeholder="ornek@email.com"
                    required
                    className="w-full rounded-xl px-4 py-3 text-sm outline-none transition-all"
                    style={{ border: `0.5px solid ${C.border}`, color: C.navy, background: '#FAFBFD' }}
                  />
                </div>

                <button
                  type="submit"
                  disabled={loading || !email.trim()}
                  className="w-full py-3 rounded-xl text-white text-sm font-medium disabled:opacity-50 hover:opacity-90 transition-opacity"
                  style={{ background: C.blue }}>
                  {loading ? 'Gönderiliyor...' : 'Sıfırlama Bağlantısı Gönder'}
                </button>
              </form>
            </>
          )}
        </div>

        <p className="text-center text-sm mt-6" style={{ color: C.muted }}>
          <Link href="/auth/login" className="font-medium" style={{ color: C.blue }}>
            ← Giriş sayfasına dön
          </Link>
        </p>
      </div>
    </main>
  )
}
