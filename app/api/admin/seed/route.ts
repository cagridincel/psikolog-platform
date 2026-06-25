import { NextResponse } from 'next/server'
import { createServiceRoleClient } from '@/lib/supabase/server'

// Sadece CRON_SECRET ile çağrılabilir
export async function POST(req: Request) {
  const auth = req.headers.get('x-seed-secret')
  if (auth !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: 'Yetkisiz' }, { status: 401 })
  }

  const supabase = createServiceRoleClient()

  const psychologists = [
    { id: 'a1000000-0000-0000-0000-000000000001', email: 'ayse@ayse.com', role: 'psychologist' },
    { id: 'a1000000-0000-0000-0000-000000000002', email: 'mehmet@mehmet.com', role: 'psychologist' },
    { id: 'a1000000-0000-0000-0000-000000000003', email: 'zeynep@zeynep.com', role: 'psychologist' },
    { id: 'a1000000-0000-0000-0000-000000000004', email: 'can@can.com', role: 'psychologist' },
    { id: 'a1000000-0000-0000-0000-000000000005', email: 'selipsi@selin.com', role: 'psychologist' },
    { id: 'a1000000-0000-0000-0000-000000000006', email: 'berk@berk.com', role: 'psychologist' },
    { id: 'a1000000-0000-0000-0000-000000000007', email: 'fatma@fatma.com', role: 'psychologist' },
    { id: 'a1000000-0000-0000-0000-000000000008', email: 'emrepsi@emre.com', role: 'psychologist' },
    { id: 'a1000000-0000-0000-0000-000000000009', email: 'elifpsi@elif.com', role: 'psychologist' },
    { id: 'a1000000-0000-0000-0000-000000000010', email: 'murat@murat.com', role: 'psychologist' },
    { id: 'a1000000-0000-0000-0000-000000000011', email: 'nihan@nihan.com', role: 'psychologist' },
    { id: 'a1000000-0000-0000-0000-000000000012', email: 'serkan@serkan.com', role: 'psychologist' },
    { id: 'a1000000-0000-0000-0000-000000000013', email: 'busra@busra.com', role: 'psychologist' },
    { id: 'a1000000-0000-0000-0000-000000000014', email: 'taner@taner.com', role: 'psychologist' },
    { id: 'a1000000-0000-0000-0000-000000000015', email: 'sibel@sibel.com', role: 'psychologist' },
    { id: 'a1000000-0000-0000-0000-000000000016', email: 'denizpsi@deniz.com', role: 'psychologist' },
    { id: 'a1000000-0000-0000-0000-000000000017', email: 'alp@alp.com', role: 'psychologist' },
    { id: 'a1000000-0000-0000-0000-000000000018', email: 'pinar@pinar.com', role: 'psychologist' },
    { id: 'a1000000-0000-0000-0000-000000000019', email: 'kerem@kerem.com', role: 'psychologist' },
    { id: 'a1000000-0000-0000-0000-000000000020', email: 'melis@melis.com', role: 'psychologist' },
  ]

  const clients = [
    { id: 'b1000000-0000-0000-0000-000000000001', email: 'ahmet@ahmet.com', role: 'client' },
    { id: 'b1000000-0000-0000-0000-000000000002', email: 'merve@merve.com', role: 'client' },
    { id: 'b1000000-0000-0000-0000-000000000003', email: 'burak@burak.com', role: 'client' },
    { id: 'b1000000-0000-0000-0000-000000000004', email: 'selindanisan@selin.com', role: 'client' },
    { id: 'b1000000-0000-0000-0000-000000000005', email: 'onur@onur.com', role: 'client' },
    { id: 'b1000000-0000-0000-0000-000000000006', email: 'aylin@aylin.com', role: 'client' },
    { id: 'b1000000-0000-0000-0000-000000000007', email: 'mert@mert.com', role: 'client' },
    { id: 'b1000000-0000-0000-0000-000000000008', email: 'gizem@gizem.com', role: 'client' },
    { id: 'b1000000-0000-0000-0000-000000000009', email: 'cem@cem.com', role: 'client' },
    { id: 'b1000000-0000-0000-0000-000000000010', email: 'irem@irem.com', role: 'client' },
    { id: 'b1000000-0000-0000-0000-000000000011', email: 'kaan@kaan.com', role: 'client' },
    { id: 'b1000000-0000-0000-0000-000000000012', email: 'denizdanisan@deniz.com', role: 'client' },
    { id: 'b1000000-0000-0000-0000-000000000013', email: 'elifdanisan@elif.com', role: 'client' },
    { id: 'b1000000-0000-0000-0000-000000000014', email: 'serhan@serhan.com', role: 'client' },
    { id: 'b1000000-0000-0000-0000-000000000015', email: 'aysedanisan@ayse.com', role: 'client' },
    { id: 'b1000000-0000-0000-0000-000000000016', email: 'tolga@tolga.com', role: 'client' },
    { id: 'b1000000-0000-0000-0000-000000000017', email: 'naz@naz.com', role: 'client' },
    { id: 'b1000000-0000-0000-0000-000000000018', email: 'furkan@furkan.com', role: 'client' },
    { id: 'b1000000-0000-0000-0000-000000000019', email: 'ceren@ceren.com', role: 'client' },
    { id: 'b1000000-0000-0000-0000-000000000020', email: 'emredanisan@emre.com', role: 'client' },
  ]

  const all = [...psychologists, ...clients]
  const results: { email: string; status: string; error?: string }[] = []

  for (const u of all) {
    // Önce sil
    await (supabase as any).auth.admin.deleteUser(u.id).catch(() => {})

    // Yeniden oluştur — Supabase doğru hash'i üretir
    const { error } = await (supabase as any).auth.admin.createUser({
      user_id: u.id,
      email: u.email,
      password: '123456',
      email_confirm: true,
      user_metadata: { role: u.role },
    })

    if (error) {
      results.push({ email: u.email, status: 'error', error: error.message })
    } else {
      results.push({ email: u.email, status: 'ok' })
    }
  }

  const ok = results.filter(r => r.status === 'ok').length
  const errors = results.filter(r => r.status === 'error')

  return NextResponse.json({ ok, errors, total: all.length })
}
