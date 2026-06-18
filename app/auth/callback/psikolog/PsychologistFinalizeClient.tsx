'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

export default function PsychologistFinalizeClient() {
  const router = useRouter()

  useEffect(() => {
    async function finalize() {
      const raw = sessionStorage.getItem('psikolog_apply')
      if (!raw) {
        router.replace('/psychologist')
        return
      }

      try {
        const formData = JSON.parse(raw)
        await fetch('/api/psychologist/finalize', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(formData),
        })
        sessionStorage.removeItem('psikolog_apply')
      } catch {
        // sessizce geç — profil sonradan düzenlenebilir
      }

      router.replace('/psychologist')
    }

    finalize()
  }, [router])

  return (
    <main className="min-h-screen bg-[#F5F5F7] flex items-center justify-center">
      <div className="text-center">
        <div className="w-10 h-10 border-2 border-violet-600 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
        <p className="text-sm text-gray-500">Profiliniz oluşturuluyor...</p>
      </div>
    </main>
  )
}
