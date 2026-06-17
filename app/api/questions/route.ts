import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET() {
  try {
    const supabase = await createClient()

    const { data, error } = await supabase
      .from('questions')
      .select(`
        id, text, description, type, is_first, order_index,
        question_options!question_options_question_id_fkey (
          id, text, emoji, next_question_id, order_index
        )
      `)
      .eq('is_active', true)
      .order('order_index')

    if (error) {
      console.error('Questions error:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json(data ?? [])
  } catch (err) {
    console.error('Questions catch:', err)
    return NextResponse.json({ error: 'Sunucu hatasi' }, { status: 500 })
  }
}