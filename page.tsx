'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import AssessmentWizard from '@/components/assessment/AssessmentWizard'

const C = {
  navy: '#1D3557', blue: '#1A6BB5', blueTint: '#EBF3FC',
  muted: '#8FA3BF', border: '#E4EAF2', bg: '#F2F5F9', surface: '#FFFFFF',
  success: '#1A7A4A', successTint: '#E8F5EE',
}

interface Profile {
  id: string
  full_name: string
  bio: string | null
  specialties: string[]
  price_per_session: number | null
  experience_years: number | null
  session_types: string[] | null
}

const TESTIMONIALS = [
  { name: 'Ayşe K.', text: 'Doğru psikologu bulmak çok kolay oldu. Eşleştirme sistemi gerçekten işe yarıyor. İlk seanstan sonra büyük bir rahatlama hissettim.', role: 'Öğretmen', initial: 'A' },
  { name: 'Mert D.', text: 'Terapiye başlamayı uzun süre erteliyordum. Menta sayesinde evden çıkmadan destek alabildim. Artık her hafta düzenli görüşüyorum.', role: 'Yazılım Geliştirici', initial: 'M' },
  { name: 'Selin Y.', text: 'Psikologumla çok iyi bir uyum yakaladık. Gizlilik konusunda da hiç endişem olmadı. Herkese tavsiye ederim.', role: 'Pazarlama Uzmanı', initial: 'S' },
  { name: 'Burak A.', text: 'İş stresi yüzünden çok zorlanıyordum. Psikologum sayesinde başa çıkma yöntemlerimi öğrendim. Hayatım gerçekten değişti.', role: 'Yönetici', initial: 'B' },
  { name: 'Ceren T.', text: 'Online seans formatı benim için mükemmeldi. İstediğim saatten görüşme yapabilmek büyük kolaylık sağladı.', role: 'Hemşire', initial: 'C' },
]

const FAQ = [
  { q: 'Psikolog nasıl seçilir?', a: 'Soru ağacımız aracılığıyla ihtiyaçlarınıza ve beklentilerinize göre size en uygun psikologları öneriyoruz. İsterseniz tüm uzmanları listeleyerek kendiniz de seçim yapabilirsiniz.' },
  { q: 'Seanslar güvenli mi?', a: 'Tüm görüşmeler end-to-end şifreleme ile korunmaktadır. Görüşmeleriniz kayıt altına alınmaz ve hiçbir üçüncü tarafla paylaşılmaz.' },
  { q: 'Ödeme nasıl yapılır?', a: 'Kredi kartı, banka kartı ile güvenli ödeme yapabilirsiniz. Seans paketleri satın alarak avantajlı fiyatlardan yararlanabilirsiniz.' },
  { q: 'Psikologumu değiştirebilir miyim?', a: 'Evet, istediğiniz zaman farklı bir psikologla çalışmaya başlayabilirsiniz. Kalan seans haklarınız yeni psikologunuzla kullanılabilir.' },
  { q: 'Online seans nasıl gerçekleşiyor?', a: 'Randevu saatinde platforma giriş yaparak video görüşmenize katılabilirsiniz. Ekstra bir uygulama indirmenize gerek yok, tarayıcınız üzerinden çalışır.' },
]

function useCountUp(target: number, duration = 1500) {
  const [count, setCount] = useState(0)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) {
        let start = 0
        const step = target / (duration / 16)
        const timer = setInterval(() => {
          start += step
          if (start >= target) { setCount(target); clearInterval(timer) }
          else setCount(Math.floor(start))
        }, 16)
        observer.disconnect()
      }
    }, { threshold: 0.3 })
    if (ref.current) observer.observe(ref.current)
    return () => observer.disconnect()
  }, [target, duration])

  return { count, ref }
}

function StatCard({ value, suffix, label, color }: { value: number; suffix: string; label: string; color: string }) {
  const { count, ref } = useCountUp(value)
  return (
    <div ref={ref} className="text-center">
      <p className="text-3xl md:text-4xl font-bold mb-1" style={{ color }}>
        {count}{suffix}
      </p>
      <p className="text-sm" style={{ color: C.muted }}>{label}</p>
    </div>
  )
}

export default function HomePage() {
  const [psychologists, setPsychologists] = useState<Profile[]>([])
  const [showWizard, setShowWizard] = useState(false)
  const [user, setUser] = useState<{ id: string; role?: string } | null>(null)
  const [openFaq, setOpenFaq] = useState<number | null>(null)
  const [testimonialIdx, setTestimonialIdx] = useState(0)
  const router = useRouter()

  useEffect(() => {
    fetch('/api/psychologists').then(r => r.json()).then(d => setPsychologists(d ?? []))
    fetch('/api/me').then(r => r.json()).then(d => setUser(d?.user ?? null)).catch(() => setUser(null))
  }, [])

  useEffect(() => {
    const t = setInterval(() => setTestimonialIdx(i => (i + 1) % TESTIMONIALS.length), 4000)
    return () => clearInterval(t)
  }, [])

  function handleBooking(psychologistId: string) {
    if (user) router.push(`/client/book/${psychologistId}`)
    else router.push(`/auth/login?next=/client/book/${psychologistId}`)
  }

  return (
    <main className="min-h-screen" style={{ background: C.bg }}>

      {/* ─── HEADER ─── */}
      <header className="bg-white border-b px-4 md:px-8 py-4 flex items-center justify-between sticky top-0 z-40" style={{ borderColor: C.border }}>
        <div>
          <span className="text-base font-bold" style={{ color: C.navy, letterSpacing: '-0.01em' }}>Menta</span>
          <span style={{ color: C.blue }}>.</span>
        </div>
        <nav className="hidden md:flex items-center gap-6">
          <a href="#how" className="text-sm transition-colors hover:opacity-70" style={{ color: C.muted }}>Nasıl Çalışır</a>
          <a href="#list" className="text-sm transition-colors hover:opacity-70" style={{ color: C.muted }}>Uzmanlar</a>
          <a href="#faq" className="text-sm transition-colors hover:opacity-70" style={{ color: C.muted }}>SSS</a>
          <a href="/psikolog-ol" className="text-sm transition-colors hover:opacity-70" style={{ color: C.muted }}>Psikolog olarak katılın</a>
        </nav>
        <div className="flex items-center gap-2 md:gap-3">
          {user ? (
            <a href={user.role === 'psychologist' ? '/psychologist' : '/client'}
              className="text-sm font-medium px-3 md:px-4 py-2 rounded-lg text-white transition-opacity hover:opacity-90"
              style={{ background: C.blue }}>
              Hesabım
            </a>
          ) : (
            <>
              <a href="/auth/login" className="text-sm font-medium hidden md:block" style={{ color: C.navy }}>Giriş Yap</a>
              <a href="/auth/kaydol"
                className="text-sm font-medium px-3 md:px-4 py-2 rounded-lg text-white"
                style={{ background: C.blue }}>
                Kayıt Ol
              </a>
            </>
          )}
        </div>
      </header>

      {/* ─── HERO ─── */}
      <section className="max-w-5xl mx-auto px-4 md:px-8 pt-12 md:pt-20 pb-12 md:pb-16">
        <span className="inline-block text-xs font-medium px-3 py-1 rounded-full mb-4" style={{ background: C.blueTint, color: C.blue, letterSpacing: '0.08em' }}>
          UZMAN PSİKOLOGLAR · ONLINE SEANS
        </span>
        <h1 className="text-3xl md:text-5xl font-bold mb-4 md:mb-6" style={{ color: C.navy, letterSpacing: '-0.02em', lineHeight: 1.15 }}>
          Zihinsel sağlığınız için<br className="hidden md:block" /> en iyi uzmanlara erişin
        </h1>
        <p className="text-base md:text-lg mb-8" style={{ color: C.muted, maxWidth: 520, lineHeight: 1.6 }}>
          Titizlikle seçilmiş psikologlarla güvenli, gizli ve profesyonel online terapi.
          İlk adımı atmak için buradayız.
        </p>
        <div className="flex flex-col sm:flex-row gap-3">
          <button onClick={() => setShowWizard(true)}
            className="text-sm font-medium px-6 py-3.5 rounded-xl text-white transition-opacity hover:opacity-90"
            style={{ background: C.blue }}>
            Size uygun psikologu bulalım
          </button>
          <a href="#list"
            className="text-sm font-medium px-6 py-3.5 rounded-xl border text-center"
            style={{ borderColor: C.border, color: C.navy, background: C.surface }}>
            Tüm uzmanlar
          </a>
        </div>

        {/* Mini güven satırı */}
        <div className="flex flex-wrap items-center gap-4 mt-8">
          {[
            { icon: '🔒', text: 'Gizli & güvenli' },
            { icon: '⭐', text: 'Seçilmiş uzmanlar' },
            { icon: '📱', text: 'Her cihazdan erişim' },
          ].map(item => (
            <div key={item.text} className="flex items-center gap-1.5">
              <span>{item.icon}</span>
              <span className="text-xs" style={{ color: C.muted }}>{item.text}</span>
            </div>
          ))}
        </div>
      </section>

      {/* ─── NASIL ÇALIŞIR ─── */}
      <section id="how" className="py-16 md:py-20" style={{ background: C.surface }}>
        <div className="max-w-5xl mx-auto px-4 md:px-8">
          <div className="text-center mb-10 md:mb-14">
            <span className="text-xs font-medium" style={{ color: C.blue, letterSpacing: '0.1em' }}>SÜRECİ KEŞFET</span>
            <h2 className="text-2xl md:text-3xl font-bold mt-2" style={{ color: C.navy, letterSpacing: '-0.01em' }}>Nasıl Çalışır?</h2>
            <p className="text-sm mt-2" style={{ color: C.muted }}>Üç basit adımda psikolojik destek almaya başlayın</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 md:gap-8">
            {[
              {
                step: '01',
                icon: '🎯',
                title: 'Uzmanınızla Eşleşin',
                desc: 'Kısa sorularımızı yanıtlayın. İhtiyaçlarınıza ve beklentilerinize göre size en uygun psikologları önceyelim.',
              },
              {
                step: '02',
                icon: '📅',
                title: 'Randevunuzu Alın',
                desc: 'Size uygun psikologun takviminden istediğiniz saati seçin ve seans paketinizi satın alın.',
              },
              {
                step: '03',
                icon: '💬',
                title: 'Seansınıza Başlayın',
                desc: 'Randevu saatinde platforma giriş yapın. Güvenli video görüşmeniz başlasın, herhangi bir uygulama gerekmez.',
              },
            ].map((item, i) => (
              <div key={i} className="relative rounded-2xl p-6 md:p-8" style={{ background: C.bg }}>
                <div className="text-4xl mb-4">{item.icon}</div>
                <span className="text-xs font-bold" style={{ color: C.blue, letterSpacing: '0.1em' }}>{item.step}</span>
                <h3 className="text-base font-bold mt-1 mb-2" style={{ color: C.navy }}>{item.title}</h3>
                <p className="text-sm leading-relaxed" style={{ color: C.muted }}>{item.desc}</p>
                {i < 2 && (
                  <div className="hidden md:block absolute -right-4 top-1/2 -translate-y-1/2 z-10 text-xl" style={{ color: C.border }}>→</div>
                )}
              </div>
            ))}
          </div>

          <div className="text-center mt-10">
            <button onClick={() => setShowWizard(true)}
              className="text-sm font-medium px-6 py-3 rounded-xl text-white transition-opacity hover:opacity-90"
              style={{ background: C.blue }}>
              Hemen Başla
            </button>
          </div>
        </div>
      </section>

      {/* ─── NEDEN MENTA ─── */}
      <section className="py-16 md:py-20" style={{ background: C.bg }}>
        <div className="max-w-5xl mx-auto px-4 md:px-8">
          <div className="text-center mb-10 md:mb-14">
            <span className="text-xs font-medium" style={{ color: C.blue, letterSpacing: '0.1em' }}>NEDEN MENTA?</span>
            <h2 className="text-2xl md:text-3xl font-bold mt-2" style={{ color: C.navy, letterSpacing: '-0.01em' }}>Farkımız</h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              { icon: '🎓', title: 'Uzman Psikologlar', desc: 'Tüm psikologlarımız yüksek lisans mezunu ve alanında deneyimli.' },
              { icon: '🔒', title: 'Tam Gizlilik', desc: 'Görüşmeleriniz şifrelidir. Hiçbir üçüncü tarafla paylaşılmaz.' },
              { icon: '📱', title: 'Her Yerden Erişim', desc: 'Telefon, tablet veya bilgisayardan kolayca bağlanın.' },
              { icon: '💡', title: 'Akıllı Eşleştirme', desc: 'İhtiyaçlarınıza göre en uygun psikolog önerilir.' },
            ].map((item, i) => (
              <div key={i} className="bg-white rounded-2xl border p-6" style={{ borderColor: C.border }}>
                <div className="text-3xl mb-3">{item.icon}</div>
                <h3 className="text-sm font-bold mb-1.5" style={{ color: C.navy }}>{item.title}</h3>
                <p className="text-xs leading-relaxed" style={{ color: C.muted }}>{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── İSTATİSTİKLER ─── */}
      <section className="py-14 md:py-20" style={{ background: C.navy }}>
        <div className="max-w-5xl mx-auto px-4 md:px-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            <StatCard value={20} suffix="+" label="Uzman Psikolog" color="#EBF3FC" />
            <StatCard value={10} suffix="+" label="Uzmanlık Alanı" color="#EBF3FC" />
            <StatCard value={98} suffix="%" label="Memnuniyet Oranı" color="#EBF3FC" />
            <StatCard value={500} suffix="+" label="Tamamlanan Seans" color="#EBF3FC" />
          </div>
        </div>
      </section>

      {/* ─── PSİKOLOG LİSTESİ ─── */}
      <section id="list" className="py-16 md:py-20" style={{ background: C.surface }}>
        <div className="max-w-5xl mx-auto px-4 md:px-8">
          <div className="flex items-end justify-between mb-8">
            <div>
              <span className="text-xs font-medium block mb-1" style={{ color: C.blue, letterSpacing: '0.1em' }}>UZMAN EKİBİMİZ</span>
              <h2 className="text-2xl md:text-3xl font-bold" style={{ color: C.navy, letterSpacing: '-0.01em' }}>Psikologlarımız</h2>
            </div>
            <span className="text-xs px-2.5 py-1 rounded-full" style={{ background: C.bg, color: C.muted }}>
              {psychologists.length} uzman
            </span>
          </div>

          {psychologists.length === 0 ? (
            <div className="text-center py-20">
              <div className="w-8 h-8 border-2 border-t-transparent rounded-full animate-spin mx-auto mb-3" style={{ borderColor: C.blue, borderTopColor: 'transparent' }} />
              <p className="text-sm" style={{ color: C.muted }}>Uzmanlar yükleniyor...</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {psychologists.map(p => (
                <div key={p.id} className="rounded-2xl border p-5 flex flex-col hover:shadow-sm transition-shadow" style={{ background: C.surface, borderColor: C.border }}>
                  <div className="flex items-start gap-3 mb-3">
                    <div className="w-12 h-12 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0"
                      style={{ background: C.blueTint, color: C.blue }}>
                      {p.full_name[0]}
                    </div>
                    <div className="min-w-0">
                      <h3 className="text-sm font-bold truncate" style={{ color: C.navy }}>{p.full_name}</h3>
                      {p.experience_years && (
                        <p className="text-xs mt-0.5" style={{ color: C.muted }}>{p.experience_years} yıl deneyim</p>
                      )}
                      {p.session_types && (
                        <div className="flex gap-1 mt-1">
                          {p.session_types.map(t => (
                            <span key={t} className="text-[10px] px-1.5 py-0.5 rounded" style={{ background: C.bg, color: C.muted }}>
                              {t === 'Online' ? '💻' : '🏢'} {t}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>

                  <p className="text-xs mb-3 line-clamp-2 flex-1" style={{ color: C.muted, lineHeight: 1.6 }}>{p.bio}</p>

                  <div className="flex flex-wrap gap-1 mb-4">
                    {p.specialties?.slice(0, 3).map(s => (
                      <span key={s} className="text-[10px] px-2 py-0.5 rounded-full" style={{ background: C.blueTint, color: C.blue }}>{s}</span>
                    ))}
                    {(p.specialties?.length ?? 0) > 3 && (
                      <span className="text-[10px] px-2 py-0.5 rounded-full" style={{ background: C.bg, color: C.muted }}>
                        +{p.specialties.length - 3}
                      </span>
                    )}
                  </div>

                  <div className="flex items-center justify-between pt-3 border-t" style={{ borderColor: C.bg }}>
                    <span className="text-sm font-bold" style={{ color: C.navy }}>
                      {p.price_per_session ? `₺${p.price_per_session}` : '—'}
                      <span className="text-xs font-normal ml-1" style={{ color: C.muted }}>/ seans</span>
                    </span>
                    <button onClick={() => handleBooking(p.id)}
                      className="text-xs font-medium px-3.5 py-1.5 rounded-lg text-white hover:opacity-90 transition-opacity"
                      style={{ background: C.blue }}>
                      Seans Al
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* ─── YORUMLAR ─── */}
      <section className="py-16 md:py-20" style={{ background: C.bg }}>
        <div className="max-w-5xl mx-auto px-4 md:px-8">
          <div className="text-center mb-10">
            <span className="text-xs font-medium" style={{ color: C.blue, letterSpacing: '0.1em' }}>KULLANICI DENEYİMLERİ</span>
            <h2 className="text-2xl md:text-3xl font-bold mt-2" style={{ color: C.navy, letterSpacing: '-0.01em' }}>Danışanlarımız Ne Düşünüyor?</h2>
          </div>

          {/* Mobil: Carousel. Desktop: 3 kart */}
          <div className="hidden md:grid grid-cols-3 gap-4">
            {TESTIMONIALS.slice(0, 3).map((t, i) => (
              <div key={i} className="bg-white rounded-2xl border p-6" style={{ borderColor: C.border }}>
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0"
                    style={{ background: C.blueTint, color: C.blue }}>
                    {t.initial}
                  </div>
                  <div>
                    <p className="text-sm font-bold" style={{ color: C.navy }}>{t.name}</p>
                    <p className="text-xs" style={{ color: C.muted }}>{t.role}</p>
                  </div>
                </div>
                <p className="text-xs leading-relaxed" style={{ color: C.muted }}>"{t.text}"</p>
                <div className="flex gap-0.5 mt-3">
                  {[...Array(5)].map((_, i) => <span key={i} className="text-yellow-400 text-xs">★</span>)}
                </div>
              </div>
            ))}
          </div>

          {/* Mobil carousel */}
          <div className="md:hidden">
            <div className="bg-white rounded-2xl border p-6 transition-all" style={{ borderColor: C.border }}>
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold"
                  style={{ background: C.blueTint, color: C.blue }}>
                  {TESTIMONIALS[testimonialIdx].initial}
                </div>
                <div>
                  <p className="text-sm font-bold" style={{ color: C.navy }}>{TESTIMONIALS[testimonialIdx].name}</p>
                  <p className="text-xs" style={{ color: C.muted }}>{TESTIMONIALS[testimonialIdx].role}</p>
                </div>
              </div>
              <p className="text-sm leading-relaxed" style={{ color: C.muted }}>"{TESTIMONIALS[testimonialIdx].text}"</p>
              <div className="flex gap-0.5 mt-3">
                {[...Array(5)].map((_, i) => <span key={i} className="text-yellow-400 text-sm">★</span>)}
              </div>
            </div>
            {/* Nokta göstergesi */}
            <div className="flex justify-center gap-2 mt-4">
              {TESTIMONIALS.map((_, i) => (
                <button key={i} onClick={() => setTestimonialIdx(i)}
                  className="w-2 h-2 rounded-full transition-all"
                  style={{ background: i === testimonialIdx ? C.blue : C.border }} />
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ─── SSS ─── */}
      <section id="faq" className="py-16 md:py-20" style={{ background: C.surface }}>
        <div className="max-w-2xl mx-auto px-4 md:px-8">
          <div className="text-center mb-10">
            <span className="text-xs font-medium" style={{ color: C.blue, letterSpacing: '0.1em' }}>MERAK EDİLENLER</span>
            <h2 className="text-2xl md:text-3xl font-bold mt-2" style={{ color: C.navy, letterSpacing: '-0.01em' }}>Sıkça Sorulan Sorular</h2>
          </div>

          <div className="space-y-3">
            {FAQ.map((item, i) => (
              <div key={i} className="rounded-2xl border overflow-hidden" style={{ borderColor: C.border }}>
                <button
                  onClick={() => setOpenFaq(openFaq === i ? null : i)}
                  className="w-full flex items-center justify-between px-5 py-4 text-left"
                  style={{ background: openFaq === i ? C.blueTint : C.surface }}>
                  <span className="text-sm font-medium" style={{ color: C.navy }}>{item.q}</span>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={C.muted} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
                    style={{ transform: openFaq === i ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.2s', flexShrink: 0 }}>
                    <polyline points="6 9 12 15 18 9"/>
                  </svg>
                </button>
                {openFaq === i && (
                  <div className="px-5 pb-4" style={{ background: C.surface }}>
                    <p className="text-sm leading-relaxed" style={{ color: C.muted }}>{item.a}</p>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── CTA ─── */}
      <section className="py-16 md:py-20" style={{ background: C.navy }}>
        <div className="max-w-2xl mx-auto px-4 md:px-8 text-center">
          <h2 className="text-2xl md:text-3xl font-bold mb-3" style={{ color: '#fff', letterSpacing: '-0.01em' }}>
            Daha iyi hissetmeye bugün başlayın
          </h2>
          <p className="text-sm mb-8" style={{ color: C.muted, lineHeight: 1.6 }}>
            İlk adımı atmak en zor olanı. Biz buradayız.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <button onClick={() => setShowWizard(true)}
              className="text-sm font-medium px-6 py-3.5 rounded-xl text-white border border-white border-opacity-30 hover:bg-white hover:bg-opacity-10 transition-all">
              Size uygun psikologu bulalım
            </button>
            <a href="/auth/kaydol"
              className="text-sm font-medium px-6 py-3.5 rounded-xl"
              style={{ background: C.blue, color: '#fff' }}>
              Ücretsiz Kayıt Ol
            </a>
          </div>
        </div>
      </section>

      {/* ─── FOOTER ─── */}
      <footer style={{ background: '#111827' }}>
        <div className="max-w-5xl mx-auto px-4 md:px-8 py-12">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mb-10">
            <div className="col-span-2 md:col-span-1">
              <div className="mb-3">
                <span className="text-lg font-bold text-white">Menta</span>
                <span style={{ color: C.blue }}>.</span>
              </div>
              <p className="text-xs leading-relaxed" style={{ color: '#6B7280' }}>
                Zihinsel sağlığınız için güvenilir online psikoloji platformu.
              </p>
            </div>
            <div>
              <p className="text-xs font-bold text-white mb-3 uppercase tracking-wider">Platform</p>
              <div className="space-y-2">
                {[
                  { label: 'Nasıl Çalışır', href: '#how' },
                  { label: 'Psikologlar', href: '#list' },
                  { label: 'SSS', href: '#faq' },
                ].map(l => (
                  <a key={l.label} href={l.href} className="block text-xs transition-colors hover:text-white" style={{ color: '#6B7280' }}>{l.label}</a>
                ))}
              </div>
            </div>
            <div>
              <p className="text-xs font-bold text-white mb-3 uppercase tracking-wider">Katılın</p>
              <div className="space-y-2">
                {[
                  { label: 'Kayıt Ol', href: '/auth/kaydol' },
                  { label: 'Giriş Yap', href: '/auth/login' },
                  { label: 'Psikolog Başvurusu', href: '/psikolog-ol' },
                ].map(l => (
                  <a key={l.label} href={l.href} className="block text-xs transition-colors hover:text-white" style={{ color: '#6B7280' }}>{l.label}</a>
                ))}
              </div>
            </div>
            <div>
              <p className="text-xs font-bold text-white mb-3 uppercase tracking-wider">Hukuki</p>
              <div className="space-y-2">
                {[
                  { label: 'Gizlilik Politikası', href: '#' },
                  { label: 'Kullanım Koşulları', href: '#' },
                  { label: 'KVKK', href: '#' },
                ].map(l => (
                  <a key={l.label} href={l.href} className="block text-xs transition-colors hover:text-white" style={{ color: '#6B7280' }}>{l.label}</a>
                ))}
              </div>
            </div>
          </div>
          <div className="border-t pt-6 flex flex-col md:flex-row items-center justify-between gap-3" style={{ borderColor: '#1F2937' }}>
            <p className="text-xs" style={{ color: '#6B7280' }}>© 2026 Menta. Tüm hakları saklıdır.</p>
            <p className="text-xs" style={{ color: '#6B7280' }}>Türkiye'de üretildi 🇹🇷</p>
          </div>
        </div>
      </footer>

      {showWizard && <AssessmentWizard onClose={() => setShowWizard(false)} onBook={handleBooking} />}
    </main>
  )
}
