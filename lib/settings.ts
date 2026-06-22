import { createServiceRoleClient } from '@/lib/supabase/server'
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyClient = { from: (table: string) => any }

export async function getSetting(key: string): Promise<boolean> {
  try {
    const service = createServiceRoleClient() as unknown as AnyClient
    const { data } = await service
      .from('platform_settings')
      .select('value')
      .eq('key', key)
      .single() as { data: { value: boolean } | null }
    return data?.value === true
  } catch {
    return true // default: açık
  }
}
