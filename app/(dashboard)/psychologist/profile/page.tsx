'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'

const C = { navy: '#1D3557', blue: '#1A6BB5', blueTint: '#EBF3FC', muted: '#8FA3BF', border: '#E4EAF2', bg: '#F2F5F9', danger: '#B91C1C', dangerTint: '#FDECEA', success: '#1A7A4A', successTint: '#E8F5EE' }

const SPECIALTIES = ['Anksiyete', 'Depresyon', 'Travma', 'İlişki Sorunları', 'Aile Terapisi', 'Çocuk ve Ergen', 'Stres Yönetimi', 'Yas', 'Bağımlılık', 'Yeme Bozukluğu', 'OKB', 'Sosyal Kaygı', 'Öz Güven', 'Kariyer', 'Cinsel Sağlık']
const APPROACHES = ['Bilişsel Davranışçı Terapi (BDT)', 'EMDR', 'Gestalt Terapi', 'Psikanalitik Terapi', 'Varoluşçu Terapi', 'Kabul ve Kararlılık Terapisi (ACT)', 'Şema Terapi', 'Aile Sistemleri Terapisi', 'Çözüm Odaklı Terapi', 'Mindfulness Tabanlı Terapi']
const LANGUAGES = ['Türkçe', 'İngilizce', 'Almanca', 'Fransızca', 'Arapça', 'Rusça']
const AGE_GROUPS = ['Çocuk (6-12)', 'Ergen (13-17)', 'Genç Yetişkin (18-25)', 'Yetişkin (26-64)', 'Yaşlı (65+)']
const SESSION_TYPES = ['Online', 'Yüz Yüze', 'Hibrit']

interface Education { school: string; department: string; year: string }
interface Certificate { name: string; institution: string; year: string; url?: string }
interface Profile {
  full_name: string; bio: string; price_per_session: string; gender: string
  specialties: string[]; experience_years: string; languages: string[]
  approaches: string[]; age_groups: string[]; session_duration: string
  session_types: string[]; education: Education[]; certificates: Certificate[]
  avatar_url: string | null
}

function TagSelector({ label, options, selected, onChange }: { label: string; options: string[]; selected: string[]; onChange: (v: string[]) => void }) {
  function toggle(o: string) {
    onChange(selected.includes(o) ? selected.filter(x => x !== o) : [...selected, o])
  }
  return (
    <div className="mb-5">
      <label className="block text-xs font-medium mb-2" style={{ color: C.muted, letterSpacing: '0.06em' }}>{label}</label>
      <div className="flex flex-wrap gap-2">
        {options.map(o => (
          <button key={o} type="button" onClick={() => toggle(o)}
            className="text-sm px-3 py-1.5 rounded-full border transition-all"
            style={selected.includes(o)
              ? { background: C.blue, borderColor: C.blue, color: '#fff' }
              : { background: 'transparent', borderColor: C.border, color: C.muted }}>
            {o}
          </button>
        ))}
      </div>
    </div>
  )
}

function Field({ label, value, onChange, type = 'text', placeholder, multiline }: { label: string; value: string; onChange: (v: string) => void; type?: string; placeholder?: string; multiline?: boolean }) {
  const style: React.CSSProperties = { width: '100%', border: `0.5px solid ${C.border}`, borderRadius: 8, padding: '9px 12px', fontSize: 13, color: C.navy, background: '#FAFBFD', outline: 'none', fontFamily: 'inherit', resize: multiline ? 'vertical' : undefined }
  return (
    <div className="mb-4">
      <label className="block text-xs font-medium mb-1.5" style={{ color: C.muted, letterSpacing: '0.06em' }}>{label}</label>
      {multiline
        ? <textarea value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder} rows={4} style={style} />
        : <input type={type} value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder} style={style} />}
    </div>
  )
}

export default function PsychologistProfilePage() {
  const router = useRouter()
  const avatarInputRef = useRef<HTMLInputElement>(null)
  const certInputRef = useRef<HTMLInputElement>(null)
  const [profile, setProfile] = useState<Profile>({
    full_name: '', bio: '', price_per_session: '', gender: '',
    specialties: [], experience_years: '', languages: [],
    approaches: [], age_groups: [], session_duration: '50',
    session_types: [], education: [], certificates: [], avatar_url: null,
  })
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [uploadingAvatar, setUploadingAvatar] = useState(false)
  const [uploadingCert, setUploadingCert] = useState(false)
  const [saved, setSaved] = useState(false)
  const [activeTab, setActiveTab] = useState<'basic' | 'professional' | 'education'>('basic')

  useEffect(() => {
    fetch('/api/psychologist/profile')
      .then(r => r.json())
      .then(data => {
        if (data) setProfile({
          full_name: data.full_name ?? '',
          bio: data.bio ?? '',
          price_per_session: data.price_per_session?.toString() ?? '',
          gender: data.gender ?? '',
          specialties: data.specialties ?? [],
          experience_years: data.experience_years?.toString() ?? '',
          languages: data.languages ?? [],
          approaches: data.approaches ?? [],
          age_groups: data.age_groups ?? [],
          session_duration: data.session_duration?.toString() ?? '50',
          session_types: data.session_types ?? [],
          education: data.education ?? [],
          certificates: data.certificates ?? [],
          avatar_url: data.avatar_url ?? null,
        })
        setLoading(false)
      })
  }, [])

  async function handleSave() {
    setSaving(true)
    const res = await fetch('/api/psychologist/profile', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(profile),
    })
    if (res.ok) { setSaved(true); setTimeout(() => setSaved(false), 2500) }
    setSaving(false)
  }

  async function handleAvatarUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setUploadingAvatar(true)
    const fd = new FormData()
    fd.append('file', file)
    fd.append('type', 'avatar')
    const res = await fetch('/api/psychologist/upload', { method: 'POST', body: fd })
    const data = await res.json()
    if (data.url) setProfile(p => ({ ...p, avatar_url: data.url }))
    setUploadingAvatar(false)
  }

  async function handleCertUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setUploadingCert(true)
    const fd = new FormData()
    fd.append('file', file)
    fd.append('type', 'certificate')
    const res = await fetch('/api/psychologist/upload', { method: 'POST', body: fd })
    const data = await res.json()
    if (data.url) {
      const newCert: Certificate = { name: file.name.split('.')[0], institution: '', year: new Date().getFullYear().toString(), url: data.url }
      setProfile(p => ({ ...p, certificates: [...p.certificates, newCert] }))
    }
    setUploadingCert(false)
  }

  function addEducation() {
    setProfile(p => ({ ...p, education: [...p.education, { school: '', department: '', year: '' }] }))
  }

  function updateEducation(i: number, field: keyof Education, value: string) {
    setProfile(p => ({ ...p, education: p.education.map((e, idx) => idx === i ? { ...e, [field]: value } : e) }))
  }

  function removeEducation(i: number) {
    setProfile(p => ({ ...p, education: p.education.filter((_, idx) => idx !== i) }))
  }

  function updateCertificate(i: number, field: keyof Certificate, value: string) {
    setProfile(p => ({ ...p, certificates: p.certificates.map((c, idx) => idx === i ? { ...c, [field]: value } : c) }))
  }

  function removeCertificate(i: number) {
    setProfile(p => ({ ...p, certificates: p.certificates.filter((_, idx) => idx !== i) }))
  }

  if (loading) return (
    <main className="min-h-screen flex items-center justify-center" style={{ background: C.bg }}>
      <div className="w-8 h-8 border-2 border-t-transparent rounded-full animate-spin" style={{ borderColor: C.blue, borderTopColor: 'transparent' }} />
    </main>
  )

  const tabs = [
    { id: 'basic', label: 'Temel Bilgiler' },
    { id: 'professional', label: 'Uzmanlık' },
    { id: 'education', label: 'Eğitim & Belgeler' },
  ] as const

  return (
    <main className="min-h-screen" style={{ background: C.bg }}>
      {/* Header */}
      <header className="bg-white border-b px-8 py-4 flex items-center justify-between sticky top-0 z-10" style={{ borderColor: C.border }}>
        <div className="flex items-center gap-4">
          <button onClick={() => router.push('/psychologist')} className="text-sm" style={{ color: C.muted }}>← Panele Dön</button>
          <h1 className="text-base font-medium" style={{ color: C.navy }}>Profilim</h1>
        </div>
        <button onClick={handleSave} disabled={saving}
          className="text-sm font-medium px-5 py-2.5 rounded-xl text-white disabled:opacity-50 hover:opacity-90 transition-opacity"
          style={{ background: saved ? C.success : C.blue }}>
          {saved ? '✓ Kaydedildi' : saving ? 'Kaydediliyor...' : 'Kaydet'}
        </button>
      </header>

      <div className="max-w-3xl mx-auto px-6 py-8">
        {/* Avatar */}
        <div className="bg-white rounded-2xl border p-6 mb-6 flex items-center gap-6" style={{ borderColor: C.border }}>
          <div className="relative">
            <div className="w-20 h-20 rounded-full overflow-hidden flex items-center justify-center text-2xl font-medium flex-shrink-0"
              style={{ background: C.blueTint, color: C.blue }}>
              {profile.avatar_url
                ? <img src={profile.avatar_url} className="w-20 h-20 object-cover" alt="" />
                : profile.full_name?.[0] ?? '?'}
            </div>
            <button onClick={() => avatarInputRef.current?.click()}
              className="absolute bottom-0 right-0 w-7 h-7 rounded-full flex items-center justify-center text-white"
              style={{ background: C.blue }}>
              {uploadingAvatar ? '...' : (
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/>
                  <polyline points="17 8 12 3 7 8"/>
                  <line x1="12" y1="3" x2="12" y2="15"/>
                </svg>
              )}
            </button>
          </div>
          <div>
            <p className="text-sm font-medium mb-0.5" style={{ color: C.navy }}>{profile.full_name || 'Adınız'}</p>
            <p className="text-xs mb-2" style={{ color: C.muted }}>JPG veya PNG, max 5MB</p>
            <button onClick={() => avatarInputRef.current?.click()} className="text-xs font-medium" style={{ color: C.blue }}>
              Fotoğraf Değiştir
            </button>
          </div>
          <input ref={avatarInputRef} type="file" accept="image/*" className="hidden" onChange={handleAvatarUpload} />
        </div>

        {/* Sekmeler */}
        <div className="flex gap-1 bg-white border rounded-xl p-1 mb-6 w-fit" style={{ borderColor: C.border }}>
          {tabs.map(t => (
            <button key={t.id} onClick={() => setActiveTab(t.id)}
              className="text-sm px-4 py-2 rounded-lg transition-all"
              style={activeTab === t.id ? { background: C.blueTint, color: C.blue, fontWeight: 500 } : { color: C.muted }}>
              {t.label}
            </button>
          ))}
        </div>

        {/* Temel Bilgiler */}
        {activeTab === 'basic' && (
          <div className="bg-white rounded-2xl border p-6" style={{ borderColor: C.border }}>
            <Field label="AD SOYAD" value={profile.full_name} onChange={v => setProfile(p => ({ ...p, full_name: v }))} placeholder="Dr. Ad Soyad" />
            <Field label="HAKKINDA" value={profile.bio} onChange={v => setProfile(p => ({ ...p, bio: v }))} placeholder="Kendinizi tanıtın..." multiline />
            <div className="grid grid-cols-2 gap-4">
              <Field label="SEANS ÜCRETİ (₺)" type="number" value={profile.price_per_session} onChange={v => setProfile(p => ({ ...p, price_per_session: v }))} placeholder="1500" />
              <div className="mb-4">
                <label className="block text-xs font-medium mb-1.5" style={{ color: C.muted, letterSpacing: '0.06em' }}>CİNSİYET</label>
                <select value={profile.gender} onChange={e => setProfile(p => ({ ...p, gender: e.target.value }))}
                  className="w-full rounded-lg px-3 py-2.5 text-sm outline-none"
                  style={{ border: `0.5px solid ${C.border}`, color: C.navy, background: '#FAFBFD' }}>
                  <option value="">Belirtmek istemiyorum</option>
                  <option value="female">Kadın</option>
                  <option value="male">Erkek</option>
                </select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <Field label="DENEYİM YILI" type="number" value={profile.experience_years} onChange={v => setProfile(p => ({ ...p, experience_years: v }))} placeholder="5" />
              <div className="mb-4">
                <label className="block text-xs font-medium mb-1.5" style={{ color: C.muted, letterSpacing: '0.06em' }}>SEANS SÜRESİ (DK)</label>
                <select value={profile.session_duration} onChange={e => setProfile(p => ({ ...p, session_duration: e.target.value }))}
                  className="w-full rounded-lg px-3 py-2.5 text-sm outline-none"
                  style={{ border: `0.5px solid ${C.border}`, color: C.navy, background: '#FAFBFD' }}>
                  <option value="50">50 dakika</option>
                  <option value="60">60 dakika</option>
                  <option value="90">90 dakika</option>
                </select>
              </div>
            </div>
            <TagSelector label="SEANS TİPİ" options={SESSION_TYPES} selected={profile.session_types} onChange={v => setProfile(p => ({ ...p, session_types: v }))} />
            <TagSelector label="DİL" options={LANGUAGES} selected={profile.languages} onChange={v => setProfile(p => ({ ...p, languages: v }))} />
          </div>
        )}

        {/* Uzmanlık */}
        {activeTab === 'professional' && (
          <div className="bg-white rounded-2xl border p-6" style={{ borderColor: C.border }}>
            <TagSelector label="UZMANLIK ALANLARI" options={SPECIALTIES} selected={profile.specialties} onChange={v => setProfile(p => ({ ...p, specialties: v }))} />
            <TagSelector label="TERAPÖTİK YAKLAŞIMLAR" options={APPROACHES} selected={profile.approaches} onChange={v => setProfile(p => ({ ...p, approaches: v }))} />
            <TagSelector label="YAŞ GRUPLARI" options={AGE_GROUPS} selected={profile.age_groups} onChange={v => setProfile(p => ({ ...p, age_groups: v }))} />
          </div>
        )}

        {/* Eğitim & Belgeler */}
        {activeTab === 'education' && (
          <div className="space-y-4">
            {/* Eğitim */}
            <div className="bg-white rounded-2xl border p-6" style={{ borderColor: C.border }}>
              <div className="flex items-center justify-between mb-4">
                <p className="text-xs font-medium" style={{ color: C.muted, letterSpacing: '0.06em' }}>EĞİTİM BİLGİLERİ</p>
                <button onClick={addEducation} className="text-xs font-medium" style={{ color: C.blue }}>+ Ekle</button>
              </div>
              {profile.education.length === 0 ? (
                <p className="text-sm text-center py-4" style={{ color: C.muted }}>Henüz eğitim bilgisi eklenmedi.</p>
              ) : (
                <div className="space-y-4">
                  {profile.education.map((edu, i) => (
                    <div key={i} className="rounded-xl border p-4" style={{ borderColor: C.border }}>
                      <div className="grid grid-cols-2 gap-3 mb-3">
                        <div>
                          <label className="block text-xs font-medium mb-1" style={{ color: C.muted }}>ÜNİVERSİTE</label>
                          <input value={edu.school} onChange={e => updateEducation(i, 'school', e.target.value)}
                            placeholder="Üniversite adı"
                            className="w-full rounded-lg px-3 py-2 text-sm outline-none"
                            style={{ border: `0.5px solid ${C.border}`, color: C.navy, background: '#FAFBFD' }} />
                        </div>
                        <div>
                          <label className="block text-xs font-medium mb-1" style={{ color: C.muted }}>BÖLÜM</label>
                          <input value={edu.department} onChange={e => updateEducation(i, 'department', e.target.value)}
                            placeholder="Psikoloji"
                            className="w-full rounded-lg px-3 py-2 text-sm outline-none"
                            style={{ border: `0.5px solid ${C.border}`, color: C.navy, background: '#FAFBFD' }} />
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="flex-1">
                          <label className="block text-xs font-medium mb-1" style={{ color: C.muted }}>MEZUNIYET YILI</label>
                          <input value={edu.year} onChange={e => updateEducation(i, 'year', e.target.value)}
                            placeholder="2020" type="number"
                            className="w-full rounded-lg px-3 py-2 text-sm outline-none"
                            style={{ border: `0.5px solid ${C.border}`, color: C.navy, background: '#FAFBFD' }} />
                        </div>
                        <button onClick={() => removeEducation(i)} className="mt-5 text-xs px-3 py-2 rounded-lg" style={{ background: C.dangerTint, color: C.danger }}>Sil</button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Sertifikalar */}
            <div className="bg-white rounded-2xl border p-6" style={{ borderColor: C.border }}>
              <div className="flex items-center justify-between mb-4">
                <p className="text-xs font-medium" style={{ color: C.muted, letterSpacing: '0.06em' }}>SERTİFİKALAR & BELGELER</p>
                <button onClick={() => certInputRef.current?.click()}
                  className="text-xs font-medium px-3 py-1.5 rounded-lg text-white"
                  style={{ background: C.blue }}>
                  {uploadingCert ? 'Yükleniyor...' : '+ Belge Yükle'}
                </button>
              </div>
              <input ref={certInputRef} type="file" accept=".pdf,image/*" className="hidden" onChange={handleCertUpload} />
              {profile.certificates.length === 0 ? (
                <p className="text-sm text-center py-4" style={{ color: C.muted }}>Henüz belge eklenmedi.</p>
              ) : (
                <div className="space-y-3">
                  {profile.certificates.map((cert, i) => (
                    <div key={i} className="rounded-xl border p-4" style={{ borderColor: C.border }}>
                      <div className="grid grid-cols-2 gap-3 mb-3">
                        <div>
                          <label className="block text-xs font-medium mb-1" style={{ color: C.muted }}>SERTİFİKA ADI</label>
                          <input value={cert.name} onChange={e => updateCertificate(i, 'name', e.target.value)}
                            placeholder="Sertifika adı"
                            className="w-full rounded-lg px-3 py-2 text-sm outline-none"
                            style={{ border: `0.5px solid ${C.border}`, color: C.navy, background: '#FAFBFD' }} />
                        </div>
                        <div>
                          <label className="block text-xs font-medium mb-1" style={{ color: C.muted }}>VERİLEN KURUM</label>
                          <input value={cert.institution} onChange={e => updateCertificate(i, 'institution', e.target.value)}
                            placeholder="Kurum adı"
                            className="w-full rounded-lg px-3 py-2 text-sm outline-none"
                            style={{ border: `0.5px solid ${C.border}`, color: C.navy, background: '#FAFBFD' }} />
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="flex-1">
                          <label className="block text-xs font-medium mb-1" style={{ color: C.muted }}>YIL</label>
                          <input value={cert.year} onChange={e => updateCertificate(i, 'year', e.target.value)}
                            placeholder="2023" type="number"
                            className="w-full rounded-lg px-3 py-2 text-sm outline-none"
                            style={{ border: `0.5px solid ${C.border}`, color: C.navy, background: '#FAFBFD' }} />
                        </div>
                        {cert.url && (
                          <a href={cert.url} target="_blank" rel="noopener noreferrer"
                            className="mt-5 text-xs px-3 py-2 rounded-lg" style={{ background: C.blueTint, color: C.blue }}>
                            Görüntüle
                          </a>
                        )}
                        <button onClick={() => removeCertificate(i)} className="mt-5 text-xs px-3 py-2 rounded-lg" style={{ background: C.dangerTint, color: C.danger }}>Sil</button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </main>
  )
}
