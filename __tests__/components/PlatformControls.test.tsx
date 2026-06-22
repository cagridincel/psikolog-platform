import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import PlatformControls from '@/components/admin/PlatformControls'

const mockSettings = [
  {
    key: 'single_psychologist_restriction',
    value: true,
    description: 'Test açıklaması',
    updated_at: new Date().toISOString(),
  },
]

describe('PlatformControls', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(fetch).mockResolvedValueOnce({
      ok: true,
      json: async () => mockSettings,
    } as Response)
  })

  it('ayarları yükler ve gösterir', async () => {
    render(<PlatformControls />)
    await waitFor(() => {
      expect(screen.getByText('Tek Psikolog Kısıtlaması')).toBeDefined()
    })
  })

  it('aktif ayar için "Aktif" badge'i gösterir', async () => {
    render(<PlatformControls />)
    await waitFor(() => {
      expect(screen.getByText('Aktif')).toBeDefined()
    })
  })

  it('toggle butonuna tıklanınca PUT isteği gönderir', async () => {
    vi.mocked(fetch)
      .mockResolvedValueOnce({ ok: true, json: async () => mockSettings } as Response) // GET
      .mockResolvedValueOnce({ ok: true, json: async () => ({ success: true }) } as Response) // PUT

    render(<PlatformControls />)
    await waitFor(() => screen.getByText('Tek Psikolog Kısıtlaması'))

    const toggleBtn = screen.getByRole('button')
    await userEvent.click(toggleBtn)

    expect(fetch).toHaveBeenCalledTimes(2)
    const putCall = vi.mocked(fetch).mock.calls[1]
    expect(putCall[1]?.method).toBe('PUT')

    const body = JSON.parse(putCall[1]?.body as string)
    expect(body.key).toBe('single_psychologist_restriction')
    expect(body.value).toBe(false) // toggle: true → false
  })

  it('yükleme sırasında spinner gösterir', () => {
    vi.mocked(fetch).mockImplementation(() => new Promise(() => {})) // askıda bırak
    render(<PlatformControls />)
    expect(screen.getByRole('status', { hidden: true }) ?? document.querySelector('.animate-spin')).toBeDefined()
  })
})
