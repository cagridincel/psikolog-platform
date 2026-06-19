'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

export default function AdminLoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')

    const supabase = createClient()
    const { data, error: signInError } = await supabase.auth.signInWithPassword({ email, password })

    if (signInError || !data.user) {
      setError('E-posta veya şifre hatalı.')
      setLoading(false)
      return
    }

    const { data: userData } = await supabase
      .from('users')
      .select('role')
      .eq('id', data.user.id)
      .single() as { data: { role: string } | null }

    if (userData?.role !== 'admin') {
      await supabase.auth.signOut()
      setError('Bu sayfaya erişim yetkiniz yok.')
      setLoading(false)
      return
    }

    router.replace('/admin')
  }

  return (
    <main className="min-h-screen flex items-center justify-center p-6" style={{ background: '#F2F5F9' }}>
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl mb-4" style={{ background: '#EBF3FC' }}>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#1A6BB5" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
              <path d="M7 11V7a5 5 0 0110 0v4"/>
            </svg>
          </div>
          <h1 className="text-xl font-medium" style={{ color: '#1D3557', letterSpacing: '-0.01em' }}>Admin Girişi</h1>
          <p className="text-sm mt-1" style={{ color: '#8FA3BF' }}>Yalnızca yetkili personel</p>
        </div>

        <div className="bg-white rounded-xl border p-6" style={{ borderColor: '#E4EAF2' }}>
          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-xs font-medium mb-1.5" style={{ color: '#1D3557', letterSpacing: '0.02em' }}>E-POSTA</label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="admin@menta.com"
                required
                className="w-full rounded-lg px-3.5 py-2.5 text-sm outline-none transition-all"
                style={{ border: '0.5px solid #E4EAF2', color: '#1D3557', background: '#FAFBFD' }}
                onFocus={e => e.target.style.borderColor = '#1A6BB5'}
                onBlur={e => e.target.style.borderColor = '#E4EAF2'}
              />
            </div>
            <div>
              <label className="block text-xs font-medium mb-1.5" style={{ color: '#1D3557', letterSpacing: '0.02em' }}>ŞİFRE</label>
              <input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                className="w-full rounded-lg px-3.5 py-2.5 text-sm outline-none transition-all"
                style={{ border: '0.5px solid #E4EAF2', color: '#1D3557', background: '#FAFBFD' }}
                onFocus={e => e.target.style.borderColor = '#1A6BB5'}
                onBlur={e => e.target.style.borderColor = '#E4EAF2'}
              />
            </div>

            {error && (
              <div className="rounded-lg px-3.5 py-2.5 text-sm" style={{ background: '#FDECEA', color: '#B91C1C' }}>
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 rounded-lg text-sm font-medium text-white transition-opacity disabled:opacity-50"
              style={{ background: '#1A6BB5' }}
            >
              {loading ? 'Giriş yapılıyor...' : 'Giriş Yap'}
            </button>
          </form>
        </div>

        <p className="text-center text-xs mt-6" style={{ color: '#8FA3BF' }}>
          <a href="/" style={{ color: '#1A6BB5' }}>← Ana sayfaya dön</a>
        </p>
      </div>
    </main>
  )
}
