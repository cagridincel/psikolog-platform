'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'

const SPECIALTIES = [
  'Anksiyete', 'Depresyon', 'Travma', 'İlişki Sorunları', 'Aile Terapisi',
  'Çocuk ve Ergen', 'Stres Yönetimi', 'Yas', 'Bağımlılık', 'Yeme Bozukluğu',
  'OKB', 'Sosyal Kaygı', 'Öz Güven', 'Kariyer', 'Cinsel Sağlık',
]

type Step = 'form' | 'auth' | 'done'

export default function PsychologistApplyForm() {
  const [step, setStep] = useState<Step>('form')
  const [loading, setLoading] = useState(false)
  const [form, setForm] = useState({
    full_name: '',
    email: '',
    bio: '',
    price_per_session: '',
    gender: '',
    specialties: [] as string[],
  })

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
    if (!form.full_name || !form.bio || form.specialties.length === 0 || !form.price_per_session) return
    setStep('auth')
  }

  async function handleGoogleSignIn() {
    setLoading(true)
    // Form verisini sessionStorage'a kaydet — callback sonrası kullanılacak
    sessionStorage.setItem('psikolog_apply', JSON.stringify(form))

    const supabase = createClient()
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/auth/callback/psikolog`,
      },
    })
  }

  if (step === 'done') {
    return (
      <main className="min-h-screen bg-[#F5F5F7] flex items-center justify-center p-6">
        <div className="bg-white rounded-2xl border border-gray-100 p-10 max-w-md w-full text-center">
          <div className="w-16 h-16 bg-green-50 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#16A34A" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="20 6 9 17 4 12" />
            </svg>
          </div>
          <h1 className="text-xl font-bold text-gray-900 mb-2">Başvurunuz Alındı</h1>
          <p className="text-gray-500 text-sm">
            Ekibimiz başvurunuzu inceleyecek ve en kısa sürede size dönüş yapacak. Onaylandıktan sonra panele erişebilirsiniz.
          </p>
        </div>
      </main>
    )
  }

  if (step === 'auth') {
    return (
      <main className="min-h-screen bg-[#F5F5F7] flex items-center justify-center p-6">
        <div className="bg-white rounded-2xl border border-gray-100 p-10 max-w-sm w-full text-center">
          <div className="w-12 h-12 bg-violet-50 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#7C3AED" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2" /><circle cx="12" cy="7" r="4" />
            </svg>
          </div>
          <h2 className="text-lg font-bold text-gray-900 mb-1">Son adım</h2>
          <p className="text-sm text-gray-500 mb-6">
            Başvurunuzu tamamlamak için Google hesabınızla devam edin.
          </p>
          <button
            onClick={handleGoogleSignIn}
            disabled={loading}
            className="w-full flex items-center justify-center gap-3 border border-gray-200 rounded-xl px-4 py-3 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors disabled:opacity-50"
          >
            <svg width="18" height="18" viewBox="0 0 18 18">
              <path fill="#4285F4" d="M16.51 8H8.98v3h4.3c-.18 1-.74 1.48-1.6 2.04v2.01h2.6a7.8 7.8 0 002.38-5.88c0-.57-.05-.66-.15-1.18z"/>
              <path fill="#34A853" d="M8.98 17c2.16 0 3.97-.72 5.3-1.94l-2.6-2a4.8 4.8 0 01-7.18-2.54H1.83v2.07A8 8 0 008.98 17z"/>
              <path fill="#FBBC05" d="M4.5 10.52a4.8 4.8 0 010-3.04V5.41H1.83a8 8 0 000 7.18l2.67-2.07z"/>
              <path fill="#EA4335" d="M8.98 4.18c1.17 0 2.23.4 3.06 1.2l2.3-2.3A8 8 0 001.83 5.4L4.5 7.49a4.77 4.77 0 014.48-3.3z"/>
            </svg>
            {loading ? 'Yönlendiriliyor...' : 'Google ile devam et'}
          </button>
          <button onClick={() => setStep('form')} className="mt-4 text-xs text-gray-400 hover:text-gray-600">
            ← Geri dön
          </button>
        </div>
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-[#F5F5F7] py-12 px-6">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <a href="/" className="text-sm text-gray-400 hover:text-gray-600 mb-6 inline-block">← Ana Sayfa</a>
          <h1 className="text-3xl font-bold text-gray-900">Psikolog olarak katılın</h1>
          <p className="text-gray-500 mt-2">Başvurunuz admin onayından sonra aktif edilecektir.</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Ad Soyad */}
          <div className="bg-white rounded-2xl border border-gray-100 p-6">
            <label className="block text-sm font-semibold text-gray-700 mb-2">Ad Soyad *</label>
            <input
              type="text"
              value={form.full_name}
              onChange={e => setForm(f => ({ ...f, full_name: e.target.value }))}
              placeholder="Dr. Ad Soyad"
              className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent"
              required
            />
          </div>

          {/* Biyografi */}
          <div className="bg-white rounded-2xl border border-gray-100 p-6">
            <label className="block text-sm font-semibold text-gray-700 mb-2">Hakkınızda *</label>
            <textarea
              value={form.bio}
              onChange={e => setForm(f => ({ ...f, bio: e.target.value }))}
              placeholder="Deneyimlerinizi, yaklaşımınızı ve uzmanlık alanlarınızı kısaca anlatın..."
              rows={4}
              className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent resize-none"
              required
            />
          </div>

          {/* Cinsiyet ve Fiyat */}
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-white rounded-2xl border border-gray-100 p-6">
              <label className="block text-sm font-semibold text-gray-700 mb-2">Cinsiyet</label>
              <select
                value={form.gender}
                onChange={e => setForm(f => ({ ...f, gender: e.target.value }))}
                className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500 bg-white"
              >
                <option value="">Belirtmek istemiyorum</option>
                <option value="female">Kadın</option>
                <option value="male">Erkek</option>
              </select>
            </div>
            <div className="bg-white rounded-2xl border border-gray-100 p-6">
              <label className="block text-sm font-semibold text-gray-700 mb-2">Seans Ücreti (₺) *</label>
              <input
                type="number"
                value={form.price_per_session}
                onChange={e => setForm(f => ({ ...f, price_per_session: e.target.value }))}
                placeholder="800"
                min="0"
                className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500"
                required
              />
            </div>
          </div>

          {/* Uzmanlık alanları */}
          <div className="bg-white rounded-2xl border border-gray-100 p-6">
            <label className="block text-sm font-semibold text-gray-700 mb-1">Uzmanlık Alanları *</label>
            <p className="text-xs text-gray-400 mb-4">En az bir alan seçin</p>
            <div className="flex flex-wrap gap-2">
              {SPECIALTIES.map(s => (
                <button
                  key={s}
                  type="button"
                  onClick={() => toggleSpecialty(s)}
                  className={`text-sm px-3 py-1.5 rounded-full border transition-all ${
                    form.specialties.includes(s)
                      ? 'bg-violet-600 border-violet-600 text-white'
                      : 'border-gray-200 text-gray-600 hover:border-violet-300 hover:text-violet-600'
                  }`}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>

          <button
            type="submit"
            disabled={!form.full_name || !form.bio || form.specialties.length === 0 || !form.price_per_session}
            className="w-full bg-violet-600 text-white py-4 rounded-2xl font-medium text-sm hover:bg-violet-700 transition-colors disabled:opacity-40"
          >
            Devam Et
          </button>
        </form>
      </div>
    </main>
  )
}
