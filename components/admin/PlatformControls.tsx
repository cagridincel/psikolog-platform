'use client'

import { useState, useEffect } from 'react'

const C = { navy: '#1D3557', blue: '#1A6BB5', blueTint: '#EBF3FC', muted: '#8FA3BF', border: '#E4EAF2', bg: '#F2F5F9', success: '#1A7A4A', successTint: '#E8F5EE', warning: '#92600A', warningTint: '#FEF3E2' }

interface Setting {
  key: string
  value: boolean
  description: string
  updated_at: string
}

const SETTING_LABELS: Record<string, { label: string; detail: string }> = {
  single_psychologist_restriction: {
    label: 'Tek Psikolog Kısıtlaması',
    detail: 'Aktif paketi olan danışanların farklı bir psikolog seçmesini engeller. Paketleri tükenen danışanlar yeni psikolog seçebilir.',
  },
}

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString('tr-TR', {
    day: 'numeric', month: 'long', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  })
}

export default function PlatformControls() {
  const [settings, setSettings] = useState<Setting[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState<string | null>(null)
  const [savedKey, setSavedKey] = useState<string | null>(null)

  useEffect(() => {
    fetch('/api/admin/settings')
      .then(r => r.json())
      .then(data => { setSettings(data ?? []); setLoading(false) })
  }, [])

  async function toggle(key: string, current: boolean) {
    setSaving(key)
    const res = await fetch('/api/admin/settings', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ key, value: !current }),
    })
    if (res.ok) {
      setSettings(prev => prev.map(s => s.key === key ? { ...s, value: !current, updated_at: new Date().toISOString() } : s))
      setSavedKey(key)
      setTimeout(() => setSavedKey(null), 2000)
    }
    setSaving(null)
  }

  if (loading) return (
    <div className="flex items-center justify-center py-20">
      <div className="w-6 h-6 border-2 border-t-transparent rounded-full animate-spin" style={{ borderColor: C.blue, borderTopColor: 'transparent' }} />
    </div>
  )

  return (
    <div className="space-y-3 max-w-2xl">
      {settings.length === 0 ? (
        <div className="bg-white rounded-2xl border p-12 text-center" style={{ borderColor: C.border }}>
          <p className="text-sm" style={{ color: C.muted }}>Henüz kontrol tanımlanmadı.</p>
        </div>
      ) : settings.map(setting => {
        const meta = SETTING_LABELS[setting.key]
        const isSaving = saving === setting.key
        const isSaved = savedKey === setting.key

        return (
          <div key={setting.key} className="bg-white rounded-2xl border p-5" style={{ borderColor: C.border }}>
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <p className="text-sm font-medium" style={{ color: C.navy }}>
                    {meta?.label ?? setting.key}
                  </p>
                  <span className="text-xs px-2 py-0.5 rounded-full font-medium"
                    style={{
                      background: setting.value ? C.successTint : C.bg,
                      color: setting.value ? C.success : C.muted,
                    }}>
                    {setting.value ? 'Aktif' : 'Pasif'}
                  </span>
                </div>
                <p className="text-sm leading-relaxed" style={{ color: C.muted }}>
                  {meta?.detail ?? setting.description}
                </p>
                <p className="text-xs mt-2" style={{ color: C.muted }}>
                  Son güncelleme: {formatDate(setting.updated_at)}
                </p>
              </div>

              {/* Toggle */}
              <button
                onClick={() => toggle(setting.key, setting.value)}
                disabled={isSaving}
                className="flex-shrink-0 relative transition-opacity disabled:opacity-60"
                style={{ cursor: isSaving ? 'wait' : 'pointer', background: 'none', border: 'none' }}>
                <div className="w-12 h-6 rounded-full transition-all duration-200"
                  style={{ background: setting.value ? C.blue : '#D1D5DB' }}>
                  <div className="absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-all duration-200"
                    style={{ left: setting.value ? 26 : 2 }} />
                </div>
                {isSaved && (
                  <span className="absolute -bottom-5 left-1/2 -translate-x-1/2 text-xs whitespace-nowrap"
                    style={{ color: C.success }}>
                    ✓ Kaydedildi
                  </span>
                )}
              </button>
            </div>

            {/* Uyarı — aktif kısıtlama */}
            {setting.key === 'single_psychologist_restriction' && setting.value && (
              <div className="mt-4 flex items-start gap-2 px-3 py-2.5 rounded-xl" style={{ background: C.warningTint }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={C.warning} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="flex-shrink-0 mt-0.5">
                  <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/>
                  <line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>
                </svg>
                <p className="text-xs" style={{ color: C.warning }}>
                  Bu kısıtlama aktifken danışanlar yalnızca mevcut psikologllarıyla devam edebilir. Yeni danışanlar istedikleri psikologu seçebilir.
                </p>
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}
