'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

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
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export default function CheckoutPage({ profile, slot, packages, userId }: Props) {
  const [selectedPackage, setSelectedPackage] = useState<Package | null>(
    packages.find((p) => p.is_popular) ?? packages[0] ?? null
  )
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  const basePrice = profile.price_per_session ?? 0

  // packages tablosu boşsa varsayılan tek seanslık paket
  const defaultPackage: Package = {
    id: 'default',
    name: '1 Seans',
    session_count: 1,
    discount_percent: 0,
    is_popular: false,
  }
  const effectivePackage = selectedPackage ?? defaultPackage

  function calculatePrices(pkg: Package) {
    const originalTotal = basePrice * pkg.session_count
    const discountAmount = Math.round(originalTotal * (pkg.discount_percent / 100))
    const finalTotal = originalTotal - discountAmount
    const pricePerSession = Math.round(finalTotal / pkg.session_count)
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

  return (
    <main className="min-h-screen bg-gray-50">
      {/* Test modu banner */}
      <div className="bg-amber-400 text-amber-900 text-xs font-medium text-center py-2 px-4">
        🧪 Test Modu — Gerçek ödeme alınmıyor. İyzico entegrasyonu aktif olduğunda bu banner kaldırılacak.
      </div>

      <header className="bg-white border-b px-6 py-4">
        <div className="max-w-4xl mx-auto flex items-center gap-4">
          <button onClick={() => router.back()} className="text-sm text-gray-500 hover:text-gray-700">
            ← Geri
          </button>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-full bg-black flex items-center justify-center">
                <span className="text-white text-xs">1</span>
              </div>
              <span className="text-sm font-medium text-gray-900">Paket Seçimi</span>
            </div>
            <div className="w-8 h-px bg-gray-200" />
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-full bg-gray-200 flex items-center justify-center">
                <span className="text-gray-400 text-xs">2</span>
              </div>
              <span className="text-sm text-gray-400">Ödeme</span>
            </div>
            <div className="w-8 h-px bg-gray-200" />
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-full bg-gray-200 flex items-center justify-center">
                <span className="text-gray-400 text-xs">3</span>
              </div>
              <span className="text-sm text-gray-400">Onay</span>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-4xl mx-auto px-6 py-8">
        {/* Seans özeti */}
        <div className="bg-white rounded-2xl border p-5 mb-8 flex items-center gap-4">
          <div className="w-12 h-12 bg-gray-100 rounded-full flex-shrink-0" />
          <div>
            <p className="font-semibold text-gray-900">{profile.full_name}</p>
            <p className="text-sm text-gray-500 mt-0.5">{formatDateTime(slot.start_time)}</p>
          </div>
        </div>

        {/* Paket kartları — packages tablosunda veri varsa göster */}
        {packages.length > 0 && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
            {packages.map((pkg) => {
              const { originalTotal, discountAmount, finalTotal, pricePerSession } = calculatePrices(pkg)
              const isSelected = selectedPackage?.id === pkg.id

              return (
                <button
                  key={pkg.id}
                  onClick={() => setSelectedPackage(pkg)}
                  className={`relative rounded-2xl border-2 p-5 text-center transition-all ${
                    isSelected
                      ? 'border-[#1A6BB5] bg-[#EBF3FC]'
                      : 'border-gray-100 bg-white hover:border-gray-200'
                  }`}
                >
                  {pkg.is_popular && (
                    <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-[#1A6BB5] text-white text-xs font-medium px-3 py-1 rounded-full">
                      POPÜLER
                    </div>
                  )}
                  <p className="font-semibold text-gray-900 mb-3">{pkg.name}</p>
                  <p className="text-xs text-gray-400 mb-1">Seans başına</p>
                  {pkg.discount_percent > 0 && (
                    <p className="text-xs text-gray-400 line-through mb-0.5">₺{basePrice}</p>
                  )}
                  <p className="text-2xl font-bold text-[#1A6BB5] mb-4">₺{pricePerSession}</p>
                  <div className="space-y-1.5 text-left">
                    <p className="text-xs text-gray-500 flex items-center gap-1.5"><span>🎥</span> 50 dk görüntülü görüşme</p>
                    <p className="text-xs text-gray-500 flex items-center gap-1.5"><span>📅</span> 24 saat öncesi iptal</p>
                  </div>
                  {pkg.discount_percent > 0 && (
                    <div className="mt-4 border-t pt-3">
                      <p className="text-xs font-medium text-[#1A6BB5]">₺{discountAmount} indirimli ödeyin</p>
                    </div>
                  )}
                </button>
              )
            })}
          </div>
        )}

        {/* Ödeme özeti ve buton */}
        <div className="bg-white rounded-2xl border p-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-gray-500">1 Seans</span>
            <span className="text-sm text-gray-500">₺{calculatePrices(effectivePackage).originalTotal || basePrice}</span>
          </div>
          {effectivePackage.discount_percent > 0 && (
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-green-600">İndirim (%{effectivePackage.discount_percent})</span>
              <span className="text-sm text-green-600">-₺{calculatePrices(effectivePackage).discountAmount}</span>
            </div>
          )}
          <div className="flex items-center justify-between border-t pt-3 mb-6">
            <span className="font-semibold text-gray-900">Toplam</span>
            <span className="text-xl font-bold text-gray-900">
              ₺{calculatePrices(effectivePackage).finalTotal || basePrice}
            </span>
          </div>

          <button
            onClick={handlePayment}
            disabled={loading}
            className="w-full bg-[#1A6BB5] text-white py-4 rounded-xl font-medium disabled:opacity-40 transition-opacity hover:opacity-90"
          >
            {loading ? 'İşleniyor...' : `₺${calculatePrices(effectivePackage).finalTotal || basePrice} Öde`}
          </button>
        </div>
      </div>
    </main>
  )
}
