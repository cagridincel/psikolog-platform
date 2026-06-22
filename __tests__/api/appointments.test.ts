import { describe, it, expect, vi, beforeEach } from 'vitest'
import { POST as completePost } from '@/app/api/appointments/[id]/complete/route'
import { POST as rejectPost } from '@/app/api/appointments/[id]/reject/route'
import { createClient, createServiceRoleClient } from '@/lib/supabase/server'

vi.mock('@/lib/supabase/server')
vi.mock('@/lib/notifications', () => ({ sendNotifications: vi.fn(), sendNotification: vi.fn() }))
vi.mock('next/server', async () => {
  const actual = await vi.importActual<typeof import('next/server')>('next/server')
  return {
    ...actual,
    NextResponse: {
      json: vi.fn((data: unknown, init?: ResponseInit) => ({ data, status: init?.status ?? 200 })),
    },
  }
})

const makeParams = (id: string) => Promise.resolve({ id })

describe('POST /api/appointments/[id]/complete', () => {
  beforeEach(() => { vi.clearAllMocks() })

  it('yetkisiz kullanıcıya 401 döner', async () => {
    vi.mocked(createClient).mockResolvedValue({
      auth: { getUser: vi.fn().mockResolvedValue({ data: { user: null } }) },
    } as any)

    const res = await completePost(new Request('http://localhost'), { params: makeParams('apt-1') }) as any
    expect(res.status).toBe(401)
  })

  it('başka psikologun randevusunu bitiremez — 404 döner', async () => {
    const mockDb = {
      auth: { getUser: vi.fn().mockResolvedValue({ data: { user: { id: 'psych-1' } } }) },
      from: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({ data: null }),
            }),
          }),
        }),
      }),
    }
    vi.mocked(createClient).mockResolvedValue(mockDb as any)

    const res = await completePost(new Request('http://localhost'), { params: makeParams('apt-1') }) as any
    expect(res.status).toBe(404)
  })

  it('zaten completed olan randevu için success döner', async () => {
    const mockDb = {
      auth: { getUser: vi.fn().mockResolvedValue({ data: { user: { id: 'psych-1' } } }) },
      from: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({
                data: { id: 'apt-1', client_id: 'client-1', psychologist_id: 'psych-1', slot_id: 'slot-1', status: 'completed', slot_start_time: null }
              }),
            }),
          }),
        }),
        update: vi.fn().mockReturnValue({ eq: vi.fn().mockResolvedValue({}) }),
        insert: vi.fn().mockResolvedValue({}),
      }),
    }
    vi.mocked(createClient).mockResolvedValue(mockDb as any)
    vi.mocked(createServiceRoleClient).mockReturnValue(mockDb as any)

    const res = await completePost(new Request('http://localhost'), { params: makeParams('apt-1') }) as any
    expect(res.data).toEqual({ success: true })
  })
})

describe('POST /api/appointments/[id]/reject', () => {
  beforeEach(() => { vi.clearAllMocks() })

  it('yetkisiz kullanıcıya 401 döner', async () => {
    vi.mocked(createClient).mockResolvedValue({
      auth: { getUser: vi.fn().mockResolvedValue({ data: { user: null } }) },
    } as any)

    const req = new Request('http://localhost', { method: 'POST', body: JSON.stringify({ reason: '' }) })
    const res = await rejectPost(req, { params: makeParams('apt-1') }) as any
    expect(res.status).toBe(401)
  })

  it('payment_id null olan manuel randevuyu reddetmek payment güncellemesi yapmaz', async () => {
    const updateMock = vi.fn().mockReturnValue({ eq: vi.fn().mockResolvedValue({}) })
    const mockDb = {
      auth: { getUser: vi.fn().mockResolvedValue({ data: { user: { id: 'psych-1' } } }) },
      from: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({
                data: {
                  id: 'apt-1', client_id: 'client-1', psychologist_id: 'psych-1',
                  slot_id: 'slot-1', status: 'pending_approval', payment_id: null,
                }
              }),
            }),
          }),
          in: vi.fn().mockReturnValue({
            neq: vi.fn().mockReturnValue({
              order: vi.fn().mockReturnValue({ limit: vi.fn().mockResolvedValue({ data: [] }) })
            })
          }),
        }),
        update: updateMock,
        insert: vi.fn().mockResolvedValue({}),
      }),
    }
    vi.mocked(createClient).mockResolvedValue(mockDb as any)
    vi.mocked(createServiceRoleClient).mockReturnValue(mockDb as any)

    const req = new Request('http://localhost', { method: 'POST', body: JSON.stringify({ reason: '' }) })
    await rejectPost(req, { params: makeParams('apt-1') })

    // payments tablosuna update yapılmamalı
    const updateCalls = updateMock.mock.calls
    const paymentUpdate = updateCalls.some((call: unknown[]) =>
      JSON.stringify(call).includes('cancelled') && JSON.stringify(call).includes('payment')
    )
    expect(paymentUpdate).toBe(false)
  })
})
