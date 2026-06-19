'use client'

import { useState, useEffect, useCallback } from 'react'

const C = { navy: '#1D3557', blue: '#1A6BB5', blueTint: '#EBF3FC', muted: '#8FA3BF', border: '#E4EAF2', danger: '#B91C1C', dangerTint: '#FDECEA', success: '#1A7A4A', successTint: '#E8F5EE', warning: '#92600A', warningTint: '#FEF3E2', bg: '#F2F5F9' }

const ALL_SPECIALTIES = [
  'Anksiyete', 'Depresyon', 'Travma', 'İlişki Sorunları', 'Aile Terapisi',
  'Çocuk ve Ergen', 'Stres Yönetimi', 'Yas', 'Bağımlılık', 'Yeme Bozukluğu',
  'OKB', 'Sosyal Kaygı', 'Öz Güven', 'Kariyer', 'Cinsel Sağlık',
]

interface Specialty { specialty: string; weight: number }
interface Option {
  id: string
  text: string
  emoji: string | null
  next_question_id: string | null
  order_index: number
  option_specialties: Specialty[]
}
interface Question {
  id: string
  text: string
  description: string | null
  type: 'single' | 'multi'
  is_first: boolean
  is_active: boolean
  order_index: number
  question_options: Option[]
}

function Field({ label, value, onChange, placeholder, multiline }: { label: string; value: string; onChange: (v: string) => void; placeholder?: string; multiline?: boolean }) {
  const style: React.CSSProperties = { width: '100%', border: `0.5px solid ${C.border}`, borderRadius: 8, padding: '8px 12px', fontSize: 13, color: C.navy, background: '#FAFBFD', outline: 'none', fontFamily: 'inherit', resize: multiline ? 'vertical' : undefined }
  return (
    <div style={{ marginBottom: 14 }}>
      <div style={{ fontSize: 11, fontWeight: 500, color: C.muted, letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: 6 }}>{label}</div>
      {multiline
        ? <textarea value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder} rows={2} style={style} />
        : <input value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder} style={style} />}
    </div>
  )
}

function SpecialtyEditor({ specialties, onChange }: { specialties: Specialty[]; onChange: (s: Specialty[]) => void }) {
  const [showPicker, setShowPicker] = useState(false)

  function addSpecialty(s: string) {
    if (specialties.find(x => x.specialty === s)) return
    onChange([...specialties, { specialty: s, weight: 1 }])
    setShowPicker(false)
  }

  function removeSpecialty(s: string) {
    onChange(specialties.filter(x => x.specialty !== s))
  }

  function updateWeight(s: string, w: number) {
    onChange(specialties.map(x => x.specialty === s ? { ...x, weight: w } : x))
  }

  return (
    <div>
      <div style={{ fontSize: 10, color: C.muted, marginBottom: 4 }}>UZMANLIK PUANLARI</div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginBottom: 4 }}>
        {specialties.map(s => (
          <div key={s.specialty} style={{ display: 'flex', alignItems: 'center', gap: 4, background: C.blueTint, borderRadius: 20, padding: '2px 8px 2px 8px', fontSize: 11 }}>
            <span style={{ color: C.blue }}>{s.specialty}</span>
            <input
              type="number" min={1} max={10} value={s.weight}
              onChange={e => updateWeight(s.specialty, Number(e.target.value))}
              style={{ width: 28, border: 'none', background: 'transparent', fontSize: 11, color: C.blue, textAlign: 'center', outline: 'none' }}
            />
            <button onClick={() => removeSpecialty(s.specialty)} style={{ color: C.muted, background: 'none', border: 'none', cursor: 'pointer', fontSize: 12, lineHeight: 1 }}>×</button>
          </div>
        ))}
        <button onClick={() => setShowPicker(p => !p)}
          style={{ fontSize: 11, padding: '2px 8px', borderRadius: 20, border: `0.5px dashed ${C.border}`, color: C.muted, background: 'none', cursor: 'pointer' }}>
          + Ekle
        </button>
      </div>
      {showPicker && (
        <div style={{ border: `0.5px solid ${C.border}`, borderRadius: 8, background: '#fff', padding: 8, display: 'flex', flexWrap: 'wrap', gap: 4, maxHeight: 120, overflowY: 'auto' }}>
          {ALL_SPECIALTIES.filter(s => !specialties.find(x => x.specialty === s)).map(s => (
            <button key={s} onClick={() => addSpecialty(s)}
              style={{ fontSize: 11, padding: '3px 8px', borderRadius: 20, border: `0.5px solid ${C.border}`, color: C.navy, background: 'none', cursor: 'pointer' }}>
              {s}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

function OptionCard({ option, questions, questionId, onSave, onDelete }: {
  option: Option; questions: Question[]; questionId: string
  onSave: (o: Option) => void; onDelete: (id: string) => void
}) {
  const [data, setData] = useState<Option>({ ...option, option_specialties: option.option_specialties ?? [] })
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)

  async function save() {
    setSaving(true)
    const res = await fetch(`/api/admin/questions/${questionId}/options/${option.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...data, specialties: data.option_specialties }),
    })
    if (res.ok) onSave(data)
    setSaving(false)
  }

  async function del() {
    setDeleting(true)
    await fetch(`/api/admin/questions/${questionId}/options/${option.id}`, { method: 'DELETE' })
    onDelete(option.id)
  }

  const otherQuestions = questions.filter(q => q.id !== questionId)

  return (
    <div style={{ border: `0.5px solid ${C.border}`, borderRadius: 10, padding: 14, marginBottom: 8, background: '#fff' }}>
      <div style={{ display: 'grid', gridTemplateColumns: '40px 1fr auto', gap: 8, alignItems: 'center', marginBottom: 10 }}>
        <input value={data.emoji ?? ''} onChange={e => setData(d => ({ ...d, emoji: e.target.value }))}
          placeholder="😊" style={{ textAlign: 'center', fontSize: 18, border: `0.5px solid ${C.border}`, borderRadius: 8, padding: '4px 0', outline: 'none', background: '#FAFBFD' }} />
        <input value={data.text} onChange={e => setData(d => ({ ...d, text: e.target.value }))}
          style={{ border: `0.5px solid ${C.border}`, borderRadius: 8, padding: '7px 10px', fontSize: 13, color: C.navy, outline: 'none', background: '#FAFBFD' }} />
        <div style={{ display: 'flex', gap: 6 }}>
          <button onClick={save} disabled={saving}
            style={{ fontSize: 11, padding: '5px 10px', borderRadius: 7, background: C.blue, color: '#fff', border: 'none', cursor: 'pointer', opacity: saving ? 0.6 : 1 }}>
            {saving ? '...' : 'Kaydet'}
          </button>
          <button onClick={del} disabled={deleting}
            style={{ fontSize: 11, padding: '5px 10px', borderRadius: 7, background: C.dangerTint, color: C.danger, border: `0.5px solid ${C.danger}`, cursor: 'pointer', opacity: deleting ? 0.6 : 1 }}>
            {deleting ? '...' : 'Sil'}
          </button>
        </div>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
        <div>
          <div style={{ fontSize: 10, color: C.muted, marginBottom: 4 }}>SONRAKI SORU</div>
          <select value={data.next_question_id ?? ''}
            onChange={e => setData(d => ({ ...d, next_question_id: e.target.value || null }))}
            style={{ width: '100%', border: `0.5px solid ${C.border}`, borderRadius: 7, padding: '6px 8px', fontSize: 12, color: C.navy, background: '#FAFBFD', outline: 'none' }}>
            <option value="">Eşleştirmeye git (son)</option>
            {otherQuestions.map(q => (
              <option key={q.id} value={q.id}>{q.text.slice(0, 40)}{q.text.length > 40 ? '...' : ''}</option>
            ))}
          </select>
        </div>
        <SpecialtyEditor
          specialties={data.option_specialties}
          onChange={s => setData(d => ({ ...d, option_specialties: s }))}
        />
      </div>
    </div>
  )
}

export default function QuestionTreeEditor() {
  const [questions, setQuestions] = useState<Question[]>([])
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [editData, setEditData] = useState<Question | null>(null)
  const [newOptionText, setNewOptionText] = useState('')
  const [addingOption, setAddingOption] = useState(false)

  const fetchQuestions = useCallback(async () => {
    setLoading(true)
    const res = await fetch('/api/admin/questions')
    const data = await res.json()
    setQuestions(data ?? [])
    setLoading(false)
  }, [])

  useEffect(() => { fetchQuestions() }, [fetchQuestions])

  useEffect(() => {
    if (selectedId) {
      const q = questions.find(q => q.id === selectedId)
      if (q) setEditData({ ...q, question_options: q.question_options ?? [] })
    }
  }, [selectedId, questions])

  async function addQuestion() {
    const res = await fetch('/api/admin/questions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text: 'Yeni soru', type: 'single', order_index: questions.length + 1 }),
    })
    const data = await res.json()
    await fetchQuestions()
    setSelectedId(data.id)
  }

  async function saveQuestion() {
    if (!editData) return
    setSaving(true)
    await fetch(`/api/admin/questions/${editData.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(editData),
    })
    await fetchQuestions()
    setSaving(false)
  }

  async function deleteQuestion() {
    if (!editData || !confirm('Bu soruyu silmek istediğinize emin misiniz?')) return
    await fetch(`/api/admin/questions/${editData.id}`, { method: 'DELETE' })
    setSelectedId(null)
    setEditData(null)
    await fetchQuestions()
  }

  async function addOption() {
    if (!editData || !newOptionText.trim()) return
    setAddingOption(true)
    await fetch(`/api/admin/questions/${editData.id}/options`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text: newOptionText.trim(), order_index: (editData.question_options?.length ?? 0) + 1 }),
    })
    setNewOptionText('')
    await fetchQuestions()
    setAddingOption(false)
  }

  function handleOptionSave(updatedOpt: Option) {
    if (!editData) return
    setQuestions(qs => qs.map(q => q.id === editData.id ? {
      ...q,
      question_options: q.question_options.map(o => o.id === updatedOpt.id ? updatedOpt : o)
    } : q))
  }

  function handleOptionDelete(optId: string) {
    if (!editData) return
    setQuestions(qs => qs.map(q => q.id === editData.id ? {
      ...q,
      question_options: q.question_options.filter(o => o.id !== optId)
    } : q))
  }

  const selected = editData

  return (
    <div style={{ display: 'flex', height: 'calc(100vh - 120px)', gap: 0, borderRadius: 12, overflow: 'hidden', border: `0.5px solid ${C.border}` }}>

      {/* Sol: Soru listesi */}
      <div style={{ width: 260, background: '#fff', borderRight: `0.5px solid ${C.border}`, display: 'flex', flexDirection: 'column', flexShrink: 0 }}>
        <div style={{ padding: '14px 16px', borderBottom: `0.5px solid ${C.border}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span style={{ fontSize: 11, fontWeight: 500, color: C.muted, letterSpacing: '0.06em', textTransform: 'uppercase' }}>Sorular</span>
          <button onClick={addQuestion}
            style={{ fontSize: 11, padding: '4px 10px', borderRadius: 7, border: `0.5px solid ${C.blue}`, color: C.blue, background: 'none', cursor: 'pointer' }}>
            + Ekle
          </button>
        </div>
        <div style={{ flex: 1, overflowY: 'auto', padding: 8 }}>
          {loading ? (
            <p style={{ fontSize: 12, color: C.muted, textAlign: 'center', padding: '2rem 0' }}>Yükleniyor...</p>
          ) : questions.length === 0 ? (
            <p style={{ fontSize: 12, color: C.muted, textAlign: 'center', padding: '2rem 0' }}>Henüz soru yok.</p>
          ) : (
            questions.map((q, i) => (
              <button key={q.id} onClick={() => setSelectedId(q.id)}
                style={{
                  width: '100%', textAlign: 'left', padding: '10px 12px', borderRadius: 8, marginBottom: 4,
                  border: `0.5px solid ${selectedId === q.id ? C.blue : 'transparent'}`,
                  background: selectedId === q.id ? C.blueTint : 'transparent',
                  cursor: 'pointer',
                }}>
                <div style={{ fontSize: 10, color: C.muted, marginBottom: 3 }}>
                  S-{String(i + 1).padStart(2, '0')} · {q.type === 'single' ? 'Tek seçim' : 'Çok seçim'}
                </div>
                <div style={{ fontSize: 12, fontWeight: 500, color: C.navy, lineHeight: 1.4 }}>
                  {q.text.slice(0, 50)}{q.text.length > 50 ? '...' : ''}
                </div>
                <div style={{ display: 'flex', gap: 4, marginTop: 4 }}>
                  {q.is_first && (
                    <span style={{ fontSize: 10, padding: '2px 7px', borderRadius: 20, background: C.blueTint, color: C.blue }}>İlk soru</span>
                  )}
                  {!q.question_options?.some(o => o.next_question_id) && (
                    <span style={{ fontSize: 10, padding: '2px 7px', borderRadius: 20, background: '#E8F5EE', color: C.success }}>Son soru</span>
                  )}
                  {!q.is_active && (
                    <span style={{ fontSize: 10, padding: '2px 7px', borderRadius: 20, background: C.warningTint, color: C.warning }}>Pasif</span>
                  )}
                </div>
              </button>
            ))
          )}
        </div>
      </div>

      {/* Sağ: Editör */}
      {!selected ? (
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', background: C.bg }}>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 36, marginBottom: 12 }}>🌳</div>
            <p style={{ fontSize: 13, color: C.muted }}>Sol panelden bir soru seçin</p>
            <p style={{ fontSize: 12, color: C.muted, marginTop: 4 }}>veya yeni soru ekleyin</p>
          </div>
        </div>
      ) : (
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', background: C.bg, overflow: 'hidden' }}>
          {/* Header */}
          <div style={{ padding: '14px 20px', borderBottom: `0.5px solid ${C.border}`, background: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
            <span style={{ fontSize: 13, fontWeight: 500, color: C.navy }}>{selected.text.slice(0, 50)}{selected.text.length > 50 ? '...' : ''}</span>
            <div style={{ display: 'flex', gap: 8 }}>
              <button onClick={deleteQuestion}
                style={{ fontSize: 11, padding: '5px 12px', borderRadius: 7, background: 'none', border: `0.5px solid ${C.danger}`, color: C.danger, cursor: 'pointer' }}>
                Soruyu Sil
              </button>
              <button onClick={saveQuestion} disabled={saving}
                style={{ fontSize: 11, padding: '5px 14px', borderRadius: 7, background: C.blue, color: '#fff', border: 'none', cursor: 'pointer', opacity: saving ? 0.7 : 1 }}>
                {saving ? 'Kaydediliyor...' : 'Kaydet'}
              </button>
            </div>
          </div>

          <div style={{ flex: 1, overflowY: 'auto', padding: 20 }}>
            {/* İlk soru toggle */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', background: '#fff', borderRadius: 10, border: `0.5px solid ${C.border}`, marginBottom: 16, cursor: 'pointer' }}
              onClick={() => setEditData(d => d ? { ...d, is_first: !d.is_first } : d)}>
              <div style={{ width: 34, height: 20, borderRadius: 20, background: selected.is_first ? C.blue : C.border, position: 'relative', transition: 'background 0.2s', flexShrink: 0 }}>
                <div style={{ position: 'absolute', top: 3, left: selected.is_first ? 17 : 3, width: 14, height: 14, borderRadius: '50%', background: '#fff', transition: 'left 0.2s' }} />
              </div>
              <span style={{ fontSize: 13, color: C.navy }}>Başlangıç sorusu olarak işaretle</span>
            </div>

            {/* Aktif toggle */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', background: '#fff', borderRadius: 10, border: `0.5px solid ${C.border}`, marginBottom: 16, cursor: 'pointer' }}
              onClick={() => setEditData(d => d ? { ...d, is_active: !d.is_active } : d)}>
              <div style={{ width: 34, height: 20, borderRadius: 20, background: selected.is_active ? C.success : C.border, position: 'relative', transition: 'background 0.2s', flexShrink: 0 }}>
                <div style={{ position: 'absolute', top: 3, left: selected.is_active ? 17 : 3, width: 14, height: 14, borderRadius: '50%', background: '#fff', transition: 'left 0.2s' }} />
              </div>
              <span style={{ fontSize: 13, color: C.navy }}>Aktif (danışanlara göster)</span>
            </div>

            <div style={{ background: '#fff', borderRadius: 10, border: `0.5px solid ${C.border}`, padding: 16, marginBottom: 16 }}>
              <Field label="Soru Metni" value={editData?.text ?? ''} onChange={v => setEditData(d => d ? { ...d, text: v } : d)} placeholder="Soruyu buraya yazın..." />
              <Field label="Açıklama (opsiyonel)" value={editData?.description ?? ''} onChange={v => setEditData(d => d ? { ...d, description: v } : d)} placeholder="Ek açıklama..." multiline />

              <div style={{ marginBottom: 0 }}>
                <div style={{ fontSize: 11, fontWeight: 500, color: C.muted, letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: 8 }}>Soru Tipi</div>
                <div style={{ display: 'flex', gap: 8 }}>
                  {(['single', 'multi'] as const).map(t => (
                    <button key={t} onClick={() => setEditData(d => d ? { ...d, type: t } : d)}
                      style={{ fontSize: 12, padding: '6px 16px', borderRadius: 20, cursor: 'pointer', border: `0.5px solid ${editData?.type === t ? C.blue : C.border}`, background: editData?.type === t ? C.blueTint : 'none', color: editData?.type === t ? C.blue : C.muted, fontWeight: editData?.type === t ? 500 : 400 }}>
                      {t === 'single' ? 'Tek seçim' : 'Çok seçim'}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Seçenekler */}
            <div style={{ marginBottom: 8 }}>
              <div style={{ fontSize: 11, fontWeight: 500, color: C.muted, letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: 10 }}>
                Seçenekler ({selected.question_options?.length ?? 0})
              </div>
              {(selected.question_options ?? [])
                .sort((a, b) => a.order_index - b.order_index)
                .map(opt => (
                  <OptionCard
                    key={opt.id}
                    option={opt}
                    questions={questions}
                    questionId={selected.id}
                    onSave={handleOptionSave}
                    onDelete={handleOptionDelete}
                  />
                ))}

              {/* Yeni seçenek ekle */}
              <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
                <input
                  value={newOptionText}
                  onChange={e => setNewOptionText(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && addOption()}
                  placeholder="Yeni seçenek metni..."
                  style={{ flex: 1, border: `0.5px dashed ${C.border}`, borderRadius: 8, padding: '8px 12px', fontSize: 13, color: C.navy, background: '#fff', outline: 'none' }}
                />
                <button onClick={addOption} disabled={!newOptionText.trim() || addingOption}
                  style={{ padding: '8px 16px', borderRadius: 8, background: C.blue, color: '#fff', border: 'none', fontSize: 12, cursor: 'pointer', opacity: !newOptionText.trim() ? 0.4 : 1 }}>
                  {addingOption ? '...' : '+ Ekle'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
