'use client'

import { useState, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

const C = { bg: '#F2F5F9', navy: '#1D3557', blue: '#1A6BB5', muted: '#8FA3BF', border: '#E4EAF2', danger: '#B91C1C', dangerTint: '#FDECEA' }

function Input({ label, type = 'text', value, onChange, placeholder, required, minLength }: { label: string; type?: string; value: string; onChange: (v: string) => void; placeholder?: string; required?: boolean; minLength?: number }) {
  return (
    <div>
      <label className="block text-xs font-medium mb-1.5" style={{ color: C.muted, letterSpacing: '0.06em' }}>{label}</label>
      <input type={type} value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder} required={required} minLength={minLength}
        className="w-full rounded-lg px-3.5 py-2.5 text-sm outline-none"
        style={{ border: `0.5px solid ${C.border}`, color: C.navy, background: '#FAFBFD' }}
        onFocus={e => e.target.style.borderColor = C.blue}
        onBlur={e => e.target.style.borderColor = C.border} />
    </div>
  )
}

function RegisterForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const next = searchParams.get('next') ?? '/client'

  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [googleLoading, setGoogleLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)

  async function handleRegister(e: React.FormEvent) {
    e.preventDefault()
    if (password.length < 6) { setError('Şifre en az 6 karakter olmalıdır.'); return }
    setLoading(true); setError('')
    const supabase = createClient()
    const { data, error: err } = await supabase.auth.signUp({ email, password, options: { data: { full_name: fullName } } })
    if (err || !data.user) { setError(err?.message ?? 'Kayıt sırasında bir hata oluştu.'); setLoading(false); return }
    if (data.session) {
      await fetch('/api/auth/register', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ full_name: fullName }) })
      router.replace(next)  // ← next parametresine yönlendir
    } else {
      setSuccess(true)
    }
    setLoading(false)
  }

  async function handleGoogle() {
    setGoogleLoading(true)
    // Google OAuth'a next parametresini taşı
    await createClient().auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(next)}` },
    })
  }

  if (success) return (
    <main className="min-h-screen flex items-center justify-center p-6" style={{ background: C.bg }}>
      <div className="bg-white rounded-xl border p-8 w-full max-w-sm text-center" style={{ borderColor: C.border }}>
        <div className="w-14 h-14 rounded-full flex items-center justify-center mx-auto mb-4" style={{ background: '#EBF3FC' }}>
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#1A6BB5" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/>
          </svg>
        </div>
        <h2 className="text-lg font-medium mb-2" style={{ color: C.navy }}>E-postanızı doğrulayın</h2>
        <p className="text-sm mb-6" style={{ color: C.muted }}><strong style={{ color: C.navy }}>{email}</strong> adresine doğrulama bağlantısı gönderdik.</p>
        <a href="/auth/login" className="text-sm font-medium" style={{ color: C.blue }}>Giriş sayfasına dön →</a>
      </div>
    </main>
  )

  return (
    <main className="min-h-screen flex items-center justify-center p-6" style={{ background: C.bg }}>
      <div className="w-full max-w-sm">
        <div className="mb-8">
          <a href="/" className="text-base font-medium" style={{ color: C.navy, letterSpacing: '-0.01em' }}>
            Menta<span style={{ color: C.blue }}>.</span>
          </a>
        </div>

        <div className="bg-white rounded-xl border p-7" style={{ borderColor: C.border }}>
          <h1 className="text-xl font-medium mb-1" style={{ color: C.navy, letterSpacing: '-0.01em' }}>Hesap Oluştur</h1>
          <p className="text-sm mb-6" style={{ color: C.muted }}>Ücretsiz kayıt olun</p>

          <form onSubmit={handleRegister} className="space-y-4">
            <Input label="AD SOYAD" value={fullName} onChange={setFullName} placeholder="Ad Soyad" required />
            <Input label="E-POSTA" type="email" value={email} onChange={setEmail} placeholder="ad@ornek.com" required />
            <Input label="ŞİFRE" type="password" value={password} onChange={setPassword} placeholder="En az 6 karakter" required minLength={6} />
            {error && <div className="text-sm rounded-lg px-3.5 py-2.5" style={{ background: C.dangerTint, color: C.danger }}>{error}</div>}
            <button type="submit" disabled={loading}
              className="w-full py-2.5 rounded-lg text-sm font-medium text-white disabled:opacity-50 hover:opacity-90 transition-opacity"
              style={{ background: C.blue }}>
              {loading ? 'Kayıt yapılıyor...' : 'Kayıt Ol'}
            </button>
          </form>

          <div className="flex items-center gap-3 my-5">
            <div className="flex-1 h-px" style={{ background: C.border }} />
            <span className="text-xs" style={{ color: C.muted }}>veya</span>
            <div className="flex-1 h-px" style={{ background: C.border }} />
          </div>

          <button onClick={handleGoogle} disabled={googleLoading}
            className="w-full flex items-center justify-center gap-2.5 py-2.5 rounded-lg text-sm border disabled:opacity-50"
            style={{ borderColor: C.border, color: C.navy }}>
            <svg width="16" height="16" viewBox="0 0 18 18">
              <path fill="#4285F4" d="M16.51 8H8.98v3h4.3c-.18 1-.74 1.48-1.6 2.04v2.01h2.6a7.8 7.8 0 002.38-5.88c0-.57-.05-.66-.15-1.18z"/>
              <path fill="#34A853" d="M8.98 17c2.16 0 3.97-.72 5.3-1.94l-2.6-2a4.8 4.8 0 01-7.18-2.54H1.83v2.07A8 8 0 008.98 17z"/>
              <path fill="#FBBC05" d="M4.5 10.52a4.8 4.8 0 010-3.04V5.41H1.83a8 8 0 000 7.18l2.67-2.07z"/>
              <path fill="#EA4335" d="M8.98 4.18c1.17 0 2.23.4 3.06 1.2l2.3-2.3A8 8 0 001.83 5.4L4.5 7.49a4.77 4.77 0 014.48-3.3z"/>
            </svg>
            {googleLoading ? 'Yönlendiriliyor...' : 'Google ile devam et'}
          </button>

          <p className="text-center text-sm mt-6" style={{ color: C.muted }}>
            Zaten hesabınız var mı?{' '}
            <a href="/auth/login" className="font-medium" style={{ color: C.blue }}>Giriş Yap</a>
          </p>
        </div>
      </div>
    </main>
  )
}

export default function RegisterPage() {
  return <Suspense><RegisterForm /></Suspense>
}
