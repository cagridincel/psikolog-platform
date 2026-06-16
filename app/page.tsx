import { createClient } from '@/lib/supabase/server'

interface Profile {
  id: string
  full_name: string
  bio: string | null
  specialties: string[]
  price_per_session: number | null
}

export default async function HomePage() {
  const supabase = await createClient()

  const { data } = await supabase
    .from('profiles')
    .select('id, full_name, bio, specialties, price_per_session')
    .eq('is_approved', true)

  const psychologists = (data ?? []) as Profile[]

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
        <p className="text-gray-500 mb-10">
          Alaninda uzman, onaylilarla online seans alin.
        </p>

        {psychologists.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {psychologists.map((p) => (
              <div key={p.id} className="bg-white rounded-xl border p-6">
                <div className="w-12 h-12 bg-gray-100 rounded-full mb-4" />
                <h3 className="font-semibold text-gray-900">{p.full_name}</h3>
                <p className="text-sm text-gray-500 mt-1">{p.bio}</p>
                <div className="mt-4 flex items-center justify-between">
                  <span className="text-sm font-medium text-gray-900">
                    TL{p.price_per_session} / seans
                  </span>
                  <a href={'/client/book/' + p.id} className="text-sm bg-black text-white px-4 py-2 rounded-lg">Seans Al</a>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-20 text-gray-400">
            Henuz onaylilar burada gorunecek.
          </div>
        )}
      </section>
    </main>
  )
}