'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

const C = { navy: '#1D3557', blue: '#1A6BB5', blueTint: '#EBF3FC', muted: '#8FA3BF', border: '#E4EAF2', bg: '#F2F5F9', success: '#1A7A4A', successTint: '#E8F5EE', warning: '#92600A', warningTint: '#FEF3E2' }

interface Package {
  id: string
  name: string
  session_count: number
  discount_percent: number
  is_popular: boolean
}

interface Profile {
  id: string
  full_name: string
  avatar_url: string | null
  price_per_session: number | null
  specialties: string[]
}

interface Slot {
  id: string
  start_time: string
  end_time: string
}

interface Props {
  profile: Profile
  slot: Slot
  packages: Package[]
  userId: string
}

function formatDateTime(dateStr: string) {
  return new Date(dateStr).toLocaleString('tr-TR', {
    weekday: 'long', day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit',
  })
}

export default function CheckoutPage({ profile, slot, packages }: Props) {
  const [selectedPackage, setSelectedPackage] = useState<Package | null>(
    packages.find(p => p.is_popular) ?? packages[0] ?? null
  )
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  const basePrice = profile.price_per_session ?? 0

  const defaultPackage: Package = { id: 'default', name: '1 Seans', session_count: 1, discount_percent: 0, is_popular: false }
  const effectivePackage = selectedPackage ?? defaultPackage

  function calculatePrices(pkg: Package) {
    const originalTotal = basePrice * pkg.session_count
    const discountAmount = Math.round(originalTotal * (pkg.discount_percent / 100))
    const finalTotal = originalTotal - discountAmount
    const pricePerSession = pkg.session_count > 1 ? Math.round(finalTotal / pkg.session_count) : finalTotal
    return { originalTotal, discountAmount, finalTotal, pricePerSession }
  }

  async function handlePayment() {
    setLoading(true)
    const { finalTotal } = calculatePrices(effectivePackage)

    const res = await fetch('/api/payments/initiate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        psychologistId: profile.id,
        slotId: slot.id,
        packageId: effectivePackage.id,
        amount: finalTotal || basePrice || 0,
        sessionCount: effectivePackage.session_count || 1,
      }),
    })

    const data = await res.json()

    if (data.testMode && data.success) {
      router.push('/client')
      return
    }

    if (data.checkoutFormContent) {
      const div = document.createElement('div')
      div.innerHTML = data.checkoutFormContent
      document.body.appendChild(div)
      const form = div.querySelector('form')
      if (form) form.submit()
    } else if (data.error) {
      alert('Ödeme başlatılamadı: ' + data.error)
      setLoading(false)
    }
  }

  const { originalTotal, discountAmount, finalTotal } = calculatePrices(effectivePackage)

  return (
    <main className="min-h-screen" style={{ background: C.bg }}>
      {/* Test modu banner */}
      <div className="text-xs font-medium text-center py-2 px-4" style={{ background: C.warningTint, color: C.warning }}>
        🧪 Test Modu — Gerçek ödeme alınmıyor. İyzico entegrasyonu aktif olduğunda bu banner kaldırılacak.
      </div>

      {/* Header */}
      <header className="bg-white border-b px-8 py-4" style={{ borderColor: C.border }}>
        <div className="max-w-3xl mx-auto flex items-center gap-6">
          <button onClick={() => router.back()} className="text-sm" style={{ color: C.muted }}>← Geri</button>
          <div className="flex items-center gap-3">
            {[{ n: 1, label: 'Paket Seçimi', active: true }, { n: 2, label: 'Ödeme', active: false }, { n: 3, label: 'Onay', active: false }].map(({ n, label, active }, i) => (
              <div key={n} className="flex items-center gap-2">
                {i > 0 && <div className="w-8 h-px" style={{ background: C.border }} />}
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-medium"
                    style={{ background: active ? C.navy : C.bg, color: active ? '#fff' : C.muted }}>
                    {n}
                  </div>
                  <span className="text-sm" style={{ color: active ? C.navy : C.muted, fontWeight: active ? 500 : 400 }}>{label}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </header>

      <div className="max-w-3xl mx-auto px-6 py-8">

        {/* Seans özeti */}
        <div className="bg-white rounded-2xl border p-5 mb-6 flex items-center gap-4" style={{ borderColor: C.border }}>
          <div className="w-12 h-12 rounded-full flex items-center justify-center text-sm font-medium flex-shrink-0 overflow-hidden"
            style={{ background: C.blueTint, color: C.blue }}>
            {profile.avatar_url
              ? <img src={profile.avatar_url} className="w-12 h-12 object-cover" alt="" />
              : profile.full_name[0]}
          </div>
          <div>
            <p className="text-sm font-medium" style={{ color: C.navy }}>{profile.full_name}</p>
            <p className="text-xs mt-0.5" style={{ color: C.muted }}>{formatDateTime(slot.start_time)}</p>
          </div>
          <div className="ml-auto text-right">
            <p className="text-xs" style={{ color: C.muted }}>Seans ücreti</p>
            <p className="text-sm font-medium" style={{ color: C.navy }}>₺{basePrice}</p>
          </div>
        </div>

        {/* Paket kartları */}
        {packages.length > 0 && (
          <>
            <p className="text-xs font-medium mb-3" style={{ color: C.muted, letterSpacing: '0.06em' }}>PAKET SEÇİN</p>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
              {packages.map(pkg => {
                const { discountAmount, finalTotal, pricePerSession } = calculatePrices(pkg)
                const isSelected = selectedPackage?.id === pkg.id
                return (
                  <button key={pkg.id} onClick={() => setSelectedPackage(pkg)}
                    className="relative rounded-xl border-2 p-4 text-center transition-all"
                    style={{ borderColor: isSelected ? C.blue : C.border, background: isSelected ? C.blueTint : '#fff' }}>
                    {pkg.is_popular && (
                      <div className="absolute -top-2.5 left-1/2 -translate-x-1/2 text-white text-xs font-medium px-2.5 py-0.5 rounded-full"
                        style={{ background: C.blue }}>Popüler</div>
                    )}
                    <p className="text-xs font-medium mb-2" style={{ color: C.muted }}>{pkg.name}</p>
                    {pkg.discount_percent > 0 && (
                      <p className="text-xs line-through" style={{ color: C.muted }}>₺{basePrice}</p>
                    )}
                    <p className="text-xl font-medium" style={{ color: C.navy }}>₺{pricePerSession}</p>
                    <p className="text-xs mt-0.5" style={{ color: C.muted }}>/ seans</p>
                    {pkg.discount_percent > 0 && (
                      <p className="text-xs mt-2 font-medium" style={{ color: C.success }}>₺{discountAmount} indirim</p>
                    )}
                  </button>
                )
              })}
            </div>
          </>
        )}

        {/* Ödeme özeti */}
        <div className="bg-white rounded-2xl border p-6" style={{ borderColor: C.border }}>
          <p className="text-xs font-medium mb-4" style={{ color: C.muted, letterSpacing: '0.06em' }}>ÖDEME ÖZETİ</p>

          <div className="space-y-3 mb-5">
            <div className="flex items-center justify-between">
              <span className="text-sm" style={{ color: C.muted }}>
                {effectivePackage.session_count > 1 ? `${effectivePackage.session_count} seans` : '1 seans'} × ₺{basePrice}
              </span>
              <span className="text-sm" style={{ color: C.navy }}>₺{originalTotal || basePrice}</span>
            </div>
            {discountAmount > 0 && (
              <div className="flex items-center justify-between">
                <span className="text-sm" style={{ color: C.success }}>İndirim (%{effectivePackage.discount_percent})</span>
                <span className="text-sm" style={{ color: C.success }}>-₺{discountAmount}</span>
              </div>
            )}
            <div className="flex items-center justify-between pt-3 border-t" style={{ borderColor: C.bg }}>
              <span className="text-sm font-medium" style={{ color: C.navy }}>Toplam</span>
              <span className="text-xl font-medium" style={{ color: C.navy }}>₺{finalTotal || basePrice}</span>
            </div>
          </div>

          <button onClick={handlePayment} disabled={loading}
            className="w-full py-3.5 rounded-xl text-white text-sm font-medium disabled:opacity-50 hover:opacity-90 transition-opacity"
            style={{ background: C.blue }}>
            {loading ? 'İşleniyor...' : `₺${finalTotal || basePrice} Öde`}
          </button>

          <p className="text-xs text-center mt-3" style={{ color: C.muted }}>
            Ödemeniz güvenli şekilde işlenir
          </p>
        </div>
      </div>
    </main>
  )
}
