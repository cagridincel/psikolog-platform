'use client'

import { useState, useEffect } from 'react'

const C = { navy: '#1D3557', blue: '#1A6BB5', blueTint: '#EBF3FC', muted: '#8FA3BF', border: '#E4EAF2', bg: '#F2F5F9', success: '#1A7A4A', successTint: '#E8F5EE' }

interface Option {
  id: string
  text: string
  emoji: string | null
  next_question_id: string | null
}

interface Question {
  id: string
  text: string
  description: string | null
  type: 'single' | 'multi'
  question_options: Option[]
}

interface MatchedProfile {
  id: string
  full_name: string
  bio: string | null
  specialties: string[]
  price_per_session: number | null
  avatar_url: string | null
}

interface MatchResult {
  profile: MatchedProfile
  score: number
  matchedSpecialties: string[]
  availableSlots: { id: string; start_time: string; end_time: string }[]
}

interface Answer {
  question_id: string
  option_ids: string[]
}

interface Props {
  onClose: () => void
  onBook: (psychologistId: string) => void
}

export default function AssessmentWizard({ onClose, onBook }: Props) {
  const [questions, setQuestions] = useState<Record<string, Question>>({})
  const [currentQuestionId, setCurrentQuestionId] = useState<string | null>(null)
  const [answers, setAnswers] = useState<Answer[]>([])
  const [history, setHistory] = useState<string[]>([])
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [results, setResults] = useState<MatchResult[] | null>(null)
  const [selectedOption, setSelectedOption] = useState<string | null>(null)

  useEffect(() => {
    async function fetchQuestions() {
      const res = await fetch('/api/questions')
      const data = await res.json()
      const list = Array.isArray(data) ? data : []
      const map: Record<string, Question> = {}
      for (const q of list) map[q.id] = q
      setQuestions(map)
      const first = list.find((q: Question & { is_first?: boolean }) => q.is_first)
      setCurrentQuestionId(first?.id ?? list[0]?.id ?? null)
      setLoading(false)
    }
    fetchQuestions()
  }, [])

  const currentQuestion = currentQuestionId ? questions[currentQuestionId] : null
  const progress = answers.length + 1
  const totalEstimate = Math.max(Object.keys(questions).length, progress + 1)

  function handleSelect(option: Option) {
    setSelectedOption(option.id)
    if (currentQuestion?.type === 'single') {
      setTimeout(() => handleNext(option), 150)
    }
  }

  function handleNext(forcedOption?: Option) {
    if (!currentQuestion || !currentQuestionId) return
    const optId = forcedOption?.id ?? selectedOption
    if (!optId) return

    const option = currentQuestion.question_options.find(o => o.id === optId)
    const newAnswer: Answer = { question_id: currentQuestionId, option_ids: [optId] }
    const newAnswers = [...answers, newAnswer]
    setAnswers(newAnswers)
    setHistory(h => [...h, currentQuestionId])
    setSelectedOption(null)

    if (option?.next_question_id && questions[option.next_question_id]) {
      setCurrentQuestionId(option.next_question_id)
    } else {
      handleSubmit(newAnswers)
    }
  }

  function handleBack() {
    if (history.length === 0) return
    const prev = history[history.length - 1]
    setHistory(h => h.slice(0, -1))
    setAnswers(a => a.slice(0, -1))
    setCurrentQuestionId(prev)
    setSelectedOption(null)
  }

  async function handleSubmit(finalAnswers: Answer[]) {
    setSubmitting(true)
    try {
      const res = await fetch('/api/assessment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ answers: finalAnswers }),
      })
      const data = await res.json()
      setResults(data.matched ?? [])
    } catch {
      setResults([])
    } finally {
      setSubmitting(false)
    }
  }

  const Overlay = ({ children }: { children: React.ReactNode }) => (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(29,53,87,0.4)', backdropFilter: 'blur(4px)' }}>
      {children}
    </div>
  )

  if (loading) return (
    <Overlay>
      <div className="bg-white rounded-2xl p-8 w-full max-w-lg text-center" style={{ border: `0.5px solid ${C.border}` }}>
        <div className="w-8 h-8 border-2 border-t-transparent rounded-full animate-spin mx-auto mb-3" style={{ borderColor: C.blue, borderTopColor: 'transparent' }} />
        <p className="text-sm" style={{ color: C.muted }}>Yükleniyor...</p>
      </div>
    </Overlay>
  )

  if (submitting) return (
    <Overlay>
      <div className="bg-white rounded-2xl p-10 w-full max-w-lg text-center" style={{ border: `0.5px solid ${C.border}` }}>
        <div className="text-4xl mb-4">🔍</div>
        <p className="text-base font-medium mb-1" style={{ color: C.navy }}>Size uygun psikologlar aranıyor</p>
        <p className="text-sm" style={{ color: C.muted }}>Cevaplarınız analiz ediliyor...</p>
        <div className="mt-6 w-full h-1 rounded-full overflow-hidden" style={{ background: C.bg }}>
          <div className="h-full rounded-full animate-pulse" style={{ background: C.blue, width: '60%' }} />
        </div>
      </div>
    </Overlay>
  )

  if (results !== null) return (
    <Overlay>
      <div className="bg-white rounded-2xl w-full max-w-2xl flex flex-col" style={{ border: `0.5px solid ${C.border}`, maxHeight: '90vh' }}>
        <div className="flex items-center justify-between px-6 py-5 border-b flex-shrink-0" style={{ borderColor: C.border }}>
          <div>
            <h2 className="text-base font-medium" style={{ color: C.navy }}>Size Önerilen Psikologlar</h2>
            <p className="text-xs mt-0.5" style={{ color: C.muted }}>{results.length} eşleşme bulundu</p>
          </div>
          <button onClick={onClose} style={{ color: C.muted, fontSize: 20, background: 'none', border: 'none', cursor: 'pointer', lineHeight: 1 }}>✕</button>
        </div>

        <div className="overflow-y-auto flex-1 p-6 space-y-4">
          {results.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-sm" style={{ color: C.muted }}>Şu an uygun psikolog bulunamadı.</p>
              <button onClick={onClose} className="mt-4 text-sm font-medium" style={{ color: C.blue }}>Tüm psikologları gör →</button>
            </div>
          ) : results.map((r) => (
            <div key={r.profile.id} className="rounded-xl border p-5" style={{ borderColor: C.border }}>
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-full flex items-center justify-center text-sm font-medium flex-shrink-0 overflow-hidden"
                  style={{ background: C.blueTint, color: C.blue }}>
                  {r.profile.avatar_url
                    ? <img src={r.profile.avatar_url} className="w-12 h-12 object-cover" alt="" />
                    : r.profile.full_name[0]}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium" style={{ color: C.navy }}>{r.profile.full_name}</p>
                  <p className="text-xs mt-1 line-clamp-2" style={{ color: C.muted, lineHeight: 1.5 }}>{r.profile.bio}</p>
                  <div className="flex flex-wrap gap-1 mt-2">
                    {r.matchedSpecialties.slice(0, 3).map(s => (
                      <span key={s} className="text-xs px-2 py-0.5 rounded-full" style={{ background: C.blueTint, color: C.blue }}>{s}</span>
                    ))}
                  </div>
                </div>
                <div className="text-right flex-shrink-0">
                  <p className="text-sm font-medium" style={{ color: C.navy }}>₺{r.profile.price_per_session}</p>
                  <p className="text-xs" style={{ color: C.muted }}>/ seans</p>
                </div>
              </div>
              <div className="mt-4 flex items-center justify-between pt-4 border-t" style={{ borderColor: C.bg }}>
                <span className="text-xs" style={{ color: C.muted }}>{r.availableSlots.length} uygun slot</span>
                <button
                  onClick={() => { onBook(r.profile.id); onClose() }}
                  className="text-sm font-medium px-4 py-2 rounded-lg text-white hover:opacity-90 transition-opacity"
                  style={{ background: C.blue }}>
                  Seans Al
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </Overlay>
  )

  if (!currentQuestion) return null

  const progressPct = Math.min((progress / totalEstimate) * 100, 95)

  return (
    <Overlay>
      <div className="bg-white rounded-2xl w-full max-w-lg flex flex-col" style={{ border: `0.5px solid ${C.border}` }}>
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b flex-shrink-0" style={{ borderColor: C.border }}>
          <div className="flex items-center gap-3 flex-1">
            {history.length > 0 && (
              <button onClick={handleBack} style={{ color: C.muted, background: 'none', border: 'none', cursor: 'pointer', fontSize: 18 }}>←</button>
            )}
            <div className="flex-1">
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-xs" style={{ color: C.muted }}>Soru {progress}</span>
              </div>
              <div className="h-1 rounded-full overflow-hidden" style={{ background: C.bg }}>
                <div className="h-full rounded-full transition-all duration-300" style={{ width: `${progressPct}%`, background: C.blue }} />
              </div>
            </div>
          </div>
          <button onClick={onClose} style={{ color: C.muted, background: 'none', border: 'none', cursor: 'pointer', fontSize: 20, marginLeft: 16, lineHeight: 1 }}>✕</button>
        </div>

        {/* Soru */}
        <div className="p-6">
          {currentQuestion.description && (
            <p className="text-sm mb-2" style={{ color: C.muted }}>{currentQuestion.description}</p>
          )}
          <h2 className="text-lg font-medium mb-6" style={{ color: C.navy, letterSpacing: '-0.01em', lineHeight: 1.3 }}>
            {currentQuestion.text}
          </h2>

          <div className="space-y-2">
            {currentQuestion.question_options.map(option => (
              <button
                key={option.id}
                onClick={() => handleSelect(option)}
                className="w-full text-left rounded-xl border transition-all flex items-center gap-3"
                style={{
                  padding: '12px 16px',
                  borderColor: selectedOption === option.id ? C.blue : C.border,
                  background: selectedOption === option.id ? C.blueTint : '#fff',
                  cursor: 'pointer',
                }}>
                {option.emoji && <span style={{ fontSize: 20 }}>{option.emoji}</span>}
                <span className="text-sm font-medium" style={{ color: C.navy }}>{option.text}</span>
                {selectedOption === option.id && (
                  <svg className="ml-auto flex-shrink-0" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={C.blue} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="20 6 9 17 4 12"/>
                  </svg>
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Footer — multi seçimde göster */}
        {currentQuestion.type === 'multi' && (
          <div className="px-6 pb-6">
            <button
              onClick={() => handleNext()}
              disabled={!selectedOption}
              className="w-full py-3 rounded-xl text-white text-sm font-medium disabled:opacity-40 hover:opacity-90 transition-opacity"
              style={{ background: C.blue }}>
              Devam Et
            </button>
          </div>
        )}
      </div>
    </Overlay>
  )
}
