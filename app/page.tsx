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
  const [user, setUser] = useState<{ id: string } | null>(null)
  const router = useRouter()

  useEffect(() => {
    fetch('/api/psychologists')
      .then((r) => r.json())
      .then((data) => setPsychologists(data ?? []))

    fetch('/api/me')
      .then((r) => r.json())
      .then((data) => setUser(data?.user ?? null))
      .catch(() => setUser(null))
  }, [])

  function handleBooking(psychologistId: string) {
    if (user) {
      router.push(`/client/book/${psychologistId}`)
    } else {
      router.push(`/auth/login?next=/client/book/${psychologistId}`)
    }
  }

  return (
    <main className="min-h-screen bg-gray-50">
      <header className="bg-white border-b px-6 py-4 flex items-center justify-between">
        <h1 className="text-xl font-semibold text-gray-900">Psikolog Platform</h1>
        <a href="/auth/login" className="text-sm bg-black text-white px-4 py-2 rounded-lg">
          Giris Yap
        </a>
      </header>

      <section className="max-w-5xl mx-auto px-6 py-12">
        <h2 className="text-3xl font-bold text-gray-900 mb-2">
          Uzman psikologlarla tanisin
        </h2>
        <p className="text-gray-500 mb-6">
          Alaninda uzman, onaylilarla online seans alin.
        </p>

        <div className="flex gap-3 mb-10">
          <button
            onClick={() => setShowWizard(true)}
            className="bg-black text-white px-5 py-2.5 rounded-xl text-sm font-medium"
          >
            Size uygun psikologu bulalim
          </button>
          <a href="#list" className="border px-5 py-2.5 rounded-xl text-sm font-medium text-gray-700">
            Tum psikologlar
          </a>
        </div>

        <div id="list" className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {psychologists.length > 0 ? psychologists.map((p) => (
            <div key={p.id} className="bg-white rounded-xl border p-6">
              <div className="w-12 h-12 bg-gray-100 rounded-full mb-4" />
              <h3 className="font-semibold text-gray-900">{p.full_name}</h3>
              <p className="text-sm text-gray-500 mt-1 line-clamp-2">{p.bio}</p>
              <div className="flex flex-wrap gap-1 mt-3">
                {p.specialties?.map((s) => (
                  <span key={s} className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded-full">
                    {s}
                  </span>
                ))}
              </div>
              <div className="mt-4 flex items-center justify-between">
                <span className="text-sm font-medium text-gray-900">
                  TL{p.price_per_session} / seans
                </span>
                <button
                  onClick={() => handleBooking(p.id)}
                  className="text-sm bg-black text-white px-4 py-2 rounded-lg"
                >
                  Seans Al
                </button>
              </div>
            </div>
          )) : (
            <div className="col-span-3 text-center py-20 text-gray-400">
              Henuz onaylilar burada gorunecek.
            </div>
          )}
        </div>
      </section>

      {showWizard && <AssessmentWizard onClose={() => setShowWizard(false)} onBook={handleBooking} />}
    </main>
  )
}