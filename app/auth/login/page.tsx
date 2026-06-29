'use client'

import { useState, Suspense } from 'react'
import Link from 'next/link'
import { useSearchParams, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

const COLORS = { bg: '#F2F5F9', navy: '#1D3557', blue: '#1A6BB5', blueTint: '#EBF3FC', muted: '#8FA3BF', border: '#E4EAF2', danger: '#B91C1C', dangerTint: '#FDECEA' }

function Input({ label, type = 'text', value, onChange, placeholder, required }: { label: string; type?: string; value: string; onChange: (v: string) => void; placeholder?: string; required?: boolean }) {
  return (
    <div>
      <label className="block text-xs font-medium mb-1.5" style={{ color: COLORS.muted, letterSpacing: '0.06em' }}>{label}</label>
      <input type={type} value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder} required={required}
        className="w-full rounded-lg px-3.5 py-2.5 text-sm outline-none transition-all"
        style={{ border: `0.5px solid ${COLORS.border}`, color: COLORS.navy, background: '#FAFBFD' }}
        onFocus={e => e.target.style.borderColor = COLORS.blue}
        onBlur={e => e.target.style.borderColor = COLORS.border} />
    </div>
  )
}

function GoogleIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 18 18">
      <path fill="#4285F4" d="M16.51 8H8.98v3h4.3c-.18 1-.74 1.48-1.6 2.04v2.01h2.6a7.8 7.8 0 002.38-5.88c0-.57-.05-.66-.15-1.18z"/>
      <path fill="#34A853" d="M8.98 17c2.16 0 3.97-.72 5.3-1.94l-2.6-2a4.8 4.8 0 01-7.18-2.54H1.83v2.07A8 8 0 008.98 17z"/>
      <path fill="#FBBC05" d="M4.5 10.52a4.8 4.8 0 010-3.04V5.41H1.83a8 8 0 000 7.18l2.67-2.07z"/>
      <path fill="#EA4335" d="M8.98 4.18c1.17 0 2.23.4 3.06 1.2l2.3-2.3A8 8 0 001.83 5.4L4.5 7.49a4.77 4.77 0 014.48-3.3z"/>
    </svg>
  )
}

function LoginForm() {
  const searchParams = useSearchParams()
  const next = searchParams.get('next') ?? ''
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [googleLoading, setGoogleLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true); setError('')
    const supabase = createClient()
    const { data, error: err } = await supabase.auth.signInWithPassword({ email, password })
    if (err || !data.user) { setError('E-posta veya şifre hatalı.'); setLoading(false); return }
    if (next) { router.replace(next); return }
    const { data: userData } = await supabase.from('users').select('role').eq('id', data.user.id).single() as { data: { role: string } | null }
    const role = userData?.role
    if (role === 'psychologist') router.replace('/psychologist')
    else if (role === 'admin') router.replace('/admin')
    else router.replace('/client')
  }

  async function handleGoogle() {
    setGoogleLoading(true)
    await createClient().auth.signInWithOAuth({ provider: 'google', options: { redirectTo: `${window.location.origin}/auth/callback${next ? `?next=${encodeURIComponent(next)}` : ''}` } })
  }

  return (
    <main className="min-h-screen flex items-center justify-center p-6" style={{ background: COLORS.bg }}>
      <div className="w-full max-w-sm">
        <div className="mb-8">
          <a href="/" className="text-base font-medium" style={{ color: COLORS.navy, letterSpacing: '-0.01em' }}>
            Menta<span style={{ color: COLORS.blue }}>.</span>
          </a>
        </div>

        <div className="bg-white rounded-xl border p-7" style={{ borderColor: COLORS.border }}>
          <h1 className="text-xl font-medium mb-1" style={{ color: COLORS.navy, letterSpacing: '-0.01em' }}>Giriş Yap</h1>
          <p className="text-sm mb-6" style={{ color: COLORS.muted }}>Hesabınıza erişin</p>

          <form onSubmit={handleLogin} className="space-y-4">
            <Input label="E-POSTA" type="email" value={email} onChange={setEmail} placeholder="ad@ornek.com" required />
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-medium" style={{ color: COLORS.muted, letterSpacing: '0.06em' }}>ŞİFRE</label>
                <Link href="/auth/sifre-sifirla" className="text-xs" style={{ color: COLORS.blue }}>
                  Şifremi unuttum
                </Link>
              </div>
              <Input label="" type="password" value={password} onChange={setPassword} placeholder="••••••••" required />
            </div>
            {error && <div className="text-sm rounded-lg px-3.5 py-2.5" style={{ background: COLORS.dangerTint, color: COLORS.danger }}>{error}</div>}
            <button type="submit" disabled={loading}
              className="w-full py-2.5 rounded-lg text-sm font-medium text-white disabled:opacity-50 transition-opacity hover:opacity-90"
              style={{ background: COLORS.blue }}>
              {loading ? 'Giriş yapılıyor...' : 'Giriş Yap'}
            </button>
          </form>

          <div className="flex items-center gap-3 my-5">
            <div className="flex-1 h-px" style={{ background: COLORS.border }} />
            <span className="text-xs" style={{ color: COLORS.muted }}>veya</span>
            <div className="flex-1 h-px" style={{ background: COLORS.border }} />
          </div>

          <button onClick={handleGoogle} disabled={googleLoading}
            className="w-full flex items-center justify-center gap-2.5 py-2.5 rounded-lg text-sm border transition-colors disabled:opacity-50"
            style={{ borderColor: COLORS.border, color: COLORS.navy, background: '#fff' }}>
            <GoogleIcon />
            {googleLoading ? 'Yönlendiriliyor...' : 'Google ile devam et'}
          </button>

          <div className="mt-6 pt-5 border-t text-center space-y-2" style={{ borderColor: COLORS.border }}>
            <p className="text-sm" style={{ color: COLORS.muted }}>
              Hesabınız yok mu?{' '}
              <a href={`/auth/kaydol${next ? `?next=${encodeURIComponent(next)}` : ''}`} className="font-medium" style={{ color: COLORS.blue }}>Kayıt Ol</a>
            </p>
            <p className="text-sm" style={{ color: COLORS.muted }}>
              Psikolog musunuz?{' '}
              <a href="/psikolog-ol" className="font-medium" style={{ color: COLORS.blue }}>Başvurun</a>
            </p>
          </div>
        </div>
      </div>
    </main>
  )
}

export default function LoginPage() {
  return <Suspense><LoginForm /></Suspense>
}
