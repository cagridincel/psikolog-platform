import { describe, it, expect, vi, beforeEach } from 'vitest'
import { POST } from '@/app/api/psychologist/upload/route'
import { createClient } from '@/lib/supabase/server'

vi.mock('@/lib/supabase/server')
vi.mock('next/server', async () => {
  const actual = await vi.importActual<typeof import('next/server')>('next/server')
  return {
    ...actual,
    NextResponse: {
      json: vi.fn((data: unknown, init?: ResponseInit) => ({ data, status: init?.status ?? 200 })),
    },
  }
})

function makeFileMock(name: string, type: string, size = 1024) {
  const file = new File(['x'.repeat(size)], name, { type })
  return file
}

function makeFormData(file: File, type = 'avatar') {
  const fd = new FormData()
  fd.append('file', file)
  fd.append('type', type)
  return fd
}

describe('POST /api/psychologist/upload', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    const mockDb = {
      auth: { getUser: vi.fn().mockResolvedValue({ data: { user: { id: 'user-1' } } }) },
      storage: {
        from: vi.fn().mockReturnValue({
          upload: vi.fn().mockResolvedValue({ data: { path: 'user-1/avatar.jpg' }, error: null }),
          getPublicUrl: vi.fn().mockReturnValue({ data: { publicUrl: 'https://example.com/avatar.jpg' } }),
        }),
      },
      from: vi.fn().mockReturnValue({
        update: vi.fn().mockReturnValue({ eq: vi.fn().mockResolvedValue({}) }),
      }),
    }
    vi.mocked(createClient).mockResolvedValue(mockDb as any)
  })

  it('geçerli JPG avatar yüklemeyi kabul eder', async () => {
    const file = makeFileMock('photo.jpg', 'image/jpeg')
    const req = new Request('http://localhost', { method: 'POST', body: makeFormData(file) })

    const res = await POST(req) as any
    expect(res.status).toBe(200)
    expect(res.data.url).toBeDefined()
  })

  it('geçerli PNG avatar yüklemeyi kabul eder', async () => {
    const file = makeFileMock('photo.png', 'image/png')
    const req = new Request('http://localhost', { method: 'POST', body: makeFormData(file) })

    const res = await POST(req) as any
    expect(res.status).toBe(200)
  })

  it('PDF dosyasını avatar olarak reddeder', async () => {
    const file = makeFileMock('doc.pdf', 'application/pdf')
    const req = new Request('http://localhost', { method: 'POST', body: makeFormData(file, 'avatar') })

    const res = await POST(req) as any
    expect(res.status).toBe(400)
    expect(res.data.error).toContain('JPG')
  })

  it('PDF dosyasını sertifika olarak kabul eder', async () => {
    const file = makeFileMock('cert.pdf', 'application/pdf')
    const req = new Request('http://localhost', { method: 'POST', body: makeFormData(file, 'certificate') })

    const res = await POST(req) as any
    expect(res.status).toBe(200)
  })

  it('5MB limitini aşan avatarı reddeder', async () => {
    const file = makeFileMock('big.jpg', 'image/jpeg', 6 * 1024 * 1024)
    const req = new Request('http://localhost', { method: 'POST', body: makeFormData(file) })

    const res = await POST(req) as any
    expect(res.status).toBe(400)
    expect(res.data.error).toContain('5MB')
  })

  it('geçersiz uzantıyı reddeder', async () => {
    const file = makeFileMock('malware.exe', 'image/jpeg') // MIME spoofing girişimi
    const req = new Request('http://localhost', { method: 'POST', body: makeFormData(file) })

    const res = await POST(req) as any
    expect(res.status).toBe(400)
  })

  it('dosya yoksa 400 döner', async () => {
    const fd = new FormData()
    fd.append('type', 'avatar')
    const req = new Request('http://localhost', { method: 'POST', body: fd })

    const res = await POST(req) as any
    expect(res.status).toBe(400)
  })

  it('yetkisiz kullanıcıya 401 döner', async () => {
    vi.mocked(createClient).mockResolvedValue({
      auth: { getUser: vi.fn().mockResolvedValue({ data: { user: null } }) },
    } as any)

    const file = makeFileMock('photo.jpg', 'image/jpeg')
    const req = new Request('http://localhost', { method: 'POST', body: makeFormData(file) })

    const res = await POST(req) as any
    expect(res.status).toBe(401)
  })
})
