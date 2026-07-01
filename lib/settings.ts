import { createServiceRoleClient } from '@/lib/supabase/server'
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyClient = { from: (table: string) => any }

async function getRawSetting(key: string) {
  try {
    const service = createServiceRoleClient() as unknown as AnyClient
    const { data } = await service
      .from('platform_settings')
      .select('value')
      .eq('key', key)
      .single() as { data: { value: unknown } | null }
    return data?.value ?? null
  } catch {
    return null
  }
}

export async function getSetting(key: string): Promise<boolean> {
  const val = await getRawSetting(key)
  if (val === null) return true // default: açık
  return val === true
}

export async function getSettingNumber(key: string, defaultValue: number): Promise<number> {
  const val = await getRawSetting(key)
  if (val === null) return defaultValue
  const n = Number(val)
  return isNaN(n) ? defaultValue : n
}
