import { describe, it, expect } from 'vitest'
import { matchPsychologists } from '@/lib/matching'

const mockPsychologists = [
  {
    profile: {
      id: 'psych-1',
      full_name: 'Dr. Ayşe Kaya',
      avatar_url: null,
      bio: 'Anksiyete ve depresyon uzmanı',
      specialties: ['Anksiyete', 'Depresyon', 'Stres Yönetimi'],
      price_per_session: 500,
      is_approved: true,
      gender: 'female',
      experience_years: 10,
      languages: ['Türkçe', 'İngilizce'],
      approaches: ['BDT', 'EMDR'],
      age_groups: ['Yetişkin (26-64)'],
      session_duration: 50,
      session_types: ['Online', 'Yüz Yüze'],
      education: [],
      certificates: [],
    },
    availableSlots: [
      { id: 'slot-1', start_time: new Date(Date.now() + 86400000).toISOString(), end_time: '' }
    ],
  },
  {
    profile: {
      id: 'psych-2',
      full_name: 'Dr. Mehmet Demir',
      avatar_url: null,
      bio: 'Travma ve aile terapisi uzmanı',
      specialties: ['Travma', 'Aile Terapisi', 'İlişki Sorunları'],
      price_per_session: 600,
      is_approved: true,
      gender: 'male',
      experience_years: 8,
      languages: ['Türkçe'],
      approaches: ['Gestalt Terapi', 'Psikanalitik Terapi'],
      age_groups: ['Yetişkin (26-64)', 'Yaşlı (65+)'],
      session_duration: 60,
      session_types: ['Online'],
      education: [],
      certificates: [],
    },
    availableSlots: [
      { id: 'slot-2', start_time: new Date(Date.now() + 86400000).toISOString(), end_time: '' }
    ],
  },
  {
    profile: {
      id: 'psych-3',
      full_name: 'Dr. Zeynep Aksoy',
      avatar_url: null,
      bio: 'Çocuk ve ergen terapisi uzmanı',
      specialties: ['Çocuk ve Ergen', 'Anksiyete'],
      price_per_session: 400,
      is_approved: true,
      gender: 'female',
      experience_years: 5,
      languages: ['Türkçe'],
      approaches: ['BDT'],
      age_groups: ['Çocuk (6-12)', 'Ergen (13-17)'],
      session_duration: 50,
      session_types: ['Yüz Yüze'],
      education: [],
      certificates: [],
    },
    availableSlots: [],
  },
]

describe('matchPsychologists', () => {
  it('anksiyete cevabı veren kullanıcıya anksiyete uzmanını önerir', () => {
    const answers = [
      {
        question_id: 'q1',
        option_ids: ['opt-anksiyete'],
        option_specialties: [{ specialty: 'Anksiyete', weight: 3 }],
      },
    ]

    const results = matchPsychologists(mockPsychologists, answers)

    expect(results.length).toBeGreaterThan(0)
    const topResult = results[0]
    expect(topResult.profile.specialties).toContain('Anksiyete')
  })

  it('skoru yüksek olanı önce sıralar', () => {
    const answers = [
      {
        question_id: 'q1',
        option_ids: ['opt-anksiyete'],
        option_specialties: [{ specialty: 'Anksiyete', weight: 3 }],
      },
      {
        question_id: 'q2',
        option_ids: ['opt-depresyon'],
        option_specialties: [{ specialty: 'Depresyon', weight: 2 }],
      },
    ]

    const results = matchPsychologists(mockPsychologists, answers)

    for (let i = 0; i < results.length - 1; i++) {
      expect(results[i].score).toBeGreaterThanOrEqual(results[i + 1].score)
    }
  })

  it('uygun slotu olmayan psikoloğu sonuç listesine dahil etmez', () => {
    const answers = [
      {
        question_id: 'q1',
        option_ids: ['opt-anksiyete'],
        option_specialties: [{ specialty: 'Anksiyete', weight: 3 }],
      },
    ]

    const results = matchPsychologists(mockPsychologists, answers)
    const hasNoSlotPsych = results.some(r => r.profile.id === 'psych-3')

    expect(hasNoSlotPsych).toBe(false)
  })

  it('boş cevapla da crash yapmaz', () => {
    const results = matchPsychologists(mockPsychologists, [])
    expect(Array.isArray(results)).toBe(true)
  })

  it('hiç psikolog yoksa boş dizi döner', () => {
    const answers = [
      { question_id: 'q1', option_ids: ['opt-1'], option_specialties: [{ specialty: 'Anksiyete', weight: 1 }] },
    ]
    const results = matchPsychologists([], answers)
    expect(results).toEqual([])
  })
})
