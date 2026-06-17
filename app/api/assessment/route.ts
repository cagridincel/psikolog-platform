import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { calculateScores, matchPsychologists, extractMetaValues } from '@/lib/matching'

export async function POST(req: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { answers } = await req.json()
  if (!answers || !Array.isArray(answers)) {
    return NextResponse.json({ error: 'Gecersiz veri' }, { status: 400 })
  }

  const optionIds = answers.flatMap((a: { option_ids: string[] }) => a.option_ids)

  // Specialty agirliklarini cek
  const { data: optionSpecialties } = await supabase
    .from('option_specialties')
    .select('*')
    .in('option_id', optionIds)

  // Meta degerleri cek (cinsiyet tercihi vb.) — dinamik, hardcoded ID yok
  const { data: optionMetas, error: metaError } = await supabase
  .from('question_options')
  .select('id, meta_value, question:question_options_question_id_fkey(meta_key)')
  .in('id', optionIds)
  .not('meta_value', 'is', null)

console.log('optionMetas:', optionMetas, metaError)

  const scores = calculateScores(answers, optionSpecialties ?? [])
  const meta = extractMetaValues(answers, optionMetas ?? [])

  // Psikologlar ve slotlari ayri sorgula
  const { data: profiles, error: profilesError } = await supabase
  .from('profiles')
  .select('id, full_name, bio, specialties, price_per_session, avatar_url, gender')
  .eq('is_approved', true)

console.log('profiles error:', profilesError)
console.log('profiles:', profiles)

  const { data: slots } = await supabase
    .from('slots')
    .select('id, psychologist_id, start_time, end_time, status')
    .eq('status', 'available')
    .gte('start_time', new Date().toISOString())

  const psychologists = (profiles ?? []).map((p: any) => ({
    ...p,
    slots: (slots ?? []).filter((s: any) => s.psychologist_id === p.id),
  }))

  const matched = matchPsychologists(scores, psychologists, meta)

  console.log('meta:', meta)
  console.log('scores:', scores)
  console.log('profiles count:', profiles?.length)
  console.log('slots count:', slots?.length)
  console.log('matched count:', matched.length)

  // Giris yapmis kullanicinin assessment'ini kaydet
  if (user) {
    await supabase.from('client_assessments').insert({
      client_id: user.id,
      answers,
      scores,
    } as any)
  }

  return NextResponse.json({ scores, meta, matched })
}