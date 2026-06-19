'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'

const C = { bg: '#F2F5F9', navy: '#1D3557', blue: '#1A6BB5', blueTint: '#EBF3FC', muted: '#8FA3BF', border: '#E4EAF2', danger: '#B91C1C', dangerTint: '#FDECEA', success: '#1A7A4A', successTint: '#E8F5EE' }

const SPECIALTIES = [
  'Anksiyete', 'Depresyon', 'Travma', 'İlişki Sorunları', 'Aile Terapisi',
  'Çocuk ve Ergen', 'Stres Yönetimi', 'Yas', 'Bağımlılık', 'Yeme Bozukluğu',
  'OKB', 'Sosyal Kaygı', 'Öz Güven', 'Kariyer', 'Cinsel Sağlık',
]

function Field({ label, value, onChange, type = 'text', placeholder, required, minLength }: {
  label: string; value: string; onChange: (v: string) => void
  type?: string; placeholder?: string; required?: boolean; minLength?: number
}) {
  return (
    <div>
      <label className="block text-xs font-medium mb-1.5" style={{ color: C.muted, letterSpacing: '0.06em' }}>{label}</label>
      <input type={type} value={value} onChange={e => onChange(e.target.value)}
        placeholder={placeholder} required={required} minLength={minLength}
        className="w-full rounded-lg px-3.5 py-2.5 text-sm outline-none transition-all"
        style={{ border: `0.5px solid ${C.border}`, color: C.navy, background: '#FAFBFD' }}
        onFocus={e => e.target.style.borderColor = C.blue}
        onBlur={e => e.target.style.borderColor = C.border}
      />
    </div>
  )
}

export default function PsychologistApplyForm() {
  const [form, setForm] = useState({
    full_name: '', email: '', password: '', bio: '',
    price_per_session: '', gender: '', specialties: [] as string[],
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [done, setDone] = useState(false)

  function toggleSpecialty(s: string) {
    setForm(f => ({
      ...f,
      specialties: f.specialties.includes(s)
        ? f.specialties.filter(x => x !== s)
        : [...f.specialties, s],
    }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (form.password.length < 6) { setError('Şifre en az 6 karakter olmalıdır.'); return }
    if (form.specialties.length === 0) { setError('En az bir uzmanlık alanı seçin.'); return }
    setLoading(true); setError('')

    const supabase = createClient()

    // 1. Supabase Auth kaydı
    const { data, error: signUpError } = await supabase.auth.signUp({
      email: form.email,
      password: form.password,
      options: { data: { full_name: form.full_name } },
    })

    if (signUpError || !data.user) {
      setError(signUpError?.message ?? 'Kayıt sırasında bir hata oluştu.')
      setLoading(false)
      return
    }

    // 2. Psikolog kaydını API'ye gönder
    const res = await fetch('/api/auth/register-psychologist', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        id: data.user.id,
        email: form.email,
        full_name: form.full_name,
        bio: form.bio,
        specialties: form.specialties,
        price_per_session: Number(form.price_per_session) || null,
        gender: form.gender || null,
      }),
    })

    if (!res.ok) {
      const d = await res.json()
      setError(d.error ?? 'Kayıt sırasında bir hata oluştu.')
      setLoading(false)
      return
    }

    // Oturumu kapat — onay gelince login yapacak
    await supabase.auth.signOut()
    setDone(true)
    setLoading(false)
  }

  if (done) return (
    <main className="min-h-screen flex items-center justify-center p-6" style={{ background: C.bg }}>
      <div className="bg-white rounded-xl border p-10 max-w-md w-full text-center" style={{ borderColor: C.border }}>
        <div className="w-14 h-14 rounded-full flex items-center justify-center mx-auto mb-4" style={{ background: C.successTint }}>
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#1A7A4A" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="20 6 9 17 4 12"/>
          </svg>
        </div>
        <h1 className="text-xl font-medium mb-2" style={{ color: C.navy }}>Başvurunuz Alındı</h1>
        <p className="text-sm mb-6" style={{ color: C.muted, lineHeight: 1.6 }}>
          Ekibimiz başvurunuzu inceleyecek. Onaylandıktan sonra <strong style={{ color: C.navy }}>{form.email}</strong> adresinizle giriş yapabilirsiniz.
        </p>
        <a href="/auth/login" className="text-sm font-medium" style={{ color: C.blue }}>Giriş sayfasına git →</a>
      </div>
    </main>
  )

  return (
    <main className="min-h-screen py-12 px-6" style={{ background: C.bg }}>
      <div className="max-w-2xl mx-auto">
        <div className="mb-8">
          <a href="/" className="text-base font-medium" style={{ color: C.navy, letterSpacing: '-0.01em' }}>
            Menta<span style={{ color: C.blue }}>.</span>
          </a>
          <h1 className="text-2xl font-medium mt-6 mb-1" style={{ color: C.navy, letterSpacing: '-0.01em' }}>Psikolog olarak katılın</h1>
          <p className="text-sm" style={{ color: C.muted }}>Başvurunuz admin onayından sonra aktif edilecektir.</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Kişisel bilgiler */}
          <div className="bg-white rounded-xl border p-6 space-y-4" style={{ borderColor: C.border }}>
            <p className="text-xs font-medium" style={{ color: C.muted, letterSpacing: '0.06em' }}>KİŞİSEL BİLGİLER</p>
            <div className="grid grid-cols-2 gap-4">
              <Field label="AD SOYAD" value={form.full_name} onChange={v => setForm(f => ({ ...f, full_name: v }))} placeholder="Dr. Ad Soyad" required />
              <div>
                <label className="block text-xs font-medium mb-1.5" style={{ color: C.muted, letterSpacing: '0.06em' }}>CİNSİYET</label>
                <select value={form.gender} onChange={e => setForm(f => ({ ...f, gender: e.target.value }))}
                  className="w-full rounded-lg px-3.5 py-2.5 text-sm outline-none"
                  style={{ border: `0.5px solid ${C.border}`, color: C.navy, background: '#FAFBFD' }}>
                  <option value="">Belirtmek istemiyorum</option>
                  <option value="female">Kadın</option>
                  <option value="male">Erkek</option>
                </select>
              </div>
            </div>
            <Field label="SEANS ÜCRETİ (₺)" type="number" value={form.price_per_session} onChange={v => setForm(f => ({ ...f, price_per_session: v }))} placeholder="1500" required />
          </div>

          {/* Hesap bilgileri */}
          <div className="bg-white rounded-xl border p-6 space-y-4" style={{ borderColor: C.border }}>
            <p className="text-xs font-medium" style={{ color: C.muted, letterSpacing: '0.06em' }}>HESAP BİLGİLERİ</p>
            <Field label="E-POSTA" type="email" value={form.email} onChange={v => setForm(f => ({ ...f, email: v }))} placeholder="doktor@ornek.com" required />
            <Field label="ŞİFRE" type="password" value={form.password} onChange={v => setForm(f => ({ ...f, password: v }))} placeholder="En az 6 karakter" required minLength={6} />
          </div>

          {/* Hakkında */}
          <div className="bg-white rounded-xl border p-6" style={{ borderColor: C.border }}>
            <label className="block text-xs font-medium mb-1.5" style={{ color: C.muted, letterSpacing: '0.06em' }}>HAKKINDA</label>
            <textarea value={form.bio} onChange={e => setForm(f => ({ ...f, bio: e.target.value }))}
              placeholder="Deneyimlerinizi, yaklaşımınızı ve uzmanlık alanlarınızı kısaca anlatın..."
              rows={4} required
              className="w-full rounded-lg px-3.5 py-2.5 text-sm outline-none resize-none"
              style={{ border: `0.5px solid ${C.border}`, color: C.navy, background: '#FAFBFD', lineHeight: 1.6 }}
              onFocus={e => e.target.style.borderColor = C.blue}
              onBlur={e => e.target.style.borderColor = C.border}
            />
          </div>

          {/* Uzmanlıklar */}
          <div className="bg-white rounded-xl border p-6" style={{ borderColor: C.border }}>
            <p className="text-xs font-medium mb-1" style={{ color: C.muted, letterSpacing: '0.06em' }}>UZMANLIK ALANLARI</p>
            <p className="text-xs mb-4" style={{ color: C.muted }}>En az bir alan seçin</p>
            <div className="flex flex-wrap gap-2">
              {SPECIALTIES.map(s => (
                <button key={s} type="button" onClick={() => toggleSpecialty(s)}
                  className="text-sm px-3 py-1.5 rounded-full border transition-all"
                  style={form.specialties.includes(s)
                    ? { background: C.blue, borderColor: C.blue, color: '#fff' }
                    : { background: 'transparent', borderColor: C.border, color: C.muted }}>
                  {s}
                </button>
              ))}
            </div>
          </div>

          {error && (
            <div className="text-sm rounded-lg px-4 py-3" style={{ background: C.dangerTint, color: C.danger }}>{error}</div>
          )}

          <button type="submit" disabled={loading}
            className="w-full py-3.5 rounded-xl text-sm font-medium text-white disabled:opacity-50 hover:opacity-90 transition-opacity"
            style={{ background: C.blue }}>
            {loading ? 'Başvuru gönderiliyor...' : 'Başvuruyu Gönder'}
          </button>
        </form>
      </div>
    </main>
  )
}
