import '@testing-library/jest-dom'
import { vi } from 'vitest'

// Supabase mock
vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(),
  createServiceRoleClient: vi.fn(),
}))

vi.mock('@/lib/supabase/client', () => ({
  createClient: vi.fn(() => ({
    auth: { getUser: vi.fn(), signOut: vi.fn() },
    channel: vi.fn(() => ({ on: vi.fn().mockReturnThis(), subscribe: vi.fn() })),
    removeChannel: vi.fn(),
  })),
}))

// Next.js mock
vi.mock('next/navigation', () => ({
  redirect: vi.fn(),
  useRouter: () => ({ push: vi.fn(), back: vi.fn(), replace: vi.fn() }),
  useSearchParams: () => new URLSearchParams(),
  usePathname: () => '/',
}))

// Next.js headers mock
vi.mock('next/headers', () => ({
  cookies: vi.fn(() => ({ get: vi.fn(), set: vi.fn() })),
}))

// Daily.co mock
vi.mock('@daily-co/daily-js', () => ({
  default: {
    createCallObject: vi.fn(() => ({
      join: vi.fn(),
      destroy: vi.fn(),
      setLocalAudio: vi.fn(),
      setLocalVideo: vi.fn(),
      startScreenShare: vi.fn(),
      stopScreenShare: vi.fn(),
      participants: vi.fn(() => ({ local: null })),
      on: vi.fn().mockReturnThis(),
    })),
  },
}))

// fetch mock
global.fetch = vi.fn()

// ResizeObserver mock
global.ResizeObserver = vi.fn(() => ({
  observe: vi.fn(),
  unobserve: vi.fn(),
  disconnect: vi.fn(),
}))
