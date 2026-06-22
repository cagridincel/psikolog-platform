import { describe, it, expect, vi, beforeEach } from 'vitest'
import { POST } from '@/app/api/conversations/route'
import { createClient, createServiceRoleClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

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

function makeSupabaseMock(overrides: Record<string, unknown> = {}) {
  const base = {
    auth: { getUser: vi.fn().mockResolvedValue({ data: { user: { id: 'user-1' } } }) },
    from: vi.fn().mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({ data: { role: 'client' }, error: null }),
          limit: vi.fn().mockReturnValue({ maybeSingle: vi.fn().mockResolvedValue({ data: null }) }),
        }),
        in: vi.fn().mockResolvedValue({ data: [] }),
      }),
      insert: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({ data: { id: 'conv-1' } }),
        }),
      }),
    }),
    ...overrides,
  }
  return base
}

describe('POST /api/conversations', () => {
  beforeEach(() => { vi.clearAllMocks() })

  it('kendine mesaj atmayı engeller', async () => {
    const mockDb = makeSupabaseMock()
    vi.mocked(createClient).mockResolvedValue(mockDb as any)
    vi.mocked(createServiceRoleClient).mockReturnValue(mockDb as any)

    const req = new Request('http://localhost/api/conversations', {
      method: 'POST',
      body: JSON.stringify({ recipientId: 'user-1' }),
      headers: { 'Content-Type': 'application/json' },
    })

    const res = await POST(req) as any
    expect(res.status).toBe(400)
  })

  it('recipientId olmadan hata döner', async () => {
    const mockDb = makeSupabaseMock()
    vi.mocked(createClient).mockResolvedValue(mockDb as any)

    const req = new Request('http://localhost/api/conversations', {
      method: 'POST',
      body: JSON.stringify({}),
      headers: { 'Content-Type': 'application/json' },
    })

    const res = await POST(req) as any
    expect(res.status).toBe(400)
  })

  it('yetkisiz kullanıcıya 401 döner', async () => {
    const mockDb = {
      auth: { getUser: vi.fn().mockResolvedValue({ data: { user: null } }) },
    }
    vi.mocked(createClient).mockResolvedValue(mockDb as any)

    const req = new Request('http://localhost/api/conversations', {
      method: 'POST',
      body: JSON.stringify({ recipientId: 'user-2' }),
      headers: { 'Content-Type': 'application/json' },
    })

    const res = await POST(req) as any
    expect(res.status).toBe(401)
  })
})
