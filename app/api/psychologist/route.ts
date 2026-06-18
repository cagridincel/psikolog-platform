import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET() {
  const supabase = await createClient()
  const { data } = await supabase
    .from('profiles')
    .select('id, full_name, bio, specialties, price_per_session')
    .eq('is_approved', true)
  return NextResponse.json(data ?? [])
}