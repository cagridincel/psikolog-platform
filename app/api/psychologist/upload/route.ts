import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyClient = { from: (table: string) => any }

export async function POST(req: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Yetkisiz' }, { status: 401 })

  const formData = await req.formData()
  const file = formData.get('file') as File | null
  const type = formData.get('type') as string | null // 'avatar' | 'certificate'

  if (!file) return NextResponse.json({ error: 'Dosya bulunamadı' }, { status: 400 })

  const ext = file.name.split('.').pop()
  const fileName = `${user.id}/${type === 'avatar' ? 'avatar' : `certificates/${Date.now()}`}.${ext}`
  const bucket = type === 'avatar' ? 'avatars' : 'certificates'

  const arrayBuffer = await file.arrayBuffer()
  const buffer = new Uint8Array(arrayBuffer)

  const { data, error } = await supabase.storage
    .from(bucket)
    .upload(fileName, buffer, {
      contentType: file.type,
      upsert: type === 'avatar',
    })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const { data: { publicUrl } } = supabase.storage.from(bucket).getPublicUrl(data.path)

  // Avatar ise profiles'ı güncelle
  if (type === 'avatar') {
    const db = supabase as unknown as AnyClient
    await db.from('profiles').update({ avatar_url: publicUrl }).eq('id', user.id)
  }

  return NextResponse.json({ url: publicUrl, path: data.path })
}
