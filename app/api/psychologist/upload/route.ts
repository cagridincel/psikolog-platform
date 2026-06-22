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
  const type = formData.get('type') as string | null

  if (!file) return NextResponse.json({ error: 'Dosya bulunamadı' }, { status: 400 })

  const ALLOWED_AVATAR = ['image/jpeg', 'image/png', 'image/webp']
  const ALLOWED_CERT   = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf']
  const allowed = type === 'avatar' ? ALLOWED_AVATAR : ALLOWED_CERT

  if (!allowed.includes(file.type)) {
    return NextResponse.json({
      error: type === 'avatar'
        ? 'Sadece JPG, PNG veya WEBP formatı desteklenir'
        : 'Sadece JPG, PNG, WEBP veya PDF formatı desteklenir'
    }, { status: 400 })
  }

  const maxSize = type === 'avatar' ? 5 * 1024 * 1024 : 10 * 1024 * 1024
  if (file.size > maxSize) {
    return NextResponse.json({
      error: `Dosya boyutu ${type === 'avatar' ? '5MB' : '10MB'} limitini aşıyor`
    }, { status: 400 })
  }

  const ext = file.name.split('.').pop()?.toLowerCase()
  const ALLOWED_EXTS = type === 'avatar'
    ? ['jpg', 'jpeg', 'png', 'webp']
    : ['jpg', 'jpeg', 'png', 'webp', 'pdf']

  if (!ext || !ALLOWED_EXTS.includes(ext)) {
    return NextResponse.json({ error: 'Geçersiz dosya uzantısı' }, { status: 400 })
  }

  const fileName = `${user.id}/${type === 'avatar' ? 'avatar' : `certificates/${Date.now()}`}.${ext}`
  const bucket = type === 'avatar' ? 'avatars' : 'certificates'

  const arrayBuffer = await file.arrayBuffer()
  const buffer = new Uint8Array(arrayBuffer)

  const { data, error } = await supabase.storage
    .from(bucket)
    .upload(fileName, buffer, { contentType: file.type, upsert: type === 'avatar' })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const { data: { publicUrl } } = supabase.storage.from(bucket).getPublicUrl(data.path)

  if (type === 'avatar') {
    const db = supabase as unknown as AnyClient
    await db.from('profiles').update({ avatar_url: publicUrl }).eq('id', user.id)
  }

  return NextResponse.json({ url: publicUrl, path: data.path })
}
