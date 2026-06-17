import type { OptionSpecialtyRow, ProfileRow, SlotRow, MatchedPsychologist } from '@/types/database.types'

interface AssessmentAnswer {
  question_id: string
  option_ids: string[]
}

interface OptionMeta {
  id: string
  meta_value: string | null
  question: {
    meta_key: string | null
  } | null
}

/**
 * Cevaplardan meta değerlerini çıkarır (cinsiyet tercihi vb.)
 */
export function extractMetaValues(
  answers: AssessmentAnswer[],
  optionMetas: OptionMeta[]
): Record<string, string> {
  const meta: Record<string, string> = {}
  const selectedIds = new Set(answers.flatMap((a) => a.option_ids))

  for (const om of optionMetas) {
    if (
      selectedIds.has(om.id) &&
      om.meta_value &&
      om.question?.meta_key
    ) {
      meta[om.question.meta_key] = om.meta_value
    }
  }

  return meta
}

/**
 * Verilen cevaplar ve specialty ağırlıklarına göre skor hesaplar.
 */
export function calculateScores(
  answers: AssessmentAnswer[],
  optionSpecialties: OptionSpecialtyRow[]
): Record<string, number> {
  const scores: Record<string, number> = {}
  const selectedOptionIds = new Set(answers.flatMap((a) => a.option_ids))

  for (const os of optionSpecialties) {
    if (selectedOptionIds.has(os.option_id)) {
      scores[os.specialty] = (scores[os.specialty] ?? 0) + os.weight
    }
  }

  return scores
}

/**
 * Specialty skorları + meta filtrelerine göre psikologları eşleştirir.
 * Uygun slotu olmayan psikologlar çıkar. Max 3 sonuç döner.
 */
export function matchPsychologists(
  scores: Record<string, number>,
  psychologists: (ProfileRow & { slots: SlotRow[]; gender?: string | null })[],
  meta: Record<string, string> = {}
): MatchedPsychologist[] {
  const genderPreference = meta['gender_preference']
  const results: MatchedPsychologist[] = []

  for (const psych of psychologists) {
    const availableSlots = psych.slots.filter((s) => s.status === 'available')
    if (availableSlots.length === 0) continue

    // Cinsiyet filtresi — 'any' veya tanımsızsa filtre uygulanmaz
    if (
      genderPreference &&
      genderPreference !== 'any' &&
      psych.gender !== null &&
      psych.gender !== undefined &&
      psych.gender !== genderPreference
    ) continue

    let totalScore = 0
    const matchedSpecialties: string[] = []

    for (const specialty of psych.specialties ?? []) {
      const score = scores[specialty] ?? 0
      if (score > 0) {
        totalScore += score
        matchedSpecialties.push(specialty)
      }
    }

    results.push({
      profile: psych,
      score: totalScore,
      matchedSpecialties,
      availableSlots,
    })
  }

  return results.sort((a, b) => b.score - a.score).slice(0, 3)
}