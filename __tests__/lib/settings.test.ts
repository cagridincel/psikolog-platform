import { describe, it, expect, vi, beforeEach } from 'vitest'
import { getSetting } from '@/lib/settings'
import { createServiceRoleClient } from '@/lib/supabase/server'

vi.mock('@/lib/supabase/server')

describe('getSetting', () => {
  beforeEach(() => { vi.clearAllMocks() })

  it('true dönen ayarı doğru okur', async () => {
    const mockClient = {
      from: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({ data: { value: true }, error: null }),
          }),
        }),
      }),
    }
    vi.mocked(createServiceRoleClient).mockReturnValue(mockClient as any)

    const result = await getSetting('single_psychologist_restriction')
    expect(result).toBe(true)
  })

  it('false dönen ayarı doğru okur', async () => {
    const mockClient = {
      from: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({ data: { value: false }, error: null }),
          }),
        }),
      }),
    }
    vi.mocked(createServiceRoleClient).mockReturnValue(mockClient as any)

    const result = await getSetting('single_psychologist_restriction')
    expect(result).toBe(false)
  })

  it('hata durumunda varsayılan olarak true döner', async () => {
    const mockClient = {
      from: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockRejectedValue(new Error('DB error')),
          }),
        }),
      }),
    }
    vi.mocked(createServiceRoleClient).mockReturnValue(mockClient as any)

    const result = await getSetting('single_psychologist_restriction')
    expect(result).toBe(true)
  })

  it('bulunamayan anahtar için varsayılan true döner', async () => {
    const mockClient = {
      from: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({ data: null, error: { message: 'Not found' } }),
          }),
        }),
      }),
    }
    vi.mocked(createServiceRoleClient).mockReturnValue(mockClient as any)

    const result = await getSetting('nonexistent_key')
    expect(result).toBe(true)
  })
})
