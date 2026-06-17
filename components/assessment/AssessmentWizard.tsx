'use client'

import { useState, useEffect } from 'react'

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

export default function AssessmentWizard({ onClose, onBook  }: Props) {
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
      const first = list.find((q: Question & { is_first: boolean }) => q.is_first)
      if (first) setCurrentQuestionId(first.id)
      setLoading(false)
    }
    fetchQuestions()
  }, [])

  const currentQuestion = currentQuestionId ? questions[currentQuestionId] : null
  const progress = history.length + 1
  const totalEstimate = 8

  function handleSelect(option: Option) {
    setSelectedOption(option.id)
  }

  function handleNext() {
    if (!currentQuestion || !selectedOption) return
    const option = currentQuestion.question_options.find((o) => o.id === selectedOption)
    if (!option) return

    const newAnswer: Answer = {
      question_id: currentQuestion.id,
      option_ids: [selectedOption],
    }
    const newAnswers = [...answers, newAnswer]
    setAnswers(newAnswers)
    setHistory((h) => [...h, currentQuestion.id])
    setSelectedOption(null)

    if (option.next_question_id) {
      setCurrentQuestionId(option.next_question_id)
    } else {
      handleSubmit(newAnswers)
    }
  }

  function handleBack() {
    if (history.length === 0) return
    const prev = history[history.length - 1]
    setHistory((h) => h.slice(0, -1))
    setAnswers((a) => a.slice(0, -1))
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

  if (loading) {
    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
        <div className="bg-white rounded-2xl p-8 w-full max-w-lg text-center">
          <div className="text-gray-400">Yükleniyor...</div>
        </div>
      </div>
    )
  }

  if (submitting) {
    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
        <div className="bg-white rounded-2xl p-8 w-full max-w-lg text-center">
          <div className="text-2xl mb-3">🔍</div>
          <div className="font-semibold text-gray-900">Size uygun psikologlar aranıyor...</div>
        </div>
      </div>
    )
  }

  if (results !== null) {
    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
          <div className="p-6 border-b flex items-center justify-between">
            <h2 className="text-lg font-bold text-gray-900">Size Önerilen Psikologlar</h2>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl">✕</button>
          </div>
          <div className="p-6 space-y-4">
            {results.length === 0 ? (
              <p className="text-gray-500 text-center py-8">Şu an uygun psikolog bulunamadı. Listeye göz atabilirsiniz.</p>
            ) : (
              results.map((r) => (
                <div key={r.profile.id} className="border rounded-xl p-5">
                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 bg-gray-100 rounded-full flex-shrink-0" />
                    <div className="flex-1">
                      <h3 className="font-semibold text-gray-900">{r.profile.full_name}</h3>
                      <p className="text-sm text-gray-500 mt-1 line-clamp-2">{r.profile.bio}</p>
                      <div className="flex flex-wrap gap-1 mt-2">
                        {r.matchedSpecialties.map((s) => (
                          <span key={s} className="text-xs bg-purple-50 text-purple-700 px-2 py-1 rounded-full">
                            {s}
                          </span>
                        ))}
                      </div>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <div className="text-sm font-medium text-gray-900">₺{r.profile.price_per_session}</div>
                      <div className="text-xs text-gray-400">/ seans</div>
                    </div>
                  </div>
                  <div className="mt-4 flex items-center justify-between">
                    <span className="text-xs text-gray-400">{r.availableSlots.length} uygun seans</span>
                    <button
                      onClick={() => { onBook(r.profile.id); onClose(); }}
                      className="text-sm bg-black text-white px-4 py-2 rounded-lg"
                    >
                      Seans Al
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    )
  }

  if (!currentQuestion) return null

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl w-full max-w-lg">
        {/* Header */}
        <div className="p-6 border-b flex items-center justify-between">
          <div className="flex items-center gap-3">
            {history.length > 0 && (
              <button onClick={handleBack} className="text-gray-400 hover:text-gray-600">
                ←
              </button>
            )}
            <div>
              <div className="text-xs text-gray-400 mb-1">
                {progress} / ~{totalEstimate}
              </div>
              <div className="w-32 h-1 bg-gray-100 rounded-full">
                <div
                  className="h-1 bg-black rounded-full transition-all"
                  style={{ width: `${(progress / totalEstimate) * 100}%` }}
                />
              </div>
            </div>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl">✕</button>
        </div>

        {/* Soru */}
        <div className="p-6">
          {currentQuestion.description && (
            <p className="text-sm text-gray-400 mb-2">{currentQuestion.description}</p>
          )}
          <h2 className="text-xl font-bold text-gray-900 mb-6">{currentQuestion.text}</h2>

          <div className="space-y-3">
            {currentQuestion.question_options
              .sort((a, b) => 0)
              .map((option) => (
                <button
                  key={option.id}
                  onClick={() => handleSelect(option)}
                  className={`w-full text-left px-4 py-3 rounded-xl border-2 transition-all flex items-center gap-3 ${
                    selectedOption === option.id
                      ? 'border-black bg-gray-50'
                      : 'border-gray-100 hover:border-gray-300'
                  }`}
                >
                  {option.emoji && <span className="text-xl">{option.emoji}</span>}
                  <span className="text-sm font-medium text-gray-800">{option.text}</span>
                </button>
              ))}
          </div>
        </div>

        {/* Footer */}
        <div className="p-6 border-t">
          <button
            onClick={handleNext}
            disabled={!selectedOption}
            className="w-full bg-black text-white py-3 rounded-xl font-medium disabled:opacity-40 transition-opacity"
          >
            Devam Et
          </button>
        </div>
      </div>
    </div>
  )
}
